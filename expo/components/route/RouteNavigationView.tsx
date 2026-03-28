import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import {
  Navigation,
  AlertTriangle,
  MapPin,
  Clock,
  Route,
  ExternalLink,
  Square,
  RotateCcw,
  ArrowUp,
  Compass,
  Radio,
  Volume2,
  VolumeX,
  XCircle,
} from 'lucide-react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { ThemeColors } from '@/constants/colors';
import { LiveRouteData } from '@/context/NavigationContext';
import { NavigationProgress, LivePosition } from '@/services/live-tracking';
import { formatDistance, formatDuration } from '@/services/routing';
import { RouteCoordinate, TruckProfile } from '@/types';

interface RouteNavigationViewProps {
  colors: ThemeColors;
  navProgress: NavigationProgress;
  routeResult: LiveRouteData;
  pulseAnim: Animated.Value;
  voiceActive: boolean;
  isRerouting: boolean;
  rerouteCount: number;
  livePosition: LivePosition | null;
  currentPosition: RouteCoordinate | null;
  selectedDestCoord: RouteCoordinate | null;
  navMapRef: React.RefObject<MapView | null>;
  profile: TruckProfile;
  onToggleVoice: () => void;
  onStopNavigation: () => void;
  onOpenInMaps: () => void;
  onOpenInWaze: () => void;
}

function getHazardDescription(
  hazard: { clearanceHeight: number; weightLimit?: number; widthLimit?: number; type?: string },
  profile: TruckProfile,
): string {
  const parts: string[] = [];
  if (hazard.clearanceHeight < profile.height) {
    parts.push(`Height ${hazard.clearanceHeight}m — TOO LOW`);
  } else {
    parts.push(`${hazard.clearanceHeight}m clearance`);
  }
  if (hazard.weightLimit && profile.weight > hazard.weightLimit) {
    parts.push(`Weight ${hazard.weightLimit}t — TOO HEAVY`);
  }
  if (hazard.widthLimit && profile.width > hazard.widthLimit) {
    parts.push(`Width ${hazard.widthLimit}m — TOO WIDE`);
  }
  return parts.join(' | ');
}

