// Shared Framer Motion spring presets — Field Journal motion spec.
export const spring = {
  snappy: { type: 'spring', stiffness: 500, damping: 30 } as const,
  soft: { type: 'spring', stiffness: 260, damping: 24 } as const,
  bouncy: { type: 'spring', stiffness: 400, damping: 14 } as const,
};
