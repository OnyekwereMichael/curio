import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, ShieldCheck, Copy, Check, Trophy } from 'lucide-react';
import { adminListWinners, adminMarkPaid, isAdmin, type AdminWinner, type ClaimStatus } from '../../services/prizes';
import { ORDINAL, formatDeadline, formatMoney } from '../../lib/payout';

type Filter = 'all' | ClaimStatus;

const STATUS_STYLE: Record<ClaimStatus, string> = {
  pending: 'bg-gold-50 text-gold-700',
  submitted: 'bg-ember-50 text-ember-600',
  paid: 'bg-moss-50 text-moss-600',
  expired: 'bg-ink/10 text-faded-ink',
  void: 'bg-ink/10 text-faded-ink',
};

const STATUS_LABEL: Record<ClaimStatus, string> = {
  pending: 'Pending details',
  submitted: 'Submitted — ready to pay',
  paid: 'Paid',
  expired: 'Expired',
  void: 'Void',
};

const weekLabel = (iso: string) =>
  new Intl.DateTimeFormat('en-NG', { timeZone: 'Africa/Lagos', day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso));

/** Admin-only: weekly winners, where each one is in the claim process, and a way to record payment. */
export function AdminPrizes() {
  const navigate = useNavigate();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [rows, setRows] = useState<AdminWinner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [payingId, setPayingId] = useState<string | null>(null);
  const [reference, setReference] = useState('');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRows(await adminListWinners());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load winners');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    isAdmin().then((ok) => {
      setAllowed(ok);
      if (ok) load();
    });
  }, [load]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: rows.length };
    for (const r of rows) c[r.status] = (c[r.status] ?? 0) + 1;
    return c;
  }, [rows]);

  const shown = filter === 'all' ? rows : rows.filter((r) => r.status === filter);

  async function markPaid(id: string) {
    setBusy(true);
    setError(null);
    try {
      await adminMarkPaid(id, reference);
      setPayingId(null);
      setReference('');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not mark as paid');
    } finally {
      setBusy(false);
    }
  }

  async function copy(text: string, key: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied((k) => (k === key ? null : k)), 1500);
    } catch {
      /* clipboard unavailable */
    }
  }

  if (allowed === null) return <div className="min-h-screen bg-paper p-8 text-faded-ink text-sm">Checking access…</div>;

  if (!allowed) {
    return (
      <div className="min-h-screen bg-paper flex flex-col items-center justify-center gap-3 p-8 text-center">
        <ShieldCheck size={28} className="text-faded-ink" />
        <p className="font-display text-xl font-bold text-ink">Admins only</p>
        <p className="text-sm text-faded-ink max-w-sm">Your account isn't set up as an admin, so prize payouts aren't available here.</p>
        <button onClick={() => navigate('/home')} className="mt-2 px-4 py-2 text-sm rounded-lg border border-ink/15 text-ink hover:bg-ink/5">
          Back to Home
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper p-4 sm:p-8">
      <div className="max-w-6xl mx-auto flex flex-col gap-6">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-moss text-xs font-semibold uppercase tracking-wider mb-1">
              <ShieldCheck size={14} />
              <span>Admin Access Only</span>
            </div>
            <h1 className="font-display text-3xl font-bold text-ink flex items-center gap-2">
              <Trophy size={26} className="text-gold-700" /> Weekly prizes
            </h1>
            <p className="text-faded-ink text-sm mt-1">Winners, claim status and payouts. Bank details are visible to admins only.</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/admin')}
              className="px-3.5 py-2 text-sm rounded-lg border border-ink/15 text-ink hover:bg-ink/5 transition flex items-center gap-1.5 font-medium"
            >
              <ArrowLeft size={16} /> Admin
            </button>
            <button
              onClick={load}
              disabled={loading}
              className="px-3.5 py-2 text-sm rounded-lg bg-paper border border-ink/15 text-ink hover:border-ink/30 transition flex items-center gap-1.5 font-medium shadow-sm"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin text-moss' : ''} /> Refresh
            </button>
          </div>
        </header>

        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filter by status">
          {(['all', 'submitted', 'pending', 'paid', 'expired'] as Filter[]).map((f) => (
            <button
              key={f}
              role="tab"
              aria-selected={filter === f}
              onClick={() => setFilter(f)}
              className={`px-3.5 py-1.5 rounded-full text-sm font-medium border transition ${
                filter === f ? 'bg-ink text-paper border-ink' : 'border-ink/15 text-ink hover:bg-ink/5'
              }`}
            >
              {f === 'all' ? 'All' : STATUS_LABEL[f as ClaimStatus].split(' ')[0]} · {counts[f] ?? 0}
            </button>
          ))}
        </div>

        {error && <p role="alert" className="text-sm text-ember-600 bg-ember-50 rounded-lg px-4 py-3">{error}</p>}

        {loading && rows.length === 0 ? (
          <p className="text-sm text-faded-ink">Loading…</p>
        ) : shown.length === 0 ? (
          <p className="text-sm text-faded-ink bg-ink/5 rounded-lg px-4 py-6 text-center">
            {rows.length === 0 ? 'No winners yet. The first week closes Monday 23 Nov, 00:00 (Lagos).' : 'Nothing with this status.'}
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-ink/10 bg-paper">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-ink/10 bg-ink/5 text-faded-ink text-xs font-semibold uppercase tracking-wider">
                  <th className="px-4 py-3">Week of</th>
                  <th className="px-4 py-3">Place</th>
                  <th className="px-4 py-3">Winner</th>
                  <th className="px-4 py-3">Prize</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Payout details</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink/5">
                {shown.map((r) => (
                  <tr key={r.id} className="align-top">
                    <td className="px-4 py-3 whitespace-nowrap text-ink">{weekLabel(r.weekStart)}</td>
                    <td className="px-4 py-3 whitespace-nowrap font-semibold text-ink">{ORDINAL[r.rank]}<span className="block text-xs font-normal text-faded-ink">{r.xp} XP</span></td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-ink">{r.name || '—'}</p>
                      <p className="text-xs text-faded-ink break-all">{r.email}</p>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap font-semibold text-ink">{formatMoney(r.prizeAmount, r.currency)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLE[r.status]}`}>{STATUS_LABEL[r.status]}</span>
                      {r.status === 'pending' && r.claimDeadline && (
                        <p className="text-xs text-faded-ink mt-1">Deadline {formatDeadline(r.claimDeadline)}</p>
                      )}
                      {r.status === 'pending' && (
                        <p className="text-xs text-faded-ink">Reminders: {r.reminder24hAt ? '24h ✓' : '24h –'} · {r.reminder72hAt ? '72h ✓' : '72h –'}</p>
                      )}
                      {r.status === 'paid' && r.paidAt && (
                        <p className="text-xs text-faded-ink mt-1">{formatDeadline(r.paidAt)}{r.paymentReference ? ` · ${r.paymentReference}` : ''}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {r.accountNumber ? (
                        <div className="text-xs text-ink flex flex-col gap-0.5">
                          <span>{r.bankName}</span>
                          <span className="font-mono text-sm">
                            {r.accountNumber}{' '}
                            <button
                              onClick={() => copy(r.accountNumber!, r.id)}
                              aria-label="Copy account number"
                              className="inline-flex align-middle p-1 rounded hover:bg-ink/5 text-faded-ink"
                            >
                              {copied === r.id ? <Check size={13} /> : <Copy size={13} />}
                            </button>
                          </span>
                          <span className="text-faded-ink">{r.accountName}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-faded-ink">Not submitted</span>
                      )}
                    </td>
                    <td className="px-4 py-3 min-w-[170px]">
                      {r.status === 'submitted' &&
                        (payingId === r.id ? (
                          <div className="flex flex-col gap-2">
                            <input
                              value={reference}
                              onChange={(e) => setReference(e.target.value)}
                              placeholder="Transfer reference (optional)"
                              className="w-full rounded-lg border border-ink/15 bg-paper px-3 py-2 text-xs"
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={() => markPaid(r.id)}
                                disabled={busy}
                                className="flex-1 px-3 py-2 text-xs rounded-lg bg-moss text-white font-semibold disabled:opacity-50"
                              >
                                {busy ? 'Saving…' : 'Confirm paid'}
                              </button>
                              <button
                                onClick={() => {
                                  setPayingId(null);
                                  setReference('');
                                }}
                                className="px-3 py-2 text-xs rounded-lg border border-ink/15 text-ink"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => setPayingId(r.id)}
                            className="px-3 py-2 text-xs rounded-lg bg-moss text-white font-semibold hover:bg-moss/90"
                          >
                            Mark as paid
                          </button>
                        ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
