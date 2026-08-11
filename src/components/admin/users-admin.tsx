"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Profile, UserRole } from "@/lib/types";

type UsersAdminProps = {
  isAdmin: boolean;
};

type CreateFormState = {
  displayName: string;
  email: string;
  password: string;
  role: UserRole;
};

export function UsersAdmin({ isAdmin }: UsersAdminProps) {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [bootstrapMode, setBootstrapMode] = useState(false);
  const [form, setForm] = useState<CreateFormState>({
    displayName: "",
    email: "",
    password: "",
    role: "member",
  });

  async function loadUsers() {
    setLoading(true);
    setError(null);

    const statusResponse = await fetch("/api/setup/status");
    const statusData = await statusResponse.json();

    if (statusData.needsBootstrap) {
      setBootstrapMode(true);
      setUsers([]);
      setLoading(false);
      return;
    }

    if (!statusData.migrated) {
      setError("Database migration has not been applied yet.");
      setLoading(false);
      return;
    }

    const response = await fetch("/api/admin/users");
    const data = await response.json();

    if (!response.ok) {
      setError(data.error ?? "Failed to load users.");
      setLoading(false);
      return;
    }

    setUsers(data.users ?? []);
    setBootstrapMode(false);
    setLoading(false);
  }

  useEffect(() => {
    loadUsers();
  }, []);

  async function handleCreateUser(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreating(true);
    setError(null);
    setSuccess(null);

    const response = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        displayName: form.displayName,
        email: form.email,
        password: form.password,
        role: bootstrapMode ? "admin" : form.role,
      }),
    });

    const data = await response.json();
    setCreating(false);

    if (!response.ok) {
      setError(data.error ?? "Failed to create user.");
      return;
    }

    setSuccess(
      bootstrapMode
        ? `Admin account created for ${form.displayName}. Sign in and change your password.`
        : `User ${form.displayName} created. They must change their password on first login.`
    );
    setForm({ displayName: "", email: "", password: "", role: "member" });
    await loadUsers();
  }

  async function toggleActive(user: Profile) {
    setError(null);
    setSuccess(null);

    const response = await fetch(`/api/admin/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !user.is_active }),
    });

    const data = await response.json();
    if (!response.ok) {
      setError(data.error ?? "Failed to update user.");
      return;
    }

    setSuccess(`${user.display_name} ${user.is_active ? "deactivated" : "reactivated"}.`);
    await loadUsers();
  }

  async function resetPassword(user: Profile) {
    const newPassword = window.prompt(`Enter a temporary password for ${user.display_name}:`);
    if (!newPassword) {
      return;
    }

    setError(null);
    setSuccess(null);

    const response = await fetch(`/api/admin/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resetPassword: newPassword }),
    });

    const data = await response.json();
    if (!response.ok) {
      setError(data.error ?? "Failed to reset password.");
      return;
    }

    setSuccess(`Password reset for ${user.display_name}. They must change it on next login.`);
    await loadUsers();
  }

  async function changeRole(user: Profile) {
    const nextRole: UserRole = user.role === "admin" ? "member" : "admin";

    setError(null);
    setSuccess(null);

    const response = await fetch(`/api/admin/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: nextRole }),
    });

    const data = await response.json();
    if (!response.ok) {
      setError(data.error ?? "Failed to update role.");
      return;
    }

    setSuccess(`${user.display_name} is now a ${nextRole}.`);
    await loadUsers();
  }

  if (!isAdmin && !bootstrapMode && !loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Admin access required</CardTitle>
          <CardDescription>You need an admin account to manage users.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {bootstrapMode ? (
        <Card className="border-amber-300/50 bg-amber-50 dark:border-amber-700/50 dark:bg-amber-950/30">
          <CardHeader>
            <CardTitle>First-time setup</CardTitle>
            <CardDescription>
              No users exist yet. Create your admin account below, then sign in.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>{bootstrapMode ? "Create admin account" : "Create user"}</CardTitle>
          <CardDescription>
            {bootstrapMode
              ? "This becomes the family admin. You will be asked to change your password on first login."
              : "New users receive a temporary password and must change it on first login."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateUser} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="displayName">Display name</Label>
                <Input
                  id="displayName"
                  value={form.displayName}
                  onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Temporary password</Label>
                <Input
                  id="password"
                  type="password"
                  minLength={8}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                />
              </div>
              {!bootstrapMode ? (
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <select
                    id="role"
                    className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}
                  >
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              ) : null}
            </div>
            <Button type="submit" disabled={creating}>
              {creating ? "Creating..." : bootstrapMode ? "Create admin account" : "Create user"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {error ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {success ? (
        <p className="rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-800 dark:text-green-200">
          {success}
        </p>
      ) : null}

      {!bootstrapMode ? (
        <Card>
          <CardHeader>
            <CardTitle>Family members</CardTitle>
            <CardDescription>
              {loading ? "Loading..." : `${users.length} user${users.length === 1 ? "" : "s"}`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {users.map((user) => (
              <div
                key={user.id}
                className="flex flex-col gap-3 rounded-lg border border-border p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium">{user.display_name}</p>
                  <p className="text-sm text-muted-foreground">
                    {user.role} · {user.is_active ? "Active" : "Inactive"}
                    {user.must_change_password ? " · Must change password" : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => resetPassword(user)}>
                    Reset password
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => changeRole(user)}>
                    Make {user.role === "admin" ? "member" : "admin"}
                  </Button>
                  <Button
                    variant={user.is_active ? "destructive" : "secondary"}
                    size="sm"
                    onClick={() => toggleActive(user)}
                  >
                    {user.is_active ? "Deactivate" : "Reactivate"}
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
