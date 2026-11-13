# Curi — Platform Walkthrough Video Brief

> **Generated file.** Edit `README.template.md` / `storyboard.json`, then run `node docs/video/build-readme.mjs`. Prize amounts, minimum XP and the start date are read from `src/lib/leaderboardConfig.ts` on every build.

**Status:** ready to hand to a motion designer or paste into an AI video tool.
**Companion files:** `screenshots/` (27 PNGs) · `captions.srt` · `storyboard.json` · `remotion/` (optional render project).

---

## 1. Video overview

| | |
|---|---|
| **Purpose** | Show stakeholders, in two minutes, what Curi is, how it works, and why it can grow: a daily learning habit plus a weekly cash-prize competition. |
| **Primary audience** | Stakeholders and investors. |
| **Secondary audience** | New users (re-cut the 60s and 15s versions for social). |
| **Main message** | Curi turns two minutes a day into progress you can see, friends to beat, and real prizes. |
| **Single takeaway** | **Learn → earn XP → compete → win real weekly prizes.** |
| **Tone** | Simple, energetic, professional. The otter-mascot scene is playful. |
| **Call to action** | Start free at **trycuri.app** |

**The prize line, exactly as the app has it:** {{P1}} for 1st, {{P2}} for 2nd, {{P3}} for 3rd, every week. The week resets every **Monday at 00:00 Lagos time (WAT)**. Winners need at least {{MIN_XP}} XP that week. **The competition starts {{START_LABEL}}.** Until then the leaderboard shows a "preview" of the current week.

---

## 2. What's real, and what's partial (audited from the code)

Only the "Built" rows may be shown as working. Everything under "Partial" must not be presented as finished.

### Built

| Area | Feature |
|---|---|
| **Learn** | Word of the day (pronunciation, example sentence) · Fact of the day (hook + 4 takeaways) · Daily quiz · Spaced review ("Old but Gold", mastery: new / learning / mastered) · Instant dictionary (search, Ctrl/Cmd + K) · Saved words and word lists · Onboarding and a personal learning plan (word style, level, words per day, topics, weekly goal, reminder time) |
| **Grow** | Streaks and streak shields · XP, levels and daily quests · Badges on the "pebble shelf" · Weekly goal ring, streak calendar and progress stats |
| **Play** | Word Duel (live 1v1: pick the word for the definition) · Daily challenge (5 questions, same for everyone, shareable score) |
| **Social** | Friends via invite codes (no public search) · Friends weekly board · Streak buddies · Hide-from-leaderboard setting |
| **Compete** | Global leaderboard: weekly and all-time, podium, countdown, ranked list, sticky "Your rank" bar, rank-gap messages · Weekly prize banner on Home and the leaderboard · Prize amounts and dates driven by one config file |
| **Mascot** | Curi the otter: moods (happy, excited, waving, curious, sleepy, grumpy…), speech bubbles, tap reactions, automatic reactions every ~8–12s, optional spoken lines (follows Settings → Sounds & haptics) |
| **Reach** | Installable PWA · Daily word and fact push notifications · Evening nudge · Weekly recap email · Streak and milestone share cards · Light and dark themes · Reduce-motion setting |
| **Marketing site** | Landing page (hero, video, features, how it works, prizes, CTA) · Privacy Policy and Terms of Service pages |

### Partial, planned, or not built (do not present as finished)

| Item | State |
|---|---|
| **Fact or Fiction** and **Bluff the Definition** | Listed on the Play tab as "Soon". Not playable. |
| **Prize payouts** | Winners are recorded by a server function that must be run manually (not scheduled). Payment itself happens outside the app. Say "win prizes", never "instantly paid". |
| **Competition start** | Not started yet. Begins {{START_LABEL}}. |
| **Monday push notification** | Not built. |
| **Forgot password** | Not wired up. |
| **"When" plan screen** | Preview/mock data. |
| **User numbers, ratings, testimonials** | None exist in the code. None are used. See "Placeholders". |

---

## 3. Specs

| Cut | Length | Aspect | Use |
|---|---|---|---|
| **Primary** | **2:00** (target 90–120s) | 16:9, 1920×1080 (4K optional: 3840×2160) | Stakeholder meeting, website, YouTube |
| **Social** | **0:60** | 16:9 and 9:16 | LinkedIn, X, Instagram, TikTok |
| **Teaser** | **0:15** | 9:16 (also 1:1) | Stories, Reels, paid social |

