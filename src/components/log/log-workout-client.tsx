"use client";

import { useState } from "react";
import { WorkoutLogger } from "@/components/log/workout-logger";
import { SessionHistory } from "@/components/log/session-history";
import type {
  Exercise,
  ExercisePerformance,
  PlanDayLogOption,
  WorkoutSessionWithSets,
} from "@/lib/types";

type LogWorkoutClientProps = {
  planDayOptions: PlanDayLogOption[];
  exercises: Exercise[];
  performanceMap: Record<number, ExercisePerformance>;
  sessions: WorkoutSessionWithSets[];
};

export function LogWorkoutClient({
  planDayOptions,
  exercises,
  performanceMap,
  sessions,
}: LogWorkoutClientProps) {
  const [editingSession, setEditingSession] = useState<WorkoutSessionWithSets | null>(null);
  const [formKey, setFormKey] = useState(0);

  function handleSaved() {
    setEditingSession(null);
    setFormKey((value) => value + 1);
    window.location.reload();
  }

  return (
    <div className="space-y-6">
      <WorkoutLogger
        key={editingSession ? `edit-${editingSession.id}` : `new-${formKey}`}
        planDayOptions={planDayOptions}
        exercises={exercises}
        performanceMap={performanceMap}
        sessions={sessions}
        editingSession={editingSession}
        onSaved={handleSaved}
        onCancelEdit={() => setEditingSession(null)}
      />

      {!editingSession ? (
        <SessionHistory
          sessions={sessions}
          planDayOptions={planDayOptions}
          onEdit={(session) => {
            setEditingSession(session);
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        />
      ) : null}
    </div>
  );
}
