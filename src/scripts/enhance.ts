// src/scripts/enhance.ts
// Single source of truth for client-side enhancement.
// Triggers on every page (initial load + Astro view transitions).

/**
 * Reset transient DOM state before a new page renders during view transitions.
 */
function setupViewTransitions(): void {
  document.addEventListener('astro:before-swap', () => {
    // Stop running observers / intervals — the new page reinitialises them.
    document.dispatchEvent(new CustomEvent('gm:page-leaving'));
  });
}

/* ---------- 1. Scroll reveal orchestrator ---------- */

interface RevealOptions {
  rootMargin?: string;
  threshold?: number;
  once?: boolean;
}

function initScrollReveal(opts: RevealOptions = {}): void {
  const { rootMargin = '0px 0px -10% 0px', threshold = 0.05, once = true } = opts;

  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          if (once) io.unobserve(entry.target);
        } else if (!once) {
          entry.target.classList.remove('is-visible');
        }
      }
    },
    { rootMargin, threshold }
  );

  const observe = () => {
    document.querySelectorAll('.reveal:not(.is-visible)').forEach((el) => io.observe(el));
  };
  observe();

  // Re-observe after view transitions
  document.addEventListener('astro:page-load', observe);
}

/* ---------- 2. Stagger orchestrator ---------- */
/* Groups of elements reveal one after another automatically when the
 * first one in the group enters the viewport.
 */
function initStaggerGroups(): void {
  const groups = document.querySelectorAll<HTMLElement>('[data-stagger]');

  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          const group = entry.target as HTMLElement;
          const children = group.querySelectorAll<HTMLElement>('.reveal');
          const baseDelay = Number(group.dataset.staggerBase ?? 0);
          const step = Number(group.dataset.staggerStep ?? 80);

          children.forEach((child, i) => {
            child.style.transitionDelay = `${baseDelay + i * step}ms`;
          });
          io.unobserve(group);
        }
      }
    },
    { rootMargin: '0px 0px -10% 0px', threshold: 0.01 }
  );

  const observe = () => {
    document.querySelectorAll<HTMLElement>('[data-stagger]:not([data-stagger-bound])').forEach((el) => {
      el.setAttribute('data-stagger-bound', 'true');
      io.observe(el);
    });
  };
  observe();
  document.addEventListener('astro:page-load', observe);
}

/* ---------- 3. Animated stat counters ---------- */

function animateCounters(): void {
  const counters = document.querySelectorAll<HTMLElement>('[data-counter]');

  const runCounter = (el: HTMLElement) => {
    if (el.dataset.counterDone === 'true') return;
    const target = Number(el.dataset.counter ?? '0');
    const duration = Number(el.dataset.counterDuration ?? 1600);
    const decimals = Number(el.dataset.counterDecimals ?? 0);
    const suffix = el.dataset.counterSuffix ?? '';
    const prefix = el.dataset.counterPrefix ?? '';

    const startTime = performance.now();
    const step = (now: number) => {
      const progress = Math.min(1, (now - startTime) / duration);
      const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
      const value = target * eased;
      el.textContent = `${prefix}${value.toLocaleString('es-ES', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}${suffix}`;
      if (progress < 1) requestAnimationFrame(step);
      else el.dataset.counterDone = 'true';
    };
    requestAnimationFrame(step);
  };

  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          runCounter(entry.target as HTMLElement);
          io.unobserve(entry.target);
        }
      }
    },
    { threshold: 0.4 }
  );

  const observe = () => {
    document.querySelectorAll<HTMLElement>('[data-counter]:not([data-counter-bound])').forEach((el) => {
      el.setAttribute('data-counter-bound', 'true');
      // Lock in the prefix text for fade-in just in case
      io.observe(el);
    });
  };
  observe();
  document.addEventListener('astro:page-load', observe);
}

