/* ==========================================================
   Projects Index — cursor-following icons
   - Only the icon of the hovered project row is visible.
   - The icon follows the mouse (smoothly, using requestAnimationFrame).
   - Touch devices are ignored (CSS shows a static icon instead).
   ========================================================== */

const rows = document.querySelectorAll('.project');
const canHover = window.matchMedia('(hover: hover) and (pointer: fine)');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

/* Follow speed: 1 = instant, smaller = smoother/slower. Try 0.1 – 0.4 */
const FOLLOW_SPEED = 0.22;

let activeIcon = null;   // icon currently shown
let targetX = 0;         // where the mouse is
let targetY = 0;
let currentX = 0;        // where the icon is
let currentY = 0;
let frameId = null;

/* Put the icon at the current position, centered on the cursor */
function placeIcon() {
  activeIcon.style.transform =
    'translate3d(' + currentX + 'px, ' + currentY + 'px, 0) translate(-50%, -50%)';
}

/* Runs every frame while an icon is active */
function animate() {
  if (!activeIcon) {
    frameId = null;
    return;
  }
  const speed = reduceMotion.matches ? 1 : FOLLOW_SPEED;
  currentX += (targetX - currentX) * speed;
  currentY += (targetY - currentY) * speed;
  placeIcon();
  frameId = requestAnimationFrame(animate);
}

rows.forEach(function (row) {
  const icon = row.querySelector('.project__icon');
  if (!icon) return;

  /* Mouse enters a row: show this row's icon */
  row.addEventListener('pointerenter', function (event) {
    if (event.pointerType !== 'mouse' || !canHover.matches) return;

    if (activeIcon && activeIcon !== icon) {
      activeIcon.classList.remove('is-visible');
    }

    activeIcon = icon;
    targetX = currentX = event.clientX;   // start exactly at the cursor
    targetY = currentY = event.clientY;
    placeIcon();
    icon.classList.add('is-visible');

    if (!frameId) frameId = requestAnimationFrame(animate);
  });

  /* Mouse moves inside the row: update the target position */
  row.addEventListener('pointermove', function (event) {
    if (activeIcon !== icon) return;
    targetX = event.clientX;
    targetY = event.clientY;
  });

  /* Mouse leaves the row: fade the icon out */
  row.addEventListener('pointerleave', function () {
    icon.classList.remove('is-visible');
    if (activeIcon === icon) activeIcon = null;
  });
});


/* ==========================================================
   Projects heading — curved arrow animation control
   - Plays only while the heading is visible on screen.
   - Calculates how many dashes the dashed half has, so the
     reveal can advance exactly one dash at a time.
   ========================================================== */
(function () {
  const intro = document.querySelector('.projects__intro');
  const arrow = document.querySelector('.projects__arrow');
  if (!intro || !arrow) return;

  /* With reduced motion the arrow simply stays complete */
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const dashedReveal = arrow.querySelector('.arrow__reveal--dashed');
  const VIEWBOX_WIDTH = 762;   // width of the SVG viewBox
  const DASH_PERIOD = 7;       // 3px dash + 4px gap (see .arrow__dashed in CSS)

  function updateDashSteps() {
    const scale = arrow.getBoundingClientRect().width / VIEWBOX_WIDTH;
    const lengthOnScreen = dashedReveal.getTotalLength() * scale;
    const steps = Math.max(1, Math.round(lengthOnScreen / DASH_PERIOD));
    arrow.style.setProperty('--dash-steps', steps);
  }

  updateDashSteps();
  window.addEventListener('resize', updateDashSteps);
  arrow.addEventListener('arrowaligned', updateDashSteps);   // arrow was re-shaped

  if (!('IntersectionObserver' in window)) return;

  /* Visible -> start (from the beginning); hidden -> stop */
  const observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) updateDashSteps();
      arrow.classList.toggle('is-animated', entry.isIntersecting);
    });
  }, { threshold: 0.3 });

  observer.observe(intro);
})();


/* ==========================================================
   Projects heading — connect the arrow to the two W letters
   Measures the real position of the first W ("Welcome") and the
   second W ("World") and redraws the arrow's path between their
   middle vertices. Re-runs when the heading size changes
   (window resize, fonts finishing loading).
   ========================================================== */
