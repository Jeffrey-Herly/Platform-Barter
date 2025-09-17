import indexRoutes from "./index.js";

export default async function registerRoutes(app) {
  app.register(indexRoutes, { prefix: "/" });
}