import { notFound } from "next/navigation";
import {
  getActivities,
  getCampaigns,
  getHubspotSyncLogs,
  getIndustries,
  getLifecycleHistory,
  getLifecycleStages,
  getProfiles,
  getProspect,
  getQualification,
  getServiceLines,
} from "@/lib/data";
import { changeLifecycleStage, logActivity, markQualified, updateProspectFields } from "@/lib/actions/prospects";
import { StagePill } from "@/components/StagePill";

const ACTIVITY_TYPES: { value: string; label: string }[] = [
  { value: "connection_sent", label: "Connection request sent" },
  { value: "connection_accepted", label: "Connection accepted" },
  { value: "message_sent", label: "LinkedIn message sent" },
  { value: "message_received", label: "LinkedIn message received" },
  { value: "inmail_sent", label: "InMail sent" },
  { value: "inmail_received", label: "InMail received" },
  { value: "email_sent", label: "Email sent" },
  { value: "email_replied", label: "Email replied" },
  { value: "instagram_dm_sent", label: "Instagram DM sent" },
  { value: "instagram_dm_received", label: "Instagram DM received" },
  { value: "follow_up_sent", label: "Follow-up sent" },
  { value: "call_completed", label: "Call completed" },
  { value: "meeting_scheduled", label: "Meeting scheduled" },
  { value: "note_added", label: "Note" },
];

