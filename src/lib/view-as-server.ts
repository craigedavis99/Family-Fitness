import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

export const VIEW_AS_COOKIE = "view_as_user_id";

export async function getViewAsUserIdFromCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(VIEW_AS_COOKIE)?.value ?? null;
}

export async function resolveViewAsTarget(profile: Profile): Promise<{
  userId: string;
  viewingAs: Profile | null;
}> {
  if (profile.role !== "admin") {
    return { userId: profile.id, viewingAs: null };
  }

  const viewAsId = await getViewAsUserIdFromCookie();
  if (!viewAsId || viewAsId === profile.id) {
    return { userId: profile.id, viewingAs: null };
  }

  const supabase = await createClient();
  if (!supabase) {
    return { userId: profile.id, viewingAs: null };
  }

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", viewAsId)
    .eq("is_active", true)
    .maybeSingle<Profile>();

  if (!data) {
    return { userId: profile.id, viewingAs: null };
  }

  return { userId: data.id, viewingAs: data };
}

export async function getFamilyProfiles(): Promise<Profile[]> {
  const supabase = await createClient();
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("is_active", true)
    .order("display_name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as Profile[];
}
