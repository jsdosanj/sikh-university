// Media pipeline: single-shot uploads (photo/pdf/submission), the R2 multipart
// video flow (create/part/complete/abort), the /api/asset access matrix, and
// admin moderation (approve/reject). Uses a stateful fake D1 + fake R2 so the
// full lifecycle (create -> part -> complete -> serve) is exercised for real.
import { describe, it, expect, beforeEach } from "vitest";
import { onRequestPost as uploadPost } from "../functions/api/upload.js";
import { onRequestPost as createPost } from "../functions/api/upload/create.js";
import { onRequestPut as partPut } from "../functions/api/upload/part.js";
import { onRequestPost as completePost } from "../functions/api/upload/complete.js";
import { onRequestPost as abortPost } from "../functions/api/upload/abort.js";
import { onRequestGet as assetGet } from "../functions/api/asset.js";
import { onRequestGet as adminUploadsGet, onRequestPost as adminUploadsPost } from "../functions/api/admin/uploads.js";
import { req } from "./helpers";

function fakeR2() {
  const store = new Map<string, { body: Uint8Array; httpMetadata: any }>();
  const multiparts = new Map<string, { key: string; parts: Map<number, Uint8Array>; httpMetadata: any }>();
  let counter = 0;
  async function toBytes(body: any): Promise<Uint8Array> {
    if (body instanceof Uint8Array) return body;
    return new Uint8Array(await new Response(body).arrayBuffer());
  }
  return {
    async put(key: string, body: any, opts: any) {
      const bytes = await toBytes(body);
      store.set(key, { body: bytes, httpMetadata: opts?.httpMetadata || {} });
      return { key, size: bytes.byteLength };
    },
    async get(key: string) {
      const row = store.get(key);
      if (!row) return null;
      return { body: row.body, size: row.body.byteLength, writeHttpMetadata(h: Headers) { if (row.httpMetadata.contentType) h.set("content-type", row.httpMetadata.contentType); } };
    },
    async delete(key: string) { store.delete(key); },
    async createMultipartUpload(key: string, opts: any) {
      const uploadId = "mpu-" + (++counter);
      multiparts.set(uploadId, { key, parts: new Map(), httpMetadata: opts?.httpMetadata });
      return { key, uploadId };
    },
    resumeMultipartUpload(key: string, uploadId: string) {
      const mp = multiparts.get(uploadId);
      return {
        async uploadPart(partNumber: number, body: any) {
          const bytes = await toBytes(body);
          mp!.parts.set(partNumber, bytes);
          return { etag: "etag-" + partNumber };
        },
        async complete() {
          const ordered = [...mp!.parts.entries()].sort((a, b) => a[0] - b[0]).map(([, b]) => b);
          const size = ordered.reduce((s, c) => s + c.byteLength, 0);
          const combined = new Uint8Array(size);
          let off = 0;
          for (const c of ordered) { combined.set(c, off); off += c.byteLength; }
          store.set(mp!.key, { body: combined, httpMetadata: mp!.httpMetadata });
          multiparts.delete(uploadId);
          return { key: mp!.key, size };
        },
        async abort() { multiparts.delete(uploadId); },
      };
    },
    _store: store,
    _multiparts: multiparts,
  };
}

