import { useEffect, useState } from 'react';
import { Flame, Shield, Star, Circle } from 'lucide-react';
import { AppShell } from '../../components/AppShell';
import { useAuth } from '../../contexts/AuthContext';
import { useStreak } from '../../components/useStreak';
import { fetchActivityRange, fetchWordStats, fetchQuizAccuracy, fetchWeeklyProgress, fetchMasteredCount, type MonthActivityDay, type WordStats, type QuizAccuracy, type WeeklyProgress } from '../../services/progress';
import { WeeklyRing } from '../../components/WeeklyRing';
import { cn } from '../../lib/utils';

const DAYS_PER_SHIELD = 7;

function monthGrid(year: number, month: number) {
  const firstOfMonth = new Date(year, month, 1);
  // Monday-first week, matching the redesign's calendar
  const startOffset = (firstOfMonth.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = Array(startOffset).fill(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function toDateKey(d: Date) {
  return d.toISOString().split('T')[0];
}

export function ProgressPage() {
  const { user } = useAuth();
  const { currentStreak, longestStreak, shieldCount } = useStreak();
  const [activity, setActivity] = useState<MonthActivityDay[]>([]);
  const [wordStats, setWordStats] = useState<WordStats>({ wordsLearned: 0, topicsExplored: 0 });
  const [accuracy, setAccuracy] = useState<QuizAccuracy>({ accuracyPct: null, quizzesTaken: 0 });
  const [weekly, setWeekly] = useState<WeeklyProgress | null>(null);
  const [mastered, setMastered] = useState(0);

  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();

  useEffect(() => {
    if (!user) return;
    const monthStart = new Date(year, month, 1).toISOString().split('T')[0];
    fetchActivityRange(user.id, monthStart).then(setActivity);
    fetchWordStats(user.id).then(setWordStats);
    fetchQuizAccuracy(user.id).then(setAccuracy);
    fetchWeeklyProgress(user.id).then(setWeekly);
    fetchMasteredCount(user.id).then(setMastered);
  }, [user, year, month]);

  const activityByDate = new Map(activity.map((a) => [a.activityDate, a]));
  const cells = monthGrid(year, month);
  const todayKey = toDateKey(today);
  const daysToNextShield = DAYS_PER_SHIELD - (currentStreak % DAYS_PER_SHIELD);

  return (
    <AppShell title="Progress">
      <div className="px-4 py-5 w-full flex flex-col gap-6">
        <h1 className="font-display text-display font-bold text-ink-900">Progress</h1>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-surface rounded-card border border-line shadow-card p-4 font-ui">
            <div className="flex items-center gap-1.5 text-2xl font-display font-bold text-ink-900">
              <Flame size={20} className="text-gold-700" />
              {currentStreak}
            </div>
            <p className="text-xs text-ink-500 mt-1">day streak · best {longestStreak}</p>
          </div>
          <div className="bg-surface rounded-card border border-line shadow-card p-4 font-ui">
            <div className="flex items-center gap-1.5 text-2xl font-display font-bold text-ink-900">
              <Shield size={20} className="text-moss-600" />
              {shieldCount}
            </div>
            <p className="text-xs text-ink-500 mt-1">
              shields · next in {daysToNextShield} day{daysToNextShield !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {weekly && <WeeklyRing progress={weekly} />}

        <div className="bg-surface rounded-card border border-line shadow-card p-5 font-ui">
          <div className="flex items-center justify-between mb-4">
            <p className="font-display text-heading font-bold text-ink-900">
              {today.toLocaleDateString('en-US', { month: 'long' })}
            </p>
          </div>
          <div className="grid grid-cols-7 gap-1.5 text-center text-[11px] text-ink-500 mb-2">
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
              <span key={i}>{d}</span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {cells.map((date, i) => {
              if (!date) return <div key={i} />;
              const key = toDateKey(date);
              const day = activityByDate.get(key);
              const isToday = key === todayKey;
              const isFuture = date > today;
              return (
                <div
                  key={i}
                  title={key}
                  className={cn(
                    'aspect-square rounded-tag flex items-center justify-center text-xs font-medium',
                    isToday && 'ring-2 ring-ember-600',
                    day?.quizPerfect ? 'bg-gold-50 text-gold-700' : day?.quizCompleted ? 'bg-ember-50 text-ember-600' : isFuture ? 'text-ink-500/40' : 'bg-ink-900/5 text-ink-500'
                  )}
                >
                  {day?.quizPerfect ? <Star size={12} className="fill-gold-500 text-gold-500" /> : date.getDate()}
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-4 mt-4 text-xs text-ink-500">
            <div className="flex items-center gap-1.5">
              <Star size={11} className="text-gold-500 fill-gold-500" />
              <span>Perfect quiz</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Circle size={7} className="text-ember-600 fill-ember-600" />
              <span>Done</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 font-ui">
          <div className="bg-surface rounded-card border border-line shadow-card p-4 text-center">
            <p className="text-2xl font-display font-bold text-ink-900">{wordStats.wordsLearned}</p>
            <p className="text-xs text-ink-500 mt-1">words learned</p>
          </div>
          <div className="bg-surface rounded-card border border-line shadow-card p-4 text-center">
            <p className="text-2xl font-display font-bold text-ink-900">{wordStats.topicsExplored}</p>
            <p className="text-xs text-ink-500 mt-1">topics explored</p>
          </div>
          <div className="bg-surface rounded-card border border-line shadow-card p-4 text-center">
            <p className="text-2xl font-display font-bold text-ink-900">
              {accuracy.accuracyPct !== null ? `${accuracy.accuracyPct}%` : '—'}
            </p>
            <p className="text-xs text-ink-500 mt-1">perfect quiz days</p>
          </div>
          <div className="bg-surface rounded-card border border-line shadow-card p-4 text-center">
            <p className="text-2xl font-display font-bold text-ink-900">{mastered}</p>
            <p className="text-xs text-ink-500 mt-1">words mastered</p>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
