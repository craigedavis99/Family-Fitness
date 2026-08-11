import { requireReadySession } from "@/lib/session";
import { loadLogPageData } from "@/lib/workout-server";
import { LogWorkoutClient } from "@/components/log/log-workout-client";
import { PageHeader } from "@/components/page-header";

export const dynamic = "force-dynamic";

export default async function LogWorkoutPage() {
  const profile = await requireReadySession();
  const { planDayOptions, exercises, sessions, performanceMap } = await loadLogPageData(profile.id);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Session"
        title="Log Workout"
        description="Pick a plan day or custom workout. Last-time guidance and PR highlights appear as you log."
      />

      <div className="stagger-1">
        <LogWorkoutClient
          planDayOptions={planDayOptions}
          exercises={exercises}
          performanceMap={performanceMap}
          sessions={sessions}
        />
      </div>
    </div>
  );
}
