import { useRef, useState } from 'react';
import { Play } from 'lucide-react';
import { Reveal } from './Reveal';
import { SectionHeader } from './SectionHeader';
import { useInView } from '../hooks/useInView';

interface VideoShowcaseProps {
  src: string;
  title: string;
}

/**
 * The product video in a clean frame. It is only mounted once the section nears
 * the screen (and loads metadata only), shows its first frame as the thumbnail
 * with a play button, and plays with sound and controls on tap.
 */
export function VideoShowcase({ src, title }: VideoShowcaseProps) {
  const { ref, inView } = useInView<HTMLDivElement>('300px 0px 300px 0px');
  const [seen, setSeen] = useState(false);
  const [playing, setPlaying] = useState(false);
  const video = useRef<HTMLVideoElement>(null);

  if (inView && !seen) setSeen(true); // mount once, then keep it

  function play() {
    setPlaying(true);
    const el = video.current;
    if (el) {
      el.muted = false;
      el.play().catch(() => {
        // autoplay refused — the native controls are visible so the user can press play
      });
    }
  }

  return (
    <section id="video" className="scroll-mt-24 py-24 px-6">
      <div className="max-w-4xl mx-auto flex flex-col gap-10">
        <SectionHeader eyebrow="See it in action" title="Watch Curi in under a minute" />
        <Reveal>
          <div
            ref={ref}
            className="relative aspect-video overflow-hidden rounded-sheet border border-line bg-night shadow-raised ring-1 ring-ember-500/10"
          >
            {seen && (
              <video
                ref={video}
                src={src}
                title={title}
                aria-label={title}
                controls={playing}
                playsInline
                preload="metadata"
                onPause={() => setPlaying(false)}
                className="h-full w-full object-cover"
              />
            )}
            {!playing && (
              <button
                onClick={play}
                aria-label={`Play video: ${title}`}
                className="absolute inset-0 flex items-center justify-center bg-night/30 transition-colors hover:bg-night/20 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-ember-500"
              >
                <span className="w-20 h-20 rounded-full bg-ember-600 text-on-ember shadow-raised flex items-center justify-center transition-transform hover:scale-105">
                  <Play size={32} className="ml-1" fill="currentColor" aria-hidden="true" />
                </span>
              </button>
            )}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
