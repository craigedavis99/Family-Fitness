import { redirect } from "next/navigation";
import { AdminSectionGate } from "@/components/admin/admin-section-gate";
import { ExercisesAdmin } from "@/components/admin/exercises-admin";
import { getAllExercisesForAdmin } from "@/lib/exercises-server";
import { getSessionState } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function AdminExercisesPage() {
  const state = await getSessionState();

  if (state.status === "must_change_password") {
    redirect("/change-password");
  }

  const isAdmin = state.status === "ready" && state.profile.role === "admin";

  return (
    <AdminSectionGate
      isAdmin={isAdmin}
      title="Exercises"
      description="Bulk add and edit the shared exercise catalog."
    >
      <ExercisesAdmin initialExercises={await getAllExercisesForAdmin()} />
    </AdminSectionGate>
  );
}
