import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getMetricDetail } from "@/app/actions/metrics";
import { MetricChart } from "@/components/metrics/metric-chart";
import { MetricHistoryTable } from "@/components/metrics/metric-history-table";
import { PageHeader } from "@/components/page-header";
import { formatMetricValue, usesRecentDisplay } from "@/lib/metrics";

export const dynamic = "force-dynamic";

type MetricDetailPageProps = {
  params: Promise<{ metricTypeId: string }>;
};

export default async function MetricDetailPage({ params }: MetricDetailPageProps) {
  const { metricTypeId } = await params;
  const detail = await getMetricDetail(Number(metricTypeId));

  if (!detail) {
    notFound();
  }

  const { metricType, entries, bestEntryId, readOnly, viewingAs } = detail;
  const headline = usesRecentDisplay(metricType.name) ? "Most recent" : "Personal best";
  const bestEntry = entries.find((entry) => entry.id === bestEntryId);

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <Link
          href="/home"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary underline-offset-4 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Link>
        <PageHeader
          eyebrow={readOnly && viewingAs ? `Viewing ${viewingAs.display_name}` : "Metric detail"}
          title={metricType.name}
          description={`${headline}${
            bestEntry
              ? `: ${formatMetricValue(Number(bestEntry.value), metricType.unit)}`
              : ": no entries yet"
          }${readOnly ? " · Read-only" : ""}`}
        />
      </div>

      <section className="stagger-1 space-y-3">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Trend
        </h2>
        <div className="rounded-xl border border-border/80 bg-card p-3 shadow-[var(--shadow-soft)] sm:p-4">
          <MetricChart
            entries={entries}
            metricType={metricType}
            bestEntryId={bestEntryId}
          />
        </div>
      </section>

      <section className="stagger-2 space-y-3">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          History
        </h2>
        <MetricHistoryTable
          entries={entries}
          metricType={metricType}
          bestEntryId={bestEntryId}
          readOnly={readOnly}
        />
      </section>
    </div>
  );
}
