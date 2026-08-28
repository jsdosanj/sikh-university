// Markdown -> lesson HTML for the AISF import pipeline (scripts/sync-aisf.mjs).
// The input is the published "AI Engineering from Scratch" curriculum (MIT), not
// user content — but we still scrub defensively.
//
//   ```mermaid        -> <pre class="mermaid"> (rendered client-side, lazily,
//                        from jsDelivr — the /institute/* CSP allows it)
//   ```figure NAME    -> a "see the interactive diagram in the source" note
//   ```lang           -> <pre><code class="language-lang"> (Prism-ready)
//   everything else   -> marked, GFM on
import { marked } from 'marked';

/** Split the lesson doc into { title, tagline, meta, objectives, bodyMd }. */
export function parseLessonDoc(md) {
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  let i = 0;
  let title = '';
  while (i < lines.length && !title) {
    const m = lines[i].match(/^#\s+(.+?)\s*$/);
    if (m) title = m[1];
    i++;
  }
  let tagline = '';
  // an optional "> ..." blockquote right after the title
  while (i < lines.length && lines[i].trim() === '') i++;
  if (lines[i] && /^>\s?/.test(lines[i])) {
    tagline = lines[i].replace(/^>\s?/, '').trim();
    i++;
  }

  // the "**Type:** … **Languages:** … **Prerequisites:** … **Time:** …" block
  const meta = {};
  while (i < lines.length) {
    const t = lines[i].trim();
    if (t === '') { i++; continue; }
    const m = t.match(/^\*\*(Type|Languages|Prerequisites|Time)\:\*\*\s*(.+?)\s*$/);
    if (!m) break;
    meta[m[1].toLowerCase()] = m[2];
    i++;
  }

  // ## Learning Objectives  -> the "- " list that follows
  const objectives = [];
  const objIdx = lines.findIndex((l, k) => k >= i && /^##\s+Learning Objectives\s*$/i.test(l));
  let bodyStart = i;
  if (objIdx !== -1) {
    let k = objIdx + 1;
    while (k < lines.length && lines[k].trim() === '') k++;
    while (k < lines.length && /^\s*[-*]\s+/.test(lines[k])) {
      objectives.push(lines[k].replace(/^\s*[-*]\s+/, '').trim());
      k++;
    }
    bodyStart = k;
  }

  const bodyMd = lines.slice(bodyStart).join('\n').trim();
  return { title, tagline, meta, objectives, bodyMd };
}

/** Convert a lesson body (markdown) to sanitized HTML. */
export function bodyToHtml(bodyMd) {
  const figures = [];

  const renderer = new marked.Renderer();
  renderer.code = ({ text, lang }) => {
    const l = (lang || '').trim().toLowerCase();
    if (l === 'mermaid') {
      // mermaid wants <br/> not literal \n inside node labels
      const src = text.replace(/\\n/g, '<br/>');
      return `<pre class="mermaid">${escapeHtml(src)}</pre>\n`;
    }
    if (l === 'figure') {
      const name = text.trim().split('\n')[0];
      figures.push(name);
      return `<p class="i-lesson-figure"><em>Diagram <code>${escapeHtml(name)}</code> — see the interactive version in the <a href="https://aiengineeringfromscratch.com">source lesson</a>.</em></p>\n`;
    }
    const cls = l ? ` class="language-${l}"` : '';
    return `<pre><code${cls}>${escapeHtml(text)}\n</code></pre>\n`;
  };

  marked.use({ gfm: true, breaks: false });
  let html = marked.parse(bodyMd, { renderer });
  html = scrub(html);
  return { html, figures, hasMermaid: /class="mermaid"/.test(html) };
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/** Defensive scrub: drop anything scriptable that survived marked. */
function scrub(html) {
  return html
    .replace(/<script\b[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[\s\S]*?<\/style>/gi, '')
    .replace(/<(iframe|object|embed|link|meta|base)\b[^>]*>/gi, '')
    .replace(/\son\w+\s*=\s*"[^"]*"/gi, '')
    .replace(/\son\w+\s*=\s*'[^']*'/gi, '')
    .replace(/\son\w+\s*=\s*[^\s>]+/gi, '')
    .replace(/(href|src)\s*=\s*"(?:\s*javascript:|\s*data:(?!image\/))/gi, '$1="#')
    .replace(/(href|src)\s*=\s*'(?:\s*javascript:|\s*data:(?!image\/))/gi, "$1='#");
}
