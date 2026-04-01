import { useCallback, useEffect, useRef, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import { Dock, Hazard } from '@/types';
import { searchDocksNearby } from '@/services/places';
import { fetchHazardsInArea } from '@/services/hazards-api';
import { haversineDistance } from '@/utils/geo';
import { isRateLimited } from '@/services/overpass-throttle';
import { useToast } from '@/context/ToastContext';
import { useMapViewport } from '@/context/MapViewportContext';
import { logger } from '@/utils/logger';
import { DOCKS as MOCK_DOCKS } from '@/mocks/docks';
import { HAZARDS as MOCK_HAZARDS } from '@/mocks/hazards';
import { useNewDataNotifications } from '@/hooks/useNewDataNotifications';

export type { MapRegionBounds } from '@/context/MapViewportContext';

const CACHE_DOCKS_KEY = 'cached_docks';
const CACHE_HAZARDS_KEY = 'cached_hazards';

function getMockDocksNear(lat: number, lon: number, radiusKm: number): Dock[] {
  return MOCK_DOCKS.filter(
    (d) => haversineDistance(lat, lon, d.latitude, d.longitude) < radiusKm,
  );
}

function getMockHazardsNear(lat: number, lon: number, radiusKm: number): Hazard[] {
  return MOCK_HAZARDS.filter(
    (h) => haversineDistance(lat, lon, h.latitude, h.longitude) < radiusKm,
  );
}

function mergeWithMockData<T extends { id: string; latitude: number; longitude: number }>(
  apiData: T[],
  mockData: T[],
): T[] {
  if (mockData.length === 0) return apiData;
  if (apiData.length === 0) return mockData;

  const seen = new Set<string>();
  for (const item of apiData) {
    seen.add(item.id);
    seen.add(`${(item.latitude * 10000 | 0)}_${(item.longitude * 10000 | 0)}`);
  }
  const merged = [...apiData];
  for (const mock of mockData) {
    const coordKey = `${(mock.latitude * 10000 | 0)}_${(mock.longitude * 10000 | 0)}`;
    if (!seen.has(mock.id) && !seen.has(coordKey)) {
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
const MAX_RATE_LIMIT_RETRIES = 5;

export const [LiveDataProvider, useLiveData] = createContextHook(() => {
  const { showToast } = useToast();
  const { lat, lon, radiusKm } = useMapViewport();

  const showToastRef = useRef(showToast);
  showToastRef.current = showToast;
  const queryClient = useQueryClient();
  const rateLimitRetryRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rateLimitRetryCountRef = useRef<number>(0);

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
    if (rateLimitRetryCountRef.current >= MAX_RATE_LIMIT_RETRIES) {
      console.log('[LiveData] Max rate limit retries reached — stopping');
      showToastRef.current('warning', 'API Unavailable', 'Data source is temporarily unavailable. Pull to refresh later.');
      return;
    }
    rateLimitRetryCountRef.current += 1;
    console.log(`[LiveData] Rate limited — scheduling refetch in ${RATE_LIMIT_RETRY_MS / 1000}s (attempt ${rateLimitRetryCountRef.current}/${MAX_RATE_LIMIT_RETRIES})`);
    rateLimitRetryRef.current = setTimeout(() => {
      rateLimitRetryRef.current = null;
      if (!isRateLimited()) {
        console.log('[LiveData] Rate limit cleared — refetching');
        rateLimitRetryCountRef.current = 0;
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
    queryKey: ['docks', lat, lon, radiusKm],
    queryFn: async ({ signal }) => {
      const fetchRadius = Math.min(radiusKm, 50);
      logger.log('[LiveData] Fetching real docks near', lat.toFixed(3), lon.toFixed(3), 'radius:', fetchRadius.toFixed(1), 'km');
      const mockDocks = getMockDocksNear(lat, lon, fetchRadius);

      if (isRateLimited()) {
        logger.log('[LiveData] API rate limited — returning mock docks only');
        scheduleRateLimitRetry();
        return mockDocks;
      }

      try {
        const realDocks = await searchDocksNearby(lat, lon, fetchRadius, signal);
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
    queryKey: ['hazards', lat, lon, radiusKm],
    queryFn: async ({ signal }) => {
      const fetchRadius = Math.min(radiusKm * 1.5, 80);
      logger.log('[LiveData] Fetching real hazards near', lat.toFixed(3), lon.toFixed(3), 'radius:', fetchRadius.toFixed(1), 'km');
      const mockHazards = getMockHazardsNear(lat, lon, fetchRadius);

      if (isRateLimited()) {
        logger.log('[LiveData] API rate limited — returning mock hazards only');
        scheduleRateLimitRetry();
        return mockHazards;
      }

      try {
        const realHazards = await fetchHazardsInArea(lat, lon, fetchRadius, signal);
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

  const docksData = docksQuery.data;
  const cachedDocksData = cachedDocksQuery.data;
  const hazardsData = hazardsQuery.data;
  const cachedHazardsData = cachedHazardsQuery.data;

  const allDocks = useMemo(
    () => docksData ?? cachedDocksData ?? [],
    [docksData, cachedDocksData],
  );
  const allHazards = useMemo(
    () => hazardsData ?? cachedHazardsData ?? [],
    [hazardsData, cachedHazardsData],
  );
  const docksError = docksQuery.error;
  const hazardsError = hazardsQuery.error;
  const isOffline = !!(docksError && hazardsError);

  useNewDataNotifications(allHazards, allDocks);

  const lastToastRef = useRef<{ key: string; time: number }>({ key: '', time: 0 });
  const allDocksRef = useRef(allDocks);
  allDocksRef.current = allDocks;
  const allHazardsRef = useRef(allHazards);
  allHazardsRef.current = allHazards;

  useEffect(() => {
    const now = Date.now();
    let toastKey = '';
    if (docksError && hazardsError) {
      toastKey = 'offline';
    } else if (docksError) {
      toastKey = 'docks-error';
    } else if (hazardsError) {
      toastKey = 'hazards-error';
    }

    if (!toastKey) return;

    if (lastToastRef.current.key === toastKey && now - lastToastRef.current.time < 10000) {
      return;
    }
    lastToastRef.current = { key: toastKey, time: now };

    if (toastKey === 'offline') {
      logger.log('[LiveData] Both queries failed — falling back to mock + cached data');
      const mockDocks = getMockDocksNear(lat, lon, radiusKm);
      if (mockDocks.length > 0) {
        queryClient.setQueryData(['cachedDocks'], (prev: Dock[] | undefined) =>
          prev && prev.length > 0 ? prev : mockDocks
        );
      }
      const mockHazards = getMockHazardsNear(lat, lon, radiusKm);
      if (mockHazards.length > 0) {
        queryClient.setQueryData(['cachedHazards'], (prev: Hazard[] | undefined) =>
          prev && prev.length > 0 ? prev : mockHazards
        );
      }
      showToastRef.current('warning', 'Offline Mode', 'Using cached & local data — check your connection');
    } else if (toastKey === 'docks-error') {
      const fallbackDocks = getMockDocksNear(lat, lon, radiusKm);
      if (fallbackDocks.length > 0 && allDocksRef.current.length === 0) {
        queryClient.setQueryData(['cachedDocks'], fallbackDocks);
      }
      showToastRef.current('warning', 'Limited Dock Data', 'Live data unavailable — showing known docks');
    } else if (toastKey === 'hazards-error') {
      const fallbackHazards = getMockHazardsNear(lat, lon, radiusKm);
      if (fallbackHazards.length > 0 && allHazardsRef.current.length === 0) {
        queryClient.setQueryData(['cachedHazards'], fallbackHazards);
      }
      showToastRef.current('warning', 'Limited Hazard Data', 'Live data unavailable — showing known hazards');
    }
  }, [docksError, hazardsError, lat, lon, radiusKm, queryClient]);

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

  const isLoadingDocks = docksQuery.isLoading;
  const isLoadingHazards = hazardsQuery.isLoading;
  const docksErrorMsg = docksError?.message ?? null;
  const hazardsErrorMsg = hazardsError?.message ?? null;
  const refetchDocks = docksQuery.refetch;
  const refetchHazards = hazardsQuery.refetch;

  return useMemo(() => ({
    docks: allDocks,
    hazards: allHazards,
    isLoadingDocks,
    isLoadingHazards,
    docksError: docksErrorMsg,
    hazardsError: hazardsErrorMsg,
    isOffline,
    findDockById,
    findHazardById,
    refetchDocks,
    refetchHazards,
  }), [
    allDocks,
    allHazards,
    isLoadingDocks,
    isLoadingHazards,
    docksErrorMsg,
    hazardsErrorMsg,
    isOffline,
    findDockById,
    findHazardById,
    refetchDocks,
    refetchHazards,
  ]);
});
