// supabase/functions/send-welcome-email/index.ts
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const FROM_EMAIL = Deno.env.get("RESEND_FROM_EMAIL") ?? "hello@trycuri.app";

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

function buildWelcomeEmailHtml(firstName: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
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

        <!-- Hero text -->
        <tr><td style="padding:36px 32px 0;">
          <p style="margin:0 0 6px;font-size:26px;font-weight:800;color:#1C2B3A;letter-spacing:-0.5px;line-height:1.2;">
            Welcome, ${firstName}! 🎉
          </p>
          <p style="margin:12px 0 0;font-size:15px;line-height:1.7;color:#7C8A93;">
            You've just joined a community of curious minds. Every day, Curi delivers one new word and one mind-expanding fact in a fun way.
          </p>
        </td></tr>

        <!-- What to expect card -->
        <tr><td style="padding:24px 32px 0;">
          <table cellpadding="0" cellspacing="0" width="100%" style="background:#FBF7F1;border:1px solid #F0EADD;border-radius:14px;">
            <tr><td style="padding:20px 22px;">
              <p style="margin:0 0 14px;font-size:11px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:#D8492F;">What to expect</p>

              <!-- Word -->
              <table cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:14px;">
                <tr>
                  <td width="30" valign="top">
                    <p style="margin:0;font-size:18px;line-height:1;">📖</p>
                  </td>
                  <td style="padding-left:10px;">
                    <p style="margin:0;font-size:14px;font-weight:700;color:#1C2B3A;">One word, every morning</p>
                    <p style="margin:3px 0 0;font-size:13px;color:#7C8A93;line-height:1.5;">Definition, pronunciation, and an example sentence you'll actually remember.</p>
                  </td>
                </tr>
              </table>

              <!-- Fact -->
              <table cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:14px;">
                <tr>
                  <td width="30" valign="top">
                    <p style="margin:0;font-size:18px;line-height:1;">💡</p>
                  </td>
                  <td style="padding-left:10px;">
                    <p style="margin:0;font-size:14px;font-weight:700;color:#1C2B3A;">One fact that'll blow your mind</p>
                    <p style="margin:3px 0 0;font-size:13px;color:#7C8A93;line-height:1.5;">Science, history, nature — something genuinely interesting to share at dinner.</p>
                  </td>
                </tr>
              </table>

              <!-- Streak -->
              <table cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td width="30" valign="top">
                    <p style="margin:0;font-size:18px;line-height:1;">🔥</p>
                  </td>
                  <td style="padding-left:10px;">
                    <p style="margin:0;font-size:14px;font-weight:700;color:#1C2B3A;">Build a streak</p>
                    <p style="margin:3px 0 0;font-size:13px;color:#7C8A93;line-height:1.5;">Come back daily, save favourites, and watch your collection grow quietly over time.</p>
                  </td>
                </tr>
              </table>
            </td></tr>
          </table>
        </td></tr>

        <!-- Personal note -->
        <tr><td style="padding:24px 32px 0;">
          <p style="margin:0;font-size:14.5px;line-height:1.75;color:#1C2B3A;">
            No pressure, no rigid courses, no guilt for missing a day. Just a small daily habit of curiosity, the kind that stacks up quietly and makes you a more interesting person over time.
          </p>
          <p style="margin:14px 0 0;font-size:14.5px;line-height:1.75;color:#1C2B3A;">
            Your first word is already waiting. 👇
          </p>
        </td></tr>

        <!-- CTA -->
        <tr><td style="padding:24px 32px 0;">
          <table cellpadding="0" cellspacing="0">
            <tr><td style="background:#D8492F;border-radius:12px;">
              <a href="https://www.trycuri.app/home" style="color:#fff;font-weight:700;font-size:15px;text-decoration:none;display:block;padding:15px 32px;letter-spacing:0.2px;">
                Start Learning Today &rarr;
              </a>
            </td></tr>
          </table>
        </td></tr>

        <!-- Sign-off -->
        <tr><td style="padding:28px 32px 0;">
          <table width="100%" cellpadding="0" cellspacing="0"><tr><td style="border-top:1px solid #F0EDE7;"></td></tr></table>
          <p style="margin:20px 0 0;font-size:14px;line-height:1.7;color:#7C8A93;">
            Glad you're here,<br/>
            <strong style="color:#1C2B3A;">Michael</strong><br/>
            <span style="font-size:12px;">Founder, Curi</span>
          </p>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:20px 32px 32px;">
          <p style="margin:0;font-size:12px;line-height:1.6;color:#A9B2B8;">
            You're receiving this because you created a Curi account.<br/>
            &#10022; Curi &middot; Learn something new, one day at a time.
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

    // Expect { userId, email, firstName } in the request body
    const body = await req.json().catch(() => ({}));
    const { userId, email, firstName: rawFirstName } = body;

    if (!userId || !email) {
      return new Response(JSON.stringify({ error: "userId and email are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Idempotency: skip if we already sent for this user
    const { data: profile } = await supabase
      .from("users")
      .select("welcome_email_sent_at")
      .eq("id", userId)
      .maybeSingle();

    if (profile?.welcome_email_sent_at) {
      return new Response(
        JSON.stringify({ skipped: true, reason: "Welcome email already sent" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const firstName = rawFirstName?.split(" ")[0] || "there";
    const html = buildWelcomeEmailHtml(firstName);
    const subject = `Welcome to Curi, ${firstName}! Your first word is waiting 📖`;

    const ok = await sendEmail(email, subject, html);

    if (ok) {
      await supabase
        .from("users")
        .update({ welcome_email_sent_at: new Date().toISOString() })
        .eq("id", userId);

      return new Response(
        JSON.stringify({ sent: true, to: email }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      return new Response(
        JSON.stringify({ sent: false, error: "Email delivery failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (err: any) {
    console.error("Welcome email failed:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
