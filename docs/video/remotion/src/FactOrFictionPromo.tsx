import React from 'react';
import { AbsoluteFill, Audio, Easing, Img, Sequence, spring, staticFile, useCurrentFrame } from 'remotion';
import { loadFont as loadPx } from '@remotion/google-fonts/PressStart2P';
import { loadFont as loadVt } from '@remotion/google-fonts/VT323';
import T from './fofPromo.json';
import VO from './generated/fofPromoVo.json';
import { COLORS, FONTS } from './brand';

/**
 * "Fact or Fiction" launch promo. Vertical 1080x1920 @30fps, 57.5s.
 * Every timing comes from fofPromo.json (scene windows, voiceover lines, event details), so the date/time can be changed in one place.
 * Only features that exist in the game are shown: room code, join by code, lobby (max 8, host crown), 15s FACT/FICTION vote,
 * reveal with a one-line why, scoring (100 + speed bonus + streak bonus), 10 rounds, podium, leaderboard, play again.
 */

export const FOF_PROMO_FRAMES = Math.round(T.total * T.fps);
const PX = loadPx().fontFamily;
const VT = loadVt().fontFamily;
const FPS = T.fps;
const C = {
  bg: '#12062a', panel: '#241046', panel2: '#33165f', muted: '#b9a6e6', green: '#22c55e', red: '#ef4444', yellow: '#facc15',
  purple: '#8b5cf6', pink: '#ec4899', cyan: '#22d3ee', ember: COLORS.emberBright, gold: COLORS.gold,
};
type SceneName = keyof typeof T.scenes;
const SC = (n: SceneName) => ({ a: T.scenes[n][0], b: T.scenes[n][1] });
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const rand = (i: number, k: number) => { const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x); };
const easeOut = Easing.out(Easing.cubic);

/** Springy 0 -> 1 pop that starts at time `at` (seconds, local to the scene). */
const pop = (t: number, at: number, damping = 11, stiffness = 170) =>
  t < at ? 0 : spring({ frame: Math.round((t - at) * FPS), fps: FPS, config: { damping, stiffness } });
const ramp = (t: number, a: number, len = 0.3) => easeOut(clamp01((t - a) / len));

const PLAYERS = [
  { n: 'Tobi', a: '🦊' }, { n: 'Ada', a: '🐼' }, { n: 'Chidi', a: '🦁' }, { n: 'Zainab', a: '🐸' },
  { n: 'Emeka', a: '🦄' }, { n: 'Ngozi', a: '🐙' }, { n: 'Bayo', a: '🐯' }, { n: 'Femi', a: '🦉' },
];

/* the "you" player in the demo is Ada (joins the lobby), Tobi is the host */
const ME = 1;

/* ───────────────────────── backdrop, CRT, HUD ───────────────────────── */
function Backdrop({ f }: { f: number }) {
  const sweep = (f * 3) % 120;
  return (
    <AbsoluteFill style={{ background: `radial-gradient(circle at ${20 + Math.sin(f / 90) * 8}% 10%, rgba(139,92,246,.6), transparent 45%), radial-gradient(circle at ${85 + Math.cos(f / 70) * 6}% 92%, rgba(236,72,153,.4), transparent 48%), radial-gradient(circle at 50% 50%, #1d0a3d, ${C.bg} 72%)` }}>
      {/* retro grid floor */}
      <div style={{ position: 'absolute', left: -400, right: -400, bottom: -60, height: 760, transform: 'perspective(520px) rotateX(62deg)', transformOrigin: 'center bottom', backgroundImage: `linear-gradient(${C.pink}66 2px, transparent 2px), linear-gradient(90deg, ${C.purple}66 2px, transparent 2px)`, backgroundSize: '90px 90px', backgroundPosition: `0 ${sweep * 0.75}px`, maskImage: 'linear-gradient(to top, #000 10%, transparent 85%)', WebkitMaskImage: 'linear-gradient(to top, #000 10%, transparent 85%)', opacity: 0.8 }} />
      {/* stars */}
      {Array.from({ length: 34 }).map((_, i) => {
        const y = ((rand(i, 2) * 1920 - f * (0.4 + rand(i, 3) * 1.2)) % 1920 + 1920) % 1920;
        return <div key={i} style={{ position: 'absolute', left: rand(i, 1) * 1080, top: y, width: 4 + rand(i, 4) * 6, height: 4 + rand(i, 4) * 6, background: i % 3 ? C.cyan : C.pink, opacity: 0.25 + 0.5 * Math.abs(Math.sin(f / 25 + i)), boxShadow: `0 0 12px ${i % 3 ? C.cyan : C.pink}` }} />;
      })}
    </AbsoluteFill>
  );
}

function Crt({ f }: { f: number }) {
  const band = ((f * 5) % 2600) - 300;
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      <AbsoluteFill style={{ background: 'repeating-linear-gradient(0deg, rgba(0,0,0,.22) 0 2px, transparent 2px 6px)' }} />
      <div style={{ position: 'absolute', left: 0, right: 0, top: band, height: 260, background: 'linear-gradient(180deg, transparent, rgba(255,255,255,.05), transparent)' }} />
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse at center, transparent 58%, rgba(0,0,0,.5))' }} />
    </AbsoluteFill>
  );
}

function Hud({ f }: { f: number }) {
  const p = clamp01(f / (T.total * FPS));
  const segs = 36;
  return (
    <>
      <div style={{ position: 'absolute', top: 36, left: 48, right: 48, display: 'flex', gap: 5 }}>
        {Array.from({ length: segs }).map((_, i) => (
          <i key={i} style={{ flex: 1, height: 14, borderRadius: 3, background: p * segs > i ? `linear-gradient(180deg, ${C.cyan}, ${C.purple})` : '#ffffff1c', boxShadow: p * segs > i ? `0 0 10px ${C.cyan}` : 'none' }} />
        ))}
      </div>
      <div style={{ position: 'absolute', top: 70, left: 48, display: 'flex', alignItems: 'center', gap: 14 }}>
        <Img src={staticFile('curi-icon.png')} style={{ width: 50, height: 50, borderRadius: 12, border: '3px solid #000', boxShadow: `0 0 18px ${C.ember}88` }} />
        <span style={{ fontFamily: PX, fontSize: 26, color: '#fff', textShadow: `0 0 16px ${C.ember}` }}>CURI</span>
      </div>
    </>
  );
}

