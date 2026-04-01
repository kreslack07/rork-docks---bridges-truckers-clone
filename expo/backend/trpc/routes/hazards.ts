import * as z from "zod";
import { createTRPCRouter, publicProcedure } from "../create-context";
import { supabaseInsert } from "../../lib/supabase";

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
      console.log('[Backend:Hazards] New hazard report received:', input.name, 'on', input.road);

      const { id, persisted } = await supabaseInsert('hazard_reports', {
        type: input.type,
        name: input.name,
        road: input.road,
        city: input.city ?? null,
        state: input.state ?? null,
        clearance_height: input.clearanceHeight,
        latitude: input.latitude,
        longitude: input.longitude,
        description: input.description ?? null,
        status: 'pending_review',
        created_at: new Date().toISOString(),
      });

      console.log('[Backend:Hazards] Report id:', id, 'persisted:', persisted);

      return {
        id,
        name: input.name,
        road: input.road,
        status: 'pending_review' as const,
        persisted,
      };
    }),
});
