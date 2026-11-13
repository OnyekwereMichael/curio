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

**The prize line, exactly as the app has it:** ₦2,500 for 1st, ₦1,500 for 2nd, ₦1,000 for 3rd, every week. The week resets every **Monday at 00:00 Lagos time (WAT)**. Winners need at least 50 XP that week. **The competition starts Monday, 16 November 2026.** Until then the leaderboard shows a "preview" of the current week.

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
| **Competition start** | Not started yet. Begins Monday, 16 November 2026. |
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
| 0:34–0:50 | Prizes | `04-landing-prizes.png` | "Every week, the top three win real cash: ₦2,500, ₦1,500 and ₦1,000. The board resets every Monday, starting Monday the sixteenth of November." |
| 0:50–0:55 | How it works | `03-landing-how-it-works.png` | "Sign up. Learn. Play. Win." |
| 0:55–1:00 | CTA | `05-landing-hero-desktop.png` | "Curi. One word. One fact. Every day. Start free at trycuri dot app." |

### 15-second teaser (script)

| Time | Visual | Voiceover |
|---|---|---|
| 0:00–0:04 | `10-home-top.png` rises, mascot waves | "Learn a word. Earn XP." |
| 0:04–0:08 | `21-leaderboard-weekly.png` podium zoom | "Climb the leaderboard." |
| 0:08–0:12 | Prize amounts light up (night scene) | "Win up to ₦2,500 every week, starting Monday the sixteenth of November." |
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
- ❌ Saying the competition "is live". It starts Monday, 16 November 2026.

---

## 5. Full voiceover script

Written for natural speech at **~140 words per minute**. Total **275 words** over **2:00**, with about one second of breathing room per scene. Benefit-led, warm, confident. Covers every feature group: learning, spaced review, Play, XP, levels, badges, streaks and shields, friends and streak buddies, the global leaderboard (weekly and all-time, countdown, your rank), weekly prizes and the Monday reset, and the mascot.

**00:00–00:09 · Hook** *(24 words · 9s)*
> `00:00` Hey! How often do you pick up your phone?
>
> `00:03` What if just two minutes of it made you sharper... and even paid you back?

**00:09–00:18 · Meet Curi** *(23 words · 9.5s)*
> `00:09` Meet Curi. Every day, you get a fresh word and a fun fact.
>
> `00:14` Two minutes, no pressure, and an otter cheering you on.

**00:18–00:30 · Home & daily habit** *(24 words · 11.5s)*
> `00:18` Open the app, and your day is ready: words, a fact, and a quiz.
>
> `00:23` About five minutes. And that banner? Weekly prizes. More soon.

**00:30–00:42 · Learn** *(30 words · 12s)*
> `00:30` Hear a new word, see it in a sentence, then pick up a fun fact.
>
> `00:36` Save a word, and it returns right before you would forget it. So it sticks.

**00:42–00:51 · Play** *(21 words · 9.5s)*
> `00:42` Then it is game time. A daily challenge, the same for everyone,
>
> `00:47` and Word Duel, a live one-on-one against a friend.

**00:51–01:00 · XP, levels & streaks** *(17 words · 9s)*
> `00:51` Everything earns XP. Keep your streak alive, with shields for busy days.
>
> `00:57` Level up, and collect badges.

**01:00–01:07 · Friends** *(17 words · 7s)*
> `01:00` Add friends with a code, see who is winning this week, and even keep a streak together.

**01:07–01:17 · Global leaderboard** *(23 words · 10s)*
> `01:07` Then take on everyone. The global leaderboard has a podium, and a live countdown.
>
> `01:13` Your rank stays in view, weekly or all time.

**01:17–01:38 · Weekly prizes (emotional high point)** *(44 words · 21s)*
> `01:17` And here is the best part. Every week, the top three win real cash.
>
> `01:22` Second place: one thousand five hundred naira.
>
> `01:26` Third place: one thousand naira.
>
> `01:29` And first place wins two thousand five hundred naira!
>
> `01:33` It resets every Monday, starting the sixteenth of November.

