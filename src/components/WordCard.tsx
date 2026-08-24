import { Volume2 } from 'lucide-react';
import { DailyStamp } from './DailyStamp';
import { cn } from '../lib/utils';

interface WordCardProps {
  word: string;
  pronunciation?: string;
  definition: string;
  example: string;
  className?: string;
  isArchive?: boolean;
}

export function WordCard({ word, pronunciation = "pro-nun-see-a-shun", definition, example, className, isArchive }: WordCardProps) {
  return (
    <div className={cn(
      "bg-paper rounded-xl p-6 shadow-sm border border-ink/5 relative overflow-hidden flex flex-col gap-4",
      className
    )}>
      <div className="absolute top-4 right-4 z-10">
        <DailyStamp isArchive={isArchive} />
      </div>
      
      <div className="absolute top-0 left-0 w-1 h-full bg-ember rounded-l-xl" />

      <div>
        <div className="flex items-center gap-3 mb-1">
          <h3 className="font-display text-3xl font-bold text-ink">{word}</h3>
          <button className="text-ember hover:text-ember/80 p-2 -ml-2 rounded-full hover:bg-ember/5 transition-colors">
            <Volume2 size={20} strokeWidth={2.5} />
          </button>
        </div>
        <p className="text-faded-ink text-sm font-utility">{pronunciation}</p>
      </div>

      <div className="pt-2">
        <p className="text-ink font-medium mb-3">{definition}</p>
        <div className="pl-4 border-l-2 border-ember/20">
          <p className="text-ink/80 italic text-sm">"{example}"</p>
        </div>
      </div>
    </div>
  );
}
