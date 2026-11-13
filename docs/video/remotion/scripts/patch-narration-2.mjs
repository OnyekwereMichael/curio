// One-off: second tightening pass after hearing real timings. Run once, then node scripts/voiceover.mjs.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const file = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../storyboard.json');
const j = JSON.parse(fs.readFileSync(file, 'utf8'));
const S = (id) => j.scenes.find((s) => s.id === id);

// Mascot: one flowing line.
const m = S(10);
m.beats = [{ plan: 0.3, at: 0.3, text: 'And Curi is always there, cheering you on, celebrating your wins, and keeping it fun.' }];
m.planDur = 6;

// How it works: one step every 1.6s.
const h = S(11);
[0.4, 2.0, 3.6, 5.2].forEach((p, i) => (h.beats[i].plan = h.beats[i].at = p));
h.planDur = 8;

// Closing: tighter.
const c = S(12);
c.beats[1].plan = c.beats[1].at = 3.3;
c.planDur = 7;

S(9).beats[4].text = 'It resets every Monday, starting the sixteenth of November.';
S(9).planDur = 20;

for (const s of j.scenes) s.vo = s.beats.map((b) => b.text).join(' ');
fs.writeFileSync(file, JSON.stringify(j, null, 2) + '\n');
console.log('patched');
