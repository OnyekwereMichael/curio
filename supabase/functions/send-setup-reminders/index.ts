// supabase/functions/send-setup-reminders/index.ts
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

function buildEmailHtml(firstName: string, missingInstall: boolean, missingNotifications: boolean): string {
    let actionText = "";
    if (missingInstall && missingNotifications) {
        actionText = "install the app and enable notifications";
    } else if (missingInstall) {
        actionText = "install the app";
    } else {
        actionText = "enable notifications";
    }

    return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F6F4EF;font-family:'Helvetica Neue',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;border:1px solid #e8e4dc;overflow:hidden;">
        
        <!-- Header -->
        <tr><td style="background:#D8492F;padding:28px 32px;">
          <p style="margin:0;color:#fff;font-size:22px;font-weight:700;letter-spacing:-0.5px;">✦ Curio</p>
          <p style="margin:8px 0 0;color:rgba(255,255,255,0.8);font-size:13px;">Your daily word & fact journal</p>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:32px;">
          <p style="margin:0 0 8px;font-size:22px;font-weight:700;color:#1C2B3A;">Hi ${firstName},</p>
          <p style="margin:0 0 16px;font-size:14px;color:#7C8A93;">I noticed you recently signed up for Curio, but you haven't fully set up your account yet.</p>
          
          <p style="margin:0 0 24px;font-size:14px;color:#1C2B3A;">To get the most out of Curio and start receiving your daily words, please make sure to <strong>${actionText}</strong>.</p>

          <!-- CTA Button -->
          <table cellpadding="0" cellspacing="0" style="margin:0 0 28px">
            <tr><td style="background:#D8492F;border-radius:10px;padding:14px 28px;">
              <a href="https://curio.app/home" style="color:#fff;font-weight:700;font-size:15px;text-decoration:none;display:block;">
                Complete your setup →
              </a>
            </td></tr>
          </table>

          <p style="margin:0;font-size:12px;color:#7C8A93;border-top:1px solid #f0ede7;padding-top:20px;">
            You're receiving this because you signed up for Curio. 
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

        // 1. Fetch public.users profiles that meet the criteria (missing install OR notifications)
        // Also limit to setup_reminder_count < 5
        const { data: profiles, error: profileError } = await supabase
            .from("users")
            .select("*")
            .or(`installed.eq.false,notifications_enabled.eq.false`)
            .lt('setup_reminder_count', 5);

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

            // Skip if already emailed within 1 day (24 hours)
            if (profile.setup_reminder_sent_at) {
                const lastSent = new Date(profile.setup_reminder_sent_at).getTime();
                const hoursAgo = (Date.now() - lastSent) / (1000 * 3600);
                if (hoursAgo < 24) { skipped++; continue; }
            }

            const firstName = profile.first_name || authUser?.user_metadata?.first_name || profile.full_name?.split(" ")[0] || authUser?.user_metadata?.full_name?.split(" ")[0] || "there";
            const missingInstall = profile.installed === false;
            const missingNotifications = profile.notifications_enabled === false;
            
            const html = buildEmailHtml(firstName, missingInstall, missingNotifications);
            const subject = "Complete your Curio setup";

            const ok = await sendEmail(userEmail, subject, html);

            if (ok) {
                await supabase
                    .from("users")
                    .update({ 
                        setup_reminder_sent_at: new Date().toISOString(),
                        setup_reminder_count: (profile.setup_reminder_count || 0) + 1
                    })
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
                total_eligible: profiles?.length ?? 0
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    } catch (err: any) {
        console.error("Setup reminders job failed:", err.message);
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});
