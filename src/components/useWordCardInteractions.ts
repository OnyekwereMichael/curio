import { useState, useEffect, useCallback, useRef } from 'react';

import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/superbase';

export function useWordCardInteractions(wordId: string, audioUrl?: string) {
  const { user } = useAuth();
  const [isSaved, setIsSaved] = useState(false);
  const [saveFlash, setSaveFlash] = useState(false);
  const [isKnown, setIsKnown] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Load this word's existing saved/known state whenever the word changes —
  // e.g. if the user saved this word yesterday and it's back today as
  // "Old but Gold," the card should reflect that immediately, not reset.
  useEffect(() => {
    setSaveFlash(false);
    setIsPlaying(false);

    if (!user || !wordId) {
      setIsSaved(false);
      setIsKnown(false);
      return;
    }

    let cancelled = false;

    async function loadInitialState() {
      const { data, error } = await supabase
        .from('user_word_progress')
        .select('saved, marked_known')
        .eq('user_id', user.id)
        .eq('word_id', wordId)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        console.error('Failed to load word progress state:', error.message);
        return;
      }

      setIsSaved(data?.saved ?? false);
      setIsKnown(data?.marked_known ?? false);
    }

    loadInitialState();

    return () => {
      cancelled = true;
    };
  }, [wordId, user]);

  const toggleSave = useCallback(async () => {
    if (!user || !wordId) return;

    setIsSaved((prev) => {
      const next = !prev;
      if (next) {
        setSaveFlash(true);
        setTimeout(() => setSaveFlash(false), 300);
      }
      return next;
    });

    const newSavedState = !isSaved;

    const { error } = await supabase
      .from('user_word_progress')
      .update({ saved: newSavedState })
      .eq('user_id', user.id)
      .eq('word_id', wordId);

    if (error) {
      console.error('Failed to update saved state:', error.message);
      // Revert the optimistic update since the write failed
      setIsSaved((prev) => !prev);
    }
  }, [wordId, user, isSaved]);

  const markKnown = useCallback(async () => {
    if (!user || !wordId) return;

    setIsKnown(true);

    const { error } = await supabase
      .from('user_word_progress')
      .update({ marked_known: true })
      .eq('user_id', user.id)
      .eq('word_id', wordId);

    if (error) {
      console.error('Failed to mark word as known:', error.message);
      setIsKnown(false);
    }
  }, [wordId, user]);

  const play = useCallback(() => {
    if (!audioUrl || isPlaying) return;

    setIsPlaying(true);

    const audio = new Audio(audioUrl);
    audioRef.current = audio;

    audio.onended = () => setIsPlaying(false);
    audio.onerror = () => {
      console.error('Failed to play pronunciation audio for word:', wordId);
      setIsPlaying(false);
    };

    audio.play().catch((err) => {
      console.error('Audio playback failed:', err);
      setIsPlaying(false);
    });
  }, [audioUrl, isPlaying, wordId]);

  // Stop playback if the component unmounts mid-play (e.g. navigating away)
  useEffect(() => {
    return () => {
      audioRef.current?.pause();
    };
  }, []);

  return { isSaved, saveFlash, isKnown, isPlaying, toggleSave, markKnown, play };
}