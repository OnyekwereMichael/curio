import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
import type { ShareData } from './useShareCard';
import { useShareCard } from './useShareCard';
import CuriLogo from '../../public/apple-touch-icon.png';

interface ShareCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: ShareData | null;
}

const SITE_URL = 'trycuri.app';

/** The card is always designed and exported at this width. The preview scales to fit the screen. */
const CARD_WIDTH = 440;

const INK = '#1C2B3A';
const MUTED = '#6B7882';
const RULE = 'rgba(28, 43, 58, 0.12)';
const EMBER = '#D8492F';
const MOSS = '#3E6259';

/* -------------------------------------------------------------------------- */
/*  Card                                                                      */
/* -------------------------------------------------------------------------- */

function CardShell({
  accent,
  label,
  tagline = 'One word, one fact, every day',
  children,
}: {
  accent: string;
  label: string;
  tagline?: string;
  children: React.ReactNode;
}) {
  const today = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div
      style={{
        width: CARD_WIDTH,
        minHeight: 540,
        boxSizing: 'border-box',
        padding: '36px 40px 32px',
        display: 'flex',
        flexDirection: 'column',
        background: '#FBF9F4',
        borderRadius: 16,
        border: `1px solid ${RULE}`,
        fontFamily: "'Sora', sans-serif",
        color: INK,
      }}
    >
      {/* Brand row — avoid flex align-items:center here; html2canvas misplaces text
           inside flex cross-axis alignment. Instead we give every child an explicit
           height + lineHeight so the baseline is baked in and render-stable. */}
      <div
        style={{
          display: 'flex',
          alignItems: 'stretch',
          justifyContent: 'space-between',
          height: 32,
          marginBottom: 44,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'stretch', gap: 10 }}>
          <img
            src={CuriLogo}
            alt=""
            width={32}
            height={32}
            style={{ borderRadius: 8, display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, alignSelf: 'center' }}
          />
          <span
            style={{
              display: 'block',
              height: 32,
              lineHeight: '32px',
              fontFamily: "'Fraunces', serif",
              fontWeight: 600,
              fontSize: 20,
              letterSpacing: '-0.02em',
            }}
          >
            Curi
          </span>
        </div>
        <span style={{ display: 'block', height: 32, lineHeight: '32px', fontSize: 12, color: MUTED }}>
          {today}
        </span>
      </div>


      {/* Label */}
      <div
        style={{
          fontSize: 13,
          fontWeight: 600,
          lineHeight: '18px',
          color: accent,
          marginBottom: 12,
        }}
      >
        {label}
      </div>

      {/* Content */}
      <div style={{ flex: 1 }}>{children}</div>

      {/* Footer */}
      <div
        style={{
          marginTop: 36,
          paddingTop: 18,
          borderTop: `1px solid ${RULE}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          lineHeight: '18px',
          fontSize: 12,
        }}
      >
        <span style={{ fontWeight: 600, color: accent }}>{SITE_URL}</span>
        <span style={{ color: MUTED }}>{tagline}</span>
      </div>
    </div>
  );
}

function wordSize(word: string) {
  if (word.length > 14) return 38;
  if (word.length > 11) return 46;
  if (word.length > 8) return 54;
  return 64;
}

function ShareCardContent({ data }: { data: ShareData }) {
  if (data.type === 'word') {
    return (
      <CardShell accent={EMBER} label="Word of the day">
        <h2
          style={{
            fontFamily: "'Fraunces', serif",
            fontSize: wordSize(data.word),
            fontWeight: 700,
            lineHeight: 1.15,
            letterSpacing: '-0.025em',
            margin: 0,
            paddingBottom: 6,
            overflowWrap: 'anywhere',
          }}
        >
          {data.word}
        </h2>

        <p
          style={{
            fontSize: 18,
            lineHeight: 1.55,
            margin: 0,
            paddingTop: 16,
            maxWidth: 340,
          }}
        >
          {data.definition}
        </p>

        <div style={{ marginTop: 40 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              lineHeight: '16px',
              color: MUTED,
              marginBottom: 10,
            }}
          >
            Example
          </div>
          <p
            style={{
              fontFamily: "'Fraunces', serif",
              fontSize: 16,
              lineHeight: 1.6,
              // fontStyle: 'italic',
              margin: 0,
              paddingLeft: 16,
              borderLeft: `2px solid ${EMBER}`,
              color: INK,
              opacity: 0.8,
            }}
          >
            “{data.exampleSentence}”
          </p>
        </div>
      </CardShell>
    );
  }

  return (
    <CardShell accent={MOSS} label="Fact of the day">
      <h2
        style={{
          fontFamily: "'Fraunces', serif",
          fontSize: 32,
          fontWeight: 700,
          lineHeight: 1.2,
          letterSpacing: '-0.02em',
          margin: '0 0 16px',
        }}
      >
        {data.hookLine}
      </h2>

      <p
        style={{
          fontSize: 15,
          lineHeight: 1.65,
          color: MUTED,
          margin: '0 0 28px',
        }}
      >
        {data.contextLine}
      </p>

      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {data.bullets.map((bullet, idx) => (
          <li
            key={idx}
            style={{
              fontSize: 14,
              lineHeight: 1.6,
              padding: '12px 0',
              borderTop: `1px solid ${RULE}`,
            }}
          >
            {bullet}
          </li>
        ))}
      </ul>
    </CardShell>
  );
}

/* -------------------------------------------------------------------------- */
/*  Modal                                                                     */
/* -------------------------------------------------------------------------- */

export function ShareCardModal({ isOpen, onClose, data }: ShareCardModalProps) {
  // Off-screen, full-size copy used only for image export. Output is identical on every device.
  const exportRef = useRef<HTMLDivElement>(null);
  // Visible preview, scaled to fit the available width.
  const previewBoxRef = useRef<HTMLDivElement>(null);
  const previewCardRef = useRef<HTMLDivElement>(null);

  const { isGenerating, generateImage, downloadImage, nativeShare, canNativeShare } =
    useShareCard();
  const [imageReady, setImageReady] = useState(false);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [scale, setScale] = useState(1);
  const [cardHeight, setCardHeight] = useState(540);

  // Fit the preview to the container
  useLayoutEffect(() => {
    if (!isOpen || !data) return;
    const box = previewBoxRef.current;
    const card = previewCardRef.current;
    if (!box || !card) return;

    const measure = () => {
      setScale(Math.min(1, box.clientWidth / CARD_WIDTH));
      setCardHeight(card.offsetHeight);
    };
    measure();

    const ro = new ResizeObserver(measure);
    ro.observe(box);
    ro.observe(card);
    return () => ro.disconnect();
  }, [isOpen, data]);

  // Generate the image once fonts are ready
  useEffect(() => {
    if (!isOpen || !data) {
      setImageReady(false);
      setGeneratedUrl(null);
      setDownloadSuccess(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        await document.fonts?.ready;
      } catch {
        /* ignore */
      }
      await new Promise((r) => setTimeout(r, 150));
      if (cancelled || !exportRef.current) return;
      const url = await generateImage(exportRef.current);
      if (!cancelled && url) {
        setGeneratedUrl(url);
        setImageReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isOpen, data, generateImage]);

  // Escape to close, lock background scroll
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', onKey);
    };
  }, [isOpen, onClose]);

  const handleDownload = useCallback(() => {
    if (!generatedUrl || !data) return;
    const filename =
      data.type === 'word'
        ? `curi-word-${data.word.toLowerCase().replace(/\s+/g, '-')}.png`
        : `curi-fact-${Date.now()}.png`;
    downloadImage(generatedUrl, filename);
    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 2000);
  }, [generatedUrl, data, downloadImage]);

  const handleShare = useCallback(async () => {
    if (!generatedUrl || !data) return;
    const title = data.type === 'word' ? `Word: ${data.word}` : 'Fact of the Day';
    const shared = await nativeShare(generatedUrl, title);
    if (!shared) handleDownload();
  }, [generatedUrl, data, nativeShare, handleDownload]);

  if (!isOpen || !data) return null;

  const busy = isGenerating || !imageReady;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Share card"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="absolute inset-0 bg-ink/50 pointer-events-none"
        style={{ animation: 'shareFade 0.2s ease-out' }}
      />

      {/* Sheet on mobile, dialog on larger screens */}
      <div
        className="relative bg-paper w-full sm:max-w-[520px] flex flex-col overflow-hidden rounded-t-2xl sm:rounded-2xl shadow-2xl"
        style={{
          maxHeight: 'calc(100dvh - env(safe-area-inset-top, 0px) - 8px)',
          animation: 'shareRise 0.25s ease-out',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between pl-5 pr-3 h-14 shrink-0">
          <h3 className="font-display text-base font-bold text-ink">Share</h3>
          <button
            onClick={onClose}
            className="h-10 w-10 -mr-1 inline-flex items-center justify-center rounded-full text-faded-ink hover:text-ink hover:bg-ink/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/30"
            aria-label="Close"
            type="button"
          >
            <X size={18} />
          </button>
        </div>

        {/* Preview */}
        <div className="flex-1 min-h-0 overflow-y-auto bg-ink/[0.04] px-4 py-5 sm:px-6 sm:py-6">
          <div ref={previewBoxRef} className="mx-auto w-full" style={{ maxWidth: CARD_WIDTH }}>
            <div
              style={{
                width: CARD_WIDTH * scale,
                height: cardHeight * scale,
                marginInline: 'auto',
                borderRadius: 16 * scale,
                boxShadow: '0 1px 2px rgba(28,43,58,0.08), 0 8px 24px rgba(28,43,58,0.08)',
              }}
            >
              <div
                ref={previewCardRef}
                style={{
                  width: CARD_WIDTH,
                  transform: `scale(${scale})`,
                  transformOrigin: 'top left',
                }}
              >
                <ShareCardContent data={data} />
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div
          className="flex items-center gap-3 px-4 sm:px-6 pt-4 shrink-0 border-t border-ink/10"
          style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 0px))' }}
        >
          {busy ? (
            <div
              className="flex items-center justify-center gap-2 w-full h-11 text-sm text-faded-ink"
              role="status"
            >
              <Loader2 size={16} className="animate-spin" />
              <span>Preparing image</span>
            </div>
          ) : (
            <>
              <button
                onClick={handleDownload}
                className={cn(
                  'flex-1 h-11 rounded-xl text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/30',
                  downloadSuccess
                    ? 'bg-moss/10 text-moss'
                    : canNativeShare
                      ? 'bg-ink/5 text-ink hover:bg-ink/10'
                      : 'bg-ember text-paper hover:bg-ember/90'
                )}
                type="button"
              >
                {downloadSuccess ? 'Saved' : 'Download'}
              </button>

              {canNativeShare && (
                <button
                  onClick={handleShare}
                  className="flex-1 h-11 rounded-xl bg-ember text-paper text-sm font-semibold hover:bg-ember/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember/50 focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
                  type="button"
                >
                  Share
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Full-size export copy, kept off-screen so the saved image never depends on screen size */}
      <div
        aria-hidden="true"
        style={{ position: 'fixed', left: -10000, top: 0, pointerEvents: 'none' }}
      >
        <div ref={exportRef} style={{ width: CARD_WIDTH }}>
          <ShareCardContent data={data} />
        </div>
      </div>

      <style>{`
        @keyframes shareFade {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes shareRise {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          [role="dialog"] * { animation: none !important; }
        }
      `}</style>
    </div>
  );
}