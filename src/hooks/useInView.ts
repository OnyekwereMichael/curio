import { useEffect, useState } from 'react';

/**
 * Tracks whether an element is on screen. Attach `ref` to the element; when it
 * is never rendered (or unmounts) `inView` stays false.
 * `rootMargin` shrinks/grows the viewport, e.g. to ignore a fixed bar.
 */
export function useInView<T extends Element>(rootMargin = '0px') {
  const [el, setEl] = useState<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    if (!el) {
      setInView(false);
      return;
    }
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { rootMargin });
    observer.observe(el);
    return () => observer.disconnect();
  }, [el, rootMargin]);

  return { ref: setEl, inView };
}
