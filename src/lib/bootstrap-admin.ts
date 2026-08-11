import { createAdminClient, isAdminConfigured } from "@/lib/supabase/admin";
import type { Profile } from "@/lib/types";

export type BootstrapStatus = {
  migrated: boolean;
  needsBootstrap: boolean;
  needsAdminBootstrap: boolean;
  initialAdminEmail: string | null;
};

export function getInitialAdminEmail() {
  return process.env.INITIAL_ADMIN_EMAIL?.trim().toLowerCase() ?? null;
}

export async function getBootstrapStatus(): Promise<BootstrapStatus> {
  if (!isAdminConfigured()) {
    return {
      migrated: false,
      needsBootstrap: false,
      needsAdminBootstrap: false,
      initialAdminEmail: getInitialAdminEmail(),
    };
  }

  try {
    const admin = createAdminClient();

    const { count: profileCount, error: profileError } = await admin
      .from("profiles")
      .select("*", { count: "exact", head: true });

    if (profileError) {
      if (profileError.code === "PGRST205") {
        return {
          migrated: false,
          needsBootstrap: false,
          needsAdminBootstrap: false,
          initialAdminEmail: getInitialAdminEmail(),
        };
      }
      throw profileError;
    }

    if ((profileCount ?? 0) === 0) {
      return {
        migrated: true,
        needsBootstrap: true,
        needsAdminBootstrap: false,
        initialAdminEmail: getInitialAdminEmail(),
      };
    }

    const { count: adminCount, error: adminError } = await admin
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("role", "admin");

    if (adminError) {
      throw adminError;
    }

    return {
      migrated: true,
      needsBootstrap: false,
      needsAdminBootstrap: (adminCount ?? 0) === 0,
      initialAdminEmail: getInitialAdminEmail(),
    };
  } catch {
    return {
      migrated: false,
      needsBootstrap: false,
      needsAdminBootstrap: false,
      initialAdminEmail: getInitialAdminEmail(),
    };
  }
}

export async function promoteProfileToAdmin(profileId: string) {
  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ role: "admin" })
    .eq("id", profileId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function syncInitialAdminProfile(
  profile: Profile,
  userEmail: string | null | undefined
): Promise<Profile> {
  const initialAdminEmail = getInitialAdminEmail();
  const email = userEmail?.trim().toLowerCase();

  if (!initialAdminEmail || !email || email !== initialAdminEmail) {
    return profile;
  }

  if (profile.role === "admin") {
    return profile;
  }

  if (!isAdminConfigured()) {
    return profile;
  }

  await promoteProfileToAdmin(profile.id);
  return { ...profile, role: "admin" };
}

export async function canClaimAdmin(userEmail: string | null | undefined) {
  const bootstrap = await getBootstrapStatus();
  const email = userEmail?.trim().toLowerCase() ?? null;
  const initialAdminEmail = getInitialAdminEmail();

  if (bootstrap.needsBootstrap) {
    return { allowed: false, reason: "Create the first account on the setup page." };
  }

  if (bootstrap.needsAdminBootstrap) {
    return { allowed: true, reason: "No admin exists yet." };
  }

  if (initialAdminEmail && email === initialAdminEmail) {
    return { allowed: true, reason: "Configured as the initial admin email." };
  }

  return { allowed: false, reason: "An admin account already exists." };
}
