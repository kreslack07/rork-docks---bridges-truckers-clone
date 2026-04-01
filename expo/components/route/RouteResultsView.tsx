import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Route,
  MapPin,
  ExternalLink,
  Navigation,
  Wifi,
  Shield,
  Play,
} from 'lucide-react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { ThemeColors } from '@/constants/colors';
import { LiveRouteData } from '@/context/NavigationContext';
import { Dock, Hazard, RouteCoordinate, TruckProfile } from '@/types';
import { formatDistance, formatDuration } from '@/services/routing';
import { cachedStyles } from '@/utils/styleCache';
import RouteHazardSection from './RouteHazardSection';
import RouteStepsList from './RouteStepsList';

interface RouteResultsViewProps {
  colors: ThemeColors;
  profile: TruckProfile;
  routeResult: LiveRouteData;
  fadeAnim: Animated.Value;
  userLocation: RouteCoordinate | null;
  selectedDestCoord: RouteCoordinate | null;
  nearbyDocks: Dock[];
  planMapRef: React.RefObject<MapView | null>;
  onStartNavigation: () => void;
  onOpenInMaps: () => void;
  onOpenInWaze: () => void;
  getHazardColor: (hazard: Hazard) => string;
}

function RouteResultsView({
  colors,
  profile,
  routeResult,
  fadeAnim,
  userLocation,
  selectedDestCoord,
  nearbyDocks,
  planMapRef,
  onStartNavigation,
  onOpenInMaps,
  onOpenInWaze,
  getHazardColor,
}: RouteResultsViewProps) {
  const styles = cachedStyles(makeStyles, colors);

  return (
    <Animated.View style={[styles.resultsContainer, { opacity: fadeAnim }]}>
      <View style={styles.mapContainer}>
        <MapView
          ref={planMapRef}
          style={styles.map}
          initialRegion={{
            latitude: routeResult.route.coordinates[0]?.latitude ?? -33.8688,
            longitude: routeResult.route.coordinates[0]?.longitude ?? 151.2093,
            latitudeDelta: 0.5,
            longitudeDelta: 0.5,
          }}
        >
          <Polyline
            coordinates={routeResult.route.coordinates}
            strokeColor={colors.primary}
            strokeWidth={4}
          />
          {userLocation && (
            <Marker
              coordinate={userLocation}
              title="Your Location"
              pinColor="#4A90D9"
            />
          )}
          {selectedDestCoord && (
            <Marker
              coordinate={selectedDestCoord}
              title="Destination"
              pinColor={colors.primary}
            />
          )}
          {routeResult.nearbyHazards.map((hazard) => (
            <Marker
              key={hazard.id}
              coordinate={{ latitude: hazard.latitude, longitude: hazard.longitude }}
              title={hazard.name}
              description={`${hazard.clearanceHeight}m clearance`}
              pinColor={getHazardColor(hazard)}
            />
          ))}
        </MapView>
      </View>

      <View style={styles.routeSummary}>
        <View style={styles.routeSummaryRow}>
          <View style={styles.routeStat}>
            <Route size={16} color={colors.primary} />
            <Text style={styles.routeStatValue}>
              {formatDistance(routeResult.route.distance)}
            </Text>
            <Text style={styles.routeStatLabel}>Distance</Text>
          </View>
          <View style={styles.routeStatDivider} />
          <View style={styles.routeStat}>
            <Clock size={16} color={colors.primary} />
            <Text style={styles.routeStatValue}>
              {formatDuration(routeResult.route.duration)}
            </Text>
            <Text style={styles.routeStatLabel}>Est. Time</Text>
          </View>
          <View style={styles.routeStatDivider} />
          <View style={styles.routeStat}>
            <AlertTriangle size={16} color={routeResult.blockedHazards.length > 0 ? colors.danger : colors.success} />
            <Text style={[styles.routeStatValue, { color: routeResult.blockedHazards.length > 0 ? colors.danger : colors.success }]}>
              {routeResult.blockedHazards.length}
            </Text>
            <Text style={styles.routeStatLabel}>Blocked</Text>
          </View>
        </View>
      </View>

      <TouchableOpacity
        style={styles.startNavBtn}
        onPress={onStartNavigation}
        activeOpacity={0.7}
        testID="start-navigation-btn"
      >
        <Play size={18} color={colors.background} />
        <Text style={styles.startNavBtnText}>Start Live Navigation</Text>
      </TouchableOpacity>

      {routeResult.realHazards.length > 0 && (
        <View style={styles.liveDataBanner}>
          <Wifi size={14} color={colors.success} />
          <Text style={styles.liveDataText}>
            {routeResult.realHazards.length} live hazard{routeResult.realHazards.length !== 1 ? 's' : ''} detected from OpenStreetMap
          </Text>
        </View>
      )}

      <View style={styles.externalNavRow}>
        <TouchableOpacity
          style={styles.openMapsBtn}
          onPress={onOpenInMaps}
          activeOpacity={0.7}
        >
          <ExternalLink size={16} color={colors.primary} />
          <Text style={styles.openMapsBtnText}>Open in Maps</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.openWazeBtn}
          onPress={onOpenInWaze}
          activeOpacity={0.7}
        >
          <Navigation size={16} color="#33ccff" />
          <Text style={styles.openWazeBtnText}>Open in Waze</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, { borderColor: colors.danger + '40' }]}>
          <XCircle size={18} color={colors.danger} />
          <Text style={styles.summaryCount}>{routeResult.blockedHazards.length}</Text>
          <Text style={styles.summaryLabel}>Blocked</Text>
        </View>
        <View style={[styles.summaryCard, { borderColor: colors.warning + '40' }]}>
          <AlertTriangle size={18} color={colors.warning} />
          <Text style={styles.summaryCount}>{routeResult.tightHazards.length}</Text>
          <Text style={styles.summaryLabel}>Tight</Text>
        </View>
        <View style={[styles.summaryCard, { borderColor: colors.success + '40' }]}>
          <CheckCircle size={18} color={colors.success} />
          <Text style={styles.summaryCount}>{routeResult.safeHazards.length}</Text>
          <Text style={styles.summaryLabel}>Clear</Text>
        </View>
      </View>

      {routeResult.blockedHazards.length > 0 && (
        <RouteHazardSection
          colors={colors}
          title="Cannot Pass — Avoid These"
          titleColor={colors.danger}
          icon={<XCircle size={16} color={colors.danger} />}
          hazards={routeResult.blockedHazards}
          dotColor={colors.danger}
          profile={profile}
        />
      )}

      {routeResult.tightHazards.length > 0 && (
        <RouteHazardSection
          colors={colors}
          title="Tight Clearance — Use Caution"
          titleColor={colors.warning}
          icon={<AlertTriangle size={16} color={colors.warning} />}
          hazards={routeResult.tightHazards}
          dotColor={colors.warning}
          profile={profile}
        />
      )}

      {routeResult.safeHazards.length > 0 && (
        <RouteHazardSection
          colors={colors}
          title="Safe to Pass"
          titleColor={colors.success}
          icon={<CheckCircle size={16} color={colors.success} />}
          hazards={routeResult.safeHazards}
          dotColor={colors.success}
          profile={profile}
        />
      )}

      {routeResult.nearbyHazards.length === 0 && (
        <View style={styles.noHazardsCard}>
          <Shield size={32} color={colors.success} />
          <Text style={styles.noHazardsText}>No known hazards on route!</Text>
          <Text style={styles.noHazardsSubtext}>
            Always stay alert for temporary road changes.
          </Text>
        </View>
      )}

      <RouteStepsList colors={colors} steps={routeResult.route.steps} />

      {nearbyDocks.length > 0 && (
        <View style={styles.docksSection}>
          <View style={styles.docksSectionHeader}>
            <MapPin size={16} color={colors.primary} />
            <Text style={[styles.docksSectionTitle, { color: colors.primary }]}>
              Docks Near Destination
            </Text>
          </View>
          {nearbyDocks.map((dock) => (
            <View key={dock.id} style={styles.dockItem}>
              <View style={[styles.dockDot, { backgroundColor: colors.primary }]} />
              <View style={styles.dockInfo}>
                <Text style={styles.dockName}>{dock.name}</Text>
                <Text style={styles.dockBusiness}>{dock.business}</Text>
                {dock.id.startsWith('osm-') && (
                  <View style={styles.liveTag}>
                    <Wifi size={8} color={colors.success} />
                    <Text style={styles.liveTagText}>Live</Text>
                  </View>
                )}
              </View>
            </View>
          ))}
        </View>
      )}
    </Animated.View>
  );
}

