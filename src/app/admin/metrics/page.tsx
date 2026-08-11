import { redirect } from "next/navigation";
import { AdminSectionGate } from "@/components/admin/admin-section-gate";
import { MetricTypesAdmin } from "@/components/admin/metric-types-admin";
import { getAllMetricTypesForAdmin } from "@/lib/metric-types-server";
import { getSessionState } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function AdminMetricsPage() {
  const state = await getSessionState();

  if (state.status === "must_change_password") {
    redirect("/change-password");
  }

  const isAdmin = state.status === "ready" && state.profile.role === "admin";

  return (
    <AdminSectionGate
      isAdmin={isAdmin}
      title="Metric types"
      description="Add or edit performance tests and body metrics without code changes."
    >
      <MetricTypesAdmin initialMetricTypes={await getAllMetricTypesForAdmin()} />
    </AdminSectionGate>
  );
}
