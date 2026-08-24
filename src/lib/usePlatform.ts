import { useState, useEffect } from 'react';

export type Platform = 'ios' | 'android' | 'other';

export function usePlatform() {
  const [platform, setPlatform] = useState<Platform>('other');
  const [isStandalone, setIsStandalone] = useState<boolean>(false);
  const [isSafari, setIsSafari] = useState<boolean>(false);

  useEffect(() => {
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
  }, []);

  return { platform, isStandalone, isSafari };
}
