import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, ShieldCheck } from 'lucide-react';
import { Otter } from './Otter';
import { Button } from './ui/Button';
import { submitPayoutDetails } from '../services/prizes';
import {
  NIGERIAN_BANKS,
  ORDINAL,
  cleanAccountNumber,
  formatDeadline,
  formatMoney,
  timeLeft,
  validatePayout,
  type PayoutErrors,
} from '../lib/payout';

export interface PayoutTarget {
  id: string;
  rank: number;
  prizeAmount: number;
  currency: string;
  claimDeadline: string;
}

interface Props {
  target: PayoutTarget | null;
  onClose: () => void;
  /** Called once the server has accepted the details. */
  onSubmitted: () => void;
}

const fieldClass =
  'w-full bg-surface border border-line-strong rounded-control px-4 py-3 text-ink-900 text-sm placeholder:text-ink-500/60 focus:outline-none focus:ring-2 focus:border-ink-900/50 focus:ring-ink-900/10 transition-all font-ui';

/** Where a winner tells us where to send the money. Bank details go straight to the server and are never shown back in full. */
export function PayoutForm({ target, onClose, onSubmitted }: Props) {
  const [bank, setBank] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null); // last 4 digits once saved

  // A fresh form each time it opens for a prize.
  useEffect(() => {
    setBank('');
    setAccountNumber('');
    setAccountName('');
    setConfirmed(false);
    setTouched(false);
    setServerError(null);
    setDone(null);
  }, [target?.id]);

  const errors: PayoutErrors = validatePayout({ bank, accountNumber, accountName });
  const valid = Object.keys(errors).length === 0 && confirmed;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!target || !valid) return;
    setBusy(true);
    setServerError(null);
    try {
      const res = await submitPayoutDetails(target.id, { bank, accountNumber: cleanAccountNumber(accountNumber), accountName });
      setDone(res.accountLast4);
      onSubmitted();
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  const left = target ? timeLeft(target.claimDeadline) : null;

  return createPortal(
    <AnimatePresence>
      {target && (
        <motion.div
          className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-4 bg-ink-900/50 overflow-y-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="payout-title"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ type: 'spring', stiffness: 340, damping: 30 }}
            className="w-full max-w-md bg-paper rounded-sheet border border-line shadow-raised p-5 font-ui"
          >
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-gold-700">
                  {ORDINAL[target.rank] ?? `#${target.rank}`} place prize
                </p>
                <h2 id="payout-title" className="font-display text-title font-bold text-ink-900">
                  {done ? 'Details received' : `Claim your ${formatMoney(target.prizeAmount, target.currency)}`}
                </h2>
              </div>
              <button onClick={onClose} aria-label="Close" className="text-ink-500 hover:text-ink-900 p-1">
                <X size={20} />
              </button>
            </div>

            {done ? (
              <div className="flex flex-col items-center text-center gap-3 py-4">
                <Otter mood="proud" size={84} />
                <p className="text-sm text-ink-900/80 leading-relaxed">
                  Thanks! We'll send {formatMoney(target.prizeAmount, target.currency)} to the account ending <strong>{done}</strong>.
                  You'll get a notification when it's on its way.
                </p>
                <Button onClick={onClose} className="w-full">Done</Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
                <p className="text-sm text-ink-500 leading-relaxed">
                  Where should we send your prize? Submit by <strong className="text-ink-900">{formatDeadline(target.claimDeadline)}</strong>
                  {left ? ` (${left})` : ''} or it will lapse.
                </p>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="payout-bank" className="text-sm font-medium text-ink-900">Bank</label>
                  <input
                    id="payout-bank"
                    list="payout-banks"
                    value={bank}
                    onChange={(e) => setBank(e.target.value)}
                    placeholder="Start typing your bank"
                    autoComplete="off"
                    className={fieldClass}
                    aria-invalid={touched && !!errors.bank}
                  />
                  <datalist id="payout-banks">
                    {NIGERIAN_BANKS.map((b) => (
                      <option key={b} value={b} />
                    ))}
                  </datalist>
                  {touched && errors.bank && <p className="text-sm text-ember-600">{errors.bank}</p>}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="payout-number" className="text-sm font-medium text-ink-900">Account number</label>
                  <input
                    id="payout-number"
                    inputMode="numeric"
                    autoComplete="off"
                    maxLength={14}
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value.replace(/[^\d\s-]/g, ''))}
                    placeholder="10 digits"
                    className={fieldClass}
                    aria-invalid={touched && !!errors.accountNumber}
                  />
                  {touched && errors.accountNumber && <p className="text-sm text-ember-600">{errors.accountNumber}</p>}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="payout-name" className="text-sm font-medium text-ink-900">Name on the account</label>
                  <input
                    id="payout-name"
                    autoComplete="off"
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                    placeholder="As it appears at your bank"
                    className={fieldClass}
                    aria-invalid={touched && !!errors.accountName}
                  />
                  {touched && errors.accountName && <p className="text-sm text-ember-600">{errors.accountName}</p>}
                </div>

                <label className="flex items-start gap-2.5 text-sm text-ink-900/80 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={confirmed}
                    onChange={(e) => setConfirmed(e.target.checked)}
                    className="mt-0.5 h-4 w-4 accent-ember-600"
                  />
                  <span>I've checked these details are correct. Prizes sent to a wrong account can't be recovered.</span>
                </label>
                {touched && !confirmed && <p className="text-sm text-ember-600 -mt-2">Please confirm the details are correct</p>}

                <p className="flex items-center gap-2 text-xs text-ink-500">
                  <ShieldCheck size={14} className="flex-shrink-0" />
                  Only the Curi team can see your bank details, and only to pay your prize.
                </p>

                {serverError && <p role="alert" className="text-sm text-ember-600">{serverError}</p>}

                <Button type="submit" isLoading={busy} className="w-full">
                  <Check size={16} /> Submit details
                </Button>
              </form>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
