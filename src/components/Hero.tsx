import { motion } from 'framer-motion';
import { PlayCircle } from 'lucide-react';
import { WordCard } from './WordCard';
import { FactCard } from './FactCard';
import { Button } from './ui/Button';
import { useGetStarted } from '../hooks/useGetStarted';
import { SITE } from '../lib/siteConfig';

export function Hero() {
  const getStarted = useGetStarted();
  return (
    <section className="pt-32 pb-20 px-6 overflow-hidden">
      <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
        {/* Text Content */}
        <div className="flex flex-col items-start z-10">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="mb-4">
            <span className="text-sm font-semibold text-ember-600 tracking-wider uppercase font-ui">{SITE.tagline}</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="font-display text-5xl sm:text-6xl text-ink-900 font-bold leading-[1.1] mb-6"
          >
            Learn something worth knowing, every single day.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-lg text-ink-500 mb-8 max-w-lg leading-relaxed font-ui"
          >
            Two minutes a day to grow your vocabulary and curiosity — then play, climb the leaderboard and win weekly prizes.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto"
          >
            <Button onClick={getStarted.go} className="px-8 py-4 text-base">
              {getStarted.label}
            </Button>
            <a
              href="#video"
              className="font-ui font-semibold text-base px-8 py-4 rounded-control flex items-center justify-center gap-2 bg-paper border border-line-strong text-ink-900 shadow-card hover:bg-ink-900/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember-500"
            >
              <PlayCircle size={20} aria-hidden="true" />
              Watch the video
            </a>
          </motion.div>
        </div>

        {/* Visual Mockup */}
        <div className="relative h-[500px] w-full hidden sm:block" aria-hidden="true">
          <motion.div
            initial={{ opacity: 0, rotate: -10, x: -50 }}
            animate={{ opacity: 1, rotate: -4, x: 0 }}
            transition={{ duration: 0.7, delay: 0.2, type: 'spring' }}
            className="absolute top-10 left-0 w-[85%] z-10"
          >
            <WordCard
              id="hero-word"
              word="Ephemeral"
              definition="Lasting for a very short time."
              exampleSentence="Fashions are ephemeral, but style is eternal."
              className="shadow-xl"
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, rotate: 10, x: 50 }}
            animate={{ opacity: 1, rotate: 4, x: 0 }}
            transition={{ duration: 0.7, delay: 0.4, type: 'spring' }}
            className="absolute top-40 right-0 w-[85%] z-0"
          >
            <FactCard
              id="preview-fact"
              imageUrl=""
              hookLine="Octopuses have three hearts"
              contextLine="Octopuses are among the most intelligent invertebrates in the ocean."
              bullets={[
                'Two hearts pump blood to the gills, one pumps it to the rest of the body',
                'They can change both color and texture to camouflage instantly',
                'Octopuses have blue blood, not red',
                'They can taste through their arms',
              ]}
              className="shadow-xl opacity-90"
            />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
