import { motion } from 'framer-motion';
import { usePrefersReducedMotion } from '../lib/useReducedMotionPref';

export type OtterMood =
  | 'idle'
  | 'curious'
  | 'cheering'
  | 'proud'
  | 'sleepy'
  | 'thinking'
  | 'supportive'
  | 'shielded'
  | 'excited'
  | 'waving'
  | 'grumpy';

interface OtterProps {
  mood?: OtterMood;
  size?: number;
  className?: string;
  /** Gentle idle breathing loop — off by default so static spots (cards, lists) stay still. */
  breathe?: boolean;
  /** Occasional eye blink (a quick squash of the eyes) — off by default, skipped for reduced motion. */
  blink?: boolean;
}

// Flat fur + cream palette. Intentionally not theme-token driven — the
// mascot stays the same warm illustration in both light and dark mode.
const FUR_DARK = '#5B3E2C';
const FUR = '#8B5E3C';
const FUR_LIGHT = '#A97A4F';
const CREAM = '#E8CBA1';
const CREAM_LIGHT = '#F6E9D4';
const INK = '#2A2118';
const PEBBLE = '#7C8A93';
const PEBBLE_FLECK = '#C7962E';
const SHIELD = '#C7962E';

function Eyes({ mood }: { mood: OtterMood }) {
  switch (mood) {
    case 'proud':
    case 'cheering':
    case 'excited':
      return (
        <>
          <path d="M80 92 Q86 85 92 92" fill="none" stroke={INK} strokeWidth={4} strokeLinecap="round" />
          <path d="M108 92 Q114 85 120 92" fill="none" stroke={INK} strokeWidth={4} strokeLinecap="round" />
        </>
      );
    case 'grumpy':
      return (
        <>
          <circle cx={87} cy={94} r={4.8} fill={INK} />
          <circle cx={113} cy={94} r={4.8} fill={INK} />
          {/* furrowed brows, angled in */}
          <path d="M76 83 Q86 80 94 85" fill="none" stroke={INK} strokeWidth={3.2} strokeLinecap="round" />
          <path d="M124 83 Q114 80 106 85" fill="none" stroke={INK} strokeWidth={3.2} strokeLinecap="round" />
        </>
      );
    case 'sleepy':
      return (
        <>
          <path d="M79 93 h14" stroke={INK} strokeWidth={3.5} strokeLinecap="round" />
          <path d="M107 93 h14" stroke={INK} strokeWidth={3.5} strokeLinecap="round" />
        </>
      );
    case 'supportive':
      return (
        <>
          <ellipse cx={86} cy={91} rx={5} ry={6} fill={INK} />
          <ellipse cx={114} cy={91} rx={5} ry={6} fill={INK} />
          <path d="M78 102 Q86 97 94 102" fill="none" stroke={INK} strokeWidth={2.5} strokeLinecap="round" opacity={0.5} />
          <path d="M106 102 Q114 97 122 102" fill="none" stroke={INK} strokeWidth={2.5} strokeLinecap="round" opacity={0.5} />
        </>
      );
    case 'thinking':
      return (
        <>
          <circle cx={88} cy={90} r={5} fill={INK} />
          <circle cx={116} cy={88} r={5} fill={INK} />
          <circle cx={90} cy={88} r={1.6} fill="#fff" />
          <circle cx={118} cy={86} r={1.6} fill="#fff" />
        </>
      );
    default:
      return (
        <>
          <circle cx={86} cy={91} r={5.5} fill={INK} />
          <circle cx={114} cy={91} r={5.5} fill={INK} />
          <circle cx={88} cy={88.5} r={1.8} fill="#fff" />
          <circle cx={116} cy={88.5} r={1.8} fill="#fff" />
        </>
      );
  }
}

function Mouth({ mood }: { mood: OtterMood }) {
  switch (mood) {
    case 'excited':
      return (
        <>
          <path d="M84 104 Q100 128 116 104 Z" fill={INK} stroke={INK} strokeWidth={3} strokeLinejoin="round" />
          <ellipse cx={100} cy={116} rx={7} ry={4} fill="#E8472A" />
        </>
      );
    case 'grumpy':
      return <path d="M90 112 Q100 103 110 112" fill="none" stroke={INK} strokeWidth={3.2} strokeLinecap="round" />;
    case 'cheering':
      return <path d="M86 106 Q100 118 114 106" fill="none" stroke={INK} strokeWidth={3.5} strokeLinecap="round" />;
    case 'proud':
      return <path d="M84 104 Q100 114 116 104" fill="none" stroke={INK} strokeWidth={3} strokeLinecap="round" />;
    case 'sleepy':
      return <circle cx={100} cy={107} r={2.2} fill={INK} opacity={0.6} />;
    case 'supportive':
      return <path d="M90 107 Q100 110 110 107" fill="none" stroke={INK} strokeWidth={2.5} strokeLinecap="round" opacity={0.7} />;
    case 'thinking':
      return <path d="M92 108 Q100 106 108 108" fill="none" stroke={INK} strokeWidth={2.5} strokeLinecap="round" />;
    default:
      return <path d="M88 105 Q100 112 112 105" fill="none" stroke={INK} strokeWidth={2.8} strokeLinecap="round" />;
  }
}

