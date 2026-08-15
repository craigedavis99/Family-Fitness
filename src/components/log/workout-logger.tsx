"use client";

import { useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LogExercisePicker } from "@/components/log/log-exercise-picker";
import { deleteWorkoutSession, saveWorkoutSession, updateWorkoutSession } from "@/app/actions/workouts";
import { ExercisePerformanceHint } from "@/components/plan/exercise-performance-hint";
import {
  defaultSetRows,
  getTopSetFromInputs,
  isNewExercisePr,
  resolveExerciseGuidance,
  todayDateString,
} from "@/lib/workout";
import type {
  Exercise,
  ExercisePerformance,
  LoggedExerciseInput,
  PlanDayLogOption,
  WorkoutSessionWithSets,
} from "@/lib/types";

type WorkoutLoggerProps = {
  planDayOptions: PlanDayLogOption[];
  exercises: Exercise[];
  performanceMap: Record<number, ExercisePerformance>;
  sessions: WorkoutSessionWithSets[];
  editingSession?: WorkoutSessionWithSets | null;
  onSaved: () => void;
  onCancelEdit?: () => void;
};

type DraftSet = {
  setNumber: number;
  weight: string;
  reps: string;
};

type DraftExercise = {
  exerciseId: number;
  name: string;
  notes: string;
  sets: DraftSet[];
};

function sessionToDraft(session: WorkoutSessionWithSets, exercises: Exercise[]): DraftExercise[] {
  const byExercise = new Map<number, DraftExercise>();

  for (const set of session.sets) {
    const existing = byExercise.get(set.exercise_id);
    const name =
      set.exercise?.name ??
      exercises.find((exercise) => exercise.id === set.exercise_id)?.name ??
      "Exercise";

    if (!existing) {
      byExercise.set(set.exercise_id, {
        exerciseId: set.exercise_id,
        name,
        notes: set.notes ?? "",
        sets: [],
      });
    }

    const draft = byExercise.get(set.exercise_id)!;
    draft.sets.push({
      setNumber: set.set_number,
      weight: set.weight != null ? String(set.weight) : "",
      reps: set.reps != null ? String(set.reps) : "",
    });
  }

  return Array.from(byExercise.values()).map((exercise) => ({
    ...exercise,
    sets: exercise.sets.sort((a, b) => a.setNumber - b.setNumber),
  }));
}

function planDayToDraft(option: PlanDayLogOption, exercises: Exercise[]): DraftExercise[] {
  return option.exercises.map((item) => ({
    exerciseId: item.exercise_id,
    name: item.exercise?.name ?? exercises.find((e) => e.id === item.exercise_id)?.name ?? "Exercise",
    notes: "",
    sets: Array.from({ length: defaultSetRows(item.target_sets) }, (_, index) => ({
      setNumber: index + 1,
      weight: "",
      reps: "",
    })),
  }));
}

function toPayloadExercises(draft: DraftExercise[]): LoggedExerciseInput[] {
  return draft.map((exercise) => ({
    exerciseId: exercise.exerciseId,
    notes: exercise.notes,
    sets: exercise.sets.map((set) => ({
      setNumber: set.setNumber,
      weight: set.weight.trim() ? Number(set.weight) : null,
      reps: set.reps.trim() ? Number(set.reps) : null,
    })),
  }));
}