/* ───────────────────────── caption bar ───────────────────────── */
function chunk(text: string): string[] {
  const out: string[] = [];
  for (const sentence of text.split(/(?<=[.?!])s+/)) {
    const parts = Math.ceil(sentence.length / 31);
    if (parts <= 1) { out.push(sentence); continue; }
    const words = sentence.split(' ');
    const target = sentence.length / parts;
    let cur: string[] = [];
    for (const w of words) {
      const len = cur.join(' ').length;
      if (cur.length && len + 1 + w.length > target + 4 && out.length >= 0) { out.push(cur.join(' ')); cur = []; }
      cur.push(w);
    }
    if (cur.length) out.push(cur.join(' '));
  }
  return out;
}
const CAPS = VO.clips.flatMap((c) => {
  const parts = chunk(c.text);
  const totalChars = parts.reduce((n, p) => n + p.length, 0);
  let acc = 0;
  return parts.map((p) => { const a = c.at + (c.sec * acc) / totalChars; acc += p.length; return { text: p, a, b: c.at + (c.sec * acc) / totalChars + 0.12 }; });
});

function Caption({ time }: { time: number }) {
  const cur = CAPS.find((c) => time >= c.a && time < c.b);
  const near = CAPS.some((c) => time >= c.a - 0.15 && time < c.b + 0.25);
  const words = cur ? cur.text.split(' ') : [];
  const prog = cur ? clamp01((time - cur.a) / (cur.b - cur.a)) : 0;
  const lit = Math.floor(prog * words.length * 1.15) + 1;
  return (
    <div style={{ position: 'absolute', left: 54, right: 54, top: 1462, height: 190, borderRadius: 26, border: '6px solid #000', background: 'linear-gradient(180deg, #2a1255, #170a35)', boxShadow: `0 8px 0 #000, 0 0 30px ${C.purple}88`, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 30px', textAlign: 'center', opacity: near ? 1 : 0 }}>
      <div style={{ fontFamily: VT, fontSize: 68, lineHeight: 1.0, color: '#fff', textShadow: '0 4px 0 #000', opacity: cur ? 1 : 0 }}>
        {words.map((w, i) => {
          const base = w.replace(/[^a-z]/gi, '').toLowerCase();
          const col = base === 'fact' ? C.green : base === 'fiction' ? C.red : i < lit ? '#fff' : '#ffffff66';
          return <span key={i} style={{ color: col, marginRight: 16, display: 'inline-block' }}>{w}</span>;
        })}
      </div>
    </div>
  );
}

/* ───────────────────────── effects ───────────────────────── */
const CONFETTI_AT = [SC('reveal').a + 1.0, SC('answer').a + 0.9, SC('finish').a + 2.2, SC('cta').a + 0.3, SC('cta').a + 4.0];
function Confetti({ time }: { time: number }) {
  const cols = [C.yellow, C.pink, C.cyan, C.green, C.purple, '#fff'];
  return (
    <AbsoluteFill style={{ pointerEvents: 'none', overflow: 'hidden' }}>
      {CONFETTI_AT.flatMap((t0, b) => {
        const dt = time - t0;
        if (dt < 0 || dt > 2.6) return [];
        return Array.from({ length: 70 }).map((_, i) => {
          const ang = (-90 + (rand(i, b + 1) - 0.5) * 120) * (Math.PI / 180);
          const sp = 700 + rand(i, b + 7) * 1100;
          const x = 540 + Math.cos(ang) * sp * dt + (rand(i, 9) - 0.5) * 300;
          const y = 900 + Math.sin(ang) * sp * dt + 2300 * dt * dt * 0.5;
          return <i key={`${b}-${i}`} style={{ position: 'absolute', left: x, top: y, width: 16, height: 26, background: cols[i % cols.length], opacity: clamp01((2.6 - dt) / 0.7) * clamp01(dt / 0.12), transform: `rotate(${dt * (300 + rand(i, 5) * 500)}deg)`, borderRadius: 3 }} />;
        });
      })}
    </AbsoluteFill>
  );
}
const SLAMS = [SC('reveal').a + 0.4, SC('reveal').a + 1.0, SC('start').a + 1.5, SC('answer').a + 0.9, SC('score').a + 6.3, SC('finish').a + 2.2, SC('cta').a + 0.3];
const shakeAt = (time: number) => {
  let sx = 0, sy = 0;
  for (const s of SLAMS) { const d = time - s; if (d >= 0 && d < 0.5) { const a = Math.exp(-d * 9) * 16; sx += Math.sin(d * 70) * a; sy += Math.cos(d * 83) * a * 0.6; } }
  return [sx, sy];
};
function Flash({ time }: { time: number }) {
  let o = 0;
  for (const t0 of [SC('reveal').a + 0.4, SC('start').a + 1.5, SC('cta').a + 0.3]) { const d = time - t0; if (d >= 0 && d < 0.25) o = Math.max(o, 0.7 * (1 - d / 0.25)); }
  for (const k of Object.keys(T.scenes) as SceneName[]) { const d = Math.abs(time - SC(k).a); if (k !== 'hook' && d < 0.12) o = Math.max(o, 0.35 * (1 - d / 0.12)); }
  return <AbsoluteFill style={{ background: '#fff', opacity: o, pointerEvents: 'none' }} />;
}

/* ───────────────────────── small pixel UI bits ───────────────────────── */
const glow = (c: string, r = 24) => `0 0 ${r}px ${c}, 0 0 ${r * 2}px ${c}66`;
function PxText({ children, size, color = '#fff', style }: { children: React.ReactNode; size: number; color?: string; style?: React.CSSProperties }) {
  return <div style={{ fontFamily: PX, fontSize: size, color, lineHeight: 1.25, textShadow: `0 ${Math.max(3, size * 0.06)}px 0 #000`, ...style }}>{children}</div>;
}
function Btn({ label, bg, color = '#fff', pressed = false, h = 46, size = 12, style }: { label: React.ReactNode; bg: string; color?: string; pressed?: boolean; h?: number; size?: number; style?: React.CSSProperties }) {
  return (
    <div style={{ height: h, borderRadius: 12, border: '4px solid #000', background: bg, color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: PX, fontSize: size, boxShadow: pressed ? '0 1px 0 #000' : '0 5px 0 #000', transform: pressed ? 'translateY(4px)' : 'none', ...style }}>{label}</div>
  );
}
const card: React.CSSProperties = { background: C.panel, border: '4px solid #000', borderRadius: 14, boxShadow: '0 5px 0 #000', padding: 12 };

/** A finger tap: ring appears, presses at `at`, ripples out. Coordinates are in the phone's design space. */
function Tap({ t, at, x, y }: { t: number; at: number; x: number; y: number }) {
  const show = ramp(t, at - 0.45, 0.25) * (1 - ramp(t, at + 0.35, 0.25));
  const press = t >= at ? 1 : 0;
  const rip = clamp01((t - at) / 0.5);
  if (show <= 0 && rip >= 1) return null;
  return (
    <div style={{ position: 'absolute', left: x, top: y, zIndex: 20, pointerEvents: 'none' }}>
      <div style={{ position: 'absolute', left: -20, top: -20, width: 40, height: 40, borderRadius: '50%', background: '#ffffffcc', border: '3px solid #000', opacity: show, transform: `scale(${press ? 0.8 : 1})` }} />
      {t >= at && rip < 1 && <div style={{ position: 'absolute', left: -20, top: -20, width: 40, height: 40, borderRadius: '50%', border: `4px solid ${C.cyan}`, opacity: 1 - rip, transform: `scale(${1 + rip * 2.4})` }} />}
    </div>
  );
}

/* ───────────────────────── the phone and its screens (design space 390 x 690) ───────────────────────── */
const SW = 380, SH = 610, K = 1.9;

function PlayerRow({ i, tag }: { i: number; tag?: string }) {
  const p = PLAYERS[i];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: i === ME ? '#0e3a4a' : C.panel2, border: `3px solid ${i === ME ? C.cyan : '#000'}`, borderRadius: 11, padding: '2px 10px', height: 32, position: 'relative' }}>
      {i === 0 && <span style={{ position: 'absolute', left: -2, top: -14, fontSize: 18, transform: 'rotate(-18deg)' }}>👑</span>}
      <span style={{ fontSize: 19 }}>{p.a}</span>
      <span style={{ fontFamily: VT, fontSize: 24, color: '#fff' }}>{p.n}{tag ? <span style={{ color: C.muted }}> {tag}</span> : null}</span>
    </div>
  );
}

