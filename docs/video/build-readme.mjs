// Builds docs/video/README.md and docs/video/captions.srt from storyboard.json + README.template.md.
// Run: node docs/video/build-readme.mjs
// Prize amounts and dates are read from src/lib/leaderboardConfig.ts so the brief can never drift from the app.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { captionize, toSrt } from './lib/captions.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const { scenes } = JSON.parse(fs.readFileSync(path.join(here, 'storyboard.json'), 'utf8'));
const cfg = fs.readFileSync(path.resolve(here, '../../src/lib/leaderboardConfig.ts'), 'utf8');

// ── Pull the competition facts out of the app's own config ──
const amounts = [...cfg.matchAll(/place:\s*(\d),\s*amount:\s*([\d_]+)/g)].map((m) => [Number(m[1]), Number(m[2].replace(/_/g, ''))]);
const startsAt = cfg.match(/startsAt:\s*new Date\('([^']+)'\)/)?.[1];
const minXp = cfg.match(/minWeeklyXp:\s*(\d+)/)?.[1];
if (amounts.length !== 3 || !startsAt || !minXp) throw new Error('Could not read leaderboardConfig.ts — update the regexes in build-readme.mjs');
const naira = (n) => '₦' + n.toLocaleString('en-NG');
const [p1, p2, p3] = amounts.sort((a, b) => a[0] - b[0]).map((a) => naira(a[1]));
const startLabel = new Date(startsAt).toLocaleDateString('en-GB', { timeZone: 'Africa/Lagos', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

// Guard: every amount the storyboard quotes must match the config.
const all = JSON.stringify(scenes);
for (const v of [p1, p2, p3]) if (!all.includes(v)) console.warn('WARN: storyboard never mentions', v);
for (const m of all.match(/₦[\d,]+/g) ?? []) if (![p1, p2, p3].includes(m)) throw new Error('Storyboard quotes ' + m + ' which is not in leaderboardConfig.ts');

// ── Timecodes ──
const tc = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const srtTime = (s) => {
  const ms = Math.round(s * 1000);
  const f = (n, w) => String(n).padStart(w, '0');
  return `${f(Math.floor(ms / 3600000), 2)}:${f(Math.floor(ms / 60000) % 60, 2)}:${f(Math.floor(ms / 1000) % 60, 2)},${f(ms % 1000, 3)}`;
};
const wc = (t) => t.trim().split(/\s+/).length;

// ── Voiceover script ──
const voiceover = scenes
  .map((s) => {
    const lines = (s.beats ?? [{ at: 0, text: s.vo }]).map((b) => `> \`${tc(s.start + b.at)}\` ${b.text}`).join('\n>\n');
    return `**${tc(s.start)}–${tc(s.start + s.dur)} · ${s.name}** *(${wc(s.vo)} words · ${s.dur}s)*\n${lines}`;
  })
  .join('\n\n');
const totalWords = scenes.reduce((n, s) => n + wc(s.vo), 0);

// ── Pacing check table ──
const pacing = scenes
  .map((s) => {
    const need = s.beats ? s.beats.reduce((n, b) => n + (b.sec || 0), 0) : (wc(s.vo) / 140) * 60;
    return `| ${s.id} | ${tc(s.start)} | ${s.dur}s | ${wc(s.vo)} | ${need.toFixed(1)}s | ${(s.dur - need).toFixed(1)}s |`;
  })
  .join('\n');

// ── Storyboard (one table per scene) ──
const storyboard = scenes
  .map((s) => {
    const shots = s.screenshot.map((f) => `\`${f}\``).join(', ');
    return `### Scene ${s.id} — ${s.name}\n\n| Field | Detail |\n|---|---|\n| Timestamp | ${tc(s.start)} – ${tc(s.start + s.dur)} |\n| Duration | ${s.dur}s |\n| On-screen visual | ${s.visual} |\n| Screenshot(s) | ${shots} |\n| Animation & camera | ${s.motion} |\n| On-screen text / callouts | ${s.text.map((t) => `“${t}”`).join(' · ')} |\n| Voiceover | ${s.vo} |\n| Sound effect | ${s.sfx} |`;
  })
  .join('\n\n');

// ── Screenshot index ──
const shotMeta = {
  '01-landing-hero.png': 'Landing page hero (mobile, signed out)',
  '02-landing-features.png': 'Landing page: features section opening',
  '03-landing-how-it-works.png': 'Landing page: 4-step “How it works”',
  '04-landing-prizes.png': 'Landing page: weekly prizes podium (dark section)',
  '05-landing-hero-desktop.png': 'Landing page hero, desktop 1920×1080 (16:9)',
  '06-landing-video.png': 'Landing page: video player frame',
  '10-home-top.png': 'Home: greeting, streak/shield chips, daily checklist',
  '11-home-prize-banner.png': 'Home: weekly prize banner with the mascot',
  '12-play-hub.png': 'Play tab: daily challenge, Word Duel, coming-soon games',
  '13-daily-challenge.png': 'Daily challenge intro',
  '13b-daily-challenge-question.png': 'Daily challenge: a question',
  '14-learn-word.png': 'Word of the day card',
  '15-learn-fact.png': 'Fact of the day card',
  '16-collection-saved-words.png': 'Saved words with learning/mastered status (spaced review)',
  '17-progress-xp-streak.png': 'Progress: streak, shields, weekly ring, calendar',
  '18-progress-more.png': 'Progress: calendar and stats (lower half)',
  '19-profile-pebble-shelf.png': 'Profile: level, XP bar, pebble shelf (badges)',
  '20-friends-board.png': 'Friends: invite, streak buddy, weekly friends board',
  '21-leaderboard-weekly.png': 'Global leaderboard: weekly, podium, prizes, countdown, Your rank bar',
  '22-leaderboard-your-rank.png': 'Global leaderboard: ranked list, “You” row highlighted',
  '23-leaderboard-all-time.png': 'Global leaderboard: All-time tab',
  '31-mascot-moment-1.png': 'Mascot banner crop with speech bubble (1)',
  '32-mascot-moment-2.png': 'Mascot banner crop with speech bubble (2, mid-spin)',
  '33-mascot-moment-3.png': 'Mascot banner crop with speech bubble (3, cheer)',
  '34-mascot-moment-4.png': 'Mascot banner crop with speech bubble (4, wave)',
  '35-mascot-moment-5.png': 'Mascot banner crop with speech bubble (5, giggle)',
  '36-mascot-moment-6.png': 'Mascot banner crop with speech bubble (6, jump)',
};
const dir = path.join(here, 'screenshots');
const onDisk = new Set(fs.readdirSync(dir).filter((f) => f.endsWith('.png')));
const usedIn = (f) => scenes.filter((s) => s.screenshot.includes(f)).map((s) => s.id);
const screenshotTable = Object.keys(shotMeta)
  .map((f) => `| \`${f}\` | ${shotMeta[f]} | ${usedIn(f).length ? usedIn(f).join(', ') : '—'} | ${onDisk.has(f) ? '✅' : '❌ missing'} |`)
  .join('\n');
for (const s of scenes) for (const f of s.screenshot) if (!onDisk.has(f)) console.warn('WARN: scene', s.id, 'references missing file', f);
for (const f of onDisk) if (!shotMeta[f]) console.warn('NOTE: file on disk not in the index (stale?):', f);

// ── SRT: built from the measured narration timeline (run remotion/scripts/voiceover.mjs first) ──
const timingFile = path.join(here, 'voiceover-timing.json');
const timing = fs.existsSync(timingFile) ? JSON.parse(fs.readFileSync(timingFile, 'utf8')) : null;
if (!timing) console.warn('WARN: voiceover-timing.json missing — captions.srt not updated');
const chunks = timing ? captionize(timing.beats) : [];
const srt = timing ? toSrt(chunks) : fs.readFileSync(path.join(here, 'captions.srt'), 'utf8');
if (timing) fs.writeFileSync(path.join(here, 'captions.srt'), srt);

// ── Master prompts ──
const sceneLine = (s) => `${tc(s.start)} ${s.name}: ${s.visual} VO: “${s.vo}”`;
const masterPrompt = `Create a ${tc(scenes.at(-1).start + scenes.at(-1).dur)} (2:00) product walkthrough motion-graphic video for "Curi", a mobile app (PWA) that helps people learn one new word and one fact a day, earn XP, keep streaks, play, and compete on a leaderboard for weekly cash prizes in Nigerian Naira.

AUDIENCE & MESSAGE: Stakeholders and investors first, prospective users second. Single takeaway: learn, earn XP, compete, win real weekly prizes. Tone: simple, energetic, professional; the otter mascot sections are playful.

FORMAT: 16:9, 1920×1080, 30fps (also export 9:16, 1080×1920). Keep titles inside a 90% safe area; for 9:16 keep captions above the bottom 15%. Burned-in captions optional; supply the attached SRT.

LOOK: Clean, modern, fintech-grade. Floating phone mockup (390×844 screenshots, rounded 40px device frame, soft shadow, subtle 3-degree tilt). Warm paper background #F6F4EF, surface #FFFDF9, ink text #1C2B3A, primary ember #C73B20 (buttons/highlights), moss green #3E6259, gold #C7962E for prizes, dark night #12191F for the prize scene. Fonts: Fraunces (serif, headlines), Sora (UI/body), IBM Plex Mono (numbers/labels). Radius: cards 16px, controls 12px. Motion: smooth slides, zoom-ins on key UI, animated ring highlights and callouts, 0.3s overlaps, ease-out cubic. Mascot sections: bouncier springy easing, sticker-like outlines, small confetti.
AVOID: stock footage, clutter, more than one idea per scene, jarring cuts, glitch/shake effects, fake user counts, fake testimonials, anything implying prizes have already been paid.

USE ONLY THE PROVIDED SCREENSHOTS (docs/video/screenshots/*.png) as the product visuals. Do not invent UI.

PRIZE FACTS (exact): ${p1} for 1st, ${p2} for 2nd, ${p3} for 3rd, every week. The week resets every Monday at 00:00 West Africa Time (Lagos). Prizes start Monday ${startLabel.replace(/^Monday,? /, '')}. Weekly winners need at least ${minXp} XP. Say "starting Monday", never imply it has already started.

SCENES (time, name, visual, voiceover):
${scenes.map(sceneLine).join('\n')}

VOICE: warm, confident, friendly; about 140 words per minute; a natural Nigerian-English-leaning or neutral international English voice. Music: upbeat modern instrumental, ~100–110 BPM, light percussion and plucked/keys, not cheesy, ducks under voice, swells at the prize reveal. SFX: soft UI taps, whooshes on transitions, shimmer on prize amounts, celebratory hit and confetti on ${p1}, boing on mascot moments.
END CARD: Curi logo + "One word. One fact. Every day." + "Start free at trycuri.app".`;

const shortPrompt = `Make a 2-minute 16:9 (1080p, 30fps) fintech-style motion-graphic walkthrough for "Curi", a mobile app: learn one word + one fact a day, earn XP, keep streaks, play, climb a leaderboard, win weekly cash prizes (${p1} / ${p2} / ${p3} for the top 3, resets every Monday, starts Monday ${startLabel.replace(/^Monday,? /, '')} — never say it already started). Style: floating phone mockups with soft shadows on warm paper #F6F4EF; ink #1C2B3A, ember #C73B20, moss #3E6259, gold #C7962E, dark scene #12191F; Fraunces headlines, Sora body. Smooth slides, zoom-ins, ring callouts; playful otter mascot moments. Scenes: hook, meet Curi, Home, Learn & Play, XP & streaks, Friends, Global leaderboard, weekly prizes (high point), mascot, 4-step how-it-works, CTA "Start free at trycuri.app". Warm confident voiceover ~140 wpm, upbeat non-cheesy music, soft UI SFX, prize shimmer. Use only my supplied screenshots; no stock footage, no invented stats or testimonials.`;

// ── Assemble ──
const template = fs.readFileSync(path.join(here, 'README.template.md'), 'utf8');
const out = template
  .replaceAll('{{P1}}', p1).replaceAll('{{P2}}', p2).replaceAll('{{P3}}', p3)
  .replaceAll('{{MIN_XP}}', minXp)
  .replaceAll('{{START_LABEL}}', startLabel)
  .replaceAll('{{TOTAL_WORDS}}', String(totalWords))
  .replaceAll('{{PACING_TABLE}}', pacing)
  .replaceAll('{{VOICEOVER}}', voiceover)
  .replaceAll('{{STORYBOARD}}', storyboard)
  .replaceAll('{{SCREENSHOT_TABLE}}', screenshotTable)
  .replaceAll('{{SRT}}', srt.trim())
  .replaceAll('{{MASTER_PROMPT}}', masterPrompt)
  .replaceAll('{{SHORT_PROMPT}}', shortPrompt)
  .replaceAll('{{SHORT_PROMPT_LEN}}', String(shortPrompt.length));
fs.writeFileSync(path.join(here, 'README.md'), out);
console.log(`README.md written · ${totalWords} VO words · ${chunks.length} captions · short prompt ${shortPrompt.length} chars`);
