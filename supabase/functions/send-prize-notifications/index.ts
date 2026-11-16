// supabase/functions/send-prize-notifications/index.ts
//
// Drains the prize_notifications outbox (queued by the weekly cycle job): winner announcements,
// "results are in", 24h / 72h claim reminders, expiry notices and "prize sent" confirmations.
// Takes no input and can only send what the database has queued, so it is safe to call repeatedly.
//
// Channels: web push to every device the user registered, plus email (Resend) for anything that
// concerns money. The plain "results are in" message is push-only so it never spams inboxes.
import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM_EMAIL = Deno.env.get("RESEND_FROM_EMAIL") ?? "business@curio.app";
const SITE_URL = Deno.env.get("SITE_URL") ?? "https://trycuri.app";

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const EMAIL_KINDS = new Set(["winner", "reminder_24h", "reminder_72h", "expired", "paid"]);

interface Outbox {
  id: string;
  user_id: string;
  kind: string;
  title: string;
  body: string;
  attempts: number;
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function emailHtml(n: Outbox, firstName: string): string {
  const cta = n.kind === "paid" || n.kind === "expired" ? "Open Curi" : "Claim your prize";
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F6F4EF;font-family:'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;"><tr><td align="center">
<table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;border:1px solid #e8e4dc;overflow:hidden;">
<tr><td style="background:#D8492F;padding:24px 32px;"><p style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">Curi</p></td></tr>
<tr><td style="padding:32px;">
<p style="margin:0 0 12px;font-size:22px;font-weight:700;color:#1C2B3A;">${escapeHtml(n.title)}</p>
<p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#1C2B3A;">Hi ${escapeHtml(firstName)}, ${escapeHtml(n.body)}</p>
<a href="${SITE_URL}/home" style="display:inline-block;background:#D8492F;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 24px;border-radius:10px;">${cta}</a>
</td></tr></table></td></tr></table></body></html>`;
}

async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  if (!RESEND_API_KEY) return false;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: `Curi <${FROM_EMAIL}>`, to, subject, html }),
  });
  if (!res.ok) console.error("Resend error:", await res.text());
  return res.ok;
}

Deno.serve(async () => {
  try {
    const { data: batch, error } = await supabase.rpc("claim_prize_notifications", { p_limit: 50 });
    if (error) throw error;
    const items = (batch ?? []) as Outbox[];

    let sent = 0, skipped = 0, failed = 0;

    for (const n of items) {
      try {
        const { data: user } = await supabase
          .from("users")
          .select("email, full_name, notification_token, notifications_enabled")
          .eq("id", n.user_id)
          .maybeSingle();

        const firstName = (user?.full_name ?? "").trim().split(" ")[0] || "there";
        let delivered = false;

        // Push to every registered device
        const tokens: any[] = !user?.notifications_enabled || !user?.notification_token
          ? []
          : Array.isArray(user.notification_token) ? user.notification_token : [user.notification_token];
        const payload = JSON.stringify({ title: n.title, body: n.body, url: "/home" });
        for (const token of tokens) {
          try {
            await webpush.sendNotification(token, payload);
            delivered = true;
          } catch (err: any) {
            if (err.statusCode !== 404 && err.statusCode !== 410) {
              console.error(`push failed for ${n.user_id}:`, err.message);
            }
          }
        }

        // Email for anything about money
        if (EMAIL_KINDS.has(n.kind) && user?.email) {
          if (await sendEmail(user.email, n.title, emailHtml(n, firstName))) delivered = true;
        }

        const hasChannel = tokens.length > 0 || (EMAIL_KINDS.has(n.kind) && !!user?.email);
        if (delivered) {
          await supabase.from("prize_notifications").update({ status: "sent", sent_at: new Date().toISOString(), last_error: null }).eq("id", n.id);
          sent++;
        } else if (!hasChannel) {
          // Nothing to deliver to (no push token, and no email for this kind): not an error.
          await supabase.from("prize_notifications").update({ status: "skipped", last_error: "no channel" }).eq("id", n.id);
          skipped++;
        } else {
          throw new Error("all channels failed");
        }
      } catch (err: any) {
        failed++;
        // Retried by the next run until attempts reach 3, then left as 'failed'.
        await supabase
          .from("prize_notifications")
          .update({ status: n.attempts >= 3 ? "failed" : "pending", last_error: String(err?.message ?? err).slice(0, 300) })
          .eq("id", n.id);
      }
    }

    return new Response(JSON.stringify({ picked: items.length, sent, skipped, failed }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("send-prize-notifications failed:", err.message);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
});
