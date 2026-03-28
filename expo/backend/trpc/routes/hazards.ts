import * as z from "zod";
import { createTRPCRouter, publicProcedure } from "../create-context";

const OVERPASS_API = "https://overpass-api.de/api/interpreter";

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
  const cleanVal = value.replace(/\s/g, "").toLowerCase();

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

function buildHazard(el: OverpassElement) {
  const lat = el.lat ?? el.center?.lat;
  const lon = el.lon ?? el.center?.lon;
  if (!lat || !lon || !el.tags) return null;

  const tags = el.tags;
  const maxheight = tags.maxheight || tags["maxheight:physical"] || tags["maxheight:signed"];
  const clearance = parseMaxHeight(maxheight || "");
  if (!clearance) return null;

  const isWire =
    tags.power === "line" ||
    tags.power === "minor_line" ||
    tags.power === "cable" ||
    (tags.description || "").toLowerCase().includes("wire") ||
    (tags.description || "").toLowerCase().includes("power");

  const roadName = tags.name || tags.ref || tags["addr:street"] || "Unknown Road";
  const city = tags["addr:city"] || tags["addr:suburb"] || "";
  const state = tags["addr:state"] || "";
  const hazardType = isWire ? "wire" : "bridge";
  const bridgeType = tags.bridge || tags.man_made;
  const namePrefix = hazardType === "wire" ? "Low Wires" : "Low Bridge";
  const name = tags.name ? tags.name : `${namePrefix} — ${roadName}`;

  return {
    id: `osm-h-${el.id}`,
    type: hazardType,
    name,
    clearanceHeight: clearance,
    road: roadName,
    city,
    state,
    latitude: lat,
    longitude: lon,
    description:
      tags.description ||
      `${hazardType === "bridge" ? "Low bridge" : "Low-hanging wires"} with signed clearance of ${clearance}m. ${bridgeType ? `Type: ${bridgeType}.` : ""} Always verify on approach.`,
    lastVerified: tags.check_date || tags["survey:date"] || new Date().toISOString().split("T")[0],
  };
}

export const hazardsRouter = createTRPCRouter({
  report: publicProcedure
    .input(
      z.object({
        type: z.enum(['bridge', 'wire', 'weight_limit']),
        name: z.string().min(3),
        road: z.string().min(2),
        city: z.string().optional(),
        state: z.string().optional(),
        clearanceHeight: z.number().positive().max(20),
        latitude: z.number().min(-90).max(90),
        longitude: z.number().min(-180).max(180),
        description: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      console.log('[Backend:Hazards] New hazard report:', input.name, 'on', input.road);
      const id = `report-h-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      return {
        id,
        name: input.name,
        road: input.road,
        status: 'pending_review' as const,
      };
    }),

  nearby: publicProcedure
    .input(
      z.object({
        lat: z.number(),
        lon: z.number(),
        radiusKm: z.number().optional().default(30),
      }),
    )
    .query(async ({ input }) => {
      const radiusM = input.radiusKm * 1000;
      const query = `
        [out:json][timeout:25];
        (
          way["maxheight"](around:${radiusM},${input.lat},${input.lon});
          node["maxheight"](around:${radiusM},${input.lat},${input.lon});
          way["maxheight:physical"](around:${radiusM},${input.lat},${input.lon});
          node["maxheight:physical"](around:${radiusM},${input.lat},${input.lon});
          way["maxheight:signed"](around:${radiusM},${input.lat},${input.lon});
          node["maxheight:signed"](around:${radiusM},${input.lat},${input.lon});
        );
        out center 150;
      `;

      const response = await fetch(OVERPASS_API, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `data=${encodeURIComponent(query)}`,
      });

      if (!response.ok) {
        console.log("[Backend:Hazards] Overpass error:", response.status);
        return [];
      }

      const data = await response.json();
      const elements: OverpassElement[] = data.elements || [];
      const hazards: ReturnType<typeof buildHazard>[] = [];
      const seen = new Set<string>();

      for (const el of elements) {
        const hazard = buildHazard(el);
        if (hazard) {
          const key = `${hazard.latitude.toFixed(4)}-${hazard.longitude.toFixed(4)}`;
          if (!seen.has(key)) {
            seen.add(key);
            hazards.push(hazard);
          }
        }
      }

      hazards.sort((a, b) => (a?.clearanceHeight ?? 0) - (b?.clearanceHeight ?? 0));
      console.log("[Backend:Hazards] Returned", hazards.length, "hazards");
      return hazards;
    }),

  alongRoute: publicProcedure
    .input(
      z.object({
        routeCoords: z.array(z.object({ latitude: z.number(), longitude: z.number() })),
        corridorKm: z.number().optional().default(2),
      }),
    )
    .query(async ({ input }) => {
      if (input.routeCoords.length === 0) return [];

      const sampleStep = Math.max(1, Math.floor(input.routeCoords.length / 10));
      const sampledCoords = input.routeCoords.filter((_, i) => i % sampleStep === 0);

      let minLat = 90, maxLat = -90, minLon = 180, maxLon = -180;
      for (const c of sampledCoords) {
        if (c.latitude < minLat) minLat = c.latitude;
        if (c.latitude > maxLat) maxLat = c.latitude;
        if (c.longitude < minLon) minLon = c.longitude;
        if (c.longitude > maxLon) maxLon = c.longitude;
      }

      const pad = input.corridorKm / 111;
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
        );
        out center 200;
      `;

      const response = await fetch(OVERPASS_API, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `data=${encodeURIComponent(query)}`,
      });

      if (!response.ok) return [];

      const data = await response.json();
      const elements: OverpassElement[] = data.elements || [];
      const hazards: ReturnType<typeof buildHazard>[] = [];
      const seen = new Set<string>();

      for (const el of elements) {
        const hazard = buildHazard(el);
        if (hazard) {
          const key = `${hazard.latitude.toFixed(4)}-${hazard.longitude.toFixed(4)}`;
          if (!seen.has(key)) {
            seen.add(key);
            hazards.push(hazard);
          }
        }
      }

      return hazards;
    }),
});
