import { FeatureCard } from './FeatureCard';
import { Reveal } from './Reveal';
import { SectionHeader } from './SectionHeader';
import { FEATURE_GROUPS } from '../lib/siteConfig';

/** Every feature in the app, grouped — driven entirely by FEATURE_GROUPS. */
export function FeaturesSection() {
  return (
    <section id="features" className="scroll-mt-24 py-24 px-6">
      <div className="max-w-6xl mx-auto flex flex-col gap-16">
        <SectionHeader eyebrow="Everything in Curi" title="Learn, grow and compete — all in one place" description="Built to be a daily habit, not a chore." />

        {FEATURE_GROUPS.map((group) => (
          <div key={group.id} className="flex flex-col gap-6">
            <Reveal className="flex flex-col gap-1">
              <h3 className="font-display text-title font-bold text-ink-900">{group.title}</h3>
              <p className="text-sm text-ink-500 font-ui">{group.blurb}</p>
            </Reveal>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {group.features.map((feature, i) => (
                <Reveal key={feature.title} delay={Math.min(i, 3) * 0.06}>
                  <FeatureCard {...feature} tone={group.tone} className="h-full" />
                </Reveal>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
