import * as z from "zod";
import { createTRPCRouter, publicProcedure } from "../create-context";

// STUB: These mutations are not persisted to any database.
// Reports are validated and acknowledged but lost on restart.
// TODO: Wire to a real database (e.g. Supabase) when ready for production.

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
      console.log('[Backend:Hazards] [STUB] New hazard report received:', input.name, 'on', input.road);
      console.log('[Backend:Hazards] [STUB] No database configured — report will not be persisted');
      const id = `stub-h-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      return {
        id,
        name: input.name,
        road: input.road,
        status: 'pending_review' as const,
        _stub: true,
      };
    }),
});
