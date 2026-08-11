import { AppShell } from "@/components/app-shell";
import { requireReadySession } from "@/lib/session";
import { getFamilyProfiles, resolveViewAsTarget } from "@/lib/view-as-server";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireReadySession();
  const isAdmin = profile.role === "admin";
  const [members, viewAs] = isAdmin
    ? await Promise.all([getFamilyProfiles(), resolveViewAsTarget(profile)])
    : [[], { userId: profile.id, viewingAs: null }];

  return (
    <AppShell
      displayName={profile.display_name}
      isAdmin={isAdmin}
      currentUserId={profile.id}
      members={members}
      viewingAs={viewAs.viewingAs}
    >
      {children}
    </AppShell>
  );
}
