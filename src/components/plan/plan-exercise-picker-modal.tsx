"use client";

import { PlanModal } from "@/components/plan/plan-modal";
import { ExercisePicker } from "@/components/plan/exercise-picker";
import type { Exercise } from "@/lib/types";

type PlanExercisePickerModalProps = {
  open: boolean;
  dayLabel: string;
  exercises: Exercise[];
  disabled?: boolean;
  onClose: () => void;
  onSelect: (
    exerciseId: number,
    targetSets: number | null,
    targetReps: string,
    targetWeight: number | null
  ) => void;
};

export function PlanExercisePickerModal({
  open,
  dayLabel,
  exercises,
  disabled,
  onClose,
  onSelect,
}: PlanExercisePickerModalProps) {
  function handleSelect(
    exerciseId: number,
    targetSets: number | null,
    targetReps: string,
    targetWeight: number | null
  ) {
    onSelect(exerciseId, targetSets, targetReps, targetWeight);
  }

  return (
    <PlanModal
      open={open}
      title="Add exercise"
      description={`Adding to ${dayLabel}`}
      onClose={onClose}
    >
      <ExercisePicker
        exercises={exercises}
        disabled={disabled}
        onSelect={handleSelect}
        inModal
      />
    </PlanModal>
  );
}
