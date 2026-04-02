import { useCallback, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import createContextHook from '@nkzw/create-context-hook';
import { DarkTheme, LightTheme, ThemeColors } from '@/constants/colors';
import { usePersistedStringQuery } from '@/hooks/usePersistedQuery';
import { logger } from '@/utils/logger';

const THEME_KEY = 'app_theme_mode';

export type ThemeMode = 'dark' | 'light' | 'system';

function isValidThemeMode(v: string | null): v is ThemeMode {
  return v === 'dark' || v === 'light' || v === 'system';
}

export const [ThemeProvider, useTheme] = createContextHook(() => {
  const systemScheme = useColorScheme();

  const persisted = usePersistedStringQuery({
    key: THEME_KEY,
    queryKey: ['themeMode'],
    defaultValue: 'dark',
  });

  const mode: ThemeMode = isValidThemeMode(persisted.value) ? persisted.value : 'dark';
  const isLoaded = !persisted.isLoading;

  const { setValue: setPersistedValue } = persisted;

  const setThemeMode = useCallback((newMode: ThemeMode) => {
    setPersistedValue(newMode);
    logger.log('[Theme] Saved mode:', newMode);
  }, [setPersistedValue]);

  const isDark = useMemo(() => {
    if (mode === 'system') {
      return systemScheme !== 'light';
    }
    return mode === 'dark';
  }, [mode, systemScheme]);

  const colors: ThemeColors = useMemo(() => {
    return isDark ? DarkTheme : LightTheme;
  }, [isDark]);

  return useMemo(() => ({
    mode,
    isDark,
    colors,
    isLoaded,
    setThemeMode,
  }), [mode, isDark, colors, isLoaded, setThemeMode]);
});
