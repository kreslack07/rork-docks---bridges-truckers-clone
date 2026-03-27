import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ThemeColors } from '@/constants/colors';
import { Hazard } from '@/types';

interface ClearanceCardProps {
  hazard: Hazard;
  colors: ThemeColors;
  truckHeight: number;
  truckWeight: number;
  heightBlocked: boolean;
  weightBlocked: boolean;
}

export default function ClearanceCard({
  hazard,
  colors,
  truckHeight,
  truckWeight,
  heightBlocked,
  weightBlocked,
}: ClearanceCardProps) {
  const clearanceDiff = hazard.clearanceHeight - truckHeight;
  const styles = makeStyles(colors);

  return (
    <View style={styles.clearanceCard}>
      {hazard.type !== 'weight_limit' && (
        <View style={styles.clearanceRow}>
          <View style={styles.clearanceItem}>
            <Text style={styles.clearanceItemLabel}>Clearance</Text>
            <Text style={[styles.clearanceItemValue, { color: heightBlocked ? colors.danger : colors.success }]}>
              {hazard.clearanceHeight.toFixed(1)}m
            </Text>
          </View>
          <View style={styles.clearanceDivider} />
          <View style={styles.clearanceItem}>
            <Text style={styles.clearanceItemLabel}>Your Height</Text>
            <Text style={styles.clearanceItemValue}>
              {truckHeight.toFixed(1)}m
            </Text>
          </View>
          <View style={styles.clearanceDivider} />
          <View style={styles.clearanceItem}>
            <Text style={styles.clearanceItemLabel}>Diff</Text>
            <Text
              style={[
                styles.clearanceItemValue,
                { color: heightBlocked ? colors.danger : colors.success },
              ]}
            >
              {clearanceDiff >= 0 ? '+' : ''}{clearanceDiff.toFixed(1)}m
            </Text>
          </View>
        </View>
      )}
      {hazard.weightLimit != null && (
        <View style={[styles.clearanceRow, hazard.type !== 'weight_limit' && { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border }]}>
          <View style={styles.clearanceItem}>
            <Text style={styles.clearanceItemLabel}>Weight Limit</Text>
            <Text style={[styles.clearanceItemValue, { color: weightBlocked ? colors.danger : colors.success }]}>
              {hazard.weightLimit}t
            </Text>
          </View>
          <View style={styles.clearanceDivider} />
          <View style={styles.clearanceItem}>
            <Text style={styles.clearanceItemLabel}>Your GVM</Text>
            <Text style={styles.clearanceItemValue}>
              {truckWeight.toFixed(1)}t
            </Text>
          </View>
          <View style={styles.clearanceDivider} />
          <View style={styles.clearanceItem}>
            <Text style={styles.clearanceItemLabel}>Status</Text>
            <Text
              style={[
                styles.clearanceItemValue,
                { color: weightBlocked ? colors.danger : colors.success },
              ]}
            >
              {weightBlocked ? 'OVER' : 'OK'}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  clearanceCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  clearanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clearanceItem: {
    flex: 1,
    alignItems: 'center',
  },
  clearanceItemLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '600' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  clearanceItemValue: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '800' as const,
  },
  clearanceDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.border,
  },
});
