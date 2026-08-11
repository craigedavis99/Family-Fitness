"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type ClaimAdminCardProps = {
  displayName: string;
  email?: string | null;
  reason?: string;
};

export function ClaimAdminCard({ displayName, email, reason }: ClaimAdminCardProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleClaim() {
    setError(null);
    startTransition(async () => {
      const response = await fetch("/api/setup/claim-admin", { method: "POST" });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Could not grant admin access.");
        return;
      }

      router.refresh();
    });
  }

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader>
        <CardTitle>Become the family admin</CardTitle>
        <CardDescription>
          {reason ??
            "No admin account exists yet. You can grant admin access to your current account."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm">
          Signed in as <strong>{displayName}</strong>
          {email ? (
            <>
              {" "}
              (<span className="text-muted-foreground">{email}</span>)
            </>
          ) : null}
        </p>
        <p className="text-sm text-muted-foreground">
          Admin accounts use the same login and can do everything a member can — Home, Input, My
          Plan, Log Workout — plus manage users and exercises.
        </p>
        <Button type="button" onClick={handleClaim} disabled={isPending}>
          {isPending ? "Updating..." : "Make my account admin"}
        </Button>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </CardContent>
    </Card>
  );
}
