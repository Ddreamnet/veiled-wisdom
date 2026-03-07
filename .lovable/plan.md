

# Update manual setup doc to use Dashboard for extensions

The `CREATE EXTENSION` commands fail on Supabase hosted because extensions must be enabled via the Dashboard UI, not raw SQL.

## Change
Update `supabase/migrations_manual/phase4_push_manual_setup.md`:
- Step 1: Replace the SQL command with instructions to enable `vault` via Supabase Dashboard → Database → Extensions
- Step 4: Replace `CREATE EXTENSION pg_cron` with a note to verify it's enabled via Dashboard, then only run the `cron.schedule` SQL

No other files affected.