**01:38–01:45 · Mascot moments** *(15 words · 6.5s)*
> `01:38` And Curi is always there, cheering you on, celebrating your wins, and keeping it fun.

**01:45–01:55 · How it works** *(20 words · 10.5s)*
> `01:45` Sign up, it is free.
>
> `01:47` Learn and earn XP.
>
> `01:49` Play, and climb the ranks.
>
> `01:51` Win weekly prizes. Simple as that.

**01:55–02:04 · Closing CTA** *(17 words · 8.5s)*
> `01:55` That is Curi. One word, one fact, every day.
>
> `02:00` Start free today at try Curi dot app.

### Pacing check (140 wpm)

| Scene | Starts | Window | Words | Speech time | Breathing room |
|---|---|---|---|---|---|
| 1 | 00:00 | 9s | 24 | 6.5s | 2.5s |
| 2 | 00:09 | 9.5s | 23 | 8.4s | 1.1s |
| 3 | 00:18 | 11.5s | 24 | 10.1s | 1.4s |
| 4 | 00:30 | 12s | 30 | 9.1s | 2.9s |
| 5 | 00:42 | 9.5s | 21 | 8.3s | 1.2s |
| 6 | 00:51 | 9s | 17 | 7.4s | 1.6s |
| 7 | 01:00 | 7s | 17 | 5.1s | 1.9s |
| 8 | 01:07 | 10s | 23 | 9.0s | 1.0s |
| 9 | 01:17 | 21s | 44 | 18.7s | 2.3s |
| 10 | 01:38 | 6.5s | 15 | 5.5s | 1.0s |
| 11 | 01:45 | 10.5s | 20 | 8.8s | 1.7s |
| 12 | 01:55 | 8.5s | 17 | 7.0s | 1.5s |

### ⚠️ Lines that go out of date

| Line | Scene | Problem | Replace with |
|---|---|---|---|
| "…starting Monday the sixteenth of November…" | 8, 60s and 15s cuts | Wrong after Monday, 16 November 2026. | "…and the board resets every Monday." |
| On-screen "Starts Monday, Nov 16" | 8, and the Home banner / leaderboard screenshots | The app switches to a live state after the start. | Recapture screenshots `04`, `11`, `21`, `22`, `23`, `31`–`36` after the start date, and drop the line. |
| Leaderboard screenshots show a "preview of this week's ranking" notice and "Prizes start in …" countdown | 7, 8 | Pre-launch UI. | Recapture after launch (run `capture.mjs`). |

---

## 6. Scene-by-scene storyboard

### Scene 1 — Hook

| Field | Detail |
|---|---|
| Timestamp | 00:00 – 00:09 |
| Duration | 9s |
| On-screen visual | Warm paper background. Big serif headline types on. A phone floats up from below with the Home screen. |
| Screenshot(s) | `10-home-top.png` |
| Animation & camera | Headline word-by-word reveal (0-3s). Phone rises with a soft shadow and a 3-degree tilt that settles flat (3-6s). Slow push-in on the greeting. |
| On-screen text / callouts | “Two minutes. That's all it takes.” · “Learn. Earn. Win.” |
| Voiceover | Hey! How often do you pick up your phone? What if just two minutes of it made you sharper... and even paid you back? |
| Sound effect | Soft whoosh on phone rise; a single warm chime on 'paid you back'. |

### Scene 2 — Meet Curi

| Field | Detail |
|---|---|
| Timestamp | 00:09 – 00:18 |
| Duration | 9.5s |
| On-screen visual | Curi wordmark and app icon centre-stage, then the otter pops in beside the phone with a speech bubble. |
| Screenshot(s) | `01-landing-hero.png`, `31-mascot-moment-1.png` |
| Animation & camera | Logo scales in with a gentle overshoot. Landing hero slides in from the right; zoom to the headline. Otter bounce-in with a wave. |
| On-screen text / callouts | “Meet Curi” · “One word. One fact. Every day.” |
| Voiceover | Meet Curi. Every day, you get a fresh word and a fun fact. Two minutes, no pressure, and an otter cheering you on. |
| Sound effect | Pop on the logo; a friendly 'boing' when the otter lands. |

