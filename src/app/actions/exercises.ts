"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireReadySession } from "@/lib/session";
import { EQUIPMENT_OPTIONS, MUSCLE_GROUPS } from "@/lib/types";

function revalidateExercisePaths() {
  revalidatePath("/plan");
  revalidatePath("/admin");
}

async function requireAdmin() {
  const profile = await requireReadySession();
  if (profile.role !== "admin") {
    return { error: "Admin access required." as const, profile: null };
  }
  return { error: null, profile };
}

function normalizeMuscleGroup(value: string) {
  const trimmed = value.trim();
  return MUSCLE_GROUPS.find((group) => group.toLowerCase() === trimmed.toLowerCase()) ?? null;
}

function normalizeEquipment(value: string | null | undefined) {
  if (!value?.trim()) {
    return null;
  }

  const trimmed = value.trim();
  return (
    EQUIPMENT_OPTIONS.find((option) => option.toLowerCase() === trimmed.toLowerCase()) ?? trimmed
  );
}

type ParsedExerciseRow = {
  name: string;
  muscleGroup: string;
  equipment: string | null;
  lineNumber: number;
};

function parseBulkExerciseText(
  text: string,
  defaultMuscleGroup: string,
  defaultEquipment: string
): { rows: ParsedExerciseRow[]; errors: string[] } {
  const errors: string[] = [];
  const rows: ParsedExerciseRow[] = [];
  const seenNames = new Set<string>();

  const lines = text.split(/\r?\n/);

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      return;
    }

    const parts = trimmed.split(",").map((part) => part.trim());
    const name = parts[0]?.trim();

    if (!name) {
      errors.push(`Line ${index + 1}: missing exercise name.`);
      return;
    }

    const muscleGroup = normalizeMuscleGroup(parts[1] || defaultMuscleGroup);
    if (!muscleGroup) {
      errors.push(`Line ${index + 1}: invalid muscle group "${parts[1] || defaultMuscleGroup}".`);
      return;
    }

    const equipment = normalizeEquipment(parts[2] || defaultEquipment);
    const key = name.toLowerCase();

    if (seenNames.has(key)) {
      errors.push(`Line ${index + 1}: duplicate "${name}" in pasted list.`);
      return;
    }

    seenNames.add(key);
    rows.push({
      name,
      muscleGroup,
      equipment,
      lineNumber: index + 1,
    });
  });

  return { rows, errors };
}

export async function bulkCreateExercises(input: {
  text: string;
  defaultMuscleGroup: string;
  defaultEquipment: string;
}) {
  const adminCheck = await requireAdmin();
  if (adminCheck.error) {
    return { error: adminCheck.error };
  }

  const supabase = await createClient();
  if (!supabase) {
    return { error: "Database not configured." };
  }

  const defaultMuscleGroup = normalizeMuscleGroup(input.defaultMuscleGroup);
  if (!defaultMuscleGroup) {
    return { error: "Choose a valid default muscle group." };
  }

  const { rows, errors } = parseBulkExerciseText(
    input.text,
    defaultMuscleGroup,
    input.defaultEquipment
  );

  if (rows.length === 0) {
    return {
      error: errors[0] ?? "Paste at least one exercise (one per line).",
    };
  }

  const { data: existing, error: existingError } = await supabase
    .from("exercises")
    .select("name");

  if (existingError) {
    return { error: existingError.message };
  }

  const existingNames = new Set(
    (existing ?? []).map((row) => row.name.trim().toLowerCase())
  );

  const toInsert = rows.filter((row) => !existingNames.has(row.name.toLowerCase()));
  const skipped = rows.length - toInsert.length;

  if (toInsert.length === 0) {
    return {
      error: "All pasted exercises already exist in the catalog.",
      skipped,
      added: 0,
      parseErrors: errors,
    };
  }

  const { error: insertError } = await supabase.from("exercises").insert(
    toInsert.map((row) => ({
      name: row.name,
      muscle_group: row.muscleGroup,
      equipment: row.equipment,
      created_by: adminCheck.profile!.id,
      is_active: true,
    }))
  );

  if (insertError) {
    return { error: insertError.message, parseErrors: errors };
  }

  revalidateExercisePaths();

  return {
    success: true,
    added: toInsert.length,
    skipped,
    parseErrors: errors,
  };
}

export async function createExerciseAdmin(input: {
  name: string;
  muscleGroup: string;
  equipment?: string;
}) {
  const adminCheck = await requireAdmin();
  if (adminCheck.error) {
    return { error: adminCheck.error };
  }

  const supabase = await createClient();
  if (!supabase) {
    return { error: "Database not configured." };
  }

  const name = input.name.trim();
  if (!name) {
    return { error: "Exercise name is required." };
  }

  const muscleGroup = normalizeMuscleGroup(input.muscleGroup);
  if (!muscleGroup) {
    return { error: "Choose a valid muscle group." };
  }

  const { data, error } = await supabase
    .from("exercises")
    .insert({
      name,
      muscle_group: muscleGroup,
      equipment: normalizeEquipment(input.equipment),
      created_by: adminCheck.profile!.id,
      is_active: true,
    })
    .select("*")
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidateExercisePaths();
  return { success: true, exercise: data };
}

export async function updateExerciseAdmin(input: {
  exerciseId: number;
  name: string;
  muscleGroup: string;
  equipment?: string;
}) {
  const adminCheck = await requireAdmin();
  if (adminCheck.error) {
    return { error: adminCheck.error };
  }

  const supabase = await createClient();
  if (!supabase) {
    return { error: "Database not configured." };
  }

  const name = input.name.trim();
  if (!name) {
    return { error: "Exercise name is required." };
  }

  const muscleGroup = normalizeMuscleGroup(input.muscleGroup);
  if (!muscleGroup) {
    return { error: "Choose a valid muscle group." };
  }

  const { error } = await supabase
    .from("exercises")
    .update({
      name,
      muscle_group: muscleGroup,
      equipment: normalizeEquipment(input.equipment),
    })
    .eq("id", input.exerciseId);

  if (error) {
    return { error: error.message };
  }

  revalidateExercisePaths();
  return { success: true };
}

export async function setExerciseActive(exerciseId: number, isActive: boolean) {
  const adminCheck = await requireAdmin();
  if (adminCheck.error) {
    return { error: adminCheck.error };
  }

  const supabase = await createClient();
  if (!supabase) {
    return { error: "Database not configured." };
  }

  const { error } = await supabase
    .from("exercises")
    .update({ is_active: isActive })
    .eq("id", exerciseId);

  if (error) {
    return { error: error.message };
  }

  revalidateExercisePaths();
  return { success: true };
}
