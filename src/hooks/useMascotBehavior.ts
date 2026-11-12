import { useCallback, useEffect, useRef, useState } from 'react';
import {
  MASCOT_LINES,
  MASCOT_REACTIONS,
  MASCOT_SPECIAL_LINES,
  MASCOT_TIMING,
  type MascotContext,
  type MascotEffect,
  type MascotLine,
  type MascotMood,
} from '../lib/mascotConfig';
import { getSoundsHapticsPref } from '../services/localPrefs';

export interface MascotView {
  mood: MascotMood;
  message: string | null;
  /** Changes for every new bubble so the same text still re-pops. */
  bubbleKey: number;
  effect: MascotEffect | null;
  /** Changes for every new body effect so the same one can replay. */
  effectKey: number;
}

const rand = (min: number, max: number) => min + Math.random() * (max - min);

function timeOfDay(): 'morning' | 'afternoon' | 'evening' {
  const h = new Date().getHours();
  return h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening';
}

interface Options {
  /** False while off screen or backgrounded — all timers stop. */
  active: boolean;
  context: MascotContext;
}

/**
 * The mascot's brain: a small state machine (greeting → idle ⇄ speaking → sleeping)
 * that owns every timer, picks mood-matched lines, and handles tap reactions.
 * The visual components stay dumb; state only changes every few seconds.
 */
export function useMascotBehavior({ active, context }: Options) {
  const [view, setView] = useState<MascotView>({ mood: 'happy', message: null, bubbleKey: 0, effect: null, effectKey: 0 });
  const ctx = useRef(context);
  const sleeping = useRef(false);
  const greeted = useRef(false);
  const lastText = useRef<string | null>(null);
  const reactionIdx = useRef(-1);
  const lastTapAt = useRef(0);
  const recentTaps = useRef<number[]>([]);
  const timers = useRef<{ hide?: ReturnType<typeof setTimeout>; sleep?: ReturnType<typeof setTimeout> }>({});

  useEffect(() => {
    ctx.current = context;
  });

  /** A line from the pool that fits the data/phase we have — never the one just shown. */
  const pick = useCallback((pool: readonly MascotLine[]): string | null => {
    const c = ctx.current;
    const usable = pool.filter((l) => (!l.needs || l.needs.every((k) => c[k] != null)) && (!l.phase || l.phase === c.phase));
    const fresh = usable.filter((l) => l.text !== lastText.current);
    const choices = fresh.length ? fresh : usable;
    if (!choices.length) return null;
    const line = choices[Math.floor(Math.random() * choices.length)].text;
    lastText.current = line;
    return line.replace(/\{(\w+)\}/g, (_, k: string) => String(c[k as keyof MascotContext] ?? ''));
  }, []);

  /** Show a mood + bubble (+ body effect), then settle back after a few seconds. */
  const speak = useCallback((mood: MascotMood, message: string | null, effect: MascotEffect | null = null) => {
    clearTimeout(timers.current.hide);
    setView((v) => ({ mood, message, bubbleKey: v.bubbleKey + 1, effect, effectKey: effect ? v.effectKey + 1 : v.effectKey }));
    timers.current.hide = setTimeout(
      () => setView((v) => ({ ...v, mood: sleeping.current ? 'sleepy' : 'happy', message: null, effect: null })),
      rand(MASCOT_TIMING.bubbleMinMs, MASCOT_TIMING.bubbleMaxMs)
    );
  }, []);

  const armSleep = useCallback(() => {
    clearTimeout(timers.current.sleep);
    timers.current.sleep = setTimeout(() => {
      sleeping.current = true;
      speak('sleepy', pick(MASCOT_LINES.sleepy));
    }, MASCOT_TIMING.sleepAfterMs);
  }, [speak, pick]);

  // Greeting + ambient chatter + sleep timer — only while the mascot is actually visible.
  useEffect(() => {
    if (!active) return;
    let ambient: ReturnType<typeof setTimeout>;
    let greet: ReturnType<typeof setTimeout> | undefined;

    if (!greeted.current) {
      greeted.current = true;
      greet = setTimeout(() => {
        if (ctx.current.away) speak('grumpy', pick(MASCOT_SPECIAL_LINES.away));
        else speak('waving', pick(MASCOT_SPECIAL_LINES.greeting[timeOfDay()]), 'wave');
      }, MASCOT_TIMING.greetDelayMs);
    }

    const loop = () => {
      ambient = setTimeout(() => {
        if (!sleeping.current) {
          const c = ctx.current;
          const moods: Exclude<MascotMood, 'waving' | 'sleepy'>[] = ['happy', 'happy', 'curious'];
          if (c.trend === 'up' || (c.rank != null && c.rank <= 3 && c.phase === 'live')) moods.push('excited');
          if (c.trend === 'down') moods.push('grumpy');
          const mood = moods[Math.floor(Math.random() * moods.length)];
          const text = pick(MASCOT_LINES[mood]);
          if (text) speak(mood, text);
        }
        loop();
      }, rand(MASCOT_TIMING.ambientMinMs, MASCOT_TIMING.ambientMaxMs));
    };
    loop();
    armSleep();

    return () => {
      clearTimeout(ambient);
      clearTimeout(greet);
      clearTimeout(timers.current.hide);
      clearTimeout(timers.current.sleep);
      setView((v) => ({ ...v, mood: sleeping.current ? 'sleepy' : 'happy', message: null, effect: null }));
    };
  }, [active, speak, pick, armSleep]);

  // Rank news arrives after the greeting — react as soon as it does.
  const trend = context.trend;
  useEffect(() => {
    if (!active || !trend) return;
    if (trend === 'down') speak('grumpy', pick(MASCOT_SPECIAL_LINES.passed));
    else speak('excited', pick(MASCOT_SPECIAL_LINES.climbing), 'cheer');
  }, [active, trend, speak, pick]);

  const onTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTapAt.current < MASCOT_TIMING.tapCooldownMs) return; // swallow rapid-fire taps
    lastTapAt.current = now;
    recentTaps.current = [...recentTaps.current.filter((t) => now - t < MASCOT_TIMING.rapidTapWindowMs), now];
    armSleep();

    if (sleeping.current) {
      sleeping.current = false;
      speak('excited', pick(MASCOT_SPECIAL_LINES.wake), 'jump');
      return;
    }
    if (recentTaps.current.length >= MASCOT_TIMING.rapidTapLimit) {
      recentTaps.current = [];
      speak('grumpy', pick(MASCOT_SPECIAL_LINES.rapid), 'spin');
      return;
    }
    reactionIdx.current = (reactionIdx.current + 1) % MASCOT_REACTIONS.length;
    const { effect, mood } = MASCOT_REACTIONS[reactionIdx.current];
    speak(mood, pick(MASCOT_SPECIAL_LINES.tap[effect]), effect);
    if (mood === 'excited' && getSoundsHapticsPref()) navigator.vibrate?.(12);
  }, [speak, pick, armSleep]);

  return { ...view, onTap };
}
