import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { WordCard } from './WordCard';
import { FactCard } from './FactCard';

export function Hero() {
  const navigate = useNavigate();
  return (
    <section className="pt-32 pb-20 px-6 overflow-hidden">
      <div className="max-w-5xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
        {/* Text Content */}
        <div className="flex flex-col items-start z-10">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-4"
          >
            <span className="text-sm font-semibold text-faded-ink tracking-wider uppercase">
              One word. One fact. Every day.
            </span>
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="font-display text-5xl sm:text-6xl text-ink font-bold leading-[1.1] mb-6"
          >
            Learn something worth knowing, every single day.
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-lg text-faded-ink mb-8 max-w-lg leading-relaxed"
          >
            A new word to use, a new fact to remember — two minutes a day, no pressure, no lessons.
          </motion.p>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <button onClick={() => navigate('/signup')} className="bg-ember text-paper font-semibold text-lg px-8 py-4 rounded-xl shadow-lg shadow-ember/20 hover:shadow-xl hover:-translate-y-0.5 hover:bg-ember/90 transition-all cursor-pointer">
              Get Started — It's Free
            </button>
          </motion.div>
        </div>

        {/* Visual Mockup */}
        <div className="relative h-[500px] w-full hidden sm:block">
          <motion.div
            initial={{ opacity: 0, rotate: -10, x: -50 }}
            animate={{ opacity: 1, rotate: -4, x: 0 }}
            transition={{ duration: 0.7, delay: 0.2, type: "spring" }}
            className="absolute top-10 left-0 w-[85%] z-10"
          >
            <WordCard 
              word="Ephemeral"
              pronunciation="ih-fem-er-uhl"
              definition="Lasting for a very short time."
              example="Fashions are ephemeral, but style is eternal."
              className="shadow-xl"
            />
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, rotate: 10, x: 50 }}
            animate={{ opacity: 1, rotate: 4, x: 0 }}
            transition={{ duration: 0.7, delay: 0.4, type: "spring" }}
            className="absolute top-40 right-0 w-[85%] z-0"
          >
            <FactCard 
              hook="octopuses have three hearts"
              context="Octopuses are among the most intelligent invertebrates in the ocean."
              bullets={[
                "Two hearts pump blood to the gills, one pumps it to the rest of the body",
                "They can change both color and texture to camouflage instantly",
                "Octopuses have blue blood, not red",
                "They can taste through their arms"
              ]}
              className="shadow-xl opacity-90"
            />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