- **Frame rate:** 30 fps (60 fps optional for smoother UI zooms; same project).
- **9:16 variant:** 1080×1920. Re-layout, don't crop: one phone, centred, larger callouts.
- **Safe areas:** keep all titles and captions inside the central 90% of the frame (5% margin each side). For 9:16 also keep captions out of the bottom 15% and top 10% (platform UI).
- **Captions:** burned-in version for muted viewing; also deliver `captions.srt`.
- **Audio:** −14 LUFS for web delivery, voice always clearly above music.
- **Delivery:** H.264 MP4, 12–16 Mbps for 1080p. Keep the project file and an alpha-free master.

### 60-second cut (script)

| Time | Beat | Screenshot | Voiceover |
|---|---|---|---|
| 0:00–0:10 | Hook | `10-home-top.png` | "You pick up your phone a hundred times a day. What if just two of those minutes made you sharper — and even paid you back?" |
| 0:10–0:17 | Meet Curi | `01-landing-hero.png`, `31-mascot-moment-1.png` | "Meet Curi. One new word and one fact, every day." |
| 0:17–0:28 | Learn · Play · XP | `14-learn-word.png`, `12-play-hub.png`, `17-progress-xp-streak.png` | "Learn, play, and earn XP. Keep your streak alive, and take on your friends." |
| 0:28–0:34 | Leaderboard | `21-leaderboard-weekly.png` | "Then climb the global leaderboard." |
| 0:34–0:50 | Prizes | `04-landing-prizes.png` | "Every week, the top three win real cash: {{P1}}, {{P2}} and {{P3}}. The board resets every Monday, starting Monday the sixteenth of November." |
| 0:50–0:55 | How it works | `03-landing-how-it-works.png` | "Sign up. Learn. Play. Win." |
| 0:55–1:00 | CTA | `05-landing-hero-desktop.png` | "Curi. One word. One fact. Every day. Start free at trycuri dot app." |

### 15-second teaser (script)

| Time | Visual | Voiceover |
|---|---|---|
| 0:00–0:04 | `10-home-top.png` rises, mascot waves | "Learn a word. Earn XP." |
| 0:04–0:08 | `21-leaderboard-weekly.png` podium zoom | "Climb the leaderboard." |
| 0:08–0:12 | Prize amounts light up (night scene) | "Win up to {{P1}} every week, starting Monday the sixteenth of November." |
| 0:12–0:15 | Logo and URL | "Curi. Start free at trycuri dot app." |

---

## 4. Visual direction

### Brand (read from `src/index.css`, `index.html`, `public/`)

| Token | Light | Dark |
|---|---|---|
| **Paper (background)** | `#F6F4EF` | `#12191F` |
| **Surface (cards)** | `#FFFDF9` | `#1A232B` |
| **Ink (text)** | `#1C2B3A` | `#E9E6DD` |
| **Ember (primary, buttons)** | `#C73B20` (hover/bright `#E8472A`) | `#F2694D` |
| **Moss (secondary, success)** | `#3E6259` | `#8DB5A6` |
| **Gold (prizes, streaks)** | `#C7962E` | `#E3B95A` |
| **Night (prize scene)** | `#12191F` | — |
| **Lines** | `#E6E1D6` | `#2A353F` |

- **Fonts:** **Fraunces** (serif) for headlines, numbers of emphasis · **Sora** for UI and body · **IBM Plex Mono** for small labels and figures. All from Google Fonts.
- **Shape:** cards 16px radius, controls 12px, sheets 24px. Soft layered shadows. Primary buttons have a 2px bottom "press" edge in dark ember.
- **Logo:** the Curi wordmark in Fraunces beside the ember app icon (`public/icon.png`, 1024×1024, a magnifier-"q" mark). **No separate vector logo exists in the repo** — if you have one, supply it (see section 13).
- **Mascot:** Curi the otter, an inline vector in the app with distinct moods and a speech bubble.
- **Voice of the product:** friendly, short, benefit-led ("Your day, ready to go", "No pressure", "Look at you go!").

### Device mockup style

Floating phone, **390×844 screenshots at 3x**, rounded device frame (~40px radius, thin dark bezel, no brand logos), a **soft, long, low-opacity shadow**, and a slight 3° tilt that settles flat. Background is the warm paper colour with a very subtle radial moss/ember glow. Two phones side by side only where comparing (e.g. weekly vs all-time).

