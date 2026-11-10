import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Bookmark, ChevronRight } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { AppShell } from '../../components/AppShell';
import { cn } from '../../lib/utils';
import { fetchSavedWordsWithStatus, fetchSavedFactsWithStatus, type SavedWordRow, type SavedFactRow } from '../../services/collection';
import { getWordLists } from '../../services/collectionLists';
import { type WordListFixture } from '../../mocks/collectionLists';
import { PREVIEW_FEATURES } from '../../lib/featureFlags';
import empty from '../../assets/empty.svg';

function EmptyState({ message }: { message: string }) {
    return (
        <div className="text-center py-10 text-ink-500 text-sm font-ui">
            <img src={empty} width={160} height={160} className="mx-auto mb-4" alt="" />
            {message}
        </div>
    );
}

type WordFilter = 'all' | 'new' | 'mastered';
type Tab = 'words' | 'facts' | 'lists';

export function CollectionPage() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [tab, setTab] = useState<Tab>('words');
    const [wordFilter, setWordFilter] = useState<WordFilter>('all');
    const [words, setWords] = useState<SavedWordRow[]>([]);
    const [facts, setFacts] = useState<SavedFactRow[]>([]);
    const [lists, setLists] = useState<WordListFixture[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) return;
        Promise.all([fetchSavedWordsWithStatus(user.id), fetchSavedFactsWithStatus(user.id)]).then(([w, f]) => {
            setWords(w);
            setFacts(f);
            setLoading(false);
        });
    }, [user]);

    useEffect(() => {
        if (PREVIEW_FEATURES) getWordLists().then(setLists);
    }, []);

    const filteredWords = words.filter((w) => {
        if (wordFilter === 'new') return !w.markedKnown;
        if (wordFilter === 'mastered') return w.markedKnown;
        return true;
    });

    return (
        <AppShell title="Your pouch">
            <div className="px-4 py-4 w-full flex flex-col gap-5">
                <div className="flex items-center justify-between">
                    <h1 className="font-display text-display font-bold text-ink-900">Your pouch</h1>
                    <Search size={20} className="text-ink-500" />
                </div>

                {PREVIEW_FEATURES && words.length > 0 && (
                    <button
                        onClick={() => navigate('/collection/review')}
                        className="flex items-center justify-between gap-3 rounded-card bg-gold-50 border border-gold-500/30 px-4 py-3.5 text-left font-ui hover:bg-gold-50/70 transition-colors"
                    >
                        <div>
                            <p className="text-sm font-semibold text-gold-700">
                                {Math.min(words.length, 8)} word{Math.min(words.length, 8) !== 1 ? 's' : ''} ready to review
                            </p>
                            <p className="text-xs text-ink-500 mt-0.5">About 2 minutes</p>
                        </div>
                        <ChevronRight size={18} className="text-gold-700 flex-shrink-0" />
                    </button>
                )}

                {/* Tabs */}
                <div className="flex gap-2 font-ui">
                    {([
                        { key: 'words' as const, label: `Words ${words.length}` },
                        { key: 'facts' as const, label: `Facts ${facts.length}` },
                        ...(PREVIEW_FEATURES ? [{ key: 'lists' as const, label: `Lists ${lists.length}` }] : []),
                    ]).map((t) => (
                        <button
                            key={t.key}
                            onClick={() => setTab(t.key)}
                            className={cn(
                                'px-4 py-2 rounded-control text-sm font-semibold transition-colors',
                                tab === t.key ? 'bg-ink-900 text-paper' : 'bg-surface border border-line text-ink-900 hover:bg-ink-900/5'
                            )}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>

                {tab === 'words' && (
                    <div className="flex gap-2 font-ui">
                        {([
                            { key: 'all' as const, label: 'All' },
                            { key: 'new' as const, label: `New ${words.filter((w) => !w.markedKnown).length}` },
                            { key: 'mastered' as const, label: `Mastered ${words.filter((w) => w.markedKnown).length}` },
                        ]).map((f) => (
                            <button
                                key={f.key}
                                onClick={() => setWordFilter(f.key)}
                                className={cn(
                                    'px-3 py-1.5 rounded-full text-xs font-semibold transition-colors',
                                    wordFilter === f.key ? 'bg-ink-900 text-paper' : 'bg-ink-900/5 text-ink-900 hover:bg-ink-900/10'
                                )}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>
                )}

                {loading ? (
                    <p className="text-ink-500 text-sm font-ui">Loading…</p>
                ) : tab === 'words' ? (
                    filteredWords.length === 0 ? (
                        <EmptyState message="You haven't saved any words yet — tap the bookmark on a word to keep it here." />
                    ) : (
                        <div className="bg-surface rounded-card border border-line shadow-card divide-y divide-line">
                            {filteredWords.map(({ word, markedKnown }) => (
                                <div key={word.id} className="flex items-center gap-3 px-4 py-3.5 font-ui">
                                    <div className="flex-1 min-w-0">
                                        <p className="font-display text-base font-bold text-ink-900 truncate">{word.word}</p>
                                        <p className="text-xs text-ink-500 truncate">{word.definition}</p>
                                    </div>
                                    <span
                                        className={cn(
                                            'text-xs font-semibold px-2 py-1 rounded-tag flex-shrink-0',
                                            markedKnown ? 'bg-moss-50 text-moss-600' : 'bg-ink-900/5 text-ink-500'
                                        )}
                                    >
                                        {markedKnown ? 'Mastered' : 'New'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )
                ) : tab === 'facts' ? (
                    facts.length === 0 ? (
                        <EmptyState message="You haven't saved any facts yet — tap the bookmark on a fact to keep it here." />
                    ) : (
                        <div className="bg-surface rounded-card border border-line shadow-card divide-y divide-line">
                            {facts.map(({ fact }) => (
                                <div key={fact.id} className="flex items-start gap-3 px-4 py-3.5 font-ui">
                                    <Bookmark size={16} className="text-ember-600 flex-shrink-0 mt-0.5" fill="currentColor" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-ink-900">{fact.hook_line}</p>
                                        <p className="text-xs text-ink-500 mt-0.5 line-clamp-2">{fact.context_line}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )
                ) : (
                    <div className="bg-surface rounded-card border border-line shadow-card divide-y divide-line">
                        {lists.map((list) => (
                            <div key={list.id} className="flex items-center justify-between px-4 py-3.5 font-ui">
                                <p className="text-sm font-semibold text-ink-900">{list.name}</p>
                                <span className="text-xs text-ink-500">{list.count} words</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </AppShell>
    );
}
