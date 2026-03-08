import { useState, useCallback, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import MapView from 'react-native-maps';
import { Dock, Hazard, TruckProfile } from '@/types';
import { getRoute, analyzeRouteHazards, LiveRouteResult } from '@/services/routing';
import { useUserLocation } from '@/hooks/useUserLocation';
import { useToast } from '@/context/ToastContext';

export function useMapRouting(profile: TruckProfile, hazards: Hazard[], mapRef: React.RefObject<MapView | null>) {
  const [activeRoute, setActiveRoute] = useState<LiveRouteResult | null>(null);
  const [routeHazards, setRouteHazards] = useState<Hazard[]>([]);
  const { showToast } = useToast();
  const { userLocation, getUserLocation } = useUserLocation();
  const hazardsRef = useRef(hazards);
  hazardsRef.current = hazards;

  const routeToDockMutation = useMutation({
    mutationFn: async (dock: Dock) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const origin = await getUserLocation();
      if (!origin) return null;
      const dest = { latitude: dock.latitude, longitude: dock.longitude };
      const result = await getRoute(origin, dest);
      return result ? { result, dock } : null;
    },
    onSuccess: (data) => {
      if (!data) return;
      const { result } = data;
      setActiveRoute(result);
      const hazardAnalysis = analyzeRouteHazards(result.coordinates, profile.height, hazardsRef.current, 0.5, profile.weight, profile.width);
      setRouteHazards(hazardAnalysis.blockedHazards);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (mapRef.current) {
        setTimeout(() => {
          mapRef.current?.fitToCoordinates(result.coordinates, {
            edgePadding: { top: 80, right: 40, bottom: 200, left: 40 },
            animated: true,
          });
        }, 200);
      }
    },
    onError: (error) => {
      console.log('[Map] Route error:', error);
      showToast('error', 'Route Failed', 'Could not calculate route to dock');
    },
  });

  const { mutate: doRouteToDock } = routeToDockMutation;

  const routeToDock = useCallback((dock: Dock) => {
    doRouteToDock(dock);
  }, [doRouteToDock]);

  const clearRoute = useCallback(() => {
    setActiveRoute(null);
    setRouteHazards([]);
  }, []);

  return {
    activeRoute,
    routeHazards,
    isRouting: routeToDockMutation.isPending,
    routeToDock,
    clearRoute,
    userLocation,
    getUserLocation,
  };
}
