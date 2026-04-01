import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Animated,
  ActivityIndicator,
} from 'react-native';
import {
  Navigation,
  AlertTriangle,
  Search,
  ArrowRight,
  Ruler,
  MapPin,
  Locate,
  Wifi,
  Volume2,
  VolumeX,
  Weight,
  MoveHorizontal,
} from 'lucide-react-native';
import MapView from 'react-native-maps';
import { ThemeColors } from '@/constants/colors';
import { LiveRouteData } from '@/context/NavigationContext';
import { Dock, Hazard, RouteCoordinate, TruckProfile } from '@/types';
import { GeocodedPlace } from '@/services/routing';
import { cachedStyles } from '@/utils/styleCache';
import RouteResultsView from './RouteResultsView';

interface RoutePlanningViewProps {
  colors: ThemeColors;
  profile: TruckProfile;
  voiceActive: boolean;
  destination: string;
  showSuggestions: boolean;
  geocodedResults: GeocodedPlace[];
  isSearching: boolean;
  selectedDestCoord: RouteCoordinate | null;
  routeResult: LiveRouteData | null;
  isRouting: boolean;
  displayError: string | null;
  fadeAnim: Animated.Value;
  userLocation: RouteCoordinate | null;
  nearbyDocks: Dock[];
  planMapRef: React.RefObject<MapView | null>;
  onSearchChange: (text: string) => void;
  onSelectPlace: (place: GeocodedPlace) => void;
  onStartRoute: () => void;
  onStartNavigation: () => void;
  onOpenInMaps: () => void;
  onOpenInWaze: () => void;
  getHazardColor: (hazard: Hazard) => string;
}

