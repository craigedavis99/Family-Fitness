import { createClient } from "@/lib/supabase/server";
import { buildCardSummary } from "@/lib/metrics";
import type {
  LastWorkoutSummary,
  MetricCardSummary,
  MetricEntry,
  MetricType,
} from "@/lib/types";

export async function getActiveMetricTypes() {
  const supabase = await createClient();
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("metric_types")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as MetricType[];
}

export async function getUserMetricEntries(userId: string) {
  const supabase = await createClient();
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("metric_entries")
    .select("*")
    .eq("user_id", userId)
    .order("recorded_on", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as MetricEntry[];
}

export async function getMetricEntriesForType(userId: string, metricTypeId: number) {
  const supabase = await createClient();
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("metric_entries")
    .select("*")
    .eq("user_id", userId)
    .eq("metric_type_id", metricTypeId)
    .order("recorded_on", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as MetricEntry[];
}

export async function getDashboardSummaries(userId: string): Promise<MetricCardSummary[]> {
  const [metricTypes, entries] = await Promise.all([
    getActiveMetricTypes(),
    getUserMetricEntries(userId),
  ]);

  const entriesByType = new Map<number, MetricEntry[]>();
  for (const entry of entries) {
    const list = entriesByType.get(entry.metric_type_id) ?? [];
    list.push(entry);
    entriesByType.set(entry.metric_type_id, list);
  }

  return metricTypes.map((metricType) =>
    buildCardSummary(metricType, entriesByType.get(metricType.id) ?? [])
  );
}

export async function getLastWorkoutSummary(userId: string): Promise<LastWorkoutSummary> {
  const supabase = await createClient();
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("workout_sessions")
    .select("session_date, label, plan_day_id, plan_days(day_label)")
    .eq("user_id", userId)
    .order("session_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const planDayRaw = data.plan_days as { day_label: string } | { day_label: string }[] | null;
  const planDay = Array.isArray(planDayRaw) ? planDayRaw[0] : planDayRaw;
  const label = data.label ?? planDay?.day_label ?? "Workout";

  const [year, month, day] = data.session_date.split("-").map(Number);
  const sessionDate = new Date(year, month - 1, day);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  sessionDate.setHours(0, 0, 0, 0);
  const daysSince = Math.round((today.getTime() - sessionDate.getTime()) / (1000 * 60 * 60 * 24));

  return {
    sessionDate: data.session_date,
    label,
    daysSince: Math.max(daysSince, 0),
  };
}

export async function getMetricTypeById(metricTypeId: number) {
  const supabase = await createClient();
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("metric_types")
    .select("*")
    .eq("id", metricTypeId)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as MetricType | null) ?? null;
}
