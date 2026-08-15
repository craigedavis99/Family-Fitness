"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label, Card, CardContent, CardHeader } from "@/components/ui/card";
import { evaluatePlanCoverage, countPlanExercises, inferPlanKind } from "@/lib/plan";
import {
  addPlanDay,
  addPlanExercise,
  archivePlan,
  deletePlanDay,
  removePlanExercise,
  reorderPlanDays,
  updatePlanDayLabel,
  updatePlanExercise,
  updatePlanName,
} from "@/app/actions/plans";
import { CreatePlanModal } from "@/components/plan/create-plan-modal";
import { PlanExercisePickerModal } from "@/components/plan/plan-exercise-picker-modal";
import { ExercisePerformanceHint } from "@/components/plan/exercise-performance-hint";
import { CoverageReport } from "@/components/plan/coverage-report";
import type { Exercise, ExercisePerformance, PlanDayWithExercises, WorkoutPlanWithDetails } from "@/lib/types";

type PlanBuilderProps = {
  initialPlans: WorkoutPlanWithDetails[];
  exercises: Exercise[];
  performanceMap: Record<number, ExercisePerformance>;
  initialExpandPlanId?: number;
};

type ExercisePickerTarget = {
  planId: number;
  dayId: number;
  dayLabel: string;
};

type PlanDaySectionProps = {
  day: PlanDayWithExercises;
  dayIndex: number;
  totalDays: number;
  performanceMap: Record<number, ExercisePerformance>;
  isExpanded: boolean;
  isPending: boolean;
  onToggleExpand: () => void;
  onOpenAddExercise: () => void;
  onReorder: (direction: "up" | "down") => void;
  onRename: (label: string) => void;
  onDelete: () => void;
  onRemoveExercise: (planExerciseId: number) => void;
  onUpdateExercise: (
    planExerciseId: number,
    targetSets: number | null,
    targetReps: string,
    targetWeight: number | null
  ) => void;
};

function Chevron({ expanded }: { expanded: boolean }) {
  return (
    <span className="inline-block w-4 text-muted-foreground" aria-hidden>
      {expanded ? "▼" : "▶"}
    </span>
  );
}

function formatTargets(
  sets: number | null,
  reps: string | null,
  weight: number | null
) {
  const parts = [`${sets ?? "—"} × ${reps ?? "—"}`];
  if (weight != null) {
    parts.push(`@ ${weight} lbs`);
  }
  return parts.join(" ");
}

