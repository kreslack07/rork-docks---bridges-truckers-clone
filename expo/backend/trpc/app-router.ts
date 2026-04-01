import { createTRPCRouter } from "./create-context";
import { authRouter } from "./routes/auth";
import { docksRouter } from "./routes/docks";
import { hazardsRouter } from "./routes/hazards";

export const appRouter = createTRPCRouter({
  auth: authRouter,
  docks: docksRouter,
  hazards: hazardsRouter,
});

export type AppRouter = typeof appRouter;
