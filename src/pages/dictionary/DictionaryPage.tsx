import { useState } from 'react';
import { AppShell } from '../../components/AppShell';
import { DictionarySearch } from '../../components/DictionarySearch';
import { DictionaryResult } from '../../components/DictionaryResult';
import { useDictionary } from '../../hooks/useDictionary';
import { Otter } from '../../components/Otter';
import { addRecentSearch, getRecentSearches } from '../../services/localPrefs';
import { PREVIEW_FEATURES } from '../../lib/featureFlags';

const SUGGESTIONS = ['Pragmatic', 'Ambivalent', 'Resilient', 'Eloquent', 'Nuance'];
const NEWS_WORDS = ['Austerity', 'Resilience']; // editorial content — no real source yet

export function DictionaryPage() {
  const { data, loading, error, searched, search } = useDictionary();
  const [recent, setRecent] = useState(getRecentSearches());

  function handleSearch(term: string) {
    addRecentSearch(term);
    setRecent(getRecentSearches());
    search(term);
  }

  return (
    <AppShell title="Dictionary">
      <div className="mx-auto flex w-full flex-col gap-8 px-4 py-6 sm:py-3">
        {/* Header */}
        <header className="flex flex-col gap-3">
          <h1 className="font-display text-4xl font-bold leading-[1.4] text-ink-900 max-sm:text-3xl">
            Look up any word.
            <span className="block text-ember-600">Understand it fully.</span>
          </h1>

          <p className="text-sm leading-relaxed text-ink-500 sm:text-base font-ui">
            Definitions, phonetics and real usage examples for any English word, all in one place.
          </p>
        </header>

        {/* Search card */}
        <section
          aria-label="Search the dictionary"
          className="rounded-card border border-line bg-surface p-4 shadow-card sm:p-5"
        >
          <DictionarySearch onSearch={handleSearch} loading={loading} />

          {!searched && !loading && (
            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-ink-500 font-ui">
                Try
              </span>
              {SUGGESTIONS.map((word) => (
                <button
                  key={word}
                  type="button"
                  onClick={() => handleSearch(word)}
                  className="cursor-pointer rounded-full border border-line-strong px-3 py-1.5 text-sm font-medium text-ink-900 transition-colors hover:border-ember-500/40 hover:bg-ember-50 hover:text-ember-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember-500/40 font-ui"
                >
                  {word}
                </button>
              ))}
            </div>
          )}

          {!searched && !loading && recent.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-ink-500 font-ui">
                Recent
              </span>
              {recent.map((word) => (
                <button
                  key={word}
                  type="button"
                  onClick={() => handleSearch(word)}
                  className="cursor-pointer rounded-full bg-ink-900/5 px-3 py-1.5 text-sm font-medium text-ink-900 transition-colors hover:bg-ink-900/10 font-ui"
                >
                  {word}
                </button>
              ))}
            </div>
          )}
        </section>

        {!searched && !loading && (
          <div className="flex flex-col items-center text-center py-4">
            <Otter mood="curious" size={72} breathe className="mb-3" />
            <p className="text-ink-500 text-sm font-ui">Ooh. What are we looking up?</p>
          </div>
        )}

        {PREVIEW_FEATURES && !searched && !loading && (
          <section className="rounded-card border border-line bg-surface shadow-card divide-y divide-line">
            <p className="px-4 pt-3 pb-1 text-xs font-semibold uppercase tracking-wider text-ink-500 font-ui">
              Words in the news this week
            </p>
            {NEWS_WORDS.map((word) => (
              <button
                key={word}
                onClick={() => handleSearch(word)}
                className="w-full text-left px-4 py-3 font-display text-base font-bold text-ink-900 hover:bg-ink-900/5 transition-colors"
              >
                {word}
              </button>
            ))}
          </section>
        )}

        {/* Result / Skeleton / Error / Empty */}
        <section aria-live="polite" aria-busy={loading}>
          <DictionaryResult
            data={data}
            loading={loading}
            error={error}
            searched={searched}
          />
        </section>
      </div>
    </AppShell>
  );
}
