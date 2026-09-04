import { useNavigate } from 'react-router-dom';
import { usePlatform } from '../lib/usePlatform';
import { Download } from 'lucide-react';
import { Button } from './ui/Button';

export function InstallBanner() {
  const { isStandalone } = usePlatform();
  const navigate = useNavigate();

  // If already installed, don't show the banner
  if (isStandalone) {
    return null;
  }

  return (
    <div className="bg-white border-b border-ink/10 px-4 py-3 flex items-center justify-between gap-4 shadow-sm z-50">
      <div className="flex flex-col">
        <h3 className="font-semibold text-ink text-sm leading-tight">Don't miss a day</h3>
        <p className="text-xs text-faded-ink mt-1">Install Curio for daily reminders</p>
      </div>
      <Button
        onClick={() => navigate('/install-nudge')}
        className="!py-2 !px-4 !text-xs whitespace-nowrap !h-auto !rounded-lg"
      >
        <Download size={14} className="mr-1 h-3" />
        Install App
      </Button>
    </div>
  );
}
