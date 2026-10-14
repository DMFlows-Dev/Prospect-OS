import { notFound } from "next/navigation";
import {
  getActivities,
  getChannelPlaybook,
  getCurrentProfile,
  getIndustries,
  getLifecycleHistory,
  getLifecycleStages,
  getProfiles,
  getProspect,
  getProspectSequence,
  getServiceLines,
} from "@/lib/data";
import { markQualified } from "@/lib/actions/prospects";
import { STEPPER_LABELS, activityLabel, channelLabel, parseChannel, stepperIndex } from "@/lib/channels";
import { CollapsiblePane } from "@/components/CollapsiblePane";
import { LocalTime } from "@/components/LocalTime";
import { ProfileForm } from "@/components/prospect/ProfileForm";
import { ChannelSelect, StepCard } from "@/components/prospect/SequenceCards";
import { DeleteProspectButton, LogMessageForm, StageSelect, SuggestBox } from "@/components/prospect/ActivityTools";

export default async function ProspectDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ channel?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const channel = parseChannel(sp.channel);

  const [prospect, activities, history, stages, industries, serviceLines, profiles, me, playbook, sequence] = await Promise.all([
    getProspect(id),
    getActivities(id),
    getLifecycleHistory(id),
    getLifecycleStages(),
    getIndustries(),
    getServiceLines(),
    getProfiles(),
    getCurrentProfile(),
    getChannelPlaybook(channel),
    getProspectSequence(id, channel),
  ]);

  if (!prospect) notFound();

  const stageById = new Map(stages.map((s) => [s.id, s]));
  const currentStage = prospect.lifecycle_stage_id ? stageById.get(prospect.lifecycle_stage_id) : null;
  const stepIdx = stepperIndex(currentStage?.key);
  const steps = playbook?.steps ?? [];
  const bodyByKey = new Map((sequence?.steps ?? []).map((s) => [s.key, s.body]));
  const canManage = me?.role === "admin" || me?.role === "manager";

  const markInterested = async () => {
    "use server";
    const fd = new FormData();
    fd.set("qualification_status", "interested");
    await markQualified(id, fd);
  };
  const markQualifiedLead = async () => {
    "use server";
    const fd = new FormData();
    fd.set("qualification_status", "qualified");
    await markQualified(id, fd);
  };

  type TimelineItem =
    | { kind: "activity"; at: string; id: string; label: string; inbound: boolean; content: string | null; notes: string | null }
    | { kind: "stage"; at: string; id: string; text: string; reason: string | null };

  const timeline: TimelineItem[] = [
    ...activities.map((a): TimelineItem => ({
      kind: "activity",
      at: a.created_at,
      id: a.id,
      label: activityLabel(a.activity_type),
      inbound: a.direction === "inbound",
      content: a.content,
      notes: a.notes,
    })),
    ...history.map((h): TimelineItem => ({
      kind: "stage",
      at: h.created_at,
      id: h.id,
      text: `${h.previous_stage_id ? (stageById.get(h.previous_stage_id)?.label ?? "—") : "—"} → ${h.new_stage_id ? (stageById.get(h.new_stage_id)?.label ?? "—") : "—"}`,
      reason: h.reason,
    })),
  ].sort((a, b) => (a.at < b.at ? 1 : -1));

  return (
    <>
      {/* Centre: header, stage, profile, gaps, sequence */}
      <div className="min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl space-y-5 px-8 py-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-bold">{prospect.name}</h1>
              <p className="truncate text-sm text-text-dim">{[prospect.title, prospect.company].filter(Boolean).join(" · ") || "No title or company yet"}</p>
            </div>
            {me?.role === "admin" && <DeleteProspectButton prospectId={prospect.id} name={prospect.name} />}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
            <ol className="flex min-w-[360px] flex-1 items-start justify-between">
              {STEPPER_LABELS.map((label, i) => {
                const reached = i <= stepIdx;
                const current = i === stepIdx;
                return (
                  <li key={label} className="flex flex-1 flex-col items-center gap-1.5">
                    <span
                      className={`h-3 w-3 rounded-full border-2 ${
                        current ? "border-info bg-info" : reached ? "border-info/60 bg-info/60" : "border-border bg-transparent"
                      }`}
                    />
                    <span className={`text-xs ${current ? "font-semibold text-text" : "text-text-faint"}`}>{label}</span>
                  </li>
                );
              })}
            </ol>
            <StageSelect prospectId={prospect.id} stages={stages} currentId={prospect.lifecycle_stage_id} />
          </div>

          <ProfileForm
            key={prospect.updated_at}
            prospect={prospect}
            channel={channel}
            channelLabel={channelLabel(channel)}
            industries={industries}
            serviceLines={serviceLines}
            profiles={profiles}
            canAssign={canManage}
          />

          <div className="card">
            <ChannelSelect channel={channel} />
          </div>

          {sequence && sequence.gaps.length > 0 ? (
            <div className="card">
              <h2 className="mb-3 text-base font-bold">Identified gaps &amp; opportunities</h2>
              <ul className="list-disc space-y-2 pl-5 text-[15px] leading-relaxed">
                {sequence.gaps.map((g, i) => (
                  <li key={i}>{g}</li>
                ))}
              </ul>
              {sequence.rationale && <p className="mt-4 text-sm leading-relaxed text-text-faint">{sequence.rationale}</p>}
            </div>
          ) : (
            <div className="card text-sm text-text-faint">
              Gaps &amp; opportunities appear here once you click <b className="text-text-dim">Extract &amp; draft sequence</b> — the AI reads the profile and
              company text above.
            </div>
          )}

          <div className="card">
            <h2 className="mb-4 text-base font-bold">{channelLabel(channel)} sequence</h2>
            {steps.length === 0 ? (
              <p className="text-sm text-text-faint">
                No steps are set up for this channel yet.{" "}
                {me?.role === "admin" ? "Add them under Playbook." : "Ask an admin to add them under Playbook."}
              </p>
            ) : (
              <div className="space-y-4">
                {steps.map((s, i) => (
                  <StepCard
                    key={`${channel}-${s.key}-${sequence?.updated_at ?? "none"}`}
                    prospectId={prospect.id}
                    channel={channel}
                    index={i}
                    stepKey={s.key}
                    label={s.label}
                    hint={s.hint}
                    maxChars={s.max_chars}
                    initialBody={bodyByKey.get(s.key) ?? ""}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right: activity */}
      <CollapsiblePane
        side="right"
        label="Activity"
        storageKey="pw-activity-collapsed"
        expandedClassName="w-[340px] border-l border-border bg-bg"
        contentClassName="space-y-4 overflow-y-auto p-4"
      >
        <h2 className="px-1 text-sm font-bold">Activity</h2>

        <div className="card">
          <h3 className="text-sm font-bold">Mark lead</h3>
          <p className="mt-1 text-xs text-text-faint">Only once there's real evidence — a reply, a signal — not a guess.</p>
          <div className="mt-3 flex gap-2">
            <form action={markInterested}>
              <button type="submit" className="btn" disabled={prospect.qualification_status === "interested" || prospect.qualification_status === "qualified"}>
                Mark Interested
              </button>
            </form>
            <form action={markQualifiedLead}>
              <button type="submit" className="btn-primary" disabled={prospect.qualification_status === "qualified"}>
                Mark Qualified
              </button>
            </form>
          </div>
          {prospect.qualification_status !== "unqualified" && (
            <p className="mt-2 text-xs capitalize text-accent-dark">Currently {prospect.qualification_status}</p>
          )}
        </div>

        <SuggestBox prospectId={prospect.id} channel={channel} />

        <LogMessageForm prospectId={prospect.id} channel={channel} stepOptions={steps.map((s) => ({ key: s.key, label: s.label }))} />

        <div className="card">
          <h3 className="mb-3 text-sm font-bold">Timeline</h3>
          {timeline.length === 0 ? (
            <p className="text-sm text-text-faint">Nothing logged yet.</p>
          ) : (
            <ul className="space-y-3">
              {timeline.map((t) =>
                t.kind === "activity" ? (
                  <li key={t.id} className="border-b border-border pb-3 last:border-0 last:pb-0">
                    <div className="flex items-center gap-2 text-xs text-text-faint">
                      <span className={`h-1.5 w-1.5 flex-none rounded-full ${t.inbound ? "bg-info" : "bg-accent"}`} />
                      <span className="font-medium text-text-dim">{t.label}</span>
                      <span className="ml-auto flex-none"><LocalTime iso={t.at} /></span>
                    </div>
                    {t.content && <p className="mt-1.5 whitespace-pre-wrap text-sm">{t.content}</p>}
                    {!t.content && t.notes && <p className="mt-1.5 text-xs text-text-faint">{t.notes}</p>}
                  </li>
                ) : (
                  <li key={t.id} className="border-b border-border pb-3 text-xs text-text-faint last:border-0 last:pb-0">
                    <div className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 flex-none rounded-full bg-warn" />
                      <span className="font-medium text-text-dim">{t.text}</span>
                      <span className="ml-auto flex-none"><LocalTime iso={t.at} /></span>
                    </div>
                    {t.reason && <p className="mt-1">{t.reason}</p>}
                  </li>
                )
              )}
            </ul>
          )}
        </div>
      </CollapsiblePane>
    </>
  );
}
