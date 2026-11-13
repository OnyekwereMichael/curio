// One-off: tightens a few narration lines after measuring the real voice. Run once.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const file = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../storyboard.json');
const j = JSON.parse(fs.readFileSync(file, 'utf8'));
const S = (id) => j.scenes.find((s) => s.id === id);
const set = (id, i, text) => (S(id).beats[i - 1].text = text);

set(3, 2, 'About five minutes. And that banner? Weekly prizes. More soon.');
set(4, 2, 'Save a word, and it returns right before you would forget it. So it sticks.');
set(5, 1, 'Then it is game time. A daily challenge, the same for everyone,');
set(6, 1, 'Everything earns XP. Keep your streak alive, with shields for busy days.');
set(9, 2, 'Second place: one thousand five hundred naira.');
set(9, 3, 'Third place: one thousand naira.');
set(9, 4, 'And first place wins two thousand five hundred naira!');
set(9, 5, 'It resets every Monday, starting the sixteenth of November. A fresh start for all.');

// How it works: four beats, one per step; merge "Simple as that" into the last one.
const steps = S(11);
steps.beats = [
  { at: 0.4, text: 'Sign up, it is free.' },
  { at: 2.6, text: 'Learn and earn XP.' },
  { at: 4.8, text: 'Play, and climb the ranks.' },
  { at: 7.0, text: 'Win weekly prizes. Simple as that.' },
];
delete steps.stepEvery;

for (const s of j.scenes) {
  s.planDur = s.dur;
  s.beats.forEach((b) => (b.plan = b.at));
  s.vo = s.beats.map((b) => b.text).join(' ');
}
fs.writeFileSync(file, JSON.stringify(j, null, 2) + '\n');
console.log('patched');
