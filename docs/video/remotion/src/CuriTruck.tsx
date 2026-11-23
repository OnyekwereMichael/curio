import React from 'react';
import { AbsoluteFill, Audio, Easing, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { COLORS, FONTS } from './brand';

/**
 * "Your vocabulary" truck: a 10s vertical social video.
 * Idea (adapted from a reference reel): a truck labelled YOUR VOCABULARY wobbles on the verge of tipping over,
 * a steady Curi truck pulls alongside, the wobbling truck steadies, then a clean logo reveal.
 * 1080x1920, 30fps, 300 frames.
 */

const W = 1080;
const H = 1920;
const HORIZON = 820;
const VP_X = 540;
const BASE_Y = 1330; // where both trucks touch the road
const SETTLE_AT = 110; // frame the wobbling truck starts to steady
const WIPE_START = 186;
const WIPE_END = 212;
const END_START = 204;

const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));

/** Lean angle (degrees, clockwise = left wheels lift) of the unstable truck at time t (seconds). */
function wobbleAngle(t: number) {
  const amp = interpolate(t, [0, 1.1, 2.6, 3.7], [6, 21, 27, 25], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const a = amp * (0.78 + 0.22 * Math.sin(t * 5.4)) + 2.6 * Math.sin(t * 13.1) + 1.4 * Math.sin(t * 23.7);
  return Math.max(0, a);
}

function Skyline() {
  const buildings = [
    [20, 90, 70], [100, 140, 60], [170, 70, 50], [240, 180, 70], [330, 110, 55], [400, 60, 45],
    [610, 100, 60], [680, 160, 70], [760, 80, 50], [820, 200, 65], [900, 120, 60], [975, 90, 70],
  ];
  return (
    <g>
      {/* soft hills */}
      <path d={`M0 ${HORIZON} L0 ${HORIZON - 70} Q220 ${HORIZON - 150} 430 ${HORIZON - 60} Q620 ${HORIZON - 130} 800 ${HORIZON - 50} Q960 ${HORIZON - 110} ${W} ${HORIZON - 40} L${W} ${HORIZON}Z`} fill="#A9C2B6" opacity={0.55} />
      {buildings.map(([x, h, bw], i) => (
        <rect key={i} x={x} y={HORIZON - h} width={bw} height={h} rx={4} fill={i % 2 ? '#E2CBBE' : '#D6B8A8'} opacity={0.8} />
      ))}
    </g>
  );
}

function Road({ t }: { t: number }) {
  const N = 14;
  const dashes: React.ReactNode[] = [];
  const speed = 1.3;
  for (let i = 0; i < N; i++) {
    const p = (i + ((t * speed) % 1)) / N;
    const pn = (i + 0.5 + ((t * speed) % 1)) / N;
    const y0 = HORIZON + (H - HORIZON) * p * p;
    const y1 = HORIZON + (H - HORIZON) * pn * pn;
    const hw0 = 3 + 16 * p;
    const hw1 = 3 + 16 * pn;
    dashes.push(<polygon key={i} points={`${VP_X - hw0 / 2},${y0} ${VP_X + hw0 / 2},${y0} ${VP_X + hw1 / 2},${y1} ${VP_X - hw1 / 2},${y1}`} fill={COLORS.paper} opacity={0.9} />);
  }
  const edge = 1300;
  return (
    <g>
      <rect x={0} y={HORIZON} width={W} height={H - HORIZON} fill="#4E7A6F" />
      <polygon points={`${VP_X - 6},${HORIZON} ${VP_X + 6},${HORIZON} ${VP_X + edge + 160},${H} ${VP_X - edge - 160},${H}`} fill="#D8CDBA" />
      <polygon points={`${VP_X - 5},${HORIZON} ${VP_X + 5},${HORIZON} ${VP_X + edge},${H} ${VP_X - edge},${H}`} fill={COLORS.ink} />
      <polygon points={`${VP_X - 5},${HORIZON} ${VP_X - 4},${HORIZON} ${VP_X - edge + 20},${H} ${VP_X - edge},${H}`} fill={COLORS.paper} opacity={0.9} />
      <polygon points={`${VP_X + 4},${HORIZON} ${VP_X + 5},${HORIZON} ${VP_X + edge},${H} ${VP_X + edge - 20},${H}`} fill={COLORS.paper} opacity={0.9} />
      {dashes}
    </g>
  );
}

/** Rear view of the canvas-topped truck. Origin = bottom centre. Width 380. */
function TarpTruck() {
  return (
    <g>
      {/* cargo tarp */}
      <rect x={-190} y={-480} width={380} height={310} rx={16} fill="#E9DDC3" />
      <rect x={-190} y={-480} width={380} height={34} rx={16} fill="#D8C9A8" />
      <rect x={-190} y={-200} width={380} height={30} fill="#CDBE9C" />
      {[-120, 0, 120].map((x) => <rect key={x} x={x - 3} y={-446} width={6} height={246} fill="#BFAF8C" opacity={0.7} />)}
      <text x={0} y={-355} textAnchor="middle" fontFamily={FONTS.ui} fontWeight={800} fontSize={64} fill={COLORS.ink} textLength={250} lengthAdjust="spacingAndGlyphs">YOUR</text>
      <text x={0} y={-285} textAnchor="middle" fontFamily={FONTS.ui} fontWeight={800} fontSize={52} fill={COLORS.ink} textLength={320} lengthAdjust="spacingAndGlyphs">VOCABULARY</text>
      {/* bed + chassis */}
      <rect x={-196} y={-170} width={392} height={28} rx={6} fill="#6B5E49" />
      <rect x={-182} y={-142} width={364} height={78} rx={8} fill="#2A353F" />
      <g>{Array.from({ length: 12 }).map((_, i) => <polygon key={i} points={`${-182 + i * 30.3},-84 ${-182 + i * 30.3 + 15},-84 ${-182 + i * 30.3 + 5},-64 ${-182 + i * 30.3 - 10},-64`} fill={i % 2 ? '#12191F' : COLORS.gold} />)}</g>
      <rect x={-172} y={-136} width={34} height={22} rx={5} fill={COLORS.emberBright} />
      <rect x={138} y={-136} width={34} height={22} rx={5} fill={COLORS.emberBright} />
      <rect x={-60} y={-130} width={120} height={36} rx={5} fill="#FFFDF9" />
      <text x={0} y={-104} textAnchor="middle" fontFamily={FONTS.mono} fontWeight={700} fontSize={22} fill={COLORS.ink}>LOST 404</text>
      {/* wheels */}
      <rect x={-172} y={-64} width={62} height={64} rx={10} fill="#12191F" />
      <rect x={110} y={-64} width={62} height={64} rx={10} fill="#12191F" />
    </g>
  );
}

/** Rear view of the Curi box truck. Origin = bottom centre. Width 340. */
function CuriBoxTruck() {
  return (
    <g>
      <rect x={-170} y={-500} width={340} height={360} rx={18} fill={COLORS.night} />
      <rect x={-170} y={-500} width={340} height={26} rx={18} fill="#1A232B" />
      <rect x={-5} y={-474} width={10} height={334} fill="#0A0F13" />
      {[-330, -250, -190].map((y) => <rect key={y} x={-170} y={y} width={340} height={3} fill="#2A353F" />)}
      <rect x={-170} y={-176} width={340} height={20} fill={COLORS.ember} />
      <rect x={-136} y={-440} width={84} height={84} rx={22} fill="#FFFDF9" />
      <image href={staticFile('curi-icon.png')} x={-136} y={-440} width={84} height={84} preserveAspectRatio="xMidYMid slice" clipPath="inset(0 round 22px)" />
      <text x={-40} y={-372} fontFamily={FONTS.display} fontWeight={800} fontSize={72} fill="#FFFFFF">Curi</text>
      <text x={0} y={-285} textAnchor="middle" fontFamily={FONTS.ui} fontWeight={600} fontSize={30} fill={COLORS.emberTint} textLength={270} lengthAdjust="spacingAndGlyphs">One word a day.</text>
      <rect x={-176} y={-140} width={352} height={76} rx={8} fill="#1A232B" />
      <g>{Array.from({ length: 12 }).map((_, i) => <polygon key={i} points={`${-176 + i * 29.3},-84 ${-176 + i * 29.3 + 15},-84 ${-176 + i * 29.3 + 5},-64 ${-176 + i * 29.3 - 10},-64`} fill={i % 2 ? '#12191F' : COLORS.gold} />)}</g>
      <rect x={-166} y={-134} width={34} height={22} rx={5} fill={COLORS.emberBright} />
      <rect x={132} y={-134} width={34} height={22} rx={5} fill={COLORS.emberBright} />
      <rect x={-60} y={-128} width={120} height={36} rx={5} fill="#FFFDF9" />
      <text x={0} y={-102} textAnchor="middle" fontFamily={FONTS.mono} fontWeight={700} fontSize={22} fill={COLORS.ink}>CURI 365</text>
      <rect x={-160} y={-64} width={62} height={64} rx={10} fill="#0A0F13" />
      <rect x={98} y={-64} width={62} height={64} rx={10} fill="#0A0F13" />
    </g>
  );
}

function Caption({ text, accent, start, sub, br }: { text: string; accent?: string; start: number; sub?: string; br?: boolean }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - start, fps, config: { damping: 16, stiffness: 140 } });
  return (
    <div style={{ position: 'absolute', left: 60, right: 60, top: 190, textAlign: 'center', opacity: clamp(s * 1.6, 0, 1), transform: `translateY(${(1 - s) * 40}px)`, fontFamily: FONTS.ui, fontWeight: 800 }}>
      <div style={{ fontSize: 78, lineHeight: 1.08, color: COLORS.night, letterSpacing: -2 }}>
        {text}{br ? <br /> : ' '}{accent && <span style={{ color: COLORS.ember }}>{accent}</span>}
      </div>
      {sub && <div style={{ marginTop: 22, display: 'inline-block', background: COLORS.night, color: '#fff', fontWeight: 600, fontSize: 36, padding: '14px 32px', borderRadius: 22, boxShadow: `0 7px 0 ${COLORS.ember}` }}>{sub}</div>}
    </div>
  );
}