function CodeTiles({ t, flipAt, size = 70, letters = 'CURI' }: { t: number; flipAt: number[]; size?: number; letters?: string }) {
  return (
    <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
      {letters.split('').map((ch, i) => {
        const p = pop(t, flipAt[i], 12, 200);
        return (
          <div key={i} style={{ width: size, height: size * 1.1, border: '4px solid #000', borderRadius: 12, background: 'linear-gradient(180deg, #2a1255, #14082e)', boxShadow: '0 5px 0 #000', display: 'grid', placeItems: 'center', fontFamily: PX, fontSize: size * 0.55, color: C.yellow, textShadow: glow(C.yellow, 10), transform: `rotateX(${(1 - p) * 90}deg) scale(${0.8 + 0.2 * p})`, opacity: p > 0.02 ? 1 : 0.25 }}>{p > 0.4 ? ch : ''}</div>
        );
      })}
    </div>
  );
}

function HubScreen({ t, joinMode }: { t: number; joinMode: boolean }) {
  const rows = [
    { n: 'Word Duel', d: '1 vs 1 · pick the word for the definition · 2 min', b: 'PLAY', ok: true },
    { n: 'Fact or Fiction', d: '2 to 8 players · vote true or false together', b: 'HOST', ok: true, hot: true },
    { n: 'Bluff the Definition', d: '3 to 8 · write fake meanings, spot the real one', b: 'SOON', ok: false },
  ];
  const typed = Math.max(0, Math.min(4, Math.floor((t - 0.7) / 0.2) + 1));
  return (
    <div style={{ position: 'absolute', inset: 0, background: '#12191F', padding: '48px 16px', fontFamily: FONTS.ui, color: '#F6F4EF' }}>
      <div style={{ fontSize: 30, fontWeight: 700, marginBottom: 14 }}>Play</div>
      {joinMode && (
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', border: '2px solid #F6F4EF33', borderRadius: 14, padding: 10, marginBottom: 14, background: '#1b252d' }}>
          <div style={{ flex: 1, textAlign: 'center', letterSpacing: 10, fontSize: 24, fontWeight: 700, color: typed ? '#F6F4EF' : '#F6F4EF55' }}>{typed ? 'CURI'.slice(0, typed) : '····'}</div>
          <div style={{ background: C.ember, borderRadius: 10, padding: '10px 16px', fontWeight: 700, fontSize: 14, transform: t >= 1.9 ? 'scale(.92)' : 'none' }}>JOIN</div>
        </div>
      )}
      {rows.map((r) => (
        <div key={r.n} style={{ border: `2px solid ${r.hot && !joinMode ? C.ember : '#F6F4EF22'}`, borderRadius: 14, padding: 12, marginBottom: 10, background: '#1b252d', display: 'flex', gap: 10, alignItems: 'center', opacity: r.ok ? 1 : 0.55, boxShadow: r.hot && !joinMode ? `0 0 18px ${C.ember}55` : 'none' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 17, fontWeight: 700 }}>{r.n}</div>
            <div style={{ fontSize: 11.5, color: '#F6F4EF99', marginTop: 3, lineHeight: 1.35 }}>{r.d}</div>
          </div>
          <div style={{ background: r.ok ? C.ember : '#F6F4EF22', borderRadius: 10, padding: '9px 14px', fontWeight: 700, fontSize: 13, transform: r.hot && !joinMode && t >= 1.3 ? 'scale(.9)' : 'none' }}>{r.b}</div>
        </div>
      ))}
    </div>
  );
}

