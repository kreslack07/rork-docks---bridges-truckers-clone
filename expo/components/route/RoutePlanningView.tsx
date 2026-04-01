import React, { useState } from 'react';
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
  Zap,
  CheckCircle,
  XCircle,
  Search,
  ArrowRight,
  Ruler,
  MapPin,
  Clock,
  Route,
  ChevronRight,
  Locate,
  ExternalLink,
  Wifi,
  Shield,
  Play,
  Volume2,
  VolumeX,
  Weight,
  MoveHorizontal,
} from 'lucide-react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { ThemeColors } from '@/constants/colors';
import { LiveRouteData } from '@/context/NavigationContext';
import { Dock, Hazard, RouteCoordinate, TruckProfile } from '@/types';
import { GeocodedPlace, formatDistance, formatDuration } from '@/services/routing';
import { cachedStyles } from '@/utils/styleCache';

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
  const [showSteps, setShowSteps] = useState<boolean>(false);
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
            <HazardSection
              colors={colors}
              styles={styles}
              title="Cannot Pass — Avoid These"
              titleColor={colors.danger}
              icon={<XCircle size={16} color={colors.danger} />}
              hazards={routeResult.blockedHazards}
              dotColor={colors.danger}
              profile={profile}
            />
          )}

          {routeResult.tightHazards.length > 0 && (
            <HazardSection
              colors={colors}
              styles={styles}
              title="Tight Clearance — Use Caution"
              titleColor={colors.warning}
              icon={<AlertTriangle size={16} color={colors.warning} />}
              hazards={routeResult.tightHazards}
              dotColor={colors.warning}
              profile={profile}
            />
          )}

          {routeResult.safeHazards.length > 0 && (
            <HazardSection
              colors={colors}
              styles={styles}
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

          <TouchableOpacity
            style={styles.stepsToggle}
            onPress={() => setShowSteps(!showSteps)}
            activeOpacity={0.7}
          >
            <Navigation size={16} color={colors.primary} />
            <Text style={styles.stepsToggleText}>
              {showSteps ? 'Hide' : 'Show'} Turn-by-Turn ({routeResult.route.steps.length} steps)
            </Text>
            <ChevronRight
              size={16}
              color={colors.textSecondary}
              style={{ transform: [{ rotate: showSteps ? '90deg' : '0deg' }] }}
            />
          </TouchableOpacity>

          {showSteps && (
            <View style={styles.stepsContainer}>
              {routeResult.route.steps.map((step, index) => (
                <View key={index} style={styles.stepItem}>
                  <View style={styles.stepIndex}>
                    <Text style={styles.stepIndexText}>{index + 1}</Text>
                  </View>
                  <View style={styles.stepContent}>
                    <Text style={styles.stepInstruction}>{step.instruction}</Text>
                    <View style={styles.stepMeta}>
                      <Text style={styles.stepDistance}>
                        {formatDistance(step.distance)}
                      </Text>
                      <Text style={styles.stepDuration}>
                        {formatDuration(step.duration)}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}

          {nearbyDocks.length > 0 && (
            <View style={styles.hazardSection}>
              <View style={styles.hazardSectionHeader}>
                <MapPin size={16} color={colors.primary} />
                <Text style={[styles.hazardSectionTitle, { color: colors.primary }]}>
                  Docks Near Destination
                </Text>
              </View>
              {nearbyDocks.map((dock) => (
                <View key={dock.id} style={styles.hazardItem}>
                  <View style={[styles.hazardDot, { backgroundColor: colors.primary }]} />
                  <View style={styles.hazardInfo}>
                    <Text style={styles.hazardName}>{dock.name}</Text>
                    <Text style={styles.hazardRoad}>{dock.business}</Text>
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
      )}
    </ScrollView>
  );
}

function getBlockedReasons(
  hazard: Hazard,
  profile: TruckProfile,
): { heightBlocked: boolean; weightBlocked: boolean; widthBlocked: boolean; heightTight: boolean } {
  const heightBlocked = hazard.clearanceHeight < profile.height;
  const heightTight = !heightBlocked && hazard.clearanceHeight < profile.height + 0.3;
  const weightBlocked = hazard.weightLimit ? profile.weight > hazard.weightLimit : false;
  const widthBlocked = hazard.widthLimit ? profile.width > hazard.widthLimit : false;
  return { heightBlocked, weightBlocked, widthBlocked, heightTight };
}

function HazardSection({
  colors,
  styles,
  title,
  titleColor,
  icon,
  hazards,
  dotColor,
  profile,
}: {
  colors: ThemeColors;
  styles: any;
  title: string;
  titleColor: string;
  icon: React.ReactNode;
  hazards: Hazard[];
  dotColor: string;
  profile: TruckProfile;
}) {
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
  stepsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stepsToggleText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600' as const,
    flex: 1,
  },
  stepsContainer: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 2,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  stepIndex: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary + '18',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepIndexText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700' as const,
  },
  stepContent: {
    flex: 1,
  },
  stepInstruction: {
    color: colors.text,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500' as const,
  },
  stepMeta: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  stepDistance: {
    color: colors.textMuted,
    fontSize: 11,
  },
  stepDuration: {
    color: colors.textMuted,
    fontSize: 11,
  },
});
