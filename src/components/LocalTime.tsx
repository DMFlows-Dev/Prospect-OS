"use client";

import { useEffect, useState } from "react";

/**
 * Formats a timestamp in the viewer's own locale and timezone. It renders
 * nothing on the server and fills in after mount, so the server HTML and the
 * browser can never disagree (which causes hydration errors).
 */
export function LocalTime({ iso, dateOnly = false }: { iso: string; dateOnly?: boolean }) {
  const [text, setText] = useState("");

  useEffect(() => {
    const d = new Date(iso);
    setText(
      dateOnly
        ? d.toLocaleDateString()
        : d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
    );
  }, [iso, dateOnly]);

  return <span suppressHydrationWarning>{text}</span>;
}
