-- ═══════════════════════════════════════════════════════════════════════════════
-- PUSH NOTIFICATION SYSTEM — Phase 4
-- Tables, trigger functions, and triggers (repo-tracked)
-- Secrets are read from Supabase Vault at runtime — nothing hardcoded.
-- ═══════════════════════════════════════════════════════════════════════════════

-- 1. Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- 2. push_devices table
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

-- 3. notification_log table (dedup, no client access)
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

-- 4. Trigger function: new chat message
CREATE OR REPLACE FUNCTION public.notify_new_message()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  _url text;
  _secret text;
BEGIN
  SELECT decrypted_secret INTO _url
    FROM vault.decrypted_secrets WHERE name = 'supabase_project_url' LIMIT 1;
  SELECT decrypted_secret INTO _secret
    FROM vault.decrypted_secrets WHERE name = 'internal_trigger_secret' LIMIT 1;

  IF _url IS NULL OR _secret IS NULL THEN
    RAISE WARNING 'push: vault secrets not configured, skipping notification';
    RETURN NEW;
  END IF;

  PERFORM net.http_post(
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

-- 5. Trigger function: new payment request
CREATE OR REPLACE FUNCTION public.notify_new_payment_request()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  _url text;
  _secret text;
BEGIN
  SELECT decrypted_secret INTO _url
    FROM vault.decrypted_secrets WHERE name = 'supabase_project_url' LIMIT 1;
  SELECT decrypted_secret INTO _secret
    FROM vault.decrypted_secrets WHERE name = 'internal_trigger_secret' LIMIT 1;

  IF _url IS NULL OR _secret IS NULL THEN
    RAISE WARNING 'push: vault secrets not configured, skipping notification';
    RETURN NEW;
  END IF;

  PERFORM net.http_post(
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

-- 6. Trigger function: new teacher approval request
CREATE OR REPLACE FUNCTION public.notify_new_teacher_approval()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  _url text;
  _secret text;
BEGIN
  SELECT decrypted_secret INTO _url
    FROM vault.decrypted_secrets WHERE name = 'supabase_project_url' LIMIT 1;
  SELECT decrypted_secret INTO _secret
    FROM vault.decrypted_secrets WHERE name = 'internal_trigger_secret' LIMIT 1;

  IF _url IS NULL OR _secret IS NULL THEN
    RAISE WARNING 'push: vault secrets not configured, skipping notification';
    RETURN NEW;
  END IF;

  PERFORM net.http_post(
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
