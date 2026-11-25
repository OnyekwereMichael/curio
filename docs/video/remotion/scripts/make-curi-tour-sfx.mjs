// Sound design for CuriTour (30.4s mono WAV). Timeline mirrors src/CuriTour.tsx.
import { writeFileSync, mkdirSync } from 'node:fs';
const SR = 44100, DUR = 31, N = SR * DUR, FPS = 30;
const out = new Float32Array(N);
let seed = 5; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;
const add = (t, v) => { const i = Math.floor(t * SR); if (i >= 0 && i < N) out[i] += v; };
const fr = (f) => f / FPS;
const tick = (t0, a = 0.15, f = 1700) => { for (let i = 0; i < 0.03 * SR; i++) { const t = i / SR; add(t0 + t, (Math.sin(2 * Math.PI * f * t) * 0.6 + rnd() * 0.4) * Math.exp(-t * 180) * a); } };
const typing = (f0, f1, step = 2) => { for (let f = f0; f < f1; f += step) tick(fr(f), 0.12 + 0.05 * Math.abs(rnd()), 1500 + 700 * Math.abs(rnd())); };
const bell = (t0, f, a, len = 1.6) => { for (let i = 0; i < len * SR; i++) { const t = i / SR; add(t0 + t, (Math.sin(2 * Math.PI * f * t) + 0.4 * Math.sin(2 * Math.PI * f * 2.76 * t) * Math.exp(-t * 6)) * Math.exp(-t * 3.2) * a); } };
const whoosh = (t0, len, a) => { let w = 0; for (let i = 0; i < len * SR; i++) { const u = i / (len * SR); w += (rnd() - w) * (0.04 + 0.3 * u); add(t0 + i / SR, w * Math.sin(Math.PI * u) ** 1.4 * a); } };
const thump = (t0, a) => { for (let i = 0; i < 0.45 * SR; i++) { const t = i / SR; add(t0 + t, Math.sin(2 * Math.PI * (90 - 45 * t) * t) * Math.exp(-t * 9) * a); } };
const pop = (t0, f = 900, a = 0.2) => { for (let i = 0; i < 0.12 * SR; i++) { const t = i / SR; add(t0 + t, Math.sin(2 * Math.PI * (f + 900 * t) * t) * Math.exp(-t * 30) * a); } };

// HOOK
typing(14, 44); typing(56, 68, 1); typing(72, 86);
whoosh(fr(89), 0.2, 0.3); pop(fr(90), 700, 0.25);
pop(fr(100), 520, 0.25); thump(fr(103), 0.35);
whoosh(fr(112), 0.25, 0.3); pop(fr(114), 1100, 0.2);
// PROBLEM scene
whoosh(fr(116), 0.3, 0.4); typing(126, 190); whoosh(fr(137), 0.2, 0.1); whoosh(fr(165), 0.2, 0.1);
// BARS
whoosh(fr(198), 0.85, 0.55); thump(fr(214), 0.45);
// FEATURE scenes
for (const s of [216, 312, 408, 504, 600, 696]) {
  whoosh(fr(s), 0.45, 0.4); thump(fr(s + 14), 0.25);
  typing(s + 6, s + 56, 2);
  pop(fr(s + 34), 1000, 0.18); pop(fr(s + 50), 1300, 0.16);
}
// END
whoosh(fr(788), 0.35, 0.4); thump(fr(792), 0.35);
bell(fr(796), 523.25, 0.2); bell(fr(800), 659.25, 0.18); bell(fr(804), 783.99, 0.18); bell(fr(809), 1046.5, 0.2);
bell(fr(830), 880, 0.07); bell(fr(850), 1174.66, 0.07);

let peak = 0; for (const v of out) peak = Math.max(peak, Math.abs(v));
const g = 0.88 / peak;
const buf = Buffer.alloc(44 + N * 2);
buf.write('RIFF', 0); buf.writeUInt32LE(36 + N * 2, 4); buf.write('WAVEfmt ', 8);
buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22);
buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34);
buf.write('data', 36); buf.writeUInt32LE(N * 2, 40);
for (let i = 0; i < N; i++) buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, out[i] * g)) * 32767), 44 + i * 2);
mkdirSync('public/audio', { recursive: true });
writeFileSync('public/audio/curi-tour-sfx.wav', buf);
console.log('wrote public/audio/curi-tour-sfx.wav');
