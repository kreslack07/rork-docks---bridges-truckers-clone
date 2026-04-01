import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Alert,
  Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  Navigation,
  Menu,
  Locate,
  RefreshCw,
  Layers,
  Loader,
  ZoomIn,
} from 'lucide-react-native';
import MapView, { Marker, Polyline, Region } from 'react-native-maps';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/context/ThemeContext';
import { ThemeColors } from '@/constants/colors';
import { TRUCK_TYPES } from '@/constants/categories';
import { useTruckProfile } from '@/context/UserPreferencesContext';
import { useLiveData } from '@/context/LiveDataContext';
import { useMapViewport } from '@/context/MapViewportContext';
import { useNavigation } from '@/context/NavigationContext';
import { useNotifications } from '@/context/NotificationsContext';
import { useAuth } from '@/context/AuthContext';
import { Dock, Hazard } from '@/types';
import type { TruckProfile } from '@/types';
import MapDrawer, { DRAWER_WIDTH } from '@/components/map/MapDrawer';
import MapDetailCard from '@/components/map/MapDetailCard';
import VehiclePicker from '@/components/map/VehiclePicker';
import LiveNavBanner from '@/components/map/LiveNavBanner';
import RouteBanner from '@/components/map/RouteBanner';
import FilterIndicator from '@/components/map/FilterIndicator';
import MapBottomBar from '@/components/map/MapBottomBar';
import MapFloatingActions from '@/components/map/MapFloatingActions';
import { MapMarkerList } from '@/components/map/MapMarkers';
import { useMapFilters } from '@/hooks/useMapFilters';
import { useMapRouting } from '@/hooks/useMapRouting';
import { getHazardColor as getHazardColorUtil } from '@/utils/hazards';
import ScreenErrorBoundary from '@/components/ScreenErrorBoundary';
import { cachedStyles } from '@/utils/styleCache';
import { platformShadow } from '@/utils/shadows';

const AUSTRALIA_REGION: Region = {
  latitude: -28.0,
  longitude: 134.0,
  latitudeDelta: 30,
  longitudeDelta: 30,
};

