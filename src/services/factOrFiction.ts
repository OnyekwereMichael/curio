import { supabase } from '../lib/superbase';

/**
 * Fact or Fiction: live party game for 2-8 players.
 * Same model as Word Duel: every move is a database function (supabase/migrations/20261125130000_fact_or_fiction.sql).
 * The server owns the statement bank and answer key, the round clock, voting rules and scoring.
 */

export type FofCategory = 'sci' | 'his' | 'ani' | 'geo' | 'pop' | 'afr';

/** Display info for each category. To add one: add it here AND to the check constraints in the SQL. */
export const FOF_CATEGORIES: Record<FofCategory, { label: string; icon: string }> = {
  sci: { label: 'Science', icon: '🔬' },
  his: { label: 'History', icon: '🏛️' },
  ani: { label: 'Animals', icon: '🐾' },
  geo: { label: 'Geography', icon: '🗺️' },
  pop: { label: 'Pop Culture', icon: '🎬' },
  afr: { label: 'Naija & Africa', icon: '🌍' },
};

export const FOF_ROUND_OPTIONS = [5, 10, 15, 20];
export const FOF_TIMER_OPTIONS = [10, 15, 20, 30];
export const FOF_MAX_PLAYERS = 8;

export interface FofPlayer {
  userId: string;
  name: string;
  avatar: string;
  score: number;
  streak: number;
  voted: boolean;
  active: boolean;
  /** Categories this player wants in the game. The game mixes everyone's picks (nobody picked = all). */
  picks: FofCategory[];
}

export interface FofResult {
  userId: string;
  choice: boolean | null; // true = FACT, false = FICTION, null = no answer
  ms: number | null;
  points: number;
}

export interface FofRound {
  round: number;
  category: FofCategory;
  text: string;
  /** Only present once the round has been revealed. */
  answer?: boolean;
  why?: string;
  results?: FofResult[];
}

export interface FofRoom {
  id: string;
  code: string;
  status: 'lobby' | 'playing' | 'finished' | 'closed';
  phase: 'question' | 'reveal';
  hostId: string;
  currentRound: number;
  totalRounds: number;
  roundSeconds: number;
  /** Which game in this room (Play Again starts a new one). */
  gameNo: number;
  /** In the lobby: the combined picks of all players. */
  categories: FofCategory[];
  roundStartedAt: string | null;
  revealAt: string | null;
}

export interface FofState {
  room: FofRoom;
  players: FofPlayer[];
  round: FofRound | null;
  myChoice: boolean | null;
  pool: number;
  /** What the winner earns (null when the XP reward is switched off). */
  reward: { amount: number; minPlayers: number } | null;
  /** server_now minus the local clock at fetch time (only used for the host-absent fallback timer). */
  clockOffsetMs: number;
}

const rpc = async <T>(fn: string, args?: Record<string, unknown>): Promise<T> => {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw new Error(error.message);
  return data as T;
};

export async function createFofRoom(): Promise<{ roomId: string; code: string }> {
  const d = await rpc<{ room_id: string; code: string }>('fof_create_room');
  return { roomId: d.room_id, code: d.code };
}

export async function joinFofRoom(code: string): Promise<{ roomId: string; code: string }> {
  const d = await rpc<{ room_id: string; code: string }>('fof_join_room', { p_code: code });
  return { roomId: d.room_id, code: d.code };
}

/** True if a Fact or Fiction room with this code is open (used by the Play tab to route a typed code). */
export async function fofRoomExists(code: string): Promise<boolean> {
  try {
    return !!(await rpc<boolean>('fof_find_room', { p_code: code }));
  } catch {
    return false;
  }
}

export const setFofSettings = (roomId: string, rounds: number, seconds: number) =>
  rpc<void>('fof_set_settings', { p_room: roomId, p_rounds: rounds, p_seconds: seconds });
/** Every player (not just the host) picks the categories they want. */
export const setFofPicks = (roomId: string, picks: FofCategory[]) => rpc<void>('fof_set_picks', { p_room: roomId, p_picks: picks });

