import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

export async function getAuthUser() {
  const supabase = await createClient();
  if (!supabase) {
    return { supabase: null, user: null };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { supabase, user };
}

export async function getCurrentProfile(): Promise<Profile | null> {
  const { supabase, user } = await getAuthUser();
  if (!supabase || !user) {
    return null;
  }

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle<Profile>();

  return data;
}

export async function requireAuthProfile() {
  const profile = await getCurrentProfile();
  if (!profile) {
    return { error: "Unauthorized", status: 401 as const };
  }

  if (!profile.is_active) {
    return { error: "Account inactive", status: 403 as const };
  }

  return { profile };
}

export async function requireAdminProfile() {
  const result = await requireAuthProfile();
  if ("error" in result) {
    return result;
  }

  if (result.profile.role !== "admin") {
    return { error: "Forbidden", status: 403 as const };
  }

  return { profile: result.profile };
}
