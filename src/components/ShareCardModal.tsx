import { useEffect, useRef, useState, useCallback } from 'react';
import { X, Download, Share2, Loader2, Check } from 'lucide-react';
import { cn } from '../lib/utils';
import type { ShareData } from './useShareCard';
import { useShareCard } from './useShareCard';
import CuriLogo from '../../public/apple-touch-icon.png'

interface ShareCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: ShareData | null;
}

const SITE_URL = 'trycuri.app';

/** Small inline Curi lightning logo — matches the brand purple from favicon.svg */
// function CuriLogo({ size = 24 }: { size?: number }) {
//   return (
//     <svg
//       xmlns="http://www.w3.org/2000/svg"
//       width={size}
//       height={size}
//       fill="none"
//       viewBox="0 0 48 46"
//     >
//       <path
//         fill="#863bff"
//         d="M25.946 44.938c-.664.845-2.021.375-2.021-.698V33.937a2.26 2.26 0 0 0-2.262-2.262H10.287c-.92 0-1.456-1.04-.92-1.788l7.48-10.471c1.07-1.497 0-3.578-1.842-3.578H1.237c-.92 0-1.456-1.04-.92-1.788L10.013.474c.214-.297.556-.474.92-.474h28.894c.92 0 1.456 1.04.92 1.788l-7.48 10.471c-1.07 1.498 0 3.579 1.842 3.579h11.377c.943 0 1.473 1.088.89 1.83L25.947 44.94z"
//       />
//     </svg>
//   );
// }

function ShareCardContent({ data }: { data: ShareData }) {
  const today = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  if (data.type === 'word') {
    return (
      <div
        style={{
          width: 440,
          padding: '40px 36px 32px',
          background: 'linear-gradient(145deg, #F6F4EF 0%, #EDE8DF 100%)',
          borderRadius: 20,
          fontFamily: "'Sora', sans-serif",
          color: '#1C2B3A',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Decorative accent bar */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 5,
            background: 'linear-gradient(90deg, #D8492F 0%, #C7962E 50%, #3E6259 100%)',
            borderRadius: '20px 20px 0 0',
          }}
        />

        {/* Header: Logo + Date */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 28,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <img src={CuriLogo} alt="Curi" className="w-6 h-6" />
            <span
              style={{
                fontFamily: "'Fraunces', serif",
                fontWeight: 600,
                fontSize: 18,
                color: '#1C2B3A',
                letterSpacing: '-0.02em',
              }}
            >
              Curi
            </span>
          </div>
          <span
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 11,
              color: '#C7962E',
              fontWeight: 500,
              letterSpacing: '0.04em',
              border: '1px solid rgba(199, 150, 46, 0.3)',
              padding: '3px 10px',
              borderRadius: 4,
              transform: 'rotate(-2deg)',
              display: 'inline-block',
            }}
          >
            {today}
          </span>
        </div>

        {/* Label */}
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            textTransform: 'uppercase' as const,
            letterSpacing: '0.12em',
            color: '#D8492F',
            marginBottom: 10,
          }}
        >
          Word of the Day
        </div>

        {/* Word */}
        <h2
          style={{
            fontFamily: "'Fraunces', serif",
            fontSize: 32,
            fontWeight: 700,
            color: '#1C2B3A',
            margin: '0 0 16px',
            lineHeight: 1.2,
          }}
        >
          {data.word}
        </h2>

        {/* Definition */}
        <p
          style={{
            fontSize: 14,
            lineHeight: 1.7,
            color: '#1C2B3A',
            margin: '0 0 20px',
          }}
        >
          {data.definition}
        </p>

        {/* Example sentence */}
        <div
          style={{
            borderLeft: '3px solid rgba(216, 73, 47, 0.3)',
            paddingLeft: 16,
            marginBottom: 28,
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              textTransform: 'uppercase' as const,
              letterSpacing: '0.1em',
              color: '#7C8A93',
              marginBottom: 6,
            }}
          >
            Example
          </div>
          <p
            style={{
              fontSize: 13,
              color: 'rgba(28, 43, 58, 0.8)',
              lineHeight: 1.6,
              margin: 0,
              fontStyle: 'italic',
            }}
          >
            "{data.exampleSentence}"
          </p>
        </div>

        {/* Divider */}
        <div
          style={{
            height: 1,
            background: 'rgba(28, 43, 58, 0.08)',
            marginBottom: 16,
          }}
        />

        {/* Footer: Tagline + URL */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span
            style={{
              fontSize: 11,
              color: '#7C8A93',
              fontStyle: 'italic',
              fontFamily: "'Fraunces', serif",
            }}
          >
            One word. One fact. Every day.
          </span>
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: '#D8492F',
              letterSpacing: '0.02em',
            }}
          >
            {SITE_URL}
          </span>
        </div>
      </div>
    );
  }

  // Fact card
  return (
    <div
      style={{
        width: 440,
        padding: '40px 36px 32px',
        background: 'linear-gradient(145deg, #F6F4EF 0%, #EDE8DF 100%)',
        borderRadius: 20,
        fontFamily: "'Sora', sans-serif",
        color: '#1C2B3A',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Decorative accent bar */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 5,
          background: 'linear-gradient(90deg, #3E6259 0%, #C7962E 50%, #D8492F 100%)',
          borderRadius: '20px 20px 0 0',
        }}
      />

      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 28,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <img src={CuriLogo} alt="Curi" className="w-6 h-6" />
          <span
            style={{
              fontFamily: "'Fraunces', serif",
              fontWeight: 600,
              fontSize: 18,
              color: '#1C2B3A',
              letterSpacing: '-0.02em',
            }}
          >
            Curi
          </span>
        </div>
        <span
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 11,
            color: '#C7962E',
            fontWeight: 500,
            letterSpacing: '0.04em',
            border: '1px solid rgba(199, 150, 46, 0.3)',
            padding: '3px 10px',
            borderRadius: 4,
            transform: 'rotate(-2deg)',
            display: 'inline-block',
          }}
        >
          {today}
        </span>
      </div>

      {/* Label */}
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          textTransform: 'uppercase' as const,
          letterSpacing: '0.12em',
          color: '#3E6259',
          marginBottom: 10,
        }}
      >
        Fact of the Day
      </div>

      {/* Hook */}
      <h2
        style={{
          fontFamily: "'Fraunces', serif",
          fontSize: 24,
          fontWeight: 700,
          color: '#1C2B3A',
          margin: '0 0 12px',
          lineHeight: 1.3,
        }}
      >
        {data.hookLine}
      </h2>

      {/* Context */}
      <p
        style={{
          fontSize: 13,
          lineHeight: 1.7,
          color: '#7C8A93',
          margin: '0 0 20px',
        }}
      >
        {data.contextLine}
      </p>

      {/* Divider */}
      <div
        style={{
          height: 1,
          background: 'rgba(28, 43, 58, 0.08)',
          marginBottom: 16,
        }}
      />

      {/* Bullets */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
        {data.bullets.map((bullet, idx) => (
          <div
            key={idx}
            style={{
              display: 'flex',
              gap: 12,
              fontSize: 13,
              color: 'rgba(28, 43, 58, 0.9)',
              lineHeight: 1.6,
            }}
          >
            <span
              style={{
                flexShrink: 0,
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: '#7C8A93',
                marginTop: 7,
              }}
            />
            <span>{bullet}</span>
          </div>
        ))}
      </div>

      {/* Divider */}
      <div
        style={{
          height: 1,
          background: 'rgba(28, 43, 58, 0.08)',
          marginBottom: 16,
        }}
      />

      {/* Footer */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span
          style={{
            fontSize: 11,
            color: '#7C8A93',
            fontStyle: 'italic',
            fontFamily: "'Fraunces', serif",
          }}
        >
          One word. One fact. Every day.
        </span>
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: '#D8492F',
            letterSpacing: '0.02em',
          }}
        >
          {SITE_URL}
        </span>
      </div>
    </div>
  );
}

