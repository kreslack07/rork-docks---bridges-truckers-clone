import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {
  AlertTriangle,
  Zap,
  Ruler,
  Wifi,
  Weight,
  MoveHorizontal,
} from 'lucide-react-native';
import { ThemeColors } from '@/constants/colors';
import { Hazard, TruckProfile } from '@/types';
import { cachedStyles } from '@/utils/styleCache';

interface RouteHazardSectionProps {
  colors: ThemeColors;
  title: string;
  titleColor: string;
  icon: React.ReactNode;
  hazards: Hazard[];
  dotColor: string;
  profile: TruckProfile;
}

export function getBlockedReasons(
  hazard: Hazard,
  profile: TruckProfile,
): { heightBlocked: boolean; weightBlocked: boolean; widthBlocked: boolean; heightTight: boolean } {
  const heightBlocked = hazard.clearanceHeight < profile.height;
  const heightTight = !heightBlocked && hazard.clearanceHeight < profile.height + 0.3;
  const weightBlocked = hazard.weightLimit ? profile.weight > hazard.weightLimit : false;
  const widthBlocked = hazard.widthLimit ? profile.width > hazard.widthLimit : false;
  return { heightBlocked, weightBlocked, widthBlocked, heightTight };
}

function RouteHazardSection({
  colors,
  title,
  titleColor,
  icon,
  hazards,
  dotColor,
  profile,
}: RouteHazardSectionProps) {
  const styles = cachedStyles(makeStyles, colors);

  return (
    <View style={styles.hazardSection}>
      <View style={styles.hazardSectionHeader}>
        {icon}
        <Text style={[styles.hazardSectionTitle, { color: titleColor }]}>
          {title}
        </Text>
      </View>
      {hazards.map((h) => {
        const reasons = getBlockedReasons(h, profile);
        return (
          <View key={h.id} style={styles.hazardItem}>
            <View style={[styles.hazardDot, { backgroundColor: dotColor }]} />
            <View style={styles.hazardInfo}>
              <Text style={styles.hazardName}>{h.name}</Text>
              <Text style={styles.hazardRoad}>{h.road}, {h.city}</Text>
              <View style={styles.hazardTags}>
                {h.id.startsWith('osm-') && (
                  <View style={styles.liveTag}>
                    <Wifi size={8} color={colors.success} />
                    <Text style={styles.liveTagText}>Live</Text>
                  </View>
                )}
                {reasons.heightBlocked && (
                  <View style={[styles.reasonTag, { backgroundColor: colors.danger + '15' }]}>
                    <Ruler size={8} color={colors.danger} />
                    <Text style={[styles.reasonTagText, { color: colors.danger }]}>Too tall ({profile.height}m &gt; {h.clearanceHeight}m)</Text>
                  </View>
                )}
                {reasons.heightTight && (
                  <View style={[styles.reasonTag, { backgroundColor: colors.warning + '15' }]}>
                    <Ruler size={8} color={colors.warning} />
                    <Text style={[styles.reasonTagText, { color: colors.warning }]}>Tight ({h.clearanceHeight}m)</Text>
                  </View>
                )}
                {reasons.weightBlocked && (
                  <View style={[styles.reasonTag, { backgroundColor: colors.danger + '15' }]}>
                    <Weight size={8} color={colors.danger} />
                    <Text style={[styles.reasonTagText, { color: colors.danger }]}>Too heavy ({profile.weight}t &gt; {h.weightLimit}t)</Text>
                  </View>
                )}
                {!reasons.weightBlocked && h.weightLimit != null && (
                  <View style={[styles.reasonTag, { backgroundColor: colors.warning + '15' }]}>
                    <Weight size={8} color={colors.warning} />
                    <Text style={[styles.reasonTagText, { color: colors.warning }]}>{h.weightLimit}t limit</Text>
                  </View>
                )}
                {reasons.widthBlocked && (
                  <View style={[styles.reasonTag, { backgroundColor: colors.danger + '15' }]}>
                    <MoveHorizontal size={8} color={colors.danger} />
                    <Text style={[styles.reasonTagText, { color: colors.danger }]}>Too wide ({profile.width}m &gt; {h.widthLimit}m)</Text>
                  </View>
                )}
                {!reasons.widthBlocked && h.widthLimit != null && (
                  <View style={[styles.reasonTag, { backgroundColor: colors.warning + '15' }]}>
                    <MoveHorizontal size={8} color={colors.warning} />
                    <Text style={[styles.reasonTagText, { color: colors.warning }]}>{h.widthLimit}m width</Text>
                  </View>
                )}
              </View>
            </View>
            <View style={styles.hazardHeight}>
              {h.type === 'weight_limit' ? (
                <>
                  <Text style={[styles.hazardHeightValue, { color: dotColor }]}>
                    {h.weightLimit}t
                  </Text>
                  <Weight size={14} color={dotColor} />
                </>
              ) : (
                <>
                  <Text style={[styles.hazardHeightValue, { color: dotColor }]}>
                    {h.clearanceHeight.toFixed(1)}m
                  </Text>
                  {h.type === 'bridge' ? (
                    <AlertTriangle size={14} color={dotColor} />
                  ) : (
                    <Zap size={14} color={dotColor} />
                  )}
                </>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

export default React.memo(RouteHazardSection);

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  hazardSection: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  hazardSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  hazardSectionTitle: {
    fontSize: 14,
    fontWeight: '700' as const,
  },
  hazardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  hazardDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  hazardInfo: {
    flex: 1,
  },
  hazardName: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600' as const,
  },
  hazardRoad: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 1,
  },
  hazardHeight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  hazardHeightValue: {
    fontSize: 14,
    fontWeight: '700' as const,
  },
  hazardTags: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 3,
  },
  liveTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  liveTagText: {
    color: colors.success,
    fontSize: 9,
    fontWeight: '600' as const,
  },
  reasonTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  reasonTagText: {
    fontSize: 9,
    fontWeight: '700' as const,
  },
});
