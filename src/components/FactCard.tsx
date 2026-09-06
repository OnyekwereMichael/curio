import { DailyStamp } from './DailyStamp';
import { cn } from '../lib/utils';

interface FactCardProps {
  imageUrl: string;
  hookLine: string;
  contextLine: string;
  bullets: [string, string, string, string]; // Exactly 4 bullets
  className?: string;
  variant?: 'new' | 'old';
}

export function FactCard({ imageUrl, hookLine, contextLine, bullets, className, variant = 'new' }: FactCardProps) {
  return (
    <div className={cn(
      "bg-paper rounded-xl shadow-sm border border-ink/5 relative overflow-hidden flex flex-col font-ui",
      className
    )}>
      <div className="absolute top-4 right-4 z-10">
        <DailyStamp variant={variant} />
      </div>

      <div className="h-44 bg-moss/10 w-full relative overflow-hidden">
        {imageUrl ? (
          <img src={imageUrl} alt="Fact illustration" className="w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-moss/25">
            <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
            </svg>
          </div>
        )}
        {/* Subtle gradient so the category label below reads cleanly against any image */}
        <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-paper/60 to-transparent" />
      </div>

      <div className="p-6 flex flex-col gap-4">
        <div>
          <div className="text-moss text-xs font-bold tracking-wider uppercase mb-2">
            Fact of the day
          </div>

          <h3 className="font-display text-xl font-bold text-ink leading-snug mb-2">
            {hookLine}
          </h3>

          <p className="text-faded-ink text-sm leading-relaxed">{contextLine}</p>
        </div>

        <div className="h-px bg-ink/8" />

        <ul className="flex flex-col gap-2.5">
          {bullets.map((bullet, idx) => (
            <li key={idx} className="flex gap-3 text-sm text-ink/90 leading-relaxed">
              <span className="text-moss mt-1.5 flex-shrink-0 w-1.5 h-1.5 rounded-full bg-moss" aria-hidden="true" />
              <span>{bullet}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}