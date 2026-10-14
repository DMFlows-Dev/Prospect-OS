import Link from "next/link";
import { getCurrentProfile, getProspects } from "@/lib/data";

export default async function ProspectsPage() {
  const [prospects, me] = await Promise.all([getProspects(), getCurrentProfile()]);
  const qualified = prospects.filter((p) => p.qualification_status === "qualified").length;
  const interested = prospects.filter((p) => p.qualification_status === "interested").length;

  return (
    <div className="min-w-0 flex-1 overflow-y-auto px-8 py-8">
      <h1 className="text-2xl font-bold">{me?.role === "bdr" ? "My prospects" : "All prospects"}</h1>
      <p className="mt-1 text-sm text-text-dim">Pick a prospect from the list to open their workspace, or add new ones.</p>

      <div className="mt-6 grid max-w-xl grid-cols-3 gap-4">
        <div className="card">
          <div className="text-2xl font-bold tabular-nums">{prospects.length}</div>
          <div className="text-xs text-text-faint">Prospects</div>
        </div>
        <div className="card">
          <div className="text-2xl font-bold tabular-nums">{interested}</div>
          <div className="text-xs text-text-faint">Interested</div>
        </div>
        <div className="card">
          <div className="text-2xl font-bold tabular-nums">{qualified}</div>
          <div className="text-xs text-text-faint">Qualified</div>
        </div>
      </div>

      <div className="mt-6 flex gap-3">
        <Link href="/prospects/new" className="btn-primary">
          + New prospect
        </Link>
        <Link href="/prospects/import" className="btn">
          Import CSV
        </Link>
      </div>
    </div>
  );
}
