"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { MetricQuickAddDialog } from "@/components/metrics/metric-quick-add-dialog";
import {
  formatMetricValue,
  formatShortDate,
  usesRecentDisplay,
} from "@/lib/metrics";
import type { MetricCardSummary } from "@/lib/types";

type DashboardMetricCardProps = {
  summary: MetricCardSummary;
  index?: number;
  readOnly?: boolean;
};

function TrendIndicator({
  trend,
  direction,
}: {
  trend: MetricCardSummary["trend"];
  direction: MetricCardSummary["metricType"]["direction"];
}) {
  if (!trend || trend === "flat") {
    return <span className="text-xs text-muted-foreground">Steady</span>;
  }

  const arrow = trend === "up" ? "↑" : "↓";
  const isNeutral = direction === "neutral";
  const improved =
    !isNeutral &&
    ((direction === "higher_is_better" && trend === "up") ||
      (direction === "lower_is_better" && trend === "down"));

  const colorClass = isNeutral
    ? "text-muted-foreground"
    : improved
      ? "text-[var(--success)]"
      : "text-[var(--energy)]";

  return (
    <span className={cn("text-xs font-semibold", colorClass)}>
      {arrow} {improved ? "Better" : "Vs last"}
    </span>
  );
}

export function DashboardMetricCard({
  summary,
  index = 0,
  readOnly = false,
}: DashboardMetricCardProps) {
  const { metricType, displayValue, displayDate, trend, isNewPr } = summary;
  const showRecent = usesRecentDisplay(metricType.name);
  const subtitle = showRecent ? "Most recent" : "Personal best";
  const stagger = index % 3 === 0 ? "stagger-1" : index % 3 === 1 ? "stagger-2" : "stagger-3";
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <>
      <article
        className={cn(
          "group relative overflow-hidden rounded-xl border border-border/80 bg-card p-4 shadow-[var(--shadow-soft)] transition-colors hover:border-primary/35",
          stagger
        )}
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-primary/0 via-primary/50 to-primary/0 opacity-0 transition-opacity group-hover:opacity-100" />

        <Link
          href={`/home/metric/${metricType.id}`}
          className="block tap-scale rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                {subtitle}
              </p>
              <h3 className="mt-1 truncate font-display text-lg font-semibold tracking-tight">
                {metricType.name}
              </h3>
            </div>
            <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground/70 transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
          </div>

          <div className="mt-4 flex items-end justify-between gap-3">
            <div>
              {displayValue != null && displayDate ? (
                <>
                  <p className="text-metric text-3xl text-foreground">
                    {formatMetricValue(displayValue, metricType.unit)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">{formatShortDate(displayDate)}</p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">No entries yet</p>
              )}
            </div>
            <div className="flex flex-col items-end gap-1.5">
              {isNewPr ? (
                <span className="rounded-md bg-[var(--energy)]/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--energy-foreground)]">
                  New PR
                </span>
              ) : null}
              <TrendIndicator trend={trend} direction={metricType.direction} />
            </div>
          </div>
        </Link>

        {!readOnly ? (
          <div className="mt-4 border-t border-border/70 pt-3">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="w-full"
              onClick={() => setDialogOpen(true)}
            >
              <Plus className="h-4 w-4" strokeWidth={2.25} />
              Add entry
            </Button>
          </div>
        ) : null}
      </article>

      {!readOnly ? (
        <MetricQuickAddDialog
          open={dialogOpen}
          metricType={metricType}
          onClose={() => setDialogOpen(false)}
        />
      ) : null}
    </>
  );
}
