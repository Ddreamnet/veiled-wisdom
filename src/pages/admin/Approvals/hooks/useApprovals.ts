import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import type { TeacherApproval, ApprovalsByStatus } from "../types";

export function useApprovals() {
  const [pendingApprovals, setPendingApprovals] = useState<TeacherApproval[]>([]);
  const [approvedApprovals, setApprovedApprovals] = useState<TeacherApproval[]>([]);
  const [rejectedApprovals, setRejectedApprovals] = useState<TeacherApproval[]>([]);
  const [loading, setLoading] = useState(false);
  const [repairing, setRepairing] = useState<string | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const { toast } = useToast();

  const fetchApprovals = useCallback(async () => {
    // Fetch all approvals
    const { data: allApprovals, error: approvalsError } = await supabase
      .from("teacher_approvals")
      .select("*")
      .order("created_at", { ascending: false });

    if (approvalsError) {
      console.error("teacher_approvals fetch error:", approvalsError);
      setDataLoading(false);
      return;
    }

    const userIds = (allApprovals || []).map((d: any) => d.user_id).filter(Boolean);

    // Fetch all profiles for these users
    let profilesMap = new Map<string, { id: string; username: string; avatar_url: string | null }>();
    if (userIds.length > 0) {
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, username, avatar_url")
        .in("id", userIds);

      profilesData?.forEach((p: any) => profilesMap.set(p.id, p));
    }

    // Fetch all roles for these users - specifically check for teacher role
    let teacherRolesSet = new Set<string>();
    if (userIds.length > 0) {
      const { data: rolesData } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("user_id", userIds)
        .eq("role", "teacher");

      rolesData?.forEach((r: any) => teacherRolesSet.add(r.user_id));
    }

    // Process and categorize approvals
    const pending: TeacherApproval[] = [];
    const approved: TeacherApproval[] = [];
    const rejected: TeacherApproval[] = [];

    (allApprovals || []).forEach((d: any) => {
      const profile = profilesMap.get(d.user_id);
      const hasTeacherRole = teacherRolesSet.has(d.user_id);

      const hasProfileIssue = !profile;
      const hasRoleIssue = d.status === "approved" && !hasTeacherRole;

      const enriched: TeacherApproval = {
        ...d,
        profiles: {
          username: d.full_name || profile?.username || "Kullanıcı",
          avatar_url: profile?.avatar_url || null,
          email: d.email || null,
        },
        hasProfileIssue,
        hasRoleIssue,
      };

      if (d.status === "pending") {
        pending.push(enriched);
      } else if (d.status === "approved") {
        approved.push(enriched);
      } else if (d.status === "rejected") {
        rejected.push(enriched);
      }
    });

    // Sort: pending by created_at ASC, others by updated_at DESC
    pending.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    approved.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
    rejected.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

    setPendingApprovals(pending);
    setApprovedApprovals(approved);
    setRejectedApprovals(rejected);
    setDataLoading(false);
  }, []);

  useEffect(() => {
    fetchApprovals();

    // Real-time subscription for new applications
    const channel = supabase
      .channel("teacher-approvals-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "teacher_approvals",
        },
        () => {
          fetchApprovals();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchApprovals]);

  const handleRepair = async (approval: TeacherApproval) => {
    setRepairing(approval.id);

    try {
      // Step 1: Try to create/update profile
      if (approval.hasProfileIssue) {
        const { error: upsertError } = await supabase.from("profiles").upsert(
          {
            id: approval.user_id,
            username: approval.full_name || "Kullanıcı",
            is_teacher_approved: approval.status === "approved",
          },
          { onConflict: "id" },
        );

        if (upsertError) {
          console.error("Profile upsert error:", upsertError);
          toast({
            title: "Manuel İşlem Gerekli",
            description: `Profil oluşturulamadı. Supabase Dashboard > Table Editor > profiles tablosuna şu değerleri manuel ekleyin: id: ${approval.user_id}, username: ${approval.full_name || "Kullanıcı"}, is_teacher_approved: true`,
            variant: "destructive",
            duration: 15000,
          });
          setRepairing(null);
          return;
        }
      }

      // Step 2: Fix role if missing (only for approved teachers)
      if (approval.hasRoleIssue && approval.status === "approved") {
        await supabase.from("user_roles").delete().eq("user_id", approval.user_id);

        const { error: roleError } = await supabase
          .from("user_roles")
          .insert({ user_id: approval.user_id, role: "teacher" });

        if (roleError) {
          console.error("Role insert error:", roleError);
          throw new Error("Rol atanamadı: " + roleError.message);
        }
      }

      // Step 3: Update is_teacher_approved in profile
      if (approval.status === "approved") {
        await supabase.from("profiles").update({ is_teacher_approved: true }).eq("id", approval.user_id);
      }

      toast({
        title: "Onarım Başarılı",
        description: "Kullanıcı profili ve rolü düzeltildi.",
      });

      fetchApprovals();
    } catch (error: any) {
      console.error("Repair error:", error);
      toast({
        title: "Hata",
        description: error.message || "Onarım başarısız oldu.",
        variant: "destructive",
      });
    } finally {
      setRepairing(null);
    }
  };

  const assignTeacherRole = async (userId: string, maxRetries = 3): Promise<{ success: boolean; error?: string }> => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const { error: deleteError } = await supabase.from("user_roles").delete().eq("user_id", userId);
        
        if (deleteError) {
          console.error(`Role delete error (attempt ${attempt}):`, deleteError);
          if (attempt === maxRetries) {
            return { success: false, error: `Mevcut roller silinemedi: ${deleteError.message}` };
          }
          await new Promise(resolve => setTimeout(resolve, 500 * attempt));
          continue;
        }

        const { error: roleError } = await supabase.from("user_roles").insert({ user_id: userId, role: "teacher" });

        if (roleError) {
          console.error(`Role insert error (attempt ${attempt}):`, roleError);
          if (attempt === maxRetries) {
            return { success: false, error: `Uzman rolü atanamadı: ${roleError.message}` };
          }
          await new Promise(resolve => setTimeout(resolve, 500 * attempt));
          continue;
        }

        const { data: verifyData, error: verifyError } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", userId)
          .eq("role", "teacher")
          .maybeSingle();

        if (verifyError || !verifyData) {
          console.error(`Role verification failed (attempt ${attempt}):`, verifyError);
          if (attempt === maxRetries) {
            return { success: false, error: "Rol ataması doğrulanamadı" };
          }
          await new Promise(resolve => setTimeout(resolve, 500 * attempt));
          continue;
        }

        return { success: true };
      } catch (err: any) {
        console.error(`Unexpected error (attempt ${attempt}):`, err);
        if (attempt === maxRetries) {
          return { success: false, error: err.message || "Beklenmeyen hata" };
        }
        await new Promise(resolve => setTimeout(resolve, 500 * attempt));
      }
    }
    return { success: false, error: "Maksimum deneme sayısına ulaşıldı" };
  };

  const handleApproval = async (approvalId: string, userId: string, approve: boolean) => {
    setLoading(true);

    try {
      const { error: approvalError } = await supabase
        .from("teacher_approvals")
        .update({
          status: approve ? "approved" : "rejected",
          updated_at: new Date().toISOString(),
        })
        .eq("id", approvalId);

      if (approvalError) {
        throw new Error("Onay durumu güncellenemedi: " + approvalError.message);
      }

      if (approve) {
        const roleResult = await assignTeacherRole(userId);

        if (!roleResult.success) {
          console.error("Role assignment failed:", roleResult.error);
          await supabase
            .from("teacher_approvals")
            .update({ status: "pending", updated_at: new Date().toISOString() })
            .eq("id", approvalId);
          throw new Error(`Rol ataması başarısız: ${roleResult.error}. İşlem geri alındı.`);
        }

        const { error: profileError } = await supabase
          .from("profiles")
          .update({ is_teacher_approved: true })
          .eq("id", userId);

        if (profileError) {
          console.error("Profile update error:", profileError);
        }
      }

      toast({
        title: approve ? "Onaylandı" : "Reddedildi",
        description: approve 
          ? "Uzman başvurusu onaylandı ve rol başarıyla atandı." 
          : "Uzman başvurusu reddedildi.",
      });

      fetchApprovals();
    } catch (error: any) {
      console.error("Approval error:", error);
      toast({
        title: "Hata",
        description: error.message || "İşlem başarısız oldu.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return {
    pendingApprovals,
    approvedApprovals,
    rejectedApprovals,
    loading,
    repairing,
    dataLoading,
    handleRepair,
    handleApproval,
  };
}
