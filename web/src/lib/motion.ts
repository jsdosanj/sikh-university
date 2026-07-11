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

// 3D tilt for [data-tilt] cards: pointer-tracked, ≤6deg, fine pointers only.
// will-change is applied only while the pointer is over the card (contract).
export function initTilt(root: ParentNode = document): void {
  if (reduced() || !matchMedia('(pointer: fine)').matches) return;
  root.querySelectorAll<HTMLElement>('[data-tilt]').forEach((el) => {
    let raf = 0;
    el.addEventListener('pointerenter', () => { el.style.willChange = 'transform'; });
    el.addEventListener('pointermove', (e) => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        el.style.transform = `perspective(900px) rotateX(${(-py * 6).toFixed(2)}deg) rotateY(${(px * 6).toFixed(2)}deg)`;
      });
    });
    el.addEventListener('pointerleave', () => {
      if (raf) { cancelAnimationFrame(raf); raf = 0; }
      el.style.transform = '';
      el.style.willChange = '';
    });
  });
}

// Parallax for hero layers: [data-parallax="0.15"] drifts at that fraction of
// scroll. Desktop + non-reduced only; transform-only, rAF-throttled.
export function initParallax(): void {
  const els = Array.from(document.querySelectorAll<HTMLElement>('[data-parallax]'));
  if (!els.length || reduced() || matchMedia('(max-width: 768px)').matches) return;
  let raf = 0;
  const update = () => {
    raf = 0;
    const y = window.scrollY;
    for (const el of els) {
      const f = parseFloat(el.dataset.parallax || '0');
      if (f) el.style.transform = `translate3d(0, ${(y * f).toFixed(1)}px, 0)`;
    }
  };
  addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(update); }, { passive: true });
  update();
}

// Progress rings: <svg data-ring><circle class="ring-track"/><circle
// class="ring-value" data-ring-pct="72"/></svg>. The percentage is always
// ALSO rendered as text next to the ring — the sweep is decoration only.
export function initRings(root: ParentNode = document): void {
  const rings = Array.from(root.querySelectorAll<SVGCircleElement>('[data-ring-pct]'));
  if (!rings.length) return;
  const set = (c: SVGCircleElement, animate: boolean) => {
    const pct = Math.max(0, Math.min(100, parseFloat(c.dataset.ringPct || '0')));
    const r = c.r.baseVal.value;
    const circ = 2 * Math.PI * r;
    c.style.strokeDasharray = String(circ);
    if (!animate) { c.style.transition = 'none'; }
    c.style.strokeDashoffset = String(circ * (1 - pct / 100));
  };
  if (reduced() || !('IntersectionObserver' in window)) {
    rings.forEach((c) => set(c, false));
    return;
  }
  rings.forEach((c) => { const r = c.r.baseVal.value; const circ = 2 * Math.PI * r; c.style.strokeDasharray = String(circ); c.style.strokeDashoffset = String(circ); });
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      io.unobserve(e.target);
      set(e.target as SVGCircleElement, true);
    }
  }, { threshold: 0 });
  rings.forEach((c) => io.observe(c));
}

export function initMotion(): void {
  revealOnScroll();
  initTilt();
  initParallax();
  initRings();
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
