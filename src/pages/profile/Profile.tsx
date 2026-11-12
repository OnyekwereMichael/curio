import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings as SettingsIcon } from 'lucide-react';
import { AppShell } from '../../components/AppShell';
import { useAuth } from '../../contexts/AuthContext';
import { useStreak } from '../../components/useStreak';
import { fetchWordStats, type WordStats } from '../../services/progress';
import { getProfileExtras, type ProfileExtras } from '../../services/profile';
import { cn } from '../../lib/utils';

const PEBBLE_COLORS: Record<string, string> = {
  ember: 'bg-ember-500 text-on-ember',
  ink: 'bg-ink-900 text-paper',
  moss: 'bg-moss-600 text-paper',
  gold: 'bg-gold-500 text-night',
};

export function ProfilePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentStreak, longestStreak } = useStreak();
  const [wordStats, setWordStats] = useState<WordStats>({ wordsLearned: 0, topicsExplored: 0 });
  const [extras, setExtras] = useState<ProfileExtras | null>(null);

  useEffect(() => {
    if (user) fetchWordStats(user.id).then(setWordStats);
  }, [user]);

  useEffect(() => {
    getProfileExtras().then(setExtras).catch((e) => console.error('getProfileExtras failed', e));
  }, []);

  const fullName =
    user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'Learner';
  const avatarUrl = user?.user_metadata?.avatar_url;
  const initial = fullName.charAt(0).toUpperCase();

  return (
    <AppShell title="You">
      <div className="px-4 py-5 w-full flex flex-col gap-6 items-center text-center">
        <button
          onClick={() => navigate('/settings')}
          aria-label="Settings"
          className="self-end -mb-2 p-2 rounded-full text-ink-500 hover:text-ink-900 hover:bg-ink-900/5 transition-colors"
        >
          <SettingsIcon size={20} />
        </button>

        {avatarUrl ? (
          <img src={avatarUrl} alt={fullName} className="w-20 h-20 rounded-full object-cover ring-4 ring-ember-500/15" />
        ) : (
          <div className="w-20 h-20 rounded-full bg-ember-600 text-on-ember flex items-center justify-center text-2xl font-display font-bold">
            {initial}
          </div>
        )}

        <div>
          <h1 className="font-display text-title font-bold text-ink-900">{fullName}</h1>
          {extras && (
            <span className="inline-block mt-1 text-xs font-semibold text-gold-700 bg-gold-50 px-2.5 py-1 rounded-tag">
              Level {extras.level.level} · {extras.level.title}
            </span>
          )}
        </div>

        {extras && (
          <div className="w-full max-w-xs">
            <div className="flex items-center justify-between text-xs text-ink-500 mb-1 font-ui">
              <span>To Level {extras.level.level + 1} · {extras.level.nextTitle}</span>
              <span>{extras.level.xp} / {extras.level.xpForNextLevel}</span>
            </div>
            <div className="h-2 rounded-full bg-ink-900/10 overflow-hidden">
              <div
                className="h-full bg-gold-500 rounded-full"
                style={{ width: `${Math.min(100, (extras.level.xp / extras.level.xpForNextLevel) * 100)}%` }}
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-3 gap-3 w-full max-w-xs font-ui">
          <div className="bg-surface rounded-card border border-line shadow-card p-3">
            <p className="text-xl font-display font-bold text-ink-900">{currentStreak}</p>
            <p className="text-[11px] text-ink-500 mt-0.5">day streak</p>
          </div>
          <div className="bg-surface rounded-card border border-line shadow-card p-3">
            <p className="text-xl font-display font-bold text-ink-900">{wordStats.wordsLearned}</p>
            <p className="text-[11px] text-ink-500 mt-0.5">words</p>
          </div>
          <div className="bg-surface rounded-card border border-line shadow-card p-3">
            <p className="text-xl font-display font-bold text-ink-900">
              {extras?.friendsCount != null ? extras.friendsCount : longestStreak}
            </p>
            <p className="text-[11px] text-ink-500 mt-0.5">{extras?.friendsCount != null ? 'friends' : 'best streak'}</p>
          </div>
        </div>

        <button
          onClick={() => navigate('/friends')}
          className="w-full max-w-xs flex items-center justify-between rounded-card bg-surface border border-line shadow-card px-4 py-3 text-sm font-semibold text-ink-900 font-ui hover:bg-ink-900/5 transition-colors"
        >
          Friends and streak buddies
          <span className="text-ink-500">›</span>
        </button>

        {extras && (
          <div className="w-full text-left">
            <div className="flex items-baseline justify-between mb-2">
              <h2 className="font-display text-heading font-bold text-ink-900">Pebble shelf</h2>
              <span className="text-xs text-ink-500 font-ui">See all {extras.pebbleShelfTotal}</span>
            </div>
            {extras.pebbleShelf.length === 0 && (
              <p className="text-xs text-ink-500 font-ui">Keep your streak going and finish quizzes to earn your first pebble.</p>
            )}
            <div className="grid grid-cols-4 gap-2">
              {extras.pebbleShelf.map((p) => (
                <div key={p.id} className="flex flex-col items-center gap-1.5">
                  <div className={cn('w-12 h-12 rounded-full flex items-center justify-center', PEBBLE_COLORS[p.colorToken])} />
                  <span className="text-[10px] text-ink-500 text-center font-ui">{p.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
