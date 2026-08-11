import type { MetricDirection, MetricEntry, MetricType } from "@/lib/types";

const MS_PER_DAY = 1000 * 60 * 60 * 24;
const PR_BADGE_DAYS = 7;

export function usesRecentDisplay(metricName: string) {
  return metricName === "Weight" || metricName === "Height";
}

export function formatMetricValue(value: number, unit: string) {
  const formatted = Number.isInteger(value) ? value.toString() : value.toFixed(2).replace(/\.?0+$/, "");
  return `${formatted} ${unit}`;
}

export function formatShortDate(dateStr: string) {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function todayDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function daysBetween(fromDate: string, toDate: string) {
  const [fy, fm, fd] = fromDate.split("-").map(Number);
  const [ty, tm, td] = toDate.split("-").map(Number);
  const from = new Date(fy, fm - 1, fd);
  const to = new Date(ty, tm - 1, td);
  return Math.round((to.getTime() - from.getTime()) / MS_PER_DAY);
}

export function sortEntries(entries: MetricEntry[]) {
  return [...entries].sort((a, b) => {
    if (a.recorded_on !== b.recorded_on) {
      return b.recorded_on.localeCompare(a.recorded_on);
    }
    return b.created_at.localeCompare(a.created_at);
  });
}

export function isBetterValue(
  value: number,
  compareTo: number,
  direction: MetricDirection
) {
  if (direction === "neutral") {
    return value !== compareTo;
  }
  if (direction === "higher_is_better") {
    return value > compareTo;
  }
  return value < compareTo;
}

export function getPersonalBestEntry(
  entries: MetricEntry[],
  direction: MetricDirection
): MetricEntry | null {
  if (entries.length === 0) {
    return null;
  }

  if (direction === "neutral") {
    return sortEntries(entries)[0];
  }

  return entries.reduce<MetricEntry | null>((best, entry) => {
    if (!best) {
      return entry;
    }
    return isBetterValue(entry.value, best.value, direction) ? entry : best;
  }, null);
}

export function getTrend(
  latest: number | null,
  previous: number | null
): "up" | "down" | "flat" | null {
  if (latest == null || previous == null) {
    return null;
  }
  if (latest > previous) {
    return "up";
  }
  if (latest < previous) {
    return "down";
  }
  return "flat";
}

export function validateMetricValue(
  value: number,
  metricType: MetricType,
  lastValue: number | null
): { hardError?: string; softWarning?: string } {
  if (Number.isNaN(value) || value <= 0) {
    return { hardError: "Value must be greater than zero." };
  }

  if (metricType.name === "Weight" && value > 1000) {
    return { hardError: "Weight cannot exceed 1000 lbs." };
  }

  if (lastValue != null && lastValue > 0) {
    const changeRatio = Math.abs(value - lastValue) / lastValue;
    if (changeRatio > 0.2) {
      return {
        softWarning: `That is ${Math.round(changeRatio * 100)}% different from your last entry (${formatMetricValue(lastValue, metricType.unit)}). Double-check before saving.`,
      };
    }
  }

  return {};
}

export function buildWeightContext(entries: MetricEntry[]) {
  const sorted = sortEntries(entries);
  const latest = sorted[0];
  if (!latest) {
    return null;
  }

  const previous = sorted[1];
  const heaviest = entries.reduce<MetricEntry | null>((max, entry) => {
    if (!max || entry.value > max.value) {
      return entry;
    }
    return max;
  }, null);

  const parts: string[] = [
    `Last recorded: ${formatMetricValue(latest.value, "lbs")} on ${formatShortDate(latest.recorded_on)}.`,
  ];

  if (previous) {
    const delta = latest.value - previous.value;
    const days = Math.max(daysBetween(previous.recorded_on, latest.recorded_on), 1);
    const perDay = delta / days;
    const direction = delta > 0 ? "gained" : delta < 0 ? "lost" : "held steady at";
    const deltaAbs = Math.abs(delta).toFixed(1).replace(/\.0$/, "");
    const perDayAbs = Math.abs(perDay).toFixed(2).replace(/\.?0+$/, "");

    if (delta === 0) {
      parts.push(
        `You held steady at ${formatMetricValue(latest.value, "lbs")} since your last entry on ${formatShortDate(previous.recorded_on)}.`
      );
    } else {
      parts.push(
        `You have ${direction} ${deltaAbs} lbs since your last entry on ${formatShortDate(previous.recorded_on)} — an average of ${perDayAbs} lbs/day over ${days} day${days === 1 ? "" : "s"}.`
      );
    }
  }

  if (heaviest) {
    const diff = latest.value - heaviest.value;
    if (diff === 0) {
      parts.push(
        `This matches your heaviest recorded weight (${formatMetricValue(heaviest.value, "lbs")} on ${formatShortDate(heaviest.recorded_on)}).`
      );
    } else if (diff > 0) {
      parts.push(
        `You are ${diff.toFixed(1).replace(/\.0$/, "")} lbs above your previous heaviest (${formatMetricValue(heaviest.value, "lbs")} on ${formatShortDate(heaviest.recorded_on)}).`
      );
    } else {
      parts.push(
        `You are ${Math.abs(diff).toFixed(1).replace(/\.0$/, "")} lbs below your heaviest recorded weight (${formatMetricValue(heaviest.value, "lbs")} on ${formatShortDate(heaviest.recorded_on)}).`
      );
    }
  }

  return parts.join(" ");
}

export function buildPerformanceContext(
  entries: MetricEntry[],
  metricType: MetricType
) {
  const best = getPersonalBestEntry(entries, metricType.direction);
  if (!best) {
    return "No previous entries yet.";
  }

  return `Your current best is ${formatMetricValue(best.value, metricType.unit)} on ${formatShortDate(best.recorded_on)}.`;
}

export function checkNewPr(
  newValue: number,
  entries: MetricEntry[],
  metricType: MetricType
) {
  if (metricType.direction === "neutral") {
    return { isPr: false, margin: 0, previousBest: null as number | null };
  }

  const priorEntries = entries;
  const previousBestEntry = getPersonalBestEntry(priorEntries, metricType.direction);
  const previousBest = previousBestEntry?.value ?? null;

  if (previousBest == null) {
    return { isPr: true, margin: 0, previousBest: null };
  }

  if (isBetterValue(newValue, previousBest, metricType.direction)) {
    const margin =
      metricType.direction === "higher_is_better"
        ? newValue - previousBest
        : previousBest - newValue;
    return { isPr: true, margin, previousBest };
  }

  return { isPr: false, margin: 0, previousBest };
}

export function isRecentPr(entry: MetricEntry, entries: MetricEntry[], metricType: MetricType) {
  if (metricType.direction === "neutral") {
    return false;
  }

  const best = getPersonalBestEntry(entries, metricType.direction);
  if (!best || best.id !== entry.id) {
    return false;
  }

  const createdAt = new Date(entry.created_at);
  const daysSince = (Date.now() - createdAt.getTime()) / MS_PER_DAY;
  return daysSince <= PR_BADGE_DAYS;
}

export function buildCardSummary(
  metricType: MetricType,
  entries: MetricEntry[]
): import("@/lib/types").MetricCardSummary {
  const sorted = sortEntries(entries);
  const latest = sorted[0] ?? null;
  const previous = sorted[1] ?? null;
  const best = getPersonalBestEntry(entries, metricType.direction);

  const displayEntry = usesRecentDisplay(metricType.name) ? latest : best;
  const isNewPr =
    latest && best
      ? isRecentPr(best, entries, metricType) && best.id === latest.id
      : false;

  return {
    metricType,
    displayValue: displayEntry?.value ?? null,
    displayDate: displayEntry?.recorded_on ?? null,
    personalBest: best?.value ?? null,
    personalBestDate: best?.recorded_on ?? null,
    previousValue: previous?.value ?? null,
    trend: getTrend(latest?.value ?? null, previous?.value ?? null),
    isNewPr,
  };
}
