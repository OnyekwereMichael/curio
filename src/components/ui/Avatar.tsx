import { useState } from 'react';
import { cn } from '../../lib/utils';

const SIZES = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-14 h-14 text-lg',
  xl: 'w-20 h-20 text-2xl',
} as const;

interface AvatarProps {
  name: string;
  src?: string | null;
  size?: keyof typeof SIZES;
  className?: string;
}

export function initialsOf(name: string): string {
  return (
    name
      .split(' ')
      .filter(Boolean)
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || '?'
  );
}

/** Round avatar — photo when there is one (and it loads), initials otherwise. */
export function Avatar({ name, src, size = 'md', className }: AvatarProps) {
  const [failed, setFailed] = useState(false);
  const base = cn('rounded-full flex-shrink-0', SIZES[size], className);

  if (src && !failed) {
    return (
      <img
        src={src}
        alt={name}
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className={cn(base, 'object-cover')}
      />
    );
  }
  return (
    <div className={cn(base, 'bg-ember-50 text-ember-600 flex items-center justify-center font-bold font-ui')} aria-label={name}>
      {initialsOf(name)}
    </div>
  );
}
