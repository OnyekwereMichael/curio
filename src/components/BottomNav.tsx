import { NavLink } from 'react-router-dom';
import { cn } from '../lib/utils';
import { NAV_ITEMS } from './Sidebar';

/**
 * Mobile tab bar — fixed to the bottom, same five routes as the desktop
 * rail. Active tab gets ember text, a bolder icon and a top indicator bar.
 */
export function BottomNav() {
  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-paper/95 backdrop-blur-md border-t border-line pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-stretch justify-around">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'relative flex flex-col items-center justify-center gap-1 flex-1 py-2.5 text-[11px] font-medium font-ui transition-colors',
                isActive ? 'text-ember-600' : 'text-ink-500'
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span className="absolute top-0 h-0.5 w-8 rounded-full bg-ember-600" aria-hidden="true" />
                )}
                <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                <span>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
