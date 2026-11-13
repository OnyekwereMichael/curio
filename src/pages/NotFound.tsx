import { useNavigate } from 'react-router-dom';
import { Otter } from '../components/Otter';

export function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-paper flex flex-col items-center justify-center px-6 text-center font-ui">
      <p className="font-display text-7xl font-bold text-ink-900/10 mb-2 select-none">404</p>
      <Otter mood="curious" size={96} className="mb-5 -mt-16" />
      <h1 className="font-display text-title font-bold text-ink-900 mb-2">This page swam off</h1>
      <p className="text-sm text-ink-500 leading-relaxed max-w-xs mb-6">Let's head back to today.</p>
      <button
        onClick={() => navigate('/home')}
        className="px-6 py-3 rounded-control bg-ember-600 text-on-ember text-sm font-semibold hover:brightness-105 transition-all"
      >
        Go home
      </button>
    </div>
  );
}
