import { createTRPCRouter } from "./create-context";
import { authRouter } from "./routes/auth";
import { docksRouter } from "./routes/docks";
import { hazardsRouter } from "./routes/hazards";
import { routingRouter } from "./routes/routing";

export const appRouter = createTRPCRouter({
  auth: authRouter,
  docks: docksRouter,
  hazards: hazardsRouter,
  routing: routingRouter,
});

export type AppRouter = typeof appRouter;
