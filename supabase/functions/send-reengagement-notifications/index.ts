// supabase/functions/send-reengagement-notifications/index.ts
import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT")!;

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

// Service role client — bypasses RLS to read all users. Never expose this key client-side.
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        // Allow an optional "days" query param so the admin dashboard can override threshold
        const url = new URL(req.url);
        const inactiveDays = parseInt(url.searchParams.get("days") ?? "1", 10);

        const today = new Date().toISOString().split("T")[0];

        // Get today's word — personalise the nudge if possible
        const { data: word } = await supabase
            .from("words")
            .select("word")
            .eq("publish_date", today)
            .maybeSingle();

        const notificationTitle = "We miss you on Curio 👋";
        const notificationBody = word
            ? `Today's word is "${word.word}" — come back and discover it!`
            : "You've been away a while. Open Curio to catch up on new words and facts.";

        // Target only users who:
        //  1. Have push notifications enabled
        //  2. Have a valid push subscription token
        //  3. Haven't been seen for at least `inactiveDays` days
        //  4. Haven't already received a re-engagement push today
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - inactiveDays);

        const { data: users, error } = await supabase
            .from("users")
            .select("id, notification_token, reengagement_push_sent_at")
            .eq("notifications_enabled", true)
            .not("notification_token", "is", null)
            .or(`last_seen_at.is.null,last_seen_at.lt.${cutoff.toISOString()}`);

        if (error) throw error;

        const payload = JSON.stringify({
            title: notificationTitle,
            body: notificationBody,
            url: "/home",
        });

        let sent = 0;
        let skipped = 0;
        let failed = 0;
        let cleaned = 0;

        for (const user of users ?? []) {
            // Skip if we already sent a re-engagement push within the last 24 hours
            // (prevents hammering a single user if the cron fires multiple times)
            if (user.reengagement_push_sent_at) {
                const lastSent = new Date(user.reengagement_push_sent_at).getTime();
                const hoursAgo = (Date.now() - lastSent) / (1000 * 3600);
                if (hoursAgo < 24) {
                    skipped++;
                    continue;
                }
            }

            try {
                await webpush.sendNotification(user.notification_token, payload);

                // Mark this user as having received a re-engagement push
                await supabase
                    .from("users")
                    .update({ reengagement_push_sent_at: new Date().toISOString() })
                    .eq("id", user.id);

                sent++;
            } catch (err: any) {
                failed++;
                // Dead subscription — self-heal
                if (err.statusCode === 404 || err.statusCode === 410) {
                    await supabase
                        .from("users")
                        .update({ notifications_enabled: false, notification_token: null })
                        .eq("id", user.id);
                    cleaned++;
                } else {
                    console.error(`Re-engagement push failed for ${user.id}:`, err.message);
                }
            }
        }

        return new Response(
            JSON.stringify({
                sent,
                skipped,
                failed,
                cleaned,
                total_eligible: users?.length ?? 0,
                inactive_threshold_days: inactiveDays,
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    } catch (err: any) {
        console.error("Re-engagement push job failed:", err.message);
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});
