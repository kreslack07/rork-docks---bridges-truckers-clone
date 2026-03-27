import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { AlertTriangle, Plus } from 'lucide-react-native';
import { ThemeColors } from '@/constants/colors';

interface MapFloatingActionsProps {
  colors: ThemeColors;
  totalReports: number;
  insetBottom: number;
  onViewHazards: () => void;
  onReportHazard: () => void;
}

function MapFloatingActionsComponent({
  colors,
  totalReports,
  insetBottom,
  onViewHazards,
  onReportHazard,
}: MapFloatingActionsProps) {
  const styles = makeStyles(colors);

  return (
    <View style={[styles.container, { bottom: insetBottom + 118 }]}>
      <TouchableOpacity
        style={styles.reportsBadge}
        onPress={onViewHazards}
        activeOpacity={0.85}
      >
        <View style={styles.reportsBadgeIcon}>
          <AlertTriangle size={16} color={colors.warning} />
        </View>
        <View>
          <Text style={styles.reportsBadgeCount}>{totalReports} Reports</Text>
          <Text style={styles.reportsBadgeSub}>Around you</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.reportFab}
        onPress={onReportHazard}
        activeOpacity={0.85}
        testID="report-fab"
      >
        <Plus size={22} color={colors.white} strokeWidth={3} />
      </TouchableOpacity>
    </View>
  );
}

export default memo(MapFloatingActionsComponent);

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reportsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.elevated,
    borderRadius: 28,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 10 },
      android: { elevation: 6 },
      web: { boxShadow: '0 4px 10px rgba(0,0,0,0.25)' },
    }),
  },
  reportsBadgeIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.warning + '18',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reportsBadgeCount: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700' as const,
  },
  reportsBadgeSub: {
    color: colors.textMuted,
    fontSize: 11,
  },
  reportFab: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 8 },
      android: { elevation: 4 },
      web: { boxShadow: '0 2px 8px rgba(0,0,0,0.15)' },
    }),
  },
});
