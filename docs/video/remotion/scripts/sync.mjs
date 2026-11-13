// Copies the screenshots into ./public and turns ../storyboard.json + ../captions.srt into typed data.
// Run automatically before dev/render. The single source of truth stays in docs/video.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const video = path.resolve(root, '..');

const shotsOut = path.join(root, 'public', 'screenshots');
fs.mkdirSync(shotsOut, { recursive: true });
for (const f of fs.readdirSync(path.join(video, 'screenshots'))) {
  if (f.endsWith('.png')) fs.copyFileSync(path.join(video, 'screenshots', f), path.join(shotsOut, f));
}

const gen = path.join(root, 'src', 'generated');
fs.mkdirSync(gen, { recursive: true });
fs.copyFileSync(path.join(video, 'storyboard.json'), path.join(gen, 'storyboard.json'));

const toSec = (t) => {
  const [h, m, s] = t.split(':');
  return Number(h) * 3600 + Number(m) * 60 + Number(s.replace(',', '.'));
};
const captions = fs
  .readFileSync(path.join(video, 'captions.srt'), 'utf8')
  .trim()
  .split(/\n\n/)
  .map((block) => {
    const [, time, ...text] = block.split('\n');
    const [from, to] = time.split(' --> ');
    return { from: toSec(from), to: toSec(to), text: text.join('\n') };
  });
fs.writeFileSync(path.join(gen, 'captions.json'), JSON.stringify(captions, null, 2));
console.log(`synced screenshots, storyboard and ${captions.length} captions`);

// Narration timeline (written by scripts/voiceover.mjs) and optional music bed.
const timingFile = path.join(video, 'voiceover-timing.json');
const timing = fs.existsSync(timingFile) ? JSON.parse(fs.readFileSync(timingFile, 'utf8')) : { beats: [] };
fs.writeFileSync(path.join(gen, 'timeline.json'), JSON.stringify({ beats: timing.beats }, null, 2));
const has = (f) => fs.existsSync(path.join(root, 'public', 'audio', f));
fs.writeFileSync(path.join(gen, 'audio.json'), JSON.stringify({ voiceover: timing.beats.length > 0, music: has('music.mp3') }));
