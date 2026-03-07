

# Fix: Replace `extensions.http_post` with `net.http_post`

## Root Cause

The `pg_net` extension registers its functions in the `net` schema (or sometimes `extensions` depending on the Supabase version), but the function signature `extensions.http_post(url => text, headers => jsonb, body => jsonb)` does not match what's available. The correct call is `net.http_post(...)`.

When the trigger fails, it rolls back the entire INSERT into `messages`, causing the 404 error on the client side.

## Fix

### 1. `supabase/migrations_manual/phase4_push_notifications.sql`

Update all three trigger functions to use `net.http_post` instead of `extensions.http_post`:

- `notify_new_message` (line 89)
- `notify_new_payment_request` (around line 133)
- `notify_new_teacher_approval` (around line 177)

Change: `PERFORM extensions.http_post(` → `PERFORM net.http_post(`

Also update `SET search_path` from `public, extensions, private` → `public, net, private`

### 2. User must re-run updated functions in SQL Editor

After the file is updated, the user needs to copy only the three `CREATE OR REPLACE FUNCTION` blocks and run them in the Supabase SQL Editor. This will update the live trigger functions without needing to recreate triggers.

### 3. No frontend changes needed

The `useMessages.ts` code is correct. The INSERT fails because the trigger aborts the transaction.

## Quick SQL to run after update

```sql
-- Just the function bodies need updating (triggers already exist)
CREATE OR REPLACE FUNCTION public.notify_new_message() ...
CREATE OR REPLACE FUNCTION public.notify_new_payment_request() ...
CREATE OR REPLACE FUNCTION public.notify_new_teacher_approval() ...
```

