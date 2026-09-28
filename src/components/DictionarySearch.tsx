import { useState, useEffect, type FormEvent } from 'react';
import { Search } from 'lucide-react';
import { cn } from '../lib/utils';

interface DictionarySearchProps {
  onSearch: (term: string) => void;
  loading?: boolean;
}

export function DictionarySearch({ onSearch, loading }: DictionarySearchProps) {
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        document.getElementById('dictionary-search-input')?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = query.trim().toLowerCase();
    if (trimmed) onSearch(trimmed);
  }

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div
        className={cn(
          'flex items-center gap-2 rounded-xl border bg-paper px-4 py-3 transition-all duration-200',
          'border-ink/10 focus-within:border-ember/40 focus-within:ring-2 focus-within:ring-ember/10'
        )}
      >
        <Search size={18} className="text-faded-ink flex-shrink-0" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search any word…"
          className="flex-1 bg-transparent text-ink placeholder:text-faded-ink/60 text-sm font-ui outline-none"
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          id="dictionary-search-input"
        />
        <div className="hidden sm:flex items-center gap-0.5 px-1.5 py-0.5 pointer-events-none text-faded-ink/40 text-[10px] font-bold border border-ink/10 rounded tracking-widest bg-ink/5">
          <span className="font-sans">⌘</span>
          <span>K</span>
        </div>
        <button
          type="submit"
          disabled={!query.trim() || loading}
          className={cn(
            'px-4 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 flex-shrink-0',
            query.trim() && !loading
              ? 'bg-ember text-white hover:bg-ember/90 active:scale-95'
              : 'bg-ink/8 text-faded-ink/50 cursor-not-allowed'
          )}
          id="dictionary-search-submit"
        >
          {loading ? 'Searching…' : 'Look up'}
        </button>
      </div>
    </form>
  );
}
