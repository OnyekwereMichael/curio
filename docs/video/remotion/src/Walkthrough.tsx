import type { CSSProperties, ReactNode } from 'react';
import { AbsoluteFill, Audio, Img, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { COLORS, FONTS, FPS, RADIUS } from './brand';
import { COMPETITION, WEEKLY_PRIZES, formatPrize } from '../../../../src/lib/leaderboardConfig';
import storyboard from './generated/storyboard.json';
import captions from './generated/captions.json';
import audio from './generated/audio.json';
import timeline from './generated/timeline.json';

type Scene = (typeof storyboard.scenes)[number];
interface Props {
  vertical?: boolean;
}

const shot = (name: string) => staticFile(`screenshots/${name}`);
const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

/** Fade/slide in at the start of a scene and fade out in the last 8 frames. */
function useSceneEnvelope(durFrames: number) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 200 } });
  const out = interpolate(frame, [durFrames - 8, durFrames], [1, 0], clamp);
  return { frame, fps, enter, opacity: Math.min(enter, out) };
}

// ── Screenshot presentations ────────────────────────────────────────
const PHONE_H = 0.68; // phone height as a share of the frame height (landscape)

function Phone({ src, height, tilt = 0 }: { src: string; height: number; tilt?: number }) {
  const width = (height * 390) / 844;
  return (
    <div
      style={{
        width,
        height,
        borderRadius: 56,
        padding: 10,
        background: '#0D1217',
        boxShadow: '0 40px 80px rgba(28,43,58,0.28), 0 8px 20px rgba(28,43,58,0.18)',
        transform: `rotate(${tilt}deg)`,
      }}
    >
      <Img src={src} style={{ width: '100%', height: '100%', borderRadius: 46, objectFit: 'cover', objectPosition: 'top' }} />
    </div>
  );
}

function Card({ src, width }: { src: string; width: number }) {
  return (
    <Img
      src={src}
      style={{ width, borderRadius: RADIUS.sheet, boxShadow: '0 30px 60px rgba(28,43,58,0.22), 0 6px 16px rgba(28,43,58,0.12)' }}
    />
  );
}

/** Picks a presentation from the file name: tall app screens → phone, desktop → wide card, element crops → card. */
function ShotView({ name, vertical, height, width, tilt }: { name: string; vertical: boolean; height: number; width: number; tilt?: number }) {
  if (name.startsWith('05-')) return <Card src={shot(name)} width={vertical ? width * 0.92 : width * 0.62} />;
  if (/^(03|04|06|3\d)-/.test(name)) return <Card src={shot(name)} width={vertical ? width * 0.8 : Math.min(width * 0.36, 760)} />;
  return <Phone src={shot(name)} height={height} tilt={tilt} />;
}

// ── Generic scene: text on one side, screenshots cycling on the other ──
function GenericScene({ scene, vertical }: { scene: Scene; vertical: boolean }) {
  const { width, height } = useVideoConfig();
  const dur = scene.dur * FPS;
  const { frame, fps, enter, opacity } = useSceneEnvelope(dur);
  const n = scene.screenshot.length;
  const cutFrames = (scene as { cuts?: number[] }).cuts?.map((c) => Math.round(c * FPS)) ?? scene.screenshot.map((_, i) => Math.round((i * dur) / n));
  let idx = 0;
  cutFrames.forEach((c, i) => {
    if (frame >= c && i < n) idx = i;
  });
  const local = frame - cutFrames[idx];
  const slide = spring({ frame: local, fps, config: { damping: 18, stiffness: 120 } });
  const phoneH = vertical ? height * 0.52 : height * PHONE_H;

  const textBlock = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, maxWidth: vertical ? width * 0.86 : width * 0.42, transform: `translateY(${(1 - enter) * 24}px)` }}>
      <div style={{ fontFamily: FONTS.mono, fontSize: vertical ? 26 : 22, letterSpacing: 3, textTransform: 'uppercase', color: COLORS.ember }}>
        {String(scene.id).padStart(2, '0')} · {scene.name}
      </div>
      <div style={{ fontFamily: FONTS.display, fontWeight: 700, fontSize: vertical ? 84 : 78, lineHeight: 1.08, color: COLORS.ink }}>{scene.text[0]}</div>
      {scene.text.slice(1).map((t, i) => {
        const appear = interpolate(frame, [18 + i * 16, 34 + i * 16], [0, 1], clamp);
        return (
          <div
            key={t}
            style={{
              fontFamily: FONTS.ui,
              fontWeight: 600,
              fontSize: vertical ? 34 : 30,
              color: COLORS.inkSoft,
              opacity: appear,
              transform: `translateX(${(1 - appear) * -20}px)`,
            }}
          >
            {t}
          </div>
        );
      })}
    </div>
  );

  return (
    <AbsoluteFill
      style={{
        opacity,
        backgroundColor: COLORS.paper,
        backgroundImage: `radial-gradient(circle at 80% 30%, ${COLORS.emberTint}88, transparent 45%), radial-gradient(circle at 10% 90%, ${COLORS.moss}1A, transparent 40%)`,
        flexDirection: vertical ? 'column' : 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: vertical ? 60 : 120,
        padding: vertical ? '90px 90px 300px' : '60px 120px 190px',
      }}
    >
      {textBlock}
      <div style={{ transform: `translateX(${(1 - slide) * (vertical ? 0 : 160)}px) translateY(${(1 - slide) * (vertical ? 160 : 0)}px)`, opacity: slide }}>
        <ShotView name={scene.screenshot[idx]} vertical={vertical} height={phoneH} width={width} tilt={(1 - slide) * 3} />
      </div>
    </AbsoluteFill>
  );
}

