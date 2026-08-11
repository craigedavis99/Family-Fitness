# Supabase migrations

## Apply the initial schema

1. Open your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select the **family-fitness** project
3. Go to **SQL Editor** → **New query**
4. Copy the entire contents of `migrations/20260809120000_initial_schema.sql`
5. Click **Run**

You should see "Success" with no errors.

## Verify

In **Table Editor**, confirm these tables exist:

- `profiles`
- `metric_types` (8 seed rows)
- `exercises` (70+ seed rows)
- `metric_entries`, `workout_plans`, `plan_days`, `plan_exercises`, `workout_sessions`, `session_sets`

## First admin account

1. Start the app: `npm.cmd run dev`
2. Open http://localhost:7000/setup
3. Create your admin account
4. Sign in at http://localhost:7000/login
5. You will be prompted to change your password

## Auth settings checklist

- **Authentication → Providers → Email**: "Allow new users to sign up" must be **OFF**
- Admin creates all family accounts from the Admin tab
