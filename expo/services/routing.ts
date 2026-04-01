import { RouteCoordinate, RouteStep, Hazard } from '@/types';
import { haversineDistance } from '@/utils/geo';
import { logger } from '@/utils/logger';
import { classifyHazards } from '@/utils/classify-hazards';

const OSRM_ENDPOINTS = [
  'https://router.project-osrm.org/route/v1/driving',
  'https://routing.openstreetmap.de/routed-car/route/v1/driving',
];
const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org/search';

const OSRM_COOLDOWN_MS = 10000;

const g = globalThis as Record<string, any>;
if (g.__ROUTING_OSRM_INDEX__ === undefined) g.__ROUTING_OSRM_INDEX__ = 0;
if (g.__ROUTING_LAST_FAILURE__ === undefined) g.__ROUTING_LAST_FAILURE__ = 0;

function getOsrmIndex(): number { return g.__ROUTING_OSRM_INDEX__ as number; }
function setOsrmIndex(v: number) { g.__ROUTING_OSRM_INDEX__ = v; }
function getLastFailure(): number { return g.__ROUTING_LAST_FAILURE__ as number; }
function setLastFailure(v: number) { g.__ROUTING_LAST_FAILURE__ = v; }

export function resetRoutingState(): void {
  setOsrmIndex(0);
  setLastFailure(0);
  logger.log('[Routing] State reset');
}

function getOsrmEndpoint(): string {
  if (getOsrmIndex() !== 0 && Date.now() - getLastFailure() >= OSRM_COOLDOWN_MS) {
    logger.log('[Routing] Cooldown expired — recovering to primary endpoint');
    setOsrmIndex(0);
  }
  return OSRM_ENDPOINTS[getOsrmIndex()];
}

export interface GeocodedPlace {
  displayName: string;
  latitude: number;
  longitude: number;
}

export interface LiveRouteResult {
  coordinates: RouteCoordinate[];
  distance: number;
  duration: number;
  steps: RouteStep[];
  summary: string;
}

export async function geocodeAddress(query: string, signal?: AbortSignal, countryCode: string = 'au'): Promise<GeocodedPlace[]> {
  try {
    const ccParam = countryCode ? `&countrycodes=${countryCode}` : '';
    const url = `${NOMINATIM_BASE}?q=${encodeURIComponent(query)}&format=json${ccParam}&limit=8&addressdetails=1`;
    logger.log('[Routing] Geocoding:', query);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'TruckDockFinderAU/1.0',
      },
      signal,
    });

    if (!response.ok) {
      logger.log('[Routing] Geocode failed:', response.status);
      return [];
    }

    const data = await response.json();
    logger.log('[Routing] Geocode results:', data.length);

    return data.map((item: any) => ({
      displayName: item.display_name,
      latitude: parseFloat(item.lat),
      longitude: parseFloat(item.lon),
    }));
  } catch (error: any) {
    if (error?.name === 'AbortError') {
      logger.log('[Routing] Geocode aborted');
    } else {
      logger.log('[Routing] Geocode error:', error);
    }
    return [];
  }
}

function buildRouteUrl(endpoint: string, origin: RouteCoordinate, destination: RouteCoordinate): string {
  return `${endpoint}/${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}?overview=full&geometries=geojson&steps=true`;
}

function parseOsrmResponse(data: any): LiveRouteResult | null {
  if (data.code !== 'Ok' || !data.routes?.length) {
    logger.log('[Routing] No routes found:', data.code);
    return null;
  }

  const route = data.routes[0];
  const coordinates: RouteCoordinate[] = route.geometry.coordinates.map(
    (coord: [number, number]) => ({ latitude: coord[1], longitude: coord[0] }),
  );
  const steps: RouteStep[] = route.legs[0].steps.map((step: any) => ({
    instruction: formatInstruction(step.maneuver, step.name),
    distance: step.distance,
    duration: step.duration,
    maneuver: step.maneuver?.type ?? 'straight',
  }));

  logger.log('[Routing] Route found:', {
    distance: route.distance,
    duration: route.duration,
    steps: steps.length,
    coords: coordinates.length,
  });

  return {
    coordinates,
    distance: route.distance,
    duration: route.duration,
    steps,
    summary: route.legs[0]?.summary ?? '',
  };
}

export function isRoutingOnCooldown(): boolean {
  if (getOsrmIndex() !== 0 && Date.now() - getLastFailure() < OSRM_COOLDOWN_MS) {
    return true;
  }
  return false;
}

export function getCooldownRemainingMs(): number {
  if (!isRoutingOnCooldown()) return 0;
  return Math.max(0, OSRM_COOLDOWN_MS - (Date.now() - getLastFailure()));
}

