import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { canClaimAdmin, promoteProfileToAdmin } from "@/lib/bootstrap-admin";

export async function POST() {
  const { user } = await getAuthUser();

  if (!user) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }

  const claim = await canClaimAdmin(user.email);
  if (!claim.allowed) {
    return NextResponse.json({ error: claim.reason }, { status: 403 });
  }

  try {
    await promoteProfileToAdmin(user.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected error." },
      { status: 500 }
    );
  }
}