function fakeDB() {
  const users = new Map<string, any>();
  const sessions = new Map<string, any>();
  const userMfa = new Map<string, any>();
  const userFlags = new Set<string>();
  const media = new Map<string, any>();
  const courseTeachers = new Set<string>(); // `${userId}|${courseId}`
  const teacherProfiles = new Map<string, any>();
  const assignments = new Map<string, any>();

  function handleFirst(sql: string, b: any[]) {
    if (sql.includes("FROM sessions s JOIN users u")) {
      const [sid, now] = b;
      const s = sessions.get(sid);
      if (!s || s.expires_at <= now) return null;
      const u = users.get(s.user_id);
      return u ? { id: u.id, email: u.email, name: u.name, role: u.role, mfa_ok: s.mfa_ok } : null;
    }
    if (sql.includes("SELECT enabled_at FROM user_mfa")) {
      const row = userMfa.get(b[0]);
      return row ? { enabled_at: row.enabled_at } : null;
    }
    if (sql.includes("SELECT 1 FROM user_flags")) return userFlags.has(`${b[0]}|${b[1]}`) ? { x: 1 } : null;
    if (sql.includes("SUM(size) AS total FROM media_objects WHERE owner_id")) {
      let total = 0;
      for (const m of media.values()) if (m.owner_id === b[0] && m.status !== "rejected") total += m.size;
      return { total };
    }
    if (sql.includes("SELECT owner_id FROM media_objects WHERE key=? AND upload_id=? AND status='pending'")) {
      const m = media.get(b[0]);
      return (m && m.upload_id === b[1] && m.status === "pending") ? { owner_id: m.owner_id } : null;
    }
    if (sql.includes("SELECT owner_id, kind, context, status FROM media_objects WHERE key=?")) {
      const m = media.get(b[0]);
      return m ? { owner_id: m.owner_id, kind: m.kind, context: m.context, status: m.status } : null;
    }
    if (sql.includes("SELECT owner_id, kind, context, content_type, status FROM media_objects WHERE key=?")) {
      const m = media.get(b[0]);
      return m ? { owner_id: m.owner_id, kind: m.kind, context: m.context, content_type: m.content_type, status: m.status } : null;
    }
    if (sql.includes("SELECT 1 FROM course_teachers WHERE user_id")) return courseTeachers.has(`${b[0]}|${b[1]}`) ? { x: 1 } : null;
    if (sql.includes("SELECT 1 FROM enrollments WHERE user_id")) return null;
    if (sql.includes("SELECT course_id FROM assignments WHERE id")) {
      const a = assignments.get(b[0]);
      return a ? { course_id: a.course_id } : null;
    }
    return null;
  }
  function handleRun(sql: string, b: any[]) {
    if (sql.startsWith("CREATE TABLE")) return { success: true };
    if (sql.includes("INSERT INTO media_objects (key, owner_id, kind, context, size, content_type, status, rights, rights_note, created_at)")) {
      const [key, owner_id, kind, context, size, content_type, rights, rights_note, created_at] = b;
      media.set(key, { key, owner_id, kind, context, size, content_type, status: "uploaded", rights, rights_note, upload_id: null, created_at });
      return { success: true };
    }
    if (sql.includes("INSERT INTO media_objects (key, owner_id, kind, context, size, content_type, status, rights, rights_note, upload_id, created_at)")) {
      const [key, owner_id, context, size, content_type, rights, rights_note, upload_id, created_at] = b;
      media.set(key, { key, owner_id, kind: "video", context, size, content_type, status: "pending", rights, rights_note, upload_id, created_at });
      return { success: true };
    }
    if (sql.includes("UPDATE media_objects SET status='uploaded', size=?, upload_id=NULL")) {
      const [size, key] = b;
      const m = media.get(key);
      if (m) { m.status = "uploaded"; m.size = size; m.upload_id = null; }
      return { success: true };
    }
    if (sql.includes("DELETE FROM media_objects WHERE key=?")) { media.delete(b[0]); return { success: true }; }
    if (sql.includes("UPDATE media_objects SET status='approved'")) {
      const [reviewed_by, reviewed_at, key] = b;
      const m = media.get(key);
      if (m) { m.status = "approved"; m.reviewed_by = reviewed_by; m.reviewed_at = reviewed_at; }
      return { success: true };
    }
    if (sql.includes("UPDATE teacher_profiles SET photo_key")) {
      const [photo_key, updated_at, user_id] = b;
      teacherProfiles.set(user_id, { ...(teacherProfiles.get(user_id) || {}), photo_key, updated_at });
      return { success: true };
    }
    return { success: true };
  }
  function handleAll(sql: string, b: any[]) {
    if (sql.includes("FROM media_objects mo JOIN users u ON u.id=mo.owner_id WHERE mo.status='uploaded'")) {
      return { results: [...media.values()].filter((m) => m.status === "uploaded").map((m) => ({ ...m, email: users.get(m.owner_id)?.email })) };
    }
    return { results: [] };
  }
  function prepare(sql: string) {
    let bound: any[] = [];
    const self = {
      bind(...args: any[]) { bound = args; return self; },
      async first() { return handleFirst(sql, bound); },
      async run() { return handleRun(sql, bound); },
      async all() { return handleAll(sql, bound); },
    };
    return self;
  }
  return { prepare, users, sessions, userMfa, userFlags, media, courseTeachers, teacherProfiles, assignments };
}

