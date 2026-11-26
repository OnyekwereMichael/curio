# Fact or Fiction: launch promo

Video: `social/fact-or-fiction-promo.mp4` (1080x1920, 9:16, 57.5 s, 30 fps, music + sound effects + voiceover, burned-in captions, progress bar).

Source: `docs/video/remotion/src/FactOrFictionPromo.tsx`. Event details live in one place: `docs/video/remotion/src/fofPromo.json` (`event`: date, time, zone, link text).

> Event details: **Friday 27 Nov 2026, 8:00 PM WAT** (confirmed). To change them, edit `event` in `fofPromo.json` and re-render (command at the bottom). Note: the planned posting date (Sat 28 Nov) is the day after the game night, so post on or before Fri 27 Nov for the "rolling out Friday" message to make sense.

## Voiceover script (word for word, timed)

| Time | Scene | On screen | Voiceover |
|---|---|---|---|
| 0:00-0:05 | Teaser | "CURI HAS A SECRET…", locked mystery box, "GUESS WHAT'S DROPPING?" (game not revealed) | "Curi has a secret... guess what's dropping?" |
| 0:05-0:10 | Reveal | FACT / FICTION logo slams in, "NEW GAME", "2-8 PLAYERS", confetti | "Fact or Fiction. Brand new. Two to eight players." |
| 0:10-0:14.5 | Step 1 | Host creates a room, 4-letter code **CURI** flips in | "Create a room, and get a four letter code." |
| 0:14.5-0:20.5 | Step 2 | Friends type the code, lobby fills to 8/8, host crown | "Friends join with just the code and a name. Watch the lobby fill up!" |
| 0:20.5-0:24 | Step 3 | Host taps START GAME, "ROUND 1/10, GO!" | "Then the host starts the game." |
| 0:24-0:31.3 | Step 4 | Statement "Lagos is the capital of Nigeria." Segmented 15 s timer drains and turns red, players lock in | "A statement appears. Everyone votes fact, or fiction, before the fifteen second timer runs out." |
| 0:31.3-0:36.3 | Step 5 | FICTION! stamp, the one-line why ("The capital is Abuja, which replaced Lagos in 1991."), what everyone picked | "Then the answer is revealed, with a quick explanation." |
| 0:36.3-0:44.3 | Step 6 | Correct +100, Speed bonus (up to +100), Streak bonus (up to +100), round total | "Right answer, a hundred points. Answer fast, for a speed bonus. Keep your streak going, for even more." |
| 0:44.3-0:49.3 | Step 7 | Round counter 1-10, podium, leaderboard, PLAY AGAIN | "Ten rounds, then the podium, the leaderboard, and play again." |
| 0:49.3-0:57.5 | Call to action | ROLLING OUT FRIDAY, LIVE GAME NIGHT, FRIDAY 27 NOV, 8:00 PM WAT, BRING YOUR SQUAD, LINK IN BIO | "Rolling out Friday. Live game night, Friday at eight P M. Bring your squad!" |

Voice: Microsoft neural "Ava" (en-US-AvaMultilingualNeural), +8% pace. Re-record by changing `VOICE` in the audio script if you want a different voice.

## Social caption

🚨 Curi has a secret… and it just dropped. 🚨

Meet **Fact or Fiction** 🎮, our brand-new real-time multiplayer game. 2 to 8 players, on phone or desktop.

Here's how it works 👇
🏠 Create a room, get a 4-letter code
📲 Friends join with just the code
⏱️ Everyone votes FACT or FICTION before the 15-second timer runs out
💡 See the answer and why
🔥 Score points for being right, being fast and keeping your streak alive
🏆 10 rounds, then the podium. Who's your smartest friend? (Spoiler: it's not you 😏)

📅 Rolling out **Friday**
🎉 LIVE GAME NIGHT: **Friday 27 Nov, 8:00 PM WAT**
🔗 Link in bio. Bring your squad!

#FactOrFiction #Curi #GameNight #MultiplayerGames #TriviaNight

## Short version (Stories / Status)

🎮 Fact or Fiction is coming to Curi! Live game night Friday, 8 PM WAT. Bring your squad 🔥
🔗 Link in bio

## What the video shows (accuracy check)

Everything on screen exists in the shipped game: 4-letter room code, join by code, lobby with host crown and a cap of 8, host starts, 15-second segmented timer that turns red, FACT/FICTION vote, answer reveal with a one-line why and what each player picked, scoring (100 + speed bonus up to 100 + streak bonus up to 100), 10 rounds, podium, leaderboard, play again. Category selection and voice chat are not mentioned, as requested. The demo players and the code "CURI" are fictional.

## Re-render

```bash
cd docs/video/remotion
BROWSER_EXECUTABLE="C:/Program Files/Google/Chrome/Application/chrome.exe" \
  npx remotion render src/index.ts FactOrFictionPromo out/fact-or-fiction-promo.mp4 --codec=h264
# audio only (voice, music, sfx): node scripts/make-fof-promo-audio.mjs   (SKIP_VO=1 reuses the existing voice clips)
```
