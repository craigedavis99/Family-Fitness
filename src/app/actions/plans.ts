"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireReadySession } from "@/lib/session";
import type { PlanKind } from "@/lib/plan";
import { getPlanWithDetails } from "@/lib/plan-server";

function revalidatePlanPaths() {
  revalidatePath("/plan");
  revalidatePath("/plan/print");
}

async function requireOwnedPlan(userId: string, planId: number) {
  const plan = await getPlanWithDetails(userId, planId);
  if (!plan) {
    return { error: "Plan not found." as const, plan: null };
  }
  return { error: null, plan };
}

async function findOwnedDay(userId: string, dayId: number) {
  const { getUserPlans } = await import("@/lib/plan-server");
  const plans = await getUserPlans(userId);

  for (const plan of plans) {
    const day = plan.days.find((item) => item.id === dayId);
    if (day) {
      return { plan, day };
    }
  }

  return null;
}

export async function createPlan(name: string, planKind: PlanKind = "cycle") {
  const profile = await requireReadySession();
  const supabase = await createClient();
  if (!supabase) {
    return { error: "Database not configured." };
  }

  const trimmedName = name.trim();
  if (!trimmedName) {
    return { error: "Plan name is required." };
  }

  const { data, error } = await supabase
    .from("workout_plans")
    .insert({
      user_id: profile.id,
      name: trimmedName,
      is_active: true,
    })
    .select("*")
    .single();

  if (error) {
    return { error: error.message };
  }

  if (planKind === "daily") {
    const { error: dayError } = await supabase.from("plan_days").insert({
      plan_id: data.id,
      day_label: trimmedName,
      day_order: 1,
    });

    if (dayError) {
      await supabase.from("workout_plans").delete().eq("id", data.id);
      return { error: dayError.message };
    }
  }

  revalidatePlanPaths();
  return { success: true, plan: data };
}

