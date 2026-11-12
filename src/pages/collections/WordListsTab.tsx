import { useState } from 'react';
import { ChevronDown, Plus, Trash2, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import {
  createWordList,
  deleteWordList,
  getListWords,
  addWordToList,
  removeWordFromList,
  type WordListFixture,
} from '../../services/collectionLists';
import type { Word } from '../home/hooks';

interface Props {
  lists: WordListFixture[];
  setLists: React.Dispatch<React.SetStateAction<WordListFixture[]>>;
  savedWords: Word[];
}

export function WordListsTab({ lists, setLists, savedWords }: Props) {
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [contents, setContents] = useState<Record<string, Word[]>>({});

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const list = await createWordList(name);
      setLists((prev) => [list, ...prev]);
      setName('');
      await toggle(list.id, true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the list.');
    } finally {
      setCreating(false);
    }
  }

  async function toggle(id: string, forceOpen = false) {
    if (openId === id && !forceOpen) {
      setOpenId(null);
      return;
    }
    setOpenId(id);
    if (!contents[id]) {
      try {
        const words = await getListWords(id);
        setContents((prev) => ({ ...prev, [id]: words }));
      } catch (err) {
        console.error('load list failed', err);
        setContents((prev) => ({ ...prev, [id]: [] }));
      }
    }
  }

  function bumpCount(id: string, delta: number) {
    setLists((prev) => prev.map((l) => (l.id === id ? { ...l, count: Math.max(0, l.count + delta) } : l)));
  }

  async function handleAdd(listId: string, word: Word) {
    try {
      await addWordToList(listId, word.id);
      setContents((prev) => ({ ...prev, [listId]: [word, ...(prev[listId] ?? [])] }));
      bumpCount(listId, 1);
    } catch (err) {
      console.error('add to list failed', err);
      setError('Could not add that word.');
    }
  }

  async function handleRemove(listId: string, wordId: string) {
    try {
      await removeWordFromList(listId, wordId);
      setContents((prev) => ({ ...prev, [listId]: (prev[listId] ?? []).filter((w) => w.id !== wordId) }));
      bumpCount(listId, -1);
    } catch (err) {
      console.error('remove from list failed', err);
      setError('Could not remove that word.');
    }
  }

  async function handleDelete(listId: string) {
    if (!window.confirm('Delete this list? The words stay in your pouch.')) return;
    try {
      await deleteWordList(listId);
      setLists((prev) => prev.filter((l) => l.id !== listId));
      if (openId === listId) setOpenId(null);
    } catch (err) {
      console.error('delete list failed', err);
      setError('Could not delete that list.');
    }
  }

  return (
    <div className="flex flex-col gap-4 font-ui">
      <form onSubmit={handleCreate} className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={60}
          placeholder="New list name, e.g. For work emails"
          className="flex-1 min-w-0 bg-surface border border-line-strong rounded-control px-4 py-2.5 text-sm text-ink-900 placeholder:text-ink-500/60 focus:outline-none focus:ring-2 focus:ring-ink-900/20"
        />
        <button
          type="submit"
          disabled={creating || !name.trim()}
          className="flex items-center gap-1 px-4 rounded-control bg-ink-900 text-paper text-sm font-semibold disabled:opacity-40"
        >
          <Plus size={16} /> Create
        </button>
      </form>

      {error && <p className="text-xs text-ember-600">{error}</p>}

      {lists.length === 0 ? (
        <p className="text-center py-8 text-ink-500 text-sm">
          No lists yet. Make one above to group your saved words.
        </p>
      ) : (
        <div className="bg-surface rounded-card border border-line shadow-card divide-y divide-line">
          {lists.map((list) => {
            const open = openId === list.id;
            const words = contents[list.id];
            const inList = new Set((words ?? []).map((w) => w.id));
            const addable = savedWords.filter((w) => !inList.has(w.id));
            return (
              <div key={list.id}>
                <div className="flex items-center gap-2 px-4 py-3.5">
                  <button onClick={() => toggle(list.id)} className="flex-1 flex items-center justify-between text-left min-w-0">
                    <p className="text-sm font-semibold text-ink-900 truncate">{list.name}</p>
                    <span className="flex items-center gap-1 text-xs text-ink-500 flex-shrink-0 ml-2">
                      {list.count} word{list.count !== 1 ? 's' : ''}
                      <ChevronDown size={14} className={cn('transition-transform', open && 'rotate-180')} />
                    </span>
                  </button>
                  <button onClick={() => handleDelete(list.id)} aria-label={`Delete ${list.name}`} className="text-ink-500 hover:text-ember-600 p-1">
                    <Trash2 size={15} />
                  </button>
                </div>

                {open && (
                  <div className="px-4 pb-4 flex flex-col gap-3">
                    {!words ? (
                      <p className="text-xs text-ink-500">Loading…</p>
                    ) : (
                      <>
                        {words.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {words.map((w) => (
                              <span key={w.id} className="flex items-center gap-1 pl-3 pr-1.5 py-1 rounded-full bg-ink-900 text-paper text-xs font-semibold">
                                {w.word}
                                <button onClick={() => handleRemove(list.id, w.id)} aria-label={`Remove ${w.word}`} className="p-0.5 opacity-70 hover:opacity-100">
                                  <X size={12} />
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                        <div>
                          <p className="text-xs text-ink-500 mb-2">
                            {savedWords.length === 0
                              ? 'Save some words first, then add them here.'
                              : addable.length === 0
                                ? 'All your saved words are in this list.'
                                : 'Add from your saved words:'}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {addable.map((w) => (
                              <button
                                key={w.id}
                                onClick={() => handleAdd(list.id, w)}
                                className="px-3 py-1 rounded-full bg-ink-900/5 text-ink-900 text-xs font-semibold hover:bg-ink-900/10"
                              >
                                + {w.word}
                              </button>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
