import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  UserCheck,
  Clock,
  AlertCircle,
  Search,
  RefreshCw,
  Bell,
  Smartphone,
  ArrowLeft,
  ChevronRight,
  X,
  Copy,
  Check,
  Download,
  Filter,
  ShieldCheck,
  TrendingUp,
  Activity,
  Mail,
  Zap,
  MessageSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AppShell } from '../../components/AppShell';
import { supabase } from '../../lib/superbase';

export interface UserRecord {
  id: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  name?: string;
  last_seen_at?: string | null;
  created_at?: string | null;
  notifications_enabled?: boolean | null;
  notification_token?: any | null;
  installed?: boolean | null;
}

interface FeedbackRecord {
  id: string;
  user_id: string;
  message: string;
  created_at: string;
  user_email?: string;
  user_name?: string;
}

type FilterStatus = 'all' | 'today' | 'week' | 'inactive' | 'notifications';
type SortOption = 'last_seen_desc' | 'last_seen_asc' | 'created_desc' | 'name_asc';

function formatRelativeTime(dateString?: string | null): { text: string; category: 'today' | 'week' | 'inactive' | 'never' } {
  if (!dateString) return { text: 'Never recorded', category: 'never' };

  const date = new Date(dateString);
  if (isNaN(date.getTime())) return { text: 'Unknown', category: 'never' };

  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  const diffInHours = diffInSeconds / 3600;
  const diffInDays = diffInHours / 24;

  let category: 'today' | 'week' | 'inactive' | 'never' = 'inactive';
  if (diffInHours < 24) {
    category = 'today';
  } else if (diffInDays <= 7) {
    category = 'week';
  } else {
    category = 'inactive';
  }

  if (diffInSeconds < 60) return { text: 'Just now', category };
  if (diffInSeconds < 3600) {
    const mins = Math.floor(diffInSeconds / 60);
    return { text: `${mins} minute${mins > 1 ? 's' : ''} ago`, category };
  }
  if (diffInHours < 24) {
    const hours = Math.floor(diffInHours);
    return { text: `${hours} hour${hours > 1 ? 's' : ''} ago`, category };
  }
  if (diffInDays < 2) {
    return { text: 'Yesterday', category };
  }
  if (diffInDays < 7) {
    const days = Math.floor(diffInDays);
    return { text: `${days} days ago`, category };
  }
  if (diffInDays < 30) {
    const weeks = Math.floor(diffInDays / 7);
    return { text: `${weeks} week${weeks > 1 ? 's' : ''} ago`, category };
  }

  return { text: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }), category };
}

