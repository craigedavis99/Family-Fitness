import type { PlanCoverageReport } from "@/lib/types";

type CoverageReportProps = {
  report: PlanCoverageReport;
};

function statusLabel(status: PlanCoverageReport["rows"][number]["status"]) {
  switch (status) {
    case "missing":
      return "Missing";
    case "low":
      return "Low volume";
    case "ok":
      return "OK";
  }
}

function statusClass(status: PlanCoverageReport["rows"][number]["status"]) {
  switch (status) {
    case "missing":
      return "bg-destructive/10 text-destructive";
    case "low":
      return "bg-amber-500/10 text-amber-800 dark:text-amber-200";
    case "ok":
      return "bg-green-500/10 text-green-800 dark:text-green-200";
  }
}

export function CoverageReport({ report }: CoverageReportProps) {
  return (
    <div className="space-y-4 rounded-lg border border-border bg-background p-4">
      <div>
        <h3 className="font-medium">Coverage report</h3>
        <p className="text-sm text-muted-foreground">
          Total working sets per muscle group across your full cycle.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[320px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted-foreground">
              <th className="py-2 pr-4 font-medium">Muscle group</th>
              <th className="py-2 pr-4 font-medium">Sets / cycle</th>
              <th className="py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {report.rows.map((row) => (
              <tr key={row.muscleGroup} className="border-b border-border/60">
                <td className="py-2 pr-4">{row.muscleGroup}</td>
                <td className="py-2 pr-4">{row.totalSets}</td>
                <td className="py-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusClass(row.status)}`}
                  >
                    {statusLabel(row.status)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="space-y-1 text-sm text-muted-foreground">
        {report.notes.map((note) => (
          <li key={note}>• {note}</li>
        ))}
      </ul>
    </div>
  );
}
