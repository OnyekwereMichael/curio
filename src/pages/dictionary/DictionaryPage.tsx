import { AppShell } from '../../components/AppShell';
import { DictionarySearch } from '../../components/DictionarySearch';
import { DictionaryResult } from '../../components/DictionaryResult';
import { useDictionary } from '../../hooks/useDictionary';


const SUGGESTIONS = ['Pragmatic', 'Ambivalent', 'Resilient', 'Eloquent', 'Nuance'];

export function DictionaryPage() {
  const { data, loading, error, searched, search } = useDictionary();

  return (
    <AppShell title="Dictionary">
      <div className="mx-auto flex w-full  flex-col gap-8 px-4 py-6 sm:py-3">
        {/* Header */}
        <header className="flex flex-col gap-3">
          {/* <div className="inline-flex w-fit items-center gap-2 rounded-full border border-ember/20 bg-ember/5 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-ember">
            <BookOpen size={13} className="animate-book-open" aria-hidden="true" />
            Dictionary
          </div> */}

          <h1 className="font-display text-4xl font-bold leading-[1.4]  text-ink max-sm:text-3xl">
            Look up any word.
            <span className="block text-ember">Understand it fully.</span>
          </h1>

          <p className=" text-sm leading-relaxed text-faded-ink sm:text-base">
            Definitions, phonetics and real usage examples for any English word, all in one place.
          </p>
        </header>

        {/* Search card */}
        <section
          aria-label="Search the dictionary"
          className="rounded-2xl border border-ink/10 bg-paper p-4 shadow-sm sm:p-5"
        >
          <DictionarySearch onSearch={search} loading={loading} />

          {/* Quick suggestions, only before the first search */}
          {!searched && !loading && (
            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-ink/10 pt-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-faded-ink">
                Try
              </span>
              {SUGGESTIONS.map((word) => (
                <button
                  key={word}
                  type="button"
                  onClick={() => search(word)}
                  className="cursor-pointer rounded-full border border-ink/15 px-3 py-1.5 text-sm font-medium text-ink transition-colors hover:border-ember/40 hover:bg-ember/5 hover:text-ember focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember/40"
                >
                  {word}
                </button>
              ))}
            </div>
          )}
        </section>

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