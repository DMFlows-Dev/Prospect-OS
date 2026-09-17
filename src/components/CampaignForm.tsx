import type { Campaign, Industry, Profile, ServiceLine } from "@/types/database";

const CHANNELS: { value: string; label: string }[] = [
  { value: "email", label: "Email" },
  { value: "linkedin_connection", label: "LinkedIn Connection Request" },
  { value: "linkedin_message", label: "LinkedIn Messages" },
  { value: "linkedin_inmail", label: "LinkedIn InMail" },
  { value: "instagram_dm", label: "Instagram DM" },
];

const STATUSES = ["draft", "active", "paused", "completed", "archived"];

export function CampaignForm({
  campaign,
  industries,
  serviceLines,
  profiles,
  action,
  submitLabel,
}: {
  campaign?: Campaign | null;
  industries: Industry[];
  serviceLines: ServiceLine[];
  profiles: Profile[];
  action: (formData: FormData) => void;
  submitLabel: string;
}) {
  return (
    <form action={action} className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="field-label">Campaign name</label>
          <input name="name" defaultValue={campaign?.name} required className="field-input" placeholder="PPC Agencies — Klaviyo White Label Partnership" />
        </div>

        <div>
          <label className="field-label">Assigned BDR</label>
          <select name="assigned_bdr_id" defaultValue={campaign?.assigned_bdr_id ?? ""} className="field-input">
            <option value="">Unassigned</option>
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="field-label">Status</label>
          <select name="status" defaultValue={campaign?.status ?? "draft"} className="field-input">
            {STATUSES.map((s) => (
              <option key={s} value={s} className="capitalize">
                {s}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="field-label">Industry</label>
          <select name="industry_id" defaultValue={campaign?.industry_id ?? ""} className="field-input">
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
          <select name="service_line_id" defaultValue={campaign?.service_line_id ?? ""} className="field-input">
            <option value="">—</option>
            {serviceLines.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div className="col-span-2">
          <label className="field-label">Outreach channel</label>
          <select name="channel" defaultValue={campaign?.channel ?? ""} className="field-input">
            <option value="">—</option>
            {CHANNELS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        <div className="col-span-2">
          <label className="field-label">ICP description</label>
          <textarea name="icp_description" defaultValue={campaign?.icp_description ?? ""} rows={3} className="field-input" />
        </div>

        <div>
          <label className="field-label">Target company size</label>
          <input name="target_company_size" defaultValue={campaign?.target_company_size ?? ""} className="field-input" placeholder="e.g. 10–50 employees" />
        </div>
        <div>
          <label className="field-label">Target location</label>
          <input name="target_location" defaultValue={campaign?.target_location ?? ""} className="field-input" placeholder="e.g. US, UK" />
        </div>
        <div className="col-span-2">
          <label className="field-label">Target job titles</label>
          <input name="target_job_titles" defaultValue={campaign?.target_job_titles ?? ""} className="field-input" placeholder="e.g. Founder, VP Marketing, Head of Growth" />
        </div>

        <div className="col-span-2">
          <label className="field-label">Objective</label>
          <input name="objective" defaultValue={campaign?.objective ?? ""} className="field-input" placeholder="e.g. Book 10 discovery calls this quarter" />
        </div>

        <div>
          <label className="field-label">Start date</label>
          <input type="date" name="start_date" defaultValue={campaign?.start_date ?? ""} className="field-input" />
        </div>
        <div>
          <label className="field-label">End date</label>
          <input type="date" name="end_date" defaultValue={campaign?.end_date ?? ""} className="field-input" />
        </div>

        <div className="col-span-2">
          <label className="field-label">AI instructions</label>
          <textarea
            name="ai_instructions"
            defaultValue={campaign?.ai_instructions ?? ""}
            rows={3}
            className="field-input"
            placeholder="Anything specific the AI should keep in mind when researching or drafting for this campaign."
          />
        </div>

        <div className="col-span-2">
          <label className="field-label">Notes</label>
          <textarea name="notes" defaultValue={campaign?.notes ?? ""} rows={2} className="field-input" />
        </div>
      </div>

      <button type="submit" className="btn-primary">
        {submitLabel}
      </button>
    </form>
  );
}
