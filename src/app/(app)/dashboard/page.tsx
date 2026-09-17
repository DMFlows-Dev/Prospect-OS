import { getActivityCounts, getCurrentProfile, getProspects } from "@/lib/data";

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function startOfWeek() {
  const d = new Date();
  const day = d.getDay(); // 0 = Sunday
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function startOfMonth() {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

const METRIC_LABELS: Record<string, string> = {
  connection_sent: "Connections sent",
  connection_accepted: "Connections accepted",
  message_sent: "Messages sent",
  message_received: "Messages received",
  email_sent: "Emails sent",
  email_replied: "Email replies",
  follow_up_sent: "Follow-ups sent",
  meeting_scheduled: "Meetings scheduled",
  qualified_marked: "Interested / Qualified marks",
};

async function StatRow({ title, since, bdrId }: { title: string; since: string; bdrId?: string }) {
  const counts = await getActivityCounts(since, bdrId);
  const keys = Object.keys(METRIC_LABELS).filter((k) => counts[k]);

  return (
    <div className="card">
      <h3 className="mb-3 text-sm font-bold">{title}</h3>
      {keys.length === 0 ? (
        <p className="text-sm text-text-faint">No activity logged in this range yet.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {keys.map((k) => (
            <div key={k}>
              <div className="text-2xl font-bold tabular-nums">{counts[k]}</div>
              <div className="text-xs text-text-faint">{METRIC_LABELS[k]}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default async function DashboardPage() {
  const profile = await getCurrentProfile();
  const isBdr = profile?.role === "bdr";
  const bdrId = isBdr ? profile!.id : undefined;
  const prospects = await getProspects();

  return (
    <div className="mx-auto max-w-5xl px-8 py-8">
      <h1 className="text-2xl font-bold">
        {isBdr ? "Your dashboard" : "Team dashboard"}
      </h1>
      <p className="mt-1 text-sm text-text-dim">
        {isBdr
          ? "Your prospecting activity — pulled live from what's actually logged."
          : "Everyone's prospecting activity — pulled live from what's actually logged."}
      </p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="card">
          <div className="text-2xl font-bold tabular-nums">{prospects.length}</div>
          <div className="text-xs text-text-faint">Total prospects visible to you</div>
        </div>
        <div className="card">
          <div className="text-2xl font-bold tabular-nums">
            {prospects.filter((p) => p.qualification_status === "qualified").length}
          </div>
          <div className="text-xs text-text-faint">Qualified leads</div>
        </div>
        <div className="card">
          <div className="text-2xl font-bold tabular-nums">
            {prospects.filter((p) => p.qualification_status === "interested").length}
          </div>
          <div className="text-xs text-text-faint">Interested leads</div>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        <StatRow title="Today" since={startOfToday()} bdrId={bdrId} />
        <StatRow title="This week" since={startOfWeek()} bdrId={bdrId} />
        <StatRow title="This month" since={startOfMonth()} bdrId={bdrId} />
      </div>

      <p className="mt-6 text-xs text-text-faint">
        Phase 1 scope: totals only, no charts or custom date ranges yet — see the blueprint's §08 for the full
        reporting spec (Phase 5).
      </p>
    </div>
  );
}
