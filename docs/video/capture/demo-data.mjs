// 100% fictional demo data. Nothing here comes from the real database.
const today = new Date();
const iso = (d) => d.toISOString().split('T')[0];
const daysAgo = (n) => iso(new Date(today.getTime() - n * 864e5));

const PALETTE = ['#C73B20', '#3E6259', '#C7962E', '#1C2B3A', '#8A6416', '#2F4C44', '#A3301A'];
// Illustrated initial avatars (SVG data URIs) — no real photos.
export const avatar = (name, i) => {
  const c = PALETTE[i % PALETTE.length];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><rect width="80" height="80" fill="${c}"/><text x="40" y="53" font-family="Sora,sans-serif" font-size="36" font-weight="700" fill="#fff" text-anchor="middle">${name[0]}</text></svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
};

export const ME = { id: '00000000-0000-4000-8000-000000000012', name: 'Dami K.' };

const WEEK = [
  ['Chiamaka O.', 940], ['Tunde A.', 905], ['Ngozi E.', 870], ['Emeka N.', 812], ['Aisha B.', 780],
  ['Seyi A.', 745], ['Ifeanyi U.', 702], ['Zainab M.', 660], ['Kelechi I.', 615], ['Bola T.', 580],
  ['Funke R.', 541], ['Dami K.', 508], ['Obinna C.', 470], ['Hauwa S.', 433], ['Yetunde L.', 401],
  ['Chidi P.', 372], ['Amaka D.', 340], ['Segun W.', 311], ['Halima Y.', 285], ['Tobi F.', 250],
];
const ALL = [
  ['Tunde A.', 4820], ['Chiamaka O.', 4410], ['Ngozi E.', 3960], ['Aisha B.', 3515], ['Emeka N.', 3190],
  ['Seyi A.', 2870], ['Zainab M.', 2640], ['Ifeanyi U.', 2415], ['Bola T.', 2290], ['Kelechi I.', 2105],
  ['Funke R.', 1960], ['Dami K.', 1840], ['Obinna C.', 1710], ['Hauwa S.', 1585], ['Yetunde L.', 1460],
];
const toRows = (list) =>
  list.map(([name, xp], i) => {
    const isMe = name === ME.name;
    return { rank: i + 1, id: isMe ? ME.id : `u${i}-${name}`, name, avatar_url: avatar(name, i), xp, is_me: isMe };
  });

export function leaderboard(period) {
  const rows = toRows(period === 'all' ? ALL : WEEK);
  const me = rows.find((r) => r.is_me);
  const podiumXp = rows[2].xp;
  const above = rows[me.rank - 2];
  const monday = new Date(); // week window only needs to be plausible
  monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7));
  monday.setUTCHours(-1, 0, 0, 0);
  return {
    period_start: monday.toISOString(),
    period_end: new Date(monday.getTime() + 7 * 864e5).toISOString(),
    competition_start: '2026-11-16T00:00:00+01:00',
    min_weekly_xp: 50,
    total: period === 'all' ? 1284 : 342,
    rows,
    me: { ...me, xp_to_next: above.xp - me.xp + 1, xp_to_podium: podiumXp - me.xp + 1 },
  };
}

export const friends = {
  leaderboard: [
    { id: 'f1', name: 'Tunde A.', weekly_xp: 905, is_me: false },
    { id: 'f2', name: 'Ngozi E.', weekly_xp: 870, is_me: false },
    { id: ME.id, name: 'Dami K.', weekly_xp: 508, is_me: true },
    { id: 'f4', name: 'Funke R.', weekly_xp: 541, is_me: false },
    { id: 'f5', name: 'Bola T.', weekly_xp: 330, is_me: false },
  ].sort((a, b) => b.weekly_xp - a.weekly_xp),
  friends_count: 4,
  hidden: false,
  streak_buddy: { id: 'f4', name: 'Funke R.', days_together: 9, both_done_today: true },
};

export const userRow = {
  id: ME.id, name: 'Dami Kolawole', total_xp: 1840, level: 9,
  current_streak: 12, longest_streak: 14, last_active_date: daysAgo(0), shield_count: 2, lost_streak: 0,
  last_milestone_shown: 7, notifications_enabled: true, notification_token: null, installed: true,
};

export const prefs = {
  word_style: 'everyday', level: 'intermediate', words_per_day: 2, fact_topics: ['science', 'history', 'nature'],
  weekly_goal: 5, reminder_time: '08:00', evening_nudge: true, weekly_recap_email: false, onboarded: true, onboarding_completed: true,
};

