import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { X, Share2 } from 'lucide-react';
import { AppShell } from '../../components/AppShell';
import { Otter } from '../../components/Otter';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../contexts/AuthContext';
import {
  createDuelRoom,
  joinDuelRoom,
  startDuel,
  submitAnswer,
  advanceRound,
  rematchDuel,
  leaveDuelRoom,
  getDuelState,
  subscribeToDuel,
  type DuelState,
  type AnswerResult,
} from '../../services/games';
import { syncXpAndNotify } from '../../services/xp';
import { cn } from '../../lib/utils';

const POLL_MS = 4000; // safety net if the realtime connection drops
const REVEAL_MS = 1500; // how long to show the right answer once both have answered

/** Live 1-vs-1 Word Duel. All state lives in the database and arrives over Supabase Realtime. */
export function WordDuelPage() {
  const navigate = useNavigate();
  const { code: codeParam } = useParams();
  const { user } = useAuth();
  const [roomId, setRoomId] = useState<string | null>(null);
  const [state, setState] = useState<DuelState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const [mine, setMine] = useState<{ round: number; option: string; result: AnswerResult } | null>(null);
  const [busy, setBusy] = useState(false);
  const advancing = useRef<number | null>(null);
  const xpSynced = useRef(false);

  // --- Get into a room: create one, or join by code ---
  useEffect(() => {
    if (!user || !codeParam) return;
    let cancelled = false;
    setRoomId(null);
    setState(null);
    setMine(null);
    xpSynced.current = false;
    (async () => {
      try {
        if (codeParam === 'new') {
          const { code } = await createDuelRoom();
          if (!cancelled) navigate(`/play/${code}`, { replace: true });
        } else {
          const { roomId: id } = await joinDuelRoom(codeParam);
          if (!cancelled) setRoomId(id);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Could not open that game.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, codeParam, navigate]);

  // --- Keep state in sync: realtime pushes, plus a slow poll as a fallback ---
  const refresh = useCallback(async () => {
    if (!roomId) return;
    try {
      setState(await getDuelState(roomId));
    } catch (e) {
      console.warn('getDuelState failed', e);
    }
  }, [roomId]);

  useEffect(() => {
    if (!roomId) return;
    refresh();
    const unsubscribe = subscribeToDuel(roomId, refresh);
    const poll = setInterval(refresh, POLL_MS);
    return () => {
      unsubscribe();
      clearInterval(poll);
    };
  }, [roomId, refresh]);

  // Ticking clock for the round timer.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, []);

  const room = state?.room;
  const me = state?.players.find((p) => p.userId === user?.id);
  const opponent = state?.players.find((p) => p.userId !== user?.id);
  const round = room?.currentRound ?? 0;
  const prompt = state?.rounds.find((r) => r.round === round);
  const myAnswerRow = state?.answers.find((a) => a.round === round && a.userId === user?.id);
  const opponentAnswered = !!state?.answers.find((a) => a.round === round && a.userId !== user?.id);
  const bothAnswered = !!myAnswerRow && opponentAnswered;
  const serverNow = now + (state?.clockOffsetMs ?? 0);
  const secondsLeft =
    room?.status === 'playing' && room.roundStartedAt
      ? Math.max(0, room.roundSeconds - (serverNow - Date.parse(room.roundStartedAt)) / 1000)
      : 0;
  const timeUp = room?.status === 'playing' && secondsLeft <= 0;

  // --- Move the game along: once both answered (after a beat) or when time runs out ---
  useEffect(() => {
    if (!roomId || room?.status !== 'playing' || !(bothAnswered || timeUp)) return;
    if (advancing.current === round) return;
    advancing.current = round;
    let cancelled = false;
    const attempt = async (triesLeft: number) => {
      try {
        const moved = await advanceRound(roomId, round);
        if (!moved && triesLeft > 0 && !cancelled) setTimeout(() => attempt(triesLeft - 1), 1000);
        else if (!cancelled) refresh();
      } catch (e) {
        console.warn('advanceRound failed', e);
      }
    };
    const t = setTimeout(() => attempt(5), bothAnswered ? REVEAL_MS : 0);
    return () => {
      cancelled = true;
      clearTimeout(t);
      if (advancing.current === round) advancing.current = null;
    };
  }, [roomId, room?.status, round, bothAnswered, timeUp, refresh]);

  // Award XP/badges once when a game finishes.
  useEffect(() => {
    if (room?.status === 'finished' && !xpSynced.current) {
      xpSynced.current = true;
      syncXpAndNotify();
    }
  }, [room?.status]);

  async function handleStart() {
    if (!roomId) return;
    setBusy(true);
    try {
      await startDuel(roomId);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start the game.');
    } finally {
      setBusy(false);
    }
  }

  async function handleAnswer(option: string) {
    if (!roomId || myAnswerRow || mine?.round === round) return;
    try {
      const result = await submitAnswer(roomId, round, option);
      setMine({ round, option, result });
      refresh();
    } catch (e) {
      console.warn('submitAnswer failed', e);
      refresh();
    }
  }

  async function handleClose() {
    if (roomId) await leaveDuelRoom(roomId);
    navigate('/play');
  }

  async function handleRematch() {
    if (!roomId) return;
    setBusy(true);
    try {
      navigate(`/play/${await rematchDuel(roomId)}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start a rematch.');
    } finally {
      setBusy(false);
    }
  }

  async function handleShare() {
    if (!room) return;
    const link = `${window.location.origin}/play/${room.code}`;
    const text = `Join my Word Duel on Curi. Room code: ${room.code}`;
    try {
      if (navigator.share) await navigator.share({ title: 'Word Duel', text, url: link });
      else await navigator.clipboard.writeText(`${text} ${link}`);
    } catch {
      // share sheet dismissed
    }
  }

  // --- Error / loading ---
  if (error) {
    return (
      <AppShell title="Word Duel">
        <div className="px-4 py-10 max-w-md mx-auto w-full flex flex-col items-center text-center gap-4">
          <Otter mood="sleepy" size={80} />
          <p className="text-sm text-ink-900 font-ui">{error}</p>
          <Button onClick={() => navigate('/play')}>Back to Play</Button>
        </div>
      </AppShell>
    );
  }
  if (!state || !room) {
    return (
      <AppShell title="Word Duel">
        <div className="flex flex-col items-center justify-center text-center gap-3 py-24">
          <Otter mood="thinking" size={72} breathe />
          <p className="text-sm text-ink-500">Setting up the room…</p>
        </div>
      </AppShell>
    );
  }
  if (room.status === 'cancelled') {
    return (
      <AppShell title="Word Duel">
        <div className="px-4 py-10 max-w-md mx-auto w-full flex flex-col items-center text-center gap-4">
          <Otter mood="sleepy" size={80} />
          <p className="text-sm text-ink-900 font-ui">This game was closed.</p>
          <Button onClick={() => navigate('/play')}>Back to Play</Button>
        </div>
      </AppShell>
    );
  }

  const isHost = room.hostId === user?.id;

  return (
    <AppShell title="Word Duel">
      <div className="px-4 py-5 max-w-md mx-auto w-full flex flex-col gap-5 min-h-[70vh]">
        {room.status === 'lobby' && (
          <div className="flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <h1 className="font-display text-title font-bold text-ink-900">Word Duel · Mixed words</h1>
              <button onClick={handleClose} aria-label="Close" className="text-ink-500 hover:text-ink-900">
                <X size={20} />
              </button>
            </div>

            <div className="flex flex-col items-center gap-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-500">Room code</p>
              <div className="flex gap-2">
                {room.code.split('').map((ch, i) => (
                  <div key={i} className="w-11 h-12 rounded-control border border-line-strong bg-surface flex items-center justify-center font-display font-bold text-lg text-ink-900">
                    {ch}
                  </div>
                ))}
              </div>
              <button onClick={handleShare} className="flex items-center gap-1.5 text-xs font-semibold text-ember-600 hover:text-ember-700">
                <Share2 size={13} />
                Share invite link
              </button>
            </div>

            <div className="bg-surface rounded-card border border-line shadow-card divide-y divide-line font-ui">
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-sm font-semibold text-ink-900">You</span>
                <span className="text-xs text-moss-600 font-medium">Ready</span>
              </div>
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-sm font-semibold text-ink-900">{opponent ? opponent.name : 'Waiting for a friend…'}</span>
                {opponent ? (
                  <span className="text-xs text-moss-600 font-medium">Ready</span>
                ) : (
                  <span className="w-4 h-4 rounded-full border-2 border-dashed border-line-strong" />
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 bg-surface rounded-card border border-line p-3">
              <Otter mood="idle" size={40} />
              <p className="text-xs text-ink-500">
                {room.totalRounds} rounds, {room.roundSeconds}s each. First right answer wins the round.
              </p>
            </div>

            {isHost ? (
              <Button onClick={handleStart} disabled={!opponent || busy} className="w-full">
                {opponent ? 'Start' : 'Waiting for opponent…'}
              </Button>
            ) : (
              <Button disabled className="w-full">
                Waiting for {state.players.find((p) => p.userId === room.hostId)?.name ?? 'the host'} to start…
              </Button>
            )}
          </div>
        )}

        {room.status === 'playing' && prompt && (
          <div className="flex flex-col gap-5">
            <div className="flex items-center justify-between font-ui">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-ember-600 text-on-ember flex items-center justify-center text-xs font-bold">You</span>
                <span className="font-display text-xl font-bold text-ink-900">{me?.score ?? 0}</span>
              </div>
              <span className="text-xs text-ink-500">Round {round} of {room.totalRounds}</span>
              <div className="flex items-center gap-2">
                <span className="font-display text-xl font-bold text-ink-900">{opponent?.score ?? 0}</span>
                <span className="w-8 h-8 rounded-full bg-moss-600 text-paper flex items-center justify-center text-xs font-bold">
                  {opponent?.name[0] ?? '?'}
                </span>
              </div>
            </div>

            <div className="h-1.5 rounded-full bg-ink-900/10 overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-[width] duration-200', secondsLeft < 5 ? 'bg-ember-600' : 'bg-gold-500')}
                style={{ width: `${(secondsLeft / room.roundSeconds) * 100}%` }}
              />
            </div>

            <div className="bg-ink-900 text-paper rounded-card p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-gold-500 mb-2">Which word means</p>
              <p className="font-display text-lg font-bold leading-snug">{prompt.question}</p>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {prompt.options.map((opt) => {
                const result = mine?.round === round ? mine.result : null;
                const chosen = mine?.round === round && mine.option === opt;
                const isCorrect = result ? opt === result.correctAnswer : false;
                const locked = !!result || !!myAnswerRow || timeUp;
                return (
                  <button
                    key={opt}
                    onClick={() => handleAnswer(opt)}
                    disabled={locked}
                    className={cn(
                      'rounded-card border-2 py-4 px-3 text-sm font-semibold transition-colors',
                      !result && 'border-line bg-surface text-ink-900 hover:border-line-strong',
                      !result && locked && 'opacity-60',
                      result && isCorrect && 'border-moss-600 bg-moss-50 text-moss-600',
                      result && chosen && !isCorrect && 'border-ember-500 bg-ember-50 text-ember-600',
                      result && !chosen && !isCorrect && 'border-line bg-surface text-ink-500 opacity-50'
                    )}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>

            <p className="text-xs text-ink-500 text-center h-4">
              {myAnswerRow && !opponentAnswered && `Waiting for ${opponent?.name ?? 'your opponent'}…`}
              {!myAnswerRow && opponentAnswered && `${opponent?.name ?? 'Your opponent'} has answered`}
              {myAnswerRow && opponentAnswered && mine?.result.awarded && 'You got the point.'}
              {myAnswerRow && opponentAnswered && mine && !mine.result.awarded && mine.result.correct && `${opponent?.name ?? 'They'} got there first.`}
            </p>
          </div>
        )}

        {room.status === 'playing' && !prompt && (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <Otter mood="thinking" size={72} breathe />
            <p className="text-sm text-ink-500">Next round…</p>
          </div>
        )}

        {room.status === 'finished' && (() => {
          const my = me?.score ?? 0;
          const their = opponent?.score ?? 0;
          const theirName = opponent?.name ?? 'Your opponent';
          const theyWantRematch = !!room.rematchRoomId;
          return (
            <div className="flex-1 flex flex-col items-center justify-center text-center gap-4">
              <Otter mood={my >= their ? 'cheering' : 'supportive'} size={96} />
              <h1 className="font-display text-title font-bold text-ink-900">
                {my > their ? `You won ${my} to ${their}` : my < their ? `${theirName} won ${their} to ${my}` : `It's a tie, ${my} to ${their}`}
              </h1>
              <p className="text-sm text-ink-500">{theyWantRematch ? `${theirName} wants a rematch.` : `Good game, ${theirName}. Rematch?`}</p>
              <div className="flex gap-3 w-full">
                <button
                  onClick={() => navigate('/play')}
                  className="flex-1 py-3 rounded-control border border-line-strong text-sm font-semibold text-ink-900 hover:bg-ink-900/5 transition-colors"
                >
                  Back to Play
                </button>
                <Button onClick={handleRematch} disabled={busy} className="flex-1">
                  {theyWantRematch ? 'Join rematch' : 'Rematch'}
                </Button>
              </div>
            </div>
          );
        })()}
      </div>
    </AppShell>
  );
}
