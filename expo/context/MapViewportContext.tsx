import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import createContextHook from '@nkzw/create-context-hook';
import { RouteCoordinate } from '@/types';
import { logger } from '@/utils/logger';

export interface MapRegionBounds {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

const DEFAULT_LOCATION: RouteCoordinate = { latitude: -33.8688, longitude: 151.2093 };

export const [MapViewportProvider, useMapViewport] = createContextHook(() => {
  const [mapCenter, setMapCenter] = useState<RouteCoordinate>(DEFAULT_LOCATION);
  const [mapRegion, setMapRegion] = useState<MapRegionBounds>({
    latitude: DEFAULT_LOCATION.latitude,
    longitude: DEFAULT_LOCATION.longitude,
    latitudeDelta: 30,
    longitudeDelta: 30,
  });

  const mapCenterRef = useRef<RouteCoordinate>(DEFAULT_LOCATION);
  useEffect(() => {
    mapCenterRef.current = mapCenter;
  }, [mapCenter]);

  const prevZoomRef = useRef<number>(mapRegion.latitudeDelta);

  const updateMapCenter = useCallback((coord: RouteCoordinate, region?: MapRegionBounds) => {
    const current = mapCenterRef.current;
    const latDiff = Math.abs(coord.latitude - current.latitude);
    const lonDiff = Math.abs(coord.longitude - current.longitude);
    const panChanged = latDiff + lonDiff > 0.15;

    let zoomChanged = false;
    if (region) {
      const zoomRatio = region.latitudeDelta / prevZoomRef.current;
      zoomChanged = zoomRatio < 0.6 || zoomRatio > 1.5;
      if (zoomChanged) {
        prevZoomRef.current = region.latitudeDelta;
      }
      if (panChanged || zoomChanged) {
        setMapRegion(region);
      }
    }

    if (panChanged || zoomChanged) {
      logger.log('[MapViewport] Map updated — pan:', panChanged, 'zoom:', zoomChanged);
      setMapCenter(coord);
    }
  }, []);

  const lat = Math.round(mapCenter.latitude * 50) / 50;
  const lon = Math.round(mapCenter.longitude * 50) / 50;
  const radiusKm = Math.max(5, Math.min(80, mapRegion.latitudeDelta * 111 / 2));

  return useMemo(() => ({
    mapCenter,
    mapRegion,
    updateMapCenter,
    lat,
    lon,
    radiusKm,
  }), [mapCenter, mapRegion, updateMapCenter, lat, lon, radiusKm]);
});
