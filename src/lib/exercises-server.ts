import { createClient } from "@/lib/supabase/server";
import type { Exercise } from "@/lib/types";

export async function getAllExercisesForAdmin() {
  const supabase = await createClient();
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("exercises")
    .select("*")
    .order("muscle_group")
    .order("name");

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as Exercise[];
}
