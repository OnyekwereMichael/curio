import { LegalPage, type LegalSection } from '../../components/LegalPage';
import { SITE } from '../../lib/siteConfig';

const { legal, contactEmail, name } = SITE;

const SECTIONS: LegalSection[] = [
  {
    id: 'who-we-are',
    title: 'Who we are',
    blocks: [
      { type: 'p', text: `${name} (trycuri.app) is run by ${legal.companyName}, ${legal.registeredAddress}. We are the controller of your personal data. Contact: ${contactEmail}.` },
    ],
  },
  {
    id: 'data-we-collect',
    title: 'What we collect',
    blocks: [
      {
        type: 'ul',
        items: [
          'Account: name, email and password, or your name, email and photo from Google if you sign in with Google.',
          'Profile: your learning plan, settings, friends and friend code.',
          'Activity: words, facts, quizzes and games, streaks, XP, badges, saved words and lists, and your leaderboard rank.',
          'Device and usage: browser and device type, features used, crash reports, and occasional session recordings to fix bugs.',
          'Push notification token, if you allow notifications.',
          'Prize winners only: payment and identity details needed to pay you.',
        ],
      },
    ],
  },
  {
    id: 'how-we-use-it',
    title: 'How we use it',
    blocks: [
      { type: 'p', text: 'To run the app, the leaderboard and weekly prizes (including fair-play checks); send reminders and emails you can turn off in Settings; keep the service secure; and improve it. Under the Nigeria Data Protection Act 2023 (NDPA) we rely on contract, your consent, our legitimate interests, and legal obligation.' },
    ],
  },
  {
    id: 'public-vs-private',
    title: 'What others can see',
    blocks: [
      { type: 'p', text: 'Public to signed-in users on the leaderboard: your display name (first name and last initial), profile photo if you have one, XP and rank. Friends also see your streak and weekly XP. Your email, password and saved words are never shown. You can hide yourself from leaderboards in Settings, but hidden users cannot win prizes.' },
    ],
  },
  {
    id: 'third-parties',
    title: 'Services we use',
    blocks: [
      {
        type: 'ul',
        items: [
          'Supabase: database, sign-in and server functions.',
          'Google: optional sign-in.',
          'PostHog: usage analytics.',
          'Sentry: error monitoring and session replays.',
          'Resend: email delivery.',
          'Browser push services: notifications.',
          'A public dictionary API: receives the word you look up.',
          `Prize payments: via ${legal.payoutMethod}.`,
        ],
      },
      { type: 'p', text: 'Some providers are outside Nigeria; we transfer data only with safeguards the NDPA requires. We do not sell your data.' },
    ],
  },
  {
    id: 'retention',
    title: 'How long we keep it',
    blocks: [
      { type: 'p', text: 'While your account is active. If you delete your account (Settings → Danger zone) we delete or anonymise your data, except records we must keep by law, such as prize payments.' },
    ],
  },
  {
    id: 'your-rights',
    title: 'Your rights',
    blocks: [
      { type: 'p', text: `You can access, correct, delete, restrict or port your data, object to processing, and withdraw consent at any time. Email ${contactEmail}. You may also complain to the Nigeria Data Protection Commission.` },
    ],
  },
  {
    id: 'security',
    title: 'Security',
    blocks: [
      { type: 'p', text: 'We use encryption in transit and database access rules so users can only reach their own private data. If a breach affects you, we will notify you and the authorities as required.' },
    ],
  },
  {
    id: 'children',
    title: "Children",
    blocks: [
      { type: 'p', text: `${name} is for people aged ${legal.minimumAge}+. We do not knowingly collect data from younger children; contact us and we will delete it. Prizes are for users aged ${legal.prizeMinimumAge}+.` },
    ],
  },
  {
    id: 'cookies',
    title: 'Cookies',
    blocks: [
      { type: 'p', text: 'We use cookies and local storage to keep you signed in, remember settings like theme, and run analytics and error monitoring. You can block them in your browser, but parts of the app may stop working.' },
    ],
  },
  {
    id: 'changes',
    title: 'Updates',
    blocks: [
      { type: 'p', text: 'We will update the date above when this policy changes, and tell you about important changes in the app or by email.' },
    ],
  },
];

export function PrivacyPolicy() {
  return (
    <LegalPage
      title="Privacy Policy"
      intro={`What ${name} collects, why, and your choices. Written to align with the Nigeria Data Protection Act 2023.`}
      sections={SECTIONS}
    />
  );
}
