import { Reveal } from './Reveal';
import { Button } from './ui/Button';
import { useGetStarted } from '../hooks/useGetStarted';

/** Closing call to action. */
export function CTA() {
  const getStarted = useGetStarted();
  return (
    <section className="py-28 px-6 bg-paper relative overflow-hidden">
      <div aria-hidden="true" className="absolute top-0 right-0 w-[500px] h-[500px] bg-ember-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
      <div aria-hidden="true" className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-moss-600/5 rounded-full blur-3xl translate-y-1/3 -translate-x-1/3" />

      <Reveal className="max-w-3xl mx-auto text-center relative z-10 flex flex-col items-center gap-8">
        <h2 className="font-display text-4xl sm:text-5xl font-bold text-ink-900">Your first word is waiting.</h2>
        <div className="flex flex-col items-center gap-4 w-full">
          <Button onClick={getStarted.go} className="px-10 py-5 text-lg w-full sm:w-auto">
            {getStarted.label}
          </Button>
          <p className="text-sm font-medium text-ink-500 font-ui">No credit card. Takes 30 seconds.</p>
        </div>
      </Reveal>
    </section>
  );
}
