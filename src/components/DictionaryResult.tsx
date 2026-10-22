import { useState, useCallback, useEffect } from 'react';
import { Volume2, AlertCircle, BookOpen } from 'lucide-react';
import { cn } from '../lib/utils';
import { useToast } from './ui/Toast';
import type { DictionaryEntry } from '../hooks/useDictionary';

/* ───────────── Loading skeleton ───────────── */

function ResultSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading definition"
      className="flex animate-pulse flex-col gap-6 rounded-2xl border border-ink/10 bg-paper p-5 shadow-sm sm:p-6"
    >
      {/* Word + phonetic + audio */}
      <div className="flex items-start justify-between gap-4 border-b border-ink/10 pb-5">
        <div className="flex w-full flex-col gap-3">
          <div className="h-9 w-2/5 rounded-lg bg-ink/10" />
          <div className="h-5 w-24 rounded-full bg-ink/10" />
        </div>
        <div className="h-11 w-11 flex-shrink-0 rounded-full bg-ink/10" />
      </div>

      {/* Part of speech */}
      <div className="flex items-center gap-3">
        <div className="h-3 w-16 rounded bg-ink/10" />
        <div className="h-px flex-1 bg-ink/10" />
      </div>

      {/* Definitions */}
      <div className="flex flex-col gap-5">
        {[0, 1].map((i) => (
          <div key={i} className="flex gap-3">
            <div className="h-6 w-6 flex-shrink-0 rounded-full bg-ink/10" />
            <div className="flex w-full flex-col gap-2">
              <div className="h-4 w-full rounded bg-ink/10" />
              <div className="h-4 w-4/5 rounded bg-ink/10" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ───────────── Error state ───────────── */

function ErrorState({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-4 rounded-2xl border border-ink/10 bg-paper px-6 py-10 text-center shadow-sm"
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-ember/10">
        <AlertCircle size={26} className="text-ember" aria-hidden="true" />
      </div>
      <div>
        <p className="mb-1 font-display text-lg font-bold text-ink">
          Word not found
        </p>
        <p className="mx-auto max-w-xs text-sm leading-relaxed text-faded-ink">
          {message}
        </p>
      </div>
    </div>
  );
}

/* ───────────── Empty state (before search) ───────────── */

export function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-4 py-10 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-ember/10">
        <BookOpen size={26} className="text-ember" aria-hidden="true" />
      </div>
      <div>
        <p className="mb-1 font-display text-lg font-bold text-ink">
          Look up any word
        </p>
        <p className="mx-auto max-w-xs text-sm leading-relaxed text-faded-ink">
          Search for a word to see its phonetic spelling, definitions, and usage
          examples.
        </p>
      </div>
    </div>
  );
}

/* ───────────── Main result ───────────── */

interface DictionaryResultProps {
  data: DictionaryEntry | null;
  loading: boolean;
  error: string | null;
  searched: boolean;
}

export function DictionaryResult({
  data,
  loading,
  error,
  searched,
}: DictionaryResultProps) {
  if (loading) return <ResultSkeleton />;
  if (error) return <ErrorState message={error} />;
  if (!searched) return <EmptyState />;
  if (!data) return null;

  return <DefinitionCard entry={data} />;
}

/* ───────────── Definition card ───────────── */

function DefinitionCard({ entry }: { entry: DictionaryEntry }) {
  const { word, phonetic, phoneticAudioUrl, meanings } = entry;

  return (
    <article className="flex flex-col gap-6 rounded-2xl border border-ink/10 bg-paper p-5 font-ui shadow-sm sm:p-6">
      {/* Header: word, phonetic, audio */}
      <header className="flex items-start justify-between gap-4 border-b border-ink/10 pb-5">
        <div className="flex min-w-0 flex-col gap-2">
          <h2 className="break-words font-display text-3xl font-bold capitalize leading-tight tracking-tight text-ink sm:text-4xl">
            {word}
          </h2>
          {phonetic && (
            <span className="w-fit rounded-full bg-ember/10 px-3 py-1 font-utility text-sm tracking-wide text-ember">
              {phonetic}
            </span>
          )}
        </div>

        <AudioButton word={word} audioUrl={phoneticAudioUrl} />
      </header>

      {/* Meanings */}
      {meanings.map((meaning, idx) => (
        <section key={`${meaning.partOfSpeech}-${idx}`}>
          {/* Part of speech with divider line */}
          <div className="mb-4 flex items-center gap-3">
            <span className="text-xs font-bold uppercase tracking-widest text-ember">
              {meaning.partOfSpeech}
            </span>
            <span className="h-px flex-1 bg-ink/10" aria-hidden="true" />
          </div>

          <ol className="flex flex-col gap-5">
            {meaning.definitions.map((def, dIdx) => (
              <li key={dIdx} className="flex gap-3">
                <span className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-ember/10 text-xs font-bold text-ember">
                  {dIdx + 1}
                </span>
                <div className="flex min-w-0 flex-col gap-2">
                  <p className="text-[15px] leading-relaxed text-ink">
                    {def.definition}
                  </p>
                  {def.example && (
                    <p className="border-l-2 border-ember/30 pl-3 text-sm italic leading-relaxed text-ink/70">
                      &ldquo;{def.example}&rdquo;
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </article>
  );
}

/* ───────────── Audio playback button ───────────── */

function AudioButton({ word, audioUrl }: { word: string; audioUrl?: string }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const { toast } = useToast();

  const play = useCallback(() => {
    if (isPlaying) return;

    if (!('speechSynthesis' in window)) {
      if (audioUrl) {
        const audio = new Audio(audioUrl);
        audio.onplaying = () => setIsPlaying(true);
        audio.onended = () => setIsPlaying(false);
        audio.onerror = () => {
          setIsPlaying(false);
          toast.error('Audio unavailable', 'Failed to play the pronunciation audio.');
        };
        audio.play().catch(() => {
          setIsPlaying(false);
          toast.error('Audio unavailable', 'Failed to play the pronunciation audio.');
        });
        return;
      }
      toast.error('Audio unavailable', 'Text-to-speech is not supported in this browser.');
      return;
    }

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(word);

    // Try to find an English voice
    const voices = window.speechSynthesis.getVoices();
    const enVoice = voices.find(
      (v) => v.lang === 'en-US' || v.lang === 'en-GB' || v.lang.startsWith('en-')
    );
    if (enVoice) {
      utterance.voice = enVoice;
    } else {
      utterance.lang = 'en-US';
    }

    utterance.onstart = () => setIsPlaying(true);
    utterance.onend = () => setIsPlaying(false);
    utterance.onerror = () => setIsPlaying(false);

    window.speechSynthesis.speak(utterance);
  }, [word, audioUrl, isPlaying, toast]);

  useEffect(() => {
    return () => {
      window.speechSynthesis?.cancel();
    };
  }, []);

  return (
    <button
      onClick={play}
      className={cn(
        'flex h-11 w-11 flex-shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember/40',
        isPlaying
          ? 'animate-pulse bg-ember/20 text-ember/70'
          : 'bg-ember/10 text-ember hover:bg-ember/15 active:bg-ember/20'
      )}
      aria-label="Play pronunciation"
      type="button"
    >
      <Volume2 size={20} strokeWidth={2.5} aria-hidden="true" />
    </button>
  );
}