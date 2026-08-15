import type { ExercisePerformance, ExerciseHistoryEntry, SessionSet, WorkoutSessionWithSets } from "@/lib/types";

export function getTopSetFromLoggedSets(sets: SessionSet[]) {
  const logged = sets.filter((set) => set.weight != null || set.reps != null);
  if (logged.length === 0) {
    return null;
  }

  return logged.reduce((best, set) => {
    const weight = set.weight ?? 0;
    const bestWeight = best.weight ?? 0;
    if (weight > bestWeight) {
      return set;
    }
    if (weight === bestWeight && (set.reps ?? 0) > (best.reps ?? 0)) {
      return set;
    }
    return best;
  });
}

export function formatPerformanceSummary(sets: SessionSet[]): string | null {
  const logged = sets.filter((set) => set.weight != null || set.reps != null);
  if (logged.length === 0) {
    return null;
  }

  const topSet = getTopSetFromLoggedSets(sets);
  if (!topSet) {
    return null;
  }

  const reps = topSet.reps ?? "—";
  const weight = topSet.weight ?? "—";
  return `${logged.length}×${reps} @ ${weight} lbs`;
}

export function buildHistoryEntry(sessionDate: string, sets: SessionSet[]): ExerciseHistoryEntry | null {
  const summary = formatPerformanceSummary(sets);
  if (!summary) {
    return null;
  }

  const topSet = getTopSetFromLoggedSets(sets);
  return {
    sessionDate,
    summary,
    topWeight: topSet?.weight != null ? Number(topSet.weight) : null,
    topReps: topSet?.reps != null ? Number(topSet.reps) : null,
  };
}

export function getTopSetFromInputs(
  sets: { weight: number | null; reps: number | null }[]
): { weight: number | null; reps: number | null } | null {
  const logged = sets.filter((set) => set.weight != null || set.reps != null);
  if (logged.length === 0) {
    return null;
  }

  return logged.reduce((best, set) => {
    const weight = set.weight ?? 0;
    const bestWeight = best.weight ?? 0;
    if (weight > bestWeight) {
      return set;
    }
    if (weight === bestWeight && (set.reps ?? 0) > (best.reps ?? 0)) {
      return set;
    }
    return best;
  });
}

export function isNewExercisePr(
  topSet: { weight: number | null; reps: number | null } | null,
  heaviestWeight: number | null,
  heaviestReps: number | null
): boolean {
  if (!topSet || topSet.weight == null) {
    return false;
  }

  if (heaviestWeight == null) {
    return topSet.weight > 0;
  }

  if (topSet.weight > heaviestWeight) {
    return true;
  }

  if (topSet.weight === heaviestWeight && heaviestReps != null && topSet.reps != null) {
    return topSet.reps > heaviestReps;
  }

  return false;
}

