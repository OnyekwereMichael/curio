// supabase/functions/get-admin-feedback/index.ts
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Service role client — required since the feedback table has no SELECT
// policy at all for regular users (by design, to keep it private). This
// function is the one deliberate, admin-only way to actually read it.
const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// Echo back whatever headers the browser's preflight asks for (see
// get-admin-users for why a fixed list breaks).
function corsHeaders(req: Request) {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers":
      req.headers.get("Access-Control-Request-Headers") ??
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Max-Age": "86400",
  };
}

function json(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(req) });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json(req, { error: "Missing authorization" }, 401);

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await adminClient.auth.getUser(token);
    if (userError || !userData?.user) {
      return json(req, { error: "Unauthorized access" }, 401);
    }

    // Admin-only: ask the database as the caller (is_admin() reads auth.uid()).
    const asCaller = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: isAdmin, error: adminErr } = await asCaller.rpc("is_admin");
    if (adminErr || isAdmin !== true) {
      return json(req, { error: "Admins only" }, 403);
    }

    const { data, error } = await adminClient
      .from("feedback")
      .select("id, user_id, message, created_at, users(email, full_name)")
      .order("created_at", { ascending: false });
    if (error) throw error;

    const feedbacks = (data ?? []).map((row: any) => ({
      id: row.id,
      user_id: row.user_id,
      message: row.message,
      created_at: row.created_at,
      user_email: row.users?.email ?? null,
      user_name: row.users?.full_name ?? null,
    }));

    return json(req, { feedbacks });
  } catch (err: any) {
    console.error("Failed to fetch admin feedback:", err.message);
    return json(req, { error: err.message }, 500);
  }
});
