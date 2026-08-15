"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/card";
import { createExercise } from "@/app/actions/plans";
import { groupExercisesByMuscle } from "@/lib/plan";
import { EQUIPMENT_OPTIONS, MUSCLE_GROUPS, type Exercise } from "@/lib/types";

type LogExercisePickerProps = {
  exercises: Exercise[];
  disabled?: boolean;
  excludeIds?: number[];
  onSelect: (exerciseId: number) => void;
  compact?: boolean;
};

const selectClassName =
  "select-field flex h-12 w-full rounded-xl border border-input bg-card/90 px-3.5 py-2 text-base shadow-sm disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm";

export function LogExercisePicker({
  exercises,
  disabled,
  excludeIds = [],
  onSelect,
  compact = false,
}: LogExercisePickerProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [exerciseId, setExerciseId] = useState("");
  const [showNewForm, setShowNewForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newMuscleGroup, setNewMuscleGroup] = useState<string>(MUSCLE_GROUPS[0]);
  const [newEquipment, setNewEquipment] = useState<string>("Barbell");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const grouped = useMemo(() => groupExercisesByMuscle(exercises), [exercises]);
  const excluded = useMemo(() => new Set(excludeIds), [excludeIds]);

  const filteredGroups = useMemo(() => {
    const query = search.trim().toLowerCase();
    const result: { group: string; items: Exercise[] }[] = [];

    for (const group of MUSCLE_GROUPS) {
      const items = (grouped.get(group) ?? []).filter((exercise) => {
        if (excluded.has(exercise.id)) {
          return false;
        }
        return (
          !query ||
          exercise.name.toLowerCase().includes(query) ||
          group.toLowerCase().includes(query)
        );
      });
      if (items.length > 0) {
        result.push({ group, items });
      }
    }

    return result;
  }, [grouped, excluded, search]);

  const availableCount = filteredGroups.reduce((total, group) => total + group.items.length, 0);

  function handleAdd() {
    if (!exerciseId) {
      setError("Choose an exercise.");
      return;
    }

    setError(null);
    onSelect(Number(exerciseId));
    setExerciseId("");
    setSearch("");
  }

  function handleCreateExercise() {
    setError(null);
    startTransition(async () => {
      const result = await createExercise({
        name: newName,
        muscleGroup: newMuscleGroup,
        equipment: newEquipment,
      });

      if (result.error) {
        setError(result.error);
        return;
      }

      setShowNewForm(false);
      setNewName("");
      router.refresh();

      if (result.exercise) {
        onSelect(result.exercise.id);
      }
    });
  }

  return (
    <div
      className={
        compact
          ? "space-y-3 rounded-xl border border-border/80 bg-muted/30 p-4"
          : "space-y-4 rounded-xl border border-primary/20 bg-primary/[0.04] p-4 sm:p-5"
      }
    >
      {!compact ? (
        <div>
          <p className="font-display text-base font-semibold tracking-tight">Add exercise</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Pick from the catalog or add a missing exercise to today&apos;s session.
          </p>
        </div>
      ) : (
        <p className="font-display text-sm font-semibold tracking-tight">Add another exercise</p>
      )}

      <div className="space-y-2">
        <Label htmlFor="logExerciseSearch">Search</Label>
        <Input
          id="logExerciseSearch"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or muscle group"
          disabled={disabled || isPending}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="logExerciseId">Exercise</Label>
        <select
          id="logExerciseId"
          className={selectClassName}
          value={exerciseId}
          onChange={(e) => setExerciseId(e.target.value)}
          disabled={disabled || isPending || availableCount === 0}
        >
          <option value="">
            {availableCount === 0 ? "No matching exercises" : "Select exercise"}
          </option>
          {filteredGroups.map(({ group, items }) => (
            <optgroup key={group} label={group}>
              {items.map((exercise) => (
                <option key={exercise.id} value={exercise.id}>
                  {exercise.name}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <p className="text-xs text-muted-foreground">
          {availableCount} exercise{availableCount === 1 ? "" : "s"} available
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          onClick={handleAdd}
          disabled={disabled || isPending || !exerciseId}
          className="gap-1.5"
        >
          <Plus className="h-4 w-4" />
          Add to workout
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => setShowNewForm((value) => !value)}
          disabled={disabled || isPending}
        >
          {showNewForm ? "Cancel" : "New exercise"}
        </Button>
      </div>

      {showNewForm ? (
        <div className="space-y-3 rounded-xl border border-dashed border-border bg-card/80 p-4">
          <p className="text-sm font-medium">Add to family catalog</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="logNewExerciseName">Name</Label>
              <Input
                id="logNewExerciseName"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                disabled={isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="logNewMuscleGroup">Muscle group</Label>
              <select
                id="logNewMuscleGroup"
                className={selectClassName}
                value={newMuscleGroup}
                onChange={(e) => setNewMuscleGroup(e.target.value)}
                disabled={isPending}
              >
                {MUSCLE_GROUPS.map((group) => (
                  <option key={group} value={group}>
                    {group}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="logNewEquipment">Equipment</Label>
              <select
                id="logNewEquipment"
                className={selectClassName}
                value={newEquipment}
                onChange={(e) => setNewEquipment(e.target.value)}
                disabled={isPending}
              >
                {EQUIPMENT_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <Button
            type="button"
            onClick={handleCreateExercise}
            disabled={isPending || !newName.trim()}
          >
            {isPending ? "Saving..." : "Save & add to workout"}
          </Button>
        </div>
      ) : null}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