export async function getRoute(
  origin: RouteCoordinate,
  destination: RouteCoordinate,
  signal?: AbortSignal,
): Promise<LiveRouteResult | null> {
  try {
    const endpoint = getOsrmEndpoint();
    const url = buildRouteUrl(endpoint, origin, destination);
    logger.log('[Routing] Fetching route via', endpoint);

    const response = await fetch(url, {
      headers: { 'User-Agent': 'DocksAndBridgesAU/1.0' },
      signal,
    });

    if (!response.ok) {
      logger.log('[Routing] Route fetch failed:', response.status);
      setLastFailure(Date.now());

      if (response.status === 429 || response.status === 503) {
        setOsrmIndex((getOsrmIndex() + 1) % OSRM_ENDPOINTS.length);
        logger.log('[Routing] Switching to fallback OSRM endpoint');
        const fallbackUrl = buildRouteUrl(getOsrmEndpoint(), origin, destination);
        const fallbackResp = await fetch(fallbackUrl, {
          headers: { 'User-Agent': 'DocksAndBridgesAU/1.0' },
          signal,
        });
        if (!fallbackResp.ok) return null;
        return parseOsrmResponse(await fallbackResp.json());
      }
      return null;
    }

    return parseOsrmResponse(await response.json());
  } catch (error: any) {
    if (error?.name === 'AbortError') {
      logger.log('[Routing] Route request aborted');
    } else {
      logger.log('[Routing] Route error:', error);
    }
    return null;
  }
}

export function filterHazardsNearRoute(
  routeCoords: RouteCoordinate[],
  hazardsList: Hazard[],
  proximityKm: number = 0.5,
): Hazard[] {
  if (routeCoords.length === 0 || hazardsList.length === 0) return [];

  const pad = proximityKm / 111;
  let minLat = 90, maxLat = -90, minLon = 180, maxLon = -180;
  for (const c of routeCoords) {
    if (c.latitude < minLat) minLat = c.latitude;
    if (c.latitude > maxLat) maxLat = c.latitude;
    if (c.longitude < minLon) minLon = c.longitude;
    if (c.longitude > maxLon) maxLon = c.longitude;
  }
  minLat -= pad;
  maxLat += pad;
  minLon -= pad;
  maxLon += pad;

  const sampleStep = Math.max(1, Math.floor(routeCoords.length / 80));
  const sampledCoords = sampleStep === 1
    ? routeCoords
    : routeCoords.filter((_, i) => i % sampleStep === 0 || i === routeCoords.length - 1);

  const nearby: Hazard[] = [];
  for (const hazard of hazardsList) {
    if (
      hazard.latitude < minLat || hazard.latitude > maxLat ||
      hazard.longitude < minLon || hazard.longitude > maxLon
    ) {
      continue;
    }

    const isNearRoute = sampledCoords.some(
      (coord) => haversineDistance(coord.latitude, coord.longitude, hazard.latitude, hazard.longitude) < proximityKm,
    );
    if (isNearRoute) {
      nearby.push(hazard);
    }
  }
  return nearby;
}

export function analyzeRouteHazards(
  routeCoords: RouteCoordinate[],
  truckHeight: number,
  hazardsList: Hazard[],
  proximityKm: number = 0.5,
  truckWeight?: number,
  truckWidth?: number,
): { blockedHazards: Hazard[]; tightHazards: Hazard[]; safeHazards: Hazard[]; nearbyHazards: Hazard[] } {
  const nearby = filterHazardsNearRoute(routeCoords, hazardsList, proximityKm);
  const { blocked, tight, safe } = classifyHazards(nearby, truckHeight, truckWeight, truckWidth);

  logger.log('[Routing] Hazard analysis:', {
    nearby: nearby.length,
    blocked: blocked.length,
    tight: tight.length,
    safe: safe.length,
  });

  return { blockedHazards: blocked, tightHazards: tight, safeHazards: safe, nearbyHazards: nearby };
}

function formatInstruction(maneuver: any, streetName: string): string {
  if (!maneuver) return `Continue on ${streetName || 'road'}`;

  const type = maneuver.type;
  const modifier = maneuver.modifier;
  const name = streetName || 'the road';

  switch (type) {
    case 'depart':
      return `Head ${modifier ?? 'forward'} on ${name}`;
    case 'arrive':
      return 'Arrive at your destination';
    case 'turn':
      return `Turn ${modifier ?? ''} onto ${name}`;
    case 'merge':
      return `Merge ${modifier ?? ''} onto ${name}`;
    case 'fork':
      return `Take the ${modifier ?? ''} fork onto ${name}`;
    case 'roundabout':
    case 'rotary':
      return `At the roundabout, take exit onto ${name}`;
    case 'new name':
      return `Continue onto ${name}`;
    case 'end of road':
      return `Turn ${modifier ?? ''} onto ${name}`;
    case 'continue':
      return `Continue on ${name}`;
    default:
      return `Continue on ${name}`;
  }
}

export function formatDistance(meters: number): string {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)} km`;
  }
  return `${Math.round(meters)} m`;
}

export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes} min`;
}
