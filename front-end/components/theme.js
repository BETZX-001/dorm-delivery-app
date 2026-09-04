// src/theme/theme.js
// Central place to drop in your Figma design tokens (colors, spacing, typography).
// Every screen/component below imports from here instead of hardcoding values,
// so re-skinning the app later means editing this file only.

export const colors = {
  primary: '#4F46E5',
  primaryDark: '#3730A3',
  secondary: '#F59E0B',
  background: '#FFFFFF',
  surface: '#F3F4F6',
  border: '#E5E7EB',
  textPrimary: '#111827',
  textSecondary: '#6B7280',
  danger: '#DC2626',
  success: '#16A34A',
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
  md: 12,
  lg: 20,
  pill: 999,
};

export const typography = {
  h1: { fontSize: 28, fontWeight: '700' },
  h2: { fontSize: 22, fontWeight: '700' },
  body: { fontSize: 16, fontWeight: '400' },
  caption: { fontSize: 13, fontWeight: '400' },
  button: { fontSize: 16, fontWeight: '600' },
};
