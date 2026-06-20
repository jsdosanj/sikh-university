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
import { onRequestGet as adminCourseTeachersGet, onRequestPost as adminCourseTeachersPost } from "./functions/api/admin/course-teachers.js";
import { onRequestGet as adminEventsGet } from "./functions/api/admin/events.js";
import { onRequestGet as gradebookGet, onRequestPost as gradebookPost } from "./functions/api/gradebook.js";
import { onRequestPost as quizPost } from "./functions/api/quiz.js";
import { onRequestGet as announcementsGet, onRequestPost as announcementsPost } from "./functions/api/announcements.js";
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
  "/api/admin/course-teachers": { GET: adminCourseTeachersGet, POST: adminCourseTeachersPost },
  "/api/admin/events": { GET: adminEventsGet },
  "/api/gradebook": { GET: gradebookGet, POST: gradebookPost },
  "/api/quiz": { POST: quizPost },
  "/api/announcements": { GET: announcementsGet, POST: announcementsPost },
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
      // Only serve known public prefixes so the rest of the bucket can never be
      // read via /media/ (defence-in-depth against a latent full-bucket disclosure).
      if (!key || key.includes("..") || !/^(santhya|audio|gurbani|media)\//.test(key)) {
        return new Response("Not found", { status: 404 });
      }
      const rangeHeader = request.headers.get("range");
      let opts;
      if (rangeHeader) {
        const m = /bytes=(\d*)-(\d*)/.exec(rangeHeader);
        if (m) {
          const start = m[1] ? parseInt(m[1], 10) : 0;
          const end = m[2] ? parseInt(m[2], 10) : undefined;
          // Ignore malformed ranges (negative or end<start) rather than computing a bad length.
          if (start >= 0 && (end === undefined || end >= start)) {
            opts = { range: end !== undefined ? { offset: start, length: end - start + 1 } : { offset: start } };
          }
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
    // courses.json is too large for Cloudflare's 25 MiB asset limit; serve from R2 instead.
    if (pathname === '/assets/data/courses.json') {
      const obj = await env.MEDIA.get('courses.json');
      if (!obj) return new Response('Not found', { status: 404 });
      const headers = new Headers();
      obj.writeHttpMetadata(headers);
      headers.set('content-type', 'application/json; charset=utf-8');
      headers.set('cache-control', 'public, max-age=3600');
      headers.set('access-control-allow-origin', '*');
      return new Response(obj.body, { status: 200, headers });
    }
    // Everything else: the Astro static build — inject security headers on HTML responses.
    const assetResp = await env.ASSETS.fetch(request);
    const ct = assetResp.headers.get('content-type') || '';
    if (!ct.includes('text/html')) return assetResp;
    const h = new Headers(assetResp.headers);
    h.set('X-Content-Type-Options', 'nosniff');
    h.set('X-Frame-Options', 'SAMEORIGIN');
    h.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    h.set('Permissions-Policy', 'geolocation=(), camera=(), microphone=()');
    h.set('Content-Security-Policy',
      "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data: https:; connect-src 'self' https:; frame-ancestors 'self'");
    return new Response(assetResp.body, { status: assetResp.status, statusText: assetResp.statusText, headers: h });
  },
};
