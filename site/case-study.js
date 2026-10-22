(() => {
  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const menu = $('.menu-button');
  const links = $('#project-links');
  const closeMenu = () => {
    menu.setAttribute('aria-expanded', 'false');
    menu.setAttribute('aria-label', 'Open project navigation');
    links.classList.remove('open');
  };
  menu.addEventListener('click', () => {
    const open = menu.getAttribute('aria-expanded') !== 'true';
    menu.setAttribute('aria-expanded', String(open));
    menu.setAttribute('aria-label', open ? 'Close project navigation' : 'Open project navigation');
    links.classList.toggle('open', open);
  });
  links.addEventListener('click', event => { if (event.target.closest('a')) closeMenu(); });
  document.addEventListener('click', event => { if (!event.target.closest('.floating-nav')) closeMenu(); });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && links.classList.contains('open')) { closeMenu(); menu.focus(); }
  });

  // The same actual prototype recordings appear in the deck and case study.
  // Reduced motion and an explicit pause always take priority over autoplay.
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const films = $$('.feature-film');
  const visible = new Set();
  const manuallyPaused = new Set();
  function updateVideoControl(video) {
    const button = video.closest('.hero-center,figure').querySelector('.motion-toggle');
    const action = video.paused ? 'Play' : 'Pause';
    button.textContent = `${action} motion`;
    button.setAttribute('aria-label', `${action} animation`);
    button.setAttribute('aria-pressed', String(video.paused));
  }
  function playFilm(video) { video.play().catch(() => updateVideoControl(video)); }
  const observer = new IntersectionObserver(entries => {
    entries.forEach(({ target: video, isIntersecting }) => {
      if (isIntersecting) {
        visible.add(video);
        if (!reducedMotion.matches && !manuallyPaused.has(video) && !document.hidden) playFilm(video);
      } else { visible.delete(video); video.pause(); }
    });
  }, { threshold: .35 });
  films.forEach(video => {
    video.controls = false;
    const button = video.closest('.hero-center,figure').querySelector('.motion-toggle');
    button.addEventListener('click', () => {
      if (video.paused) { manuallyPaused.delete(video); playFilm(video); }
      else { manuallyPaused.add(video); video.pause(); }
    });
    video.addEventListener('play', () => updateVideoControl(video));
    video.addEventListener('pause', () => updateVideoControl(video));
    video.addEventListener('error', () => {
      button.textContent = 'Open live prototype ↗';
      button.onclick = () => { location.hash = 'demo'; };
    });
    updateVideoControl(video);
    observer.observe(video);
  });
  reducedMotion.addEventListener('change', () => {
    films.forEach(video => {
      if (reducedMotion.matches) video.pause();
      else if (visible.has(video) && !manuallyPaused.has(video)) playFilm(video);
    });
  });
  document.addEventListener('visibilitychange', () => {
    films.forEach(video => {
      if (document.hidden) video.pause();
      else if (visible.has(video) && !manuallyPaused.has(video) && !reducedMotion.matches) playFilm(video);
    });
  });

  const host = new URL('./demo/', document.baseURI).href;
  const descriptions = {
    studio: 'Explore poses, nail colors, shapes, and details. Select “View on my hand” to continue to try-on.',
    moments: 'Browse the sample photo history, move along the timeline, and open a memory.',
    saved: 'Browse My library and Explore. Upload a personal photo or keep an inspiration reference.',
  };
  const titles = { studio: 'Studio', moments: 'Moments', saved: 'Saved' };
  const shell = $('#demo-shell');
  const placeholder = $('#demo-placeholder');
  let frame = null;
  let activeEntry = 'studio';
  function launch(screen = 'studio') {
    if (!Object.hasOwn(descriptions, screen)) return;
    activeEntry = screen;
    if (frame) frame.remove();
    frame = document.createElement('iframe');
    frame.title = `Nail the Moment desktop simulator, starting in ${titles[screen]}`;
    frame.allow = 'camera; clipboard-write; fullscreen';
    frame.referrerPolicy = 'strict-origin-when-cross-origin';
    const url = new URL(host);
    url.searchParams.set('phone', '0');
    url.searchParams.set('demo', '1');
    url.searchParams.set('screen', screen);
    frame.src = url.href;
    $('#desktop-separate').href = url.href;
    $('[data-current-screen]').textContent = `Opening ${titles[screen]}…`;
    $('[data-feature-description]').textContent = descriptions[screen];
    frame.addEventListener('load', () => {
      $('[data-current-screen]').textContent = `Started in ${titles[screen]}. Explore freely.`;
    }, { once: true });
    shell.replaceChildren(frame);
    $('#close-demo').hidden = false;
    $('#reload-demo').hidden = false;
    $$('[data-feature]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.feature === screen)));
  }
  function closeDemo() {
    frame?.remove();
    frame = null;
    shell.replaceChildren(placeholder);
    $('#close-demo').hidden = true;
    $('#reload-demo').hidden = true;
    $('[data-current-screen]').textContent = 'Ready when you are.';
    $('[data-feature-description]').textContent = 'Launch a screen to explore. Camera access is requested only when you choose live try-on.';
    $$('[data-feature]').forEach(button => button.setAttribute('aria-pressed', 'false'));
  }
  $('#load-demo').addEventListener('click', () => launch(activeEntry));
  $('#desktop-demo').addEventListener('click', () => launch(activeEntry));
  $('#close-demo').addEventListener('click', () => { closeDemo(); $('#load-demo').focus(); });
  $('#reload-demo').addEventListener('click', () => launch(activeEntry));
  $$('[data-feature]').forEach(button => button.addEventListener('click', () => launch(button.dataset.feature)));
  $$('[data-open-demo]').forEach(link => link.addEventListener('click', () => launch(link.dataset.openDemo)));

  const phoneDialog = $('#phone-dialog');
  function openPhoneDialog() {
    const screen = activeEntry;
    $('#phone-qr').src = `project-assets/qr/phone-${screen}.png`;
    $('#phone-qr').alt = `QR code to open ${titles[screen]} on your phone`;
    $('#phone-entry').textContent = `Opens ${titles[screen]}`;
    const url = new URL(host);
    url.searchParams.set('phone', '1');
    url.searchParams.set('demo', '1');
    url.searchParams.set('screen', screen);
    $('#phone-direct').href = url.href;
    phoneDialog.showModal();
    document.documentElement.classList.add('phone-dialog-open');
  }
  $$('[data-phone-demo]').forEach(button => button.addEventListener('click', openPhoneDialog));
  $('#close-phone-dialog').addEventListener('click', () => phoneDialog.close());
  phoneDialog.addEventListener('close', () => document.documentElement.classList.remove('phone-dialog-open'));
  phoneDialog.addEventListener('click', event => {
    if (event.target !== phoneDialog) return;
    const rect = phoneDialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) phoneDialog.close();
  });

  let ticking = false;
  function updateChapter() {
    const candidates = [...links.querySelectorAll('a[href^="#"]')];
    let current = null;
    for (const link of candidates) if ($(link.hash)?.getBoundingClientRect().top <= 180) current = link;
    candidates.forEach(link => {
      if (link === current) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
    ticking = false;
  }
  window.addEventListener('scroll', () => {
    if (!ticking) { ticking = true; requestAnimationFrame(updateChapter); }
  }, { passive: true });
  updateChapter();
})();
