// Server-side HTML sanitizer for teacher-authored lesson HTML (course authoring studio).
//
// WHY THIS EXISTS: course pages render `lesson.html` through Astro's `set:html`
// (raw injection, no escaping). Anything a teacher stores runs in every visitor's
// browser. A hostile teacher account, a stolen session, or a bug in the client
// editor must not be able to plant a <script> or an onerror= handler. This runs
// on the write path (store the sanitized string, never the raw one) so the render
// path stays a dumb, fast injection.
//
// WHY HAND-WRITTEN: this executes in the Cloudflare Workers V8 isolate. There is
// no DOM — no document, no DOMParser, no innerHTML — and the Worker runtime is
// dependency-free by project policy, so DOMPurify/jsdom/linkedom are all out.
// What follows is a small regex-driven state machine over tag boundaries.
//
// DESIGN STANCE: allowlist everything (tags, attributes, attribute VALUES, URL
// schemes). Anything not explicitly permitted is dropped. When an input is
// ambiguous or malformed we drop rather than guess — a lost <b> is a bug report,
// a surviving <script> is an incident.
//
// ---------------------------------------------------------------------------
// ALLOWLIST DECISIONS (deviations from the plan's literal line are argued here)
// ---------------------------------------------------------------------------
//
// * `span` is ADDED to the plan's list. The plan said `class="gur"` must be
//   preserved, but did not list a tag that carries it. The existing corpus
//   settles it: site/assets/data/courses.json contains ~23,900 `<span class="gur">`
//   wrappers (plus `class="gur"` on ~1,800 <p> and ~1,400 <blockquote>), and
//   web/src/pages/*.astro marks Gurmukhi the same way (`<span class="gur" lang="pa">`).
//   Without `span` the class="gur" rule would be dead code and every Gurmukhi
//   citation in a teacher's lesson would lose its typeface. `span` carries no
//   behaviour of its own; with attributes restricted to class="gur"/lang="pa"
//   its attack surface is nil.
//
// * `br` is ADDED. courses.json uses `<br>` 1,660 times, so it is the codebase's
//   actual line-break convention. It is void, takes no allowed attributes, and
//   has no scriptable surface.
//
// * `hr` is NOT added. Zero occurrences in the corpus; nothing asked for it.
//   Adding tags "just in case" widens a security boundary for free — it stays out.
//
// * `class` is accepted ONLY when the value is exactly `gur`, and `lang` ONLY
//   when it is exactly `pa`, on any allowed tag. Every other class value is
//   dropped (the tag survives). That means a teacher pasting Tailwind utility
//   classes, or the `class="cite"` spans that exist in the legacy corpus, keeps
//   the element and loses the styling. Deliberate: an open `class` attribute
//   lets an author repaint or hide arbitrary parts of the surrounding page.
//
// * UNSAFE href: the `<a>` element is KEPT and only the href attribute is
//   dropped. Chosen over stripping the tag because it is genuinely simpler to
//   implement correctly — unwrapping the element would require remembering, for
//   each open <a>, that its matching `</a>` must also be suppressed, i.e. a
//   second parallel stack. Dropping one attribute is a local decision with no
//   state. It is also the less destructive outcome: the citation's visible text
//   survives, and an <a> with no href is inert (no navigation, no target).
//
// * Disallowed tags are handled two ways:
//     - UNWRAPPED (tag deleted, inner content kept and sanitized) for anything
//       that plausibly wraps prose: div, form, button, b, i, code, section...
//       This satisfies "surrounding safe text must survive intact". Void
//       elements like <img>/<input> simply vanish — there is nothing to unwrap.
//     - DROPPED WITH THEIR CONTENTS for elements whose children are not prose:
//       script, style, svg, math, template, iframe, object, ... Leaving
//       `alert(1)` behind as escaped text would be inert but is visible garbage,
//       and CSS text is an exfiltration vector in its own right.
//
// * We do NOT implement HTML's implied-end-tag rules (`<p>a<p>b` stays nested).
//   That is a rendering nicety, not a security property, and the browser fixes
//   it on parse. Out of scope.

