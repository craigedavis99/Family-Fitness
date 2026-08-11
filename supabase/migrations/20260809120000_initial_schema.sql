-- Family Fitness Tracker — initial schema, RLS, and seed data
-- Apply via Supabase Dashboard → SQL Editor → Run

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  role text not null default 'member' check (role in ('admin', 'member')),
  birthdate date,
  must_change_password boolean not null default true,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.metric_types (
  id serial primary key,
  name text not null,
  unit text not null,
  direction text not null check (direction in ('higher_is_better', 'lower_is_better', 'neutral')),
  category text not null check (category in ('body', 'speed', 'jump', 'strength')),
  sort_order int,
  is_active boolean not null default true
);

create table public.metric_entries (
  id serial primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  metric_type_id int not null references public.metric_types (id),
  value numeric not null,
  recorded_on date not null,
  notes text,
  created_at timestamptz not null default now()
);

create table public.exercises (
  id serial primary key,
  name text not null,
  muscle_group text not null,
  secondary_muscles text[],
  equipment text,
  created_by uuid references public.profiles (id),
  is_active boolean not null default true
);

create table public.workout_plans (
  id serial primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.plan_days (
  id serial primary key,
  plan_id int not null references public.workout_plans (id) on delete cascade,
  day_label text not null,
  day_order int not null
);

create table public.plan_exercises (
  id serial primary key,
  plan_day_id int not null references public.plan_days (id) on delete cascade,
  exercise_id int not null references public.exercises (id),
  target_sets int,
  target_reps text,
  sort_order int
);

create table public.workout_sessions (
  id serial primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  session_date date not null,
  plan_day_id int references public.plan_days (id),
  label text,
  notes text,
  created_at timestamptz not null default now()
);

create table public.session_sets (
  id serial primary key,
  session_id int not null references public.workout_sessions (id) on delete cascade,
  exercise_id int not null references public.exercises (id),
  set_number int not null,
  weight numeric,
  reps int,
  notes text
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

create index metric_entries_user_id_idx on public.metric_entries (user_id);
create index metric_entries_metric_type_id_idx on public.metric_entries (metric_type_id);
create index metric_entries_recorded_on_idx on public.metric_entries (recorded_on desc);
create index workout_sessions_user_id_idx on public.workout_sessions (user_id);
create index workout_plans_user_id_idx on public.workout_plans (user_id);

-- ---------------------------------------------------------------------------
-- Helpers (after tables — functions reference profiles)
-- ---------------------------------------------------------------------------

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
      and is_active = true
  );
$$;

create or replace function public.is_active_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and is_active = true
  );
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.metric_types enable row level security;
alter table public.metric_entries enable row level security;
alter table public.exercises enable row level security;
alter table public.workout_plans enable row level security;
alter table public.plan_days enable row level security;
alter table public.plan_exercises enable row level security;
alter table public.workout_sessions enable row level security;
alter table public.session_sets enable row level security;

-- profiles
create policy "profiles_select_own_or_admin"
  on public.profiles for select
  to authenticated
  using (id = auth.uid() or public.is_admin());

create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (id = auth.uid() and public.is_active_user())
  with check (
    id = auth.uid()
    and role = (select p.role from public.profiles p where p.id = auth.uid())
    and is_active = (select p.is_active from public.profiles p where p.id = auth.uid())
  );

create policy "profiles_admin_all"
  on public.profiles for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- metric_types
create policy "metric_types_select_active"
  on public.metric_types for select
  to authenticated
  using (is_active = true or public.is_admin());

create policy "metric_types_admin_write"
  on public.metric_types for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- metric_entries
create policy "metric_entries_select_own_or_admin"
  on public.metric_entries for select
  to authenticated
  using (user_id = auth.uid() or public.is_admin());

create policy "metric_entries_insert_own_or_admin"
  on public.metric_entries for insert
  to authenticated
  with check ((user_id = auth.uid() and public.is_active_user()) or public.is_admin());

create policy "metric_entries_update_own_or_admin"
  on public.metric_entries for update
  to authenticated
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

create policy "metric_entries_delete_own_or_admin"
  on public.metric_entries for delete
  to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- exercises
create policy "exercises_select_active"
  on public.exercises for select
  to authenticated
  using (is_active = true or public.is_admin());

create policy "exercises_insert_active_users"
  on public.exercises for insert
  to authenticated
  with check (public.is_active_user());

create policy "exercises_admin_update"
  on public.exercises for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "exercises_admin_delete"
  on public.exercises for delete
  to authenticated
  using (public.is_admin());

-- workout_plans
create policy "workout_plans_select_own_or_admin"
  on public.workout_plans for select
  to authenticated
  using (user_id = auth.uid() or public.is_admin());

