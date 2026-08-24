import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

export function CTA() {
  const navigate = useNavigate();
  return (
    <section className="py-32 px-6 bg-paper relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-ember/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-moss/5 rounded-full blur-3xl translate-y-1/3 -translate-x-1/3" />

      <div className="max-w-3xl mx-auto text-center relative z-10 flex flex-col items-center">
        <motion.h2 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5 }}
          className="font-display text-4xl sm:text-5xl font-bold text-ink mb-10"
        >
          Your first word is waiting.
        </motion.h2>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="flex flex-col items-center gap-4 w-full"
        >
          <button onClick={() => navigate('/signup')} className="bg-ember text-paper font-semibold text-lg px-10 py-5 rounded-xl shadow-lg shadow-ember/20 hover:shadow-xl hover:-translate-y-0.5 hover:bg-ember/90 transition-all w-full sm:w-auto cursor-pointer">
            Get Started — It's Free
          </button>
          <p className="text-sm font-medium text-faded-ink">
            No credit card. Takes 30 seconds.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
