import Link from "next/link";
import { getCampaigns, getIndustries, getProfiles, getServiceLines } from "@/lib/data";

export default async function CampaignsPage() {
  const [campaigns, industries, serviceLines, profiles] = await Promise.all([
    getCampaigns(),
    getIndustries(true),
    getServiceLines(true),
    getProfiles(),
  ]);

  const industryName = (id: string | null) => industries.find((i) => i.id === id)?.name ?? "—";
  const serviceLineName = (id: string | null) => serviceLines.find((s) => s.id === id)?.name ?? "—";
  const bdrName = (id: string | null) => profiles.find((p) => p.id === id)?.name ?? "Unassigned";

  return (
    <div className="mx-auto max-w-5xl px-8 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Campaigns</h1>
          <p className="mt-1 text-sm text-text-dim">Target industries, ICPs, service lines, and outreach channels.</p>
        </div>
        <Link href="/campaigns/new" className="btn-primary">
          + New campaign
        </Link>
      </div>

      {campaigns.length === 0 ? (
        <div className="card text-center">
          <p className="text-sm text-text-dim">No campaigns yet. Create the first one to start assigning prospects.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-surface-2 text-xs uppercase tracking-wide text-text-faint">
              <tr>
                <th className="px-4 py-2 text-left">Name</th>
                <th className="px-4 py-2 text-left">Industry</th>
                <th className="px-4 py-2 text-left">Service line</th>
                <th className="px-4 py-2 text-left">Channel</th>
                <th className="px-4 py-2 text-left">BDR</th>
                <th className="px-4 py-2 text-left">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-surface">
              {campaigns.map((c) => (
                <tr key={c.id} className="hover:bg-surface-2">
                  <td className="px-4 py-3">
                    <Link href={`/campaigns/${c.id}`} className="font-medium text-text hover:text-accent-dark">
                      {c.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-text-dim">{industryName(c.industry_id)}</td>
                  <td className="px-4 py-3 text-text-dim">{serviceLineName(c.service_line_id)}</td>
                  <td className="px-4 py-3 text-text-dim">{c.channel ?? "—"}</td>
                  <td className="px-4 py-3 text-text-dim">{bdrName(c.assigned_bdr_id)}</td>
                  <td className="px-4 py-3">
                    <span className="pill bg-surface-2 text-text-dim capitalize">{c.status}</span>
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
