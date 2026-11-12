import { Reveal } from './Reveal';
import { SectionHeader } from './SectionHeader';
import { StepCard } from './StepCard';
import { HOW_IT_WORKS_STEPS } from '../lib/siteConfig';

/** Four-step walkthrough: sign up → learn → play → win. */
export function HowItWorks() {
  return (
    <section id="how" className="scroll-mt-24 py-24 px-6 bg-surface border-y border-line">
      <div className="max-w-5xl mx-auto flex flex-col gap-14">
        <SectionHeader eyebrow="How it works" title="From first word to weekly prize" description="Four simple steps. No courses, no pressure." />
        <Reveal>
          <ol className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10 list-none p-0">
            {HOW_IT_WORKS_STEPS.map((step, i) => (
              <StepCard key={step.title} number={i + 1} {...step} />
            ))}
          </ol>
        </Reveal>
      </div>
    </section>
  );
}
