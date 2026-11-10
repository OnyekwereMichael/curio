import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';

interface Props {
  step: number;
  totalSteps: number;
  backTo?: string;
  skipTo: string;
  children: React.ReactNode;
}

/** Shared chrome for the mock onboarding wizard — progress bar, back/skip. */
export function OnboardingShell({ step, totalSteps, backTo, skipTo, children }: Props) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-paper flex flex-col font-ui">
      <header className="px-5 pt-5 pb-2 flex items-center gap-4 max-w-md mx-auto w-full">
        {backTo ? (
          <button onClick={() => navigate(backTo)} aria-label="Back" className="text-ink-500 hover:text-ink-900 transition-colors">
            <ChevronLeft size={20} />
          </button>
        ) : (
          <div className="w-5" />
        )}
        <div className="flex-1 h-1.5 rounded-full bg-ink-900/10 overflow-hidden">
          <div
            className="h-full bg-ember-600 rounded-full transition-all duration-300"
            style={{ width: `${(step / totalSteps) * 100}%` }}
          />
        </div>
        <button onClick={() => navigate(skipTo)} className="text-sm font-medium text-ink-500 hover:text-ink-900 transition-colors">
          Skip
        </button>
      </header>

      <main className="flex-1 px-5 pb-8 max-w-md mx-auto w-full flex flex-col">{children}</main>
    </div>
  );
}
