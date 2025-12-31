import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the authorization header from the request
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("[sync-missing-users] No authorization header");
      return new Response(
        JSON.stringify({ error: "Authorization required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create a Supabase client with the user's JWT to verify their role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // User client to check permissions
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get the requesting user's ID
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      console.error("[sync-missing-users] User auth error:", userError);
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[sync-missing-users] Request from user:", user.id);

    // Check if user is admin
    const { data: roleData, error: roleError } = await userClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (roleError || !roleData) {
      console.error("[sync-missing-users] User is not admin");
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[sync-missing-users] Admin verified, starting sync...");

    // Use service role client
    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Get all users from auth.users
    const { data: authUsers, error: authError } = await adminClient.auth.admin.listUsers({
      perPage: 1000,
    });

    if (authError) {
      console.error("[sync-missing-users] Auth listUsers error:", authError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch auth users" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[sync-missing-users] Found", authUsers.users.length, "users in auth.users");

    // Get existing profiles and roles
    const [profilesRes, rolesRes, approvalsRes] = await Promise.all([
      adminClient.from("profiles").select("id"),
      adminClient.from("user_roles").select("user_id, role"),
      adminClient.from("teacher_approvals").select("user_id, status"),
    ]);

    const existingProfileIds = new Set((profilesRes.data || []).map((p) => p.id));
    const existingRoles = new Map((rolesRes.data || []).map((r) => [r.user_id, r.role]));
    const approvals = new Map((approvalsRes.data || []).map((a) => [a.user_id, a.status]));

    let profilesCreated = 0;
    let rolesAssigned = 0;
    let rolesFixed = 0;
    const errors: string[] = [];

    for (const authUser of authUsers.users) {
      try {
        // Create missing profile
        if (!existingProfileIds.has(authUser.id)) {
          const username = authUser.user_metadata?.username || 
                          authUser.user_metadata?.full_name || 
                          authUser.email?.split("@")[0] || 
                          "Kullanıcı";

          const { error: profileError } = await adminClient.from("profiles").insert({
            id: authUser.id,
            username,
            is_teacher_approved: approvals.get(authUser.id) === "approved",
          });

          if (profileError) {
            console.error("[sync-missing-users] Profile creation error for", authUser.id, profileError);
            errors.push(`Profile error for ${authUser.id}: ${profileError.message}`);
          } else {
            profilesCreated++;
            console.log("[sync-missing-users] Created profile for", authUser.id);
          }
        }

        // Determine correct role
        const teacherStatus = approvals.get(authUser.id);
        const existingRole = existingRoles.get(authUser.id);
        
        // If they're an approved teacher but don't have teacher role, fix it
        if (teacherStatus === "approved" && existingRole !== "teacher") {
          // Delete existing role if any
          if (existingRole) {
            await adminClient.from("user_roles").delete().eq("user_id", authUser.id);
          }
          
          const { error: roleError } = await adminClient.from("user_roles").insert({
            user_id: authUser.id,
            role: "teacher",
          });

          if (roleError) {
            console.error("[sync-missing-users] Role fix error for", authUser.id, roleError);
            errors.push(`Role fix error for ${authUser.id}: ${roleError.message}`);
          } else {
            rolesFixed++;
            console.log("[sync-missing-users] Fixed role for approved teacher", authUser.id);
          }
          
          // Also update profile
          await adminClient.from("profiles").update({ is_teacher_approved: true }).eq("id", authUser.id);
        }
        // If no role exists and not an approved teacher, assign customer
        else if (!existingRole && teacherStatus !== "approved") {
          const { error: roleError } = await adminClient.from("user_roles").insert({
            user_id: authUser.id,
            role: "customer",
          });

          if (roleError) {
            console.error("[sync-missing-users] Role assignment error for", authUser.id, roleError);
            errors.push(`Role error for ${authUser.id}: ${roleError.message}`);
          } else {
            rolesAssigned++;
            console.log("[sync-missing-users] Assigned customer role to", authUser.id);
          }
        }
      } catch (err) {
        console.error("[sync-missing-users] Error processing user", authUser.id, err);
        errors.push(`Error for ${authUser.id}: ${String(err)}`);
      }
    }

    const result = {
      success: true,
      totalUsers: authUsers.users.length,
      profilesCreated,
      rolesAssigned,
      rolesFixed,
      errors: errors.length > 0 ? errors : undefined,
    };

    console.log("[sync-missing-users] Sync complete:", result);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[sync-missing-users] Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
