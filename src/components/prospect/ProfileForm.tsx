"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateProspectFields } from "@/lib/actions/prospects";
import { extractAndDraft } from "@/lib/actions/ai";
import { linkedinOpenUrl } from "@/lib/channels";
import { LocalTime } from "@/components/LocalTime";
import type { ChannelKey, Industry, Profile, Prospect, ServiceLine } from "@/types/database";

type Status = { tone: "info" | "ok" | "error"; text: string } | null;

function asUrl(v: string): string {
  const t = v.trim();
  if (!t) return "";
  return /^https?:\/\//i.test(t) ? t : `https://${t}`;
}

export function ProfileForm(props: {
  prospect: Prospect;
  channel: ChannelKey;
  channelLabel: string;
  industries: Industry[];
  serviceLines: ServiceLine[];
  profiles: Profile[];
  canAssign: boolean;
}) {
  const { prospect, channel, channelLabel, industries, serviceLines, profiles, canAssign } = props;
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<Status>(null);
  const [personUrl, setPersonUrl] = useState(prospect.linkedin_url ?? "");
  const [companyUrl, setCompanyUrl] = useState(prospect.linkedin_company_url ?? "");

  function run(kind: "save" | "extract" | "regenerate") {
    if (!formRef.current) return;
    const fd = new FormData(formRef.current);
    startTransition(async () => {
      setStatus({ tone: "info", text: kind === "save" ? "Saving…" : "Reading the profile and drafting — this takes a few seconds…" });
      if (kind === "save") {
        const saved = await updateProspectFields(prospect.id, fd);
        setStatus(saved.ok ? { tone: "ok", text: "Saved." } : { tone: "error", text: saved.error });
        if (saved.ok) router.refresh();
        return;
      }
      const res = await extractAndDraft(prospect.id, channel, fd, kind);
      if (!res.ok) {
        setStatus({ tone: "error", text: res.error });
        return;
      }
      const k = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n));
      setStatus({ tone: "ok", text: `Done · ${res.model} · ${k(res.usage.input)} in / ${k(res.usage.output)} out tokens` });
      router.refresh();
    });
  }

  const statusColor = status?.tone === "error" ? "text-danger" : status?.tone === "ok" ? "text-accent-dark" : "text-text-dim";

  return (
    <form
      ref={formRef}
      onSubmit={(e) => {
        e.preventDefault();
        run("save");
      }}
      className="card space-y-5"
    >
      <h2 className="text-base font-bold">Profile</h2>

      <div className="space-y-4">
        <div>
          <label className="field-label">LinkedIn profile URL</label>
          <div className="flex gap-2">
            <input
              name="linkedin_url"
              value={personUrl}
              onChange={(e) => setPersonUrl(e.target.value)}
              className="field-input"
              placeholder="https://www.linkedin.com/in/…"
            />
            {personUrl.trim() && (
              <a href={linkedinOpenUrl(asUrl(personUrl), prospect.id)} target="_blank" rel="noreferrer" className="btn flex-none">
                Open ↗
              </a>
            )}
          </div>
        </div>

        <div>
          <label className="field-label">
            Profile description — about, experience, recent posts
            {prospect.profile_captured_at && <span className="ml-2 normal-case text-accent-dark">captured <LocalTime iso={prospect.profile_captured_at} /></span>}
          </label>
          <textarea
            name="profile_text"
            defaultValue={prospect.profile_text ?? ""}
            rows={12}
            className="field-input"
            placeholder="Open their LinkedIn with the button above, then click Capture in the extension — or paste the profile text here."
          />
        </div>

        <div>
          <label className="field-label">Company LinkedIn URL</label>
          <div className="flex gap-2">
            <input
              name="linkedin_company_url"
              value={companyUrl}
              onChange={(e) => setCompanyUrl(e.target.value)}
              className="field-input"
              placeholder="https://www.linkedin.com/company/…"
            />
            {companyUrl.trim() && (
              <a href={linkedinOpenUrl(asUrl(companyUrl), prospect.id)} target="_blank" rel="noreferrer" className="btn flex-none">
                Open ↗
              </a>
            )}
          </div>
        </div>

        <div>
          <label className="field-label">
            Company description
            {prospect.company_captured_at && <span className="ml-2 normal-case text-accent-dark">captured <LocalTime iso={prospect.company_captured_at} /></span>}
          </label>
          <textarea
            name="company_text"
            defaultValue={prospect.company_text ?? ""}
            rows={5}
            className="field-input"
            placeholder="Capture the company's LinkedIn About page, or paste its description here."
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" disabled={pending} onClick={() => run("extract")} className="btn-primary">
          Extract &amp; draft sequence
        </button>
        <button type="button" disabled={pending} onClick={() => run("regenerate")} className="btn">
          Regenerate
        </button>
        <button type="submit" disabled={pending} className="btn">
          Save
        </button>
        {status && <span className={`text-sm ${statusColor}`}>{status.text}</span>}
      </div>
      <p className="-mt-2 text-xs text-text-faint">
        Drafting for <b className="text-text-dim">{channelLabel}</b> — change the channel below. Extract fills any empty properties; Regenerate only
        redrafts.
      </p>

      <div className="grid grid-cols-2 gap-4">
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
          <label className="field-label">Company blurb</label>
          <input name="company_blurb" defaultValue={prospect.company_blurb ?? ""} className="field-input" />
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
          <label className="field-label">Service line</label>
          <select name="service_line_id" defaultValue={prospect.service_line_id ?? ""} className="field-input">
            <option value="">—</option>
            {serviceLines.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="field-label">Website</label>
          <input name="company_website" defaultValue={prospect.company_website ?? ""} className="field-input" />
        </div>
        <div>
          <label className="field-label">Email</label>
          <input name="email" defaultValue={prospect.email ?? ""} className="field-input" />
        </div>
        <div>
          <label className="field-label">Phone</label>
          <input name="phone" defaultValue={prospect.phone ?? ""} className="field-input" />
        </div>
        <div>
          <label className="field-label">Instagram URL</label>
          <input name="instagram_url" defaultValue={prospect.instagram_url ?? ""} className="field-input" />
        </div>
        {canAssign && (
          <div className="col-span-2">
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
        )}
      </div>
    </form>
  );
}
