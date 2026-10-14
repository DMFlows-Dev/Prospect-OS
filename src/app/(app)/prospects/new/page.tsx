import { getCampaigns, getIndustries, getProfiles, getServiceLines } from "@/lib/data";
import { createProspect } from "@/lib/actions/prospects";

export default async function NewProspectPage() {
  const [industries, serviceLines, campaigns, profiles] = await Promise.all([
    getIndustries(),
    getServiceLines(),
    getCampaigns(),
    getProfiles(),
  ]);

  return (
    <div className="min-w-0 flex-1 overflow-y-auto px-8 py-8">
      <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold">New prospect</h1>
      <div className="card">
        <form action={createProspect} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="field-label">Full name</label>
              <input name="name" required className="field-input" />
            </div>
            <div>
              <label className="field-label">Title</label>
              <input name="title" className="field-input" />
            </div>
            <div>
              <label className="field-label">Company</label>
              <input name="company" className="field-input" />
            </div>
            <div>
              <label className="field-label">LinkedIn profile URL</label>
              <input name="linkedin_url" className="field-input" placeholder="https://linkedin.com/in/…" />
            </div>
            <div>
              <label className="field-label">Company LinkedIn URL</label>
              <input name="linkedin_company_url" className="field-input" placeholder="https://linkedin.com/company/…" />
            </div>
            <div>
              <label className="field-label">Instagram URL</label>
              <input name="instagram_url" className="field-input" />
            </div>
            <div>
              <label className="field-label">Email</label>
              <input type="email" name="email" className="field-input" />
            </div>
            <div>
              <label className="field-label">Phone</label>
              <input name="phone" className="field-input" />
            </div>
            <div>
              <label className="field-label">Company website</label>
              <input name="company_website" className="field-input" />
            </div>

            <div>
              <label className="field-label">Industry</label>
              <select name="industry_id" className="field-input" defaultValue="">
                <option value="">—</option>
                {industries.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label">Service line</label>
              <select name="service_line_id" className="field-input" defaultValue="">
                <option value="">—</option>
                {serviceLines.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label">Campaign</label>
              <select name="campaign_id" className="field-input" defaultValue="">
                <option value="">—</option>
                {campaigns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label">Assigned BDR</label>
              <select name="assigned_bdr_id" className="field-input" defaultValue="">
                <option value="">Me</option>
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button type="submit" className="btn-primary">
            Add prospect
          </button>
        </form>
      </div>
      </div>
    </div>
  );
}
