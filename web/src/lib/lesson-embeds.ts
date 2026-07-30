// Expands a [[youtube:VIDEO_ID]] placeholder token into a youtube-nocookie
// embed, at RENDER time only — never at storage time. This deliberately does
// NOT touch functions/api/_sanitize-html.js (a from-scratch, adversarially
// tested security boundary): the sanitizer never needs to know about iframes
// at all, because the placeholder is just inert bracket-text that survives
// sanitization unchanged (it isn't a tag). A YouTube video id is always
// exactly 11 chars from [A-Za-z0-9_-], so the regex capture group itself is
// the validation — nothing else can smuggle a quote or an angle bracket in.
const TOKEN_RE = /\[\[youtube:([A-Za-z0-9_-]{11})\]\]/g;

export function expandYoutubeEmbeds(html: string): string {
  return html.replace(TOKEN_RE, (_match, id: string) =>
    `<div class="aspect-video my-4"><iframe class="h-full w-full rounded-xl2" ` +
    `src="https://www.youtube-nocookie.com/embed/${id}" title="YouTube video" ` +
    `allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" ` +
    `allowfullscreen loading="lazy"></iframe></div>`
  );
}

// Extracts an 11-char YouTube video id from a pasted URL or bare id. Returns
// null if it doesn't look like one — callers should show an error, not guess.
export function extractYoutubeId(input: string): string | null {
  const trimmed = input.trim();
  if (/^[A-Za-z0-9_-]{11}$/.test(trimmed)) return trimmed;
  const m = trimmed.match(/(?:youtube(?:-nocookie)?\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}
