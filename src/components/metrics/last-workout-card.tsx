import Link from "next/link";
import { ArrowRight, Activity } from "lucide-react";
import { formatShortDate } from "@/lib/metrics";
import type { LastWorkoutSummary } from "@/lib/types";

type LastWorkoutCardProps = {
  workout: LastWorkoutSummary;
};

export function LastWorkoutCard({ workout }: LastWorkoutCardProps) {
  return (
    <section className="stagger-1 overflow-hidden rounded-xl border border-border/80 bg-gradient-to-br from-primary/[0.08] via-card to-card p-5 shadow-[var(--shadow-soft)]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/12 text-primary">
            <Activity className="h-5 w-5" strokeWidth={2.25} />
          </span>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary/80">
              Last workout
            </p>
            {workout ? (
              <h2 className="font-display text-xl font-semibold tracking-tight">{workout.label}</h2>
            ) : (
              <h2 className="font-display text-xl font-semibold tracking-tight">Ready when you are</h2>
            )}
          </div>
        </div>
        <Link
          href="/log"
          className="inline-flex items-center gap-1 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90 active:scale-[0.98]"
        >
          Log
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {workout ? (
        <p className="mt-3 text-sm text-muted-foreground">
          {formatShortDate(workout.sessionDate)}
          {workout.daysSince === 0
            ? " · Today"
            : workout.daysSince === 1
              ? " · Yesterday"
              : ` · ${workout.daysSince} days ago`}
        </p>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">
          No sessions yet — open Log and capture your first workout.
        </p>
      )}
    </section>
  );
}
