import { motion } from 'framer-motion';

export function FounderNote() {
  return (
    <section className="py-24 px-6 border-b border-ink/5 bg-paper">
      <div className="max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="flex flex-col gap-6"
        >
          <div className="w-12 h-12 rounded-full bg-ink/10 flex items-center justify-center text-xl overflow-hidden mb-2">
            👋
          </div>
          <h3 className="font-display text-2xl font-bold text-ink">Why we built this</h3>
          <div className="space-y-4 text-faded-ink leading-relaxed text-lg">
            <p>
              I love learning, but I found myself burning out on language course apps that demanded too much time and made me feel guilty for missing a "lesson."
            </p>
            <p>
              I just wanted something lighter — a small, daily ritual of curiosity, something closer to a physical field journal than a classroom syllabus.
            </p>
            <p>
              That’s why we created Curio. No pressure, no rigid courses. Just one word and one quick fact every morning.
            </p>
          </div>
          <div className="mt-4 pt-6 border-t border-ink/10">
            <p className="font-medium text-ink">The Curio Team</p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