export const words = [
  { id: 'w1', word: 'Resilient', definition: 'Able to recover quickly after difficulty.', example_sentence: 'Lagos traders are resilient — they bounce back after every setback.', pronunciation_audio_url: '', category: 'everyday', publish_date: daysAgo(0), created_at: daysAgo(30) },
  { id: 'w2', word: 'Meticulous', definition: 'Showing great attention to detail.', example_sentence: 'She kept meticulous notes on every lesson.', pronunciation_audio_url: '', category: 'everyday', publish_date: daysAgo(0), created_at: daysAgo(30) },
];
const FACT_IMG = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 220"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3E6259"/><stop offset="1" stop-color="#C7962E"/></linearGradient></defs><rect width="400" height="220" fill="url(#g)"/><circle cx="200" cy="95" r="52" fill="#FFFDF9" opacity=".92"/><circle cx="182" cy="88" r="7" fill="#1C2B3A"/><circle cx="218" cy="88" r="7" fill="#1C2B3A"/><g stroke="#FFFDF9" stroke-width="9" stroke-linecap="round" fill="none"><path d="M165 135q-30 40-70 38"/><path d="M185 145q-12 40-45 52"/><path d="M215 145q12 40 45 52"/><path d="M235 135q30 40 70 38"/></g></svg>');
export const fact = { id: 'f1', image_url: FACT_IMG, hook_line: 'Octopuses have three hearts', context_line: 'Among the most intelligent invertebrates in the ocean.', bullet_1: 'Two hearts pump blood to the gills, one to the body', bullet_2: 'They change colour and texture to camouflage instantly', bullet_3: 'Octopus blood is blue, not red', bullet_4: 'They can taste through their arms', category: 'nature', publish_date: daysAgo(0), created_at: daysAgo(30) };

export const quests = [
  { key: 'learn_words', xp: 20, completed_at: new Date().toISOString() },
  { key: 'quiz_score', xp: 30, completed_at: null },
  { key: 'review_3', xp: 20, completed_at: null },
];
export const badges = [
  { key: 'streak_7', name: '7-day streak', color: 'ember' }, { key: 'first_quiz', name: 'First quiz', color: 'moss' },
  { key: 'perfect_5', name: 'Perfect score', color: 'gold' }, { key: 'words_50', name: '50 words', color: 'ink' },
  { key: 'streak_14', name: '14-day streak', color: 'ember' }, { key: 'duelist', name: 'Duelist', color: 'moss' },
];
export const earned = badges.slice(0, 4).map((b, i) => ({ earned_at: daysAgo(i * 3), badges: b }));

export const activityLog = Array.from({ length: 12 }, (_, i) => ({ activity_date: daysAgo(i), quiz_completed: true, quiz_perfect: i % 4 !== 3, quiz_score: 4 + (i % 2) }));

export const challenge = {
  number: 47, total: 5, answered: 0, score: 0, completed: false, streak: 3, answers: [],
  questions: [
    { index: 0, question: 'Which word means "lasting a very short time"?', options: ['Ephemeral', 'Eternal', 'Robust', 'Candid'] },
    { index: 1, question: 'Pick the meaning of "meticulous".', options: ['Careless', 'Very careful about detail', 'Loud', 'Ancient'] },
    { index: 2, question: '"Sonder" is the feeling that…', options: ['You are late', 'Strangers have lives as full as yours', 'It will rain', 'You are hungry'] },
    { index: 3, question: 'Which is a synonym for "resilient"?', options: ['Fragile', 'Tough', 'Silent', 'Vague'] },
    { index: 4, question: 'What does "candid" mean?', options: ['Sweet', 'Honest and direct', 'Hidden', 'Tiny'] },
  ],
};

const MASTERY = ['learning', 'mastered', 'new', 'learning', 'mastered', 'learning', 'new', 'mastered', 'learning'];
const EXTRA = ['Ephemeral', 'Candid', 'Sonder', 'Eloquent', 'Pragmatic', 'Serene', 'Tenacious'];
export const savedWords = [...words, ...EXTRA.map((w, i) => ({ id: 'x' + i, word: w, definition: 'A word worth knowing.', example_sentence: 'An example sentence.', pronunciation_audio_url: '', category: ['everyday', 'academic', 'literary'][i % 3], publish_date: daysAgo(i + 1), created_at: daysAgo(30) }))]
  .map((w, i) => ({ marked_known: i % 2 === 0, saved: true, mastery: MASTERY[i % MASTERY.length], due_at: i % 3 === 0 ? daysAgo(1) : null, words: w }));
