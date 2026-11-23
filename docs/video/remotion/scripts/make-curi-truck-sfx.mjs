// Generates the sound design for the CuriTruck social video (10s, mono, 44.1kHz WAV).
// Pure synthesis, no external assets: engine rumble, tarp creaks, whoosh, settle thump, chime.
import { writeFileSync, mkdirSync } from 'node:fs';
const SR = 44100, DUR = 10, N = SR * DUR;
const out = new Float32Array(N);
let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;
const clamp01 = (x) => Math.max(0, Math.min(1, x));

// engine + road rumble, fades out as the screen wipes to the end card
let lp = 0;
for (let i = 0; i < N; i++) {
  const t = i / SR;
  const env = clamp01(t / 0.3) * (1 - clamp01((t - 6.2) / 0.8));
  const am = 0.65 + 0.35 * Math.sin(2 * Math.PI * 11 * t);
  const eng = Math.sin(2 * Math.PI * 48 * t) * 0.16 + Math.sin(2 * Math.PI * 96 * t + 1) * 0.07 + Math.sin(2 * Math.PI * 144 * t) * 0.03;
  lp += (rnd() - lp) * 0.04;
  out[i] += (eng * am + lp * 0.35) * env;
}
// tarp / suspension creaks while it wobbles
for (let k = 0; k < 6; k++) {
  const t0 = 0.4 + k * 0.55, len = 0.28;
  for (let i = 0; i < len * SR; i++) {
    const u = i / (len * SR), t = t0 + i / SR, idx = Math.floor(t * SR);
    const f = 190 - 70 * u + 25 * Math.sin(u * 40);
    out[idx] += Math.sin(2 * Math.PI * f * (i / SR)) * Math.sin(Math.PI * u) * 0.09 * (0.7 + 0.3 * rnd());
  }
}
// whoosh as the Curi truck pulls alongside (3.2 -> 4.4s)
let w = 0;
for (let i = 0; i < 1.2 * SR; i++) {
  const u = i / (1.2 * SR), idx = Math.floor(3.2 * SR) + i;
  w += (rnd() - w) * (0.05 + 0.25 * u);
  out[idx] += w * Math.sin(Math.PI * u) ** 1.5 * 0.6;
}
// settle thump when the wobbling truck stabilises (~3.9s)
for (let i = 0; i < 0.4 * SR; i++) {
  const t = i / SR, idx = Math.floor(3.95 * SR) + i;
  out[idx] += Math.sin(2 * Math.PI * (75 - 30 * t) * t) * Math.exp(-t * 9) * 0.5;
}
// chime + sparkle arpeggio at the logo reveal (6.55s)
const bell = (t0, f, a) => {
  for (let i = 0; i < 1.6 * SR; i++) {
    const t = i / SR, idx = Math.floor(t0 * SR) + i;
    if (idx >= N) break;
    out[idx] += (Math.sin(2 * Math.PI * f * t) + 0.4 * Math.sin(2 * Math.PI * f * 2.76 * t) * Math.exp(-t * 6)) * Math.exp(-t * 3.2) * a;
  }
};
bell(6.5, 523.25, 0.2); bell(6.62, 659.25, 0.18); bell(6.74, 783.99, 0.18); bell(6.88, 1046.5, 0.2);
// soft pop on the tagline + the pill
bell(7.6, 880, 0.08); bell(8.3, 1174.66, 0.08);

let peak = 0; for (const v of out) peak = Math.max(peak, Math.abs(v));
const g = 0.88 / peak;
const buf = Buffer.alloc(44 + N * 2);
buf.write('RIFF', 0); buf.writeUInt32LE(36 + N * 2, 4); buf.write('WAVEfmt ', 8);
buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22);
buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34);
buf.write('data', 36); buf.writeUInt32LE(N * 2, 40);
for (let i = 0; i < N; i++) buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, out[i] * g)) * 32767), 44 + i * 2);
mkdirSync('public/audio', { recursive: true });
writeFileSync('public/audio/curi-truck-sfx.wav', buf);
console.log('wrote public/audio/curi-truck-sfx.wav');
