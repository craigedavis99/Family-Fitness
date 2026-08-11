# Family Fitness Tracker — Build Specification

This document is the source of truth for building this app. Follow the phases in order. Do not skip the data model. Ask before deviating from stack decisions.

---

## 1. Overview

A private, web-based fitness tracker for a single family (~4–8 users). Users record body metrics and athletic performance tests (sprints, jumps, lifts), build workout plans, and log workouts. One admin manages users and the exercise database. Low traffic, mobile-first (users will be at a gym or track on their phones).

## **Not** a public SaaS. No self-signup, no payments, no social features

## 2. Tech Stack (decided — do not substitute)

| Layer        | Choice                                           | Notes                                                              |
| ------------ | ------------------------------------------------ | ------------------------------------------------------------------ |
| Framework    | Next.js 14+ (App Router, TypeScript)             | Single repo, API routes + server components                        |
| Database     | Supabase Postgres                                | Free tier is plenty for family traffic                             |
| Auth         | Supabase Auth (email + password)                 | Signup disabled; admin creates accounts via service-role API route |
| ORM / access | Supabase JS client with Row Level Security (RLS) | Keep it simple; no Prisma                                          |
| Styling      | Tailwind CSS + shadcn/ui                         | Cards, tabs, tables, dialogs                                       |
| Charts       | Recharts                                         | Line charts for metric history                                     |
| Hosting      | Vercel (free Hobby tier)                         | Connect custom domain                                              |
| Print        | CSS `@media print` view                          | For the paper workout sheet                                        |

Environment variables required: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (server-only, used for admin user creation).

---

## 3. Roles & Auth Rules

- **Roles:** `admin`, `member`. Stored on `profiles.role`.
- Public signup is **disabled** in Supabase settings. Admin creates users (email + temp password) from the Admin page via a server route using the service role key.
- Users must change password on first login (`profiles.must_change_password` flag).
- RLS: members can read/write **only their own** metric entries and workout logs. Admin can read/write everything.
- Admin sees every page a member sees, plus the Admin tab, plus a "View as user" selector (read-only impersonation for helping the kids).

---

## 4. Data Model

Design metrics **generically** so new tests (e.g., 5-10-5 shuttle, mile time) can be added later without code changes.

```sql
-- profiles: extends supabase auth.users
profiles (
  id uuid pk references auth.users,
  display_name text not null,
  role text not null default 'member',        -- 'admin' | 'member'
  birthdate date,                              -- enables age context on charts
  must_change_password boolean default true,
  is_active boolean default true,
  created_at timestamptz default now()
)

-- metric_types: the catalog of trackable measurements
metric_types (
  id serial pk,
  name text not null,                -- 'Weight', 'Height', 'Vertical Jump', ...
  unit text not null,                -- 'lbs', 'inches', 'seconds'
  direction text not null,           -- 'higher_is_better' | 'lower_is_better'
  category text not null,            -- 'body' | 'speed' | 'jump' | 'strength'
  sort_order int,
  is_active boolean default true
)

-- metric_entries: every recorded value
metric_entries (
  id serial pk,
  user_id uuid references profiles,
  metric_type_id int references metric_types,
  value numeric not null,
  recorded_on date not null,
  notes text,
  created_at timestamptz default now()
)

-- exercises: the exercise catalog
exercises (
  id serial pk,
  name text not null,
  muscle_group text not null,        -- 'Chest','Back','Shoulders','Biceps','Triceps',
                                     -- 'Quads','Hamstrings','Glutes','Calves','Core',
                                     -- 'Plyometric','Sprint/Conditioning'
  secondary_muscles text[],          -- optional
  equipment text,                    -- 'Barbell','Dumbbell','Bodyweight','Machine','Trap Bar','None'
  created_by uuid references profiles,   -- null = seeded/system
  is_active boolean default true
)

-- workout_plans: a user's plan (e.g., "PPL", "Upper/Lower")
workout_plans (
  id serial pk,
  user_id uuid references profiles,
  name text not null,
  is_active boolean default true,
  created_at timestamptz default now()
)

-- plan_days: the cycle structure ("Push", "Pull", "Legs", "Speed Day"...)
plan_days (
  id serial pk,
  plan_id int references workout_plans,
  day_label text not null,
  day_order int not null
)

-- plan_exercises: exercises assigned to a plan day
plan_exercises (
  id serial pk,
  plan_day_id int references plan_days,
  exercise_id int references exercises,
  target_sets int,
  target_reps text,                  -- text to allow '8-12', 'AMRAP', '3x30yd'
  sort_order int
)

-- workout_sessions: a logged workout
workout_sessions (
  id serial pk,
  user_id uuid references profiles,
  session_date date not null,
  plan_day_id int references plan_days,   -- null = custom workout
  label text,                             -- used when custom
  notes text,
  created_at timestamptz default now()
)

-- session_sets: one row per set performed
session_sets (
  id serial pk,
  session_id int references workout_sessions,
  exercise_id int references exercises,
  set_number int not null,
  weight numeric,                    -- null for bodyweight/sprints
  reps int,
  notes text
)
```