### Motion

- **Transitions:** smooth slides and cross-pushes (0.4–0.6s, ease-out cubic), 0.3s overlaps between scenes. No hard cuts except on beat.
- **Zoom-ins:** 110–140% on the exact UI element being narrated, with a rounded highlight ring.
- **Callouts:** thin ink line + small label chip (Sora 600), drawn in over 0.3s.
- **Counters:** XP and prize amounts count up with an ease-out.
- **Pacing:** one idea per scene, a visual change every 2–3 seconds, a calm hold in the last second of every scene.
- **Style:** clean, modern, fintech-grade. The mascot scene gets a **fun layer**: springy bounces, sticker outlines, small confetti.
- **Prize scene:** switch to **Night** background, gold glow, podium rising 2nd → 3rd → 1st.

### Avoid

- ❌ Stock footage, stock people, generic phone-in-hand clips.
- ❌ Clutter: more than one message, more than ~8 words of on-screen text at once.
- ❌ Jarring effects: shake, glitch, strobe, spin-wipes, lens flares.
- ❌ Inventing UI. Use only the screenshots in `screenshots/`.
- ❌ Fake numbers, user counts, testimonials, or "winners" as if payouts already happened.
- ❌ Saying the competition "is live". It starts {{START_LABEL}}.

---

## 5. Full voiceover script

Written for natural speech at **~140 words per minute**. Total **{{TOTAL_WORDS}} words** over **2:00**, with about one second of breathing room per scene. Benefit-led, warm, confident. Covers every feature group: learning, spaced review, Play, XP, levels, badges, streaks and shields, friends and streak buddies, the global leaderboard (weekly and all-time, countdown, your rank), weekly prizes and the Monday reset, and the mascot.

{{VOICEOVER}}

### Pacing check (140 wpm)

| Scene | Starts | Window | Words | Speech time | Breathing room |
|---|---|---|---|---|---|
{{PACING_TABLE}}

### ⚠️ Lines that go out of date

| Line | Scene | Problem | Replace with |
|---|---|---|---|
| "…starting Monday the sixteenth of November…" | 8, 60s and 15s cuts | Wrong after {{START_LABEL}}. | "…and the board resets every Monday." |
| On-screen "Starts Monday, Nov 16" | 8, and the Home banner / leaderboard screenshots | The app switches to a live state after the start. | Recapture screenshots `04`, `11`, `21`, `22`, `23`, `31`–`36` after the start date, and drop the line. |
| Leaderboard screenshots show a "preview of this week's ranking" notice and "Prizes start in …" countdown | 7, 8 | Pre-launch UI. | Recapture after launch (run `capture.mjs`). |

---

## 6. Scene-by-scene storyboard

{{STORYBOARD}}

---

## 7. Screenshot pack (`docs/video/screenshots/`)

All screenshots are **390×844 CSS pixels at 3x (1170×2532 PNG)**, light theme, except `05` (desktop 1920×1080) and the element crops (`03`, `04`, `06`, `31`–`36`). They show a **fictional demo account** ("Dami K.", rank 12, 12-day streak) and **fictional Nigerian demo users**; avatars are generated letter tiles. **Nothing is read from or written to production**: the capture script answers every Supabase request from `capture/demo-data.mjs` and blocks all other network traffic. No emails, phone numbers or private data appear.

| File | Screen | Used in scene(s) | On disk |
|---|---|---|---|
{{SCREENSHOT_TABLE}}

### Re-creating the screenshots

```bash
npm run dev -- --port 5199          # in the app folder
cd docs/video/capture && npm i      # installs puppeteer-core here only (not in the app)
node capture.mjs                    # all shots; or: node capture.mjs leaderboard
```

Needs Google Chrome installed (set `CHROME=…` if it is elsewhere). Edit `demo-data.mjs` to change names or XP, `shots.mjs` to change the shot list.

### Could not be captured automatically — you need to capture these