function makeEnv() { return { DB: fakeDB(), MEDIA: fakeR2(), ADMIN_EMAILS: "" }; }
function seedUser(env: any, { id, role = "teacher", mfaOk = 1 }: any) {
  env.DB.users.set(id, { id, email: id + "@example.com", name: id, role });
  env.DB.sessions.set("sid-" + id, { user_id: id, expires_at: Date.now() + 100000, mfa_ok: mfaOk });
}

const JPEG_MAGIC = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]);
const PDF_MAGIC = new Uint8Array([0x25, 0x50, 0x44, 0x46, 1, 2, 3, 4, 5]);
const NOT_A_JPEG = new Uint8Array([0, 0, 0, 0, 1, 2, 3]);

function uploadReq(id: string, { kind, context, contentType, body, url = "http://localhost/api/upload" }: any) {
  const r = req({ url, cookie: "sid-" + id, method: "POST" });
  const headers = new Headers(r.headers);
  headers.set("x-upload-kind", kind);
  if (context) headers.set("x-upload-context", context);
  headers.set("content-type", contentType);
  return new Request(r, { headers, body });
}

describe("POST /api/upload — single-shot", () => {
  let env: any;
  beforeEach(() => { env = makeEnv(); seedUser(env, { id: "t1", role: "teacher" }); seedUser(env, { id: "l1", role: "learner" }); });

  it("accepts a valid JPEG profile photo", async () => {
    const res = await uploadPost({ request: uploadReq("t1", { kind: "photo", context: "profile", contentType: "image/jpeg", body: JPEG_MAGIC }), env });
    expect(res.status).toBe(200);
    const { key } = await res.json();
    expect(key).toMatch(/^uploads\/t1\/profile\/.+\.jpg$/);
  });

  it("rejects a file whose bytes don't match the declared image type", async () => {
    const res = await uploadPost({ request: uploadReq("t1", { kind: "photo", context: "profile", contentType: "image/jpeg", body: NOT_A_JPEG }), env });
    expect(res.status).toBe(400);
  });

  it("rejects a photo over the 2 MB cap", async () => {
    const big = new Uint8Array(2 * 1024 * 1024 + 1);
    big.set(JPEG_MAGIC);
    const res = await uploadPost({ request: uploadReq("t1", { kind: "photo", context: "profile", contentType: "image/jpeg", body: big }), env });
    expect(res.status).toBe(413);
  });

  it("pdf requires a rights attestation", async () => {
    const r = uploadReq("t1", { kind: "pdf", context: "draft:x", contentType: "application/pdf", body: PDF_MAGIC });
    const res = await uploadPost({ request: r, env });
    expect(res.status).toBe(400);
  });

  it("pdf with a valid rights attestation succeeds", async () => {
    const r = uploadReq("t1", { kind: "pdf", context: "draft:x", contentType: "application/pdf", body: PDF_MAGIC });
    r.headers.set("x-upload-rights", "own");
    const res = await uploadPost({ request: r, env });
    expect(res.status).toBe(200);
  });

  it("a learner (no MFA) can upload an assignment submission — no MFA gate for students", async () => {
    const res = await uploadPost({ request: uploadReq("l1", { kind: "submission", context: "assignment:a1", contentType: "application/pdf", body: PDF_MAGIC }), env });
    expect(res.status).toBe(200);
  });

  it("a learner cannot upload a course photo/pdf (requireMfa gate is teacher|admin)", async () => {
    const res = await uploadPost({ request: uploadReq("l1", { kind: "photo", context: "profile", contentType: "image/jpeg", body: JPEG_MAGIC }), env });
    expect(res.status).toBe(403);
  });

  it("rejects once the owner's quota is exceeded", async () => {
    env.DB.media.set("uploads/l1/existing.pdf", { owner_id: "l1", size: 200 * 1024 * 1024 - 5, status: "uploaded" });
    const res = await uploadPost({ request: uploadReq("l1", { kind: "submission", context: "assignment:a1", contentType: "application/pdf", body: PDF_MAGIC }), env });
    expect(res.status).toBe(413);
  });
});

