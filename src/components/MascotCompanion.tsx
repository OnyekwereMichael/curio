import { AnimatedMascot } from './AnimatedMascot';
import { MascotSpeechBubble } from './MascotSpeechBubble';
import { useInView } from '../hooks/useInView';
import { useMascotBehavior } from '../hooks/useMascotBehavior';
import { usePageVisible } from '../hooks/usePageVisible';
import { cn } from '../lib/utils';
import type { MascotContext } from '../lib/mascotConfig';

interface MascotCompanionProps {
  size?: number;
  /** Personal data the mascot can mention (rank, XP to the top 3, streak…). */
  context?: MascotContext;
  className?: string;
}

/**
 * Drop-in talking mascot: the otter, its speech bubble and its behaviour in one
 * box. State lives here, so the surrounding card never re-renders when the
 * mascot changes mood. Pauses while off screen or backgrounded.
 */
export function MascotCompanion({ size = 56, context = {}, className }: MascotCompanionProps) {
  const pageVisible = usePageVisible();
  const { ref, inView } = useInView<HTMLDivElement>();
  const active = pageVisible && inView;
  const behavior = useMascotBehavior({ active, context });

  return (
    <div ref={ref} className={cn('relative flex-shrink-0', className)} style={{ width: size, height: size }}>
      <MascotSpeechBubble message={behavior.message} bubbleKey={behavior.bubbleKey} />
      <AnimatedMascot
        size={size}
        mood={behavior.mood}
        effect={behavior.effect}
        effectKey={behavior.effectKey}
        animated={active}
        onTap={behavior.onTap}
      />
    </div>
  );
}
