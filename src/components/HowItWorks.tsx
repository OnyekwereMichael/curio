import { motion } from 'framer-motion';

const steps = [
  {
    num: "01",
    title: "Open once a day.",
    desc: "A new word and a new fact are waiting for you."
  },
  {
    num: "02",
    title: "Learn it in two minutes.",
    desc: "Hear the word, see it used in a sentence, read four facts that stick."
  },
  {
    num: "03",
    title: "Build your streak.",
    desc: "Come back tomorrow — your stamp collection grows with every day."
  }
];

export function HowItWorks() {
  return (
    <section className="py-24 px-6 bg-paper-dark/30 border-y border-ink/5">
      <div className="max-w-5xl mx-auto">
        <div className="grid md:grid-cols-3 gap-12 relative">
          {/* Connecting line on desktop */}
          <div className="hidden md:block absolute top-6 left-[10%] right-[10%] h-px bg-ink/10" />

          {steps.map((step, idx) => (
            <motion.div 
              key={step.num}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.5, delay: idx * 0.15 }}
              className="relative z-10 flex flex-col items-center text-center md:items-start md:text-left"
            >
              <div className="w-12 h-12 rounded-full bg-paper border-2 border-moss flex items-center justify-center font-utility text-moss font-bold text-lg mb-6 shadow-sm">
                {step.num}
              </div>
              <h3 className="font-semibold text-xl text-ink mb-2">{step.title}</h3>
              <p className="text-faded-ink leading-relaxed">{step.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
