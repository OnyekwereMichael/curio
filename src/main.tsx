import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import * as Sentry from '@sentry/react'
import posthog from 'posthog-js'
import './index.css'
import App from './App.tsx'
import { registerSW } from 'virtual:pwa-register'

Sentry.init({
  dsn: 'https://681e74739716b56eb1e7071cdbb33caa@o4508211596951552.ingest.us.sentry.io/4512068204494848',
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration(),
  ],
  tracesSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
})

const posthogKey = import.meta.env.VITE_POSTHOG_KEY
if (posthogKey) {
  posthog.init(posthogKey, {
    api_host: import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com',
    person_profiles: 'identified_only',
    capture_pageview: true,
  })
}

if ('serviceWorker' in navigator) {
  registerSW({ immediate: true })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Sentry.ErrorBoundary fallback={<div className="p-6 text-center text-amber-900 font-serif">Something went wrong. Please refresh the page.</div>}>
      <App />
    </Sentry.ErrorBoundary>
  </StrictMode>,
)


