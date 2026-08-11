import { createClient } from "@/lib/supabase/server";
import type { MetricType } from "@/lib/types";

export async function getAllMetricTypesForAdmin() {
  const supabase = await createClient();
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("metric_types")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as MetricType[];
}
