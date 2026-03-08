import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-internal-trigger-secret",
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function shortId(uuid: string): string {
  return uuid.replace(/-/g, "");
}

// ── FCM v1 Auth ──────────────────────────────────────────────────────────────
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

  // Import the private key
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

// ── FCM v1 Send ──────────────────────────────────────────────────────────────
interface FcmMessage {
  token: string;
  notification: { title: string; body: string };
  data?: Record<string, string>;
  android?: Record<string, unknown>;
  apns?: Record<string, unknown>;
}

interface SendResult {
  token: string;
  success: boolean;
  shouldDisable: boolean;
  error?: string;
}

async function sendFcmMessage(
  sa: ServiceAccount,
  message: FcmMessage
): Promise<SendResult> {
  const accessToken = await getAccessToken(sa);
  const url = `https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`;

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ message }),
  });

  if (resp.ok) {
    return { token: message.token, success: true, shouldDisable: false };
  }

  const errorBody = await resp.json().catch(() => ({}));
  const status = resp.status;
  const errorCode =
    errorBody?.error?.details?.[0]?.errorCode ||
    errorBody?.error?.status ||
    "";

  // UNREGISTERED (404): token is no longer valid
  if (status === 404 || errorCode === "UNREGISTERED") {
    return {
      token: message.token,
      success: false,
      shouldDisable: true,
      error: "UNREGISTERED",
    };
  }

  // INVALID_ARGUMENT: only disable if the token itself is the problem
  if (errorCode === "INVALID_ARGUMENT") {
    const msg = errorBody?.error?.message || "";
    const tokenRelated =
      msg.toLowerCase().includes("registration") ||
      msg.toLowerCase().includes("token");
    return {
      token: message.token,
      success: false,
      shouldDisable: tokenRelated,
      error: `INVALID_ARGUMENT: ${msg}`,
    };
  }

  // All other errors: do NOT disable token
  return {
    token: message.token,
    success: false,
    shouldDisable: false,
    error: `${status} ${errorCode}: ${JSON.stringify(errorBody?.error?.message || "")}`,
  };
}

// ── Supabase client ──────────────────────────────────────────────────────────
function getSupabaseAdmin() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

