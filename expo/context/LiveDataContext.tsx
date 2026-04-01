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
import { useNotifications } from '@/context/NotificationsContext';
import { usePersistedQuery } from '@/hooks/usePersistedQuery';

export interface HazardVerification {
  id: string;
  hazardId: string;
  userId: string;
  userName: string;
  status: 'confirmed' | 'disputed' | 'updated';
  newClearanceHeight?: number;
  comment: string;
  timestamp: number;
}

export interface CommunityReport {
  id: string;
  hazardId: string;
  userId: string;
  userName: string;
  reportType: 'removed' | 'changed' | 'dangerous' | 'inaccurate';
  description: string;
  timestamp: number;
  upvotes: number;
  upvotedBy: string[];
}

const VERIFICATIONS_KEY = 'community_verifications';
const REPORTS_KEY = 'community_reports';


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
  const { addLocalNotification, prefs } = useNotifications();

  const verificationsPersisted = usePersistedQuery<HazardVerification[]>({
    key: VERIFICATIONS_KEY,
    queryKey: ['communityVerifications'],
    defaultValue: [],
  });

  const reportsPersisted = usePersistedQuery<CommunityReport[]>({
    key: REPORTS_KEY,
    queryKey: ['communityReports'],
    defaultValue: [],
  });

  const { updateValue: updateVerifications } = verificationsPersisted;
  const { updateValue: updateReports } = reportsPersisted;
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

  const prevHazardIdsRef = useRef<Set<string>>(new Set());
  const prevDockIdsRef = useRef<Set<string>>(new Set());
  const addLocalNotificationRef = useRef(addLocalNotification);
  addLocalNotificationRef.current = addLocalNotification;
  const prefsRef = useRef(prefs);
  prefsRef.current = prefs;

  useEffect(() => {
    if (!allHazards.length) return;
    const currentIds = new Set(allHazards.map(h => h.id));
    const prevIds = prevHazardIdsRef.current;

    if (prevIds.size > 0 && prefsRef.current.hazardAlerts) {
      const newHazards = allHazards.filter(h => !prevIds.has(h.id));
      if (newHazards.length > 0 && newHazards.length <= 10) {
        const blocked = newHazards.filter(h => h.clearanceHeight < 4.3);
        if (blocked.length > 0) {
          addLocalNotificationRef.current(
            'New Hazards Detected',
            `${blocked.length} new low-clearance hazard${blocked.length !== 1 ? 's' : ''} found nearby: ${blocked.slice(0, 3).map(h => h.name).join(', ')}`,
            'hazard',
          );
          logger.log('[LiveData] Notified about', blocked.length, 'new blocked hazards');
        } else if (newHazards.length > 0) {
          addLocalNotificationRef.current(
            'New Hazards Nearby',
            `${newHazards.length} new hazard${newHazards.length !== 1 ? 's' : ''} detected in your area`,
            'hazard',
          );
          logger.log('[LiveData] Notified about', newHazards.length, 'new hazards');
        }
      }
    }
    prevHazardIdsRef.current = currentIds;
  }, [allHazards]);

  useEffect(() => {
    if (!allDocks.length) return;
    const currentIds = new Set(allDocks.map(d => d.id));
    const prevIds = prevDockIdsRef.current;

    if (prevIds.size > 0 && prefsRef.current.newDocks) {
      const newDocks = allDocks.filter(d => !prevIds.has(d.id));
      if (newDocks.length > 0 && newDocks.length <= 10) {
        addLocalNotificationRef.current(
          'New Docks Nearby',
          `${newDocks.length} new dock${newDocks.length !== 1 ? 's' : ''} found: ${newDocks.slice(0, 3).map(d => d.name).join(', ')}`,
          'dock',
        );
        logger.log('[LiveData] Notified about', newDocks.length, 'new docks');
      }
    }
    prevDockIdsRef.current = currentIds;
  }, [allDocks]);

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
  }, [docksError, hazardsError, lat, lon, queryClient]);

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

  const isLoadingDocks = docksQuery.isLoading;
  const isLoadingHazards = hazardsQuery.isLoading;
  const docksErrorMsg = docksError?.message ?? null;
  const hazardsErrorMsg = hazardsError?.message ?? null;
  const refetchDocks = docksQuery.refetch;
  const refetchHazards = hazardsQuery.refetch;

  const addVerification = useCallback((
    hazardId: string,
    userId: string,
    userName: string,
    status: HazardVerification['status'],
    comment: string,
    newClearanceHeight?: number,
  ) => {
    const newVerification: HazardVerification = {
      id: `ver_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      hazardId,
      userId,
      userName,
      status,
      comment,
      newClearanceHeight,
      timestamp: Date.now(),
    };
    updateVerifications(prev => [newVerification, ...prev].slice(0, 200));
    console.log('[Community] Verification added:', newVerification.id, status);
    return newVerification;
  }, [updateVerifications]);

  const addCommunityReport = useCallback((
    hazardId: string,
    userId: string,
    userName: string,
    reportType: CommunityReport['reportType'],
    description: string,
  ) => {
    const newReport: CommunityReport = {
      id: `rep_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      hazardId,
      userId,
      userName,
      reportType,
      description,
      timestamp: Date.now(),
      upvotes: 0,
      upvotedBy: [],
    };
    updateReports(prev => [newReport, ...prev].slice(0, 200));
    console.log('[Community] Report added:', newReport.id, reportType);
    return newReport;
  }, [updateReports]);

  const upvoteReport = useCallback((reportId: string, userId: string) => {
    updateReports(prev => prev.map(r => {
      if (r.id === reportId && !r.upvotedBy.includes(userId)) {
        return { ...r, upvotes: r.upvotes + 1, upvotedBy: [...r.upvotedBy, userId] };
      }
      return r;
    }));
  }, [updateReports]);

  const verificationsByHazard = useMemo(() => {
    const map = new Map<string, HazardVerification[]>();
    for (const v of verificationsPersisted.value) {
      const existing = map.get(v.hazardId);
      if (existing) existing.push(v);
      else map.set(v.hazardId, [v]);
    }
    return map;
  }, [verificationsPersisted.value]);

  const getVerificationsForHazard = useCallback((hazardId: string) => {
    return verificationsByHazard.get(hazardId) ?? [];
  }, [verificationsByHazard]);

  const reportsByHazard = useMemo(() => {
    const map = new Map<string, CommunityReport[]>();
    for (const r of reportsPersisted.value) {
      const existing = map.get(r.hazardId);
      if (existing) existing.push(r);
      else map.set(r.hazardId, [r]);
    }
    return map;
  }, [reportsPersisted.value]);

  const getReportsForHazard = useCallback((hazardId: string) => {
    return reportsByHazard.get(hazardId) ?? [];
  }, [reportsByHazard]);

  const getVerificationCount = useCallback((hazardId: string) => {
    return (verificationsByHazard.get(hazardId) ?? []).length;
  }, [verificationsByHazard]);

  const getConfirmedCount = useCallback((hazardId: string) => {
    return (verificationsByHazard.get(hazardId) ?? []).filter(v => v.status === 'confirmed').length;
  }, [verificationsByHazard]);

  const getDisputedCount = useCallback((hazardId: string) => {
    return (verificationsByHazard.get(hazardId) ?? []).filter(v => v.status === 'disputed').length;
  }, [verificationsByHazard]);

  const hasUserVerified = useCallback((hazardId: string, userId: string) => {
    return (verificationsByHazard.get(hazardId) ?? []).some(v => v.userId === userId);
  }, [verificationsByHazard]);

  return useMemo(() => ({
    docks: allDocks,
    hazards: allHazards,
    isLoadingDocks,
    isLoadingHazards,
    docksError: docksErrorMsg,
    hazardsError: hazardsErrorMsg,
    isOffline,
    updateMapCenter,
    findDockById,
    findHazardById,
    refetchDocks,
    refetchHazards,
    verifications: verificationsPersisted.value,
    reports: reportsPersisted.value,
    addVerification,
    addReport: addCommunityReport,
    upvoteReport,
    getVerificationsForHazard,
    getReportsForHazard,
    getVerificationCount,
    getConfirmedCount,
    getDisputedCount,
    hasUserVerified,
  }), [
    allDocks,
    allHazards,
    isLoadingDocks,
    isLoadingHazards,
    docksErrorMsg,
    hazardsErrorMsg,
    isOffline,
    updateMapCenter,
    findDockById,
    findHazardById,
    refetchDocks,
    refetchHazards,
    verificationsPersisted.value,
    reportsPersisted.value,
    addVerification,
    addCommunityReport,
    upvoteReport,
    getVerificationsForHazard,
    getReportsForHazard,
    getVerificationCount,
    getConfirmedCount,
    getDisputedCount,
    hasUserVerified,
  ]);
});

export function useCommunity() {
  const ctx = useLiveData();
  return useMemo(() => ({
    verifications: ctx.verifications,
    reports: ctx.reports,
    addVerification: ctx.addVerification,
    addReport: ctx.addReport,
    upvoteReport: ctx.upvoteReport,
    getVerificationsForHazard: ctx.getVerificationsForHazard,
    getReportsForHazard: ctx.getReportsForHazard,
    getVerificationCount: ctx.getVerificationCount,
    getConfirmedCount: ctx.getConfirmedCount,
    getDisputedCount: ctx.getDisputedCount,
    hasUserVerified: ctx.hasUserVerified,
  }), [ctx]);
}
