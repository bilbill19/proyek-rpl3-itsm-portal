'use client';

import React, { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Sun, Moon } from 'lucide-react';

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}

export function ThemeToggle({ className = '', showLabel = false }: ThemeToggleProps) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <button
        type="button"
        aria-label="Toggle theme"
        disabled
        className={`w-9 h-9 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 flex items-center justify-center text-slate-400 opacity-60 ${className}`}
      >
        <Sun className="w-4 h-4" />
      </button>
    );
  }

  const isDark = resolvedTheme === 'dark';

  const toggleTheme = () => {
    setTheme(isDark ? 'light' : 'dark');
  };

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Beralih ke mode terang (Light Mode)' : 'Beralih ke mode gelap (Dark Mode)'}
      title={isDark ? 'Beralih ke Light Mode' : 'Beralih ke Dark Mode'}
      className={`relative inline-flex items-center justify-center h-9 px-3 rounded-xl text-xs font-semibold transition-all duration-200 border select-none cursor-pointer ${
        isDark
          ? 'bg-slate-900/90 border-slate-800 text-amber-400 hover:bg-slate-800 hover:text-amber-300 shadow-md shadow-amber-500/5'
          : 'bg-white border-slate-200 text-indigo-600 hover:bg-slate-100 hover:text-indigo-700 shadow-sm'
      } ${className}`}
    >
      <div className="flex items-center gap-2">
        {isDark ? (
          <Sun className="w-4 h-4 transition-transform duration-300 rotate-0 hover:rotate-45 text-amber-400" />
        ) : (
          <Moon className="w-4 h-4 transition-transform duration-300 -rotate-12 hover:rotate-0 text-indigo-600" />
        )}
        {showLabel && (
          <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
            {isDark ? 'Mode Terang' : 'Mode Gelap'}
          </span>
        )}
      </div>
    </button>
  );
}