### Scene 3 — Home & daily habit

| Field | Detail |
|---|---|
| Timestamp | 00:18 – 00:30 |
| Duration | 11.5s |
| On-screen visual | Home screen. Callouts highlight the streak flame, the daily checklist, and the prize banner. |
| Screenshot(s) | `10-home-top.png`, `11-home-prize-banner.png` |
| Animation & camera | Phone centred; ring highlight pulses on the streak chip, then the checklist (words, fact, quiz). Scroll the Home screen down to the prize banner (use the two screenshots as a tall stitched scroll). |
| On-screen text / callouts | “Your day, ready to go” · “2 words · 1 fact · 1 quiz” · “About 5 minutes” |
| Voiceover | Open the app, and your day is ready: words, a fact, and a quiz. About five minutes. And that banner? Weekly prizes. More soon. |
| Sound effect | Light tick as each checklist item is highlighted. |

### Scene 4 — Learn

| Field | Detail |
|---|---|
| Timestamp | 00:30 – 00:42 |
| Duration | 12s |
| On-screen visual | Word card, fact card, then saved words with learning / mastered tags (spaced review). |
| Screenshot(s) | `14-learn-word.png`, `15-learn-fact.png`, `16-collection-saved-words.png` |
| Animation & camera | Cards slide in from alternating sides with 0.3s overlap. Zoom to the word 'Resilient' and its example sentence; zoom to the 'Mastered / Learning' tags; end on the Play hub with a highlight on Word Duel. |
| On-screen text / callouts | “Words & facts that stick” · “Spaced review: old words return” |
| Voiceover | Hear a new word, see it in a sentence, then pick up a fun fact. Save a word, and it returns right before you would forget it. So it sticks. |
| Sound effect | Card swish per slide; soft click on the highlighted tags; a quick game-start sting on the Play hub. |

### Scene 5 — Play

| Field | Detail |
|---|---|
| Timestamp | 00:42 – 00:51 |
| Duration | 9.5s |
| On-screen visual | Play tab with the daily challenge and Word Duel, then a daily-challenge question. |
| Screenshot(s) | `12-play-hub.png`, `13b-daily-challenge-question.png` |
| Animation & camera | Cards slide in from alternating sides with 0.3s overlap. Zoom to the word 'Resilient' and its example sentence; zoom to the 'Mastered / Learning' tags; end on the Play hub with a highlight on Word Duel. |
| On-screen text / callouts | “Time to play” · “Daily challenge · Word Duel” |
| Voiceover | Then it is game time. A daily challenge, the same for everyone, and Word Duel, a live one-on-one against a friend. |
| Sound effect | Card swish per slide; soft click on the highlighted tags; a quick game-start sting on the Play hub. |

### Scene 6 — XP, levels & streaks

| Field | Detail |
|---|---|
| Timestamp | 00:51 – 01:00 |
| Duration | 9s |
| On-screen visual | Progress screen (streak, shields, weekly ring) then the profile with level bar and the pebble shelf of badges. |
| Screenshot(s) | `17-progress-xp-streak.png`, `19-profile-pebble-shelf.png` |
| Animation & camera | Weekly ring animates to fill (re-create in motion graphics from the screenshot). Counter ticks up on XP. Badges pop onto the shelf one by one. |
| On-screen text / callouts | “Earn XP for everything” · “Level up · Collect badges” · “Streak shields have your back” |
| Voiceover | Everything earns XP. Keep your streak alive, with shields for busy days. Level up, and collect badges. |
| Sound effect | Rising tick for XP counter; small 'ding' per badge; whoosh on the streak flame. |

### Scene 7 — Friends

| Field | Detail |
|---|---|
| Timestamp | 01:00 – 01:07 |
| Duration | 7s |
| On-screen visual | Friends screen: the weekly friends board and the streak-buddy card. |
| Screenshot(s) | `20-friends-board.png` |
| Animation & camera | Phone slides to the left third; callout lines draw to 'This week' board and 'Streak buddies'. Gentle highlight on your row. |
| On-screen text / callouts | “Friends, weekly” · “Streak buddies” |
| Voiceover | Add friends with a code, see who is winning this week, and even keep a streak together. |
| Sound effect | Two soft pops as callouts appear. |

