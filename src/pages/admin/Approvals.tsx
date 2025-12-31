import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle, XCircle, Mail, Phone, GraduationCap, Calendar, AlertTriangle, Wrench } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { AdminBreadcrumb } from "@/components/AdminBreadcrumb";

type TeacherApproval = {
  id: string;
  user_id: string;
  status: string;
  created_at: string;
  updated_at: string;
  full_name: string | null;
  date_of_birth: string | null;
  specialization: string | null;
  education: string | null;
  years_of_experience: number | null;
  phone: string | null;
  profiles: {
    username: string;
    avatar_url: string | null;
    email?: string;
  };
  // Issue tracking
  hasProfileIssue?: boolean;
  hasRoleIssue?: boolean;
};

export default function Approvals() {
  const [pendingApprovals, setPendingApprovals] = useState<TeacherApproval[]>([]);
  const [approvedApprovals, setApprovedApprovals] = useState<TeacherApproval[]>([]);
  const [rejectedApprovals, setRejectedApprovals] = useState<TeacherApproval[]>([]);
  const [loading, setLoading] = useState(false);
  const [repairing, setRepairing] = useState<string | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const { toast } = useToast();

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
  }, []);

  const fetchApprovals = async () => {
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
  };

  const handleRepair = async (approval: TeacherApproval) => {
    setRepairing(approval.id);

    try {
      // Step 1: Try to create/update profile
      if (approval.hasProfileIssue) {
        // Try upsert - this will work if user has permission
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
          // If upsert fails, show instruction to manually add via Supabase Dashboard
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
        // Delete any existing roles
        await supabase.from("user_roles").delete().eq("user_id", approval.user_id);

        // Insert teacher role
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
        // Delete any existing roles first
        const { error: deleteError } = await supabase.from("user_roles").delete().eq("user_id", userId);
        
        if (deleteError) {
          console.error(`Role delete error (attempt ${attempt}):`, deleteError);
          if (attempt === maxRetries) {
            return { success: false, error: `Mevcut roller silinemedi: ${deleteError.message}` };
          }
          await new Promise(resolve => setTimeout(resolve, 500 * attempt)); // Exponential backoff
          continue;
        }

        // Insert teacher role
        const { error: roleError } = await supabase.from("user_roles").insert({ user_id: userId, role: "teacher" });

        if (roleError) {
          console.error(`Role insert error (attempt ${attempt}):`, roleError);
          if (attempt === maxRetries) {
            return { success: false, error: `Uzman rolü atanamadı: ${roleError.message}` };
          }
          await new Promise(resolve => setTimeout(resolve, 500 * attempt));
          continue;
        }

        // Verify role assignment
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
      // 1. Update teacher_approvals status
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
        // 2. Assign teacher role with retry mechanism
        const roleResult = await assignTeacherRole(userId);

        if (!roleResult.success) {
          console.error("Role assignment failed:", roleResult.error);
          // Rollback approval status
          await supabase
            .from("teacher_approvals")
            .update({ status: "pending", updated_at: new Date().toISOString() })
            .eq("id", approvalId);
          throw new Error(`Rol ataması başarısız: ${roleResult.error}. İşlem geri alındı.`);
        }

        // 3. Update is_teacher_approved in profile
        const { error: profileError } = await supabase
          .from("profiles")
          .update({ is_teacher_approved: true })
          .eq("id", userId);

        if (profileError) {
          console.error("Profile update error:", profileError);
          // Profile update is not critical - repair can fix this later
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

  const renderApprovalCard = (approval: TeacherApproval, showActions: boolean = false) => {
    const needsRepair = approval.hasProfileIssue || approval.hasRoleIssue;
    const isRepairing = repairing === approval.id;

    return (
      <Card key={approval.id} className={needsRepair ? "border-amber-500/50" : ""}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {approval.profiles.avatar_url ? (
                <img
                  src={approval.profiles.avatar_url}
                  alt={approval.profiles.username}
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                  <span className="text-lg font-semibold text-primary">
                    {approval.profiles.username.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <div>
                <CardTitle className="flex items-center gap-2">
                  {approval.profiles.username}
                  {needsRepair && (
                    <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Onarım Gerekli
                    </Badge>
                  )}
                </CardTitle>
                <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                  <Calendar className="h-3 w-3" />
                  {new Date(approval.created_at).toLocaleDateString("tr-TR", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>
            </div>
            <Badge
              variant={
                approval.status === "approved"
                  ? "default"
                  : approval.status === "rejected"
                    ? "destructive"
                    : "secondary"
              }
            >
              {approval.status === "pending" ? "Bekliyor" : approval.status === "approved" ? "Onaylandı" : "Reddedildi"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {needsRepair && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-sm">
              <p className="font-medium text-amber-700 dark:text-amber-400 mb-2">Tespit edilen sorunlar:</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                {approval.hasProfileIssue && <li>Kullanıcı profili eksik</li>}
                {approval.hasRoleIssue && <li>Uzman rolü atanmamış</li>}
              </ul>
              <Button
                size="sm"
                variant="outline"
                className="mt-3 border-amber-500/50 hover:bg-amber-500/10"
                onClick={() => handleRepair(approval)}
                disabled={isRepairing}
              >
                <Wrench className="h-4 w-4 mr-2" />
                {isRepairing ? "Onarılıyor..." : "Profili Onar"}
              </Button>
            </div>
          )}

          <div className="grid gap-3 text-sm">
            {approval.profiles.email && (
              <div className="flex items-start gap-2">
                <Mail className="h-4 w-4 mt-0.5 text-primary" />
                <div>
                  <span className="font-medium">E-posta:</span>{" "}
                  <span className="text-muted-foreground">{approval.profiles.email}</span>
                </div>
              </div>
            )}
            {approval.phone && (
              <div className="flex items-start gap-2">
                <Phone className="h-4 w-4 mt-0.5 text-primary" />
                <div>
                  <span className="font-medium">Telefon:</span>{" "}
                  <span className="text-muted-foreground">{approval.phone}</span>
                </div>
              </div>
            )}
            {approval.date_of_birth && (
              <div className="flex items-start gap-2">
                <Calendar className="h-4 w-4 mt-0.5 text-primary" />
                <div>
                  <span className="font-medium">Doğum Tarihi:</span>{" "}
                  <span className="text-muted-foreground">
                    {new Date(approval.date_of_birth).toLocaleDateString("tr-TR")}
                  </span>
                </div>
              </div>
            )}
            {approval.specialization && (
              <div className="flex items-start gap-2">
                <GraduationCap className="h-4 w-4 mt-0.5 text-primary" />
                <div>
                  <span className="font-medium">Uzmanlık Alanı:</span>{" "}
                  <span className="text-muted-foreground">{approval.specialization}</span>
                </div>
              </div>
            )}
            {approval.education && (
              <div className="flex items-start gap-2">
                <GraduationCap className="h-4 w-4 mt-0.5 text-primary" />
                <div>
                  <span className="font-medium">Eğitim:</span>{" "}
                  <span className="text-muted-foreground whitespace-pre-wrap">{approval.education}</span>
                </div>
              </div>
            )}
            {approval.years_of_experience !== null && (
              <div className="flex items-start gap-2">
                <GraduationCap className="h-4 w-4 mt-0.5 text-primary" />
                <div>
                  <span className="font-medium">Deneyim:</span>{" "}
                  <span className="text-muted-foreground">{approval.years_of_experience} yıl</span>
                </div>
              </div>
            )}
            {approval.status !== "pending" && (
              <div className="flex items-start gap-2">
                <Calendar className="h-4 w-4 mt-0.5 text-primary" />
                <div>
                  <span className="font-medium">İncelenme Tarihi:</span>{" "}
                  <span className="text-muted-foreground">
                    {new Date(approval.updated_at).toLocaleDateString("tr-TR", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>
            )}
          </div>

          {showActions && (
            <div className="flex gap-2 pt-2">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="sm" disabled={loading}>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Onayla
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Başvuruyu Onayla</AlertDialogTitle>
                    <AlertDialogDescription>
                      <strong>{approval.profiles.username}</strong> kullanıcısını uzman olarak onaylamak istediğinize
                      emin misiniz? Onaylandıktan sonra giriş yapabilecek.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>İptal</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleApproval(approval.id, approval.user_id, true)}>
                      Onayla
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="sm" variant="destructive" disabled={loading}>
                    <XCircle className="h-4 w-4 mr-2" />
                    Reddet
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Başvuruyu Reddet</AlertDialogTitle>
                    <AlertDialogDescription>
                      <strong>{approval.profiles.username}</strong> kullanıcısının başvurusunu reddetmek istediğinize
                      emin misiniz?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>İptal</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleApproval(approval.id, approval.user_id, false)}>
                      Reddet
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  // Count approvals needing repair
  const repairNeededCount = [...pendingApprovals, ...approvedApprovals, ...rejectedApprovals].filter(
    (a) => a.hasProfileIssue || a.hasRoleIssue,
  ).length;

  return (
    <div className="container py-8 md:py-12 px-4 md:px-6 lg:px-8 space-y-8">
      <div className="space-y-4">
        <AdminBreadcrumb />
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h1 className="text-2xl md:text-3xl font-bold">Uzman Başvuruları</h1>
          <div className="flex gap-2">
            {repairNeededCount > 0 && (
              <Badge
                variant="outline"
                className="text-base px-3 py-1 bg-amber-500/10 text-amber-600 border-amber-500/30"
              >
                <AlertTriangle className="h-4 w-4 mr-1" />
                {repairNeededCount} Onarım Gerekli
              </Badge>
            )}
            <Badge variant="secondary" className="text-base px-3 py-1">
              {pendingApprovals.length} Bekliyor
            </Badge>
          </div>
        </div>
      </div>

      {dataLoading ? (
        <div className="space-y-4">
          <Skeleton variant="shimmer" className="h-10 w-full max-w-md" />
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton variant="shimmer" className="h-6 w-48 mb-2" />
                <Skeleton variant="shimmer" className="h-4 w-32" />
              </CardHeader>
              <CardContent className="space-y-3">
                <Skeleton variant="shimmer" className="h-4 w-full" />
                <Skeleton variant="shimmer" className="h-4 w-3/4" />
                <Skeleton variant="shimmer" className="h-4 w-2/3" />
                <div className="flex gap-2 pt-2">
                  <Skeleton variant="shimmer" className="h-9 w-24" />
                  <Skeleton variant="shimmer" className="h-9 w-24" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Tabs defaultValue="pending" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="pending">Bekleyen ({pendingApprovals.length})</TabsTrigger>
            <TabsTrigger value="approved">Onaylanan ({approvedApprovals.length})</TabsTrigger>
            <TabsTrigger value="rejected">Reddedilen ({rejectedApprovals.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-4 mt-6">
            {pendingApprovals.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <p className="text-muted-foreground">Bekleyen başvuru bulunmuyor.</p>
                </CardContent>
              </Card>
            ) : (
              pendingApprovals.map((approval) => renderApprovalCard(approval, true))
            )}
          </TabsContent>

          <TabsContent value="approved" className="space-y-4 mt-6">
            {approvedApprovals.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <p className="text-muted-foreground">Onaylanmış başvuru bulunmuyor.</p>
                </CardContent>
              </Card>
            ) : (
              approvedApprovals.map((approval) => renderApprovalCard(approval, false))
            )}
          </TabsContent>

          <TabsContent value="rejected" className="space-y-4 mt-6">
            {rejectedApprovals.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <p className="text-muted-foreground">Reddedilmiş başvuru bulunmuyor.</p>
                </CardContent>
              </Card>
            ) : (
              rejectedApprovals.map((approval) => renderApprovalCard(approval, false))
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