export function WorkoutLogger({
  planDayOptions,
  exercises,
  performanceMap,
  sessions,
  editingSession,
  onSaved,
  onCancelEdit,
}: WorkoutLoggerProps) {
  const [sessionDate, setSessionDate] = useState(editingSession?.session_date ?? todayDateString());
  const [source, setSource] = useState<"custom" | "plan">(
    editingSession?.plan_day_id ? "plan" : "custom"
  );
  const [planDayId, setPlanDayId] = useState<number | "">(editingSession?.plan_day_id ?? "");
  const [customLabel, setCustomLabel] = useState(editingSession?.label ?? "");
  const [sessionNotes, setSessionNotes] = useState(editingSession?.notes ?? "");
  const [draftExercises, setDraftExercises] = useState<DraftExercise[]>(() =>
    editingSession ? sessionToDraft(editingSession, exercises) : []
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const exerciseNameById = useMemo(
    () => new Map(exercises.map((exercise) => [exercise.id, exercise.name])),
    [exercises]
  );

  function handleSourceChange(nextSource: "custom" | "plan") {
    setSource(nextSource);
    if (nextSource === "custom") {
      setPlanDayId("");
    }
  }

  function handlePlanDayChange(value: string) {
    const id = value ? Number(value) : "";
    setPlanDayId(id);
    if (!id) {
      return;
    }

    const option = planDayOptions.find((item) => item.planDayId === id);
    if (option) {
      setDraftExercises(planDayToDraft(option, exercises));
      setSource("plan");
    }
  }

  function addExercise(exerciseId: number) {
    const name = exerciseNameById.get(exerciseId) ?? "Exercise";
    setDraftExercises((current) => [
      ...current,
      {
        exerciseId,
        name,
        notes: "",
        sets: Array.from({ length: 3 }, (_, index) => ({
          setNumber: index + 1,
          weight: "",
          reps: "",
        })),
      },
    ]);
  }

  function updateSet(exerciseIndex: number, setIndex: number, field: "weight" | "reps", value: string) {
    setDraftExercises((current) =>
      current.map((exercise, idx) => {
        if (idx !== exerciseIndex) {
          return exercise;
        }
        return {
          ...exercise,
          sets: exercise.sets.map((set, sIdx) =>
            sIdx === setIndex ? { ...set, [field]: value } : set
          ),
        };
      })
    );
  }

  function addSet(exerciseIndex: number) {
    setDraftExercises((current) =>
      current.map((exercise, idx) => {
        if (idx !== exerciseIndex) {
          return exercise;
        }
        const nextNumber = exercise.sets.length + 1;
        return {
          ...exercise,
          sets: [...exercise.sets, { setNumber: nextNumber, weight: "", reps: "" }],
        };
      })
    );
  }

  function removeSet(exerciseIndex: number, setIndex: number) {
    setDraftExercises((current) =>
      current.map((exercise, idx) => {
        if (idx !== exerciseIndex) {
          return exercise;
        }
        const sets = exercise.sets
          .filter((_, sIdx) => sIdx !== setIndex)
          .map((set, index) => ({ ...set, setNumber: index + 1 }));
        return { ...exercise, sets };
      })
    );
  }

  function removeExercise(exerciseIndex: number) {
    setDraftExercises((current) => current.filter((_, idx) => idx !== exerciseIndex));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const payload = {
      sessionDate,
      planDayId: source === "plan" && planDayId ? Number(planDayId) : null,
      label: source === "custom" ? customLabel : null,
      notes: sessionNotes,
      exercises: toPayloadExercises(draftExercises),
    };

    startTransition(async () => {
      const result = editingSession
        ? await updateWorkoutSession(editingSession.id, payload)
        : await saveWorkoutSession(payload);

      if (result.error) {
        setError(result.error);
        return;
      }

      onSaved();
    });
  }

  function handleDelete() {
    if (!editingSession) {
      return;
    }

    if (!window.confirm("Delete this logged workout?")) {
      return;
    }

    startTransition(async () => {
      const result = await deleteWorkoutSession(editingSession.id);
      if (result.error) {
        setError(result.error);
        return;
      }
      onSaved();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{editingSession ? "Edit workout" : "Log a workout"}</CardTitle>
        <CardDescription>
          Pick a plan day to prefill exercises, then add extras below. Or build a fully custom workout.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="sessionDate">Date</Label>
              <Input
                id="sessionDate"
                type="date"
                value={sessionDate}
                onChange={(e) => setSessionDate(e.target.value)}
                required
                disabled={isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="workoutSource">Workout source</Label>
              <select
                id="workoutSource"
                className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                value={source}
                onChange={(e) => handleSourceChange(e.target.value as "custom" | "plan")}
                disabled={isPending}
              >
                <option value="plan">From my plan</option>
                <option value="custom">Custom workout</option>
              </select>
            </div>
          </div>

          {source === "plan" ? (
            <div className="space-y-2">
              <Label htmlFor="planDay">Plan day</Label>
              <select
                id="planDay"
                className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                value={planDayId}
                onChange={(e) => handlePlanDayChange(e.target.value)}
                disabled={isPending}
              >
                <option value="">Select a plan day</option>
                {planDayOptions.map((option) => (
                  <option key={option.planDayId} value={option.planDayId}>
                    {option.displayLabel}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="customLabel">Workout label</Label>
              <Input
                id="customLabel"
                value={customLabel}
                onChange={(e) => setCustomLabel(e.target.value)}
                placeholder="e.g. Hotel gym, Extra arm work"
                disabled={isPending}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="sessionNotes">Session notes</Label>
            <Input
              id="sessionNotes"
              value={sessionNotes}
              onChange={(e) => setSessionNotes(e.target.value)}
              placeholder="Optional"
              disabled={isPending}
            />
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="font-display text-base font-semibold tracking-tight">Exercises</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {draftExercises.length === 0
                  ? "Select a plan day above, or add exercises below."
                  : `${draftExercises.length} exercise${draftExercises.length === 1 ? "" : "s"} in this session.`}
              </p>
            </div>

            {draftExercises.length === 0 ? (
              <LogExercisePicker
                exercises={exercises}
                excludeIds={draftExercises.map((item) => item.exerciseId)}
                disabled={isPending}
                onSelect={addExercise}
              />
            ) : (
              draftExercises.map((exercise, exerciseIndex) => {
                const performance = resolveExerciseGuidance(
                  exercise.exerciseId,
                  performanceMap,
                  sessions,
                  editingSession?.id
                );
                const topSet = getTopSetFromInputs(
                  exercise.sets.map((set) => ({
                    weight: set.weight.trim() ? Number(set.weight) : null,
                    reps: set.reps.trim() ? Number(set.reps) : null,
                  }))
                );
                const isPr = isNewExercisePr(
                  topSet,
                  performance?.heaviestWeight ?? null,
                  performance?.heaviestReps ?? null
                );

                return (
                  <div key={`${exercise.exerciseId}-${exerciseIndex}`} className="rounded-lg border border-border p-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium">{exercise.name}</p>
                          {isPr ? (
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-amber-900 dark:bg-amber-950 dark:text-amber-100">
                              New PR
                            </span>
                          ) : null}
                        </div>
                        <ExercisePerformanceHint performance={performance} className="mt-1" />
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={isPending}
                        onClick={() => removeExercise(exerciseIndex)}
                      >
                        Remove
                      </Button>
                    </div>

                    <div className="mt-3 space-y-2">
                      {exercise.sets.map((set, setIndex) => (
                        <div key={set.setNumber} className="grid grid-cols-[auto_1fr_1fr_auto] items-end gap-2">
                          <span className="pb-2 text-sm text-muted-foreground">Set {set.setNumber}</span>
                          <div className="space-y-1">
                            <Label className="text-xs">Weight (lbs)</Label>
                            <Input
                              type="number"
                              min={0}
                              step="0.5"
                              value={set.weight}
                              onChange={(e) => updateSet(exerciseIndex, setIndex, "weight", e.target.value)}
                              disabled={isPending}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Reps</Label>
                            <Input
                              type="number"
                              min={0}
                              value={set.reps}
                              onChange={(e) => updateSet(exerciseIndex, setIndex, "reps", e.target.value)}
                              disabled={isPending}
                            />
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            disabled={isPending || exercise.sets.length <= 1}
                            onClick={() => removeSet(exerciseIndex, setIndex)}
                          >
                            ✕
                          </Button>
                        </div>
                      ))}
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={isPending}
                        onClick={() => addSet(exerciseIndex)}
                      >
                        Add set
                      </Button>
                    </div>

                    <div className="mt-3 space-y-1">
                      <Label className="text-xs">Exercise notes</Label>
                      <Input
                        value={exercise.notes}
                        onChange={(e) =>
                          setDraftExercises((current) =>
                            current.map((item, idx) =>
                              idx === exerciseIndex ? { ...item, notes: e.target.value } : item
                            )
                          )
                        }
                        placeholder="Optional"
                        disabled={isPending}
                      />
                    </div>
                  </div>
                );
              })
            )}

            {draftExercises.length > 0 ? (
              <LogExercisePicker
                exercises={exercises}
                excludeIds={draftExercises.map((item) => item.exerciseId)}
                disabled={isPending}
                onSelect={addExercise}
                compact
              />
            ) : null}
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : editingSession ? "Save changes" : "Save workout"}
            </Button>
            {editingSession ? (
              <>
                <Button type="button" variant="outline" disabled={isPending} onClick={onCancelEdit}>
                  Cancel
                </Button>
                <Button type="button" variant="destructive" disabled={isPending} onClick={handleDelete}>
                  Delete workout
                </Button>
              </>
            ) : null}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