export default function RouteNavigationView({
  colors,
  navProgress,
  routeResult,
  pulseAnim,
  voiceActive,
  isRerouting,
  rerouteCount,
  livePosition,
  currentPosition,
  selectedDestCoord,
  navMapRef,
  profile,
  onToggleVoice,
  onStopNavigation,
  onOpenInMaps,
  onOpenInWaze,
}: RouteNavigationViewProps) {
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <View style={styles.navContainer}>
      <View style={styles.navTopBar}>
        <Animated.View style={[styles.navLiveDot, { opacity: pulseAnim }]}>
          <Radio size={10} color={colors.white} />
        </Animated.View>
        <Text style={styles.navLiveText}>LIVE NAVIGATION</Text>
        <TouchableOpacity
          style={styles.voiceToggleNav}
          onPress={onToggleVoice}
          activeOpacity={0.7}
          testID="nav-voice-toggle"
          accessibilityLabel={voiceActive ? 'Mute voice navigation' : 'Enable voice navigation'}
          accessibilityRole="button"
        >
          {voiceActive ? (
            <Volume2 size={14} color={colors.primary} />
          ) : (
            <VolumeX size={14} color={colors.textMuted} />
          )}
        </TouchableOpacity>
        {isRerouting && (
          <View style={styles.reroutingBadge}>
            <RotateCcw size={10} color={colors.warning} />
            <Text style={styles.reroutingText}>Rerouting...</Text>
          </View>
        )}
        {rerouteCount > 0 && !isRerouting && (
          <Text style={styles.rerouteCountText}>
            Rerouted {rerouteCount}x
          </Text>
        )}
      </View>

      <View style={styles.navInstructionCard}>
        <View style={styles.navInstructionIconWrap}>
          {navProgress.currentStep?.maneuver === 'turn' ? (
            <ArrowUp size={28} color={colors.white} style={{ transform: [{ rotate: '45deg' }] }} />
          ) : navProgress.currentStep?.maneuver === 'arrive' ? (
            <MapPin size={28} color={colors.white} />
          ) : (
            <ArrowUp size={28} color={colors.white} />
          )}
        </View>
        <View style={styles.navInstructionContent}>
          <Text style={styles.navInstructionDistance}>
            {formatDistance(navProgress.distanceToNextStep)}
          </Text>
          <Text style={styles.navInstructionText} numberOfLines={2}>
            {navProgress.currentStep?.instruction ?? 'Calculating...'}
          </Text>
          {navProgress.nextStep && (
            <Text style={styles.navNextStep} numberOfLines={1}>
              Then: {navProgress.nextStep.instruction}
            </Text>
          )}
        </View>
      </View>

      {navProgress.isOffRoute && (
        <View style={styles.offRouteBanner}>
          <AlertTriangle size={16} color={colors.danger} />
          <Text style={styles.offRouteText}>Off route — recalculating...</Text>
        </View>
      )}

      <View style={styles.navMapContainer}>
        <MapView
          ref={navMapRef}
          style={styles.navMap}
          showsUserLocation={false}
          showsCompass={false}
          rotateEnabled={false}
        >
          <Polyline
            coordinates={routeResult.route.coordinates}
            strokeColor={colors.primary}
            strokeWidth={5}
          />

          {currentPosition && (
            <Marker
              coordinate={currentPosition}
              title="You"
              anchor={{ x: 0.5, y: 0.5 }}
            >
              <View style={styles.userMarker}>
                <View style={styles.userMarkerInner}>
                  <Navigation size={12} color={colors.white} />
                </View>
              </View>
            </Marker>
          )}

          {selectedDestCoord && (
            <Marker
              coordinate={selectedDestCoord}
              title="Destination"
              pinColor={colors.primary}
            />
          )}

          {routeResult.blockedHazards.map((hazard) => (
            <Marker
              key={hazard.id}
              coordinate={{ latitude: hazard.latitude, longitude: hazard.longitude }}
              title={hazard.name}
              description={getHazardDescription(hazard, profile)}
              pinColor={colors.danger}
            />
          ))}

          {routeResult.tightHazards.map((hazard) => (
            <Marker
              key={hazard.id}
              coordinate={{ latitude: hazard.latitude, longitude: hazard.longitude }}
              title={hazard.name}
              description={getHazardDescription(hazard, profile)}
              pinColor={colors.warning}
            />
          ))}
        </MapView>
      </View>

      <View style={styles.navBottomBar}>
        <View style={styles.navProgressRow}>
          <View style={styles.navProgressBg}>
            <View
              style={[
                styles.navProgressFill,
                { width: `${Math.min(100, navProgress.completionPercent)}%` as any },
              ]}
            />
          </View>
          <Text style={styles.navProgressPercent}>
            {Math.round(navProgress.completionPercent)}%
          </Text>
        </View>

        <View style={styles.navStatsRow}>
          <View style={styles.navStatItem}>
            <Route size={14} color={colors.primary} />
            <Text style={styles.navStatValue}>{formatDistance(navProgress.distanceRemaining)}</Text>
            <Text style={styles.navStatLabel}>remaining</Text>
          </View>
          <View style={styles.navStatDivider} />
          <View style={styles.navStatItem}>
            <Clock size={14} color={colors.primary} />
            <Text style={styles.navStatValue}>{formatDuration(navProgress.durationRemaining)}</Text>
            <Text style={styles.navStatLabel}>ETA</Text>
          </View>
          <View style={styles.navStatDivider} />
          <View style={styles.navStatItem}>
            <AlertTriangle
              size={14}
              color={routeResult.blockedHazards.length > 0 ? colors.danger : colors.success}
            />
            <Text
              style={[
                styles.navStatValue,
                { color: routeResult.blockedHazards.length > 0 ? colors.danger : colors.success },
              ]}
            >
              {routeResult.blockedHazards.length}
            </Text>
            <Text style={styles.navStatLabel}>blocked</Text>
          </View>
          {livePosition?.speed != null && livePosition.speed > 0 && (
            <>
              <View style={styles.navStatDivider} />
              <View style={styles.navStatItem}>
                <Compass size={14} color={colors.primary} />
                <Text style={styles.navStatValue}>
                  {Math.round(livePosition.speed * 3.6)}
                </Text>
                <Text style={styles.navStatLabel}>km/h</Text>
              </View>
            </>
          )}
        </View>

        {routeResult.blockedHazards.length > 0 && (
          <View style={styles.navHazardWarning}>
            <XCircle size={14} color={colors.danger} />
            <View style={styles.navHazardWarningContent}>
              <Text style={styles.navHazardWarningText}>
                {routeResult.blockedHazards.length} hazard{routeResult.blockedHazards.length !== 1 ? 's' : ''} ahead — truck cannot pass
              </Text>
              {routeResult.blockedHazards.slice(0, 3).map((h) => {
                const reasons: string[] = [];
                if (h.clearanceHeight < profile.height) reasons.push(`${h.clearanceHeight}m low`);
                if (h.weightLimit && profile.weight > h.weightLimit) reasons.push(`${h.weightLimit}t limit`);
                if (h.widthLimit && profile.width > h.widthLimit) reasons.push(`${h.widthLimit}m narrow`);
                return (
                  <Text key={h.id} style={styles.navHazardDetail}>
                    {h.name}: {reasons.join(', ')}
                  </Text>
                );
              })}
            </View>
          </View>
        )}

        <View style={styles.navActionsRow}>
          <TouchableOpacity
            style={styles.stopNavBtn}
            onPress={onStopNavigation}
            activeOpacity={0.7}
            testID="nav-stop-btn"
            accessibilityLabel="End navigation"
            accessibilityRole="button"
          >
            <Square size={16} color={colors.white} />
            <Text style={styles.stopNavBtnText}>End Navigation</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.openMapsNavBtn}
            onPress={onOpenInMaps}
            activeOpacity={0.7}
            testID="nav-open-maps-btn"
            accessibilityLabel="Open in Maps"
            accessibilityRole="button"
          >
            <ExternalLink size={16} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.openWazeNavBtn}
            onPress={onOpenInWaze}
            activeOpacity={0.7}
            testID="nav-open-waze-btn"
            accessibilityLabel="Open in Waze"
            accessibilityRole="button"
          >
            <Navigation size={16} color={colors.waze} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  navContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  navTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  navLiveDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.danger,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navLiveText: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: '800' as const,
    letterSpacing: 1,
    flex: 1,
  },
  voiceToggleNav: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.elevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reroutingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.warning + '20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  reroutingText: {
    color: colors.warning,
    fontSize: 11,
    fontWeight: '600' as const,
  },
  rerouteCountText: {
    color: colors.textMuted,
    fontSize: 11,
  },
  navInstructionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.primary,
    marginHorizontal: 12,
    marginTop: 10,
    borderRadius: 16,
    padding: 16,
  },
  navInstructionIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  navInstructionContent: {
    flex: 1,
  },
  navInstructionDistance: {
    color: colors.background,
    fontSize: 24,
    fontWeight: '900' as const,
  },
  navInstructionText: {
    color: colors.background,
    fontSize: 14,
    fontWeight: '600' as const,
    marginTop: 2,
    opacity: 0.9,
  },
  navNextStep: {
    color: colors.background,
    fontSize: 12,
    marginTop: 4,
    opacity: 0.65,
  },
  offRouteBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.danger + '20',
    marginHorizontal: 12,
    marginTop: 8,
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.danger + '40',
  },
  offRouteText: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: '700' as const,
  },
  navMapContainer: {
    flex: 1,
    margin: 12,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  navMap: {
    flex: 1,
  },
  userMarker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.userMarker + '40',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userMarkerInner: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.userMarker,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navBottomBar: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    gap: 10,
  },
  navProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  navProgressBg: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.elevated,
    overflow: 'hidden',
  },
  navProgressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  navProgressPercent: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '700' as const,
    minWidth: 32,
    textAlign: 'right' as const,
  },
  navStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  navStatItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  navStatValue: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800' as const,
  },
  navStatLabel: {
    color: colors.textMuted,
    fontSize: 9,
    fontWeight: '600' as const,
    textTransform: 'uppercase' as const,
  },
  navStatDivider: {
    width: 1,
    height: 28,
    backgroundColor: colors.border,
  },
  navHazardWarning: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: colors.danger + '15',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.danger + '30',
  },
  navHazardWarningContent: {
    flex: 1,
    gap: 2,
  },
  navHazardWarningText: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: '600' as const,
  },
  navHazardDetail: {
    color: colors.danger,
    fontSize: 10,
    fontWeight: '500' as const,
    opacity: 0.8,
  },
  navActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  stopNavBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.danger,
    borderRadius: 12,
    paddingVertical: 14,
  },
  stopNavBtnText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '700' as const,
  },
  openMapsNavBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  openWazeNavBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.waze + '15',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.waze + '30',
  },
});
