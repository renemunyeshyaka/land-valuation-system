// LandVal Mobile — Design Tokens & Theme
// Mirrors the web frontend's emerald/amber color palette

export const COLORS = {
  primary: '#0b5e42',       // Emerald-900
  primaryLight: '#1f6e4a',  // Emerald-800
  primaryDark: '#064e3b',   // Emerald-950
  accent: '#f59e0b',        // Amber-500
  accentLight: '#fbbf24',   // Amber-400
  white: '#ffffff',
  background: '#fafaf9',    // Stone-50
  surface: '#ffffff',
  border: '#e5e7eb',        // Gray-200
  text: '#1f2937',          // Gray-800
  textSecondary: '#6b7280', // Gray-500
  textLight: '#9ca3af',     // Gray-400
  error: '#ef4444',         // Red-500
  success: '#10b981',       // Emerald-500
  warning: '#f59e0b',       // Amber-500
  info: '#3b82f6',          // Blue-500
};

export const FONTS = {
  regular: { fontFamily: 'System', fontWeight: '400' },
  medium: { fontFamily: 'System', fontWeight: '500' },
  semibold: { fontFamily: 'System', fontWeight: '600' },
  bold: { fontFamily: 'System', fontWeight: '700' },
};

export const SIZES = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  padding: 16,
  radius: 12,
  radiusLg: 16,
  radiusFull: 999,
};

export const SHADOWS = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  button: {
    shadowColor: '#0b5e42',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
};
