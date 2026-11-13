// One-off: rewrites storyboard.json with beat-by-beat narration that is timed to what is on screen.
// `at` = seconds from the start of the scene when that line should begin. `cuts` = when each screenshot appears.
// Run: node scripts/apply-narration.mjs   (then node scripts/voiceover.mjs)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const file = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../storyboard.json');
const j = JSON.parse(fs.readFileSync(file, 'utf8'));

const plan = {
  1: { dur: 9, beats: [[0.3, 'Hey! How often do you pick up your phone?'], [3.9, 'What if just two minutes of it made you sharper... and even paid you back?']] },
  2: { dur: 9, cuts: [0, 4.9], beats: [[0.3, 'Meet Curi. Every day, you get a fresh word and a fun fact.'], [5, 'Two minutes, no pressure, and an otter cheering you on.']] },
  3: { dur: 9, cuts: [0, 5], beats: [[0.3, 'Open the app, and your day is ready: words, a fact, and a quiz.'], [5.2, 'About five minutes. And that banner? Weekly prizes. More on that soon.']] },
  4: { dur: 11, cuts: [0, 3.4, 6.3], beats: [[0.1, 'Hear a new word, see it in a sentence, then pick up a fun fact.'], [6.5, 'Save a word, and it comes back right before you would forget it. So it really sticks.']] },
  5: { dur: 9, cuts: [0, 4.6], beats: [[0.2, 'Then it is game time. A daily challenge, with the same questions for everyone,'], [4.8, 'and Word Duel, a live one-on-one against a friend.']] },
  6: { dur: 9, cuts: [0, 5.6], beats: [[0.2, 'Everything you do earns XP. Keep your streak alive, and shields cover you on busy days.'], [5.9, 'Level up, and collect badges.']] },
  7: { dur: 7, beats: [[0.3, 'Add friends with a code, see who is winning this week, and even keep a streak together.']] },
  8: { dur: 10, cuts: [0, 5.6, 8.2], beats: [[0.3, 'Then take on everyone. The global leaderboard has a podium, and a live countdown.'], [5.9, 'Your rank stays in view, weekly or all time.']] },
  9: {
    dur: 22,
    prize: { riseAt: { 2: 5.0, 3: 8.8, 1: 11.9 }, chipsAt: 16.0 },
    beats: [
      [0.3, 'And here is the best part. Every week, the top three win real cash.'],
      [5.1, 'Second place takes home one thousand five hundred naira.'],
      [8.9, 'Third place, one thousand naira.'],
      [12.0, 'And first place wins two thousand five hundred naira!'],
      [16.1, 'It resets every Monday, starting the sixteenth of November. A fresh start for everyone.'],
    ],
  },
  10: { dur: 6, beats: [[0.3, 'And Curi is always there, cheering you on,'], [3.2, 'celebrating your wins, and keeping it fun.']] },
  11: {
    dur: 9,
    stepEvery: 1.7,
    beats: [[0.4, 'Sign up, it is free.'], [2.1, 'Learn and earn XP.'], [3.8, 'Play, and climb the ranks.'], [5.5, 'Win weekly prizes.'], [7.2, 'Simple as that.']],
  },
  12: { dur: 7, beats: [[0.4, 'That is Curi. One word, one fact, every day.'], [3.6, 'Start free today at try Curi dot app.']] },
};

// Rebuild the scene list: Learn and Play become two scenes (12 in total); every scene gets a `kind`.
const old = Object.fromEntries(j.scenes.filter((s) => !s._src).map((s) => [s.id, s]));
const clone = (o) => JSON.parse(JSON.stringify(o));
const learn = clone(old[4]);
learn.name = 'Learn';
learn.screenshot = ['14-learn-word.png', '15-learn-fact.png', '16-collection-saved-words.png'];
learn.visual = 'Word card, fact card, then saved words with learning / mastered tags (spaced review).';
learn.text = ['Words & facts that stick', 'Spaced review: old words return'];
const play = clone(old[4]);
play.name = 'Play';
play.screenshot = ['12-play-hub.png', '13b-daily-challenge-question.png'];
play.visual = 'Play tab with the daily challenge and Word Duel, then a daily-challenge question.';
play.text = ['Time to play', 'Daily challenge · Word Duel'];
const order = [
  [old[1], 'generic'], [old[2], 'generic'], [old[3], 'generic'], [learn, 'generic'], [play, 'generic'],
  [old[5], 'generic'], [old[6], 'generic'], [old[7], 'generic'], [old[8], 'prize'], [old[9], 'mascot'], [old[10], 'steps'], [old[11], 'cta'],
];
j.scenes = order.map(([s, kind], i) => ({ ...s, id: i + 1, kind }));

let t = 0;
for (const s of j.scenes) {
  const p = plan[s.id];
  s.dur = p.dur;
  s.start = t;
  t += p.dur;
  s.beats = p.beats.map(([at, text]) => ({ at, text }));
  s.vo = p.beats.map((b) => b[1]).join(' ');
  if (p.cuts) s.cuts = p.cuts;
  else delete s.cuts;
  if (p.prize) s.prize = p.prize;
  if (p.stepEvery) s.stepEvery = p.stepEvery;
}
fs.writeFileSync(file, JSON.stringify(j, null, 2) + '\n');
console.log('scenes', j.scenes.length, 'total', t, 's');
