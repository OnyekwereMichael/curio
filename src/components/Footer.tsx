import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="bg-paper py-12 px-6 border-t border-ink/5">
      <div className="max-w-5xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex flex-col items-center md:items-start gap-1">
          <span className="font-display font-semibold text-lg text-ink">Daily Discover</span>
          <span className="text-sm text-faded-ink">One word. One fact. Every day.</span>
        </div>

        <div className="flex gap-8">
          <Link to="/login" className="text-sm font-medium text-faded-ink hover:text-ink transition-colors">
            Log In
          </Link>
          <Link to="/privacy" className="text-sm font-medium text-faded-ink hover:text-ink transition-colors">
            Privacy Policy
          </Link>
          <Link to="/contact" className="text-sm font-medium text-faded-ink hover:text-ink transition-colors">
            Contact
          </Link>
        </div>

        <div className="text-sm text-faded-ink/80">
          &copy; {new Date().getFullYear()} Daily Discover.
        </div>
      </div>
    </footer>
  );
}
