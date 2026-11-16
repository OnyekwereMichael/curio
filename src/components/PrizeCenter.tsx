import { useState } from 'react';
import { useMyPrizes } from '../hooks/useMyPrizes';
import { PrizeClaimBanner } from './PrizeClaimBanner';
import { WeeklyResultModal } from './WeeklyResultModal';
import { PayoutForm, type PayoutTarget } from './PayoutForm';
import type { PrizeClaim } from '../services/prizes';

const toTarget = (c: PrizeClaim): PayoutTarget => ({
  id: c.id,
  rank: c.rank,
  prizeAmount: c.prizeAmount,
  currency: c.currency,
  claimDeadline: c.claimDeadline,
});

/**
 * Everything about the weekly prize on the dashboard: the persistent claim banner, the end-of-week
 * results modal and the payout form. Renders nothing for users with no result and no prize.
 */
export function PrizeCenter() {
  const { unseen, claims, needsDetails, awaitingPayment, dismissResult, refresh } = useMyPrizes();
  const [target, setTarget] = useState<PayoutTarget | null>(null);

  function openFromResult(winnerId: string) {
    const claim = claims.find((c) => c.id === winnerId);
    if (claim) setTarget(toTarget(claim));
    else if (unseen?.winner) {
      setTarget({
        id: unseen.winner.id,
        rank: unseen.winner.rank,
        prizeAmount: unseen.winner.prizeAmount,
        currency: unseen.winner.currency,
        claimDeadline: unseen.winner.claimDeadline,
      });
    }
    if (unseen) dismissResult(unseen.weekStart);
  }

  return (
    <>
      <PrizeClaimBanner needsDetails={needsDetails} awaitingPayment={awaitingPayment} onSubmit={(c) => setTarget(toTarget(c))} />

      <WeeklyResultModal
        // Don't stack the results modal on top of the payout form.
        result={target ? null : unseen}
        onClose={() => unseen && dismissResult(unseen.weekStart)}
        onClaim={openFromResult}
      />

      <PayoutForm
        target={target}
        onClose={() => {
          setTarget(null);
          refresh();
        }}
        onSubmitted={refresh}
      />
    </>
  );
}
