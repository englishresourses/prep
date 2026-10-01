import { useState, useEffect } from 'react';
import { getAppSettings, saveAppSettings } from '../services/storage';

export function useTheme() {
  const [theme, setTheme] = useState(() => {
    const settings = getAppSettings();
    if (settings.theme) return settings.theme;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    saveAppSettings({ theme });
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  return { theme, toggleTheme, isDark: theme === 'dark' };
}
