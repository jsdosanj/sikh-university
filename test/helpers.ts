// Test helpers: a hand-built mock Cloudflare `env` + a Request builder.
//
// The real handlers (functions/api/*.js) are plain ES modules that take
// ({ request, env }). We import them directly and call them with a crafted
// Request and this mock env. env.DB mimics the D1 shape:
//   env.DB.prepare(sql).bind(...args).first() / .run() / .all()
// returning scripted rows chosen by matching a substring of the SQL string.
//
// This tests handler LOGIC deterministically with zero external services.

type CertRow = {
  id: string;
  user_id: string;
  course_id: string;
  name: unknown;
  score: unknown;
  issued_at: unknown;
};

type Ctx = {
  user: any;
  progress: any;
  certById: any;
  dbThrows: boolean;
  rows: any[] | null;
  DB: any;
};

function resolveFirst(sql: string, bound: any[], ctx: Ctx) {
  // getUser(): sessions JOIN users — returns the configured signed-in user (or null).
  if (sql.includes("FROM sessions s JOIN users u")) return ctx.user;
  // quiz.js / certificates.js: authoritative pass score for a (user, course).
  if (sql.includes("passed_score FROM progress")) return ctx.progress;
  // certificates GET verify: SELECT ... FROM certificates WHERE id=?
  if (sql.includes("FROM certificates WHERE id=")) {
    const id = bound[0];
    const found = (ctx.DB._certStore as CertRow[]).find((c) => c.id === id);
    if (found) {
      return {
        course_id: found.course_id,
        name: found.name,
        score: found.score,
        issued_at: found.issued_at,
      };
    }
    return ctx.certById && ctx.certById.id === id ? ctx.certById : null;
  }
  // certificates POST existing-lookup: SELECT id FROM certificates WHERE user_id=? AND course_id=?
  if (sql.includes("FROM certificates WHERE user_id=")) {
    const [uid, cid] = bound;
    const found = (ctx.DB._certStore as CertRow[]).find(
      (c) => c.user_id === uid && c.course_id === cid
    );
    return found ? { id: found.id } : null;
  }
  return null;
}

function resolveRun(sql: string, bound: any[], ctx: Ctx) {
  // certificates POST issue: persist so a second POST is idempotent.
  if (sql.includes("INSERT INTO certificates")) {
    (ctx.DB._certStore as CertRow[]).push({
      id: bound[0],
      user_id: bound[1],
      course_id: bound[2],
      name: bound[3],
      score: bound[4],
      issued_at: bound[5],
    });
    return { success: true };
  }
  if (sql.includes("UPDATE certificates SET name")) {
    const id = bound[1];
    const c = (ctx.DB._certStore as CertRow[]).find((x) => x.id === id);
    if (c) c.name = bound[0];
    return { success: true };
  }
  // CREATE TABLE (ensure/logEvent), INSERT INTO progress/events, UPDATE users, ... — no-op.
  return { success: true };
}

function resolveAll(_sql: string, _bound: any[], ctx: Ctx) {
  return { results: ctx.rows || [] };
}

function makeStmt(sql: string, ctx: Ctx) {
  let bound: any[] = [];
  const stmt = {
    bind(...args: any[]) {
      bound = args;
      return stmt;
    },
    async first() {
      if (ctx.dbThrows) throw new Error("simulated D1 outage");
      return resolveFirst(sql, bound, ctx);
    },
    async run() {
      if (ctx.dbThrows) throw new Error("simulated D1 outage");
      return resolveRun(sql, bound, ctx);
    },
    async all() {
      if (ctx.dbThrows) throw new Error("simulated D1 outage");
      return resolveAll(sql, bound, ctx);
    },
  };
  return stmt;
}

export type MockEnvOpts = {
  // The user row getUser() should resolve for a request that carries a session
  // cookie. Leave null to simulate "no such session".
  user?: any;
  // Row returned for "SELECT passed_score FROM progress ..." (or null).
  progress?: any;
  // Row returned for a certificate verify by id, when not in the live store.
  certById?: any;
  // Make every DB call throw, to simulate a database outage.
  dbThrows?: boolean;
  // Rows returned by any .all() query (admin list endpoints).
  rows?: any[] | null;
  // env.ADMIN_EMAILS value.
  adminEmails?: string;
};

export function mockEnv(opts: MockEnvOpts = {}) {
  const {
    user = null,
    progress = null,
    certById = null,
    dbThrows = false,
    rows = null,
    adminEmails = "",
  } = opts;
  const DB: any = { _certStore: [] as CertRow[] };
  const ctx: Ctx = { user, progress, certById, dbThrows, rows, DB };
  DB.prepare = (sql: string) => makeStmt(sql, ctx);
  return { DB, ADMIN_EMAILS: adminEmails, AI: {}, MEDIA: {} };
}

export type ReqOpts = {
  url?: string;
  cookie?: string;
  body?: unknown;
  method?: string;
};

// Build a Request. A session cookie is added as `su_session=<cookie>`.
export function req({ url = "http://localhost/api/x", cookie, body, method }: ReqOpts = {}) {
  const headers: Record<string, string> = {};
  if (cookie) headers.Cookie = `su_session=${cookie}`;
  const init: RequestInit = {
    method: method || (body !== undefined ? "POST" : "GET"),
    headers,
  };
  if (body !== undefined) {
    headers["content-type"] = "application/json";
    init.body = typeof body === "string" ? body : JSON.stringify(body);
  }
  return new Request(url, init);
}

// A signed-in learner and an admin, for authz tests.
export const LEARNER = { id: "u-learner", email: "learner@example.com", name: "Learner", role: "learner" };
export const ADMIN = { id: "u-admin", email: "admin@example.com", name: "Admin", role: "admin" };
