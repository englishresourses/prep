import { useState, useEffect } from 'react';
import { getAppSettings, saveAppSettings } from '../services/storage';

export function useTheme() {
  const [theme, setTheme] = useState(() => {
    const settings = getAppSettings();
    return settings?.theme || 'light';
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
