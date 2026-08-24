import { motion } from 'framer-motion';
import { WordCard } from './WordCard';
import { FactCard } from './FactCard';

export function ProductPreview() {
  return (
    <section className="py-20 px-6 overflow-hidden">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-ink">See what's inside</h2>
        </div>

        <div className="grid md:grid-cols-2 gap-10 items-start">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="flex flex-col gap-3"
          >
            <WordCard
              word="Sonder"
              pronunciation="sawn-der"
              definition="The feeling when you realize every stranger has a life as full and busy as your own."
              example="She looked at the crowd on the train and felt a moment of sonder."
            />
            <p className="text-center text-sm text-faded-ink">
              New words, explained simply.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="flex flex-col gap-3"
          >
            <FactCard
              hook="Bananas are berries"
              context="Botanically speaking, bananas are berries, but strawberries are not."
              bullets={[
                "True berries come from a single flower with one seed area",
                "Strawberries have their seeds on the outside",
                "Watermelons and pumpkins are also technically berries"
              ]}
            />
            <p className="text-center text-sm text-faded-ink">
              Quick facts that stick with you.
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
}