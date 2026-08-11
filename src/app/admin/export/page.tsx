import { redirect } from "next/navigation";
import { AdminSectionGate } from "@/components/admin/admin-section-gate";
import { ExportAdmin } from "@/components/admin/export-admin";
import { getSessionState } from "@/lib/session";
import { getFamilyProfiles } from "@/lib/view-as-server";

export const dynamic = "force-dynamic";

export default async function AdminExportPage() {
  const state = await getSessionState();

  if (state.status === "must_change_password") {
    redirect("/change-password");
  }

  const isAdmin = state.status === "ready" && state.profile.role === "admin";

  return (
    <AdminSectionGate
      isAdmin={isAdmin}
      title="Export data"
      description="Download metric entries and workout sets as CSV for backup or analysis."
    >
      <ExportAdmin users={await getFamilyProfiles()} />
    </AdminSectionGate>
  );
}
