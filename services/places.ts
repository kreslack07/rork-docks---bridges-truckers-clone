import { Dock, BusinessCategory } from '@/types';
import { throttledOverpassFetch } from '@/services/overpass-throttle';

interface OverpassElement {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

const CATEGORY_MAP: Record<string, BusinessCategory> = {
  hotel: 'hotel',
  motel: 'hotel',
  hostel: 'hotel',
  guest_house: 'hotel',
  restaurant: 'restaurant',
  fast_food: 'restaurant',
  cafe: 'restaurant',
  warehouse: 'warehouse',
  hospital: 'hospital',
  clinic: 'hospital',
  mall: 'shopping',
  supermarket: 'supermarket',
  department_store: 'shopping',
  industrial: 'factory',
  fuel: 'fuel',
  port: 'port',
  ferry_terminal: 'port',
  construction: 'construction',
  office: 'office',
  wholesale: 'warehouse',
};

function resolveCategory(tags: Record<string, string>): BusinessCategory {
  const checks = [
    tags.tourism,
    tags.amenity,
    tags.shop,
    tags.building,
    tags.industrial,
    tags.landuse,
  ];

  for (const val of checks) {
    if (val && CATEGORY_MAP[val]) {
      return CATEGORY_MAP[val];
    }
  }

  if (tags.shop === 'supermarket' || tags.shop === 'wholesale') return 'supermarket';
  if (tags.building === 'warehouse' || tags.building === 'industrial') return 'warehouse';
  if (tags.building === 'hospital') return 'hospital';
  if (tags.building === 'hotel') return 'hotel';
  if (tags.building === 'retail' || tags.building === 'commercial') return 'shopping';

  return 'other';
}

function resolveDockType(tags: Record<string, string>): 'loading' | 'unloading' | 'both' {
  if (tags.amenity === 'loading_dock') return 'both';
  if (tags.service === 'loading') return 'loading';
  if (tags.service === 'unloading') return 'unloading';
  return 'both';
}

function buildDockFromElement(el: OverpassElement, index: number): Dock | null {
  const lat = el.lat ?? el.center?.lat;
  const lon = el.lon ?? el.center?.lon;
  if (!lat || !lon || !el.tags) return null;

  const tags = el.tags;
  const name = tags.name || tags['name:en'] || `Business #${el.id}`;
  const category = resolveCategory(tags);
  const addr = [
    tags['addr:housenumber'],
    tags['addr:street'],
    tags['addr:suburb'],
  ]
    .filter(Boolean)
    .join(' ');

  return {
    id: `osm-${el.id}`,
    name: tags.amenity === 'loading_dock'
      ? `${name} Loading Dock`
      : `${name} Dock`,
    business: name,
    businessCategory: category,
    address: addr || tags['addr:full'] || `Near ${lat.toFixed(4)}, ${lon.toFixed(4)}`,
    city: tags['addr:city'] || tags['addr:suburb'] || '',
    state: tags['addr:state'] || '',
    latitude: lat,
    longitude: lon,
    description: tags.description || `${name} — potential delivery/loading area.`,
    dockType: resolveDockType(tags),
    accessNotes: tags.note || tags.access || 'Check on arrival for dock access.',
    isOffRoad: tags.access === 'private' || tags.access === 'delivery',
    operatingHours: tags.opening_hours,
    phone: tags.phone || tags['contact:phone'],
  };
}

export async function searchDocksNearby(
  lat: number,
  lon: number,
  radiusKm: number = 15,
  signal?: AbortSignal,
): Promise<Dock[]> {
  const radiusM = radiusKm * 1000;

  const query = `
    [out:json][timeout:20];
    (
      node["amenity"="loading_dock"](around:${radiusM},${lat},${lon});
      way["amenity"="loading_dock"](around:${radiusM},${lat},${lon});
      node["tourism"="hotel"](around:${radiusM},${lat},${lon});
      way["tourism"="hotel"](around:${radiusM},${lat},${lon});
      node["amenity"="hospital"](around:${radiusM},${lat},${lon});
      way["amenity"="hospital"](around:${radiusM},${lat},${lon});
      node["building"="warehouse"](around:${radiusM},${lat},${lon});
      way["building"="warehouse"](around:${radiusM},${lat},${lon});
      node["shop"="supermarket"](around:${radiusM},${lat},${lon});
      way["shop"="supermarket"](around:${radiusM},${lat},${lon});
      node["shop"="wholesale"](around:${radiusM},${lat},${lon});
      way["shop"="wholesale"](around:${radiusM},${lat},${lon});
      node["shop"="mall"](around:${radiusM},${lat},${lon});
      way["shop"="mall"](around:${radiusM},${lat},${lon});
      node["amenity"="fuel"](around:${radiusM},${lat},${lon});
      way["amenity"="fuel"](around:${radiusM},${lat},${lon});
      node["building"="industrial"](around:${radiusM},${lat},${lon});
      way["building"="industrial"](around:${radiusM},${lat},${lon});
      node["landuse"="port"](around:${radiusM},${lat},${lon});
      way["landuse"="port"](around:${radiusM},${lat},${lon});
      node["building"="hotel"](around:${radiusM},${lat},${lon});
      way["building"="hotel"](around:${radiusM},${lat},${lon});
      node["shop"="department_store"](around:${radiusM},${lat},${lon});
      way["shop"="department_store"](around:${radiusM},${lat},${lon});
    );
    out center 80;
  `;

  try {
    console.log('[Places] Fetching docks near', lat.toFixed(3), lon.toFixed(3), 'radius', radiusKm, 'km');
    const response = await throttledOverpassFetch(query, 'Places', signal);

    if (!response) {
      console.log('[Places] Overpass request throttled or failed');
      throw new Error('Overpass API unavailable — throttled or all endpoints failed');
    }

    const data = await response.json();
    const elements: OverpassElement[] = data.elements || [];
    console.log('[Places] Raw elements received:', elements.length);

    const docks: Dock[] = [];
    const seen = new Set<string>();

    for (let i = 0; i < elements.length; i++) {
      const dock = buildDockFromElement(elements[i], i);
      if (dock) {
        const coordKey = `${dock.latitude.toFixed(5)}-${dock.longitude.toFixed(5)}`;
        if (!seen.has(coordKey)) {
          seen.add(coordKey);
          docks.push(dock);
        }
      }
    }

    console.log('[Places] Processed docks:', docks.length);
    return docks;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      console.log('[Places] Fetch aborted');
      throw error;
    }
    console.log('[Places] Fetch error:', error);
    throw error;
  }
}

export async function searchDocksByQuery(query: string, signal?: AbortSignal): Promise<Dock[]> {
  try {
    console.log('[Places] Text search:', query);
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query + ', Australia')}&format=json&limit=5&addressdetails=1`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'TruckDockFinderAU/1.0' },
      signal,
    });
    if (!response.ok) return [];

    const results = await response.json();
    if (!results.length) return [];

    const firstResult = results[0];
    const lat = parseFloat(firstResult.lat);
    const lon = parseFloat(firstResult.lon);

    return searchDocksNearby(lat, lon, 10, signal);
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      console.log('[Places] Text search aborted');
      throw error;
    }
    console.log('[Places] Text search error:', error);
    return [];
  }
}
