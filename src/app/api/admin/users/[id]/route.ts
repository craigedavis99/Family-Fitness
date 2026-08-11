import { NextResponse } from "next/server";
import { requireAdminProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { UserRole } from "@/lib/types";

type UpdateUserBody = {
  displayName?: string;
  role?: UserRole;
  isActive?: boolean;
  birthdate?: string | null;
  resetPassword?: string;
};

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAdminProfile();
  if ("error" in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const { id } = await params;
  const body = (await request.json()) as UpdateUserBody;
  const admin = createAdminClient();

  const profileUpdates: Record<string, unknown> = {};

  if (body.displayName !== undefined) {
    profileUpdates.display_name = body.displayName.trim();
  }
  if (body.role !== undefined) {
    profileUpdates.role = body.role;
  }
  if (body.isActive !== undefined) {
    profileUpdates.is_active = body.isActive;
  }
  if (body.birthdate !== undefined) {
    profileUpdates.birthdate = body.birthdate;
  }

  if (Object.keys(profileUpdates).length > 0) {
    const { error } = await admin.from("profiles").update(profileUpdates).eq("id", id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  if (body.resetPassword) {
    if (body.resetPassword.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters." },
        { status: 400 }
      );
    }

    const { error } = await admin.auth.admin.updateUserById(id, {
      password: body.resetPassword,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    await admin
      .from("profiles")
      .update({ must_change_password: true })
      .eq("id", id);
  }

  const { data, error: fetchError } = await admin
    .from("profiles")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  return NextResponse.json({ user: data });
}