function ArcadeScreen({ children }: { children: React.ReactNode }) {
  return <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(circle at 15% 8%, rgba(139,92,246,.55), transparent 42%), radial-gradient(circle at 90% 92%, rgba(236,72,153,.35), transparent 45%), ${C.bg}`, padding: '40px 14px 16px', color: '#fff' }}>{children}</div>;
}

function LobbyBody({ t, count, codeFlip, showBtns, start }: { t: number; count: number; codeFlip: number[]; showBtns: boolean; start?: { pressed: boolean } }) {
  return (
    <>
      <PxText size={11} style={{ textAlign: 'center', marginBottom: 8 }}>ROOM CODE</PxText>
      <CodeTiles t={t} flipAt={codeFlip} size={50} />
      <div style={{ display: 'flex', gap: 8, margin: '10px 0', opacity: showBtns ? 1 : 0 }}>
        <Btn label="🔗 SHARE LINK" bg="#3b2a66" h={30} size={8} style={{ flex: 1 }} />
        <Btn label="📋 COPY CODE" bg="#3b2a66" h={30} size={8} style={{ flex: 1 }} />
      </div>
      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: PX, fontSize: 9, color: C.cyan, marginBottom: 8 }}><span>PLAYERS</span><span>{count}/8</span></div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {Array.from({ length: count }).map((_, i) => <PlayerRow key={i} i={i} tag={i === ME ? '(you)' : undefined} />)}
        </div>
      </div>
      {start && <Btn label="▶ START GAME" bg={C.green} color="#000" pressed={start.pressed} h={50} size={13} style={{ marginTop: 14 }} />}
      {!start && count <= 2 && <PxText size={8} color={C.muted} style={{ textAlign: 'center', marginTop: 12 }}>WAITING FOR PLAYERS…</PxText>}
    </>
  );
}

function Hud2({ round, score }: { round: number; score: number }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: PX, fontSize: 10, color: C.cyan, margin: '4px 2px 10px' }}>
      <span>ROUND {round}/10</span><span style={{ color: C.yellow }}>★ {score}</span>
    </div>
  );
}

function Bar({ frac }: { frac: number }) {
  const red = frac <= 5 / 15;
  const lit = Math.ceil(frac * 20);
  return (
    <div style={{ display: 'flex', gap: 3, padding: 5, background: '#0a0318', border: '4px solid #000', borderRadius: 10 }}>
      {Array.from({ length: 20 }).map((_, i) => (
        <i key={i} style={{ flex: 1, height: 20, borderRadius: 2, background: i < lit ? (red ? C.red : C.green) : '#ffffff14', boxShadow: i < lit ? `0 0 8px ${red ? C.red : C.green}` : 'none' }} />
      ))}
    </div>
  );
}

const VOTE_SEQ = [1.4, 2.0, 2.6, 3.1, 3.5, 3.9, 4.4, 5.0]; // time each player (by index) locks in; index ME votes at 4.4
const VOTE_ORDER = [0, 2, 3, 4, 5, 6, ME, 7];

function VoteScreen({ t }: { t: number }) {
  const frac = clamp01(1 - (t - 0.5) / 5.1);
  const secs = Math.ceil(frac * 15);
  const tapped = t >= 4.4;
  const st = ramp(t, 0.2, 0.3);
  return (
    <ArcadeScreen>
      <Hud2 round={1} score={0} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <div style={{ flex: 1 }}><Bar frac={frac} /></div>
        <PxText size={20} color={frac <= 5 / 15 ? C.red : '#fff'} style={{ width: 52, textAlign: 'right' }}>{secs}</PxText>
      </div>
      <div style={{ ...card, marginTop: 8, opacity: st, transform: `translateY(${(1 - st) * 20}px)`, padding: 16 }}>
        <div style={{ display: 'inline-block', fontFamily: PX, fontSize: 9, color: '#000', background: C.yellow, border: '3px solid #000', borderRadius: 8, padding: '5px 8px' }}>🌍 NAIJA &amp; AFRICA</div>
        <div style={{ fontFamily: VT, fontSize: 37, lineHeight: 1.05, marginTop: 12, color: '#fff' }}>Lagos is the capital of Nigeria.</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 14 }}>
        <Btn label="✅ FACT" bg={C.green} color="#000" h={62} size={17} style={{ opacity: tapped ? 0.35 : 1 }} />
        <Btn label={tapped ? '🔒 FICTION' : '❌ FICTION'} bg={C.red} h={62} size={17} pressed={tapped} style={tapped ? { boxShadow: `0 1px 0 #000, 0 0 24px ${C.red}` } : undefined} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 18, flexWrap: 'wrap' }}>
        {VOTE_ORDER.map((pi, k) => {
          const done = t >= VOTE_SEQ[k];
          return (
            <div key={pi} style={{ position: 'relative', width: 38, height: 38, borderRadius: '50%', display: 'grid', placeItems: 'center', background: C.panel2, border: `3px solid ${done ? C.green : '#000'}`, fontSize: 20, opacity: done ? 1 : 0.55, boxShadow: done ? `0 0 10px ${C.green}` : 'none' }}>
              {PLAYERS[pi].a}
              {done && <span style={{ position: 'absolute', right: -5, bottom: -5, fontSize: 11, background: C.green, color: '#000', borderRadius: '50%', width: 16, height: 16, display: 'grid', placeItems: 'center', fontFamily: PX }}>✓</span>}
            </div>
          );
        })}
      </div>
      <PxText size={9} color={t >= 5.1 ? C.yellow : C.muted} style={{ textAlign: 'center', marginTop: 14 }}>{t >= 5.1 ? 'EVERYONE VOTED!' : 'WAITING FOR VOTES…'}</PxText>
      <Tap t={t} at={4.4} x={SW / 2 + 40} y={392} />
    </ArcadeScreen>
  );
}

const RESULTS = [
  { i: 1, pick: false, pts: 227 }, { i: 0, pick: false, pts: 183 }, { i: 3, pick: false, pts: 168 },
  { i: 5, pick: false, pts: 141 }, { i: 2, pick: true, pts: 0 }, { i: 6, pick: true, pts: 0 },
];