// ── Handlers ─────────────────────────────────────────────────────────────────
async function handleChatMessage(
  record: Record<string, unknown>,
  sa: ServiceAccount,
  supabase: ReturnType<typeof createClient>
) {
  const senderId = record.sender_id as string;
  const conversationId = record.conversation_id as string;
  const messageText = (record.body as string) || (record.content as string) || "";

  // Get conversation participants (excluding sender)
  const { data: participants } = await supabase
    .from("conversation_participants")
    .select("user_id")
    .eq("conversation_id", conversationId)
    .neq("user_id", senderId);

  if (!participants?.length) return;

  // Get sender profile
  const { data: senderProfile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", senderId)
    .single();

  const senderName = senderProfile?.username || "Birisi";

  for (const participant of participants) {
    const recipientId = participant.user_id;
    const dedupKey = `msg_${record.id}_${recipientId}`;

    // Dedup check
    const { error: dedupError } = await supabase
      .from("notification_log")
      .insert({ dedup_key: dedupKey, event_type: "chat_message" });

    if (dedupError) continue; // Already sent

    // Count unread messages
    const { count: unreadCount } = await supabase
      .from("messages")
      .select("*", { count: "exact", head: true })
      .eq("conversation_id", conversationId)
      .neq("sender_id", recipientId)
      .eq("is_read", false);

    const unread = unreadCount || 1;
    const preview =
      content.length > 60 ? content.substring(0, 57) + "..." : content;
    const body =
      unread > 1
        ? `${senderName}: ${unread} yeni mesaj • Son: ${preview}`
        : `${senderName}: ${preview}`;

    // Get recipient devices
    const { data: devices } = await supabase
      .from("push_devices")
      .select("fcm_token, platform")
      .eq("user_id", recipientId)
      .eq("enabled", true);

    if (!devices?.length) continue;

    const androidTag = `chat_${conversationId}`;
    const iosCollapseId = `c_${shortId(conversationId)}`;

    for (const device of devices) {
      const isIos = device.platform === "ios";

      const message: FcmMessage = {
        token: device.fcm_token,
        notification: { title: senderName, body },
        data: {
          type: "chat",
          conversationId,
          senderId,
        },
        ...(isIos
          ? {
              apns: {
                headers: {
                  "apns-collapse-id": iosCollapseId,
                },
                payload: {
                  aps: {
                    "thread-id": iosCollapseId,
                    badge: unread,
                    sound: "default",
                  },
                },
              },
            }
          : {
              android: {
                notification: {
                  tag: androidTag,
                  channel_id: "messages",
                  click_action: "FLUTTER_NOTIFICATION_CLICK",
                },
                collapse_key: androidTag,
              },
            }),
      };

      const result = await sendFcmMessage(sa, message);

      if (result.shouldDisable) {
        await supabase
          .from("push_devices")
          .update({ enabled: false, updated_at: new Date().toISOString() })
          .eq("fcm_token", result.token);
      }

      // Update log
      await supabase
        .from("notification_log")
        .update({
          delivered: result.success,
          error_message: result.error || null,
        })
        .eq("dedup_key", dedupKey);
    }
  }
}

async function handlePaymentRequest(
  record: Record<string, unknown>,
  sa: ServiceAccount,
  supabase: ReturnType<typeof createClient>
) {
  const paymentId = record.id as string;
  const amount = record.amount as number;
  const refCode = record.reference_code as string;

  // Get all admin users
  const { data: admins } = await supabase
    .from("user_roles")
    .select("user_id")
    .eq("role", "admin");

  if (!admins?.length) return;

  for (const admin of admins) {
    const dedupKey = `pay_${paymentId}_${admin.user_id}`;

    const { error: dedupError } = await supabase
      .from("notification_log")
      .insert({ dedup_key: dedupKey, event_type: "payment_request" });

    if (dedupError) continue;

    const { data: devices } = await supabase
      .from("push_devices")
      .select("fcm_token, platform")
      .eq("user_id", admin.user_id)
      .eq("enabled", true);

    if (!devices?.length) continue;

    for (const device of devices) {
      const isIos = device.platform === "ios";

      const message: FcmMessage = {
        token: device.fcm_token,
        notification: {
          title: "Yeni Ödeme Talebi",
          body: `${amount} ₺ • Ref: ${refCode}`,
        },
        data: {
          type: "admin_payment",
          paymentRequestId: paymentId,
        },
        ...(isIos
          ? {
              apns: {
                payload: {
                  aps: { sound: "default" },
                },
              },
            }
          : {
              android: {
                notification: {
                  channel_id: "admin",
                },
              },
            }),
      };

      const result = await sendFcmMessage(sa, message);

      if (result.shouldDisable) {
        await supabase
          .from("push_devices")
          .update({ enabled: false, updated_at: new Date().toISOString() })
          .eq("fcm_token", result.token);
      }

      await supabase
        .from("notification_log")
        .update({
          delivered: result.success,
          error_message: result.error || null,
        })
        .eq("dedup_key", dedupKey);
    }
  }
}

async function handleTeacherApproval(
  record: Record<string, unknown>,
  sa: ServiceAccount,
  supabase: ReturnType<typeof createClient>
) {
  const approvalId = record.id as string;
  const username = (record.username as string) || "Uzman";

  const { data: admins } = await supabase
    .from("user_roles")
    .select("user_id")
    .eq("role", "admin");

  if (!admins?.length) return;

  for (const admin of admins) {
    const dedupKey = `approval_${approvalId}_${admin.user_id}`;

    const { error: dedupError } = await supabase
      .from("notification_log")
      .insert({ dedup_key: dedupKey, event_type: "teacher_approval" });

    if (dedupError) continue;

    const { data: devices } = await supabase
      .from("push_devices")
      .select("fcm_token, platform")
      .eq("user_id", admin.user_id)
      .eq("enabled", true);

    if (!devices?.length) continue;

    for (const device of devices) {
      const isIos = device.platform === "ios";

      const message: FcmMessage = {
        token: device.fcm_token,
        notification: {
          title: "Yeni Uzman Başvurusu",
          body: `${username} uzman olmak için başvurdu`,
        },
        data: {
          type: "admin_approval",
          approvalId,
        },
        ...(isIos
          ? {
              apns: {
                payload: {
                  aps: { sound: "default" },
                },
              },
            }
          : {
              android: {
                notification: {
                  channel_id: "admin",
                },
              },
            }),
      };

      const result = await sendFcmMessage(sa, message);

      if (result.shouldDisable) {
        await supabase
          .from("push_devices")
          .update({ enabled: false, updated_at: new Date().toISOString() })
          .eq("fcm_token", result.token);
      }

      await supabase
        .from("notification_log")
        .update({
          delivered: result.success,
          error_message: result.error || null,
        })
        .eq("dedup_key", dedupKey);
    }
  }
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
    if (!saJson) {
      throw new Error("FCM_SERVICE_ACCOUNT_JSON not configured");
    }
    const sa: ServiceAccount = JSON.parse(saJson);
    const supabase = getSupabaseAdmin();

    const { type, record } = await req.json();

    switch (type) {
      case "chat_message":
        await handleChatMessage(record, sa, supabase);
        break;
      case "payment_request":
        await handlePaymentRequest(record, sa, supabase);
        break;
      case "teacher_approval":
        await handleTeacherApproval(record, sa, supabase);
        break;
      default:
        console.warn(`Unknown notification type: ${type}`);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Push notification error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
