"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/card";
import { groupExercisesByMuscle } from "@/lib/plan";
import { MUSCLE_GROUPS, type Exercise } from "@/lib/types";

type LogExercisePickerProps = {
  exercises: Exercise[];
  disabled?: boolean;
  excludeIds?: number[];
  onSelect: (exerciseId: number) => void;
};

export function LogExercisePicker({
  exercises,
  disabled,
  excludeIds = [],
  onSelect,
}: LogExercisePickerProps) {
  const [search, setSearch] = useState("");
  const [exerciseId, setExerciseId] = useState("");

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

  function handleAdd() {
    if (!exerciseId) {
      return;
    }
    onSelect(Number(exerciseId));
    setExerciseId("");
    setSearch("");
  }

  return (
    <div className="space-y-3 rounded-lg border border-dashed border-border p-4">
      <div className="space-y-2">
        <Label htmlFor="logExerciseSearch">Search exercises</Label>
        <Input
          id="logExerciseSearch"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or muscle group"
          disabled={disabled}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="logExerciseId">Exercise</Label>
        <select
          id="logExerciseId"
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
      <Button type="button" size="sm" onClick={handleAdd} disabled={disabled || !exerciseId}>
        Add exercise
      </Button>
    </div>
  );
}
