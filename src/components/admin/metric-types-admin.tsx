"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  createMetricType,
  setMetricTypeActive,
  updateMetricType,
} from "@/app/actions/admin";
import type { MetricCategory, MetricDirection, MetricType } from "@/lib/types";

type MetricTypesAdminProps = {
  initialMetricTypes: MetricType[];
};

const DIRECTIONS: MetricDirection[] = ["higher_is_better", "lower_is_better", "neutral"];
const CATEGORIES: MetricCategory[] = ["body", "speed", "jump", "strength"];

export function MetricTypesAdmin({ initialMetricTypes }: MetricTypesAdminProps) {
  const [metricTypes] = useState(initialMetricTypes);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("");
  const [direction, setDirection] = useState<MetricDirection>("higher_is_better");
  const [category, setCategory] = useState<MetricCategory>("strength");
  const [sortOrder, setSortOrder] = useState("");
  const [editName, setEditName] = useState("");
  const [editUnit, setEditUnit] = useState("");
  const [editDirection, setEditDirection] = useState<MetricDirection>("higher_is_better");
  const [editCategory, setEditCategory] = useState<MetricCategory>("strength");
  const [editSortOrder, setEditSortOrder] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function beginEdit(metricType: MetricType) {
    setEditingId(metricType.id);
    setEditName(metricType.name);
    setEditUnit(metricType.unit);
    setEditDirection(metricType.direction);
    setEditCategory(metricType.category);
    setEditSortOrder(metricType.sort_order?.toString() ?? "");
  }

  function runAction(action: () => Promise<{ error?: string; success?: boolean }>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result.error) {
        setError(result.error);
        return;
      }
      window.location.reload();
    });
  }

  function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    runAction(() =>
      createMetricType({
        name,
        unit,
        direction,
        category,
        sortOrder: sortOrder ? Number(sortOrder) : null,
      })
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Add metric type</CardTitle>
          <CardDescription>
            New tests like 5-10-5 shuttle or mile time — no code changes needed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="metricName">Name</Label>
              <Input
                id="metricName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. 5-10-5 Shuttle"
                required
                disabled={isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="metricUnit">Unit</Label>
              <Input
                id="metricUnit"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="e.g. seconds, lbs, inches"
                required
                disabled={isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="metricSortOrder">Sort order</Label>
              <Input
                id="metricSortOrder"
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                placeholder="Optional"
                disabled={isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="metricDirection">Direction</Label>
              <select
                id="metricDirection"
                className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                value={direction}
                onChange={(e) => setDirection(e.target.value as MetricDirection)}
                disabled={isPending}
              >
                {DIRECTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="metricCategory">Category</Label>
              <select
                id="metricCategory"
                className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                value={category}
                onChange={(e) => setCategory(e.target.value as MetricCategory)}
                disabled={isPending}
              >
                {CATEGORIES.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={isPending || !name.trim() || !unit.trim()}>
                {isPending ? "Saving..." : "Add metric type"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {metricTypes.map((metricType) => (
          <div key={metricType.id} className="rounded-lg border border-border p-4">
            {editingId === metricType.id ? (
              <div className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Name</Label>
                    <Input value={editName} onChange={(e) => setEditName(e.target.value)} disabled={isPending} />
                  </div>
                  <div className="space-y-2">
                    <Label>Unit</Label>
                    <Input value={editUnit} onChange={(e) => setEditUnit(e.target.value)} disabled={isPending} />
                  </div>
                  <div className="space-y-2">
                    <Label>Sort order</Label>
                    <Input
                      type="number"
                      value={editSortOrder}
                      onChange={(e) => setEditSortOrder(e.target.value)}
                      disabled={isPending}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Direction</Label>
                    <select
                      className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                      value={editDirection}
                      onChange={(e) => setEditDirection(e.target.value as MetricDirection)}
                      disabled={isPending}
                    >
                      {DIRECTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option.replace(/_/g, " ")}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <select
                      className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                      value={editCategory}
                      onChange={(e) => setEditCategory(e.target.value as MetricCategory)}
                      disabled={isPending}
                    >
                      {CATEGORIES.map((option) => (
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
                    disabled={isPending || !editName.trim() || !editUnit.trim()}
                    onClick={() =>
                      runAction(() =>
                        updateMetricType({
                          id: metricType.id,
                          name: editName,
                          unit: editUnit,
                          direction: editDirection,
                          category: editCategory,
                          sortOrder: editSortOrder ? Number(editSortOrder) : null,
                        })
                      )
                    }
                  >
                    Save
                  </Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => setEditingId(null)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium">
                    {metricType.name}
                    {!metricType.is_active ? (
                      <span className="ml-2 text-xs text-muted-foreground">(inactive)</span>
                    ) : null}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {metricType.unit} · {metricType.category} · {metricType.direction.replace(/_/g, " ")}
                    {metricType.sort_order != null ? ` · order ${metricType.sort_order}` : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" size="sm" variant="outline" onClick={() => beginEdit(metricType)}>
                    Edit
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={metricType.is_active ? "destructive" : "secondary"}
                    disabled={isPending}
                    onClick={() =>
                      runAction(() => setMetricTypeActive(metricType.id, !metricType.is_active))
                    }
                  >
                    {metricType.is_active ? "Deactivate" : "Reactivate"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
