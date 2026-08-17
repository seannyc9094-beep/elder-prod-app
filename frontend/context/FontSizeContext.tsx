import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type FontSizeOption = 'small' | 'medium' | 'large' | 'xlarge';

interface FontSizes {
  title: number;
  header: number;
  body: number;
  label: number;
  small: number;
}

export const FONT_SIZES: Record<FontSizeOption, FontSizes> = {
  small: {
    title: 26,
    header: 18,
    body: 14,
    label: 12,
    small: 10,
  },
  medium: {
    title: 32,
    header: 22,
    body: 18,
    label: 14,
    small: 12,
  },
  large: {
    title: 38,
    header: 26,
    body: 22,
    label: 18,
    small: 14,
  },
  xlarge: {
    title: 44,
    header: 30,
    body: 26,
    label: 20,
    small: 16,
  },
};

interface FontSizeContextType {
  fontSizeOption: FontSizeOption;
  fontSize: FontSizes;
  setFontSize: (size: FontSizeOption) => void;
}

const FontSizeContext = createContext<FontSizeContextType | undefined>(undefined);

export function FontSizeProvider({ children }: { children: ReactNode }) {
  const [fontSizeOption, setFontSizeOption] = useState<FontSizeOption>('medium');

  useEffect(() => {
    loadFontSize();
  }, []);

  const loadFontSize = async () => {
    try {
      const saved = await AsyncStorage.getItem('font_size');
      if (saved && (saved === 'small' || saved === 'medium' || saved === 'large' || saved === 'xlarge')) {
        setFontSizeOption(saved as FontSizeOption);
      }
    } catch (e) {
      console.error('Error loading font size:', e);
    }
  };

  const setFontSize = async (size: FontSizeOption) => {
    try {
      setFontSizeOption(size);
      await AsyncStorage.setItem('font_size', size);
    } catch (e) {
      console.error('Error saving font size:', e);
    }
  };

  const fontSize = FONT_SIZES[fontSizeOption];

  return (
    <FontSizeContext.Provider value={{ fontSizeOption, fontSize, setFontSize }}>
      {children}
    </FontSizeContext.Provider>
  );
}

export function useFontSize() {
  const context = useContext(FontSizeContext);
  if (!context) {
    throw new Error('useFontSize must be used within a FontSizeProvider');
  }
  return context;
}
