// Audio for the Fact or Fiction promo (src/fofPromo.json drives every timing).
//  1) Voiceover: one clip per line via Microsoft neural TTS (msedge-tts). NOTE: sends the (public, promotional) line text to Microsoft's service.
//     VOICE=... (default en-US-AvaMultilingualNeural), RATE=... (default +8%)
//  2) Music + sound effects: pure synthesis, no external assets -> public/audio/fof-promo-music.wav / fof-promo-sfx.wav
// Writes src/generated/fofPromoVo.json (clip file, start, measured length) which the video reads for captions.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const T = JSON.parse(fs.readFileSync(path.join(root, 'src', 'fofPromo.json'), 'utf8'));
const VOICE = process.env.VOICE || 'en-US-AvaMultilingualNeural';
const RATE = process.env.RATE || '+8%';
const KBPS = 48;
const audioDir = path.join(root, 'public', 'audio');
fs.mkdirSync(audioDir, { recursive: true });
fs.mkdirSync(path.join(root, 'src', 'generated'), { recursive: true });

/* ───────────── voiceover ───────────── */
async function open() {
  const tts = new MsEdgeTTS();
  await tts.setMetadata(VOICE, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
  return tts;
}
const voJson = path.join(root, 'src', 'generated', 'fofPromoVo.json');
const reuse = process.env.SKIP_VO && fs.existsSync(voJson);
let tts = reuse ? null : await open();
const clips = [];
if (reuse) clips.push(...JSON.parse(fs.readFileSync(voJson, 'utf8')).clips);
for (const line of reuse ? [] : T.vo) {
  let buf;
  for (let attempt = 1; ; attempt++) {
    try {
      const { audioStream } = tts.toStream(line.say, { rate: RATE });
      const chunks = [];
      for await (const c of audioStream) chunks.push(c);
      buf = Buffer.concat(chunks);
      break;
    } catch (e) {
      if (attempt >= 4) throw e;
      console.warn('retry', attempt, String(e.message).slice(0, 60));
      try { tts.close(); } catch {}
      tts = await open();
    }
  }
  const file = `fof-promo-vo-${line.id}.mp3`;
  fs.writeFileSync(path.join(audioDir, file), buf);
  clips.push({ id: line.id, file, at: line.at, sec: Number(((buf.length * 8) / (KBPS * 1000)).toFixed(2)), text: line.text });
}
try { tts?.close(); } catch {}
if (!reuse) fs.writeFileSync(path.join(root, 'src', 'generated', 'fofPromoVo.json'), JSON.stringify({ voice: VOICE, rate: RATE, clips }, null, 2));

// sanity: every line must finish before its scene ends
const ends = Object.values(T.scenes).map((s) => s[1]);
for (const c of clips) {
  const end = c.at + c.sec;
  const sceneEnd = ends.find((e) => e > c.at + 0.01);
  console.log(`${c.id.padEnd(7)} ${c.at.toFixed(2)}s + ${c.sec.toFixed(2)}s = ${end.toFixed(2)}s  (scene ends ${sceneEnd}s)${end > sceneEnd - 0.1 ? '   <-- TOO LONG' : ''}`);
}

/* ───────────── music + sfx ───────────── */
const SR = 44100;
const N = Math.ceil(T.total * SR);
const sfx = new Float32Array(N);
const mus = new Float32Array(N);
let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;
const put = (arr, t, v) => { const i = Math.floor(t * SR); if (i >= 0 && i < N) arr[i] += v; };
const TAU = Math.PI * 2;

const whoosh = (t0, len, a) => { let w = 0; for (let i = 0; i < len * SR; i++) { const u = i / (len * SR); w += (rnd() - w) * (0.04 + 0.3 * u); put(sfx, t0 + i / SR, w * Math.sin(Math.PI * u) ** 1.4 * a); } };
const thump = (t0, a, f0 = 95) => { for (let i = 0; i < 0.5 * SR; i++) { const t = i / SR; put(sfx, t0 + t, Math.sin(TAU * (f0 - 45 * t) * t) * Math.exp(-t * 8) * a); } };
const crack = (t0, a) => { for (let i = 0; i < 0.12 * SR; i++) put(sfx, t0 + i / SR, rnd() * Math.exp((-i / SR) * 40) * a); };
const slam = (t0, a = 0.8) => { whoosh(t0 - 0.2, 0.22, a * 0.5); thump(t0, a); crack(t0, a * 0.4); };
const sq = (arr, t0, f, len, a, duty = 0.5) => { for (let i = 0; i < len * SR; i++) { const t = i / SR; const ph = (f * t) % 1; const env = Math.min(1, t * 200) * Math.exp(-t * (3 / len)); put(arr, t0 + t, (ph < duty ? 1 : -1) * env * a); } };
const coin = (t0, a = 0.2) => { sq(sfx, t0, 988, 0.07, a); sq(sfx, t0 + 0.07, 1319, 0.35, a); };
const blip = (t0, f, a = 0.12) => sq(sfx, t0, f, 0.08, a);
const bell = (t0, f, a, len = 1.4) => { for (let i = 0; i < len * SR; i++) { const t = i / SR; put(sfx, t0 + t, (Math.sin(TAU * f * t) + 0.4 * Math.sin(TAU * f * 2.76 * t) * Math.exp(-t * 6)) * Math.exp(-t * 3.2) * a); } };
const sparkle = (t0, a = 0.1) => { for (let k = 0; k < 8; k++) bell(t0 + k * 0.045, 1500 + ((k * 397) % 1400), a * 0.6, 0.5); };
const buzz = (t0, a = 0.2) => { for (let i = 0; i < 0.35 * SR; i++) { const t = i / SR; put(sfx, t0 + t, (((130 * t) % 1) < 0.5 ? 1 : -1) * Math.exp(-t * 5) * a); } };

const S = (name) => T.scenes[name][0];
// 1 hook: heartbeat-ish pulses, riser into the reveal
for (let k = 0; k < 6; k++) { thump(0.4 + k * 0.7, 0.25 + k * 0.05, 70); }
whoosh(3.2, 1.7, 0.5);
for (let k = 0; k < 10; k++) blip(1.0 + k * 0.38, 440 + (k % 4) * 110, 0.05);
// 2 reveal: FACT slam, FICTION slam, badge pops, fanfare
slam(S('reveal') + 0.4, 0.9); slam(S('reveal') + 1.0, 0.9); whoosh(S('reveal') + 1.7, 0.3, 0.3);
coin(S('reveal') + 1.9); coin(S('reveal') + 3.0, 0.16); sparkle(S('reveal') + 1.1, 0.2);
// scene cuts: quick whoosh
for (const k of ['create', 'join', 'start', 'vote', 'answer', 'score', 'finish', 'cta']) whoosh(S(k) - 0.18, 0.25, 0.32);
// 3 create: tap, code letters flip in
blip(S('create') + 1.3, 880, 0.15); for (let k = 0; k < 4; k++) { blip(S('create') + 2.2 + k * 0.28, 520 + k * 130, 0.16); }
coin(S('create') + 3.5);
// 4 join: type, tap, then players pop in
for (let k = 0; k < 4; k++) blip(S('join') + 0.7 + k * 0.2, 700 + k * 40, 0.1);
blip(S('join') + 1.9, 880, 0.15);
coin(S('join') + 2.0, 0.16);
for (let k = 0; k < 6; k++) coin(S('join') + 3.0 + k * 0.4, 0.11);
// 5 start: tap + flash + ROUND 1
blip(S('start') + 0.9, 880, 0.16); slam(S('start') + 1.5, 0.8); sparkle(S('start') + 1.5, 0.12);
// 6 vote: ticking while the bar drains, urgent in red, tap
for (let k = 0; k < 16; k++) blip(S('vote') + 0.6 + k * 0.28, k > 11 ? 1100 : 760, 0.07);
blip(S('vote') + 4.4, 660, 0.18);
// 7 answer: verdict slam + correct chime + confetti
slam(S('answer') + 0.9, 0.9); bell(S('answer') + 0.98, 523.25, 0.2); bell(S('answer') + 1.1, 659.25, 0.18); bell(S('answer') + 1.22, 783.99, 0.18); sparkle(S('answer') + 1.3, 0.18);
buzz(S('answer') + 3.6, 0.1);
// 8 score: three bonuses pop + total
for (const [d, f] of [[0.4, 523], [2.4, 659], [4.4, 784]]) { coin(S('score') + d); bell(S('score') + d, f, 0.1, 0.8); }
slam(S('score') + 6.3, 0.7); sparkle(S('score') + 6.35, 0.16);
// 9 finish: round counter ticks, podium rise, fanfare
for (let k = 0; k < 10; k++) blip(S('finish') + 0.2 + k * 0.1, 500 + k * 40, 0.08);
slam(S('finish') + 1.5, 0.7); slam(S('finish') + 1.85, 0.7); slam(S('finish') + 2.2, 0.9);
[523.25, 659.25, 783.99, 1046.5].forEach((f, k) => bell(S('finish') + 2.25 + k * 0.1, f, 0.17)); sparkle(S('finish') + 2.3, 0.18);
// 10 cta: slam, fanfare, pops
slam(S('cta') + 0.3, 0.85); [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, k) => bell(S('cta') + 0.32 + k * 0.09, f, 0.16));
sparkle(S('cta') + 0.5, 0.2);
for (const d of [1.6, 4.0, 5.2]) { slam(S('cta') + d, 0.5); coin(S('cta') + d + 0.1, 0.12); }

