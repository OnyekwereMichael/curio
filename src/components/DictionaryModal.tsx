import { useEffect, useRef } from 'react';
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
  const modalRef = useRef<HTMLDivElement>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        document.getElementById('dictionary-search-input')?.focus();
      }, 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-20 px-4 sm:px-6 sm:pt-24 bg-ink/30 backdrop-blur-sm">
      <div 
        ref={modalRef}
        className="w-full max-w-lg bg-paper rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[85vh] border border-ink/10 animate-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-ink/8">
          <h2 className="font-display font-bold text-lg text-ink">Dictionary</h2>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-faded-ink hover:text-ink hover:bg-ink/5 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-col overflow-y-auto p-6 gap-6">
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
