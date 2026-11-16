import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, ShieldCheck, Trophy, ChevronDown, ChevronUp, AlertTriangle, CheckCircle2, Users } from 'lucide-react';
import { isAdmin } from '../../services/prizes';
import {
  adminWeekReview, adminUserDetail, adminReviewWinner, adminAuditTrail, lagosWeekStart,
  type WeekReview, type ReviewRow, type UserDetail, type ReviewDecision, type AuditEntry, type FlagSeverity,
} from '../../services/adminReview';
import { ORDINAL, formatMoney } from '../../lib/payout';

const FLAG_LABEL: Record<string, string> = {
  superhuman_speed: 'Answers faster than a person can read',
  unnatural_accuracy: 'Near-perfect accuracy at volume',
  robotic_rhythm: 'Answers arrive at machine-regular intervals',
  no_breaks: 'Played for hours without a break',
  burst_farming: 'Most of each day\'s XP inside a few minutes',
  narrow_content: 'Nearly all XP from one kind of activity',
  shared_device: 'Same device or network as other accounts',
  odd_hours: 'Repeated activity in the small hours',
  poor_retention: 'Misses most review questions on "learned" words',
};

const SEVERITY_STYLE: Record<FlagSeverity, string> = {
  high: 'bg-ember-50 text-ember-600 border-ember-500/30',
  medium: 'bg-gold-50 text-gold-700 border-gold-500/30',
  low: 'bg-ink/5 text-faded-ink border-ink/10',
};

const REVIEW_STYLE: Record<string, string> = {
  pending: 'bg-gold-50 text-gold-700',
  approved: 'bg-moss-50 text-moss-600',
  rejected: 'bg-ink/10 text-faded-ink',
  disqualified: 'bg-ember-50 text-ember-600',
};

