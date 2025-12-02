import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Create admin client with service role key (bypasses RLS)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get the authorization header to verify the caller is an admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Yetkilendirme gerekli' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create a client with the user's token to verify they're an admin
    const supabaseClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Geçersiz kullanıcı' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if caller is admin
    const { data: adminRole } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!adminRole) {
      return new Response(JSON.stringify({ error: 'Admin yetkisi gerekli' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse request body
    const { userId, action, approvalData } = await req.json();

    if (!userId || !action) {
      return new Response(JSON.stringify({ error: 'userId ve action gerekli' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'approve') {
      // 1. Update teacher_approvals status
      const { error: approvalError } = await supabaseAdmin
        .from('teacher_approvals')
        .update({ status: 'approved', updated_at: new Date().toISOString() })
        .eq('user_id', userId);

      if (approvalError) {
        console.error('Approval update error:', approvalError);
        return new Response(JSON.stringify({ error: 'Onay güncellenemedi: ' + approvalError.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // 2. Check if profile exists, create if not
      const { data: existingProfile } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .maybeSingle();

      if (!existingProfile) {
        // Get user info from auth.users
        const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(userId);
        
        const username = approvalData?.full_name || authUser?.user?.user_metadata?.username || 'Kullanıcı';
        
        const { error: profileError } = await supabaseAdmin
          .from('profiles')
          .insert({
            id: userId,
            username: username,
            is_teacher_approved: true,
            created_at: new Date().toISOString(),
          });

        if (profileError) {
          console.error('Profile creation error:', profileError);
          return new Response(JSON.stringify({ error: 'Profil oluşturulamadı: ' + profileError.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      } else {
        // Update existing profile
        await supabaseAdmin
          .from('profiles')
          .update({ is_teacher_approved: true })
          .eq('id', userId);
      }

      // 3. Delete any existing roles for this user (clean slate)
      await supabaseAdmin
        .from('user_roles')
        .delete()
        .eq('user_id', userId);

      // 4. Insert teacher role
      const { error: roleError } = await supabaseAdmin
        .from('user_roles')
        .insert({ user_id: userId, role: 'teacher' });

      if (roleError) {
        console.error('Role assignment error:', roleError);
        return new Response(JSON.stringify({ error: 'Rol atanamadı: ' + roleError.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ success: true, message: 'Hoca başarıyla onaylandı' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else if (action === 'reject') {
      const { error: rejectError } = await supabaseAdmin
        .from('teacher_approvals')
        .update({ status: 'rejected', updated_at: new Date().toISOString() })
        .eq('user_id', userId);

      if (rejectError) {
        return new Response(JSON.stringify({ error: 'Ret işlemi başarısız: ' + rejectError.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ success: true, message: 'Başvuru reddedildi' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else if (action === 'repair') {
      // Repair action: ensure profile and role exist for approved teachers
      
      // 1. Check if profile exists
      const { data: existingProfile } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .maybeSingle();

      if (!existingProfile) {
        const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(userId);
        const username = approvalData?.full_name || authUser?.user?.user_metadata?.username || 'Kullanıcı';
        
        const { error: profileError } = await supabaseAdmin
          .from('profiles')
          .insert({
            id: userId,
            username: username,
            is_teacher_approved: true,
            created_at: new Date().toISOString(),
          });

        if (profileError) {
          return new Response(JSON.stringify({ error: 'Profil oluşturulamadı: ' + profileError.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      } else {
        await supabaseAdmin
          .from('profiles')
          .update({ is_teacher_approved: true })
          .eq('id', userId);
      }

      // 2. Check if teacher role exists
      const { data: existingRole } = await supabaseAdmin
        .from('user_roles')
        .select('id')
        .eq('user_id', userId)
        .eq('role', 'teacher')
        .maybeSingle();

      if (!existingRole) {
        // Delete any non-teacher roles first (clean up)
        await supabaseAdmin
          .from('user_roles')
          .delete()
          .eq('user_id', userId);

        const { error: roleError } = await supabaseAdmin
          .from('user_roles')
          .insert({ user_id: userId, role: 'teacher' });

        if (roleError) {
          return new Response(JSON.stringify({ error: 'Rol atanamadı: ' + roleError.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }

      return new Response(JSON.stringify({ success: true, message: 'Profil başarıyla onarıldı' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Geçersiz action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Edge function error:', error);
    return new Response(JSON.stringify({ error: 'Sunucu hatası: ' + (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
