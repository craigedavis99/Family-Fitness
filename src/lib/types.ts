export type UserRole = "admin" | "member";

export type MetricDirection = "higher_is_better" | "lower_is_better" | "neutral";
export type MetricCategory = "body" | "speed" | "jump" | "strength";

export type Profile = {
  id: string;
  display_name: string;
  role: UserRole;
  birthdate: string | null;
  must_change_password: boolean;
  is_active: boolean;
  created_at: string;
};

export type MetricType = {
  id: number;
  name: string;
  unit: string;
  direction: MetricDirection;
  category: MetricCategory;
  sort_order: number | null;
  is_active: boolean;
};

export type MetricEntry = {
  id: number;
  user_id: string;
  metric_type_id: number;
  value: number;
  recorded_on: string;
  notes: string | null;
  created_at: string;
};

export type MetricCardSummary = {
  metricType: MetricType;
  displayValue: number | null;
  displayDate: string | null;
  personalBest: number | null;
  personalBestDate: string | null;
  previousValue: number | null;
  trend: "up" | "down" | "flat" | null;
  isNewPr: boolean;
};

export type LastWorkoutSummary = {
  sessionDate: string;
  label: string;
  daysSince: number;
} | null;

export type SessionSet = {
  id: number;
  session_id: number;
  exercise_id: number;
  set_number: number;
  weight: number | null;
  reps: number | null;
  notes: string | null;
  exercise?: Exercise;
};

export type WorkoutSession = {
  id: number;
  user_id: string;
  session_date: string;
  plan_day_id: number | null;
  label: string | null;
  notes: string | null;
  created_at: string;
};

export type WorkoutSessionWithSets = WorkoutSession & {
  sets: SessionSet[];
};

export type PlanDayLogOption = {
  planDayId: number;
  planName: string;
  dayLabel: string;
  displayLabel: string;
  exercises: PlanExercise[];
};

export type ExerciseHistoryEntry = {
  sessionDate: string;
  summary: string;
  topWeight: number | null;
  topReps: number | null;
};

export type ExercisePerformance = {
  lastSessionDate: string | null;
  lastSummary: string | null;
  heaviestWeight: number | null;
  heaviestReps: number | null;
  heaviestDate: string | null;
  recentHistory: ExerciseHistoryEntry[];
};

export type LoggedSetInput = {
  setNumber: number;
  weight: number | null;
  reps: number | null;
};

export type LoggedExerciseInput = {
  exerciseId: number;
  notes?: string | null;
  sets: LoggedSetInput[];
};

export type MuscleGroup =
  | "Chest"
  | "Back"
  | "Shoulders"
  | "Biceps"
  | "Triceps"
  | "Quads"
  | "Hamstrings"
  | "Glutes"
  | "Calves"
  | "Core"
  | "Plyometric"
  | "Sprint/Conditioning";

export type Exercise = {
  id: number;
  name: string;
  muscle_group: string;
  secondary_muscles: string[] | null;
  equipment: string | null;
  created_by: string | null;
  is_active: boolean;
};

export type WorkoutPlan = {
  id: number;
  user_id: string;
  name: string;
  is_active: boolean;
  created_at: string;
};

export type PlanDay = {
  id: number;
  plan_id: number;
  day_label: string;
  day_order: number;
};

export type PlanExercise = {
  id: number;
  plan_day_id: number;
  exercise_id: number;
  target_sets: number | null;
  target_reps: string | null;
  target_weight: number | null;
  sort_order: number | null;
  exercise?: Exercise;
};

export type PlanDayWithExercises = PlanDay & {
  exercises: PlanExercise[];
};

export type WorkoutPlanWithDetails = WorkoutPlan & {
  days: PlanDayWithExercises[];
};

export type CoverageStatus = "missing" | "low" | "ok";

export type MuscleCoverageRow = {
  muscleGroup: string;
  totalSets: number;
  status: CoverageStatus;
};

export type PlanCoverageReport = {
  rows: MuscleCoverageRow[];
  pushSets: number;
  pullSets: number;
  hasPlyometric: boolean;
  hasSprintWork: boolean;
  notes: string[];
};

export const MUSCLE_GROUPS: MuscleGroup[] = [
  "Chest",
  "Back",
  "Shoulders",
  "Biceps",
  "Triceps",
  "Quads",
  "Hamstrings",
  "Glutes",
  "Calves",
  "Core",
  "Plyometric",
  "Sprint/Conditioning",
];

export const EQUIPMENT_OPTIONS = [
  "Barbell",
  "Dumbbell",
  "Bodyweight",
  "Machine",
  "Trap Bar",
  "None",
] as const;

export type NavItem = {
  href: string;
  label: string;
  adminOnly?: boolean;
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/home", label: "Home" },
  { href: "/plan", label: "Plan" },
  { href: "/log", label: "Log" },
  { href: "/admin", label: "Admin", adminOnly: true },
];

export const PUBLIC_ROUTES = ["/login", "/change-password"];
export const AUTH_ROUTES = ["/login", "/change-password"];
