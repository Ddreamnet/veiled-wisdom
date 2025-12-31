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

interface StatusUpdateEmailRequest {
  customerUserId: string;
  customerName: string;
  teacherName: string;
  listingTitle: string;
  startTime: string;
  duration: number;
  price: number;
  status: "confirmed" | "cancelled";
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      customerUserId,
      customerName,
      teacherName,
      listingTitle,
      startTime,
      duration,
      price,
      status,
    }: StatusUpdateEmailRequest = await req.json();

    console.log("Sending status update email:", {
      customerUserId,
      listingTitle,
      status,
    });

    // Get customer email
    const {
      data: { user: customerUser },
    } = await supabase.auth.admin.getUserById(customerUserId);

    if (!customerUser?.email) {
      throw new Error("Could not fetch customer email");
    }

    const formattedDate = new Date(startTime).toLocaleString("tr-TR", {
      dateStyle: "long",
      timeStyle: "short",
    });

    const subject = status === "confirmed" ? "Randevunuz Onaylandı ✓" : "Randevunuz İptal Edildi";

    const message =
      status === "confirmed"
        ? `
        <h1>Merhaba ${customerName},</h1>
        <p><strong>Harika haber!</strong> Randevu talebiniz onaylandı.</p>
        
        <h2>Randevu Detayları:</h2>
        <ul>
          <li><strong>İlan:</strong> ${listingTitle}</li>
          <li><strong>Uzman:</strong> ${teacherName}</li>
          <li><strong>Tarih & Saat:</strong> ${formattedDate}</li>
          <li><strong>Süre:</strong> ${duration} dakika</li>
          <li><strong>Ücret:</strong> ${price} TL</li>
        </ul>
        
        <p>Randevunuz için hazır olun. İyi dersler!</p>
        
        <p>İyi günler,<br>Leyl Ekibi</p>
      `
        : `
        <h1>Merhaba ${customerName},</h1>
        <p>Üzgünüz, randevu talebiniz uzman tarafından reddedildi.</p>
        
        <h2>İptal Edilen Randevu:</h2>
        <ul>
          <li><strong>İlan:</strong> ${listingTitle}</li>
          <li><strong>Uzman:</strong> ${teacherName}</li>
          <li><strong>Tarih & Saat:</strong> ${formattedDate}</li>
        </ul>
        
        <p>Başka bir zaman dilimi için yeni bir randevu oluşturabilirsiniz.</p>
        
        <p>İyi günler,<br>Leyl Ekibi</p>
      `;

    const emailResponse = await resend.emails.send({
      from: "Leyl <onboarding@resend.dev>",
      to: [customerUser.email],
      subject,
      html: message,
    });

    console.log("Status update email sent:", emailResponse);

    return new Response(
      JSON.stringify({
        success: true,
        emailId: emailResponse.data?.id,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      },
    );
  } catch (error: any) {
    console.error("Error in send-status-update-email function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
