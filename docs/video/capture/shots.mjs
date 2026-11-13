// The shot list. Filenames are referenced by docs/video/README.md — keep them stable.
const bubbleText = (p) => p.$eval('[role="status"]', (e) => e.textContent.trim()).catch(() => null);
const noBubble = (p, ms = 15000) => p.waitForSelector('[role="status"]', { hidden: true, timeout: ms }).catch(() => {});
const tapButton = async (p, re) => {
  for (const b of await p.$$('button')) {
    if (re.test(await b.evaluate((e) => e.textContent.trim()))) {
      await b.tap();
      return true;
    }
  }
  return false;
};

export async function shots({ newPage, shot, go, sleep, OUT }) {
  // ── Landing (signed out) ───────────────────────────────────────────
  const l = await newPage({ signedIn: false });
  await go(l, '/', 3000);
  await shot(l, '01-landing-hero');
  await l.evaluate(() => document.getElementById('features')?.scrollIntoView());
  await sleep(1200);
  await shot(l, '02-landing-features');
  for (const [id, name] of [['how', '03-landing-how-it-works'], ['prizes', '04-landing-prizes'], ['video', '06-landing-video']]) {
    await l.evaluate((i) => document.getElementById(i)?.scrollIntoView({ block: 'center' }), id);
    await sleep(1400);
    await l.evaluate(() => { const h = document.querySelector("header"); if (h) h.style.visibility = "hidden"; });
    await (await l.$('#' + id))?.screenshot({ path: `${OUT}/${name}.png` });
    console.log('saved', name);
  }
  await l.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
  await go(l, '/', 3000);
  await shot(l, '05-landing-hero-desktop');
  await l.close();

  // ── App (signed in as the demo user) ───────────────────────────────
  const p = await newPage();
  await go(p, '/home', 4000);
  await noBubble(p);
  await shot(p, '10-home-top');
  await p.evaluate(() => document.querySelector('[aria-label="Weekly leaderboard prizes"]')?.scrollIntoView({ block: 'center' }));
  await sleep(800);
  await noBubble(p);
  await shot(p, '11-home-prize-banner');

  await go(p, '/play', 3000);
  await shot(p, '12-play-hub');
  await go(p, '/play/daily', 3000);
  await shot(p, '13-daily-challenge');
  await tapButton(p, /^start$/i);
  await sleep(1500);
  await shot(p, '13b-daily-challenge-question');
  await go(p, '/learn/word', 3000);
  await shot(p, '14-learn-word');
  await go(p, '/learn/fact', 3000);
  await shot(p, '15-learn-fact');
  await go(p, '/collection', 3000);
  await shot(p, '16-collection-saved-words');
  await go(p, '/progress', 3500);
  await shot(p, '17-progress-xp-streak');
  await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await sleep(800);
  await shot(p, '18-progress-more');
  await go(p, '/profile', 3000);
  await shot(p, '19-profile-pebble-shelf');
  await go(p, '/friends', 3500);
  await shot(p, '20-friends-board');

  // ── Global leaderboard ─────────────────────────────────────────────
  await go(p, '/leaderboard', 4500);
  await shot(p, '21-leaderboard-weekly');
  await p.evaluate(() => window.scrollTo(0, 520));
  await sleep(900);
  await shot(p, '22-leaderboard-your-rank');
  await tapButton(p, /all.?time/i);
  await p.evaluate(() => window.scrollTo(0, 0));
  await sleep(1800);
  await shot(p, '23-leaderboard-all-time');

  // ── Mascot moments: tap and keep each distinct bubble (cropped to the banner) ──
  await go(p, '/home', 3500);
  await p.evaluate(() => document.querySelector('[aria-label="Weekly leaderboard prizes"]')?.scrollIntoView({ block: 'center' }));
  await sleep(800);
  const seen = new Set();
  let n = 0;
  for (let i = 0; i < 14 && n < 6; i++) {
    await (await p.$('[aria-label="Tap Curi the otter"]'))?.tap();
    // Wait until the bubble (and every ancestor) is fully opaque, so the shot isn't mid-fade.
    const t = await p
      .waitForFunction(() => {
        const el = document.querySelector('[role="status"]');
        if (!el || !el.textContent.trim()) return null;
        for (let n = el; n && n !== document.body; n = n.parentElement) if (Number(getComputedStyle(n).opacity) < 0.99) return null;
        return el.textContent.trim();
      }, { timeout: 2500, polling: 40 })
      .then((h) => h.jsonValue())
      .catch(() => null);
    if (t && !seen.has(t)) {
      seen.add(t);
      n++;
      const card = await p.$('[aria-label="Weekly leaderboard prizes"]');
      await card.screenshot({ path: `${OUT}/3${n}-mascot-moment-${n}.png` });
      console.log('saved', `3${n}-mascot-moment-${n}`, '| bubble:', t);
    }
    await sleep(500);
  }
  await p.close();
}
