import { Trophy, Clock, CheckCircle2 } from 'lucide-react';
import type { PrizeClaim } from '../services/prizes';
import { ORDINAL, formatMoney, timeLeft } from '../lib/payout';

interface Props {
  /** Prizes whose payout details are still missing. The banner stays until they are submitted. */
  needsDetails: PrizeClaim[];
  /** Prizes whose details are in and are waiting to be paid. */
  awaitingPayment: PrizeClaim[];
  onSubmit: (claim: PrizeClaim) => void;
}

/** Persistent dashboard banner for an unclaimed prize; there is no dismiss button on purpose. */
export function PrizeClaimBanner({ needsDetails, awaitingPayment, onSubmit }: Props) {
  const open = needsDetails.filter((c) => !!timeLeft(c.claimDeadline));
  if (open.length === 0 && awaitingPayment.length === 0) return null;

  return (
    <div className="flex flex-col gap-3 font-ui" aria-live="polite">
      {open.map((c) => (
        <section
          key={c.id}
          aria-label="Claim your prize"
          className="relative overflow-hidden rounded-sheet border border-gold-500/50 bg-gold-50 p-4 flex items-center gap-3 shadow-card"
        >
          <span className="w-11 h-11 rounded-full bg-paper text-gold-700 flex items-center justify-center flex-shrink-0">
            <Trophy size={22} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-ink-900 leading-snug">
              You won {ORDINAL[c.rank] ?? `#${c.rank}`} place · {formatMoney(c.prizeAmount, c.currency)}
            </p>
            <p className="text-xs text-ink-500 mt-0.5 flex items-center gap-1">
              <Clock size={12} className="flex-shrink-0" />
              Submit your payout details · {timeLeft(c.claimDeadline)}
            </p>
          </div>
          <button
            onClick={() => onSubmit(c)}
            className="flex-shrink-0 rounded-control bg-gold-700 px-4 py-2.5 text-xs font-semibold text-white hover:brightness-110 active:brightness-95 transition-all"
          >
            Submit details
          </button>
        </section>
      ))}

      {awaitingPayment.map((c) => (
        <p key={c.id} className="flex items-center gap-2 rounded-control bg-moss-50 px-4 py-2.5 text-xs text-moss-600">
          <CheckCircle2 size={14} className="flex-shrink-0" />
          Details received for your {formatMoney(c.prizeAmount, c.currency)} prize
          {c.accountLast4 ? ` (account ending ${c.accountLast4})` : ''}. Payment is on its way.
        </p>
      ))}
    </div>
  );
}
