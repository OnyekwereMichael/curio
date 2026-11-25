// Sound design for the CuriWord social video (14s, mono, 44.1kHz WAV). Pure synthesis, no external assets.
import { writeFileSync, mkdirSync } from 'node:fs';
const SR = 44100, DUR = 14, N = SR * DUR;
const out = new Float32Array(N);
let seed = 11; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;
const add = (t, v) => { const i = Math.floor(t * SR); if (i >= 0 && i < N) out[i] += v; };

// soft tick (typewriter key)
const tick = (t0, a = 0.18, f = 1800) => {
  for (let i = 0; i < 0.03 * SR; i++) { const t = i / SR; add(t0 + t, (Math.sin(2 * Math.PI * f * t) * 0.6 + rnd() * 0.4) * Math.exp(-t * 180) * a); }
};
const bell = (t0, f, a, len = 1.6) => {
  for (let i = 0; i < len * SR; i++) { const t = i / SR; add(t0 + t, (Math.sin(2 * Math.PI * f * t) + 0.4 * Math.sin(2 * Math.PI * f * 2.76 * t) * Math.exp(-t * 6)) * Math.exp(-t * 3.2) * a); }
};
const whoosh = (t0, len, a) => {
  let w = 0;
  for (let i = 0; i < len * SR; i++) { const u = i / (len * SR); w += (rnd() - w) * (0.04 + 0.3 * u); add(t0 + i / SR, w * Math.sin(Math.PI * u) ** 1.4 * a); }
};
const thump = (t0, a) => {
  for (let i = 0; i < 0.5 * SR; i++) { const t = i / SR; add(t0 + t, Math.sin(2 * Math.PI * (90 - 45 * t) * t) * Math.exp(-t * 8) * a); }
};

// HOOK 0-4s: nervous "um..." wobble blips, then a slam when the stamp lands (frame 74 -> 2.47s)
for (let k = 0; k < 7; k++) {
  const t0 = 0.35 + k * 0.28, f = 260 + (k % 3) * 40;
  for (let i = 0; i < 0.16 * SR; i++) { const u = i / (0.16 * SR), t = i / SR; add(t0 + t, Math.sin(2 * Math.PI * (f + 25 * Math.sin(t * 38)) * t) * Math.sin(Math.PI * u) * 0.07); }
}
whoosh(2.25, 0.3, 0.45); thump(2.47, 0.8);
for (let i = 0; i < 0.12 * SR; i++) add(2.47 + i / SR, rnd() * Math.exp(-i / SR * 40) * 0.3); // impact crack
// little "sad trombone" two-note drop
for (const [t0, f, len] of [[3.0, 233, 0.28], [3.3, 207, 0.5]]) for (let i = 0; i < len * SR; i++) { const u = i / (len * SR), t = i / SR; add(t0 + t, (Math.sin(2 * Math.PI * f * (1 - 0.06 * u) * t) + 0.5 * Math.sin(2 * Math.PI * f * 2 * t)) * Math.sin(Math.PI * Math.min(1, u * 1.2)) * 0.07); }

// SCENE 2 typing: frames 126-190 at ~30fps (4.2s -> 6.35s), every ~2 chars
for (let t = 4.2; t < 6.35; t += 0.062) tick(t, 0.14 + 0.05 * Math.abs(rnd()), 1500 + 600 * Math.abs(rnd()));
// marker swipe squeak under "word" and "remember"
for (const t0 of [4.45, 5.7]) whoosh(t0, 0.22, 0.12);

// BAR WIPE 6.9-7.8s
whoosh(6.85, 0.9, 0.55); thump(7.35, 0.5);

// SCENE 3 typing 7.7-10.3s
for (let t = 7.7; t < 10.3; t += 0.064) tick(t, 0.13 + 0.05 * Math.abs(rnd()), 1700 + 700 * Math.abs(rnd()));
for (const t0 of [8.45, 9.0, 9.7]) whoosh(t0, 0.22, 0.12);

// CLOSE 11.2s: pop + chime arpeggio, then soft pops for sub line and URL
whoosh(11.05, 0.35, 0.4); thump(11.25, 0.35);
bell(11.3, 523.25, 0.2); bell(11.42, 659.25, 0.18); bell(11.54, 783.99, 0.18); bell(11.68, 1046.5, 0.2);
bell(12.1, 880, 0.07); bell(12.7, 1174.66, 0.07);

let peak = 0; for (const v of out) peak = Math.max(peak, Math.abs(v));
const g = 0.88 / peak;
const buf = Buffer.alloc(44 + N * 2);
buf.write('RIFF', 0); buf.writeUInt32LE(36 + N * 2, 4); buf.write('WAVEfmt ', 8);
buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22);
buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34);
buf.write('data', 36); buf.writeUInt32LE(N * 2, 40);
for (let i = 0; i < N; i++) buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, out[i] * g)) * 32767), 44 + i * 2);
mkdirSync('public/audio', { recursive: true });
writeFileSync('public/audio/curi-word-sfx.wav', buf);
console.log('wrote public/audio/curi-word-sfx.wav');