export interface FofRewardResult {
  awarded: number;
  reason?: string | null;
  winner?: boolean;
  need?: number;
}
/** The winner claims their own XP (the XP engine needs to see the winner's own device). Safe to call more than once. */
export const claimFofReward = (roomId: string) => rpc<FofRewardResult>('fof_claim_reward', { p_room: roomId });
export const startFof = (roomId: string) => rpc<void>('fof_start', { p_room: roomId });
export const kickFofPlayer = (roomId: string, userId: string) => rpc<void>('fof_kick', { p_room: roomId, p_user: userId });
export const closeFofRoom = (roomId: string) => rpc<void>('fof_close_room', { p_room: roomId });
export const leaveFofRoom = (roomId: string) => rpc<void>('fof_leave', { p_room: roomId });
export const fofHeartbeat = (roomId: string) => rpc<void>('fof_heartbeat', { p_room: roomId });
export const claimFofHost = (roomId: string) => rpc<boolean>('fof_claim_host', { p_room: roomId });
export const playFofAgain = (roomId: string) => rpc<void>('fof_play_again', { p_room: roomId });

/** `ms` is the response time measured on the player's own device. */
export const voteFof = (roomId: string, round: number, choice: boolean, ms: number) =>
  rpc<void>('fof_vote', { p_room: roomId, p_round: round, p_choice: choice, p_ms: Math.max(0, Math.round(ms)) });

/** Ends voting once everyone present has voted or time is up. Returns false if it is too early. Any player may call it. */
export const advanceFofRound = (roomId: string, round: number) => rpc<boolean>('fof_advance', { p_room: roomId, p_round: round });
/** Host moves on to the next round (or to the final results). */
export const nextFofRound = (roomId: string, round: number) => rpc<boolean>('fof_next', { p_room: roomId, p_round: round });

export async function getFofState(roomId: string): Promise<FofState> {
  const d = await rpc<{
    server_now: string;
    room: {
      id: string; code: string; status: FofRoom['status']; phase: FofRoom['phase']; host_id: string; current_round: number;
      total_rounds: number; round_seconds: number; game_no: number; categories: FofCategory[]; round_started_at: string | null; reveal_at: string | null;
    };
    players: { user_id: string; name: string; avatar: string; score: number; streak: number; voted: boolean; active: boolean; picks: FofCategory[] }[];
    round: null | {
      round: number; category: FofCategory; text: string; answer?: boolean; why?: string;
      results?: { user_id: string; choice: boolean | null; ms: number | null; points: number }[];
    };
    my_choice: boolean | null;
    pool: number;
    reward: { amount: number; min_players: number } | null;
  }>('fof_get_state', { p_room: roomId });
  return {
    clockOffsetMs: Date.parse(d.server_now) - Date.now(),
    pool: d.pool,
    reward: d.reward ? { amount: d.reward.amount, minPlayers: d.reward.min_players } : null,
    myChoice: d.my_choice,
    room: {
      id: d.room.id, code: d.room.code, status: d.room.status, phase: d.room.phase, hostId: d.room.host_id,
      currentRound: d.room.current_round, totalRounds: d.room.total_rounds, roundSeconds: d.room.round_seconds,
      gameNo: d.room.game_no,
      categories: d.room.categories, roundStartedAt: d.room.round_started_at, revealAt: d.room.reveal_at,
    },
    players: d.players.map((p) => ({ userId: p.user_id, name: p.name, avatar: p.avatar, score: p.score, streak: p.streak, voted: p.voted, active: p.active, picks: p.picks ?? [] })),
    round: d.round && {
      round: d.round.round, category: d.round.category, text: d.round.text, answer: d.round.answer, why: d.round.why,
      results: d.round.results?.map((r) => ({ userId: r.user_id, choice: r.choice, ms: r.ms, points: r.points })),
    },
  };
}

/** Calls onChange whenever the room or its players change. Returns an unsubscribe function. */
export function subscribeToFof(roomId: string, onChange: () => void): () => void {
  const channel = supabase
    .channel(`fof:${roomId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'fof_rooms', filter: `id=eq.${roomId}` }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'fof_players', filter: `room_id=eq.${roomId}` }, onChange)
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}
