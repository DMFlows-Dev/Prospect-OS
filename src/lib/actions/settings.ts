"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

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

export async function addIndustry(formData: FormData) {
  const supabase = await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  const { error } = await supabase.from("industries").insert({ name });
  if (error) throw new Error(error.message);
  revalidatePath("/settings");
}

export async function toggleIndustry(id: string, active: boolean) {
  const supabase = await requireAdmin();
  const { error } = await supabase.from("industries").update({ active: !active }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/settings");
}

export async function addServiceLine(formData: FormData) {
  const supabase = await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  const { error } = await supabase.from("service_lines").insert({ name });
  if (error) throw new Error(error.message);
  revalidatePath("/settings");
}

export async function toggleServiceLine(id: string, active: boolean) {
  const supabase = await requireAdmin();
  const { error } = await supabase.from("service_lines").update({ active: !active }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/settings");
}

export async function toggleLifecycleStage(id: string, active: boolean) {
  const supabase = await requireAdmin();
  const { error } = await supabase.from("lifecycle_stages").update({ active: !active }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/settings");
}
