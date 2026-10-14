"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteProspect, logMessage, setProspectStage } from "@/lib/actions/prospects";
import { suggestNextMessage } from "@/lib/actions/ai";
import type { ChannelKey, LifecycleStage } from "@/types/database";

export function StageSelect({ prospectId, stages, currentId }: { prospectId: string; stages: LifecycleStage[]; currentId: string | null }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="min-w-[200px]">
      <select
        value={currentId ?? ""}
        disabled={pending}
        onChange={(e) => {
          const next = e.target.value;
          if (!next) return;
          setError(null);
          startTransition(async () => {
            const res = await setProspectStage(prospectId, next);
            if (!res.ok) setError(res.error);
            router.refresh();
          });
        }}
        className="field-input"
        aria-label="Lifecycle stage"
      >
        {!currentId && <option value="">Set stage…</option>}
        {stages.map((s) => (
          <option key={s.id} value={s.id}>
            {s.label}
          </option>
        ))}
      </select>
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  );
}

export function SuggestBox({ prospectId, channel }: { prospectId: string; channel: ChannelKey }) {
  const [text, setText] = useState("");
  const [msg, setMsg] = useState<{ tone: "error" | "info"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  function suggest() {
    setMsg({ tone: "info", text: "Reading the timeline…" });
    startTransition(async () => {
      const res = await suggestNextMessage(prospectId, channel);
      if (!res.ok) {
        setMsg({ tone: "error", text: res.error });
        return;
      }
      setText(res.text);
      setMsg(null);
    });
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold">Draft next message</h3>
        <button type="button" onClick={suggest} disabled={pending} className="btn-primary">
          {pending ? "Thinking…" : "Suggest"}
        </button>
      </div>
      <p className="mt-2 text-xs text-text-faint">Reads the timeline and drafts whatever should go out next.</p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={5}
        placeholder="Suggested draft appears here…"
        className="field-input mt-3"
      />
      {msg && <p className={`mt-2 text-xs ${msg.tone === "error" ? "text-danger" : "text-text-dim"}`}>{msg.text}</p>}
      {text && (
        <button type="button" className="btn mt-2" onClick={() => navigator.clipboard.writeText(text)}>
          Copy
        </button>
      )}
    </div>
  );
}

export function LogMessageForm({
  prospectId,
  channel,
  stepOptions,
}: {
  prospectId: string;
  channel: ChannelKey;
  stepOptions: { key: string; label: string }[];
}) {
  const router = useRouter();
  const [stepKey, setStepKey] = useState(stepOptions[0]?.key ?? "note");
  const [content, setContent] = useState("");
  const [msg, setMsg] = useState<{ tone: "error" | "ok"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const options = [...stepOptions, { key: "follow_up", label: "Follow-up" }, { key: "note", label: "Note" }];

  function submit(direction: "outbound" | "inbound") {
    const label = options.find((o) => o.key === stepKey)?.label;
    startTransition(async () => {
      const res = await logMessage({ prospectId, channel, stepKey, stepLabel: label, direction, content });
      if (!res.ok) {
        setMsg({ tone: "error", text: res.error });
        return;
      }
      setContent("");
      setMsg({ tone: "ok", text: direction === "outbound" ? "Logged as sent." : "Reply logged." });
      router.refresh();
    });
  }

  return (
    <div className="card">
      <h3 className="mb-3 text-sm font-bold">Log a message</h3>
      <select value={stepKey} onChange={(e) => setStepKey(e.target.value)} className="field-input">
        {options.map((o) => (
          <option key={o.key} value={o.key}>
            {o.label}
          </option>
        ))}
      </select>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={4}
        placeholder="Paste what was sent, or what they replied…"
        className="field-input mt-3"
      />
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" disabled={pending} onClick={() => submit("outbound")} className="btn">
          Log as sent by me
        </button>
        <button type="button" disabled={pending} onClick={() => submit("inbound")} className="btn-primary">
          Log their reply
        </button>
      </div>
      {msg && <p className={`mt-2 text-xs ${msg.tone === "error" ? "text-danger" : "text-accent-dark"}`}>{msg.text}</p>}
    </div>
  );
}

export function DeleteProspectButton({ prospectId, name }: { prospectId: string; name: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      title="Delete prospect"
      onClick={() => {
        if (!window.confirm(`Delete ${name}? This removes their timeline and drafts too.`)) return;
        startTransition(async () => {
          await deleteProspect(prospectId);
        });
      }}
      className="btn text-danger"
    >
      Delete
    </button>
  );
}