**Seed `metric_types` with:** Weight (lbs, lower/neutral — treat as neutral, no "better" direction in UI copy), Height (inches, higher), Vertical Jump (inches, higher), Broad Jump (inches, higher), 40-Yard Dash (seconds, lower), 100m Sprint (seconds, lower), Trap Bar Deadlift (lbs, higher), Box Squat (lbs, higher). Admin can add more later (e.g., 5-10-5 Shuttle, Mile Time, Bench Press) with zero code changes.

---

## 5. Pages & Features

Global layout: after login, a tab bar — **Home | Input | My Plan | Log Workout | (Admin)**. Mobile: bottom tab bar. Desktop: top nav.

### 5.1 Home (Dashboard)

- One card per active metric type, showing:
  - **Best value** for performance metrics (highest jump/lift, fastest sprint) with the date it was set.
  - **Most recent value** for Weight and Height with date recorded.
  - Small trend indicator (▲/▼ vs. previous entry).
- A "Last workout" card: date of most recent `workout_session`, its label, and days-since count.
- **Clicking any card opens a detail view** (route or full-screen dialog) with:
  - Recharts line chart of value over time (x = date, y = value). For time-based metrics, invert visual framing so "down" reads as improvement (or annotate PBs).
  - Sortable table of all entries (date, value, notes) with **edit and delete** actions (own entries only).
  - PB highlighted in both chart (dot marker) and table.
- **PR celebration:** when a new entry beats the previous best, show a congratulations banner/confetti on save and badge the card "New PR!" for 7 days.

### 5.2 Input (Record Metrics)

- Single form: pick metric type → enter value → date (defaults to today) → optional note → save.
- Show inline context **before** saving, once a metric is selected:
  - Last recorded value and date.
  - For **Weight** specifically: "You have gained/lost X lbs since your last entry on [date] — an average of X lbs/day over N days. You are X lbs above/below your heaviest recorded weight (Y lbs on [date])."
  - For performance metrics: "Your current best is X on [date]." After save, state whether this is a new PR and by how much.
- **Sanity-check validation:** warn (but allow override) if a value deviates >20% from the user's last entry — catches fat-finger typos like 400 lbs instead of 40. Hard-block impossible values (negative, zero, weight > 1000).
- Allow backdated entries (kids will report "I ran a 5.2 last Tuesday").

### 5.3 My Plan (Create Workout Plan)

- Create a plan: name it, then define the **cycle** by adding days with labels (e.g., Push / Pull / Legs, Upper / Lower, Day 1–4). Reorderable.
- For each day, add exercises from the catalog:
  - Searchable dropdown **grouped by muscle group** (Chest, Back, Shoulders, Biceps, Triceps, Quads, Hamstrings, Glutes, Calves, Core, Plyometric, Sprint/Conditioning).
  - Per exercise: target sets and target reps (free text: "8–12", "AMRAP", "3×30yd").
  - **"Add new exercise"** inline if it's missing: name + muscle group + equipment. It saves to the shared catalog (visible to whole family) tagged with creator.
- **Plyometrics and sprint work are just muscle-group categories** in the same catalog — a "Speed Day" is built the same way as a "Push Day." No separate section needed.
- **Evaluate button:** analyzes the whole plan and renders a coverage report:
  - Matrix of muscle group × total weekly sets across the cycle.
  - Flags: **Missing** (0 sets), **Low volume** (< 6 working sets/cycle for a major group), **OK** (6+). Note push/pull balance and whether any plyometric or sprint work exists (relevant for the athletes).
- **Print Today's Workout:** user picks a plan day → print-formatted sheet (`@media print` CSS) listing exercises with blank columns for Weight / Reps per set, plus lines for notes — designed to be filled in on paper at the gym and entered later.
- Link button: **"Exercise reference (MuscleWiki)"** → opens https://musclewiki.com/ in a new tab.

### 5.4 Log Workout

