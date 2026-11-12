import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

/** The landing page's main call to action: sign up, or jump to Home when already signed in. */
export function useGetStarted() {
  const navigate = useNavigate();
  const { session } = useAuth();
  return {
    signedIn: !!session,
    label: session ? 'Go to home' : "Get started — it's free",
    go: () => navigate(session ? '/home' : '/welcome'),
  };
}
