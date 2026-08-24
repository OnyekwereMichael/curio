import { motion } from 'framer-motion';
import { RotateCcw, Clock, Stamp } from 'lucide-react';

const benefits = [
  {
    icon: RotateCcw,
    title: "Spaced repetition, built in.",
    desc: "Old words come back around as \"Old but Gold,\" so they actually stay with you."
  },
  {
    icon: Clock,
    title: "Two minutes, not two hours.",
    desc: "No courses, no pressure — just today's word and today's fact."
  },
  {
    icon: Stamp,
    title: "A streak worth keeping.",
    desc: "Every day you show up gets its own stamp."
  }
];

export function WhyItWorks() {
  return (
    <section className="py-24 px-6 bg-night text-paper-light">
      <div className="max-w-5xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5 }}
          className="mb-16 md:w-2/3"
        >
          <h2 className="font-display text-4xl sm:text-5xl font-bold mb-4">
            Built to stick,<br/>not just to scroll.
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-12">
          {benefits.map((benefit, idx) => (
            <motion.div 
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.5, delay: idx * 0.15 }}
              className="flex flex-col gap-4"
            >
              <div className="w-10 h-10 rounded-lg bg-ember/20 text-ember flex items-center justify-center mb-2">
                <benefit.icon size={20} />
              </div>
              <h3 className="font-semibold text-xl text-paper-dark">{benefit.title}</h3>
              <p className="text-paper-dark/70 leading-relaxed">{benefit.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