create policy "workout_plans_write_own_or_admin"
  on public.workout_plans for all
  to authenticated
  using (user_id = auth.uid() or public.is_admin())
  with check ((user_id = auth.uid() and public.is_active_user()) or public.is_admin());

-- plan_days (via plan ownership)
create policy "plan_days_select"
  on public.plan_days for select
  to authenticated
  using (
    exists (
      select 1 from public.workout_plans wp
      where wp.id = plan_days.plan_id
        and (wp.user_id = auth.uid() or public.is_admin())
    )
  );

create policy "plan_days_write"
  on public.plan_days for all
  to authenticated
  using (
    exists (
      select 1 from public.workout_plans wp
      where wp.id = plan_days.plan_id
        and (wp.user_id = auth.uid() or public.is_admin())
    )
  )
  with check (
    exists (
      select 1 from public.workout_plans wp
      where wp.id = plan_days.plan_id
        and ((wp.user_id = auth.uid() and public.is_active_user()) or public.is_admin())
    )
  );

-- plan_exercises (via plan ownership)
create policy "plan_exercises_select"
  on public.plan_exercises for select
  to authenticated
  using (
    exists (
      select 1
      from public.plan_days pd
      join public.workout_plans wp on wp.id = pd.plan_id
      where pd.id = plan_exercises.plan_day_id
        and (wp.user_id = auth.uid() or public.is_admin())
    )
  );

create policy "plan_exercises_write"
  on public.plan_exercises for all
  to authenticated
  using (
    exists (
      select 1
      from public.plan_days pd
      join public.workout_plans wp on wp.id = pd.plan_id
      where pd.id = plan_exercises.plan_day_id
        and (wp.user_id = auth.uid() or public.is_admin())
    )
  )
  with check (
    exists (
      select 1
      from public.plan_days pd
      join public.workout_plans wp on wp.id = pd.plan_id
      where pd.id = plan_exercises.plan_day_id
        and ((wp.user_id = auth.uid() and public.is_active_user()) or public.is_admin())
    )
  );

-- workout_sessions
create policy "workout_sessions_select_own_or_admin"
  on public.workout_sessions for select
  to authenticated
  using (user_id = auth.uid() or public.is_admin());

create policy "workout_sessions_write_own_or_admin"
  on public.workout_sessions for all
  to authenticated
  using (user_id = auth.uid() or public.is_admin())
  with check ((user_id = auth.uid() and public.is_active_user()) or public.is_admin());

-- session_sets (via session ownership)
create policy "session_sets_select"
  on public.session_sets for select
  to authenticated
  using (
    exists (
      select 1 from public.workout_sessions ws
      where ws.id = session_sets.session_id
        and (ws.user_id = auth.uid() or public.is_admin())
    )
  );

create policy "session_sets_write"
  on public.session_sets for all
  to authenticated
  using (
    exists (
      select 1 from public.workout_sessions ws
      where ws.id = session_sets.session_id
        and (ws.user_id = auth.uid() or public.is_admin())
    )
  )
  with check (
    exists (
      select 1 from public.workout_sessions ws
      where ws.id = session_sets.session_id
        and ((ws.user_id = auth.uid() and public.is_active_user()) or public.is_admin())
    )
  );

-- ---------------------------------------------------------------------------
-- Seed: metric_types
-- ---------------------------------------------------------------------------

insert into public.metric_types (name, unit, direction, category, sort_order) values
  ('Weight', 'lbs', 'neutral', 'body', 1),
  ('Height', 'inches', 'higher_is_better', 'body', 2),
  ('Vertical Jump', 'inches', 'higher_is_better', 'jump', 3),
  ('Broad Jump', 'inches', 'higher_is_better', 'jump', 4),
  ('40-Yard Dash', 'seconds', 'lower_is_better', 'speed', 5),
  ('100m Sprint', 'seconds', 'lower_is_better', 'speed', 6),
  ('Trap Bar Deadlift', 'lbs', 'higher_is_better', 'strength', 7),
  ('Box Squat', 'lbs', 'higher_is_better', 'strength', 8);

-- ---------------------------------------------------------------------------
-- Seed: exercises
-- ---------------------------------------------------------------------------

