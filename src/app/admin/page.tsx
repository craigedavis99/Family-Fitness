import { redirect } from "next/navigation";
import Link from "next/link";
import { AdminLoginForm } from "@/components/admin/admin-login-form";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { ClaimAdminCard } from "@/components/admin/claim-admin-card";
import { getAuthUser } from "@/lib/auth";
import { canClaimAdmin, getBootstrapStatus } from "@/lib/bootstrap-admin";
import { getSessionState } from "@/lib/session";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

const ADMIN_SECTIONS = [
  {
    href: "/admin/users",
    title: "Users",
    description: "Create accounts, reset passwords, and manage roles.",
  },
  {
    href: "/admin/exercises",
    title: "Exercises",
    description: "Bulk add and edit the shared exercise catalog.",
  },
  {
    href: "/admin/metrics",
    title: "Metrics",
    description: "Add or edit performance tests and body metrics.",
  },
  {
    href: "/admin/export",
    title: "Export",
    description: "Download metric entries and workout sets as CSV.",
  },
] as const;

export default async function AdminPage() {
  const [state, bootstrap, auth] = await Promise.all([
    getSessionState(),
    getBootstrapStatus(),
    getAuthUser(),
  ]);

  if (state.status === "must_change_password") {
    redirect("/change-password");
  }

  const isAdmin = state.status === "ready" && state.profile.role === "admin";
  const displayName = state.status === "ready" ? state.profile.display_name : null;
  const canClaim =
    state.status === "ready" &&
    !isAdmin &&
    (await canClaimAdmin(auth.user?.email)).allowed;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Admin"
        description={
          isAdmin
            ? "Manage family accounts, the exercise catalog, metrics, and data exports."
            : "Sign in or claim admin access to manage the app."
        }
      />

      {canClaim ? (
        <ClaimAdminCard
          displayName={state.profile.display_name}
          email={auth.user?.email}
          reason={
            bootstrap.needsAdminBootstrap
              ? "No admin account exists yet. Make your current account the family admin."
              : "Your email is configured as the permanent family admin."
          }
        />
      ) : null}

      {!isAdmin && !canClaim ? (
        <AdminLoginForm
          signedInAs={displayName ?? undefined}
          notAdmin={state.status === "ready" && state.profile.role !== "admin"}
        />
      ) : null}

      {!isAdmin && bootstrap.needsAdminBootstrap && state.status !== "ready" ? (
        <Card>
          <CardContent className="py-4 text-sm text-muted-foreground">
            Already have a member account?{" "}
            <Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">
              Sign in
            </Link>{" "}
            first, then return here to make it admin.
          </CardContent>
        </Card>
      ) : null}

      {isAdmin ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {ADMIN_SECTIONS.map((section) => (
            <Link key={section.href} href={section.href} className="group block">
              <Card className="h-full transition-colors group-hover:border-primary/40">
                <CardHeader>
                  <CardTitle>{section.title}</CardTitle>
                  <CardDescription>{section.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <span className="text-sm font-medium text-primary">Open section →</span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
