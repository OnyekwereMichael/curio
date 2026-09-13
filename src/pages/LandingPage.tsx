import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Navbar } from '../components/Navbar';
import { Hero } from '../components/Hero';
import { HowItWorks } from '../components/HowItWorks';
import { ProductPreview } from '../components/ProductPreview';
import { WhyItWorks } from '../components/WhyItWorks';
import { FounderNote } from '../components/FounderNote';
import { CTA } from '../components/CTA';
import { Footer } from '../components/Footer';
import vid from '../../public/WhatsApp Video 2026-09-14 at 00.28.52.mp4'

export function LandingPage() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && session) {
      navigate('/home', { replace: true });
    }
  }, [session, loading, navigate]);

  return (
    <div className="min-h-screen bg-paper flex flex-col font-ui text-ink selection:bg-ember/20 selection:text-ink">
      <Navbar />

      <main className="flex-grow">
        <Hero />
        <HowItWorks />
        <ProductPreview />
        <div className="flex justify-center">
          <video
            src={vid}
            autoPlay
            loop
            muted
            playsInline
            className="w-full max-w-3xl max-sm:w-[87%] max-sm:mx-10 mb-16 rounded-2xl border-3 border-ember/20 object-cover"
          />
        </div>
        <WhyItWorks />
        <FounderNote />
        <CTA />
      </main>

      <Footer />
    </div>
  );
}
