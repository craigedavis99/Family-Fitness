import { redirect } from "next/navigation";
import { Suspense } from "react";
import LoginPage from "./login-form";
import { getSessionState, signOut } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function LoginRoute() {
  const state = await getSessionState();

  if (state.status === "ready") {
    redirect("/home");
  }

  if (state.status === "must_change_password") {
    redirect("/change-password");
  }

  // Clear stale session in-place — do NOT redirect to /login (that causes a loop).
  if (state.status === "no_profile") {
    await signOut();
  }

  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading...</div>}>
      <LoginPage />
    </Suspense>
  );
}
