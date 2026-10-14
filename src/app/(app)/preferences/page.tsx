import { getBdrInstructions, getChannelPlaybooks, getCurrentProfile, getExtensionTokens } from "@/lib/data";
import { saveBdrInstructions } from "@/lib/actions/playbook";
import { CHANNELS } from "@/lib/channels";
import { ExtensionTokenPanel } from "@/components/ExtensionTokenPanel";

export default async function PreferencesPage() {
  const me = await getCurrentProfile();
  if (!me) return null;

  const [mine, playbooks, tokens] = await Promise.all([getBdrInstructions(me.id), getChannelPlaybooks(), getExtensionTokens(me.id)]);

  return (
    <div className="mx-auto max-w-3xl px-8 py-8">
      <h1 className="mb-1 text-2xl font-bold">Preferences</h1>
      <p className="mb-6 text-sm text-text-dim">Your own instructions for the AI, and the Chrome extension setup.</p>

      <form action={saveBdrInstructions} className="card mb-6 space-y-5">
        <div>
          <h2 className="text-base font-bold">My AI instructions</h2>
          <p className="mt-1 text-xs text-text-faint">
            Added on top of the admin's rules for each channel — your voice, your do's and don'ts. Leave blank to use the defaults.
          </p>
        </div>

        {CHANNELS.map((c) => {
          const admin = playbooks.find((p) => p.channel === c.key)?.instructions;
          return (
            <div key={c.key}>
              <label className="field-label">{c.label}</label>
              {admin && (
                <p className="mb-1.5 rounded-lg border border-border bg-bg px-3 py-2 text-xs text-text-faint">
                  <span className="font-semibold text-text-dim">Admin rule:</span> {admin}
                </p>
              )}
              <textarea
                name={`instr_${c.key}`}
                defaultValue={mine.find((m) => m.channel === c.key)?.instructions ?? ""}
                rows={3}
                className="field-input"
                placeholder="e.g. Keep it casual, never use exclamation marks, mention I'm based in Karachi…"
              />
            </div>
          );
        })}

        <button type="submit" className="btn-primary">
          Save instructions
        </button>
      </form>

      <ExtensionTokenPanel tokens={tokens} />
    </div>
  );
}
