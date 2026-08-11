import { NextResponse } from "next/server";
import { requireAdminProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Profile, UserRole } from "@/lib/types";

type CreateUserBody = {
  email: string;
  password: string;
  displayName: string;
  role?: UserRole;
  birthdate?: string | null;
};

async function canCreateUsers() {
  const admin = createAdminClient();
  const { count, error } = await admin
    .from("profiles")
    .select("*", { count: "exact", head: true });

  if (error) {
    if (error.code === "PGRST205") {
      return { allowed: false, reason: "Database not migrated yet. Run the SQL migration first." };
    }
    return { allowed: false, reason: error.message };
  }

  if ((count ?? 0) === 0) {
    return { allowed: true, bootstrap: true as const };
  }

  const authResult = await requireAdminProfile();
  if ("error" in authResult) {
    return { allowed: false, reason: "Admin access required." };
  }

  return { allowed: true, bootstrap: false as const, profile: authResult.profile };
}

export async function GET() {
  const authResult = await requireAdminProfile();
  if ("error" in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ users: data as Profile[] });
}

export async function POST(request: Request) {
  try {
    const access = await canCreateUsers();
    if (!access.allowed) {
      return NextResponse.json({ error: access.reason }, { status: 403 });
    }

    const body = (await request.json()) as CreateUserBody;
    const email = body.email?.trim().toLowerCase();
    const password = body.password;
    const displayName = body.displayName?.trim();
    const role: UserRole =
      access.bootstrap ? "admin" : body.role === "admin" ? "admin" : "member";

    if (!email || !password || !displayName) {
      return NextResponse.json(
        { error: "Email, password, and display name are required." },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters." },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: authError?.message ?? "Failed to create auth user." },
        { status: 400 }
      );
    }

    const { error: profileError } = await admin.from("profiles").insert({
      id: authData.user.id,
      display_name: displayName,
      role,
      birthdate: body.birthdate ?? null,
      must_change_password: true,
      is_active: true,
    });

    if (profileError) {
      await admin.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    return NextResponse.json({
      user: {
        id: authData.user.id,
        email,
        display_name: displayName,
        role,
        must_change_password: true,
        is_active: true,
      },
      bootstrap: access.bootstrap,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected error." },
      { status: 500 }
    );
  }
}
