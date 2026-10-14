"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import { StagePill } from "@/components/StagePill";
import type { LifecycleStage } from "@/types/database";

export type RailItem = {
  id: string;
  name: string;
  title: string | null;
  company: string | null;
  stage: LifecycleStage | null;
};

function initials(name: string) {
  const parts = name.replace(/[^\p{L}\s]/gu, "").trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "?") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

export function ProspectRail({ items }: { items: RailItem[] }) {
  const pathname = usePathname();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) => `${i.name} ${i.company ?? ""} ${i.title ?? ""}`.toLowerCase().includes(q));
  }, [items, query]);

  return (
    <aside className="flex w-72 flex-none flex-col border-r border-border bg-bg">
      <div className="p-3">
        <div className="mb-2 text-[11px] font-medium uppercase tracking-wide text-text-faint">Prospects · {items.length}</div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search prospects…"
          className="field-input"
        />
      </div>

      <div className="flex-1 space-y-1 overflow-y-auto px-2 pb-2">
        {filtered.length === 0 && (
          <p className="px-2 py-6 text-center text-xs text-text-faint">
            {items.length === 0 ? "No prospects yet." : "No matches."}
          </p>
        )}
        {filtered.map((p) => {
          const active = pathname === `/prospects/${p.id}`;
          return (
            <Link
              key={p.id}
              href={`/prospects/${p.id}`}
              className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 ${
                active ? "border-accent/50 bg-accent-soft" : "border-transparent hover:bg-surface"
              }`}
            >
              <div className="flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-surface-2 text-xs font-bold text-text-dim">
                {initials(p.name)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">{p.name}</div>
                <div className="truncate text-xs text-text-faint">{[p.title, p.company].filter(Boolean).join(" · ") || "—"}</div>
              </div>
              <div className="flex-none scale-90 origin-right">
                <StagePill stage={p.stage} />
              </div>
            </Link>
          );
        })}
      </div>

      <div className="space-y-2 border-t border-border p-3">
        <Link href="/prospects/new" className="btn-primary w-full justify-center">
          + New prospect
        </Link>
        <Link href="/prospects/import" className="btn w-full justify-center">
          Import CSV
        </Link>
      </div>
    </aside>
  );
}
