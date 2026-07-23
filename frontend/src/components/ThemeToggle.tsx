import { useState, useEffect } from 'react';
import { Moon, Sun } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const THEME_KEY = 'theme';

function readInitialIsDark(): boolean {
  if (typeof document === 'undefined') return false;
  // The inline script in index.html already set the class before React mounts;
  // trust it instead of re-reading localStorage, so the toggle and the actual
  // rendered theme can never disagree on first paint.
  return document.documentElement.classList.contains('dark');
}

export function ThemeToggle() {
  const [isDark, setIsDark] = useState<boolean>(readInitialIsDark);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    if (next) {
      document.documentElement.classList.add('dark');
      try {
        localStorage.setItem(THEME_KEY, 'dark');
      } catch {
        // private mode / quota — ignore
      }
    } else {
      document.documentElement.classList.remove('dark');
      try {
        localStorage.setItem(THEME_KEY, 'light');
      } catch {
        // private mode / quota — ignore
      }
    }
  };

  // Keep the toggle in sync if another tab changes the theme (storage event
  // fires cross-tab). Avoids two tabs of the same user showing different
  // themes after one of them toggles.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== THEME_KEY) return;
      const next = e.newValue === 'dark';
      setIsDark(next);
      if (next) document.documentElement.classList.add('dark');
      else document.documentElement.classList.remove('dark');
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  return (
    <button
      onClick={toggleTheme}
      className="relative p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors focus:outline-none group border border-transparent hover:border-zinc-200 dark:hover:border-zinc-700 shadow-soft"
      aria-label="Toggle Theme"
    >
      <AnimatePresence mode="wait" initial={false}>
        {isDark ? (
          <motion.div
            key="moon"
            initial={{ opacity: 0, rotate: -30 }}
            animate={{ opacity: 1, rotate: 0 }}
            exit={{ opacity: 0, rotate: 30 }}
          >
            <Moon className="w-4 h-4 text-zinc-400 group-hover:text-zinc-100 transition-colors" />
          </motion.div>
        ) : (
          <motion.div
            key="sun"
            initial={{ opacity: 0, rotate: -30 }}
            animate={{ opacity: 1, rotate: 0 }}
            exit={{ opacity: 0, rotate: 30 }}
          >
            <Sun className="w-4 h-4 text-zinc-500 group-hover:text-zinc-900 transition-colors" />
          </motion.div>
        )}
      </AnimatePresence>
    </button>
  );
}