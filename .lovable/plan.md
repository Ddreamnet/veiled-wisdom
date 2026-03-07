

# Harden Private Secrets Fallback for Push Notifications

## Overview

Replace all Vault references with a locked-down `private.secrets` table. The schema/table/triggers stay version-controlled in the migration file; only secret VALUES are inserted manually.

## Files Changed

### 1. `supabase/migrations_manual/phase4_push_notifications.sql` — Full rewrite

**Add private schema block** after `pg_net` extension (before tables):

```sql
-- Private schema for secrets (never exposed via API)
CREATE SCHEMA IF NOT EXISTS private;

CREATE TABLE IF NOT EXISTS private.secrets (
  name text PRIMARY KEY,
  value text NOT NULL
);

ALTER TABLE private.secrets OWNER TO postgres;

-- Lock down: no API roles can access
REVOKE ALL ON SCHEMA private FROM public, anon, authenticated, service_role;
REVOKE ALL ON ALL TABLES IN SCHEMA private FROM public, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA private REVOKE ALL ON TABLES FROM public, anon, authenticated, service_role;

-- Only postgres (trigger/cron context) can read
GRANT USAGE ON SCHEMA private TO postgres;
GRANT SELECT ON private.secrets TO postgres;
```

**Update all 3 trigger functions** with:
- `SECURITY DEFINER` (already present)
- Add `SET search_path = public, extensions, private`
- Replace `vault.decrypted_secrets` → `private.secrets` with fully qualified `private.secrets`
- Replace `net.http_post` → `extensions.http_post` (or `net.http_post` — pg_net installs in `extensions` schema on Supabase, so use `extensions.http_post`)
- Upgrade warning to `RAISE WARNING` with clear message including which secret is missing

Example for `notify_new_message`:
```sql
CREATE OR REPLACE FUNCTION public.notify_new_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, private
AS $$
DECLARE
  _url text;
  _secret text;
BEGIN
  SELECT value INTO _url FROM private.secrets WHERE name = 'supabase_project_url' LIMIT 1;
  SELECT value INTO _secret FROM private.secrets WHERE name = 'internal_trigger_secret' LIMIT 1;

  IF _url IS NULL THEN
    RAISE WARNING 'push: private.secrets missing "supabase_project_url", skipping notification';
    RETURN NEW;
  END IF;
  IF _secret IS NULL THEN
    RAISE WARNING 'push: private.secrets missing "internal_trigger_secret", skipping notification';
    RETURN NEW;
  END IF;

  PERFORM extensions.http_post(
    url    := _url || '/functions/v1/send-push-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-internal-trigger-secret', _secret
    ),
    body   := jsonb_build_object(
      'type', 'chat_message',
      'table', 'messages',
      'record', row_to_json(NEW)
    )
  );
  RETURN NEW;
END;
$$;
```

Same pattern for `notify_new_payment_request` and `notify_new_teacher_approval`.

### 2. `supabase/migrations_manual/phase4_push_manual_setup.md` — Rewrite

- **Remove** Step 1 (Vault) entirely
- **Step 1** → "Insert secrets into private.secrets" using idempotent UPSERT:
  ```sql
  INSERT INTO private.secrets (name, value) VALUES
    ('supabase_project_url', 'https://egjuybvfhxazpvbeaupy.supabase.co')
  ON CONFLICT (name) DO UPDATE SET value = EXCLUDED.value;

  INSERT INTO private.secrets (name, value) VALUES
    ('internal_trigger_secret', '<YOUR_STRONG_SECRET>')
  ON CONFLICT (name) DO UPDATE SET value = EXCLUDED.value;
  ```
- **Step 2** → Edge Function secrets (unchanged: `INTERNAL_TRIGGER_SECRET`, `FCM_SERVICE_ACCOUNT_JSON`)
- **Step 3** → pg_cron schedule, updated to read from `private.secrets`:
  ```sql
  SELECT cron.schedule(
    'push-appointment-reminder',
    '*/5 * * * *',
    $$
    SELECT extensions.http_post(
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
- Steps 4-6 → iOS setup, deploy, sync (renumbered, unchanged content)

### 3. `supabase/config.toml` — Verify only

Confirm `private` is NOT in any `exposed_schemas` or `extra_search_path`. Current file has no such config, so no change needed. The `private` schema is inherently hidden from PostgREST since Supabase only exposes `public` by default.

### 4. No other files change

Edge functions, frontend hook, native config, capacitor config — all unchanged.

## Security Summary

| Control | Implementation |
|---|---|
| Schema isolation | `private` schema, not in API exposed schemas |
| Permission lockdown | REVOKE ALL from public/anon/authenticated/service_role |
| Default privileges | Future tables in private also locked |
| Table ownership | `postgres` owns `private.secrets` |
| Function privilege | SECURITY DEFINER + explicit `search_path` |
| Qualified references | `private.secrets`, `extensions.http_post` |
| Missing secret defense | Individual RAISE WARNING per missing secret, no HTTP call made |
| Idempotent setup | UPSERT with ON CONFLICT |