// music: 128 bpm, A minor, bass + arp + kick/hat; builds a little at each act
const bpm = 128, beat = 60 / bpm;
const midi = (m) => 440 * 2 ** ((m - 69) / 12);
const prog = [57, 53, 48, 55]; // A F C G (bass roots)
for (let b = 0; b * beat < T.total; b++) {
  const t = b * beat, bar = Math.floor(b / 4) % 4, root = prog[bar];
  const act = t < 5 ? 0 : t < 49 ? 1 : 2;
  // kick on every beat after the hook, tension heartbeat in the hook
  if (t >= 4.8) { for (let i = 0; i < 0.25 * SR; i++) { const x = i / SR; put(mus, t + x, Math.sin(TAU * (120 - 80 * x * 4) * x) * Math.exp(-x * 14) * 0.5); } }
  // off-beat hat
  if (t >= 4.8) for (let i = 0; i < 0.04 * SR; i++) put(mus, t + beat / 2 + i / SR, rnd() * Math.exp((-i / SR) * 90) * 0.1);
  // bass
  sq(mus, t, midi(root - 12), beat * 0.9, 0.22, 0.4);
  // arpeggio (8th notes)
  if (t >= 0.5) for (let k = 0; k < 2; k++) {
    const note = root + 12 + [0, 7, 12, 7, 3, 10, 15, 10][(b * 2 + k) % 8] + (act === 2 ? 12 : 0);
    sq(mus, t + k * (beat / 2), midi(note), beat * 0.45, act === 0 ? 0.05 : 0.09, 0.25);
  }
}

const peakOf = (a) => { let p = 0; for (const v of a) p = Math.max(p, Math.abs(v)); return p; };
function wav(name, arr, target) {
  const g = target / (peakOf(arr) || 1);
  const buf = Buffer.alloc(44 + N * 2);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + N * 2, 4); buf.write('WAVEfmt ', 8);
  buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34);
  buf.write('data', 36); buf.writeUInt32LE(N * 2, 40);
  for (let i = 0; i < N; i++) buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, arr[i] * g)) * 32767), 44 + i * 2);
  fs.writeFileSync(path.join(audioDir, name), buf);
  console.log('wrote', name);
}
// fade music out at the very end
for (let i = 0; i < 2 * SR; i++) mus[N - 1 - i] *= i / (2 * SR);
wav('fof-promo-music.wav', mus, 0.9);
wav('fof-promo-sfx.wav', sfx, 0.9);