/** Tags a lesson may use. See the decision block above for span/br/hr. */
const ALLOWED_TAGS = new Set([
  "p", "h2", "h3", "h4", "ul", "ol", "li", "strong", "em", "blockquote", "a",
  "table", "thead", "tbody", "tr", "th", "td",
  "span", "br",
]);

/** Allowed tags that take no closing tag. */
const VOID_TAGS = new Set(["br"]);

// Elements whose content the HTML parser treats as raw text rather than markup.
// We jump straight to the matching close tag and throw the whole span away.
// NOTE: every name here MUST be a container. Putting a void element (embed,
// frame, input, img) in a drop set would swallow the rest of the document
// hunting for a close tag that can never exist.
const RAWTEXT_DROP = new Set([
  "script", "style", "textarea", "title", "xmp", "plaintext",
  "iframe", "noscript", "noembed", "noframes",
]);

// Elements dropped together with their subtree, but whose children still parse
// as markup — so we depth-count to find the right close tag. `svg` covers the
// <svg><foreignObject><script> vector; `math` covers the maction/xlink vectors.
const SUBTREE_DROP = new Set([
  "svg", "math", "template", "object", "applet", "frameset",
]);

const WS = " \t\n\r\f";

/**
 * Escape a run of text content.
 *
 * `&` is only escaped when it does NOT already begin a well-formed entity, so
 * `&amp;`, `&lt;`, `&#2581;` and friends round-trip unchanged instead of
 * double-encoding into `&amp;amp;`. Non-ASCII (Gurmukhi, Devanagari, anything
 * else) is never touched — the string stays valid UTF-8 throughout.
 */
