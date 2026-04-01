import * as z from "zod";
import { createTRPCRouter, publicProcedure } from "../create-context";
import { supabaseInsert } from "../../lib/supabase";

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
      console.log('[Backend:Docks] New dock report received:', input.businessName, 'at', input.address);

      const { id, persisted } = await supabaseInsert('dock_reports', {
        business_name: input.businessName,
        dock_name: input.dockName ?? null,
        category: input.category,
        dock_type: input.dockType,
        address: input.address,
        city: input.city ?? null,
        state: input.state ?? null,
        operating_hours: input.operatingHours ?? null,
        phone: input.phone ?? null,
        access_notes: input.accessNotes ?? null,
        latitude: input.latitude,
        longitude: input.longitude,
        status: 'pending_review',
        created_at: new Date().toISOString(),
      });

      console.log('[Backend:Docks] Report id:', id, 'persisted:', persisted);

      return {
        id,
        businessName: input.businessName,
        address: input.address,
        status: 'pending_review' as const,
        persisted,
      };
    }),
});
