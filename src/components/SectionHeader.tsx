import { cn } from '../lib/utils';
import { Reveal } from './Reveal';

interface SectionHeaderProps {
  title: string;
  /** Small label above the title. */
  eyebrow?: string;
  description?: string;
  align?: 'center' | 'left';
  /** Light text for use on dark (night) sections. */
  onDark?: boolean;
  className?: string;
}

/** Eyebrow + h2 + one-line description, used to open every landing section. */
export function SectionHeader({ title, eyebrow, description, align = 'center', onDark, className }: SectionHeaderProps) {
  return (
    <Reveal className={cn('flex flex-col gap-3 max-w-2xl', align === 'center' ? 'items-center text-center mx-auto' : 'items-start', className)}>
      {eyebrow && (
        <span className={cn('text-xs font-semibold uppercase tracking-wider font-ui', onDark ? 'text-gold-500' : 'text-ember-600')}>{eyebrow}</span>
      )}
      <h2 className={cn('font-display text-display sm:text-[2.5rem] font-bold leading-tight', onDark ? 'text-cream' : 'text-ink-900')}>{title}</h2>
      {description && <p className={cn('text-base font-ui leading-relaxed', onDark ? 'text-cream-dim' : 'text-ink-500')}>{description}</p>}
    </Reveal>
  );
}
