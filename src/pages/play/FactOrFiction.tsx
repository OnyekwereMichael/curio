import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { arcade } from '../../lib/arcadeSound';
import { useFofVoice } from '../../lib/fofVoice';
import { announceXp, syncXpAndNotify, xpReasonMessage } from '../../services/xp';
import {
  FOF_CATEGORIES,
  FOF_MAX_PLAYERS,
  FOF_ROUND_OPTIONS,
  FOF_TIMER_OPTIONS,
  advanceFofRound,
  claimFofHost,
  claimFofReward,
  closeFofRoom,
  createFofRoom,
  fofHeartbeat,
  getFofState,
  joinFofRoom,
  kickFofPlayer,
  leaveFofRoom,
  nextFofRound,
  playFofAgain,
  setFofPicks,
  setFofSettings,
  startFof,
  subscribeToFof,
  voteFof,
  type FofCategory,
  type FofPlayer,
  type FofRewardResult,
  type FofState,
} from '../../services/factOrFiction';
import './fof.css';

const NO_PLAYERS: FofPlayer[] = [];
const POLL_MS = 3000; // safety net if the realtime connection drops
const HEARTBEAT_MS = 5000; // tells the server who is still here, so a closed tab never blocks a round
const HOST_ABSENT_NEXT_MS = 46000; // if the host vanishes after a reveal, any player may continue

/** Each player's own clock starts when the round first appears on THEIR device (survives a refresh). */
function localRoundStart(roomId: string, round: number, startedAt: string | null): number {
  const key = `fof_t_${roomId}_${round}_${startedAt ?? ''}`;
  try {
    const saved = Number(localStorage.getItem(key));
    if (saved > 0 && saved <= Date.now()) return saved;
    const now = Date.now();
    localStorage.setItem(key, String(now));
    return now;
  } catch {
    return Date.now();
  }
}

function burst(host: HTMLElement | null, emojis: string[], count = 36) {
  if (!host) return;
  for (let i = 0; i < count; i++) {
    const s = document.createElement('span');
    s.textContent = emojis[Math.floor(Math.random() * emojis.length)];
    s.style.left = `${Math.random() * 100}%`;
    s.style.setProperty('--dx', `${Math.random() * 160 - 80}px`);
    s.style.setProperty('--rot', `${Math.random() * 720 - 360}deg`);
    s.style.animationDuration = `${1.6 + Math.random() * 1.6}s`;
    s.style.animationDelay = `${Math.random() * 0.4}s`;
    host.appendChild(s);
    setTimeout(() => s.remove(), 3800);
  }
}

