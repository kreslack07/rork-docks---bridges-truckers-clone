import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useMutation } from '@tanstack/react-query';
import createContextHook from '@nkzw/create-context-hook';
import { Hazard, RouteCoordinate } from '@/types';
import { fetchHazardsAlongRoute } from '@/services/hazards-api';
import {
  getRoute,
  LiveRouteResult,
} from '@/services/routing';
import {
  LivePosition,
  NavigationProgress,
  startLocationTracking,
  stopLocationTracking,
  computeNavigationProgress,
  resetClosestIndex,
} from '@/services/live-tracking';
import { classifyHazards } from '@/utils/classify-hazards';
import { useToast } from '@/context/ToastContext';
import { logger } from '@/utils/logger';

export interface LiveRouteData {
  route: LiveRouteResult;
  blockedHazards: Hazard[];
  tightHazards: Hazard[];
  safeHazards: Hazard[];
  nearbyHazards: Hazard[];
  realHazards: Hazard[];
}

async function computeLiveRoute(
  origin: RouteCoordinate,
  destination: RouteCoordinate,
  truckHeight: number,
  truckWeight?: number,
  truckWidth?: number,
  signal?: AbortSignal,
): Promise<LiveRouteData | null> {
  const route = await getRoute(origin, destination, signal);
  if (!route) return null;

  if (signal?.aborted) return null;

  const realRouteHazards = await fetchHazardsAlongRoute(route.coordinates, 2, signal);

  const mergedNearby: Hazard[] = [];
  const seenIds = new Set<string>();
  for (const h of realRouteHazards) {
    if (!seenIds.has(h.id)) {
      seenIds.add(h.id);
      mergedNearby.push(h);
    }
  }

  const { blocked, tight, safe } = classifyHazards(mergedNearby, truckHeight, truckWeight, truckWidth);

  return {
    route,
    blockedHazards: blocked,
    tightHazards: tight,
    safeHazards: safe,
    nearbyHazards: mergedNearby,
    realHazards: realRouteHazards,
  };
}

