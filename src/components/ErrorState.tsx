import { Otter } from './Otter';

interface Props {
  message?: string;
  onRetry?: () => void;
}

/**
 * Router-independent by design — used as the Sentry ErrorBoundary fallback
 * in main.tsx, which can render outside the Router if App itself throws.
 */
export function ErrorState({ message, onRetry }: Props) {
  return (
    <div className="min-h-screen bg-paper flex flex-col items-center justify-center px-6 text-center font-ui">
      <Otter mood="thinking" size={96} className="mb-5" />
      <h1 className="font-display text-title font-bold text-ink-900 mb-2">Something got tangled</h1>
      <p className="text-sm text-ink-500 leading-relaxed max-w-xs mb-6">
        {message || "I couldn't load that. Your streak is safe while I try again."}
      </p>
      <button
        onClick={onRetry ?? (() => window.location.reload())}
        className="px-6 py-3 rounded-control bg-ember-600 text-on-ember text-sm font-semibold hover:brightness-105 transition-all"
      >
        Try again
      </button>
    </div>
  );
}
