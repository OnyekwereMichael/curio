import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { Sidebar, SidebarToggle } from './Sidebar';
import { EmailVerificationBanner } from './EmailVerificationBanner';
import { useAuth } from '../contexts/AuthContext';

import { StreakCounter } from './StreakCounter';
import { useStreak } from './useStreak';

interface AppShellProps {
  children: React.ReactNode;
  /** Page title shown in the top nav bar */
  title?: string;
}

function TopNav({ title, onMenuClick }: { title: string; onMenuClick: () => void }) {
  const { user } = useAuth();
  const { currentStreak, justIncremented } = useStreak();

  const avatarUrl = user?.user_metadata?.avatar_url;
  const fullName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split('@')[0] ||
    'Learner';

  const initials = fullName
    .split(' ')
    .map((n: string) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  // e.g. "Saturday, 6 September"
  const dateLabel = new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <header className="sticky top-0 z-30 bg-paper/95 backdrop-blur-md border-b border-ink/8 px-4 sm:px-6 py-3 flex items-center gap-4">
      <div className="lg:hidden">
        <SidebarToggle onClick={onMenuClick} />
      </div>
      <div className="flex items-center gap-2 lg:hidden">
        <div className="w-6 h-6 rounded-md bg-ember flex items-center justify-center">
          <Sparkles size={12} className="text-white" strokeWidth={2.5} />
        </div>
        <span className="font-display font-bold text-lg text-ink tracking-tight">Curio</span>
      </div>

      <div className="hidden lg:flex flex-col">
        <h1 className="font-display font-bold text-xl text-ink leading-none">{title}</h1>
        {/* <p className="text-xs text-faded-ink mt-0.5">{dateLabel}</p> */}
      </div>

      <div className="flex-1" />

      <StreakCounter count={currentStreak} justIncremented={justIncremented} />

      <div className="hidden sm:flex items-center gap-1.5 bg-ink/[0.04] border border-ink/8 rounded-full px-4 py-1.5">
        <span className="text-xs font-medium text-faded-ink">{dateLabel}</span>
      </div>

      <div className="flex items-center gap-2 ml-2">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={fullName}
            className="w-8 h-8 rounded-full object-cover ring-2 ring-ember/20"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-ember/15 text-ember flex items-center justify-center text-xs font-bold">
            {initials}
          </div>
        )}
        <span className="hidden sm:block text-sm font-medium text-ink max-w-[120px] truncate">
          {fullName}
        </span>
      </div>
    </header>
  );
}

export { TopNav };
export function AppShell({ children, title = 'Home' }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-paper font-ui text-ink flex">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main content column */}
      <div className="flex-1 flex flex-col min-w-0">
        <TopNav title={title} onMenuClick={() => setSidebarOpen(true)} />

        {/* Verification banner */}
        <EmailVerificationBanner />

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
