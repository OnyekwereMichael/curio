import { useEffect, useId, useState } from 'react';
import { ShieldExplainerModal } from './ShieldExplainerModal';

const MAX_SHIELDS = 2;
const DAYS_PER_SHIELD = 7;

interface Props {
  currentStreak: number;
  shieldCount: number;
}

/* -------------------------------------------------------------------------- */
/*  A single shield slot                                                      */
/*  held      -> solid, with a check                                          */
/*  filling   -> outline that fills from the bottom as the streak grows       */
/*  empty     -> dashed outline, not yet reachable                            */
/* -------------------------------------------------------------------------- */

const SHIELD_PATH =
  'M12 1.5 21.5 5v8c0 6.5-4 11-9.5 13.5C6.5 24 2.5 19.5 2.5 13V5L12 1.5Z';

type SlotState = 'held' | 'filling' | 'empty';

function ShieldSlot({ state, fill }: { state: SlotState; fill: number }) {
  const clipId = useId();

  return (
    <svg
      viewBox="0 0 24 28"
      className="shrink-0 w-[22px] h-[26px] sm:w-[26px] sm:h-[30px]"
      aria-hidden="true"
      focusable="false"
    >
      {state === 'held' && (
        <>
          <path
            d={SHIELD_PATH}
            className="fill-moss stroke-moss"
            strokeWidth={1.5}
            strokeLinejoin="round"
          />
          <path
            d="m8 13.5 2.8 2.8L16.2 10.5"
            fill="none"
            className="stroke-paper"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      )}

      {state === 'filling' && (
        <>
          <defs>
            <clipPath id={clipId}>
              <path d={SHIELD_PATH} />
            </clipPath>
          </defs>
          <g clipPath={`url(#${clipId})`}>
            <rect
              x={0}
              y={1.5}
              width={24}
              height={25}
              className="fill-moss/80 transition-transform duration-700 ease-out motion-reduce:transition-none"
              style={{
                transform: `scaleY(${fill})`,
                transformOrigin: '12px 26.5px',
              }}
            />
          </g>
          <path
            d={SHIELD_PATH}
            fill="none"
            className="stroke-moss"
            strokeWidth={1.5}
            strokeLinejoin="round"
          />
        </>
      )}

      {state === 'empty' && (
        <path
          d={SHIELD_PATH}
          fill="none"
          className="stroke-ink/25"
          strokeWidth={1.5}
          strokeLinejoin="round"
          strokeDasharray="2.5 2.5"
        />
      )}
    </svg>
  );
}

/* -------------------------------------------------------------------------- */

export function ShieldProgress({ currentStreak, shieldCount }: Props) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Let the fill animate in once on first paint
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const isFull = shieldCount >= MAX_SHIELDS;
  const daysIntoCycle = currentStreak % DAYS_PER_SHIELD;
  const daysLeft = DAYS_PER_SHIELD - daysIntoCycle;
  const fill = mounted ? daysIntoCycle / DAYS_PER_SHIELD : 0;

  const title = isFull
    ? 'Streak fully protected'
    : `${daysLeft} day${daysLeft !== 1 ? 's' : ''} until your next Shield`;

  const detail = isFull
    ? `${MAX_SHIELDS} of ${MAX_SHIELDS} Shields held`
    : `${daysIntoCycle} of ${DAYS_PER_SHIELD} days complete`;

  const slots: SlotState[] = Array.from({ length: MAX_SHIELDS }, (_, i) =>
    i < shieldCount ? 'held' : i === shieldCount ? 'filling' : 'empty'
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`${shieldCount} of ${MAX_SHIELDS} Shields held. ${title}. Learn how Shields work`}
        className="group w-full max-w-md grid grid-cols-[auto_minmax(0,1fr)] sm:grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3.5 sm:gap-x-4 gap-y-2 rounded-2xl border border-ink/10 bg-paper px-4 py-3.5 text-left transition-colors hover:border-ink/20 active:bg-ink/[0.03] focus:outline-none focus-visible:ring-2 focus-visible:ring-moss/50 focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
      >
        <span className="flex items-center gap-1.5">
          {slots.map((state, i) => (
            <ShieldSlot key={i} state={state} fill={state === 'filling' ? fill : 1} />
          ))}
        </span>

        <span className="min-w-0">
          <span className="block text-[14px] font-semibold leading-5 text-ink">{title}</span>
          <span className="block mt-0.5 text-[13px] leading-5 text-faded-ink">{detail}</span>
        </span>

        {/* Sits under the text on phones, at the end of the row from sm up */}
        <span className="col-start-2 sm:col-start-3 sm:row-start-1 whitespace-nowrap text-[13px] font-medium text-faded-ink underline decoration-ink/20 underline-offset-4 group-hover:text-ink group-hover:decoration-ink/50 transition-colors">
          How it works
        </span>
      </button>

      <ShieldExplainerModal
        open={open}
        onClose={() => setOpen(false)}
        currentStreak={currentStreak}
        shieldCount={shieldCount}
      />
    </>
  );
}