(function () {
  const arrow = document.querySelector('.projects__arrow');
  const line = document.querySelector('.projects__heading-line');
  const wStart = document.querySelector('.w-start');
  const wEnd = document.querySelector('.w-end');
  const probe = document.querySelector('.baseline-probe');
  if (!arrow || !line || !wStart || !wEnd || !probe) return;

  const dashedPaths = arrow.querySelectorAll('.arrow__dashed, .arrow__reveal--dashed');
  const solidPaths = arrow.querySelectorAll('.arrow__solid, .arrow__reveal--solid');
  const tipPosition = arrow.querySelector('.arrow__tip-pos');
  const ctx = document.createElement('canvas').getContext('2d');

  /* The SVG viewBox is "123 85 762 125" (see index.html) */
  const VB_X = 123;
  const VB_Y = 85;
  const VB_WIDTH = 762;

  /* Shape of the original arrow (its W-to-W distance was 562 units) */
  const ORIGINAL_SPAN = 562;

  /* Move both endpoints up (+) or down (-) by this many px.
     0 = exactly on the top vertex of each W. */
  const VERTEX_OFFSET_Y = 0;

  /* Top-center point of the "W" glyph inside an element, in screen px */
  function vertexOf(element, baselineY) {
    const style = getComputedStyle(element);
    ctx.font = style.fontStyle + ' ' + style.fontWeight + ' ' +
               style.fontSize + ' ' + style.fontFamily;
    const metrics = ctx.measureText('W');
    const box = element.getBoundingClientRect();
    return {
      x: box.left + (metrics.actualBoundingBoxRight - metrics.actualBoundingBoxLeft) / 2,
      y: baselineY - metrics.actualBoundingBoxAscent - VERTEX_OFFSET_Y
    };
  }

  function alignArrow() {
    const baselineY = probe.getBoundingClientRect().bottom;
    const start = vertexOf(wStart, baselineY);
    const end = vertexOf(wEnd, baselineY);

    /* Convert screen px to SVG units */
    const svgBox = arrow.getBoundingClientRect();
    const k = svgBox.width / VB_WIDTH;
    if (!k) return;
    const toX = function (x) { return VB_X + (x - svgBox.left) / k; };
    const toY = function (y) { return VB_Y + (y - svgBox.top) / k; };

    const x0 = toX(start.x), y0 = toY(start.y);   // first W vertex
    const x3 = toX(end.x),   y3 = toY(end.y);     // second W vertex
    const dx = x3 - x0;
    if (dx <= 0) return;

    const r = dx / ORIGINAL_SPAN;                 // keeps the arch proportions
    const peakX = x0 + 277 * r;
    const peakY = y0 - 99 * r;

    const f = function (n) { return n.toFixed(2); };

    const dashed = 'M' + f(x0) + ' ' + f(y0) +
      ' C' + f(x0 + 5 * r) + ' ' + f(y0 - 55 * r) +
      ' ' + f(x0 + 127 * r) + ' ' + f(peakY) +
      ' ' + f(peakX) + ' ' + f(peakY);

    const solid = 'M' + f(peakX) + ' ' + f(peakY) +
      ' C' + f(peakX + 160 * r) + ' ' + f(peakY) +
      ' ' + f(x3) + ' ' + f(peakY + 39 * r) +
      ' ' + f(x3) + ' ' + f(y3);

    dashedPaths.forEach(function (p) { p.setAttribute('d', dashed); });
    solidPaths.forEach(function (p) { p.setAttribute('d', solid); });
    tipPosition.setAttribute('transform', 'translate(' + f(x3) + ' ' + f(y3) + ')');

    arrow.dispatchEvent(new Event('arrowaligned'));
  }

  alignArrow();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(alignArrow);
  window.addEventListener('load', alignArrow);

  if ('ResizeObserver' in window) {
    const observer = new ResizeObserver(alignArrow);
    observer.observe(line);
    observer.observe(arrow);
  } else {
    window.addEventListener('resize', alignArrow);
  }
})();


/* ==========================================================
   LANDING ANIMATION
   One continuous intro built with the Web Animations API:

   1. SEOJIN fades in (white on black, Pretendard SemiBold)
   2. The O splits into two halves
   3. Eight project icons pop in the opening, one after another
   4. The O closes again
   5. Letters change to Italiana, one by one (S E O J I N)
   6. Black -> white, spacing narrows, header fades in, and the
      logo lands exactly on the real .hero .logo
   Then the overlay is removed.

   The whole sequence is the async function runTimeline() near the
   bottom. All durations are in the TIMING object.
   ========================================================== */
