import { redirect } from "next/navigation";
import { UsersAdmin } from "@/components/admin/users-admin";
import { ClaimAdminCard } from "@/components/admin/claim-admin-card";
import { getAuthUser } from "@/lib/auth";
import { getBootstrapStatus } from "@/lib/bootstrap-admin";
import { getSessionState, recoverFromBrokenSession } from "@/lib/session";
import { Card, CardContent } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function SetupPage() {
  const [state, bootstrap, auth] = await Promise.all([
    getSessionState(),
    getBootstrapStatus(),
    getAuthUser(),
  ]);

  if (state.status === "must_change_password") {
    redirect("/change-password");
  }

  if (state.status === "no_profile") {
    await recoverFromBrokenSession();
  }

  if (state.status === "ready" && state.profile.role === "admin") {
    redirect("/admin");
  }

  if (
    state.status === "ready" &&
    !bootstrap.needsBootstrap &&
    !bootstrap.needsAdminBootstrap
  ) {
    redirect("/home");
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-4 py-10">
      <div className="mb-6 space-y-2 text-center">
        <h1 className="text-2xl font-semibold">Family Fitness Tracker</h1>
        <p className="text-sm text-muted-foreground">
          {bootstrap.needsBootstrap
            ? "Create the first admin account to get started."
            : "Grant admin access to manage the app."}
        </p>
      </div>

      {state.status === "ready" && bootstrap.needsAdminBootstrap ? (
        <ClaimAdminCard
          displayName={state.profile.display_name}
          email={auth.user?.email}
          reason="No admin account exists yet. Make your current account the family admin."
        />
      ) : bootstrap.needsBootstrap ? (
        <UsersAdmin isAdmin={false} />
      ) : (
        <Card>
          <CardContent className="py-4 text-sm text-muted-foreground">
            Sign in with your member account at{" "}
            <a href="/login" className="font-medium text-primary underline-offset-4 hover:underline">
              /login
            </a>
            , then open{" "}
            <a href="/admin" className="font-medium text-primary underline-offset-4 hover:underline">
              /admin
            </a>{" "}
            to grant admin access.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
