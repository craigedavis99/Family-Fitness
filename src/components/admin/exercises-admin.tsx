"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  bulkCreateExercises,
  createExerciseAdmin,
  setExerciseActive,
  updateExerciseAdmin,
} from "@/app/actions/exercises";
import { groupExercisesByMuscle } from "@/lib/plan";
import { EQUIPMENT_OPTIONS, MUSCLE_GROUPS, type Exercise } from "@/lib/types";

type ExercisesAdminProps = {
  initialExercises: Exercise[];
};

const BULK_PLACEHOLDER = `Barbell Bench Press, Chest, Barbell
Pull-Up, Back, Bodyweight
Farmer Carry, Core, Dumbbell`;

function Chevron({ expanded }: { expanded: boolean }) {
  return (
    <span className="inline-block w-4 text-muted-foreground" aria-hidden>
      {expanded ? "▼" : "▶"}
    </span>
  );
}

export function ExercisesAdmin({ initialExercises }: ExercisesAdminProps) {
  const [exercises] = useState(initialExercises);
  const [search, setSearch] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [defaultMuscleGroup, setDefaultMuscleGroup] = useState<string>(MUSCLE_GROUPS[0]);
  const [defaultEquipment, setDefaultEquipment] = useState<string>("Barbell");
  const [singleName, setSingleName] = useState("");
  const [singleMuscleGroup, setSingleMuscleGroup] = useState<string>(MUSCLE_GROUPS[0]);
  const [singleEquipment, setSingleEquipment] = useState<string>("Barbell");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editMuscleGroup, setEditMuscleGroup] = useState<string>(MUSCLE_GROUPS[0]);
  const [editEquipment, setEditEquipment] = useState<string>("Barbell");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();

  const filteredExercises = useMemo(() => {
    const query = search.trim().toLowerCase();
    return exercises.filter((exercise) => {
      if (!showInactive && !exercise.is_active) {
        return false;
      }
      if (!query) {
        return true;
      }
      return (
        exercise.name.toLowerCase().includes(query) ||
        exercise.muscle_group.toLowerCase().includes(query) ||
        (exercise.equipment ?? "").toLowerCase().includes(query)
      );
    });
  }, [exercises, search, showInactive]);

  const grouped = useMemo(() => groupExercisesByMuscle(filteredExercises), [filteredExercises]);

  const visibleGroups = useMemo(
    () => MUSCLE_GROUPS.filter((group) => (grouped.get(group)?.length ?? 0) > 0),
    [grouped]
  );

  useEffect(() => {
    if (search.trim()) {
      setExpandedGroups(new Set(visibleGroups));
    }
  }, [search, visibleGroups]);

  function toggleGroup(group: string) {
    setExpandedGroups((current) => {
      const next = new Set(current);
      if (next.has(group)) {
        next.delete(group);
      } else {
        next.add(group);
      }
      return next;
    });
  }

  function expandAllGroups() {
    setExpandedGroups(new Set(visibleGroups));
  }

  function collapseAllGroups() {
    setExpandedGroups(new Set());
  }

  const activeCount = exercises.filter((exercise) => exercise.is_active).length;

  function beginEdit(exercise: Exercise) {
    setEditingId(exercise.id);
    setEditName(exercise.name);
    setEditMuscleGroup(exercise.muscle_group);
    setEditEquipment(exercise.equipment ?? "None");
  }

  function runAction(action: () => Promise<{ error?: string; success?: boolean }>) {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await action();
      if (result.error) {
        setError(result.error);
        return;
      }
      window.location.reload();
    });
  }

  function handleBulkAdd() {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await bulkCreateExercises({
        text: bulkText,
        defaultMuscleGroup,
        defaultEquipment,
      });

      if (result.error && !result.added) {
        setError(result.error);
        if (result.parseErrors?.length) {
          setError([result.error, ...result.parseErrors].join(" "));
        }
        return;
      }

      const parts = [`Added ${result.added} exercise${result.added === 1 ? "" : "s"}.`];
      if (result.skipped) {
        parts.push(`${result.skipped} skipped (already in catalog).`);
      }
      if (result.parseErrors?.length) {
        parts.push(result.parseErrors.join(" "));
      }

      setMessage(parts.join(" "));
      setBulkText("");
      window.location.reload();
    });
  }

  function handleSingleAdd(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    runAction(() =>
      createExerciseAdmin({
        name: singleName,
        muscleGroup: singleMuscleGroup,
        equipment: singleEquipment,
      })
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Bulk add exercises</CardTitle>
          <CardDescription>
            Paste many at once — one per line. Use commas for muscle group and equipment, or
            leave them off and use the defaults below.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="bulkExercises">Exercise list</Label>
            <textarea
              id="bulkExercises"
              className="min-h-40 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              placeholder={BULK_PLACEHOLDER}
              disabled={isPending}
            />
            <p className="text-xs text-muted-foreground">
              Format: <span className="font-medium">Name, Muscle group, Equipment</span>. Lines
              starting with # are ignored.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="defaultMuscleGroup">Default muscle group</Label>
              <select
                id="defaultMuscleGroup"
                className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                value={defaultMuscleGroup}
                onChange={(e) => setDefaultMuscleGroup(e.target.value)}
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
              <Label htmlFor="defaultEquipment">Default equipment</Label>
              <select
                id="defaultEquipment"
                className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                value={defaultEquipment}
                onChange={(e) => setDefaultEquipment(e.target.value)}
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

          <Button type="button" onClick={handleBulkAdd} disabled={isPending || !bulkText.trim()}>
            {isPending ? "Adding..." : "Add all exercises"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Add one exercise</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSingleAdd} className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="singleName">Name</Label>
              <Input
                id="singleName"
                value={singleName}
                onChange={(e) => setSingleName(e.target.value)}
                disabled={isPending}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="singleMuscleGroup">Muscle group</Label>
              <select
                id="singleMuscleGroup"
                className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                value={singleMuscleGroup}
                onChange={(e) => setSingleMuscleGroup(e.target.value)}
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
              <Label htmlFor="singleEquipment">Equipment</Label>
              <select
                id="singleEquipment"
                className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                value={singleEquipment}
                onChange={(e) => setSingleEquipment(e.target.value)}
                disabled={isPending}
              >
                {EQUIPMENT_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={isPending || !singleName.trim()}>
                {isPending ? "Saving..." : "Add exercise"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Exercise catalog</CardTitle>
          <CardDescription>
            {activeCount} active exercise{activeCount === 1 ? "" : "s"} in the family catalog.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex-1 space-y-2">
                <Label htmlFor="exerciseSearch">Search</Label>
                <Input
                  id="exerciseSearch"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name, muscle group, or equipment"
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={showInactive}
                  onChange={(e) => setShowInactive(e.target.checked)}
                />
                Show inactive
              </label>
            </div>
            <div className="flex gap-2">
              <Button type="button" size="sm" variant="outline" onClick={expandAllGroups}>
                Expand all
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={collapseAllGroups}>
                Collapse all
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            {visibleGroups.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
                No exercises match your search.
              </p>
            ) : null}

            {visibleGroups.map((group) => {
              const items = grouped.get(group) ?? [];
              const isExpanded = expandedGroups.has(group);

              return (
                <div key={group} className="rounded-lg border border-border">
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                    onClick={() => toggleGroup(group)}
                    aria-expanded={isExpanded}
                  >
                    <span className="flex items-center gap-2 text-sm font-semibold">
                      <Chevron expanded={isExpanded} />
                      {group}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {items.length} exercise{items.length === 1 ? "" : "s"}
                    </span>
                  </button>

                  {isExpanded ? (
                    <div className="space-y-2 border-t border-border px-4 py-3">
                      {items.map((exercise) => (
                      <div
                        key={exercise.id}
                        className="rounded-lg border border-border p-3"
                      >
                        {editingId === exercise.id ? (
                          <div className="space-y-3">
                            <div className="grid gap-3 sm:grid-cols-2">
                              <div className="space-y-2 sm:col-span-2">
                                <Label>Name</Label>
                                <Input
                                  value={editName}
                                  onChange={(e) => setEditName(e.target.value)}
                                  disabled={isPending}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Muscle group</Label>
                                <select
                                  className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                                  value={editMuscleGroup}
                                  onChange={(e) => setEditMuscleGroup(e.target.value)}
                                  disabled={isPending}
                                >
                                  {MUSCLE_GROUPS.map((option) => (
                                    <option key={option} value={option}>
                                      {option}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div className="space-y-2">
                                <Label>Equipment</Label>
                                <select
                                  className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                                  value={editEquipment}
                                  onChange={(e) => setEditEquipment(e.target.value)}
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
                            <div className="flex flex-wrap gap-2">
                              <Button
                                type="button"
                                size="sm"
                                disabled={isPending || !editName.trim()}
                                onClick={() =>
                                  runAction(() =>
                                    updateExerciseAdmin({
                                      exerciseId: exercise.id,
                                      name: editName,
                                      muscleGroup: editMuscleGroup,
                                      equipment: editEquipment,
                                    })
                                  )
                                }
                              >
                                Save
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={isPending}
                                onClick={() => setEditingId(null)}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <p className="font-medium">
                                {exercise.name}
                                {!exercise.is_active ? (
                                  <span className="ml-2 text-xs text-muted-foreground">
                                    (inactive)
                                  </span>
                                ) : null}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {exercise.equipment ?? "No equipment listed"}
                              </p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={isPending}
                                onClick={() => beginEdit(exercise)}
                              >
                                Edit
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant={exercise.is_active ? "destructive" : "secondary"}
                                disabled={isPending}
                                onClick={() =>
                                  runAction(() =>
                                    setExerciseActive(exercise.id, !exercise.is_active)
                                  )
                                }
                              >
                                {exercise.is_active ? "Deactivate" : "Reactivate"}
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {message ? <p className="text-sm text-green-700">{message}</p> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