(function () {
  'use strict';

  const root = document.documentElement;
  const overlay = document.querySelector('.landing');
  if (!overlay) return;

  /* The <head> script only adds .is-landing when the intro should play
     (motion allowed, no #hash). Otherwise just remove the overlay. */
  if (!root.classList.contains('is-landing')) {
    overlay.remove();
    return;
  }

  /* ---------- Timing (milliseconds) — adjust here ---------- */
  const TIMING = {
    fadeIn: 500,            // 1. logo fade-in
    holdLogo: 500,          // pause before the O opens
    split: 400,             // 2. O opens
    iconIn: 130,            // 3. icon scales up (with a small overshoot)
    iconSettle: 40,         //    overshoot settles back to 100%
    iconHold: 50,           //    brief hold
    iconOut: 120,           //    icon scales down and disappears
    close: 400,             // 4. O closes
    holdClosed: 300,        // pause before the font change
    fontStagger: 220,       // 5. delay between two letters
    fontDuration: 400,      //    duration of one letter's change
    final: 1100,            // 6. colours, spacing, header
    loadTimeout: 4000       // never wait longer than this for fonts / images
  };

  /* ---------- Look — adjust here ---------- */
  const LOOK = {
    letterSpacingEm: 0.055,  // spacing of the intro logo (the final spacing is 0)
    splitGapEm: 0.50,       // how far the O opens (in em of the intro font size)
    iconEase: 'cubic-bezier(0.2, 0.9, 0.3, 1)',
    moveEase: 'cubic-bezier(0.65, 0, 0.35, 1)'
  };

  const SANS_FONT = '600 100px Pretendard, sans-serif';
  const SERIF_FONT = '400 100px Italiana, serif';

  /* ---------- Elements ---------- */
  const logo = overlay.querySelector('.landing__logo');
  const letters = Array.from(overlay.querySelectorAll('.landing__letter'));
  const oLetter = overlay.querySelector('.landing__letter--o');
  const oIndex = letters.indexOf(oLetter);
  const oSans = oLetter.querySelector('.landing__glyph--sans');
  const oHalves = Array.from(oLetter.querySelectorAll('.landing__o-half'));
  const oLeft = oLetter.querySelector('.landing__o-half--left');
  const oRight = oLetter.querySelector('.landing__o-half--right');
  const shifts = Array.from(overlay.querySelectorAll('.landing__shift'));
  const header = document.querySelector('.site-header');
  const main = document.querySelector('main');
  const heroLogo = document.querySelector('.hero .logo');

  const animations = [];          // every animation, so cleanup can cancel them
  let finished = false;

  const sleep = function (ms) {
    return new Promise(function (resolve) { setTimeout(resolve, ms); });
  };

  /* Play one animation and return a promise that resolves when it ends */
  function play(element, frames, options) {
    const animation = element.animate(frames, Object.assign({ fill: 'both' }, options));
    animations.push(animation);
    return animation.finished.catch(function () {});
  }

  /* ---------- Block scrolling and clicks while the intro runs ---------- */
  const blockedKeys = [' ', 'PageUp', 'PageDown', 'Home', 'End', 'ArrowUp', 'ArrowDown'];
  function preventDefault(event) { event.preventDefault(); }
  function blockKeys(event) { if (blockedKeys.indexOf(event.key) !== -1) event.preventDefault(); }
  function keepAtTop() { if (window.scrollY !== 0) window.scrollTo(0, 0); }

  function lock() {
    window.scrollTo(0, 0);
    window.addEventListener('wheel', preventDefault, { passive: false });
    window.addEventListener('touchmove', preventDefault, { passive: false });
    window.addEventListener('keydown', blockKeys);
    window.addEventListener('scroll', keepAtTop);
    if (header) header.inert = true;     // no focus / clicks on the page behind
    if (main) main.inert = true;
  }

  function unlock() {
    window.removeEventListener('wheel', preventDefault);
    window.removeEventListener('touchmove', preventDefault);
    window.removeEventListener('keydown', blockKeys);
    window.removeEventListener('scroll', keepAtTop);
    window.removeEventListener('resize', onResize);
    if (header) header.inert = false;
    if (main) main.inert = false;
  }

  /* ---------- Cleanup: reveal the real page ---------- */
  function finish() {
    if (finished) return;
    finished = true;
    unlock();
    root.classList.remove('is-landing');            // overlay hides, header shows
    animations.forEach(function (a) { try { a.cancel(); } catch (e) {} });
    overlay.remove();
  }

  /* If the width changes mid-intro, positions would be wrong: jump to the end */
  const startWidth = window.innerWidth;
  function onResize() {
    if (window.innerWidth !== startWidth) finish();
  }

  /* ---------- 1. Preparation: fonts, icons, measurements ---------- */
  const canvas = document.createElement('canvas').getContext('2d');

  function metricsOf(font, character) {
    canvas.font = font;
    const m = canvas.measureText(character);
    return {
      advance: m.width / 100,                                        // em
      ascent: (m.fontBoundingBoxAscent !== undefined ? m.fontBoundingBoxAscent : 95) / 100,
      descent: (m.fontBoundingBoxDescent !== undefined ? m.fontBoundingBoxDescent : 25) / 100,
      glyphAscent: m.actualBoundingBoxAscent / 100,
      glyphDescent: m.actualBoundingBoxDescent / 100
    };
  }

  /* Distance (em) from the top of a line-height:1 box to the text baseline */
  function baselineOf(m) {
    return (1 - (m.ascent + m.descent)) / 2 + m.ascent;
  }

  async function waitForAssets() {
    const pageLoaded = document.readyState === 'complete'
      ? Promise.resolve()
      : new Promise(function (resolve) { window.addEventListener('load', resolve, { once: true }); });

    const assets = pageLoaded.then(function () {
      const fonts = Promise.all([
        document.fonts.load(SANS_FONT, 'SEOJIN'),
        document.fonts.load(SERIF_FONT, 'SEOJIN')
      ]);
      const icons = Promise.all(Array.from(overlay.querySelectorAll('.landing__icon')).map(function (img) {
        return img.decode ? img.decode().catch(function () {}) : Promise.resolve();
      }));
      return Promise.all([fonts, icons]);
    }).catch(function () {});

    /* Fonts or images that never arrive must not freeze the intro */
    await Promise.race([assets, sleep(TIMING.loadTimeout)]);
  }

  /* Measure everything needed to place the letters */
  function measure() {
    const chars = letters.map(function (l) {
      return l.querySelector('.landing__glyph--sans').textContent;
    });
    const sans = chars.map(function (c) { return metricsOf(SANS_FONT, c); });
    const serif = chars.map(function (c) { return metricsOf(SERIF_FONT, c); });

    /* Keep the two fonts' baselines on the same line */
    const dy = baselineOf(serif[oIndex]) - baselineOf(sans[oIndex]);
    logo.style.setProperty('--dy', dy + 'em');

    /* Centre each Pretendard glyph on its Italiana glyph (--dx) */
    const dx = chars.map(function (c, i) { return (serif[i].advance - sans[i].advance) / 2; });
    letters.forEach(function (l, i) { l.style.setProperty('--dx', dx[i] + 'em'); });

    /* START positions: Pretendard widths + wide letter spacing, centred (em) */
    const spacing = LOOK.letterSpacingEm;
    const total = sans.reduce(function (sum, m) { return sum + m.advance; }, 0) + spacing * (chars.length - 1);
    let cursor = -total / 2;
    const startX = sans.map(function (m, i) {
      const x = cursor - dx[i];
      cursor += m.advance + spacing;
      return x;
    });

    /* END positions: where the real hero logo draws each letter (em of its size) */
    const heroSize = parseFloat(getComputedStyle(heroLogo).fontSize);
    const overlayBox = overlay.getBoundingClientRect();
    const centerX = overlayBox.left + overlayBox.width / 2;
    const textNode = heroLogo.firstChild;
    const range = document.createRange();
    const endX = chars.map(function (c, i) {
      range.setStart(textNode, i);
      range.setEnd(textNode, i + 1);
      return (range.getClientRects()[0].left - centerX) / heroSize;
    });

    /* Opening of the O: centre of the letter, vertical centre of the capitals */
    const oSansMetrics = sans[oIndex];
    oLetter.style.setProperty('--o-center', (serif[oIndex].advance / 2) + 'em');
    oLetter.style.setProperty('--cap-center',
      (baselineOf(serif[oIndex]) - (oSansMetrics.glyphAscent - oSansMetrics.glyphDescent) / 2) + 'em');

    /* Put every letter on its start position */
    letters.forEach(function (l, i) { l.style.transform = 'translateX(' + startX[i] + 'em)'; });

    return {
      startX: startX,
      endX: endX,
      startSize: parseFloat(getComputedStyle(logo).fontSize),
      endSize: heroSize
    };
  }

  /* ---------- 2. Split / close the O ---------- */
  function moveSides(from, to, duration) {
    const half = LOOK.splitGapEm / 2;
    const frames = function (sign) {
      return [
        { transform: 'translateX(' + (sign * from * half) + 'em)' },
        { transform: 'translateX(' + (sign * to * half) + 'em)' }
      ];
    };
    const options = { duration: duration, easing: LOOK.moveEase };
    const left = [oLeft].concat(shifts.filter(function (s) { return s.dataset.side === 'left'; }));
    const right = [oRight].concat(shifts.filter(function (s) { return s.dataset.side === 'right'; }));
    return Promise.all(
      left.map(function (el) { return play(el, frames(-1), options); })
        .concat(right.map(function (el) { return play(el, frames(1), options); }))
    );
  }

  /* The whole O <-> two halves swap is invisible: the halves are the same glyph */
  function showHalves(on) {
    oSans.style.opacity = on ? '0' : '1';
    oHalves.forEach(function (h) { h.style.opacity = on ? '1' : '0'; });
  }

  /* ---------- 6b. Settle: freeze the final frame as plain static styles ----------
     Animated layers are drawn by the GPU and can differ from normal page text by
     a sub-pixel. So the last frame is written down as ordinary CSS values, the
     animations are cancelled, and two frames are painted. Only then is the
     overlay removed, so the swap to the real hero logo cannot be seen. */
  function nextFrame() {
    return new Promise(function (resolve) { requestAnimationFrame(function () { resolve(); }); });
  }

  async function settle(m) {
    overlay.style.backgroundColor = '#ffffff';
    logo.style.opacity = '1';
    logo.style.color = '#000000';
    logo.style.fontSize = m.endSize + 'px';
    letters.forEach(function (letter, i) {
      letter.style.transform = 'translateX(' + m.endX[i] + 'em)';
      letter.querySelector('.landing__glyph--sans').style.opacity = '0';
      const serifLayer = letter.querySelector('.landing__glyph--serif');
      serifLayer.style.opacity = '1';
      serifLayer.style.scale = '1';
    });
    shifts.forEach(function (el) { el.style.transform = 'none'; });
    if (header) {
      header.style.opacity = '1';
      header.style.transform = 'none';
    }
    overlay.classList.add('is-settled');            // drops the will-change hints
    animations.forEach(function (a) { try { a.cancel(); } catch (e) {} });
    await nextFrame();
    await nextFrame();
    if (header) {
      header.style.opacity = '';
      header.style.transform = '';
    }
  }

  /* ---------- 3. Icon sequence ---------- */
  function playIcons() {
    const icons = Array.from(overlay.querySelectorAll('.landing__icon')).filter(function (img) {
      return img.complete && img.naturalWidth > 0;    // skip images that failed to load
    });
    const t = TIMING;
    const total = t.iconIn + t.iconSettle + t.iconHold + t.iconOut;
    const frames = [
      { opacity: 0, scale: 0.85, offset: 0, easing: 'ease-out' },
      { opacity: 1, scale: 1.03, offset: t.iconIn / total, easing: 'ease-in-out' },
      { opacity: 1, scale: 1,    offset: (t.iconIn + t.iconSettle) / total, easing: 'linear' },
      { opacity: 1, scale: 1,    offset: (t.iconIn + t.iconSettle + t.iconHold) / total,
        easing: 'cubic-bezier(0.5, 0, 0.9, 0.5)' },
      { opacity: 0, scale: 0.9,  offset: 1 }
    ];
    /* Each icon starts exactly when the previous one ends: never two at once */
    return Promise.all(icons.map(function (img, i) {
      return play(img, frames, { duration: total, delay: i * total });
    }));
  }

  /* ---------- 5. One letter: Pretendard -> Italiana ---------- */
  function transformLetter(letter, delay) {
    const sansLayer = letter.querySelector('.landing__glyph--sans');
    const serifLayer = letter.querySelector('.landing__glyph--serif');
    const options = { duration: TIMING.fontDuration, delay: delay, easing: 'ease-in-out' };
    return Promise.all([
      play(sansLayer, [
        { opacity: 1, scale: 1,    offset: 0 },
        { opacity: 0, scale: 0.94, offset: 0.6 },
        { opacity: 0, scale: 0.94, offset: 1 }
      ], options),
      play(serifLayer, [
        { opacity: 0, scale: 1.08, offset: 0 },
        { opacity: 0, scale: 1.08, offset: 0.15 },
        { opacity: 1, scale: 1,    offset: 1 }
      ], options)
    ]);
  }

  /* ---------- THE TIMELINE ---------- */
  async function runTimeline() {
    lock();
    window.addEventListener('resize', onResize);

    await waitForAssets();
    if (finished) return;
    const m = measure();

    /* 1. SEOJIN fades in */
    await play(logo, [{ opacity: 0 }, { opacity: 1 }], { duration: TIMING.fadeIn, easing: 'ease-out' });
    await sleep(TIMING.holdLogo);

    /* 2. The O splits */
    showHalves(true);
    await moveSides(0, 1, TIMING.split);

    /* 3. Eight icons, POP POP POP ... */
    await playIcons();

    /* 4. The O closes */
    await moveSides(1, 0, TIMING.close);
    showHalves(false);
    await sleep(TIMING.holdClosed);

    /* 5. S -> E -> O -> J -> I -> N become Italiana */
    await Promise.all(letters.map(function (letter, i) {
      return transformLetter(letter, i * TIMING.fontStagger);
    }));

    /* 6. Colours invert, spacing narrows, header appears, logo lands on the hero */
    const finalOptions = { duration: TIMING.final, easing: LOOK.moveEase };
    const steps = [
      play(overlay, [{ backgroundColor: '#000000' }, { backgroundColor: '#ffffff' }], finalOptions),
      play(logo, [
        { color: '#ffffff', fontSize: m.startSize + 'px' },
        { color: '#000000', fontSize: m.endSize + 'px' }
      ], finalOptions)
    ];
    letters.forEach(function (letter, i) {
      steps.push(play(letter, [
        { transform: 'translateX(' + m.startX[i] + 'em)' },
        { transform: 'translateX(' + m.endX[i] + 'em)' }
      ], finalOptions));
    });
    if (header) {
      steps.push(play(header, [
        { opacity: 0, transform: 'translateY(-8px)' },
        { opacity: 1, transform: 'translateY(0)' }
      ], { duration: TIMING.final * 0.6, delay: TIMING.final * 0.4, easing: 'ease-out' }));
    }
    await Promise.all(steps);

    /* The overlay logo now sits exactly on the hero logo: freeze it, then reveal the page */
    if (finished) return;
    await settle(m);
    finish();
  }

  runTimeline().catch(finish);       // any error: just show the page
})();

