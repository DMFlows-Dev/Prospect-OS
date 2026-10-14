import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

// The Chrome extension authenticates with a personal token (Preferences page),
// not a browser session. Every call goes through a security-definer SQL
// function that checks the token and that the prospect belongs to that BDR.

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type",
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function reply(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: CORS });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function POST(request: Request) {
  const auth = request.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!token) return reply({ error: "Missing token." }, 401);

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return reply({ error: "Invalid request." }, 400);
  }

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let result;
  switch (body.action) {
    case "whoami":
      result = await supabase.rpc("ext_whoami", { p_token: token });
      break;
    case "list":
      result = await supabase.rpc("ext_list_prospects", {
        p_token: token,
        p_query: typeof body.query === "string" ? body.query.slice(0, 80) : null,
      });
      break;
    case "get":
      if (typeof body.prospectId !== "string" || !UUID.test(body.prospectId)) return reply({ error: "Bad prospect id." }, 400);
      result = await supabase.rpc("ext_get_prospect", { p_token: token, p_prospect_id: body.prospectId });
      break;
    case "capture": {
      if (typeof body.prospectId !== "string" || !UUID.test(body.prospectId)) return reply({ error: "Bad prospect id." }, 400);
      if (body.kind !== "person" && body.kind !== "company") return reply({ error: "Bad capture type." }, 400);
      if (typeof body.text !== "string") return reply({ error: "Nothing to capture." }, 400);
      result = await supabase.rpc("ext_capture", {
        p_token: token,
        p_prospect_id: body.prospectId,
        p_kind: body.kind,
        p_text: body.text.slice(0, 20000),
        p_url: typeof body.url === "string" ? body.url.slice(0, 500) : null,
        p_name: typeof body.name === "string" ? body.name.slice(0, 200) : null,
      });
      break;
    }
    default:
      return reply({ error: "Unknown action." }, 400);
  }

  if (result.error) {
    const msg = result.error.message ?? "";
    if (msg.includes("invalid_token")) return reply({ error: "This token isn't valid. Create a new one in Preferences." }, 401);
    if (msg.includes("forbidden")) return reply({ error: "That prospect isn't assigned to you." }, 403);
    if (msg.includes("empty_capture")) return reply({ error: "The captured text was too short — scroll the page so it loads, then try again." }, 422);
    if (msg.includes("Could not find the function")) return reply({ error: "Database migration 0002 hasn't been run yet." }, 500);
    return reply({ error: msg || "Request failed." }, 400);
  }
  return reply(result.data);
}
