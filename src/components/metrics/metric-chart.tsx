"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatMetricValue, formatShortDate } from "@/lib/metrics";
import type { MetricEntry, MetricType } from "@/lib/types";

type MetricChartProps = {
  entries: MetricEntry[];
  metricType: MetricType;
  bestEntryId: number | null;
};

export function MetricChart({ entries, metricType, bestEntryId }: MetricChartProps) {
  const chartData = [...entries]
    .sort((a, b) => a.recorded_on.localeCompare(b.recorded_on))
    .map((entry) => ({
      id: entry.id,
      date: entry.recorded_on,
      label: formatShortDate(entry.recorded_on),
      value: Number(entry.value),
      isBest: entry.id === bestEntryId,
    }));

  if (chartData.length === 0) {
    return (
      <div className="flex h-56 items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">
        Record an entry to see your trend chart.
      </div>
    );
  }

  const values = chartData.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const padding = min === max ? Math.max(min * 0.1, 1) : (max - min) * 0.1;
  const reverseY = metricType.direction === "lower_is_better";

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
          <YAxis
            domain={[min - padding, max + padding]}
            reversed={reverseY}
            tick={{ fontSize: 11 }}
            width={48}
          />
          <Tooltip
            formatter={(value) => formatMetricValue(Number(value), metricType.unit)}
            labelFormatter={(_, payload) => {
              const point = payload?.[0]?.payload as { label: string; isBest: boolean } | undefined;
              if (!point) {
                return "";
              }
              return point.isBest ? `${point.label} · PB` : point.label;
            }}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke="var(--primary)"
            strokeWidth={2}
            dot={{ r: 3, fill: "var(--background)", stroke: "var(--primary)", strokeWidth: 2 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
