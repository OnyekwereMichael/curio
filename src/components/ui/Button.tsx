import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
  variant?: 'primary' | 'secondary' | 'outline';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ children, isLoading, variant = 'primary', className, disabled, ...props }, ref) => {

    const variants = {
      primary: "bg-ember text-paper shadow-sm hover:shadow-md hover:bg-ember/90",
      secondary: "bg-paper border border-ink/20 text-ink hover:bg-ink/5 shadow-sm",
      outline: "bg-transparent border-2 border-ink text-ink hover:bg-ink/5"
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          "font-semibold text-sm px-5 py-3.5 rounded-xl transition-all flex items-center justify-center gap-2",
          "disabled:opacity-70 disabled:cursor-not-allowed",
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