### Scene 8 — Global leaderboard

| Field | Detail |
|---|---|
| Timestamp | 01:07 – 01:17 |
| Duration | 10s |
| On-screen visual | The global leaderboard: podium, countdown, ranked list, 'Your rank' bar; then the toggle to All-time. |
| Screenshot(s) | `21-leaderboard-weekly.png`, `22-leaderboard-your-rank.png`, `23-leaderboard-all-time.png` |
| Animation & camera | Zoom to the podium; pan to the countdown; scroll the ranked list so the highlighted 'You' row and the sticky 'Your rank' bar slide in; cross-fade to All-time. |
| On-screen text / callouts | “Everyone. One leaderboard.” · “Weekly or all-time” · “Your rank, always in view” |
| Voiceover | Then take on everyone. The global leaderboard has a podium, and a live countdown. Your rank stays in view, weekly or all time. |
| Sound effect | Rank-up 'whoosh' as the list scrolls; soft tick on the toggle. |

### Scene 9 — Weekly prizes (emotional high point)

| Field | Detail |
|---|---|
| Timestamp | 01:17 – 01:38 |
| Duration | 21s |
| On-screen visual | Dark 'night' scene. The podium rises, then the three prize amounts light up in turn. Calendar tile shows Monday. |
| Screenshot(s) | `04-landing-prizes.png`, `11-home-prize-banner.png`, `21-leaderboard-weekly.png` |
| Animation & camera | Podium blocks rise 2nd, 3rd, then 1st. Amounts count up: ₦1,000 then ₦1,500 then ₦2,500 (gold glow on first place). Confetti burst on N2,500. End with a Monday calendar flip and the line 'Resets every Monday'. Do NOT show 'winner' names or payouts as if they have happened. |
| On-screen text / callouts | “Win real cash. Every week.” · “1st ₦2,500 · 2nd ₦1,500 · 3rd ₦1,000” · “Resets every Monday” · “Starts Monday, Nov 16” |
| Voiceover | And here is the best part. Every week, the top three win real cash. Second place: one thousand five hundred naira. Third place: one thousand naira. And first place wins two thousand five hundred naira! It resets every Monday, starting the sixteenth of November. |
| Sound effect | Deep riser into the podium rise; coin/shimmer on each amount; celebratory hit and confetti pop on ₦2,500; a calendar 'flip' on Monday. Music swells here, then settles. |

### Scene 10 — Mascot moments

| Field | Detail |
|---|---|
| Timestamp | 01:38 – 01:45 |
| Duration | 6.5s |
| On-screen visual | Playful grid/carousel of the six mascot banner crops, each with its speech bubble. Use the phone clip of the mascot animating here if available. |
| Screenshot(s) | `31-mascot-moment-1.png`, `32-mascot-moment-2.png`, `33-mascot-moment-3.png`, `34-mascot-moment-4.png`, `35-mascot-moment-5.png`, `36-mascot-moment-6.png` |
| Animation & camera | Six crops pop in with a springy stagger, then the best one (spin) scales up. The tone here is fun: bouncier easing, small confetti, sticker-like outlines. |
| On-screen text / callouts | “Meet your cheerleader” · “Curi reacts to you” |
| Voiceover | And Curi is always there, cheering you on, celebrating your wins, and keeping it fun. |
| Sound effect | Boing, giggle-style pops, a cheer sting. Keep them short and quiet under the voice. |

### Scene 11 — How it works

| Field | Detail |
|---|---|
| Timestamp | 01:45 – 01:55 |
| Duration | 10.5s |
| On-screen visual | Four-step horizontal timeline on paper background with icons: Sign up, Learn & earn XP, Play & climb, Win weekly prizes. |
| Screenshot(s) | `03-landing-how-it-works.png` |
| Animation & camera | Line draws left to right; each step icon pops in on the beat as the VO names it; the last step glows gold. |
| On-screen text / callouts | “1 Sign up free” · “2 Learn & earn XP” · “3 Play & climb” · “4 Win weekly prizes” |
| Voiceover | Sign up, it is free. Learn and earn XP. Play, and climb the ranks. Win weekly prizes. Simple as that. |
| Sound effect | Four rising notes, one per step. |

