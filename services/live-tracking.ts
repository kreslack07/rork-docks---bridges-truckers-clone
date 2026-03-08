import { Platform } from 'react-native';
import { RouteCoordinate, RouteStep } from '@/types';

let Location: typeof import('expo-location') | null = null;
if (Platform.OS !== 'web') {
  Location = require('expo-location');
}
import { haversineDistance } from '@/utils/geo';

export interface LivePosition {
  latitude: number;
  longitude: number;
  heading: number | null;
  speed: number | null;
  accuracy: number | null;
  timestamp: number;
}

export interface NavigationProgress {
  distanceRemaining: number;
  durationRemaining: number;
  distanceTraveled: number;
  currentStepIndex: number;
  currentStep: RouteStep | null;
  nextStep: RouteStep | null;
  distanceToNextStep: number;
  isOffRoute: boolean;
  completionPercent: number;
}

const OFF_ROUTE_THRESHOLD_KM = 0.3;

type LocationCallback = (position: LivePosition) => void;

class LocationTracker {
  private lastClosestIndex = 0;
  private watchSubscription: { remove: () => void } | null = null;
  private webWatchId: number | null = null;

  findClosestPointOnRoute(
    position: RouteCoordinate,
    routeCoords: RouteCoordinate[],
  ): { index: number; distance: number } {
    let minDist = Infinity;
    let minIndex = 0;

    const searchStart = Math.max(0, this.lastClosestIndex - 5);
    const searchEnd = Math.min(routeCoords.length, this.lastClosestIndex + 50);

    for (let i = searchStart; i < searchEnd; i++) {
      const dist = haversineDistance(
        position.latitude,
        position.longitude,
        routeCoords[i].latitude,
        routeCoords[i].longitude,
      );
      if (dist < minDist) {
        minDist = dist;
        minIndex = i;
      }
    }

    if (minDist > 0.5) {
      for (let i = 0; i < routeCoords.length; i++) {
        const dist = haversineDistance(
          position.latitude,
          position.longitude,
          routeCoords[i].latitude,
          routeCoords[i].longitude,
        );
        if (dist < minDist) {
          minDist = dist;
          minIndex = i;
        }
      }
    }

    this.lastClosestIndex = minIndex;
    return { index: minIndex, distance: minDist };
  }

  resetClosestIndex(): void {
    this.lastClosestIndex = 0;
  }

  computeNavigationProgress(
    position: RouteCoordinate,
    routeCoords: RouteCoordinate[],
    steps: RouteStep[],
    totalDistance: number,
    totalDuration: number,
  ): NavigationProgress {
    const closest = this.findClosestPointOnRoute(position, routeCoords);
    const isOffRoute = closest.distance > OFF_ROUTE_THRESHOLD_KM;

    let distanceTraveled = 0;
    for (let i = 1; i <= closest.index && i < routeCoords.length; i++) {
      distanceTraveled += haversineDistance(
        routeCoords[i - 1].latitude,
        routeCoords[i - 1].longitude,
        routeCoords[i].latitude,
        routeCoords[i].longitude,
      ) * 1000;
    }

    const distanceRemaining = Math.max(0, totalDistance - distanceTraveled);
    const completionPercent = totalDistance > 0 ? Math.min(100, (distanceTraveled / totalDistance) * 100) : 0;
    const durationRemaining = totalDuration * (distanceRemaining / Math.max(1, totalDistance));

    let accumulatedDist = 0;
    let currentStepIndex = 0;
    for (let i = 0; i < steps.length; i++) {
      accumulatedDist += steps[i].distance;
      if (accumulatedDist >= distanceTraveled) {
        currentStepIndex = i;
        break;
      }
    }

    const currentStep = steps[currentStepIndex] ?? null;
    const nextStep = steps[currentStepIndex + 1] ?? null;
    const distanceToNextStep = currentStep
      ? Math.max(0, accumulatedDist - distanceTraveled)
      : 0;

    return {
      distanceRemaining,
      durationRemaining,
      distanceTraveled,
      currentStepIndex,
      currentStep,
      nextStep,
      distanceToNextStep,
      isOffRoute,
      completionPercent,
    };
  }

  async startLocationTracking(callback: LocationCallback): Promise<boolean> {
    try {
      if (Platform.OS === 'web') {
        if (!navigator.geolocation) {
          console.log('[LiveTracking] Web geolocation not available');
          return false;
        }

        this.webWatchId = navigator.geolocation.watchPosition(
          (pos) => {
            callback({
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              heading: pos.coords.heading,
              speed: pos.coords.speed,
              accuracy: pos.coords.accuracy,
              timestamp: pos.timestamp,
            });
          },
          (err) => {
            console.log('[LiveTracking] Web watch error:', err.message);
          },
          {
            enableHighAccuracy: true,
            maximumAge: 3000,
            timeout: 10000,
          },
        );

        console.log('[LiveTracking] Web watch started, id:', this.webWatchId);
        return true;
      }

      if (!Location) {
        console.log('[LiveTracking] expo-location not available');
        return false;
      }

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('[LiveTracking] Permission denied');
        return false;
      }

      this.watchSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 2000,
          distanceInterval: 5,
        },
        (loc) => {
          callback({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            heading: loc.coords.heading ?? null,
            speed: loc.coords.speed ?? null,
            accuracy: loc.coords.accuracy ?? null,
            timestamp: loc.timestamp,
          });
        },
      );

      console.log('[LiveTracking] Native watch started');
      return true;
    } catch (error) {
      console.log('[LiveTracking] Start error:', error);
      return false;
    }
  }

  stopLocationTracking(): void {
    if (this.watchSubscription) {
      this.watchSubscription.remove();
      this.watchSubscription = null;
      console.log('[LiveTracking] Native watch stopped');
    }

    if (Platform.OS === 'web' && this.webWatchId !== null) {
      navigator.geolocation.clearWatch(this.webWatchId);
      this.webWatchId = null;
      console.log('[LiveTracking] Web watch stopped');
    }
  }
}

const tracker = new LocationTracker();

export function findClosestPointOnRoute(
  position: RouteCoordinate,
  routeCoords: RouteCoordinate[],
): { index: number; distance: number } {
  return tracker.findClosestPointOnRoute(position, routeCoords);
}

export function resetClosestIndex(): void {
  tracker.resetClosestIndex();
}

export function computeNavigationProgress(
  position: RouteCoordinate,
  routeCoords: RouteCoordinate[],
  steps: RouteStep[],
  totalDistance: number,
  totalDuration: number,
): NavigationProgress {
  return tracker.computeNavigationProgress(position, routeCoords, steps, totalDistance, totalDuration);
}

export async function startLocationTracking(callback: LocationCallback): Promise<boolean> {
  return tracker.startLocationTracking(callback);
}

export function stopLocationTracking(): void {
  tracker.stopLocationTracking();
}
