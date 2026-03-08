import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { Search } from 'lucide-react-native';
import { ThemeColors } from '@/constants/colors';

interface MapBottomBarProps {
  colors: ThemeColors;
  insetBottom: number;
  isLoading: boolean;
  isOffline: boolean;
  onSearchPress: () => void;
}

function MapBottomBarComponent({ colors, insetBottom, isLoading, isOffline, onSearchPress }: MapBottomBarProps) {
  const styles = makeStyles(colors);

  return (
    <View style={[styles.bottomSheet, { paddingBottom: insetBottom + 8 }]}>
      <View style={styles.handle} />
      <TouchableOpacity
        style={styles.searchBar}
        onPress={onSearchPress}
        activeOpacity={0.9}
        testID="search-bar"
      >
        <Search size={18} color={colors.textMuted} />
        <Text style={styles.searchPlaceholder}>Where to?</Text>
        {isLoading && (
          <ActivityIndicator size="small" color={colors.primary} />
        )}
        {!isLoading && !isOffline && (
          <View style={styles.liveIndicator}>
            <View style={styles.liveIndicatorDot} />
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
}

export default memo(MapBottomBarComponent);

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 8,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 12 },
      android: { elevation: 8 },
      web: { boxShadow: '0 -4px 12px rgba(0,0,0,0.1)' },
    }),
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.elevated,
    borderRadius: 28,
    paddingHorizontal: 18,
    paddingVertical: 15,
    gap: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchPlaceholder: {
    flex: 1,
    color: colors.textMuted,
    fontSize: 16,
    fontWeight: '500' as const,
    letterSpacing: 0.2,
  },
  liveIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.success + '18',
    justifyContent: 'center',
    alignItems: 'center',
  },
  liveIndicatorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success,
  },
});
