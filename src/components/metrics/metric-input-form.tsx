"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getMetricInputContext,
  saveMetricEntry,
} from "@/app/actions/metrics";
import { formatMetricValue, todayDateString } from "@/lib/metrics";
import type { MetricType } from "@/lib/types";

type MetricInputFormProps = {
  metricTypes: MetricType[];
};

type SaveResult = {
  isPr: boolean;
  prMargin: number;
  previousBest: number | null;
  metricType: MetricType;
};

const selectClassName =
  "flex h-12 w-full rounded-xl border border-input bg-card/90 px-3.5 py-2 text-base shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm";

export function MetricInputForm({ metricTypes }: MetricInputFormProps) {
  const [metricTypeId, setMetricTypeId] = useState<string>(
    metricTypes[0] ? String(metricTypes[0].id) : ""
  );
  const [value, setValue] = useState("");
  const [recordedOn, setRecordedOn] = useState(todayDateString());
  const [notes, setNotes] = useState("");
  const [contextMessage, setContextMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [saveResult, setSaveResult] = useState<SaveResult | null>(null);
  const [isPending, startTransition] = useTransition();

  const selectedType = metricTypes.find((type) => String(type.id) === metricTypeId);

  useEffect(() => {
    if (!metricTypeId) {
      setContextMessage(null);
      return;
    }

    startTransition(async () => {
      const result = await getMetricInputContext(Number(metricTypeId));
      if ("error" in result && result.error) {
        setContextMessage(null);
        setError(result.error);
        return;
      }
      setContextMessage(result.contextMessage ?? null);
      setError(null);
    });
  }, [metricTypeId]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>, confirmLargeChange = false) {
    event.preventDefault();
    setError(null);
    setWarning(null);
    setSaveResult(null);

    if (!selectedType) {
      setError("Choose a metric type.");
      return;
    }

    startTransition(async () => {
      const result = await saveMetricEntry({
        metricTypeId: selectedType.id,
        value: Number(value),
        recordedOn,
        notes,
        confirmLargeChange,
      });

      if ("error" in result && result.error) {
        setError(result.error);
        return;
      }

      if ("warning" in result && result.warning && result.needsConfirmation) {
        setWarning(result.warning);
        return;
      }

      if ("success" in result && result.success && result.metricType) {
        setSaveResult({
          isPr: result.isPr ?? false,
          prMargin: result.prMargin ?? 0,
          previousBest: result.previousBest ?? null,
          metricType: result.metricType,
        });
        setValue("");
        setNotes("");
        setRecordedOn(todayDateString());

        const context = await getMetricInputContext(selectedType.id);
        if (!("error" in context)) {
          setContextMessage(context.contextMessage ?? null);
        }
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Record a metric</CardTitle>
        <CardDescription>
          Pick a metric, check the context, then save. Backdated entries are fine.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={(event) => handleSubmit(event, false)} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="metricType">Metric</Label>
            <select
              id="metricType"
              className={selectClassName}
              value={metricTypeId}
              onChange={(e) => setMetricTypeId(e.target.value)}
              required
            >
              {metricTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name} ({type.unit})
                </option>
              ))}
            </select>
          </div>

          {contextMessage ? (
            <div className="rounded-xl border border-primary/15 bg-primary/[0.04] px-4 py-3 text-sm leading-relaxed text-foreground/80">
              {contextMessage}
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="value">Value{selectedType ? ` (${selectedType.unit})` : ""}</Label>
              <Input
                id="value"
                type="number"
                inputMode="decimal"
                step="any"
                min="0"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="text-metric text-xl"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="recordedOn">Date</Label>
              <Input
                id="recordedOn"
                type="date"
                value={recordedOn}
                onChange={(e) => setRecordedOn(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Input
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Felt good, post-workout, etc."
            />
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          {warning ? (
            <div className="rounded-xl border border-[var(--warning)]/40 bg-[var(--warning)]/10 px-4 py-3 text-sm text-[var(--warning-foreground)]">
              <p>{warning}</p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="mt-2"
                disabled={isPending}
                onClick={() =>
                  handleSubmit(
                    { preventDefault: () => undefined } as React.FormEvent<HTMLFormElement>,
                    true
                  )
                }
              >
                Save anyway
              </Button>
            </div>
          ) : null}

          {saveResult?.isPr ? (
            <div className="rounded-xl border border-[var(--success)]/30 bg-[var(--success)]/10 px-4 py-3 text-sm text-[var(--success-foreground)]">
              <p className="font-semibold">New personal record</p>
              <p className="mt-1">
                {saveResult.previousBest == null
                  ? `First entry recorded for ${saveResult.metricType.name}.`
                  : `You improved by ${formatMetricValue(saveResult.prMargin, saveResult.metricType.unit)}.`}
              </p>
              <Link
                href={`/home/metric/${saveResult.metricType.id}`}
                className="mt-2 inline-block font-semibold text-primary underline-offset-4 hover:underline"
              >
                View history
              </Link>
            </div>
          ) : null}

          {saveResult && !saveResult.isPr ? (
            <div className="rounded-xl border border-border bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
              Saved. Not a new PR — your best remains{" "}
              {saveResult.previousBest != null
                ? formatMetricValue(saveResult.previousBest, saveResult.metricType.unit)
                : "unchanged"}
              .
            </div>
          ) : null}

          <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={isPending || !metricTypeId}>
            {isPending ? "Saving..." : "Save entry"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
