// Build the Open Source Atlas dataset for the Institute — a browsable directory
// of ~12.5k AI / engineering repositories, each with a line on what a Sikh
// engineer could build with it, plus the Cloud Codes video shelf.
//
// A MAINTAINER dev tool — NOT part of `npm run build` (it fetches the network).
// Run it, review the diff, commit the generated JSON; `sync-institute.mjs` then
// copies src/data/institute/atlas/ -> public/data/institute/atlas/ at build.
//
//   node scripts/build-atlas.mjs              # refresh everything it can reach
//   node scripts/build-atlas.mjs --videos-only
//
// OUTPUT (src/data/institute/atlas/, served from Workers Assets after sync):
//   index.json      meta + the video shelf + chunk manifest   (small, always fetched)
//   chunk-NNN.json  250 repos each                            (fetched as you page)
//   search.json     compact [repo, description] pairs         (fetched on first search)
//
// SOURCES (credited on /institute/atlas and /institute/licenses):
//   repos  https://tom-doerr.github.io/repo_posts/   (Tom Dörr's curation)
//   videos https://www.youtube.com/@cloud-codes      (Cloud Codes)
//   build-lines  src/data/institute/atlas-src/uses.jsonl — written once by the
//                sikhi.io enrichment pass; MUST survive a refresh (a rebuild
//                without this merge silently strips 12.5k sentences off the page)
//
// Ported from redroyals/sikhi.io scripts/build-opensource.mjs.
import fs from 'node:fs';
import path from 'node:path';

const OUT_DIR = 'src/data/institute/atlas';
const SRC_DIR = 'src/data/institute/atlas-src';
const SEED = path.join(SRC_DIR, 'videos.seed.json');
const USES = path.join(SRC_DIR, 'uses.jsonl');
const INDEX_URL = 'https://tom-doerr.github.io/repo_posts/assets/search-index.json';
const CHANNEL_ID = 'UC0DZj1PNa_Fp0MU6uPSKv5w'; // Cloud Codes
const FEED_URL = `https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`;
const CHUNK_SIZE = 250;

const args = new Set(process.argv.slice(2));

async function getText(url, label) {
  try {
    const res = await fetch(url, { headers: { 'user-agent': 'sikhiuni-atlas-builder' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } catch (err) {
    console.warn(`  ! ${label} unreachable (${err.message})`);
    return null;
  }
}

/** Tom Dörr's index -> one record per unique repository. */
async function buildRepos() {
  const raw = await getText(INDEX_URL, 'repo index');
  if (!raw) return null;
  const entries = JSON.parse(raw);
  const byRepo = new Map();
  let unparsed = 0;
  for (const e of entries) {
    const m = /^\[([^/\]]+)\/([^\]]+)\]/.exec(e.title ?? '');
    if (!m) { unparsed++; continue; }
    const repo = `${m[1]}/${m[2]}`;
    const prev = byRepo.get(repo);
    if (prev && prev.d >= (e.d ?? '')) continue;
    byRepo.set(repo, { r: repo, s: (e.s ?? '').trim(), d: e.d ?? '', p: e.u ?? '' });
  }
  const repos = [...byRepo.values()].sort((a, b) => (b.d || '').localeCompare(a.d || ''));
  console.log(`  repos: ${repos.length} unique from ${entries.length} entries (${unparsed} unparsed)`);
  return repos;
}

/** Cloud Codes' Atom feed -> the informational shelf. */
async function buildVideos() {
  const xml = await getText(FEED_URL, 'youtube feed');
  const seeded = fs.existsSync(SEED) ? JSON.parse(fs.readFileSync(SEED, 'utf8')) : [];
  if (!xml) {
    console.log(`  videos: feed unreachable, using ${seeded.length} seeded`);
    return seeded;
  }
  const out = [];
  for (const block of xml.split('<entry>').slice(1)) {
    const pick = (re) => (re.exec(block) ?? [])[1];
    const id = pick(/<yt:videoId>([^<]+)</);
    if (!id) continue;
    out.push({
      id,
      title: (pick(/<title>([^<]*)</) ?? '').replace(/&amp;/g, '&').replace(/&#39;/g, "'").trim(),
      published: (pick(/<published>([^<]+)</) ?? '').slice(0, 10),
      views: Number(pick(/views="(\d+)"/) ?? 0) || undefined,
    });
  }
  const merged = new Map(seeded.map((v) => [v.id, v]));
  for (const v of out) merged.set(v.id, { ...merged.get(v.id), ...v });
  const videos = [...merged.values()].sort((a, b) => (b.published || '').localeCompare(a.published || ''));
  console.log(`  videos: ${out.length} from feed, ${videos.length} total after merging the seed`);
  return videos;
}

const repos = args.has('--videos-only') ? null : await buildRepos();
const videos = await buildVideos();

fs.mkdirSync(OUT_DIR, { recursive: true });

if (repos) {
  if (fs.existsSync(USES)) {
    const uses = new Map();
    for (const line of fs.readFileSync(USES, 'utf8').split('\n')) {
      if (!line.trim()) continue;
      try { const o = JSON.parse(line); if (o.r && o.u) uses.set(o.r, o.u); } catch { /* ignore */ }
    }
    let filled = 0;
    for (const r of repos) { const u = uses.get(r.r); if (u) { r.u = u; filled++; } }
    console.log(`  build-lines: ${filled}/${repos.length} repos carry one`);
  }

  for (const f of fs.readdirSync(OUT_DIR)) {
    if (/^chunk-\d+\.json$/.test(f)) fs.unlinkSync(path.join(OUT_DIR, f));
  }
  const chunkCount = Math.ceil(repos.length / CHUNK_SIZE);
  for (let i = 0; i < chunkCount; i++) {
    fs.writeFileSync(
      path.join(OUT_DIR, `chunk-${String(i).padStart(3, '0')}.json`),
      JSON.stringify(repos.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE)),
    );
  }
  fs.writeFileSync(path.join(OUT_DIR, 'search.json'), JSON.stringify(repos.map((x) => [x.r, x.s])));
  console.log(`  wrote ${chunkCount} chunks of ${CHUNK_SIZE}`);
}

const indexPath = path.join(OUT_DIR, 'index.json');
const existing = fs.existsSync(indexPath) ? JSON.parse(fs.readFileSync(indexPath, 'utf8')) : {};
const index = {
  generated: new Date().toISOString().slice(0, 10),
  chunkSize: CHUNK_SIZE,
  total: repos ? repos.length : existing.total ?? 0,
  chunks: repos ? Math.ceil(repos.length / CHUNK_SIZE) : existing.chunks ?? 0,
  newest: repos ? repos[0]?.d : existing.newest,
  sources: {
    repos: { name: 'Tom Dörr — repo_posts', url: 'https://tom-doerr.github.io/repo_posts/' },
    videos: { name: 'Cloud Codes', url: 'https://www.youtube.com/@cloud-codes', channelId: CHANNEL_ID },
  },
  videos,
};
fs.writeFileSync(indexPath, JSON.stringify(index, null, 2) + '\n');
console.log(`  wrote ${indexPath} (${index.total} repos, ${videos.length} videos)`);
