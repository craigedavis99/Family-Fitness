"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/card";
import { saveMetricEntry } from "@/app/actions/metrics";
import { formatMetricValue, todayDateString } from "@/lib/metrics";
import type { MetricType } from "@/lib/types";

type MetricQuickAddDialogProps = {
  open: boolean;
  metricType: MetricType;
  onClose: () => void;
};

export function MetricQuickAddDialog({
  open,
  metricType,
  onClose,
}: MetricQuickAddDialogProps) {
  const router = useRouter();
  const titleId = useId();
  const valueRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState("");
  const [recordedOn, setRecordedOn] = useState(todayDateString());
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) {
      return;
    }

    setValue("");
    setRecordedOn(todayDateString());
    setError(null);
    setWarning(null);
    setSuccessMessage(null);

    const frame = window.requestAnimationFrame(() => {
      valueRef.current?.focus();
    });

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  function submit(confirmLargeChange = false) {
    setError(null);
    setWarning(null);
    setSuccessMessage(null);

    if (!value.trim()) {
      setError("Enter a value.");
      return;
    }

    startTransition(async () => {
      const result = await saveMetricEntry({
        metricTypeId: metricType.id,
        value: Number(value),
        recordedOn,
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

      if ("success" in result && result.success) {
        const message = result.isPr
          ? result.previousBest == null
            ? `Saved — first ${metricType.name} entry.`
            : `New PR! Improved by ${formatMetricValue(result.prMargin ?? 0, metricType.unit)}.`
          : `Saved ${formatMetricValue(Number(value), metricType.unit)}.`;

        setSuccessMessage(message);
        router.refresh();

        window.setTimeout(() => {
          onClose();
        }, 700);
      }
    });
  }

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-foreground/35 backdrop-blur-[2px]"
        aria-label="Close"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 w-full max-w-md animate-[page-enter_220ms_cubic-bezier(0.22,1,0.36,1)] rounded-t-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)] sm:rounded-2xl sm:p-6"
      >
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary/80">
              Add entry
            </p>
            <h2 id={titleId} className="font-display text-2xl font-semibold tracking-tight">
              {metricType.name}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Enter the value and the date it was performed.
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-10 w-10 shrink-0"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            submit(false);
          }}
        >
          <div className="space-y-2">
            <Label htmlFor={`quick-value-${metricType.id}`}>Value ({metricType.unit})</Label>
            <Input
              ref={valueRef}
              id={`quick-value-${metricType.id}`}
              type="number"
              inputMode="decimal"
              step="any"
              min="0"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="text-metric text-2xl"
              required
              disabled={isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`quick-date-${metricType.id}`}>Date performed</Label>
            <Input
              id={`quick-date-${metricType.id}`}
              type="date"
              value={recordedOn}
              onChange={(e) => setRecordedOn(e.target.value)}
              required
              disabled={isPending}
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
                onClick={() => submit(true)}
              >
                Save anyway
              </Button>
            </div>
          ) : null}

          {successMessage ? (
            <p className="rounded-xl border border-[var(--success)]/30 bg-[var(--success)]/10 px-4 py-3 text-sm text-[var(--success-foreground)]">
              {successMessage}
            </p>
          ) : null}

          <div className="flex gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={onClose}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={isPending || !value.trim()}>
              {isPending ? "Saving..." : "Save entry"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