describe("multipart video flow (create -> part -> complete / abort)", () => {
  let env: any;
  beforeEach(() => { env = makeEnv(); seedUser(env, { id: "t1", role: "teacher" }); });

  it("creates, uploads two parts, and completes with the real combined size", async () => {
    const createRes = await createPost({
      request: req({ url: "http://localhost/api/upload/create", cookie: "sid-t1", body: { kind: "video", context: "draft:c1", contentType: "video/mp4", size: 12, rights: "own", rightsNote: "self-recorded lecture" } }),
      env,
    });
    expect(createRes.status).toBe(200);
    const { key, uploadId } = await createRes.json();

    const part1 = await partPut({ request: req({ url: `http://localhost/api/upload/part?key=${encodeURIComponent(key)}&uploadId=${uploadId}&partNumber=1`, cookie: "sid-t1", method: "PUT", body: "hello " }), env });
    expect(part1.status).toBe(200);
    const part2 = await partPut({ request: req({ url: `http://localhost/api/upload/part?key=${encodeURIComponent(key)}&uploadId=${uploadId}&partNumber=2`, cookie: "sid-t1", method: "PUT", body: "world!" }), env });
    expect(part2.status).toBe(200);

    const completeRes = await completePost({
      request: req({ url: "http://localhost/api/upload/complete", cookie: "sid-t1", body: { key, uploadId, parts: [{ partNumber: 1, etag: "e1" }, { partNumber: 2, etag: "e2" }] } }),
      env,
    });
    expect(completeRes.status).toBe(200);
    const body = await completeRes.json();
    expect(body.size).toBe(12); // "hello world!".length
    expect(env.DB.media.get(key).status).toBe("uploaded");
  });

  it("rejects a part upload for a key the caller doesn't own", async () => {
    seedUser(env, { id: "t2", role: "teacher" });
    const { key, uploadId } = await (await createPost({
      request: req({ url: "http://localhost/api/upload/create", cookie: "sid-t1", body: { kind: "video", context: "draft:c1", contentType: "video/mp4", size: 12, rights: "own" } }),
      env,
    })).json();
    const res = await partPut({ request: req({ url: `http://localhost/api/upload/part?key=${encodeURIComponent(key)}&uploadId=${uploadId}&partNumber=1`, cookie: "sid-t2", method: "PUT", body: "x" }), env });
    expect(res.status).toBe(403);
  });

  it("abort removes the registry row and the multipart upload", async () => {
    const { key, uploadId } = await (await createPost({
      request: req({ url: "http://localhost/api/upload/create", cookie: "sid-t1", body: { kind: "video", context: "draft:c1", contentType: "video/mp4", size: 12, rights: "own" } }),
      env,
    })).json();
    const res = await abortPost({ request: req({ url: "http://localhost/api/upload/abort", cookie: "sid-t1", body: { key, uploadId } }), env });
    expect(res.status).toBe(200);
    expect(env.DB.media.has(key)).toBe(false);
  });

  it("video over 1 GB is rejected at create time", async () => {
    const res = await createPost({
      request: req({ url: "http://localhost/api/upload/create", cookie: "sid-t1", body: { kind: "video", context: "draft:c1", contentType: "video/mp4", size: 2 * 1024 ** 3, rights: "own" } }),
      env,
    });
    expect(res.status).toBe(413);
  });
});

