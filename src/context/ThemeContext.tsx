import React, { createContext, useContext, useEffect, useState } from 'react';
import { ReaderSettings } from '../types';

interface ThemeContextType {
  theme: 'light' | 'dark' | 'system';
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  isDark: boolean;
  readerSettings: ReaderSettings;
  updateReaderSettings: (settings: Partial<ReaderSettings>) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<'light' | 'dark' | 'system'>(() => {
    return (localStorage.getItem('tintuc_theme') as 'light' | 'dark' | 'system') || 'dark';
  });

  const [readerSettings, setReaderSettingsState] = useState<ReaderSettings>(() => {
    const saved = localStorage.getItem('tintuc_reader_settings');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return {
      fontSize: 'md',
      fontStyle: 'sans',
      theme: 'dark',
      speechRate: 1
    };
  });

  const [isDark, setIsDark] = useState<boolean>(true);

  useEffect(() => {
    const root = document.documentElement;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const applyTheme = () => {
      let activeDark = false;
      if (theme === 'dark') {
        activeDark = true;
      } else if (theme === 'light') {
        activeDark = false;
      } else {
        activeDark = mediaQuery.matches;
      }

      if (activeDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
      setIsDark(activeDark);
    };

    applyTheme();
    localStorage.setItem('tintuc_theme', theme);

    const listener = () => {
      if (theme === 'system') applyTheme();
    };
    mediaQuery.addEventListener('change', listener);
    return () => mediaQuery.removeEventListener('change', listener);
  }, [theme]);

  const setTheme = (newTheme: 'light' | 'dark' | 'system') => {
    setThemeState(newTheme);
  };

  const updateReaderSettings = (partial: Partial<ReaderSettings>) => {
    setReaderSettingsState(prev => {
      const next = { ...prev, ...partial };
      localStorage.setItem('tintuc_reader_settings', JSON.stringify(next));
      return next;
    });
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, isDark, readerSettings, updateReaderSettings }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
};
