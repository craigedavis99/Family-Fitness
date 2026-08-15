import Link from "next/link";
import { notFound } from "next/navigation";
import { requireReadySession } from "@/lib/session";
import { getPlanDayForPrint } from "@/lib/plan-server";
import { getExercisePerformanceMap } from "@/lib/workout-server";
import { ExercisePerformanceHint } from "@/components/plan/exercise-performance-hint";
import {
  getPrintSetRowCount,
  splitExercisesForPrint,
  shouldUsePrintColumns,
} from "@/lib/print-workout";
import { PrintButton } from "@/components/plan/print-button";
import type { ExercisePerformance, PlanExercise } from "@/lib/types";
import "./print.css";

export const dynamic = "force-dynamic";

type PrintPageProps = {
  searchParams: Promise<{ dayId?: string }>;
};

type ExerciseBlockProps = {
  item: PlanExercise;
  setRowCount: number;
  performance?: ExercisePerformance;
};

function formatPlanTarget(item: PlanExercise) {
  const sets = item.target_sets ?? "—";
  const reps = item.target_reps ?? "—";
  if (item.target_weight != null) {
    return `${sets} × ${reps} @ ${item.target_weight} lbs`;
  }
  return `${sets} × ${reps}`;
}

function ExerciseBlock({ item, setRowCount, performance }: ExerciseBlockProps) {
  const setRows = Array.from({ length: setRowCount }, (_, index) => index + 1);
  const suggestedWeight =
    item.target_weight ?? performance?.heaviestWeight ?? performance?.recentHistory[0]?.topWeight;

  return (
    <section className="print-exercise">
      <div className="print-exercise-header">
        <div>
          <h2 className="print-exercise-name">{item.exercise?.name ?? "Exercise"}</h2>
          <ExercisePerformanceHint performance={performance} print />
        </div>
        <p className="print-exercise-target">{formatPlanTarget(item)}</p>
      </div>
      <table className="print-exercise-table">
        <thead>
          <tr>
            <th>Set</th>
            <th>Weight{suggestedWeight != null ? ` (${suggestedWeight})` : ""}</th>
            <th>Reps</th>
          </tr>
        </thead>
        <tbody>
          {setRows.map((setNumber) => (
            <tr key={setNumber}>
              <td>{setNumber}</td>
              <td>&nbsp;</td>
              <td>&nbsp;</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

export default async function PrintWorkoutPage({ searchParams }: PrintPageProps) {
  const profile = await requireReadySession();
  const { dayId } = await searchParams;

  if (!dayId) {
    notFound();
  }

  const [result, performanceMap] = await Promise.all([
    getPlanDayForPrint(profile.id, Number(dayId)),
    getExercisePerformanceMap(profile.id),
  ]);

  if (!result) {
    notFound();
  }

  const performanceById = Object.fromEntries(performanceMap);
  const { plan, day } = result;
  const exerciseCount = day.exercises.length;
  const exercisePages = splitExercisesForPrint(day.exercises);

  return (
    <div className="print-page mx-auto max-w-3xl px-4 py-8">
      <div className="no-print mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link
          href="/plan"
          className="text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          ← Back to My Plan
        </Link>
        <div className="flex flex-col items-start gap-2 sm:items-end">
          <p className="text-xs text-muted-foreground">
            Compact layout — fits on {exercisePages.length} page
            {exercisePages.length === 1 ? "" : "s"} (print double-sided).
          </p>
          <PrintButton />
        </div>
      </div>

      {exercisePages.map((pageExercises, pageIndex) => (
        <article key={pageIndex} className="print-sheet">
          <header className="print-header">
            <p className="print-plan-name">{plan.name}</p>
            <h1 className="print-day-title">{day.day_label}</h1>
            <div className="print-meta">
              <span>
                Date: <span className="print-line" />
              </span>
              {pageIndex === 0 ? (
                <span>
                  Notes: <span className="print-line print-line-wide" />
                </span>
              ) : (
                <span className="print-page-label">Page {pageIndex + 1}</span>
              )}
            </div>
          </header>

          {pageExercises.length === 0 ? (
            <p className="print-empty">No exercises assigned to this day yet.</p>
          ) : (
            <div
              className={
                shouldUsePrintColumns(pageExercises.length)
                  ? "print-exercises-grid"
                  : "print-exercises-stack"
              }
            >
              {pageExercises.map((item) => (
                <ExerciseBlock
                  key={item.id}
                  item={item}
                  setRowCount={getPrintSetRowCount(item.target_sets, exerciseCount)}
                  performance={performanceById[item.exercise_id]}
                />
              ))}
            </div>
          )}

          {pageIndex === exercisePages.length - 1 && exerciseCount > 0 ? (
            <footer className="print-footer">
              <span>
                Session notes: <span className="print-line print-line-wide" />
              </span>
            </footer>
          ) : null}
        </article>
      ))}
    </div>
  );
}
