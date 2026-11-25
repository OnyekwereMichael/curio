import React from 'react';
import { AbsoluteFill, Audio, Easing, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { COLORS, FONTS } from './brand';

/**
 * "Curi in 14 seconds": vertical social video modelled on a reference reel.
 * Structure: funny hook -> typewriter scene with marker highlight -> bar wipe -> bold typewriter scene -> price/tagline card.
 * 1080x1920, 30fps, 420 frames.
 */

const W = 1080;
const H = 1920;
const S2 = 120; // scene 2 starts (4.0s)
const S3 = 222; // scene 3 starts (7.4s)
const S4 = 336; // end card starts (11.2s)
const BARS_IN = 204;
const BARS_OUT = 224;

const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));

/* ---------- soft animated backdrop (the reference has a pale, cloudy light-blue wash) ---------- */
export function SoftBg({ frame, tint = COLORS.emberTint }: { frame: number; tint?: string }) {
  const blobs = [
    { x: 200, y: 400, r: 560, c: tint, p: 0 },
    { x: 900, y: 1000, r: 620, c: COLORS.goldTint, p: 2 },
    { x: 300, y: 1600, r: 600, c: tint, p: 4 },
  ];
  return (
    <AbsoluteFill style={{ background: 'linear-gradient(180deg,#FFFAF3 0%,#FBF0E6 55%,#FFF7EA 100%)' }}>
      {blobs.map((b, i) => (
        <div key={i} style={{ position: 'absolute', left: b.x - b.r + Math.sin(frame / 55 + b.p) * 50, top: b.y - b.r + Math.cos(frame / 70 + b.p) * 60, width: b.r * 2, height: b.r * 2, borderRadius: '50%', background: `radial-gradient(circle, ${b.c} 0%, ${b.c}00 68%)`, opacity: 0.85 }} />
      ))}
    </AbsoluteFill>
  );
}

