"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { tryCreateClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/utils";

type AdminLoginFormProps = {
  signedInAs?: string;
  notAdmin?: boolean;
};

export function AdminLoginForm({ signedInAs, notAdmin = false }: AdminLoginFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const supabaseReady = isSupabaseConfigured();

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
      email,
      password,
    });

    setLoading(false);

    if (signInError) {
      setError(signInError.message);
      return;
    }

    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Admin sign in</CardTitle>
        <CardDescription>
          Sign in with an admin account to manage users and the exercise catalog.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!supabaseReady ? (
          <div className="rounded-lg border border-amber-300/50 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-700/50 dark:bg-amber-950/40 dark:text-amber-100">
            Supabase is not connected yet. Add your keys to{" "}
            <code className="font-mono">.env.local</code> first.
          </div>
        ) : null}

        {notAdmin && signedInAs ? (
          <div className="rounded-lg border border-amber-300/50 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-700/50 dark:bg-amber-950/40 dark:text-amber-100">
            You&apos;re signed in as <strong>{signedInAs}</strong>, but that account is not an
            admin. Sign in with an admin account below, or ask your admin for access.
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="adminEmail">Email</Label>
            <Input
              id="adminEmail"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              disabled={!supabaseReady || loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="adminPassword">Password</Label>
            <Input
              id="adminPassword"
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

          <Button type="submit" className="w-full" disabled={!supabaseReady || loading}>
            {loading ? "Signing in..." : "Sign in to admin"}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          First time?{" "}
          <Link href="/setup" className="font-medium text-primary underline-offset-4 hover:underline">
            Create the first admin account
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
