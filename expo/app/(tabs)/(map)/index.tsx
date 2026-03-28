import React, { useState, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Animated,
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
} from 'lucide-react-native';
import MapView, { Marker, Polyline, Region } from 'react-native-maps';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/context/ThemeContext';
import { ThemeColors } from '@/constants/colors';
import { TRUCK_TYPES } from '@/constants/categories';
import { useTruckProfile } from '@/context/TruckSettingsContext';
import { useLiveData } from '@/context/LiveDataContext';
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
import { DockMarkerItem, HazardMarkerItem } from '@/components/map/MapMarkers';
import { useMapFilters } from '@/hooks/useMapFilters';
import { useMapRouting } from '@/hooks/useMapRouting';
import { getHazardColor as getHazardColorUtil } from '@/utils/hazards';
import ScreenErrorBoundary from '@/components/ScreenErrorBoundary';

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
    updateMapCenter,
    refetchDocks,
    refetchHazards,
  } = useLiveData();
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

  const visibleDocks = useMemo(() => filteredDocks.slice(0, 200), [filteredDocks]);
  const visibleHazards = useMemo(() => filteredHazards.slice(0, 200), [filteredHazards]);
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
    if (showVehiclePickerRef.current) setShowVehiclePicker(false);
  }, []);

  const handleToggleVehiclePicker = useCallback(() => {
    setShowVehiclePicker(prev => !prev);
  }, []);

  const handleSelectVehicleType = useCallback((type: TruckProfile['type'], defaultHeight: number) => {
    updateProfile({ type, height: defaultHeight });
    setShowVehiclePicker(false);
  }, [updateProfile]);

  const totalReports = useMemo(() => docks.length + hazards.length, [docks.length, hazards.length]);

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

  React.useEffect(() => {
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
      updateMapCenter({ latitude: region.latitude, longitude: region.longitude });
      regionChangeTimer.current = null;
    }, 400);
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

  const isLoading = isLoadingDocks || isLoadingHazards;

  const loadingSpinAnim = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
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

  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <View style={styles.container}>
      <ScreenErrorBoundary screenName="Map" colors={colors}>
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

          {visibleDocks.map((dock) => (
            <DockMarkerItem key={dock.id} dock={dock} colors={colors} onPress={handleDockPress} />
          ))}
          {visibleHazards.map((hazard) => (
            <HazardMarkerItem key={hazard.id} hazard={hazard} colors={colors} profile={profile} onPress={handleHazardPress} />
          ))}
        </MapView>
      </ScreenErrorBoundary>

      {isLoading && (
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

      <TouchableOpacity
        style={[styles.hamburgerBtn, { top: insets.top + 12 }]}
        onPress={openDrawer}
        activeOpacity={0.8}
        testID="hamburger-menu"
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
        >
          <Layers size={18} color={colors.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={handleRefresh}
          activeOpacity={0.8}
          testID="refresh-btn"
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
          onStop={stopNavigation}
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
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 8 },
      android: { elevation: 4 },
      web: { boxShadow: '0 2px 8px rgba(0,0,0,0.15)' },
    }),
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
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 6 },
      android: { elevation: 3 },
      web: { boxShadow: '0 2px 6px rgba(0,0,0,0.12)' },
    }),
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
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 8 },
      android: { elevation: 4 },
      web: { boxShadow: '0 2px 8px rgba(0,0,0,0.15)' },
    }),
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
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 4 },
      android: { elevation: 2 },
      web: { boxShadow: '0 1px 4px rgba(0,0,0,0.1)' },
    }),
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600' as const,
  },
});