function Extras({ mood }: { mood: OtterMood }) {
  switch (mood) {
    case 'grumpy':
      return (
        <g aria-hidden="true">
          {/* puffed, blushing cheeks — cute, not cross */}
          <circle cx={70} cy={106} r={9} fill="#E8472A" opacity={0.22} />
          <circle cx={130} cy={106} r={9} fill="#E8472A" opacity={0.22} />
        </g>
      );
    case 'excited':
    case 'cheering':
      return (
        <g aria-hidden="true">
          <circle cx={48} cy={55} r={3.5} fill={PEBBLE_FLECK} />
          <circle cx={156} cy={48} r={2.5} fill={FUR_LIGHT} />
          <circle cx={40} cy={80} r={2} fill={FUR} />
          <rect x={150} y={70} width={6} height={6} rx={1.5} fill={PEBBLE_FLECK} transform="rotate(20 153 73)" />
        </g>
      );
    case 'proud':
      return (
        <g aria-hidden="true">
          <path d="M150 60 l3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3 Z" fill={PEBBLE_FLECK} />
        </g>
      );
    case 'sleepy':
      return (
        <g aria-hidden="true" fontFamily="var(--font-ui, sans-serif)" fontWeight={700} fill={FUR_LIGHT}>
          <text x={146} y={52} fontSize={14}>z</text>
          <text x={156} y={40} fontSize={10}>z</text>
        </g>
      );
    case 'thinking':
      return (
        <g aria-hidden="true" fill={FUR_LIGHT}>
          <circle cx={148} cy={58} r={3} />
          <circle cx={158} cy={48} r={2.2} />
          <circle cx={165} cy={40} r={1.6} />
        </g>
      );
    default:
      return null;
  }
}

/** Paws + whatever they're holding — pebble by default, free for cheering/thinking, a shield for "shielded". */
function PawsAndHold({ mood }: { mood: OtterMood }) {
  const reduceMotion = usePrefersReducedMotion();
  if (mood === 'grumpy') {
    return (
      <g aria-hidden="true">
        <circle cx={100} cy={180} r={12} fill={PEBBLE} />
        {/* crossed arms */}
        <ellipse cx={86} cy={146} rx={26} ry={11} fill={FUR} stroke={FUR_DARK} strokeWidth={1.5} transform="rotate(-10 86 146)" />
        <ellipse cx={114} cy={150} rx={26} ry={11} fill={FUR} stroke={FUR_DARK} strokeWidth={1.5} transform="rotate(10 114 150)" />
      </g>
    );
  }
  if (mood === 'waving') {
    return (
      <g aria-hidden="true">
        <ellipse cx={78} cy={162} rx={13} ry={16} fill={FUR} />
        <circle cx={100} cy={168} r={14} fill={PEBBLE} />
        <circle cx={95} cy={163} r={2.6} fill={PEBBLE_FLECK} />
        {/* raised waving paw, pivoting at the shoulder */}
        <motion.g
          animate={reduceMotion ? undefined : { rotate: [0, 22, -8, 22, -8, 0] }}
          transition={{ duration: 1.2, repeat: Infinity, repeatDelay: 0.2, ease: 'easeInOut' }}
          style={{ transformBox: 'view-box', transformOrigin: '150px 140px' }}
        >
          <ellipse cx={166} cy={104} rx={15} ry={22} fill={FUR} transform="rotate(20 166 104)" />
          <ellipse cx={166} cy={92} rx={7} ry={9} fill={CREAM} opacity={0.55} transform="rotate(20 166 104)" />
        </motion.g>
      </g>
    );
  }
  if (mood === 'cheering' || mood === 'excited') {
    return (
      <g aria-hidden="true">
        <ellipse cx={58} cy={118} rx={13} ry={16} fill={FUR} transform="rotate(-35 58 118)" />
        <ellipse cx={142} cy={118} rx={13} ry={16} fill={FUR} transform="rotate(35 142 118)" />
        <circle cx={100} cy={172} r={13} fill={PEBBLE} />
      </g>
    );
  }
  if (mood === 'thinking') {
    return (
      <g aria-hidden="true">
        <ellipse cx={122} cy={108} rx={11} ry={15} fill={FUR} transform="rotate(-25 122 108)" />
        <ellipse cx={78} cy={160} rx={13} ry={16} fill={FUR} />
        <circle cx={58} cy={168} r={12} fill={PEBBLE} opacity={0.9} />
      </g>
    );
  }
  if (mood === 'shielded') {
    return (
      <g aria-hidden="true">
        <ellipse cx={76} cy={160} rx={13} ry={16} fill={FUR} />
        <ellipse cx={124} cy={160} rx={13} ry={16} fill={FUR} />
        <path
          d="M100 138 L120 146v16c0 14 -9 23 -20 28c-11 -5 -20 -14 -20 -28v-16Z"
          fill={SHIELD}
        />
        <path d="M92 168 l6 6 12 -13" fill="none" stroke={CREAM_LIGHT} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
      </g>
    );
  }
  // idle, curious, proud, sleepy, supportive — both paws resting on the pebble
  return (
    <g aria-hidden="true">
      <ellipse cx={78} cy={162} rx={13} ry={16} fill={FUR} />
      <ellipse cx={122} cy={162} rx={13} ry={16} fill={FUR} />
      <circle cx={100} cy={168} r={14} fill={PEBBLE} />
      <circle cx={95} cy={163} r={2.6} fill={PEBBLE_FLECK} />
    </g>
  );
}

