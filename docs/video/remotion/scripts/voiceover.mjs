// Generates one spoken clip per narration beat (public/audio/vo-<scene>-<beat>.mp3) from ../storyboard.json
// using Microsoft's neural text-to-speech (msedge-tts), then lays the beats out against the visuals.
// NOTE: this sends the narration text to Microsoft's online service.
//   VOICE=...  default en-US-AvaMultilingualNeural (Nigerian English: en-NG-EzinneNeural / en-NG-AbeoNeural)
//   RATE=...   default -2%
//   SAMPLE=3   write one scene's lines to out/voice-samples/<voice>.mp3 instead (to audition voices)
// Layout: each line starts at its planned time, or right after the previous line, whichever is later; scenes stretch
// to fit; screenshot cuts, podium rises and step reveals are anchored to the lines. Updates ../storyboard.json,
// writes ../voiceover-timing.json (captions) and public/audio/voiceover.json (the video).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const boardPath = path.resolve(root, '..', 'storyboard.json');
const board = JSON.parse(fs.readFileSync(boardPath, 'utf8'));
const VOICE = process.env.VOICE || 'en-US-AvaMultilingualNeural';
const RATE = process.env.RATE || '-2%';
const KBPS = 48;
const GAP = 0.25; // pause between lines
const out = path.join(root, 'public', 'audio');
fs.mkdirSync(out, { recursive: true });

// Screenshot cut rules per scene: [beatIndex, 'at' | 'frac', value] → beat.at + value, or beat.at + value * beat.sec.
const CUTS = {
  2: [[0, 'at', 0], [1, 'at', -0.2]],
  3: [[0, 'at', 0], [1, 'at', -0.2]],
  4: [[0, 'at', 0], [0, 'frac', 0.62], [1, 'at', -0.2]],
  5: [[0, 'at', 0], [1, 'at', -0.2]],
  6: [[0, 'at', 0], [1, 'at', -0.2]],
  8: [[0, 'at', 0], [1, 'at', -0.3], [1, 'frac', 0.55]],
};

const spoken = (t) => t.replace(/\bXP\b/g, 'X P'); // spoken form only; captions keep the normal spelling

async function open(voice) {
  const tts = new MsEdgeTTS();
  await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
  return tts;
}
async function synth(tts, text) {
  // The service occasionally closes the socket early; reconnect and retry.
  for (let attempt = 1; ; attempt++) {
    try {
      const { audioStream } = tts.toStream(spoken(text), { rate: RATE });
      const chunks = [];
      for await (const c of audioStream) chunks.push(c);
      const buf = Buffer.concat(chunks);
      return { buf, sec: (buf.length * 8) / (KBPS * 1000) };
    } catch (e) {
      if (attempt >= 4) throw e;
      console.warn('retry', attempt, e.message.slice(0, 60));
      try { tts.close(); } catch {}
      await tts.setMetadata(VOICE, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
    }
  }
}
const r2 = (n) => Number(n.toFixed(2));

if (process.env.SAMPLE) {
  const dir = path.join(root, 'out', 'voice-samples');
  fs.mkdirSync(dir, { recursive: true });
  const tts = await open(VOICE);
  const text = board.scenes[Number(process.env.SAMPLE) - 1].beats.map((b) => b.text).join(' ');
  const r = await synth(tts, text);
  fs.writeFileSync(path.join(dir, `${VOICE}.mp3`), r.buf);
  console.log('sample', VOICE, r.sec.toFixed(1) + 's');
  tts.close();
  process.exit(0);
}

// 1) Speak every beat and measure it.
const tts = await open(VOICE);
for (const s of board.scenes) {
  for (let i = 0; i < s.beats.length; i++) {
    const r = await synth(tts, s.beats[i].text);
    const file = `vo-${s.id}-${i + 1}.mp3`;
    fs.writeFileSync(path.join(out, file), r.buf);
    s.beats[i].file = file;
    s.beats[i].sec = r2(r.sec);
  }
}
tts.close();

// 2) Lay out: lines follow each other, scenes stretch, visuals anchor to the lines.
let t = 0;
const timeline = [];
for (const s of board.scenes) {
  let end = -GAP;
  for (const b of s.beats) {
    b.at = r2(Math.max(b.plan ?? b.at, end + GAP));
    end = b.at + b.sec;
    timeline.push({ scene: s.id, beat: timeline.filter((x) => x.scene === s.id).length + 1, file: b.file, text: b.text, at: b.at, sec: b.sec });
  }
  s.dur = Math.ceil(Math.max(s.planDur ?? s.dur, end + 0.45) * 2) / 2;
  s.start = t;
  t += s.dur;
  for (const x of timeline) if (x.scene === s.id) x.start = r2(s.start + x.at);

  if (CUTS[s.id]) {
    s.cuts = CUTS[s.id].map(([bi, kind, v]) => r2(Math.max(0, s.beats[bi].at + (kind === 'frac' ? v * s.beats[bi].sec : v))));
    s.cuts[0] = 0; // the first screenshot is on screen from the start of the scene
  }
  if (s.kind === 'prize') {
    const b = s.beats;
    s.prize = { riseAt: { 2: r2(b[1].at - 0.15), 3: r2(b[2].at - 0.15), 1: r2(b[3].at - 0.15) }, chipsAt: b[4].at };
  }
  if (s.kind === 'steps') s.stepAt = s.beats.map((b) => r2(b.at - 0.1));
  s.vo = s.beats.map((b) => b.text).join(' ');
  console.log(`scene ${String(s.id).padStart(2)} ${s.name.padEnd(34)} ${String(s.start).padStart(5)}s  ${s.dur}s  (planned ${s.planDur}s)`);
}
console.log(`\nTOTAL ${t}s   voice ${VOICE}  rate ${RATE}${t > 120 ? '   ⚠ over 2:00 — tighten some lines' : ''}`);

fs.writeFileSync(boardPath, JSON.stringify(board, null, 2) + '\n');
const data = { voice: VOICE, rate: RATE, total: t, beats: timeline };
fs.writeFileSync(path.join(out, 'voiceover.json'), JSON.stringify(data, null, 2));
fs.writeFileSync(path.resolve(root, '..', 'voiceover-timing.json'), JSON.stringify(data, null, 2));
