# Curi video — Remotion project

Renders the walkthrough from `../storyboard.json`, `../captions.srt` and `../screenshots/`. Prize amounts come straight from `src/lib/leaderboardConfig.ts`. Separate from the app: it has its own `package.json`.

**Status: scaffolded, not yet installed or test-rendered.** Run the steps below and fix any type errors before relying on it.

```bash
cd docs/video/remotion
npm install
npm run typecheck     # catches anything I couldn't verify
npm run dev           # Remotion Studio preview
npm run render        # out/curi-walkthrough.mp4 (16:9, 1920x1080, 30fps)
npm run render:vertical   # 9:16
```

- Set `BROWSER_EXECUTABLE` to your Chrome path to skip Remotion's browser download.
- Audio: drop `public/audio/voiceover.mp3` and/or `public/audio/music.mp3`; they are picked up automatically.
- Change copy, timings or screenshots in `../storyboard.json`, then re-run `node ../build-readme.mjs` and `npm run sync`.
