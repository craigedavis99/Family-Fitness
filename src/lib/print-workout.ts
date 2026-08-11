import type { PlanExercise } from "@/lib/types";

const MAX_PRINT_PAGES = 2;

export function getPrintSetRowCount(
  targetSets: number | null | undefined,
  exerciseCount: number
): number {
  const base = targetSets && targetSets > 0 ? targetSets : 3;

  if (exerciseCount > 12) {
    return Math.min(base, 3);
  }
  if (exerciseCount > 8) {
    return Math.min(base, 4);
  }
  return Math.min(base, 5);
}

export function splitExercisesForPrint(exercises: PlanExercise[]): PlanExercise[][] {
  if (exercises.length === 0) {
    return [[]];
  }

  if (exercises.length <= 5) {
    return [exercises];
  }

  const mid = Math.ceil(exercises.length / MAX_PRINT_PAGES);
  const pages: PlanExercise[][] = [];

  for (let index = 0; index < exercises.length; index += mid) {
    pages.push(exercises.slice(index, index + mid));
  }

  return pages.slice(0, MAX_PRINT_PAGES);
}

export function shouldUsePrintColumns(exerciseCount: number) {
  return exerciseCount >= 4;
}
