import { NextResponse } from "next/server";
import { requireAdminProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { buildCsv } from "@/lib/export-csv";

type ExportKind = "metrics" | "workouts" | "all";

function parseUserId(value: string | null) {
  if (!value || value === "all") {
    return null;
  }
  return value;
}

export async function GET(request: Request) {
  const authResult = await requireAdminProfile();
  if ("error" in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json({ error: "Database not configured." }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const kind = (searchParams.get("kind") ?? "all") as ExportKind;
  const userId = parseUserId(searchParams.get("userId"));

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, display_name")
    .order("display_name");

  const profileNames = new Map((profiles ?? []).map((profile) => [profile.id, profile.display_name]));

  const sections: string[] = [];
  const stamp = new Date().toISOString().slice(0, 10);

  if (kind === "metrics" || kind === "all") {
    let query = supabase
      .from("metric_entries")
      .select("*, metric_types(name, unit)")
      .order("recorded_on", { ascending: false });

    if (userId) {
      query = query.eq("user_id", userId);
    }

    const { data: entries, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const rows = (entries ?? []).map((entry) => {
      const metricType = entry.metric_types as { name: string; unit: string } | null;
      return [
        profileNames.get(entry.user_id) ?? entry.user_id,
        metricType?.name ?? "",
        metricType?.unit ?? "",
        entry.value,
        entry.recorded_on,
        entry.notes,
      ];
    });

    sections.push(
      buildCsv(
        ["User", "Metric", "Unit", "Value", "Recorded On", "Notes"],
        rows
      )
    );
  }

  if (kind === "workouts" || kind === "all") {
    let sessionQuery = supabase
      .from("workout_sessions")
      .select("id, user_id, session_date, label, plan_days(day_label)")
      .order("session_date", { ascending: false });

    if (userId) {
      sessionQuery = sessionQuery.eq("user_id", userId);
    }

    const { data: sessions, error: sessionsError } = await sessionQuery;
    if (sessionsError) {
      return NextResponse.json({ error: sessionsError.message }, { status: 500 });
    }

    const sessionIds = (sessions ?? []).map((session) => session.id);
    let sets: {
      session_id: number;
      set_number: number;
      weight: number | null;
      reps: number | null;
      notes: string | null;
      exercise_id: number;
      exercises: { name: string } | { name: string }[] | null;
    }[] = [];

    if (sessionIds.length > 0) {
      const { data: setRows, error: setsError } = await supabase
        .from("session_sets")
        .select("session_id, set_number, weight, reps, notes, exercise_id, exercises(name)")
        .in("session_id", sessionIds)
        .order("set_number", { ascending: true });

      if (setsError) {
        return NextResponse.json({ error: setsError.message }, { status: 500 });
      }

      sets = (setRows ?? []) as typeof sets;
    }

    const sessionMap = new Map(
      (sessions ?? []).map((session) => {
        const planDayRaw = session.plan_days as { day_label: string } | { day_label: string }[] | null;
        const planDay = Array.isArray(planDayRaw) ? planDayRaw[0] : planDayRaw;
        const label = session.label ?? planDay?.day_label ?? "Workout";
        return [session.id, { ...session, label }];
      })
    );

    const rows = sets.map((set) => {
      const session = sessionMap.get(set.session_id);
      const exerciseRaw = set.exercises as { name: string } | { name: string }[] | null;
      const exercise = Array.isArray(exerciseRaw) ? exerciseRaw[0] : exerciseRaw;
      return [
        session ? profileNames.get(session.user_id) ?? session.user_id : "",
        session?.session_date ?? "",
        session?.label ?? "",
        exercise?.name ?? "",
        set.set_number,
        set.weight,
        set.reps,
        set.notes,
      ];
    });

    const workoutCsv = buildCsv(
      ["User", "Session Date", "Workout", "Exercise", "Set", "Weight", "Reps", "Notes"],
      rows
    );

    if (kind === "all") {
      sections.push("", "WORKOUT SETS", workoutCsv);
    } else {
      sections.push(workoutCsv);
    }
  }

  const userSuffix = userId ? `-${userId.slice(0, 8)}` : "-all-users";
  const filename = `family-fitness-${kind}${userSuffix}-${stamp}.csv`;
  const body = sections.join("\r\n\r\n");

  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
