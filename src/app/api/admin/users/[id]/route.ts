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
    const password = body.resetPassword.trim();

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters." },
        { status: 400 }
      );
    }

    const { error } = await admin.auth.admin.updateUserById(id, {
      password,
      email_confirm: true,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    await admin.auth.admin.signOut(id, "global");

    await admin
      .from("profiles")
      .update({ must_change_password: true, is_active: true })
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

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAdminProfile();
  if ("error" in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const { id } = await params;

  if (id === authResult.profile.id) {
    return NextResponse.json({ error: "You cannot delete your own account." }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: target, error: targetError } = await admin
    .from("profiles")
    .select("id, display_name, role")
    .eq("id", id)
    .maybeSingle();

  if (targetError) {
    return NextResponse.json({ error: targetError.message }, { status: 500 });
  }

  if (!target) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  if (target.role === "admin") {
    const { count, error: adminCountError } = await admin
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("role", "admin");

    if (adminCountError) {
      return NextResponse.json({ error: adminCountError.message }, { status: 500 });
    }

    if ((count ?? 0) <= 1) {
      return NextResponse.json(
        { error: "Cannot delete the only admin account." },
        { status: 400 }
      );
    }
  }

  const { error: exerciseError } = await admin
    .from("exercises")
    .update({ created_by: null })
    .eq("created_by", id);

  if (exerciseError) {
    return NextResponse.json({ error: exerciseError.message }, { status: 500 });
  }

  const { error: deleteError } = await admin.auth.admin.deleteUser(id);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 400 });
  }

  return NextResponse.json({
    success: true,
    deletedUserId: id,
    displayName: target.display_name,
  });
}
