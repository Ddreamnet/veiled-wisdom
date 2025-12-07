import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting appointment reminder check...");

    // Calculate time range: 23-25 hours from now
    const now = new Date();
    const twentyThreeHoursLater = new Date(now.getTime() + 23 * 60 * 60 * 1000);
    const twentyFiveHoursLater = new Date(now.getTime() + 25 * 60 * 60 * 1000);

    // Fetch confirmed appointments in the 24-hour window
    const { data: appointments, error } = await supabase
      .from("appointments")
      .select(
        `
        *,
        listing:listings(title),
        customer:profiles!appointments_customer_id_fkey(username),
        teacher:profiles!appointments_teacher_id_fkey(username)
      `,
      )
      .eq("status", "confirmed")
      .gte("start_ts", twentyThreeHoursLater.toISOString())
      .lte("start_ts", twentyFiveHoursLater.toISOString());

    if (error) {
      console.error("Error fetching appointments:", error);
      throw error;
    }

    console.log(`Found ${appointments?.length || 0} appointments to remind`);

    if (!appointments || appointments.length === 0) {
      return new Response(JSON.stringify({ success: true, sent: 0 }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    let emailsSent = 0;

    // Send reminder emails for each appointment
    for (const appointment of appointments) {
      try {
        // Get user emails
        const {
          data: { user: customerUser },
        } = await supabase.auth.admin.getUserById(appointment.customer_id);
        const {
          data: { user: teacherUser },
        } = await supabase.auth.admin.getUserById(appointment.teacher_id);

        if (!customerUser?.email || !teacherUser?.email) {
          console.error(`Missing emails for appointment ${appointment.id}`);
          continue;
        }

        const formattedDate = new Date(appointment.start_ts).toLocaleString("tr-TR", {
          dateStyle: "long",
          timeStyle: "short",
        });

        // Send to customer
        await resend.emails.send({
          from: "Leyl <onboarding@resend.dev>",
          to: [customerUser.email],
          subject: "Randevu Hatırlatması - Yarın!",
          html: `
            <h1>Merhaba ${appointment.customer?.username},</h1>
            <p>Bu bir hatırlatmadır: Randevunuz yaklaşıyor!</p>
            
            <h2>Randevu Detayları:</h2>
            <ul>
              <li><strong>İlan:</strong> ${appointment.listing?.title}</li>
              <li><strong>Uzman:</strong> ${appointment.teacher?.username}</li>
              <li><strong>Tarih & Saat:</strong> ${formattedDate}</li>
              <li><strong>Süre:</strong> ${appointment.duration_minutes} dakika</li>
              <li><strong>Ücret:</strong> ${appointment.price_at_booking} TL</li>
            </ul>
            
            <p>Randevunuza hazır olun. Görüşmek üzere!</p>
            
            <p>İyi günler,<br>Leyl Ekibi</p>
          `,
        });

        // Send to teacher
        await resend.emails.send({
          from: "Leyl <onboarding@resend.dev>",
          to: [teacherUser.email],
          subject: "Randevu Hatırlatması - Yarın!",
          html: `
            <h1>Merhaba ${appointment.teacher?.username},</h1>
            <p>Bu bir hatırlatmadır: Randevunuz yaklaşıyor!</p>
            
            <h2>Randevu Detayları:</h2>
            <ul>
              <li><strong>İlan:</strong> ${appointment.listing?.title}</li>
              <li><strong>Öğrenci:</strong> ${appointment.customer?.username}</li>
              <li><strong>Tarih & Saat:</strong> ${formattedDate}</li>
              <li><strong>Süre:</strong> ${appointment.duration_minutes} dakika</li>
              <li><strong>Ücret:</strong> ${appointment.price_at_booking} TL</li>
            </ul>
            
            <p>Randevunuza hazır olun. İyi dersler!</p>
            
            <p>İyi günler,<br>Leyl Ekibi</p>
          `,
        });

        emailsSent += 2;
        console.log(`Reminders sent for appointment ${appointment.id}`);
      } catch (emailError: any) {
        console.error(`Error sending reminder for appointment ${appointment.id}:`, emailError);
      }
    }

    console.log(`Total emails sent: ${emailsSent}`);

    return new Response(JSON.stringify({ success: true, sent: emailsSent }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-appointment-reminder function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
