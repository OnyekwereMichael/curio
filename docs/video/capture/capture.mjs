// Captures the Curi screenshot pack at 390x844 @3x. Run: node capture.mjs [filter]
// Needs the app running locally (npx vite --port 5199) and Chrome installed.
// SAFETY: every Supabase request is answered from demo-data.mjs; anything else
// off-localhost (analytics, error reporting) is aborted. Production is never contacted.
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as D from './demo-data.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(here, '../screenshots');
const BASE = process.env.BASE_URL || 'http://localhost:5199';
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const env = fs.readFileSync(path.resolve(here, '../../../.env'), 'utf8');
const SB_HOST = new URL(env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim()).host;
const REF = SB_HOST.split('.')[0];
const only = process.argv[2];
const unknown = new Set();

const session = {
  access_token: 'demo.' + Buffer.from(JSON.stringify({ sub: D.ME.id, exp: 4102444800, role: 'authenticated' })).toString('base64url') + '.sig',
  refresh_token: 'demo', token_type: 'bearer', expires_in: 99999999, expires_at: 4102444800,
  user: { id: D.ME.id, aud: 'authenticated', role: 'authenticated', email: 'demo@curi.example', app_metadata: { provider: 'email' },
    user_metadata: { full_name: D.userRow.name, name: D.userRow.name }, created_at: '2026-09-01T00:00:00Z', email_confirmed_at: '2026-09-01T00:00:00Z' },
};

function mock(url, method, body, wantsObject) {
  const p = url.pathname;
  const rows = (x) => (wantsObject ? (Array.isArray(x) ? x[0] ?? null : x) : x);
  if (p.startsWith('/auth/v1/user')) return session.user;
  if (p.startsWith('/rest/v1/rpc/')) {
    const fn = p.split('/').pop();
    const args = body ? JSON.parse(body) : {};
    switch (fn) {
      case 'get_leaderboard': return D.leaderboard(args.p_period);
      case 'get_friends_data': return D.friends;
      case 'get_daily_challenge': return D.challenge;
      case 'get_or_build_daily_plan': return { words: D.words, fact: D.fact };
      case 'sync_xp': return { total_xp: D.userRow.total_xp, level: D.userRow.level, new_badges: [] };
      default: unknown.add('rpc ' + fn); return null;
    }
  }
  const table = p.replace('/rest/v1/', '');
  switch (table) {
    case 'users': return rows([D.userRow]);
    case 'user_preferences': return rows([D.prefs]);
    case 'daily_quests': return D.quests;
    case 'user_badges': return D.earned;
    case 'user_word_progress': return ['saved, marked_known', 'marked_known, saved'].includes(url.searchParams.get('select')) ? rows([{ saved: true, marked_known: false }]) : D.savedWords;
    case 'badges': return D.badges;
    case 'user_activity_log': return rows(D.activityLog.slice(0, 1).concat(method === 'GET' ? D.activityLog.slice(1) : []));
    case 'words': return rows(D.words);
    case 'facts': return rows([D.fact]);
    default: unknown.add(method + ' ' + table); return rows([]);
  }
}

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });

async function newPage({ signedIn = true, dark = false } = {}) {
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    const u = new URL(req.url());
    if (u.host === SB_HOST) {
      if (req.method() === 'OPTIONS') return req.respond({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' } });
      const wantsObject = (req.headers()['accept'] || '').includes('vnd.pgrst.object');
      const out = mock(u, req.method(), req.postData(), wantsObject);
      return req.respond({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*', 'content-range': Array.isArray(out) ? (out.length ? `0-${out.length - 1}/${out.length}` : '*/0') : '0-0/1' }, body: JSON.stringify(out) });
    }
    if (u.hostname === 'localhost' || u.hostname === '127.0.0.1' || u.host.endsWith('googleapis.com') || u.host.endsWith('gstatic.com') || u.protocol === 'data:') return req.continue();
    return req.abort();
  });
  await page.evaluateOnNewDocument((signedIn, dark, key, sess) => {
    try {
      if (signedIn) localStorage.setItem(key, JSON.stringify(sess));
      localStorage.setItem('theme', dark ? 'dark' : 'light');
      localStorage.setItem('last_seen_date', new Date().toISOString().split('T')[0]);
      if (!dark) document.documentElement.classList.remove('dark');
    } catch {}
  }, signedIn, dark, `sb-${REF}-auth-token`, session);
  return page;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function shot(page, name, opts = {}) {
  if (only && !name.includes(only)) return;
  await page.screenshot({ path: path.join(OUT, name + '.png'), ...opts });
  console.log('saved', name);
}
async function go(page, route, wait = 2500) { await page.goto(BASE + route, { waitUntil: 'networkidle2' }).catch(() => {}); await sleep(wait); }

// expose helpers to the shot list
export { newPage, shot, go, sleep, browser, unknown, OUT };
const { shots } = await import('./shots.mjs');
await shots({ newPage, shot, go, sleep, OUT });
console.log('unmocked:', [...unknown]);
await browser.close();
