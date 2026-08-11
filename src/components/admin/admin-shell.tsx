"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { tryCreateClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type AdminShellProps = {
  children: React.ReactNode;
  displayName?: string | null;
  isAdmin?: boolean;
};

const ADMIN_TABS: { href: string; label: string; exact?: boolean }[] = [
  { href: "/admin", label: "Admin", exact: true },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/exercises", label: "Exercises" },
  { href: "/admin/metrics", label: "Metrics" },
  { href: "/admin/export", label: "Export" },
];

function isTabActive(pathname: string, href: string, exact?: boolean) {
  if (exact) {
    return pathname === href;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminShell({ children, displayName, isAdmin = false }: AdminShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const visibleTabs = isAdmin ? ADMIN_TABS : ADMIN_TABS.filter((tab) => tab.href === "/admin");

  async function handleSignOut() {
    const supabase = tryCreateClient();
    if (supabase) {
      await supabase.auth.signOut();
    }
    router.push("/admin");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Family Fitness · Admin
            </p>
            {displayName ? (
              <p className="text-sm font-semibold">{displayName}</p>
            ) : (
              <p className="text-sm text-muted-foreground">Sign in to manage the app</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/home"
              className="text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              Back to app
            </Link>
            {displayName ? (
              <Button variant="ghost" size="sm" onClick={handleSignOut}>
                Sign out
              </Button>
            ) : null}
          </div>
        </div>
        <nav className="border-t border-border">
          <div className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-4">
            {visibleTabs.map((tab) => {
              const active = isTabActive(pathname, tab.href, tab.exact);
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={cn(
                    "shrink-0 border-b-2 px-4 py-3 text-sm font-medium transition-colors",
                    active
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  {tab.label}
                </Link>
              );
            })}
          </div>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
