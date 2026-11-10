import { cn } from "../lib/utils";

interface DailyStampProps {
  date?: string;
  variant?: 'new' | 'old';
  className?: string;
}

export function DailyStamp({ 
  date = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }), 
  variant = 'new',
  className 
}: DailyStampProps) {
  return (
    <div 
      className={cn(
        "font-utility text-sm font-medium px-3 py-1 rounded-tag border inline-block",
        "transform -rotate-4 origin-center",
        variant === 'old'
          ? "text-ink-500 border-ink-500/30 bg-surface"
          : "text-gold-700 border-gold-500/40 bg-surface",
        className
      )}
      style={{
        boxShadow: variant === 'old'
          ? '0 0 0 1px rgba(124, 138, 147, 0.1), inset 0 0 0 1px rgba(124, 138, 147, 0.1)' 
          : '0 0 0 1px rgba(199, 150, 46, 0.1), inset 0 0 0 1px rgba(199, 150, 46, 0.1)',
        backdropFilter: 'blur(2px)'
      }}
    >
      {date}
    </div>
  );
}