function AnswerScreen({ t }: { t: number }) {
  const stamp = pop(t, 0.9, 9, 140);
  const why = ramp(t, 2.0, 0.3);
  const whyText = 'The capital is Abuja, which replaced Lagos in 1991.';
  const shown = Math.floor(clamp01((t - 2.0) / 1.5) * whyText.length);
  return (
    <ArcadeScreen>
      <Hud2 round={1} score={t > 3 ? 227 : 0} />
      <div style={{ ...card, padding: 12 }}>
        <div style={{ fontFamily: VT, fontSize: 28, lineHeight: 1.05, color: '#ffffffcc' }}>Lagos is the capital of Nigeria.</div>
      </div>
      <div style={{ height: 66, display: 'grid', placeItems: 'center' }}>
        <div style={{ transform: `rotate(-5deg) scale(${stamp > 0 ? 0.5 + stamp * 0.5 + (1 - stamp) * 1.2 : 0})`, opacity: stamp > 0.02 ? 1 : 0, fontFamily: PX, fontSize: 26, color: C.red, border: `5px solid ${C.red}`, borderRadius: 10, padding: '8px 14px', background: '#12062aee', textShadow: glow(C.red, 12), boxShadow: glow(C.red, 14) }}>FICTION!</div>
      </div>
      <div style={{ ...card, opacity: why, background: '#2d1b0e', borderColor: '#000' }}>
        <div style={{ fontFamily: PX, fontSize: 8, color: C.yellow, marginBottom: 6 }}>WHY?</div>
        <div style={{ fontFamily: VT, fontSize: 27, lineHeight: 1.05, color: '#fff' }}>{whyText.slice(0, shown)}</div>
      </div>
      <div style={{ ...card, marginTop: 12, padding: 10, opacity: ramp(t, 2.6, 0.2) }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {RESULTS.slice(0, 5).map((r, k) => {
            const p = pop(t, 2.7 + k * 0.2, 14, 220);
            const good = !r.pick; // everyone who picked FICTION was right
            return (
              <div key={r.i} style={{ display: 'flex', alignItems: 'center', gap: 8, height: 30, background: C.panel2, border: `3px solid ${r.i === ME ? C.cyan : '#000'}`, borderRadius: 10, padding: '0 8px', opacity: p, transform: `translateX(${(1 - p) * 40}px)` }}>
                <span style={{ fontSize: 19 }}>{PLAYERS[r.i].a}</span>
                <span style={{ fontFamily: VT, fontSize: 23, flex: 1 }}>{PLAYERS[r.i].n}</span>
                <span style={{ fontFamily: PX, fontSize: 8, color: good ? C.red : C.green }}>{good ? 'FICTION' : 'FACT'}</span>
                <span style={{ fontFamily: PX, fontSize: 9, color: good ? C.green : C.red, width: 52, textAlign: 'right' }}>{good ? `+${r.pts}` : '✗ 0'}</span>
              </div>
            );
          })}
        </div>
      </div>
    </ArcadeScreen>
  );
}

function ScoreScreen({ t }: { t: number }) {
  const c1 = pop(t, 0.4), c2 = pop(t, 2.4), c3 = pop(t, 4.4), tot = pop(t, 6.3, 9, 140);
  const gauge = clamp01((t - 2.6) / 1.0) * 0.87;
  const Row = ({ p, icon, title, sub, val, color }: { p: number; icon: string; title: string; sub: string; val: string; color: string }) => (
    <div style={{ ...card, padding: 18, display: 'flex', alignItems: 'center', gap: 14, opacity: p, transform: `scale(${0.85 + 0.15 * p}) translateY(${(1 - p) * 30}px)`, borderColor: '#000', boxShadow: `0 5px 0 #000, 0 0 ${p * 16}px ${color}66` }}>
      <span style={{ fontSize: 44 }}>{icon}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: PX, fontSize: 10, color }}>{title}</div>
        <div style={{ fontFamily: VT, fontSize: 26, color: C.muted, lineHeight: 1, marginTop: 4 }}>{sub}</div>
      </div>
      <div style={{ fontFamily: PX, fontSize: 21, color }}>{val}</div>
    </div>
  );
  return (
    <ArcadeScreen>
      <PxText size={11} color={C.cyan} style={{ textAlign: 'center', margin: '4px 0 12px' }}>HOW YOU SCORE</PxText>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Row p={c1} icon="✅" title="CORRECT ANSWER" sub="Get it right" val="+100" color={C.green} />
        <div>
          <Row p={c2} icon="⚡" title="SPEED BONUS" sub="Faster = more (up to +100)" val={c2 > 0.5 && t > 3.6 ? '+87' : '+?'} color={C.yellow} />
          <div style={{ height: 16, margin: '10px 6px 0', background: '#0a0318', border: '3px solid #000', borderRadius: 8, opacity: c2, overflow: 'hidden' }}><div style={{ width: `${gauge * 100}%`, height: '100%', background: `linear-gradient(90deg, ${C.yellow}, ${C.pink})` }} /></div>
        </div>
        <Row p={c3} icon="🔥" title="STREAK BONUS" sub="Answers in a row (up to +100)" val="+40" color={C.pink} />
      </div>
      <div style={{ marginTop: 18, textAlign: 'center', opacity: tot > 0.02 ? 1 : 0, transform: `scale(${tot > 0 ? 0.6 + tot * 0.4 + (1 - tot) * 1.0 : 0})` }}>
        <div style={{ fontFamily: PX, fontSize: 9, color: C.muted }}>100 + 87 + 40</div>
        <div style={{ fontFamily: PX, fontSize: 44, color: C.yellow, textShadow: glow(C.yellow, 14), marginTop: 8 }}>+227</div>
      </div>
    </ArcadeScreen>
  );
}

