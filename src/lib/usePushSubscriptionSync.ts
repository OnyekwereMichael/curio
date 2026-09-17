import { useEffect } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from './superbase';
import { urlBase64ToUint8Array } from './utils';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

/**
 * Silently syncs the browser's current push subscription to the DB whenever
 * a user is logged in.
 *
 * WHY this exists:
 * Push subscriptions are per-device + per-browser. They can silently change
 * when:
 *   - The browser updates
 *   - The user clears site data
 *   - The service worker is updated/re-registered
 *
 * When this happens, the old token in our DB is stale. The push server
 * (FCM/Mozilla) will still accept the message (no 410/404), but it never
 * reaches the device. This hook fixes that by re-registering and upserting
 * the current subscription on every app load.
 */
export function usePushSubscriptionSync(user: User | null) {
    useEffect(() => {
        if (!user) return;

        // Only run if push/service workers are supported
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

        async function syncSubscription() {
            try {
                const registration = await navigator.serviceWorker.ready;

                // Get the current subscription this browser has (may be null)
                const existingSubscription = await registration.pushManager.getSubscription();

                if (!existingSubscription) {
                    // This browser has no active subscription — nothing to sync.
                    // The user may have notifications_enabled=true in DB but this
                    // device never subscribed (or cleared its data).
                    // Don't auto-resubscribe here; that requires user gesture.
                    return;
                }

                // Get what we have stored in the DB for this user
                const { data: dbUser } = await supabase
                    .from('users')
                    .select('notification_token, notifications_enabled')
                    .eq('id', user!.id)
                    .single();

                if (!dbUser || !dbUser.notifications_enabled) return;

                const currentEndpoint = existingSubscription.toJSON().endpoint;
                const storedEndpoint = dbUser.notification_token?.endpoint;

                // If the subscription endpoint has changed, update the DB
                if (currentEndpoint !== storedEndpoint) {
                    console.log('[PushSync] Subscription changed, updating DB...');
                    await supabase
                        .from('users')
                        .update({ notification_token: existingSubscription.toJSON() })
                        .eq('id', user!.id);
                }
            } catch (err) {
                // Non-critical — silently ignore errors so it never breaks the app
                console.warn('[PushSync] Could not sync push subscription:', err);
            }
        }

        syncSubscription();
    }, [user?.id]);
}

/**
 * Re-subscribes the current browser to push notifications and saves the new
 * token to the DB. Call this when the user explicitly enables notifications.
 */
export async function subscribeToPush(userId: string): Promise<boolean> {
    try {
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false;

        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });

        const { error } = await supabase
            .from('users')
            .update({
                notifications_enabled: true,
                notification_token: subscription.toJSON(),
            })
            .eq('id', userId);

        if (error) throw error;
        return true;
    } catch (err) {
        console.error('[PushSync] Failed to subscribe:', err);
        return false;
    }
}
