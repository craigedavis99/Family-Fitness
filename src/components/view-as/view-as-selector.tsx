"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Eye, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/card";
import { setViewAsUser } from "@/app/actions/admin";
import type { Profile } from "@/lib/types";

type ViewAsSelectorProps = {
  members: Profile[];
  currentUserId: string;
  viewingAs: Profile | null;
};

export function ViewAsSelector({ members, currentUserId, viewingAs }: ViewAsSelectorProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleChange(value: string) {
    startTransition(async () => {
      await setViewAsUser(value === currentUserId ? null : value);
      router.refresh();
    });
  }

  function handleExit() {
    startTransition(async () => {
      await setViewAsUser(null);
      router.refresh();
    });
  }

  return (
    <div className="border-b border-[var(--warning)]/25 bg-[var(--warning)]/10 px-4 py-3">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <Label htmlFor="viewAsUser" className="inline-flex items-center gap-1.5 text-[var(--warning-foreground)]">
            <Eye className="h-3.5 w-3.5" />
            View as user (Home is read-only)
          </Label>
          <select
            id="viewAsUser"
            className="flex h-11 w-full min-w-[220px] rounded-xl border border-border bg-card px-3 py-2 text-sm sm:w-auto"
            value={viewingAs?.id ?? currentUserId}
            onChange={(e) => handleChange(e.target.value)}
            disabled={isPending}
          >
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.display_name}
                {member.role === "admin" ? " (admin)" : ""}
              </option>
            ))}
          </select>
        </div>
        {viewingAs ? (
          <div className="flex flex-col gap-2 sm:items-end">
            <p className="text-sm text-[var(--warning-foreground)]">
              Viewing <strong>{viewingAs.display_name}</strong>
            </p>
            <Button type="button" size="sm" variant="outline" onClick={handleExit} disabled={isPending}>
              <X className="h-3.5 w-3.5" />
              Exit view-as
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
