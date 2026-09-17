import Link from "next/link";
import { getCampaigns, getCurrentProfile, getLifecycleStages, getProfiles, getProspects } from "@/lib/data";
import { StagePill } from "@/components/StagePill";

export default async function ProspectsPage() {
  const [prospects, stages, campaigns, profiles, me] = await Promise.all([
    getProspects(),
    getLifecycleStages(true),
    getCampaigns(),
    getProfiles(),
    getCurrentProfile(),
  ]);

  const stageById = new Map(stages.map((s) => [s.id, s]));
  const campaignById = new Map(campaigns.map((c) => [c.id, c]));
  const bdrById = new Map(profiles.map((p) => [p.id, p]));

  return (
    <div className="mx-auto max-w-6xl px-8 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{me?.role === "bdr" ? "My prospects" : "All prospects"}</h1>
          <p className="mt-1 text-sm text-text-dim">
            {prospects.length} prospect{prospects.length === 1 ? "" : "s"} visible to you.
          </p>
        </div>
        <Link href="/prospects/new" className="btn-primary">
          + New prospect
        </Link>
      </div>

      {prospects.length === 0 ? (
        <div className="card text-center">
          <p className="text-sm text-text-dim">No prospects yet. Add the first one, or import a list once CSV import ships.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-surface-2 text-xs uppercase tracking-wide text-text-faint">
              <tr>
                <th className="px-4 py-2 text-left">Name</th>
                <th className="px-4 py-2 text-left">Company</th>
                <th className="px-4 py-2 text-left">Campaign</th>
                <th className="px-4 py-2 text-left">BDR</th>
                <th className="px-4 py-2 text-left">Stage</th>
                <th className="px-4 py-2 text-left">Qualification</th>
                <th className="px-4 py-2 text-left">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-surface">
              {prospects.map((p) => (
                <tr key={p.id} className="hover:bg-surface-2">
                  <td className="px-4 py-3">
                    <Link href={`/prospects/${p.id}`} className="font-medium text-text hover:text-accent-dark">
                      {p.name}
                    </Link>
                    {p.title && <div className="text-xs text-text-faint">{p.title}</div>}
                  </td>
                  <td className="px-4 py-3 text-text-dim">{p.company ?? "—"}</td>
                  <td className="px-4 py-3 text-text-dim">
                    {p.campaign_id ? campaignById.get(p.campaign_id)?.name ?? "—" : "—"}
                  </td>
                  <td className="px-4 py-3 text-text-dim">
                    {p.assigned_bdr_id ? bdrById.get(p.assigned_bdr_id)?.name ?? "—" : "Unassigned"}
                  </td>
                  <td className="px-4 py-3">
                    <StagePill stage={p.lifecycle_stage_id ? stageById.get(p.lifecycle_stage_id) : null} />
                  </td>
                  <td className="px-4 py-3 text-text-dim capitalize">{p.qualification_status}</td>
                  <td className="px-4 py-3 text-text-faint">
                    {new Date(p.updated_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