function FinishScreen({ t }: { t: number }) {
  const round = Math.min(10, Math.max(1, Math.floor((t - 0.2) / 0.1) + 1));
  const counter = t < 1.4;
  const blocks = [{ i: 3, h: 70, at: 1.5, c: '#cd7f32', rank: 3 }, { i: 1, h: 120, at: 1.85, c: '#c0c0c0', rank: 2 }, { i: 0, h: 160, at: 2.2, c: C.yellow, rank: 1 }];
  const order = [blocks[1], blocks[2], blocks[0]]; // 2nd | 1st | 3rd
  const lb = ramp(t, 3.0, 0.4), again = pop(t, 3.7);
  return (
    <ArcadeScreen>
      {counter ? (
        <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <PxText size={12} color={C.cyan}>ROUND</PxText>
            <PxText size={56} color={C.yellow} style={{ marginTop: 14, textShadow: glow(C.yellow, 14) }}>{round}/10</PxText>
          </div>
        </div>
      ) : (
        <>
          <PxText size={19} color={C.yellow} style={{ textAlign: 'center', margin: '2px 0 10px', textShadow: glow(C.yellow, 12) }}>GAME OVER!</PxText>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 8, height: 292, marginTop: 14 }}>
            {order.map((b) => {
              const p = pop(t, b.at, 13, 150);
              return (
                <div key={b.i} style={{ width: 100, textAlign: 'center', opacity: p > 0.02 ? 1 : 0 }}>
                  <div style={{ fontSize: b.rank === 1 ? 44 : 34, transform: `translateY(${(1 - p) * -30}px)` }}>{b.rank === 1 ? '👑' : ''}{PLAYERS[b.i].a}</div>
                  <div style={{ fontFamily: VT, fontSize: 22 }}>{PLAYERS[b.i].n}</div>
                  <div style={{ height: b.h * p, background: `linear-gradient(180deg, ${b.c}, ${b.c}aa)`, border: '4px solid #000', borderBottom: 'none', borderRadius: '10px 10px 0 0', display: 'grid', placeItems: 'center', fontFamily: PX, fontSize: 24, color: '#000' }}>{b.rank}</div>
                </div>
              );
            })}
          </div>
          <div style={{ ...card, marginTop: 8, opacity: lb, padding: 8 }}>
            {[[0, 1840], [1, 1710], [3, 1580], [2, 1330]].map(([i, s], k) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, height: 28, fontFamily: VT, fontSize: 22 }}>
                <span style={{ fontFamily: PX, fontSize: 9, color: C.muted, width: 20 }}>{k + 1}</span><span>{PLAYERS[i].a}</span><span style={{ flex: 1 }}>{PLAYERS[i].n}</span><span style={{ fontFamily: PX, fontSize: 9, color: C.yellow }}>{s}</span>
              </div>
            ))}
          </div>
          <Btn label="↻ PLAY AGAIN" bg={C.green} color="#000" h={46} size={12} style={{ marginTop: 14, opacity: again, transform: `scale(${0.8 + 0.2 * again})` }} />
        </>
      )}
    </ArcadeScreen>
  );
}

function ScreenFor({ time }: { time: number }) {
  const at = (n: SceneName) => time - SC(n).a;
  if (time < SC('join').a) {
    const t = at('create');
    if (t < 2.0) return <HubScreen t={t} joinMode={false} />;
    return <ArcadeScreen><LobbyBody t={t} count={1} codeFlip={[2.2, 2.48, 2.76, 3.04]} showBtns={t > 3.5} /></ArcadeScreen>;
  }
  if (time < SC('start').a) {
    const t = at('join');
    if (t < 2.0) return <HubScreen t={t} joinMode />;
    const count = t < 3.0 ? 2 : Math.min(8, 3 + Math.floor((t - 3.0) / 0.4));
    return <ArcadeScreen><LobbyBody t={t + 99} count={count} codeFlip={[0, 0, 0, 0]} showBtns /></ArcadeScreen>;
  }
  if (time < SC('vote').a) {
    const t = at('start');
    return (
      <ArcadeScreen>
        <LobbyBody t={t + 99} count={8} codeFlip={[0, 0, 0, 0]} showBtns start={{ pressed: t >= 1.0 }} />
        <Tap t={t} at={1.0} x={SW / 2} y={540} />
        {t >= 1.5 && (
          <div style={{ position: 'absolute', inset: 0, background: '#12062af0', display: 'grid', placeItems: 'center' }}>
            <div style={{ textAlign: 'center', transform: `scale(${0.6 + pop(t, 1.5, 9, 150) * 0.4 + (1 - pop(t, 1.5, 9, 150)) * 1.2})` }}>
              <PxText size={14} color={C.cyan}>ROUND</PxText>
              <PxText size={44} color={C.yellow} style={{ marginTop: 10, textShadow: glow(C.yellow, 16) }}>1/10</PxText>
              <PxText size={20} color={C.green} style={{ marginTop: 18 }}>GO!</PxText>
            </div>
          </div>
        )}
      </ArcadeScreen>
    );
  }
  if (time < SC('answer').a) return <VoteScreen t={at('vote')} />;
  if (time < SC('score').a) return <AnswerScreen t={at('answer')} />;
  if (time < SC('finish').a) return <ScoreScreen t={at('score')} />;
  return <FinishScreen t={at('finish')} />;
}

function Phone({ time }: { time: number }) {
  const a = SC('create').a, out = SC('cta').a;
  const enter = time < a ? 0 : spring({ frame: Math.round((time - a) * FPS), fps: FPS, config: { damping: 14, stiffness: 110 } });
  const leave = easeOut(clamp01((time - out) / 0.5));
  if (enter <= 0.01 || leave >= 1) return null;
  const W = SW * K + 32, H = SH * K + 32;
  const float = Math.sin(time * 1.6) * 6;
  return (
    <div style={{ position: 'absolute', left: (1080 - W) / 2, top: 196, width: W, height: H, transform: `translateY(${(1 - enter) * 900 + leave * 1100 + float}px) rotate(${(1 - enter) * 6}deg)`, borderRadius: 74, background: '#05010f', border: '8px solid #000', boxShadow: `0 0 0 4px ${C.purple}, 0 0 50px ${C.purple}aa, 0 0 120px ${C.pink}55`, padding: 12 }}>
      <div style={{ position: 'relative', width: SW * K, height: SH * K, borderRadius: 58, overflow: 'hidden', background: C.bg }}>
        <div style={{ position: 'absolute', left: 0, top: 0, width: SW, height: SH, transform: `scale(${K})`, transformOrigin: 'top left' }}>
          <ScreenFor time={time} />
        </div>
        <div style={{ position: 'absolute', top: 12, left: '50%', width: 120, height: 26, marginLeft: -60, borderRadius: 14, background: '#000' }} />
      </div>
    </div>
  );
}

