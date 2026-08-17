import React from 'react';
import { Sun, Moon, Laptop } from 'lucide-react';
import { useTheme, Theme } from '../context/ThemeContext';

interface ThemeToggleProps {
  variant?: 'icon' | 'dropdown' | 'pill' | 'switch';
  className?: string;
  showLabel?: boolean;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  variant = 'icon',
  className = '',
  showLabel = false,
}) => {
  const { theme, resolvedTheme, setTheme, toggleTheme } = useTheme();

  if (variant === 'pill') {
    return (
      <div
        className={`inline-flex items-center p-1 bg-gray-100 dark:bg-gray-800 rounded-full border border-gray-200 dark:border-gray-700 transition-colors ${className}`}
        role="group"
        aria-label="Theme selector"
      >
        <button
          type="button"
          onClick={() => setTheme('light')}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${
            theme === 'light'
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-2xs'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
          aria-pressed={theme === 'light'}
          title="Light Mode"
        >
          <Sun className="w-3.5 h-3.5 text-amber-500" />
          {showLabel && <span>Light</span>}
        </button>
        <button
          type="button"
          onClick={() => setTheme('dark')}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${
            theme === 'dark'
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-2xs'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
          aria-pressed={theme === 'dark'}
          title="Dark Mode"
        >
          <Moon className="w-3.5 h-3.5 text-indigo-400" />
          {showLabel && <span>Dark</span>}
        </button>
        <button
          type="button"
          onClick={() => setTheme('system')}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${
            theme === 'system'
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-2xs'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
          aria-pressed={theme === 'system'}
          title="System Preference"
        >
          <Laptop className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
          {showLabel && <span>Auto</span>}
        </button>
      </div>
    );
  }

  // Default 'icon' button: seamless toggle between light & dark
  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`p-2.5 rounded-full text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 border border-transparent hover:border-gray-200 dark:hover:border-gray-700 transition-all relative flex items-center justify-center focus:outline-hidden focus:ring-2 focus:ring-[#ff6452]/40 ${className}`}
      aria-label={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode`}
      title={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode`}
    >
      {resolvedTheme === 'dark' ? (
        <Sun className="w-5 h-5 text-amber-400 transition-transform duration-300 rotate-0 hover:rotate-45" />
      ) : (
        <Moon className="w-5 h-5 text-slate-700 transition-transform duration-300 -rotate-12 hover:rotate-0" />
      )}
      {showLabel && (
        <span className="ml-2 text-xs font-semibold capitalize text-gray-700 dark:text-gray-200">
          {resolvedTheme === 'dark' ? 'Light Mode' : 'Dark Mode'}
        </span>
      )}
    </button>
  );
};
