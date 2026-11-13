// Composes a soft, original background track (no licensing needed) → public/audio/music.mp3
// ~96 BPM, C–G–Am–F, warm pad + gentle plucked arpeggio + quiet bass + a hint of shaker, with a light echo.
// Deliberately simple and quiet; replace public/audio/music.mp3 with any licensed track you prefer.
// Run: node scripts/music.mjs   (run scripts/voiceover.mjs first, to know the length)
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const timing = JSON.parse(fs.readFileSync(path.join(root, 'public', 'audio', 'voiceover.json'), 'utf8'));
const SR = 44100;
const BPM = 96;
const beat = 60 / BPM;
const secs = Math.ceil(timing.total + 3);
const N = secs * SR;
const L = new Float32Array(N);
const R = new Float32Array(N);

const hz = (m) => 440 * 2 ** ((m - 69) / 12);
// Each chord lasts 2 bars (8 beats): bass root + a triad with the octave on top.
const CHORDS = [
  { root: 36, notes: [60, 64, 67, 72] }, // C
  { root: 43, notes: [59, 62, 67, 71] }, // G
  { root: 45, notes: [57, 60, 64, 69] }, // Am
  { root: 41, notes: [57, 60, 65, 69] }, // F
];

/** Mix a mono voice into the stereo buffers at `start` seconds. */
function add(start, dur, fn, pan = 0.5, gain = 1) {
  const s0 = Math.floor(start * SR);
  const n = Math.floor(dur * SR);
  const gl = gain * Math.cos(pan * Math.PI * 0.5);
  const gr = gain * Math.sin(pan * Math.PI * 0.5);
  for (let i = 0; i < n && s0 + i < N; i++) {
    const v = fn(i / SR);
    L[s0 + i] += v * gl;
    R[s0 + i] += v * gr;
  }
}
const sine = (f, t) => Math.sin(2 * Math.PI * f * t);

const bars2 = Math.ceil(secs / (8 * beat));
for (let c = 0; c < bars2; c++) {
  const ch = CHORDS[c % CHORDS.length];
  const t0 = c * 8 * beat;

  // Pad: slow swell, slightly detuned for warmth.
  const len = 8 * beat + 1.2;
  ch.notes.forEach((m, k) => {
    const f = hz(m);
    add(t0, len, (t) => {
      const a = Math.min(1, t / 1.4) * Math.min(1, (len - t) / 1.2);
      return a * 0.03 * (sine(f, t) + 0.5 * sine(f * 1.004, t) + 0.2 * sine(f * 2, t));
    }, 0.25 + 0.17 * k);
  });

  // Bass: root, one long soft note per bar.
  for (let b = 0; b < 2; b++) {
    add(t0 + b * 4 * beat, 4 * beat, (t) => 0.05 * Math.min(1, t / 0.05) * Math.exp(-t / 2.2) * (sine(hz(ch.root), t) + 0.3 * sine(hz(ch.root) * 2, t)), 0.5);
  }

  // Plucked arpeggio on 8th notes: up through the chord and back, a touch of swing in the velocity.
  const pattern = [0, 1, 2, 3, 2, 1, 2, 1, 0, 1, 2, 3, 2, 1, 3, 2];
  pattern.forEach((idx, i) => {
    const f = hz(ch.notes[idx] + 12);
    const vel = i % 4 === 0 ? 1 : i % 2 === 0 ? 0.75 : 0.55;
    add(t0 + i * 0.5 * beat, 1.1, (t) => 0.05 * vel * Math.min(1, t / 0.004) * Math.exp(-t / 0.35) * (sine(f, t) + 0.35 * sine(f * 2, t) + 0.12 * sine(f * 3, t)), 0.35 + 0.3 * ((i % 4) / 3));
  });

  // Shaker: very quiet filtered noise on the off-beats.
  for (let i = 0; i < 8; i++) {
    let prev = 0;
    add(t0 + (i + 0.5) * beat, 0.08, (t) => {
      const n = Math.random() * 2 - 1;
      const hp = n - prev; // crude high-pass
      prev = n;
      return 0.012 * hp * Math.exp(-t / 0.02);
    }, 0.65);
  }
}

// Light stereo echo for space.
const delay = Math.floor(beat * 0.75 * SR);
for (let i = delay; i < N; i++) {
  L[i] += R[i - delay] * 0.28;
  R[i] += L[i - delay] * 0.28;
}

// Fade in/out, normalise to a peak of 0.6 (the video lowers it further).
let peak = 0;
for (let i = 0; i < N; i++) {
  const t = i / SR;
  const f = Math.min(1, t / 2) * Math.min(1, (secs - t) / 3);
  L[i] *= f;
  R[i] *= f;
  peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
}
const g = 0.6 / peak;

// 16-bit stereo WAV → mp3 via the ffmpeg that ships with Remotion.
const wav = Buffer.alloc(44 + N * 4);
wav.write('RIFF', 0);
wav.writeUInt32LE(36 + N * 4, 4);
wav.write('WAVEfmt ', 8);
wav.writeUInt32LE(16, 16);
wav.writeUInt16LE(1, 20);
wav.writeUInt16LE(2, 22);
wav.writeUInt32LE(SR, 24);
wav.writeUInt32LE(SR * 4, 28);
wav.writeUInt16LE(4, 32);
wav.writeUInt16LE(16, 34);
wav.write('data', 36);
wav.writeUInt32LE(N * 4, 40);
for (let i = 0; i < N; i++) {
  wav.writeInt16LE(Math.round(Math.max(-1, Math.min(1, L[i] * g)) * 32767), 44 + i * 4);
  wav.writeInt16LE(Math.round(Math.max(-1, Math.min(1, R[i] * g)) * 32767), 46 + i * 4);
}
const tmp = path.join(os.tmpdir(), 'curi-music.wav');
fs.writeFileSync(tmp, wav);
const mp3 = path.join(root, 'public', 'audio', 'music.mp3');
execSync(`npx remotion ffmpeg -y -i "${tmp}" -b:a 128k "${mp3}"`, { cwd: root, stdio: 'ignore' });
fs.unlinkSync(tmp);
console.log(`music.mp3 written: ${secs}s, ${(fs.statSync(mp3).size / 1024 / 1024).toFixed(1)} MB`);
