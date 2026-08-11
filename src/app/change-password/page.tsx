import { redirect } from "next/navigation";
import { getSessionState, recoverFromBrokenSession } from "@/lib/session";
import ChangePasswordForm from "./change-password-form";

export const dynamic = "force-dynamic";

export default async function ChangePasswordPage() {
  const state = await getSessionState();

  if (
    state.status === "unauthenticated" ||
    state.status === "no_supabase" ||
    state.status === "no_migration"
  ) {
    redirect("/login");
  }

  if (state.status === "no_profile") {
    await recoverFromBrokenSession();
  }

  if (state.status === "inactive") {
    redirect("/login?error=account_inactive");
  }

  if (state.status === "ready") {
    redirect("/home");
  }

  return <ChangePasswordForm />;
}