/* ==========================================================
   ABOUT ME — EDUCATION / CONTACT INTERACTION
   ========================================================== */

(function () {
  const container = document.querySelector('.about-extra');
  const buttons = document.querySelectorAll('[data-about-panel]');
  const infoBoxes = document.querySelectorAll('.about__list .info__box');

  if (!container || !buttons.length) return;

  const panels = {
    education: document.getElementById('education-panel'),
    contact: document.getElementById('contact-panel')
  };

  let activePanel = null;

  function showPanel(name) {
    // Clicking the active button closes the overlay.
    activePanel = activePanel === name ? null : name;

    // Show only the selected panel.
    Object.entries(panels).forEach(function ([key, panel]) {
      if (!panel) return;
      panel.hidden = key !== activePanel;
    });

    // Show or hide the overlay container.
    container.classList.toggle('is-open', activePanel !== null);

    // Update button appearance and accessibility.
    buttons.forEach(function (button) {
      const isActive = button.dataset.aboutPanel === activePanel;

      button.classList.toggle('is-active', isActive);
      button.setAttribute('aria-expanded', String(isActive));
      button.setAttribute('aria-pressed', String(isActive));
    });

    // Prevent keyboard focus on the covered original boxes.
    infoBoxes.forEach(function (box) {
      if (activePanel !== null) {
        box.inert = true;
      } else {
        box.inert = false;
      }
    });
  }

  buttons.forEach(function (button) {
    button.addEventListener('click', function () {
      showPanel(button.dataset.aboutPanel);
    });
  });
})();

