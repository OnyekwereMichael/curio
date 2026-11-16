import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, Share2, RotateCw, Check } from 'lucide-react';
import { AppShell } from '../../components/AppShell';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/Skeleton';
import { useDailyFacts } from '../../hooks/useDailyFacts';
import { useSaveItem } from '../../hooks/useSaveItem';
import { useItemCooldown } from '../../hooks/useWordCooldown';
import { SaveItemButton, saveHelperText } from '../../components/SaveItemButton';
import { SaveToReviewPrompt } from '../../components/SaveToReviewPrompt';
import { QuizModal } from '../../components/QuizModal';
import { ShareCardModal } from '../../components/ShareCardModal';
import { markFactOpened } from '../../services/localPrefs';
import { track } from '../../lib/analytics';
import { spring } from '../../lib/motion';
import type { Fact } from '../home/hooks';

/**
 * Focused, full-screen flip-card reading view for today's facts. The server freezes the set for the day
 * (1, 3 or 5 facts), so this screen, the home card and the quest always agree. "Test me" works like it does for words.
 */
export function FactFocusScreen() {
  const navigate = useNavigate();
  const daily = useDailyFacts();
  const [index, setIndex] = useState(0);
  const [passedLocal, setPassedLocal] = useState<Set<string>>(new Set());

  const facts = daily.data?.facts ?? [];
  const total = facts.length;
  const fact = facts[Math.min(index, Math.max(total - 1, 0))] ?? null;
  const passed = (id: string) => passedLocal.has(id) || !!daily.data?.passedIds.includes(id);

  // The set is replaced when a new Lagos day starts under an open screen: begin again from the first fact.
  const day = daily.data?.date;
  useEffect(() => setIndex(0), [day]);

  function handleDone() {
    if (index < total - 1) setIndex(index + 1);
    else navigate('/home');
  }

  return (
    <AppShell title="Today's fact">
      <div className="py-5 max-w-lg mx-auto w-full flex flex-col gap-5">
        <button
          onClick={() => navigate('/home')}
          className="flex items-center gap-1 text-ink-500 hover:text-ink-900 transition-colors text-sm font-ui self-start min-h-11"
        >
          <ChevronLeft size={18} />
          Today
        </button>

        {daily.loading ? (
          <div className="bg-surface rounded-card shadow-card border border-line p-6 animate-pulse h-80" />
        ) : daily.error && !daily.data ? (
          <div className="bg-surface rounded-card shadow-card border border-line p-6 text-center text-ink-500 py-12 font-ui flex flex-col items-center gap-3" role="alert">
            Couldn't load today's fact. Check your connection.
            <Button variant="secondary" onClick={daily.reload}>Try again</Button>
          </div>
        ) : !fact ? (
          <div className="bg-surface rounded-card shadow-card border border-line p-6 text-center text-ink-500 py-12 font-ui">
            Today's fact is on its way — check back soon.
          </div>
        ) : (
          <>
            {daily.data?.recycled && (
              <p className="text-xs text-ink-500 font-ui" role="status">
                You've seen most of our facts, so a few may be repeats until we add more.
              </p>
            )}
            {daily.data && daily.data.setSize < daily.data.chosenCount && (
              <p className="text-xs text-ink-500 font-ui" role="status">
                Only {daily.data.setSize} fact{daily.data.setSize === 1 ? '' : 's'} available today.
              </p>
            )}
            {/* key resets the flip, save and quiz state for each new fact */}
            <FactFocusCard
              key={fact.id}
              fact={fact}
              index={index}
              total={total}
              passed={passed(fact.id)}
              onPassed={() => setPassedLocal((s) => new Set(s).add(fact.id))}
              onDone={handleDone}
            />
          </>
        )}
      </div>
    </AppShell>
  );
}

