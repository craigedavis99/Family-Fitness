import { AdminShell } from "@/components/admin/admin-shell";
import { getSessionState } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const state = await getSessionState();
  const isAdmin = state.status === "ready" && state.profile.role === "admin";
  const displayName = state.status === "ready" ? state.profile.display_name : null;

  return (
    <AdminShell displayName={displayName} isAdmin={isAdmin}>
      {children}
    </AdminShell>
  );
}
