import * as z from "zod";
import { createTRPCRouter, publicProcedure } from "../create-context";

const OSRM_BASE = "https://router.project-osrm.org/route/v1/driving";
const NOMINATIM_BASE = "https://nominatim.openstreetmap.org/search";

function formatInstruction(maneuver: any, streetName: string): string {
  if (!maneuver) return `Continue on ${streetName || "road"}`;
  const type = maneuver.type;
  const modifier = maneuver.modifier;
  const name = streetName || "the road";

  switch (type) {
    case "depart":
      return `Head ${modifier ?? "forward"} on ${name}`;
    case "arrive":
      return "Arrive at your destination";
    case "turn":
      return `Turn ${modifier ?? ""} onto ${name}`;
    case "merge":
      return `Merge ${modifier ?? ""} onto ${name}`;
    case "fork":
      return `Take the ${modifier ?? ""} fork onto ${name}`;
    case "roundabout":
    case "rotary":
      return `At the roundabout, take exit onto ${name}`;
    case "new name":
      return `Continue onto ${name}`;
    case "end of road":
      return `Turn ${modifier ?? ""} onto ${name}`;
    case "continue":
      return `Continue on ${name}`;
    default:
      return `Continue on ${name}`;
  }
}

export const routingRouter = createTRPCRouter({
  geocode: publicProcedure
    .input(z.object({ query: z.string().min(1) }))
    .query(async ({ input }) => {
      const url = `${NOMINATIM_BASE}?q=${encodeURIComponent(input.query)}&format=json&countrycodes=au&limit=8&addressdetails=1`;
      console.log("[Backend:Routing] Geocoding:", input.query);

      const response = await fetch(url, {
        headers: { "User-Agent": "TruckDockFinderAU/1.0" },
      });

      if (!response.ok) {
        console.log("[Backend:Routing] Geocode failed:", response.status);
        return [];
      }

      const data = await response.json();
      return data.map((item: any) => ({
        displayName: item.display_name,
        latitude: parseFloat(item.lat),
        longitude: parseFloat(item.lon),
      }));
    }),

  getRoute: publicProcedure
    .input(
      z.object({
        origin: z.object({ latitude: z.number(), longitude: z.number() }),
        destination: z.object({ latitude: z.number(), longitude: z.number() }),
      }),
    )
    .query(async ({ input }) => {
      const url = `${OSRM_BASE}/${input.origin.longitude},${input.origin.latitude};${input.destination.longitude},${input.destination.latitude}?overview=full&geometries=geojson&steps=true`;
      console.log("[Backend:Routing] Fetching route...");

      const response = await fetch(url);
      if (!response.ok) {
        console.log("[Backend:Routing] Route fetch failed:", response.status);
        return null;
      }

      const data = await response.json();
      if (data.code !== "Ok" || !data.routes?.length) {
        console.log("[Backend:Routing] No routes found:", data.code);
        return null;
      }

      const route = data.routes[0];
      const coordinates = route.geometry.coordinates.map((coord: [number, number]) => ({
        latitude: coord[1],
        longitude: coord[0],
      }));

      const steps = route.legs[0].steps.map((step: any) => ({
        instruction: formatInstruction(step.maneuver, step.name),
        distance: step.distance,
        duration: step.duration,
        maneuver: step.maneuver?.type ?? "straight",
      }));

      return {
        coordinates,
        distance: route.distance,
        duration: route.duration,
        steps,
        summary: route.legs[0]?.summary ?? "",
      };
    }),
});
