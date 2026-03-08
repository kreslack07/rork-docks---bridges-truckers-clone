import { useState, useCallback, useRef } from 'react';
import { Platform } from 'react-native';
import { RouteCoordinate } from '@/types';

let Location: typeof import('expo-location') | null = null;
if (Platform.OS !== 'web') {
  Location = require('expo-location');
}

const STALE_THRESHOLD_MS = 60_000;

export function useUserLocation() {
  const [userLocation, setUserLocation] = useState<RouteCoordinate | null>(null);
  const userLocationRef = useRef<RouteCoordinate | null>(null);
  const lastFetchedAt = useRef<number>(0);

  const getUserLocation = useCallback(async (): Promise<RouteCoordinate | null> => {
    const now = Date.now();
    const isStale = now - lastFetchedAt.current > STALE_THRESHOLD_MS;

    if (userLocationRef.current && !isStale) return userLocationRef.current;

    try {
      if (Platform.OS === 'web') {
        return new Promise<RouteCoordinate | null>((resolve) => {
          if (typeof navigator !== 'undefined' && navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
              (pos) => {
                const loc = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
                userLocationRef.current = loc;
                setUserLocation(loc);
                lastFetchedAt.current = Date.now();
                resolve(loc);
              },
              () => {
                console.log('[useUserLocation] Web geolocation denied or failed');
                resolve(null);
              },
              { timeout: 15000, maximumAge: 60000 },
            );
          } else {
            console.log('[useUserLocation] Geolocation API not available on web');
            resolve(null);
          }
        });
      } else {
        if (!Location) {
          console.log('[useUserLocation] expo-location not available');
          return null;
        }
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          console.log('[useUserLocation] Location permission denied');
          return null;
        }

        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const coords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
        userLocationRef.current = coords;
        setUserLocation(coords);
        lastFetchedAt.current = Date.now();
        return coords;
      }
    } catch (error) {
      console.log('[useUserLocation] Location error:', error);
      return null;
    }
  }, []);

  return { userLocation, getUserLocation };
}
