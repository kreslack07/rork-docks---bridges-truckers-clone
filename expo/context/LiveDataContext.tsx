import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import { Dock, Hazard, RouteCoordinate } from '@/types';
import { searchDocksNearby } from '@/services/places';
import { fetchHazardsInArea } from '@/services/hazards-api';
import { haversineDistance } from '@/utils/geo';
import { isRateLimited } from '@/services/overpass-throttle';
import { useToast } from '@/context/ToastContext';
import { logger } from '@/utils/logger';
import { DOCKS as MOCK_DOCKS } from '@/mocks/docks';
import { HAZARDS as MOCK_HAZARDS } from '@/mocks/hazards';


const DEFAULT_LOCATION: RouteCoordinate = { latitude: -33.8688, longitude: 151.2093 };
const CACHE_DOCKS_KEY = 'cached_docks';
const CACHE_HAZARDS_KEY = 'cached_hazards';

function getMockDocksNear(lat: number, lon: number, radiusKm: number = 50): Dock[] {
  return MOCK_DOCKS.filter(
    (d) => haversineDistance(lat, lon, d.latitude, d.longitude) < radiusKm,
  );
}

function getMockHazardsNear(lat: number, lon: number, radiusKm: number = 80): Hazard[] {
  return MOCK_HAZARDS.filter(
    (h) => haversineDistance(lat, lon, h.latitude, h.longitude) < radiusKm,
  );
}

function mergeWithMockData<T extends { id: string; latitude: number; longitude: number }>(
  apiData: T[],
  mockData: T[],
): T[] {
  const seen = new Set(apiData.map((item) => item.id));
  const coordSeen = new Set(
    apiData.map((item) => `${item.latitude.toFixed(4)}-${item.longitude.toFixed(4)}`),
  );
  const merged = [...apiData];
  for (const mock of mockData) {
    const coordKey = `${mock.latitude.toFixed(4)}-${mock.longitude.toFixed(4)}`;
    if (!seen.has(mock.id) && !coordSeen.has(coordKey)) {
      merged.push(mock);
    }
  }
  return merged;
}

const MAX_CACHED_DOCKS = 500;
const MAX_CACHED_HAZARDS = 500;

async function loadCachedDocks(): Promise<Dock[]> {
  try {
    const stored = await AsyncStorage.getItem(CACHE_DOCKS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      logger.log('[LiveData] Loaded cached docks:', parsed.length);
      return parsed as Dock[];
    }
  } catch (e) {
    logger.log('[LiveData] Cache read error (docks):', e);
  }
  return [];
}

async function loadCachedHazards(): Promise<Hazard[]> {
  try {
    const stored = await AsyncStorage.getItem(CACHE_HAZARDS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      logger.log('[LiveData] Loaded cached hazards:', parsed.length);
      return parsed as Hazard[];
    }
  } catch (e) {
    logger.log('[LiveData] Cache read error (hazards):', e);
  }
  return [];
}

async function saveCachedDocks(docks: Dock[]): Promise<void> {
  try {
    const limited = docks.slice(0, MAX_CACHED_DOCKS);
    await AsyncStorage.setItem(CACHE_DOCKS_KEY, JSON.stringify(limited));
    logger.log('[LiveData] Cached docks saved:', limited.length);
  } catch (e) {
    logger.log('[LiveData] Cache write error (docks):', e);
  }
}

async function saveCachedHazards(hazards: Hazard[]): Promise<void> {
  try {
    const limited = hazards.slice(0, MAX_CACHED_HAZARDS);
    await AsyncStorage.setItem(CACHE_HAZARDS_KEY, JSON.stringify(limited));
    logger.log('[LiveData] Cached hazards saved:', limited.length);
  } catch (e) {
    logger.log('[LiveData] Cache write error (hazards):', e);
  }
}

const RATE_LIMIT_RETRY_MS = 30_000;

