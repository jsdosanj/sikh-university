import { describe, it, expect } from "vitest";
import { expandYoutubeEmbeds, extractYoutubeId } from "../web/src/lib/lesson-embeds";

describe("expandYoutubeEmbeds", () => {
  it("expands a valid token into a youtube-nocookie iframe", () => {
    const out = expandYoutubeEmbeds("<p>intro</p>[[youtube:dQw4w9WgXcQ]]<p>outro</p>");
    expect(out).toContain('src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"');
    expect(out).toContain("<iframe");
    expect(out).toContain("<p>intro</p>");
    expect(out).toContain("<p>outro</p>");
  });

  it("expands multiple tokens", () => {
    const out = expandYoutubeEmbeds("[[youtube:aaaaaaaaaaa]] and [[youtube:bbbbbbbbbbb]]");
    expect(out.match(/<iframe/g)).toHaveLength(2);
    expect(out).toContain("embed/aaaaaaaaaaa");
    expect(out).toContain("embed/bbbbbbbbbbb");
  });

  it("does not expand a malformed token (wrong length, bad chars)", () => {
    expect(expandYoutubeEmbeds("[[youtube:short]]")).toBe("[[youtube:short]]");
    expect(expandYoutubeEmbeds("[[youtube:has space!]]")).toBe("[[youtube:has space!]]");
  });

  it("cannot be used to smuggle an attribute breakout — a payload with extra chars before ]] never matches, so no <iframe> is ever created", () => {
    // The regex requires exactly 11 allowed chars immediately followed by ]] — a
    // quote-and-attribute payload breaks that shape, so the whole token is left as
    // inert text (never woven into a real tag) rather than becoming part of a src
    // attribute. The literal word "onload" surviving as plain text is harmless;
    // what matters is that it's never inside an actual <iframe> this function emits.
    const attack = '[[youtube:aaaaaaaaaaa" onload="alert(1)]]';
    const out = expandYoutubeEmbeds(attack);
    expect(out).not.toContain("<iframe");
    expect(out).toBe(attack); // passed through completely unchanged
  });

  it("plain text with no tokens is unchanged", () => {
    expect(expandYoutubeEmbeds("<p>no embeds here</p>")).toBe("<p>no embeds here</p>");
  });
});

describe("extractYoutubeId", () => {
  it("accepts a bare 11-char id", () => {
    expect(extractYoutubeId("dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });

  it("extracts from watch, embed, shorts, and youtu.be URLs", () => {
    expect(extractYoutubeId("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(extractYoutubeId("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=30s")).toBe("dQw4w9WgXcQ");
    expect(extractYoutubeId("https://youtu.be/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(extractYoutubeId("https://www.youtube.com/embed/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(extractYoutubeId("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(extractYoutubeId("https://www.youtube.com/shorts/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });

  it("returns null for garbage input", () => {
    expect(extractYoutubeId("not a url")).toBeNull();
    expect(extractYoutubeId("https://vimeo.com/12345")).toBeNull();
    expect(extractYoutubeId("")).toBeNull();
  });
});
