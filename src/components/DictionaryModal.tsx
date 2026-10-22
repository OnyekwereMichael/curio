import { useEffect } from 'react';
import { X } from 'lucide-react';
import { DictionarySearch } from './DictionarySearch';
import { DictionaryResult } from './DictionaryResult';
import { useDictionary } from '../hooks/useDictionary';

interface DictionaryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DictionaryModal({ isOpen, onClose }: DictionaryModalProps) {
  const { data, loading, error, searched, search } = useDictionary();

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  // Focus the search input when opened
  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(
      () => document.getElementById('dictionary-search-input')?.focus(),
      50
    );
    return () => clearTimeout(timer);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center bg-ink/30 px-4 pt-20 backdrop-blur-sm sm:pt-24"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Dictionary"
        className="flex max-h-[80vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-ink/10 bg-paper shadow-xl animate-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4">
          <h2 className="font-display text-lg font-bold text-ink">Curi's Dictionary</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="cursor-pointer rounded-lg p-1.5 text-faded-ink transition-colors hover:bg-ink/5 hover:text-ink"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-col gap-4 overflow-y-auto px-5 pb-5">
          <DictionarySearch onSearch={search} loading={loading} />
          <DictionaryResult
            data={data}
            loading={loading}
            error={error}
            searched={searched}
          />
        </div>
      </div>
    </div>
  );
}