export default React.memo(RouteResultsView);

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  resultsContainer: {
    gap: 12,
  },
  mapContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  map: {
    height: 260,
    width: '100%',
  },
  routeSummary: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  routeSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  routeStat: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  routeStatValue: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800' as const,
  },
  routeStatLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '600' as const,
    textTransform: 'uppercase' as const,
  },
  routeStatDivider: {
    width: 1,
    height: 36,
    backgroundColor: colors.border,
  },
  startNavBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: colors.success,
    borderRadius: 14,
    paddingVertical: 16,
  },
  startNavBtnText: {
    color: colors.background,
    fontSize: 16,
    fontWeight: '800' as const,
  },
  liveDataBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.success + '10',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.success + '25',
  },
  liveDataText: {
    color: colors.success,
    fontSize: 12,
    fontWeight: '600' as const,
    flex: 1,
  },
  externalNavRow: {
    flexDirection: 'row',
    gap: 10,
  },
  openMapsBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary + '15',
    borderRadius: 12,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  openMapsBtnText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '700' as const,
  },
  openWazeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#33ccff' + '15',
    borderRadius: 12,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#33ccff' + '30',
  },
  openWazeBtnText: {
    color: '#33ccff',
    fontSize: 14,
    fontWeight: '700' as const,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 10,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
  },
  summaryCount: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '800' as const,
  },
  summaryLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '600' as const,
  },
  noHazardsCard: {
    backgroundColor: colors.success + '10',
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: colors.success + '30',
  },
  noHazardsText: {
    color: colors.success,
    fontSize: 16,
    fontWeight: '700' as const,
  },
  noHazardsSubtext: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  docksSection: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  docksSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  docksSectionTitle: {
    fontSize: 14,
    fontWeight: '700' as const,
  },
  dockItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  dockDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dockInfo: {
    flex: 1,
  },
  dockName: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600' as const,
  },
  dockBusiness: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 1,
  },
  liveTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 3,
  },
  liveTagText: {
    color: colors.success,
    fontSize: 9,
    fontWeight: '600' as const,
  },
});
