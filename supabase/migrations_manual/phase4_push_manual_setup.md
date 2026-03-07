# Push Notification — One-Time Manual Setup

Run these steps **once** after applying `phase4_push_notifications.sql`.

## 1. Enable Vault extension (Dashboard)

1. Go to **Supabase Dashboard → Database → Extensions**
2. Search for **vault**
3. Toggle it **ON** (schema should be `vault`)
4. Wait for confirmation that the extension is enabled

## 2. Store secrets in Vault

Replace `<YOUR_STRONG_SECRET>` with a random 64-char hex string (e.g. `openssl rand -hex 32`).

```sql
SELECT vault.create_secret(
  'https://egjuybvfhxazpvbeaupy.supabase.co',
  'supabase_project_url',
  'Project URL for trigger-to-function calls'
);

SELECT vault.create_secret(
  '<YOUR_STRONG_SECRET>',
  'internal_trigger_secret',
  'Auth secret for DB trigger to edge function calls'
);
```

## 3. Add Edge Function secrets

In Supabase Dashboard → Edge Functions → Secrets, add:

| Name | Value |
|---|---|
| `INTERNAL_TRIGGER_SECRET` | Same value as `<YOUR_STRONG_SECRET>` above |
| `FCM_SERVICE_ACCOUNT_JSON` | Full JSON from Firebase Console → Project Settings → Service Accounts → Generate new private key |

## 4. Enable pg_cron and schedule appointment reminders

```sql
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

SELECT cron.schedule(
  'push-appointment-reminder',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_project_url' LIMIT 1)
           || '/functions/v1/send-appointment-push-reminder',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-internal-trigger-secret',
      (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'internal_trigger_secret' LIMIT 1)
    ),
    body := '{}'::jsonb
  );
  $$
);
```

## 5. iOS Setup (Xcode)

1. Open `ios/App/App.xcodeproj` in Xcode
2. Select the App target → Signing & Capabilities → + Capability → **Push Notifications**
3. Add `firebase-ios-sdk` SPM package (already configured in `Package.swift`)
4. Add `GoogleService-Info.plist` to the App target (already present)

## 6. Deploy Edge Functions

```bash
supabase functions deploy send-push-notification
supabase functions deploy send-appointment-push-reminder
```

## 7. Sync Capacitor

```bash
npx cap sync
```
