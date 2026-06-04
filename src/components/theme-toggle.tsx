'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) return <div className={cn("w-10 h-10 md:w-9 md:h-9", className)} />;

  const isDark = theme === 'dark';

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className={cn(
        "w-10 h-10 md:w-9 md:h-9 flex items-center justify-center rounded-lg transition-colors touch-manipulation",
        "border border-[#e3e8ee] bg-[#f4f7f9] hover:bg-[#e8ecf0] text-[#081d3a]",
        "dark:border-[hsl(222,47%,19%)] dark:bg-[hsl(222,47%,14%)] dark:hover:bg-[hsl(222,47%,18%)] dark:text-[hsl(214,20%,86%)]",
        className
      )}
      aria-label="Переключить тему"
    >
      {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </button>
  );
}
