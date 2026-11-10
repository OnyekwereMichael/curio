import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { X, Share2 } from 'lucide-react';
import { AppShell } from '../../components/AppShell';
import { Otter } from '../../components/Otter';
import { Button } from '../../components/ui/Button';
import { createDuelRoom, getDuelPrompts } from '../../services/games';
import { MOCK_OPPONENT_NAME } from '../../mocks/games';
import { cn } from '../../lib/utils';

type Stage = 'lobby' | 'round' | 'result';

/** Mock — simulated single opponent, no real multiplayer. See docs/BACKEND_TODO.md #7. */
export function WordDuelPage() {
  const navigate = useNavigate();
  const { code: codeParam } = useParams();
  const [code, setCode] = useState(codeParam && codeParam !== 'new' ? codeParam : '');
  const [opponentJoined, setOpponentJoined] = useState(codeParam !== 'new' ? true : false);
  const [stage, setStage] = useState<Stage>('lobby');
  const [round, setRound] = useState(0);
  const [myScore, setMyScore] = useState(0);
  const [opponentScore, setOpponentScore] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [opponentAnswered, setOpponentAnswered] = useState(false);

  const prompts = getDuelPrompts();
  const totalRounds = prompts.length;

  useEffect(() => {
    if (codeParam === 'new') {
      createDuelRoom().then(({ code: newCode }) => {
        setCode(newCode);
        const t = setTimeout(() => setOpponentJoined(true), 1800);
        return () => clearTimeout(t);
      });
    }
  }, [codeParam]);

  function handleStart() {
    setRound(0);
    setMyScore(0);
    setOpponentScore(0);
    setStage('round');
  }

  function handleAnswer(option: string) {
    if (selected) return;
    setSelected(option);
    const correct = option === prompts[round].correctAnswer;
    if (correct) setMyScore((s) => s + 1);

    // Simulated opponent answers a beat later, correct ~70% of the time.
    setTimeout(() => {
      setOpponentAnswered(true);
      if (Math.random() < 0.7) setOpponentScore((s) => s + 1);
    }, 500 + Math.random() * 800);

    setTimeout(() => {
      setSelected(null);
      setOpponentAnswered(false);
      if (round + 1 >= totalRounds) {
        setStage('result');
      } else {
        setRound((r) => r + 1);
      }
    }, 1800);
  }

  return (
    <AppShell title="Word Duel">
      <div className="px-4 py-5 max-w-md mx-auto w-full flex flex-col gap-5 min-h-[70vh]">
        {stage === 'lobby' && (
          <div className="flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <h1 className="font-display text-title font-bold text-ink-900">Word Duel · Mixed words</h1>
              <button onClick={() => navigate('/play')} aria-label="Close" className="text-ink-500 hover:text-ink-900">
                <X size={20} />
              </button>
            </div>

            <div className="flex flex-col items-center gap-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-500">Room code</p>
              <div className="flex gap-2">
                {(code || '····').split('').map((ch, i) => (
                  <div key={i} className="w-11 h-12 rounded-control border border-line-strong bg-surface flex items-center justify-center font-display font-bold text-lg text-ink-900">
                    {ch}
                  </div>
                ))}
              </div>
              {code && (
                <button
                  onClick={() => navigator.clipboard?.writeText(`Join my Word Duel on Curi: ${code}`)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-ember-600 hover:text-ember-700"
                >
                  <Share2 size={13} />
                  Share invite link
                </button>
              )}
            </div>

            <div className="bg-surface rounded-card border border-line shadow-card divide-y divide-line font-ui">
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-sm font-semibold text-ink-900">You</span>
                <span className="text-xs text-moss-600 font-medium">Ready</span>
              </div>
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-sm font-semibold text-ink-900">{opponentJoined ? MOCK_OPPONENT_NAME : 'Waiting for a friend…'}</span>
                {opponentJoined ? (
                  <span className="text-xs text-moss-600 font-medium">Ready</span>
                ) : (
                  <span className="w-4 h-4 rounded-full border-2 border-dashed border-line-strong" />
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 bg-surface rounded-card border border-line p-3">
              <Otter mood="idle" size={40} />
              <p className="text-xs text-ink-500">{totalRounds} rounds. Fastest right answer wins each one.</p>
            </div>

            <Button onClick={handleStart} disabled={!opponentJoined} className="w-full">
              {opponentJoined ? 'Start' : 'Waiting for opponent…'}
            </Button>
          </div>
        )}

        {stage === 'round' && (
          <div className="flex flex-col gap-5">
            <div className="flex items-center justify-between font-ui">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-ember-600 text-on-ember flex items-center justify-center text-xs font-bold">You</span>
                <span className="font-display text-xl font-bold text-ink-900">{myScore}</span>
              </div>
              <span className="text-xs text-ink-500">Round {round + 1} of {totalRounds}</span>
              <div className="flex items-center gap-2">
                <span className="font-display text-xl font-bold text-ink-900">{opponentScore}</span>
                <span className="w-8 h-8 rounded-full bg-moss-600 text-paper flex items-center justify-center text-xs font-bold">
                  {MOCK_OPPONENT_NAME[0]}
                </span>
              </div>
            </div>

            <div className="bg-ink-900 text-paper rounded-card p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-gold-500 mb-2">Which word means</p>
              <p className="font-display text-lg font-bold leading-snug">{prompts[round].question}</p>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {prompts[round].options.map((opt) => {
                const isCorrect = opt === prompts[round].correctAnswer;
                const isSelected = selected === opt;
                const showResult = selected !== null;
                return (
                  <button
                    key={opt}
                    onClick={() => handleAnswer(opt)}
                    disabled={!!selected}
                    className={cn(
                      'rounded-card border-2 py-4 px-3 text-sm font-semibold transition-colors',
                      !showResult && 'border-line bg-surface text-ink-900 hover:border-line-strong',
                      showResult && isCorrect && 'border-moss-600 bg-moss-50 text-moss-600',
                      showResult && isSelected && !isCorrect && 'border-ember-500 bg-ember-50 text-ember-600',
                      showResult && !isSelected && !isCorrect && 'border-line bg-surface text-ink-500 opacity-50'
                    )}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
            {opponentAnswered && <p className="text-xs text-ink-500 text-center">{MOCK_OPPONENT_NAME} has answered</p>}
          </div>
        )}

        {stage === 'result' && (
          <div className="flex-1 flex flex-col items-center justify-center text-center gap-4">
            <Otter mood={myScore >= opponentScore ? 'cheering' : 'supportive'} size={96} />
            <h1 className="font-display text-title font-bold text-ink-900">
              {myScore > opponentScore ? `You won ${myScore} to ${opponentScore}` : myScore < opponentScore ? `${MOCK_OPPONENT_NAME} won ${opponentScore} to ${myScore}` : `It's a tie, ${myScore} to ${opponentScore}`}
            </h1>
            <p className="text-sm text-ink-500">Good game, {MOCK_OPPONENT_NAME}. Rematch?</p>
            <div className="flex gap-3 w-full">
              <button
                onClick={() => navigate('/play')}
                className="flex-1 py-3 rounded-control border border-line-strong text-sm font-semibold text-ink-900 hover:bg-ink-900/5 transition-colors"
              >
                Back to Play
              </button>
              <Button onClick={handleStart} className="flex-1">
                Rematch
              </Button>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
