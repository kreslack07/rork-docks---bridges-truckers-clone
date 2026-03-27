export interface ThemeColors {
  background: string;
  surface: string;
  elevated: string;
  card: string;
  primary: string;
  primaryDark: string;
  primaryLight: string;
  danger: string;
  dangerLight: string;
  success: string;
  successLight: string;
  warning: string;
  warningLight: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  borderLight: string;
  overlay: string;
  white: string;
  black: string;
  mapBridge: string;
  mapWire: string;
  mapDock: string;
  mapSafe: string;
  userMarker: string;
  waze: string;
}

export const DarkTheme: ThemeColors = {
  background: '#0F1419',
  surface: '#1C2128',
  elevated: '#262D37',
  card: '#1E252E',
  primary: '#F59E0B',
  primaryDark: '#D97706',
  primaryLight: '#FBBF24',
  danger: '#EF4444',
  dangerLight: '#FCA5A5',
  success: '#22C55E',
  successLight: '#86EFAC',
  warning: '#F97316',
  warningLight: '#FDBA74',
  text: '#E8ECF0',
  textSecondary: '#7D8590',
  textMuted: '#4B5563',
  border: '#2D333B',
  borderLight: '#3D4450',
  overlay: 'rgba(0, 0, 0, 0.6)',
  white: '#FFFFFF',
  black: '#000000',
  mapBridge: '#EF4444',
  mapWire: '#F97316',
  mapDock: '#F59E0B',
  mapSafe: '#22C55E',
  userMarker: '#4A90D9',
  waze: '#33ccff',
};

export const LightTheme: ThemeColors = {
  background: '#F5F5F0',
  surface: '#FFFFFF',
  elevated: '#F0F0EB',
  card: '#FFFFFF',
  primary: '#D97706',
  primaryDark: '#B45309',
  primaryLight: '#F59E0B',
  danger: '#DC2626',
  dangerLight: '#FCA5A5',
  success: '#16A34A',
  successLight: '#86EFAC',
  warning: '#EA580C',
  warningLight: '#FDBA74',
  text: '#1A1A1A',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  border: '#E5E5E0',
  borderLight: '#D4D4CF',
  overlay: 'rgba(0, 0, 0, 0.4)',
  white: '#FFFFFF',
  black: '#000000',
  mapBridge: '#DC2626',
  mapWire: '#EA580C',
  mapDock: '#D97706',
  mapSafe: '#16A34A',
  userMarker: '#4A90D9',
  waze: '#33ccff',
};

const Colors = DarkTheme;
export default Colors;