export function ShareCardModal({ isOpen, onClose, data }: ShareCardModalProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const { isGenerating, generateImage, downloadImage, nativeShare, canNativeShare } =
    useShareCard();
  const [imageReady, setImageReady] = useState(false);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  // Generate image once modal opens and card is rendered
  useEffect(() => {
    if (!isOpen || !data) {
      setImageReady(false);
      setGeneratedUrl(null);
      setDownloadSuccess(false);
      return;
    }

    // Wait a tick for fonts to load / card to render
    const timer = setTimeout(async () => {
      if (cardRef.current) {
        const url = await generateImage(cardRef.current);
        if (url) {
          setGeneratedUrl(url);
          setImageReady(true);
        }
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [isOpen, data, generateImage]);

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
    if (!shared) {
      // Fallback to download if native share isn't available
      handleDownload();
    }
  }, [generatedUrl, data, nativeShare, handleDownload]);

  if (!isOpen || !data) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
        style={{ animation: 'shareModalFadeIn 0.2s ease-out' }}
      />

      {/* Modal */}
      <div
        className="relative bg-paper rounded-2xl shadow-2xl border border-ink/10 w-full max-w-lg overflow-hidden flex flex-col"
        style={{ animation: 'shareModalSlideUp 0.3s ease-out' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-ink/8">
          <div className="flex items-center gap-2">
            <Share2 size={18} className="text-ember" />
            <h3 className="font-display text-lg font-bold text-ink">Share Card</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-ink/5 transition-colors text-faded-ink hover:text-ink"
            aria-label="Close share modal"
            type="button"
          >
            <X size={18} />
          </button>
        </div>

        {/* Card Preview */}
        <div className="px-6 py-5 overflow-y-auto max-h-[60vh]">
          {/* The actual card element we capture */}
          <div className="flex justify-center">
            <div ref={cardRef}>
              <ShareCardContent data={data} />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 py-4 border-t border-ink/8 flex items-center gap-3">
          {isGenerating || !imageReady ? (
            <div className="flex items-center gap-2 text-faded-ink text-sm w-full justify-center py-1">
              <Loader2 size={16} className="animate-spin" />
              <span>Generating card…</span>
            </div>
          ) : (
            <>
              <button
                onClick={handleDownload}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all duration-200',
                  downloadSuccess
                    ? 'bg-moss/10 text-moss border border-moss/20'
                    : 'bg-ink/5 text-ink hover:bg-ink/10 border border-ink/10'
                )}
                type="button"
              >
                {downloadSuccess ? (
                  <>
                    <Check size={16} />
                    Saved!
                  </>
                ) : (
                  <>
                    <Download size={16} />
                    Download
                  </>
                )}
              </button>

              {canNativeShare && (
                <button
                  onClick={handleShare}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-ember text-paper text-sm font-bold hover:bg-ember/90 transition-all duration-200 shadow-sm"
                  type="button"
                >
                  <Share2 size={16} />
                  Share
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Animations */}
      <style>{`
        @keyframes shareModalFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes shareModalSlideUp {
          from { opacity: 0; transform: translateY(16px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}
