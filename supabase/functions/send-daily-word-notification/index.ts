// supabase/functions/send-daily-word-notification/index.ts
import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2";
import { getAlmostThereMessage } from "./almostThere.ts";
import { wordMessage } from "./personalise.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT")!;

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

Deno.serve(async (req) => {
  try {
    // Adding ?dry_run=1 to the address counts who would get which message
    // and sends nothing. Handy for testing without notifying anyone.
    const dryRun = new URL(req.url).searchParams.get("dry_run") === "1";

    const today = new Date().toISOString().split("T")[0];

    // The shared word of the day, for people who have not finished onboarding.
    const { data: word } = await supabase
      .from("words")
      .select("word")
      .eq("publish_date", today)
      .maybeSingle();

    const sharedPayload = JSON.stringify({
      title: "Curio · Word of the Day",
      body: word
        ? `${word.word} is waiting for you — tap to learn it.`
        : "A new word is waiting for you in Curio.",
    });

    // Each onboarded user's own words for today. This builds (and saves) their
    // plan, so the word named here is exactly the word the app shows them.
    const plans = new Map<string, { words: string[]; completed: boolean }>();
    const { data: planRows, error: planError } = await supabase.rpc("notification_plans", { p_date: today });
    if (planError) {
      // Fall back to the shared message for everyone rather than sending nothing.
      console.error("notification_plans failed, using shared message:", planError.message);
    }
    for (const p of planRows ?? []) plans.set(p.user_id, { words: p.words ?? [], completed: p.completed });

    const { data: users, error } = await supabase
      .from("users")
      .select(
        "id, notification_token, notification_fail_count, current_streak, last_active_date, last_milestone_shown, shield_count",
      )
      .eq("notifications_enabled", true)
      .not("notification_token", "is", null);

    if (error) throw error;

    let sent = 0;
    let failed = 0;
    let cleaned = 0;
    let almostThere = 0;
    let personalised = 0;
    let skippedDone = 0;

    for (const user of users ?? []) {
      // Someone one day from a milestone gets the nudge instead of the normal
      // message, so they never receive two notifications.
      const nudge = getAlmostThereMessage(user, today);
      const plan = plans.get(user.id);

      // Already finished today's plan and no milestone to celebrate: stay quiet.
      if (!nudge && plan?.completed) {
        skippedDone++;
        continue;
      }

      let payload = sharedPayload;
      if (nudge) {
        almostThere++;
        payload = JSON.stringify(nudge);
      } else if (plan && plan.words.length > 0) {
        personalised++;
        payload = JSON.stringify(wordMessage(plan.words));
      }
      if (dryRun) continue;

      // Users can have several devices; older rows hold a single subscription.
      const tokens = Array.isArray(user.notification_token)
        ? user.notification_token
        : user.notification_token
          ? [user.notification_token]
          : [];
      if (tokens.length === 0) continue;

      let hasSuccess = false;
      let userFailedCount = 0;
      const deadEndpoints = new Set<string>();

      for (const token of tokens) {
        try {
          await webpush.sendNotification(token, payload);
          sent++;
          hasSuccess = true;
        } catch (err: any) {
          failed++;
          if (err.statusCode === 404 || err.statusCode === 410) {
            // Genuinely dead subscription: drop just that device.
            deadEndpoints.add(token.endpoint);
            cleaned++;
          } else {
            userFailedCount++;
            console.error(`Failed to notify user ${user.id} on endpoint ${token.endpoint}:`, err.message);
          }
        }
      }

      if (deadEndpoints.size > 0 || (!hasSuccess && userFailedCount > 0)) {
        const newTokens = tokens.filter((t: any) => !deadEndpoints.has(t.endpoint));
        // Only count a failure against the user if no device received it.
        const newFailCount = !hasSuccess && userFailedCount > 0 ? (user.notification_fail_count ?? 0) + 1 : 0;

        if (newTokens.length === 0 || newFailCount >= 3) {
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
        await supabase.from("users").update({ notification_fail_count: 0 }).eq("id", user.id);
      }
    }

    return new Response(
      JSON.stringify({
        sent, failed, cleaned, almostThere, personalised, skippedDone,
        total: users?.length ?? 0, dryRun,
      }),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    console.error("Word notification job failed:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
