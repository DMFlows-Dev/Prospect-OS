/** Minimal RFC-4180-ish CSV parser: quoted fields, escaped quotes, CRLF, BOM. */
export function parseCsv(input: string): string[][] {
  const text = input.replace(/^﻿/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"') inQuotes = true;
    else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.some((c) => c.trim() !== "")) rows.push(row);
      row = [];
    } else {
      field += ch;
    }
  }
  row.push(field);
  if (row.some((c) => c.trim() !== "")) rows.push(row);
  return rows;
}

export type ImportRow = {
  name: string;
  title: string | null;
  company: string | null;
  company_website: string | null;
  linkedin_url: string | null;
  linkedin_company_url: string | null;
  email: string | null;
  phone: string | null;
};

const ALIASES: Record<keyof ImportRow | "first" | "last", string[]> = {
  name: ["name", "fullname", "contactname", "prospect", "prospectname"],
  first: ["firstname", "first", "givenname"],
  last: ["lastname", "last", "surname", "familyname"],
  title: ["title", "jobtitle", "position", "role", "headline"],
  company: ["company", "companyname", "organization", "organisation", "account"],
  company_website: ["website", "companywebsite", "companydomain", "domain", "url"],
  linkedin_url: ["linkedin", "linkedinurl", "linkedinprofile", "profileurl", "personlinkedinurl", "personallinkedin"],
  linkedin_company_url: ["companylinkedin", "companylinkedinurl", "companylinkedinprofile", "organizationlinkedin"],
  email: ["email", "emailaddress", "workemail"],
  phone: ["phone", "phonenumber", "mobile", "mobilephone"],
};

function norm(h: string) {
  return h.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** Maps CSV rows (first row = header) onto prospect fields. Rows without a name are dropped. */
export function rowsToProspects(rows: string[][]): { prospects: ImportRow[]; skipped: number } {
  if (rows.length < 2) return { prospects: [], skipped: 0 };
  const header = rows[0].map(norm);
  const col = (key: keyof typeof ALIASES) => header.findIndex((h) => ALIASES[key].includes(h));
  const idx = {
    name: col("name"),
    first: col("first"),
    last: col("last"),
    title: col("title"),
    company: col("company"),
    company_website: col("company_website"),
    linkedin_url: col("linkedin_url"),
    linkedin_company_url: col("linkedin_company_url"),
    email: col("email"),
    phone: col("phone"),
  };
  const get = (r: string[], i: number) => (i >= 0 ? (r[i] ?? "").trim() || null : null);

  const prospects: ImportRow[] = [];
  let skipped = 0;
  for (const r of rows.slice(1)) {
    let name = get(r, idx.name);
    if (!name) name = [get(r, idx.first), get(r, idx.last)].filter(Boolean).join(" ") || null;
    if (!name) {
      skipped++;
      continue;
    }
    prospects.push({
      name,
      title: get(r, idx.title),
      company: get(r, idx.company),
      company_website: get(r, idx.company_website),
      linkedin_url: get(r, idx.linkedin_url),
      linkedin_company_url: get(r, idx.linkedin_company_url),
      email: get(r, idx.email),
      phone: get(r, idx.phone),
    });
  }
  return { prospects, skipped };
}
