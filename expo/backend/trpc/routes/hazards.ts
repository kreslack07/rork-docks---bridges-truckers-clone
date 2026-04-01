import * as z from "zod";
import { createTRPCRouter, publicProcedure } from "../create-context";

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
});
