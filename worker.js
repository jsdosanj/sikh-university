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
import { onRequestPost as feedbackPost } from "./functions/api/feedback.js";
import { onRequestGet as adminFeedbackGet } from "./functions/api/admin/feedback.js";
import { onRequestGet as adminStatsGet } from "./functions/api/admin/stats.js";
import { onRequestGet as adminUsersGet, onRequestPost as adminUsersPost } from "./functions/api/admin/users.js";
import { onRequestGet as discussionsGet, onRequestPost as discussionsPost } from "./functions/api/discussions.js";
import { onRequestGet as ratingsGet, onRequestPost as ratingsPost } from "./functions/api/ratings.js";
import { onRequestGet as certGet, onRequestPost as certPost } from "./functions/api/certificates.js";

// path -> { GET, POST } handlers. Each handler takes { request, env }.
const routes = {
  "/api/me": { GET: meGet },
  "/api/progress": { GET: progressGet, POST: progressPost },
  "/api/auth/request": { POST: authRequestPost },
  "/api/auth/verify": { GET: authVerifyGet },
  "/api/auth/logout": { POST: authLogoutPost },
  "/api/teacher/apply": { POST: teacherApplyPost },
  "/api/admin/applications": { GET: adminAppsGet, POST: adminAppsPost },
  "/api/feedback": { POST: feedbackPost },
  "/api/admin/feedback": { GET: adminFeedbackGet },
  "/api/admin/stats": { GET: adminStatsGet },
  "/api/admin/users": { GET: adminUsersGet, POST: adminUsersPost },
  "/api/discussions": { GET: discussionsGet, POST: discussionsPost },
  "/api/ratings": { GET: ratingsGet, POST: ratingsPost },
  "/api/certificates": { GET: certGet, POST: certPost },
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
    // Audio + media streamed from R2 (zero egress), same-origin so <audio> + CSP work.
    if (pathname.startsWith("/media/")) {
      const key = decodeURIComponent(pathname.slice("/media/".length));
      if (!key) return new Response("Not found", { status: 404 });
      const rangeHeader = request.headers.get("range");
      let opts;
      if (rangeHeader) {
        const m = /bytes=(\d*)-(\d*)/.exec(rangeHeader);
        if (m) {
          const start = m[1] ? parseInt(m[1], 10) : 0;
          const end = m[2] ? parseInt(m[2], 10) : undefined;
          opts = { range: end !== undefined ? { offset: start, length: end - start + 1 } : { offset: start } };
        }
      }
      const obj = await env.MEDIA.get(key, opts);
      if (!obj) return new Response("Not found", { status: 404 });
      const headers = new Headers();
      obj.writeHttpMetadata(headers);
      headers.set("accept-ranges", "bytes");
      headers.set("cache-control", "public, max-age=31536000, immutable");
      if (obj.range) {
        const s = obj.range.offset || 0;
        const len = obj.range.length != null ? obj.range.length : obj.size - s;
        headers.set("content-range", `bytes ${s}-${s + len - 1}/${obj.size}`);
        headers.set("content-length", String(len));
        return new Response(obj.body, { status: 206, headers });
      }
      headers.set("content-length", String(obj.size));
      return new Response(obj.body, { status: 200, headers });
    }
    // Everything else: the Astro static build.
    return env.ASSETS.fetch(request);
  },
};
