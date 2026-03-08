import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import {
  StyleSheet,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Linking,
} from 'react-native';
import { useMutation } from '@tanstack/react-query';
import MapView from 'react-native-maps';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/context/ThemeContext';
import { ThemeColors } from '@/constants/colors';
import { useTruckProfile, useVoice } from '@/context/TruckSettingsContext';
import { useLiveData } from '@/context/LiveDataContext';
import { useNavigation } from '@/context/NavigationContext';
import { Hazard, RouteCoordinate } from '@/types';
import { useUserLocation } from '@/hooks/useUserLocation';
import {
  geocodeAddress,
  GeocodedPlace,
} from '@/services/routing';
import { haversineDistance } from '@/utils/geo';
import { getHazardColor } from '@/utils/hazards';
import {
  speakInstruction,
  speakHazardWarning,
  speakNavigationStart,
  speakNavigationEnd,
  speakRerouting,
  stopSpeaking,
  resetVoiceState,
  HazardWarningParams,
} from '@/services/voice-navigation';

import { useFavourites } from '@/context/FavouritesContext';
import { openInWaze } from '@/services/waze';
import RouteNavigationView from '@/components/route/RouteNavigationView';
import RoutePlanningView from '@/components/route/RoutePlanningView';

export default function RouteScreen() {
  const { colors } = useTheme();
  const { profile } = useTruckProfile();
  const { docks } = useLiveData();
  const {
    computeRoute,
    liveRoute,
    isRouting,
    routeError: contextRouteError,
    clearRoute: clearLiveRoute,
    isNavigating,
    livePosition,
    navProgress,
    rerouteCount,
    startNavigation,
    stopNavigation,
    isRerouting,
  } = useNavigation();
  const [destination, setDestination] = useState<string>('');
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);
  const [localRouteError, setLocalRouteError] = useState<string | null>(null);
  const { userLocation, getUserLocation: getCurrentLocation } = useUserLocation();
  const [selectedDestCoord, setSelectedDestCoord] = useState<RouteCoordinate | null>(null);
  const { isVoiceEnabled: voiceActive, setVoiceEnabled: setVoiceActive } = useVoice();
  const { addRecentRoute } = useFavourites();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const navMapRef = useRef<MapView>(null);
  const planMapRef = useRef<MapView>(null);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSpokenStepRef = useRef<number>(-1);
  const lastSpokenHazardRef = useRef<Set<string>>(new Set());
  const hasSpokenEndRef = useRef<boolean>(false);
  const pendingRecentRouteRef = useRef<{ destination: string; latitude: number; longitude: number } | null>(null);

  useEffect(() => {
    if (isNavigating) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 0.6, duration: 1000, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
        ]),
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isNavigating, pulseAnim]);

  useEffect(() => {
    if (isNavigating && livePosition && navMapRef.current) {
      navMapRef.current.animateToRegion(
        {
          latitude: livePosition.latitude,
          longitude: livePosition.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        },
        500,
      );
    }
  }, [isNavigating, livePosition]);

  useEffect(() => {
    if (!isNavigating || !navProgress || !voiceActive) return;

    if (navProgress.currentStepIndex !== lastSpokenStepRef.current && navProgress.currentStep) {
      lastSpokenStepRef.current = navProgress.currentStepIndex;
      speakInstruction(navProgress.currentStep.instruction);
    }

    if (navProgress.completionPercent >= 98 && !hasSpokenEndRef.current) {
      hasSpokenEndRef.current = true;
      speakNavigationEnd();
    }
  }, [isNavigating, navProgress, voiceActive]);

  useEffect(() => {
    if (!isNavigating || !voiceActive || !liveRoute) return;

    for (const hazard of liveRoute.blockedHazards) {
      if (!lastSpokenHazardRef.current.has(hazard.id)) {
        lastSpokenHazardRef.current.add(hazard.id);
        const params: HazardWarningParams = {
          hazardName: hazard.name,
          clearanceHeight: hazard.clearanceHeight,
          truckHeight: profile.height,
          weightLimit: hazard.weightLimit,
          truckWeight: profile.weight,
          widthLimit: hazard.widthLimit,
          truckWidth: profile.width,
          hazardType: hazard.type,
        };
        speakHazardWarning(params);
      }
    }
    for (const hazard of liveRoute.tightHazards) {
      if (!lastSpokenHazardRef.current.has(hazard.id)) {
        lastSpokenHazardRef.current.add(hazard.id);
        const params: HazardWarningParams = {
          hazardName: hazard.name,
          clearanceHeight: hazard.clearanceHeight,
          truckHeight: profile.height,
          weightLimit: hazard.weightLimit,
          truckWeight: profile.weight,
          widthLimit: hazard.widthLimit,
          truckWidth: profile.width,
          hazardType: hazard.type,
        };
        speakHazardWarning(params);
      }
    }
  }, [isNavigating, voiceActive, liveRoute, profile.height, profile.weight, profile.width]);

  useEffect(() => {
    if (isRerouting && voiceActive) {
      speakRerouting();
    }
  }, [isRerouting, voiceActive]);

  const abortControllerRef = useRef<AbortController | null>(null);

  const geocodeMutation = useMutation({
    mutationFn: async ({ text, signal }: { text: string; signal: AbortSignal }) => {
      const results = await geocodeAddress(text + ', Australia', signal);
      return results;
    },
    onError: (error) => {
      if (!(error instanceof DOMException && error.name === 'AbortError')) {
        console.log('[Route] Geocoding error:', error);
      }
    },
  });

  const { mutate: doGeocode, reset: resetGeocode, data: geocodeData, isPending: isSearching } = geocodeMutation;
  const geocodedResults = geocodeData ?? [];

  const isNavigatingRef = useRef<boolean>(false);
  useEffect(() => {
    isNavigatingRef.current = isNavigating;
  }, [isNavigating]);

  useEffect(() => {
    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      resetGeocode();
      try {
        stopSpeaking();
        resetVoiceState();
      } catch (error) {
        console.log('[Route] Cleanup voice error:', error);
      }
      if (isNavigatingRef.current) {
        stopNavigation();
      }
    };
  }, [resetGeocode, stopNavigation]);

  const handleSearchChange = useCallback((text: string) => {
    setDestination(text);
    setLocalRouteError(null);
    setSelectedDestCoord(null);

    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (abortControllerRef.current) abortControllerRef.current.abort();

    if (text.trim().length >= 3) {
      setShowSuggestions(true);
      const controller = new AbortController();
      abortControllerRef.current = controller;
      searchTimeout.current = setTimeout(() => {
        doGeocode({ text, signal: controller.signal });
      }, 600);
    } else {
      setShowSuggestions(false);
      resetGeocode();
      if (text.trim().length === 0) {
        clearLiveRoute();
      }
    }
  }, [clearLiveRoute, doGeocode, resetGeocode]);

  const handleSelectPlace = useCallback((place: GeocodedPlace) => {
    const shortName = place.displayName.split(',').slice(0, 3).join(',');
    setDestination(shortName);
    setSelectedDestCoord({ latitude: place.latitude, longitude: place.longitude });
    setShowSuggestions(false);
    resetGeocode();
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [resetGeocode]);

  const startRoute = useCallback(async () => {
    if (!selectedDestCoord) {
      setLocalRouteError('Please select a destination from the search results.');
      return;
    }

    setLocalRouteError(null);
    clearLiveRoute();

    try {
      const origin = await getCurrentLocation();
      if (!origin) {
        setLocalRouteError('Could not determine your location. Please try again.');
        return;
      }

      computeRoute(origin, selectedDestCoord, profile.height, profile.weight, profile.width);

      pendingRecentRouteRef.current = {
        destination: destination || 'Unknown destination',
        latitude: selectedDestCoord.latitude,
        longitude: selectedDestCoord.longitude,
      };

      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    } catch (error) {
      console.log('[Route] Route error:', error);
      setLocalRouteError('Something went wrong. Please try again.');
    }
  }, [selectedDestCoord, getCurrentLocation, profile.height, profile.weight, profile.width, fadeAnim, computeRoute, clearLiveRoute, destination]);

  const handleStartNavigation = useCallback(async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    lastSpokenStepRef.current = -1;
    lastSpokenHazardRef.current = new Set();
    hasSpokenEndRef.current = false;
    resetVoiceState();

    const started = await startNavigation(profile.height, profile.weight, profile.width);
    if (!started) {
      setLocalRouteError('Could not start live tracking. Check location permissions.');
    } else if (voiceActive) {
      speakNavigationStart(destination);
    }
  }, [startNavigation, profile.height, profile.weight, profile.width, voiceActive, destination]);

  const handleStopNavigation = useCallback(() => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    stopSpeaking();
    stopNavigation();
  }, [stopNavigation]);

  const routeResult = liveRoute;

  useEffect(() => {
    if (routeResult && planMapRef.current && routeResult.route.coordinates.length > 0 && !isNavigating) {
      const allCoords = routeResult.route.coordinates;
      setTimeout(() => {
        planMapRef.current?.fitToCoordinates(allCoords, {
          edgePadding: { top: 60, right: 40, bottom: 60, left: 40 },
          animated: true,
        });
      }, 300);
    }
  }, [routeResult, isNavigating]);

  const openInMaps = useCallback(() => {
    if (!selectedDestCoord) return;
    const url = Platform.select({
      ios: `maps://app?daddr=${selectedDestCoord.latitude},${selectedDestCoord.longitude}`,
      android: `google.navigation:q=${selectedDestCoord.latitude},${selectedDestCoord.longitude}`,
      default: `https://www.google.com/maps/dir/?api=1&destination=${selectedDestCoord.latitude},${selectedDestCoord.longitude}`,
    });
    if (url) void Linking.openURL(url);
  }, [selectedDestCoord]);

  const handleOpenInWaze = useCallback(() => {
    if (selectedDestCoord) {
      void openInWaze({
        latitude: selectedDestCoord.latitude,
        longitude: selectedDestCoord.longitude,
        label: destination,
      });
    }
  }, [selectedDestCoord, destination]);

  const hazardColor = useCallback((hazard: Hazard) => {
    return getHazardColor(hazard, profile, colors);
  }, [profile, colors]);

  const nearbyDocks = useMemo(() => {
    if (!selectedDestCoord) return [];
    return docks.filter((d) => {
      const distKm = haversineDistance(
        d.latitude, d.longitude,
        selectedDestCoord.latitude, selectedDestCoord.longitude,
      );
      return distKm < 50;
    }).slice(0, 8);
  }, [selectedDestCoord, docks]);

  useEffect(() => {
    if (liveRoute && pendingRecentRouteRef.current) {
      addRecentRoute(pendingRecentRouteRef.current);
      pendingRecentRouteRef.current = null;
    }
  }, [liveRoute, addRecentRoute]);

  useEffect(() => {
    if (contextRouteError && pendingRecentRouteRef.current) {
      console.log('[Route] Route failed — clearing pending recent route');
      pendingRecentRouteRef.current = null;
    }
  }, [contextRouteError]);

  const displayError = localRouteError || contextRouteError;

  const currentPosition = livePosition
    ? { latitude: livePosition.latitude, longitude: livePosition.longitude }
    : userLocation;

  const handleToggleVoice = useCallback(() => {
    const next = !voiceActive;
    setVoiceActive(next);
    if (!next) stopSpeaking();
  }, [voiceActive, setVoiceActive]);

  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {isNavigating && navProgress && routeResult ? (
        <RouteNavigationView
          colors={colors}
          navProgress={navProgress}
          routeResult={routeResult}
          pulseAnim={pulseAnim}
          voiceActive={voiceActive}
          isRerouting={isRerouting}
          rerouteCount={rerouteCount}
          livePosition={livePosition}
          currentPosition={currentPosition}
          selectedDestCoord={selectedDestCoord}
          navMapRef={navMapRef}
          profile={profile}
          onToggleVoice={handleToggleVoice}
          onStopNavigation={handleStopNavigation}
          onOpenInMaps={openInMaps}
          onOpenInWaze={handleOpenInWaze}
        />
      ) : (
        <RoutePlanningView
          colors={colors}
          profile={profile}
          voiceActive={voiceActive}
          destination={destination}
          showSuggestions={showSuggestions}
          geocodedResults={geocodedResults}
          isSearching={isSearching}
          selectedDestCoord={selectedDestCoord}
          routeResult={routeResult}
          isRouting={isRouting}
          displayError={displayError}
          fadeAnim={fadeAnim}
          userLocation={userLocation}
          nearbyDocks={nearbyDocks}
          planMapRef={planMapRef}
          onSearchChange={handleSearchChange}
          onSelectPlace={handleSelectPlace}
          onStartRoute={startRoute}
          onStartNavigation={handleStartNavigation}
          onOpenInMaps={openInMaps}
          onOpenInWaze={handleOpenInWaze}
          getHazardColor={hazardColor}
        />
      )}
    </KeyboardAvoidingView>
  );
}

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
