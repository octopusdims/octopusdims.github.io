/* DIMS — quiet editorial interactions */
(function () {
  'use strict';

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const header = document.getElementById('siteHeader');
  const progress = document.getElementById('scrollProgress');
  const shaderScope = document.getElementById('shaderScope');
  const themeToggle = document.getElementById('themeModeToggle');

  function currentMode() {
    return document.documentElement.dataset.heroShaderMode === '0' ? 0 : 1;
  }

  function updateThemeToggle() {
    if (!themeToggle) return;
    const night = currentMode() === 0;
    const label = themeToggle.querySelector('.theme-toggle-label');
    if (label) label.textContent = night ? 'Night' : 'Day';
    themeToggle.setAttribute('aria-label', night ? 'Switch to Day Archive' : 'Switch to Night Archive');
    themeToggle.setAttribute('title', night ? 'Switch to Day Archive' : 'Switch to Night Archive');
  }

  updateThemeToggle();
  themeToggle?.addEventListener('click', () => {
    const next = currentMode() === 0 ? 1 : 0;
    try { localStorage.setItem('dims-color-mode', String(next)); } catch (_) {}
    const target = new URL(window.location.href);
    target.searchParams.delete('shader');
    window.location.assign(target.href);
  });

  function updateChrome() {
    const y = window.scrollY;
    if (header) {
      const threshold = shaderScope
        ? shaderScope.offsetTop + shaderScope.offsetHeight - header.offsetHeight - 24
        : 12;
      header.classList.toggle('scrolled', y > Math.max(12, threshold));
    }
    if (progress) {
      const range = document.documentElement.scrollHeight - window.innerHeight;
      progress.style.width = `${range > 0 ? (y / range) * 100 : 0}%`;
    }
  }
  updateChrome();
  window.addEventListener('scroll', updateChrome, { passive: true });

  /* A short, single reveal: content is readable without JavaScript. */
  const revealItems = document.querySelectorAll('.reveal-on-scroll');
  if (!reducedMotion.matches && 'IntersectionObserver' in window) {
    document.documentElement.classList.add('has-reveal-motion');
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    revealItems.forEach(item => revealObserver.observe(item));
  } else {
    revealItems.forEach(item => item.classList.add('is-visible'));
  }

  /* Mobile navigation */
  const menuButton = document.getElementById('mobileMenuToggle');
  const mobileMenu = document.getElementById('mobileMenu');
  function setMenu(open) {
    if (!menuButton || !mobileMenu) return;
    mobileMenu.classList.toggle('open', open);
    menuButton.classList.toggle('open', open);
    menuButton.setAttribute('aria-expanded', String(open));
    menuButton.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    mobileMenu.setAttribute('aria-hidden', String(!open));
    document.body.classList.toggle('menu-open', open);
  }
  if (menuButton && mobileMenu) {
    menuButton.addEventListener('click', () => setMenu(!mobileMenu.classList.contains('open')));
    mobileMenu.querySelectorAll('a').forEach(link => link.addEventListener('click', () => setMenu(false)));
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') setMenu(false);
    });
  }

  /* Search overlay */
  const searchToggle = document.getElementById('searchToggle');
  let searchData = null;
  let searchOverlay = null;

  function escapeHtml(value) {
    const span = document.createElement('span');
    span.textContent = value || '';
    return span.innerHTML;
  }

  async function loadSearchData() {
    if (searchData) return searchData;
    try {
      const response = await fetch('/search.json');
      if (!response.ok) throw new Error('Search index unavailable');
      searchData = await response.json();
    } catch (_) {
      searchData = [];
    }
    return searchData;
  }

  function renderSearch(query, resultsNode) {
    const q = query.trim().toLowerCase();
    if (!q) {
      resultsNode.innerHTML = '<p class="search-empty">Enter a title, tag or phrase.</p>';
      return;
    }
    const matches = (searchData || []).filter(item =>
      (item.title || '').toLowerCase().includes(q) ||
      (item.content || '').toLowerCase().includes(q) ||
      (item.tags || []).some(tag => tag.toLowerCase().includes(q))
    ).slice(0, 10);
    resultsNode.innerHTML = matches.length ? matches.map(item => `
      <a href="${escapeHtml(item.permalink)}" class="search-result-item">
        <span class="search-result-title">${escapeHtml(item.title)}</span>
        <span class="search-result-meta">${escapeHtml(item.date || '')}</span>
      </a>`).join('') : '<p class="search-empty">No matching entries.</p>';
  }

  function closeSearch() {
    if (!searchOverlay) return;
    searchOverlay.classList.remove('active');
    document.body.classList.remove('search-open');
    searchToggle?.focus();
  }

  async function openSearch() {
    if (!searchOverlay) {
      searchOverlay = document.createElement('div');
      searchOverlay.className = 'search-overlay';
      searchOverlay.setAttribute('role', 'dialog');
      searchOverlay.setAttribute('aria-modal', 'true');
      searchOverlay.setAttribute('aria-label', 'Search archive');
      searchOverlay.innerHTML = `
        <div class="search-panel">
          <div class="search-input-wrap">
            <label for="archiveSearch">Search archive</label>
            <button class="search-close" type="button" aria-label="Close search">Close</button>
            <input id="archiveSearch" type="search" class="search-input" placeholder="Type to search…" autocomplete="off">
          </div>
          <div class="search-results" aria-live="polite"><p class="search-empty">Enter a title, tag or phrase.</p></div>
        </div>`;
      document.body.appendChild(searchOverlay);
      const input = searchOverlay.querySelector('.search-input');
      const results = searchOverlay.querySelector('.search-results');
      let timer;
      input.addEventListener('input', event => {
        clearTimeout(timer);
        timer = setTimeout(() => renderSearch(event.target.value, results), 120);
      });
      searchOverlay.querySelector('.search-close').addEventListener('click', closeSearch);
      searchOverlay.addEventListener('click', event => {
        if (event.target === searchOverlay) closeSearch();
      });
    }
    searchOverlay.classList.add('active');
    document.body.classList.add('search-open');
    await loadSearchData();
    searchOverlay.querySelector('input').focus();
  }
  searchToggle?.addEventListener('click', openSearch);
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && searchOverlay?.classList.contains('active')) closeSearch();
  });

  /* Native heading observer for the table of contents. */
  const tocLinks = [...document.querySelectorAll('.toc-nav a')];
  const headings = [...document.querySelectorAll('.post-content h2[id], .post-content h3[id]')];
  if (tocLinks.length && headings.length && 'IntersectionObserver' in window) {
    const tocObserver = new IntersectionObserver(entries => {
      const current = entries.filter(entry => entry.isIntersecting).at(-1);
      if (!current) return;
      tocLinks.forEach(link => link.classList.toggle('active', link.hash === `#${current.target.id}`));
    }, { rootMargin: '-18% 0px -68% 0px', threshold: 0 });
    headings.forEach(heading => tocObserver.observe(heading));
  }

  /* Code copy buttons */
  document.querySelectorAll('.post-content .highlight, .post-content pre:not(.highlight pre)').forEach(block => {
    if (block.querySelector('.code-copy-btn')) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'code-copy-btn';
    button.textContent = 'Copy';
    button.addEventListener('click', async () => {
      const code = block.querySelector('code');
      try {
        await navigator.clipboard.writeText(code ? code.textContent : block.textContent);
        button.textContent = 'Copied';
      } catch (_) {
        button.textContent = 'Failed';
      }
      setTimeout(() => { button.textContent = 'Copy'; }, 1600);
    });
    block.appendChild(button);
  });

  /* KaTeX fallback for inline delimiters used by existing entries. */
  window.addEventListener('load', () => {
    if (typeof katex === 'undefined') return;
    document.querySelectorAll('.post-content p, .post-content li, .post-content td, .post-content th').forEach(element => {
      let html = element.innerHTML;
      if (!html.includes('$')) return;
      html = html.replace(/\$\$([\s\S]*?)\$\$/g, (match, tex) => {
        try { return katex.renderToString(tex.trim(), { throwOnError: false, displayMode: true }); } catch (_) { return match; }
      });
      html = html.replace(/(?<!\$)\$([^\$\s][^\$]*?)\$(?!\$)/g, (match, tex) => {
        try { return katex.renderToString(tex.trim(), { throwOnError: false }); } catch (_) { return match; }
      });
      element.innerHTML = html;
    });
  });
})();
