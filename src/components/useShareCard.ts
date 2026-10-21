import { useState, useCallback, useRef } from 'react';
import html2canvas from 'html2canvas';

export type ShareCardType = 'word' | 'fact';

export interface WordShareData {
  type: 'word';
  word: string;
  definition: string;
  exampleSentence: string;
}

export interface FactShareData {
  type: 'fact';
  hookLine: string;
  contextLine: string;
  bullets: string[];
}

export type ShareData = WordShareData | FactShareData;

export function useShareCard() {
  const [isOpen, setIsOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [shareData, setShareData] = useState<ShareData | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);

  const openShareModal = useCallback((data: ShareData) => {
    setShareData(data);
    setGeneratedImage(null);
    setIsOpen(true);
  }, []);

  const closeShareModal = useCallback(() => {
    setIsOpen(false);
    setShareData(null);
    setGeneratedImage(null);
  }, []);

  const generateImage = useCallback(async (element: HTMLDivElement): Promise<string | null> => {
    setIsGenerating(true);
    try {
      const canvas = await html2canvas(element, {
        backgroundColor: null,
        scale: 2, // Higher resolution
        useCORS: true,
        allowTaint: true,
        logging: false,
        onclone: (_clonedDoc, clonedElement) => {
          // Tailwind preflight sets `img { display: block }` globally. Inside the
          // html2canvas clone this causes the logo <img> (inside a flex row with
          // align-items:center) to sit on the wrong baseline, shifting the "Curi"
          // wordmark down relative to the logo. Resetting it to inline-block makes
          // the clone match exactly what the browser paints in the live preview.
          const style = _clonedDoc.createElement('style');
          style.textContent = 'img { display: inline-block !important; vertical-align: middle !important; }';
          clonedElement.appendChild(style);
        },
      });
      const dataUrl = canvas.toDataURL('image/png');
      setGeneratedImage(dataUrl);
      return dataUrl;
    } catch (err) {
      console.error('Failed to generate share card image:', err);
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, []);

  const downloadImage = useCallback((dataUrl: string, filename: string) => {
    const link = document.createElement('a');
    link.download = filename;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);

  const nativeShare = useCallback(async (dataUrl: string, title: string) => {
    try {
      // Convert data URL to blob for sharing
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      const file = new File([blob], `curi-${title.toLowerCase().replace(/\s+/g, '-')}.png`, {
        type: 'image/png',
      });

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: `Curi — ${title}`,
          text: `Check out this ${title.includes('word') ? 'word' : 'fact'} from Curi!`,
          files: [file],
        });
        return true;
      }
      return false;
    } catch (err) {
      // User cancelled the share sheet — that's fine
      if ((err as Error).name === 'AbortError') return true;
      console.error('Native share failed:', err);
      return false;
    }
  }, []);

  const canNativeShare = typeof navigator !== 'undefined' && !!navigator.share;

  return {
    isOpen,
    isGenerating,
    generatedImage,
    shareData,
    cardRef,
    openShareModal,
    closeShareModal,
    generateImage,
    downloadImage,
    nativeShare,
    canNativeShare,
  };
}
