"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
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

/**
 * Sets a teammate's role and/or status. Inviting brand-new users (sending
 * the actual invite email via Supabase's admin API) needs a service-role
 * key used server-side only — wire that up once this is deployed with real
 * env vars; for now, people sign in once via the magic link on /login and
 * an Admin activates them here.
 */
export async function updateTeamMember(userId: string, role: UserRole, status: UserStatus) {
  const supabase = await requireAdmin();
  const { error } = await supabase.from("profiles").update({ role, status }).eq("id", userId);
  if (error) throw new Error(error.message);
  revalidatePath("/team");
}
