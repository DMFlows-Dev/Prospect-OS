"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { logMessage } from "@/lib/actions/prospects";
import { CHANNELS } from "@/lib/channels";
import type { ChannelKey } from "@/types/database";

export function ChannelSelect({ channel }: { channel: ChannelKey }) {
  const router = useRouter();
  const pathname = usePathname();
  return (
    <div>
      <label className="field-label">Outreach channel</label>
      <select
        value={channel}
        onChange={(e) => router.replace(`${pathname}?channel=${e.target.value}`, { scroll: false })}
        className="field-input"
      >
        {CHANNELS.map((c) => (
          <option key={c.key} value={c.key}>
            {c.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function StepCard(props: {
  prospectId: string;
  channel: ChannelKey;
  index: number;
  stepKey: string;
  label: string;
  hint?: string;
  maxChars?: number;
  initialBody: string;
}) {
  const { prospectId, channel, index, stepKey, label, hint, maxChars, initialBody } = props;
  const router = useRouter();
  const [body, setBody] = useState(initialBody);
  const [copied, setCopied] = useState(false);
  const [logged, setLogged] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const over = maxChars ? body.length > maxChars : false;

  async function copy() {
    try {
      await navigator.clipboard.writeText(body);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setError("Couldn't copy — select the text and copy it manually.");
    }
  }

  function log() {
    setError(null);
    startTransition(async () => {
      const res = await logMessage({ prospectId, channel, stepKey, stepLabel: label, direction: "outbound", content: body });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setLogged(true);
      router.refresh();
    });
  }

  return (
    <div className="rounded-xl border border-border bg-bg p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wide text-text-faint">
            {index + 1} · {label}
          </div>
          {hint && <p className="mt-1 text-sm text-text-faint">{hint}</p>}
        </div>
        <button type="button" onClick={copy} className="btn flex-none">
          {copied ? "Copied" : "Copy"}
        </button>
      </div>

      <textarea
        value={body}
        onChange={(e) => {
          setBody(e.target.value);
          setLogged(false);
        }}
        rows={Math.min(10, Math.max(3, Math.ceil(body.length / 70)))}
        className="mt-3 w-full resize-y rounded-lg border border-border bg-surface px-3 py-2 font-mono text-[13px] leading-relaxed text-text focus:outline-none focus:ring-2 focus:ring-accent"
        placeholder="No draft yet — write one, or run Extract & draft."
      />

      <div className="mt-2 flex items-center justify-between">
        <span className={`font-mono text-xs ${over ? "text-danger" : "text-text-faint"}`}>
          {body.length}
          {maxChars ? ` / ${maxChars}` : ""} chars
        </span>
        <div className="flex items-center gap-3">
          {error && <span className="text-xs text-danger">{error}</span>}
          {logged && <span className="text-xs text-accent-dark">Logged to timeline</span>}
          <button type="button" onClick={log} disabled={pending || !body.trim()} className="btn">
            Log as sent
          </button>
        </div>
      </div>
    </div>
  );
}
