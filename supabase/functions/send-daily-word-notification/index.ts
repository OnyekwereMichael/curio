// supabase/functions/send-daily-word-notification/index.ts
import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT")!;

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

Deno.serve(async (req) => {
  try {
    const today = new Date().toISOString().split("T")[0];

    const { data: word } = await supabase
      .from("words")
      .select("word")
      .eq("publish_date", today)
      .maybeSingle();

    const notificationTitle = "Your daily word is ready ✍";
    const notificationBody = word
      ? `Today's word: ${word.word}. Tap to learn it.`
      : "Open Curio to see what's new today.";

    const { data: users, error } = await supabase
      .from("users")
      .select("id, notification_token")
      .eq("notifications_enabled", true)
      .not("notification_token", "is", null);

    if (error) throw error;

    const payload = JSON.stringify({
      title: notificationTitle,
      body: notificationBody,
    });

    let sent = 0;
    let failed = 0;
    let cleaned = 0;

    for (const user of users ?? []) {
      try {
        await webpush.sendNotification(user.notification_token, payload);
        sent++;
      } catch (err: any) {
        failed++;
        if (err.statusCode === 404 || err.statusCode === 410) {
          await supabase
            .from("users")
            .update({ notifications_enabled: false, notification_token: null })
            .eq("id", user.id);
          cleaned++;
        } else {
          console.error(`Failed to notify user ${user.id}:`, err.message);
        }
      }
    }

    return new Response(
      JSON.stringify({ sent, failed, cleaned, total: users?.length ?? 0 }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("Word notification job failed:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});