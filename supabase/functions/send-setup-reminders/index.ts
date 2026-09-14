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
        body: JSON.stringify({ from: `Michael from Curi <${FROM_EMAIL}>`, to, subject, html }),
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
<head>
  <meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <!--[if !mso]><!-->
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <!--<![endif]-->
</head>
<body style="margin:0;padding:0;background:#F6F4EF;font-family:'Plus Jakarta Sans','Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:48px 16px;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:20px;border:1px solid #ece7dd;overflow:hidden;box-shadow:0 4px 24px rgba(28,43,58,0.06);">

        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#D8492F 0%,#C23F27 100%);padding:36px 32px 32px;">
          <p style="margin:0;color:#fff;font-family:'Plus Jakarta Sans','Helvetica Neue',Helvetica,Arial,sans-serif;font-size:24px;font-weight:800;letter-spacing:-0.5px;">Curi</p>
          <p style="margin:6px 0 0;color:rgba(255,255,255,0.85);font-size:13px;letter-spacing:0.2px;">Your daily word &amp; fact journal</p>
        </td></tr>

        <!-- Accent divider -->
        <tr><td style="height:4px;background:#F0A18A;"></td></tr>

        <!-- Body -->
        <tr><td style="padding:36px 32px 8px;">
          <p style="margin:0 0 10px;font-family:'Plus Jakarta Sans','Helvetica Neue',Helvetica,Arial,sans-serif;font-size:23px;font-weight:700;color:#1C2B3A;letter-spacing:-0.3px;">Hi ${firstName},</p>
          <p style="margin:0 0 18px;font-size:14.5px;line-height:1.6;color:#7C8A93;">
            I noticed you recently signed up for Curi, but your account isn't quite ready to start delivering daily discoveries yet.
          </p>

          <table cellpadding="0" cellspacing="0" width="100%" style="background:#FBF7F1;border:1px solid #F0EADD;border-radius:14px;margin:0 0 26px;">
            <tr><td style="padding:18px 20px;">
              <p style="margin:0;font-size:14px;line-height:1.6;color:#1C2B3A;">
                To get the most out of Curi and start receiving your daily words, please make sure to <strong style="color:#D8492F;">${actionText}</strong>.
              </p>
            </td></tr>
          </table>

          <!-- CTA Button -->
          <table cellpadding="0" cellspacing="0" style="margin:0 0 32px;">
            <tr><td style="background:#D8492F;border-radius:12px;">
              <a href="https://www.trycuri.app/settings" style="color:#fff;font-weight:700;font-size:15px;text-decoration:none;display:block;padding:15px 30px;letter-spacing:0.2px;">
                Complete your setup
              </a>
            </td></tr>
          </table>

          <table width="100%" cellpadding="0" cellspacing="0"><tr><td style="border-top:1px solid #F0EDE7;"></td></tr></table>

          <p style="margin:20px 0 0;font-size:12px;line-height:1.6;color:#A9B2B8;">
            You're receiving this because you signed up for Curi.<br/>
            ✦ Curi · Learn something new, one day at a time.
          </p>
        </td></tr>

        <tr><td style="height:28px;"></td></tr>
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
            const subject = "Complete your Curi setup";

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
