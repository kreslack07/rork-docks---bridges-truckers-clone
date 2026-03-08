import { trpcServer } from "@hono/trpc-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { html } from "hono/html";

import { appRouter } from "./trpc/app-router";
import { createContext } from "./trpc/create-context";
import { privacyPolicyHtml } from "./pages/privacy-policy";
import { termsOfServiceHtml } from "./pages/terms-of-service";
import { supportHtml } from "./pages/support";

const app = new Hono();

app.use("*", cors());

app.use(
  "/trpc/*",
  trpcServer({
    endpoint: "/api/trpc",
    router: appRouter,
    createContext,
  }),
);

app.get("/", (c) => {
  return c.json({ status: "ok", message: "DOCKS & BRIDGES API is running" });
});

app.get("/privacy-policy", (c) => {
  return c.html(privacyPolicyHtml);
});

app.get("/terms-of-service", (c) => {
  return c.html(termsOfServiceHtml);
});

app.get("/support", (c) => {
  return c.html(supportHtml);
});

export default app;