- Pick date (default today) → pick a plan day from dropdown **or** choose "Custom" (free label, add exercises ad hoc).
- Picking a plan day pre-populates its exercises in order.
- For each exercise, log sets: weight × reps rows with add/remove set buttons, plus a notes field.
- **Last-time guidance:** when an exercise is added, display its most recent logged performance: "Last time (Jun 12): 3×8 @ 185 lbs." If never logged: "No previous entries for this exercise."
- Highlight when today's top set beats the all-time heaviest set for that exercise.
- Save as a `workout_session`; sessions are editable afterward (fix paper-transcription mistakes).
- Session history list (reverse-chron) with expandable detail.

### 5.5 Admin

- **Users:** create user (name, email, temp password), reset password, deactivate/reactivate, set role. Deactivated users can't log in but their data remains.
- **Exercises:** full CRUD on the catalog, including merging/renaming user-added duplicates and deactivating bad entries (soft delete — never hard-delete anything referenced by logs).
- **Metric types:** add/edit/deactivate metric types (name, unit, direction, category). This is how new tests get added later.
- **View as user:** read-only dropdown to see any member's Home/history for coaching conversations.
- **Export:** button to download all of a user's (or everyone's) metric entries and workout sets as CSV — backup and offline analysis.

---

## 6. Seed Data — Exercise Catalog

Seed on first migration (roughly this list; admin extends later):

- **Chest:** Barbell Bench Press, Dumbbell Bench Press, Incline DB Press, Push-Up, Dips, Cable Fly, Machine Chest Press
- **Back:** Pull-Up, Chin-Up, Lat Pulldown, Barbell Row, Dumbbell Row, Seated Cable Row, Face Pull
- **Shoulders:** Overhead Press, DB Shoulder Press, Lateral Raise, Rear Delt Fly, Arnold Press
- **Biceps:** Barbell Curl, DB Curl, Hammer Curl, Preacher Curl
- **Triceps:** Cable Pushdown, Skull Crusher, Overhead Triceps Extension, Close-Grip Bench
- **Quads:** Box Squat, Back Squat, Front Squat, Leg Press, Walking Lunge, Bulgarian Split Squat, Leg Extension
- **Hamstrings:** Trap Bar Deadlift, Romanian Deadlift, Conventional Deadlift, Leg Curl, Nordic Curl, Glute-Ham Raise
- **Glutes:** Hip Thrust, Glute Bridge, Cable Kickback, Step-Up
- **Calves:** Standing Calf Raise, Seated Calf Raise
- **Core:** Plank, Hanging Leg Raise, Ab Wheel, Pallof Press, Russian Twist, Dead Bug
- **Plyometric:** Box Jump, Depth Jump, Broad Jump (reps), Hurdle Hop, Med Ball Slam, Med Ball Chest Pass, Bounding, Skater Jump, Pogo Hops
- **Sprint/Conditioning:** 10yd Sprint, 20yd Sprint, 40yd Sprint, Flying 20s, Hill Sprint, Sled Push, Sled Pull, Shuttle 5-10-5, Tempo Runs, A-Skips, High Knees

---

## 7. Non-Functional Requirements

- **Mobile-first.** Every page must work well at 375px width; logging a workout one-handed at the gym is the primary use case.
- Units: imperial only (lbs, inches, seconds, yards). No unit toggle in v1.
- Dates: store as `date` (not timestamptz) for entries — no timezone drama for "what day did I lift."
- Soft deletes everywhere (`is_active` flags); never orphan logged data.
- No external analytics, no cookies beyond auth session.
- Fast loads: dashboard queries should use one round-trip per page (Postgres views or a single RPC that returns latest + best per metric).

---

## 8. Build Order (do these as separate Cursor sessions/commits)

1. **Scaffold:** Next.js + Tailwind + shadcn + Supabase client. Auth pages (login, forced password change). Route protection middleware. Empty tab shell.
2. **Schema + seed:** run the SQL above as Supabase migrations. RLS policies. Seed metric types + exercise catalog. Admin user creation route + Admin Users page.
3. **Input + Home:** metric entry form with context messages and validation → dashboard cards → card detail with Recharts chart + editable history table + PR logic.
4. **Plan builder:** plans/days/exercises CRUD, grouped exercise picker, add-new-exercise inline, Evaluate coverage report, print view, MuscleWiki link.
5. **Workout logging:** session create/edit, plan-day prefill, last-time guidance, session history.
6. **Admin polish:** view-as-user, metric type management, CSV export.
7. **Polish:** PR confetti, empty states, mobile QA, print QA.

After each phase: verify it runs, commit, then start the next phase in a fresh chat with this document attached.

---

## 9. Explicit Non-Goals (v1)

- No nutrition/food tracking.
- No wearable/API integrations.
- No push notifications or emails (beyond auth).
- No native app — responsive web only.
