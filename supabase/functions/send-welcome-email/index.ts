// supabase/functions/send-welcome-email/index.ts
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const FROM_EMAIL = Deno.env.get("RESEND_FROM_EMAIL") ?? "hello@mail.trycuri.app";
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function sendEmail(
  to: string,
  subject: string,
  html: string
): Promise<{ ok: boolean; error?: string }> {
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
    console.error(`Resend error for ${to} (status ${res.status}):`, err);
    return { ok: false, error: err };
  }
  return { ok: true };
}

function buildWelcomeEmailHtml(firstName: string): string {
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

        <!-- Header: simple wordmark, no gradient -->
        <tr><td style="padding:32px 32px 0;">
          <p style="margin:0;color:#1C2B3A;font-size:18px;font-weight:700;letter-spacing:-0.3px;">Curi</p>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:24px 32px 0;">
          <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#1C2B3A;">
            Hi ${firstName},
          </p>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#3E4C56;">
            Thanks for signing up for Curi. Starting tomorrow, you'll get one new word and one interesting fact each morning — short enough to read in under a minute.
          </p>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#3E4C56;">
            Here's what to expect:
          </p>

          <!-- Simple list, no icon boxes -->
          <table cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 20px;">
            <tr><td style="padding:6px 0;font-size:14.5px;line-height:1.6;color:#3E4C56;">
              <strong style="color:#1C2B3A;">A word every morning</strong> — definition, pronunciation, and an example sentence.
            </td></tr>
            <tr><td style="padding:6px 0;font-size:14.5px;line-height:1.6;color:#3E4C56;">
              <strong style="color:#1C2B3A;">A fact worth sharing</strong> — science, history, or nature, picked to be genuinely interesting.
            </td></tr>
            <tr><td style="padding:6px 0;font-size:14.5px;line-height:1.6;color:#3E4C56;">
              <strong style="color:#1C2B3A;">A streak you build over time</strong> — no pressure, just a small daily habit.
            </td></tr>
          </table>

          <p style="margin:0 0 24px;font-size:15px;line-height:1.7;color:#3E4C56;">
            Your first word is already waiting for you.
          </p>
        </td></tr>

        <!-- CTA: text-style link, not a button -->
        <tr><td style="padding:0 32px 28px;">
          <a href="https://www.trycuri.app/home" style="color:#D8492F;font-weight:600;font-size:15px;text-decoration:none;border-bottom:1px solid #D8492F;padding-bottom:1px;">
            Open Curi &rarr;
          </a>
        </td></tr>

        <!-- Sign-off -->
        <tr><td style="padding:0 32px 8px;">
          <table width="100%" cellpadding="0" cellspacing="0"><tr><td style="border-top:1px solid #F0EDE7;"></td></tr></table>
          <p style="margin:20px 0 0;font-size:14px;line-height:1.7;color:#3E4C56;">
            Glad you're here,<br/>
            Michael<br/>
            <span style="font-size:12.5px;color:#7C8A93;">Founder, Curi</span>
          </p>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:24px 32px 28px;">
          <p style="margin:0;font-size:11.5px;line-height:1.6;color:#A9B2B8;">
            You're receiving this because you created a Curi account.
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function buildWelcomeEmailText(firstName: string): string {
  return `Hi ${firstName},

Thanks for signing up for Curi. Starting tomorrow, you'll get one new word and one interesting fact each morning — short enough to read in under a minute.

Here's what to expect:
- A word every morning — definition, pronunciation, and an example sentence.
- A fact worth sharing — science, history, or nature, picked to be genuinely interesting.
- A streak you build over time — no pressure, just a small daily habit.

Your first word is already waiting for you: https://www.trycuri.app/home

Glad you're here,
Michael
Founder, Curi

—
You're receiving this because you created a Curi account.`;
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
    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("welcome_email_sent_at")
      .eq("id", userId)
      .maybeSingle();

    if (profileError) {
      console.error(`Failed to look up profile for ${userId}:`, profileError.message);
      // Don't block sending just because the idempotency check failed —
      // better to risk a duplicate than to silently skip a real welcome email.
    }

    if (profile?.welcome_email_sent_at) {
      return new Response(
        JSON.stringify({ skipped: true, reason: "Welcome email already sent" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const firstName = rawFirstName?.split(" ")[0] || "there";
    const html = buildWelcomeEmailHtml(firstName);
    const subject = `Welcome to Curi, ${firstName}! Your first word is waiting 📖`;

    const { ok, error: sendError } = await sendEmail(email, subject, html);

    if (ok) {
      const { error: updateError } = await supabase
        .from("users")
        .update({ welcome_email_sent_at: new Date().toISOString() })
        .eq("id", userId);

      if (updateError) {
        // Email sent fine, but we couldn't record that it was sent —
        // log it clearly so it doesn't go unnoticed and cause a duplicate send later.
        console.error(
          `Email sent to ${email} but failed to update welcome_email_sent_at:`,
          updateError.message
        );
      }

      return new Response(
        JSON.stringify({ sent: true, to: email }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      return new Response(
        JSON.stringify({ sent: false, error: sendError ?? "Email delivery failed" }),
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