/** Fact or Fiction: live multiplayer party game. All state lives in the database and arrives over Supabase Realtime. */
export function FactOrFictionPage() {
  const navigate = useNavigate();
  const { code: codeParam } = useParams();
  const { user } = useAuth();

  const [roomId, setRoomId] = useState<string | null>(null);
  const [state, setState] = useState<FofState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const [mine, setMine] = useState<{ key: string; choice: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [muted, setMuted] = useState(arcade.isMuted());
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [reward, setReward] = useState<{ key: string; result: FofRewardResult } | null>(null);
  const { voice, join: joinVoice, leave: leaveVoice, setMic } = useFofVoice(roomId, user?.id);
  useEffect(() => { if (voice.error) toast(voice.error); }, [voice.error]); // eslint-disable-line react-hooks/exhaustive-deps

  const fxRef = useRef<HTMLDivElement>(null);
  const screenRef = useRef<HTMLDivElement>(null);
  const toastTimer = useRef<number | undefined>(undefined);
  const lastClaim = useRef(0);
  const knownPlayers = useRef<Set<string> | null>(null);
  const lastTick = useRef(-1);
  const playedKey = useRef('');

  const toast = useCallback((msg: string) => {
    setToastMsg(msg);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToastMsg(null), 2800);
  }, []);

  // --- Get into a room: create one, or join by code ---
  useEffect(() => {
    if (!user || !codeParam) return;
    let cancelled = false;
    setRoomId(null);
    setState(null);
    setMine(null);
    setError(null);
    knownPlayers.current = null;
    playedKey.current = '';
    (async () => {
      try {
        if (codeParam === 'new') {
          const { code } = await createFofRoom();
          if (!cancelled) navigate(`/play/fof/${code}`, { replace: true });
        } else {
          const { roomId: id } = await joinFofRoom(codeParam);
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
      setState(await getFofState(roomId));
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      if (/not in this room/i.test(msg)) setError('You are no longer in this room.');
      else console.warn('getFofState failed', e);
    }
  }, [roomId]);

  useEffect(() => {
    if (!roomId) return;
    refresh();
    const unsubscribe = subscribeToFof(roomId, refresh);
    const poll = setInterval(refresh, POLL_MS);
    const beat = () => void fofHeartbeat(roomId).catch(() => {});
    beat();
    const hb = setInterval(beat, HEARTBEAT_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        beat();
        refresh();
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      unsubscribe();
      clearInterval(poll);
      clearInterval(hb);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [roomId, refresh]);

  // Smooth clock for the timer bar.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(t);
  }, []);

  // --- Derived values ---
  const room = state?.room;
  const players = state?.players ?? NO_PLAYERS;
  const me = players.find((p) => p.userId === user?.id);
  const isHost = !!room && room.hostId === user?.id;
  const round = room?.currentRound ?? 0;
  const prompt = state?.round ?? null;
  const inQuestion = room?.status === 'playing' && room.phase === 'question' && !!prompt;
  const inReveal = room?.status === 'playing' && room.phase === 'reveal' && !!prompt;
  const roundKey = room ? `${room.id}:${round}:${room.roundStartedAt ?? ''}` : '';

  const qStart = inQuestion && room ? localRoundStart(room.id, round, room.roundStartedAt) : 0;
  const total = (room?.roundSeconds ?? 15) * 1000;
  const msLeft = inQuestion ? Math.max(0, total - (now - qStart)) : 0;
  const secsLeft = Math.ceil(msLeft / 1000);
  const timeUp = inQuestion && msLeft <= 0;
  const myChoice = mine?.key === roundKey ? mine.choice : state?.myChoice ?? null;
  const hasVoted = myChoice !== null;
  const activePlayers = players.filter((p) => p.active || p.userId === user?.id);
  const votedCount = activePlayers.filter((p) => p.voted || (p.userId === user?.id && hasVoted)).length;
  const allVoted = activePlayers.length > 0 && votedCount >= activePlayers.length;

  // --- Move the game along: once everyone present has voted, or time is up (any player may do this) ---
  useEffect(() => {
    if (!roomId || !inQuestion || !(allVoted || timeUp)) return;
    let stop = false;
    const attempt = async () => {
      try {
        const moved = await advanceFofRound(roomId, round);
        if (moved && !stop) refresh();
      } catch (e) {
        console.warn('advanceFofRound failed', e);
      }
    };
    attempt();
    const t = setInterval(attempt, 1000); // the server says "too early" until the grace period ends
    return () => {
      stop = true;
      clearInterval(t);
    };
  }, [roomId, inQuestion, allVoted, timeUp, round, refresh]);

  // If the host's connection dropped, the longest-present player takes over.
  const hostPlayer = players.find((p) => p.userId === room?.hostId);
  const hostGone = !!room && room.status !== 'closed' && !isHost && (!hostPlayer || !hostPlayer.active);
  useEffect(() => {
    if (!roomId || !hostGone || Date.now() - lastClaim.current < 4000) return;
    lastClaim.current = Date.now();
    claimFofHost(roomId)
      .then((got) => {
        if (got) {
          toast('You are the host now!');
          refresh();
        }
      })
      .catch(() => {});
  }, [roomId, hostGone, now, refresh, toast]);

  // --- Sound + effects ---
  // players popping into the lobby
  useEffect(() => {
    if (room?.status !== 'lobby') return;
    const ids = new Set(players.map((p) => p.userId));
    if (knownPlayers.current && [...ids].some((id) => !knownPlayers.current!.has(id) && id !== user?.id)) arcade.join();
    knownPlayers.current = ids;
  }, [room?.status, players, user?.id]);

  // countdown ticks in the last 5 seconds
  useEffect(() => {
    if (!inQuestion || hasVoted) return;
    if (secsLeft <= 5 && secsLeft > 0 && secsLeft !== lastTick.current) arcade.tick();
    lastTick.current = secsLeft;
  }, [inQuestion, hasVoted, secsLeft]);

  // reveal / game-over fanfares (once each)
  const myResult = prompt?.results?.find((r) => r.userId === user?.id);
  const iWasRight = !!myResult && myResult.choice !== null && myResult.choice === prompt?.answer;
  useEffect(() => {
    if (!room) return;
    const key = inReveal ? `reveal:${roundKey}` : room.status === 'finished' ? `end:${room.id}:${room.roundStartedAt}` : room.status === 'lobby' ? 'lobby' : '';
    if (!key || key === playedKey.current) return;
    playedKey.current = key;
    if (key.startsWith('reveal')) {
      if (iWasRight) {
        arcade.correct();
        burst(fxRef.current, ['🎉', '✨', '⭐', '🟢', '💥'], 38);
      } else {
        arcade.wrong();
        const el = screenRef.current;
        if (el) {
          el.classList.remove('fof-shake');
          void el.offsetWidth;
          el.classList.add('fof-shake');
        }
        if (navigator.vibrate) navigator.vibrate(180);
      }
    } else if (key.startsWith('end')) {
      arcade.win();
      burst(fxRef.current, ['🎉', '🏆', '⭐', '🎊', '👑'], 60);
    } else if (key === 'lobby') arcade.start();
  }, [room, inReveal, roundKey, iWasRight]);

  // --- Winner reward: each winner claims their own XP (so the XP engine sees their own device) ---
  const bestScore = players.reduce((m, p) => Math.max(m, p.score), 0);
  const iAmWinner = !!me && bestScore > 0 && me.score === bestScore;
  const claimed = useRef('');
  useEffect(() => {
    if (!room || room.status !== 'finished' || !iAmWinner) return;
    const key = `${room.id}:${room.gameNo}`;
    if (claimed.current === key) return;
    claimed.current = key;
    claimFofReward(room.id)
      .then((result) => {
        setReward({ key, result });
        if (result.awarded > 0) {
          announceXp({ gained: result.awarded });
          void syncXpAndNotify();
        }
      })
      .catch(() => setReward({ key, result: { awarded: 0, reason: 'error', winner: true } }));
  }, [room, iAmWinner]);

  // --- Actions ---
  async function run(fn: () => Promise<unknown>, fallback: string) {
    setBusy(true);
    try {
      await fn();
      await refresh();
    } catch (e) {
      toast(e instanceof Error && e.message ? e.message : fallback);
    } finally {
      setBusy(false);
    }
  }

  async function handleVote(choice: boolean) {
    if (!room || !inQuestion || hasVoted || timeUp) return;
    arcade.unlock();
    arcade.click();
    const ms = Date.now() - qStart; // measured locally: no synced clocks involved
    setMine({ key: roundKey, choice });
    try {
      await voteFof(room.id, round, choice, ms);
      refresh();
    } catch (e) {
      if (!/too late/i.test(e instanceof Error ? e.message : '')) {
        setMine(null);
        toast('Vote did not go through. Try again!');
      }
    }
  }

  function updateSettings(rounds: number, seconds: number) {
    if (!room || !isHost) return;
    arcade.click();
    setState((s) => (s ? { ...s, room: { ...s.room, totalRounds: rounds, roundSeconds: seconds } } : s)); // optimistic
    setFofSettings(room.id, rounds, seconds).then(refresh, (e) => {
      toast(e instanceof Error ? e.message : 'Could not change settings.');
      refresh();
    });
  }

  /** Any player can pick categories; the game mixes everyone's picks. */
  function togglePick(k: FofCategory) {
    if (!room || !user) return;
    const mineNow = players.find((p) => p.userId === user.id)?.picks ?? [];
    const next = mineNow.includes(k) ? mineNow.filter((c) => c !== k) : [...mineNow, k];
    arcade.click();
    setState((s) => (s ? { ...s, players: s.players.map((p) => (p.userId === user.id ? { ...p, picks: next } : p)) } : s)); // optimistic
    setFofPicks(room.id, next).then(refresh, (e) => {
      toast(e instanceof Error ? e.message : 'Could not save your picks.');
      refresh();
    });
  }

  async function handleExit() {
    if (roomId && room && room.status !== 'closed') {
      if (isHost && room.status !== 'finished' && players.length > 1) {
        if (!window.confirm('Close the room for everyone?')) return;
        await closeFofRoom(roomId).catch(() => {});
      } else {
        await leaveFofRoom(roomId).catch(() => {});
      }
    }
    navigate('/play');
  }

  async function handleShare() {
    if (!room) return;
    arcade.click();
    const url = `${window.location.origin}/play/fof/${room.code}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Fact or Fiction', text: `Join my Fact or Fiction game! Code: ${room.code}`, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      toast('Link copied!');
    } catch {
      toast(`Room code: ${room.code}`);
    }
  }

  async function handleCopyCode() {
    if (!room) return;
    arcade.click();
    try {
      await navigator.clipboard.writeText(room.code);
      toast('Code copied!');
    } catch {
      toast(`Room code: ${room.code}`);
    }
  }

  // --- Render helpers ---
  const frame = (children: React.ReactNode) => (
    <div className="fof" onPointerDown={() => arcade.unlock()}>
      <div className="fof-top">
        <button className="fof-iconbtn" onClick={handleExit} aria-label="Leave game">←</button>
        {state && room && room.status !== 'closed' ? (
          <div className="fof-voice">
            {!voice.joined ? (
              <button className="fof-vbtn" disabled={voice.joining} onClick={() => { arcade.unlock(); joinVoice(); }} aria-label="Join voice chat">
                🎧 {voice.joining ? '…' : 'VOICE'}
              </button>
            ) : (
              <>
                {voice.listenOnly ? (
                  <span className="fof-vnote" title="Microphone blocked: you can listen only">🎧 LISTEN</span>
                ) : (
                  <button className={`fof-vbtn ${voice.micOn ? 'live' : 'muted'}`} aria-label={voice.micOn ? 'Mute microphone' : 'Unmute microphone'} onClick={() => { arcade.click(); setMic(!voice.micOn); }}>
                    {voice.micOn ? '🎙️' : '🔇'}
                  </button>
                )}
                <span className="fof-vpeople">
                  {voice.inVoice.slice(0, 3).map((id) => (
                    <span key={id} className={`fof-vav ${voice.speaking.includes(id) ? 'talk' : ''} ${id === user?.id || voice.connected.includes(id) ? '' : 'wait'}`}>
                      {players.find((x) => x.userId === id)?.avatar ?? '👤'}
                    </span>
                  ))}
                  {voice.inVoice.length > 3 && <span className="fof-vnote">+{voice.inVoice.length - 3}</span>}
                </span>
                <button className="fof-vleave" onClick={leaveVoice} aria-label="Leave voice chat">✕</button>
              </>
            )}
          </div>
        ) : <span />}
        <button
          className="fof-iconbtn"
          aria-label={muted ? 'Unmute' : 'Mute'}
          onClick={() => {
            setMuted(arcade.toggleMute());
            arcade.click();
          }}
        >
          {muted ? '🔇' : '🔊'}
        </button>
      </div>
      <div className="fof-inner">
        <div className="fof-screen" ref={screenRef}>{children}</div>
      </div>
      <div className="fof-fx" ref={fxRef} />
      <div className={`fof-toast ${toastMsg ? 'show' : ''}`} role="status">{toastMsg}</div>
    </div>
  );

  const message = (text: string, action = 'BACK TO PLAY') =>
    frame(
      <>
        <h1 className="fof-logo"><span className="f">FACT</span><small>— or —</small><span className="x">FICTION</span></h1>
        <div className="fof-card fof-center" style={{ padding: 24 }}>{text}</div>
        <button className="fof-btn yellow" onClick={() => navigate('/play')}>{action}</button>
      </>,
    );

  if (error) return message(error);
  if (!state || !room) {
    return frame(
      <>
        <h1 className="fof-logo"><span className="f">FACT</span><small>— or —</small><span className="x">FICTION</span></h1>
        <p className="fof-wait">SETTING UP THE ROOM<span className="fof-dots" /></p>
      </>,
    );
  }
  if (room.status === 'closed') return message('The host closed the room.');

  const sorted = [...players].sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  const waiting = <p className="fof-wait">WAITING FOR HOST<span className="fof-dots" /></p>;

  // ───────────── Lobby ─────────────
  if (room.status === 'lobby') {
    const pool = state.pool;
    const canStart = isHost && players.length >= 2 && !busy;
    return frame(
      <>
        <h2 className="fof-center" style={{ fontSize: 14 }}>ROOM CODE</h2>
        <div className="fof-code" aria-label={`Room code ${room.code.split('').join(' ')}`}>{room.code.split('').map((c, i) => <b key={i}>{c}</b>)}</div>
        <div className="fof-row">
          <button className="fof-btn ghost" onClick={handleShare}>🔗 SHARE LINK</button>
          <button className="fof-btn ghost" onClick={handleCopyCode}>📋 COPY CODE</button>
        </div>

        <div className="fof-card">
          <div className="fof-hud"><span>PLAYERS</span><span>{players.length}/{FOF_MAX_PLAYERS}</span></div>
          <div className="fof-grid">
            {players.map((p) => (
              <div key={p.userId} className={`fof-pl ${p.userId === user?.id ? 'me' : ''} ${p.active ? '' : 'away'}`}>
                {p.userId === room.hostId && <span className="fof-crown" title="Host">👑</span>}
                <span className="fof-av">{p.avatar}</span>
                <span className="fof-nm">{p.name}{p.userId === user?.id && <span className="fof-muted"> (you)</span>}</span>
                {isHost && p.userId !== user?.id && (
                  <button className="fof-kick" aria-label={`Remove ${p.name}`} onClick={() => { arcade.click(); run(() => kickFofPlayer(room.id, p.userId), 'Could not remove player.'); }}>✕</button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="fof-card">
          <div className="fof-settitle">PICK YOUR CATEGORIES</div>
          <p className="fof-muted" style={{ margin: '0 0 10px' }}>Tap the ones you want. The game mixes everyone's picks. Nobody picks = everything.</p>
          <div className="fof-chips">
            {(Object.keys(FOF_CATEGORIES) as FofCategory[]).map((k) => {
              const pickers = players.filter((p) => p.picks.includes(k));
              const mineOn = !!me?.picks.includes(k);
              return (
                <button key={k} className={`fof-chip ${mineOn ? 'on' : pickers.length ? 'some' : ''}`} onClick={() => togglePick(k)}>
                  {FOF_CATEGORIES[k].icon} {FOF_CATEGORIES[k].label}
                  {pickers.length > 0 && <span className="fof-pickers">{pickers.map((p) => p.avatar).join('')}</span>}
                </button>
              );
            })}
          </div>
          <p className="fof-muted" style={{ margin: '10px 0 0' }}>
            Playing: {room.categories.length >= 6 ? 'everything' : room.categories.map((c) => FOF_CATEGORIES[c].label).join(', ')}
          </p>
          <div className="fof-settitle">ROUNDS{isHost ? '' : ' · HOST CHOOSES'}</div>
          <div className="fof-chips">
            {FOF_ROUND_OPTIONS.map((n) => (
              <button key={n} className={`fof-chip ${room.totalRounds === n ? 'on' : ''}`} disabled={!isHost} onClick={() => updateSettings(n, room.roundSeconds)}>{n}</button>
            ))}
          </div>
          <div className="fof-settitle">SECONDS PER ROUND{isHost ? '' : ' · HOST CHOOSES'}</div>
          <div className="fof-chips">
            {FOF_TIMER_OPTIONS.map((n) => (
              <button key={n} className={`fof-chip ${room.roundSeconds === n ? 'on' : ''}`} disabled={!isHost} onClick={() => updateSettings(room.totalRounds, n)}>{n}s</button>
            ))}
          </div>
          <p className="fof-muted" style={{ margin: '12px 0 0' }}>
            {Math.min(room.totalRounds, pool)} rounds from {pool} statements
          </p>
        </div>

        {state.reward && (
          <div className="fof-reward">🏆 WINNER EARNS +{state.reward.amount} XP<small>needs {state.reward.minPlayers}+ players on different devices</small></div>
        )}

        {isHost ? (
          <button
            className="fof-btn green"
            disabled={!canStart}
            onClick={() => { arcade.unlock(); run(() => startFof(room.id), 'Could not start the game.'); }}
          >
            {players.length >= 2 ? '▶ START GAME' : 'NEED 2+ PLAYERS'}
          </button>
        ) : waiting}
        <button className="fof-btn ghost" onClick={handleExit}>{isHost && players.length > 1 ? '✖ CLOSE ROOM' : '← LEAVE ROOM'}</button>
      </>,
    );
  }

  // ───────────── Game over: podium + leaderboard ─────────────
  if (room.status === 'finished') {
    const top = sorted.slice(0, 3);
    const order = top.length >= 3 ? [1, 0, 2] : top.length === 2 ? [1, 0] : [0]; // 2nd · 1st · 3rd
    const best = sorted[0]?.score ?? 0;
    const res = reward?.key === `${room.id}:${room.gameNo}` ? reward.result : null;
    let banner: { tone: 'good' | 'info'; text: string } | null = null;
    if (iAmWinner) {
      if (!res) banner = { tone: 'info', text: '🏆 YOU WON! Checking your reward…' };
      else if (res.awarded > 0) banner = { tone: 'good', text: `🏆 YOU WON! +${res.awarded} XP` };
      else if (res.reason === 'party_too_small') banner = { tone: 'info', text: `🏆 YOU WON! Play with ${res.need ?? 3}+ players to earn XP.` };
      else if (res.reason === 'same_device') banner = { tone: 'info', text: '🏆 YOU WON! XP needs players on different devices.' };
      else if (res.reason === 'not_enough_answers') banner = { tone: 'info', text: '🏆 YOU WON! Answer at least half the rounds to earn XP.' };
      else banner = { tone: 'info', text: `🏆 YOU WON! ${xpReasonMessage(res.reason) ?? ''}`.trim() };
    } else if (state.reward) banner = { tone: 'info', text: `The winner earns +${state.reward.amount} XP. Win the next one!` };
    return frame(
      <>
        <h1 className="fof-logo" style={{ fontSize: 22 }}>GAME OVER!</h1>
        <div className="fof-podium">
          {order.map((i) => (
            <div key={top[i].userId} className={`fof-pod fof-p${i + 1}`}>
              {i === 0 && <span className="fof-crown">👑</span>}
              <div className="who"><span className="fof-av">{top[i].avatar}</span>{top[i].name}</div>
              <div className="fof-block"><span>{i + 1}</span><small>{top[i].score}</small></div>
            </div>
          ))}
        </div>
        <div className="fof-card">
          <h3 style={{ fontSize: 12, marginBottom: 12 }}>LEADERBOARD</h3>
          <div className="fof-lb">
            {sorted.map((p, i) => (
              <div key={p.userId} className={`fof-lbrow ${p.userId === user?.id ? 'me' : ''}`}>
                <span className="rk">{p.score === best && best > 0 ? '👑' : `#${i + 1}`}</span>
                <span className="fof-av" style={{ fontSize: 24 }}>{p.avatar}</span>
                <span className="fof-nm">{p.name}</span>
                <span className="sc">{p.score}</span>
              </div>
            ))}
          </div>
        </div>
        {banner && <div className={`fof-reward ${banner.tone}`}>{banner.text}</div>}
        {isHost ? (
          <button className="fof-btn green" disabled={busy} onClick={() => { arcade.click(); run(() => playFofAgain(room.id), 'Could not restart.'); }}>🔁 PLAY AGAIN</button>
        ) : waiting}
        <button className="fof-btn ghost" onClick={handleExit}>{isHost ? '✖ CLOSE ROOM' : '← LEAVE ROOM'}</button>
      </>,
    );
  }

  // ───────────── Playing ─────────────
  if (!prompt) return frame(<p className="fof-wait">NEXT ROUND<span className="fof-dots" /></p>);
  const cat = FOF_CATEGORIES[prompt.category];
  const hud = (
    <div className="fof-hud">
      <span>ROUND {round}/{room.totalRounds}</span>
      <span>{cat.icon} {cat.label.toUpperCase()}</span>
    </div>
  );

  if (inQuestion) {
    const on = Math.ceil((msLeft / total) * 20);
    const danger = secsLeft <= 5 && secsLeft > 0;
    return frame(
      <>
        {hud}
        <div className={`fof-bar ${danger ? 'danger' : ''}`} role="timer" aria-label={`${secsLeft} seconds left`}>
          {Array.from({ length: 20 }, (_, i) => <i key={i} className={i >= on ? 'off' : ''} />)}
        </div>
        <div className={`fof-secs ${danger ? 'danger' : ''}`}>{secsLeft}</div>
        <div className="fof-card fof-stmt"><div>{prompt.text}</div></div>
        <div className="fof-stack">
          <button className={`fof-btn green big ${myChoice === true ? 'chosen' : ''} ${myChoice === false ? 'dim' : ''}`} disabled={hasVoted ? myChoice !== true : timeUp} onClick={() => handleVote(true)}>✅ FACT</button>
          <button className={`fof-btn red big ${myChoice === false ? 'chosen' : ''} ${myChoice === true ? 'dim' : ''}`} disabled={hasVoted ? myChoice !== false : timeUp} onClick={() => handleVote(false)}>❌ FICTION</button>
        </div>
        <div className="fof-vstat">
          {hasVoted ? '🔒 LOCKED IN · ' : timeUp ? "⏰ TIME'S UP · " : ''}{votedCount}/{activePlayers.length} VOTED
        </div>
      </>,
    );
  }

  // Reveal
  const results = new Map((prompt.results ?? []).map((r) => [r.userId, r]));
  const byRound = [...players].sort((a, b) => (results.get(b.userId)?.points ?? 0) - (results.get(a.userId)?.points ?? 0) || b.score - a.score);
  const last = round >= room.totalRounds;
  const serverNow = now + state.clockOffsetMs;
  const hostStale = !!room.revealAt && serverNow - Date.parse(room.revealAt) > HOST_ABSENT_NEXT_MS;
  const chip = (p: FofPlayer) => {
    const r = results.get(p.userId);
    if (!r || r.choice === null) return <span className="fof-ch n">NO ANSWER</span>;
    return r.choice ? <span className="fof-ch f">FACT</span> : <span className="fof-ch x">FICTION</span>;
  };
  return frame(
    <>
      {hud}
      <div className={`fof-verdict ${prompt.answer ? 'fact' : 'fiction'}`}>{prompt.answer ? '✅ FACT!' : '❌ FICTION!'}</div>
      <div className="fof-card fof-center">{prompt.text}</div>
      <div className="fof-why"><b className="fof-label" style={{ color: 'var(--f-yellow)' }}>WHY </b>{prompt.why}</div>
      {iWasRight ? (
        <div className="fof-result good">✔ CORRECT! +{myResult?.points}<small>faster = more points{me && me.streak >= 2 ? ` · 🔥 ${me.streak} in a row` : ''}</small></div>
      ) : (
        <div className="fof-result bad">{myResult && myResult.choice !== null ? '✘ WRONG' : '⏰ NO ANSWER'}<small>0 points · streak reset</small></div>
      )}
      <div className="fof-picks">
        {byRound.map((p, i) => {
          const pts = results.get(p.userId)?.points ?? 0;
          return (
            <div key={p.userId} className={`fof-pick ${p.userId === user?.id ? 'me' : ''}`} style={{ animationDelay: `${0.9 + i * 0.08}s` }}>
              <span className="fof-av" style={{ fontSize: 26 }}>{p.avatar}</span>
              <span className="fof-nm">{p.name}{p.userId === user?.id && <span className="fof-muted"> (you)</span>}</span>
              {chip(p)}
              <span className={`fof-pts ${pts ? 'p' : 'z'}`}>{pts ? `+${pts}` : '0'}</span>
            </div>
          );
        })}
      </div>
      {isHost || hostStale ? (
        <button className="fof-btn yellow" disabled={busy} onClick={() => { arcade.click(); run(() => nextFofRound(room.id, round), 'Could not continue.'); }}>
          {last ? '🏆 FINAL RESULTS' : 'NEXT ROUND ▶'}
        </button>
      ) : waiting}
    </>,
  );
}