function EndCard({ local }: { local: number }) {
  const { fps } = useVideoConfig();
  const pop = (d: number, damp = 13) => spring({ frame: local - d, fps, config: { damping: damp, stiffness: 150 } });
  const logo = pop(2, 10);
  const l1 = pop(16);
  const l2 = pop(24);
  const pill = pop(40);
  const foot = clamp((local - 58) / 14, 0, 1);
  return (
    <AbsoluteFill style={{ fontFamily: FONTS.ui }}>
      <div style={{ position: 'absolute', left: -160, top: 1080, fontFamily: FONTS.display, fontWeight: 800, fontSize: 620, lineHeight: 1, color: '#F3C9B6', opacity: 0.3, letterSpacing: -24 }}>Curi</div>
      <div style={{ position: 'absolute', left: 540 - 130, top: 330, width: 260, height: 260, borderRadius: 58, background: '#fff', overflow: 'hidden', boxShadow: '0 20px 56px rgba(199,59,32,.22)', transform: `scale(${logo}) rotate(${(1 - logo) * -12}deg)` }}>
        <Img src={staticFile('curi-icon.png')} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 700, textAlign: 'center', fontWeight: 800, fontSize: 118, lineHeight: 1.06, letterSpacing: -4, color: COLORS.night }}>
        <div style={{ opacity: l1, transform: `translateY(${(1 - l1) * 50}px)` }}>One word a day.</div>
        <div style={{ opacity: l2, transform: `translateY(${(1 - l2) * 50}px)` }}>Big <span style={{ color: COLORS.ember }}>difference.</span></div>
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 1090, textAlign: 'center', opacity: pill, transform: `scale(${0.85 + pill * 0.15})` }}>
        <span style={{ display: 'inline-block', background: COLORS.night, color: '#fff', fontWeight: 500, fontSize: 40, padding: '28px 54px', borderRadius: 34, boxShadow: `0 12px 0 ${COLORS.ember}` }}>Learn today's word and earn XP.</span>
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 150, textAlign: 'center', opacity: foot, fontWeight: 600, fontSize: 40, letterSpacing: 2, color: '#7A5A4E' }}>Start free at trycuri.app</div>
    </AbsoluteFill>
  );
}

