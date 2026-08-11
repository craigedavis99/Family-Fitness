"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/card";
import { deleteMetricEntry, updateMetricEntry } from "@/app/actions/metrics";
import { formatMetricValue, formatShortDate } from "@/lib/metrics";
import type { MetricEntry, MetricType } from "@/lib/types";

type MetricHistoryTableProps = {
  entries: MetricEntry[];
  metricType: MetricType;
  bestEntryId: number | null;
  readOnly?: boolean;
};

type EditState = {
  value: string;
  recordedOn: string;
  notes: string;
};

export function MetricHistoryTable({
  entries,
  metricType,
  bestEntryId,
  readOnly = false,
}: MetricHistoryTableProps) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editState, setEditState] = useState<EditState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function startEdit(entry: MetricEntry) {
    setEditingId(entry.id);
    setEditState({
      value: String(entry.value),
      recordedOn: entry.recorded_on,
      notes: entry.notes ?? "",
    });
    setError(null);
    setWarning(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditState(null);
    setError(null);
    setWarning(null);
  }

  async function saveEdit(confirmLargeChange = false) {
    if (!editingId || !editState) {
      return;
    }

    setLoading(true);
    setError(null);

    const result = await updateMetricEntry({
      entryId: editingId,
      value: Number(editState.value),
      recordedOn: editState.recordedOn,
      notes: editState.notes,
      confirmLargeChange,
    });

    setLoading(false);

    if ("error" in result && result.error) {
      setError(result.error);
      return;
    }

    if ("warning" in result && result.warning && result.needsConfirmation) {
      setWarning(result.warning);
      return;
    }

    cancelEdit();
  }

  async function handleDelete(entryId: number) {
    if (!window.confirm("Delete this entry?")) {
      return;
    }

    setLoading(true);
    const result = await deleteMetricEntry(entryId);
    setLoading(false);

    if (result.error) {
      setError(result.error);
    }
  }

  if (entries.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border bg-card/60 px-4 py-8 text-center text-sm text-muted-foreground">
        No entries yet. Use the Input tab to record your first value.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {warning ? (
        <div className="rounded-lg border border-amber-300/50 bg-amber-50 px-4 py-3 text-sm dark:border-amber-700/50 dark:bg-amber-950/30">
          <p>{warning}</p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="mt-2"
            onClick={() => saveEdit(true)}
            disabled={loading}
          >
            Save anyway
          </Button>
        </div>
      ) : null}

      <div className="space-y-2">
        {entries.map((entry) => {
          const isEditing = editingId === entry.id;
          const isBest = entry.id === bestEntryId && metricType.direction !== "neutral";

          return (
            <div
              key={entry.id}
              className={`rounded-xl border p-4 shadow-sm ${isBest ? "border-primary/35 bg-primary/[0.04]" : "border-border/80 bg-card"}`}
            >
              {isEditing && editState ? (
                <div className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="space-y-1">
                      <Label htmlFor={`value-${entry.id}`}>Value</Label>
                      <Input
                        id={`value-${entry.id}`}
                        type="number"
                        step="any"
                        value={editState.value}
                        onChange={(e) =>
                          setEditState({ ...editState, value: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor={`date-${entry.id}`}>Date</Label>
                      <Input
                        id={`date-${entry.id}`}
                        type="date"
                        value={editState.recordedOn}
                        onChange={(e) =>
                          setEditState({ ...editState, recordedOn: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-1 sm:col-span-1">
                      <Label htmlFor={`notes-${entry.id}`}>Notes</Label>
                      <Input
                        id={`notes-${entry.id}`}
                        value={editState.notes}
                        onChange={(e) =>
                          setEditState({ ...editState, notes: e.target.value })
                        }
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => saveEdit(false)} disabled={loading}>
                      Save
                    </Button>
                    <Button size="sm" variant="ghost" onClick={cancelEdit} disabled={loading}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-metric text-xl">
                        {formatMetricValue(Number(entry.value), metricType.unit)}
                      </p>
                      {isBest ? (
                        <span className="rounded-md bg-primary/12 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
                          PB
                        </span>
                      ) : null}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {formatShortDate(entry.recorded_on)}
                      {entry.notes ? ` · ${entry.notes}` : ""}
                    </p>
                  </div>
                  {!readOnly ? (
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => startEdit(entry)}>
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(entry.id)}
                        disabled={loading}
                      >
                        Delete
                      </Button>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
