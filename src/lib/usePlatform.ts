import { useState, useEffect } from 'react';

export type Platform = 'ios' | 'android' | 'other';

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

let cachedInstallPromptEvent: BeforeInstallPromptEvent | null = null;

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e: Event) => {
    e.preventDefault();
    cachedInstallPromptEvent = e as BeforeInstallPromptEvent;
    window.dispatchEvent(new Event('installPromptReady'));
  });
}

export function usePlatform() {
  const [platform, setPlatform] = useState<Platform>('other');
  const [isStandalone, setIsStandalone] = useState<boolean>(false);
  const [isSafari, setIsSafari] = useState<boolean>(false);
  const [installPromptEvent, setInstallPromptEvent] = useState<BeforeInstallPromptEvent | null>(cachedInstallPromptEvent);

  useEffect(() => {
    const handlePromptReady = () => setInstallPromptEvent(cachedInstallPromptEvent);
    window.addEventListener('installPromptReady', handlePromptReady);

    // Detect Standalone mode
    const checkStandalone = () => {
      const matchMedia = window.matchMedia('(display-mode: standalone)').matches;
      const navStandalone = (window.navigator as any).standalone === true;
      return matchMedia || navStandalone;
    };
    
    setIsStandalone(checkStandalone());

    // Platform detection
    const userAgent = window.navigator.userAgent.toLowerCase();
    
    // Check userAgentData if available (newer browsers)
    const uaData = (window.navigator as any).userAgentData;
    let isAndroid = false;
    let isIOS = false;
    
    if (uaData) {
      isAndroid = uaData.platform.toLowerCase() === 'android';
      isIOS = ['ios', 'macos'].includes(uaData.platform.toLowerCase()) && /iphone|ipad|ipod/.test(userAgent);
    } else {
      isAndroid = /android/.test(userAgent);
      isIOS = /iphone|ipad|ipod/.test(userAgent);
    }

    if (isIOS) {
      setPlatform('ios');
      // Safari detection: contains 'safari' but not 'chrome' or 'crios' (Chrome on iOS)
      if (userAgent.includes('safari') && !userAgent.includes('crios') && !userAgent.includes('chrome') && !userAgent.includes('fxios')) {
        setIsSafari(true);
      }
    } else if (isAndroid) {
      setPlatform('android');
    } else {
      setPlatform('other');
    }

    return () => {
      window.removeEventListener('installPromptReady', handlePromptReady);
    };
  }, []);

  return { platform, isStandalone, isSafari, installPromptEvent };
}