insert into public.exercises (name, muscle_group, equipment) values
  ('Barbell Bench Press', 'Chest', 'Barbell'),
  ('Dumbbell Bench Press', 'Chest', 'Dumbbell'),
  ('Incline DB Press', 'Chest', 'Dumbbell'),
  ('Push-Up', 'Chest', 'Bodyweight'),
  ('Dips', 'Chest', 'Bodyweight'),
  ('Cable Fly', 'Chest', 'Machine'),
  ('Machine Chest Press', 'Chest', 'Machine'),
  ('Pull-Up', 'Back', 'Bodyweight'),
  ('Chin-Up', 'Back', 'Bodyweight'),
  ('Lat Pulldown', 'Back', 'Machine'),
  ('Barbell Row', 'Back', 'Barbell'),
  ('Dumbbell Row', 'Back', 'Dumbbell'),
  ('Seated Cable Row', 'Back', 'Machine'),
  ('Face Pull', 'Back', 'Machine'),
  ('Overhead Press', 'Shoulders', 'Barbell'),
  ('DB Shoulder Press', 'Shoulders', 'Dumbbell'),
  ('Lateral Raise', 'Shoulders', 'Dumbbell'),
  ('Rear Delt Fly', 'Shoulders', 'Dumbbell'),
  ('Arnold Press', 'Shoulders', 'Dumbbell'),
  ('Barbell Curl', 'Biceps', 'Barbell'),
  ('DB Curl', 'Biceps', 'Dumbbell'),
  ('Hammer Curl', 'Biceps', 'Dumbbell'),
  ('Preacher Curl', 'Biceps', 'Barbell'),
  ('Cable Pushdown', 'Triceps', 'Machine'),
  ('Skull Crusher', 'Triceps', 'Barbell'),
  ('Overhead Triceps Extension', 'Triceps', 'Dumbbell'),
  ('Close-Grip Bench', 'Triceps', 'Barbell'),
  ('Box Squat', 'Quads', 'Barbell'),
  ('Back Squat', 'Quads', 'Barbell'),
  ('Front Squat', 'Quads', 'Barbell'),
  ('Leg Press', 'Quads', 'Machine'),
  ('Walking Lunge', 'Quads', 'Dumbbell'),
  ('Bulgarian Split Squat', 'Quads', 'Dumbbell'),
  ('Leg Extension', 'Quads', 'Machine'),
  ('Trap Bar Deadlift', 'Hamstrings', 'Trap Bar'),
  ('Romanian Deadlift', 'Hamstrings', 'Barbell'),
  ('Conventional Deadlift', 'Hamstrings', 'Barbell'),
  ('Leg Curl', 'Hamstrings', 'Machine'),
  ('Nordic Curl', 'Hamstrings', 'Bodyweight'),
  ('Glute-Ham Raise', 'Hamstrings', 'Bodyweight'),
  ('Hip Thrust', 'Glutes', 'Barbell'),
  ('Glute Bridge', 'Glutes', 'Bodyweight'),
  ('Cable Kickback', 'Glutes', 'Machine'),
  ('Step-Up', 'Glutes', 'Dumbbell'),
  ('Standing Calf Raise', 'Calves', 'Machine'),
  ('Seated Calf Raise', 'Calves', 'Machine'),
  ('Plank', 'Core', 'Bodyweight'),
  ('Hanging Leg Raise', 'Core', 'Bodyweight'),
  ('Ab Wheel', 'Core', 'None'),
  ('Pallof Press', 'Core', 'Machine'),
  ('Russian Twist', 'Core', 'Bodyweight'),
  ('Dead Bug', 'Core', 'Bodyweight'),
  ('Box Jump', 'Plyometric', 'Bodyweight'),
  ('Depth Jump', 'Plyometric', 'Bodyweight'),
  ('Broad Jump (reps)', 'Plyometric', 'Bodyweight'),
  ('Hurdle Hop', 'Plyometric', 'Bodyweight'),
  ('Med Ball Slam', 'Plyometric', 'None'),
  ('Med Ball Chest Pass', 'Plyometric', 'None'),
  ('Bounding', 'Plyometric', 'Bodyweight'),
  ('Skater Jump', 'Plyometric', 'Bodyweight'),
  ('Pogo Hops', 'Plyometric', 'Bodyweight'),
  ('10yd Sprint', 'Sprint/Conditioning', 'None'),
  ('20yd Sprint', 'Sprint/Conditioning', 'None'),
  ('40yd Sprint', 'Sprint/Conditioning', 'None'),
  ('Flying 20s', 'Sprint/Conditioning', 'None'),
  ('Hill Sprint', 'Sprint/Conditioning', 'None'),
  ('Sled Push', 'Sprint/Conditioning', 'None'),
  ('Sled Pull', 'Sprint/Conditioning', 'None'),
  ('Shuttle 5-10-5', 'Sprint/Conditioning', 'None'),
  ('Tempo Runs', 'Sprint/Conditioning', 'None'),
  ('A-Skips', 'Sprint/Conditioning', 'None'),
  ('High Knees', 'Sprint/Conditioning', 'None');
