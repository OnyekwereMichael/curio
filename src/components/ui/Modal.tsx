import { useEffect, useRef, type KeyboardEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '../../lib/utils';

/**
 * 'default' – the standard dimmed overlay.
 * 'test'    – for tests/quizzes sat on top of the content they ask about: a dark dim plus a strong blur,
 *             falling back to a near-opaque overlay where backdrop-filter is missing or the device is low-end,
 *             so what is behind can never be read.
 */
export type ModalVariant = 'default' | 'test';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  /** Accessible name of the dialog. */
  label: string;
  variant?: ModalVariant;
  /** Close when the dim area outside the panel is tapped. Default true. */
  dismissOnBackdrop?: boolean;
  children: ReactNode;
}

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

// Several modals can be open at once; the page is only released when the last one closes.
let openCount = 0;

function lockPage() {
  if (openCount++ > 0) return;
  const root = document.getElementById('root');
  root?.setAttribute('inert', '');
  root?.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = 'hidden';
  document.documentElement.style.overscrollBehavior = 'none';
  document.documentElement.dataset.modalOpen = 'true';
}

function unlockPage() {
  if (--openCount > 0) return;
  openCount = 0;
  const root = document.getElementById('root');
  root?.removeAttribute('inert');
  root?.removeAttribute('aria-hidden');
  document.body.style.overflow = '';
  document.documentElement.style.overscrollBehavior = '';
  delete document.documentElement.dataset.modalOpen;
}

/** Blur is expensive on weak phones; they get the near-opaque overlay instead. */
function isLowEndDevice() {
  const nav = navigator as Navigator & { deviceMemory?: number };
  return (nav.deviceMemory !== undefined && nav.deviceMemory <= 2) || (nav.hardwareConcurrency !== undefined && nav.hardwareConcurrency <= 2);
}

const BACKDROP: Record<ModalVariant, string> = {
  default: 'bg-ink-900/50',
  // night is a fixed dark colour in both themes. 95% opaque unless real backdrop blur is available.
  test: 'bg-night/95 supports-[backdrop-filter]:bg-night/70 supports-[backdrop-filter]:backdrop-blur-2xl',
};
const BACKDROP_LOW_END = 'bg-night/95';

export function Modal({ open, onClose, label, variant = 'default', dismissOnBackdrop = true, children }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // Lock the page, move focus in, and give everything back on close or unmount (so a blur can never get stuck).
  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    lockPage();
    const panel = panelRef.current;
    (panel?.querySelector<HTMLElement>(FOCUSABLE) ?? panel)?.focus();
    return () => {
      unlockPage();
      if (previouslyFocused && document.contains(previouslyFocused)) previouslyFocused.focus();
    };
  }, [open]);

  function handleKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onCloseRef.current();
      return;
    }
    if (e.key !== 'Tab' || !panelRef.current) return;
    const items = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
    if (items.length === 0) {
      e.preventDefault();
      return;
    }
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && (document.activeElement === first || document.activeElement === panelRef.current)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  const backdrop = variant === 'test' && isLowEndDevice() ? BACKDROP_LOW_END : BACKDROP[variant];

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className={cn('fixed inset-0 z-[120] overflow-y-auto overscroll-contain', backdrop)}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onKeyDown={handleKeyDown}
          onMouseDown={(e) => {
            if (dismissOnBackdrop && e.target === e.currentTarget) onCloseRef.current();
          }}
        >
          {/* min-h-full keeps the panel centred on tall screens and scrollable on short ones, with no gap either way */}
          <div className="flex min-h-full items-end sm:items-center justify-center p-4 pointer-events-none">
            <div ref={panelRef} role="dialog" aria-modal="true" aria-label={label} tabIndex={-1} className="w-full flex justify-center pointer-events-auto outline-none">
              {children}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
