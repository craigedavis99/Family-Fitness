import type { MuscleCoverageRow, PlanCoverageReport, WorkoutPlanWithDetails } from "@/lib/types";
import { MUSCLE_GROUPS } from "@/lib/types";

const MAJOR_GROUPS = new Set([
  "Chest",
  "Back",
  "Shoulders",
  "Quads",
  "Hamstrings",
]);

const PUSH_GROUPS = new Set(["Chest", "Shoulders", "Triceps"]);
const PULL_GROUPS = new Set(["Back", "Biceps"]);

export function evaluatePlanCoverage(plan: WorkoutPlanWithDetails): PlanCoverageReport {
  const setsByGroup = new Map<string, number>();

  for (const group of MUSCLE_GROUPS) {
    setsByGroup.set(group, 0);
  }

  for (const day of plan.days) {
    for (const item of day.exercises) {
      const group = item.exercise?.muscle_group;
      if (!group) {
        continue;
      }
      const sets = item.target_sets ?? 0;
      setsByGroup.set(group, (setsByGroup.get(group) ?? 0) + sets);
    }
  }

  const rows: MuscleCoverageRow[] = MUSCLE_GROUPS.map((muscleGroup) => {
    const totalSets = setsByGroup.get(muscleGroup) ?? 0;
    let status: MuscleCoverageRow["status"] = "ok";

    if (totalSets === 0) {
      status = "missing";
    } else if (MAJOR_GROUPS.has(muscleGroup) && totalSets < 6) {
      status = "low";
    }

    return { muscleGroup, totalSets, status };
  });

  const pushSets = [...PUSH_GROUPS].reduce(
    (sum, group) => sum + (setsByGroup.get(group) ?? 0),
    0
  );
  const pullSets = [...PULL_GROUPS].reduce(
    (sum, group) => sum + (setsByGroup.get(group) ?? 0),
    0
  );

  const hasPlyometric = (setsByGroup.get("Plyometric") ?? 0) > 0;
  const hasSprintWork = (setsByGroup.get("Sprint/Conditioning") ?? 0) > 0;

  const notes: string[] = [];

  if (pushSets === 0 && pullSets === 0) {
    notes.push("No push or pull work detected yet.");
  } else if (pushSets === 0) {
    notes.push("No push volume — add chest, shoulder, or triceps work.");
  } else if (pullSets === 0) {
    notes.push("No pull volume — add back or biceps work.");
  } else {
    const ratio = pushSets / pullSets;
    if (ratio > 1.5) {
      notes.push(`Push-heavy plan (${pushSets} push sets vs ${pullSets} pull sets).`);
    } else if (ratio < 0.67) {
      notes.push(`Pull-heavy plan (${pullSets} pull sets vs ${pushSets} push sets).`);
    } else {
      notes.push(`Push/pull balance looks reasonable (${pushSets} push / ${pullSets} pull sets).`);
    }
  }

  if (!hasPlyometric && !hasSprintWork) {
    notes.push("No plyometric or sprint/conditioning work in this cycle.");
  } else {
    if (hasPlyometric) {
      notes.push("Plyometric work is included.");
    }
    if (hasSprintWork) {
      notes.push("Sprint/conditioning work is included.");
    }
  }

  return {
    rows,
    pushSets,
    pullSets,
    hasPlyometric,
    hasSprintWork,
    notes,
  };
}

export function groupExercisesByMuscle<T extends { muscle_group: string; name: string }>(
  exercises: T[]
) {
  const grouped = new Map<string, T[]>();

  for (const group of MUSCLE_GROUPS) {
    grouped.set(group, []);
  }

  for (const exercise of exercises) {
    const list = grouped.get(exercise.muscle_group) ?? [];
    list.push(exercise);
    grouped.set(exercise.muscle_group, list);
  }

  for (const [group, list] of grouped) {
    list.sort((a, b) => a.name.localeCompare(b.name));
    grouped.set(group, list);
  }

  return grouped;
}

export type PlanKind = "cycle" | "daily";

export function inferPlanKind(plan: WorkoutPlanWithDetails): PlanKind {
  if (
    plan.days.length === 1 &&
    plan.days[0].day_label.trim().toLowerCase() === plan.name.trim().toLowerCase()
  ) {
    return "daily";
  }
  return "cycle";
}

export function countPlanExercises(plan: WorkoutPlanWithDetails) {
  return plan.days.reduce((total, day) => total + day.exercises.length, 0);
}
