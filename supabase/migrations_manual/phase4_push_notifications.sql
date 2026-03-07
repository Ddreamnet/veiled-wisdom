-- ═══════════════════════════════════════════════════════════════════════════════
-- PUSH NOTIFICATION SYSTEM — Phase 4
-- Tables, trigger functions, and triggers (repo-tracked)
-- Secrets are read from private.secrets at runtime — nothing hardcoded.
-- Only secret VALUES are inserted manually via SQL Editor (see manual_setup.md).
-- ═══════════════════════════════════════════════════════════════════════════════

-- 1. Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- 2. Private schema for secrets (never exposed via PostgREST / API)
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

-- Only postgres (trigger / cron context) can read
GRANT USAGE ON SCHEMA private TO postgres;
GRANT SELECT ON private.secrets TO postgres;

-- 3. push_devices table
CREATE TABLE IF NOT EXISTS public.push_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  device_id text NOT NULL,
  fcm_token text NOT NULL,
  platform text NOT NULL CHECK (platform IN ('android', 'ios', 'web')),
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, device_id)
);

ALTER TABLE public.push_devices ENABLE ROW LEVEL SECURITY;

-- Users can manage their own devices
CREATE POLICY "Users manage own devices"
  ON public.push_devices FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 4. notification_log table (dedup, no client access)
CREATE TABLE IF NOT EXISTS public.notification_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dedup_key text UNIQUE NOT NULL,
  event_type text NOT NULL,
  payload jsonb,
  delivered boolean NOT NULL DEFAULT false,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_log ENABLE ROW LEVEL SECURITY;
-- No client policies — only service_role / trigger context can access

-- 5. Trigger function: new chat message
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

CREATE TRIGGER trg_notify_new_message
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_message();

-- 6. Trigger function: new payment request
CREATE OR REPLACE FUNCTION public.notify_new_payment_request()
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
      'type', 'payment_request',
      'table', 'payment_requests',
      'record', row_to_json(NEW)
    )
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_new_payment_request
  AFTER INSERT ON public.payment_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_payment_request();

-- 7. Trigger function: new teacher approval request
CREATE OR REPLACE FUNCTION public.notify_new_teacher_approval()
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
      'type', 'teacher_approval',
      'table', 'teacher_approvals',
      'record', row_to_json(NEW)
    )
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_new_teacher_approval
  AFTER INSERT ON public.teacher_approvals
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_teacher_approval();
