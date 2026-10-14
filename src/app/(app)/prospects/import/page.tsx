import { getCampaigns } from "@/lib/data";
import { importProspects } from "@/lib/actions/prospects";

export default async function ImportProspectsPage({
  searchParams,
}: {
  searchParams: Promise<{ done?: string; dupes?: string; skipped?: string; error?: string }>;
}) {
  const sp = await searchParams;
  const campaigns = await getCampaigns();

  return (
    <div className="min-w-0 flex-1 overflow-y-auto px-8 py-8">
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-1 text-2xl font-bold">Import prospects</h1>
        <p className="mb-6 text-sm text-text-dim">
          Upload a CSV (up to 500 rows). They're added to your list as New Prospect. Rows whose LinkedIn URL you already have are skipped.
        </p>

        {sp.error && <div className="mb-4 rounded-lg border border-danger/40 bg-danger-soft px-4 py-3 text-sm text-danger">{sp.error}</div>}
        {sp.done && (
          <div className="mb-4 rounded-lg border border-accent/40 bg-accent-soft px-4 py-3 text-sm text-accent-dark">
            Imported {sp.done} prospect{sp.done === "1" ? "" : "s"}.
            {Number(sp.dupes) > 0 && ` ${sp.dupes} skipped as duplicates.`}
            {Number(sp.skipped) > 0 && ` ${sp.skipped} skipped for having no name.`}
          </div>
        )}

        <form action={importProspects} className="card space-y-4">
          <div>
            <label className="field-label">CSV file</label>
            <input type="file" name="file" accept=".csv,text/csv" className="field-input" />
          </div>
          <div>
            <label className="field-label">…or paste CSV text</label>
            <textarea name="csv" rows={6} className="field-input font-mono" placeholder={"name,title,company,website,linkedin_url\nSara Gable,Fractional CMO,Keystone Marketing,keystone.com,https://www.linkedin.com/in/sara"} />
          </div>
          <div>
            <label className="field-label">Add to campaign (optional)</label>
            <select name="campaign_id" defaultValue="" className="field-input">
              <option value="">—</option>
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className="btn-primary">
            Import
          </button>
        </form>

        <div className="card mt-4 text-sm text-text-dim">
          <h2 className="mb-2 text-sm font-bold text-text">Columns it understands</h2>
          <p>
            The first row must be a header. Recognised (case-insensitive) columns: <b>name</b> (or <b>first name</b> + <b>last name</b>), <b>title</b>,{" "}
            <b>company</b>, <b>website</b>, <b>linkedin url</b>, <b>company linkedin url</b>, <b>email</b>, <b>phone</b>. Anything else is ignored.
          </p>
        </div>
      </div>
    </div>
  );
}
