// Whisper-quiet motion utilities (DESIGN.md: hover lifts, a gentle staggered
// reveal at most; everything behind prefers-reduced-motion).
//
// Usage: mark elements with class="reveal" (optionally data-reveal-delay="120"
// for a stagger, in ms) and stat counters with data-countup="558" (optional
// data-countup-suffix="+"). initMotion() is called once per page from
// Base.astro; it arms the CSS by stamping data-reveal-ready on <html>, so
// no-JS visitors and crawlers always see un-hidden content.

const reduced = () =>
  typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

export function revealOnScroll(root: ParentNode = document): void {
  const els = Array.from(root.querySelectorAll<HTMLElement>('.reveal'));
  if (!els.length) return;
  document.documentElement.setAttribute('data-reveal-ready', '1');
  if (reduced() || !('IntersectionObserver' in window)) {
    els.forEach((el) => el.classList.add('in'));
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        const el = e.target as HTMLElement;
        const delay = parseInt(el.dataset.revealDelay || '0', 10);
        if (delay) el.style.transitionDelay = `${delay}ms`;
        el.classList.add('in');
        io.unobserve(el);
      }
    },
    // threshold MUST be 0: the observer only notifies when the visible
    // FRACTION crosses a listed threshold, and an element taller than several
    // viewports can never reach even 8% visible — with a nonzero threshold it
    // would never reveal at all (this hid whole course pages in production).
    { rootMargin: '0px 0px -8% 0px', threshold: 0 },
  );
  els.forEach((el) => io.observe(el));
}

export function countUp(el: HTMLElement): void {
  const target = parseFloat(el.dataset.countup || '0');
  const suffix = el.dataset.countupSuffix || '';
  const done = () => { el.textContent = `${target.toLocaleString()}${suffix}`; };
  if (reduced() || !Number.isFinite(target) || target <= 0) return done();
  const dur = 1200;
  let start: number | null = null;
  const step = (t: number) => {
    if (start === null) start = t;
    const p = Math.min(1, (t - start) / dur);
    const eased = 1 - Math.pow(1 - p, 3);
    el.textContent = `${Math.round(target * eased).toLocaleString()}${suffix}`;
    if (p < 1) requestAnimationFrame(step);
    else done();
  };
  requestAnimationFrame(step);
}

export function initMotion(): void {
  revealOnScroll();
  const counters = Array.from(document.querySelectorAll<HTMLElement>('[data-countup]'));
  if (!counters.length) return;
  if (reduced() || !('IntersectionObserver' in window)) {
    counters.forEach(countUp);
    return;
  }
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      io.unobserve(e.target);
      countUp(e.target as HTMLElement);
    }
  }, { threshold: 0.4 });
  counters.forEach((el) => io.observe(el));
}
