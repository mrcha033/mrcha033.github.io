(() => {
  'use strict';
  document.body.classList.remove('no-js');
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  let userPaused = false;
  try { userPaused = localStorage.getItem('yc-motion-paused') === 'true'; } catch {}
  let paused = userPaused || reduce.matches;
  const motionButton = $('.motion-toggle');
  const syncMotion = () => {
    paused = userPaused || reduce.matches;
    document.body.classList.toggle('motion-paused', paused);
    if (motionButton) {
      motionButton.setAttribute('aria-pressed', String(paused));
      motionButton.setAttribute('aria-label', reduce.matches ? 'Reduced motion follows your device setting' : paused ? 'Resume decorative motion' : 'Pause decorative motion');
      $('.motion-label', motionButton).textContent = reduce.matches ? 'Reduced motion' : paused ? 'Resume motion' : 'Pause motion';
      motionButton.disabled = reduce.matches;
    }
  };
  motionButton?.addEventListener('click', () => {
    userPaused = !userPaused;
    try { localStorage.setItem('yc-motion-paused', String(userPaused)); } catch {}
    syncMotion();
  });
  reduce.addEventListener('change', syncMotion);
  syncMotion();

  const menuButton = $('.menu-toggle');
  const navigation = $('#navigation');
  const closeMenu = () => {
    navigation?.classList.remove('open');
    menuButton?.setAttribute('aria-expanded', 'false');
    menuButton?.setAttribute('aria-label', 'Open navigation');
  };
  menuButton?.addEventListener('click', () => {
    const open = menuButton.getAttribute('aria-expanded') !== 'true';
    navigation.classList.toggle('open', open);
    menuButton.setAttribute('aria-expanded', String(open));
    menuButton.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && menuButton?.getAttribute('aria-expanded') === 'true') {
      closeMenu(); menuButton.focus();
    }
  });
  document.addEventListener('click', e => {
    if (!e.target.closest('.site-header')) closeMenu();
  });
  $$('.nav-links a').forEach(a => a.addEventListener('click', closeMenu));
  window.matchMedia('(min-width: 641px)').addEventListener('change', e => { if (e.matches) closeMenu(); });

  // Sections fade in as they arrive.
  if ('IntersectionObserver' in window && !paused) {
    const reveal = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        e.target.classList.add('in');
        reveal.unobserve(e.target);
      });
    }, { threshold: .15 });
    $$('.reveal').forEach(el => {
      // Keep content already on-screen immediately available.
      if (el.getBoundingClientRect().top > window.innerHeight - 30) {
        el.classList.add('ready');
        reveal.observe(el);
      }
    });
  }

  const search = $('#note-search');
  if (search) {
    const cards = $$('.journal-card');
    const filters = $$('.filter');
    let category = 'all';
    const updateNotes = () => {
      const query = search.value.trim().toLocaleLowerCase();
      let count = 0;
      cards.forEach(card => {
        const visible = (category === 'all' || card.dataset.category === category) && card.textContent.toLocaleLowerCase().includes(query);
        card.hidden = !visible;
        if (visible) count++;
      });
      $('#journal-count').textContent = `${count} note${count === 1 ? '' : 's'}`;
      $('#empty-state').hidden = count !== 0;
      filters.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.filter === category)));
    };
    filters.forEach(b => b.addEventListener('click', () => { category = b.dataset.filter; updateNotes(); }));
    search.addEventListener('input', updateNotes);
    $('#reset-search').addEventListener('click', () => { category = 'all'; search.value = ''; updateNotes(); search.focus(); });
  }
  $('#print-cv')?.addEventListener('click', () => window.print());

  // Fig. 1's story: the figure focuses the layer whose description is being read.
  const story = $('.story');
  if (story) {
    const steps = $$('.story-step', story);
    const figure = $('.story-figure', story);
    const narrow = window.matchMedia('(max-width: 52rem)');
    let queued = false;
    const focus = () => {
      queued = false;
      // The reading line sits mid-screen, or low on narrow screens, so a layer comes into focus as
      // its card rises over the figure.
      const line = innerHeight * (narrow.matches ? .85 : .55);
      const read = steps.filter(s => s.getBoundingClientRect().top < line).length;
      if (read) story.dataset.step = read - 1; else delete story.dataset.step;
      // The figure's labels are hidden while a layer is in focus, so take it out of reach.
      figure.inert = read > 0;
    };
    window.addEventListener('scroll', () => { if (!queued) { queued = true; requestAnimationFrame(focus); } }, { passive: true });
    window.addEventListener('resize', focus);
    focus();
  }

  const progress = $('.reading-progress');
  if (progress) {
    let queued = false;
    const update = () => {
      const article = $('.article-body');
      const start = article.getBoundingClientRect().top + window.scrollY - window.innerHeight * .25;
      const end = article.offsetHeight - window.innerHeight * .5;
      const fraction = Math.max(0, Math.min(1, (window.scrollY - start) / Math.max(1, end)));
      progress.style.width = `${fraction * 100}%`;
      queued = false;
    };
    window.addEventListener('scroll', () => { if (!queued) { queued = true; requestAnimationFrame(update); } }, { passive: true });
    window.addEventListener('resize', update);
    update();
  }
})();
