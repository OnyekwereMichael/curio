import { useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { BookOpen, Lightbulb, HelpCircle } from 'lucide-react';
import { DailyQuiz } from '../../components/DailyQuiz';
import { StreakLossModal } from '../../components/StreakLossModal';
import { MilestoneModal } from '../../components/MilestoneModal';

import { useTodaysWord, useTodaysWords, useOldButGold, useTodaysFact, useOldButGoldFact } from './hooks';
import { useAuth } from '../../contexts/AuthContext';
import { AppShell } from '../../components/AppShell';
import { NotificationReEnableBanner } from '../../components/NotificationReEnableBanner';
import { useStreak } from '../../components/useStreak';
import { supabase } from '../../lib/superbase';
import { StreakCalendar } from '../../components/Streakcalendar';
import { ShieldProgress } from '../../components/ShieldProgress';
import { ShieldSavedNotice } from '../../components/ShieldSavedNotice';
import { PlanRow, type PlanRowState } from '../../components/PlanRow';
import { StreakAtRiskBanner } from '../../components/StreakAtRiskBanner';
import { DailyQuestsPanel } from '../../components/DailyQuestsPanel';
import { WeeklyPrizesCard } from '../../components/WeeklyPrizesCard';
import { fetchWordProgress, fetchTodayActivity } from '../../services/progress';
import { isFactOpened } from '../../services/localPrefs';

function SkeletonCard() {
  return (
    <div className="bg-surface rounded-card shadow-card border border-line p-6 animate-pulse h-48 w-full flex flex-col justify-center">
      <div className="h-4 bg-ink-900/10 rounded w-1/4 mb-4"></div>
      <div className="h-8 bg-ink-900/10 rounded w-1/2 mb-4"></div>
      <div className="h-4 bg-ink-900/10 rounded w-full mb-2"></div>
      <div className="h-4 bg-ink-900/10 rounded w-3/4"></div>
    </div>
  );
}

function FallbackCard({ message }: { message: string }) {
  return (
    <div className="bg-surface rounded-card shadow-card border border-line p-6 text-center text-ink-500 py-12 font-ui">
      <p>{message}</p>
    </div>
  );
}

export function HomeScreen() {
  const navigate = useNavigate();
  const todaysWord = useTodaysWord();
  const todaysWords = useTodaysWords();
  const oldButGold = useOldButGold();
  const todaysFact = useTodaysFact();
  const { user } = useAuth();
  const oldButGoldFact = useOldButGoldFact();
  const {
    commitStreak, currentStreak, shieldCount, shieldsJustUsed, shieldJustEarned,
    lostStreak, missedDays, reconcileStreak, recoverStreak, dismissLostStreak,
    milestoneReached, dismissMilestone,
  } = useStreak();

  useEffect(() => {
    reconcileStreak();
  }, [reconcileStreak]);

  useEffect(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    const hasPrompted = localStorage.getItem('notification_prompted');

    if (isStandalone && !hasPrompted && 'Notification' in window && Notification.permission === 'default') {
      supabase.from('users').update({ installed: true }).eq('id', user?.id).then(() => {
        navigate('/notification-permission', { replace: true });
      });
    } else if (isStandalone) {
      supabase.from('users').update({ installed: true }).eq('id', user?.id);
    }
  }, [navigate, user]);

  // Logs today as an active day — feeds the StreakCalendar's plain "active"
  // dots, separate from the gold star which marks a perfect quiz day.
  useEffect(() => {
    if (!user) return;
    const today = new Date().toISOString().split('T')[0];

    supabase
      .from('user_activity_log')
      .upsert(
        { user_id: user.id, activity_date: today },
        { onConflict: 'user_id,activity_date', ignoreDuplicates: true }
      )
      .then(({ error }) => {
        if (error) console.error('Failed to log daily activity:', error.message);
      });
  }, [user]);

  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  })();

  const firstName =
    (user?.user_metadata?.full_name || user?.user_metadata?.name || '')
      .split(' ')[0] || 'there';

  // Real done/now/next status for the plan-row overview below.
  const [wordDone, setWordDone] = useState(false);
  const [quizDone, setQuizDone] = useState(false);
  const factDone = todaysFact.data ? isFactOpened(todaysFact.data.id) : false;
  const quizSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user || todaysWords.data.length === 0) return;
    Promise.all(todaysWords.data.map((w) => fetchWordProgress(user.id, w.id))).then((statuses) =>
      setWordDone(statuses.every((s) => s?.markedKnown ?? false))
    );
  }, [user, todaysWords.data]);

  useEffect(() => {
    if (!user) return;
    fetchTodayActivity(user.id).then((activity) => setQuizDone(activity?.quizCompleted ?? false));
  }, [user]);

  const planItems = [
    {
      key: 'word',
      done: wordDone,
      icon: <BookOpen size={16} />,
      title: todaysWords.data.length > 1 ? `Today's ${todaysWords.data.length} words` : "Today's word",
      subtitle: todaysWords.data.length > 0 ? todaysWords.data.map((w) => w.word).join(', ') : 'Loading…',
      onAction: () => navigate('/learn/word'),
    },
    {
      key: 'fact',
      done: factDone,
      icon: <Lightbulb size={16} />,
      title: "Today's fact",
      subtitle: todaysFact.data?.category || "Today's fact",
      onAction: () => navigate('/learn/fact'),
    },
    {
      key: 'quiz',
      done: quizDone,
      icon: <HelpCircle size={16} />,
      title: 'Daily quiz',
      subtitle: 'Counts your day',
      onAction: () => quizSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }),
    },
  ];
  let nowAssigned = false;
  const planRows = planItems.map((item) => {
    let state: PlanRowState;
    if (item.done) state = 'done';
    else if (!nowAssigned) {
      nowAssigned = true;
      state = 'now';
    } else {
      state = 'next';
    }
    return { ...item, state };
  });

  return (
    <AppShell title="Home">
      <NotificationReEnableBanner />
      <ShieldSavedNotice shieldsUsed={shieldsJustUsed} shieldsLeft={shieldCount} />
      <MilestoneModal milestone={milestoneReached} shieldEarned={shieldJustEarned} onClose={dismissMilestone} />
      <StreakLossModal
        lostStreak={lostStreak}
        missedDays={missedDays}
        shieldCount={shieldCount}
        onRestore={recoverStreak}
        onStartFresh={dismissLostStreak}
      />
      <div className="py-5 w-full flex flex-col gap-10">
        <div className="flex items-start gap-4">
          {/* <MascotCompanion
            size={72}
           
          /> */}
          <div>
            <p className="text-ink-500 text-base font-medium mb-1 font-ui">{greeting} 👋</p>
            <h1 className="font-display text-display font-bold text-ink-900 leading-tight">
              {firstName}, here's your daily dose.
            </h1>
            <p className="text-ink-500 text-sm font-ui mt-1">
              {[
                todaysWords.data.length > 0 && `${todaysWords.data.length} word${todaysWords.data.length !== 1 ? 's' : ''}`,
                todaysFact.data && '1 fact',
                '1 quiz',
              ].filter(Boolean).join(', ')} · about {3 + todaysWords.data.length} min
            </p>
            <div className="mt-4 cursor-pointer">
              <ShieldProgress currentStreak={currentStreak} shieldCount={shieldCount} />
            </div>
          </div>
        </div>

        {/* Today's plan — overview of the word/fact/quiz row, real done/now/next state */}
        <div className="bg-surface rounded-sheet border border-line shadow-card p-2 flex flex-col gap-1">
          {planRows.map((row) => (
            <PlanRow
              key={row.key}
              state={row.state}
              icon={row.icon}
              title={row.title}
              subtitle={row.subtitle}
              actionLabel="Start"
              onAction={row.onAction}
            />
          ))}
        </div>

        <WeeklyPrizesCard streak={currentStreak} />

        <StreakAtRiskBanner
          currentStreak={currentStreak}
          quizDone={quizDone}
          shieldCount={shieldCount}
          onStart={() => quizSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
        />

        <DailyQuestsPanel />

        {/* The full word/fact reading experience now lives at /learn/word
            and /learn/fact (see the "Start" actions above) — the plan-row
            is the overview, matching the redesign's home/reading split. */}
        {(todaysWord.loading || todaysFact.loading) && (
          <div className="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        )}
        {!todaysWord.loading && !todaysWord.data && (
          <FallbackCard message="Today's word is on its way — check back soon." />
        )}
        {!todaysFact.loading && !todaysFact.data && (
          <FallbackCard message="Today's fact is on its way — check back soon." />
        )}

        <div ref={quizSectionRef}>
          <DailyQuiz
            todaysWord={todaysWord.data}
            oldButGoldWord={oldButGold.data}
            todaysFact={todaysFact.data}
            oldButGoldFact={oldButGoldFact.data}
            currentStreak={currentStreak}
            commitStreak={commitStreak}
          />
        </div>

        {/* Streak calendar — shows the last 30 days, gold star on perfect quiz days */}
        <StreakCalendar />

      </div>
    </AppShell>
  );
}