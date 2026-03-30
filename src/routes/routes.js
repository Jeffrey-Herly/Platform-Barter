import indexRoutes from "./index.js";
import adminRoutes from "./admin.js";
import loginRoutes from "./login.js";

export default async function registerRoutes(app) {
  app.register(indexRoutes, { prefix: "/" });
  app.register(adminRoutes, { prefix: "/" });
  app.register(loginRoutes, { prefix: "/" });
}