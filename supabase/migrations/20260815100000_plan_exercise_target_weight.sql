-- Optional target weight (lbs) per exercise in a plan day
alter table public.plan_exercises
  add column if not exists target_weight numeric;
