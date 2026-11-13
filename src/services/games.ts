import { supabase } from '../lib/superbase';

export interface PlayMode {
  id: string;
  name: string;
  description: string;
  playersLabel: string;
  action: 'play' | 'host';
  available: boolean;
}

const PLAY_MODES: PlayMode[] = [
  { id: 'word-duel', name: 'Word Duel', description: '1 vs 1 · pick the word for the definition · 2 min', playersLabel: '1 vs 1', action: 'play', available: true },
  { id: 'fact-or-fiction', name: 'Fact or Fiction', description: '2 to 8 players · vote true or false together', playersLabel: '2-8', action: 'host', available: false },
  { id: 'bluff', name: 'Bluff the Definition', description: '3 to 8 · write fake meanings, spot the real one', playersLabel: '3-8', action: 'host', available: false },
];

export function getPlayModes(): PlayMode[] {
  return PLAY_MODES;
}

export interface DuelPlayer {
  userId: string;
  name: string;
  score: number;
}

export interface DuelRound {
  round: number;
  question: string;
  options: string[];
}

export interface DuelAnswer {
  round: number;
  userId: string;
  correct: boolean;
}

export interface DuelRoom {
  id: string;
  code: string;
  status: 'lobby' | 'playing' | 'finished' | 'cancelled';
  hostId: string;
  currentRound: number;
  roundStartedAt: string | null;
  totalRounds: number;
  roundSeconds: number;
  rematchRoomId: string | null;
}

export interface DuelState {
  room: DuelRoom;
  players: DuelPlayer[];
  rounds: DuelRound[];
  answers: DuelAnswer[];
  /** server_now minus the local clock at fetch time, so timers follow the server. */
  clockOffsetMs: number;
}

export interface AnswerResult {
  correct: boolean;
  correctAnswer: string;
  awarded: boolean;
}

// Every move goes through a database function: the server owns the questions,
// the answer key, scoring and the round clock, so a client can't peek or cheat.

export async function createDuelRoom(): Promise<{ roomId: string; code: string }> {
  const { data, error } = await supabase.rpc('create_duel_room');
  if (error) throw new Error(error.message);
  const d = data as { room_id: string; code: string };
  return { roomId: d.room_id, code: d.code };
}

export async function joinDuelRoom(code: string): Promise<{ roomId: string; code: string }> {
  const { data, error } = await supabase.rpc('join_duel_room', { p_code: code });
  if (error) throw new Error(error.message);
  const d = data as { room_id: string; code: string };
  return { roomId: d.room_id, code: d.code };
}

export async function startDuel(roomId: string): Promise<void> {
  const { error } = await supabase.rpc('start_duel', { p_room: roomId });
  if (error) throw new Error(error.message);
}

export async function submitAnswer(roomId: string, round: number, answer: string): Promise<AnswerResult> {
  const { data, error } = await supabase.rpc('submit_answer', { p_room: roomId, p_round: round, p_answer: answer });
  if (error) throw new Error(error.message);
  const d = data as { correct: boolean; correct_answer: string; awarded: boolean };
  return { correct: d.correct, correctAnswer: d.correct_answer, awarded: d.awarded };
}

/** Moves to the next round (or finishes) once both answered or time ran out. Returns false if it's too early. */
export async function advanceRound(roomId: string, round: number): Promise<boolean> {
  const { data, error } = await supabase.rpc('advance_round', { p_room: roomId, p_round: round });
  if (error) throw new Error(error.message);
  return !!data;
}

export async function rematchDuel(roomId: string): Promise<string> {
  const { data, error } = await supabase.rpc('rematch_duel', { p_room: roomId });
  if (error) throw new Error(error.message);
  return (data as { code: string }).code;
}

export async function leaveDuelRoom(roomId: string): Promise<void> {
  const { error } = await supabase.rpc('leave_duel_room', { p_room: roomId });
  if (error) console.warn('leave_duel_room failed', error.message);
}

export async function getDuelState(roomId: string): Promise<DuelState> {
  const { data, error } = await supabase.rpc('get_duel_state', { p_room: roomId });
  if (error) throw new Error(error.message);
  const d = data as {
    server_now: string;
    room: {
      id: string; code: string; status: DuelRoom['status']; host_id: string; current_round: number;
      round_started_at: string | null; total_rounds: number; round_seconds: number; rematch_room_id: string | null;
    };
    players: { user_id: string; name: string; score: number }[];
    rounds: DuelRound[];
    answers: { round: number; user_id: string; correct: boolean }[];
  };
  return {
    clockOffsetMs: Date.parse(d.server_now) - Date.now(),
    room: {
      id: d.room.id,
      code: d.room.code,
      status: d.room.status,
      hostId: d.room.host_id,
      currentRound: d.room.current_round,
      roundStartedAt: d.room.round_started_at,
      totalRounds: d.room.total_rounds,
      roundSeconds: d.room.round_seconds,
      rematchRoomId: d.room.rematch_room_id,
    },
    players: d.players.map((p) => ({ userId: p.user_id, name: p.name, score: p.score })),
    rounds: d.rounds,
    answers: d.answers.map((a) => ({ round: a.round, userId: a.user_id, correct: a.correct })),
  };
}

/** Calls onChange whenever the room, its players or its answers change. Returns an unsubscribe function. */
export function subscribeToDuel(roomId: string, onChange: () => void): () => void {
  const channel = supabase
    .channel(`duel:${roomId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'game_rooms', filter: `id=eq.${roomId}` }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'game_players', filter: `room_id=eq.${roomId}` }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'game_answers', filter: `room_id=eq.${roomId}` }, onChange)
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}
