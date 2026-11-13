import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, Bookmark, Share2, RotateCw } from 'lucide-react';
import { AppShell } from '../../components/AppShell';
import { Button } from '../../components/ui/Button';
import { useTodaysFact } from '../home/hooks';
import { useFactCardInteractions } from '../../components/useFactInteractions';
import { ShareCardModal } from '../../components/ShareCardModal';
import { markFactOpened } from '../../services/localPrefs';
import { spring } from '../../lib/motion';
import { cn } from '../../lib/utils';

/** Focused, full-screen flip-card reading view for today's fact. */
export function FactFocusScreen() {
  const navigate = useNavigate();
  const todaysFact = useTodaysFact();
  const fact = todaysFact.data;
  const { isSaved, toggleSave } = useFactCardInteractions(fact?.id ?? '');
  const [flipped, setFlipped] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  useEffect(() => {
    if (fact) markFactOpened(fact.id);
  }, [fact]);

  const bullets = fact ? [fact.bullet_1, fact.bullet_2, fact.bullet_3, fact.bullet_4].filter(Boolean) : [];

  return (
    <AppShell title="Today's fact">
      <div className="py-5 max-w-lg mx-auto w-full flex flex-col gap-5">
        <button
          onClick={() => navigate('/home')}
          className="flex items-center gap-1 text-ink-500 hover:text-ink-900 transition-colors text-sm font-ui self-start"
        >
          <ChevronLeft size={18} />
          Today
        </button>

        {todaysFact.loading ? (
          <div className="bg-surface rounded-card shadow-card border border-line p-6 animate-pulse h-80" />
        ) : !fact ? (
          <div className="bg-surface rounded-card shadow-card border border-line p-6 text-center text-ink-500 py-12 font-ui">
            Today's fact is on its way — check back soon.
          </div>
        ) : (
          <div style={{ perspective: 1000 }}>
            <motion.div
              className="relative min-h-[420px]"
              style={{ transformStyle: 'preserve-3d' }}
              animate={{ rotateY: flipped ? 180 : 0 }}
              transition={spring.soft}
            >
              {/* Front */}
              <div
                className="absolute inset-0 bg-surface rounded-sheet shadow-raised border border-line overflow-hidden flex flex-col"
                style={{ backfaceVisibility: 'hidden' }}
              >
                <div className="h-44 bg-moss-50 w-full relative overflow-hidden flex-shrink-0">
                  {fact.image_url ? (
                    <img src={fact.image_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-ink-500">
                      <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
                      </svg>
                    </div>
                  )}
                </div>
                <div className="p-6 flex flex-col gap-4 flex-1">
                  <h1 className="font-display text-title font-bold text-ink-900 leading-[1.4]">{fact.hook_line}</h1>
                  <p className="text-ink-500 text-sm leading-relaxed font-ui flex-1">{fact.context_line}</p>
                  <button
                    onClick={() => setFlipped(true)}
                    className="self-start inline-flex items-center gap-2 text-sm font-semibold text-ember-600 hover:text-ember-700 transition-colors font-ui"
                  >
                    <RotateCw size={15} />
                    Flip for the details
                  </button>
                </div>
              </div>

              {/* Back */}
              <div
                className="absolute inset-0 bg-ink-900 rounded-sheet shadow-raised p-6 flex flex-col gap-4 text-paper"
                style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
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
                  className="self-start inline-flex items-center gap-2 text-sm font-semibold text-paper/80 hover:text-paper transition-colors font-ui"
                >
                  <RotateCw size={15} />
                  Flip back
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {fact && (
          <div className="flex items-center gap-3 font-ui">
            <button
              onClick={toggleSave}
              className={cn(
                'w-11 h-11 rounded-control border flex items-center justify-center transition-colors',
                isSaved ? 'border-ember-500/30 bg-ember-50 text-ember-600' : 'border-line-strong text-ink-900 hover:bg-ink-900/5'
              )}
              aria-pressed={isSaved}
              aria-label={isSaved ? 'Remove from collection' : 'Save to collection'}
            >
              <Bookmark size={18} fill={isSaved ? 'currentColor' : 'none'} />
            </button>
            <button
              onClick={() => setShareOpen(true)}
              className="w-11 h-11 rounded-control border border-line-strong text-ink-900 hover:bg-ink-900/5 flex items-center justify-center transition-colors"
              aria-label="Share this fact"
            >
              <Share2 size={18} />
            </button>
            <Button onClick={() => navigate('/home')} className="flex-1">
              Got it · on to the quiz
            </Button>
          </div>
        )}
      </div>

      {fact && (
        <ShareCardModal
          isOpen={shareOpen}
          onClose={() => setShareOpen(false)}
          data={{
            type: 'fact',
            hookLine: fact.hook_line,
            contextLine: fact.context_line,
            bullets,
          }}
        />
      )}
    </AppShell>
  );
}
