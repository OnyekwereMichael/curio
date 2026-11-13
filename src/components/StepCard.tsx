import type { Step } from '../lib/siteConfig';

interface StepCardProps extends Step {
  /** 1-based position, shown as the step number. */
  number: number;
}

/** One step of the walkthrough: numbered icon badge, title, short description. */
export function StepCard({ icon: Icon, title, description, number }: StepCardProps) {
  return (
    <li className="relative flex flex-col items-center text-center sm:items-start sm:text-left gap-3 font-ui">
      <span className="relative w-14 h-14 rounded-full bg-surface border-2 border-moss-600 text-moss-600 flex items-center justify-center shadow-card">
        <Icon size={24} aria-hidden="true" />
        <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-ink-900 text-paper text-xs font-bold flex items-center justify-center font-utility">
          {number}
        </span>
      </span>
      <h3 className="text-lg font-semibold text-ink-900">{title}</h3>
      <p className="text-sm text-ink-500 leading-relaxed max-w-xs">{description}</p>
    </li>
  );
}
