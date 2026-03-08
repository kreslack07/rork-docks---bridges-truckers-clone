import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { X } from 'lucide-react-native';
import { ThemeColors } from '@/constants/colors';

interface FilterIndicatorProps {
  colors: ThemeColors;
  label: string;
  insetTop: number;
  onClear: () => void;
}

function FilterIndicatorComponent({ colors, label, insetTop, onClear }: FilterIndicatorProps) {
  const styles = makeStyles(colors);

  return (
    <View style={[styles.container, { top: insetTop + 12 }]}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity onPress={onClear} hitSlop={8}>
        <X size={12} color={colors.white} />
      </TouchableOpacity>
    </View>
  );
}

export default memo(FilterIndicatorComponent);

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    position: 'absolute',
    left: 76,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 6 },
      android: { elevation: 3 },
      web: { boxShadow: '0 2px 6px rgba(0,0,0,0.15)' },
    }),
  },
  label: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '700' as const,
  },
});
