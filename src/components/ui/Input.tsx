import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle } from 'lucide-react';
import { cn } from '../../lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  touched?: boolean;
  rightElement?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, touched, rightElement, className, id, ...props }, ref) => {
    const isInvalid = touched && !!error;
    const inputId = id || props.name;

    return (
      <div className="flex flex-col gap-1.5">
        <label htmlFor={inputId} className="text-sm font-medium text-ink-900 font-ui">
          {label}
        </label>
        <div className="relative">
          <input
            id={inputId}
            ref={ref}
            className={cn(
              "w-full bg-surface border rounded-control px-4 py-3 text-ink-900 text-sm placeholder:text-ink-500/60 focus:outline-none focus:ring-2 transition-all placeholder:text-sm font-ui",
              isInvalid
                ? "border-ember-600 focus:ring-ember-600/20"
                : "border-line-strong focus:border-ink-900/50 focus:ring-ink-900/10",
              rightElement ? "pr-12" : "pr-10",
              className
            )}
            aria-invalid={isInvalid}
            aria-describedby={isInvalid ? `${inputId}-error` : undefined}
            {...props}
          />

          <div className="absolute inset-y-0 right-0 pr-2 flex items-center gap-1">
            {isInvalid && (
              <span className="text-ember-600 pointer-events-none">
                <AlertCircle size={18} />
              </span>
            )}
            {rightElement}
          </div>
        </div>
        <AnimatePresence>
          {isInvalid && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="text-ember-600 text-sm mt-1"
              id={`${inputId}-error`}
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }
);

Input.displayName = 'Input';
