import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Navbar } from '../components/Navbar';
import { Hero } from '../components/Hero';
import { FeaturesSection } from '../components/FeaturesSection';
import { HowItWorks } from '../components/HowItWorks';
import { VideoShowcase } from '../components/VideoShowcase';
import { PrizesSpotlight } from '../components/PrizesSpotlight';
import { FounderNote } from '../components/FounderNote';
import { CTA } from '../components/CTA';
import { Footer } from '../components/Footer';
import vid from '../../public/VIDEO-2026-11-13-01-51-25.mp4'

export function LandingPage() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && session) {
      navigate('/home', { replace: true });
    }
  }, [session, loading, navigate]);

  return (
    <div className="min-h-screen bg-paper flex flex-col font-ui text-ink-900 selection:bg-ember-500/20 selection:text-ink-900">
      <Navbar />

      <main className="flex-grow">
        <Hero />
        <VideoShowcase src={vid} title="Curi product demo" />
        <FeaturesSection />
        <HowItWorks />
        <PrizesSpotlight />
        <FounderNote />
        <CTA />
      </main>

      <Footer />
    </div>
  );
}
