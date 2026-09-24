import { useState, useCallback } from 'react';

export interface DictionaryDefinition {
  definition: string;
  example?: string;
}

export interface DictionaryMeaning {
  partOfSpeech: string;
  definitions: DictionaryDefinition[];
}

export interface DictionaryEntry {
  word: string;
  phonetic: string;
  phoneticAudioUrl?: string;
  meanings: DictionaryMeaning[];
}

export interface DictionaryState {
  data: DictionaryEntry | null;
  loading: boolean;
  error: string | null;
  /** True only when a search has been attempted at least once */
  searched: boolean;
}

const API_BASE = 'https://api.dictionaryapi.dev/api/v2/entries/en';

const searchCache = new Map<string, { data: DictionaryEntry | null; error: string | null }>();

export function useDictionary() {
  const [state, setState] = useState<DictionaryState>({
    data: null,
    loading: false,
    error: null,
    searched: false,
  });

  const search = useCallback(async (term: string) => {
    const trimmed = term.trim().toLowerCase();
    if (!trimmed) return;

    if (searchCache.has(trimmed)) {
      const cached = searchCache.get(trimmed)!;
      setState({
        data: cached.data,
        loading: false,
        error: cached.error,
        searched: true,
      });
      return;
    }

    setState({ data: null, loading: true, error: null, searched: true });

    try {
      const res = await fetch(`${API_BASE}/${encodeURIComponent(trimmed)}`);

      if (res.status === 404) {
        const errorMsg = `No definition found for "${trimmed}". Check the spelling and try again.`;
        searchCache.set(trimmed, { data: null, error: errorMsg });
        setState({
          data: null,
          loading: false,
          error: errorMsg,
          searched: true,
        });
        return;
      }

      if (!res.ok) {
        throw new Error(`Request failed (${res.status})`);
      }

      const json = await res.json();
      const first = json[0];

      // Extract the best phonetic string — prefer one with text, fallback through array
      const phoneticText =
        first.phonetic ||
        first.phonetics?.find((p: any) => p.text)?.text ||
        '';

      // Extract the first available audio URL
      const phoneticAudioUrl =
        first.phonetics?.find((p: any) => p.audio && p.audio.length > 0)
          ?.audio || undefined;

      // Map meanings, limiting to top 2 definitions per part of speech
      const meanings: DictionaryMeaning[] = (first.meanings || []).map(
        (m: any) => ({
          partOfSpeech: m.partOfSpeech,
          definitions: (m.definitions || [])
            .slice(0, 2)
            .map((d: any) => ({
              definition: d.definition,
              example: d.example || undefined,
            })),
        })
      );

      const responseData = {
        word: first.word,
        phonetic: phoneticText,
        phoneticAudioUrl,
        meanings,
      };

      searchCache.set(trimmed, { data: responseData, error: null });

      setState({
        data: responseData,
        loading: false,
        error: null,
        searched: true,
      });
    } catch (err) {
      const isNetworkError = err instanceof TypeError && err.message.includes('Failed to fetch');
      const errorMsg = isNetworkError 
        ? 'The Dictionary API is currently overloaded or unavailable. Please try again later.'
        : err instanceof Error ? err.message : 'Something went wrong. Please try again.';

      // Only cache errors if they are not network errors (since we might want to retry network errors)
      if (!isNetworkError) {
        searchCache.set(trimmed, { data: null, error: errorMsg });
      }

      setState({
        data: null,
        loading: false,
        error: errorMsg,
        searched: true,
      });
    }
  }, []);

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null, searched: false });
  }, []);

  return { ...state, search, reset };
}
