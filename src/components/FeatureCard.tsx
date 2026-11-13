import { cn } from '../lib/utils';
import type { Feature, FeatureTone } from '../lib/siteConfig';

const TONE: Record<FeatureTone, string> = {
  ember: 'bg-ember-50 text-ember-600',
  moss: 'bg-moss-50 text-moss-600',
  gold: 'bg-gold-50 text-gold-700',
  ink: 'bg-ink-900/5 text-ink-900',
};

interface FeatureCardProps extends Feature {
  tone?: FeatureTone;
  className?: string;
}

/** One feature: icon chip, short title, one-sentence benefit. */
export function FeatureCard({ icon: Icon, title, description, tone = 'ember', className }: FeatureCardProps) {
  return (
    <article
      className={cn(
        'bg-surface rounded-card border border-line shadow-card p-5 flex flex-col gap-3 font-ui transition-all duration-200 hover:-translate-y-0.5 hover:shadow-raised',
        className
      )}
    >
      <span className={cn('w-10 h-10 rounded-control flex items-center justify-center', TONE[tone])}>
        <Icon size={20} aria-hidden="true" />
      </span>
      <h4 className="text-base font-semibold text-ink-900">{title}</h4>
      <p className="text-sm text-ink-500 leading-relaxed">{description}</p>
    </article>
  );
}
