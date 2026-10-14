import { redirect } from "next/navigation";
import { getAiModel, getChannelPlaybooks, getCurrentProfile } from "@/lib/data";
import { savePlaybook, saveAiModel } from "@/lib/actions/playbook";
import { AI_MODELS } from "@/lib/ai/models";
import { CHANNELS } from "@/lib/channels";

export default async function PlaybookPage() {
  const me = await getCurrentProfile();
  if (me?.role !== "admin") redirect("/dashboard");

  const [playbooks, model] = await Promise.all([getChannelPlaybooks(), getAiModel()]);

  return (
    <div className="mx-auto max-w-3xl px-8 py-8">
      <h1 className="mb-1 text-2xl font-bold">AI Playbook</h1>
      <p className="mb-6 text-sm text-text-dim">
        Set the model and the instructions the AI follows for every channel. Each BDR can add their own instructions on top (under Preferences) —
        yours are the rules they work within.
      </p>

      <form action={saveAiModel} className="card mb-6">
        <h2 className="mb-1 text-base font-bold">AI model</h2>
        <p className="mb-3 text-xs text-text-faint">Used for every extract, draft and suggest across the team. Switch any time — it applies to the next generation.</p>
        <div className="flex gap-2">
          <select name="model" defaultValue={model} className="field-input">
            {AI_MODELS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label} — {m.note}
              </option>
            ))}
          </select>
          <button type="submit" className="btn-primary flex-none">
            Save
          </button>
        </div>
      </form>

      <div className="space-y-6">
        {CHANNELS.map((c) => {
          const pb = playbooks.find((p) => p.channel === c.key);
          const steps = pb?.steps ?? [];
          const rowCount = steps.length + 2;
          const save = async (fd: FormData) => {
            "use server";
            await savePlaybook(c.key, fd);
          };

          return (
            <form key={c.key} action={save} className="card space-y-4">
              <input type="hidden" name="step_count" value={rowCount} />
              <h2 className="text-base font-bold">{c.label}</h2>

              <div>
                <label className="field-label">Instructions for every message on this channel</label>
                <textarea
                  name="instructions"
                  defaultValue={pb?.instructions ?? ""}
                  rows={4}
                  className="field-input"
                  placeholder="Tone, do's and don'ts, what to always mention or never say…"
                />
              </div>

              <div>
                <div className="field-label">Sequence steps</div>
                <p className="mb-2 text-xs text-text-faint">
                  Each step becomes one message card. Change the order numbers to reorder; clear a step's name to remove it; use the empty rows to add.
                </p>
                <div className="space-y-3">
                  {Array.from({ length: rowCount }).map((_, i) => {
                    const s = steps[i];
                    return (
                      <div key={i} className="rounded-lg border border-border bg-bg p-3">
                        <input type="hidden" name={`step_key_${i}`} value={s?.key ?? ""} />
                        <div className="grid grid-cols-12 gap-2">
                          <input
                            name={`step_order_${i}`}
                            defaultValue={i + 1}
                            className="field-input col-span-1 px-2 text-center"
                            aria-label="Order"
                          />
                          <input
                            name={`step_label_${i}`}
                            defaultValue={s?.label ?? ""}
                            placeholder={s ? "Step name" : "New step name"}
                            className="field-input col-span-8"
                          />
                          <input
                            name={`step_max_${i}`}
                            defaultValue={s?.max_chars ?? ""}
                            placeholder="Max chars"
                            className="field-input col-span-3"
                          />
                          <input
                            name={`step_hint_${i}`}
                            defaultValue={s?.hint ?? ""}
                            placeholder="Timing / purpose shown to the BDR"
                            className="field-input col-span-12"
                          />
                          <textarea
                            name={`step_instruction_${i}`}
                            defaultValue={s?.instruction ?? ""}
                            rows={2}
                            placeholder="What the AI should do in this step"
                            className="field-input col-span-12"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <button type="submit" className="btn-primary">
                Save {c.label}
              </button>
            </form>
          );
        })}
      </div>
    </div>
  );
}
