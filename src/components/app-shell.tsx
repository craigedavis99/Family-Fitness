"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ClipboardList,
  Dumbbell,
  Home,
  LogOut,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "@/lib/types";
import type { Profile } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { tryCreateClient } from "@/lib/supabase/client";
import { ViewAsSelector } from "@/components/view-as/view-as-selector";

type AppShellProps = {
  children: React.ReactNode;
  displayName?: string;
  isAdmin?: boolean;
  currentUserId?: string;
  members?: Profile[];
  viewingAs?: Profile | null;
};

const NAV_ICONS: Record<string, React.ComponentType<{ className?: string; strokeWidth?: number }>> = {
  "/home": Home,
  "/plan": ClipboardList,
  "/log": Dumbbell,
  "/admin": Settings,
};

function greetingForNow() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function AppShell({
  children,
  displayName,
  isAdmin = false,
  currentUserId,
  members = [],
  viewingAs = null,
}: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const visibleItems = NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin);

  async function handleSignOut() {
    const supabase = tryCreateClient();
    if (supabase) {
      await supabase.auth.signOut();
    }
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-20 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <p className="font-display text-lg font-semibold tracking-tight text-foreground">
              Family Fitness
            </p>
            {displayName ? (
              <p className="truncate text-xs text-muted-foreground">
                {greetingForNow()}, {displayName}
              </p>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {isAdmin ? (
              <Link
                href="/admin"
                className={cn(
                  "hidden items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-colors sm:inline-flex",
                  pathname.startsWith("/admin")
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                <Settings className="h-3.5 w-3.5" strokeWidth={2.25} />
                Admin
              </Link>
            ) : null}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="gap-1.5 text-muted-foreground"
              aria-label="Sign out"
            >
              <LogOut className="h-4 w-4" strokeWidth={2.25} />
              <span className="hidden sm:inline">Sign out</span>
            </Button>
          </div>
        </div>

        <nav className="hidden border-t border-border/50 md:block">
          <div className="mx-auto flex max-w-5xl gap-1 px-4">
            {visibleItems.map((item) => {
              const isActive = pathname.startsWith(item.href);
              const Icon = NAV_ICONS[item.href];
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-colors",
                    isActive
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  {Icon ? <Icon className="h-4 w-4" strokeWidth={2.25} /> : null}
                  {item.label === "Plan" ? "My Plan" : item.label === "Log" ? "Log Workout" : item.label}
                </Link>
              );
            })}
          </div>
        </nav>
      </header>

      {isAdmin && currentUserId && members.length > 0 ? (
        <ViewAsSelector
          members={members}
          currentUserId={currentUserId}
          viewingAs={viewingAs}
        />
      ) : null}

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-5 pb-28 md:py-8 md:pb-8">
        {children}
      </main>

      <nav
        className="fixed inset-x-0 bottom-0 z-20 md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="border-t border-border/70 bg-card/95 px-2 pt-1.5 shadow-[var(--shadow-nav)] backdrop-blur-xl">
          <div
            className="mx-auto grid max-w-5xl"
            style={{ gridTemplateColumns: `repeat(${visibleItems.length}, minmax(0, 1fr))` }}
          >
            {visibleItems.map((item) => {
              const isActive = pathname.startsWith(item.href);
              const Icon = NAV_ICONS[item.href] ?? Home;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "relative flex flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-2 text-[10px] font-semibold tracking-wide transition-colors",
                    isActive ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  <span
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-xl transition-colors",
                      isActive ? "bg-primary/12 text-primary" : "text-muted-foreground"
                    )}
                  >
                    <Icon className="h-[18px] w-[18px]" strokeWidth={isActive ? 2.5 : 2} />
                  </span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>
    </div>
  );
}
