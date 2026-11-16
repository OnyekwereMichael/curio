import { useEffect, useState } from 'react';
import { getXpRules, xpChipFor, type XpRule } from '../services/xp';

let cache: Promise<Record<string, XpRule>> | null = null;

/** The reward config, fetched once per page load and shared by every chip. */
export function useXpRules() {
  const [rules, setRules] = useState<Record<string, XpRule> | null>(null);
  useEffect(() => {
    cache ??= getXpRules().catch((e) => {
      cache = null;
      throw e;
    });
    cache.then(setRules).catch(() => undefined);
  }, []);
  return rules;
}

/** The one reward chip: Word, Fact, Quiz and every quest row use it, so they all look the same. */
export function XpChip({ amount, startsOn }: { amount?: number; startsOn?: string }) {
  if (startsOn) {
    return (
      <span className="text-xs font-semibold text-ink-500 bg-surface border border-line px-2 py-1 rounded-tag flex-shrink-0 whitespace-nowrap">
        XP starts {startsOn}
      </span>
    );
  }
  if (!amount || amount <= 0) return null;
  return (
    <span className="text-xs font-semibold text-gold-700 bg-gold-50 px-2 py-1 rounded-tag flex-shrink-0 whitespace-nowrap">
      +{amount} XP
    </span>
  );
}

/** A chip for one config rule: live amount, "XP starts <date>" before its start date, nothing if it is switched off. */
export function RuleXpChip({ rule }: { rule: string }) {
  const rules = useXpRules();
  const info = xpChipFor(rules, rule);
  if (!info) return null;
  return info.kind === 'live' ? <XpChip amount={info.amount} /> : <XpChip startsOn={info.startsOn} />;
}
