import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, RotateCcw, FlaskConical } from 'lucide-react';
import { isAdmin, type PrizeClaim, type WeekResult } from '../../services/prizes';
import { WeeklyResultModal } from '../../components/WeeklyResultModal';
import { PrizeClaimBanner } from '../../components/PrizeClaimBanner';
import { PayoutForm, type PayoutTarget } from '../../components/PayoutForm';

const PRIZE: Record<number, number> = { 1: 2500, 2: 1500, 3: 1000 };
const daysFromNow = (d: number) => new Date(Date.now() + d * 86_400_000).toISOString();

function fakeResult(rank: number, disqualified = false): WeekResult {
  if (disqualified) {
    return {
      weekStart: '2026-11-15T23:00:00Z',
      weekEnd: '2026-11-22T23:00:00Z',
      rank,
      xp: 246,
      participants: 42,
      minWeeklyXp: 20,
      currency: 'NGN',
      thirdXp: 221,
      winner: null,
      removal: { reason: 'Two accounts were used on the same network. This breaks our one-account-per-person rule.' },
    };
  }
  return {
    weekStart: '2026-11-15T23:00:00Z',
    weekEnd: '2026-11-22T23:00:00Z',
    rank,
    xp: 246 - (rank - 1) * 12,
    participants: 42,
    minWeeklyXp: 20,
    currency: 'NGN',
    thirdXp: 221,
    winner: {
      id: 'preview-winner',
      rank,
      prizeAmount: PRIZE[rank],
      currency: 'NGN',
      status: 'pending',
      claimDeadline: daysFromNow(7), // what approving a winner sets
    },
    removal: null,
  };
}

function fakeClaim(rank: number, last4: string | null): PrizeClaim {
  return {
    id: 'preview-winner',
    weekStart: '2026-11-15T23:00:00Z',
    rank,
    xp: 246,
    prizeAmount: PRIZE[rank],
    currency: 'NGN',
    status: last4 ? 'submitted' : 'pending',
    claimDeadline: daysFromNow(7),
    submittedAt: last4 ? new Date().toISOString() : null,
    paidAt: null,
    bankName: last4 ? 'Preview Bank' : null,
    accountLast4: last4,
    accountName: last4 ? 'Preview Name' : null,
  };
}

/**
 * Admin-only walkthrough of what a winner sees after you approve them: the results pop-up, the
 * persistent banner, and the bank-details form. It uses the real components with fake data and a
 * fake submit, so nothing is read from or written to any real prize.
 */
export function AdminPrizePreview() {
  const navigate = useNavigate();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [rank, setRank] = useState(1);
  const [showResult, setShowResult] = useState(true);
  const [target, setTarget] = useState<PayoutTarget | null>(null);
  const [last4, setLast4] = useState<string | null>(null);
  const [dq, setDq] = useState(false);

  useEffect(() => {
    isAdmin().then(setAllowed);
  }, []);

  function restart(nextRank = rank, nextDq = dq) {
    setRank(nextRank);
    setDq(nextDq);
    setLast4(null);
    setTarget(null);
    setShowResult(true);
  }

  const claim = fakeClaim(rank, last4);
  const toTarget = (c: PrizeClaim): PayoutTarget => ({
    id: c.id,
    rank: c.rank,
    prizeAmount: c.prizeAmount,
    currency: c.currency,
    claimDeadline: c.claimDeadline,
  });

  if (allowed === null) return <p className="p-6 font-ui text-sm">Checking access…</p>;
  if (!allowed) return <p className="p-6 font-ui text-sm">Admins only.</p>;

  return (
    <div className="mx-auto max-w-md p-4 font-ui flex flex-col gap-4">
      <button onClick={() => navigate('/admin')} className="flex items-center gap-1 text-sm text-ink-500 w-fit">
        <ArrowLeft size={16} /> Admin
      </button>

      <div className="rounded-sheet border border-line bg-paper p-4">
        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gold-700">
          <FlaskConical size={14} /> Prize flow preview
        </p>
        <p className="mt-2 text-sm text-ink-900/80 leading-relaxed">
          This is what a winner sees after you approve them. Everything here is fake and nothing is saved.
          Walk it through: results pop-up → "Claim your prize" → bank form → "details received" banner.
        </p>
        <div className="mt-3 flex items-center gap-2">
          {[1, 2, 3].map((r) => (
            <button
              key={r}
              onClick={() => restart(r, false)}
              className={`rounded-control px-3 py-1.5 text-xs font-semibold border ${
                rank === r && !dq ? 'bg-ink-900 text-white border-ink-900' : 'border-line-strong text-ink-900'
              }`}
            >
              {r === 1 ? '1st' : r === 2 ? '2nd' : '3rd'}
            </button>
          ))}
          <button
            onClick={() => restart(rank, true)}
            className={`rounded-control px-3 py-1.5 text-xs font-semibold border ${
              dq ? 'bg-ember-600 text-white border-ember-600' : 'border-ember-500/40 text-ember-600'
            }`}
          >
            Disqualified
          </button>
          <button
            onClick={() => restart()}
            className="ml-auto flex items-center gap-1 rounded-control border border-line-strong px-3 py-1.5 text-xs font-semibold"
          >
            <RotateCcw size={12} /> Restart
          </button>
        </div>
      </div>

      <p className="text-xs text-ink-500">
        This banner is what stays on their dashboard if they close the pop-up without claiming:
      </p>
      <PrizeClaimBanner
        needsDetails={dq || last4 ? [] : [claim]}
        awaitingPayment={!dq && last4 ? [claim] : []}
        onSubmit={(c) => setTarget(toTarget(c))}
      />

      <WeeklyResultModal
        result={showResult && !target ? fakeResult(rank, dq) : null}
        onClose={() => setShowResult(false)}
        onClaim={() => {
          setShowResult(false);
          setTarget(toTarget(fakeClaim(rank, null)));
        }}
      />

      <PayoutForm
        target={target}
        onClose={() => setTarget(null)}
        onSubmitted={() => {}}
        submit={async (_id, d) => {
          await new Promise((r) => setTimeout(r, 600)); // pretend to save
          const l4 = d.accountNumber.slice(-4);
          setLast4(l4);
          return { accountLast4: l4 };
        }}
      />
    </div>
  );
}
