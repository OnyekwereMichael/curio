import { LegalPage, type LegalSection } from '../../components/LegalPage';
import { COMPETITION, WEEKLY_PRIZES, formatPrize } from '../../lib/leaderboardConfig';
import { SITE } from '../../lib/siteConfig';

const { legal, contactEmail, name } = SITE;

const ORDINAL = ['1st', '2nd', '3rd'];
const prizeList = WEEKLY_PRIZES.map((p) => `${ORDINAL[p.place - 1] ?? `${p.place}th`} place: ${formatPrize(p.amount)}`);
const startDate = new Date(COMPETITION.startsAt).toLocaleDateString('en-NG', {
  timeZone: COMPETITION.timezone,
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

const SECTIONS: LegalSection[] = [
  {
    id: 'accepting',
    title: 'Agreement',
    blocks: [
      { type: 'p', text: `By creating an account or using ${name}, run by ${legal.companyName}, you agree to these terms and our Privacy Policy.` },
    ],
  },
  {
    id: 'accounts',
    title: 'Accounts',
    blocks: [
      { type: 'p', text: `You must be ${legal.minimumAge} or older, give accurate details, and keep your password safe. One person, one account. You can delete your account any time in Settings.` },
    ],
  },
  {
    id: 'fair-play',
    title: 'Fair play',
    blocks: [
      { type: 'p', text: 'Do not:' },
      {
        type: 'ul',
        items: [
          'use multiple accounts or share an account;',
          'use bots, scripts or exploits to earn XP, streaks or game wins;',
          'manipulate rankings or collude with others;',
          'harass others or use offensive names;',
          'attack, scrape or reverse-engineer the service.',
        ],
      },
    ],
  },
  {
    id: 'prizes',
    title: 'Weekly prizes',
    blocks: [
      { type: 'ul', items: prizeList },
      {
        type: 'ul',
        items: [
          'Ranking is by XP earned in the week. Each week runs Monday 00:00 to Sunday 23:59 Lagos time (WAT), then resets.',
          `Prizes start with the week beginning ${startDate}. Earlier XP does not count.`,
          `You need at least ${COMPETITION.minWeeklyXp} XP that week and must not be hidden from the leaderboard.`,
          'Ties: whoever reached the tied XP first ranks higher.',
          `Winners must be ${legal.prizeMinimumAge}+, may be asked to verify identity, and are paid by ${legal.payoutMethod} within ${legal.payoutWindow} of confirmation. Unclaimed prizes may be forfeited. Winners handle any tax on prizes.`,
          'We may disqualify anyone we reasonably believe cheated, withhold or reclaim their prize, and award it to the next eligible user.',
          'We may change or end prizes at any time with notice in the app; confirmed weeks are not affected.',
        ],
      },
    ],
  },
  {
    id: 'ip',
    title: 'Content and ownership',
    blocks: [
      { type: 'p', text: `${name}'s words, facts, design, mascot and software belong to us. You may use them for personal learning only. What you create (such as display name and saved lists) stays yours, and you let us display it to run the service, e.g. on leaderboards.` },
    ],
  },
  {
    id: 'liability',
    title: 'Disclaimers and liability',
    blocks: [
      { type: 'p', text: `${name} is provided “as is”. Content is for general learning, not professional advice, and we cannot promise it is error-free or always available. To the extent the law allows, we are not liable for indirect or consequential loss, and our total liability is limited to ₦10,000.` },
    ],
  },
  {
    id: 'termination',
    title: 'Termination',
    blocks: [
      { type: 'p', text: 'We may suspend or end accounts that break these terms, including removing prize eligibility.' },
    ],
  },
  {
    id: 'governing-law',
    title: 'Governing law',
    blocks: [
      { type: 'p', text: `Nigerian law governs these terms. Disputes go to the courts of ${legal.courtLocation} after we try to settle them informally.` },
    ],
  },
  {
    id: 'changes',
    title: 'Changes and contact',
    blocks: [
      { type: 'p', text: `We may update these terms and will tell you about important changes. Continued use means you accept them. Questions: ${contactEmail}.` },
    ],
  },
];

export function TermsOfService() {
  return (
    <LegalPage
      title="Terms of Service"
      intro={`The short rules for using ${name}, including fair play and weekly prizes.`}
      sections={SECTIONS}
    />
  );
}
