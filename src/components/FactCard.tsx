import { DailyStamp } from './DailyStamp';
import { cn } from '../lib/utils';

interface FactCardProps {
  hook: string;
  context: string;
  bullets: string[];
  className?: string;
  isArchive?: boolean;
}

export function FactCard({ hook, context, bullets, className, isArchive }: FactCardProps) {
  return (
    <div className={cn(
      "bg-paper rounded-xl shadow-sm border border-ink/5 relative overflow-hidden flex flex-col",
      className
    )}>
      <div className="absolute top-4 right-4 z-10">
        <DailyStamp isArchive={isArchive} />
      </div>
      
      <div className="absolute top-0 left-0 w-1 h-full bg-moss rounded-l-xl z-20" />

      {/* Image Placeholder */}
      <div className="h-40 bg-moss/10 w-full relative">
        <div className="absolute inset-0 flex items-center justify-center text-moss/30">
           {/* Decorative abstract shapes instead of real image for placeholder */}
           <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><path d="m10 13-2 2 2 2"/><path d="m14 17 2-2-2-2"/></svg>
        </div>
      </div>

      <div className="p-6 flex flex-col gap-3">
        <h3 className="font-display text-xl font-bold text-ink leading-tight">
          Did you know that {hook}?
        </h3>
        
        <p className="text-ink/80 text-sm mb-2">{context}</p>

        <ul className="flex flex-col gap-2">
          {bullets.map((bullet, idx) => (
            <li key={idx} className="flex gap-3 text-sm text-ink/90">
              <span className="text-moss mt-0.5">•</span>
              <span>{bullet}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