function escapeText(s) {
  return s
    .replace(/&(?![a-zA-Z][a-zA-Z0-9]{0,31};|#[0-9]{1,7};|#[xX][0-9a-fA-F]{1,6};)/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Escape for use inside a double-quoted attribute value. */
function escapeAttr(s) {
  return escapeText(s).replace(/"/g, "&quot;");
}

/** The handful of named character references worth resolving in a URL check. */
const NAMED_REFS = {
  quot: '"', apos: "'", lt: "<", gt: ">", amp: "&", grave: "`", sol: "/",
  bsol: "\\", colon: ":", tab: "\t", newline: "\n", nbsp: " ", sp: " ",
};

/**
 * Resolve character references exactly once, the way an HTML attribute value is
 * decoded. One pass, never recursive: a browser turns `&amp;#x22;` into the
 * literal text `&#x22;`, not into a quote, and so do we.
 */
function decodeRefsOnce(s) {
  return s.replace(/&(#[0-9]{1,7}|#[xX][0-9a-fA-F]{1,6}|[a-zA-Z][a-zA-Z0-9]{1,31});/g, (m, body) => {
    if (body[0] === "#") {
      const code =
        body[1] === "x" || body[1] === "X"
          ? parseInt(body.slice(2), 16)
          : parseInt(body.slice(1), 10);
      if (!Number.isFinite(code) || code < 0 || code > 0x10ffff) return m;
      try {
        return String.fromCodePoint(code);
      } catch {
        return m;
      }
    }
    const named = NAMED_REFS[body.toLowerCase()];
    return named === undefined ? m : named;
  });
}

/**
 * Validate an href. Returns the (escaped) value to emit, or null to drop it.
 *
 * The scheme check is a positive prefix match on `https://`, which is what makes
 * this robust: `javascript:`, `data:`, `http:`, `mailto:`, protocol-relative
 * `//host`, relative paths and entity-obfuscated schemes (`&#106;avascript:`)
 * all simply fail to start with `https://` and are dropped. There is no
 * blocklist to out-think.
 *
 * We additionally reject any URL containing whitespace, quotes, backticks,
 * angle brackets or backslashes. Those are not legal in a URL anyway, and
 * refusing them kills the class of attacks that hides a second attribute inside
 * a first one, e.g. `<a href='https://x" onclick="evil()'>`, before escaping
 * has to save us.
 *
 * The checks run against the ENTITY-DECODED value so that `&#x22;`/`&quot;` are
 * judged as the quote characters they are. Strictly speaking this is belt and
 * braces — the HTML tokenizer determines attribute boundaries before it decodes
 * character references, so an encoded quote can never open a new attribute —
 * but the value is stored and could later pass through some other decoder, and
 * an encoded quote inside a citation URL has no legitimate use. When in doubt,
 * strip. The ORIGINAL (escaped) text is what gets emitted, so a legitimate
 * `&amp;` in a query string still round-trips untouched.
 */
function safeHref(value) {
  const raw = value.trim();
  const decoded = decodeRefsOnce(raw);
  for (const v of [raw, decoded]) {
    if (!/^https:\/\//i.test(v)) return null;
    if (/[\s"'`<>\\]/.test(v)) return null;
    // Defence in depth: a nested scheme has no business in a lesson citation.
    // Slightly over-strict (it would reject https://example.com/data:x) and that
    // is the trade we want on a security boundary.
    if (/javascript:|data:|vbscript:/i.test(v)) return null;
  }
  return escapeAttr(raw);
}

/**
 * Filter one tag's parsed attributes down to the allowlist.
 * Returns a string ready to splice into the output tag.
 */
function filterAttrs(tagName, attrs) {
  let out = "";
  let seenHref = false;
  let seenClass = false;
  let seenLang = false;

  for (const attr of attrs) {
    const name = attr.name.toLowerCase();

    // Event handlers first and unconditionally, on every tag, allowed or not.
    // (Redundant with the allowlist below, but this is the single rule a future
    // editor is most likely to reach for, so it is stated explicitly.)
    if (name.startsWith("on")) continue;

    if (name === "class") {
      // Exactly "gur" (after trimming). Any other class list is dropped.
      if (!seenClass && attr.value.trim() === "gur") {
        out += ' class="gur"';
        seenClass = true;
      }
      continue;
    }

    if (name === "lang") {
      if (!seenLang && attr.value.trim().toLowerCase() === "pa") {
        out += ' lang="pa"';
        seenLang = true;
      }
      continue;
    }

    if (name === "href" && tagName === "a") {
      if (seenHref) continue;
      const href = safeHref(attr.value);
      // Unsafe href => attribute dropped, <a> kept (see decision block).
      if (href !== null) {
        out += ` href="${href}"`;
        seenHref = true;
      }
      continue;
    }

    // Everything else — style, src, id, target, srcset, formaction, xlink:href,
    // data-*, anything a future spec adds — is dropped.
  }

  return out;
}

/**
 * Parse a tag starting at `html[i] === '<'`.
 *
 * Returns null when this `<` does not begin a tag (so the caller emits a literal
 * `&lt;`), or when the tag is truncated / has an unterminated quoted value. A
 * truncated tag means the rest of the input is unparseable, so the caller drops
 * everything from here on — refusing to guess is what stops smuggling through
 * `<a href="...` style truncation.
 */
function parseTag(html, i) {
  const len = html.length;
  let j = i + 1;
  let isEnd = false;

  if (html[j] === "/") {
    isEnd = true;
    j++;
  }

  const nameMatch = /^[a-zA-Z][a-zA-Z0-9-]*/.exec(html.slice(j, j + 64));
  if (!nameMatch) return null;
  const name = nameMatch[0].toLowerCase();
  j += nameMatch[0].length;

  const attrs = [];
  let selfClosing = false;

  while (j < len) {
    // Skip whitespace between attributes.
    while (j < len && WS.includes(html[j])) j++;
    if (j >= len) return null; // truncated tag

    const c = html[j];
    if (c === ">") {
      return { name, isEnd, attrs, selfClosing, end: j + 1 };
    }
    if (c === "/") {
      // `/` is only meaningful immediately before `>`; anywhere else the HTML
      // parser treats it as an attribute-name separator (`<script/xss src=1>`).
      if (html[j + 1] === ">") {
        return { name, isEnd, attrs, selfClosing: true, end: j + 2 };
      }
      j++;
      continue;
    }
    if (c === "=") {
      // Stray `=` with no attribute name before it; skip it.
      j++;
      continue;
    }

    // Attribute name: runs until whitespace, `/`, `>` or `=`.
    let nStart = j;
    while (j < len && !WS.includes(html[j]) && html[j] !== "/" && html[j] !== ">" && html[j] !== "=") j++;
    const attrName = html.slice(nStart, j);

    // Optional whitespace, then `=`, then optional whitespace, then the value.
    let k = j;
    while (k < len && WS.includes(html[k])) k++;
    if (html[k] !== "=") {
      attrs.push({ name: attrName, value: "" });
      continue;
    }
    k++;
    while (k < len && WS.includes(html[k])) k++;

    const q = html[k];
    if (q === '"' || q === "'") {
      const close = html.indexOf(q, k + 1);
      if (close === -1) return null; // unterminated quote => unparseable rest
      attrs.push({ name: attrName, value: html.slice(k + 1, close) });
      j = close + 1;
    } else {
      let vStart = k;
      while (k < len && !WS.includes(html[k]) && html[k] !== ">") k++;
      attrs.push({ name: attrName, value: html.slice(vStart, k) });
      j = k;
    }
    selfClosing = false;
  }

  return null; // ran off the end without a `>`
}

/**
 * Index just past the close tag of a raw-text element (`</script>`), or -1 if
 * it never closes — in which case the caller drops the remainder of the input.
 */
function skipRawText(html, from, name) {
  const re = new RegExp(`</${name}[\\s/>]`, "i");
  const rest = html.slice(from);
  const m = re.exec(rest);
  if (!m) return -1;
  const gt = html.indexOf(">", from + m.index);
  return gt === -1 ? -1 : gt + 1;
}

/**
 * Sanitize teacher-authored lesson HTML.
 *
 * Returns a string that is safe to store and later render via `set:html`:
 * only allowlisted tags survive, only allowlisted attributes with allowlisted
 * values survive, every text run is escaped, and the tag structure is balanced.
 * Never throws — any input, however malformed, yields a (possibly empty) string.
 *
 * @param {string} html raw, untrusted HTML
 * @returns {string} sanitized HTML
 */
export function sanitizeLessonHtml(html) {
  if (typeof html !== "string" || html === "") return "";

  // NUL is a classic filter-evasion trick (`<scr\0ipt>`): some parsers have
  // historically ignored it while naive filters do not. Remove it up front so
  // the tokenizer below sees exactly what a browser would.
  const src = html.replace(/\u0000/g, "");
  const len = src.length;

  let out = "";
  // Open allowed elements, innermost last. Used to balance the output: we only
  // emit a close tag that matches something actually open, and we close what is
  // left at EOF. Without this an unclosed <blockquote> from a lesson would
  // swallow the rest of the page it is injected into.
  const stack = [];
  // While set, we are inside a dropped subtree and emit nothing.
  let dropName = null;
  let dropDepth = 0;

  let i = 0;
  let textStart = 0;

  const flushText = (upTo) => {
    if (dropName === null && upTo > textStart) {
      out += escapeText(src.slice(textStart, upTo));
    }
  };

  while (i < len) {
    const lt = src.indexOf("<", i);
    if (lt === -1) break;

    flushText(lt);

    const next = src[lt + 1];

    // --- comments, doctypes, processing instructions: stripped outright ------
    if (next === "!" || next === "?") {
      if (src.startsWith("<!--", lt)) {
        // `<!-->` and `<!--->` are complete (empty) comments per HTML5.
        let end;
        if (src.startsWith("<!-->", lt)) end = lt + 5;
        else if (src.startsWith("<!--->", lt)) end = lt + 6;
        else {
          const a = src.indexOf("-->", lt + 4);
          const b = src.indexOf("--!>", lt + 4);
          if (a === -1 && b === -1) end = len; // unterminated: drop the rest
          else if (a === -1) end = b + 4;
          else if (b === -1) end = a + 3;
          else end = a < b ? a + 3 : b + 4;
        }
        i = end;
        textStart = i;
        continue;
      }
      // Bogus comment / doctype / PI: ends at the first `>`.
      const gt = src.indexOf(">", lt);
      i = gt === -1 ? len : gt + 1;
      textStart = i;
      continue;
    }

    const tag = parseTag(src, lt);

    if (!tag) {
      // Either this `<` is literal text (`a < b`), or the tag is truncated /
      // has an unterminated quote.
      const isTagStart = /^[a-zA-Z]/.test(next || "") || (next === "/" && /^[a-zA-Z]/.test(src[lt + 2] || ""));
      if (isTagStart) {
        // Malformed tag we refuse to interpret: drop from here to EOF rather
        // than resync and risk reassembling a payload.
        i = len;
        textStart = len;
        break;
      }
      // Not a tag at all — emit the `<` as text and carry on.
      if (dropName === null) out += "&lt;";
      i = lt + 1;
      textStart = i;
      continue;
    }

    const { name, isEnd, attrs, selfClosing, end } = tag;
    i = end;
    textStart = end;

    // --- raw-text elements: skip the element and all of its content ---------
    // Done before the drop-state check so that a <script> nested inside an
    // already-dropped <svg> cannot confuse the depth counter with `</svg>`
    // text hidden in a string literal.
    if (!isEnd && RAWTEXT_DROP.has(name)) {
      const after = skipRawText(src, end, name);
      if (after === -1) {
        i = len;
        textStart = len;
        break;
      }
      i = after;
      textStart = after;
      continue;
    }

    // --- inside a dropped subtree: track depth, emit nothing ----------------
    if (dropName !== null) {
      if (name === dropName) {
        if (isEnd) {
          dropDepth--;
          if (dropDepth <= 0) dropName = null;
        } else if (!selfClosing) {
          dropDepth++;
        }
      }
      continue;
    }

    if (!isEnd && SUBTREE_DROP.has(name)) {
      if (!selfClosing) {
        dropName = name;
        dropDepth = 1;
      }
      continue;
    }

    // --- disallowed elements: unwrap (drop the tag, keep the content) -------
    if (!ALLOWED_TAGS.has(name)) continue;
    // A stray end tag for a subtree-drop element outside any drop state, e.g.
    // a lone `</svg>`, is simply not allowed and was already dropped above.

    if (isEnd) {
      // Only close something that is genuinely open. Mismatched nesting
      // (`<em><strong></em></strong>`) closes the intervening elements too, so
      // the output is always well-formed.
      const at = stack.lastIndexOf(name);
      if (at === -1) continue;
      for (let k = stack.length - 1; k >= at; k--) out += `</${stack[k]}>`;
      stack.length = at;
      continue;
    }

    const safeAttrs = filterAttrs(name, attrs);
    if (VOID_TAGS.has(name)) {
      out += `<${name}>`;
      continue;
    }
    out += `<${name}${safeAttrs}>`;
    // `<p/>` is not self-closing in HTML — browsers treat it as an open <p>,
    // and so do we, so the stack cannot desync from what the browser builds.
    stack.push(name);
  }

  flushText(len);

  // Close anything the author left open.
  for (let k = stack.length - 1; k >= 0; k--) out += `</${stack[k]}>`;

  return out;
}
