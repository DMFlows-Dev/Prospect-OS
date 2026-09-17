"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function str(fd: FormData, key: string): string | null {
  const v = fd.get(key);
  return typeof v === "string" && v.trim() !== "" ? v.trim() : null;
}

export async function createCampaign(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data, error } = await supabase
    .from("campaigns")
    .insert({
      name: str(formData, "name") ?? "Untitled campaign",
      owner_id: user!.id,
      assigned_bdr_id: str(formData, "assigned_bdr_id"),
      industry_id: str(formData, "industry_id"),
      service_line_id: str(formData, "service_line_id"),
      channel: str(formData, "channel"),
      icp_description: str(formData, "icp_description"),
      target_company_size: str(formData, "target_company_size"),
      target_location: str(formData, "target_location"),
      target_job_titles: str(formData, "target_job_titles"),
      objective: str(formData, "objective"),
      status: str(formData, "status") ?? "draft",
      start_date: str(formData, "start_date"),
      end_date: str(formData, "end_date"),
      notes: str(formData, "notes"),
      ai_instructions: str(formData, "ai_instructions"),
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  revalidatePath("/campaigns");
  redirect(`/campaigns/${data!.id}`);
}

export async function updateCampaign(id: string, formData: FormData) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("campaigns")
    .update({
      name: str(formData, "name") ?? "Untitled campaign",
      assigned_bdr_id: str(formData, "assigned_bdr_id"),
      industry_id: str(formData, "industry_id"),
      service_line_id: str(formData, "service_line_id"),
      channel: str(formData, "channel"),
      icp_description: str(formData, "icp_description"),
      target_company_size: str(formData, "target_company_size"),
      target_location: str(formData, "target_location"),
      target_job_titles: str(formData, "target_job_titles"),
      objective: str(formData, "objective"),
      status: str(formData, "status") ?? "draft",
      start_date: str(formData, "start_date"),
      end_date: str(formData, "end_date"),
      notes: str(formData, "notes"),
      ai_instructions: str(formData, "ai_instructions"),
    })
    .eq("id", id);

  if (error) throw new Error(error.message);

  revalidatePath(`/campaigns/${id}`);
  revalidatePath("/campaigns");
}
