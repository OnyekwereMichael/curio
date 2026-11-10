import { NavLink, useNavigate } from 'react-router-dom';
import { Home, BookOpen, LogOut, Download, Settings, Search, LineChart } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/superbase';
import { usePlatform } from '../lib/usePlatform';
import { cn } from '../lib/utils';
import logo from '../../public/icon-192.png'

export const NAV_ITEMS = [
  { to: '/home', icon: Home, label: 'Home' },
  { to: '/collection', icon: BookOpen, label: 'My Collection' },
  { to: '/progress', icon: LineChart, label: 'Progress' },
  { to: '/dictionary', icon: Search, label: 'Dictionary' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

function NavItem({
  to,
  icon: Icon,
  label,
}: {
  to: string;
  icon: React.ElementType;
  label: string;
}) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 px-4 py-3 rounded-control text-sm font-medium font-ui transition-all duration-200',
          isActive
            ? 'bg-ember-50 text-ember-600 font-semibold'
            : 'text-ink-500 hover:text-ink-900 hover:bg-ink-900/5'
        )
      }
    >
      {({ isActive }) => (
        <>
          <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
          <span>{label}</span>
        </>
      )}
    </NavLink>
  );
}

/**
 * Desktop left rail — 240px, always visible at lg+. On mobile the same
 * routes live in <BottomNav>, so this component renders nothing below lg.
 */
export function Sidebar() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { isStandalone } = usePlatform();

  const fullName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split('@')[0] ||
    'Learner';

  const avatarUrl = user?.user_metadata?.avatar_url;

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
    <aside className="hidden lg:flex flex-col w-60 shrink-0 h-screen sticky top-0 bg-paper border-r border-line">
      {/* Header */}
      <div className="flex items-center gap-2 px-6 pt-6 pb-4">
        <img src={logo} alt="Curi" className="w-8 h-8 rounded-lg" />
        <span className="font-display font-bold text-xl text-ink-900 tracking-tight">Curi</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 flex flex-col gap-1 overflow-y-auto">
        <p className="text-xs font-semibold text-ink-500 uppercase tracking-wider px-4 mb-2 mt-2 font-ui">
          Learn
        </p>
        {NAV_ITEMS.map((item) => (
          <NavItem key={item.to} {...item} />
        ))}
      </nav>

      {/* Bottom actions */}
      <div className="p-4 flex flex-col gap-2 border-t border-line">
        {!isStandalone && (
          <button
            onClick={() => navigate('/install-nudge')}
            className="flex items-center gap-3 px-4 py-3 rounded-control text-sm font-medium font-ui text-ink-500 hover:bg-moss-50 hover:text-moss-600 transition-all duration-200 w-full text-left"
          >
            <Download size={18} strokeWidth={2} />
            <span>Install App</span>
          </button>
        )}

        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-3 rounded-control text-sm font-medium font-ui text-ink-500 hover:text-ember-600 hover:bg-ember-50 transition-all duration-200 w-full text-left"
        >
          <LogOut size={18} strokeWidth={2} />
          <span>Log out</span>
        </button>

        <div className="mb-2 p-4 rounded-card bg-surface border border-line shadow-card">
          <div className="flex items-center gap-3">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={fullName}
                className="w-10 h-10 rounded-full object-cover ring-2 ring-ember-500/20 flex-shrink-0"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-ember-50 text-ember-600 flex items-center justify-center text-sm font-bold flex-shrink-0 font-ui">
                {initials}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-sm font-semibold text-ink-900 truncate font-ui">{fullName}</p>
              <p className="text-xs text-ink-500 truncate font-ui">{user?.email}</p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