/* ==========================================================
   MOBILE MAIN PAGE v1 — menu accessibility and navigation
   ========================================================== */
(function () {
  const checkbox = document.getElementById('menu-toggle');
  const menu = document.querySelector('.menu');
  if (!checkbox || !menu) return;
  const mobile = window.matchMedia('(max-width: 767px)');
  const label = menu.querySelector('.menu__label');
  const links = menu.querySelectorAll('.menu__list a');
  const homeLink = document.querySelector('.role a');
  function syncMenu() {
    const open = mobile.matches && checkbox.checked;
    document.documentElement.classList.toggle('mobile-menu-open', open);
    if (label) label.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  }
  function closeMenu() { checkbox.checked = false; syncMenu(); }
  checkbox.addEventListener('change', syncMenu);
  links.forEach(function (link) { link.addEventListener('click', closeMenu); });
  if (homeLink) homeLink.addEventListener('click', closeMenu);
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && checkbox.checked) { closeMenu(); if (label) label.focus(); }
  });
  if (mobile.addEventListener) mobile.addEventListener('change', syncMenu);
  else mobile.addListener(syncMenu);
  syncMenu();
})();


/* ==========================================================
   MOBILE ABOUT ME v2 — activate the box in the viewport's
   reading zone automatically, from top to bottom as you scroll.
   Education / Contact click controls are kept unchanged.
   ========================================================== */
