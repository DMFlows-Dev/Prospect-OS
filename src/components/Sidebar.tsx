import Link from "next/link";
import type { Profile } from "@/types/database";
import { SignOutButton } from "@/components/SignOutButton";

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/prospects", label: "Prospects" },
  { href: "/campaigns", label: "Campaigns" },
  { href: "/team", label: "Team", adminOnly: true },
  { href: "/settings", label: "Settings", adminOnly: true },
];

export function Sidebar({ profile }: { profile: Profile }) {
  const items = NAV.filter((item) => !item.adminOnly || profile.role === "admin");

  return (
    <aside className="flex w-56 flex-none flex-col border-r border-border bg-surface">
      <div className="flex items-center gap-2 border-b border-border px-4 py-4">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent font-bold text-white">P</div>
        <div>
          <div className="text-sm font-bold leading-tight">Prospecting OS</div>
          <div className="text-[10px] text-text-faint">DM Flows</div>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 p-2">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="block rounded-lg px-3 py-2 text-sm font-medium text-text-dim hover:bg-surface-2 hover:text-text"
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="border-t border-border p-3">
        <div className="mb-2 truncate text-xs text-text-dim">
          <div className="font-medium text-text">{profile.name}</div>
          <div className="capitalize text-text-faint">{profile.role}</div>
        </div>
        <SignOutButton />
      </div>
    </aside>
  );
}