export default function RoutePlanningView({
  colors,
  profile,
  voiceActive,
  destination,
  showSuggestions,
  geocodedResults,
  isSearching,
  selectedDestCoord,
  routeResult,
  isRouting,
  displayError,
  fadeAnim,
  userLocation,
  nearbyDocks,
  planMapRef,
  onSearchChange,
  onSelectPlace,
  onStartRoute,
  onStartNavigation,
  onOpenInMaps,
  onOpenInWaze,
  getHazardColor,
}: RoutePlanningViewProps) {
  const styles = cachedStyles(makeStyles, colors);

  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.heroCard}>
        <View style={styles.heroHeader}>
          <View style={styles.heroIconWrap}>
            <Navigation size={20} color={colors.primary} />
          </View>
          <View style={styles.heroTextWrap}>
            <Text style={styles.heroTitle}>Live Route Planner</Text>
            <Text style={styles.heroSubtitle}>
              Real-time directions avoiding low bridges & wires
            </Text>
          </View>
        </View>
        <View style={styles.liveIndicator}>
          <Wifi size={12} color={colors.success} />
          <Text style={styles.liveIndicatorText}>Live data from OSRM + OpenStreetMap</Text>
        </View>
      </View>

      <View style={styles.truckInfoRow}>
        <View style={styles.truckInfoChips}>
          <View style={styles.truckInfoChip}>
            <Ruler size={12} color={colors.primary} />
            <Text style={styles.truckInfoChipValue}>{profile.height.toFixed(1)}m</Text>
          </View>
          <View style={styles.truckInfoChip}>
            <Weight size={12} color={colors.warning} />
            <Text style={styles.truckInfoChipValue}>{profile.weight.toFixed(1)}t</Text>
          </View>
          <View style={styles.truckInfoChip}>
            <MoveHorizontal size={12} color={colors.success} />
            <Text style={styles.truckInfoChipValue}>{profile.width.toFixed(1)}m</Text>
          </View>
        </View>
        <Text style={styles.truckInfoHint}>
          {profile.type.replace(/_/g, ' ')}
        </Text>
        <View style={styles.voiceBadge}>
          {voiceActive ? (
            <Volume2 size={12} color={colors.success} />
          ) : (
            <VolumeX size={12} color={colors.textMuted} />
          )}
          <Text style={[styles.voiceBadgeText, voiceActive && { color: colors.success }]}>
            Voice {voiceActive ? 'ON' : 'OFF'}
          </Text>
        </View>
      </View>

      <View style={styles.inputSection}>
        <Text style={styles.inputLabel}>Where are you going?</Text>
        <View style={styles.inputWrapper}>
          <Search size={18} color={colors.textMuted} />
          <TextInput
            style={styles.input}
            placeholder="Search address, suburb, or business..."
            placeholderTextColor={colors.textMuted}
            value={destination}
            onChangeText={onSearchChange}
            testID="route-destination-input"
          />
          {isSearching && (
            <ActivityIndicator size="small" color={colors.primary} />
          )}
        </View>

        {showSuggestions && geocodedResults.length > 0 && (
          <View style={styles.suggestionsBox}>
            {geocodedResults.map((place, index) => (
              <TouchableOpacity
                key={`${place.latitude}-${place.longitude}-${index}`}
                style={styles.suggestionItem}
                onPress={() => onSelectPlace(place)}
              >
                <MapPin size={14} color={colors.primary} />
                <Text style={styles.suggestionText} numberOfLines={2}>
                  {place.displayName}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {selectedDestCoord && !routeResult && (
          <View style={styles.selectedDestBadge}>
            <Locate size={14} color={colors.success} />
            <Text style={styles.selectedDestText} numberOfLines={1}>
              Destination set — ready to route
            </Text>
          </View>
        )}
      </View>

      <TouchableOpacity
        style={[
          styles.checkRouteBtn,
          (!selectedDestCoord || isRouting) && styles.checkRouteBtnDisabled,
        ]}
        onPress={onStartRoute}
        disabled={!selectedDestCoord || isRouting}
        activeOpacity={0.7}
        testID="start-route-btn"
      >
        {isRouting ? (
          <View style={styles.routingRow}>
            <ActivityIndicator size="small" color={colors.background} />
            <Text style={styles.checkRouteBtnText}>Computing live route...</Text>
          </View>
        ) : (
          <>
            <Text style={styles.checkRouteBtnText}>Get Live Route</Text>
            <ArrowRight size={18} color={colors.background} />
          </>
        )}
      </TouchableOpacity>

      {displayError && (
        <View style={styles.errorCard}>
          <AlertTriangle size={18} color={colors.danger} />
          <Text style={styles.errorText}>{displayError}</Text>
        </View>
      )}

      {routeResult && (
        <RouteResultsView
          colors={colors}
          profile={profile}
          routeResult={routeResult}
          fadeAnim={fadeAnim}
          userLocation={userLocation}
          selectedDestCoord={selectedDestCoord}
          nearbyDocks={nearbyDocks}
          planMapRef={planMapRef}
          onStartNavigation={onStartNavigation}
          onOpenInMaps={onOpenInMaps}
          onOpenInWaze={onOpenInWaze}
          getHazardColor={getHazardColor}
        />
      )}
    </ScrollView>
  );
}

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  heroCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  heroIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.primary + '18',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroTextWrap: {
    flex: 1,
  },
  heroTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '800' as const,
  },
  heroSubtitle: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  liveIndicatorText: {
    color: colors.success,
    fontSize: 11,
    fontWeight: '600' as const,
  },
  truckInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.primary + '12',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.primary + '25',
  },
  truckInfoChips: {
    flexDirection: 'row',
    gap: 6,
  },
  truckInfoChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.surface,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  truckInfoChipValue: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700' as const,
  },
  truckInfoHint: {
    color: colors.textMuted,
    fontSize: 12,
    flex: 1,
  },
  voiceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surface,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  voiceBadgeText: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '600' as const,
  },
  inputSection: {
    marginBottom: 14,
  },
  inputLabel: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600' as const,
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  input: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
    paddingVertical: 14,
  },
  suggestionsBox: {
    backgroundColor: colors.elevated,
    borderRadius: 12,
    marginTop: 4,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    maxHeight: 260,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  suggestionText: {
    color: colors.text,
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },
  selectedDestBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.success + '12',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.success + '25',
  },
  selectedDestText: {
    color: colors.success,
    fontSize: 13,
    fontWeight: '600' as const,
    flex: 1,
  },
  checkRouteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
    marginBottom: 16,
  },
  checkRouteBtnDisabled: {
    opacity: 0.4,
  },
  checkRouteBtnText: {
    color: colors.background,
    fontSize: 16,
    fontWeight: '700' as const,
  },
  routingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.danger + '12',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.danger + '25',
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
    flex: 1,
    fontWeight: '500' as const,
  },
});
