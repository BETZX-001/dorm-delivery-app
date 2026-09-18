// src/theme/theme.js
import { Platform } from 'react-native';

// Native system fonts give Thai text excellent readability without a remote
// font download. Android resolves this to the professional Noto Sans Thai UI font.
export const fontFamily = Platform.select({ ios: 'Avenir Next', android: 'sans-serif', default: 'System' });

export const colors = {
  primary: '#FF672D',
  primaryDark: '#E94E16',
  runner: '#06B953',
  runnerDark: '#039A43',
  contact: '#0F766E',
  contactDark: '#0B5F59',
  contactSoft: '#E8F6F4',
  contactBorder: '#B9E3DE',
  secondary: '#FFB800',
  background: '#F7F8FA',
  surface: '#FFFFFF',
  muted: '#F1F3F6',
  border: '#E4E8EF',
  textPrimary: '#10213E',
  textSecondary: '#94A0B5',
  danger: '#F04D5D',
  success: '#06B953',
  softOrange: '#FFF0EA',
  softGreen: '#E6F9EF',
  white: '#FFFFFF',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const radii = {
  sm: 6,
  md: 14,
  lg: 22,
  pill: 999,
};

export const typography = {
  h1: { fontFamily, fontSize: 28, fontWeight: '800', letterSpacing: -0.35 },
  h2: { fontFamily, fontSize: 22, fontWeight: '800', letterSpacing: -0.2 },
  body: { fontFamily, fontSize: 16, fontWeight: '400' },
  caption: { fontFamily, fontSize: 13, fontWeight: '500' },
  button: { fontFamily, fontSize: 16, fontWeight: '700' },
};
