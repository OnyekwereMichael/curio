import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
  variant?: 'primary' | 'secondary' | 'outline' | 'quiet';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ children, isLoading, variant = 'primary', className, disabled, ...props }, ref) => {

    const variants = {
      // Solid ember-600 with white (ink-900 in dark mode) text — the only
      // fill in the palette that clears AA for body/button text on ember.
      primary:
        "bg-ember-600 text-on-ember shadow-[0_2px_0_0_var(--ember-700)] hover:brightness-105 active:shadow-[0_0_0_0_var(--ember-700)] active:translate-y-[2px]",
      secondary: "bg-paper border border-line-strong text-ink-900 hover:bg-ink-900/5 shadow-card",
      outline: "bg-transparent border-2 border-ink-900 text-ink-900 hover:bg-ink-900/5",
      quiet: "bg-transparent text-ink-900 hover:bg-ink-900/5",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          "font-ui font-semibold text-sm px-5 py-3.5 rounded-control transition-all duration-150 flex items-center justify-center gap-2",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember-500 focus-visible:ring-offset-2 focus-visible:ring-offset-paper",
          "disabled:opacity-60 disabled:cursor-not-allowed disabled:shadow-none disabled:translate-y-0",
          variants[variant],
          className
        )}
        {...props}
      >
        {isLoading ? (
          <>
            <Loader2 size={20} className="animate-spin" />
            {children}
          </>
        ) : (
          children
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
