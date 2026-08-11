"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireReadySession } from "@/lib/session";
import { getWorkoutSessionById } from "@/lib/workout-server";
import type { LoggedExerciseInput } from "@/lib/types";

function revalidateWorkoutPaths() {
  revalidatePath("/log");
  revalidatePath("/home");
}

type SaveWorkoutInput = {
  sessionDate: string;
  planDayId?: number | null;
  label?: string | null;
  notes?: string | null;
  exercises: LoggedExerciseInput[];
};

function validateWorkoutInput(input: SaveWorkoutInput) {
  if (!input.sessionDate.trim()) {
    return "Workout date is required.";
  }

  if (input.exercises.length === 0) {
    return "Add at least one exercise.";
  }

  const hasLoggedSet = input.exercises.some((exercise) =>
    exercise.sets.some((set) => set.weight != null || set.reps != null)
  );

  if (!hasLoggedSet) {
    return "Log at least one set with weight or reps.";
  }

  return null;
}

function buildSetRows(exercises: LoggedExerciseInput[]) {
  const rows: {
    exercise_id: number;
    set_number: number;
    weight: number | null;
    reps: number | null;
    notes: string | null;
  }[] = [];

  for (const exercise of exercises) {
    for (const set of exercise.sets) {
      if (set.weight == null && set.reps == null) {
        continue;
      }

      rows.push({
        exercise_id: exercise.exerciseId,
        set_number: set.setNumber,
        weight: set.weight,
        reps: set.reps,
        notes: exercise.notes?.trim() || null,
      });
    }
  }

  return rows;
}

export async function saveWorkoutSession(input: SaveWorkoutInput) {
  const profile = await requireReadySession();
  const supabase = await createClient();
  if (!supabase) {
    return { error: "Database not configured." };
  }

  const validationError = validateWorkoutInput(input);
  if (validationError) {
    return { error: validationError };
  }

  const { data: session, error: sessionError } = await supabase
    .from("workout_sessions")
    .insert({
      user_id: profile.id,
      session_date: input.sessionDate,
      plan_day_id: input.planDayId ?? null,
      label: input.label?.trim() || null,
      notes: input.notes?.trim() || null,
    })
    .select("*")
    .single();

  if (sessionError) {
    return { error: sessionError.message };
  }

  const setRows = buildSetRows(input.exercises).map((row) => ({
    ...row,
    session_id: session.id,
  }));

  if (setRows.length > 0) {
    const { error: setsError } = await supabase.from("session_sets").insert(setRows);
    if (setsError) {
      await supabase.from("workout_sessions").delete().eq("id", session.id);
      return { error: setsError.message };
    }
  }

  revalidateWorkoutPaths();
  return { success: true, sessionId: session.id };
}

export async function updateWorkoutSession(sessionId: number, input: SaveWorkoutInput) {
  const profile = await requireReadySession();
  const supabase = await createClient();
  if (!supabase) {
    return { error: "Database not configured." };
  }

  const existing = await getWorkoutSessionById(profile.id, sessionId);
  if (!existing) {
    return { error: "Workout not found." };
  }

  const validationError = validateWorkoutInput(input);
  if (validationError) {
    return { error: validationError };
  }

  const { error: sessionError } = await supabase
    .from("workout_sessions")
    .update({
      session_date: input.sessionDate,
      plan_day_id: input.planDayId ?? null,
      label: input.label?.trim() || null,
      notes: input.notes?.trim() || null,
    })
    .eq("id", sessionId)
    .eq("user_id", profile.id);

  if (sessionError) {
    return { error: sessionError.message };
  }

  await supabase.from("session_sets").delete().eq("session_id", sessionId);

  const setRows = buildSetRows(input.exercises).map((row) => ({
    ...row,
    session_id: sessionId,
  }));

  if (setRows.length > 0) {
    const { error: setsError } = await supabase.from("session_sets").insert(setRows);
    if (setsError) {
      return { error: setsError.message };
    }
  }

  revalidateWorkoutPaths();
  return { success: true, sessionId };
}

export async function deleteWorkoutSession(sessionId: number) {
  const profile = await requireReadySession();
  const supabase = await createClient();
  if (!supabase) {
    return { error: "Database not configured." };
  }

  const existing = await getWorkoutSessionById(profile.id, sessionId);
  if (!existing) {
    return { error: "Workout not found." };
  }

  const { error } = await supabase
    .from("workout_sessions")
    .delete()
    .eq("id", sessionId)
    .eq("user_id", profile.id);

  if (error) {
    return { error: error.message };
  }

  revalidateWorkoutPaths();
  return { success: true };
}