export const [NavigationProvider, useNavigation] = createContextHook(() => {
  const { showToast } = useToast();
  const [liveRoute, setLiveRoute] = useState<LiveRouteData | null>(null);
  const [isNavigating, setIsNavigating] = useState<boolean>(false);
  const [livePosition, setLivePosition] = useState<LivePosition | null>(null);
  const [navProgress, setNavProgress] = useState<NavigationProgress | null>(null);
  const [rerouteCount, setRerouteCount] = useState<number>(0);

  const truckHeightRef = useRef<number>(4.3);
  const truckWeightRef = useRef<number>(42.5);
  const truckWidthRef = useRef<number>(2.5);
  const destinationRef = useRef<RouteCoordinate | null>(null);

  const activeAbortRef = useRef<AbortController | null>(null);

  const rerouteMutation = useMutation({
    mutationFn: async ({
      origin,
      destination,
      truckHeight,
      truckWeight,
      truckWidth,
    }: {
      origin: RouteCoordinate;
      destination: RouteCoordinate;
      truckHeight: number;
      truckWeight?: number;
      truckWidth?: number;
    }) => {
      logger.log('[Navigation] Rerouting from current position...');
      return computeLiveRoute(origin, destination, truckHeight, truckWeight, truckWidth, undefined);
    },
    onSuccess: (data) => {
      if (data) {
        setLiveRoute(data);
        setRerouteCount((c) => c + 1);
        logger.log('[Navigation] Reroute complete:', { blocked: data.blockedHazards.length, tight: data.tightHazards.length });
      }
    },
    onError: (error) => {
      logger.log('[Navigation] Reroute error:', error);
      showToast('error', 'Reroute Failed', 'Could not calculate a new route');
    },
  });

  const { mutate: doRerouteMutate, isPending: isReroutePending } = rerouteMutation;

  const isReroutePendingRef = useRef(isReroutePending);
  isReroutePendingRef.current = isReroutePending;

  const isNavigatingRef = useRef(isNavigating);
  isNavigatingRef.current = isNavigating;

  const liveRouteRef = useRef(liveRoute);
  liveRouteRef.current = liveRoute;

  const hasArrivedRef = useRef(false);
  const showToastRef = useRef(showToast);
  showToastRef.current = showToast;
  const doRerouteMutateRef = useRef(doRerouteMutate);
  doRerouteMutateRef.current = doRerouteMutate;

  const stablePositionCallback = useCallback((pos: LivePosition) => {
    setLivePosition(pos);

    if (!isNavigatingRef.current || !liveRouteRef.current) return;

    const progress = computeNavigationProgress(
      { latitude: pos.latitude, longitude: pos.longitude },
      liveRouteRef.current.route.coordinates,
      liveRouteRef.current.route.steps,
      liveRouteRef.current.route.distance,
      liveRouteRef.current.route.duration,
    );

    setNavProgress(progress);

    if (progress.isOffRoute && destinationRef.current && !isReroutePendingRef.current) {
      logger.log('[Navigation] Off route detected, rerouting...');
      doRerouteMutateRef.current({
        origin: { latitude: pos.latitude, longitude: pos.longitude },
        destination: destinationRef.current,
        truckHeight: truckHeightRef.current,
        truckWeight: truckWeightRef.current,
        truckWidth: truckWidthRef.current,
      });
    }

    if (progress.completionPercent >= 98 && !hasArrivedRef.current) {
      hasArrivedRef.current = true;
      logger.log('[Navigation] Destination reached — auto-stopping navigation');
      stopLocationTracking();
      setIsNavigating(false);
      setNavProgress(progress);
      destinationRef.current = null;
      showToastRef.current('success', 'Arrived!', 'You have reached your destination');
    }
  }, []);

  const startNavigation = useCallback(async (truckHeight: number, truckWeight?: number, truckWidth?: number) => {
    if (!liveRoute) return false;

    truckHeightRef.current = truckHeight;
    if (truckWeight) truckWeightRef.current = truckWeight;
    if (truckWidth) truckWidthRef.current = truckWidth;
    resetClosestIndex();
    const lastCoord = liveRoute.route.coordinates[liveRoute.route.coordinates.length - 1];
    if (lastCoord) {
      destinationRef.current = lastCoord;
    }

    hasArrivedRef.current = false;
    const started = await startLocationTracking(stablePositionCallback);
    if (started) {
      setIsNavigating(true);
      setRerouteCount(0);
      logger.log('[Navigation] Live navigation started');
      return true;
    }
    logger.log('[Navigation] Failed to start tracking');
    return false;
  }, [liveRoute, stablePositionCallback]);

  const stopNavigation = useCallback(() => {
    stopLocationTracking();
    setIsNavigating(false);
    setNavProgress(null);
    setLivePosition(null);
    destinationRef.current = null;
    logger.log('[Navigation] Navigation stopped');
  }, []);

  useEffect(() => {
    return () => {
      stopLocationTracking();
      if (activeAbortRef.current) {
        activeAbortRef.current.abort();
        activeAbortRef.current = null;
      }
    };
  }, []);

  const routeMutation = useMutation({
    mutationFn: async ({
      origin,
      destination,
      truckHeight,
      truckWeight,
      truckWidth,
    }: {
      origin: RouteCoordinate;
      destination: RouteCoordinate;
      truckHeight: number;
      truckWeight?: number;
      truckWidth?: number;
    }) => {
      if (activeAbortRef.current) {
        activeAbortRef.current.abort();
        logger.log('[Navigation] Previous route computation cancelled');
      }
      const controller = new AbortController();
      activeAbortRef.current = controller;

      logger.log('[Navigation] Computing live route...');
      const result = await computeLiveRoute(origin, destination, truckHeight, truckWeight, truckWidth, controller.signal);

      if (controller.signal.aborted) {
        return null;
      }

      activeAbortRef.current = null;
      return result;
    },
    onSuccess: (data) => {
      if (data) {
        setLiveRoute(data);
        logger.log('[Navigation] Route analysis complete:', {
          distance: data.route.distance,
          duration: data.route.duration,
          blocked: data.blockedHazards.length,
          tight: data.tightHazards.length,
          safe: data.safeHazards.length,
          realHazards: data.realHazards.length,
        });
      }
    },
    onError: (error) => {
      logger.log('[Navigation] Route computation error:', error);
      showToast('error', 'Route Error', 'Could not compute route — try again');
    },
  });

  const { mutate: doRouteMutate } = routeMutation;

  const computeRoute = useCallback(
    (origin: RouteCoordinate, destination: RouteCoordinate, truckHeight: number, truckWeight?: number, truckWidth?: number) => {
      doRouteMutate({ origin, destination, truckHeight, truckWeight, truckWidth });
    },
    [doRouteMutate],
  );

  const clearRoute = useCallback(() => {
    if (activeAbortRef.current) {
      activeAbortRef.current.abort();
      activeAbortRef.current = null;
    }
    if (isNavigating) stopNavigation();
    setLiveRoute(null);
    setNavProgress(null);
  }, [isNavigating, stopNavigation]);

  return useMemo(() => ({
    liveRoute,
    isRouting: routeMutation.isPending,
    routeError: routeMutation.error?.message ?? null,
    computeRoute,
    clearRoute,
    isNavigating,
    livePosition,
    navProgress,
    rerouteCount,
    startNavigation,
    stopNavigation,
    isRerouting: isReroutePending,
  }), [
    liveRoute,
    routeMutation.isPending,
    routeMutation.error,
    computeRoute,
    clearRoute,
    isNavigating,
    livePosition,
    navProgress,
    rerouteCount,
    startNavigation,
    stopNavigation,
    isReroutePending,
  ]);
});
