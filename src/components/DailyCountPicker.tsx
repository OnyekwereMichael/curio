import { cn } from '../lib/utils';

interface Props {
  label: string;
  options: number[];
  value: number;
  onChange: (n: number) => void;
  /** Small note under the picker. */
  hint?: string;
}

/** The "how many a day" 1/3/5 picker, shared by words and facts so they look and behave the same. */
export function DailyCountPicker({ label, options, value, onChange, hint }: Props) {
  return (
    <div className="bg-surface rounded-card border border-line shadow-card p-4 font-ui">
      <p className="text-sm font-semibold text-ink-900 mb-3" id={`count-${label}`}>{label}</p>
      <div role="radiogroup" aria-labelledby={`count-${label}`} className="flex rounded-control border border-line-strong p-0.5">
        {options.map((n) => (
          <button
            key={n}
            role="radio"
            aria-checked={value === n}
            onClick={() => onChange(n)}
            className={cn(
              'flex-1 min-h-11 rounded-tag text-sm font-semibold transition-colors',
              value === n ? 'bg-ink-900 text-paper' : 'text-ink-500 hover:text-ink-900'
            )}
          >
            {n}
          </button>
        ))}
      </div>
      {hint && <p className="text-xs text-ink-500 mt-2">{hint}</p>}
    </div>
  );
}
