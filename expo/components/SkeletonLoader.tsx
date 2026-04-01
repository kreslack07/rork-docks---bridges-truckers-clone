import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { ThemeColors } from '@/constants/colors';
import { cachedStyles } from '@/utils/styleCache';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: object;
}

function SkeletonBlock({ width = '100%', height = 16, borderRadius = 8, style }: SkeletonProps) {
  const { colors } = useTheme();
  const shimmer = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 0.7, duration: 800, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [shimmer]);

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height,
          borderRadius,
          backgroundColor: colors.elevated,
          opacity: shimmer,
        },
        style,
      ]}
    />
  );
}

export function HazardCardSkeleton() {
  const { colors } = useTheme();
  const styles = cachedStyles(makeStyles, colors);

  return (
    <View style={styles.hazardCard}>
      <SkeletonBlock width={40} height={40} borderRadius={12} />
      <View style={styles.hazardCardCenter}>
        <SkeletonBlock width="70%" height={14} />
        <SkeletonBlock width="90%" height={12} style={{ marginTop: 6 }} />
        <SkeletonBlock width="40%" height={10} style={{ marginTop: 6 }} />
      </View>
      <View style={styles.hazardCardRight}>
        <SkeletonBlock width={48} height={22} />
        <SkeletonBlock width={56} height={18} borderRadius={6} style={{ marginTop: 4 }} />
      </View>
    </View>
  );
}

export function DockCardSkeleton() {
  const { colors } = useTheme();
  const styles = cachedStyles(makeStyles, colors);

  return (
    <View style={styles.dockCard}>
      <SkeletonBlock width={44} height={44} borderRadius={12} />
      <View style={styles.dockCardContent}>
        <SkeletonBlock width="65%" height={15} />
        <SkeletonBlock width="85%" height={12} style={{ marginTop: 6 }} />
        <SkeletonBlock width="45%" height={10} style={{ marginTop: 6 }} />
      </View>
      <SkeletonBlock width={16} height={16} borderRadius={8} />
    </View>
  );
}

export function SearchResultSkeleton() {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 16 }}>
      <SkeletonBlock width={36} height={36} borderRadius={18} />
      <View style={{ flex: 1, gap: 6 }}>
        <SkeletonBlock width="75%" height={14} />
        <SkeletonBlock width="50%" height={11} />
      </View>
    </View>
  );
}

export function ListSkeletonLoader({ count = 5, type = 'hazard' }: { count?: number; type?: 'hazard' | 'dock' | 'search' }) {
  const Component = type === 'hazard' ? HazardCardSkeleton : type === 'dock' ? DockCardSkeleton : SearchResultSkeleton;
  return (
    <View style={{ padding: 16, gap: 10 }}>
      {Array.from({ length: count }).map((_, i) => (
        <Component key={i} />
      ))}
    </View>
  );
}

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  hazardCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  hazardCardCenter: {
    flex: 1,
  },
  hazardCardRight: {
    alignItems: 'flex-end',
  },
  dockCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  dockCardContent: {
    flex: 1,
  },
});

export default SkeletonBlock;
