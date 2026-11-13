import { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';

/** Real — navigator.onLine + the online/offline events. */
export function OfflineBanner() {
  const [offline, setOffline] = useState(() => typeof navigator !== 'undefined' && !navigator.onLine);

  useEffect(() => {
    const goOffline = () => setOffline(true);
    const goOnline = () => setOffline(false);
    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
    };
  }, []);

  if (!offline) return null;

  return (
    <div className="bg-night text-cream px-4 py-2.5 flex items-center gap-2 text-sm font-ui font-medium">
      <WifiOff size={15} className="flex-shrink-0" />
      You're offline. Today's plan is saved here — the dictionary and sharing need a connection.
    </div>
  );
}
