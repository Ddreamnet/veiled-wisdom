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

interface AppointmentEmailRequest {
  customerUserId: string;
  customerName: string;
  teacherUserId: string;
  teacherName: string;
  listingTitle: string;
  startTime: string;
  duration: number;
  price: number;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      customerUserId,
      customerName,
      teacherUserId,
      teacherName,
      listingTitle,
      startTime,
      duration,
      price,
    }: AppointmentEmailRequest = await req.json();

    console.log("Sending appointment emails:", {
      customerUserId,
      teacherUserId,
      listingTitle,
    });

    // Get emails from auth.users using Supabase admin client
    const {
      data: { user: customerUser },
    } = await supabase.auth.admin.getUserById(customerUserId);
    const {
      data: { user: teacherUser },
    } = await supabase.auth.admin.getUserById(teacherUserId);

    if (!customerUser?.email || !teacherUser?.email) {
      throw new Error("Could not fetch user emails");
    }

    const formattedDate = new Date(startTime).toLocaleString("tr-TR", {
      dateStyle: "long",
      timeStyle: "short",
    });

    // Send email to customer
    const customerEmailResponse = await resend.emails.send({
      from: "Leyl <onboarding@resend.dev>",
      to: [customerUser.email],
      subject: "Randevu Talebiniz Alındı",
      html: `
        <h1>Merhaba ${customerName},</h1>
        <p>Randevu talebiniz başarıyla alındı!</p>
        
        <h2>Randevu Detayları:</h2>
        <ul>
          <li><strong>İlan:</strong> ${listingTitle}</li>
          <li><strong>Uzman:</strong> ${teacherName}</li>
          <li><strong>Tarih & Saat:</strong> ${formattedDate}</li>
          <li><strong>Süre:</strong> ${duration} dakika</li>
          <li><strong>Ücret:</strong> ${price} TL</li>
        </ul>
        
        <p>Uzmandan onay geldiğinde size bildirim göndereceğiz.</p>
        
        <p>İyi günler,<br>Leyl Ekibi</p>
      `,
    });

    console.log("Customer email sent:", customerEmailResponse);

    // Send email to teacher
    const teacherEmailResponse = await resend.emails.send({
      from: "Leyl <onboarding@resend.dev>",
      to: [teacherUser.email],
      subject: "Yeni Randevu Talebi",
      html: `
        <h1>Merhaba ${teacherName},</h1>
        <p>Yeni bir randevu talebiniz var!</p>
        
        <h2>Randevu Detayları:</h2>
        <ul>
          <li><strong>İlan:</strong> ${listingTitle}</li>
          <li><strong>Öğrenci:</strong> ${customerName}</li>
          <li><strong>Tarih & Saat:</strong> ${formattedDate}</li>
          <li><strong>Süre:</strong> ${duration} dakika</li>
          <li><strong>Ücret:</strong> ${price} TL</li>
        </ul>
        
        <p>Lütfen platformdan randevuyu onaylayın veya reddedin.</p>
        
        <p>İyi günler,<br>Leyl Ekibi</p>
      `,
    });

    console.log("Teacher email sent:", teacherEmailResponse);

    return new Response(
      JSON.stringify({
        success: true,
        customerEmailId: customerEmailResponse.data?.id,
        teacherEmailId: teacherEmailResponse.data?.id,
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
    console.error("Error in send-appointment-email function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
