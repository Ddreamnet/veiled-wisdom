# Push Notification — One-Time Manual Setup

Run these steps **once** after applying `phase4_push_notifications.sql`.

## 1. Insert secrets into `private.secrets`

Replace `<YOUR_STRONG_SECRET>` with a random 64-char hex string (e.g. `openssl rand -hex 32`).

Run in **Supabase Dashboard → SQL Editor**:

```sql
INSERT INTO private.secrets (name, value) VALUES
  ('supabase_project_url', 'https://egjuybvfhxazpvbeaupy.supabase.co')
ON CONFLICT (name) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO private.secrets (name, value) VALUES
  ('internal_trigger_secret', '<YOUR_STRONG_SECRET>')
ON CONFLICT (name) DO UPDATE SET value = EXCLUDED.value;
```

> **Idempotent** — safe to re-run if you need to rotate a secret.

## 2. Add Edge Function secrets

In **Supabase Dashboard → Edge Functions → Secrets**, add:

| Name | Value |
|---|---|
| `INTERNAL_TRIGGER_SECRET` | Same value as `<YOUR_STRONG_SECRET>` above |
| `FCM_SERVICE_ACCOUNT_JSON` | Full JSON from Firebase Console → Project Settings → Service Accounts → Generate new private key |

## 3. Enable `pg_cron` and schedule appointment reminders

1. Go to **Supabase Dashboard → Database → Extensions**
2. Search for **pg_cron** — ensure it is **ON** (usually enabled by default)
3. Run the following SQL in the SQL Editor:

```sql
SELECT cron.schedule(
  'push-appointment-reminder',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := (SELECT value FROM private.secrets WHERE name = 'supabase_project_url' LIMIT 1)
           || '/functions/v1/send-appointment-push-reminder',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-internal-trigger-secret',
      (SELECT value FROM private.secrets WHERE name = 'internal_trigger_secret' LIMIT 1)
    ),
    body := '{}'::jsonb
  );
  $$
);
```

## 4. iOS Setup (Xcode)

1. Open `ios/App/App.xcodeproj` in Xcode
2. Select the App target → Signing & Capabilities → + Capability → **Push Notifications**
3. Add `firebase-ios-sdk` SPM package (already configured in `Package.swift`)
4. Add `GoogleService-Info.plist` to the App target (already present)

## 5. Deploy Edge Functions

```bash
supabase functions deploy send-push-notification
supabase functions deploy send-appointment-push-reminder
```

## 6. Sync Capacitor

```bash
npx cap sync
```
