// supabase/functions/send-notification-fix-email/index.ts
//
// One-time email blast to users who have notifications enabled,
// letting them know about the notification issue and asking them
// to open the app once to fix it automatically.
//
// Run once manually via:
//   curl -i --request POST \
//     'https://yetfoyuysgqksjwrelow.supabase.co/functions/v1/send-notification-fix-email' \
//     --header 'Authorization: Bearer YOUR_SERVICE_ROLE_KEY'
//
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const FROM_EMAIL = Deno.env.get("RESEND_FROM_EMAIL") ?? "hello@mail.trycuri.app";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
    const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            from: `Michael from Curi <${FROM_EMAIL}>`,
            to,
            subject,
            html,
        }),
    });

    if (!res.ok) {
        const err = await res.text();
        console.error(`Resend error for ${to}:`, err);
        return false;
    }
    return true;
}

function buildEmailHtml(firstName: string, notificationsEnabled: boolean): string {
    const emailBody = notificationsEnabled
        ? `
          <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#3E4C56;">
            I wanted to give you a quick heads-up. We discovered a bug that's been affecting push notifications for some users — specifically, people who enabled notifications when they first joined but haven't opened the app on the same device since.
          </p>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#3E4C56;">
            The fix is already in. All you need to do is <strong style="color:#1C2B3A;">open Curi once</strong> and it will automatically reconnect your notifications in the background — no settings to change, nothing to toggle.
          </p>

          <!-- Step callout -->
          <table cellpadding="0" cellspacing="0" width="100%" style="margin:8px 0 28px;">
            <tr><td style="background:#F6F4EF;border-radius:10px;padding:18px 20px;">
              <p style="margin:0;font-size:14px;line-height:1.7;color:#3E4C56;">
                <strong style="color:#1C2B3A;">One step:</strong> Open the app → your daily notifications will start working automatically.
              </p>
            </td></tr>
          </table>

          <!-- CTA -->
          <table cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
            <tr><td style="background:#D8492F;border-radius:10px;">
              <a href="https://www.trycuri.app/home" style="display:block;padding:14px 28px;color:#ffffff;font-weight:700;font-size:15px;text-decoration:none;">
                Open Curi &rarr;
              </a>
            </td></tr>
          </table>

          <p style="margin:0 0 8px;font-size:15px;line-height:1.7;color:#3E4C56;">
            Sorry for the trouble. This was entirely on our end, and it won't happen going forward.
          </p>
        `
        : `
          <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#3E4C56;">
            I noticed you don't have notifications enabled for Curi yet, so I wanted to quickly reach out.
          </p>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#3E4C56;">
            Building a new habit is hard, and it's easy to forget to check the app. We've designed our notifications to be the exact opposite of spam — you get exactly <strong style="color:#1C2B3A;">one reminder a day</strong> when your new word and fact are ready.
          </p>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#3E4C56;">
            It's the easiest way to keep your learning streak alive and consistently expand your vocabulary without having to remember to open the app yourself.
          </p>

          <!-- Step callout -->
          <table cellpadding="0" cellspacing="0" width="100%" style="margin:8px 0 28px;">
            <tr><td style="background:#F6F4EF;border-radius:10px;padding:18px 20px;">
              <p style="margin:0;font-size:14px;line-height:1.7;color:#3E4C56;">
                <strong style="color:#1C2B3A;">How to enable:</strong> Open the app, go to Settings, and toggle Daily Word Push Notifications on.
              </p>
            </td></tr>
          </table>

          <!-- CTA -->
          <table cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
            <tr><td style="background:#D8492F;border-radius:10px;">
              <a href="https://www.trycuri.app/settings" style="display:block;padding:14px 28px;color:#ffffff;font-weight:700;font-size:15px;text-decoration:none;">
                Enable Notifications &rarr;
              </a>
            </td></tr>
          </table>
        `;

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <!--[if !mso]><!-->
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600&display=swap" rel="stylesheet">
  <!--<![endif]-->
</head>
<body style="margin:0;padding:0;background:#F6F4EF;font-family:'Plus Jakarta Sans','Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;border:1px solid #ece7dd;overflow:hidden;">

        <!-- Header -->
        <tr><td style="padding:32px 32px 0;">
          <p style="margin:0;color:#1C2B3A;font-size:18px;font-weight:700;letter-spacing:-0.3px;">Curi</p>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:24px 32px 0;">
          <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#1C2B3A;">
            Hi ${firstName},
          </p>
          ${emailBody}
        </td></tr>

        <!-- Sign-off -->
        <tr><td style="padding:16px 32px 8px;">
          <table width="100%" cellpadding="0" cellspacing="0"><tr><td style="border-top:1px solid #F0EDE7;"></td></tr></table>
          <p style="margin:20px 0 0;font-size:14px;line-height:1.7;color:#3E4C56;">
            — Michael<br/>
            <span style="font-size:12.5px;color:#7C8A93;">Founder, Curi</span>
          </p>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:20px 32px 28px;">
          <p style="margin:0;font-size:11.5px;line-height:1.6;color:#A9B2B8;">
            You're receiving this because you created an account on Curi.
            You can manage your preferences anytime in the app settings.
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

Deno.serve(async (req) => {
    try {
        if (!RESEND_API_KEY) {
            return new Response(JSON.stringify({ error: "RESEND_API_KEY is not configured" }), {
                status: 503,
                headers: { "Content-Type": "application/json" },
            });
        }

        // Target ALL users
        const { data: profiles, error: profileError } = await supabase
            .from("users")
            .select("id, email, full_name, notif_fix_email_sent_at, notifications_enabled");


        if (profileError) throw profileError;

        // Also pull emails from auth.users for completeness
        const { data: authData, error: authError } = await supabase.auth.admin.listUsers();
        if (authError) throw authError;

        const authUsersMap = new Map();
        (authData?.users || []).forEach((u) => authUsersMap.set(u.id, u));

        let sent = 0;
        let skipped = 0;
        let failed = 0;

        for (const profile of profiles ?? []) {
            // Idempotency: don't send twice to the same user
            if (profile.notif_fix_email_sent_at) {
                skipped++;
                continue;
            }

            const authUser = authUsersMap.get(profile.id);
            const userEmail = profile.email || authUser?.email;
            if (!userEmail) { skipped++; continue; }

            const firstName =
                profile.first_name ||
                authUser?.user_metadata?.first_name ||
                profile.full_name?.split(" ")[0] ||
                authUser?.user_metadata?.full_name?.split(" ")[0] ||
                "there";

            const isNotificationsEnabled = !!profile.notifications_enabled;

            const subject = isNotificationsEnabled
                ? `Quick heads-up about your Curi notifications`
                : `A quick tip to keep your Curi streak alive`;

            const html = buildEmailHtml(firstName, isNotificationsEnabled);

            const ok = await sendEmail(userEmail, subject, html);

            if (ok) {
                // Mark as sent so re-running this function is safe
                await supabase
                    .from("users")
                    .update({ notif_fix_email_sent_at: new Date().toISOString() })
                    .eq("id", profile.id);
                sent++;
                console.log(`Sent to ${userEmail}`);
            } else {
                failed++;
            }

            // Small delay to avoid hitting Resend rate limits
            await new Promise((r) => setTimeout(r, 100));
        }

        return new Response(
            JSON.stringify({ sent, skipped, failed, total_eligible: profiles?.length ?? 0 }),
            { headers: { "Content-Type": "application/json" } }
        );
    } catch (err: any) {
        console.error("Notification fix email job failed:", err.message);
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
});
