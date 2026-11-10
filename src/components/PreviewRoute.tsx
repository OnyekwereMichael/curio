import { Navigate } from 'react-router-dom';
import { PREVIEW_FEATURES } from '../lib/featureFlags';

/**
 * Gates a preview-only route. Composes with <ProtectedRoute> (preview
 * screens are also real-auth-gated) — wrap this inside ProtectedRoute,
 * not the other way around, so a signed-out visit to a preview URL goes
 * to /login first. With the flag off, bounces to /home even if deep-linked.
 */
export function PreviewRoute({ children }: { children: React.ReactNode }) {
  if (!PREVIEW_FEATURES) return <Navigate to="/home" replace />;
  return <>{children}</>;
}
