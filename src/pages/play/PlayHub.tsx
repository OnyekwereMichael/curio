
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { Swords, CheckCircle2, EyeOff, Users, ChevronRight, Share2 } from 'lucide-react';
import { AppShell } from '../../components/AppShell';
import { getPlayModes } from '../../services/games';
import { ShareCardModal } from '../../components/ShareCardModal';
import { useStreak } from '../../components/useStreak';
import { PREVIEW_FEATURES } from '../../lib/featureFlags';

const ICONS: Record<string, React.ElementType> = {
  'word-duel': Swords,
  'fact-or-fiction': CheckCircle2,
  'bluff': EyeOff,
};

/** Play hub: start a live Word Duel or join one by room code. */
export function PlayHubPage() {
  const navigate = useNavigate();
  const [roomCode, setRoomCode] = useState('');
  const [challengeShareOpen, setChallengeShareOpen] = useState(false);
  const { currentStreak } = useStreak();
  const modes = getPlayModes();

  function handleJoin() {
    if (roomCode.trim().length === 4) navigate(`/play/${roomCode.trim().toUpperCase()}`);
  }

  return (
    <AppShell title="Play">
      <div className="px-4 py-5 w-full flex flex-col gap-5">
        <h1 className="font-display text-display font-bold text-ink-900">Play</h1>

        {/* The daily challenge game itself isn't built; this only demos its share card. */}
        {PREVIEW_FEATURES && (
        <button
          onClick={() => setChallengeShareOpen(true)}
          className="flex items-center justify-between gap-3 rounded-card bg-gold-50 border border-gold-500/30 px-4 py-3.5 text-left font-ui"
        >
          <div>
            <p className="text-sm font-semibold text-gold-700">Today's daily challenge</p>
            <p className="text-xs text-ink-500 mt-0.5">Demo — share a sample result card</p>
          </div>
          <Share2 size={16} className="text-gold-700 flex-shrink-0" />
        </button>
        )}

        <div className="bg-ink-900 rounded-card p-4 flex items-center gap-3 font-ui">
          <span className="text-xs font-semibold text-paper/70 flex-shrink-0">Got a room code?</span>
          <input
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value.toUpperCase().slice(0, 4))}
            placeholder="····"
            maxLength={4}
            className="flex-1 bg-transparent text-paper text-center tracking-[0.3em] font-display text-lg font-bold outline-none placeholder:text-paper/30"
          />
          <button
            onClick={handleJoin}
            disabled={roomCode.length !== 4}
            className="px-4 py-2 rounded-control bg-ember-600 text-on-ember text-sm font-semibold disabled:opacity-40 hover:brightness-105 transition-all flex-shrink-0"
          >
            Join
          </button>
        </div>

        <div className="flex flex-col gap-3 font-ui">
          {modes.map((mode) => {
            const Icon = ICONS[mode.id] ?? Swords;
            return (
              <div key={mode.id} className="bg-surface rounded-card border border-line shadow-card p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-ember-50 text-ember-600 flex items-center justify-center flex-shrink-0">
                  <Icon size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-ink-900">{mode.name}</p>
                  <p className="text-xs text-ink-500 truncate">{mode.description}</p>
                </div>
                {mode.available ? (
                  <button
                    onClick={() => navigate('/play/new')}
                    className="px-4 py-2 rounded-control bg-ember-600 text-on-ember text-sm font-semibold hover:brightness-105 transition-all flex-shrink-0"
                  >
                    Play
                  </button>
                ) : (
                  <span className="text-xs text-ink-500 flex-shrink-0 px-2">Soon</span>
                )}
              </div>
            );
          })}
        </div>

        <button
          onClick={() => navigate('/friends')}
          className="flex items-center justify-between gap-3 rounded-card bg-surface border border-line shadow-card px-4 py-3.5 font-ui"
        >
          <span className="flex items-center gap-2 text-sm font-semibold text-ink-900">
            <Users size={16} className="text-ink-500" />
            Friends and buddies
          </span>
          <ChevronRight size={16} className="text-ink-500" />
        </button>
      </div>

      <ShareCardModal
        isOpen={challengeShareOpen}
        onClose={() => setChallengeShareOpen(false)}
        data={{ type: 'dailyChallenge', challengeNumber: 214, score: 4, total: 5, streak: currentStreak }}
      />
    </AppShell>
  );
}
