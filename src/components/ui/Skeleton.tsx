import { cn } from '../../lib/utils';

/** Pulsing placeholder block — size and shape come from className. */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn('animate-pulse bg-ink-900/10 rounded-control', className)} />;
}
