import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Route, AlertTriangle, X } from 'lucide-react-native';
import { ThemeColors } from '@/constants/colors';
import { cachedStyles } from '@/utils/styleCache';
import { platformShadow } from '@/utils/shadows';
import { LiveRouteResult, formatDistance, formatDuration } from '@/services/routing';
import { Hazard } from '@/types';

interface RouteBannerProps {
  colors: ThemeColors;
  activeRoute: LiveRouteResult;
  routeHazards: Hazard[];
  insetTop: number;
  onClear: () => void;
}

function RouteBannerComponent({
  colors,
  activeRoute,
  routeHazards,
  insetTop,
  onClear,
}: RouteBannerProps) {
  const styles = cachedStyles(makeStyles, colors);

  return (
    <View style={[styles.routeBanner, { top: insetTop + 70 }]}>
      <View style={styles.routeBannerContent}>
        <Route size={14} color={colors.primary} />
        <Text style={styles.routeBannerText}>
          {formatDistance(activeRoute.distance)} · {formatDuration(activeRoute.duration)}
        </Text>
        {routeHazards.length > 0 && (
          <View style={styles.routeBannerWarning}>
            <AlertTriangle size={12} color={colors.danger} />
            <Text style={styles.routeBannerWarningText}>
              {routeHazards.length} blocked
            </Text>
          </View>
        )}
      </View>
      <TouchableOpacity onPress={onClear} style={styles.routeBannerClose}>
        <X size={16} color={colors.textMuted} />
      </TouchableOpacity>
    </View>
  );
}

export default React.memo(RouteBannerComponent);

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  routeBanner: {
    position: 'absolute',
    left: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    ...platformShadow({ offsetY: 2, radius: 8, opacity: 0.15, elevation: 4 }),
  },
  routeBannerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  routeBannerText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700' as const,
  },
  routeBannerWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.danger + '12',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  routeBannerWarningText: {
    color: colors.danger,
    fontSize: 11,
    fontWeight: '600' as const,
  },
  routeBannerClose: {
    padding: 4,
  },
});