(function () {
  const rows = Array.from(document.querySelectorAll('.about__list > .info'));
  if (!rows.length) return;
  const mobile = window.matchMedia('(max-width: 767px)');
  let scheduled = false;

  function update() {
    scheduled = false;
    if (!mobile.matches) {
      rows.forEach(row => row.classList.remove('is-scroll-active'));
      return;
    }

    // Keep the boxes grey until the About section reaches the reading zone.
    // As the reader scrolls, the row closest to 50% viewport height lights up.
    const viewportHeight = window.innerHeight;
    const readingY = viewportHeight * 0.5;
    const about = document.getElementById('about');
    const aboutRect = about && about.getBoundingClientRect();
    let nearest = null;
    let distance = Infinity;

    if (aboutRect && aboutRect.top <= readingY && aboutRect.bottom >= readingY) {
      rows.forEach(function (row) {
        const rect = row.getBoundingClientRect();
        // Activate only when the row itself is near the viewport centre.
        const center = (rect.top + rect.bottom) / 2;
        const delta = Math.abs(center - readingY);
        const allowed = Math.max(110, Math.min(viewportHeight * 0.29, rect.height * 0.8));
        if (delta < distance && delta <= allowed) {
          distance = delta;
          nearest = row;
        }
      });
    }
    rows.forEach(row => row.classList.toggle('is-scroll-active', row === nearest));
  }

  function requestUpdate() {
    if (!scheduled) {
      scheduled = true;
      window.requestAnimationFrame(update);
    }
  }
  window.addEventListener('scroll', requestUpdate, { passive: true });
  window.addEventListener('resize', requestUpdate);
  if (mobile.addEventListener) mobile.addEventListener('change', requestUpdate);
  else mobile.addListener(requestUpdate);
  window.addEventListener('load', requestUpdate);
  requestUpdate();
})();

