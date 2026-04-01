import * as z from "zod";
import { createTRPCRouter, publicProcedure } from "../create-context";

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
});