export const CuriTruck: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  // unstable truck: wobble, then a damped spring brings it to rest once the Curi truck is alongside
  const settle = spring({ frame: frame - SETTLE_AT, fps, config: { damping: 12, stiffness: 55, mass: 1 } });
  const startAngle = wobbleAngle(SETTLE_AT / fps);
  const wob = frame < SETTLE_AT ? wobbleAngle(t) : startAngle * (1 - settle) + 0.8 * Math.sin(t * 9) * (1 - settle);
  const sway = wob * 1.6;
  const lift = wob > 0 ? Math.sin(t * 5.4) * 3 : 0;

  // Curi truck slides in from the right and pulls alongside
  const enter = Easing.out(Easing.cubic)(clamp((frame - 78) / 46, 0, 1));
  const curiX = interpolate(enter, [0, 1], [1480, 800]);
  const curiScale = interpolate(enter, [0, 1], [0.8, 0.92]);
  const bob = 2.2 * Math.sin(t * 9.5);

  // handheld shake: strongest while the truck is tipping
  const shakeAmt = frame < SETTLE_AT ? 1 : 0.35 * (1 - settle) + 0.2;
  const camX = Math.sin(t * 37) * 2.2 * shakeAmt + Math.sin(t * 14) * 3 * shakeAmt;
  const camY = Math.sin(t * 29) * 2.6 * shakeAmt;
  const zoom = 1 + 0.045 * (frame / 210);

  const wipe = Easing.inOut(Easing.cubic)(clamp((frame - WIPE_START) / (WIPE_END - WIPE_START), 0, 1));
  const wipeR = wipe * 2300;

  return (
    <AbsoluteFill style={{ background: '#FBE9DF', overflow: 'hidden' }}>
      <Audio src={staticFile('audio/curi-truck-sfx.wav')} />

      {frame < WIPE_END + 2 && (
        <AbsoluteFill>
          <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: 'absolute' }}>
            <defs>
              <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#F6D9CB" />
                <stop offset="0.55" stopColor="#FBE9DF" />
                <stop offset="1" stopColor="#FFF6E6" />
              </linearGradient>
              <radialGradient id="sun" cx="0.5" cy="0.5" r="0.5">
                <stop offset="0" stopColor={COLORS.goldTint} stopOpacity="1" />
                <stop offset="1" stopColor={COLORS.goldTint} stopOpacity="0" />
              </radialGradient>
            </defs>
            <g transform={`translate(${camX} ${camY}) translate(${VP_X} ${HORIZON}) scale(${zoom}) translate(${-VP_X} ${-HORIZON})`}>
              <rect x={-100} y={-100} width={W + 200} height={HORIZON + 100} fill="url(#sky)" />
              <circle cx={800} cy={560} r={300} fill="url(#sun)" />
              <circle cx={800} cy={560} r={92} fill={COLORS.gold} opacity={0.85} />
              <Skyline />
              <Road t={t} />
              {/* shadows */}
              <ellipse cx={300} cy={BASE_Y + 8} rx={230} ry={24} fill="#0A0F13" opacity={0.32} />
              <ellipse cx={curiX} cy={BASE_Y + 8} rx={210 * curiScale} ry={22} fill="#0A0F13" opacity={0.32} />
              {/* unstable truck: pivots on its right wheels */}
              <g transform={`translate(${300 + sway * 0.12} ${BASE_Y - lift}) scale(0.92) rotate(${wob} 190 0)`}>
                <TarpTruck />
              </g>
              {/* Curi truck */}
              <g transform={`translate(${curiX} ${BASE_Y + bob}) scale(${curiScale})`}>
                <CuriBoxTruck />
              </g>
            </g>
          </svg>

          {frame < 118 && <Caption text="Your vocabulary," accent="on its own…" start={4} br />}
          {frame >= 118 && frame < WIPE_START + 10 && <Caption text="…with" accent="Curi." start={120} sub="One word a day." />}
        </AbsoluteFill>
      )}

      {/* wipe to the end card */}
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: 'absolute', pointerEvents: 'none' }}>
        <circle cx={curiX > 900 ? 540 : 800} cy={1020} r={wipeR} fill={COLORS.ember} opacity={frame < WIPE_END ? 1 : 0} />
      </svg>
      {frame >= END_START && (
        <AbsoluteFill style={{ background: '#FBE9DF', clipPath: `circle(${clamp((frame - END_START) / 14, 0, 1) * 2400}px at 540px 1020px)` }}>
          <EndCard local={frame - END_START} />
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};
