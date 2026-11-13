import { useId } from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';
import { spring } from '../../lib/motion';
import { usePrefersReducedMotion } from '../../lib/useReducedMotionPref';

interface SegmentedControlProps<T extends string> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  'aria-label'?: string;
}

/** Pill toggle between a few options; the active pill slides between them. */
export function SegmentedControl<T extends string>({ options, value, onChange, className, ...rest }: SegmentedControlProps<T>) {
  const pillId = useId();
  const reduceMotion = usePrefersReducedMotion();

  return (
    <div role="tablist" aria-label={rest['aria-label']} className={cn('flex p-1 gap-1 rounded-control bg-ink-900/5 font-ui', className)}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={cn(
              'relative flex-1 px-4 py-2 rounded-tag text-sm font-semibold transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember-500',
              active ? 'text-ink-900' : 'text-ink-500 hover:text-ink-900'
            )}
          >
            {active && (
              <motion.span
                layoutId={pillId}
                transition={reduceMotion ? { duration: 0 } : spring.snappy}
                className="absolute inset-0 rounded-tag bg-surface shadow-card"
                aria-hidden="true"
              />
            )}
            <span className="relative">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}
