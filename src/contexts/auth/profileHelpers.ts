import { supabase } from "@/lib/supabase";

/**
 * Ensures a user has a profile in the profiles table
 * Creates one if missing, updates if exists
 */
export async function ensureUserProfile(
  userId: string, 
  username: string, 
  isTeacherApproved: boolean = false
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.from("profiles").upsert(
      {
        id: userId,
        username: username,
        is_teacher_approved: isTeacherApproved,
      },
      { onConflict: "id" }
    );
    
    if (error) {
      console.error("[AuthContext] Profile creation error:", error);
      return { success: false, error: error.message };
    }
    
    return { success: true };
  } catch (err: any) {
    console.error("[AuthContext] Profile creation exception:", err);
    return { success: false, error: err.message };
  }
}
