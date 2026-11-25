import React from 'react';
import { AbsoluteFill, Audio, Easing, Img, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { COLORS, FONTS } from './brand';
import { SoftBg, Typewriter } from './CuriWord';

/**
 * "Curi tour": ~30s vertical social video, same skeleton as the reference reel
 * (relatable hook -> typewriter + marker highlight -> bar wipe -> bold scenes -> price card),
 * but each feature scene shows the real app screens in a phone.
 * 1080x1920, 30fps, 912 frames. Timeline is mirrored in scripts/make-curi-tour-sfx.mjs.
 */

const W = 1080;
const H = 1920;
const HOOK_END = 120;
const P_END = 216;
const BARS_IN = 198;
const BARS_OUT = 218;
const FEAT_LEN = 96;
const END_AT = 792;
const TOTAL = 912;

const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));
const ease = Easing.out(Easing.cubic);

/* ======================= HOOK: a chat where you can't find the words ======================= */
const ROWS = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'];

function typedAt(f: number): { text: string; key: string | null; field: boolean } {
  const A = 'It went really... really';
  const B = 'it was good';
  if (f < 14) return { text: '', key: null, field: true };
  if (f < 56) { const n = clamp(Math.floor((f - 14) * 0.6), 0, A.length); return { text: A.slice(0, n), key: A[n - 1]?.toLowerCase() ?? null, field: true }; }
  if (f < 68) { const n = clamp(A.length - Math.floor((f - 56) * 2), 0, A.length); return { text: A.slice(0, n), key: null, field: true }; }
  if (f < 72) return { text: '', key: null, field: true };
  if (f < 90) { const n = clamp(Math.floor((f - 72) * 0.8), 0, B.length); return { text: B.slice(0, n), key: B[n - 1]?.toLowerCase() ?? null, field: true }; }
  return { text: '', key: null, field: false };
}

function Bubble({ side, children, born, f, top, shake = 0 }: { side: 'l' | 'r'; children: React.ReactNode; born: number; f: number; top: number; shake?: number }) {
  const { fps } = useVideoConfig();
  const s = spring({ frame: f - born, fps, config: { damping: 13, stiffness: 190 } });
  if (f < born) return null;
  return (
    <div style={{ position: 'absolute', top, [side === 'l' ? 'left' : 'right']: 64, maxWidth: 700, padding: '30px 44px', borderRadius: 48, borderBottomLeftRadius: side === 'l' ? 12 : 48, borderBottomRightRadius: side === 'r' ? 12 : 48, background: side === 'l' ? '#FFFFFF' : COLORS.night, color: side === 'l' ? COLORS.night : '#fff', fontFamily: FONTS.ui, fontWeight: 500, fontSize: 54, lineHeight: 1.25, letterSpacing: -1, boxShadow: '0 6px 22px rgba(18,25,31,.10)', transformOrigin: side === 'l' ? 'left bottom' : 'right bottom', transform: `translateX(${shake}px) scale(${0.6 + s * 0.4})`, opacity: clamp(s * 2, 0, 1) }}>
      {children}
    </div>
  );
}

