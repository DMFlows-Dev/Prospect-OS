"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { UserRole, UserStatus } from "@/types/database";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") throw new Error("Admin only.");
  return supabase;
}

/** Sets a teammate's role and/or status. */
export async function updateTeamMember(userId: string, role: UserRole, status: UserStatus) {
  const supabase = await requireAdmin();
  const { error } = await supabase.from("profiles").update({ role, status }).eq("id", userId);
  if (error) throw new Error(error.message);
  revalidatePath("/team");
}

function teamError(message: string): never {
  redirect(`/team?error=${encodeURIComponent(message)}`);
}

/**
 * Admin creates a teammate's login directly (email + temporary password), so
 * nobody has to wait on a magic-link email. Needs SUPABASE_SERVICE_ROLE_KEY.
 */
export async function addTeamMember(formData: FormData) {
  await requireAdmin();

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const role = String(formData.get("role") ?? "bdr") as UserRole;

  if (!name || !email) teamError("Name and email are required.");
  if (password.length < 8) teamError("Use a temporary password of at least 8 characters.");
  if (!["bdr", "manager", "admin"].includes(role)) teamError("Unknown role.");

  let admin;
  try {
    admin = createAdminClient();
  } catch (e) {
    teamError(e instanceof Error ? e.message : "Service key missing.");
  }

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name },
  });
  if (error || !data.user) teamError(error?.message ?? "Could not create the user.");

  // The signup trigger created the profile as bdr/invited — activate it now.
  const { error: profileError } = await admin
    .from("profiles")
    .update({ name, role, status: "active" })
    .eq("id", data.user.id);
  if (profileError) teamError(profileError.message);

  revalidatePath("/team");
  redirect(`/team?added=${encodeURIComponent(email)}`);
}
