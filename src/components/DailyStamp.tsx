import { cn } from "../lib/utils";

interface DailyStampProps {
  date?: string;
  isArchive?: boolean;
  className?: string;
}

export function DailyStamp({ 
  date = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }), 
  isArchive = false,
  className 
}: DailyStampProps) {
  return (
    <div 
      className={cn(
        "font-utility text-sm font-medium px-3 py-1 rounded-sm border inline-block",
        "transform -rotate-2 origin-center",
        isArchive 
          ? "text-faded-ink border-faded-ink/30 bg-paper" 
          : "text-gold-stamp border-gold-stamp/30 bg-paper",
        className
      )}
      style={{
        boxShadow: isArchive 
          ? '0 0 0 1px rgba(124, 138, 147, 0.1), inset 0 0 0 1px rgba(124, 138, 147, 0.1)' 
          : '0 0 0 1px rgba(199, 150, 46, 0.1), inset 0 0 0 1px rgba(199, 150, 46, 0.1)',
        backdropFilter: 'blur(2px)'
      }}
    >
      {date}
    </div>
  );
}
