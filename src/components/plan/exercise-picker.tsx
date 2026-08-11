"use client";

import { useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/card";
import { createExercise } from "@/app/actions/plans";
import { groupExercisesByMuscle } from "@/lib/plan";
import { EQUIPMENT_OPTIONS, MUSCLE_GROUPS, type Exercise } from "@/lib/types";

type ExercisePickerProps = {
  exercises: Exercise[];
  disabled?: boolean;
  dayLabel?: string;
  onSelect: (exerciseId: number, targetSets: number | null, targetReps: string) => void;
};

export function ExercisePicker({ exercises, disabled, dayLabel, onSelect }: ExercisePickerProps) {
  const [search, setSearch] = useState("");
  const [exerciseId, setExerciseId] = useState("");
  const [targetSets, setTargetSets] = useState("3");
  const [targetReps, setTargetReps] = useState("8-12");
  const [showNewForm, setShowNewForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newMuscleGroup, setNewMuscleGroup] = useState<string>(MUSCLE_GROUPS[0]);
  const [newEquipment, setNewEquipment] = useState<string>("Barbell");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const grouped = useMemo(() => groupExercisesByMuscle(exercises), [exercises]);

  const filteredGroups = useMemo(() => {
    const query = search.trim().toLowerCase();
    const result: { group: string; items: Exercise[] }[] = [];

    for (const group of MUSCLE_GROUPS) {
      const items = (grouped.get(group) ?? []).filter(
        (exercise) =>
          !query ||
          exercise.name.toLowerCase().includes(query) ||
          group.toLowerCase().includes(query)
      );
      if (items.length > 0) {
        result.push({ group, items });
      }
    }

    return result;
  }, [grouped, search]);

  function handleAdd() {
    if (!exerciseId) {
      setError("Choose an exercise.");
      return;
    }

    setError(null);
    onSelect(
      Number(exerciseId),
      targetSets ? Number(targetSets) : null,
      targetReps
    );
    setExerciseId("");
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
      window.location.reload();
    });
  }

  return (
    <div className="space-y-4 rounded-lg border border-primary/20 bg-primary/5 p-4">
      {dayLabel ? (
        <p className="text-sm font-medium">
          Adding to <span className="text-primary">{dayLabel}</span>
        </p>
      ) : null}
      <div className="space-y-2">
        <Label htmlFor="exerciseSearch">Search exercises</Label>
        <Input
          id="exerciseSearch"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or muscle group"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="exerciseId">Exercise</Label>
        <select
          id="exerciseId"
          className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
          value={exerciseId}
          onChange={(e) => setExerciseId(e.target.value)}
          disabled={disabled}
        >
          <option value="">Select exercise</option>
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
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="targetSets">Target sets</Label>
          <Input
            id="targetSets"
            type="number"
            min={0}
            value={targetSets}
            onChange={(e) => setTargetSets(e.target.value)}
            disabled={disabled}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="targetReps">Target reps</Label>
          <Input
            id="targetReps"
            value={targetReps}
            onChange={(e) => setTargetReps(e.target.value)}
            placeholder="8-12, AMRAP, 3x30yd"
            disabled={disabled}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={handleAdd} disabled={disabled || !exerciseId}>
          Add exercise
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => setShowNewForm((value) => !value)}
          disabled={disabled}
        >
          {showNewForm ? "Cancel new exercise" : "Add new exercise"}
        </Button>
      </div>

      {showNewForm ? (
        <div className="space-y-3 rounded-lg border border-dashed border-border bg-background p-4">
          <p className="text-sm font-medium">Add to family catalog</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="newExerciseName">Name</Label>
              <Input
                id="newExerciseName"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newMuscleGroup">Muscle group</Label>
              <select
                id="newMuscleGroup"
                className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                value={newMuscleGroup}
                onChange={(e) => setNewMuscleGroup(e.target.value)}
              >
                {MUSCLE_GROUPS.map((group) => (
                  <option key={group} value={group}>
                    {group}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="newEquipment">Equipment</Label>
              <select
                id="newEquipment"
                className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                value={newEquipment}
                onChange={(e) => setNewEquipment(e.target.value)}
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
            {isPending ? "Saving..." : "Save exercise"}
          </Button>
        </div>
      ) : null}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
