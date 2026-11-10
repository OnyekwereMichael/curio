/**
 * Gates every screen/UI element built on mock data because the backend
 * doesn't support it yet. Unset (the default in any real deploy) means
 * real users see exactly what the app does today, plus whatever's real
 * in the redesign. See docs/BACKEND_TODO.md for what's behind this flag
 * and how to turn each piece on for real.
 */
export const PREVIEW_FEATURES = import.meta.env.VITE_PREVIEW_FEATURES === 'true';