/* ==========================================================
   MOBILE PROJECT INDEX — tap location -> pop icon -> navigate.
   Desktop hover remains exactly as before.
   ========================================================== */
(function () {
  const touchMode = window.matchMedia('(hover: none), (pointer: coarse)');
  const projects = document.querySelectorAll('.project');
  let navigating = false;

  projects.forEach(function (project) {
    let touchPoint = null;

    project.addEventListener('pointerup', function (event) {
      if (event.pointerType === 'touch' || event.pointerType === 'pen') {
        touchPoint = { x: event.clientX, y: event.clientY };
      }
    });

    project.addEventListener('click', function (event) {
      if (!touchMode.matches || event.detail === 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      if (navigating) { event.preventDefault(); return; }

      const image = project.querySelector('.project__icon');
      const href = project.getAttribute('href');
      if (!image || !href) return;

      event.preventDefault();
      navigating = true;

      const point = touchPoint || { x: event.clientX, y: event.clientY };
      touchPoint = null;
      const pop = document.createElement('img');
      pop.className = 'project-tap-icon';
      pop.src = image.currentSrc || image.src;
      pop.alt = '';
      pop.setAttribute('aria-hidden', 'true');
      pop.style.left = point.x + 'px';
      pop.style.top = point.y + 'px';
      document.body.appendChild(pop);

      window.setTimeout(function () { window.location.assign(href); },
        window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 80 : 320);
    });
  });

  // Browser back/forward cache may restore a previously animated page.
  window.addEventListener('pageshow', function () {
    navigating = false;
    document.querySelectorAll('.project-tap-icon').forEach(function (el) { el.remove(); });
  });
})();

/* ==========================================================
   FIX: Return to the very top when navigating to #home
   ========================================================== */
(function () {
  if (window.location.hash !== '#home') return;

  if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
  }

  function goToTop() {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'instant'
    });
  }

  goToTop();

  window.addEventListener('load', function () {
    goToTop();
    requestAnimationFrame(goToTop);
  });

  window.addEventListener('pageshow', goToTop);
})();

