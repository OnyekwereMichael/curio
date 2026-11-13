import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronLeft, Flame, Copy, Check, UserMinus, Users } from 'lucide-react';
import { AppShell } from '../../components/AppShell';
import { Otter } from '../../components/Otter';
import {
  getFriendsData,
  getInviteCode,
  inviteLink,
  acceptInvite,
  removeFriend,
  setStreakBuddy,
  setHideFromBoard,
  type FriendsData,
} from '../../services/social';
import { cn } from '../../lib/utils';

export function FriendsPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [data, setData] = useState<FriendsData | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [code, setCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [enterCode, setEnterCode] = useState(params.get('code') ?? '');
  const [accepting, setAccepting] = useState(false);
  const [notice, setNotice] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  const load = useCallback(() => {
    getFriendsData()
      .then(setData)
      .catch((e) => {
        console.error('getFriendsData failed', e);
        setLoadFailed(true);
      });
  }, []);

  useEffect(() => {
    load();
    getInviteCode().then(setCode).catch((e) => console.error('getInviteCode failed', e));
  }, [load]);

  async function handleCopy() {
    if (!code) return;
    const link = inviteLink(code);
    try {
      if (navigator.share) await navigator.share({ title: 'Join me on Curi', text: `Be my word buddy on Curi. Code: ${code}`, url: link });
      else await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // user dismissed the share sheet — nothing to do
    }
  }

  async function handleAccept(e: React.FormEvent) {
    e.preventDefault();
    if (!enterCode.trim()) return;
    setAccepting(true);
    setNotice(null);
    try {
      const name = await acceptInvite(enterCode);
      setNotice({ kind: 'ok', text: `You and ${name} are now friends.` });
      setEnterCode('');
      if (params.has('code')) setParams({}, { replace: true });
      load();
    } catch (err) {
      setNotice({ kind: 'error', text: err instanceof Error ? err.message : 'Could not use that code.' });
    } finally {
      setAccepting(false);
    }
  }

  async function run(action: () => Promise<void>, errorText: string) {
    setNotice(null);
    try {
      await action();
      load();
    } catch (err) {
      console.error(errorText, err);
      setNotice({ kind: 'error', text: errorText });
    }
  }

  function handleRemove(id: string, name: string) {
    if (!window.confirm(`Remove ${name} from your friends?`)) return;
    run(() => removeFriend(id), 'Could not remove that friend.');
  }

  return (
    <AppShell title="Friends">
      <div className="px-4 py-5 max-w-md mx-auto w-full flex flex-col gap-5">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/profile')} aria-label="Back" className="text-ink-500 hover:text-ink-900">
            <ChevronLeft size={20} />
          </button>
          <h1 className="font-display text-title font-bold text-ink-900">Friends</h1>
        </div>

        {notice && (
          <p className={cn('text-sm font-ui rounded-control px-3 py-2', notice.kind === 'ok' ? 'bg-moss-50 text-moss-600' : 'bg-ember-50 text-ember-600')}>
            {notice.text}
          </p>
        )}

        {!data && !loadFailed && (
          <div className="flex flex-col items-center justify-center text-center gap-3 py-16">
            <Otter mood="thinking" size={72} breathe />
            <p className="text-sm text-ink-500">Turning the pebble over…</p>
          </div>
        )}
        {loadFailed && <p className="text-sm text-ink-500 text-center py-10">Couldn't load your friends. Try again in a moment.</p>}

        {/* Invite */}
        <div className="bg-surface rounded-card border border-line shadow-card p-4 flex flex-col gap-3 font-ui">
          <p className="text-sm font-semibold text-ink-900">Invite a friend</p>
          <div className="flex items-center gap-2">
            <span className="flex-1 min-w-0 text-center tracking-[0.2em] font-display text-lg font-bold text-ink-900 bg-ink-900/5 rounded-control py-2">
              {code ?? '········'}
            </span>
            <button
              onClick={handleCopy}
              disabled={!code}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-control bg-ink-900 text-paper text-sm font-semibold disabled:opacity-40"
            >
              {copied ? <Check size={15} /> : <Copy size={15} />}
              {copied ? 'Copied' : 'Share'}
            </button>
          </div>
          <p className="text-xs text-ink-500">One-time code, good for 14 days. Friends see only your first name and weekly XP.</p>

          <form onSubmit={handleAccept} className="flex gap-2 pt-3 border-t border-line">
            <input
              value={enterCode}
              onChange={(e) => setEnterCode(e.target.value.toUpperCase())}
              maxLength={8}
              placeholder="Got a code? Enter it"
              className="flex-1 min-w-0 bg-surface border border-line-strong rounded-control px-4 py-2.5 text-sm text-ink-900 placeholder:text-ink-500/60 focus:outline-none focus:ring-2 focus:ring-ink-900/20 uppercase"
            />
            <button
              type="submit"
              disabled={accepting || !enterCode.trim()}
              className="px-4 rounded-control border-2 border-line-strong text-ink-900 text-sm font-semibold disabled:opacity-40"
            >
              Add
            </button>
          </form>
        </div>

        {data && data.friendsCount === 0 && (
          <div className="text-center py-6 text-ink-500 text-sm font-ui flex flex-col items-center gap-2">
            <Users size={28} className="text-ink-500/60" />
            No friends yet. Share your code to start a weekly board and streak buddies.
          </div>
        )}

        {data && data.friendsCount > 0 && (
          <>
            {data.streakBuddy ? (
              <div className="bg-surface rounded-card border border-line shadow-card p-4 flex items-center gap-3 font-ui">
                <div className="flex -space-x-2 flex-shrink-0">
                  <div className="w-9 h-9 rounded-full bg-ember-600 text-on-ember flex items-center justify-center text-xs font-bold ring-2 ring-surface">You</div>
                  <div className="w-9 h-9 rounded-full bg-moss-600 text-paper flex items-center justify-center text-xs font-bold ring-2 ring-surface">
                    {data.streakBuddy.name[0]}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-ink-900">Streak buddies with {data.streakBuddy.name}</p>
                  <p className="text-xs text-ink-500">
                    {data.streakBuddy.daysTogether} day{data.streakBuddy.daysTogether !== 1 ? 's' : ''} together
                    {data.streakBuddy.bothDoneToday ? ' · both done today' : ' · finish today\'s quiz to keep it going'}
                  </p>
                </div>
                <button
                  onClick={() => run(() => setStreakBuddy(null), 'Could not end the streak buddy.')}
                  className="text-xs text-ink-500 hover:text-ember-600 flex-shrink-0"
                >
                  End
                </button>
              </div>
            ) : (
              <p className="text-xs text-ink-500 font-ui text-center">Tap "Be buddies" next to a friend to start a shared streak.</p>
            )}

            <div>
              <div className="flex items-baseline justify-between mb-2">
                <h2 className="font-display text-heading font-bold text-ink-900">This week</h2>
                <span className="text-xs text-ink-500 font-ui">Resets Monday</span>
              </div>
              <div className="bg-surface rounded-card border border-line shadow-card divide-y divide-line font-ui">
                {data.leaderboard.map((f, i) => (
                  <div key={f.id} className={cn('flex items-center justify-between gap-2 px-4 py-3', f.isMe && 'bg-ember-50/60')}>
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-xs font-semibold text-ink-500 w-4">{i + 1}</span>
                      <span className="text-sm font-semibold text-ink-900 truncate">{f.isMe ? 'You' : f.name}</span>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="text-sm font-semibold text-ink-900 flex items-center gap-1">
                        <Flame size={13} className="text-gold-500" />
                        {f.weeklyXp} XP
                      </span>
                      {!f.isMe && (
                        <>
                          {data.streakBuddy?.id !== f.id && (
                            <button
                              onClick={() => run(() => setStreakBuddy(f.id), 'Could not set your streak buddy.')}
                              className="text-xs font-semibold text-ember-600 hover:underline"
                            >
                              Be buddies
                            </button>
                          )}
                          <button onClick={() => handleRemove(f.id, f.name)} aria-label={`Remove ${f.name}`} className="text-ink-500 hover:text-ember-600">
                            <UserMinus size={15} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-ink-500 mt-2">Only people you add. No public rankings.</p>
            </div>
          </>
        )}

        {data && (
          <label className="flex items-center justify-between gap-3 text-sm text-ink-900 font-ui bg-surface rounded-card border border-line shadow-card px-4 py-3.5 cursor-pointer">
            <span>
              Hide me from friends' boards
              <span className="block text-xs text-ink-500">You can still see yourself and your friends.</span>
            </span>
            <input
              type="checkbox"
              checked={data.hidden}
              onChange={(e) => run(() => setHideFromBoard(e.target.checked), 'Could not save that setting.')}
              className="w-5 h-5 accent-ember-600 flex-shrink-0"
            />
          </label>
        )}
      </div>
    </AppShell>
  );
}
