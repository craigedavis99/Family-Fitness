"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Profile } from "@/lib/types";

type ExportAdminProps = {
  users: Profile[];
};

const EXPORT_KINDS = [
  { id: "all", label: "Metrics + workouts" },
  { id: "metrics", label: "Metrics only" },
  { id: "workouts", label: "Workouts only" },
] as const;

export function ExportAdmin({ users }: ExportAdminProps) {
  const [userId, setUserId] = useState<string>("all");
  const [kind, setKind] = useState<(typeof EXPORT_KINDS)[number]["id"]>("all");

  function downloadExport() {
    const params = new URLSearchParams({ kind });
    if (userId !== "all") {
      params.set("userId", userId);
    }
    window.location.href = `/api/admin/export?${params.toString()}`;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Export data</CardTitle>
        <CardDescription>
          Download metric entries and workout sets as CSV for backup or analysis.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="exportUser">User</Label>
            <select
              id="exportUser"
              className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
            >
              <option value="all">Everyone</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.display_name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="exportKind">Data</Label>
            <select
              id="exportKind"
              className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              value={kind}
              onChange={(e) => setKind(e.target.value as typeof kind)}
            >
              {EXPORT_KINDS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <Button type="button" onClick={downloadExport}>
          Download CSV
        </Button>
      </CardContent>
    </Card>
  );
}