/* Footer links — open the existing About Me tabs before navigating. */
(function () {
  document.querySelectorAll('[data-footer-panel]').forEach(function (link) {
    link.addEventListener('click', function (event) {
      event.preventDefault();
      const name = link.getAttribute('data-footer-panel');
      const button = document.querySelector('[data-about-panel="' + name + '"]');
      const panel = document.getElementById(name + '-panel');
      const about = document.getElementById('about');
      if (!button || !panel || !about) return;
      // The existing click handler toggles; click only when not already active.
      if (!button.classList.contains('is-active')) button.click();
      // Wait for the panel to become visible and then show its content.
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          const target = panel.getBoundingClientRect().height ? panel : about;
          const header = document.querySelector('.site-header');
          const offset = header ? header.getBoundingClientRect().height + 24 : 24;
          const y = Math.max(0, window.scrollY + target.getBoundingClientRect().top - offset);
          window.scrollTo({ top: y, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
        });
      });
    });
  });
  document.querySelectorAll('.portfolio-footer__home, [data-footer-home]').forEach(function (link) {
    link.addEventListener('click', function (event) {
      event.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });
})();

/* Footer brand: match actual visual text widths to logo width. */
(function () {
  const brand = document.querySelector('.portfolio-footer__brand');
  if (!brand) return;
  function fitFooterBrand() {
    const logo = brand.querySelector('img');
    if (!logo) return;
    const target = logo.getBoundingClientRect().width;
    ['.portfolio-footer__name', '.portfolio-footer__discipline'].forEach(function (selector) {
      const el = brand.querySelector(selector);
      if (!el) return;
      el.style.transform = 'none';
      const natural = el.getBoundingClientRect().width;
      if (natural > 0) el.style.transform = 'scaleX(' + (target / natural).toFixed(5) + ')';
    });
  }
  fitFooterBrand();
  window.addEventListener('resize', fitFooterBrand);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitFooterBrand);
})();

/* Project footer deep links to About Me information panels. */
(function () {
 const requested = new URLSearchParams(location.search).get('footerPanel');
 if (!['education','contact'].includes(requested)) return;
 window.addEventListener('load', function () {
   const button=document.querySelector('[data-about-panel="'+requested+'"]');
   const panel=document.getElementById(requested+'-panel');
   const about=document.getElementById('about');
   if (!button || !about) return;
   if (!button.classList.contains('is-active')) button.click();
   setTimeout(function () {
     const target=panel && panel.getBoundingClientRect().height ? panel : about;
     const header=document.querySelector('.site-header');
     const offset=header ? header.getBoundingClientRect().height+24 : 24;
     window.scrollTo({top:Math.max(0,window.scrollY+target.getBoundingClientRect().top-offset),behavior:'instant'});
   },120);
 });
})();
