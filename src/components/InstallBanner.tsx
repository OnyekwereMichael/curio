import { useNavigate } from 'react-router-dom';
import { usePlatform } from '../lib/usePlatform';
import { Download, LogOut, User } from 'lucide-react';
import { Button } from './ui/Button';
import { supabase } from '../lib/superbase';
import { useAuth } from '../contexts/AuthContext';

export function InstallBanner() {
  const { isStandalone } = usePlatform();
  const navigate = useNavigate();

  // If already installed, don't show the banner
  if (isStandalone) {
    return null;
  }
  const { user } = useAuth();
  async function handleLogout() {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error signing out:', error.message);
      return;
    }
    navigate('/login');
  }

  const avatarUrl = user?.user_metadata?.avatar_url;

  return (
    <div className="bg-white border-b border-ink/10 px-4 flex items-center gap-3 shadow-sm z-50 font-ui">
      <div className="w-9 h-9 rounded-full bg-ember/10 flex items-center justify-center flex-shrink-0">
        <Download size={16} className="text-ember" />
      </div>

      <div className="flex flex-col flex-1 min-w-0">
        <h3 className="font-semibold text-ink text-sm leading-tight">Don't miss a day</h3>
        <p className="text-xs text-faded-ink mt-0.5 truncate">Install Curio for daily reminders</p>
      </div>

      <Button
        onClick={() => navigate('/install-nudge')}
        className="!py-2 !px-4 !text-xs font-medium whitespace-nowrap !h-auto !rounded-lg flex-shrink-0"
      >
        Install
      </Button>

      <header className="px-6 py-4 flex justify-between items-center  ">
        {/* <h1 className="font-display text-xl font-bold tracking-tight">Curio</h1> */}
        <div className="flex items-center gap-1">
          {/* Placeholder for Stage 14 settings/profile */}
          <button className="text-ink/60 hover:text-ink transition-colors p-1 rounded-full hover:bg-ink/5">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Profile" className="w-8 h-8 rounded-full" />
            ) : (
              <User size={20} className="m-1" />
            )}
          </button>
          <button
            onClick={handleLogout}
            className="text-ink/60 hover:text-ember transition-colors p-2 -mr-2 rounded-full hover:bg-ink/5"
            aria-label="Log out"
            title="Log out"
          >
            <LogOut size={20} />
          </button>
        </div>
      </header>
    </div>
  );
}