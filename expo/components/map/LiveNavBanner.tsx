import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Radio, Square } from 'lucide-react-native';
import { ThemeColors } from '@/constants/colors';
import { NavigationProgress } from '@/services/live-tracking';
import { formatDistance, formatDuration } from '@/services/routing';

interface LiveNavBannerProps {
  colors: ThemeColors;
  navProgress: NavigationProgress;
  insetTop: number;
  onStop: () => void;
}

function LiveNavBannerComponent({
  colors,
  navProgress,
  insetTop,
  onStop,
}: LiveNavBannerProps) {
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <View style={[styles.liveNavBanner, { top: insetTop + 70 }]}>
      <View style={styles.liveNavLeft}>
        <View style={styles.liveNavDot}>
          <Radio size={8} color={colors.white} />
        </View>
        <View style={styles.liveNavInfo}>
          <Text style={styles.liveNavTitle} numberOfLines={1}>
            {navProgress.currentStep?.instruction ?? 'Navigating...'}
          </Text>
          <Text style={styles.liveNavSub}>
            {formatDistance(navProgress.distanceRemaining)} · {formatDuration(navProgress.durationRemaining)} · {Math.round(navProgress.completionPercent)}%
          </Text>
        </View>
      </View>
      <TouchableOpacity
        onPress={onStop}
        style={styles.liveNavStopBtn}
        accessibilityLabel="Stop navigation"
        accessibilityRole="button"
      >
        <Square size={12} color={colors.white} />
      </TouchableOpacity>
    </View>
  );
}

export default React.memo(LiveNavBannerComponent);

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  liveNavBanner: {
    position: 'absolute',
    left: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderLeftWidth: 4,
    borderLeftColor: colors.success,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 8 },
      android: { elevation: 5 },
      web: { boxShadow: '0 2px 8px rgba(0,0,0,0.2)' },
    }),
  },
  liveNavLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  liveNavDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.success,
    justifyContent: 'center',
    alignItems: 'center',
  },
  liveNavInfo: {
    flex: 1,
  },
  liveNavTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700' as const,
  },
  liveNavSub: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 1,
  },
  liveNavStopBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.danger,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
});
