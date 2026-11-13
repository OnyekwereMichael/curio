import {
  Award,
  Bell,
  BookOpen,
  Bookmark,
  CalendarCheck,
  Flame,
  HelpCircle,
  LineChart,
  Lightbulb,
  RotateCcw,
  Search,
  Smartphone,
  Smile,
  SlidersHorizontal,
  Swords,
  Trophy,
  UserPlus,
  Users,
  Zap,
  type LucideIcon,
} from 'lucide-react';

/**
 * Marketing-site content in one place: brand, contact, legal placeholders, footer
 * links, the feature list and the "how it works" steps. The landing page,
 * footer and legal pages all read from here — nothing is hardcoded in JSX.
 */
export const SITE = {
  name: 'Curi',
  tagline: 'One word. One fact. Every day.',
  /** Only address found in the codebase (the Resend sender). Confirm it is a monitored inbox. */
  contactEmail: 'business@mail.trycuri.app',
  /** Social profiles — none exist in the codebase yet. Add { label, href } entries to show them. */
  socials: [] as { label: string; href: string }[],
  legal: {
    lastUpdated: '12 November 2026',
    // Anything in [[double brackets]] is highlighted on the legal pages as a to-do.
    companyName: 'Curi',
    registeredAddress: '[[Registered address — add before launch]]',
    payoutMethod: 'bank transfer',
    payoutWindow: '14 days',
    minimumAge: '13',
    prizeMinimumAge: '18',
    courtLocation: 'Lagos State',
  },
} as const;

export const NAV_LINKS = [
  { label: 'Features', href: '/#features' },
  { label: 'How it works', href: '/#how' },
  { label: 'Prizes', href: '/#prizes' },
] as const;

export const FOOTER_COLUMNS = [
  {
    title: 'Product',
    links: [
      { label: 'Features', href: '/#features' },
      { label: 'How it works', href: '/#how' },
      { label: 'Weekly prizes', href: '/#prizes' },
      { label: 'Watch the video', href: '/#video' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'Log in', to: '/login' },
      { label: 'Sign up', to: '/welcome' },
      { label: 'Contact', href: `mailto:${SITE.contactEmail}` },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy Policy', to: '/privacy' },
      { label: 'Terms of Service', to: '/terms' },
    ],
  },
] as const;

export type FeatureTone = 'ember' | 'moss' | 'gold' | 'ink';

export interface Feature {
  icon: LucideIcon;
  title: string;
  description: string;
}

export interface FeatureGroup {
  id: string;
  title: string;
  blurb: string;
  tone: FeatureTone;
  features: Feature[];
}

/** Every user-facing feature in the app, grouped for the landing page. */
export const FEATURE_GROUPS: FeatureGroup[] = [
  {
    id: 'learn',
    title: 'Learn',
    blurb: 'Two minutes a day. Words and facts that actually stay.',
    tone: 'ember',
    features: [
      { icon: BookOpen, title: 'Word of the day', description: 'Hear it, see it in a sentence, and make it yours — at your level.' },
      { icon: Lightbulb, title: 'Fact of the day', description: 'Four quick takeaways on topics you pick, built to be remembered.' },
      { icon: HelpCircle, title: 'Daily quiz', description: 'A short quiz locks in what you learned and counts your day.' },
      { icon: RotateCcw, title: 'Spaced review', description: 'Old words resurface right before you forget them, until they are mastered.' },
      { icon: Search, title: 'Instant dictionary', description: 'Look up any word in a tap, or press Ctrl/Cmd + K anywhere.' },
      { icon: Bookmark, title: 'Saved words & lists', description: 'Save words and sort them into your own lists to revisit any time.' },
    ],
  },
  {
    id: 'grow',
    title: 'Grow',
    blurb: 'Small habits, visible progress.',
    tone: 'moss',
    features: [
      { icon: Flame, title: 'Streaks & shields', description: 'Show up daily to build a streak. Shields cover you on a busy day.' },
      { icon: Zap, title: 'XP, levels & quests', description: 'Earn XP for everything you do, level up, and finish daily quests.' },
      { icon: Award, title: 'Badges', description: 'Collect badges on your pebble shelf as you hit milestones.' },
      { icon: LineChart, title: 'Progress tracking', description: 'A weekly goal ring and streak calendar show how far you have come.' },
    ],
  },
  {
    id: 'compete',
    title: 'Play & compete',
    blurb: 'Learning is better with someone to beat.',
    tone: 'gold',
    features: [
      { icon: Swords, title: 'Word Duel', description: 'Race a friend in a live 1v1 — pick the right word for the definition.' },
      { icon: CalendarCheck, title: 'Daily challenge', description: 'Five words, one try, the same for everyone. Share your score.' },
      { icon: Users, title: 'Friends & streak buddies', description: 'Add friends with a code, see a weekly board, and keep a shared streak.' },
      { icon: Trophy, title: 'Global leaderboard & prizes', description: 'Rank against every learner. The top 3 each week win cash prizes.' },
    ],
  },
  {
    id: 'personal',
    title: 'Make it yours',
    blurb: 'Curi adapts to you, and cheers you on.',
    tone: 'ink',
    features: [
      { icon: SlidersHorizontal, title: 'Personal plan', description: 'Choose your word style, level, words per day, topics and reminder time.' },
      { icon: Bell, title: 'Gentle reminders', description: 'Daily word pushes, an evening nudge and an optional weekly recap email.' },
      { icon: Smile, title: 'Curi the otter', description: 'A friendly mascot who greets you, reacts, and talks you through your week.' },
      { icon: Smartphone, title: 'Install it anywhere', description: 'Works as an app on your phone, in light or dark mode, with motion you control.' },
    ],
  },
];

export interface Step {
  icon: LucideIcon;
  title: string;
  description: string;
}

export const HOW_IT_WORKS_STEPS: Step[] = [
  { icon: UserPlus, title: 'Sign up free', description: 'Create an account in seconds and pick your level and topics.' },
  { icon: BookOpen, title: 'Learn & earn XP', description: 'Do your daily word, fact and quiz. Every step earns XP and builds your streak.' },
  { icon: Swords, title: 'Play & climb', description: 'Duel friends, take the daily challenge, and rise up the leaderboard.' },
  { icon: Trophy, title: 'Win weekly prizes', description: 'The top 3 learners each week are rewarded, then the board resets on Monday.' },
];