/* ---------- 4. Magnetic CTAs ---------- */
/* Buttons with [data-magnetic] gently follow the cursor on hover. */
function initMagneticButtons(): void {
  const buttons = document.querySelectorAll<HTMLElement>('[data-magnetic]');

  const bind = (el: HTMLElement) => {
    if (el.dataset.magneticBound === 'true') return;
    el.dataset.magneticBound = 'true';

    const strength = Number(el.dataset.magnetic ?? 0.25);
    const inner = el.querySelector<HTMLElement>('[data-magnetic-inner]') ?? el;

    el.addEventListener('mousemove', (e) => {
      const rect = el.getBoundingClientRect();
      const x = (e.clientX - rect.left - rect.width / 2) * strength;
      const y = (e.clientY - rect.top - rect.height / 2) * strength;
      inner.style.transform = `translate(${x}px, ${y}px)`;
    });

    el.addEventListener('mouseleave', () => {
      inner.style.transform = '';
    });
  };

  const observe = () => {
    document.querySelectorAll<HTMLElement>('[data-magnetic]:not([data-magnetic-bound])').forEach(bind);
  };
  observe();
  document.addEventListener('astro:page-load', observe);
}

/* ---------- 5. 3D tilt on cards ---------- */

function initTiltCards(): void {
  const cards = document.querySelectorAll<HTMLElement>('[data-tilt]');

  const bind = (el: HTMLElement) => {
    if (el.dataset.tiltBound === 'true') return;
    el.dataset.tiltBound = 'true';

    const maxTilt = Number(el.dataset.tiltMax ?? 4);

    el.addEventListener('mousemove', (e) => {
      const rect = el.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width; // 0..1
      const y = (e.clientY - rect.top) / rect.height;
      const rx = (0.5 - y) * maxTilt;
      const ry = (x - 0.5) * maxTilt;
      el.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg)`;
    });

    el.addEventListener('mouseleave', () => {
      el.style.transform = '';
    });
  };

  const observe = () => {
    document.querySelectorAll<HTMLElement>('[data-tilt]:not([data-tilt-bound])').forEach(bind);
  };
  observe();
  document.addEventListener('astro:page-load', observe);
}

/* ---------- 6. Scroll progress bar ---------- */

function initScrollProgress(): void {
  const bar = document.querySelector<HTMLElement>('[data-scroll-progress]');
  if (!bar) return;

  const update = () => {
    const h = document.documentElement;
    const total = h.scrollHeight - h.clientHeight;
    const pct = total > 0 ? (h.scrollTop / total) * 100 : 0;
    bar.style.transform = `scaleX(${pct / 100})`;
  };
  update();
  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  document.addEventListener('astro:page-load', update);
}

/* ---------- 7. Subtle parallax on data-parallax ---------- */

function initParallax(): void {
  const els = document.querySelectorAll<HTMLElement>('[data-parallax]');
  if (els.length === 0) return;

  let ticking = false;
  const update = () => {
    for (const el of els) {
      const rect = el.getBoundingClientRect();
      const speed = Number(el.dataset.parallax ?? 0.2);
      // Only animate while in viewport (with margin)
      if (rect.bottom < -200 || rect.top > window.innerHeight + 200) continue;
      const offset = (rect.top - window.innerHeight / 2) * speed * -1;
      el.style.transform = `translate3d(0, ${offset.toFixed(2)}px, 0)`;
    }
    ticking = false;
  };
  window.addEventListener(
    'scroll',
    () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    },
    { passive: true }
  );
  update();
}

/* ---------- 8. Hero image Ken Burns on idle ---------- */

function initKenBurns(): void {
  document.querySelectorAll<HTMLElement>('[data-ken-burns]').forEach((el) => {
    if (el.dataset.kenBurnsBound === 'true') return;
    el.dataset.kenBurnsBound = 'true';
    el.style.animation = 'kenBurns 18s ease-out forwards';
  });
}

/* ---------- 9. Smooth image fade-in on load ---------- */
/* Images start blurred + transparent, fade to crisp once decoded.
 * Particularly nice for hero / property images on slow connections.
 * Only targets images inside known visual surfaces to avoid blanking small logos.
 */
const FADE_IN_SELECTOR = [
  '.hero__bg img',
  '.page-hero__bg img',
  '.prop-hero__main img',
  '.prop-hero__thumb img',
  '.destination img',
  '.property-card img',
  '.related-card img',
  'img[data-fade-in]',
].join(',');

function initImageFade(): void {
  const handle = (img: HTMLImageElement) => {
    if (img.dataset.fadeInBound === 'true') return;
    img.dataset.fadeInBound = 'true';

    // Above-the-fold eager images: don't blank, no fade needed
    if (img.loading === 'eager' && !img.hasAttribute('data-fade-in')) return;

    img.style.transition = 'filter 600ms var(--ease-out), opacity 600ms var(--ease-out)';
    img.style.filter = 'blur(12px)';
    img.style.opacity = '0.7';

    const clear = () => {
      requestAnimationFrame(() => {
        img.style.filter = '';
        img.style.opacity = '';
      });
    };

    if (img.complete && img.naturalWidth > 0) {
      clear();
    } else {
      img.addEventListener('load', clear, { once: true });
      img.addEventListener('error', clear, { once: true });
    }
  };

  const observe = () => {
    document.querySelectorAll<HTMLImageElement>(FADE_IN_SELECTOR).forEach(handle);
  };
  observe();
  document.addEventListener('astro:page-load', observe);
}

/* ---------- 10. Button loading state ---------- */
/* Toggle aria-busy + class on form submit so CSS can show a spinner
 * without layout shift.
 */
function initButtonLoading(): void {
  document.querySelectorAll<HTMLFormElement>('form[data-loading-on-submit]').forEach((form) => {
    if (form.dataset.loadingBound === 'true') return;
    form.dataset.loadingBound = 'true';

    form.addEventListener('submit', () => {
      const btn = form.querySelector<HTMLButtonElement>('[data-magnetic], button[type="submit"], .btn--primary');
      if (btn) {
        btn.classList.add('is-loading');
        btn.setAttribute('aria-busy', 'true');
      }
    });
  });
}

/* ---------- Init ---------- */

/* ---------- 11. Header scroll behavior (transparent → solid) ---------- */
/* Single global scroll listener that re-queries the current header on
 * every scroll, so it survives Astro View Transitions (which replace
 * the header element on each navigation). */
let headerScrollBound = false;

function initHeaderScroll(): void {
  if (headerScrollBound) return;
  headerScrollBound = true;

  const update = () => {
    const header = document.querySelector<HTMLElement>('.site-header');
    if (!header) return;
    // Only act on pages that asked for transparentHeader
    if (header.dataset.transparent !== 'true') return;
    if (window.scrollY > 30) header.classList.add('is-scrolled');
    else header.classList.remove('is-scrolled');
  };

  window.addEventListener('scroll', update, { passive: true });
  // Initial pass after DOM is ready
  requestAnimationFrame(update);
  // Re-run after each Astro page transition since the header is re-rendered
  document.addEventListener('astro:page-load', () => requestAnimationFrame(update));
}

function initAll(): void {
  initScrollReveal();
  initStaggerGroups();
  initKenBurns();
  initMagneticButtons();
  initTiltCards();
  initScrollProgress();
  initParallax();
  animateCounters();
  initImageFade();
  initButtonLoading();
  initHeaderScroll();
}

// Handle reduced motion
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
if (!reduceMotion) {
  setupViewTransitions();
  initAll();
} else {
  // Just mark reveals visible immediately
  document.querySelectorAll('.reveal').forEach((el) => el.classList.add('is-visible'));
}

// Re-init after view transition navigation
document.addEventListener('astro:page-load', () => {
  if (!reduceMotion) initAll();
});