const fmtTime = (iso: string) =>
  new Intl.DateTimeFormat('en-NG', { timeZone: 'Africa/Lagos', weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
const weekLabel = (iso: string) =>
  new Intl.DateTimeFormat('en-NG', { timeZone: 'Africa/Lagos', day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso));

/**
 * Admin-only. Top 10 of a week with the evidence needed to decide who really earned it.
 * Flags and the "Looks genuine / Suspicious" summary are advice: nothing here changes anyone's XP or prize until you decide.
 */
export function AdminWinnerReview() {
  const navigate = useNavigate();
  const weeks = useMemo(() => [0, 1, 2, 3, 4].map((o) => lagosWeekStart(o)), []);
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [week, setWeek] = useState(weeks[1]);
  const [review, setReview] = useState<WeekReview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [audit, setAudit] = useState<AuditEntry[] | null>(null);

  const load = useCallback(async (w: string) => {
    setLoading(true);
    setError(null);
    try {
      setReview(await adminWeekReview(w));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load the review');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    isAdmin().then(setAllowed);
  }, []);
  useEffect(() => {
    if (allowed) load(week);
  }, [allowed, week, load]);

  if (allowed === null) return <div className="min-h-screen bg-paper p-8 text-faded-ink text-sm">Checking access…</div>;
  if (!allowed) {
    return (
      <div className="min-h-screen bg-paper flex flex-col items-center justify-center gap-3 p-8 text-center">
        <ShieldCheck size={28} className="text-faded-ink" />
        <p className="font-display text-xl font-bold text-ink">Admins only</p>
        <button onClick={() => navigate('/home')} className="mt-2 px-4 py-2 text-sm rounded-lg border border-ink/15 text-ink hover:bg-ink/5">Back to Home</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper p-4 sm:p-8">
      <div className="max-w-5xl mx-auto flex flex-col gap-6">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-moss text-xs font-semibold uppercase tracking-wider mb-1">
              <ShieldCheck size={14} /><span>Admin Access Only</span>
            </div>
            <h1 className="font-display text-3xl font-bold text-ink flex items-center gap-2"><Trophy size={26} className="text-gold-700" /> Winner review</h1>
            <p className="text-faded-ink text-sm mt-1 max-w-xl">
              Check who earned their place before anyone is told they won. Flags are advice only: nothing changes until you press a button.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button onClick={() => navigate('/admin/prizes')} className="px-3.5 py-2 text-sm rounded-lg border border-ink/15 text-ink hover:bg-ink/5 flex items-center gap-1.5 font-medium">
              <ArrowLeft size={16} /> Prizes
            </button>
            <select
              value={week}
              onChange={(e) => setWeek(e.target.value)}
              aria-label="Week"
              className="px-3 py-2 text-sm rounded-lg border border-ink/15 bg-paper text-ink font-medium"
            >
              {weeks.map((w, i) => <option key={w} value={w}>{i === 0 ? 'This week' : `Week of ${weekLabel(w)}`}</option>)}
            </select>
            <button onClick={() => load(week)} disabled={loading} className="px-3.5 py-2 text-sm rounded-lg bg-paper border border-ink/15 text-ink hover:border-ink/30 flex items-center gap-1.5 font-medium shadow-sm">
              <RefreshCw size={16} className={loading ? 'animate-spin text-moss' : ''} /> Refresh
            </button>
          </div>
        </header>

        {error && <div role="alert" className="rounded-lg border border-ember-500/30 bg-ember-50 text-ember-600 text-sm px-4 py-3">{error}</div>}

        {review && !review.finalized && (
          <div className="rounded-lg border border-gold-500/30 bg-gold-50 text-gold-700 text-sm px-4 py-3">
            This week isn't finished yet, so nobody has a prize place. You're seeing the live top 10.
          </div>
        )}

        {review && review.rows.length === 0 && !loading && <p className="text-faded-ink text-sm py-8 text-center">Nobody earned XP this week.</p>}

        <div className="flex flex-col gap-4">
          {review?.rows.map((row) => (
            <ReviewCard key={row.userId} row={row} weekStart={week} minXp={review.minWeeklyXp} onDecided={() => load(week)} />
          ))}
        </div>

        <section className="border-t border-ink/10 pt-4">
          <button
            onClick={() => (audit ? setAudit(null) : adminAuditTrail().then(setAudit).catch((e) => setError(e.message)))}
            className="text-sm font-medium text-ink flex items-center gap-1.5"
          >
            {audit ? <ChevronUp size={16} /> : <ChevronDown size={16} />} Audit trail
          </button>
          {audit && (
            <ul className="mt-3 flex flex-col gap-1.5 text-xs text-faded-ink">
              {audit.length === 0 && <li>Nothing yet.</li>}
              {audit.map((a, i) => (
                <li key={i}><span className="text-ink font-medium">{fmtTime(a.at)}</span> · {a.action.replace(/_/g, ' ')}{a.detail && 'notes' in a.detail && a.detail.notes ? ` — "${String(a.detail.notes)}"` : ''}</li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function ReviewCard({ row, weekStart, minXp, onDecided }: { row: ReviewRow; weekStart: string; minXp: number; onDecided: () => void }) {
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<UserDetail | null>(null);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const top3 = row.rank <= 3;
  const suspicious = row.risk.verdict === 'Suspicious';

  async function toggle() {
    if (!open && !detail) {
      try {
        setDetail(await adminUserDetail(weekStart, row.userId));
      } catch (e) {
        setErr(e instanceof Error ? e.message : 'Could not load the timeline');
      }
    }
    setOpen(!open);
  }

  async function decide(decision: ReviewDecision) {
    if (!row.winner) return;
    const verb = decision === 'approved' ? 'Approve' : decision === 'rejected' ? 'Reject' : 'Disqualify';
    const warn = decision === 'approved'
      ? 'They will be told they won and can submit their bank details.'
      : 'They will not be paid and the next eligible player takes the place. This is logged.';
    if (!window.confirm(`${verb} ${row.name ?? 'this player'} (${ORDINAL[row.winner.rank]} place)?\n\n${warn}`)) return;
    setBusy(true);
    setErr(null);
    try {
      await adminReviewWinner(row.winner.id, decision, notes);
      setNotes('');
      onDecided();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not save the decision');
    } finally {
      setBusy(false);
    }
  }

  const p = row.proof;
  const decided = row.winner && row.winner.reviewStatus !== 'pending';
  const maxHour = Math.max(1, ...(detail?.perHour.map((h) => h.xp) ?? [1]));

  return (
    <article className={`rounded-xl border bg-paper p-4 sm:p-5 flex flex-col gap-4 ${top3 ? 'border-gold-500/60 shadow-sm' : 'border-ink/10'}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${top3 ? 'bg-gold-50 text-gold-700 border border-gold-500/40' : 'bg-ink/5 text-faded-ink'}`}>
            {row.rank}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-ink truncate">{row.name ?? 'Unnamed'}</p>
            <p className="text-xs text-faded-ink truncate">{row.email}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-bold text-ink tabular-nums">{row.xp} XP</span>
          {row.xp < minXp && <span className="text-xs text-faded-ink">below the {minXp} XP minimum</span>}
          <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border ${suspicious ? SEVERITY_STYLE.high : 'bg-moss-50 text-moss-600 border-moss-600/20'}`}>
            {suspicious ? <AlertTriangle size={12} /> : <CheckCircle2 size={12} />} {row.risk.verdict}
          </span>
          {row.winner && (
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${REVIEW_STYLE[row.winner.reviewStatus]}`}>
              {ORDINAL[row.winner.rank]} · {formatMoney(row.winner.prizeAmount, row.winner.currency)} · {row.winner.reviewStatus}
            </span>
          )}
        </div>
      </div>

      {row.risk.flags.length > 0 ? (
        <ul className="flex flex-col gap-1.5">
          {row.risk.flags.map((f) => (
            <li key={f.type} className={`text-xs rounded-lg border px-3 py-2 ${SEVERITY_STYLE[f.severity]}`}>
              <span className="font-semibold uppercase tracking-wide mr-1.5">{f.severity}</span>
              {FLAG_LABEL[f.type] ?? f.type}
              <span className="block opacity-80 mt-0.5">{Object.entries(f.evidence).map(([k, v]) => `${k.replace(/_/g, ' ')}: ${v}`).join(' · ')}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-faded-ink">No flags.</p>
      )}

      <dl className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2 text-xs">
        <Stat label="Words learned (Test me)" value={p.wordsLearned} />
        <Stat label="Questions answered" value={p.answers} />
        <Stat label="Accuracy" value={p.accuracy != null ? `${Math.round(p.accuracy * 100)}%` : '—'} />
        <Stat label="Median answer time" value={p.medianAnswerMs != null ? `${(p.medianAnswerMs / 1000).toFixed(1)} s` : '—'} />
        <Stat label="Active days" value={`${p.activeDays} of 7`} />
        <Stat label="Review answers" value={p.reviewAnswers} />
        <Stat label="Blocked XP attempts" value={p.rejectedAttempts} />
        <Stat label="XP sources" value={Object.entries(row.sources).map(([s, x]) => `${s} ${x}`).join(', ') || '—'} />
      </dl>

      {row.sharedWith.length > 0 && (
        <div className="text-xs rounded-lg border border-gold-500/30 bg-gold-50 text-gold-700 px-3 py-2 flex items-start gap-2">
          <Users size={14} className="mt-0.5 flex-shrink-0" />
          <span>Same device or network as: {row.sharedWith.map((s) => s.name ?? s.email).join(', ')}</span>
        </div>
      )}

      <button onClick={toggle} className="self-start text-xs font-medium text-ink flex items-center gap-1">
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />} Timeline and XP per hour
      </button>
      {open && detail && (
        <div className="flex flex-col gap-3">
          <div>
            <p className="text-xs text-faded-ink mb-1">XP per hour (Lagos time)</p>
            <div className="flex items-end gap-px h-24 overflow-x-auto border-b border-ink/10" role="img" aria-label="XP earned per hour">
              {detail.perHour.map((h) => (
                <div
                  key={h.hour}
                  title={`${fmtTime(h.hour)} · ${h.xp} XP · ${h.events} events`}
                  className="min-w-[6px] flex-1 bg-moss rounded-t-sm"
                  style={{ height: `${Math.max(4, (h.xp / maxHour) * 100)}%` }}
                />
              ))}
            </div>
          </div>
          <div className="max-h-56 overflow-y-auto text-xs text-faded-ink border border-ink/10 rounded-lg">
            <table className="w-full">
              <thead className="sticky top-0 bg-paper text-left"><tr><th className="px-2 py-1">When</th><th className="px-2">What</th><th className="px-2">XP</th><th className="px-2">Answer time</th></tr></thead>
              <tbody>
                {detail.timeline.map((t, i) => (
                  <tr key={i} className="border-t border-ink/5">
                    <td className="px-2 py-1 whitespace-nowrap">{fmtTime(t.at)}</td>
                    <td className="px-2">{t.source}</td>
                    <td className="px-2 tabular-nums">+{t.amount}</td>
                    <td className="px-2 tabular-nums">{t.timeMs != null ? `${(t.timeMs / 1000).toFixed(1)} s` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {detail.rejections.length > 0 && (
            <p className="text-xs text-faded-ink">
              Blocked attempts: {detail.rejections.map((r) => `${r.reason.replace(/_/g, ' ')} (${fmtTime(r.at)})`).join('; ')}
            </p>
          )}
        </div>
      )}

      {row.winner && (
        <div className="border-t border-ink/10 pt-3 flex flex-col gap-2">
          {row.winner.reviewNotes && <p className="text-xs text-faded-ink">Your note: "{row.winner.reviewNotes}"</p>}
          {!decided && (
            <>
              <input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notes for the record (optional)"
                aria-label="Notes"
                className="w-full text-sm rounded-lg border border-ink/15 bg-paper px-3 py-2 text-ink"
              />
              <div className="flex flex-wrap gap-2">
                <button disabled={busy} onClick={() => decide('approved')} className="px-4 py-2 text-sm rounded-lg bg-moss text-paper font-semibold disabled:opacity-60">Approve</button>
                <button disabled={busy} onClick={() => decide('rejected')} className="px-4 py-2 text-sm rounded-lg border border-ink/15 text-ink font-medium hover:bg-ink/5 disabled:opacity-60">Reject</button>
                <button disabled={busy} onClick={() => decide('disqualified')} className="px-4 py-2 text-sm rounded-lg border border-ember-500/40 text-ember-600 font-medium hover:bg-ember-50 disabled:opacity-60">Disqualify</button>
              </div>
            </>
          )}
          {err && <p role="alert" className="text-xs text-ember-600">{err}</p>}
        </div>
      )}
    </article>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <dt className="text-faded-ink">{label}</dt>
      <dd className="text-ink font-semibold tabular-nums">{value}</dd>
    </div>
  );
}