function fmt(iso: string) {
  return new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export default async function ProspectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [prospect, activities, history, qualification, syncLogs, stages, industries, serviceLines, campaigns, profiles] =
    await Promise.all([
      getProspect(id),
      getActivities(id),
      getLifecycleHistory(id),
      getQualification(id),
      getHubspotSyncLogs(id),
      getLifecycleStages(),
      getIndustries(),
      getServiceLines(),
      getCampaigns(),
      getProfiles(),
    ]);

  if (!prospect) notFound();

  const stageById = new Map(stages.map((s) => [s.id, s]));
  const currentStage = prospect.lifecycle_stage_id ? stageById.get(prospect.lifecycle_stage_id) : null;

  const boundUpdateFields = async (formData: FormData) => {
    "use server";
    await updateProspectFields(id, formData);
  };
  const boundLogActivity = async (formData: FormData) => {
    "use server";
    await logActivity(id, formData);
  };
  const boundMarkQualified = async (formData: FormData) => {
    "use server";
    await markQualified(id, formData);
  };
  const boundChangeStage = async (formData: FormData) => {
    "use server";
    const newStageId = String(formData.get("lifecycle_stage_id") ?? "");
    if (!newStageId) return;
    await changeLifecycleStage(id, newStageId, "Manual update by BDR");
  };

  return (
    <div className="mx-auto grid max-w-6xl grid-cols-3 gap-6 px-8 py-8">
      {/* Left: profile + editable fields */}
      <div className="col-span-1 space-y-4">
        <div className="card">
          <h1 className="text-lg font-bold">{prospect.name}</h1>
          {prospect.title && <p className="text-sm text-text-dim">{prospect.title}</p>}
          {prospect.company && <p className="text-sm text-text-dim">{prospect.company}</p>}
          <div className="mt-3">
            <StagePill stage={currentStage} />
          </div>
          <div className="mt-3 space-y-1 text-xs text-text-faint">
            {prospect.linkedin_url && (
              <div>
                <a href={prospect.linkedin_url} target="_blank" rel="noreferrer" className="hover:text-accent-dark">
                  LinkedIn ↗
                </a>
              </div>
            )}
            {prospect.email && <div>{prospect.email}</div>}
          </div>
        </div>

        <div className="card">
          <h3 className="mb-3 text-sm font-bold">Move lifecycle stage</h3>
          <form action={boundChangeStage} className="flex gap-2">
            <select name="lifecycle_stage_id" defaultValue={prospect.lifecycle_stage_id ?? ""} className="field-input">
              {stages.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
            <button type="submit" className="btn">
              Update
            </button>
          </form>
          <p className="mt-2 text-xs text-text-faint">Every change here is logged in the history below.</p>
        </div>

        <div className="card">
          <h3 className="mb-3 text-sm font-bold">Profile</h3>
          <form action={boundUpdateFields} className="space-y-3">
            <div>
              <label className="field-label">Name</label>
              <input name="name" defaultValue={prospect.name} className="field-input" />
            </div>
            <div>
              <label className="field-label">Title</label>
              <input name="title" defaultValue={prospect.title ?? ""} className="field-input" />
            </div>
            <div>
              <label className="field-label">Company</label>
              <input name="company" defaultValue={prospect.company ?? ""} className="field-input" />
            </div>
            <div>
              <label className="field-label">LinkedIn URL</label>
              <input name="linkedin_url" defaultValue={prospect.linkedin_url ?? ""} className="field-input" />
            </div>
            <div>
              <label className="field-label">Email</label>
              <input name="email" defaultValue={prospect.email ?? ""} className="field-input" />
            </div>
            <div>
              <label className="field-label">Industry</label>
              <select name="industry_id" defaultValue={prospect.industry_id ?? ""} className="field-input">
                <option value="">—</option>
                {industries.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label">Assigned BDR</label>
              <select name="assigned_bdr_id" defaultValue={prospect.assigned_bdr_id ?? ""} className="field-input">
                <option value="">Unassigned</option>
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label">Pain points</label>
              <textarea name="pain_points" defaultValue={prospect.pain_points ?? ""} rows={2} className="field-input" />
            </div>
            <button type="submit" className="btn">
              Save
            </button>
          </form>
        </div>

        {prospect.hubspot_contact_id ? (
          <div className="card">
            <h3 className="mb-1 text-sm font-bold">HubSpot</h3>
            <p className="text-xs text-text-dim">Synced — contact {prospect.hubspot_contact_id}</p>
          </div>
        ) : (
          <div className="card">
            <h3 className="mb-1 text-sm font-bold">HubSpot</h3>
            <p className="text-xs text-text-faint">Not synced yet. Sync ships in Phase 4.</p>
          </div>
        )}
      </div>

      {/* Right: qualify + timeline */}
      <div className="col-span-2 space-y-4">
        {prospect.qualification_status === "unqualified" || prospect.qualification_status === "interested" ? (
          <div className="card">
            <h3 className="mb-1 text-sm font-bold">Mark interested or qualified</h3>
            <p className="mb-3 text-xs text-text-faint">
              Every field below is optional — leave anything unknown blank rather than guessing.
            </p>
            <form action={boundMarkQualified} className="space-y-3">
              <div className="flex gap-4 text-sm">
                <label className="flex items-center gap-1.5">
                  <input type="radio" name="qualification_status" value="interested" defaultChecked /> Interested
                </label>
                <label className="flex items-center gap-1.5">
                  <input type="radio" name="qualification_status" value="qualified" /> Qualified
                </label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input name="pain_point" placeholder="Pain point" className="field-input" />
                <input name="service_of_interest" placeholder="Service of interest" className="field-input" />
                <input name="budget" placeholder="Budget (if known)" className="field-input" />
                <input name="timeline" placeholder="Timeline (if known)" className="field-input" />
                <input name="decision_maker_status" placeholder="Decision-maker status" className="field-input" />
                <input name="next_action" placeholder="Next action" className="field-input" />
              </div>
              <textarea name="notes" placeholder="Qualification notes" rows={2} className="field-input" />
              <button type="submit" className="btn-primary">
                Mark lead
              </button>
            </form>
          </div>
        ) : (
          <div className="card">
            <h3 className="text-sm font-bold">
              Marked <span className="capitalize">{prospect.qualification_status}</span>
            </h3>
            {qualification && (
              <div className="mt-2 space-y-1 text-sm text-text-dim">
                {qualification.pain_point && <p><b>Pain point:</b> {qualification.pain_point}</p>}
                {qualification.service_of_interest && <p><b>Interested in:</b> {qualification.service_of_interest}</p>}
                {qualification.next_action && <p><b>Next action:</b> {qualification.next_action}</p>}
                {qualification.notes && <p className="text-text-faint">{qualification.notes}</p>}
              </div>
            )}
          </div>
        )}

        <div className="card">
          <h3 className="mb-3 text-sm font-bold">Log an activity</h3>
          <form action={boundLogActivity} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <select name="activity_type" className="field-input" defaultValue="note_added">
                {ACTIVITY_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
              <select name="direction" className="field-input" defaultValue="outbound">
                <option value="outbound">Outbound (I sent this)</option>
                <option value="inbound">Inbound (they sent this)</option>
              </select>
            </div>
            <textarea name="content" placeholder="Paste the message, or describe what happened…" rows={3} className="field-input" />
            <button type="submit" className="btn-primary">
              Log activity
            </button>
          </form>
        </div>

        <div className="card">
          <h3 className="mb-3 text-sm font-bold">Timeline</h3>
          {activities.length === 0 ? (
            <p className="text-sm text-text-faint">Nothing logged yet.</p>
          ) : (
            <ul className="space-y-3">
              {activities.map((a) => (
                <li key={a.id} className="border-b border-border pb-3 last:border-0 last:pb-0">
                  <div className="flex items-center gap-2 text-xs text-text-faint">
                    <span className={`h-1.5 w-1.5 rounded-full ${a.direction === "inbound" ? "bg-info" : "bg-accent"}`} />
                    <span className="font-medium text-text-dim">{a.activity_type.replaceAll("_", " ")}</span>
                    <span>{fmt(a.created_at)}</span>
                  </div>
                  {a.content && <p className="mt-1 whitespace-pre-wrap text-sm">{a.content}</p>}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card">
          <h3 className="mb-3 text-sm font-bold">Lifecycle history</h3>
          {history.length === 0 ? (
            <p className="text-sm text-text-faint">No stage changes yet.</p>
          ) : (
            <ul className="space-y-2 text-sm text-text-dim">
              {history.map((h) => (
                <li key={h.id} className="flex items-center justify-between">
                  <span>
                    {h.previous_stage_id ? stageById.get(h.previous_stage_id)?.label ?? "—" : "—"} →{" "}
                    <b className="text-text">{h.new_stage_id ? stageById.get(h.new_stage_id)?.label : "—"}</b>
                    {h.reason && <span className="text-text-faint"> · {h.reason}</span>}
                  </span>
                  <span className="text-xs text-text-faint">{fmt(h.created_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