describe("GET /api/asset — access matrix", () => {
  let env: any;
  beforeEach(() => {
    env = makeEnv();
    seedUser(env, { id: "owner1", role: "teacher" });
    seedUser(env, { id: "stranger1", role: "learner" });
    seedUser(env, { id: "admin1", role: "admin" });
    env.DB.media.set("uploads/owner1/profile/x.jpg", { owner_id: "owner1", kind: "photo", context: "profile", status: "uploaded", size: 10, content_type: "image/jpeg" });
    env.MEDIA._store.set("uploads/owner1/profile/x.jpg", { body: new Uint8Array([1, 2, 3]), httpMetadata: { contentType: "image/jpeg" } });
  });

  it("signed-out request -> 401", async () => {
    const res = await assetGet({ request: req({ url: "http://localhost/api/asset?key=uploads/owner1/profile/x.jpg" }), env });
    expect(res.status).toBe(401);
  });

  it("owner can read their own upload", async () => {
    const res = await assetGet({ request: req({ url: "http://localhost/api/asset?key=uploads/owner1/profile/x.jpg", cookie: "sid-owner1" }), env });
    expect(res.status).toBe(200);
  });

  it("an unrelated stranger gets 403", async () => {
    const res = await assetGet({ request: req({ url: "http://localhost/api/asset?key=uploads/owner1/profile/x.jpg", cookie: "sid-stranger1" }), env });
    expect(res.status).toBe(403);
  });

  it("admin can read anything", async () => {
    const res = await assetGet({ request: req({ url: "http://localhost/api/asset?key=uploads/owner1/profile/x.jpg", cookie: "sid-admin1" }), env });
    expect(res.status).toBe(200);
  });

  it("unknown key -> 404", async () => {
    const res = await assetGet({ request: req({ url: "http://localhost/api/asset?key=uploads/nope/x.jpg", cookie: "sid-owner1" }), env });
    expect(res.status).toBe(404);
  });

  it("a course teacher can read a student's submission for their course; a classmate cannot", async () => {
    seedUser(env, { id: "student1", role: "learner" });
    seedUser(env, { id: "otherstudent", role: "learner" });
    seedUser(env, { id: "teacher2", role: "teacher" });
    env.DB.assignments.set("a1", { course_id: "course-x" });
    env.DB.courseTeachers.add("teacher2|course-x");
    env.DB.media.set("uploads/student1/assignment/sub.pdf", { owner_id: "student1", kind: "submission", context: "assignment:a1", status: "uploaded", size: 10, content_type: "application/pdf" });
    env.MEDIA._store.set("uploads/student1/assignment/sub.pdf", { body: new Uint8Array([1]), httpMetadata: {} });

    const teacherRes = await assetGet({ request: req({ url: "http://localhost/api/asset?key=uploads/student1/assignment/sub.pdf", cookie: "sid-teacher2" }), env });
    expect(teacherRes.status).toBe(200);

    const classmateRes = await assetGet({ request: req({ url: "http://localhost/api/asset?key=uploads/student1/assignment/sub.pdf", cookie: "sid-otherstudent" }), env });
    expect(classmateRes.status).toBe(403);
  });
});

describe("admin moderation", () => {
  let env: any;
  beforeEach(() => {
    env = makeEnv();
    seedUser(env, { id: "t1", role: "teacher" });
    seedUser(env, { id: "admin1", role: "admin", mfaOk: 1 });
    env.DB.userMfa.set("admin1", { enabled_at: Date.now() });
  });

  it("approving a profile photo copies it to media/teachers/<userId>.<ext> and sets photo_key", async () => {
    const key = "uploads/t1/profile/abc.jpg";
    env.DB.media.set(key, { owner_id: "t1", kind: "photo", context: "profile", status: "uploaded", size: 3, content_type: "image/jpeg" });
    env.MEDIA._store.set(key, { body: new Uint8Array([1, 2, 3]), httpMetadata: { contentType: "image/jpeg" } });

    const res = await adminUploadsPost({ request: req({ url: "http://localhost/api/admin/uploads", cookie: "sid-admin1", body: { key, action: "approve" } }), env });
    expect(res.status).toBe(200);
    expect(env.DB.media.get(key).status).toBe("approved");
    expect(env.MEDIA._store.has("media/teachers/t1.jpg")).toBe(true);
    expect(env.DB.teacherProfiles.get("t1").photo_key).toBe("media/teachers/t1.jpg");
  });

  it("rejecting deletes both the R2 object and the registry row", async () => {
    const key = "uploads/t1/draft/lecture.pdf";
    env.DB.media.set(key, { owner_id: "t1", kind: "pdf", context: "draft:x", status: "uploaded", size: 3, content_type: "application/pdf" });
    env.MEDIA._store.set(key, { body: new Uint8Array([1]), httpMetadata: {} });

    const res = await adminUploadsPost({ request: req({ url: "http://localhost/api/admin/uploads", cookie: "sid-admin1", body: { key, action: "reject" } }), env });
    expect(res.status).toBe(200);
    expect(env.DB.media.has(key)).toBe(false);
    expect(env.MEDIA._store.has(key)).toBe(false);
  });

  it("a non-admin cannot moderate", async () => {
    const res = await adminUploadsPost({ request: req({ url: "http://localhost/api/admin/uploads", cookie: "sid-t1", body: { key: "x", action: "approve" } }), env });
    expect(res.status).toBe(403);
  });
});