export const [LiveDataProvider, useLiveData] = createContextHook(() => {
  const { showToast } = useToast();
  const showToastRef = useRef(showToast);
  showToastRef.current = showToast;
  const queryClient = useQueryClient();
  const [mapCenter, setMapCenter] = useState<RouteCoordinate>(DEFAULT_LOCATION);
  const rateLimitRetryRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const lat = Math.round(mapCenter.latitude * 100) / 100;
  const lon = Math.round(mapCenter.longitude * 100) / 100;

  const cachedDocksQuery = useQuery({
    queryKey: ['cachedDocks'],
    queryFn: loadCachedDocks,
    staleTime: 30 * 60 * 1000,
  });

  const cachedHazardsQuery = useQuery({
    queryKey: ['cachedHazards'],
    queryFn: loadCachedHazards,
    staleTime: 30 * 60 * 1000,
  });

  const scheduleRateLimitRetry = useCallback(() => {
    if (rateLimitRetryRef.current) return;
    console.log(`[LiveData] Rate limited — scheduling refetch in ${RATE_LIMIT_RETRY_MS / 1000}s`);
    rateLimitRetryRef.current = setTimeout(() => {
      rateLimitRetryRef.current = null;
      if (!isRateLimited()) {
        console.log('[LiveData] Rate limit cleared — refetching');
        void queryClient.invalidateQueries({ queryKey: ['docks'] });
        void queryClient.invalidateQueries({ queryKey: ['hazards'] });
      } else {
        scheduleRateLimitRetry();
      }
    }, RATE_LIMIT_RETRY_MS);
  }, [queryClient]);

  useEffect(() => {
    return () => {
      if (rateLimitRetryRef.current) {
        clearTimeout(rateLimitRetryRef.current);
        rateLimitRetryRef.current = null;
      }
    };
  }, []);

  const docksQuery = useQuery({
    queryKey: ['docks', lat, lon],
    queryFn: async ({ signal }) => {
      logger.log('[LiveData] Fetching real docks near', lat.toFixed(3), lon.toFixed(3));
      const mockDocks = getMockDocksNear(lat, lon);

      if (isRateLimited()) {
        logger.log('[LiveData] API rate limited — returning mock docks only');
        scheduleRateLimitRetry();
        return mockDocks;
      }

      try {
        const realDocks = await searchDocksNearby(lat, lon, 20, signal);
        if (realDocks.length > 0) {
          const merged = mergeWithMockData(realDocks, mockDocks);
          logger.log('[LiveData] Merged docks: API', realDocks.length, '+ mock', mockDocks.length, '= total', merged.length);
          void saveCachedDocks(merged);
          return merged;
        }
        logger.log('[LiveData] No API docks returned, using mock fallback');
        return mockDocks;
      } catch (error) {
        logger.log('[LiveData] Dock fetch failed, throwing for RQ retry:', error);
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000,
    retry: 2,
    placeholderData: cachedDocksQuery.data && cachedDocksQuery.data.length > 0
      ? cachedDocksQuery.data
      : undefined,
  });

  const hazardsQuery = useQuery({
    queryKey: ['hazards', lat, lon],
    queryFn: async ({ signal }) => {
      logger.log('[LiveData] Fetching real hazards near', lat.toFixed(3), lon.toFixed(3));
      const mockHazards = getMockHazardsNear(lat, lon);

      if (isRateLimited()) {
        logger.log('[LiveData] API rate limited — returning mock hazards only');
        scheduleRateLimitRetry();
        return mockHazards;
      }

      try {
        const realHazards = await fetchHazardsInArea(lat, lon, 40, signal);
        if (realHazards.length > 0) {
          const merged = mergeWithMockData(realHazards, mockHazards);
          logger.log('[LiveData] Merged hazards: API', realHazards.length, '+ mock', mockHazards.length, '= total', merged.length);
          void saveCachedHazards(merged);
          return merged;
        }
        logger.log('[LiveData] No API hazards returned, using mock fallback');
        return mockHazards;
      } catch (error) {
        logger.log('[LiveData] Hazard fetch failed, throwing for RQ retry:', error);
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000,
    retry: 2,
    placeholderData: cachedHazardsQuery.data && cachedHazardsQuery.data.length > 0
      ? cachedHazardsQuery.data
      : undefined,
  });

  const allDocks = useMemo(
    () => docksQuery.data ?? cachedDocksQuery.data ?? [],
    [docksQuery.data, cachedDocksQuery.data],
  );
  const allHazards = useMemo(
    () => hazardsQuery.data ?? cachedHazardsQuery.data ?? [],
    [hazardsQuery.data, cachedHazardsQuery.data],
  );
  const isOffline = !!(docksQuery.error && hazardsQuery.error);

  const lastToastRef = useRef<{ key: string; time: number }>({ key: '', time: 0 });
  const allDocksRef = useRef(allDocks);
  allDocksRef.current = allDocks;
  const allHazardsRef = useRef(allHazards);
  allHazardsRef.current = allHazards;

  useEffect(() => {
    const now = Date.now();
    let toastKey = '';
    if (docksQuery.error && hazardsQuery.error) {
      toastKey = 'offline';
    } else if (docksQuery.error) {
      toastKey = 'docks-error';
    } else if (hazardsQuery.error) {
      toastKey = 'hazards-error';
    }

    if (!toastKey) return;

    if (lastToastRef.current.key === toastKey && now - lastToastRef.current.time < 10000) {
      return;
    }
    lastToastRef.current = { key: toastKey, time: now };

    if (toastKey === 'offline') {
      logger.log('[LiveData] Both queries failed — falling back to mock + cached data');
      const mockDocks = getMockDocksNear(lat, lon);
      if (mockDocks.length > 0) {
        queryClient.setQueryData(['cachedDocks'], (prev: Dock[] | undefined) =>
          prev && prev.length > 0 ? prev : mockDocks
        );
      }
      const mockHazards = getMockHazardsNear(lat, lon);
      if (mockHazards.length > 0) {
        queryClient.setQueryData(['cachedHazards'], (prev: Hazard[] | undefined) =>
          prev && prev.length > 0 ? prev : mockHazards
        );
      }
      showToastRef.current('warning', 'Offline Mode', 'Using cached & local data — check your connection');
    } else if (toastKey === 'docks-error') {
      const fallbackDocks = getMockDocksNear(lat, lon);
      if (fallbackDocks.length > 0 && allDocksRef.current.length === 0) {
        queryClient.setQueryData(['cachedDocks'], fallbackDocks);
      }
      showToastRef.current('warning', 'Limited Dock Data', 'Live data unavailable — showing known docks');
    } else if (toastKey === 'hazards-error') {
      const fallbackHazards = getMockHazardsNear(lat, lon);
      if (fallbackHazards.length > 0 && allHazardsRef.current.length === 0) {
        queryClient.setQueryData(['cachedHazards'], fallbackHazards);
      }
      showToastRef.current('warning', 'Limited Hazard Data', 'Live data unavailable — showing known hazards');
    }
  }, [docksQuery.error, hazardsQuery.error, lat, lon, queryClient]);

  const mapCenterRef = useRef<RouteCoordinate>(DEFAULT_LOCATION);
  useEffect(() => {
    mapCenterRef.current = mapCenter;
  }, [mapCenter]);

  const updateMapCenter = useCallback((coord: RouteCoordinate) => {
    const current = mapCenterRef.current;
    const dist = Math.abs(coord.latitude - current.latitude) + Math.abs(coord.longitude - current.longitude);
    if (dist > 0.2) {
      logger.log('[LiveData] Map center updated, will refetch');
      setMapCenter(coord);
    }
  }, []);

  const docksMap = useMemo(() => {
    const map = new Map<string, Dock>();
    for (const d of allDocks) map.set(d.id, d);
    return map;
  }, [allDocks]);

  const hazardsMap = useMemo(() => {
    const map = new Map<string, Hazard>();
    for (const h of allHazards) map.set(h.id, h);
    return map;
  }, [allHazards]);

  const findDockById = useCallback(
    (id: string): Dock | undefined => docksMap.get(id),
    [docksMap],
  );

  const findHazardById = useCallback(
    (id: string): Hazard | undefined => hazardsMap.get(id),
    [hazardsMap],
  );

  return useMemo(() => ({
    docks: allDocks,
    hazards: allHazards,
    isLoadingDocks: docksQuery.isLoading,
    isLoadingHazards: hazardsQuery.isLoading,
    docksError: docksQuery.error?.message ?? null,
    hazardsError: hazardsQuery.error?.message ?? null,
    isOffline,
    updateMapCenter,
    findDockById,
    findHazardById,
    refetchDocks: docksQuery.refetch,
    refetchHazards: hazardsQuery.refetch,
  }), [
    allDocks,
    allHazards,
    docksQuery.isLoading,
    docksQuery.error,
    docksQuery.refetch,
    hazardsQuery.isLoading,
    hazardsQuery.error,
    hazardsQuery.refetch,
    isOffline,
    updateMapCenter,
    findDockById,
    findHazardById,
  ]);
});
