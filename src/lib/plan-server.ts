import { createClient } from "@/lib/supabase/server";
import type { Exercise, PlanDayWithExercises, WorkoutPlan, WorkoutPlanWithDetails } from "@/lib/types";

export async function getActiveExercises() {
  const supabase = await createClient();
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("exercises")
    .select("*")
    .eq("is_active", true)
    .order("muscle_group")
    .order("name");

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as Exercise[];
}

async function attachDaysAndExercises(
  supabase: NonNullable<Awaited<ReturnType<typeof createClient>>>,
  plans: WorkoutPlan[]
): Promise<WorkoutPlanWithDetails[]> {
  if (plans.length === 0) {
    return [];
  }

  const planIds = plans.map((plan) => plan.id);

  const { data: days, error: daysError } = await supabase
    .from("plan_days")
    .select("*")
    .in("plan_id", planIds)
    .order("day_order", { ascending: true });

  if (daysError) {
    throw new Error(daysError.message);
  }

  const dayIds = (days ?? []).map((day) => day.id);
  let planExercises: PlanDayWithExercises["exercises"] = [];

  if (dayIds.length > 0) {
    const { data: exercises, error: exercisesError } = await supabase
      .from("plan_exercises")
      .select("*, exercise:exercises(*)")
      .in("plan_day_id", dayIds)
      .order("sort_order", { ascending: true });

    if (exercisesError) {
      throw new Error(exercisesError.message);
    }

    planExercises = (exercises ?? []).map((row) => ({
      ...row,
      exercise: row.exercise as Exercise,
    }));
  }

  return plans.map((plan) => {
    const planDays = (days ?? []).filter((day) => day.plan_id === plan.id);
    const daysWithExercises: PlanDayWithExercises[] = planDays.map((day) => ({
      ...day,
      exercises: planExercises
        .filter((item) => item.plan_day_id === day.id)
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
    }));

    return {
      ...plan,
      days: daysWithExercises,
    };
  });
}

export async function getUserPlans(userId: string): Promise<WorkoutPlanWithDetails[]> {
  const supabase = await createClient();
  if (!supabase) {
    return [];
  }

  const { data: plans, error: planError } = await supabase
    .from("workout_plans")
    .select("*")
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (planError) {
    throw new Error(planError.message);
  }

  return attachDaysAndExercises(supabase, (plans ?? []) as WorkoutPlan[]);
}

/** @deprecated Use getUserPlans — returns most recent active plan if any */
export async function getUserPlan(userId: string): Promise<WorkoutPlanWithDetails | null> {
  const plans = await getUserPlans(userId);
  return plans[0] ?? null;
}

export async function getPlanWithDetails(
  userId: string,
  planId: number
): Promise<WorkoutPlanWithDetails | null> {
  const supabase = await createClient();
  if (!supabase) {
    return null;
  }

  const { data: plan, error: planError } = await supabase
    .from("workout_plans")
    .select("*")
    .eq("id", planId)
    .eq("user_id", userId)
    .eq("is_active", true)
    .maybeSingle();

  if (planError) {
    throw new Error(planError.message);
  }

  if (!plan) {
    return null;
  }

  const [result] = await attachDaysAndExercises(supabase, [plan as WorkoutPlan]);
  return result ?? null;
}

export async function getPlanDayForPrint(userId: string, dayId: number) {
  const plans = await getUserPlans(userId);

  for (const plan of plans) {
    const day = plan.days.find((item) => item.id === dayId);
    if (day) {
      return { plan, day };
    }
  }

  return null;
}
