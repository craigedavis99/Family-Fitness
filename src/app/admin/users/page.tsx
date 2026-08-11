import { redirect } from "next/navigation";
import { AdminSectionGate } from "@/components/admin/admin-section-gate";
import { UsersAdmin } from "@/components/admin/users-admin";
import { getSessionState } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const state = await getSessionState();

  if (state.status === "must_change_password") {
    redirect("/change-password");
  }

  const isAdmin = state.status === "ready" && state.profile.role === "admin";

  return (
    <AdminSectionGate
      isAdmin={isAdmin}
      title="Users"
      description="Create accounts and manage family members."
    >
      <UsersAdmin isAdmin />
    </AdminSectionGate>
  );
}