| What | Why | How |
|---|---|---|
| **Mascot animating (best moment of the video)** | Static PNGs can't show moods or motion. | On your phone, open Home, scroll to the prize banner, screen-record 10–15s while tapping Curi 6–8 times. Send the clip. It replaces/overlays scene 9. |
| **Live Word Duel match** | Needs two signed-in players and a live room. | Two phones, same room code, record the question screen and the result. |
| **Quiz result / XP gain / level-up / streak-milestone celebrations** | Triggered by real server events. | Complete a quiz on a test account, record the result sheet; reach a milestone (7-day streak) for the share card. |
| **Onboarding flow** | Needs a brand-new account. | Sign up with a fresh test email; record the 6 steps. |
| **Push notification and install prompt** | Device-only OS UI. | Phone screen-record the notification arriving and the "Add to Home Screen" prompt. |
| **Dark mode set** | Light only was captured. | `localStorage.theme='dark'` then re-run `capture.mjs` (pass `dark: true` to `newPage` in `shots.mjs`). |
| **Real leaderboard with real winners** | The competition hasn't started; no real winners exist. | After the first week, capture the real board (with permission). |

> Capture any real-account recordings with a **test account only** and blur or avoid real users' names, photos and emails.

---

## 8. Audio direction

- **Voiceover style:** warm, confident, friendly; smiling but professional. Natural pace ~140 wpm with short pauses at scene ends. Slightly lift energy on the prize scene, then land the last line calmly.
- **Accent:** a **Nigerian English voice is a strong fit** for an audience in Nigeria (prizes are in ₦, the week is in Lagos time) and reads as authentic to local stakeholders. If the investor audience is international, a clear **neutral international English** voice is the safe choice. Recommend: record the primary cut in a **Nigerian-English-leaning, standard-clear voice**; keep a neutral version for international sends. Pronounce **₦** as "naira": "two thousand five hundred naira" (not "N2,500").
- **Pronunciations:** "Curi" = *KYOOR-ee* (confirm, then keep it consistent). "WAT" is not spoken.
- **Music mood:** upbeat, modern, optimistic. **100–110 BPM**, light percussion, plucked guitar/keys, soft bass, warm pads. Not cheesy, no corporate stock sound, no EDM drops. Duck 8–10 dB under the voice. Swell and add a lift at the prize reveal (scene 8), then settle for the CTA.
- **Sound effects (keep subtle, under the voice):** soft UI taps/ticks on callouts · light whoosh on slides · rising tick on XP counters · small ding per badge · **shimmer/coin on each prize amount**, a **celebratory hit with confetti on {{P1}}** · calendar flip on "Monday" · springy boing/giggle pops on mascot moments · a single warm chime on the final logo.
- **Rank-up cue:** a short ascending 3-note whoosh when the "You" row moves up.

---

## 9. Captions (`captions.srt`)

