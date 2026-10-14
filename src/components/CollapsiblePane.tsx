"use client";

import { useEffect, useState } from "react";

/**
 * A side pane that can be folded away to a slim strip. The choice is
 * remembered in localStorage; it's read after mount so the server HTML and
 * the first client render always match.
 */
export function CollapsiblePane({
  side,
  label,
  storageKey,
  expandedClassName,
  contentClassName,
  children,
}: {
  side: "left" | "right";
  label: string;
  storageKey: string;
  expandedClassName: string;
  contentClassName: string;
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(window.localStorage.getItem(storageKey) === "1");
    } catch {
      /* storage unavailable — stay expanded */
    }
  }, [storageKey]);

  function toggle(next: boolean) {
    setCollapsed(next);
    try {
      window.localStorage.setItem(storageKey, next ? "1" : "0");
    } catch {
      /* ignore */
    }
  }

  // Arrow points the way the pane will move.
  const hideArrow = side === "left" ? "‹" : "›";
  const showArrow = side === "left" ? "›" : "‹";
  const edge = side === "left" ? "border-r" : "border-l";

  if (collapsed) {
    return (
      <aside className={`flex w-10 flex-none flex-col items-center gap-3 ${edge} border-border bg-surface py-3`}>
        <button
          type="button"
          onClick={() => toggle(false)}
          title={`Show ${label}`}
          aria-label={`Show ${label}`}
          className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-bg text-base text-text-dim hover:bg-surface-2 hover:text-text"
        >
          {showArrow}
        </button>
        <span className="text-xs font-medium text-text-faint [writing-mode:vertical-rl]">{label}</span>
      </aside>
    );
  }

  return (
    <aside className={`relative flex flex-none flex-col ${expandedClassName}`}>
      <button
        type="button"
        onClick={() => toggle(true)}
        title={`Hide ${label}`}
        aria-label={`Hide ${label}`}
        className="absolute right-2 top-3 z-10 flex h-7 w-7 items-center justify-center rounded-md border border-border bg-bg text-base text-text-dim hover:bg-surface-2 hover:text-text"
      >
        {hideArrow}
      </button>
      <div className={`min-h-0 flex-1 ${contentClassName}`}>{children}</div>
    </aside>
  );
}
