// supabase/functions/send-reengagement-email/index.ts
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const FROM_EMAIL = Deno.env.get("RESEND_FROM_EMAIL") ?? "hello@curio.app";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
    const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ from: `Michael from Curio <${FROM_EMAIL}>`, to, subject, html }),
    });

    if (!res.ok) {
        const err = await res.text();
        console.error(`Resend error for ${to}:`, err);
        return false;
    }
    return true;
}

function buildEmailHtml(firstName: string, todayWord?: string): string {
    const wordSection = todayWord
        ? `<p style="margin:0 0 16px;font-size:14px;color:#1C2B3A;">While you were away, today's word on Curio is <strong>"${todayWord}"</strong>. Don't miss it!</p>`
        : `<p style="margin:0 0 16px;font-size:14px;color:#1C2B3A;">New words and facts have been dropping daily on Curio &mdash; come back and catch up!</p>`;

    return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F6F4EF;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;border:1px solid #e8e4dc;overflow:hidden;">

        <!-- Header Banner -->
        <tr><td style="background:#D8492F;padding:28px 32px;">
          <p style="margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:-0.5px;">✦ Curio</p>
          <p style="margin:8px 0 0;color:rgba(255,255,255,0.8);font-size:13px;">Your daily word &amp; fact journal</p>
        </td></tr>

        <!-- Body Content -->
        <tr><td style="padding:36px 32px 28px;">
          <p style="margin:0 0 6px;font-size:24px;font-weight:700;color:#1C2B3A;">Hey ${firstName}, we miss you 👋</p>
          <p style="margin:0 0 24px;font-size:14px;color:#7C8A93;line-height:1.6;">It's been a while since we've seen you on Curio.</p>
          ${wordSection}
          <p style="margin:0 0 28px;font-size:14px;color:#1C2B3A;line-height:1.7;">Your learning streak is waiting. Every day you come back, you&rsquo;re one step closer to building a real habit around curiosity.</p>

          <!-- CTA Button -->
          <table cellpadding="0" cellspacing="0">
            <tr><td style="background:#D8492F;border-radius:10px;">
              <a href="https://curio.app/home" style="display:block;padding:14px 28px;color:#ffffff;font-weight:700;font-size:15px;text-decoration:none;">Come back to Curio &rarr;</a>
            </td></tr>
          </table>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:0 32px 28px;">
          <p style="margin:0;font-size:11px;color:#A0AAB4;border-top:1px solid #f0ede7;padding-top:20px;line-height:1.6;">
            You&rsquo;re receiving this because you signed up for Curio.
            You can manage your notification preferences in the app settings.
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

Deno.serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        if (!RESEND_API_KEY) {
            return new Response(JSON.stringify({ error: "RESEND_API_KEY is not configured" }), {
                status: 503,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        // Allow optional "days" param override from admin dashboard
        const url = new URL(req.url);
        const inactiveDays = parseInt(url.searchParams.get("days") ?? "1", 10);

        const today = new Date().toISOString().split("T")[0];
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - inactiveDays);

        // Get today's word for personalisation
        const { data: word } = await supabase
            .from("words")
            .select("word")
            .eq("publish_date", today)
            .maybeSingle();

        // 1. Fetch public.users profiles that meet the criteria
        const { data: profiles, error: profileError } = await supabase
            .from("users")
            .select("*")
            .or(`last_seen_at.is.null,last_seen_at.lt.${cutoff.toISOString()}`);

        if (profileError) throw profileError;

        // 2. Fetch auth.users to get accurate emails and metadata
        const { data: authData, error: authError } = await supabase.auth.admin.listUsers();
        if (authError) throw authError;

        const authUsersMap = new Map();
        (authData?.users || []).forEach((u) => authUsersMap.set(u.id, u));

        let sent = 0;
        let skipped = 0;
        let failed = 0;

        for (const profile of profiles ?? []) {
            const authUser = authUsersMap.get(profile.id);
            const userEmail = profile.email || authUser?.email;
            
            if (!userEmail) { skipped++; continue; }

            // Skip if already emailed within 2 days (prevents drip spam)
            if (profile.reengagement_email_sent_at) {
                const lastSent = new Date(profile.reengagement_email_sent_at).getTime();
                const daysAgo = (Date.now() - lastSent) / (1000 * 3600 * 24);
                if (daysAgo < 2) { skipped++; continue; }
            }

            const firstName = profile.first_name || authUser?.user_metadata?.first_name || profile.full_name?.split(" ")[0] || authUser?.user_metadata?.full_name?.split(" ")[0] || "there";
            const html = buildEmailHtml(firstName, word?.word);
            const subject = word?.word
                ? `"${word.word}" is waiting for you on Curio 📖`
                : "Come back to Curio — new words are waiting for you";

            const ok = await sendEmail(userEmail, subject, html);

            if (ok) {
                await supabase
                    .from("users")
                    .update({ reengagement_email_sent_at: new Date().toISOString() })
                    .eq("id", profile.id);
                sent++;
            } else {
                failed++;
            }
        }

        return new Response(
            JSON.stringify({
                sent,
                skipped,
                failed,
                total_eligible: profiles?.length ?? 0,
                inactive_threshold_days: inactiveDays,
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    } catch (err: any) {
        console.error("Re-engagement email job failed:", err.message);
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});
