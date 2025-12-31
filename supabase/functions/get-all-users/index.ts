import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
      console.error("[get-all-users] No authorization header");
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
      console.error("[get-all-users] User auth error:", userError);
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[get-all-users] Request from user:", user.id);

    // Check if user is admin using RLS-safe query
    const { data: roleData, error: roleError } = await userClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (roleError) {
      console.error("[get-all-users] Role check error:", roleError);
      return new Response(
        JSON.stringify({ error: "Role check failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!roleData) {
      console.error("[get-all-users] User is not admin:", user.id);
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[get-all-users] Admin verified, fetching all users...");

    // Use service role client to access auth.users
    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Get all users from auth.users using admin API
    const { data: authUsers, error: authError } = await adminClient.auth.admin.listUsers({
      perPage: 1000,
    });

    if (authError) {
      console.error("[get-all-users] Auth listUsers error:", authError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch auth users" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[get-all-users] Found", authUsers.users.length, "users in auth.users");

    // Get all profiles, roles, and teacher_approvals
    const [profilesRes, rolesRes, approvalsRes] = await Promise.all([
      adminClient.from("profiles").select("id, username, avatar_url, is_teacher_approved, created_at"),
      adminClient.from("user_roles").select("user_id, role"),
      adminClient.from("teacher_approvals").select("user_id, status, full_name, created_at"),
    ]);

    const profiles = profilesRes.data || [];
    const roles = rolesRes.data || [];
    const approvals = approvalsRes.data || [];

    // Create lookup maps
    const profilesMap = new Map(profiles.map((p) => [p.id, p]));
    const rolesMap = new Map(roles.map((r) => [r.user_id, r]));
    const approvalsMap = new Map(approvals.map((a) => [a.user_id, a]));

    // Build comprehensive user list from auth.users
    const users = authUsers.users.map((authUser) => {
      const profile = profilesMap.get(authUser.id);
      const userRole = rolesMap.get(authUser.id);
      const approval = approvalsMap.get(authUser.id);

      // Determine issues
      const hasMissingProfile = !profile;
      const hasMissingRole = !userRole;
      const hasRoleIssue = approval?.status === "approved" && userRole?.role !== "teacher";

      return {
        id: authUser.id,
        email: authUser.email || null,
        username: profile?.username || approval?.full_name || null,
        avatar_url: profile?.avatar_url || null,
        role: userRole?.role || null,
        created_at: authUser.created_at || profile?.created_at || new Date().toISOString(),
        teacher_status: approval?.status || null,
        hasMissingProfile,
        hasMissingRole,
        hasRoleIssue,
        // Source tracking for debugging
        hasProfile: !!profile,
        hasRole: !!userRole,
        hasApproval: !!approval,
      };
    });

    // Sort by created_at descending
    users.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    console.log("[get-all-users] Returning", users.length, "users");

    return new Response(
      JSON.stringify({ users, count: users.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[get-all-users] Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