function formatDate(dateString?: string | null) {
  if (!dateString) return 'N/A';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return 'N/A';
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function AdminDashboard() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rlsNotice, setRlsNotice] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [sortBy, setSortBy] = useState<SortOption>('last_seen_desc');
  const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null);
  const [copiedId, setCopiedId] = useState(false);

  // Re-engagement state
  const [sendingPush, setSendingPush] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [reengagePushResult, setReengagePushResult] = useState<{ sent: number; skipped: number; total_eligible: number } | null>(null);
  const [reengageEmailResult, setReengageEmailResult] = useState<{ sent: number; skipped: number; total_eligible: number } | null>(null);
  const [reengageError, setReengageError] = useState<string | null>(null);

  // Setup Reminders state
  const [sendingSetup, setSendingSetup] = useState(false);
  const [setupResult, setSetupResult] = useState<{ sent: number; skipped: number; total_eligible: number } | null>(null);
  const [setupError, setSetupError] = useState<string | null>(null);

  // Feedback state
  const [feedbacks, setFeedbacks] = useState<FeedbackRecord[]>([]);
  const [feedbackLoading, setFeedbackLoading] = useState(true);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);

  async function fetchUserData() {
    try {
      setError(null);
      setRlsNotice(false);

      // Attempt 1: Call secure Edge Function bypassing RLS (fetches all auth.users + public.users)
      const { data: edgeData, error: edgeErr } = await supabase.functions.invoke('get-admin-users');

      if (!edgeErr && edgeData?.users && Array.isArray(edgeData.users)) {
        setUsers(edgeData.users);
        return;
      }

      // Attempt 2: Direct Supabase Table Select fallback
      const { data: tableData, error: tableErr } = await supabase
        .from('users')
        .select('*');

      if (tableErr) throw tableErr;

      const loaded = tableData || [];
      setUsers(loaded);

      // If only 1 user is returned (because RLS restricts to auth.uid() = id), show RLS notice
      if (loaded.length === 1) {
        setRlsNotice(true);
      }

    } catch (err: any) {
      console.error('Failed to fetch admin users:', err);
      setError(err.message || 'Failed to load user activity logs');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  // Fetches feedback via a dedicated, service-role Edge Function. This runs
  // independently of fetchUserData — the feedback table has no SELECT policy
  // for regular users at all (by design, to keep it private), so the only
  // way to read it is through this admin-only function, and it must not
  // depend on get-admin-users succeeding first.
  async function fetchFeedback() {
    try {
      setFeedbackError(null);
      const { data, error } = await supabase.functions.invoke('get-admin-feedback');

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setFeedbacks(data?.feedbacks ?? []);
    } catch (err: any) {
      console.error('Failed to fetch feedback:', err);
      setFeedbackError(err.message || 'Failed to load feedback');
    } finally {
      setFeedbackLoading(false);
    }
  }

  useEffect(() => {
    fetchUserData();
    fetchFeedback();
  }, []);

  function handleRefresh() {
    setRefreshing(true);
    setFeedbackLoading(true);
    fetchUserData();
    fetchFeedback();
  }

  // Calculate Metrics
  const metrics = useMemo(() => {
    const total = users.length;
    let activeToday = 0;
    let activeWeek = 0;
    let inactive = 0;
    let notificationsCount = 0;

    const now = new Date().getTime();

    users.forEach((u) => {
      if (u.notifications_enabled) notificationsCount++;

      if (!u.last_seen_at) {
        inactive++;
        return;
      }

      const seenTime = new Date(u.last_seen_at).getTime();
      if (isNaN(seenTime)) {
        inactive++;
        return;
      }

      const hoursDiff = (now - seenTime) / (1000 * 3600);
      if (hoursDiff <= 24) {
        activeToday++;
        activeWeek++;
      } else if (hoursDiff <= 24 * 7) {
        activeWeek++;
      } else {
        inactive++;
      }
    });

    const activeTodayPercent = total > 0 ? Math.round((activeToday / total) * 100) : 0;
    const activeWeekPercent = total > 0 ? Math.round((activeWeek / total) * 100) : 0;

    return {
      total,
      activeToday,
      activeTodayPercent,
      activeWeek,
      activeWeekPercent,
      inactive,
      notificationsCount,
    };
  }, [users]);

  // Filter and Sort Users
  const filteredUsers = useMemo(() => {
    return users
      .filter((u) => {
        // Search filter
        const name = u.full_name || u.name || `${u.first_name || ''} ${u.last_name || ''}`.trim();
        const searchTarget = `${name} ${u.email || ''} ${u.id}`.toLowerCase();
        if (searchQuery && !searchTarget.includes(searchQuery.toLowerCase())) {
          return false;
        }

        // Status Category Filter
        const { category } = formatRelativeTime(u.last_seen_at);
        if (filterStatus === 'today' && category !== 'today') return false;
        if (filterStatus === 'week' && category !== 'today' && category !== 'week') return false;
        if (filterStatus === 'inactive' && category !== 'inactive' && category !== 'never') return false;
        if (filterStatus === 'notifications' && !u.notifications_enabled) return false;

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'last_seen_desc') {
          const tA = a.last_seen_at ? new Date(a.last_seen_at).getTime() : 0;
          const tB = b.last_seen_at ? new Date(b.last_seen_at).getTime() : 0;
          return tB - tA;
        }
        if (sortBy === 'last_seen_asc') {
          const tA = a.last_seen_at ? new Date(a.last_seen_at).getTime() : Infinity;
          const tB = b.last_seen_at ? new Date(b.last_seen_at).getTime() : Infinity;
          return tA - tB;
        }
        if (sortBy === 'created_desc') {
          const tA = a.created_at ? new Date(a.created_at).getTime() : 0;
          const tB = b.created_at ? new Date(b.created_at).getTime() : 0;
          return tB - tA;
        }
        if (sortBy === 'name_asc') {
          const nameA = a.full_name || a.name || a.email || '';
          const nameB = b.full_name || b.name || b.email || '';
          return nameA.localeCompare(nameB);
        }
        return 0;
      });
  }, [users, searchQuery, filterStatus, sortBy]);

  function exportCSV() {
    if (filteredUsers.length === 0) return;

    const headers = ['User ID', 'Email', 'Name', 'Last Seen At', 'Created At', 'Notifications Enabled', 'Installed PWA'];
    const rows = filteredUsers.map((u) => [
      u.id,
      u.email || '',
      `"${u.full_name || u.name || `${u.first_name || ''} ${u.last_name || ''}`.trim()}"`,
      u.last_seen_at || 'Never',
      u.created_at || '',
      u.notifications_enabled ? 'Yes' : 'No',
      u.installed ? 'Yes' : 'No'
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `curio_user_activity_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function handleCopyUserId(id: string) {
    navigator.clipboard.writeText(id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  }

  async function handleSendReengagementPush() {
    setSendingPush(true);
    setReengagePushResult(null);
    setReengageError(null);
    try {
      const { data, error } = await supabase.functions.invoke('send-reengagement-notifications', {
        body: {},
      });
      if (error) throw error;
      setReengagePushResult(data);
    } catch (err: any) {
      setReengageError(err.message || 'Failed to send re-engagement push notifications');
    } finally {
      setSendingPush(false);
    }
  }

  async function handleSendReengagementEmail() {
    setSendingEmail(true);
    setReengageEmailResult(null);
    setReengageError(null);
    try {
      const { data, error } = await supabase.functions.invoke('send-reengagement-email', {
        body: {},
      });
      if (error) throw error;
      setReengageEmailResult(data);
    } catch (err: any) {
      setReengageError(err.message || 'Failed to send re-engagement emails');
    } finally {
      setSendingEmail(false);
    }
  }

  async function handleSendSetupReminders() {
    setSendingSetup(true);
    setSetupResult(null);
    setSetupError(null);
    try {
      const { data, error } = await supabase.functions.invoke('send-setup-reminders', {
        body: {},
      });
      if (error) throw error;
      setSetupResult(data);
    } catch (err: any) {
      setSetupError(err.message || 'Failed to send setup reminders');
    } finally {
      setSendingSetup(false);
    }
  }

  return (
    <AppShell title="Admin Activity Portal">
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">

        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-ink/10 pb-6">
          <div>
            <div className="flex items-center gap-2 text-moss text-xs font-semibold uppercase tracking-wider mb-1">
              <ShieldCheck size={14} />
              <span>Admin Access Only</span>
            </div>
            <h1 className="font-display text-3xl font-bold text-ink">
              User Activity & Retention Log
            </h1>
            <p className="text-faded-ink text-sm mt-1">
              Track live session timestamps, last seen activity, and push subscriber status directly from Supabase.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/home')}
              className="px-3.5 py-2 text-sm rounded-lg border border-ink/15 text-ink hover:bg-ink/5 transition flex items-center gap-1.5 font-medium"
            >
              <ArrowLeft size={16} />
              Back to Home
            </button>

            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="px-3.5 py-2 text-sm rounded-lg bg-paper border border-ink/15 text-ink hover:border-ink/30 transition flex items-center gap-1.5 font-medium shadow-sm"
            >
              <RefreshCw size={16} className={refreshing ? 'animate-spin text-moss' : ''} />
              <span>Refresh</span>
            </button>

            <button
              onClick={exportCSV}
              className="px-3.5 py-2 text-sm rounded-lg bg-moss text-white hover:bg-moss/90 transition flex items-center gap-1.5 font-medium shadow-sm"
            >
              <Download size={16} />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center gap-3">
            <AlertCircle className="shrink-0 text-rose-600" size={18} />
            <p className="flex-1">{error}</p>
            <button onClick={() => setError(null)} className="text-rose-600 hover:text-rose-900">
              <X size={16} />
            </button>
          </div>
        )}

        {/* RLS Policy Notice */}
        {rlsNotice && (
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-sm space-y-2">
            <div className="flex items-center gap-2 font-semibold text-amber-950">
              <AlertCircle className="shrink-0 text-amber-700" size={18} />
              <span>Only 1 user showing? (Supabase Row Level Security)</span>
            </div>
            <p className="text-xs text-amber-800 leading-relaxed">
              Supabase default RLS policy restricts reading the <code>users</code> table to only your logged-in account (<code>auth.uid() = id</code>). To allow your admin session to fetch all 6+ users, run this SQL policy in your <strong>Supabase SQL Editor</strong>:
            </p>
            <div className="bg-amber-100/90 p-2.5 rounded-lg text-xs font-mono text-amber-950 select-all border border-amber-300">
              CREATE POLICY "Allow authenticated select" ON public.users FOR SELECT TO authenticated USING (true);
            </div>
          </div>
        )}


        {/* Overview Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

          {/* Total Users */}
          <div className="bg-paper rounded-2xl border border-ink/10 p-5 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-faded-ink uppercase tracking-wider">Total Users</span>
              <div className="w-9 h-9 rounded-xl bg-ink/5 flex items-center justify-center text-ink">
                <Users size={18} />
              </div>
            </div>
            <div className="mt-3">
              <span className="font-display text-3xl font-bold text-ink">{metrics.total}</span>
              <span className="text-xs text-faded-ink ml-2">registered</span>
            </div>
            <div className="mt-3 pt-3 border-t border-ink/5 text-xs text-faded-ink flex items-center justify-between">
              <span>Push Subscribers</span>
              <span className="font-semibold text-ink">{metrics.notificationsCount}</span>
            </div>
          </div>

          {/* Active Today (DAU) */}
          <div className="bg-paper rounded-2xl border border-ink/10 p-5 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">Active Today (DAU)</span>
              <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <Activity size={18} />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="font-display text-3xl font-bold text-emerald-900">{metrics.activeToday}</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                {metrics.activeTodayPercent}% of total
              </span>
            </div>
            <div className="mt-3 pt-3 border-t border-ink/5 text-xs text-faded-ink">
              <span>Logged in within the last 24 hours</span>
            </div>
          </div>

          {/* Active This Week (WAU) */}
          <div className="bg-paper rounded-2xl border border-ink/10 p-5 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-amber-800 uppercase tracking-wider">Active This Week (WAU)</span>
              <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                <TrendingUp size={18} />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="font-display text-3xl font-bold text-amber-950">{metrics.activeWeek}</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                {metrics.activeWeekPercent}% of total
              </span>
            </div>
            <div className="mt-3 pt-3 border-t border-ink/5 text-xs text-faded-ink">
              <span>Logged in within the last 7 days</span>
            </div>
          </div>

          {/* Inactive Users (>7d) */}
          <div className="bg-paper rounded-2xl border border-ink/10 p-5 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-rose-800 uppercase tracking-wider">Inactive (&gt;7 Days)</span>
              <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
                <Clock size={18} />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="font-display text-3xl font-bold text-rose-950">{metrics.inactive}</span>
              <span className="text-xs text-faded-ink">users</span>
            </div>
            <div className="mt-3 pt-3 border-t border-ink/5 text-xs text-faded-ink">
              <span>Candidates for re-engagement</span>
            </div>
          </div>

        </div>

        {/* Re-engagement Action Panel */}
        <div className="bg-paper rounded-2xl border border-rose-200/60 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <Zap size={15} className="text-rose-600" />
                <span className="text-sm font-bold text-ink">Re-engagement Controls</span>
              </div>
              <p className="text-xs text-faded-ink">
                Manually trigger campaigns targeting the <strong>{metrics.inactive}</strong> inactive user{metrics.inactive !== 1 ? 's' : ''} who haven't returned in 1+ day.
              </p>
            </div>
            <div className="flex items-center gap-3 flex-wrap">

              {/* Push Notification Button */}
              <button
                onClick={handleSendReengagementPush}
                disabled={sendingPush}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm"
              >
                {sendingPush
                  ? <RefreshCw size={15} className="animate-spin" />
                  : <Bell size={15} />}
                Send Re-engagement Push
              </button>

              {/* Email Button */}
              <button
                onClick={handleSendReengagementEmail}
                disabled={sendingEmail}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm"
              >
                {sendingEmail
                  ? <RefreshCw size={15} className="animate-spin" />
                  : <Mail size={15} />}
                Send Re-engagement Email
              </button>

            </div>
          </div>

          {/* Result Feedback */}
          {reengageError && (
            <div className="flex items-start gap-2 text-xs text-rose-800 bg-rose-50 border border-rose-200 rounded-xl px-3.5 py-2.5">
              <AlertCircle size={14} className="shrink-0 mt-0.5 text-rose-600" />
              <span>{reengageError}</span>
            </div>
          )}
          {reengagePushResult && (
            <div className="flex items-center gap-2 text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-xl px-3.5 py-2.5">
              <Check size={14} className="text-amber-700 shrink-0" />
              <span>
                Push sent: <strong>{reengagePushResult.sent}</strong> delivered · <strong>{reengagePushResult.skipped}</strong> skipped (already notified) · <strong>{reengagePushResult.total_eligible}</strong> eligible
              </span>
            </div>
          )}
          {reengageEmailResult && (
            <div className="flex items-center gap-2 text-xs text-rose-900 bg-rose-50 border border-rose-200 rounded-xl px-3.5 py-2.5">
              <Check size={14} className="text-rose-700 shrink-0" />
              <span>
                Email sent: <strong>{reengageEmailResult.sent}</strong> delivered · <strong>{reengageEmailResult.skipped}</strong> skipped (already emailed) · <strong>{reengageEmailResult.total_eligible}</strong> eligible
              </span>
            </div>
          )}

          {/* Threshold Explanation */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="flex items-start gap-2.5 p-3 bg-amber-50/60 border border-amber-100 rounded-xl text-xs text-amber-900">
              <Bell size={13} className="shrink-0 mt-0.5 text-amber-700" />
              <div>
                <p className="font-semibold mb-0.5">Push Notification</p>
                <p className="text-amber-800 leading-6">Targets users inactive for <strong>1+ day</strong> with push notifications enabled. Auto-scheduled daily via pg_cron.</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5 p-3 bg-rose-50/60 border border-rose-100 rounded-xl text-xs text-rose-900">
              <Mail size={13} className="shrink-0 mt-0.5 text-rose-700" />
              <div>
                <p className="font-semibold mb-0.5">Email (via Resend)</p>
                <p className="text-rose-800 leading-6">Targets users inactive for <strong>1+ day</strong>. Will not email the same user more than once every 2 days. Requires <code>RESEND_API_KEY</code> secret.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Setup Reminders Action Panel */}
        <div className="bg-paper rounded-2xl border border-sky-200/60 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <Smartphone size={15} className="text-sky-600" />
                <span className="text-sm font-bold text-ink">Setup Reminders</span>
              </div>
              <p className="text-xs text-faded-ink">
                Email users who have not installed the app or enabled notifications.
              </p>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <button
                onClick={handleSendSetupReminders}
                disabled={sendingSetup}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl bg-sky-600 text-white hover:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm"
              >
                {sendingSetup
                  ? <RefreshCw size={15} className="animate-spin" />
                  : <Mail size={15} />}
                Send Setup Reminders
              </button>
            </div>
          </div>

          {/* Result Feedback */}
          {setupError && (
            <div className="flex items-start gap-2 text-xs text-rose-800 bg-rose-50 border border-rose-200 rounded-xl px-3.5 py-2.5">
              <AlertCircle size={14} className="shrink-0 mt-0.5 text-rose-600" />
              <span>{setupError}</span>
            </div>
          )}
          {setupResult && (
            <div className="flex items-center gap-2 text-xs text-sky-900 bg-sky-50 border border-sky-200 rounded-xl px-3.5 py-2.5">
              <Check size={14} className="text-sky-700 shrink-0" />
              <span>
                Reminders sent: <strong>{setupResult.sent}</strong> delivered · <strong>{setupResult.skipped}</strong> skipped (already sent within 24h) · <strong>{setupResult.total_eligible}</strong> eligible
              </span>
            </div>
          )}

          <div className="pt-1">
            <div className="flex items-start gap-2.5 p-3 bg-sky-50/60 border border-sky-100 rounded-xl text-xs text-sky-900">
              <ShieldCheck size={13} className="shrink-0 mt-0.5 text-sky-700" />
              <div>
                <p className="font-semibold mb-0.5">Spam Protection</p>
                <p className="text-sky-800">Capped at a maximum of <strong>5 emails total</strong> per user. Minimum of 24 hours between reminders.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filter Controls & Search */}
        <div className="bg-paper rounded-2xl border border-ink/10 p-4 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">

            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-faded-ink" size={16} />
              <input
                type="text"
                placeholder="Search user by name, email, or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-ink/15 bg-white/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-moss/30 focus:border-moss transition"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-faded-ink hover:text-ink"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-2 self-end md:self-auto">
              <span className="text-xs font-medium text-faded-ink shrink-0">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="text-xs font-medium bg-white/70 border border-ink/15 rounded-lg px-3 py-2 text-ink focus:outline-none focus:ring-2 focus:ring-moss/30 cursor-pointer"
              >
                <option value="last_seen_desc">Most Recently Active</option>
                <option value="last_seen_asc">Oldest Last Active</option>
                <option value="created_desc">Newly Joined First</option>
                <option value="name_asc">Name (A - Z)</option>
              </select>
            </div>

          </div>

          {/* Filter Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 scrollbar-none">
            <span className="text-xs font-semibold text-faded-ink shrink-0 mr-1 flex items-center gap-1">
              <Filter size={12} />
              Filter:
            </span>

            {[
              { id: 'all', label: `All Users (${users.length})` },
              { id: 'today', label: `Active Today (${metrics.activeToday})` },
              { id: 'week', label: `Active This Week (${metrics.activeWeek})` },
              { id: 'inactive', label: `Inactive (${metrics.inactive})` },
              { id: 'notifications', label: `Push Enabled (${metrics.notificationsCount})` },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterStatus(tab.id as FilterStatus)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition cursor-pointer ${filterStatus === tab.id
                  ? 'bg-ink text-paper shadow-sm'
                  : 'bg-ink/5 text-faded-ink hover:bg-ink/10 hover:text-ink'
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* User Activity List / Table */}
        <div className="bg-paper rounded-2xl border border-ink/10 shadow-sm overflow-hidden">

          {loading ? (
            <div className="p-12 text-center text-faded-ink space-y-3">
              <RefreshCw className="animate-spin mx-auto text-moss" size={28} />
              <p className="text-sm font-medium">Fetching user retention data from Supabase...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-12 text-center text-faded-ink space-y-2">
              <UserCheck className="mx-auto opacity-40" size={36} />
              <p className="text-base font-semibold text-ink">No matching users found</p>
              <p className="text-xs">Try resetting your search query or filter tab.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-ink/10 bg-ink/5 text-faded-ink text-xs font-semibold uppercase tracking-wider">
                    <th className="py-3.5 px-4 sm:px-6">User</th>
                    <th className="py-3.5 px-4">Last Active</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Joined Date</th>
                    <th className="py-3.5 px-4 text-center">Push</th>
                    <th className="py-3.5 px-4 text-center">App</th>
                    <th className="py-3.5 px-4 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink/5">
                  {filteredUsers.map((u) => {
                    const { text: relativeTime, category } = formatRelativeTime(u.last_seen_at);
                    const displayName = u.full_name || u.name || `${u.first_name || ''} ${u.last_name || ''}`.trim() || 'Learner';
                    const emailStr = u.email || 'No email provided';
                    const initials = displayName.slice(0, 2).toUpperCase();

                    return (
                      <tr
                        key={u.id}
                        onClick={() => setSelectedUser(u)}
                        className="hover:bg-ink/[0.02] cursor-pointer transition group"
                      >
                        {/* User Identity */}
                        <td className="py-4 px-4 sm:px-6">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-ember/15 text-ember font-bold text-xs flex items-center justify-center shrink-0 border border-ember/20">
                              {initials}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-ink truncate group-hover:text-ember transition">
                                {displayName}
                              </p>
                              <p className="text-xs text-faded-ink truncate font-mono">
                                {emailStr}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Last Active Timestamp */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          <div className="flex flex-col">
                            <span className="font-medium text-ink flex items-center gap-1.5">
                              <Clock size={13} className="text-faded-ink" />
                              {relativeTime}
                            </span>
                            <span className="text-[11px] text-faded-ink font-mono mt-0.5">
                              {formatDate(u.last_seen_at)}
                            </span>
                          </div>
                        </td>

                        {/* Category Status Pill */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          {category === 'today' && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              Active Today
                            </span>
                          )}
                          {category === 'week' && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                              Active This Week
                            </span>
                          )}
                          {category === 'inactive' && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                              Inactive (&gt;7d)
                            </span>
                          )}
                          {category === 'never' && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                              No Session Logged
                            </span>
                          )}
                        </td>

                        {/* Joined Date */}
                        <td className="py-4 px-4 whitespace-nowrap text-xs text-faded-ink font-mono">
                          {u.created_at ? new Date(u.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                        </td>

                        {/* Push Notifs */}
                        <td className="py-4 px-4 text-center whitespace-nowrap">
                          {u.notifications_enabled ? (
                            <span className="inline-flex p-1 rounded-md bg-emerald-100 text-emerald-700" title="Push Enabled">
                              <Bell size={15} />
                            </span>
                          ) : (
                            <span className="inline-flex p-1 rounded-md bg-ink/5 text-faded-ink opacity-40" title="Push Disabled">
                              <Bell size={15} />
                            </span>
                          )}
                        </td>

                        {/* App Installed */}
                        <td className="py-4 px-4 text-center whitespace-nowrap">
                          {u.installed ? (
                            <span className="inline-flex p-1 rounded-md bg-moss/15 text-moss" title="Installed PWA">
                              <Smartphone size={15} />
                            </span>
                          ) : (
                            <span className="inline-flex p-1 rounded-md bg-ink/5 text-faded-ink opacity-40" title="Not Installed">
                              <Smartphone size={15} />
                            </span>
                          )}
                        </td>

                        {/* Action Chevron */}
                        <td className="py-4 px-4 text-right whitespace-nowrap">
                          <button className="p-1 text-faded-ink group-hover:text-ink transition">
                            <ChevronRight size={18} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Footer count summary */}
          <div className="p-4 border-t border-ink/10 bg-ink/[0.02] text-xs text-faded-ink flex items-center justify-between">
            <span>Showing <strong>{filteredUsers.length}</strong> of <strong>{users.length}</strong> total registered users</span>
            <span>Refreshed live from Supabase</span>
          </div>

        </div>

        {/* Feedback Inbox */}
        <div className="bg-paper rounded-2xl border border-ink/10 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-ink/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare size={16} className="text-ember" />
              <span className="font-bold text-sm text-ink">User Feedback</span>
              {feedbacks.length > 0 && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-ember/10 text-ember">
                  {feedbacks.length}
                </span>
              )}
            </div>
          </div>

          {feedbackLoading ? (
            <div className="p-12 text-center text-faded-ink space-y-3">
              <RefreshCw className="animate-spin mx-auto text-moss" size={24} />
              <p className="text-sm font-medium">Loading feedback...</p>
            </div>
          ) : feedbackError ? (
            <div className="p-6">
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center gap-3">
                <AlertCircle className="shrink-0 text-rose-600" size={18} />
                <p className="flex-1">{feedbackError}</p>
              </div>
            </div>
          ) : feedbacks.length === 0 ? (
            <div className="text-center py-12 text-faded-ink text-sm">
              <MessageSquare size={28} className="mx-auto mb-3 opacity-20" />
              <p>No feedback submitted yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-ink/5">
              {feedbacks.map((fb) => (
                <div key={fb.id} className="px-5 py-4 hover:bg-ink/[0.015] transition">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 min-w-0">
                      {/* Avatar */}
                      <div className="w-8 h-8 rounded-full bg-ember/15 text-ember font-bold text-xs flex items-center justify-center shrink-0 border border-ember/20 mt-0.5">
                        {(fb.user_name || fb.user_email || '?').slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-xs font-semibold text-ink">
                            {fb.user_name || fb.user_email?.split('@')[0] || 'Unknown User'}
                          </span>
                          {fb.user_email && (
                            <span className="text-xs text-faded-ink font-mono">{fb.user_email}</span>
                          )}
                        </div>
                        <p className="text-sm text-ink leading-relaxed">{fb.message}</p>
                      </div>
                    </div>
                    <span className="text-xs text-faded-ink whitespace-nowrap shrink-0 mt-0.5">
                      {new Date(fb.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* User Details Drawer / Modal */}
      <AnimatePresence>
        {selectedUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-paper rounded-2xl border border-ink/15 shadow-xl max-w-lg w-full overflow-hidden p-6 space-y-6"
            >
              {/* Modal Header */}
              <div className="flex items-start justify-between border-b border-ink/10 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-ember/15 text-ember font-bold text-base flex items-center justify-center border border-ember/20">
                    {(selectedUser.full_name || selectedUser.name || selectedUser.email || 'U').slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-xl text-ink">
                      {selectedUser.full_name || selectedUser.name || `${selectedUser.first_name || ''} ${selectedUser.last_name || ''}`.trim() || 'Learner'}
                    </h3>
                    <p className="text-xs text-faded-ink font-mono">{selectedUser.email || 'No email'}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedUser(null)}
                  className="p-1 text-faded-ink hover:text-ink rounded-lg hover:bg-ink/5 transition"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Activity Snapshot */}
              <div className="space-y-4 text-sm">

                {/* Last Active */}
                <div className="p-3.5 rounded-xl bg-ink/5 border border-ink/5 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-faded-ink">Last Seen Timestamp</span>
                    <span className="text-xs font-semibold text-moss">
                      {formatRelativeTime(selectedUser.last_seen_at).text}
                    </span>
                  </div>
                  <p className="font-mono text-xs text-ink font-semibold">
                    {formatDate(selectedUser.last_seen_at)}
                  </p>
                </div>

                {/* User Info Grid */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl border border-ink/10 bg-white/40 space-y-1">
                    <span className="text-faded-ink block">Joined Date</span>
                    <span className="font-semibold text-ink block font-mono">
                      {selectedUser.created_at ? new Date(selectedUser.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl border border-ink/10 bg-white/40 space-y-1">
                    <span className="text-faded-ink block">Push Notifications</span>
                    <span className={`font-semibold block ${selectedUser.notifications_enabled ? 'text-emerald-700' : 'text-faded-ink'}`}>
                      {selectedUser.notifications_enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                </div>

                {/* User ID Section */}
                <div className="space-y-1">
                  <span className="text-xs font-medium text-faded-ink">Supabase User ID</span>
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white/60 border border-ink/10 font-mono text-xs text-ink">
                    <span className="flex-1 truncate">{selectedUser.id}</span>
                    <button
                      onClick={() => handleCopyUserId(selectedUser.id)}
                      className="p-1 text-faded-ink hover:text-ink transition shrink-0"
                      title="Copy User ID"
                    >
                      {copiedId ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>

              </div>

              {/* Modal Footer */}
              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  onClick={() => setSelectedUser(null)}
                  className="px-4 py-2 text-sm font-medium rounded-xl border border-ink/15 text-ink hover:bg-ink/5 transition"
                >
                  Close
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </AppShell>
  );
}