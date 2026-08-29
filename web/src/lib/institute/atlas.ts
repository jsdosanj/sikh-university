// The Open Source Atlas island (/technology/atlas). Client-only on purpose —
// 12.5k repos is far too much for one payload, so it pages through committed
// chunk-NNN.json files and pulls the search index only once someone types.
//
// Ported from redroyals/sikhi.io pages/opensource.tsx to a vanilla-TS island.
// Two halves, deliberately unpaired: the Cloud Codes video shelf (what to
// watch) and the repo catalogue (what to build with — every card carries a
// line on what it could do for the Panth).

const DATA = '/data/institute/atlas';
const PAGE_SIZE = 24;
const PER_CHUNK = 250;
const MAX_RESULTS = 120;

interface Repo { r: string; s?: string; d?: string; p?: string; u?: string }
interface Video { id: string; title: string; published?: string; views?: number }
interface Index {
  generated: string;
  total: number;
  chunks: number;
  newest?: string;
  videos: Video[];
  sources: Record<string, { name: string; url: string }>;
}

const esc = (s: unknown): string =>
  String(s ?? '').replace(/[&<>"]/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] as string);

const ogCard = (repo: string) => `https://opengraph.githubassets.com/1/${repo}`;
const ytThumb = (id: string) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
const nfmt = (n: number) => n.toLocaleString('en-US');

export function initAtlas(): void {
  const root = document.getElementById('i-atlas');
  if (!root) return;

  const elVideos = root.querySelector<HTMLElement>('#i-atlas-videos')!;
  const elGrid = root.querySelector<HTMLElement>('#i-atlas-grid')!;
  const elCount = root.querySelector<HTMLElement>('#i-atlas-count')!;
  const elPager = root.querySelector<HTMLElement>('#i-atlas-pager')!;
  const elSearch = root.querySelector<HTMLInputElement>('#i-atlas-search')!;
  const elMeta = root.querySelector<HTMLElement>('#i-atlas-meta')!;

  let index: Index | null = null;
  let page = 0;
  let query = '';
  let searchIndex: Array<[string, string]> | null = null;
  const chunkCache = new Map<number, Repo[]>();

  const repoCard = (repo: Repo): string => {
    const href = `https://github.com/${esc(repo.r)}`;
    const write = repo.p
      ? `<a href="https://tom-doerr.github.io/repo_posts${esc(repo.p)}" target="_blank" rel="noopener">write-up &nearr;</a>`
      : '';
    return (
      `<article class="i-atlas-card">` +
        `<a class="i-atlas-shot" href="${href}" target="_blank" rel="noopener">` +
          `<img loading="lazy" alt="" src="${esc(ogCard(repo.r))}" />` +
          `<span class="i-atlas-shot-fallback"><span class="i-mono">${esc(repo.r)}</span><span>on GitHub</span></span>` +
        `</a>` +
        `<div class="i-atlas-card-body">` +
          `<h3 class="i-mono"><a href="${href}" target="_blank" rel="noopener">${esc(repo.r)}</a></h3>` +
          (repo.s ? `<p class="i-atlas-desc">${esc(repo.s)}</p>` : '') +
          (repo.u ? `<p class="i-atlas-use">${esc(repo.u)}</p>` : '<span class="i-atlas-spacer"></span>') +
          `<div class="i-atlas-card-foot i-mono">` +
            `<a href="${href}" target="_blank" rel="noopener">GitHub &nearr;</a>` +
            write +
            (repo.d ? `<span class="i-atlas-date">${esc(repo.d)}</span>` : '') +
          `</div>` +
        `</div>` +
      `</article>`
    );
  };

  const renderVideos = () => {
    const vids = index?.videos ?? [];
    if (!vids.length) { elVideos.innerHTML = '<p class="i-atlas-empty i-mono">video shelf unavailable</p>'; return; }
    elVideos.innerHTML = vids.map((v) => (
      `<article class="i-atlas-vid" data-vid="${esc(v.id)}">` +
        `<button type="button" class="i-atlas-vid-play" aria-label="Play ${esc(v.title)}">` +
          `<img loading="lazy" alt="" src="${esc(ytThumb(v.id))}" />` +
          `<span class="i-atlas-vid-tri" aria-hidden="true">&#9654;</span>` +
        `</button>` +
        `<div class="i-atlas-vid-meta">` +
          `<h3>${esc(v.title)}</h3>` +
          `<p class="i-mono">${esc(v.published ?? '')}${v.views ? ` &middot; ${nfmt(v.views)} views` : ''}</p>` +
        `</div>` +
      `</article>`
    )).join('');
    elVideos.querySelectorAll<HTMLButtonElement>('.i-atlas-vid-play').forEach((btn) => {
      btn.addEventListener('click', () => {
        const card = btn.closest<HTMLElement>('.i-atlas-vid')!;
        const id = card.dataset.vid!;
        const frame = document.createElement('iframe');
        frame.src = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&modestbranding=1`;
        frame.title = card.querySelector('h3')?.textContent ?? 'video';
        frame.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture';
        frame.allowFullscreen = true;
        frame.loading = 'lazy';
        btn.replaceWith(frame);
      });
    });
  };

  const results = (): Repo[] | null => {
    const q = query.trim().toLowerCase();
    if (!q || !searchIndex) return null;
    const hits: Repo[] = [];
    for (const [r, s] of searchIndex) {
      if (r.toLowerCase().includes(q) || (s || '').toLowerCase().includes(q)) {
        hits.push({ r, s });
        if (hits.length >= MAX_RESULTS) break;
      }
    }
    return hits;
  };

  const renderGrid = async () => {
    if (!index) return;
    const found = results();
    let rows: Repo[];
    if (found) {
      rows = found;
      elPager.hidden = true;
      elCount.textContent = `${found.length}${found.length >= MAX_RESULTS ? '+' : ''} matches`;
    } else {
      const chunk = Math.floor((page * PAGE_SIZE) / PER_CHUNK);
      const offset = (page * PAGE_SIZE) % PER_CHUNK;
      let all = chunkCache.get(chunk);
      if (!all) {
        elGrid.innerHTML = '<p class="i-atlas-empty i-mono">loading&hellip;</p>';
        try {
          const r = await fetch(`${DATA}/chunk-${String(chunk).padStart(3, '0')}.json`);
          all = r.ok ? await r.json() : [];
        } catch { all = []; }
        chunkCache.set(chunk, all!);
      }
      rows = all!.slice(offset, offset + PAGE_SIZE);
      const from = page * PAGE_SIZE + 1;
      const to = Math.min((page + 1) * PAGE_SIZE, index.total);
      elCount.textContent = `${nfmt(from)}–${nfmt(to)} of ${nfmt(index.total)}`;
      const totalPages = Math.ceil(index.total / PAGE_SIZE);
      elPager.hidden = totalPages <= 1;
      (elPager.querySelector('[data-atlas-prev]') as HTMLButtonElement).disabled = page === 0;
      (elPager.querySelector('[data-atlas-next]') as HTMLButtonElement).disabled = page >= totalPages - 1;
      (elPager.querySelector('[data-atlas-pos]') as HTMLElement).textContent = `${nfmt(page + 1)} / ${nfmt(totalPages)}`;
    }
    elGrid.innerHTML = rows.length
      ? rows.map(repoCard).join('')
      : `<p class="i-atlas-empty i-mono">${query ? 'nothing matches that' : 'catalogue unavailable'}</p>`;
    // A catalogue this old has renamed / deleted repos whose OG card 404s —
    // swap the broken tile for a typeset nameplate so the row keeps its rhythm.
    // (CSP forbids inline onerror, so this is wired here.)
    elGrid.querySelectorAll<HTMLImageElement>('.i-atlas-shot img').forEach((img) => {
      img.addEventListener('error', () => {
        img.closest('.i-atlas-shot')?.classList.add('dead');
        img.remove();
      });
    });
  };

  const ensureSearch = () => {
    if (searchIndex) return;
    searchIndex = [];
    fetch(`${DATA}/search.json`).then((r) => (r.ok ? r.json() : [])).then((d) => { searchIndex = d; renderGrid(); }).catch(() => {});
  };

  elSearch.addEventListener('focus', ensureSearch);
  let deb = 0;
  elSearch.addEventListener('input', () => {
    ensureSearch();
    query = elSearch.value;
    clearTimeout(deb);
    deb = window.setTimeout(renderGrid, 120);
  });
  elPager.querySelector('[data-atlas-prev]')!.addEventListener('click', () => { page = Math.max(0, page - 1); scrollTo({ top: 0 }); renderGrid(); });
  elPager.querySelector('[data-atlas-next]')!.addEventListener('click', () => { page += 1; scrollTo({ top: 0 }); renderGrid(); });

  fetch(`${DATA}/index.json`)
    .then((r) => (r.ok ? r.json() : Promise.reject()))
    .then((j: Index) => {
      index = j;
      elMeta.textContent = `${nfmt(j.total)} repositories · ${j.videos.length} videos · synced ${j.generated}`;
      renderVideos();
      renderGrid();
    })
    .catch(() => { elGrid.innerHTML = '<p class="i-atlas-empty i-mono">the atlas is unavailable right now</p>'; });
}