/* ---------- typewriter text with a hand-drawn marker swipe on the key words ---------- */
type Seg = { t: string; hl?: boolean };
export function Typewriter({ lines, local, start, cps, size, color, markerBg, markerInk, lh = 1.26, left = 96, top }: {
  lines: Seg[][]; local: number; start: number; cps: number; size: number; color: string; markerBg: string; markerInk: string; lh?: number; left?: number; top: number;
}) {
  const count = Math.max(0, (local - start) * (cps / 30));
  let idx = 0;
  return (
    <div style={{ position: 'absolute', left, right: left, top, fontFamily: FONTS.ui, fontWeight: 700, fontSize: size, lineHeight: lh, letterSpacing: -size * 0.03, color }}>
      {lines.map((line, li) => (
        <div key={li} style={{ whiteSpace: 'pre', height: size * lh }}>
          {line.map((seg, si) => {
            const from = idx;
            idx += seg.t.length;
            const vis = clamp(Math.floor(count - from), 0, seg.t.length);
            const shown = seg.t.slice(0, vis);
            const hidden = seg.t.slice(vis);
            // marker sweeps in slightly ahead of the typing so it reads as being drawn
            const sweep = seg.hl ? clamp((count - from + 1.5) / (seg.t.length + 1), 0, 1) : 0;
            return (
              <span key={si} style={{ position: 'relative', display: 'inline-block', isolation: 'isolate', color: seg.hl ? markerInk : undefined }}>
                {seg.hl && (
                  <span style={{ position: 'absolute', left: -7, right: -5, top: size * 0.12, bottom: size * 0.02, background: markerBg, clipPath: 'polygon(0% 14%, 100% 0%, 97% 100%, 3% 90%)', transformOrigin: 'left center', transform: `scaleX(${Easing.out(Easing.quad)(sweep)})`, borderRadius: 6, zIndex: -1 }} />
                )}
                <span>{shown}</span>
                <span style={{ opacity: 0 }}>{hidden}</span>
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
}

/* ---------- HOOK: presenter goes blank mid-sentence ---------- */
function Presenter({ f }: { f: number }) {
  const t = f / 30;
  const blank = f > 74; // after the stamp lands the face goes fully dead
  const pupilX = blank ? 0 : Math.sin(t * 7.5) * 9;
  const pupilY = blank ? 3 : Math.cos(t * 5) * 3;
  const mouthOpen = blank ? 6 : 10 + Math.abs(Math.sin(t * 9)) * 22;
  const browTilt = blank ? 0 : 11 + Math.sin(t * 6) * 3;
  const bob = Math.sin(t * 4) * 3;
  const drops = [0, 1, 2].map((i) => {
    const p = ((f * 0.045 + i / 3) % 1);
    return { x: 395 + i * 130 + (i === 1 ? 30 : 0), y: 905 + p * 150, o: Math.sin(p * Math.PI) * 0.9 };
  });
  return (
    <g transform={`translate(0 ${bob})`}>
      {/* torso */}
      <path d="M300 1500 L320 1180 Q540 1110 760 1180 L780 1500 Z" fill={COLORS.ink} />
      <path d="M470 1140 L540 1300 L610 1140 Z" fill="#FFFDF9" />
      <path d="M525 1190 L555 1190 L565 1320 L540 1350 L515 1320 Z" fill={COLORS.ember} />
      {/* neck + head */}
      <rect x={496} y={1090} width={88} height={70} fill="#D49D74" />
      <circle cx={540} cy={980} r={150} fill="#E2AE86" />
      <path d="M390 940 Q400 820 540 815 Q680 820 690 940 Q640 880 540 878 Q440 880 390 940Z" fill="#2A2420" />
      {/* cheeks, eyes, brows */}
      <circle cx={455} cy={1030} r={26} fill="#E4806A" opacity={0.45} />
      <circle cx={625} cy={1030} r={26} fill="#E4806A" opacity={0.45} />
      {[-1, 1].map((s) => (
        <g key={s}>
          <circle cx={540 + s * 62} cy={965} r={34} fill="#FFFFFF" />
          <circle cx={540 + s * 62 + pupilX} cy={965 + pupilY} r={13} fill={COLORS.night} />
          <rect x={540 + s * 62 - 36} y={915} width={72} height={10} rx={5} fill="#2A2420" transform={`rotate(${s * -browTilt} ${540 + s * 62} 920)`} />
        </g>
      ))}
      {/* mouth */}
      <ellipse cx={540} cy={1060} rx={blank ? 36 : 30} ry={mouthOpen} fill="#6E2A22" />
      {/* sweat */}
      {drops.map((d, i) => <path key={i} d={`M${d.x} ${d.y} q-12 22 0 30 q12 -8 0 -30z`} fill="#8FD0F0" opacity={blank ? 0 : d.o} />)}
      {/* arms */}
      <rect x={250} y={1250} width={110} height={250} rx={50} fill="#222F3C" transform={`rotate(${12 + Math.sin(t * 9) * 5} 305 1260)`} />
      <rect x={720} y={1250} width={110} height={250} rx={50} fill="#222F3C" transform={`rotate(${-12 - Math.sin(t * 9 + 1) * 5} 775 1260)`} />
    </g>
  );
}

function Bubble({ f }: { f: number }) {
  const lines: [number, string][] = [[8, 'The results were…'], [34, 'very… uh… the…'], [58, 'thing?? big??']];
  const pop = spring({ frame: f - 6, fps: 30, config: { damping: 14, stiffness: 160 } });
  const jitter = f > 40 && f < 74 ? Math.sin(f * 2.7) * 4 : 0;
  return (
    <g transform={`translate(${jitter} 0) translate(540 700) scale(${pop}) translate(-540 -700)`} opacity={clamp(pop * 2, 0, 1)}>
      <rect x={110} y={480} width={860} height={320} rx={60} fill="#FFFFFF" stroke={COLORS.ink} strokeWidth={6} />
      <path d="M470 796 L520 876 L560 796 Z" fill="#FFFFFF" stroke={COLORS.ink} strokeWidth={6} strokeLinejoin="round" />
      <rect x={462} y={790} width={106} height={14} fill="#FFFFFF" />
      {lines.map(([start, txt], i) => {
        const n = clamp(Math.floor((f - start) * 0.9), 0, txt.length);
        return (
          <text key={i} x={160} y={580 + i * 90} fontFamily={FONTS.ui} fontWeight={700} fontSize={62} fill={i === 2 ? COLORS.ember : COLORS.ink}>
            {txt.slice(0, n)}
          </text>
        );
      })}
    </g>
  );
}

function Hook({ f }: { f: number }) {
  const { fps } = useVideoConfig();
  // camera shake that kicks in when the stamp slams down
  const k = f >= 74 ? Math.exp(-(f - 74) / 7) : 0;
  const sx = Math.sin(f * 3.1) * 22 * k;
  const sy = Math.cos(f * 4.3) * 18 * k;
  const stamp = spring({ frame: f - 74, fps, config: { damping: 9, stiffness: 220, mass: 0.7 } });
  const cap = spring({ frame: f - 2, fps, config: { damping: 16, stiffness: 140 } });
  const pill = spring({ frame: f - 94, fps, config: { damping: 14, stiffness: 150 } });
  const zoom = 1 + f * 0.0004;
  return (
    <AbsoluteFill style={{ overflow: 'hidden', background: '#EFE2D2' }}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: 'absolute' }}>
        <defs>
          <linearGradient id="wall" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#F3E7D8" /><stop offset="1" stopColor="#E6D4BF" />
          </linearGradient>
        </defs>
        <g transform={`translate(${sx} ${sy}) translate(540 1000) scale(${zoom}) translate(-540 -1000)`}>
          <rect x={-60} y={-60} width={W + 120} height={H + 120} fill="url(#wall)" />
          {/* projector screen with a blank slide */}
          <rect x={150} y={1180} width={0} height={0} />
          <rect x={0} y={1560} width={W} height={400} fill="#BFA689" />
          <Presenter f={f} />
          {/* podium */}
          <path d="M200 1420 L880 1420 L850 1760 L230 1760 Z" fill="#8A6A4B" />
          <rect x={180} y={1396} width={720} height={34} rx={10} fill="#A07D5A" />
          <text x={540} y={1610} textAnchor="middle" fontFamily={FONTS.ui} fontWeight={800} fontSize={54} fill="#F3E7D8" letterSpacing={6}>Q4 REVIEW</text>
          <Bubble f={f} />
        </g>
      </svg>

      {/* caption */}
      <div style={{ position: 'absolute', left: 60, right: 60, top: 150, textAlign: 'center', opacity: clamp(cap * 1.6, 0, 1), transform: `translateY(${(1 - cap) * 40}px)`, fontFamily: FONTS.ui, fontWeight: 800, fontSize: 76, lineHeight: 1.1, letterSpacing: -2, color: COLORS.night }}>
        POV: your mind goes <span style={{ color: COLORS.ember }}>blank</span> mid-sentence
      </div>

      {/* stamp */}
      {f >= 74 && (
        <div style={{ position: 'absolute', left: 0, right: 0, top: 1090, display: 'flex', justifyContent: 'center', transform: `scale(${interpolate(stamp, [0, 1], [3.2, 1])}) rotate(-7deg)`, opacity: clamp(stamp * 3, 0, 1) }}>
          <div style={{ border: `12px solid ${COLORS.ember}`, borderRadius: 24, padding: '16px 40px', background: 'rgba(255,253,249,.94)', textAlign: 'center', boxShadow: `0 14px 0 ${COLORS.night}` }}>
            <div style={{ fontFamily: FONTS.ui, fontWeight: 800, fontSize: 112, lineHeight: 1, letterSpacing: -3, color: COLORS.ember }}>WORD</div>
            <div style={{ fontFamily: FONTS.ui, fontWeight: 800, fontSize: 112, lineHeight: 1, letterSpacing: -3, color: COLORS.ember }}>NOT FOUND</div>
            <div style={{ fontFamily: FONTS.mono, fontWeight: 700, fontSize: 38, marginTop: 8, color: COLORS.night }}>ERROR 404</div>
          </div>
        </div>
      )}

      {f >= 94 && (
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 60, textAlign: 'center', opacity: pill, transform: `scale(${0.85 + pill * 0.15})` }}>
          <span style={{ display: 'inline-block', background: COLORS.night, color: '#fff', fontFamily: FONTS.ui, fontWeight: 600, fontSize: 46, padding: '22px 46px', borderRadius: 30, boxShadow: `0 9px 0 ${COLORS.ember}` }}>Sound familiar?</span>
        </div>
      )}
    </AbsoluteFill>
  );
}

/* ---------- SCENE 2: pale, typed text, one marker highlight each on "word" and "remember" ---------- */
function Scene2({ local, frame }: { local: number; frame: number }) {
  return (
    <AbsoluteFill>
      <SoftBg frame={frame} />
      <Typewriter
        local={local} start={6} cps={30} size={102} top={560} color={COLORS.night} markerBg="#F6B8A2" markerInk={COLORS.night}
        lines={[
          [{ t: 'Knowing a' }],
          [{ t: 'word', hl: true }, { t: ' is the' }],
          [{ t: 'first step.' }],
          [{ t: 'You still need' }],
          [{ t: 'a way to' }],
          [{ t: 'remember', hl: true }, { t: ' it.' }],
        ]}
      />
    </AbsoluteFill>
  );
}

/* ---------- SCENE 3: bold ember, white text, cream marker ---------- */
function Scene3({ local }: { local: number }) {
  return (
    <AbsoluteFill style={{ background: `linear-gradient(180deg, ${COLORS.emberBright} 0%, ${COLORS.ember} 100%)` }}>
      <div style={{ position: 'absolute', left: -260, top: 1180, fontFamily: FONTS.display, fontWeight: 800, fontSize: 900, lineHeight: 1, color: '#fff', opacity: 0.07, letterSpacing: -30 }}>Curi</div>
      <Typewriter
        local={local} start={8} cps={26} size={118} top={600} color="#FFFFFF" markerBg="#FFF6E6" markerInk={COLORS.night}
        lines={[
          [{ t: 'Curi gives' }],
          [{ t: 'you a' }],
          [{ t: 'new word', hl: true }],
          [{ t: 'every day', hl: true }],
          [{ t: 'that ' }, { t: 'sticks.', hl: true }],
        ]}
      />
    </AbsoluteFill>
  );
}

/* ---------- vertical bars: cover the screen, then retract upwards to reveal the next scene ---------- */
function Bars({ frame }: { frame: number }) {
  const n = 7;
  const shades = ['#E8472A', '#D9391D', '#F0583A', '#C73B20', '#E24022', '#D3361B', '#EC4E30'];
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      {Array.from({ length: n }).map((_, i) => {
        const inP = Easing.out(Easing.cubic)(clamp((frame - BARS_IN - i * 2) / 12, 0, 1));
        const outP = Easing.in(Easing.cubic)(clamp((frame - BARS_OUT - (n - i) * 1.5) / 12, 0, 1));
        const top = outP * H;
        const bottom = H - inP * H;
        return <div key={i} style={{ position: 'absolute', left: (W / n) * i - 1, width: W / n + 2, top: Math.max(top, 0), height: Math.max(H - bottom - top, 0), background: shades[i] }} />;
      })}
    </AbsoluteFill>
  );
}

/* ---------- END CARD: "All for ₦0 per month" ---------- */
function EndCard({ local, frame }: { local: number; frame: number }) {
  const { fps } = useVideoConfig();
  const pop = (d: number, damp = 13) => spring({ frame: local - d, fps, config: { damping: damp, stiffness: 150 } });
  const logo = pop(0, 10);
  const a = pop(8), b = pop(16, 9), c = pop(24), sub = pop(40), url = pop(54);
  const rise = (v: number) => ({ opacity: clamp(v * 1.6, 0, 1), transform: `translateY(${(1 - v) * 46}px)` });
  return (
    <AbsoluteFill style={{ fontFamily: FONTS.ui }}>
      <SoftBg frame={frame} />
      <div style={{ position: 'absolute', left: 540 - 85, top: 470, width: 170, height: 170, borderRadius: 40, background: '#fff', overflow: 'hidden', boxShadow: '0 18px 48px rgba(199,59,32,.22)', transform: `scale(${logo}) rotate(${(1 - logo) * -14}deg)` }}>
        <Img src={staticFile('curi-icon.png')} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 700, textAlign: 'center', fontWeight: 600, color: COLORS.night, letterSpacing: -5 }}>
        <div style={{ fontSize: 138, lineHeight: 1.02, ...rise(a) }}>All for</div>
        <div style={{ fontSize: 250, lineHeight: 1.0, fontWeight: 800, color: COLORS.ember, letterSpacing: -8, transform: `translateY(${(1 - b) * 46}px) scale(${0.8 + b * 0.2})`, opacity: clamp(b * 1.6, 0, 1) }}>₦0</div>
        <div style={{ fontSize: 138, lineHeight: 1.02, ...rise(c) }}>per month</div>
      </div>
      <div style={{ position: 'absolute', left: 90, right: 90, top: 1300, textAlign: 'center', fontWeight: 500, fontSize: 44, lineHeight: 1.3, letterSpacing: -0.5, color: COLORS.inkSoft, ...rise(sub) }}>
        Learn a word, earn XP, win weekly prizes.
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 190, textAlign: 'center', opacity: url, transform: `scale(${0.85 + url * 0.15})` }}>
        <span style={{ display: 'inline-block', background: COLORS.night, color: '#fff', fontWeight: 600, fontSize: 46, padding: '24px 52px', borderRadius: 32, boxShadow: `0 10px 0 ${COLORS.ember}` }}>trycuri.app</span>
      </div>
    </AbsoluteFill>
  );
}

export const CuriWord: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: '#FBE9DF', overflow: 'hidden' }}>
      <Audio src={staticFile('audio/curi-word-sfx.wav')} />
      {frame < S2 && <Hook f={frame} />}
      {frame >= S2 && frame < S3 && <Scene2 local={frame - S2} frame={frame} />}
      {frame >= S3 && frame < S4 && <Scene3 local={frame - S3} />}
      {frame >= S4 && <EndCard local={frame - S4} frame={frame} />}
      {frame >= BARS_IN && frame < BARS_OUT + 30 && <Bars frame={frame} />}
    </AbsoluteFill>
  );
};
