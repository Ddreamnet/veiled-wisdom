

# Final Auth Model Cleanup

The plan is approved with one targeted revision: make the authentication model fully consistent across all trigger-to-function and cron-to-function calls.

## Changes to the Approved Plan

### 1. Remove all anon key references
- No mention of `supabase_anon_key`, `SUPABASE_ANON_KEY`, or anon key as an auth path anywhere in the implementation.

### 2. Unified auth model

| Caller | Target | Auth Header | Secret Source |
|---|---|---|---|
| DB triggers (`messages`, `payment_requests`, `teacher_approvals`) | `send-push-notification` | `x-internal-trigger-secret` | Supabase Vault (`internal_trigger_secret`) |
| `pg_cron` appointment reminder | `send-appointment-push-reminder` | `x-internal-trigger-secret` | Supabase Vault (`internal_trigger_secret`) |

Both DB triggers and the cron job use the **same** `x-internal-trigger-secret` header, reading the value from Vault at runtime. There is no separate `CRON_SECRET` path for push notification functions.

### 3. Edge function validation (both functions, identical)
```typescript
const secret = req.headers.get('x-internal-trigger-secret');
if (secret !== Deno.env.get('INTERNAL_TRIGGER_SECRET')) {
  return new Response('Unauthorized', { status: 401 });
}
```

### 4. Required secrets (final, complete)

| Secret | Location | Purpose |
|---|---|---|
| `internal_trigger_secret` | Supabase Vault (DB) | Triggers + cron read this at runtime |
| `INTERNAL_TRIGGER_SECRET` | Edge Function secret | Both push functions validate against this |
| `supabase_project_url` | Supabase Vault (DB) | Triggers + cron build edge function URL |
| `FCM_SERVICE_ACCOUNT_JSON` | Edge Function secret | FCM v1 API auth |

`CRON_SECRET` is **not** used by any push notification function. Existing functions that already use `CRON_SECRET` (like `cleanup-ended-calls`) are unaffected.

### 5. Everything else unchanged
All other aspects -- tables, dedup, FCM error handling, chat grouping, deep linking, iOS/Android native setup, test checklist -- remain exactly as previously agreed.

