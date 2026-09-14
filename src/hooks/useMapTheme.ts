import { useState, useEffect, useCallback } from 'react';

export type MapTheme = 'light' | 'dark';

const STORAGE_KEY = 'cadete_os_map_theme';
const THEME_CHANGE_EVENT = 'cadete_os_map_theme_changed';

export function getStoredMapTheme(): MapTheme {
  if (typeof window === 'undefined') return 'light';
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved === 'dark' ? 'dark' : 'light';
}

export function setStoredMapTheme(theme: MapTheme) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, theme);
  window.dispatchEvent(new CustomEvent(THEME_CHANGE_EVENT, { detail: theme }));
}

export function useMapTheme() {
  const [theme, setTheme] = useState<MapTheme>(() => getStoredMapTheme());

  useEffect(() => {
    const handleThemeChange = (e: Event) => {
      const customEvent = e as CustomEvent<MapTheme>;
      if (customEvent.detail) {
        setTheme(customEvent.detail);
      }
    };

    window.addEventListener(THEME_CHANGE_EVENT, handleThemeChange);
    return () => {
      window.removeEventListener(THEME_CHANGE_EVENT, handleThemeChange);
    };
  }, []);

  const toggleTheme = useCallback(() => {
    const nextTheme: MapTheme = theme === 'light' ? 'dark' : 'light';
    setStoredMapTheme(nextTheme);
    setTheme(nextTheme);
  }, [theme]);

  const setSpecificTheme = useCallback((newTheme: MapTheme) => {
    setStoredMapTheme(newTheme);
    setTheme(newTheme);
  }, []);

  return {
    mapTheme: theme,
    isDark: theme === 'dark',
    toggleMapTheme: toggleTheme,
    setMapTheme: setSpecificTheme
  };
}
