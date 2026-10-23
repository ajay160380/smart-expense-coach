import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS, DARK_COLORS, getThemeColors } from '../utils/theme';

const THEME_STORAGE_KEY = '@app_theme_preference';

const ThemeContext = createContext({
  theme: 'system',
  isDark: false,
  colors: COLORS,
  setTheme: () => {},
  toggleTheme: () => {},
});

export const ThemeProvider = ({ children }) => {
  const [theme, setThemeState] = useState('system'); // 'light' | 'dark' | 'system'
  const [systemScheme, setSystemScheme] = useState(Appearance.getColorScheme() || 'light');

  // Load saved preference on mount
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (saved && (saved === 'light' || saved === 'dark' || saved === 'system')) {
          setThemeState(saved);
        }
      } catch (e) {
        console.warn('Failed to load theme preference', e);
      }
    })();
  }, []);

  // Listen to system Appearance changes
  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemScheme(colorScheme || 'light');
    });
    return () => subscription.remove();
  }, []);

  // Resolve active dark state
  const isDark = useMemo(() => {
    if (theme === 'dark') return true;
    if (theme === 'light') return false;
    return systemScheme === 'dark';
  }, [theme, systemScheme]);

  // Dynamic theme colors
  const colors = useMemo(() => getThemeColors(isDark), [isDark]);

  const setTheme = async (mode) => {
    try {
      setThemeState(mode);
      await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
    } catch (e) {
      console.warn('Failed to save theme preference', e);
    }
  };

  const toggleTheme = () => {
    setTheme(isDark ? 'light' : 'dark');
  };

  const value = useMemo(
    () => ({
      theme,
      isDark,
      colors,
      setTheme,
      toggleTheme,
    }),
    [theme, isDark, colors]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export default ThemeContext;
