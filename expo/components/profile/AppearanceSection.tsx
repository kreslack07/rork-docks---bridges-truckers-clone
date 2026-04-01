import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Moon, Sun, Monitor } from 'lucide-react-native';
import { ThemeColors } from '@/constants/colors';
import { ThemeMode } from '@/context/ThemeContext';
import { cachedStyles } from '@/utils/styleCache';

interface AppearanceSectionProps {
  colors: ThemeColors;
  mode: ThemeMode;
  isDark: boolean;
  onThemeChange: (mode: ThemeMode) => void;
}

const THEME_OPTIONS: { key: ThemeMode; label: string; icon: typeof Moon }[] = [
  { key: 'dark', label: 'Dark', icon: Moon },
  { key: 'light', label: 'Light', icon: Sun },
  { key: 'system', label: 'Auto', icon: Monitor },
];

function AppearanceSection({ colors, mode, isDark, onThemeChange }: AppearanceSectionProps) {
  const styles = cachedStyles(makeStyles, colors);

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        {isDark ? <Moon size={16} color={colors.textSecondary} /> : <Sun size={16} color={colors.textSecondary} />}
        <Text style={styles.sectionTitle}>Appearance</Text>
      </View>
      <View style={styles.themeRow}>
        {THEME_OPTIONS.map(({ key, label, icon: Icon }) => (
          <TouchableOpacity
            key={key}
            style={[styles.themeBtn, mode === key && styles.themeBtnActive]}
            onPress={() => onThemeChange(key)}
            activeOpacity={0.7}
          >
            <Icon size={16} color={mode === key ? colors.primary : colors.textMuted} />
            <Text style={[styles.themeBtnText, mode === key && styles.themeBtnTextActive]}>
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

export default React.memo(AppearanceSection);

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700' as const,
    flex: 1,
  },
  themeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  themeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingVertical: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  themeBtnActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  themeBtnText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600' as const,
  },
  themeBtnTextActive: {
    color: colors.primary,
  },
});
