"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { evaluatePlanCoverage, countPlanExercises, inferPlanKind, type PlanKind } from "@/lib/plan";
import {
  addPlanDay,
  addPlanExercise,
  archivePlan,
  createPlan,
  deletePlanDay,
  removePlanExercise,
  reorderPlanDays,
  updatePlanDayLabel,
  updatePlanExercise,
  updatePlanName,
} from "@/app/actions/plans";
import { ExercisePicker } from "@/components/plan/exercise-picker";
import { ExerciseHistoryHint } from "@/components/plan/exercise-history-hint";
import { CoverageReport } from "@/components/plan/coverage-report";
import type { Exercise, ExercisePerformance, PlanDayWithExercises, WorkoutPlanWithDetails } from "@/lib/types";

type PlanBuilderProps = {
  initialPlans: WorkoutPlanWithDetails[];
  exercises: Exercise[];
  performanceMap: Record<number, ExercisePerformance>;
};

type PlanDaySectionProps = {
  day: PlanDayWithExercises;
  dayIndex: number;
  totalDays: number;
  exercises: Exercise[];
  performanceMap: Record<number, ExercisePerformance>;
  isExpanded: boolean;
  isPending: boolean;
  isAddingExercise: boolean;
  onToggleExpand: () => void;
  onToggleAddExercise: () => void;
  onReorder: (direction: "up" | "down") => void;
  onRename: (label: string) => void;
  onDelete: () => void;
  onAddExercise: (exerciseId: number, targetSets: number | null, targetReps: string) => void;
  onRemoveExercise: (planExerciseId: number) => void;
  onUpdateExercise: (
    planExerciseId: number,
    targetSets: number | null,
    targetReps: string
  ) => void;
};

function Chevron({ expanded }: { expanded: boolean }) {
  return (
    <span className="inline-block w-4 text-muted-foreground" aria-hidden>
      {expanded ? "▼" : "▶"}
    </span>
  );
}

