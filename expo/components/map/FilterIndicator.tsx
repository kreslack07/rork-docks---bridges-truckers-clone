import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { X } from 'lucide-react-native';
import { ThemeColors } from '@/constants/colors';
import { cachedStyles } from '@/utils/styleCache';
import { platformShadow } from '@/utils/shadows';

interface FilterIndicatorProps {
  colors: ThemeColors;
  label: string;
  insetTop: number;
  onClear: () => void;
}

function FilterIndicatorComponent({ colors, label, insetTop, onClear }: FilterIndicatorProps) {
  const styles = cachedStyles(makeStyles, colors);

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
    ...platformShadow({ offsetY: 2, radius: 6, opacity: 0.15, elevation: 3 }),
  },
  label: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '700' as const,
  },
});