// ── Scene 8: weekly prizes (night, podium, count-up). Amounts come from the app's own config. ──
function PrizeScene({ scene, vertical }: { scene: Scene; vertical: boolean }) {
  const { width, height } = useVideoConfig();
  const dur = scene.dur * FPS;
  const { frame, fps, opacity } = useSceneEnvelope(dur);
  const amount = (place: number) => WEEKLY_PRIZES.find((p) => p.place === place)?.amount ?? 0;
  // Rise order 2nd → 3rd → 1st.
  const prize = (scene as { prize?: { riseAt: Record<string, number>; chipsAt: number } }).prize ?? { riseAt: { '2': 1, '3': 2, '1': 3.2 }, chipsAt: scene.dur - 3.7 };
  const steps = [
    { place: 2, h: 260, at: Math.round(prize.riseAt['2'] * FPS), color: '#C9CED2' },
    { place: 3, h: 190, at: Math.round(prize.riseAt['3'] * FPS), color: '#D58B5B' },
    { place: 1, h: 340, at: Math.round(prize.riseAt['1'] * FPS), color: COLORS.gold },
  ] as const;
  const monday = interpolate(frame, [prize.chipsAt * FPS, prize.chipsAt * FPS + 20], [0, 1], clamp);
  const colW = vertical ? 280 : 300;

  return (
    <AbsoluteFill style={{ opacity, backgroundColor: COLORS.night, backgroundImage: `radial-gradient(circle at 70% 25%, ${COLORS.gold}33, transparent 45%)`, alignItems: 'center', justifyContent: 'center', gap: vertical ? 70 : 40, flexDirection: 'column', paddingBottom: vertical ? 260 : 150 }}>
      <div style={{ fontFamily: FONTS.display, fontWeight: 700, fontSize: vertical ? 92 : 84, color: COLORS.cream, textAlign: 'center', lineHeight: 1.1 }}>{scene.text[0]}</div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 28, height: height * (vertical ? 0.36 : 0.5) }}>
        {[steps[0], steps[2], steps[1]].map((s) => {
          const rise = spring({ frame: frame - s.at, fps, config: { damping: 14, stiffness: 90 } });
          const value = Math.round(interpolate(frame, [s.at, s.at + 40], [0, amount(s.place)], clamp));
          const glow = s.place === 1 ? interpolate(frame, [s.at, s.at + 20], [0, 1], clamp) : 0;
          return (
            <div key={s.place} style={{ width: colW, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, opacity: Math.min(1, rise * 2) }}>
              <div
                style={{
                  fontFamily: FONTS.mono,
                  fontWeight: 600,
                  fontSize: vertical ? 56 : 52,
                  color: s.color,
                  textShadow: glow ? `0 0 ${30 * glow}px ${COLORS.gold}` : 'none',
                }}
              >
                {formatPrize(value)}
              </div>
              <div
                style={{
                  width: '100%',
                  height: s.h * Math.max(0, rise) * (vertical ? 0.8 : 1),
                  borderRadius: '24px 24px 0 0',
                  background: `linear-gradient(180deg, ${s.color}55, ${s.color}1A)`,
                  border: `2px solid ${s.color}88`,
                  borderBottom: 'none',
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'center',
                  paddingTop: 14,
                  fontFamily: FONTS.display,
                  fontWeight: 700,
                  fontSize: 60,
                  color: s.color,
                }}
              >
                {s.place}
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', gap: 24, opacity: monday, transform: `translateY(${(1 - monday) * 20}px)`, flexWrap: 'wrap', justifyContent: 'center' }}>
        {scene.text.slice(2).map((t) => (
          <div key={t} style={{ fontFamily: FONTS.ui, fontWeight: 600, fontSize: vertical ? 38 : 34, color: COLORS.cream, background: '#FFFFFF1F', padding: '14px 30px', borderRadius: 999 }}>
            {t}
          </div>
        ))}
      </div>
      <div style={{ position: 'absolute', bottom: vertical ? 420 : 215, fontFamily: FONTS.ui, fontSize: 22, color: '#F6F4EF99' }}>
        Weekly winners need at least {COMPETITION.minWeeklyXp} XP
      </div>
    </AbsoluteFill>
  );
}

// ── Scene 9: mascot grid, playful easing ──
function MascotScene({ scene, vertical }: { scene: Scene; vertical: boolean }) {
  const { width } = useVideoConfig();
  const { frame, fps, opacity } = useSceneEnvelope(scene.dur * FPS);
  const cardW = vertical ? width * 0.8 : 470;
  return (
    <AbsoluteFill style={{ opacity, backgroundColor: COLORS.goldTint, alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 30, padding: '40px 60px 200px' }}>
      <div style={{ fontFamily: FONTS.display, fontWeight: 700, fontSize: vertical ? 90 : 76, color: COLORS.ink, textAlign: 'center' }}>{scene.text[0]}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 28, justifyContent: 'center', maxWidth: vertical ? width : 1700 }}>
        {scene.screenshot.slice(0, vertical ? 4 : 6).map((s, i) => {
          const pop = spring({ frame: frame - i * 8, fps, config: { damping: 9, stiffness: 140 } });
          return (
            <div key={s} style={{ transform: `scale(${pop}) rotate(${(i % 2 ? 1 : -1) * (1 - pop) * 8 + (i % 2 ? 1.2 : -1.2)}deg)`, opacity: Math.min(1, pop * 2) }}>
              <Img src={shot(s)} style={{ width: cardW, borderRadius: RADIUS.sheet, border: `6px solid ${COLORS.surface}`, boxShadow: '0 16px 36px rgba(28,43,58,0.2)' }} />
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
}

// ── Scene 10: four steps ──
function StepsScene({ scene, vertical }: { scene: Scene; vertical: boolean }) {
  const { frame, opacity } = useSceneEnvelope(scene.dur * FPS);
  const stepAt = (scene as { stepAt?: number[] }).stepAt ?? scene.text.map((_, i) => i * 1.7);
  const line = interpolate(frame, [Math.round(stepAt[0] * FPS), Math.round(stepAt[stepAt.length - 1] * FPS) + 14], [0, 1], clamp);
  return (
    <AbsoluteFill style={{ opacity, backgroundColor: COLORS.paper, alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 80, padding: 80 }}>
      <div style={{ fontFamily: FONTS.display, fontWeight: 700, fontSize: vertical ? 84 : 72, color: COLORS.ink, textAlign: 'center' }}>How it works</div>
      <div style={{ position: 'relative', display: 'flex', flexDirection: vertical ? 'column' : 'row', gap: vertical ? 56 : 48, alignItems: vertical ? 'flex-start' : 'flex-start' }}>
        {!vertical && <div style={{ position: 'absolute', top: 44, left: 44, height: 4, width: `calc(${line * 100}% - 88px)`, background: COLORS.moss, opacity: 0.35 }} />}
        {scene.text.map((t, i) => {
          const at = Math.round((stepAt[i] ?? i * 1.7) * FPS);
          const pop = interpolate(frame, [at, at + 14], [0, 1], clamp);
          const last = i === scene.text.length - 1;
          return (
            <div key={t} style={{ display: 'flex', flexDirection: vertical ? 'row' : 'column', alignItems: 'center', gap: 22, width: vertical ? undefined : 380, opacity: pop, transform: `scale(${0.8 + 0.2 * pop})` }}>
              <div style={{ width: 88, height: 88, borderRadius: 44, background: last ? COLORS.gold : COLORS.surface, border: `4px solid ${last ? COLORS.gold : COLORS.moss}`, color: last ? '#fff' : COLORS.moss, fontFamily: FONTS.display, fontWeight: 700, fontSize: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 20px rgba(28,43,58,0.12)' }}>
                {i + 1}
              </div>
              <div style={{ fontFamily: FONTS.ui, fontWeight: 600, fontSize: 34, color: COLORS.ink, textAlign: vertical ? 'left' : 'center' }}>{t.replace(/^\d\s/, '')}</div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
}

// ── Scene 11: closing CTA ──
function CtaScene({ scene, vertical }: { scene: Scene; vertical: boolean }) {
  const { frame, fps, opacity } = useSceneEnvelope(scene.dur * FPS);
  const pop = spring({ frame, fps, config: { damping: 12 } });
  const pulse = 1 + 0.04 * Math.sin(interpolate(frame, [70, 100], [0, Math.PI], clamp));
  return (
    <AbsoluteFill style={{ opacity, backgroundColor: COLORS.paper, backgroundImage: `radial-gradient(circle at 50% 30%, ${COLORS.emberTint}, transparent 55%)`, alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 36 }}>
      <div style={{ transform: `scale(${pop})`, fontFamily: FONTS.display, fontWeight: 700, fontSize: vertical ? 190 : 170, color: COLORS.ink }}>{scene.text[0]}</div>
      <div style={{ fontFamily: FONTS.ui, fontWeight: 600, fontSize: vertical ? 44 : 38, color: COLORS.inkSoft }}>{scene.text[1]}</div>
      <div style={{ transform: `scale(${pulse})`, background: COLORS.ember, color: '#fff', fontFamily: FONTS.ui, fontWeight: 700, fontSize: vertical ? 52 : 44, padding: '26px 64px', borderRadius: RADIUS.control, boxShadow: `0 6px 0 #A3301A, 0 24px 40px rgba(199,59,32,0.3)` }}>
        {scene.text[2]}
      </div>
    </AbsoluteFill>
  );
}

function SceneRouter({ scene, vertical }: { scene: Scene; vertical: boolean }) {
  switch ((scene as { kind?: string }).kind) {
    case 'prize':
      return <PrizeScene scene={scene} vertical={vertical} />;
    case 'mascot':
      return <MascotScene scene={scene} vertical={vertical} />;
    case 'steps':
      return <StepsScene scene={scene} vertical={vertical} />;
    case 'cta':
      return <CtaScene scene={scene} vertical={vertical} />;
    default:
      return <GenericScene scene={scene} vertical={vertical} />;
  }
}

// ── Burned-in captions (from ../captions.srt) ──
function Captions({ vertical }: { vertical: boolean }) {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const c = captions.find((x) => t >= x.from && t < x.to);
  if (!c) return null;
  const style: CSSProperties = {
    position: 'absolute',
    left: '50%',
    transform: 'translateX(-50%)',
    bottom: vertical ? 300 : 70, // 9:16 keeps captions out of the platform UI zone
    maxWidth: vertical ? '84%' : '70%',
    textAlign: 'center',
    whiteSpace: 'pre-line',
    fontFamily: FONTS.ui,
    fontWeight: 600,
    fontSize: vertical ? 46 : 40,
    lineHeight: 1.3,
    color: COLORS.cream,
    background: `${COLORS.ink}DD`,
    padding: '14px 32px',
    borderRadius: RADIUS.card,
  };
  return <div style={style}>{c.text}</div>;
}

const MUSIC = { bed: 0.14, ducked: 0.055 };
const speech = timeline.beats.map((b) => ({ from: b.start * FPS, to: (b.start + b.sec) * FPS }));
/** Music level per frame: quiet while someone is talking, easing back up in the gaps. */
const musicVolume = (frame: number) => {
  let d = Infinity;
  for (const r of speech) d = Math.min(d, frame < r.from ? r.from - frame : frame > r.to ? frame - r.to : 0);
  const k = Math.min(1, d / 12); // 12-frame ease
  const fade = Math.min(1, frame / 45, (storyboard.scenes.reduce((n, s) => n + s.dur, 0) * FPS - frame) / 90);
  return (MUSIC.ducked + (MUSIC.bed - MUSIC.ducked) * k) * Math.max(0, fade);
};

export function Walkthrough({ vertical = false }: Props): ReactNode {
  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.paper }}>
      {storyboard.scenes.map((scene) => (
        <Sequence key={scene.id} from={scene.start * FPS} durationInFrames={scene.dur * FPS}>
          <SceneRouter scene={scene} vertical={vertical} />
        </Sequence>
      ))}
      <Captions vertical={vertical} />
      {audio.voiceover &&
        timeline.beats.map((b) => (
          <Sequence key={b.file} from={Math.round(b.start * FPS)} durationInFrames={Math.ceil(b.sec * FPS) + 6}>
            <Audio src={staticFile(`audio/${b.file}`)} />
          </Sequence>
        ))}
      {audio.music && <Audio src={staticFile('audio/music.mp3')} volume={musicVolume} />}
    </AbsoluteFill>
  );
}
