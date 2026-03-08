import React, { useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Linking,
  ActivityIndicator,
  Platform,
} from 'react-native';
import {
  MapPin,
  AlertTriangle,
  Zap,
  X,
  Navigation,
  Clock,
  ExternalLink,
  Phone,
  ChevronRight,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { ThemeColors } from '@/constants/colors';
import { BUSINESS_CATEGORY_LABELS } from '@/constants/categories';
import { Dock, Hazard } from '@/types';
import { getHazardBlockReasons, HazardBlockReason } from '@/utils/classify-hazards';

interface MapDetailCardProps {
  colors: ThemeColors;
  selectedDock: Dock | null;
  selectedHazard: Hazard | null;
  cardAnim: Animated.Value;
  insetBottom: number;
  truckHeight: number;
  truckWeight: number;
  truckWidth: number;
  isRouting: boolean;
  onHideCard: () => void;
  onRouteToDock: (dock: Dock) => void;
  getHazardColor: (hazard: Hazard) => string;
}

function MapDetailCardComponent({
  colors,
  selectedDock,
  selectedHazard,
  cardAnim,
  insetBottom,
  truckHeight,
  truckWeight,
  truckWidth,
  isRouting,
  onHideCard,
  onRouteToDock,
  getHazardColor,
}: MapDetailCardProps) {
  const router = useRouter();

  const cardTranslateY = cardAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [300, 0],
  });

  const handleViewDetails = useCallback(() => {
    if (selectedDock) {
      router.push({ pathname: '/dock-details', params: { id: selectedDock.id } });
    } else if (selectedHazard) {
      router.push({ pathname: '/hazard-details', params: { id: selectedHazard.id } });
    }
  }, [selectedDock, selectedHazard, router]);

  const openInMaps = useCallback((dock: Dock) => {
    const url = Platform.select({
      ios: `maps://app?daddr=${dock.latitude},${dock.longitude}`,
      android: `google.navigation:q=${dock.latitude},${dock.longitude}`,
      default: `https://www.google.com/maps/dir/?api=1&destination=${dock.latitude},${dock.longitude}`,
    });
    if (url) Linking.openURL(url);
  }, []);

  const styles = useMemo(() => makeStyles(colors), [colors]);

  if (!selectedDock && !selectedHazard) return null;

  return (
    <Animated.View
      style={[
        styles.detailCard,
        { bottom: insetBottom + 90, transform: [{ translateY: cardTranslateY }] },
      ]}
    >
      <TouchableOpacity style={styles.cardClose} onPress={onHideCard}>
        <X size={18} color={colors.textMuted} />
      </TouchableOpacity>

      {selectedDock && (
        <View>
          <View style={styles.cardHeader}>
            <View style={styles.cardIconDock}>
              <MapPin size={18} color={colors.white} />
            </View>
            <View style={styles.cardHeaderText}>
              <Text style={styles.cardTitle} numberOfLines={1}>{selectedDock.name}</Text>
              <Text style={styles.cardSubtitle}>{selectedDock.business}</Text>
            </View>
          </View>
          <Text style={styles.cardAddress}>{selectedDock.address}</Text>
          <View style={styles.cardTags}>
            <View style={styles.tag}>
              <Text style={styles.tagText}>
                {BUSINESS_CATEGORY_LABELS[selectedDock.businessCategory] ?? selectedDock.businessCategory}
              </Text>
            </View>
            <View style={styles.tag}>
              <Text style={styles.tagText}>
                {selectedDock.dockType === 'both' ? 'Load/Unload' : selectedDock.dockType === 'loading' ? 'Loading' : 'Unloading'}
              </Text>
            </View>
            {selectedDock.isOffRoad && (
              <View style={[styles.tag, styles.tagWarning]}>
                <Text style={styles.tagWarningText}>Off-Road</Text>
              </View>
            )}
          </View>
          {selectedDock.operatingHours && (
            <View style={styles.cardMetaRow}>
              <Clock size={12} color={colors.textMuted} />
              <Text style={styles.cardMetaText}>{selectedDock.operatingHours}</Text>
            </View>
          )}
          <View style={styles.cardActions}>
            <TouchableOpacity
              style={styles.routeToBtn}
              onPress={() => onRouteToDock(selectedDock)}
              disabled={isRouting}
              activeOpacity={0.7}
            >
              {isRouting ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <>
                  <Navigation size={14} color={colors.white} />
                  <Text style={styles.routeToBtnText}>Route Here</Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => openInMaps(selectedDock)}
              activeOpacity={0.7}
            >
              <ExternalLink size={14} color={colors.primary} />
            </TouchableOpacity>
            {selectedDock.phone && (
              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={() => Linking.openURL(`tel:${selectedDock.phone}`)}
                activeOpacity={0.7}
              >
                <Phone size={14} color={colors.primary} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {selectedHazard && (
        <View>
          <View style={styles.cardHeader}>
            <View style={[styles.cardIconHazard, { backgroundColor: getHazardColor(selectedHazard) }]}>
              {selectedHazard.type === 'weight_limit' ? (
                <AlertTriangle size={18} color={colors.white} />
              ) : selectedHazard.type === 'bridge' ? (
                <AlertTriangle size={18} color={colors.white} />
              ) : (
                <Zap size={18} color={colors.white} />
              )}
            </View>
            <View style={styles.cardHeaderText}>
              <Text style={styles.cardTitle} numberOfLines={1}>{selectedHazard.name}</Text>
              <Text style={styles.cardSubtitle}>{selectedHazard.road}, {selectedHazard.city}</Text>
            </View>
          </View>
          {selectedHazard.clearanceHeight < 90 && (
            <View style={styles.clearanceRow}>
              <Text style={styles.clearanceLabel}>Clearance:</Text>
              <Text style={[styles.clearanceValue, { color: getHazardColor(selectedHazard) }]}>
                {selectedHazard.clearanceHeight.toFixed(1)}m
              </Text>
              <Text style={styles.clearanceSep}>|</Text>
              <Text style={styles.clearanceLabel}>Truck:</Text>
              <Text style={styles.clearanceValue}>{truckHeight.toFixed(1)}m</Text>
            </View>
          )}
          {selectedHazard.weightLimit != null && (
            <View style={styles.clearanceRow}>
              <Text style={styles.clearanceLabel}>Weight limit:</Text>
              <Text style={[styles.clearanceValue, truckWeight > selectedHazard.weightLimit ? { color: colors.danger } : undefined]}>
                {selectedHazard.weightLimit}t
              </Text>
              <Text style={styles.clearanceSep}>|</Text>
              <Text style={styles.clearanceLabel}>Truck:</Text>
              <Text style={styles.clearanceValue}>{truckWeight.toFixed(1)}t</Text>
            </View>
          )}
          {selectedHazard.widthLimit != null && (
            <View style={styles.clearanceRow}>
              <Text style={styles.clearanceLabel}>Width limit:</Text>
              <Text style={[styles.clearanceValue, truckWidth > selectedHazard.widthLimit ? { color: colors.danger } : undefined]}>
                {selectedHazard.widthLimit}m
              </Text>
              <Text style={styles.clearanceSep}>|</Text>
              <Text style={styles.clearanceLabel}>Truck:</Text>
              <Text style={styles.clearanceValue}>{truckWidth.toFixed(1)}m</Text>
            </View>
          )}
          {(() => {
            const reasons = getHazardBlockReasons(selectedHazard, truckHeight, truckWeight, truckWidth);
            if (reasons.length === 0) return null;
            const messages: string[] = reasons.map((r: HazardBlockReason) => {
              switch (r) {
                case 'height': return `${(truckHeight - selectedHazard.clearanceHeight).toFixed(1)}m too tall`;
                case 'weight': return `${(truckWeight - (selectedHazard.weightLimit ?? 0)).toFixed(1)}t over weight`;
                case 'width': return `${(truckWidth - (selectedHazard.widthLimit ?? 0)).toFixed(1)}m too wide`;
              }
            });
            return (
              <View style={styles.dangerBanner}>
                <AlertTriangle size={14} color={colors.danger} />
                <Text style={styles.dangerText}>
                  CANNOT PASS — {messages.join(', ')}
                </Text>
              </View>
            );
          })()}
        </View>
      )}

      <TouchableOpacity style={styles.viewDetailsBtn} onPress={handleViewDetails} activeOpacity={0.7}>
        <Text style={styles.viewDetailsBtnText}>View Full Details</Text>
        <ChevronRight size={14} color={colors.primary} />
      </TouchableOpacity>
    </Animated.View>
  );
}

export default React.memo(MapDetailCardComponent);

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  detailCard: {
    position: 'absolute',
    left: 12,
    right: 12,
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 18,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.15, shadowRadius: 12 },
      android: { elevation: 8 },
      web: { boxShadow: '0 -4px 12px rgba(0,0,0,0.15)' },
    }),
  },
  cardClose: {
    position: 'absolute',
    top: 14,
    right: 14,
    zIndex: 1,
    padding: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
    paddingRight: 24,
  },
  cardIconDock: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.mapDock,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardIconHazard: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardHeaderText: {
    flex: 1,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700' as const,
  },
  cardSubtitle: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },
  cardAddress: {
    color: colors.textSecondary,
    fontSize: 12,
    marginBottom: 8,
    marginLeft: 52,
  },
  cardTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginLeft: 52,
    marginBottom: 8,
  },
  tag: {
    backgroundColor: colors.primary + '15',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  tagText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '600' as const,
  },
  tagWarning: {
    backgroundColor: colors.danger + '15',
  },
  tagWarningText: {
    color: colors.danger,
    fontSize: 11,
    fontWeight: '600' as const,
  },
  cardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginLeft: 52,
    marginBottom: 4,
  },
  cardMetaText: {
    color: colors.textMuted,
    fontSize: 11,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  routeToBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
  },
  routeToBtnText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '700' as const,
  },
  secondaryBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.primary + '12',
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginLeft: 52,
    marginBottom: 8,
  },
  clearanceLabel: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  clearanceValue: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700' as const,
  },
  clearanceSep: {
    color: colors.textMuted,
    fontSize: 13,
  },
  dangerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.danger + '12',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.danger + '30',
  },
  dangerText: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: '700' as const,
    flex: 1,
  },
  viewDetailsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: colors.elevated,
    borderRadius: 12,
    paddingVertical: 11,
    marginTop: 12,
  },
  viewDetailsBtnText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '600' as const,
  },
});
