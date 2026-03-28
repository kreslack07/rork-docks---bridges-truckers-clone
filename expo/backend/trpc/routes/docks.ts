import * as z from "zod";
import { createTRPCRouter, publicProcedure } from "../create-context";

const OVERPASS_API = "https://overpass-api.de/api/interpreter";
const NOMINATIM_BASE = "https://nominatim.openstreetmap.org/search";

const CATEGORY_MAP: Record<string, string> = {
  hotel: "hotel",
  motel: "hotel",
  hostel: "hotel",
  guest_house: "hotel",
  restaurant: "restaurant",
  fast_food: "restaurant",
  cafe: "restaurant",
  warehouse: "warehouse",
  hospital: "hospital",
  clinic: "hospital",
  mall: "shopping",
  supermarket: "supermarket",
  department_store: "shopping",
  industrial: "factory",
  fuel: "fuel",
  port: "port",
  ferry_terminal: "port",
  construction: "construction",
  office: "office",
  wholesale: "warehouse",
};

function resolveCategory(tags: Record<string, string>): string {
  const checks = [tags.tourism, tags.amenity, tags.shop, tags.building, tags.industrial, tags.landuse];
  for (const val of checks) {
    if (val && CATEGORY_MAP[val]) return CATEGORY_MAP[val];
  }
  if (tags.shop === "supermarket" || tags.shop === "wholesale") return "supermarket";
  if (tags.building === "warehouse" || tags.building === "industrial") return "warehouse";
  if (tags.building === "hospital") return "hospital";
  if (tags.building === "hotel") return "hotel";
  if (tags.building === "retail" || tags.building === "commercial") return "shopping";
  return "other";
}

function resolveDockType(tags: Record<string, string>): string {
  if (tags.amenity === "loading_dock") return "both";
  if (tags.service === "loading") return "loading";
  if (tags.service === "unloading") return "unloading";
  return "both";
}

