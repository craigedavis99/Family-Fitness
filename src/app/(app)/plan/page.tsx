import { requireReadySession } from "@/lib/session";
import { getActiveExercises, getUserPlans } from "@/lib/plan-server";
import { getExercisePerformanceMap } from "@/lib/workout-server";
import { PlanBuilder } from "@/components/plan/plan-builder";
import { PageHeader } from "@/components/page-header";

export const dynamic = "force-dynamic";

export default async function PlanPage() {
  const profile = await requireReadySession();
  const [plans, exercises, performanceMap] = await Promise.all([
    getUserPlans(profile.id),
    getActiveExercises(),
    getExercisePerformanceMap(profile.id),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Training"
        title="My Plan"
        description="Build cycles or daily workouts. Expand a plan to edit days — last logged weights show under each exercise."
      />

      <div className="stagger-1">
        <PlanBuilder
          initialPlans={plans}
          exercises={exercises}
          performanceMap={Object.fromEntries(performanceMap)}
        />
      </div>
    </div>
  );
}
