import { supabase } from "@/lib/supabase";
import type { TeacherApplicationData } from "./types";

/**
 * Creates a teacher approval record for pending review
 */
export async function createTeacherApproval(
  userId: string,
  fullName: string,
  teacherData: TeacherApplicationData
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.from("teacher_approvals").insert({
      user_id: userId,
      status: "pending",
      full_name: fullName,
      date_of_birth: teacherData.dateOfBirth,
      specialization: teacherData.specialization,
      education: teacherData.education,
      years_of_experience: teacherData.yearsOfExperience,
      phone: teacherData.phone,
    });

    if (error) {
      console.error("[AuthContext] Teacher approval creation error:", error);
      return { success: false, error: error.message };
    }

    console.log("[AuthContext] Teacher approval created for user:", userId);
    return { success: true };
  } catch (err: any) {
    console.error("[AuthContext] Teacher approval exception:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Checks teacher approval status and returns appropriate action
 */
export async function checkTeacherApprovalStatus(
  userId: string
): Promise<{ status: "pending" | "approved" | "rejected" | "none"; shouldSignOut: boolean }> {
  try {
    const { data, error } = await supabase
      .from("teacher_approvals")
      .select("status")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      console.error("[AuthContext] Teacher approval check error:", error);
      return { status: "none", shouldSignOut: false };
    }

    if (!data) {
      return { status: "none", shouldSignOut: false };
    }

    const status = data.status as "pending" | "approved" | "rejected";
    const shouldSignOut = status === "pending" || status === "rejected";
    
    return { status, shouldSignOut };
  } catch (err) {
    console.error("[AuthContext] Teacher approval check exception:", err);
    return { status: "none", shouldSignOut: false };
  }
}
