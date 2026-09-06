import { NavLink, useNavigate } from 'react-router-dom';
import { Home, BookOpen, LogOut, Download, X, Menu, Sparkles } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/superbase';
import { usePlatform } from '../lib/usePlatform';
import { cn } from '../lib/utils';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

function NavItem({
  to,
  icon: Icon,
  label,
  onClick,
}: {
  to: string;
  icon: React.ElementType;
  label: string;
  onClick?: () => void;
}) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200',
          isActive
            ? 'bg-ember/10 text-ember'
            : 'text-faded-ink hover:text-ink hover:bg-ink/5'
        )
      }
    >
      <Icon size={18} strokeWidth={2} />
      <span>{label}</span>
    </NavLink>
  );
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { isStandalone } = usePlatform();

  const fullName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split('@')[0] ||
    'Learner';

  const avatarUrl = user?.user_metadata?.avatar_url;

  // First letter of the name for fallback avatar
  const initials = fullName
    .split(' ')
    .map((n: string) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate('/login');
  }

  return (
    <>
      {/* Mobile overlay backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-ink/30 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={cn(
          // Base styles
          'fixed top-0 left-0 h-full w-72 bg-paper border-r border-ink/8 z-50 flex flex-col',
          'transition-transform duration-300 ease-in-out',
          // Desktop: always visible
          'lg:translate-x-0 lg:static lg:h-screen lg:sticky lg:top-0',
          // Mobile: slide in/out
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-ember flex items-center justify-center">
              <Sparkles size={16} className="text-white" strokeWidth={2.5} />
            </div>
            <span className="font-display font-bold text-xl text-ink tracking-tight">Curio</span>
          </div>
          {/* Mobile close button */}
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-faded-ink hover:text-ink hover:bg-ink/5 transition-colors"
          >
            <X size={18} />
          </button>
        </div>


        {/* Navigation */}
        <nav className="flex-1 px-3 flex flex-col gap-1 overflow-y-auto">
          <p className="text-xs font-semibold text-faded-ink uppercase tracking-wider px-4 mb-2 mt-2">
            Learn
          </p>
          <NavItem to="/home" icon={Home} label="Home" onClick={onClose} />
          <NavItem to="/saved" icon={BookOpen} label="Saved Words" onClick={onClose} />
        </nav>

        {/* Bottom actions */}
        <div className="p-4 flex flex-col gap-2 border-t border-ink/5">



          {/* Install nudge — only when not already a PWA */}
          {!isStandalone && (
            <button
              onClick={() => { navigate('/install-nudge'); onClose(); }}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-moss hover:bg-moss/8 transition-all duration-200 w-full text-left"
            >
              <Download size={18} strokeWidth={2} />
              <span>Install App</span>
            </button>
          )}

          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-faded-ink hover:text-ember hover:bg-ember/5 transition-all duration-200 w-full text-left"
          >
            <LogOut size={18} strokeWidth={2} />
            <span>Log out</span>
          </button>

          {/* User profile */}
          <div className=" mb-4 p-4 rounded-2xl bg-ink/[0.03] border border-ink/5">
            <div className="flex items-center gap-3">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={fullName}
                  className="w-10 h-10 rounded-full object-cover ring-2 ring-ember/20 flex-shrink-0"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-ember/15 text-ember flex items-center justify-center text-sm font-bold flex-shrink-0">
                  {initials}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-semibold text-ink truncate">{fullName}</p>
                <p className="text-xs text-faded-ink truncate">{user?.email}</p>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

/**
 * Hamburger button rendered in the mobile top bar.
 */
export function SidebarToggle({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="p-2 rounded-xl text-faded-ink hover:text-ink hover:bg-ink/5 transition-colors"
      aria-label="Open menu"
    >
      <Menu size={22} />
    </button>
  );
}
