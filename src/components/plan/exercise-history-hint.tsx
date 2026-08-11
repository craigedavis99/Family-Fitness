import { formatExerciseHistoryCompact, formatExerciseHistoryDisplay } from "@/lib/workout";
import type { ExercisePerformance } from "@/lib/types";

type ExerciseHistoryHintProps = {
  performance?: ExercisePerformance | null;
  compact?: boolean;
  className?: string;
};

export function ExerciseHistoryHint({
  performance,
  compact = false,
  className,
}: ExerciseHistoryHintProps) {
  const text = compact
    ? formatExerciseHistoryCompact(performance)
    : formatExerciseHistoryDisplay(performance);

  if (!text) {
    return (
      <p className={className ?? "text-xs text-muted-foreground"}>
        No logged history yet for this exercise.
      </p>
    );
  }

  return <p className={className ?? "text-xs text-muted-foreground"}>{text}</p>;
}
