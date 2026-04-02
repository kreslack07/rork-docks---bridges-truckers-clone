import { useState, useCallback, useRef } from 'react';
import { Platform, Linking, Alert } from 'react-native';
import { RouteCoordinate } from '@/types';
import { logger } from '@/utils/logger';

let Location: typeof import('expo-location') | null = null;
if (Platform.OS !== 'web') {
  Location = require('expo-location');
}

const STALE_THRESHOLD_MS = 60_000;

export type LocationError = 'denied' | 'unavailable' | 'timeout' | null;

export function useUserLocation() {
  const [userLocation, setUserLocation] = useState<RouteCoordinate | null>(null);
  const [locationError, setLocationError] = useState<LocationError>(null);
  const userLocationRef = useRef<RouteCoordinate | null>(null);
  const lastFetchedAt = useRef<number>(0);

  const promptOpenSettings = useCallback(() => {
    Alert.alert(
      'Location Access Required',
      Platform.OS === 'web'
        ? 'This app needs your location to calculate truck-safe routes and show nearby hazards. Please allow location access in your browser when prompted.'
        : 'This app needs your location to calculate truck-safe routes and show nearby hazards. Please enable location access in your device settings.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: Platform.OS === 'web' ? 'OK' : 'Open Settings',
          onPress: () => {
            if (Platform.OS === 'ios') {
              void Linking.openURL('app-settings:');
            } else if (Platform.OS === 'android') {
              void Linking.openSettings();
            }
          },
        },
      ],
    );
  }, []);

  const getUserLocation = useCallback(async (): Promise<RouteCoordinate | null> => {
    const now = Date.now();
    const isStale = now - lastFetchedAt.current > STALE_THRESHOLD_MS;

    if (userLocationRef.current && !isStale) {
      setLocationError(null);
      return userLocationRef.current;
    }

    try {
      if (Platform.OS === 'web') {
        return new Promise<RouteCoordinate | null>((resolve) => {
          if (typeof navigator !== 'undefined' && navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
              (pos) => {
                const loc = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
                userLocationRef.current = loc;
                setUserLocation(loc);
                setLocationError(null);
                lastFetchedAt.current = Date.now();
                resolve(loc);
              },
              (err) => {
                logger.log('[useUserLocation] Web geolocation error:', err.code, err.message);
                if (err.code === 1) {
                  setLocationError('denied');
                } else if (err.code === 3) {
                  setLocationError('timeout');
                } else {
                  setLocationError('unavailable');
                }
                resolve(null);
              },
              { timeout: 15000, maximumAge: 60000 },
            );
          } else {
            logger.log('[useUserLocation] Geolocation API not available on web');
            setLocationError('unavailable');
            resolve(null);
          }
        });
      } else {
        if (!Location) {
          logger.log('[useUserLocation] expo-location not available');
          setLocationError('unavailable');
          return null;
        }
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          logger.log('[useUserLocation] Location permission denied');
          setLocationError('denied');
          return null;
        }

        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const coords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
        userLocationRef.current = coords;
        setUserLocation(coords);
        setLocationError(null);
        lastFetchedAt.current = Date.now();
        return coords;
      }
    } catch (error) {
      logger.log('[useUserLocation] Location error:', error);
      setLocationError('unavailable');
      return null;
    }
  }, []);

  return { userLocation, getUserLocation, locationError, promptOpenSettings };
}
