import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { syncInitialAdminProfile } from "@/lib/bootstrap-admin";
import { isSupabaseConfigured } from "@/lib/utils";
import type { Profile } from "@/lib/types";

export type SessionState =
  | { status: "no_supabase" }
  | { status: "unauthenticated" }
  | { status: "no_migration" }
  | { status: "no_profile"; userId: string }
  | { status: "inactive" }
  | { status: "must_change_password"; profile: Profile }
  | { status: "ready"; profile: Profile };

export async function getSessionState(): Promise<SessionState> {
  if (!isSupabaseConfigured()) {
    return { status: "no_supabase" };
  }

  const supabase = await createClient();
  if (!supabase) {
    return { status: "no_supabase" };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { status: "unauthenticated" };
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle<Profile>();

  if (error?.code === "PGRST205") {
    return { status: "no_migration" };
  }

  if (error || !profile) {
    return { status: "no_profile", userId: user.id };
  }

  if (!profile.is_active) {
    return { status: "inactive" };
  }

  if (profile.must_change_password) {
    return { status: "must_change_password", profile };
  }

  const syncedProfile = await syncInitialAdminProfile(profile, user.email);

  return { status: "ready", profile: syncedProfile };
}

export async function signOut() {
  const supabase = await createClient();
  if (supabase) {
    await supabase.auth.signOut();
  }
}

/** Sign out when auth exists but profile row is missing, then send to login. */
export async function recoverFromBrokenSession() {
  await signOut();
  redirect("/login");
}

export async function requireReadySession() {
  const state = await getSessionState();

  switch (state.status) {
    case "no_supabase":
    case "unauthenticated":
      redirect("/login");
    case "no_migration":
      redirect("/login");
    case "no_profile":
      await recoverFromBrokenSession();
    case "inactive":
      await signOut();
      redirect("/login?error=account_inactive");
    case "must_change_password":
      redirect("/change-password");
    case "ready":
      return state.profile;
  }
}
