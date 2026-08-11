import { getActiveMetricTypes } from "@/lib/metrics-server";
import { MetricInputForm } from "@/components/metrics/metric-input-form";
import { PageHeader } from "@/components/page-header";

export const dynamic = "force-dynamic";

export default async function InputPage() {
  const metricTypes = await getActiveMetricTypes();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Record"
        title="Input"
        description="Log a body metric or performance test. Context shows before you save."
      />

      {metricTypes.length > 0 ? (
        <div className="stagger-1">
          <MetricInputForm metricTypes={metricTypes} />
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-border bg-card/60 px-4 py-8 text-center text-sm text-muted-foreground">
          No metric types yet. An admin can add them from Admin → Metrics.
        </p>
      )}
    </div>
  );
}
