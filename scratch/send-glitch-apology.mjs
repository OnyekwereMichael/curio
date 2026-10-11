// scratch/send-glitch-apology.mjs
// Script to send the apology email to the 7 affected Gmail accounts via Resend API.
//
// Usage:
//   node scratch/send-glitch-apology.mjs <RESEND_API_KEY>
// Or if RESEND_API_KEY is already set in your environment or .env:
//   node scratch/send-glitch-apology.mjs

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Search multiple possible locations for .env
const candidateEnvPaths = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(__dirname, '../.env'),
  path.resolve(__dirname, '.env')
];

const env = {};
for (const envPath of candidateEnvPaths) {
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split(/\r?\n/).forEach(line => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        let value = (match[2] || '').trim();
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        env[match[1]] = value;
      }
    });
    break;
  }
}

const RESEND_API_KEY =
  process.argv[2] ||
  process.env.RESEND_API_KEY ||
  env.RESEND_API_KEY ||
  env.VITE_RESEND_API_KEY;

const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL ||
  env.RESEND_FROM_EMAIL ||
  env.VITE_RESEND_FROM_EMAIL ||
  'business@mail.trycuri.app';

if (!RESEND_API_KEY) {
  console.error("❌ RESEND_API_KEY not found in environment or .env file.");
  console.log("Usage: node scratch/send-glitch-apology.mjs <RESEND_API_KEY>");
  console.log("Or add RESEND_API_KEY=re_... into your .env file and save it (Ctrl+S).");
  process.exit(1);
}

if (!RESEND_API_KEY.startsWith("re_")) {
  console.error(`\n❌ Invalid key format: "${RESEND_API_KEY.slice(0, 16)}..."`);
  if (RESEND_API_KEY.startsWith("sb_") || RESEND_API_KEY.startsWith("eyJ")) {
    console.error("👉 That is a Supabase key (starts with 'sb_' or 'eyJ'), NOT a Resend API key.");
  } else {
    console.error("👉 Resend API keys must begin with 're_'");
  }
  console.error("👉 To get your Resend API key:");
  console.error("   1. Log into https://resend.com/api-keys");
  console.error("   2. Copy or create a key (it starts with 're_...')");
  console.error("   3. Add it to .env as RESEND_API_KEY=re_... (press Ctrl+S to save) or pass it directly:\n");
  console.error("      node scratch/send-glitch-apology.mjs re_your_key_here\n");
  process.exit(1);
}

const TARGET_EMAILS = [
  "onyekweremichael55@gmail.com",
  "ireoluwadaniel43@gmail.com",
  "lawrencepraise92@gmail.com",
  "chuadrian243@gmail.com",
  "chinelonwosu0@gmail.com",
  "nuelemmanuel766@gmail.com",
  "realcharlieok@gmail.com",
];

function buildEmailHtml() {
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
            Hi there,
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

          <!-- Status Callout -->
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

function buildEmailText() {
  return `Hi there,

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

async function sendAll() {
  console.log(`🚀 Starting apology email dispatch to ${TARGET_EMAILS.length} recipients...`);
  const subject = "Quick note regarding Curi today (+ our apology)";
  const html = buildEmailHtml();
  const text = buildEmailText();

  let sent = 0;
  let failed = 0;

  for (const to of TARGET_EMAILS) {
    try {
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
        const errorText = await res.text();
        console.error(`❌ Failed for ${to}:`, errorText);
        failed++;
      } else {
        const data = await res.json();
        console.log(`✅ Sent to ${to} (ID: ${data.id})`);
        sent++;
      }
    } catch (err) {
      console.error(`❌ Network error for ${to}:`, err.message);
      failed++;
    }

    // Rate-limit buffer
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  console.log(`\n🎉 Completed: ${sent} sent, ${failed} failed.`);
}

sendAll();
