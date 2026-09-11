// supabase/functions/get-admin-users/index.ts
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Service role client bypasses RLS and can list all auth accounts + profile records
const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await adminClient.auth.getUser(token);

    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized access" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Fetch public.users profiles (custom tracking, goes forward from now)
    const { data: profiles, error: profileError } = await adminClient
      .from("users")
      .select("*");

    if (profileError) throw profileError;

    // 2. Fetch auth.users — this has the accurate last_sign_in_at tracked by Supabase itself
    const { data: authUsers, error: authError } = await adminClient.auth.admin.listUsers();

    if (authError) throw authError;

    // Create a map of profiles by user id
    const profileMap = new Map();
    (profiles || []).forEach((p) => profileMap.set(p.id, p));

    // Combine auth users & public profiles
    const combinedUsers = (authUsers?.users || []).map((authUser) => {
      const profile = profileMap.get(authUser.id) || {};

      // Determine the most accurate "last seen" timestamp:
      // - authUser.last_sign_in_at: Supabase built-in, accurate for every login event
      // - profile.last_seen_at: our custom tracker, only populated when user opens the app
      //   (but may be NULL if they haven't opened since we added the column)
      // Use whichever is MORE RECENT, falling back to last_sign_in_at as the primary source.
      const customTime = profile.last_seen_at ? new Date(profile.last_seen_at).getTime() : 0;
      const authTime = authUser.last_sign_in_at ? new Date(authUser.last_sign_in_at).getTime() : 0;
      const accurateLastSeen = customTime > authTime
        ? profile.last_seen_at   // they've visited the app AFTER their last auth (e.g. persistent session)
        : authUser.last_sign_in_at; // use Supabase's own accurate sign-in record

      const fullName =
        profile.full_name ||
        profile.name ||
        authUser.user_metadata?.full_name ||
        authUser.user_metadata?.name ||
        `${profile.first_name || ''} ${profile.last_name || ''}`.trim() ||
        authUser.email?.split('@')[0] ||
        'Learner';

      return {
        id: authUser.id,
        email: authUser.email || profile.email,
        full_name: fullName,
        first_name: profile.first_name || authUser.user_metadata?.first_name,
        last_name: profile.last_name || authUser.user_metadata?.last_name,
        // Accurate last seen — whichever of our tracker or Supabase auth is more recent
        last_seen_at: accurateLastSeen || null,
        // Keep raw values for debugging if needed
        last_sign_in_at: authUser.last_sign_in_at,
        created_at: profile.created_at || authUser.created_at,
        notifications_enabled: profile.notifications_enabled ?? false,
        installed: profile.installed ?? false,
      };
    });

    // Sort by last_seen_at descending (most recently active first)
    combinedUsers.sort((a, b) => {
      const tA = a.last_seen_at ? new Date(a.last_seen_at).getTime() : 0;
      const tB = b.last_seen_at ? new Date(b.last_seen_at).getTime() : 0;
      return tB - tA;
    });

    return new Response(JSON.stringify({ users: combinedUsers, total: combinedUsers.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("Failed to fetch admin users:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
