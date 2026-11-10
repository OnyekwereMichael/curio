import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Flame } from 'lucide-react';
import { AppShell } from '../../components/AppShell';
import { getFriendsData, type FriendsData } from '../../services/social';
import { cn } from '../../lib/utils';

/** Mock — see docs/BACKEND_TODO.md #6 (friendships/streak_buddies). Preview-only. */
export function FriendsPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<FriendsData | null>(null);

  useEffect(() => {
    getFriendsData().then(setData);
  }, []);

  return (
    <AppShell title="Friends">
      <div className="px-4 py-5 max-w-md mx-auto w-full flex flex-col gap-5">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/play')} className="text-ink-500 hover:text-ink-900">
            <ChevronLeft size={20} />
          </button>
          <h1 className="font-display text-title font-bold text-ink-900">Friends</h1>
        </div>

        {data && (
          <>
            <div className="bg-surface rounded-card border border-line shadow-card p-4 flex items-center gap-3 font-ui">
              <div className="flex -space-x-2 flex-shrink-0">
                <div className="w-9 h-9 rounded-full bg-ember-600 text-on-ember flex items-center justify-center text-xs font-bold ring-2 ring-surface">You</div>
                <div className="w-9 h-9 rounded-full bg-moss-600 text-paper flex items-center justify-center text-xs font-bold ring-2 ring-surface">
                  {data.streakBuddy.name[0]}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-ink-900">Streak buddies with {data.streakBuddy.name}</p>
                <p className="text-xs text-ink-500">{data.streakBuddy.daysTogether} days together · both done today</p>
              </div>
            </div>

            <div>
              <div className="flex items-baseline justify-between mb-2">
                <h2 className="font-display text-heading font-bold text-ink-900">This week</h2>
                <span className="text-xs text-ink-500 font-ui">Resets Monday</span>
              </div>
              <div className="bg-surface rounded-card border border-line shadow-card divide-y divide-line font-ui">
                {data.leaderboard
                  .slice()
                  .sort((a, b) => b.weeklyXp - a.weeklyXp)
                  .map((f, i) => (
                    <div
                      key={f.id}
                      className={cn('flex items-center justify-between px-4 py-3', f.id === 'me' && 'bg-ember-50/60')}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-semibold text-ink-500 w-4">{i + 1}</span>
                        <span className="text-sm font-semibold text-ink-900">{f.name}</span>
                      </div>
                      <span className="text-sm font-semibold text-ink-900 flex items-center gap-1">
                        <Flame size={13} className="text-gold-500" />
                        {f.weeklyXp} XP
                      </span>
                    </div>
                  ))}
              </div>
              <p className="text-xs text-ink-500 mt-2">Only people you add. No public rankings.</p>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