function PlanDaySection({
  day,
  dayIndex,
  totalDays,
  exercises,
  performanceMap,
  isExpanded,
  isPending,
  isAddingExercise,
  onToggleExpand,
  onToggleAddExercise,
  onReorder,
  onRename,
  onDelete,
  onAddExercise,
  onRemoveExercise,
  onUpdateExercise,
}: PlanDaySectionProps) {
  return (
    <div className="rounded-lg border border-border">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
        onClick={onToggleExpand}
      >
        <div className="flex min-w-0 items-center gap-2">
          <Chevron expanded={isExpanded} />
          <div className="min-w-0">
            <p className="font-medium">{day.day_label}</p>
            <p className="text-xs text-muted-foreground">
              {day.exercises.length} exercise{day.exercises.length === 1 ? "" : "s"}
            </p>
          </div>
        </div>
        {isExpanded ? (
          <span className="text-xs text-muted-foreground">Collapse</span>
        ) : null}
      </button>

      {isExpanded ? (
        <div className="space-y-4 border-t border-border px-4 py-4">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              disabled={dayIndex === 0 || isPending}
              variant="outline"
              onClick={() => onReorder("up")}
            >
              ↑
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={dayIndex === totalDays - 1 || isPending}
              variant="outline"
              onClick={() => onReorder("down")}
            >
              ↓
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={isPending}
              onClick={() => {
                const label = window.prompt("Rename day", day.day_label);
                if (label?.trim()) {
                  onRename(label.trim());
                }
              }}
            >
              Rename
            </Button>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              disabled={isPending}
              onClick={onDelete}
            >
              Delete day
            </Button>
          </div>

          {day.exercises.length === 0 && !isAddingExercise ? (
            <p className="text-sm text-muted-foreground">
              No exercises yet. Tap Add exercise to build this day.
            </p>
          ) : (
            <div className="space-y-3">
              {day.exercises.map((item) => (
                <div key={item.id} className="rounded-lg border border-border p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="font-medium">{item.exercise?.name ?? "Exercise"}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.exercise?.muscle_group}
                        {item.exercise?.equipment ? ` · ${item.exercise.equipment}` : ""}
                      </p>
                      <ExerciseHistoryHint
                        performance={
                          item.exercise_id ? performanceMap[item.exercise_id] : undefined
                        }
                      />
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={isPending}
                      onClick={() => onRemoveExercise(item.id)}
                    >
                      Remove
                    </Button>
                  </div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label>Target sets</Label>
                      <Input
                        type="number"
                        min={0}
                        defaultValue={item.target_sets ?? ""}
                        disabled={isPending}
                        onBlur={(e) => {
                          const value = e.target.value ? Number(e.target.value) : null;
                          if (value !== item.target_sets) {
                            onUpdateExercise(item.id, value, item.target_reps ?? "");
                          }
                        }}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Target reps</Label>
                      <Input
                        defaultValue={item.target_reps ?? ""}
                        placeholder="8-12, AMRAP, 3x30yd"
                        disabled={isPending}
                        onBlur={(e) => {
                          const value = e.target.value;
                          if (value !== (item.target_reps ?? "")) {
                            onUpdateExercise(item.id, item.target_sets, value);
                          }
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <Button
            type="button"
            variant={isAddingExercise ? "secondary" : "default"}
            size="sm"
            disabled={isPending}
            onClick={onToggleAddExercise}
          >
            {isAddingExercise ? "Close" : "Add exercise"}
          </Button>

          {isAddingExercise ? (
            <ExercisePicker
              exercises={exercises}
              disabled={isPending}
              dayLabel={day.day_label}
              onSelect={onAddExercise}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

type PlanCardProps = {
  plan: WorkoutPlanWithDetails;
  exercises: Exercise[];
  performanceMap: Record<number, ExercisePerformance>;
  isExpanded: boolean;
  isPending: boolean;
  addingExerciseDayId: number | null;
  showCoverage: boolean;
  printDayId: number | "";
  onToggleExpand: () => void;
  onToggleCoverage: () => void;
  onSetPrintDayId: (dayId: number | "") => void;
  onToggleAddExercise: (dayId: number) => void;
  onRunAction: (action: () => Promise<{ error?: string; success?: boolean }>) => void;
  onArchive: () => void;
};

function PlanCard({
  plan,
  exercises,
  performanceMap,
  isExpanded,
  isPending,
  addingExerciseDayId,
  showCoverage,
  printDayId,
  onToggleExpand,
  onToggleCoverage,
  onSetPrintDayId,
  onToggleAddExercise,
  onRunAction,
  onArchive,
}: PlanCardProps) {
  const [planName, setPlanName] = useState(plan.name);
  const [newDayLabel, setNewDayLabel] = useState("");
  const [expandedDayIds, setExpandedDayIds] = useState<Set<number>>(new Set());

  const planKind = inferPlanKind(plan);
  const exerciseCount = countPlanExercises(plan);
  const coverage = useMemo(() => evaluatePlanCoverage(plan), [plan]);

  function toggleDay(dayId: number) {
    setExpandedDayIds((current) => {
      const next = new Set(current);
      if (next.has(dayId)) {
        next.delete(dayId);
      } else {
        next.add(dayId);
      }
      return next;
    });
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <button
          type="button"
          className="flex w-full items-start justify-between gap-3 text-left"
          onClick={onToggleExpand}
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Chevron expanded={isExpanded} />
              <CardTitle className="text-lg">{plan.name}</CardTitle>
              <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                {planKind === "daily" ? "Daily" : "Cycle"}
              </span>
            </div>
            <CardDescription className="mt-1 pl-6">
              {plan.days.length} day{plan.days.length === 1 ? "" : "s"} · {exerciseCount} exercise
              {exerciseCount === 1 ? "" : "s"}
            </CardDescription>
          </div>
          <span className="shrink-0 text-xs text-muted-foreground">
            {isExpanded ? "Collapse" : "Expand"}
          </span>
        </button>
      </CardHeader>

      {isExpanded ? (
        <CardContent className="space-y-4 border-t border-border pt-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-2">
              <Label htmlFor={`renamePlan-${plan.id}`}>Plan name</Label>
              <Input
                id={`renamePlan-${plan.id}`}
                value={planName}
                onChange={(e) => setPlanName(e.target.value)}
              />
            </div>
            <Button
              type="button"
              variant="outline"
              disabled={isPending || planName.trim() === plan.name}
              onClick={() => onRunAction(() => updatePlanName(plan.id, planName))}
            >
              Save name
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onToggleCoverage}>
              {showCoverage ? "Hide evaluation" : "Evaluate plan"}
            </Button>
            <a
              href="https://musclewiki.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-9 items-center justify-center rounded-lg border border-input bg-background px-3 text-sm font-medium hover:bg-accent"
            >
              MuscleWiki
            </a>
            <Button type="button" variant="destructive" size="sm" disabled={isPending} onClick={onArchive}>
              Archive plan
            </Button>
          </div>

          {showCoverage ? <CoverageReport report={coverage} /> : null}

          {planKind === "cycle" ? (
            <div className="rounded-lg border border-dashed border-border p-4">
              <p className="mb-3 text-sm font-medium">Add a cycle day</p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  value={newDayLabel}
                  onChange={(e) => setNewDayLabel(e.target.value)}
                  placeholder="e.g. Push, Pull, Legs, Speed Day"
                />
                <Button
                  type="button"
                  size="sm"
                  disabled={isPending || !newDayLabel.trim()}
                  onClick={() =>
                    onRunAction(async () => {
                      const result = await addPlanDay(plan.id, newDayLabel);
                      if (!result.error) {
                        setNewDayLabel("");
                      }
                      return result;
                    })
                  }
                >
                  Add day
                </Button>
              </div>
            </div>
          ) : null}

          {plan.days.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {planKind === "cycle"
                ? "Add your first cycle day above."
                : "This daily plan is missing its workout day — try archiving and creating again."}
            </p>
          ) : (
            <div className="space-y-3">
              {plan.days.map((day, index) => (
                <PlanDaySection
                  key={day.id}
                  day={day}
                  dayIndex={index}
                  totalDays={plan.days.length}
                  exercises={exercises}
                  performanceMap={performanceMap}
                  isExpanded={expandedDayIds.has(day.id)}
                  isPending={isPending}
                  isAddingExercise={addingExerciseDayId === day.id}
                  onToggleExpand={() => toggleDay(day.id)}
                  onToggleAddExercise={() => onToggleAddExercise(day.id)}
                  onReorder={(direction) => {
                    const ids = plan.days.map((d) => d.id);
                    const swapIndex = direction === "up" ? index - 1 : index + 1;
                    [ids[index], ids[swapIndex]] = [ids[swapIndex], ids[index]];
                    onRunAction(() => reorderPlanDays(plan.id, ids));
                  }}
                  onRename={(label) => onRunAction(() => updatePlanDayLabel(day.id, label))}
                  onDelete={() => {
                    if (window.confirm(`Delete "${day.day_label}" and all its exercises?`)) {
                      onRunAction(() => deletePlanDay(day.id));
                    }
                  }}
                  onAddExercise={(exerciseId, targetSets, targetReps) =>
                    onRunAction(() =>
                      addPlanExercise({
                        planDayId: day.id,
                        exerciseId,
                        targetSets,
                        targetReps,
                      })
                    )
                  }
                  onRemoveExercise={(planExerciseId) =>
                    onRunAction(() => removePlanExercise(planExerciseId))
                  }
                  onUpdateExercise={(planExerciseId, targetSets, targetReps) =>
                    onRunAction(() =>
                      updatePlanExercise({
                        planExerciseId,
                        targetSets,
                        targetReps,
                      })
                    )
                  }
                />
              ))}
            </div>
          )}

          <div className="rounded-lg border border-border p-4">
            <p className="mb-3 text-sm font-medium">Print workout sheet</p>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex-1 space-y-2">
                <Label htmlFor={`printDay-${plan.id}`}>Workout day</Label>
                <select
                  id={`printDay-${plan.id}`}
                  className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  value={printDayId}
                  onChange={(e) =>
                    onSetPrintDayId(e.target.value ? Number(e.target.value) : "")
                  }
                >
                  <option value="">Select a day</option>
                  {plan.days.map((day) => (
                    <option key={day.id} value={day.id}>
                      {day.day_label}
                    </option>
                  ))}
                </select>
              </div>
              {printDayId && plan.days.some((day) => day.id === printDayId) ? (
                <Link
                  href={`/plan/print?dayId=${printDayId}`}
                  target="_blank"
                  className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90"
                >
                  Open print sheet
                </Link>
              ) : (
                <Button type="button" size="sm" disabled>
                  Open print sheet
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      ) : null}
    </Card>
  );
}

export function PlanBuilder({ initialPlans, exercises, performanceMap }: PlanBuilderProps) {
  const [plans] = useState(initialPlans);
  const [newPlanName, setNewPlanName] = useState("");
  const [newPlanKind, setNewPlanKind] = useState<PlanKind>("cycle");
  const [expandedPlanIds, setExpandedPlanIds] = useState<Set<number>>(
    () => new Set(initialPlans.length > 0 ? [initialPlans[0].id] : [])
  );
  const [coveragePlanId, setCoveragePlanId] = useState<number | null>(null);
  const [printDayByPlan, setPrintDayByPlan] = useState<Record<number, number | "">>(() =>
    Object.fromEntries(
      initialPlans.map((plan) => [plan.id, plan.days[0]?.id ?? ""])
    )
  );
  const [addingExerciseDayId, setAddingExerciseDayId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function runAction(action: () => Promise<{ error?: string; success?: boolean }>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result.error) {
        setError(result.error);
        return;
      }
      window.location.reload();
    });
  }

  function togglePlan(planId: number) {
    setExpandedPlanIds((current) => {
      const next = new Set(current);
      if (next.has(planId)) {
        next.delete(planId);
      } else {
        next.add(planId);
      }
      return next;
    });
  }

  async function handleCreatePlan(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await createPlan(newPlanName, newPlanKind);
      if (result.error) {
        setError(result.error);
        return;
      }
      window.location.reload();
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Create a plan</CardTitle>
          <CardDescription>
            Build a multi-day training cycle or a single custom daily workout template.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreatePlan} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newPlanName">Plan name</Label>
              <Input
                id="newPlanName"
                value={newPlanName}
                onChange={(e) => setNewPlanName(e.target.value)}
                placeholder={
                  newPlanKind === "cycle"
                    ? "e.g. Push / Pull / Legs"
                    : "e.g. Hotel workout, Recovery day"
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPlanKind">Plan type</Label>
              <select
                id="newPlanKind"
                className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                value={newPlanKind}
                onChange={(e) => setNewPlanKind(e.target.value as PlanKind)}
              >
                <option value="cycle">Training cycle (multiple days)</option>
                <option value="daily">Custom daily workout (single day)</option>
              </select>
            </div>
            <Button type="submit" disabled={isPending || !newPlanName.trim()}>
              {isPending ? "Creating..." : "Create plan"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {plans.length === 0 ? (
        <Card>
          <CardContent className="py-6 text-sm text-muted-foreground">
            No plans yet. Create a training cycle or a custom daily workout above.
          </CardContent>
        </Card>
      ) : (
        plans.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            exercises={exercises}
            performanceMap={performanceMap}
            isExpanded={expandedPlanIds.has(plan.id)}
            isPending={isPending}
            addingExerciseDayId={addingExerciseDayId}
            showCoverage={coveragePlanId === plan.id}
            printDayId={printDayByPlan[plan.id] ?? ""}
            onToggleExpand={() => togglePlan(plan.id)}
            onToggleCoverage={() =>
              setCoveragePlanId((current) => (current === plan.id ? null : plan.id))
            }
            onSetPrintDayId={(dayId) =>
              setPrintDayByPlan((current) => ({ ...current, [plan.id]: dayId }))
            }
            onToggleAddExercise={(dayId) =>
              setAddingExerciseDayId((current) => (current === dayId ? null : dayId))
            }
            onRunAction={runAction}
            onArchive={() => {
              if (window.confirm(`Archive "${plan.name}"? You can create a new plan anytime.`)) {
                runAction(() => archivePlan(plan.id));
              }
            }}
          />
        ))
      )}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