const STEPS: Partial<Record<SceneName, string>> = {
  create: 'STEP 1 · CREATE A ROOM', join: 'STEP 2 · FRIENDS JOIN', start: 'STEP 3 · HOST STARTS', vote: 'STEP 4 · VOTE FAST',
  answer: 'STEP 5 · THE TRUTH', score: 'STEP 6 · SCORE POINTS', finish: 'STEP 7 · CROWN A WINNER',
};
function StepChip({ time }: { time: number }) {
  const sc = (Object.keys(STEPS) as SceneName[]).find((k) => time >= SC(k).a && time < SC(k).b);
  if (!sc) return null;
  const p = pop(time - SC(sc).a, 0.05, 14, 200);
  return (
    <div style={{ position: 'absolute', top: 128, left: 0, right: 0, display: 'flex', justifyContent: 'center', opacity: p, transform: `translateY(${(1 - p) * -30}px)` }}>
      <div style={{ fontFamily: PX, fontSize: 24, color: '#000', background: C.yellow, border: '5px solid #000', borderRadius: 14, padding: '10px 18px', boxShadow: '0 6px 0 #000' }}>{STEPS[sc]}</div>
    </div>
  );
}

/* ───────────────────────── full-screen scenes ───────────────────────── */
function Slam({ t, at, children, from = 3.2 }: { t: number; at: number; children: React.ReactNode; from?: number }) {
  const p = t < at ? 0 : spring({ frame: Math.round((t - at) * FPS), fps: FPS, config: { damping: 9, stiffness: 190 } });
  return <div style={{ opacity: p > 0.02 ? 1 : 0, transform: `scale(${from - (from - 1) * Math.min(1.12, p)})` }}>{children}</div>;
}

function Hook({ t, f }: { t: number; f: number }) {
  const line1 = 'CURI HAS';
  const line2 = 'A SECRET…';
  const typed = Math.floor(Math.max(0, t - 0.3) * 14);
  const jitter = t > 2.0 ? Math.sin(f * 2.3) * 3 : 0;
  const pulse = 1 + Math.sin(t * 9) * 0.04 + (t > 3.2 ? (t - 3.2) * 0.05 : 0);
  const q = ['?', '?', '?'];
  return (
    <AbsoluteFill>
      <div style={{ position: 'absolute', top: 210, left: 0, right: 0, textAlign: 'center' }}>
        <PxText size={92} style={{ textShadow: `0 6px 0 #000, ${glow(C.cyan, 16)}` }}>{line1.slice(0, typed)}</PxText>
        <PxText size={92} color={C.yellow} style={{ marginTop: 16, textShadow: `0 6px 0 #000, ${glow(C.yellow, 16)}` }}>{line2.slice(0, Math.max(0, typed - line1.length))}</PxText>
      </div>
      <div style={{ position: 'absolute', top: 640, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
        <div style={{ position: 'relative', width: 420, height: 420, transform: `scale(${pulse}) translateX(${jitter}px) rotate(${Math.sin(t * 7) * (t > 2 ? 3 : 1)}deg)` }}>
          {[0, 1, 2].map((i) => { const p = ((t * 0.7 + i / 3) % 1); return <div key={i} style={{ position: 'absolute', inset: -p * 160, border: `5px solid ${C.pink}`, borderRadius: 40, opacity: (1 - p) * 0.6 }} />; })}
          <div style={{ position: 'absolute', inset: 0, borderRadius: 36, border: '8px solid #000', background: `linear-gradient(145deg, ${C.purple}, #3b1a7a)`, boxShadow: `${glow(C.purple, 40)}, inset 0 0 60px #0006`, display: 'grid', placeItems: 'center' }}>
            <div style={{ display: 'flex', gap: 8 }}>
              {q.map((c, i) => <span key={i} style={{ fontFamily: PX, fontSize: 130, color: i === Math.floor(f / 5) % 3 ? C.yellow : '#fff', textShadow: `0 8px 0 #000, ${glow(C.cyan, 10)}`, transform: `translateY(${Math.sin(f / 4 + i * 2) * 10}px)` }}>{c}</span>)}
            </div>
          </div>
          <div style={{ position: 'absolute', left: 0, right: 0, bottom: -52, textAlign: 'center', fontSize: 104, filter: `drop-shadow(0 0 18px ${C.pink})` }}>🔒</div>
        </div>
      </div>
      <div style={{ position: 'absolute', top: 1160, left: 0, right: 0, textAlign: 'center' }}>
        <Slam t={t} at={2.0}>
          <PxText size={64} style={{ textShadow: `0 6px 0 #000, ${glow(C.pink, 16)}` }}>GUESS WHAT'S</PxText>
          <PxText size={86} color={C.pink} style={{ marginTop: 14, textShadow: `0 6px 0 #000, ${glow(C.pink, 20)}` }}>DROPPING?</PxText>
        </Slam>
      </div>
    </AbsoluteFill>
  );
}

function Reveal({ t }: { t: number }) {
  const badge1 = pop(t, 1.9, 10, 200), badge2 = pop(t, 3.0, 10, 200);
  return (
    <AbsoluteFill>
      <div style={{ position: 'absolute', top: 250, left: 0, right: 0, textAlign: 'center', opacity: ramp(t, 0.1, 0.3) }}>
        <PxText size={34} color={C.muted}>NEW ON CURI</PxText>
      </div>
      <div style={{ position: 'absolute', top: 360, left: 0, right: 0, textAlign: 'center' }}>
        <Slam t={t} at={0.4}><PxText size={210} color={C.green} style={{ textShadow: `0 12px 0 #000, ${glow(C.green, 30)}` }}>FACT</PxText></Slam>
        <div style={{ opacity: ramp(t, 0.8, 0.2), margin: '6px 0' }}><PxText size={46} color={C.muted}>— OR —</PxText></div>
        <Slam t={t} at={1.0}><PxText size={138} color={C.red} style={{ textShadow: `0 10px 0 #000, ${glow(C.red, 30)}` }}>FICTION</PxText></Slam>
      </div>
      <div style={{ position: 'absolute', top: 1010, left: 0, right: 0, display: 'flex', justifyContent: 'center', transform: `scale(${badge1})`, opacity: badge1 > 0.02 ? 1 : 0 }}>
        <div style={{ fontFamily: PX, fontSize: 56, color: '#000', background: C.yellow, border: '6px solid #000', borderRadius: 18, padding: '16px 30px', boxShadow: `0 8px 0 #000, ${glow(C.yellow, 22)}`, opacity: Math.floor(t * 4) % 2 === 0 || t > 3 ? 1 : 0.85 }}>NEW GAME</div>
      </div>
      <div style={{ position: 'absolute', top: 1180, left: 0, right: 0, textAlign: 'center', transform: `scale(${badge2})`, opacity: badge2 > 0.02 ? 1 : 0 }}>
        <div style={{ display: 'inline-block', fontFamily: PX, fontSize: 50, color: C.cyan, border: `6px solid ${C.cyan}`, borderRadius: 18, padding: '14px 28px', background: '#0a0318', boxShadow: glow(C.cyan, 18) }}>2–8 PLAYERS</div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginTop: 24 }}>
          {PLAYERS.map((p, i) => { const q = pop(t, 3.15 + i * 0.07, 12, 220); return <span key={i} style={{ fontSize: 56, transform: `scale(${q}) translateY(${(1 - q) * 30}px)` }}>{p.a}</span>; })}
        </div>
      </div>
    </AbsoluteFill>
  );
}

