import { useState, useEffect } from 'react';
import { cn } from '../lib/utils';
import { motion } from 'framer-motion';
import { Sun, Moon } from 'lucide-react';

import { Link, useNavigate } from 'react-router-dom';

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const navigate = useNavigate();

  useEffect(() => {
    // Check initial preference
    if (document.documentElement.classList.contains('dark') || 
        (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      setTheme('dark');
      document.documentElement.classList.add('dark');
    } else {
      setTheme('light');
      document.documentElement.classList.remove('dark');
    }
  }, []);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleTheme = () => {
    if (theme === 'light') {
      document.documentElement.classList.add('dark');
      localStorage.theme = 'dark';
      setTheme('dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.theme = 'light';
      setTheme('light');
    }
  };

  return (
    <header
      className={cn(
        "fixed top-0 inset-x-0 z-50 transition-all duration-300 ease-in-out py-4",
        scrolled ? "bg-paper/80 backdrop-blur-md border-b border-ink/5 shadow-sm py-3" : "bg-transparent"
      )}
    >
      <div className="max-w-5xl mx-auto px-6 flex items-center justify-between">
        <Link to="/" className="font-display font-semibold text-xl text-ink tracking-tight flex items-center gap-2">
          Curio
        </Link>
        <div className="flex items-center gap-6">
          <button 
            onClick={toggleTheme}
            className="text-ink/70 hover:text-ink transition-colors p-2 rounded-full hover:bg-ink/5"
            aria-label="Toggle Theme"
          >
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          </button>
          <Link to="/login" className="text-sm font-medium text-ink hover:text-ink/70 transition-colors hidden sm:block">
            Log In
          </Link>
          <motion.button
            onClick={() => navigate('/signup')}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="bg-ember text-paper font-medium text-sm px-5 py-2.5 rounded-lg shadow-sm hover:shadow-md hover:bg-ember/90 transition-all cursor-pointer"
          >
            Get Started
          </motion.button>
        </div>
      </div>
    </header>
  );
}
