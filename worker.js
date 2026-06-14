// Sikh University Worker entrypoint.
// Static files in site/ are served by the [assets] binding; /api/* is dispatched
// to the existing handlers (unchanged) that live under functions/api/.
import { onRequestGet as meGet } from "./functions/api/me.js";
import { onRequestGet as progressGet, onRequestPost as progressPost } from "./functions/api/progress.js";
import { onRequestPost as authRequestPost } from "./functions/api/auth/request.js";
import { onRequestGet as authVerifyGet } from "./functions/api/auth/verify.js";
import { onRequestPost as authLogoutPost } from "./functions/api/auth/logout.js";
import { onRequestPost as teacherApplyPost } from "./functions/api/teacher/apply.js";
import { onRequestGet as adminAppsGet, onRequestPost as adminAppsPost } from "./functions/api/admin/applications.js";

// path -> { GET, POST } handlers. Each handler takes { request, env }.
const routes = {
  "/api/me": { GET: meGet },
  "/api/progress": { GET: progressGet, POST: progressPost },
  "/api/auth/request": { POST: authRequestPost },
  "/api/auth/verify": { GET: authVerifyGet },
  "/api/auth/logout": { POST: authLogoutPost },
  "/api/teacher/apply": { POST: teacherApplyPost },
  "/api/admin/applications": { GET: adminAppsGet, POST: adminAppsPost },
};

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    if (pathname.startsWith("/api/")) {
      const route = routes[pathname];
      if (!route) {
        return new Response(JSON.stringify({ error: "not found" }), {
          status: 404, headers: { "content-type": "application/json" },
        });
      }
      const handler = route[request.method];
      if (!handler) {
        return new Response(JSON.stringify({ error: "method not allowed" }), {
          status: 405, headers: { "content-type": "application/json" },
        });
      }
      return handler({ request, env });
    }
    // Everything else: static assets (site/).
    return env.ASSETS.fetch(request);
  },
};