function Cta({ t }: { t: number }) {
  const ev = T.event;
  const glowPulse = 18 + Math.sin(t * 5) * 8;
  const link = pop(t, 5.2, 11, 190);
  return (
    <AbsoluteFill>
      <div style={{ position: 'absolute', top: 200, left: 0, right: 0, textAlign: 'center' }}>
        <Slam t={t} at={0.3}>
          <PxText size={74} color="#fff" style={{ textShadow: `0 6px 0 #000, ${glow(C.cyan, 14)}` }}>ROLLING OUT</PxText>
          <PxText size={156} color={C.yellow} style={{ marginTop: 14, textShadow: `0 10px 0 #000, ${glow(C.yellow, 28)}` }}>{ev.friday}</PxText>
        </Slam>
      </div>
      <div style={{ position: 'absolute', top: 650, left: 60, right: 60 }}>
        {(() => { const p = pop(t, 1.6, 11, 170); return (
          <div style={{ transform: `scale(${0.6 + 0.4 * p}) rotate(${(1 - p) * -5}deg)`, opacity: p > 0.02 ? 1 : 0, textAlign: 'center', borderRadius: 26, border: '8px solid #000', background: 'linear-gradient(180deg, #3b1a7a, #1d0a3d)', padding: '34px 20px', boxShadow: `0 10px 0 #000, 0 0 ${glowPulse}px ${C.pink}, 0 0 ${glowPulse * 2.5}px ${C.pink}66` }}>
            <PxText size={50} color={C.pink} style={{ textShadow: `0 5px 0 #000, ${glow(C.pink, 10)}` }}>LIVE GAME NIGHT</PxText>
            <PxText size={64} color="#fff" style={{ marginTop: 26 }}>{ev.friday} {ev.date}</PxText>
            <PxText size={78} color={C.yellow} style={{ marginTop: 18, textShadow: `0 6px 0 #000, ${glow(C.yellow, 16)}` }}>{ev.time} {ev.zone}</PxText>
          </div>
        ); })()}
      </div>
      <div style={{ position: 'absolute', top: 1150, left: 0, right: 0, textAlign: 'center' }}>
        {(() => { const p = pop(t, 4.0, 11, 190); return (
          <div style={{ transform: `scale(${p})`, opacity: p > 0.02 ? 1 : 0 }}><PxText size={46} color={C.green} style={{ textShadow: `0 5px 0 #000, ${glow(C.green, 14)}` }}>BRING YOUR SQUAD 🎮</PxText></div>
        ); })()}
      </div>
      <div style={{ position: 'absolute', top: 1275, left: 0, right: 0, display: 'flex', justifyContent: 'center', transform: `scale(${link})`, opacity: link > 0.02 ? 1 : 0 }}>
        <div style={{ fontFamily: PX, fontSize: 40, color: '#000', background: '#fff', border: '6px solid #000', borderRadius: 18, padding: '14px 26px', boxShadow: `0 7px 0 #000, ${glow('#ffffff', 12)}` }}>🔗 {ev.where}</div>
      </div>
    </AbsoluteFill>
  );
}

/* ───────────────────────── composition ───────────────────────── */
export const FactOrFictionPromo: React.FC = () => {
  const f = useCurrentFrame();
  const time = f / FPS;
  const [sx, sy] = shakeAt(time);
  const inScene = (n: SceneName) => time >= SC(n).a && time < SC(n).b;
  const t = (n: SceneName) => time - SC(n).a;
  const fade = (n: SceneName) => { const x = t(n); return Math.min(1, x / 0.1 + 0.2); };
  return (
    <AbsoluteFill style={{ background: C.bg, overflow: 'hidden' }}>
      <Backdrop f={f} />
      <AbsoluteFill style={{ transform: `translate(${sx}px, ${sy}px)` }}>
        {inScene('hook') && <Hook t={t('hook')} f={f} />}
        {inScene('reveal') && <div style={{ opacity: fade('reveal') }}><Reveal t={t('reveal')} /></div>}
        <StepChip time={time} />
        <Phone time={time} />
        {inScene('cta') && <div style={{ opacity: fade('cta') }}><Cta t={t('cta')} /></div>}
      </AbsoluteFill>
      <Confetti time={time} />
      <Hud f={f} />
      <Caption time={time} />
      <Flash time={time} />
      <Crt f={f} />
      <Audio src={staticFile('audio/fof-promo-music.wav')} volume={0.34} />
      <Audio src={staticFile('audio/fof-promo-sfx.wav')} volume={0.9} />
      {VO.clips.map((c) => (
        <Sequence key={c.id} from={Math.round(c.at * FPS)}><Audio src={staticFile(`audio/${c.file}`)} volume={1} /></Sequence>
      ))}
    </AbsoluteFill>
  );
};
