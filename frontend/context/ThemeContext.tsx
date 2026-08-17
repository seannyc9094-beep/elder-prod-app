import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const LIGHT_THEME = {
  name: 'light',
  primary: '#5B8FB9',
  secondary: '#7EC8B8',
  accent: '#E8A87C',
  background: '#FFF8F0',
  card: '#FFFFFF',
  text: '#2C3E50',
  textLight: '#7F8C8D',
  border: '#E8DDD4',
  success: '#7EC8B8',
  warning: '#E8A87C',
  tabBar: '#FFF8F0',
  tabActive: '#5B8FB9',
  tabInactive: '#9DB4C0',
  operator: '#E8A87C',
  equals: '#5B8FB9',
  clear: '#E57373',
  noteColors: ['#FFE082', '#A5D6A7', '#90CAF9', '#F48FB1', '#CE93D8', '#FFAB91'],
};

export const DARK_THEME = {
  name: 'dark',
  primary: '#C77DFF',
  secondary: '#9D4EDD',
  accent: '#E0AAFF',
  background: '#10002B',
  card: '#240046',
  text: '#FFFFFF',
  textLight: '#D4B8E8',
  border: '#5A189A',
  success: '#B8E986',
  warning: '#FFB347',
  tabBar: '#10002B',
  tabActive: '#E0AAFF',
  tabInactive: '#7B2CBF',
  operator: '#9D4EDD',
  equals: '#7B2CBF',
  clear: '#FF6B6B',
  noteColors: ['#5A189A', '#7B2CBF', '#9D4EDD', '#6A0DAD', '#8B5CF6', '#4C1D95'],
};

export type ThemeType = typeof LIGHT_THEME;

interface ThemeContextType {
  theme: ThemeType;
  isDark: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const saved = await AsyncStorage.getItem('theme_mode');
      if (saved === 'dark') setIsDark(true);
    } catch (e) {
      console.error('Error loading theme:', e);
    }
  };

  const toggleTheme = async () => {
    try {
      const newMode = !isDark;
      setIsDark(newMode);
      await AsyncStorage.setItem('theme_mode', newMode ? 'dark' : 'light');
    } catch (e) {
      console.error('Error saving theme:', e);
    }
  };

  const theme = isDark ? DARK_THEME : LIGHT_THEME;

  return (
    <ThemeContext.Provider value={{ theme, isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
