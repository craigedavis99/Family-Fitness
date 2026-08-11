import { requireReadySession } from "@/lib/session";
import {
  getDashboardSummaries,
  getLastWorkoutSummary,
} from "@/lib/metrics-server";
import { resolveViewAsTarget } from "@/lib/view-as-server";
import { DashboardMetricCard } from "@/components/metrics/dashboard-metric-card";
import { LastWorkoutCard } from "@/components/metrics/last-workout-card";
import { PageHeader } from "@/components/page-header";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const profile = await requireReadySession();
  const { userId, viewingAs } = await resolveViewAsTarget(profile);
  const [summaries, lastWorkout] = await Promise.all([
    getDashboardSummaries(userId),
    getLastWorkoutSummary(userId),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={viewingAs ? "Viewing as" : "Dashboard"}
        title={viewingAs ? viewingAs.display_name : "Home"}
        description={
          viewingAs
            ? "Read-only look at their latest metrics and personal bests."
            : "Tap a card for history, or use Add entry to log a new value right here."
        }
      />

      <LastWorkoutCard workout={lastWorkout} />

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <h2 className="font-display text-lg font-semibold tracking-tight">Metrics</h2>
          <p className="text-xs text-muted-foreground">{summaries.length} tracked</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {summaries.map((summary, index) => (
            <DashboardMetricCard
              key={summary.metricType.id}
              summary={summary}
              index={index}
              readOnly={viewingAs != null}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