function PlanDaySection({
  day,
  dayIndex,
  totalDays,
  performanceMap,
  isExpanded,
  isPending,
  onToggleExpand,
  onOpenAddExercise,
  onReorder,
  onRename,
  onDelete,
  onRemoveExercise,
  onUpdateExercise,
}: PlanDaySectionProps) {
  return (
    <div className="rounded-xl border border-border/80 bg-card">
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
      </button>

      {isExpanded ? (
        <div className="space-y-3 border-t border-border px-4 py-4">
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="default" disabled={isPending} onClick={onOpenAddExercise}>
              <Plus className="h-4 w-4" />
              Add exercise
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={dayIndex === 0 || isPending}
              onClick={() => onReorder("up")}
            >
              Move up
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={dayIndex === totalDays - 1 || isPending}
              onClick={() => onReorder("down")}
            >
              Move down
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
            <Button type="button" size="sm" variant="ghost" disabled={isPending} onClick={onDelete}>
              Delete
            </Button>
          </div>

          {day.exercises.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No exercises yet. Tap <strong>Add exercise</strong> above.
            </p>
          ) : (
            <div className="space-y-2">
              {day.exercises.map((item) => (
                <details key={item.id} className="group rounded-xl border border-border/80 bg-background/60">
                  <summary className="flex cursor-pointer list-none items-start justify-between gap-3 px-3 py-3 [&::-webkit-details-marker]:hidden">
                    <div className="min-w-0">
                      <p className="font-medium">{item.exercise?.name ?? "Exercise"}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatTargets(item.target_sets, item.target_reps, item.target_weight)}
                      </p>
                      <ExercisePerformanceHint
                        performance={
                          item.exercise_id ? performanceMap[item.exercise_id] : undefined
                        }
                        className="mt-1"
                      />
                    </div>
                    <span className="text-xs text-muted-foreground">Edit</span>
                  </summary>
                  <div className="space-y-3 border-t border-border px-3 py-3">
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="space-y-1">
                        <Label>Sets</Label>
                        <Input
                          type="number"
                          min={0}
                          defaultValue={item.target_sets ?? ""}
                          disabled={isPending}
                          onBlur={(e) => {
                            const value = e.target.value ? Number(e.target.value) : null;
                            if (value !== item.target_sets) {
                              onUpdateExercise(
                                item.id,
                                value,
                                item.target_reps ?? "",
                                item.target_weight
                              );
                            }
                          }}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label>Reps</Label>
                        <Input
                          defaultValue={item.target_reps ?? ""}
                          placeholder="8-12"
                          disabled={isPending}
                          onBlur={(e) => {
                            const value = e.target.value;
                            if (value !== (item.target_reps ?? "")) {
                              onUpdateExercise(item.id, item.target_sets, value, item.target_weight);
                            }
                          }}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label>Weight (lbs)</Label>
                        <Input
                          type="number"
                          min={0}
                          step="0.5"
                          defaultValue={item.target_weight ?? ""}
                          placeholder="Optional"
                          disabled={isPending}
                          onBlur={(e) => {
                            const value = e.target.value.trim() ? Number(e.target.value) : null;
                            if (value !== item.target_weight) {
                              onUpdateExercise(item.id, item.target_sets, item.target_reps ?? "", value);
                            }
                          }}
                        />
                      </div>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="text-destructive"
                      disabled={isPending}
                      onClick={() => onRemoveExercise(item.id)}
                    >
                      Remove exercise
                    </Button>
                  </div>
                </details>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

type PlanCardProps = {
  plan: WorkoutPlanWithDetails;
  performanceMap: Record<number, ExercisePerformance>;
  isExpanded: boolean;
  isPending: boolean;
  showCoverage: boolean;
  printDayId: number | "";
  autoExpandFirstDay: boolean;
  onToggleExpand: () => void;
  onToggleCoverage: () => void;
  onSetPrintDayId: (dayId: number | "") => void;
  onOpenAddExercise: (target: ExercisePickerTarget) => void;
  onRunAction: (
    action: () => Promise<{ error?: string; success?: boolean }>,
    expandAfter?: number
  ) => void;
  onArchive: () => void;
};

function PlanCard({
  plan,
  performanceMap,
  isExpanded,
  isPending,
  showCoverage,
  printDayId,
  autoExpandFirstDay,
  onToggleExpand,
  onToggleCoverage,
  onSetPrintDayId,
  onOpenAddExercise,
  onRunAction,
  onArchive,
}: PlanCardProps) {
  const [planName, setPlanName] = useState(plan.name);
  const [newDayLabel, setNewDayLabel] = useState("");
  const [expandedDayIds, setExpandedDayIds] = useState<Set<number>>(new Set());
  const didAutoExpandDay = useRef(false);

  const planKind = inferPlanKind(plan);
  const exerciseCount = countPlanExercises(plan);
  const coverage = useMemo(() => evaluatePlanCoverage(plan), [plan]);

  useEffect(() => {
    if (didAutoExpandDay.current || !autoExpandFirstDay || !plan.days[0]) {
      return;
    }
    setExpandedDayIds(new Set([plan.days[0].id]));
    didAutoExpandDay.current = true;
  }, [autoExpandFirstDay, plan.days]);

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
        <div className="flex items-start justify-between gap-3">
          <button
            type="button"
            className="min-w-0 flex-1 text-left"
            aria-expanded={isExpanded}
            onClick={onToggleExpand}
          >
            <div className="flex flex-wrap items-center gap-2">
              <Chevron expanded={isExpanded} />
              <span className="font-display text-lg font-semibold leading-none tracking-tight">
                {plan.name}
              </span>
              <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                {planKind === "daily" ? "Daily" : "Cycle"}
              </span>
            </div>
            <span className="mt-1 block pl-6 text-sm leading-relaxed text-muted-foreground">
              {plan.days.length} day{plan.days.length === 1 ? "" : "s"} · {exerciseCount} exercise
              {exerciseCount === 1 ? "" : "s"}
            </span>
          </button>

          <div className="flex shrink-0 gap-2">
            <Button
              type="button"
              size="sm"
              disabled={isPending}
              className="bg-green-600 text-white hover:bg-green-700"
              onClick={(event) => {
                event.stopPropagation();
                if (!isExpanded) {
                  onToggleExpand();
                }
              }}
            >
              Edit
            </Button>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              disabled={isPending}
              onClick={(event) => {
                event.stopPropagation();
                onArchive();
              }}
            >
              Delete
            </Button>
          </div>
        </div>
      </CardHeader>

      {isExpanded ? (
        <CardContent className="space-y-4 border-t border-border pt-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
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
              onClick={() => onRunAction(() => updatePlanName(plan.id, planName), plan.id)}
            >
              Save name
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onToggleCoverage}>
              {showCoverage ? "Hide evaluation" : "Evaluate"}
            </Button>
            <a
              href="https://musclewiki.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-9 items-center justify-center rounded-xl border border-input bg-background px-3 text-sm font-medium hover:bg-accent"
            >
              MuscleWiki
            </a>
          </div>

          {showCoverage ? <CoverageReport report={coverage} /> : null}

          {planKind === "cycle" ? (
            <div className="rounded-xl border border-dashed border-border bg-muted/20 p-4">
              <p className="mb-2 text-sm font-medium">Add another day</p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  value={newDayLabel}
                  onChange={(e) => setNewDayLabel(e.target.value)}
                  placeholder="e.g. Pull, Legs, Speed"
                />
                <Button
                  type="button"
                  disabled={isPending || !newDayLabel.trim()}
                  onClick={() =>
                    onRunAction(async () => {
                      const result = await addPlanDay(plan.id, newDayLabel);
                      if (!result.error) {
                        setNewDayLabel("");
                      }
                      return result;
                    }, plan.id)
                  }
                >
                  Add day
                </Button>
              </div>
            </div>
          ) : null}

          {plan.days.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              This plan has no days yet. Add a cycle day above to start building.
            </p>
          ) : (
            <div className="space-y-3">
              {plan.days.map((day, index) => (
                <PlanDaySection
                  key={day.id}
                  day={day}
                  dayIndex={index}
                  totalDays={plan.days.length}
                  performanceMap={performanceMap}
                  isExpanded={expandedDayIds.has(day.id)}
                  isPending={isPending}
                  onToggleExpand={() => toggleDay(day.id)}
                  onOpenAddExercise={() =>
                    onOpenAddExercise({
                      planId: plan.id,
                      dayId: day.id,
                      dayLabel: day.day_label,
                    })
                  }
                  onReorder={(direction) => {
                    const ids = plan.days.map((d) => d.id);
                    const swapIndex = direction === "up" ? index - 1 : index + 1;
                    [ids[index], ids[swapIndex]] = [ids[swapIndex], ids[index]];
                    onRunAction(() => reorderPlanDays(plan.id, ids), plan.id);
                  }}
                  onRename={(label) =>
                    onRunAction(() => updatePlanDayLabel(day.id, label), plan.id)
                  }
                  onDelete={() => {
                    if (window.confirm(`Delete "${day.day_label}" and all its exercises?`)) {
                      onRunAction(() => deletePlanDay(day.id), plan.id);
                    }
                  }}
                  onRemoveExercise={(planExerciseId) =>
                    onRunAction(() => removePlanExercise(planExerciseId), plan.id)
                  }
                  onUpdateExercise={(planExerciseId, targetSets, targetReps, targetWeight) =>
                    onRunAction(
                      () =>
                        updatePlanExercise({
                          planExerciseId,
                          targetSets,
                          targetReps,
                          targetWeight,
                        }),
                      plan.id
                    )
                  }
                />
              ))}
            </div>
          )}

          <div className="rounded-xl border border-border/80 bg-muted/20 p-4">
            <p className="mb-2 text-sm font-medium">Print workout sheet</p>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <div className="flex-1 space-y-2">
                <Label htmlFor={`printDay-${plan.id}`}>Day</Label>
                <select
                  id={`printDay-${plan.id}`}
                  className="select-field flex h-11 w-full rounded-xl border border-input bg-card px-3 py-2 text-sm"
                  value={printDayId}
                  onChange={(e) => onSetPrintDayId(e.target.value ? Number(e.target.value) : "")}
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
                  className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground hover:opacity-90"
                >
                  Print
                </Link>
              ) : (
                <Button type="button" disabled>
                  Print
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      ) : null}
    </Card>
  );
}

export function PlanBuilder({
  initialPlans,
  exercises,
  performanceMap,
  initialExpandPlanId,
}: PlanBuilderProps) {
  const plans = initialPlans;
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [exercisePicker, setExercisePicker] = useState<ExercisePickerTarget | null>(null);
  const [expandedPlanIds, setExpandedPlanIds] = useState<Set<number>>(() =>
    initialExpandPlanId ? new Set([initialExpandPlanId]) : new Set()
  );
  const [coveragePlanId, setCoveragePlanId] = useState<number | null>(null);
  const [printDayByPlan, setPrintDayByPlan] = useState<Record<number, number | "">>(() =>
    Object.fromEntries(initialPlans.map((plan) => [plan.id, plan.days[0]?.id ?? ""]))
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function runAction(
    action: () => Promise<{ error?: string; success?: boolean }>,
    expandAfter?: number
  ) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result.error) {
        setError(result.error);
        return;
      }
      window.location.href = expandAfter ? `/plan?expand=${expandAfter}` : "/plan";
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold tracking-tight">Your plans</h2>
          <p className="text-sm text-muted-foreground">
            {plans.length === 0
              ? "No plans yet — create one to get started."
              : `${plans.length} active plan${plans.length === 1 ? "" : "s"}`}
          </p>
        </div>
        <Button type="button" onClick={() => setShowCreateModal(true)} className="gap-1.5">
          <Plus className="h-4 w-4" />
          Create plan
        </Button>
      </div>

      {error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {plans.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-sm text-muted-foreground">
              Build a training cycle or a one-off daily workout template.
            </p>
            <Button type="button" className="mt-4" onClick={() => setShowCreateModal(true)}>
              Create your first plan
            </Button>
          </CardContent>
        </Card>
      ) : (
        plans.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            performanceMap={performanceMap}
            isExpanded={expandedPlanIds.has(plan.id)}
            isPending={isPending}
            showCoverage={coveragePlanId === plan.id}
            printDayId={printDayByPlan[plan.id] ?? ""}
            autoExpandFirstDay={plan.id === initialExpandPlanId}
            onToggleExpand={() => togglePlan(plan.id)}
            onToggleCoverage={() =>
              setCoveragePlanId((current) => (current === plan.id ? null : plan.id))
            }
            onSetPrintDayId={(dayId) =>
              setPrintDayByPlan((current) => ({ ...current, [plan.id]: dayId }))
            }
            onOpenAddExercise={setExercisePicker}
            onRunAction={runAction}
            onArchive={() => {
              if (window.confirm(`Delete "${plan.name}"? This cannot be undone.`)) {
                runAction(() => archivePlan(plan.id), undefined);
              }
            }}
          />
        ))
      )}

      <CreatePlanModal open={showCreateModal} onClose={() => setShowCreateModal(false)} />

      <PlanExercisePickerModal
        open={exercisePicker != null}
        dayLabel={exercisePicker?.dayLabel ?? ""}
        exercises={exercises}
        disabled={isPending}
        onClose={() => setExercisePicker(null)}
        onSelect={(exerciseId, targetSets, targetReps, targetWeight) => {
          if (!exercisePicker) {
            return;
          }
          const { dayId, planId } = exercisePicker;
          setExercisePicker(null);
          runAction(
            () =>
              addPlanExercise({
                planDayId: dayId,
                exerciseId,
                targetSets,
                targetReps,
                targetWeight,
              }),
            planId
          );
        }}
      />
    </div>
  );
}