export async function archivePlan(planId: number) {
  const profile = await requireReadySession();
  const supabase = await createClient();
  if (!supabase) {
    return { error: "Database not configured." };
  }

  const owned = await requireOwnedPlan(profile.id, planId);
  if (owned.error) {
    return { error: owned.error };
  }

  const { error } = await supabase
    .from("workout_plans")
    .update({ is_active: false })
    .eq("id", planId)
    .eq("user_id", profile.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePlanPaths();
  return { success: true };
}

export async function updatePlanName(planId: number, name: string) {
  const profile = await requireReadySession();
  const supabase = await createClient();
  if (!supabase) {
    return { error: "Database not configured." };
  }

  const owned = await requireOwnedPlan(profile.id, planId);
  if (owned.error) {
    return { error: owned.error };
  }

  const { error } = await supabase
    .from("workout_plans")
    .update({ name: name.trim() })
    .eq("id", planId)
    .eq("user_id", profile.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePlanPaths();
  return { success: true };
}

export async function addPlanDay(planId: number, dayLabel: string) {
  const profile = await requireReadySession();
  const supabase = await createClient();
  if (!supabase) {
    return { error: "Database not configured." };
  }

  const owned = await requireOwnedPlan(profile.id, planId);
  if (owned.error || !owned.plan) {
    return { error: owned.error ?? "Plan not found." };
  }

  const nextOrder =
    owned.plan.days.length === 0
      ? 1
      : Math.max(...owned.plan.days.map((day) => day.day_order)) + 1;

  const { data, error } = await supabase
    .from("plan_days")
    .insert({
      plan_id: planId,
      day_label: dayLabel.trim(),
      day_order: nextOrder,
    })
    .select("*")
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePlanPaths();
  return { success: true, day: data };
}

export async function updatePlanDayLabel(dayId: number, dayLabel: string) {
  const profile = await requireReadySession();
  const supabase = await createClient();
  if (!supabase) {
    return { error: "Database not configured." };
  }

  const found = await findOwnedDay(profile.id, dayId);
  if (!found) {
    return { error: "Day not found." };
  }

  const { error } = await supabase
    .from("plan_days")
    .update({ day_label: dayLabel.trim() })
    .eq("id", dayId);

  if (error) {
    return { error: error.message };
  }

  revalidatePlanPaths();
  return { success: true };
}

export async function deletePlanDay(dayId: number) {
  const profile = await requireReadySession();
  const supabase = await createClient();
  if (!supabase) {
    return { error: "Database not configured." };
  }

  const found = await findOwnedDay(profile.id, dayId);
  if (!found) {
    return { error: "Day not found." };
  }

  const { error } = await supabase.from("plan_days").delete().eq("id", dayId);
  if (error) {
    return { error: error.message };
  }

  revalidatePlanPaths();
  return { success: true };
}

export async function reorderPlanDays(planId: number, orderedDayIds: number[]) {
  const profile = await requireReadySession();
  const supabase = await createClient();
  if (!supabase) {
    return { error: "Database not configured." };
  }

  const owned = await requireOwnedPlan(profile.id, planId);
  if (owned.error) {
    return { error: owned.error };
  }

  for (let index = 0; index < orderedDayIds.length; index++) {
    const dayId = orderedDayIds[index];
    const { error } = await supabase
      .from("plan_days")
      .update({ day_order: index + 1 })
      .eq("id", dayId)
      .eq("plan_id", planId);

    if (error) {
      return { error: error.message };
    }
  }

  revalidatePlanPaths();
  return { success: true };
}

export async function addPlanExercise(input: {
  planDayId: number;
  exerciseId: number;
  targetSets?: number | null;
  targetReps?: string | null;
}) {
  const profile = await requireReadySession();
  const supabase = await createClient();
  if (!supabase) {
    return { error: "Database not configured." };
  }

  const found = await findOwnedDay(profile.id, input.planDayId);
  if (!found) {
    return { error: "Day not found." };
  }

  const day = found.day;
  const nextSort =
    day.exercises.length === 0
      ? 1
      : Math.max(...day.exercises.map((item) => item.sort_order ?? 0)) + 1;

  const { data, error } = await supabase
    .from("plan_exercises")
    .insert({
      plan_day_id: input.planDayId,
      exercise_id: input.exerciseId,
      target_sets: input.targetSets ?? null,
      target_reps: input.targetReps?.trim() || null,
      sort_order: nextSort,
    })
    .select("*, exercise:exercises(*)")
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePlanPaths();
  return { success: true, planExercise: data };
}

export async function updatePlanExercise(input: {
  planExerciseId: number;
  targetSets?: number | null;
  targetReps?: string | null;
}) {
  const profile = await requireReadySession();
  const supabase = await createClient();
  if (!supabase) {
    return { error: "Database not configured." };
  }

  const { getUserPlans } = await import("@/lib/plan-server");
  const plans = await getUserPlans(profile.id);
  const exists = plans.some((plan) =>
    plan.days.some((day) => day.exercises.some((item) => item.id === input.planExerciseId))
  );

  if (!exists) {
    return { error: "Exercise not found in plan." };
  }

  const { error } = await supabase
    .from("plan_exercises")
    .update({
      target_sets: input.targetSets ?? null,
      target_reps: input.targetReps?.trim() || null,
    })
    .eq("id", input.planExerciseId);

  if (error) {
    return { error: error.message };
  }

  revalidatePlanPaths();
  return { success: true };
}

export async function removePlanExercise(planExerciseId: number) {
  const profile = await requireReadySession();
  const supabase = await createClient();
  if (!supabase) {
    return { error: "Database not configured." };
  }

  const { getUserPlans } = await import("@/lib/plan-server");
  const plans = await getUserPlans(profile.id);
  const exists = plans.some((plan) =>
    plan.days.some((day) => day.exercises.some((item) => item.id === planExerciseId))
  );

  if (!exists) {
    return { error: "Exercise not found in plan." };
  }

  const { error } = await supabase
    .from("plan_exercises")
    .delete()
    .eq("id", planExerciseId);

  if (error) {
    return { error: error.message };
  }

  revalidatePlanPaths();
  return { success: true };
}

export async function reorderPlanExercises(planDayId: number, orderedIds: number[]) {
  await requireReadySession();
  const supabase = await createClient();
  if (!supabase) {
    return { error: "Database not configured." };
  }

  for (let index = 0; index < orderedIds.length; index++) {
    const { error } = await supabase
      .from("plan_exercises")
      .update({ sort_order: index + 1 })
      .eq("id", orderedIds[index])
      .eq("plan_day_id", planDayId);

    if (error) {
      return { error: error.message };
    }
  }

  revalidatePlanPaths();
  return { success: true };
}

export async function createExercise(input: {
  name: string;
  muscleGroup: string;
  equipment?: string;
}) {
  const profile = await requireReadySession();
  const supabase = await createClient();
  if (!supabase) {
    return { error: "Database not configured." };
  }

  const { data, error } = await supabase
    .from("exercises")
    .insert({
      name: input.name.trim(),
      muscle_group: input.muscleGroup,
      equipment: input.equipment?.trim() || null,
      created_by: profile.id,
      is_active: true,
    })
    .select("*")
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/plan");
  return { success: true, exercise: data };
}

export async function loadPlanPageData() {
  const profile = await requireReadySession();
  const { getActiveExercises, getUserPlans } = await import("@/lib/plan-server");
  const [plans, exercises] = await Promise.all([
    getUserPlans(profile.id),
    getActiveExercises(),
  ]);

  return { plans, exercises };
}
