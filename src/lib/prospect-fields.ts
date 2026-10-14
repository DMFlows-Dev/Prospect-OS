const TEXT_FIELDS = [
  "title",
  "company",
  "company_website",
  "linkedin_url",
  "linkedin_company_url",
  "instagram_url",
  "email",
  "phone",
  "company_blurb",
  "profile_text",
  "company_text",
  "pain_points",
  "buying_signals",
  "industry_id",
  "service_line_id",
  "assigned_bdr_id",
] as const;

export function str(fd: FormData, key: string): string | null {
  const v = fd.get(key);
  return typeof v === "string" && v.trim() !== "" ? v.trim() : null;
}

/**
 * Builds an update payload from only the fields the form actually contains,
 * so a form that doesn't render a field can never blank it out.
 */
export function fieldsFromForm(fd: FormData): Record<string, string | null> {
  const patch: Record<string, string | null> = {};
  if (fd.has("name")) patch.name = str(fd, "name") ?? "Untitled prospect";
  for (const f of TEXT_FIELDS) {
    if (fd.has(f)) patch[f] = str(fd, f);
  }
  return patch;
}

export function normalizeUrl(u: string | null | undefined): string {
  return (u ?? "").trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/[?#].*$/, "").replace(/\/+$/, "");
}
