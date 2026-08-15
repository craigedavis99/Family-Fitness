"use client";

import { useState, useTransition } from "react";
import { deleteWorkoutSession } from "@/app/actions/workouts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPerformanceSummary, formatShortDate } from "@/lib/workout";
import type { PlanDayLogOption, WorkoutSessionWithSets } from "@/lib/types";

type SessionHistoryProps = {
  sessions: WorkoutSessionWithSets[];
  planDayOptions: PlanDayLogOption[];
  onEdit: (session: WorkoutSessionWithSets) => void;
};

function sessionLabel(
  session: WorkoutSessionWithSets,
  planDayOptions: PlanDayLogOption[]
): string {
  if (session.label) {
    return session.label;
  }

  if (session.plan_day_id) {
    const option = planDayOptions.find((item) => item.planDayId === session.plan_day_id);
    if (option) {
      return option.displayLabel;
    }
  }

  return "Workout";
}

function groupSetsByExercise(session: WorkoutSessionWithSets) {
  const groups = new Map<
    number,
    { name: string; sets: WorkoutSessionWithSets["sets"]; notes: string | null }
  >();

  for (const set of session.sets) {
    const existing = groups.get(set.exercise_id);
    const name = set.exercise?.name ?? "Exercise";

    if (!existing) {
      groups.set(set.exercise_id, {
        name,
        sets: [],
        notes: set.notes,
      });
    }

    groups.get(set.exercise_id)!.sets.push(set);
  }

  return Array.from(groups.values()).map((group) => ({
    ...group,
    sets: group.sets.sort((a, b) => a.set_number - b.set_number),
  }));
}

export function SessionHistory({ sessions, planDayOptions, onEdit }: SessionHistoryProps) {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleDelete(session: WorkoutSessionWithSets) {
    const label = sessionLabel(session, planDayOptions);
    if (!window.confirm(`Delete "${label}" from ${formatShortDate(session.session_date)}?`)) {
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await deleteWorkoutSession(session.id);
      if (result.error) {
        setError(result.error);
        return;
      }
      window.location.reload();
    });
  }

  if (sessions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Workout history</CardTitle>
          <CardDescription>Your logged workouts will appear here.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Workout history</CardTitle>
        <CardDescription>
          {sessions.length} logged workout{sessions.length === 1 ? "" : "s"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {error ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        {sessions.map((session) => {
          const expanded = expandedId === session.id;
          const label = sessionLabel(session, planDayOptions);
          const exerciseGroups = groupSetsByExercise(session);

          return (
            <div key={session.id} className="rounded-lg border border-border">
              <div className="flex items-center justify-between gap-3 px-4 py-3">
                <button
                  type="button"
                  className="min-w-0 flex-1 text-left"
                  aria-expanded={expanded}
                  onClick={() => setExpandedId(expanded ? null : session.id)}
                >
                  <p className="font-medium">{label}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatShortDate(session.session_date)} · {exerciseGroups.length} exercise
                    {exerciseGroups.length === 1 ? "" : "s"}
                  </p>
                </button>

                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    className="text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => setExpandedId(expanded ? null : session.id)}
                  >
                    {expanded ? "Collapse" : "Expand"}
                  </button>
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    disabled={isPending}
                    onClick={() => handleDelete(session)}
                  >
                    Delete
                  </Button>
                </div>
              </div>

              {expanded ? (
                <div className="space-y-4 border-t border-border px-4 py-4">
                  {session.notes ? (
                    <p className="text-sm text-muted-foreground">Notes: {session.notes}</p>
                  ) : null}

                  {exerciseGroups.map((group) => (
                    <div key={group.name}>
                      <p className="font-medium">{group.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatPerformanceSummary(group.sets) ?? "No sets logged"}
                      </p>
                      <ul className="mt-1 space-y-1 text-sm text-muted-foreground">
                        {group.sets.map((set) => (
                          <li key={set.id}>
                            Set {set.set_number}: {set.weight ?? "—"} lbs × {set.reps ?? "—"} reps
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}

                  <Button type="button" size="sm" variant="outline" onClick={() => onEdit(session)}>
                    Edit workout
                  </Button>
                </div>
              ) : null}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