SRT-ready, timed to the 2:00 primary cut (each scene's window ends 0.5s early). Re-time if you change the voiceover pace. Keep two lines max, ~34 characters per line.

```srt
{{SRT}}
```

---

## 10. Ready-to-paste master prompt

For an AI video/motion tool or a freelancer. Self-contained. Attach `screenshots/` and `captions.srt`.

````text
{{MASTER_PROMPT}}
````

### Short version ({{SHORT_PROMPT_LEN}} characters, for tools with limits)

````text
{{SHORT_PROMPT}}
````

---

## 11. Production checklist

### Asset list

- [ ] `screenshots/*.png` (27 files, in this repo)
- [ ] App icon: `public/icon.png` (1024×1024) · favicon `public/favicon.svg`
- [ ] **Vector logo / wordmark** — *not in the repo; supply if you have one*
- [ ] Otter mascot: use the banner crops (`31`–`36`) or the **phone screen-recording** of it animating
- [ ] Fonts: Fraunces, Sora, IBM Plex Mono (Google Fonts; free for commercial use)
- [ ] Voiceover audio (recorded or generated from the script in section 5)
- [ ] Music track with a licence you can show stakeholders
- [ ] SFX pack (UI ticks, whooshes, shimmer, confetti hit, boing)
- [ ] `captions.srt`
- [ ] Optional: the existing landing-page demo video, `public/WhatsApp Video 2026-09-14 at 00.28.52.mp4`, as b-roll

### Suggested tools

| Tool | When to use it |
|---|---|
| **Remotion** (scaffold in `docs/video/remotion/`, **not yet installed or test-rendered**) | Fastest, exact brand match. React/TypeScript; uses the real screenshots, fonts and colours. Best if you want pixel-perfect, re-renderable cuts. |
| **CapCut** | Fastest manual assembly on desktop/phone: drop screenshots, add keyframe zooms, auto-captions from the SRT. |
| **After Effects** | Highest polish (podium rise, counters, confetti). Use the storyboard tables as the shot list. |
| **Canva** | Quickest for the 15s and 9:16 social cuts using templates. |
| **Voice** | A recorded human voice is best. If using text-to-speech, choose a Nigerian-English or neutral voice and review every ₦ pronunciation. |

### Workflow (about 3–4 hours with Remotion or CapCut)

1. **Lock the script.** Read section 5 aloud once with a stopwatch; adjust any line that overruns its window.
2. **Record or generate the voiceover** for each scene, then export one WAV per scene (easier to retime).
3. **Pick music** (100–110 BPM) and sketch the beat of the prize scene to land the swell on {{P1}}.
4. **Assemble scene by scene** from the storyboard tables (section 6): place the phone, add the zoom, ring and text callouts from the table.
5. **Add SFX** after the voice is final; keep them 10–12 dB under the voice.
6. **Add captions** (burn in, or import `captions.srt`).
7. **Mascot scene:** drop in the phone screen-recording if you have it; otherwise use the six crops.
8. **Review pass:** every prize amount, the Monday reset and the start date against `src/lib/leaderboardConfig.ts`; no claim beyond section 2; no private data on screen.
9. **Export** the 16:9 master, then the 60s and 9:16/15s cuts.
10. **Before it leaves the building:** run section 12.

**Using Remotion:** `cd docs/video/remotion && npm i && npm run dev` to preview, `npm run render` to export `out/curi-walkthrough.mp4`. See `remotion/README.md`.

---

## 12. Accuracy & tone checklist (final review)

- [ ] Prize amounts read {{P1}} / {{P2}} / {{P3}} (matches `leaderboardConfig.ts`; the build script fails if the storyboard quotes any other ₦ figure).
- [ ] Says "resets every Monday" (00:00 Lagos time), never "weekly on Sundays" or similar.
- [ ] Start date is {{START_LABEL}}; wording is "starting Monday" / "resets every Monday", **never** implies it has begun. Remove the date after launch.
- [ ] Only features marked **Built** in section 2 are shown working. Fact or Fiction / Bluff only as "Soon".
- [ ] No user counts, ratings, testimonials or "winners". (Placeholder if wanted: `[ADD USER COUNT]`.)
- [ ] Nothing says prizes are "instant" or already paid out.
- [ ] No real emails, phone numbers or real users' names/photos on screen.
- [ ] The VO and captions match.

---

## 13. Placeholders & what we still need from you

| Item | Where it goes | Status |
|---|---|---|
| **`[ADD USER COUNT]`** | Optional social-proof line (e.g. in the hook or CTA). | Not in the script. Add only with a real number. |
| **Vector logo / brand file** | Scene 2 and 11 logo lock-up. | Not in the repo. The app icon PNG is used otherwise. |
| **Phone screen-recording of the mascot** | Scene 9. | Needed from you (section 7). |
| **Chosen voice / voiceover recording** | Whole video. | Needed. |
| **Licensed music** | Whole video. | Needed. |
| **Pronunciation of "Curi"** | VO. | Confirm. |
| **Confirm URL `trycuri.app`** | CTA. | Found in the code (share cards); confirm it is the public domain. |
| **Social handles** | End card (optional). | None in the codebase. |

---

## 14. Assumptions

1. The primary cut is exactly 2:00 (upper end of 90–120s) at 140 wpm; trim scene 7 or 9 for ~1:50.
2. The public URL is `trycuri.app` (taken from the app's share cards).
3. Prizes, Monday 00:00 WAT reset, {{MIN_XP}} XP minimum and the start date come from `src/lib/leaderboardConfig.ts`.
4. Screenshots use a fictional account and are captured pre-launch, so they show "Starts Monday, Nov 16" and the leaderboard preview notice.
5. "Mascot moods" are represented by six tap/auto reactions with speech bubbles; true motion needs your phone recording.
6. The weekly recap, push and install features are described briefly in the VO; no on-screen proof exists in the pack (see manual captures).
7. Prize payouts are described as "win real cash"; the payout method is not shown (it is a legal placeholder in the Terms).
8. The legal pages are drafts and should be reviewed by a qualified Nigerian lawyer before launch; the video does not mention legal terms.