function Hook({ f }: { f: number }) {
  const { fps } = useVideoConfig();
  const { text, key, field } = typedAt(f);
  const cap = spring({ frame: f - 2, fps, config: { damping: 16, stiffness: 140 } });
  const pill = spring({ frame: f - 104, fps, config: { damping: 14, stiffness: 150 } });
  const hesitating = f >= 44 && f < 56;
  const shake = f > 103 ? Math.sin(f * 2.4) * 8 * Math.exp(-(f - 103) / 9) : 0;
  const sugg = f < 56 ? ['great', 'good', 'nice'] : ['good', 'it', 'I'];
  const cursor = Math.floor(f / 8) % 2 === 0;
  return (
    <AbsoluteFill style={{ background: '#F3EFE8' }}>
      <div style={{ position: 'absolute', left: 60, right: 60, top: 130, textAlign: 'center', opacity: clamp(cap * 1.6, 0, 1), transform: `translateY(${(1 - cap) * 36}px)`, fontFamily: FONTS.ui, fontWeight: 800, fontSize: 70, lineHeight: 1.1, letterSpacing: -2, color: COLORS.night }}>
        Your brain,<br /><span style={{ color: COLORS.ember }}>mid-conversation</span>
      </div>

      <Bubble side="l" born={4} f={f} top={380}>How did the presentation go?</Bubble>
      <Bubble side="r" born={90} f={f} top={620}>it was good</Bubble>
      <Bubble side="l" born={100} f={f} top={800} shake={shake}>…that's it? just “good”?</Bubble>

      {/* input field */}
      <div style={{ position: 'absolute', left: 40, right: 140, top: 1180, height: 100, borderRadius: 50, background: '#fff', border: '2px solid #E2DCD0', padding: '0 38px', display: 'flex', alignItems: 'center', fontFamily: FONTS.ui, fontSize: 48, color: COLORS.night, letterSpacing: -0.5, transform: hesitating ? `translateX(${Math.sin(f * 5) * 3}px)` : undefined }}>
        {field && text.length === 0 && <span style={{ color: '#A7A196' }}>Message</span>}
        <span style={{ whiteSpace: 'pre' }}>{text}</span>
        <span style={{ display: 'inline-block', width: 4, height: 54, marginLeft: 3, background: COLORS.ember, opacity: cursor ? 1 : 0 }} />
      </div>
      <div style={{ position: 'absolute', right: 36, top: 1180, width: 100, height: 100, borderRadius: 50, background: text.length ? COLORS.ember : '#D9D3C7', display: 'flex', alignItems: 'center', justifyContent: 'center', transform: f >= 89 && f < 93 ? 'scale(0.88)' : undefined }}>
        <svg width={44} height={44} viewBox="0 0 24 24"><path d="M12 19V5M5 12l7-7 7 7" stroke="#fff" strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </div>

      {/* keyboard */}
      <div style={{ position: 'absolute', left: 0, right: 0, top: 1330, bottom: 0, background: '#D4D7DD' }}>
        <div style={{ display: 'flex', height: 84, alignItems: 'center', borderBottom: '2px solid #C3C7CE', fontFamily: FONTS.ui, fontSize: 40, color: COLORS.night }}>
          {sugg.map((s, i) => (
            <div key={s} style={{ flex: 1, textAlign: 'center', borderLeft: i ? '2px solid #C3C7CE' : undefined, fontWeight: hesitating && i < 2 ? 700 : 400, color: hesitating && i < 2 ? COLORS.ember : COLORS.night }}>{s}</div>
          ))}
        </div>
        <div style={{ marginTop: 22, display: 'flex', flexDirection: 'column', gap: 18, alignItems: 'center' }}>
          {ROWS.map((row) => (
            <div key={row} style={{ display: 'flex', gap: 10 }}>
              {row.split('').map((c) => (
                <div key={c} style={{ width: 92, height: 118, borderRadius: 14, background: key === c ? '#fff' : '#FDFDFE', boxShadow: '0 4px 0 #A6ABB4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONTS.ui, fontSize: 48, color: COLORS.night, transform: key === c ? 'translateY(-12px) scale(1.12)' : undefined, zIndex: key === c ? 2 : 0 }}>{key === c ? c.toUpperCase() : c}</div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {f >= 104 && (
        <div style={{ position: 'absolute', left: 0, right: 0, top: 1040, textAlign: 'center', opacity: pill, transform: `scale(${0.85 + pill * 0.15})` }}>
          <span style={{ display: 'inline-block', background: COLORS.night, color: '#fff', fontFamily: FONTS.ui, fontWeight: 600, fontSize: 46, padding: '20px 44px', borderRadius: 30, boxShadow: `0 9px 0 ${COLORS.ember}` }}>Sound familiar?</span>
        </div>
      )}
    </AbsoluteFill>
  );
}

/* ======================= SCENE 2: the problem ======================= */
function Problem({ local, frame }: { local: number; frame: number }) {
  return (
    <AbsoluteFill>
      <SoftBg frame={frame} />
      <Typewriter
        local={local} start={6} cps={30} size={102} top={560} color={COLORS.night} markerBg="#F6B8A2" markerInk={COLORS.night}
        lines={[
          [{ t: 'Knowing a' }],
          [{ t: 'word', hl: true }, { t: ' is the' }],
          [{ t: 'first step.' }],
          [{ t: 'Remembering', hl: true }],
          [{ t: 'it is the' }],
          [{ t: 'hard part.' }],
        ]}
      />
    </AbsoluteFill>
  );
}

/* ======================= FEATURE scenes: headline + real app screens in a phone ======================= */
type Chip = { t: string; right?: boolean; y: number; delay: number; rot: number; accent?: boolean };
type Feat = { dark: boolean; lines: { t: string; hl?: boolean }[][]; shots: string[]; chips: Chip[] };

const FEATS: Feat[] = [
  {
    dark: true, shots: ['10-home-top'],
    lines: [[{ t: 'Curi gives you' }], [{ t: 'a ' }, { t: 'daily dose', hl: true }], [{ t: 'of learning.' }]],
    chips: [{ t: 'About 5 minutes', y: 980, delay: 34, rot: -4 }, { t: '2 words · 1 fact · 1 quiz', right: true, y: 1250, delay: 50, rot: 3, accent: true }],
  },
  {
    dark: false, shots: ['14-learn-word', '15-learn-fact'],
    lines: [[{ t: 'Learn ' }, { t: 'new words', hl: true }], [{ t: 'and ' }, { t: 'fun facts', hl: true }], [{ t: 'every day.' }]],
    chips: [{ t: 'Meaning + example', y: 1380, delay: 30, rot: -3 }, { t: 'Save it to review', right: true, y: 1560, delay: 46, rot: 4, accent: true }],
  },
  {
    dark: true, shots: ['13-daily-challenge', '12-play-hub'],
    lines: [[{ t: 'Test yourself' }], [{ t: 'with ' }, { t: 'quizzes', hl: true }], [{ t: 'and ' }, { t: 'word duels.', hl: true }]],
    chips: [{ t: '5 words. One try.', y: 1010, delay: 30, rot: -4 }, { t: 'Word Duel · Fact or Fiction', right: true, y: 1480, delay: 60, rot: 3, accent: true }],
  },
  {
    dark: false, shots: ['17-progress-xp-streak'],
    lines: [[{ t: 'Build a ' }, { t: 'streak.', hl: true }], [{ t: 'Earn ' }, { t: 'XP.', hl: true }], [{ t: 'Every single day.' }]],
    chips: [{ t: '12 day streak', y: 940, delay: 30, rot: -4, accent: true }, { t: 'Shields protect it', right: true, y: 1020, delay: 48, rot: 3 }],
  },
  {
    dark: true, shots: ['21-leaderboard-weekly'],
    lines: [[{ t: 'Climb the' }], [{ t: 'weekly board', hl: true }], [{ t: 'Win ' }, { t: 'real cash.', hl: true }]],
    chips: [{ t: '1st  ₦2,500', y: 1180, delay: 30, rot: -4, accent: true }, { t: '2nd  ₦1,500', right: true, y: 1310, delay: 40, rot: 3 }, { t: '3rd  ₦1,000', y: 1440, delay: 50, rot: -3 }],
  },
  {
    dark: false, shots: ['20-friends-board', '19-profile-pebble-shelf'],
    lines: [[{ t: 'Add ' }, { t: 'friends.', hl: true }], [{ t: 'Collect ' }, { t: 'pebbles.', hl: true }], [{ t: 'Keep it fun.' }]],
    chips: [{ t: 'Streak buddies', y: 1000, delay: 30, rot: -4 }, { t: 'Earn badges', right: true, y: 1420, delay: 60, rot: 3, accent: true }],
  },
];

function Phone({ shots, local, idx }: { shots: string[]; local: number; idx: number }) {
  const { fps } = useVideoConfig();
  const rise = spring({ frame: local, fps, config: { damping: 15, stiffness: 95, mass: 0.9 } });
  const y = (1 - rise) * 900;
  const tilt = (1 - rise) * (idx % 2 ? 6 : -6);
  const float = Math.sin(local / 16) * 6;
  const swapAt = 54;
  const second = shots.length > 1 ? clamp((local - swapAt) / 8, 0, 1) : 0;
  return (
    <div style={{ position: 'absolute', left: (W - 600) / 2, top: 640, width: 600, height: 1266, borderRadius: 74, background: COLORS.night, padding: 14, boxShadow: '0 40px 90px rgba(18,25,31,.35)', transform: `translateY(${y + float}px) rotate(${tilt}deg)` }}>
      <div style={{ position: 'relative', width: 572, height: 1238, borderRadius: 62, overflow: 'hidden', background: '#F6F4EF' }}>
        <Img src={staticFile(`screenshots/${shots[0]}.png`)} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} />
        {shots[1] && <Img src={staticFile(`screenshots/${shots[1]}.png`)} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top', opacity: second, transform: `translateY(${(1 - second) * 40}px)` }} />}
      </div>
    </div>
  );
}

function ChipEl({ c, local }: { c: Chip; local: number }) {
  const { fps } = useVideoConfig();
  const s = spring({ frame: local - c.delay, fps, config: { damping: 11, stiffness: 190 } });
  if (local < c.delay) return null;
  return (
    <div style={{ position: 'absolute', top: c.y, [c.right ? 'right' : 'left']: 34, transform: `scale(${s}) rotate(${c.rot}deg)`, transformOrigin: c.right ? 'right center' : 'left center', background: c.accent ? COLORS.ember : COLORS.night, color: '#fff', fontFamily: FONTS.ui, fontWeight: 700, fontSize: 44, padding: '20px 36px', borderRadius: 28, boxShadow: `0 8px 0 ${c.accent ? COLORS.night : COLORS.ember}, 0 18px 40px rgba(0,0,0,.25)`, whiteSpace: 'nowrap', border: c.accent ? '3px solid rgba(255,255,255,.35)' : '3px solid rgba(255,255,255,.18)' }}>
      {c.t}
    </div>
  );
}

function Feature({ feat, idx, local, frame }: { feat: Feat; idx: number; local: number; frame: number }) {
  return (
    <AbsoluteFill>
      {feat.dark ? (
        <AbsoluteFill style={{ background: `linear-gradient(180deg, ${COLORS.emberBright} 0%, ${COLORS.ember} 100%)` }}>
          <div style={{ position: 'absolute', left: -260, top: 1100, fontFamily: FONTS.display, fontWeight: 800, fontSize: 900, lineHeight: 1, color: '#fff', opacity: 0.07, letterSpacing: -30 }}>Curi</div>
        </AbsoluteFill>
      ) : <SoftBg frame={frame} />}
      <Typewriter
        local={local} start={6} cps={26} size={90} top={190} left={80} lh={1.24}
        color={feat.dark ? '#FFFFFF' : COLORS.night} markerBg={feat.dark ? '#FFF6E6' : '#F6B8A2'} markerInk={COLORS.night} lines={feat.lines}
      />
      <Phone shots={feat.shots} local={local} idx={idx} />
      {feat.chips.map((c) => <ChipEl key={c.t} c={c} local={local} />)}
    </AbsoluteFill>
  );
}

/* ======================= bars wipe ======================= */
function Bars({ frame }: { frame: number }) {
  const n = 7;
  const shades = ['#E8472A', '#D9391D', '#F0583A', '#C73B20', '#E24022', '#D3361B', '#EC4E30'];
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      {Array.from({ length: n }).map((_, i) => {
        const inP = ease(clamp((frame - BARS_IN - i * 2) / 12, 0, 1));
        const outP = Easing.in(Easing.cubic)(clamp((frame - BARS_OUT - (n - i) * 1.5) / 12, 0, 1));
        const top = outP * H;
        const bottom = H - inP * H;
        return <div key={i} style={{ position: 'absolute', left: (W / n) * i - 1, width: W / n + 2, top: Math.max(top, 0), height: Math.max(H - bottom - top, 0), background: shades[i] }} />;
      })}
    </AbsoluteFill>
  );
}

/* ======================= END CARD ======================= */
function EndCard({ local, frame }: { local: number; frame: number }) {
  const { fps } = useVideoConfig();
  const pop = (d: number, damp = 13) => spring({ frame: local - d, fps, config: { damping: damp, stiffness: 150 } });
  const logo = pop(0, 10);
  const a = pop(8), b = pop(16, 9), c = pop(24), sub = pop(40), url = pop(56);
  const rise = (v: number) => ({ opacity: clamp(v * 1.6, 0, 1), transform: `translateY(${(1 - v) * 46}px)` });
  const tags = ['Words', 'Facts', 'Quizzes', 'Streaks', 'Prizes'];
  return (
    <AbsoluteFill style={{ fontFamily: FONTS.ui }}>
      <SoftBg frame={frame} />
      <div style={{ position: 'absolute', left: 540 - 85, top: 400, width: 170, height: 170, borderRadius: 40, background: '#fff', overflow: 'hidden', boxShadow: '0 18px 48px rgba(199,59,32,.22)', transform: `scale(${logo}) rotate(${(1 - logo) * -14}deg)` }}>
        <Img src={staticFile('curi-icon.png')} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 640, textAlign: 'center', fontWeight: 600, color: COLORS.night, letterSpacing: -5 }}>
        <div style={{ fontSize: 138, lineHeight: 1.02, ...rise(a) }}>All for</div>
        <div style={{ fontSize: 250, lineHeight: 1.0, fontWeight: 800, color: COLORS.ember, letterSpacing: -8, transform: `translateY(${(1 - b) * 46}px) scale(${0.8 + b * 0.2})`, opacity: clamp(b * 1.6, 0, 1) }}>₦0</div>
        <div style={{ fontSize: 138, lineHeight: 1.02, ...rise(c) }}>per month</div>
      </div>
      <div style={{ position: 'absolute', left: 70, right: 70, top: 1250, textAlign: 'center', display: 'flex', flexWrap: 'nowrap', gap: 10, justifyContent: 'center', ...rise(sub) }}>
        {tags.map((t) => <span key={t} style={{ background: COLORS.emberTint, color: COLORS.ember, fontWeight: 700, fontSize: 34, padding: '10px 22px', borderRadius: 999 }}>{t}</span>)}
      </div>
      <div style={{ position: 'absolute', left: 90, right: 90, top: 1400, textAlign: 'center', fontWeight: 500, fontSize: 44, lineHeight: 1.3, letterSpacing: -0.5, color: COLORS.inkSoft, ...rise(sub) }}>
        Two minutes a day. Learn, earn XP, win weekly prizes.
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 190, textAlign: 'center', opacity: url, transform: `scale(${0.85 + url * 0.15})` }}>
        <span style={{ display: 'inline-block', background: COLORS.night, color: '#fff', fontWeight: 600, fontSize: 46, padding: '24px 52px', borderRadius: 32, boxShadow: `0 10px 0 ${COLORS.ember}` }}>trycuri.app</span>
      </div>
    </AbsoluteFill>
  );
}

export const CuriTour: React.FC = () => {
  const frame = useCurrentFrame();
  const fi = Math.floor((frame - P_END) / FEAT_LEN);
  return (
    <AbsoluteFill style={{ background: '#FBE9DF', overflow: 'hidden' }}>
      <Audio src={staticFile('audio/curi-tour-music.wav')} volume={0.5} />
      <Audio src={staticFile('audio/curi-tour-sfx.wav')} />
      {frame < HOOK_END && <Hook f={frame} />}
      {frame >= HOOK_END && frame < P_END && <Problem local={frame - HOOK_END} frame={frame} />}
      {frame >= P_END && frame < END_AT && fi >= 0 && fi < FEATS.length && (
        <Feature key={fi} feat={FEATS[fi]} idx={fi} local={frame - P_END - fi * FEAT_LEN} frame={frame} />
      )}
      {frame >= END_AT && <EndCard local={frame - END_AT} frame={frame} />}
      {frame >= BARS_IN && frame < BARS_OUT + 30 && <Bars frame={frame} />}
    </AbsoluteFill>
  );
};

export const TOUR_FRAMES = TOTAL;
