// Pins functions/_email-templates.js.
//
// The load-bearing assertion is the cross-site one: sikhi.io, sikhiuni.com and
// punjabiuni.com each render an identically-worded "Powered by sikhi.io" mark
// in every template. There is deliberately no shared npm package for that
// snippet (three repos, three deploy pipelines -- a package would be more
// drift surface than a pinned string), so these tests ARE the anti-drift
// mechanism. Change the wording here and you must change it in sikhi.io's
// __tests__/email-templates.test.ts and punjabiuni's
// lib/email/templates.test.ts in the same breath.
import { describe, it, expect } from "vitest";
import { resetPasswordTemplate, welcomeTemplate, magicLinkTemplate, POWERED_BY_HTML } from "../functions/_email-templates.js";

const RESET_LINK = "https://sikhiuni.com/reset-password.html?token=abc123";
const MAGIC_LINK = "https://sikhiuni.com/api/auth/verify?token=xyz789";

const ALL: Array<[string, { subject: string; html: string; text: string }]> = [
  ["resetPassword", resetPasswordTemplate(RESET_LINK)],
  ["welcome (named)", welcomeTemplate("Harjit")],
  ["welcome (anonymous)", welcomeTemplate()],
  ["magicLink", magicLinkTemplate(MAGIC_LINK)],
];

describe.each(ALL)("template %s", (_name, t) => {
  it("carries the canonical cross-site powered-by mark", () => {
    expect(t.html).toContain("Powered by ");
    expect(t.html).toContain("https://sikhi.io");
  });

  it("has a subject and a non-empty plaintext alternative", () => {
    expect(t.subject.length).toBeGreaterThan(0);
    expect(t.text.trim().length).toBeGreaterThan(0);
  });

  it("keeps the email-client conventions these templates depend on", () => {
    // Table layout announced as presentation, a hidden preheader, and the
    // mso/apple meta tags that stop Outlook and iOS Mail reflowing the card.
    expect(t.html).toContain('role="presentation"');
    expect(t.html).toContain("mso-hide:all");
    expect(t.html).toContain('http-equiv="X-UA-Compatible"');
    expect(t.html).toContain("x-apple-disable-message-reformatting");
    // bgcolor beside every background-color: Outlook drops the CSS.
    expect(t.html).toContain('bgcolor="#0b1e3a"');
    // Inline styles only — a <style> block is stripped by Gmail/Outlook, so
    // its presence would mean part of the design silently doesn't render.
    expect(t.html).not.toContain("<style");
  });

  it("stays on the Sikhi University palette, not a sibling site's", () => {
    expect(t.html).toContain("#f4b21a"); // saffron rule
    expect(t.html).toContain("Sikhi University");
  });
});

describe("POWERED_BY_HTML", () => {
  it("is the exact canonical row, in this site's two colour slots", () => {
    expect(POWERED_BY_HTML).toContain("Powered by ");
    expect(POWERED_BY_HTML).toContain('href="https://sikhi.io"');
    expect(POWERED_BY_HTML).toContain("#5f7396"); // muted
    expect(POWERED_BY_HTML).toContain("#ffc83d"); // accent
  });
});

describe("resetPasswordTemplate", () => {
  const t = resetPasswordTemplate(RESET_LINK);

  it("interpolates the reset link into both the button and the copy-paste fallback", () => {
    expect(t.html.split(RESET_LINK).length - 1).toBeGreaterThanOrEqual(2);
    expect(t.text).toContain(RESET_LINK);
  });

  it("keeps the Registrar voice and the 1-hour single-use security note", () => {
    expect(t.html).toContain("Office of the Registrar");
    expect(t.html).toContain("1 hour");
    expect(t.html).toContain("only once");
  });
});

describe("welcomeTemplate", () => {
  it("CTAs to the dashboard", () => {
    expect(welcomeTemplate().html).toContain("dashboard.html");
    expect(welcomeTemplate().text).toContain("https://sikhiuni.com/dashboard.html");
  });

  it("greets by name when known, and degrades cleanly when not", () => {
    expect(welcomeTemplate("Harjit").html).toContain("welcome, Harjit");
    const anon = welcomeTemplate().html;
    expect(anon).toContain("Waheguru Ji Ka Khalsa");
    expect(anon).not.toContain("welcome, ");
    // null is what the DB actually holds for a nameless account — it must
    // behave like undefined, not print "welcome, null".
    expect(welcomeTemplate(null as unknown as string).html).not.toContain("null");
  });

  it("says why it was sent — it is transactional, not marketing", () => {
    expect(welcomeTemplate().html).toContain("an account was created for you");
  });

  it("names the three real things the account does", () => {
    const html = welcomeTemplate().html;
    expect(html).toContain("departments catalogue");
    expect(html).toContain("certificates");
    expect(html).toContain("Learning paths");
  });
});

describe("magicLinkTemplate", () => {
  const t = magicLinkTemplate(MAGIC_LINK);

  it("carries the link and a non-empty plaintext part", () => {
    expect(t.html).toContain(MAGIC_LINK);
    expect(t.text).toContain(MAGIC_LINK);
    expect(t.text.trim().length).toBeGreaterThan(0);
  });

  it("states the 15-minute single-use expiry", () => {
    expect(t.html).toContain("15 minutes");
    expect(t.html).toContain("only once");
    expect(t.text).toContain("15 minutes");
  });

  it("is no longer the unbranded inline markup it replaced", () => {
    expect(t.html).toContain("Sikhi University");
    expect(t.html).toContain("&#9772;"); // the crest glyph
  });
});
