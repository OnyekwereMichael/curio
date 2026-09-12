// supabase/functions/get-admin-feedback/index.ts
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Service role client — required since the feedback table has no SELECT
// policy at all for regular users (by design, to keep it private). This
// function is the one deliberate, admin-only way to actually read it.
const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
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

    return new Response(JSON.stringify({ feedbacks }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("Failed to fetch admin feedback:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});