import React, { useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { WifiOff, RefreshCw } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';

interface OfflineBannerProps {
  isOffline: boolean;
  onRetry?: () => void;
}

export default function OfflineBanner({ isOffline, onRetry }: OfflineBannerProps) {
  const { colors } = useTheme();
  const translateY = useRef(new Animated.Value(-60)).current;

  useEffect(() => {
    Animated.spring(translateY, {
      toValue: isOffline ? 0 : -60,
      useNativeDriver: true,
      tension: 80,
      friction: 12,
    }).start();
  }, [isOffline, translateY]);

  if (!isOffline) return null;

  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <Animated.View style={[styles.container, { transform: [{ translateY }] }]}>
      <View style={styles.content}>
        <WifiOff size={16} color={colors.white} />
        <Text style={styles.text}>No connection — using cached data</Text>
        {onRetry && (
          <TouchableOpacity onPress={onRetry} style={styles.retryBtn} activeOpacity={0.7}>
            <RefreshCw size={14} color={colors.white} />
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
}

const makeStyles = (colors: any) => StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 999,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.warning,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  text: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '600' as const,
  },
  retryBtn: {
    padding: 4,
    marginLeft: 4,
  },
});
