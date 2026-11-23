// supabase/functions/get-admin-users/index.ts
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Service role client bypasses RLS and can list all auth accounts + profile records
const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// Echo back whatever headers the browser's preflight asks for. A fixed list
// breaks whenever supabase-js starts sending a new x-supabase-* header, which
// shows up in the app as "Failed to send a request to the Edge Function".
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

    // 1. Fetch public.users profiles
    const { data: profiles, error: profileError } = await adminClient
      .from("users")
      .select("*");
    if (profileError) throw profileError;

    // 2. Fetch auth.users — accurate last_sign_in_at tracked by Supabase itself
    // listUsers() returns only 50 per page by default, so walk every page.
    const allAuthUsers: any[] = [];
    for (let page = 1; page <= 200; page++) {
      const { data, error: authError } = await adminClient.auth.admin.listUsers({
        page,
        perPage: 1000,
      });
      if (authError) throw authError;
      const batch = data?.users ?? [];
      allAuthUsers.push(...batch);
      if (batch.length < 1000) break;
    }

    const profileMap = new Map();
    (profiles || []).forEach((p) => profileMap.set(p.id, p));

    const combinedUsers = allAuthUsers.map((authUser) => {
      const profile = profileMap.get(authUser.id) || {};

      const customTime = profile.last_seen_at ? new Date(profile.last_seen_at).getTime() : 0;
      const authTime = authUser.last_sign_in_at ? new Date(authUser.last_sign_in_at).getTime() : 0;
      const accurateLastSeen = customTime > authTime
        ? profile.last_seen_at
        : authUser.last_sign_in_at;

      const fullName =
        profile.full_name ||
        profile.name ||
        authUser.user_metadata?.full_name ||
        authUser.user_metadata?.name ||
        `${profile.first_name || ""} ${profile.last_name || ""}`.trim() ||
        authUser.email?.split("@")[0] ||
        "Learner";

      return {
        id: authUser.id,
        email: authUser.email || profile.email,
        full_name: fullName,
        first_name: profile.first_name || authUser.user_metadata?.first_name,
        last_name: profile.last_name || authUser.user_metadata?.last_name,
        last_seen_at: accurateLastSeen || null,
        last_sign_in_at: authUser.last_sign_in_at,
        created_at: profile.created_at || authUser.created_at,
        notifications_enabled: profile.notifications_enabled ?? false,
        installed: profile.installed ?? false,
      };
    });

    combinedUsers.sort((a, b) => {
      const tA = a.last_seen_at ? new Date(a.last_seen_at).getTime() : 0;
      const tB = b.last_seen_at ? new Date(b.last_seen_at).getTime() : 0;
      return tB - tA;
    });

    return json(req, { users: combinedUsers, total: combinedUsers.length });
  } catch (err: any) {
    console.error("Failed to fetch admin users:", err.message);
    return json(req, { error: err.message }, 500);
  }
});
