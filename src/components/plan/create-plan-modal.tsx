"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/card";
import { createPlan } from "@/app/actions/plans";
import type { PlanKind } from "@/lib/plan";
import { PlanModal } from "@/components/plan/plan-modal";

type CreatePlanModalProps = {
  open: boolean;
  onClose: () => void;
};

const selectClassName =
  "select-field flex h-12 w-full rounded-xl border border-input bg-card/90 px-3.5 py-2 text-base shadow-sm disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm";

export function CreatePlanModal({ open, onClose }: CreatePlanModalProps) {
  const [planName, setPlanName] = useState("");
  const [planKind, setPlanKind] = useState<PlanKind>("cycle");
  const [firstDayLabel, setFirstDayLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function resetForm() {
    setPlanName("");
    setPlanKind("cycle");
    setFirstDayLabel("");
    setError(null);
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (planKind === "cycle" && !firstDayLabel.trim()) {
      setError("Add a name for your first day (e.g. Push, Legs, Day 1).");
      return;
    }

    startTransition(async () => {
      const result = await createPlan(planName, planKind, firstDayLabel.trim() || undefined);

      if (result.error) {
        setError(result.error);
        return;
      }

      handleClose();
      if (result.plan?.id) {
        window.location.href = `/plan?expand=${result.plan.id}`;
      } else {
        window.location.href = "/plan";
      }
    });
  }

  return (
    <PlanModal
      open={open}
      title="Create plan"
      description="Start a training cycle or a single-day workout template."
      onClose={handleClose}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="createPlanName">Plan name</Label>
          <Input
            id="createPlanName"
            value={planName}
            onChange={(e) => setPlanName(e.target.value)}
            placeholder={
              planKind === "cycle" ? "e.g. Push / Pull / Legs" : "e.g. Hotel workout"
            }
            required
            disabled={isPending}
            autoFocus
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="createPlanKind">Plan type</Label>
          <select
            id="createPlanKind"
            className={selectClassName}
            value={planKind}
            onChange={(e) => setPlanKind(e.target.value as PlanKind)}
            disabled={isPending}
          >
            <option value="cycle">Training cycle (multiple days)</option>
            <option value="daily">Custom daily workout (single day)</option>
          </select>
        </div>

        {planKind === "cycle" ? (
          <div className="space-y-2">
            <Label htmlFor="createFirstDay">First day name</Label>
            <Input
              id="createFirstDay"
              value={firstDayLabel}
              onChange={(e) => setFirstDayLabel(e.target.value)}
              placeholder="e.g. Push, Upper, Day 1"
              disabled={isPending}
            />
            <p className="text-xs text-muted-foreground">
              You can add more days after creating the plan.
            </p>
          </div>
        ) : (
          <p className="rounded-xl border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            A single workout day will be created automatically with this plan name.
          </p>
        )}

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <div className="flex gap-2 pt-1">
          <Button type="button" variant="outline" className="flex-1" onClick={handleClose} disabled={isPending}>
            Cancel
          </Button>
          <Button type="submit" className="flex-1 gap-1.5" disabled={isPending || !planName.trim()}>
            <Plus className="h-4 w-4" />
            {isPending ? "Creating..." : "Create plan"}
          </Button>
        </div>
      </form>
    </PlanModal>
  );
}