### Scene 12 — Closing CTA

| Field | Detail |
|---|---|
| Timestamp | 01:55 – 02:04 |
| Duration | 8.5s |
| On-screen visual | Logo lock-up with the otter waving, the URL, and a 'Get started: it's free' button. |
| Screenshot(s) | `05-landing-hero-desktop.png`, `01-landing-hero.png` |
| Animation & camera | Everything settles to a calm hold. Button gently pulses once. Fade to the paper colour. |
| On-screen text / callouts | “Curi” · “One word. One fact. Every day.” · “Start free at trycuri.app” |
| Voiceover | That is Curi. One word, one fact, every day. Start free today at try Curi dot app. |
| Sound effect | Final warm chime; music resolves. |

---

## 7. Screenshot pack (`docs/video/screenshots/`)

All screenshots are **390×844 CSS pixels at 3x (1170×2532 PNG)**, light theme, except `05` (desktop 1920×1080) and the element crops (`03`, `04`, `06`, `31`–`36`). They show a **fictional demo account** ("Dami K.", rank 12, 12-day streak) and **fictional Nigerian demo users**; avatars are generated letter tiles. **Nothing is read from or written to production**: the capture script answers every Supabase request from `capture/demo-data.mjs` and blocks all other network traffic. No emails, phone numbers or private data appear.

| File | Screen | Used in scene(s) | On disk |
|---|---|---|---|
| `01-landing-hero.png` | Landing page hero (mobile, signed out) | 2, 12 | ✅ |
| `02-landing-features.png` | Landing page: features section opening | — | ✅ |
| `03-landing-how-it-works.png` | Landing page: 4-step “How it works” | 11 | ✅ |
| `04-landing-prizes.png` | Landing page: weekly prizes podium (dark section) | 9 | ✅ |
| `05-landing-hero-desktop.png` | Landing page hero, desktop 1920×1080 (16:9) | 12 | ✅ |
| `06-landing-video.png` | Landing page: video player frame | — | ✅ |
| `10-home-top.png` | Home: greeting, streak/shield chips, daily checklist | 1, 3 | ✅ |
| `11-home-prize-banner.png` | Home: weekly prize banner with the mascot | 3, 9 | ✅ |
| `12-play-hub.png` | Play tab: daily challenge, Word Duel, coming-soon games | 5 | ✅ |
| `13-daily-challenge.png` | Daily challenge intro | — | ✅ |
| `13b-daily-challenge-question.png` | Daily challenge: a question | 5 | ✅ |
| `14-learn-word.png` | Word of the day card | 4 | ✅ |
| `15-learn-fact.png` | Fact of the day card | 4 | ✅ |
| `16-collection-saved-words.png` | Saved words with learning/mastered status (spaced review) | 4 | ✅ |
| `17-progress-xp-streak.png` | Progress: streak, shields, weekly ring, calendar | 6 | ✅ |
| `18-progress-more.png` | Progress: calendar and stats (lower half) | — | ✅ |
| `19-profile-pebble-shelf.png` | Profile: level, XP bar, pebble shelf (badges) | 6 | ✅ |
| `20-friends-board.png` | Friends: invite, streak buddy, weekly friends board | 7 | ✅ |
| `21-leaderboard-weekly.png` | Global leaderboard: weekly, podium, prizes, countdown, Your rank bar | 8, 9 | ✅ |
| `22-leaderboard-your-rank.png` | Global leaderboard: ranked list, “You” row highlighted | 8 | ✅ |
| `23-leaderboard-all-time.png` | Global leaderboard: All-time tab | 8 | ✅ |
| `31-mascot-moment-1.png` | Mascot banner crop with speech bubble (1) | 2, 10 | ✅ |
| `32-mascot-moment-2.png` | Mascot banner crop with speech bubble (2, mid-spin) | 10 | ✅ |
| `33-mascot-moment-3.png` | Mascot banner crop with speech bubble (3, cheer) | 10 | ✅ |
| `34-mascot-moment-4.png` | Mascot banner crop with speech bubble (4, wave) | 10 | ✅ |
| `35-mascot-moment-5.png` | Mascot banner crop with speech bubble (5, giggle) | 10 | ✅ |
| `36-mascot-moment-6.png` | Mascot banner crop with speech bubble (6, jump) | 10 | ✅ |

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
- **Sound effects (keep subtle, under the voice):** soft UI taps/ticks on callouts · light whoosh on slides · rising tick on XP counters · small ding per badge · **shimmer/coin on each prize amount**, a **celebratory hit with confetti on ₦2,500** · calendar flip on "Monday" · springy boing/giggle pops on mascot moments · a single warm chime on the final logo.
- **Rank-up cue:** a short ascending 3-note whoosh when the "You" row moves up.