function FactFocusCard({ fact, index, total, passed, onPassed, onDone }: {
  fact: Fact; index: number; total: number; passed: boolean; onPassed: () => void; onDone: () => void;
}) {
  const save = useSaveItem('fact', fact.id, { source: 'fact_focus' });
  const cooldown = useItemCooldown('fact', fact.id);
  const [flipped, setFlipped] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [checkOpen, setCheckOpen] = useState(false);
  const isLast = index >= total - 1;
  const bullets = [fact.bullet_1, fact.bullet_2, fact.bullet_3, fact.bullet_4].filter(Boolean);

  useEffect(() => {
    markFactOpened(fact.id);
    track('fact_started', { fact_id: fact.id, position: index + 1, of: total });
  }, [fact.id, index, total]);

  function handleTest() {
    if (passed) onDone();
    else save.requestTest(() => setCheckOpen(true));
  }

  return (
    <>
      <div className="flex flex-col gap-1">
        <div className="text-xs font-bold tracking-wider uppercase text-ember-600 font-ui">
          {total > 1 ? `Fact ${index + 1} of ${total}` : "Today's fact"}
        </div>
      </div>

      {/* While the test is open the fact is not rendered at all (not just blurred), so it can't be read behind the quiz. */}
      {checkOpen ? (
        <div className="bg-surface rounded-sheet shadow-raised border border-line p-6 min-h-[420px] flex flex-col gap-4">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-7 w-5/6" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      ) : (
        <div style={{ perspective: 1000 }}>
          <motion.div
            className="relative min-h-[420px]"
            style={{ transformStyle: 'preserve-3d' }}
            animate={{ rotateY: flipped ? 180 : 0 }}
            transition={spring.soft}
          >
            <div
              className="absolute inset-0 bg-surface rounded-sheet shadow-raised border border-line overflow-hidden flex flex-col"
              style={{ backfaceVisibility: 'hidden' }}
              aria-hidden={flipped}
            >
              <div className="h-44 bg-moss-50 w-full relative overflow-hidden flex-shrink-0">
                {fact.image_url ? <img src={fact.image_url} alt="" className="w-full h-full object-cover" /> : null}
              </div>
              <div className="p-6 flex flex-col gap-4 flex-1">
                <h1 className="font-display text-title font-bold text-ink-900 leading-[1.4]">{fact.hook_line}</h1>
                <p className="text-ink-500 text-sm leading-relaxed font-ui flex-1">{fact.context_line}</p>
                <button
                  onClick={() => setFlipped(true)}
                  className="self-start inline-flex items-center gap-2 text-sm font-semibold text-ember-600 hover:text-ember-700 transition-colors font-ui min-h-11"
                >
                  <RotateCw size={15} />
                  Flip for the details
                </button>
              </div>
            </div>

            <div
              className="absolute inset-0 bg-ink-900 rounded-sheet shadow-raised p-6 flex flex-col gap-4 text-paper"
              style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
              aria-hidden={!flipped}
            >
              <div className="text-gold-500 text-xs font-bold tracking-wider uppercase font-ui">Key points</div>
              <h2 className="font-display text-title font-bold leading-[1.3]">{fact.hook_line}</h2>
              <ol className="flex flex-col gap-3 flex-1">
                {bullets.map((b, i) => (
                  <li key={i} className="flex gap-3 text-sm leading-relaxed font-ui">
                    <span className="text-gold-500 font-display font-bold flex-shrink-0">{i + 1}</span>
                    <span className="opacity-90">{b}</span>
                  </li>
                ))}
              </ol>
              <button
                onClick={() => setFlipped(false)}
                className="self-start inline-flex items-center gap-2 text-sm font-semibold text-paper/80 hover:text-paper transition-colors font-ui min-h-11"
              >
                <RotateCw size={15} />
                Flip back
              </button>
            </div>
          </motion.div>
        </div>
      )}

      <div className="flex items-center gap-3 font-ui">
        <SaveItemButton itemType="fact" saved={save.isSaved} loading={save.loading} flash={save.saveFlash} onToggle={save.toggle} />
        <p className="text-xs text-ink-500 leading-snug" role="status">
          {saveHelperText('fact', save.isSaved)}
        </p>
      </div>

      {save.promptOpen && <SaveToReviewPrompt itemType="fact" onSaveAndTest={save.saveAndTest} onJustTest={save.justTest} />}

      <div className="flex items-center gap-3 font-ui">
        <button
          onClick={() => setShareOpen(true)}
          className="w-11 h-11 rounded-control border border-line-strong text-ink-900 hover:bg-ink-900/5 flex items-center justify-center transition-colors"
          aria-label="Share this fact"
        >
          <Share2 size={18} />
        </button>
        <Button onClick={handleTest} disabled={!passed && cooldown.locked} className="flex-1 tabular-nums">
          {passed ? (
            <><Check size={16} /> {isLast ? 'Done' : 'Next fact'}</>
          ) : cooldown.locked ? (
            `Try again in ${cooldown.label}`
          ) : (
            'Test me'
          )}
        </Button>
      </div>
      {!passed && cooldown.locked && (
        <p className="text-sm text-ink-500 text-center font-ui" role="status">
          Read the fact again and come back when the timer ends.
        </p>
      )}

      <ShareCardModal
        isOpen={shareOpen}
        onClose={() => setShareOpen(false)}
        data={{ type: 'fact', hookLine: fact.hook_line, contextLine: fact.context_line, bullets }}
      />

      {checkOpen && (
        <QuizModal
          itemType="fact"
          itemId={fact.id}
          name="this fact"
          onPassed={onPassed}
          onFailed={cooldown.startLocal}
          onClose={() => {
            setCheckOpen(false);
            cooldown.refresh();
            if (passed) onDone();
          }}
        />
      )}
    </>
  );
}
