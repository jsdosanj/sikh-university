// Sikh University Worker entrypoint.
// Static files in site/ are served by the [assets] binding; /api/* is dispatched
// to the existing handlers (unchanged) that live under functions/api/.
import { onRequestGet as meGet, onRequestPost as mePost } from "./functions/api/me.js";
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
import { onRequestPost as programExamPost } from "./functions/api/program-exam.js";
import { onRequestGet as announcementsGet, onRequestPost as announcementsPost } from "./functions/api/announcements.js";
import { onRequestGet as discussionsGet, onRequestPost as discussionsPost } from "./functions/api/discussions.js";
import { onRequestGet as ratingsGet, onRequestPost as ratingsPost } from "./functions/api/ratings.js";
import { onRequestGet as certGet, onRequestPost as certPost } from "./functions/api/certificates.js";
import { onRequestGet as enrollmentsGet, onRequestPost as enrollmentsPost } from "./functions/api/enrollments.js";
import { onRequestGet as accountExportGet } from "./functions/api/account/export.js";
import { onRequestPost as accountDeletePost } from "./functions/api/account/delete.js";
import { onRequestPost as translatePost } from "./functions/api/translate.js";
import { onRequestGet as cohortsGet, onRequestPost as cohortsPost } from "./functions/api/cohorts.js";
import { onRequestGet as healthGet } from "./functions/api/health.js";

// path -> { GET, POST } handlers. Each handler takes { request, env }.
const routes = {
  "/api/me": { GET: meGet, POST: mePost },
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
  "/api/program-exam": { POST: programExamPost },
  "/api/announcements": { GET: announcementsGet, POST: announcementsPost },
  "/api/discussions": { GET: discussionsGet, POST: discussionsPost },
  "/api/ratings": { GET: ratingsGet, POST: ratingsPost },
  "/api/certificates": { GET: certGet, POST: certPost },
  "/api/enrollments": { GET: enrollmentsGet, POST: enrollmentsPost },
  "/api/account/export": { GET: accountExportGet },
  "/api/account/delete": { POST: accountDeletePost },
  "/api/translate": { POST: translatePost },
  "/api/cohorts": { GET: cohortsGet, POST: cohortsPost },
  "/api/health": { GET: healthGet },
};

// Per-IP rate limit for each POST endpoint: { limit, window (seconds) }. Enforced with an
// atomic D1 counter (checkRateLimit below) — the Cloudflare experimental `ratelimit`
// binding silently failed open in testing (65 rapid requests, 0 blocked), so we don't
// rely on it.
const RATE_LIMITS = {
  "/api/auth/request": { limit: 20, window: 60 },  // magic-link sends (anti mail-bomb)
  "/api/translate": { limit: 60, window: 60 },     // paid Workers AI — cap per-IP cost
  "/api/feedback": { limit: 15, window: 60 },
  "/api/discussions": { limit: 15, window: 60 },
  "/api/ratings": { limit: 15, window: 60 },
};
const RL_ENFORCE = true;

// Atomic fixed-window per-key limiter on D1. Strongly consistent, so a fast burst can't
// slip through on stale reads the way a KV counter would. Fails OPEN on any error / no DB
// so a limiter problem never locks out the mission's users. Creates its table lazily,
// once per isolate.
let rlReady = false;
async function checkRateLimit(env, key, limit, windowSec) {
  if (!env.DB) return true;
  try {
    if (!rlReady) {
      await env.DB.prepare("CREATE TABLE IF NOT EXISTS rate_limits (k TEXT PRIMARY KEY, count INTEGER NOT NULL, reset_at INTEGER NOT NULL)").run();
      rlReady = true;
    }
    const now = Math.floor(Date.now() / 1000);
    const row = await env.DB.prepare(
      "INSERT INTO rate_limits (k, count, reset_at) VALUES (?1, 1, ?2) " +
      "ON CONFLICT(k) DO UPDATE SET " +
      "count = CASE WHEN reset_at <= ?3 THEN 1 ELSE count + 1 END, " +
      "reset_at = CASE WHEN reset_at <= ?3 THEN ?2 ELSE reset_at END " +
      "RETURNING count"
    ).bind(key, now + windowSec, now).first();
    return !row || row.count <= limit;
  } catch (e) { return true; }
}

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
      // Rate limiting, keyed per client IP. Count-only unless RL_ENFORCE: a
      // limiter outage or an over-limit burst must never lock out the mission's
      // shared-NAT users, so it fails open and (for now) only logs.
      const rl = request.method === "POST" ? RATE_LIMITS[pathname] : null;
      if (rl) {
        const ip = request.headers.get("CF-Connecting-IP") || "unknown";
        const ok = await checkRateLimit(env, `${pathname}:${ip}`, rl.limit, rl.window);
        if (!ok) {
          console.warn("rate_limit_exceeded", pathname, ip);
          if (RL_ENFORCE) {
            return new Response(JSON.stringify({ error: "rate_limited" }), {
              status: 429, headers: { "content-type": "application/json", "retry-after": "60" },
            });
          }
        }
      }
      // Single choke point: any handler exception returns a JSON 500 (never a raw
      // Cloudflare HTML error page) and is logged so failures are observable.
      try {
        return await handler({ request, env });
      } catch (err) {
        console.error("api_error", request.method, pathname, err && err.stack || String(err));
        return new Response(JSON.stringify({ error: "server_error" }), {
          status: 500, headers: { "content-type": "application/json" },
        });
      }
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
    // Everything else: the Astro static build — inject security + AI-policy headers.
    const assetResp = await env.ASSETS.fetch(request);
    const ct = assetResp.headers.get('content-type') || '';
    const h = new Headers(assetResp.headers);
    // AI-crawler policy, applied site-wide: answer/search AI may crawl + cite us
    // (drives traffic), but the content is reserved against AI/ML training.
    // Full per-bot rules live in /robots.txt and /ai.txt; human-readable policy
    // at /ai-policy.html. Search indexing is untouched (no noindex here).
    h.set('X-Robots-Tag', 'noai, noimageai');
    h.set('Content-Usage', 'train-ai=n, search=y');
    h.set('TDM-Reservation', '1');
    h.set('TDM-Policy', 'https://sikh-university.dosanjhlabs.com/ai-policy');
    if (!ct.includes('text/html')) {
      return new Response(assetResp.body, { status: assetResp.status, statusText: assetResp.statusText, headers: h });
    }
    h.set('X-Content-Type-Options', 'nosniff');
    h.set('X-Frame-Options', 'DENY');
    h.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    h.set('Permissions-Policy', 'geolocation=(), camera=(), microphone=()');
    // Single authoritative CSP for HTML documents (this override wins over the
    // static _headers file, so the CSP lives here only). connect-src is tightened
    // to the one external origin the client actually calls (the BaniDB verse viewer).
    h.set('Content-Security-Policy',
      "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; " +
      "img-src 'self' data: https:; media-src 'self' https:; font-src 'self'; " +
      "connect-src 'self' https://api.banidb.com; " +
      "frame-src https://www.youtube-nocookie.com https://www.youtube.com; " +
      "form-action 'self' https://formsubmit.co; base-uri 'self'; frame-ancestors 'none'");
    return new Response(assetResp.body, { status: assetResp.status, statusText: assetResp.statusText, headers: h });
  },
};
