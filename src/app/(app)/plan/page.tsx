import { requireReadySession } from "@/lib/session";
import { getActiveExercises, getUserPlans } from "@/lib/plan-server";
import { getExercisePerformanceMap } from "@/lib/workout-server";
import { PlanBuilder } from "@/components/plan/plan-builder";
import { PageHeader } from "@/components/page-header";

export const dynamic = "force-dynamic";

type PlanPageProps = {
  searchParams: Promise<{ expand?: string }>;
};

export default async function PlanPage({ searchParams }: PlanPageProps) {
  const profile = await requireReadySession();
  const { expand } = await searchParams;
  const expandPlanId = expand ? Number(expand) : undefined;

  const [plans, exercises, performanceMap] = await Promise.all([
    getUserPlans(profile.id),
    getActiveExercises(),
    getExercisePerformanceMap(profile.id),
  ]);

  const validExpandId =
    expandPlanId && plans.some((plan) => plan.id === expandPlanId) ? expandPlanId : undefined;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Training"
        title="My Plan"
        description="Expand a plan to edit days and exercises. Tap Add exercise on any day to build your workout."
      />

      <div className="stagger-1">
        <PlanBuilder
          initialPlans={plans}
          exercises={exercises}
          performanceMap={Object.fromEntries(performanceMap)}
          initialExpandPlanId={validExpandId}
        />
      </div>
    </div>
  );
}
