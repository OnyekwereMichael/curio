import { useState, useCallback, useEffect } from 'react';
import { Volume2, AlertCircle, BookOpen } from 'lucide-react';
import { cn } from '../lib/utils';
import type { DictionaryEntry } from '../hooks/useDictionary';

/* ───────────── Loading skeleton ───────────── */

function ResultSkeleton() {
  return (
    <div className="bg-paper rounded-xl shadow-sm border border-ink/5 p-6 animate-pulse flex flex-col gap-5">
      {/* Word + phonetic */}
      <div className="flex flex-col gap-2">
        <div className="h-7 bg-ink/10 rounded w-2/5" />
        <div className="h-4 bg-ink/8 rounded w-1/4" />
      </div>

      {/* Part of speech pill */}
      <div className="h-6 bg-ink/8 rounded-full w-20" />

      {/* Definitions */}
      <div className="flex flex-col gap-3">
        <div className="h-4 bg-ink/8 rounded w-full" />
        <div className="h-4 bg-ink/8 rounded w-5/6" />
        <div className="h-3 bg-ink/6 rounded w-3/4 ml-4" />
      </div>

      <div className="flex flex-col gap-3 pt-3 border-t border-ink/5">
        <div className="h-4 bg-ink/8 rounded w-full" />
        <div className="h-4 bg-ink/8 rounded w-4/6" />
      </div>
    </div>
  );
}

/* ───────────── Error state ───────────── */

function ErrorState({ message }: { message: string }) {
  return (
    <div className="bg-paper rounded-xl shadow-sm border border-ink/5 p-8 flex flex-col items-center text-center gap-4">
      <div className="w-14 h-14 rounded-full bg-ember/10 flex items-center justify-center">
        <AlertCircle size={28} className="text-ember" />
      </div>
      <div>
        <p className="text-ink font-semibold text-base mb-1">Word not found</p>
        <p className="text-faded-ink text-sm leading-relaxed max-w-sm">
          {message}
        </p>
      </div>
    </div>
  );
}

/* ───────────── Empty state (before search) ───────────── */

export function EmptyState() {
  return (
    <div className="flex flex-col items-center text-center gap-4 py-16">
      <div className="w-16 h-16 rounded-2xl bg-ember/8 flex items-center justify-center">
        <BookOpen size={32} className="text-ember" />
      </div>
      <div>
        <p className="text-ink font-display font-bold text-lg mb-1">
          Look up any word
        </p>
        <p className="text-faded-ink text-sm leading-relaxed max-w-xs">
          Search for a word to see its phonetic spelling, definitions, and usage
          examples.
        </p>
      </div>
    </div>
  );
}

/* ───────────── Main result card ───────────── */

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
    <div className="bg-paper rounded-xl shadow-sm border border-ink/5 p-6 flex flex-col gap-5 font-ui">
      {/* Header: word + phonetic + audio */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="font-display text-3xl font-bold text-ink leading-tight capitalize">
            {word}
          </h2>
          {phonetic && (
            <span className="font-utility text-sm text-ember/80 tracking-wide">
              {phonetic}
            </span>
          )}
        </div>

        <AudioButton word={word} audioUrl={phoneticAudioUrl} />
      </div>

      {/* Meanings */}
      {meanings.map((meaning, idx) => (
        <div
          key={`${meaning.partOfSpeech}-${idx}`}
          className={cn(idx > 0 && 'pt-4 border-t border-ink/5')}
        >
          {/* Part-of-speech badge */}
          <span className="inline-block px-3 py-1 rounded-full bg-ember/10 text-ember text-xs font-bold tracking-wide mb-3">
            {meaning.partOfSpeech}
          </span>

          {/* Definitions */}
          <ol className="flex flex-col gap-4">
            {meaning.definitions.map((def, dIdx) => (
              <li key={dIdx} className="flex gap-3">
                <span className="text-xs font-bold text-faded-ink/60 mt-0.5 w-5 text-right flex-shrink-0">
                  {dIdx + 1}.
                </span>
                <div className="flex flex-col gap-2 min-w-0">
                  <p className="text-ink text-sm leading-relaxed">
                    {def.definition}
                  </p>
                  {def.example && (
                    <div className="pl-4 border-l-2 border-ember/25">
                      <p className="text-ink/70 text-sm leading-relaxed italic">
                        "{def.example}"
                      </p>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </div>
      ))}
    </div>
  );
}

import { useToast } from './ui/Toast';

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
        'p-3 rounded-full transition-colors flex-shrink-0',
        isPlaying
          ? 'text-ember/70 bg-ember/10 animate-pulse'
          : 'text-ember hover:bg-ember/5 hover:text-ember/80'
      )}
      aria-label="Play pronunciation"
      type="button"
    >
      <Volume2 size={22} strokeWidth={2.5} />
    </button>
  );
}
