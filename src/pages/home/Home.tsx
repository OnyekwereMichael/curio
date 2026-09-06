import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { WordCard } from '../../components/WordCard';
import { FactCard } from '../../components/FactCard';
import { useTodaysWord, useOldButGold, useTodaysFact } from './hooks';
import { InstallBanner } from '../../components/InstallBanner';
import { useAuth } from '../../contexts/AuthContext';


import { EmailVerificationBanner } from '../../components/EmailVerificationBanner';
import { supabase } from '../../lib/superbase';


function SkeletonCard() {
  return (
    <div className="bg-paper rounded-xl shadow-sm border border-ink/5 p-6 animate-pulse h-48 w-full flex flex-col justify-center">
      <div className="h-4 bg-ink/10 rounded w-1/4 mb-4"></div>
      <div className="h-8 bg-ink/10 rounded w-1/2 mb-4"></div>
      <div className="h-4 bg-ink/10 rounded w-full mb-2"></div>
      <div className="h-4 bg-ink/10 rounded w-3/4"></div>
    </div>
  );
}

function FallbackCard({ message }: { message: string }) {
  return (
    <div className="bg-paper rounded-xl shadow-sm border border-ink/5 p-6 text-center text-faded-ink py-12">
      <p>{message}</p>
    </div>
  );
}

export function HomeScreen() {
  const navigate = useNavigate();
  const todaysWord = useTodaysWord();
  const oldButGold = useOldButGold();
  const todaysFact = useTodaysFact();
  const { user } = useAuth();

  useEffect(() => {
    // If we are in the PWA, and notifications haven't been asked yet, redirect to ask
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    const hasPrompted = localStorage.getItem('notification_prompted');

    if (isStandalone && !hasPrompted && 'Notification' in window && Notification.permission === 'default') {
      supabase.from('users').update({ installed: true }).eq('id', user?.id).then(() => {
        navigate('/notification-permission', { replace: true });
      });
    } else if (isStandalone) {
      // Ensure installed flag is true if they open PWA and don't need notification prompt
      supabase.from('users').update({ installed: true }).eq('id', user?.id);
    }
  }, [navigate, user]);




  return (
    <div className="min-h-screen bg-paper font-ui text-ink flex flex-col">
      <EmailVerificationBanner />
      <InstallBanner />

      {/* Top Bar */}


      {/* Main Content */}
      <main className="grid grid-cols-2 gap-6 max-sm:gap-4 p-6 max-sm:grid-cols-1">

        {/* Today's Word */}
        <section className="flex flex-col gap-4">
          <div>
            <h2 className="font-display text-2xl font-bold text-ink mb-2">Today's Word</h2>
            <p className="text-faded-ink text-sm">
              Vocabulary enrichment to elevate your conversations.
            </p>
          </div>
          {todaysWord.loading ? (
            <SkeletonCard />
          ) : !todaysWord.data ? (
            <FallbackCard message="Today's word is on its way — check back soon." />
          ) : (
            <WordCard
              id={todaysWord.data.id}
              word={todaysWord.data.word}
              definition={todaysWord.data.definition}
              exampleSentence={todaysWord.data.example_sentence}
              audioUrl={todaysWord.data.pronunciation_audio_url}
              variant="new"
              label="Today's word"
            />
          )}
        </section>

        {/* Today's Fact */}
        <section className="flex flex-col gap-4">
          <div>
            <h2 className="font-display text-2xl font-bold text-ink mb-2">Today's Fact</h2>
            <p className="text-faded-ink text-sm">
              Fascinating facts to expand your knowledge.
            </p>
          </div>
          {todaysFact.loading ? (
            <SkeletonCard />
          ) : !todaysFact.data ? (
            <FallbackCard message="Today's fact is on its way — check back soon." />
          ) : (
            <FactCard
              imageUrl={todaysFact.data.image_url}
              hookLine={todaysFact.data.hook_line}
              contextLine={todaysFact.data.context_line}
              bullets={[
                todaysFact.data.bullet_1,
                todaysFact.data.bullet_2,
                todaysFact.data.bullet_3,
                todaysFact.data.bullet_4
              ]}
              variant="new"
            />
          )}
        </section>

      </main>

      {/* Old but Gold */}
      {!oldButGold.loading && oldButGold.data && (
        <section className="flex flex-col gap-4 px-6 pb-8 max-sm:px-6">
          <div>
            <h2 className="font-display text-2xl font-bold text-ink mb-2">Review & Retain</h2>
            <p className="text-faded-ink text-sm">
              You have seen this word before. Buh Going through it again helps to reinforce your memory.
            </p>
          </div>
          <WordCard
            id={oldButGold.data.id}
            word={oldButGold.data.word}
            definition={oldButGold.data.definition}
            exampleSentence={oldButGold.data.example_sentence}
            audioUrl={oldButGold.data.pronunciation_audio_url}
            variant="old"
            label="Old but Gold"
          />
        </section>
      )}


    </div>
  );
}