export function Otter({ mood = 'idle', size = 96, className, breathe = false, blink = false }: OtterProps) {
  const reduceMotion = usePrefersReducedMotion();
  const tilt = mood === 'curious' ? -7 : 0;
  const Wrapper = breathe ? motion.svg : 'svg';
  const breatheProps =
    breathe && !reduceMotion
      ? {
          animate: { scale: [1, 1.015, 1] },
          transition: { duration: 4, repeat: Infinity, ease: 'easeInOut' as const },
          style: { transformOrigin: '50% 100%' },
        }
      : {};

  return (
    <Wrapper
      width={size}
      height={size}
      viewBox="0 0 200 200"
      role="img"
      aria-label={`Curi the otter, ${mood}`}
      className={className}
      {...breatheProps}
    >
      {/* tail */}
      <path d="M150 150 Q190 150 182 110 Q176 140 150 142 Z" fill={FUR_LIGHT} />

      {/* body */}
      <ellipse cx={100} cy={158} rx={56} ry={52} fill={FUR} />
      <ellipse cx={100} cy={168} rx={32} ry={34} fill={CREAM} />

      <PawsAndHold mood={mood} />

      {/* head group — tilts for "curious" */}
      <g transform={`rotate(${tilt} 100 85)`}>
        <circle cx={66} cy={55} r={17} fill={FUR_DARK} />
        <circle cx={134} cy={55} r={17} fill={FUR_DARK} />
        <circle cx={66} cy={55} r={9} fill={CREAM} />
        <circle cx={134} cy={55} r={9} fill={CREAM} />

        <circle cx={100} cy={86} r={60} fill={FUR} />
        <ellipse cx={100} cy={100} rx={36} ry={30} fill={CREAM} />
        <ellipse cx={100} cy={104} rx={18} ry={14} fill={CREAM_LIGHT} />

        {/* eyes: look around when curious, blink when asked to */}
        <motion.g
          animate={mood === 'curious' && !reduceMotion ? { x: [0, -4, 4, 0] } : { x: 0 }}
          transition={mood === 'curious' ? { duration: 2.4, repeat: Infinity, ease: 'easeInOut' } : { duration: 0 }}
        >
          {blink && !reduceMotion ? (
            <motion.g
              animate={{ scaleY: [1, 1, 0.1, 1, 1] }}
              transition={{ duration: 3.2, times: [0, 0.88, 0.93, 0.98, 1], repeat: Infinity }}
              style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
            >
              <Eyes mood={mood} />
            </motion.g>
          ) : (
            <Eyes mood={mood} />
          )}
        </motion.g>
        <ellipse cx={100} cy={99} rx={3.5} ry={2.6} fill={INK} />
        <Mouth mood={mood} />
      </g>

      <Extras mood={mood} />
    </Wrapper>
  );
}
