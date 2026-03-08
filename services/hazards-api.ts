import { Hazard } from '@/types';
import { throttledOverpassFetch } from '@/services/overpass-throttle';

interface OverpassElement {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

function parseMaxHeight(value: string): number | null {
  if (!value) return null;

  const cleanVal = value.replace(/\s/g, '').toLowerCase();

  const mMatch = cleanVal.match(/^([\d.]+)m?$/);
  if (mMatch) {
    const num = parseFloat(mMatch[1]);
    if (!isNaN(num) && num > 0 && num < 20) return num;
  }

  const ftInMatch = cleanVal.match(/^(\d+)'(\d+)"?$/);
  if (ftInMatch) {
    const ft = parseInt(ftInMatch[1], 10);
    const inches = parseInt(ftInMatch[2], 10);
    return parseFloat(((ft * 12 + inches) * 0.0254).toFixed(2));
  }

  const ftMatch = cleanVal.match(/^(\d+)'$/);
  if (ftMatch) {
    return parseFloat((parseInt(ftMatch[1], 10) * 0.3048).toFixed(2));
  }

  return null;
}

function parseWeight(value: string): number | null {
  if (!value) return null;
  const cleanVal = value.replace(/\s/g, '').toLowerCase();
  const tMatch = cleanVal.match(/^([\d.]+)t?$/);
  if (tMatch) {
    const num = parseFloat(tMatch[1]);
    if (!isNaN(num) && num > 0 && num < 500) return num;
  }
  return null;
}

function buildHazardFromElement(el: OverpassElement): Hazard | null {
  const lat = el.lat ?? el.center?.lat;
  const lon = el.lon ?? el.center?.lon;
  if (!lat || !lon || !el.tags) return null;

  const tags = el.tags;
  const maxheight = tags.maxheight || tags['maxheight:physical'] || tags['maxheight:signed'];
  const clearance = parseMaxHeight(maxheight || '');
  const maxweight = tags.maxweight || tags['maxweight:signed'];
  const weightLimit = parseWeight(maxweight || '');
  const maxwidth = tags.maxwidth;
  const widthLimit = parseMaxHeight(maxwidth || '');

  if (!clearance && !weightLimit) return null;

  const isWire =
    tags.power === 'line' ||
    tags.power === 'minor_line' ||
    tags.power === 'cable' ||
    (tags.description || '').toLowerCase().includes('wire') ||
    (tags.description || '').toLowerCase().includes('power');

  const isWeightOnly = !clearance && weightLimit;

  const roadName = tags.name || tags.ref || tags['addr:street'] || 'Unknown Road';
  const city = tags['addr:city'] || tags['addr:suburb'] || '';
  const state = tags['addr:state'] || '';

  const hazardType: 'bridge' | 'wire' | 'weight_limit' = isWeightOnly
    ? 'weight_limit'
    : isWire ? 'wire' : 'bridge';
  const bridgeType = tags.bridge || tags.man_made;
  const namePrefix = hazardType === 'weight_limit'
    ? 'Weight Limit'
    : hazardType === 'wire' ? 'Low Wires' : 'Low Bridge';
  const name = tags.name
    ? tags.name
    : `${namePrefix} — ${roadName}`;

  const descParts: string[] = [];
  if (clearance) descParts.push(`signed clearance of ${clearance}m`);
  if (weightLimit) descParts.push(`${weightLimit}t weight limit`);
  if (widthLimit) descParts.push(`${widthLimit}m width limit`);
  if (bridgeType) descParts.push(`Type: ${bridgeType}`);

  return {
    id: `osm-h-${el.id}`,
    type: hazardType,
    name,
    clearanceHeight: clearance ?? 99,
    road: roadName,
    city,
    state,
    latitude: lat,
    longitude: lon,
    description:
      tags.description ||
      (descParts.length > 0
        ? `${hazardType === 'weight_limit' ? 'Weight-restricted road' : hazardType === 'bridge' ? 'Low bridge' : 'Low-hanging wires'} with ${descParts.join(', ')}. Always verify on approach.`
        : 'Always verify on approach.'),
    lastVerified: tags['check_date'] || tags['survey:date'] || new Date().toISOString().split('T')[0],
    weightLimit: weightLimit ?? undefined,
    widthLimit: widthLimit ?? undefined,
  };
}

export async function fetchHazardsInArea(
  lat: number,
  lon: number,
  radiusKm: number = 30,
  signal?: AbortSignal,
): Promise<Hazard[]> {
  const radiusM = radiusKm * 1000;

  const query = `
    [out:json][timeout:25];
    (
      way["maxheight"](around:${radiusM},${lat},${lon});
      node["maxheight"](around:${radiusM},${lat},${lon});
      way["maxheight:physical"](around:${radiusM},${lat},${lon});
      node["maxheight:physical"](around:${radiusM},${lat},${lon});
      way["maxheight:signed"](around:${radiusM},${lat},${lon});
      node["maxheight:signed"](around:${radiusM},${lat},${lon});
      way["maxweight"](around:${radiusM},${lat},${lon});
      node["maxweight"](around:${radiusM},${lat},${lon});
    );
    out center 150;
  `;

  try {
    console.log('[Hazards API] Fetching hazards near', lat.toFixed(3), lon.toFixed(3), 'radius', radiusKm, 'km');

    const response = await throttledOverpassFetch(query, 'Hazards API', signal);

    if (!response) {
      console.log('[Hazards API] Overpass returned null (throttled or failed)');
      throw new Error('Overpass API unavailable — throttled or all endpoints failed');
    }

    const data = await response.json();
    const elements: OverpassElement[] = data.elements || [];
    console.log('[Hazards API] Raw elements:', elements.length);

    const hazards: Hazard[] = [];
    const seen = new Set<string>();

    for (const el of elements) {
      const hazard = buildHazardFromElement(el);
      if (hazard) {
        const key = `${hazard.latitude.toFixed(4)}-${hazard.longitude.toFixed(4)}`;
        if (!seen.has(key)) {
          seen.add(key);
          hazards.push(hazard);
        }
      }
    }

    hazards.sort((a, b) => a.clearanceHeight - b.clearanceHeight);
    console.log('[Hazards API] Processed hazards:', hazards.length);
    return hazards;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      console.log('[Hazards API] Fetch aborted');
      throw error;
    }
    console.log('[Hazards API] Fetch error:', error);
    throw error;
  }
}

export async function fetchHazardsAlongRoute(
  routeCoords: { latitude: number; longitude: number }[],
  corridorKm: number = 2,
  signal?: AbortSignal,
): Promise<Hazard[]> {
  if (routeCoords.length === 0) return [];

  const sampleStep = Math.max(1, Math.floor(routeCoords.length / 10));
  const sampledCoords = routeCoords.filter((_, i) => i % sampleStep === 0);

  let minLat = 90, maxLat = -90, minLon = 180, maxLon = -180;
  for (const c of sampledCoords) {
    if (c.latitude < minLat) minLat = c.latitude;
    if (c.latitude > maxLat) maxLat = c.latitude;
    if (c.longitude < minLon) minLon = c.longitude;
    if (c.longitude > maxLon) maxLon = c.longitude;
  }

  const pad = corridorKm / 111;
  minLat -= pad;
  maxLat += pad;
  minLon -= pad;
  maxLon += pad;

  const query = `
    [out:json][timeout:25];
    (
      way["maxheight"](${minLat},${minLon},${maxLat},${maxLon});
      node["maxheight"](${minLat},${minLon},${maxLat},${maxLon});
      way["maxheight:physical"](${minLat},${minLon},${maxLat},${maxLon});
      node["maxheight:physical"](${minLat},${minLon},${maxLat},${maxLon});
      way["maxweight"](${minLat},${minLon},${maxLat},${maxLon});
      node["maxweight"](${minLat},${minLon},${maxLat},${maxLon});
    );
    out center 200;
  `;

  try {
    console.log('[Hazards API] Fetching hazards along route bbox');
    const response = await throttledOverpassFetch(query, 'Hazards API', signal);

    if (!response) {
      throw new Error('Overpass API unavailable for route hazards');
    }

    const data = await response.json();
    const elements: OverpassElement[] = data.elements || [];

    const hazards: Hazard[] = [];
    const seen = new Set<string>();

    for (const el of elements) {
      const hazard = buildHazardFromElement(el);
      if (hazard) {
        const key = `${hazard.latitude.toFixed(4)}-${hazard.longitude.toFixed(4)}`;
        if (!seen.has(key)) {
          seen.add(key);
          hazards.push(hazard);
        }
      }
    }

    console.log('[Hazards API] Route hazards found:', hazards.length);
    return hazards;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      console.log('[Hazards API] Route fetch aborted');
      throw error;
    }
    console.log('[Hazards API] Route fetch error:', error);
    throw error;
  }
}