---

## 9. Captions (`captions.srt`)

SRT-ready, timed to the 2:00 primary cut (each scene's window ends 0.5s early). Re-time if you change the voiceover pace. Keep two lines max, ~34 characters per line.

```srt
1
00:00:00,350 --> 00:00:02,690
Hey! How often do you pick up your
phone?

2
00:00:03,950 --> 00:00:06,423
What if just two minutes of it made
you sharper...

3
00:00:06,423 --> 00:00:07,660
and even paid you back?

4
00:00:09,350 --> 00:00:14,020
Meet Curi. Every day, you get a fresh
word and a fun fact.

5
00:00:14,470 --> 00:00:17,820
Two minutes, no pressure, and an otter
cheering you on.

6
00:00:18,850 --> 00:00:23,520
Open the app, and your day is ready:
words, a fact, and a quiz.

7
00:00:23,970 --> 00:00:26,988
About five minutes. And that banner?

8
00:00:26,988 --> 00:00:29,000
Weekly prizes. More soon.

9
00:00:30,150 --> 00:00:34,170
Hear a new word, see it in a sentence,
then pick up a fun fact.

10
00:00:36,550 --> 00:00:40,310
Save a word, and it returns right
before you would forget it.

11
00:00:40,310 --> 00:00:41,250
So it sticks.

12
00:00:42,250 --> 00:00:46,680
Then it is game time. A daily
challenge, the same for everyone,

13
00:00:47,130 --> 00:00:50,600
and Word Duel, a live one-on-one
against a friend.

14
00:00:51,750 --> 00:00:56,830
Everything earns XP. Keep your streak
alive, with shields for busy days.

15
00:00:57,450 --> 00:00:59,410
Level up, and collect badges.

16
00:01:00,850 --> 00:01:05,182
Add friends with a code, see who is
winning this week, and even keep a

17
00:01:05,182 --> 00:01:05,760
streak together.

18
00:01:07,850 --> 00:01:13,270
Then take on everyone. The global
leaderboard has a podium, and a live countdown.

19
00:01:13,720 --> 00:01:16,880
Your rank stays in view, weekly or all
time.

20
00:01:17,850 --> 00:01:19,881
And here is the best part.

21
00:01:19,881 --> 00:01:22,590
Every week, the top three win real
cash.

22
00:01:23,040 --> 00:01:26,270
Second place: one thousand five
hundred naira.

23
00:01:26,720 --> 00:01:29,040
Third place: one thousand naira.

24
00:01:29,550 --> 00:01:33,140
And first place wins two thousand five
hundred naira!

25
00:01:33,650 --> 00:01:37,430
It resets every Monday, starting the
sixteenth of November.

26
00:01:38,850 --> 00:01:43,417
And Curi is always there, cheering you
on, celebrating your wins, and keeping

27
00:01:43,417 --> 00:01:44,120
it fun.

28
00:01:45,450 --> 00:01:47,100
Sign up, it is free.

29
00:01:47,550 --> 00:01:49,370
Learn and earn XP.

30
00:01:49,820 --> 00:01:51,490
Play, and climb the ranks.

31
00:01:51,940 --> 00:01:54,810
Win weekly prizes. Simple as that.

32
00:01:55,950 --> 00:01:59,970
That is Curi. One word, one fact,
every day.

33
00:02:00,420 --> 00:02:03,000
Start free today at try Curi dot app.
```

---

## 10. Ready-to-paste master prompt

For an AI video/motion tool or a freelancer. Self-contained. Attach `screenshots/` and `captions.srt`.

````text
Create a 02:04 (2:00) product walkthrough motion-graphic video for "Curi", a mobile app (PWA) that helps people learn one new word and one fact a day, earn XP, keep streaks, play, and compete on a leaderboard for weekly cash prizes in Nigerian Naira.

AUDIENCE & MESSAGE: Stakeholders and investors first, prospective users second. Single takeaway: learn, earn XP, compete, win real weekly prizes. Tone: simple, energetic, professional; the otter mascot sections are playful.

FORMAT: 16:9, 1920×1080, 30fps (also export 9:16, 1080×1920). Keep titles inside a 90% safe area; for 9:16 keep captions above the bottom 15%. Burned-in captions optional; supply the attached SRT.

LOOK: Clean, modern, fintech-grade. Floating phone mockup (390×844 screenshots, rounded 40px device frame, soft shadow, subtle 3-degree tilt). Warm paper background #F6F4EF, surface #FFFDF9, ink text #1C2B3A, primary ember #C73B20 (buttons/highlights), moss green #3E6259, gold #C7962E for prizes, dark night #12191F for the prize scene. Fonts: Fraunces (serif, headlines), Sora (UI/body), IBM Plex Mono (numbers/labels). Radius: cards 16px, controls 12px. Motion: smooth slides, zoom-ins on key UI, animated ring highlights and callouts, 0.3s overlaps, ease-out cubic. Mascot sections: bouncier springy easing, sticker-like outlines, small confetti.
AVOID: stock footage, clutter, more than one idea per scene, jarring cuts, glitch/shake effects, fake user counts, fake testimonials, anything implying prizes have already been paid.

USE ONLY THE PROVIDED SCREENSHOTS (docs/video/screenshots/*.png) as the product visuals. Do not invent UI.

PRIZE FACTS (exact): ₦2,500 for 1st, ₦1,500 for 2nd, ₦1,000 for 3rd, every week. The week resets every Monday at 00:00 West Africa Time (Lagos). Prizes start Monday 16 November 2026. Weekly winners need at least 50 XP. Say "starting Monday", never imply it has already started.

SCENES (time, name, visual, voiceover):
00:00 Hook: Warm paper background. Big serif headline types on. A phone floats up from below with the Home screen. VO: “Hey! How often do you pick up your phone? What if just two minutes of it made you sharper... and even paid you back?”
00:09 Meet Curi: Curi wordmark and app icon centre-stage, then the otter pops in beside the phone with a speech bubble. VO: “Meet Curi. Every day, you get a fresh word and a fun fact. Two minutes, no pressure, and an otter cheering you on.”
00:18 Home & daily habit: Home screen. Callouts highlight the streak flame, the daily checklist, and the prize banner. VO: “Open the app, and your day is ready: words, a fact, and a quiz. About five minutes. And that banner? Weekly prizes. More soon.”
00:30 Learn: Word card, fact card, then saved words with learning / mastered tags (spaced review). VO: “Hear a new word, see it in a sentence, then pick up a fun fact. Save a word, and it returns right before you would forget it. So it sticks.”
00:42 Play: Play tab with the daily challenge and Word Duel, then a daily-challenge question. VO: “Then it is game time. A daily challenge, the same for everyone, and Word Duel, a live one-on-one against a friend.”
00:51 XP, levels & streaks: Progress screen (streak, shields, weekly ring) then the profile with level bar and the pebble shelf of badges. VO: “Everything earns XP. Keep your streak alive, with shields for busy days. Level up, and collect badges.”
01:00 Friends: Friends screen: the weekly friends board and the streak-buddy card. VO: “Add friends with a code, see who is winning this week, and even keep a streak together.”
01:07 Global leaderboard: The global leaderboard: podium, countdown, ranked list, 'Your rank' bar; then the toggle to All-time. VO: “Then take on everyone. The global leaderboard has a podium, and a live countdown. Your rank stays in view, weekly or all time.”
01:17 Weekly prizes (emotional high point): Dark 'night' scene. The podium rises, then the three prize amounts light up in turn. Calendar tile shows Monday. VO: “And here is the best part. Every week, the top three win real cash. Second place: one thousand five hundred naira. Third place: one thousand naira. And first place wins two thousand five hundred naira! It resets every Monday, starting the sixteenth of November.”
01:38 Mascot moments: Playful grid/carousel of the six mascot banner crops, each with its speech bubble. Use the phone clip of the mascot animating here if available. VO: “And Curi is always there, cheering you on, celebrating your wins, and keeping it fun.”
01:45 How it works: Four-step horizontal timeline on paper background with icons: Sign up, Learn & earn XP, Play & climb, Win weekly prizes. VO: “Sign up, it is free. Learn and earn XP. Play, and climb the ranks. Win weekly prizes. Simple as that.”
01:55 Closing CTA: Logo lock-up with the otter waving, the URL, and a 'Get started: it's free' button. VO: “That is Curi. One word, one fact, every day. Start free today at try Curi dot app.”

VOICE: warm, confident, friendly; about 140 words per minute; a natural Nigerian-English-leaning or neutral international English voice. Music: upbeat modern instrumental, ~100–110 BPM, light percussion and plucked/keys, not cheesy, ducks under voice, swells at the prize reveal. SFX: soft UI taps, whooshes on transitions, shimmer on prize amounts, celebratory hit and confetti on ₦2,500, boing on mascot moments.
END CARD: Curi logo + "One word. One fact. Every day." + "Start free at trycuri.app".
````

### Short version (935 characters, for tools with limits)

````text
Make a 2-minute 16:9 (1080p, 30fps) fintech-style motion-graphic walkthrough for "Curi", a mobile app: learn one word + one fact a day, earn XP, keep streaks, play, climb a leaderboard, win weekly cash prizes (₦2,500 / ₦1,500 / ₦1,000 for the top 3, resets every Monday, starts Monday 16 November 2026 — never say it already started). Style: floating phone mockups with soft shadows on warm paper #F6F4EF; ink #1C2B3A, ember #C73B20, moss #3E6259, gold #C7962E, dark scene #12191F; Fraunces headlines, Sora body. Smooth slides, zoom-ins, ring callouts; playful otter mascot moments. Scenes: hook, meet Curi, Home, Learn & Play, XP & streaks, Friends, Global leaderboard, weekly prizes (high point), mascot, 4-step how-it-works, CTA "Start free at trycuri.app". Warm confident voiceover ~140 wpm, upbeat non-cheesy music, soft UI SFX, prize shimmer. Use only my supplied screenshots; no stock footage, no invented stats or testimonials.
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
3. **Pick music** (100–110 BPM) and sketch the beat of the prize scene to land the swell on ₦2,500.
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

- [ ] Prize amounts read ₦2,500 / ₦1,500 / ₦1,000 (matches `leaderboardConfig.ts`; the build script fails if the storyboard quotes any other ₦ figure).
- [ ] Says "resets every Monday" (00:00 Lagos time), never "weekly on Sundays" or similar.
- [ ] Start date is Monday, 16 November 2026; wording is "starting Monday" / "resets every Monday", **never** implies it has begun. Remove the date after launch.
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
3. Prizes, Monday 00:00 WAT reset, 50 XP minimum and the start date come from `src/lib/leaderboardConfig.ts`.
4. Screenshots use a fictional account and are captured pre-launch, so they show "Starts Monday, Nov 16" and the leaderboard preview notice.
5. "Mascot moods" are represented by six tap/auto reactions with speech bubbles; true motion needs your phone recording.
6. The weekly recap, push and install features are described briefly in the VO; no on-screen proof exists in the pack (see manual captures).
7. Prize payouts are described as "win real cash"; the payout method is not shown (it is a legal placeholder in the Terms).
8. The legal pages are drafts and should be reviewed by a qualified Nigerian lawyer before launch; the video does not mention legal terms.
