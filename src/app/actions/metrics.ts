"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireReadySession } from "@/lib/session";
import {
  buildPerformanceContext,
  buildWeightContext,
  checkNewPr,
  getPersonalBestEntry,
  validateMetricValue,
} from "@/lib/metrics";
import {
  getMetricEntriesForType,
  getMetricTypeById,
} from "@/lib/metrics-server";
import { resolveViewAsTarget } from "@/lib/view-as-server";
import type { MetricEntry, MetricType } from "@/lib/types";

export async function getMetricInputContext(metricTypeId: number) {
  const profile = await requireReadySession();
  const metricType = await getMetricTypeById(metricTypeId);

  if (!metricType) {
    return { error: "Metric type not found." };
  }

  const entries = await getMetricEntriesForType(profile.id, metricTypeId);
  const latest = entries[0] ?? null;

  let contextMessage: string;
  if (metricType.name === "Weight") {
    contextMessage = buildWeightContext(entries) ?? "No previous entries yet.";
  } else {
    contextMessage = buildPerformanceContext(entries, metricType);
  }

  return {
    metricType,
    latest,
    contextMessage,
  };
}

type SaveMetricInput = {
  metricTypeId: number;
  value: number;
  recordedOn: string;
  notes?: string;
  confirmLargeChange?: boolean;
};

export async function saveMetricEntry(input: SaveMetricInput) {
  const profile = await requireReadySession();
  const metricType = await getMetricTypeById(input.metricTypeId);

  if (!metricType) {
    return { error: "Metric type not found." };
  }

  const existingEntries = await getMetricEntriesForType(profile.id, input.metricTypeId);
  const lastValue = existingEntries[0]?.value ?? null;

  const validation = validateMetricValue(input.value, metricType, lastValue);
  if (validation.hardError) {
    return { error: validation.hardError };
  }

  if (validation.softWarning && !input.confirmLargeChange) {
    return { warning: validation.softWarning, needsConfirmation: true };
  }

  const prCheck = checkNewPr(input.value, existingEntries, metricType);

  const supabase = await createClient();
  if (!supabase) {
    return { error: "Database not configured." };
  }

  const { data, error } = await supabase
    .from("metric_entries")
    .insert({
      user_id: profile.id,
      metric_type_id: input.metricTypeId,
      value: input.value,
      recorded_on: input.recordedOn,
      notes: input.notes?.trim() || null,
    })
    .select("*")
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/home");
  revalidatePath("/input");
  revalidatePath(`/home/metric/${input.metricTypeId}`);

  return {
    success: true,
    entry: data as MetricEntry,
    isPr: prCheck.isPr,
    prMargin: prCheck.margin,
    previousBest: prCheck.previousBest,
    metricType,
  };
}

type UpdateMetricInput = {
  entryId: number;
  value: number;
  recordedOn: string;
  notes?: string;
  confirmLargeChange?: boolean;
};

export async function updateMetricEntry(input: UpdateMetricInput) {
  const profile = await requireReadySession();
  const supabase = await createClient();
  if (!supabase) {
    return { error: "Database not configured." };
  }

  const { data: existing, error: fetchError } = await supabase
    .from("metric_entries")
    .select("*, metric_types(*)")
    .eq("id", input.entryId)
    .eq("user_id", profile.id)
    .single();

  if (fetchError || !existing) {
    return { error: "Entry not found." };
  }

  const metricType = existing.metric_types as MetricType;
  const siblings = (await getMetricEntriesForType(profile.id, existing.metric_type_id)).filter(
    (entry) => entry.id !== input.entryId
  );
  const lastValue = siblings[0]?.value ?? null;

  const validation = validateMetricValue(input.value, metricType, lastValue);
  if (validation.hardError) {
    return { error: validation.hardError };
  }

  if (validation.softWarning && !input.confirmLargeChange) {
    return { warning: validation.softWarning, needsConfirmation: true };
  }

  const { error } = await supabase
    .from("metric_entries")
    .update({
      value: input.value,
      recorded_on: input.recordedOn,
      notes: input.notes?.trim() || null,
    })
    .eq("id", input.entryId)
    .eq("user_id", profile.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/home");
  revalidatePath("/input");
  revalidatePath(`/home/metric/${existing.metric_type_id}`);

  return { success: true };
}

export async function deleteMetricEntry(entryId: number) {
  const profile = await requireReadySession();
  const supabase = await createClient();
  if (!supabase) {
    return { error: "Database not configured." };
  }

  const { data: existing } = await supabase
    .from("metric_entries")
    .select("metric_type_id")
    .eq("id", entryId)
    .eq("user_id", profile.id)
    .maybeSingle();

  const { error } = await supabase
    .from("metric_entries")
    .delete()
    .eq("id", entryId)
    .eq("user_id", profile.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/home");
  revalidatePath("/input");
  if (existing?.metric_type_id) {
    revalidatePath(`/home/metric/${existing.metric_type_id}`);
  }

  return { success: true };
}

export async function getMetricDetail(metricTypeId: number) {
  const profile = await requireReadySession();
  const { userId, viewingAs } = await resolveViewAsTarget(profile);
  const metricType = await getMetricTypeById(metricTypeId);

  if (!metricType) {
    return null;
  }

  const entries = await getMetricEntriesForType(userId, metricTypeId);
  const best = getPersonalBestEntry(entries, metricType.direction);

  return {
    metricType,
    entries,
    bestEntryId: best?.id ?? null,
    readOnly: viewingAs != null,
    viewingAs,
  };
}
