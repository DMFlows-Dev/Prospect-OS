"use server";

import { createHash, randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { CHANNELS } from "@/lib/channels";
import { isKnownModel } from "@/lib/ai/models";
import { fail, type ActionResult } from "@/lib/action-result";
import type { ChannelKey, PlaybookStep } from "@/types/database";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");
  return { supabase, user };
}

async function requireAdmin() {
  const { supabase, user } = await requireUser();
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") throw new Error("Admin only.");
  return { supabase, user };
}

function slug(label: string): string {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 40) || "step";
}

function text(fd: FormData, key: string): string {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim() : "";
}

/** Admin: instructions + ordered sequence steps for one channel. */
export async function savePlaybook(channel: ChannelKey, formData: FormData): Promise<void> {
  const { supabase } = await requireAdmin();
  if (!CHANNELS.some((c) => c.key === channel)) throw new Error("Unknown channel.");

  const count = Number(formData.get("step_count") ?? 0);
  const rows: { order: number; step: PlaybookStep }[] = [];
  const usedKeys = new Set<string>();

  for (let i = 0; i < count; i++) {
    const label = text(formData, `step_label_${i}`);
    if (!label) continue; // clearing the label removes the step
    let key = text(formData, `step_key_${i}`) || slug(label);
    while (usedKeys.has(key)) key = `${key}_${i}`;
    usedKeys.add(key);

    const max = Number(text(formData, `step_max_${i}`));
    const order = Number(text(formData, `step_order_${i}`));
    rows.push({
      order: Number.isFinite(order) && order > 0 ? order : i + 1,
      step: {
        key,
        label,
        hint: text(formData, `step_hint_${i}`) || undefined,
        max_chars: Number.isFinite(max) && max > 0 ? Math.round(max) : undefined,
        instruction: text(formData, `step_instruction_${i}`) || undefined,
      },
    });
  }
  rows.sort((a, b) => a.order - b.order);

  const { error } = await supabase.from("channel_playbooks").upsert(
    {
      channel,
      instructions: text(formData, "instructions"),
      steps: rows.map((r) => r.step),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "channel" }
  );
  if (error) throw new Error(error.message);
  revalidatePath("/playbook");
}

export async function saveAiModel(formData: FormData): Promise<void> {
  const { supabase } = await requireAdmin();
  const model = text(formData, "model");
  if (!isKnownModel(model)) throw new Error("Unknown model.");
  const { error } = await supabase
    .from("app_settings")
    .upsert({ key: "ai", value: { model }, updated_at: new Date().toISOString() }, { onConflict: "key" });
  if (error) throw new Error(error.message);
  revalidatePath("/playbook");
}

/** A BDR's own instructions, one per channel. */
export async function saveBdrInstructions(formData: FormData): Promise<void> {
  const { supabase, user } = await requireUser();
  const rows = CHANNELS.map((c) => ({
    profile_id: user.id,
    channel: c.key,
    instructions: text(formData, `instr_${c.key}`),
    updated_at: new Date().toISOString(),
  }));
  const { error } = await supabase.from("bdr_instructions").upsert(rows, { onConflict: "profile_id,channel" });
  if (error) throw new Error(error.message);
  revalidatePath("/preferences");
}

/** Creates an extension token. The plain token is returned once and never stored. */
export async function createExtensionToken(label: string): Promise<ActionResult<{ token: string }>> {
  try {
    const { supabase, user } = await requireUser();
    const token = `pw_${randomBytes(32).toString("hex")}`;
    const token_hash = createHash("sha256").update(token).digest("hex");
    const { error } = await supabase
      .from("extension_tokens")
      .insert({ profile_id: user.id, token_hash, label: label.trim() || "Chrome extension" });
    if (error) return fail(error.message);
    revalidatePath("/preferences");
    return { ok: true, token };
  } catch (e) {
    return fail(e);
  }
}

export async function revokeExtensionToken(id: string): Promise<void> {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("extension_tokens").update({ revoked: true }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/preferences");
}
