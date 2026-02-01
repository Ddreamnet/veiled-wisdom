import { supabase, UserRole } from "@/lib/supabase";

/**
 * Assigns a role to user in user_roles table
 * Only inserts if role doesn't already exist
 */
export async function ensureUserRole(
  userId: string, 
  role: UserRole
): Promise<{ success: boolean; error?: string; alreadyExists?: boolean }> {
  try {
    // Check existing role first
    const { data: existingRole, error: checkError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .maybeSingle();

    if (checkError) {
      console.error("[AuthContext] Role check error:", checkError);
      return { success: false, error: checkError.message };
    }

    // If role already exists, don't insert again
    if (existingRole) {
      console.log("[AuthContext] User already has role:", existingRole.role);
      return { success: true, alreadyExists: true };
    }

    // Insert new role
    const { error: insertError } = await supabase.from("user_roles").insert({
      user_id: userId,
      role: role,
    });

    if (insertError) {
      console.error("[AuthContext] Role insert error:", insertError);
      return { success: false, error: insertError.message };
    }

    console.log("[AuthContext] Role assigned successfully:", role, "for user:", userId);
    return { success: true };
  } catch (err: any) {
    console.error("[AuthContext] Role assignment exception:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Fetches user's role from database with priority handling
 * Priority: admin > teacher > customer
 */
export async function fetchUserRoleFromDB(userId: string): Promise<UserRole | null> {
  try {
    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    if (error) {
      console.error("[AuthContext] Error fetching user role:", error);
      return null;
    }

    if (!data || data.length === 0) {
      return null;
    }

    // Priority: admin > teacher > customer
    const roles = data.map((d) => d.role as UserRole);
    if (roles.includes("admin")) return "admin";
    if (roles.includes("teacher")) return "teacher";
    if (roles.includes("customer")) return "customer";
    
    return roles[0] as UserRole;
  } catch (error) {
    console.error("[AuthContext] Error fetching user role:", error);
    return null;
  }
}
