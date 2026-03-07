import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-internal-trigger-secret",
};

// ── FCM v1 Auth (same pattern as send-push-notification) ─────────────────────
interface ServiceAccount {
  project_id: string;
  client_email: string;
  private_key: string;
}

let cachedAccessToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(sa: ServiceAccount): Promise<string> {
  if (cachedAccessToken && Date.now() < cachedAccessToken.expiresAt - 60_000) {
    return cachedAccessToken.token;
  }

  const now = Math.floor(Date.now() / 1000);
  const header = btoa(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = btoa(
    JSON.stringify({
      iss: sa.client_email,
      scope: "https://www.googleapis.com/auth/firebase.messaging",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    })
  );

  const textEncoder = new TextEncoder();
  const input = textEncoder.encode(`${header}.${claim}`);

  const pemContents = sa.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\n/g, "");
  const binaryKey = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));

  const key = await crypto.subtle.importKey(
    "pkcs8",
    binaryKey,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, input);
  const sig = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const jwt = `${header}.${claim}.${sig}`;

  const resp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  const data = await resp.json();
  if (!data.access_token) throw new Error(`OAuth failed: ${JSON.stringify(data)}`);

  cachedAccessToken = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };

  return data.access_token;
}

async function sendFcm(
  sa: ServiceAccount,
  token: string,
  title: string,
  body: string,
  data: Record<string, string>
): Promise<{ success: boolean; shouldDisable: boolean; error?: string }> {
  const accessToken = await getAccessToken(sa);
  const url = `https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`;

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: {
        token,
        notification: { title, body },
        data,
        android: {
          notification: { channel_id: "appointments" },
        },
        apns: {
          payload: { aps: { sound: "default" } },
        },
      },
    }),
  });

  if (resp.ok) return { success: true, shouldDisable: false };

  const errorBody = await resp.json().catch(() => ({}));
  const status = resp.status;
  const errorCode =
    errorBody?.error?.details?.[0]?.errorCode ||
    errorBody?.error?.status ||
    "";

  if (status === 404 || errorCode === "UNREGISTERED") {
    return { success: false, shouldDisable: true, error: "UNREGISTERED" };
  }

  if (errorCode === "INVALID_ARGUMENT") {
    const msg = errorBody?.error?.message || "";
    const tokenRelated =
      msg.toLowerCase().includes("registration") ||
      msg.toLowerCase().includes("token");
    return { success: false, shouldDisable: tokenRelated, error: msg };
  }

  return { success: false, shouldDisable: false, error: `${status} ${errorCode}` };
}

// ── Main ─────────────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Auth: validate internal trigger secret
  const triggerSecret = req.headers.get("x-internal-trigger-secret");
  if (triggerSecret !== Deno.env.get("INTERNAL_TRIGGER_SECRET")) {
    return new Response("Unauthorized", { status: 401, headers: corsHeaders });
  }

  try {
    const saJson = Deno.env.get("FCM_SERVICE_ACCOUNT_JSON");
    if (!saJson) throw new Error("FCM_SERVICE_ACCOUNT_JSON not configured");
    const sa: ServiceAccount = JSON.parse(saJson);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Find confirmed appointments starting in ~10 minutes (8-12 min window)
    const now = new Date();
    const windowStart = new Date(now.getTime() + 8 * 60 * 1000).toISOString();
    const windowEnd = new Date(now.getTime() + 12 * 60 * 1000).toISOString();

    const { data: appointments } = await supabase
      .from("appointments")
      .select(
        `id, start_ts, customer_id, teacher_id,
         listing:listings(title),
         customer:profiles!appointments_customer_id_fkey(username),
         teacher:profiles!appointments_teacher_id_fkey(username)`
      )
      .eq("status", "confirmed")
      .gte("start_ts", windowStart)
      .lte("start_ts", windowEnd);

    if (!appointments?.length) {
      return new Response(JSON.stringify({ sent: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let sent = 0;

    for (const appt of appointments) {
      const listingTitle =
        (appt.listing as any)?.title || "Randevu";
      const recipients = [
        {
          userId: appt.customer_id,
          title: "Randevu Hatırlatması",
          body: `"${listingTitle}" randevunuz 10 dakika içinde başlıyor`,
        },
        {
          userId: appt.teacher_id,
          title: "Randevu Hatırlatması",
          body: `"${listingTitle}" randevunuz 10 dakika içinde başlıyor`,
        },
      ];

      for (const recipient of recipients) {
        const dedupKey = `appt_remind_${appt.id}_${recipient.userId}`;

        const { error: dedupError } = await supabase
          .from("notification_log")
          .insert({
            dedup_key: dedupKey,
            event_type: "appointment_reminder",
          });

        if (dedupError) continue; // Already sent

        const { data: devices } = await supabase
          .from("push_devices")
          .select("fcm_token, platform")
          .eq("user_id", recipient.userId)
          .eq("enabled", true);

        if (!devices?.length) continue;

        for (const device of devices) {
          const result = await sendFcm(sa, device.fcm_token, recipient.title, recipient.body, {
            type: "appointment",
            appointmentId: appt.id,
          });

          if (result.shouldDisable) {
            await supabase
              .from("push_devices")
              .update({ enabled: false, updated_at: new Date().toISOString() })
              .eq("fcm_token", device.fcm_token);
          }

          await supabase
            .from("notification_log")
            .update({
              delivered: result.success,
              error_message: result.error || null,
            })
            .eq("dedup_key", dedupKey);

          if (result.success) sent++;
        }
      }
    }

    return new Response(JSON.stringify({ sent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Appointment reminder error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
