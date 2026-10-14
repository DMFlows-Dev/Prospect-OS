"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createExtensionToken, revokeExtensionToken } from "@/lib/actions/playbook";
import { LocalTime } from "@/components/LocalTime";
import type { ExtensionToken } from "@/types/database";

export function ExtensionTokenPanel({ tokens }: { tokens: ExtensionToken[] }) {
  const router = useRouter();
  const [origin, setOrigin] = useState("");
  const [fresh, setFresh] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => setOrigin(window.location.origin), []);

  function create() {
    setError(null);
    startTransition(async () => {
      const res = await createExtensionToken("Chrome extension");
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setFresh(res.token);
      router.refresh();
    });
  }

  return (
    <div className="card">
      <h2 className="mb-1 text-base font-bold">Chrome extension</h2>
      <p className="mb-4 text-sm text-text-dim">
        The extension captures the LinkedIn page you're viewing — only when you click Capture — and sends it to the prospect you opened it from.
      </p>

      <ol className="mb-4 list-decimal space-y-1 pl-5 text-sm text-text-dim">
        <li>
          Load the <code className="rounded bg-bg px-1.5 py-0.5 text-xs">extension</code> folder in Chrome (chrome://extensions → Developer mode → Load unpacked).
        </li>
        <li>Create a token below and paste it, with the App URL, into the extension's settings.</li>
        <li>On a prospect, click Open ↗ next to their LinkedIn URL, then Capture in the extension.</li>
      </ol>

      <div className="mb-4 rounded-lg border border-border bg-bg px-3 py-2 text-sm">
        <span className="text-text-faint">App URL: </span>
        <code className="text-text">{origin || "…"}</code>
      </div>

      {fresh && (
        <div className="mb-4 rounded-lg border border-accent/40 bg-accent-soft p-3">
          <p className="mb-2 text-xs text-accent-dark">Copy this token now — it won't be shown again.</p>
          <div className="flex gap-2">
            <input readOnly value={fresh} className="field-input font-mono text-xs" onFocus={(e) => e.currentTarget.select()} />
            <button type="button" className="btn flex-none" onClick={() => navigator.clipboard.writeText(fresh)}>
              Copy
            </button>
          </div>
        </div>
      )}

      <button type="button" onClick={create} disabled={pending} className="btn-primary">
        Create token
      </button>
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}

      {tokens.length > 0 && (
        <ul className="mt-4 divide-y divide-border text-sm">
          {tokens.map((t) => (
            <li key={t.id} className="flex items-center justify-between py-2">
              <div>
                <div className="font-medium">{t.label ?? "Chrome extension"}</div>
                <div className="text-xs text-text-faint">
                  Created <LocalTime iso={t.created_at} dateOnly /> ·{" "}
                  {t.last_used_at ? (
                    <>
                      last used <LocalTime iso={t.last_used_at} />
                    </>
                  ) : (
                    "never used"
                  )}
                </div>
              </div>
              <button
                type="button"
                className="text-xs font-medium text-danger hover:underline"
                onClick={() =>
                  startTransition(async () => {
                    await revokeExtensionToken(t.id);
                    router.refresh();
                  })
                }
              >
                Revoke
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