export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors } = useTheme();
  const { profile, updateProfile } = useTruckProfile();
  const { user } = useAuth();
  const { unreadCount } = useNotifications();
  const {
    docks,
    hazards,
    isLoadingDocks,
    isLoadingHazards,
    isOffline,
    refetchDocks,
    refetchHazards,
  } = useLiveData();
  const { updateMapCenter } = useMapViewport();
  const {
    isNavigating,
    livePosition,
    navProgress,
    liveRoute: contextLiveRoute,
    stopNavigation,
  } = useNavigation();

  const mapRef = useRef<MapView>(null);
  const [selectedDock, setSelectedDock] = useState<Dock | null>(null);
  const [selectedHazard, setSelectedHazard] = useState<Hazard | null>(null);
  const cardAnim = useRef(new Animated.Value(0)).current;
  const drawerAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);
  const [showVehiclePicker, setShowVehiclePicker] = useState<boolean>(false);

  const { filter, filteredDocks, filteredHazards, cycleFilter, filterLabel, clearFilter } = useMapFilters(docks, hazards);

  const [mapZoomDelta, setMapZoomDelta] = useState<number>(30);
  const markerLimit = useMemo(() => {
    if (mapZoomDelta < 0.05) return 300;
    if (mapZoomDelta < 0.2) return 200;
    return 120;
  }, [mapZoomDelta]);
  const visibleDocks = useMemo(() => filteredDocks.length <= markerLimit ? filteredDocks : filteredDocks.slice(0, markerLimit), [filteredDocks, markerLimit]);
  const visibleHazards = useMemo(() => filteredHazards.length <= markerLimit ? filteredHazards : filteredHazards.slice(0, markerLimit), [filteredHazards, markerLimit]);
  const isMarkersCapped = filteredDocks.length > markerLimit || filteredHazards.length > markerLimit;
  const hiddenCount = Math.max(0, filteredDocks.length - markerLimit) + Math.max(0, filteredHazards.length - markerLimit);
  const { activeRoute, routeHazards, isRouting, routeToDock, clearRoute, userLocation, getUserLocation } = useMapRouting(profile, hazards, mapRef);

  const handleViewHazards = useCallback(() => {
    router.push('/(tabs)/hazards');
  }, [router]);

  const handleReportHazard = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/report-hazard');
  }, [router]);

  const handleSearchPress = useCallback(() => {
    router.push('/search');
  }, [router]);

  const showVehiclePickerRef = useRef(showVehiclePicker);
  showVehiclePickerRef.current = showVehiclePicker;

  const dismissVehiclePicker = useCallback(() => {
    Keyboard.dismiss();
    if (showVehiclePickerRef.current) setShowVehiclePicker(false);
  }, []);

  const handleToggleVehiclePicker = useCallback(() => {
    setShowVehiclePicker(prev => !prev);
  }, []);

  const handleSelectVehicleType = useCallback((type: TruckProfile['type'], defaultHeight: number) => {
    updateProfile({ type, height: defaultHeight });
    setShowVehiclePicker(false);
  }, [updateProfile]);

  const docksLen = docks.length;
  const hazardsLen = hazards.length;
  const totalReports = useMemo(() => docksLen + hazardsLen, [docksLen, hazardsLen]);

  const userName = useMemo(() => user?.displayName || profile.name || 'Truck Driver', [user?.displayName, profile.name]);
  const hazardCount = hazards.length;
  const isAuthenticated = !!user;

  const truckTypeLabel = useMemo(() => {
    const found = TRUCK_TYPES.find(t => t.value === profile.type);
    return found ? found.label : 'Custom';
  }, [profile.type]);

  const showCard = useCallback(() => {
    Animated.spring(cardAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 80,
      friction: 10,
    }).start();
  }, [cardAnim]);

  const hideCard = useCallback(() => {
    Animated.timing(cardAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setSelectedDock(null);
      setSelectedHazard(null);
    });
  }, [cardAnim]);

  const openDrawer = useCallback(() => {
    setDrawerOpen(true);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.spring(drawerAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 65,
      friction: 11,
    }).start();
  }, [drawerAnim]);

  const closeDrawer = useCallback(() => {
    Animated.timing(drawerAnim, {
      toValue: -DRAWER_WIDTH,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setDrawerOpen(false);
    });
  }, [drawerAnim]);

  const handleDockPress = useCallback((dock: Dock) => {
    setSelectedHazard(null);
    setSelectedDock(dock);
    showCard();
  }, [showCard]);

  const handleHazardPress = useCallback((hazard: Hazard) => {
    setSelectedDock(null);
    setSelectedHazard(hazard);
    showCard();
  }, [showCard]);

  const regionChangeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (regionChangeTimer.current) {
        clearTimeout(regionChangeTimer.current);
      }
    };
  }, []);

  const handleRegionChange = useCallback((region: Region) => {
    if (regionChangeTimer.current) {
      clearTimeout(regionChangeTimer.current);
    }
    regionChangeTimer.current = setTimeout(() => {
      setMapZoomDelta(region.latitudeDelta);
      updateMapCenter(
        { latitude: region.latitude, longitude: region.longitude },
        {
          latitude: region.latitude,
          longitude: region.longitude,
          latitudeDelta: region.latitudeDelta,
          longitudeDelta: region.longitudeDelta,
        },
      );
      regionChangeTimer.current = null;
    }, 500);
  }, [updateMapCenter]);

  const goToMyLocation = useCallback(async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const loc = await getUserLocation();
    if (loc && mapRef.current) {
      mapRef.current.animateToRegion({
        ...loc,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      }, 600);
    }
  }, [getUserLocation]);

  const getHazardColor = useCallback((hazard: Hazard) => {
    return getHazardColorUtil(hazard, profile, colors);
  }, [profile, colors]);

  const handleRefresh = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    void refetchDocks();
    void refetchHazards();
  }, [refetchDocks, refetchHazards]);

  const handleStopNavigation = useCallback(() => {
    Alert.alert(
      'Stop Navigation',
      'Are you sure you want to stop navigating?',
      [
        { text: 'Keep Going', style: 'cancel' },
        {
          text: 'Stop',
          style: 'destructive',
          onPress: () => {
            stopNavigation();
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          },
        },
      ],
    );
  }, [stopNavigation]);

  const isLoading = isLoadingDocks || isLoadingHazards;
  const isFirstLoad = isLoading && docks.length === 0 && hazards.length === 0;

  const loadingSpinAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isLoading) {
      const spin = Animated.loop(
        Animated.timing(loadingSpinAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      );
      spin.start();
      return () => spin.stop();
    } else {
      loadingSpinAnim.setValue(0);
    }
  }, [isLoading, loadingSpinAnim]);

  const styles = cachedStyles(makeStyles, colors);

  return (
    <ScreenErrorBoundary screenName="Map" colors={colors}>
    <View style={styles.container}>
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={AUSTRALIA_REGION}
          mapType="standard"
          onRegionChangeComplete={handleRegionChange}
          onPress={dismissVehiclePicker}
        >
          {activeRoute && (
            <Polyline
              coordinates={activeRoute.coordinates}
              strokeColor={colors.primary}
              strokeWidth={5}
            />
          )}

          {isNavigating && livePosition && (
            <Marker
              coordinate={{ latitude: livePosition.latitude, longitude: livePosition.longitude }}
              title="You"
              anchor={{ x: 0.5, y: 0.5 }}
            >
              <View style={styles.wazeArrow}>
                <Navigation size={14} color={colors.white} style={{ transform: [{ rotate: `${livePosition.heading ?? 0}deg` }] }} />
              </View>
            </Marker>
          )}

          {isNavigating && contextLiveRoute && (
            <Polyline
              coordinates={contextLiveRoute.route.coordinates}
              strokeColor={colors.success}
              strokeWidth={6}
            />
          )}

          {userLocation && activeRoute && !isNavigating && (
            <Marker coordinate={userLocation} title="Your Location" pinColor={colors.primary} />
          )}

          <MapMarkerList
            docks={visibleDocks}
            hazards={visibleHazards}
            colors={colors}
            profile={profile}
            onDockPress={handleDockPress}
            onHazardPress={handleHazardPress}
          />
        </MapView>

      {isFirstLoad && (
        <View style={styles.firstLoadOverlay}>
          <View style={styles.firstLoadCard}>
            <Animated.View
              style={{
                transform: [{ rotate: loadingSpinAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }],
              }}
            >
              <Loader size={24} color={colors.primary} />
            </Animated.View>
            <Text style={styles.firstLoadTitle}>Loading Map Data</Text>
            <Text style={styles.firstLoadSub}>Fetching docks & hazards nearby...</Text>
          </View>
        </View>
      )}

      {isLoading && !isFirstLoad && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingPill}>
            <Animated.View
              style={{
                transform: [{ rotate: loadingSpinAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }],
              }}
            >
              <Loader size={14} color={colors.primary} />
            </Animated.View>
            <Text style={styles.loadingText}>Updating...</Text>
          </View>
        </View>
      )}

      {isMarkersCapped && (
        <View style={[styles.zoomHintBanner, { top: insets.top + 60 }]} pointerEvents="none">
          <ZoomIn size={13} color={colors.textSecondary} />
          <Text style={styles.zoomHintText}>
            Zoom in to see {hiddenCount} more marker{hiddenCount !== 1 ? 's' : ''}
          </Text>
        </View>
      )}

      {isOffline && (
        <TouchableOpacity
          style={[styles.offlineRetryBanner, { top: insets.top + 12 }]}
          onPress={handleRefresh}
          activeOpacity={0.8}
          accessibilityLabel="Tap to retry loading data"
          accessibilityRole="button"
        >
          <RefreshCw size={14} color={colors.warning} />
          <Text style={styles.offlineRetryText}>Offline — Tap to retry</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={[styles.hamburgerBtn, { top: insets.top + 12 }]}
        onPress={openDrawer}
        activeOpacity={0.8}
        testID="hamburger-menu"
        accessibilityLabel="Open menu"
        accessibilityRole="button"
      >
        <Menu size={20} color={colors.text} />
        {unreadCount > 0 && (
          <View style={styles.notifDot} />
        )}
      </TouchableOpacity>

      <View style={[styles.rightActions, { top: insets.top + 12 }]}>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={cycleFilter}
          activeOpacity={0.8}
          testID="filter-btn"
          accessibilityLabel={`Filter: ${filterLabel}`}
          accessibilityRole="button"
        >
          <Layers size={18} color={colors.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={handleRefresh}
          activeOpacity={0.8}
          testID="refresh-btn"
          accessibilityLabel="Refresh map data"
          accessibilityRole="button"
        >
          <RefreshCw size={18} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {filter !== 'all' && (
        <FilterIndicator
          colors={colors}
          label={filterLabel}
          insetTop={insets.top}
          onClear={clearFilter}
        />
      )}

      {isNavigating && navProgress && contextLiveRoute && (
        <LiveNavBanner
          colors={colors}
          navProgress={navProgress}
          insetTop={insets.top}
          onStop={handleStopNavigation}
        />
      )}

      {activeRoute && !isNavigating && (
        <RouteBanner
          colors={colors}
          activeRoute={activeRoute}
          routeHazards={routeHazards}
          insetTop={insets.top}
          onClear={clearRoute}
        />
      )}

      <TouchableOpacity
        style={[styles.myLocationBtn, { bottom: insets.bottom + 180 }]}
        onPress={goToMyLocation}
        activeOpacity={0.8}
        testID="my-location-btn"
        accessibilityLabel="Go to my location"
        accessibilityRole="button"
      >
        <Locate size={20} color={colors.textSecondary} />
      </TouchableOpacity>

      <MapFloatingActions
        colors={colors}
        totalReports={totalReports}
        insetBottom={insets.bottom}
        onViewHazards={handleViewHazards}
        onReportHazard={handleReportHazard}
      />

      <VehiclePicker
        colors={colors}
        profile={profile}
        showPicker={showVehiclePicker}
        truckTypeLabel={truckTypeLabel}
        insetBottom={insets.bottom}
        onTogglePicker={handleToggleVehiclePicker}
        onSelectType={handleSelectVehicleType}
      />

      <MapBottomBar
        colors={colors}
        insetBottom={insets.bottom}
        isLoading={isLoading}
        isOffline={isOffline}
        onSearchPress={handleSearchPress}
      />

      <MapDetailCard
        colors={colors}
        selectedDock={selectedDock}
        selectedHazard={selectedHazard}
        cardAnim={cardAnim}
        insetBottom={insets.bottom}
        truckHeight={profile.height}
        truckWeight={profile.weight}
        truckWidth={profile.width}
        isRouting={isRouting}
        onHideCard={hideCard}
        onRouteToDock={routeToDock}
        getHazardColor={getHazardColor}
      />

      <MapDrawer
        colors={colors}
        drawerOpen={drawerOpen}
        drawerAnim={drawerAnim}
        insetTop={insets.top}
        userName={userName}
        truckTypeLabel={truckTypeLabel}
        truckHeight={profile.height}
        hazardCount={hazardCount}
        isAuthenticated={isAuthenticated}
        onClose={closeDrawer}
      />

    </View>
    </ScreenErrorBoundary>
  );
}

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  map: {
    flex: 1,
  },
  hamburgerBtn: {
    position: 'absolute',
    left: 16,
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    ...platformShadow({ offsetY: 2, radius: 8, opacity: 0.15, elevation: 4 }),
  },
  notifDot: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.danger,
  },
  rightActions: {
    position: 'absolute',
    right: 16,
    gap: 10,
  },
  actionBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    ...platformShadow({ offsetY: 2, radius: 6, opacity: 0.12, elevation: 3 }),
  },

  myLocationBtn: {
    position: 'absolute',
    right: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    ...platformShadow({ offsetY: 2, radius: 8, opacity: 0.15, elevation: 4 }),
  },
  wazeArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: colors.white,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingTop: 4,
    zIndex: 5,
    pointerEvents: 'none',
  },
  loadingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    ...platformShadow({ offsetY: 1, radius: 4, opacity: 0.1, elevation: 2 }),
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600' as const,
  },
  offlineRetryBanner: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.warning + '20',
    borderWidth: 1,
    borderColor: colors.warning + '40',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    zIndex: 10,
    ...platformShadow({ offsetY: 2, radius: 6, opacity: 0.15, elevation: 4 }),
  },
  offlineRetryText: {
    color: colors.warning,
    fontSize: 13,
    fontWeight: '700' as const,
  },
  zoomHintBanner: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    zIndex: 6,
    ...platformShadow({ offsetY: 1, radius: 4, opacity: 0.1, elevation: 2 }),
  },
  zoomHintText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600' as const,
  },
  firstLoadOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  firstLoadCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    paddingVertical: 28,
    paddingHorizontal: 36,
    alignItems: 'center',
    gap: 10,
    ...platformShadow({ offsetY: 4, radius: 12, opacity: 0.18, elevation: 8 }),
  },
  firstLoadTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700' as const,
    marginTop: 4,
  },
  firstLoadSub: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '500' as const,
  },
});
