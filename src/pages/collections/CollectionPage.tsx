import { useState, useEffect } from 'react';
import { useSavedFacts, useSavedWords } from '../../hooks/useSavedItems';
import { WordCard } from '../../components/WordCard';
import { FactCard } from '../../components/FactCard';
import { AppShell } from '../../components/AppShell';
import empty from '../../assets/empty.svg';

function EmptyState({ message }: { message: string }) {
    return (
        <div className="text-center py-10 text-faded-ink text-sm">
            <div className="mb-4 text-muted-foreground">
                <img src={empty} width={248} height={248} className="mx-auto" />
            </div>
            {message}
        </div>
    );
}

export function CollectionPage() {
    const savedWords = useSavedWords();
    const savedFacts = useSavedFacts();

    // Local copies we can mutate instantly on unsave, without waiting for a refetch
    const [words, setWords] = useState(savedWords.data);
    const [facts, setFacts] = useState(savedFacts.data);

    useEffect(() => setWords(savedWords.data), [savedWords.data]);
    useEffect(() => setFacts(savedFacts.data), [savedFacts.data]);

    function handleWordSavedChange(wordId: string, saved: boolean) {
        if (!saved) {
            setWords((prev) => prev.filter((w) => w.id !== wordId));
        }
    }

    function handleFactSavedChange(factId: string, saved: boolean) {
        if (!saved) {
            setFacts((prev) => prev.filter((f) => f.id !== factId));
        }
    }

    return (
        <AppShell title="Collections">
            <div className="px-6 py-5  mx-auto">
                <h1 className="font-display text-3xl font-bold text-ink mb-8">My Collection</h1>

                <section className="mb-10">
                    <h2 className="text-xs font-bold tracking-wider uppercase text-ember mb-4">
                        Saved Words
                    </h2>
                    {savedWords.loading ? (
                        <p className="text-faded-ink text-sm">Loading...</p>
                    ) : words.length === 0 ? (
                        <EmptyState message="You haven't saved any words yet — tap the bookmark on a word to keep it here." />
                    ) : (
                        <div className="flex flex-col gap-4">
                            {words.map((word) => (
                                <WordCard
                                    key={word.id}
                                    id={word.id}
                                    word={word.word}
                                    definition={word.definition}
                                    exampleSentence={word.example_sentence}
                                    audioUrl={word.pronunciation_audio_url}
                                    variant="new"
                                    onSavedChange={(saved) => handleWordSavedChange(word.id, saved)}
                                />
                            ))}
                        </div>
                    )}
                </section>

                <section>
                    <h2 className="text-xs font-bold tracking-wider uppercase text-moss mb-4">
                        Saved Facts
                    </h2>
                    {savedFacts.loading ? (
                        <p className="text-faded-ink text-sm">Loading...</p>
                    ) : facts.length === 0 ? (
                        <EmptyState message="You haven't saved any facts yet — tap the bookmark on a fact to keep it here." />
                    ) : (
                        <div className="flex flex-col gap-4">
                            {facts.map((fact) => (
                                <FactCard
                                    key={fact.id}
                                    id={fact.id}
                                    imageUrl={fact.image_url}
                                    hookLine={fact.hook_line}
                                    contextLine={fact.context_line}
                                    bullets={[fact.bullet_1, fact.bullet_2, fact.bullet_3, fact.bullet_4]}
                                    variant="new"
                                    onSavedChange={(saved) => handleFactSavedChange(fact.id, saved)}
                                />
                            ))}
                        </div>
                    )}
                </section>
            </div>
        </AppShell>
    );
}