export function formatShortDate(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export function todayDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function defaultSetRows(count: number | null | undefined) {
  const rows = count && count > 0 ? count : 3;
  return Math.min(Math.max(rows, 1), 8);
}

function compareSets(
  a: { weight: number | null; reps: number | null },
  b: { weight: number | null; reps: number | null }
) {
  const aWeight = a.weight ?? 0;
  const bWeight = b.weight ?? 0;
  if (aWeight !== bWeight) {
    return aWeight - bWeight;
  }
  return (a.reps ?? 0) - (b.reps ?? 0);
}

export function getHeaviestFromSessions(
  sessions: WorkoutSessionWithSets[],
  exerciseId: number,
  excludeSessionId?: number | null
) {
  let best: { weight: number; reps: number | null; sessionDate: string } | null = null;

  for (const session of sessions) {
    if (excludeSessionId != null && session.id === excludeSessionId) {
      continue;
    }

    for (const set of session.sets) {
      if (set.exercise_id !== exerciseId || set.weight == null) {
        continue;
      }

      const candidate = {
        weight: Number(set.weight),
        reps: set.reps != null ? Number(set.reps) : null,
        sessionDate: session.session_date,
      };

      if (!best || compareSets(candidate, best) > 0) {
        best = candidate;
      }
    }
  }

  return best;
}

export function getLastPerformanceFromSessions(
  sessions: WorkoutSessionWithSets[],
  exerciseId: number,
  excludeSessionId?: number | null
) {
  for (const session of sessions) {
    if (excludeSessionId != null && session.id === excludeSessionId) {
      continue;
    }

    const sets = session.sets.filter((set) => set.exercise_id === exerciseId);
    const summary = formatPerformanceSummary(sets);
    if (summary) {
      return {
        sessionDate: session.session_date,
        summary,
      };
    }
  }

  return null;
}

export function resolveExerciseGuidance(
  exerciseId: number,
  performanceMap: Record<number, ExercisePerformance>,
  sessions: WorkoutSessionWithSets[],
  editingSessionId?: number | null
): ExercisePerformance {
  const empty: ExercisePerformance = {
    lastSessionDate: null,
    lastSummary: null,
    heaviestWeight: null,
    heaviestReps: null,
    heaviestDate: null,
    recentHistory: [],
  };

  const fallback = performanceMap[exerciseId] ?? empty;

  if (editingSessionId == null) {
    return fallback;
  }

  const heaviest = getHeaviestFromSessions(sessions, exerciseId, editingSessionId);
  const last = getLastPerformanceFromSessions(sessions, exerciseId, editingSessionId);
  const recentHistory = getRecentHistoryFromSessions(sessions, exerciseId, editingSessionId, 3);

  return {
    lastSessionDate: last?.sessionDate ?? null,
    lastSummary: last?.summary ?? null,
    heaviestWeight: heaviest?.weight ?? null,
    heaviestReps: heaviest?.reps ?? null,
    heaviestDate: heaviest?.sessionDate ?? null,
    recentHistory,
  };
}

export function getRecentHistoryFromSessions(
  sessions: WorkoutSessionWithSets[],
  exerciseId: number,
  excludeSessionId?: number | null,
  limit = 3
): ExerciseHistoryEntry[] {
  const history: ExerciseHistoryEntry[] = [];

  for (const session of sessions) {
    if (excludeSessionId != null && session.id === excludeSessionId) {
      continue;
    }

    const sets = session.sets.filter((set) => set.exercise_id === exerciseId);
    const entry = buildHistoryEntry(session.session_date, sets);
    if (entry) {
      history.push(entry);
    }

    if (history.length >= limit) {
      break;
    }
  }

  return history;
}

export const NO_PREVIOUS_EXERCISE_DATA = "No previous data has been entered.";

export function hasExercisePerformanceData(
  performance: ExercisePerformance | null | undefined
): boolean {
  if (!performance) {
    return false;
  }

  if (performance.heaviestWeight != null || performance.heaviestReps != null) {
    return true;
  }

  return performance.recentHistory.length > 0;
}

export function formatHeaviestPerformance(
  performance: ExercisePerformance | null | undefined
): string | null {
  if (!performance) {
    return null;
  }

  let weight = performance.heaviestWeight;
  let reps = performance.heaviestReps;
  let date = performance.heaviestDate;

  if (weight == null && performance.recentHistory[0]) {
    weight = performance.recentHistory[0].topWeight;
    reps = performance.recentHistory[0].topReps;
    date = performance.recentHistory[0].sessionDate;
  }

  if (weight == null && reps == null) {
    return null;
  }

  const dateSuffix = date ? ` (${formatShortDate(date)})` : "";

  if (weight != null && reps != null) {
    return `Heaviest logged: ${weight} lbs × ${reps} reps${dateSuffix}`;
  }

  if (weight != null) {
    return `Heaviest logged: ${weight} lbs${dateSuffix}`;
  }

  return `Heaviest logged: ${reps} reps${dateSuffix}`;
}

export function formatExerciseHistoryDisplay(
  performance: ExercisePerformance | null | undefined
): string | null {
  if (!performance?.recentHistory.length) {
    return null;
  }

  const { recentHistory } = performance;

  if (recentHistory.length === 1) {
    const entry = recentHistory[0];
    return `Last logged (${formatShortDate(entry.sessionDate)}): ${entry.summary}`;
  }

  const weights = recentHistory
    .map((entry) => entry.topWeight)
    .filter((weight): weight is number => weight != null);

  const weightRange =
    weights.length > 1
      ? `${Math.min(...weights)}–${Math.max(...weights)} lbs`
      : weights[0] != null
        ? `${weights[0]} lbs`
        : null;

  const sessionSummaries = recentHistory
    .map((entry) => `${formatShortDate(entry.sessionDate)}: ${entry.summary}`)
    .join(" · ");

  if (weightRange) {
    return `Recent (${weightRange}): ${sessionSummaries}`;
  }

  return `Recent: ${sessionSummaries}`;
}

export function formatExerciseHistoryCompact(
  performance: ExercisePerformance | null | undefined
): string | null {
  if (!performance?.recentHistory.length) {
    return null;
  }

  const entry = performance.recentHistory[0];
  if (performance.recentHistory.length === 1) {
    return `Last: ${entry.summary}`;
  }

  const weights = performance.recentHistory
    .map((item) => item.topWeight)
    .filter((weight): weight is number => weight != null);

  const weightRange =
    weights.length > 1
      ? `${Math.min(...weights)}–${Math.max(...weights)} lbs`
      : weights[0] != null
        ? `${weights[0]} lbs`
        : entry.summary;

  return `Last: ${entry.summary} · Range: ${weightRange}`;
}
