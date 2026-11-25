// Original upbeat background track for CuriTour (30.4s, stereo-ish WAV). 133.33 BPM so the drop lands on frame 216 (7.2s).
// Sections: 0-4s sparse pluck+pad (hook) | 4-7.2s build (hats, soft kick, riser) | 7.2-26.4s full groove | 26.4s-end ring-out + fade.
import { writeFileSync, mkdirSync } from 'node:fs';
const SR = 44100, DUR = 30.4, N = Math.ceil(SR * DUR);
const BEAT = 0.45, BAR = 1.8, DROP = 7.2, GROOVE_END = 26.4;
const synth = new Float32Array(N); // pad + pluck + bass (gets sidechained)
const drums = new Float32Array(N);
let seed = 3; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;
const hz = (m) => 440 * 2 ** ((m - 69) / 12);
const put = (buf, t, v) => { const i = Math.floor(t * SR); if (i >= 0 && i < N) buf[i] += v; };

const CH = [ // C G Am F
  { pad: [60, 64, 67], bass: 48, arp: [60, 64, 67, 72] },
  { pad: [59, 62, 67], bass: 43, arp: [59, 62, 67, 71] },
  { pad: [57, 60, 64], bass: 45, arp: [57, 60, 64, 69] },
  { pad: [57, 60, 65], bass: 41, arp: [57, 60, 65, 69] },
];
const chordAt = (t) => CH[Math.floor(t / BAR) % 4];

// pad: soft detuned sines, one chord per bar with slow attack
for (let bar = 0; bar * BAR < DUR; bar++) {
  const c = CH[bar % 4], t0 = bar * BAR;
  for (const m of c.pad) for (const d of [-0.004, 0.004]) {
    const f = hz(m) * (1 + d);
    for (let i = 0; i < (BAR + 0.5) * SR; i++) {
      const t = i / SR, env = Math.min(1, t / 0.35) * (t < BAR ? 1 : Math.exp(-(t - BAR) * 8));
      put(synth, t0 + t, (Math.sin(2 * Math.PI * f * t) + 0.3 * Math.sin(4 * Math.PI * f * t)) * 0.028 * env);
    }
  }
}
// pluck arp, 8th notes, louder with each section
const pluckAmp = (t) => (t < 4 ? 0.07 : t < DROP ? 0.1 : t < GROOVE_END ? 0.15 : 0.1);
const arpPat = [0, 1, 2, 3, 2, 1, 2, 1];
for (let k = 0; k * BEAT / 2 < DUR - 0.3; k++) {
  const t0 = k * BEAT / 2, c = chordAt(t0), m = c.arp[arpPat[k % 8]];
  const f = hz(m + 12 * (k % 8 === 3 ? 0 : 0)), a = pluckAmp(t0);
  for (let i = 0; i < 0.35 * SR; i++) {
    const t = i / SR, env = Math.exp(-t * 11);
    let v = 0; for (let h = 1; h <= 5; h++) v += Math.sin(2 * Math.PI * f * h * t) / (h * h) * Math.exp(-t * h * 2);
    put(synth, t0 + t, v * env * a);
  }
}
// bass: 8th notes in the groove
for (let k = 0; k * BEAT / 2 < GROOVE_END; k++) {
  const t0 = k * BEAT / 2; if (t0 < DROP) continue;
  if (k % 2 === 1 && k % 8 !== 7) continue; // root on beats, little push before the bar
  const c = chordAt(t0), f = hz(c.bass);
  for (let i = 0; i < 0.42 * SR; i++) {
    const t = i / SR, env = Math.min(1, t / 0.01) * Math.exp(-t * 4.5);
    put(synth, t0 + t, (Math.sin(2 * Math.PI * f * t) + 0.35 * Math.sin(4 * Math.PI * f * t)) * 0.2 * env);
  }
}

// drums
const kicks = [];
const kick = (t0, a) => { kicks.push(t0); for (let i = 0; i < 0.4 * SR; i++) { const t = i / SR; put(drums, t0 + t, Math.sin(2 * Math.PI * (48 * t + 70 * (1 - Math.exp(-t * 30)) / 30 * 1)) * Math.exp(-t * 11) * a); } };
const hat = (t0, a) => { let p = 0; for (let i = 0; i < 0.05 * SR; i++) { const n = rnd(); put(drums, t0 + i / SR, (n - p) * Math.exp(-i / SR * 70) * a); p = n; } };
const clap = (t0, a) => { for (const o of [0, 0.011, 0.022]) { let p = 0; for (let i = 0; i < 0.14 * SR; i++) { const n = rnd(); put(drums, t0 + o + i / SR, (n - 0.6 * p) * Math.exp(-i / SR * (o === 0.022 ? 24 : 70)) * a); p = n; } } };
for (let b = 0; b * BEAT < DUR; b++) {
  const t = b * BEAT;
  if (t >= GROOVE_END) break;
  if (t >= DROP) { kick(t, 0.55); if (b % 2 === 1) clap(t, 0.16); }
  else if (t >= 4 && b % 2 === 0) kick(t, 0.3); // soft build kick
  if (t >= 4) { hat(t + BEAT / 2, t >= DROP ? 0.12 : 0.06); if (t >= DROP) { hat(t + BEAT / 4, 0.05); hat(t + BEAT * 0.75, 0.05); } }
}
// snare-roll riser 5.4 -> 7.2 and a crash at the drop
{ let lp = 0; for (let i = 0; i < 1.8 * SR; i++) { const u = i / (1.8 * SR); lp += (rnd() - lp) * (0.03 + 0.5 * u * u); put(drums, 5.4 + i / SR, lp * u * u * 0.45); } }
{ let p = 0; for (let i = 0; i < 1.4 * SR; i++) { const n = rnd(); put(drums, DROP + i / SR, (n - p) * Math.exp(-i / SR * 3) * 0.22); p = n; } }

// sidechain duck the synth against kicks, then mix with fades
const duck = new Float32Array(N); let ki = 0, last = -9;
for (let i = 0; i < N; i++) { const t = i / SR; while (ki < kicks.length && kicks[ki] <= t) last = kicks[ki++]; duck[i] = 1 - 0.55 * Math.exp(-(t - last) / 0.13); }
const mix = new Float32Array(N);
for (let i = 0; i < N; i++) {
  const t = i / SR;
  const fadeIn = Math.min(1, t / 0.4), fadeOut = Math.min(1, Math.max(0, (DUR - t) / 1.6));
  mix[i] = (synth[i] * duck[i] + drums[i]) * fadeIn * fadeOut;
}
// light echo for width
const L = new Float32Array(N), R = new Float32Array(N), dl = Math.floor(0.225 * SR);
for (let i = 0; i < N; i++) { L[i] = mix[i] + (i >= dl ? 0.22 * mix[i - dl] : 0); R[i] = mix[i] + (i >= dl * 2 ? 0.22 * mix[i - dl * 2] : 0); }
let peak = 0; for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
const g = 0.85 / peak;
const buf = Buffer.alloc(44 + N * 4);
buf.write('RIFF', 0); buf.writeUInt32LE(36 + N * 4, 4); buf.write('WAVEfmt ', 8);
buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22);
buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34);
buf.write('data', 36); buf.writeUInt32LE(N * 4, 40);
for (let i = 0; i < N; i++) { buf.writeInt16LE(Math.round(L[i] * g * 32767), 44 + i * 4); buf.writeInt16LE(Math.round(R[i] * g * 32767), 46 + i * 4); }
mkdirSync('public/audio', { recursive: true });
writeFileSync('public/audio/curi-tour-music.wav', buf);
console.log('wrote public/audio/curi-tour-music.wav');
