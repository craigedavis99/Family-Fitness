import {
  formatHeaviestPerformance,
  hasExercisePerformanceData,
  NO_PREVIOUS_EXERCISE_DATA,
} from "@/lib/workout";
import type { ExercisePerformance } from "@/lib/types";
import { cn } from "@/lib/utils";

type ExercisePerformanceHintProps = {
  performance?: ExercisePerformance | null;
  className?: string;
  missingClassName?: string;
  print?: boolean;
};

export function ExercisePerformanceHint({
  performance,
  className,
  missingClassName,
  print = false,
}: ExercisePerformanceHintProps) {
  const text = formatHeaviestPerformance(performance);
  const hasData = hasExercisePerformanceData(performance) && text != null;

  if (!hasData) {
    return (
      <p
        className={cn(
          print ? "print-exercise-history-missing" : "text-xs font-medium text-destructive",
          missingClassName,
          className
        )}
      >
        {NO_PREVIOUS_EXERCISE_DATA}
      </p>
    );
  }

  return (
    <p
      className={cn(
        print ? "print-exercise-history" : "text-xs text-muted-foreground",
        className
      )}
    >
      {text}
    </p>
  );
}
