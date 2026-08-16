"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/card";
import { tryCreateClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/utils";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [setupStatus, setSetupStatus] = useState<{
    migrated: boolean;
    needsBootstrap: boolean;
  } | null>(null);

  const supabaseReady = isSupabaseConfigured();
  const accountInactive = searchParams.get("error") === "account_inactive";

  useEffect(() => {
    if (!supabaseReady) {
      return;
    }

    fetch("/api/setup/status")
      .then((res) => res.json())
      .then((data) => setSetupStatus(data))
      .catch(() => setSetupStatus(null));
  }, [supabaseReady]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!supabaseReady) {
      setError("Supabase is not configured yet. Add your keys to .env.local first.");
      return;
    }

    const supabase = tryCreateClient();
    if (!supabase) {
      setError("Could not initialize Supabase client.");
      return;
    }

    setLoading(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    setLoading(false);

    if (signInError) {
      setError(signInError.message);
      return;
    }

    router.push("/home");
    router.refresh();
  }

  return (
    <div className="relative flex min-h-dvh flex-col justify-center px-4 py-10">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-20 top-10 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -right-16 bottom-20 h-72 w-72 rounded-full bg-[var(--atmosphere-b)] blur-3xl" />
      </div>

      <div className="relative mx-auto w-full max-w-md page-enter">
        <div className="mb-8 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
            Private family tracker
          </p>
          <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
            Family Fitness
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Metrics, plans, and workouts — built for the gym and the track.
          </p>
        </div>

        <div className="rounded-2xl border border-border/80 bg-card/95 p-6 shadow-[var(--shadow-soft)] backdrop-blur-sm sm:p-8">
          {!supabaseReady ? (
            <div className="mb-4 rounded-xl border border-[var(--warning)]/30 bg-[var(--warning)]/10 px-4 py-3 text-sm text-[var(--warning-foreground)]">
              Supabase is not connected yet. Add your keys to{" "}
              <code className="font-mono text-xs">.env.local</code> first.
            </div>
          ) : null}

          {setupStatus && !setupStatus.migrated ? (
            <div className="mb-4 rounded-xl border border-[var(--warning)]/30 bg-[var(--warning)]/10 px-4 py-3 text-sm text-[var(--warning-foreground)]">
              Database not set up yet. Run the SQL migration in Supabase first.
            </div>
          ) : null}

          {setupStatus?.needsBootstrap ? (
            <div className="mb-4 rounded-xl border border-primary/25 bg-primary/5 px-4 py-3 text-sm">
              First time here?{" "}
              <Link href="/setup" className="font-semibold text-primary underline-offset-4 hover:underline">
                Create your admin account
              </Link>
            </div>
          ) : null}

          {accountInactive ? (
            <div className="mb-4 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              This account has been deactivated. Contact your admin.
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                inputMode="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                disabled={!supabaseReady || loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                disabled={!supabaseReady || loading}
              />
            </div>

            {error ? (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}

            <Button type="submit" className="w-full" size="lg" disabled={!supabaseReady || loading}>
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </form>

          <p className="mt-5 text-center text-sm text-muted-foreground">
            Admin tools?{" "}
            <Link href="/admin" className="font-semibold text-primary underline-offset-4 hover:underline">
              Open admin
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
