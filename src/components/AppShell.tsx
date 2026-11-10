import { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';
import { EmailVerificationBanner } from './EmailVerificationBanner';
import { NotificationReEnableBanner } from './NotificationReEnableBanner';
import { useAuth } from '../contexts/AuthContext';

import { StreakCounter } from './StreakCounter';
import { useStreak } from './useStreak';
import logo from '../../public/icon-192.png'
import { Search } from 'lucide-react';
import { DictionaryModal } from './DictionaryModal';


interface AppShellProps {
  children: React.ReactNode;
  /** Page title shown in the top nav bar */
  title?: string;
}

function TopNav({ title, onOpenDictionary }: { title: string; onOpenDictionary: () => void }) {
  const { user } = useAuth();
const { currentStreak, justIncremented, shieldCount } = useStreak();

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
    <header className="sticky top-0 z-20 bg-paper/95 backdrop-blur-md border-b border-line px-4 sm:px-6 py-3 flex items-center gap-4">
      <div className="flex items-center gap-2 lg:hidden">
        <img src={logo} alt="Curi" className="w-7 h-7 rounded-md" />
        <span className="font-display font-bold text-lg text-ink-900 tracking-tight">Curi</span>
      </div>

      <div className="hidden lg:flex flex-col">
        <h1 className="font-display font-bold text-title text-ink-900 leading-none">{title}</h1>
      </div>

      <div className="flex-1" />

      <button
        onClick={onOpenDictionary}
        className="p-2 rounded-full text-ink-500 hover:text-ink-900 hover:bg-ink-900/5 transition-colors mr-2 sm:mr-4"
        aria-label="Open Dictionary"
        title="Lookup a word (Cmd+K)"
      >
        <Search size={22} />
      </button>

     <StreakCounter count={currentStreak} shieldCount={shieldCount} justIncremented={justIncremented} />

      <div className="hidden sm:flex items-center gap-1.5 bg-ink-900/[0.04] border border-line rounded-full px-4 py-1.5">
        <span className="text-xs font-medium text-ink-500 font-ui">{dateLabel}</span>
      </div>

      <div className="flex items-center gap-2 ml-2 max-sm:hidden">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={fullName}
            className="w-8 h-8 rounded-full object-cover ring-2 ring-ember-500/20"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-ember-50 text-ember-600 flex items-center justify-center text-xs font-bold font-ui">
            {initials}
          </div>
        )}
        <span className="hidden sm:block text-sm font-medium text-ink-900 max-w-[120px] truncate font-ui">
          {fullName}
        </span>
      </div>
    </header>
  );
}

export { TopNav };
export function AppShell({ children, title = 'Home' }: AppShellProps) {
  const [dictionaryOpen, setDictionaryOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setDictionaryOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);


  return (
    <div className="min-h-screen bg-paper font-ui text-ink-900 flex">
      <Sidebar />

      {/* Main content column */}
      <div className="flex-1 flex flex-col min-w-0">
        <TopNav title={title} onOpenDictionary={() => setDictionaryOpen(true)} />

        {/* Verification banner */}
        <EmailVerificationBanner />
        <NotificationReEnableBanner />

        {/* Page content — capped at 720px per the desktop layout spec, with
            room at the bottom for the mobile tab bar. */}
        <main className="flex-1 overflow-y-auto pb-24 lg:pb-0">
          <div className="max-w-[720px] mx-auto w-full">
            {children}
          </div>
        </main>
      </div>

      <BottomNav />

      <DictionaryModal isOpen={dictionaryOpen} onClose={() => setDictionaryOpen(false)} />
    </div>
  );
}
