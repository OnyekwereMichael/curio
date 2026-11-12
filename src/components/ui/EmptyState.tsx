import { Otter, type OtterMood } from '../Otter';

interface EmptyStateProps {
  title: string;
  message: string;
  mood?: OtterMood;
}

/** Friendly "nothing here yet" block for lists. */
export function EmptyState({ title, message, mood = 'curious' }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center text-center gap-2 py-10 font-ui">
      <Otter mood={mood} size={72} />
      <p className="text-sm font-semibold text-ink-900">{title}</p>
      <p className="text-xs text-ink-500 max-w-xs">{message}</p>
    </div>
  );
}
