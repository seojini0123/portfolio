/* ==========================================================
   Project detail page — layout measurement
   All the scrolling behaviour (pinned panel, release, sticky
   title) is done by CSS position: sticky. There is NO scroll
   listener here and nothing ever moves the page.

   This file has one job: tell the CSS how far the user has to
   scroll before the left panel is released.

       release distance = height of .pd-info - height of .pd-panel

   The title layer uses the same number, so the panel and the
   title are released at exactly the same moment. The value is
   measured from the real layout again whenever something changes
   (window resize, images finishing loading, fonts loading).
   ========================================================== */

(function () {
  const page = document.querySelector('.pd');
  const info = document.querySelector('.pd-info');
  const panel = document.querySelector('.pd-panel');
  if (!page || !info || !panel) return;

  function measure() {
    const release = info.getBoundingClientRect().height -
                    panel.getBoundingClientRect().height;
    page.style.setProperty('--release-y', Math.max(0, release) + 'px');
  }

  measure();
  window.addEventListener('load', measure);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);

  if ('ResizeObserver' in window) {
    const observer = new ResizeObserver(measure);
    observer.observe(info);    // changes when the right column changes size
    observer.observe(panel);   // changes when the panel content changes size
  } else {
    window.addEventListener('resize', measure);
  }
})();

/* Replace the detail-page header text with the shared logo. */
(function () {
  const homeLink = document.querySelector('.site-header .role a');
  if (!homeLink) return;
  const mark = document.createElement('img');
  mark.className = 'header-mark';
  mark.src = 'images/header-mark.png';
  mark.alt = 'Seojin logo';
  homeLink.setAttribute('aria-label', 'Back to home');
  homeLink.replaceChildren(mark);
})();
