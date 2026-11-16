import posthog from 'posthog-js';

/** Fire-and-forget product event. A no-op when PostHog isn't configured (no VITE_POSTHOG_KEY) — never throws. */
export function track(event: string, properties?: Record<string, unknown>) {
  try {
    if (posthog.__loaded) posthog.capture(event, properties);
  } catch {
    // analytics must never break the app
  }
}
