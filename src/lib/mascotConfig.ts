/**
 * Everything the Curi mascot says and how often — copy and timing live here,
 * never in components. Lines can use {rank}, {xpToPodium}, {streak}, {topPrize};
 * a line is only picked when the data it needs is available (`needs`) and the
 * competition is in the right phase (`phase`).
 */
export type MascotMood = 'happy' | 'excited' | 'waving' | 'curious' | 'grumpy' | 'sleepy';
export type MascotEffect = 'jump' | 'spin' | 'cheer' | 'wave' | 'giggle';

export interface MascotContext {
  rank?: number | null;
  xpToPodium?: number | null;
  streak?: number;
  phase?: 'upcoming' | 'live';
  topPrize?: string;
  /** Rank moved since the user last looked. */
  trend?: 'up' | 'down' | null;
  /** The user hasn't been around for a while. */
  away?: boolean;
}

type DataKey = 'rank' | 'xpToPodium' | 'streak' | 'topPrize';

export interface MascotLine {
  text: string;
  needs?: DataKey[];
  phase?: 'upcoming' | 'live';
}

export const MASCOT_TIMING = {
  ambientMinMs: 8000,
  ambientMaxMs: 12000,
  bubbleMinMs: 3000,
  bubbleMaxMs: 4000,
  greetDelayMs: 600,
  /** First unprompted reaction, counted from when the mascot becomes visible. */
  firstAutoMs: 5000,
  sleepAfterMs: 45000,
  tapCooldownMs: 350,
  rapidTapWindowMs: 1600,
  rapidTapLimit: 4,
  awayAfterDays: 2,
} as const;

/** Tap reactions cycle through these in order. */
export const MASCOT_REACTIONS: { effect: MascotEffect; mood: MascotMood }[] = [
  { effect: 'jump', mood: 'excited' },
  { effect: 'spin', mood: 'excited' },
  { effect: 'cheer', mood: 'excited' },
  { effect: 'wave', mood: 'waving' },
  { effect: 'giggle', mood: 'happy' },
];

/** Ambient lines, by the mood the mascot is in while saying them. */
export const MASCOT_LINES: Record<'happy' | 'excited' | 'curious' | 'grumpy' | 'sleepy', MascotLine[]> = {
  happy: [
    { text: "Hey! How's the learning going? 👋" },
    { text: 'Ready to earn some XP today?' },
    { text: 'A little learning, every day. 🌱' },
    { text: '{topPrize} could be yours this week 🏆', needs: ['topPrize'], phase: 'live' },
    { text: 'Starts Monday. Get ready!', phase: 'upcoming' },
    { text: "🔥 {streak}-day streak — don't stop now!", needs: ['streak'] },
    { text: "You're #{rank} this week. Nice! 😊", needs: ['rank'], phase: 'live' },
  ],
  excited: [
    { text: "You're climbing the leaderboard! 🚀" },
    { text: 'Top 3 is in reach! {xpToPodium} XP to go ✨', needs: ['xpToPodium'], phase: 'live' },
    { text: 'Look at you go! 🎉' },
  ],
  curious: [
    { text: "Did you finish today's lesson?" },
    { text: 'Learned any new words today? 🤔' },
    { text: '{xpToPodium} XP to the top 3… one quiz away?', needs: ['xpToPodium'], phase: 'live' },
  ],
  grumpy: [
    { text: 'Someone just passed you on the leaderboard! 😤', phase: 'live' },
    { text: 'Hmm… your streak could use some love. 😤', needs: ['streak'] },
  ],
  sleepy: [{ text: 'Zzz… tap me to wake me up. 😴' }],
};

/** What the mascot voices when it talks (browser speech): pitch/rate per mood, so the voice matches the face. */
export const MASCOT_VOICE: Record<MascotMood, { pitch: number; rate: number }> = {
  happy: { pitch: 1.35, rate: 1.05 },
  excited: { pitch: 1.6, rate: 1.2 },
  waving: { pitch: 1.4, rate: 1.05 },
  curious: { pitch: 1.3, rate: 1 },
  grumpy: { pitch: 0.9, rate: 0.95 },
  sleepy: { pitch: 0.8, rate: 0.75 },
};

export interface MascotBeat {
  mood: MascotMood;
  /** Lines to pick from; some data lines are skipped when their data isn't available. */
  lines: MascotLine[];
  /** Body reactions to play on their own — one is chosen at random. */
  effects: MascotEffect[];
}

/**
 * The unprompted "things that happen" — the same reactions a tap gives, played
 * automatically every few seconds. A function only because it reads
 * MASCOT_SPECIAL_LINES, which is declared further down.
 */
export const MASCOT_AMBIENT_BEATS = (): MascotBeat[] => [
  { mood: 'happy', lines: MASCOT_LINES.happy, effects: ['giggle'] },
  { mood: 'happy', lines: MASCOT_LINES.happy, effects: [] },
  { mood: 'waving', lines: MASCOT_SPECIAL_LINES.tap.wave, effects: ['wave'] },
  { mood: 'curious', lines: MASCOT_LINES.curious, effects: [] },
  { mood: 'excited', lines: MASCOT_LINES.excited, effects: ['jump', 'spin', 'cheer'] },
];

/** One-off situations: greeting, rank news, waking up, tap reactions. */
export const MASCOT_SPECIAL_LINES = {
  greeting: {
    morning: [{ text: 'Good morning! Ready to learn something new? ☀️' }],
    afternoon: [{ text: 'Good afternoon! Time for a quick win? 👋' }],
    evening: [{ text: 'Good evening! One more lesson before bed? 🌙' }],
  },
  away: [{ text: "Hmm… you've been away. I missed you! 😤" }],
  passed: [{ text: 'Someone just passed you on the leaderboard! 😤' }],
  climbing: [{ text: "You're climbing the leaderboard! 🚀" }],
  wake: [{ text: "I'm up, I'm up! Let's learn! ☀️" }],
  rapid: [{ text: "Easy! I'm getting dizzy 😵‍💫" }, { text: "Okay okay, I'm ticklish! 😆" }],
  tap: {
    jump: [{ text: 'Boing! 🦘' }, { text: 'Up we go! ⬆️' }],
    spin: [{ text: 'Wheee! 🌀' }, { text: 'Spin spin spin! 💫' }],
    cheer: [{ text: "Yay! You've got this! 🎉" }, { text: 'Go go go! 📣' }],
    wave: [{ text: 'Hi again! 👋' }, { text: 'Hello, friend! 👋' }],
    giggle: [{ text: 'Hehe, that tickles! 😆' }, { text: 'Tee-hee! 🤭' }],
  } satisfies Record<MascotEffect, MascotLine[]>,
} satisfies Record<string, unknown>;