interface OverpassElement {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

function buildDock(el: OverpassElement) {
  const lat = el.lat ?? el.center?.lat;
  const lon = el.lon ?? el.center?.lon;
  if (!lat || !lon || !el.tags) return null;

  const tags = el.tags;
  const name = tags.name || tags["name:en"] || `Business #${el.id}`;
  const category = resolveCategory(tags);
  const addr = [tags["addr:housenumber"], tags["addr:street"], tags["addr:suburb"]].filter(Boolean).join(" ");

  return {
    id: `osm-${el.id}`,
    name: tags.amenity === "loading_dock" ? `${name} Loading Dock` : `${name} Dock`,
    business: name,
    businessCategory: category,
    address: addr || tags["addr:full"] || `Near ${lat.toFixed(4)}, ${lon.toFixed(4)}`,
    city: tags["addr:city"] || tags["addr:suburb"] || "",
    state: tags["addr:state"] || "",
    latitude: lat,
    longitude: lon,
    description: tags.description || `${name} — potential delivery/loading area.`,
    dockType: resolveDockType(tags),
    accessNotes: tags.note || tags.access || "Check on arrival for dock access.",
    isOffRoad: tags.access === "private" || tags.access === "delivery",
    operatingHours: tags.opening_hours,
    phone: tags.phone || tags["contact:phone"],
  };
}

export const docksRouter = createTRPCRouter({
  report: publicProcedure
    .input(
      z.object({
        businessName: z.string().min(2),
        dockName: z.string().optional(),
        category: z.string(),
        dockType: z.enum(['loading', 'unloading', 'both']),
        address: z.string().min(5),
        city: z.string().optional(),
        state: z.string().optional(),
        operatingHours: z.string().optional(),
        phone: z.string().optional(),
        accessNotes: z.string().optional(),
        latitude: z.number().min(-90).max(90),
        longitude: z.number().min(-180).max(180),
      }),
    )
    .mutation(async ({ input }) => {
      console.log('[Backend:Docks] New dock report:', input.businessName, 'at', input.address);
      const id = `report-d-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      return {
        id,
        businessName: input.businessName,
        address: input.address,
        status: 'pending_review' as const,
      };
    }),

  nearby: publicProcedure
    .input(
      z.object({
        lat: z.number(),
        lon: z.number(),
        radiusKm: z.number().optional().default(15),
      }),
    )
    .query(async ({ input }) => {
      const radiusM = input.radiusKm * 1000;
      const query = `
        [out:json][timeout:20];
        (
          node["amenity"="loading_dock"](around:${radiusM},${input.lat},${input.lon});
          way["amenity"="loading_dock"](around:${radiusM},${input.lat},${input.lon});
          node["tourism"="hotel"](around:${radiusM},${input.lat},${input.lon});
          way["tourism"="hotel"](around:${radiusM},${input.lat},${input.lon});
          node["amenity"="hospital"](around:${radiusM},${input.lat},${input.lon});
          way["amenity"="hospital"](around:${radiusM},${input.lat},${input.lon});
          node["building"="warehouse"](around:${radiusM},${input.lat},${input.lon});
          way["building"="warehouse"](around:${radiusM},${input.lat},${input.lon});
          node["shop"="supermarket"](around:${radiusM},${input.lat},${input.lon});
          way["shop"="supermarket"](around:${radiusM},${input.lat},${input.lon});
          node["shop"="wholesale"](around:${radiusM},${input.lat},${input.lon});
          way["shop"="wholesale"](around:${radiusM},${input.lat},${input.lon});
          node["shop"="mall"](around:${radiusM},${input.lat},${input.lon});
          way["shop"="mall"](around:${radiusM},${input.lat},${input.lon});
          node["amenity"="fuel"](around:${radiusM},${input.lat},${input.lon});
          way["amenity"="fuel"](around:${radiusM},${input.lat},${input.lon});
          node["building"="industrial"](around:${radiusM},${input.lat},${input.lon});
          way["building"="industrial"](around:${radiusM},${input.lat},${input.lon});
          node["landuse"="port"](around:${radiusM},${input.lat},${input.lon});
          way["landuse"="port"](around:${radiusM},${input.lat},${input.lon});
          node["building"="hotel"](around:${radiusM},${input.lat},${input.lon});
          way["building"="hotel"](around:${radiusM},${input.lat},${input.lon});
          node["shop"="department_store"](around:${radiusM},${input.lat},${input.lon});
          way["shop"="department_store"](around:${radiusM},${input.lat},${input.lon});
        );
        out center 80;
      `;

      const response = await fetch(OVERPASS_API, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `data=${encodeURIComponent(query)}`,
      });

      if (!response.ok) {
        console.log("[Backend:Docks] Overpass error:", response.status);
        return [];
      }

      const data = await response.json();
      const elements: OverpassElement[] = data.elements || [];
      const docks: ReturnType<typeof buildDock>[] = [];
      const seen = new Set<string>();

      for (const el of elements) {
        const dock = buildDock(el);
        if (dock && !seen.has(dock.business)) {
          seen.add(dock.business);
          docks.push(dock);
        }
      }

      console.log("[Backend:Docks] Returned", docks.length, "docks");
      return docks;
    }),

  search: publicProcedure
    .input(z.object({ query: z.string().min(1) }))
    .query(async ({ input }) => {
      const url = `${NOMINATIM_BASE}?q=${encodeURIComponent(input.query + ", Australia")}&format=json&limit=5&addressdetails=1`;
      const response = await fetch(url, {
        headers: { "User-Agent": "TruckDockFinderAU/1.0" },
      });

      if (!response.ok) return [];

      const results = await response.json();
      if (!results.length) return [];

      const firstResult = results[0];
      const lat = parseFloat(firstResult.lat);
      const lon = parseFloat(firstResult.lon);

      const radiusM = 10000;
      const overpassQuery = `
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
        );
        out center 80;
      `;

      const overpassRes = await fetch(OVERPASS_API, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `data=${encodeURIComponent(overpassQuery)}`,
      });

      if (!overpassRes.ok) return [];

      const data = await overpassRes.json();
      const elements: OverpassElement[] = data.elements || [];
      const docks: ReturnType<typeof buildDock>[] = [];
      const seen = new Set<string>();

      for (const el of elements) {
        const dock = buildDock(el);
        if (dock && !seen.has(dock.business)) {
          seen.add(dock.business);
          docks.push(dock);
        }
      }

      return docks;
    }),
});
