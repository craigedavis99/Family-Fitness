import { createClient } from "@/lib/supabase/server";
import { getActiveExercises, getUserPlans } from "@/lib/plan-server";
import { buildHistoryEntry } from "@/lib/workout";
import type {
  Exercise,
  ExercisePerformance,
  PlanDayLogOption,
  SessionSet,
  WorkoutSessionWithSets,
} from "@/lib/types";

export async function getPlanDayLogOptions(userId: string): Promise<PlanDayLogOption[]> {
  const plans = await getUserPlans(userId);
  const options: PlanDayLogOption[] = [];

  for (const plan of plans) {
    for (const day of plan.days) {
      options.push({
        planDayId: day.id,
        planName: plan.name,
        dayLabel: day.day_label,
        displayLabel: `${plan.name} · ${day.day_label}`,
        exercises: day.exercises,
      });
    }
  }

  return options;
}

export async function getUserWorkoutSessions(
  userId: string,
  limit = 30
): Promise<WorkoutSessionWithSets[]> {
  const supabase = await createClient();
  if (!supabase) {
    return [];
  }

  const { data: sessions, error: sessionsError } = await supabase
    .from("workout_sessions")
    .select("*")
    .eq("user_id", userId)
    .order("session_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (sessionsError) {
    throw new Error(sessionsError.message);
  }

  if (!sessions?.length) {
    return [];
  }

  const sessionIds = sessions.map((session) => session.id);

  const { data: sets, error: setsError } = await supabase
    .from("session_sets")
    .select("*, exercise:exercises(*)")
    .in("session_id", sessionIds)
    .order("set_number", { ascending: true });

  if (setsError) {
    throw new Error(setsError.message);
  }

  const setsBySession = new Map<number, SessionSet[]>();
  for (const row of sets ?? []) {
    const list = setsBySession.get(row.session_id) ?? [];
    list.push({
      ...row,
      exercise: row.exercise as Exercise,
    });
    setsBySession.set(row.session_id, list);
  }

  return sessions.map((session) => ({
    ...session,
    sets: setsBySession.get(session.id) ?? [],
  }));
}

export async function getWorkoutSessionById(
  userId: string,
  sessionId: number
): Promise<WorkoutSessionWithSets | null> {
  const supabase = await createClient();
  if (!supabase) {
    return null;
  }

  const { data: session, error: sessionError } = await supabase
    .from("workout_sessions")
    .select("*")
    .eq("id", sessionId)
    .eq("user_id", userId)
    .maybeSingle();

  if (sessionError) {
    throw new Error(sessionError.message);
  }

  if (!session) {
    return null;
  }

  const { data: sets, error: setsError } = await supabase
    .from("session_sets")
    .select("*, exercise:exercises(*)")
    .eq("session_id", sessionId)
    .order("set_number", { ascending: true });

  if (setsError) {
    throw new Error(setsError.message);
  }

  return {
    ...session,
    sets: (sets ?? []).map((row) => ({
      ...row,
      exercise: row.exercise as Exercise,
    })),
  };
}

export async function getExercisePerformanceMap(
  userId: string,
  excludeSessionId?: number
): Promise<Map<number, ExercisePerformance>> {
  const sessions = await getUserWorkoutSessions(userId, 100);
  const map = new Map<number, ExercisePerformance>();
  const lastHandled = new Set<number>();

  for (const session of sessions) {
    if (excludeSessionId != null && session.id === excludeSessionId) {
      continue;
    }

    const setsByExercise = new Map<number, SessionSet[]>();
    for (const set of session.sets) {
      const list = setsByExercise.get(set.exercise_id) ?? [];
      list.push(set);
      setsByExercise.set(set.exercise_id, list);
    }

    for (const [exerciseId, sets] of setsByExercise) {
      const current = map.get(exerciseId) ?? {
        lastSessionDate: null,
        lastSummary: null,
        heaviestWeight: null,
        heaviestReps: null,
        heaviestDate: null,
        recentHistory: [],
      };

      const historyEntry = buildHistoryEntry(session.session_date, sets);

      if (historyEntry && current.recentHistory.length < 3) {
        current.recentHistory.push(historyEntry);
      }

      if (!lastHandled.has(exerciseId) && historyEntry) {
        current.lastSessionDate = session.session_date;
        current.lastSummary = historyEntry.summary;
        lastHandled.add(exerciseId);
      }

      for (const set of sets) {
        const weight = set.weight != null ? Number(set.weight) : null;
        const reps = set.reps != null ? Number(set.reps) : null;

        if (weight == null) {
          continue;
        }

        const beatsHeaviest =
          current.heaviestWeight == null ||
          weight > current.heaviestWeight ||
          (weight === current.heaviestWeight && (reps ?? 0) > (current.heaviestReps ?? 0));

        if (beatsHeaviest) {
          current.heaviestWeight = weight;
          current.heaviestReps = reps;
          current.heaviestDate = session.session_date;
        }
      }

      map.set(exerciseId, current);
    }
  }

  return map;
}

export async function loadLogPageData(userId: string) {
  const [planDayOptions, exercises, sessions, performanceMap] = await Promise.all([
    getPlanDayLogOptions(userId),
    getActiveExercises(),
    getUserWorkoutSessions(userId),
    getExercisePerformanceMap(userId),
  ]);

  return {
    planDayOptions,
    exercises,
    sessions,
    performanceMap: Object.fromEntries(performanceMap),
  };
}
