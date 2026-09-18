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

    const { data: fact } = await supabase
      .from("facts")
      .select("hook_line, image_url")
      .eq("publish_date", today)
      .maybeSingle();

    const notificationTitle = "Curio · Fact of the Day";
    const notificationBody = fact
      ? fact.hook_line
      : "A new fact is waiting for you in Curio.";

    const { data: users, error } = await supabase
      .from("users")
      .select("id, notification_token, notification_fail_count")
      .eq("notifications_enabled", true)
      .not("notification_token", "is", null);

    if (error) throw error;

    const payload = JSON.stringify({
      title: notificationTitle,
      body: notificationBody,
      image: fact?.image_url || undefined,
    });

    let sent = 0;
    let failed = 0;
    let cleaned = 0;

    for (const user of users ?? []) {
      const tokens = Array.isArray(user.notification_token) 
        ? user.notification_token 
        : (user.notification_token ? [user.notification_token] : []);
        
      if (tokens.length === 0) continue;

      let hasSuccess = false;
      const deadEndpoints = new Set<string>();
      let userFailedCount = 0;

      for (const token of tokens) {
          try {
            await webpush.sendNotification(token, payload);
            sent++;
            hasSuccess = true;
          } catch (err: any) {
            failed++;
            if (err.statusCode === 404 || err.statusCode === 410) {
              deadEndpoints.add(token.endpoint);
              cleaned++;
            } else {
              userFailedCount++;
              console.error(`Failed to notify user ${user.id} on endpoint ${token.endpoint}:`, err.message);
            }
          }
      }
      
      // Cleanup dead tokens
      if (deadEndpoints.size > 0 || (!hasSuccess && userFailedCount > 0)) {
         const newTokens = tokens.filter((t: any) => !deadEndpoints.has(t.endpoint));
         const newFailCount = (!hasSuccess && userFailedCount > 0) ? (user.notification_fail_count ?? 0) + 1 : 0;
         
         if (newTokens.length === 0 || newFailCount >= 3) {
            // All tokens dead, or failed too many times
            await supabase
                .from("users")
                .update({ notifications_enabled: false, notification_token: null, notification_fail_count: 0 })
                .eq("id", user.id);
            if (newFailCount >= 3) {
               console.error(`Disabled notifications for user ${user.id} after 3 consecutive failures.`);
            }
         } else {
            await supabase
                .from("users")
                .update({ notification_token: newTokens, notification_fail_count: newFailCount })
                .eq("id", user.id);
         }
      } else if (hasSuccess && user.notification_fail_count && user.notification_fail_count > 0) {
         // Reset fail count on success
         await supabase
             .from("users")
             .update({ notification_fail_count: 0 })
             .eq("id", user.id);
      }
    }

    return new Response(
      JSON.stringify({ sent, failed, cleaned, total: users?.length ?? 0 }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("Fact notification job failed:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});