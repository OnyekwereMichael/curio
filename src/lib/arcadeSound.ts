/**
 * Arcade sound effects for the party games, synthesised with the Web Audio API (no audio files).
 * Browsers only allow audio after a tap, so call `arcade.unlock()` from any click handler (it is cheap to call repeatedly).
 */

const MUTE_KEY = 'arcade_muted';

let ctx: AudioContext | null = null;
let muted = (() => {
  try {
    return localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
})();

function audio(): AudioContext | null {
  if (!ctx) {
    try {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      ctx = new Ctor();
    } catch {
      return null;
    }
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

interface ToneOptions {
  type?: OscillatorType;
  vol?: number;
  when?: number;
  to?: number;
}

function tone(freq: number, dur: number, o: ToneOptions = {}) {
  if (muted) return;
  const c = audio();
  if (!c) return;
  const t = c.currentTime + (o.when ?? 0);
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = o.type ?? 'square';
  osc.frequency.setValueAtTime(freq, t);
  if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t + dur);
  gain.gain.setValueAtTime(o.vol ?? 0.12, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(gain);
  gain.connect(c.destination);
  osc.start(t);
  osc.stop(t + dur + 0.03);
}

const sequence = (notes: number[], step: number, o: ToneOptions = {}) =>
  notes.forEach((f, i) => tone(f, step * 1.4, { ...o, when: i * step }));

export const arcade = {
  unlock: () => void audio(),
  click: () => tone(520, 0.08, { to: 880, vol: 0.2 }),
  join: () => sequence([523, 659, 784], 0.07),
  start: () => sequence([392, 523, 659, 784, 1047], 0.08),
  tick: () => tone(900, 0.05, { vol: 0.1 }),
  correct: () => sequence([659, 880, 1175], 0.08, { type: 'triangle', vol: 0.2 }),
  wrong: () => {
    tone(220, 0.3, { type: 'sawtooth', to: 70, vol: 0.18 });
    tone(160, 0.35, { to: 50, vol: 0.1, when: 0.08 });
  },
  win: () => sequence([523, 659, 784, 1047, 784, 1047, 1319], 0.11, { vol: 0.13 }),
  isMuted: () => muted,
  toggleMute: () => {
    muted = !muted;
    try {
      localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
    } catch {
      // storage unavailable: mute still applies for this session
    }
    return muted;
  },
};
