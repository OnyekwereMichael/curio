// supabase/functions/send-glitch-apology-email/index.ts
//
// One-time apology email sent to users who visited Curi when today's
// word and fact were missing due to a database glitch.
//
// Run via Supabase CLI or HTTP POST:
//   curl -i --request POST \
//     'https://yetfoyuysgqksjwrelow.supabase.co/functions/v1/send-glitch-apology-email' \
//     --header 'Authorization: Bearer YOUR_SERVICE_ROLE_KEY'
//
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const FROM_EMAIL = Deno.env.get("RESEND_FROM_EMAIL") ?? "business@mail.trycuri.app";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// Target list strictly restricted to the 7 users who visited during the issue
const TARGET_EMAILS = [
  "onyekweremichael55@gmail.com",
  "ireoluwadaniel43@gmail.com",
  "lawrencepraise92@gmail.com",
  "chuadrian243@gmail.com",
  "chinelonwosu0@gmail.com",
  "nuelemmanuel766@gmail.com",
  "realcharlieok@gmail.com",
];

async function sendEmail(to: string, subject: string, html: string, text: string): Promise<boolean> {
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
      text,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error(`Resend error for ${to}:`, err);
    return false;
  }
  return true;
}

function buildEmailHtml(firstName: string): string {
  const greeting = firstName && firstName !== "there" ? `Hi ${firstName},` : "Hi there,";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <!--[if !mso]><!-->
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
  <!--<![endif]-->
</head>
<body style="margin:0;padding:0;background:#F6F4EF;font-family:'Plus Jakarta Sans','Helvetica Neue',Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;background:#F6F4EF;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;border:1px solid #ece7dd;overflow:hidden;max-width:520px;width:100%;text-align:left;">

        <!-- Header -->
        <tr><td style="padding:32px 32px 0;">
          <p style="margin:0;color:#1C2B3A;font-size:20px;font-weight:700;letter-spacing:-0.3px;">Curi</p>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:24px 32px 0;">
          <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#1C2B3A;font-weight:600;">
            ${greeting}
          </p>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#3E4C56;">
            I wanted to reach out personally and apologize for what happened earlier today when you opened Curi.
          </p>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#3E4C56;">
            Due to an unexpected glitch on the platform earlier, today&rsquo;s word and fact failed to display in the database &mdash; leaving you with an empty screen when you checked in.
          </p>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#3E4C56;">
            I know building a daily habit takes commitment, and when you set aside a moment of your day to learn something new with Curi, the app should work seamlessly. Falling short of that is frustrating, and I am genuinely sorry for the disruption.
          </p>

          <!-- Status Highlight Card -->
          <table cellpadding="0" cellspacing="0" width="100%" style="margin:16px 0 24px;">
            <tr><td style="background:#F6F4EF;border-left:4px solid #D8492F;border-radius:4px 10px 10px 4px;padding:16px 20px;">
              <p style="margin:0;font-size:14px;line-height:1.6;color:#1C2B3A;font-weight:600;">
                The issue is now completely resolved.
              </p>
              <p style="margin:6px 0 0;font-size:13.5px;line-height:1.6;color:#556571;">
                Starting tomorrow morning, your daily word and interesting fact will be ready and waiting for you right on schedule.
              </p>
            </td></tr>
          </table>

          <p style="margin:0 0 28px;font-size:15px;line-height:1.7;color:#3E4C56;">
            Thank you so much for being an active part of Curi and showing up today. Your time and curiosity mean the world to us.
          </p>
        </td></tr>

        <!-- CTA -->
        <tr><td style="padding:0 32px 28px;">
          <table cellpadding="0" cellspacing="0">
            <tr><td style="background:#D8492F;border-radius:10px;">
              <a href="https://www.trycuri.app/home" style="display:inline-block;padding:13px 26px;color:#ffffff;font-weight:700;font-size:14.5px;text-decoration:none;letter-spacing:-0.2px;">
                Open Curi &rarr;
              </a>
            </td></tr>
          </table>
        </td></tr>

        <!-- Sign-off -->
        <tr><td style="padding:16px 32px 8px;">
          <table width="100%" cellpadding="0" cellspacing="0"><tr><td style="border-top:1px solid #F0EDE7;"></td></tr></table>
          <p style="margin:20px 0 0;font-size:14px;line-height:1.7;color:#3E4C56;">
            Warm regards,<br/>
            <strong>Michael</strong><br/>
            <span style="font-size:12.5px;color:#7C8A93;">Founder, Curi</span>
          </p>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:20px 32px 28px;">
          <p style="margin:0;font-size:11.5px;line-height:1.6;color:#A9B2B8;">
            You received this note because you accessed Curi today during the platform outage.
            If you ever have thoughts or feedback, simply reply to this email.
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function buildEmailText(firstName: string): string {
  const greeting = firstName && firstName !== "there" ? `Hi ${firstName},` : "Hi there,";
  return `${greeting}

I wanted to reach out personally and apologize for what happened earlier today when you opened Curi.

Due to an unexpected glitch on the platform earlier, today's word and fact failed to display in the database — leaving you with an empty screen when you checked in.

I know building a daily habit takes commitment, and when you set aside a moment of your day to learn something new with Curi, the app should work seamlessly. Falling short of that is frustrating, and I am genuinely sorry for the disruption.

The issue is now completely resolved. Starting tomorrow morning, your daily word and interesting fact will be ready and waiting for you right on schedule.

Thank you so much for being an active part of Curi and showing up today. Your time and curiosity mean the world to us.

Open Curi: https://www.trycuri.app/home

Warm regards,
Michael
Founder, Curi`;
}

Deno.serve(async (req) => {
  try {
    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: "RESEND_API_KEY is not configured" }), {
        status: 503,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Fetch user profiles to personalize first names where available
    const { data: profiles } = await supabase
      .from("users")
      .select("email, full_name, first_name")
      .in("email", TARGET_EMAILS);

    // Map emails to first name
    const nameMap = new Map<string, string>();
    (profiles || []).forEach((p) => {
      const name = p.first_name || p.full_name?.split(" ")[0];
      if (name && p.email) {
        nameMap.set(p.email.toLowerCase(), name);
      }
    });

    let sent = 0;
    let failed = 0;
    const results: Array<{ email: string; status: "sent" | "failed" }> = [];

    const subject = "Quick note regarding Curi today (+ our apology)";

    for (const email of TARGET_EMAILS) {
      const normalizedEmail = email.toLowerCase().trim();
      const firstName = nameMap.get(normalizedEmail) || "there";

      const html = buildEmailHtml(firstName);
      const text = buildEmailText(firstName);

      const ok = await sendEmail(normalizedEmail, subject, html, text);

      if (ok) {
        sent++;
        results.push({ email: normalizedEmail, status: "sent" });
        console.log(`[Success] Apology email sent to ${normalizedEmail}`);
      } else {
        failed++;
        results.push({ email: normalizedEmail, status: "failed" });
        console.log(`[Failed] Failed to send apology email to ${normalizedEmail}`);
      }

      // Small delay between sends to respect rate limits
      await new Promise((r) => setTimeout(r, 120));
    }

    return new Response(
      JSON.stringify({
        success: true,
        sent,
        failed,
        total_targeted: TARGET_EMAILS.length,
        results,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("Failed to run glitch apology email function:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
