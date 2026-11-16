import { useState, useEffect, useCallback, useRef } from 'react';

import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/superbase';

/** Known-state and pronunciation for a word card. Saving to Review lives in hooks/useSaveWord. */
export function useWordCardInteractions(wordId: string, audioUrl?: string, word?: string) {
  const { user } = useAuth();
  const [isKnown, setIsKnown] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Load this word's existing known state whenever the word changes.
  useEffect(() => {
    setIsPlaying(false);

    if (!user || !wordId) {
      setIsKnown(false);
      return;
    }

    let cancelled = false;

    async function loadInitialState() {
      const { data, error } = await supabase
        .from('user_word_progress')
        .select('marked_known')
        .eq('user_id', user?.id)
        .eq('word_id', wordId)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        console.error('Failed to load word progress state:', error.message);
        return;
      }

      setIsKnown(data?.marked_known ?? false);
    }

    loadInitialState();

    return () => {
      cancelled = true;
    };
  }, [wordId, user]);

  // "Known" is earned through a server-graded check (LearnCheckModal); the client can no longer set it.
  const markKnownLocal = useCallback(() => setIsKnown(true), []);

  const playBrowserAudio = useCallback((text: string) => {
    if (!('speechSynthesis' in window)) {
      console.warn('Text-to-speech is not supported in this browser.');
      setIsPlaying(false);
      return;
    }

    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);

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
    } catch (err) {
      console.error('Speech synthesis failed:', err);
      setIsPlaying(false);
    }
  }, []);

  const play = useCallback(() => {
    if (isPlaying) return;

    if (audioUrl) {
      setIsPlaying(true);

      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }

      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onended = () => setIsPlaying(false);
      audio.onerror = () => {
        console.error('Failed to play pronunciation audio for word:', wordId);
        if (word) {
          playBrowserAudio(word);
        } else {
          setIsPlaying(false);
        }
      };

      audio.play().catch((err) => {
        console.error('Audio playback failed:', err);
        if (word) {
          playBrowserAudio(word);
        } else {
          setIsPlaying(false);
        }
      });
      return;
    }

    if (word) {
      playBrowserAudio(word);
    }
  }, [audioUrl, isPlaying, playBrowserAudio, word, wordId]);

  // Stop playback if the component unmounts mid-play (e.g. navigating away)
  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  return { isKnown, isPlaying, markKnownLocal, play };
}