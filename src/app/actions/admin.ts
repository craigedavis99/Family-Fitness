"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { requireReadySession } from "@/lib/session";
import { VIEW_AS_COOKIE } from "@/lib/view-as-server";
import type { MetricCategory, MetricDirection } from "@/lib/types";

async function requireAdmin() {
  const profile = await requireReadySession();
  if (profile.role !== "admin") {
    return { error: "Admin access required." as const, profile: null };
  }
  return { error: null, profile };
}

function revalidateMetricTypePaths() {
  revalidatePath("/admin");
  revalidatePath("/home");
}

export async function createMetricType(input: {
  name: string;
  unit: string;
  direction: MetricDirection;
  category: MetricCategory;
  sortOrder?: number | null;
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
    return { error: "Name is required." };
  }

  const { data, error } = await supabase
    .from("metric_types")
    .insert({
      name,
      unit: input.unit.trim(),
      direction: input.direction,
      category: input.category,
      sort_order: input.sortOrder ?? null,
      is_active: true,
    })
    .select("*")
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidateMetricTypePaths();
  return { success: true, metricType: data };
}

export async function updateMetricType(input: {
  id: number;
  name: string;
  unit: string;
  direction: MetricDirection;
  category: MetricCategory;
  sortOrder?: number | null;
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
    return { error: "Name is required." };
  }

  const { error } = await supabase
    .from("metric_types")
    .update({
      name,
      unit: input.unit.trim(),
      direction: input.direction,
      category: input.category,
      sort_order: input.sortOrder ?? null,
    })
    .eq("id", input.id);

  if (error) {
    return { error: error.message };
  }

  revalidateMetricTypePaths();
  return { success: true };
}

export async function setMetricTypeActive(metricTypeId: number, isActive: boolean) {
  const adminCheck = await requireAdmin();
  if (adminCheck.error) {
    return { error: adminCheck.error };
  }

  const supabase = await createClient();
  if (!supabase) {
    return { error: "Database not configured." };
  }

  const { error } = await supabase
    .from("metric_types")
    .update({ is_active: isActive })
    .eq("id", metricTypeId);

  if (error) {
    return { error: error.message };
  }

  revalidateMetricTypePaths();
  return { success: true };
}

export async function setViewAsUser(userId: string | null) {
  const adminCheck = await requireAdmin();
  if (adminCheck.error) {
    return { error: adminCheck.error };
  }

  const cookieStore = await cookies();

  if (!userId || userId === adminCheck.profile!.id) {
    cookieStore.delete(VIEW_AS_COOKIE);
  } else {
    const supabase = await createClient();
    if (!supabase) {
      return { error: "Database not configured." };
    }

    const { data } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .eq("is_active", true)
      .maybeSingle();

    if (!data) {
      return { error: "User not found." };
    }

    cookieStore.set(VIEW_AS_COOKIE, userId, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 8,
    });
  }

  revalidatePath("/home");
  revalidatePath("/home/metric/[metricTypeId]", "page");
  return { success: true };
}
