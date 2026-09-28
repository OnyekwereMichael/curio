import { AppShell } from '../../components/AppShell';
import { DictionarySearch } from '../../components/DictionarySearch';
import { DictionaryResult } from '../../components/DictionaryResult';
import { useDictionary } from '../../hooks/useDictionary';
import { BookOpen } from 'lucide-react';

export function DictionaryPage() {
  const { data, loading, error, searched, search } = useDictionary();

  return (
    <AppShell title="Dictionary">
      <div className="px-4 py-4 mx-auto w-full flex flex-col gap-6">
        {/* Section header */}
        <div>
          <h1 className="font-display text-3xl max-sm:text-2xl font-bold text-ink leading-tight flex items-center gap-2">
            Dictionary
            <BookOpen
              size={22}
              className="text-ember animate-book-open"
              aria-hidden="true"
            />
          </h1>
          <p className="text-faded-ink text-sm mt-1">
            Look up definitions, phonetics, and usage examples for any English
            word.
          </p>
        </div>

        {/* Search */}
        <DictionarySearch onSearch={search} loading={loading} />

        {/* Result / Skeleton / Error / Empty */}
        <DictionaryResult
          data={data}
          loading={loading}
          error={error}
          searched={searched}
        />
      </div>
    </AppShell>
  );
}
