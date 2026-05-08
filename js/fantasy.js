/* ============================================
   FANTASY THEME — Interactions & Animations
   ============================================ */

(function() {
  'use strict';

  window.addEventListener('load', () => {
    /* KaTeX rendering */
    if (typeof katex === 'undefined') return;

    const mathElements = document.querySelectorAll('.post-content p, .post-content li, .post-content td, .post-content th');
    mathElements.forEach(el => {
      let html = el.innerHTML;
      if (!html.includes('$$') && !html.includes('$')) return;

      /* Display math: $$...$$ */
      html = html.replace(/\$\$([\s\S]*?)\$\$/g, (match, tex) => {
        try {
          return katex.renderToString(tex.trim(), {throwOnError: false, displayMode: true});
        } catch (e) {
          return match;
        }
      });

      /* Inline math: $...$ (not $$) */
      html = html.replace(/(?<!\$)\$([^\$\s][^\$]*?)\$(?!\$)/g, (match, tex) => {
        try {
          return katex.renderToString(tex.trim(), {throwOnError: false, displayMode: false});
        } catch (e) {
          return match;
        }
      });

      el.innerHTML = html;
    });
  });

  /* ── Scroll Progress ── */
  const scrollProgress = document.getElementById('scrollProgress');
  function updateScrollProgress() {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
    if (scrollProgress) scrollProgress.style.width = progress + '%';
  }
  window.addEventListener('scroll', updateScrollProgress, { passive: true });

  /* ── Header Scroll Effect ── */
  const header = document.getElementById('siteHeader');
  function updateHeader() {
    if (!header) return;
    if (window.scrollY > 50) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  }
  window.addEventListener('scroll', updateHeader, { passive: true });

  /* ── Custom Cursor ── */
  const cursor = document.getElementById('customCursor');
  if (cursor && window.matchMedia('(pointer: fine)').matches) {
    let mouseX = 0, mouseY = 0;
    let cursorX = 0, cursorY = 0;

    document.addEventListener('mousemove', (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    });

    function animateCursor() {
      cursorX += (mouseX - cursorX) * 0.15;
      cursorY += (mouseY - cursorY) * 0.15;
      cursor.style.left = cursorX + 'px';
      cursor.style.top = cursorY + 'px';
      requestAnimationFrame(animateCursor);
    }
    animateCursor();

    const hoverTargets = document.querySelectorAll('a, button, .post-card, .gallery-item');
    hoverTargets.forEach(el => {
      el.addEventListener('mouseenter', () => cursor.classList.add('expanded'));
      el.addEventListener('mouseleave', () => cursor.classList.remove('expanded'));
    });
  }

  /* ── GSAP ScrollTrigger Reveals ── */
  if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
    gsap.registerPlugin(ScrollTrigger);

    /* Hero parallax fade */
    const heroSection = document.getElementById('heroSection');
    const heroContent = document.querySelector('.hero-content');
    if (heroSection && heroContent) {
      gsap.to(heroContent, {
        y: -80,
        opacity: 0,
        scale: 0.95,
        ease: 'none',
        scrollTrigger: {
          trigger: heroSection,
          start: 'top top',
          end: 'bottom top',
          scrub: true
        }
      });
    }

    /* Reveal fade-up elements */
    const revealElements = document.querySelectorAll('.reveal-fade-up, .post-card, .moment-card, .gallery-item');
    revealElements.forEach((el, i) => {
      gsap.fromTo(el,
        { opacity: 0, y: 50 },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: el,
            start: 'top 85%',
            toggleActions: 'play none none none'
          },
          delay: i % 3 * 0.1
        }
      );
    });

    /* Featured post parallax */
    const featuredImage = document.querySelector('.featured-post-image img');
    if (featuredImage) {
      gsap.to(featuredImage, {
        y: -30,
        ease: 'none',
        scrollTrigger: {
          trigger: '.featured-post',
          start: 'top bottom',
          end: 'bottom top',
          scrub: true
        }
      });
    }

    /* Section title reveals */
    const sectionTitles = document.querySelectorAll('.section-header');
    sectionTitles.forEach(el => {
      gsap.fromTo(el,
        { opacity: 0, x: -20 },
        {
          opacity: 1,
          x: 0,
          duration: 0.6,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: el,
            start: 'top 85%',
            toggleActions: 'play none none none'
          }
        }
      );
    });
  }

  /* ── Mobile Menu ── */
  const mobileToggle = document.getElementById('mobileMenuToggle');
  const mobileMenu = document.getElementById('mobileMenu');
  if (mobileToggle && mobileMenu) {
    mobileToggle.addEventListener('click', () => {
      mobileMenu.classList.toggle('open');
      const spans = mobileToggle.querySelectorAll('span');
      if (mobileMenu.classList.contains('open')) {
        spans[0].style.transform = 'rotate(45deg) translate(4px, 4px)';
        spans[1].style.opacity = '0';
        spans[2].style.transform = 'rotate(-45deg) translate(4px, -4px)';
      } else {
        spans[0].style.transform = '';
        spans[1].style.opacity = '';
        spans[2].style.transform = '';
      }
    });

    mobileMenu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        mobileMenu.classList.remove('open');
        const spans = mobileToggle.querySelectorAll('span');
        spans[0].style.transform = '';
        spans[1].style.opacity = '';
        spans[2].style.transform = '';
      });
    });
  }

  /* ── Search Overlay ── */
  const searchToggle = document.getElementById('searchToggle');
  if (searchToggle) {
    let searchOverlay = null;
    let searchInput = null;
    let searchResults = null;

    function createSearchOverlay() {
      searchOverlay = document.createElement('div');
      searchOverlay.className = 'search-overlay';
      searchOverlay.innerHTML = `
        <div class="search-input-wrap">
          <input type="text" class="search-input" placeholder="Search the archive..." autocomplete="off">
          <button class="search-close">&times;</button>
        </div>
        <div class="search-results"></div>
      `;
      document.body.appendChild(searchOverlay);
      searchInput = searchOverlay.querySelector('.search-input');
      searchResults = searchOverlay.querySelector('.search-results');

      searchOverlay.querySelector('.search-close').addEventListener('click', closeSearch);
      searchOverlay.addEventListener('click', (e) => {
        if (e.target === searchOverlay) closeSearch();
      });
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeSearch();
      });

      /* Fetch search index */
      fetch('/search.json')
        .then(r => r.json())
        .then(data => {
          window.searchData = data;
        })
        .catch(() => {});

      /* Debounced search */
      let debounceTimer;
      searchInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => performSearch(e.target.value), 200);
      });
    }

    function performSearch(query) {
      if (!window.searchData || !query.trim()) {
        searchResults.innerHTML = '';
        return;
      }
      const q = query.toLowerCase();
      const results = window.searchData.filter(item => {
        return (item.title && item.title.toLowerCase().includes(q)) ||
               (item.content && item.content.toLowerCase().includes(q)) ||
               (item.tags && item.tags.some(t => t.toLowerCase().includes(q)));
      }).slice(0, 10);

      if (results.length === 0) {
        searchResults.innerHTML = '<div style="color: var(--gold-dim); text-align: center; padding: 2rem;">No spells found.</div>';
        return;
      }

      searchResults.innerHTML = results.map(r => `
        <a href="${r.permalink}" class="search-result-item" onclick="closeSearch()">
          <div class="search-result-title">${highlight(r.title, q)}</div>
          <div class="search-result-meta">${r.date || ''} ${r.tags ? '· ' + r.tags.slice(0, 3).join(', ') : ''}</div>
        </a>
      `).join('');
    }

    function highlight(text, query) {
      if (!text) return '';
      const regex = new RegExp('(' + query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
      return text.replace(regex, '<mark style="background: rgba(201,169,110,0.3); color: var(--ivory);">$1</mark>');
    }

    function openSearch() {
      if (!searchOverlay) createSearchOverlay();
      searchOverlay.classList.add('active');
      document.body.style.overflow = 'hidden';
      setTimeout(() => searchInput.focus(), 100);
    }

    function closeSearch() {
      if (searchOverlay) {
        searchOverlay.classList.remove('active');
        document.body.style.overflow = '';
      }
    }
    window.closeSearch = closeSearch;

    searchToggle.addEventListener('click', openSearch);
  }

  /* ── TOC Active State ── */
  const tocLinks = document.querySelectorAll('.toc-nav a');
  if (tocLinks.length > 0 && typeof gsap !== 'undefined') {
    const headings = document.querySelectorAll('.post-content h2, .post-content h3');
    headings.forEach(heading => {
      ScrollTrigger.create({
        trigger: heading,
        start: 'top 30%',
        end: 'bottom 30%',
        onEnter: () => setActiveToc(heading.id),
        onEnterBack: () => setActiveToc(heading.id)
      });
    });

    function setActiveToc(id) {
      tocLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === '#' + id) {
          link.classList.add('active');
        }
      });
    }
  }

  /* ── Code Copy Buttons ── */
  function initCodeCopyButtons() {
    const blocks = [];
    document.querySelectorAll('.post-content .highlight').forEach(h => {
      const code = h.querySelector('code[data-lang]');
      if (code && !h.hasAttribute('data-lang')) {
        h.setAttribute('data-lang', code.getAttribute('data-lang'));
      }
      blocks.push(h);
    });
    document.querySelectorAll('.post-content pre:not(.highlight pre)').forEach(p => {
      const code = p.querySelector('code[data-lang]');
      if (code && !p.hasAttribute('data-lang')) {
        p.setAttribute('data-lang', code.getAttribute('data-lang'));
      }
      blocks.push(p);
    });
    blocks.forEach(block => {
      const btn = document.createElement('button');
      btn.className = 'code-copy-btn';
      btn.textContent = 'Copy';
      btn.setAttribute('aria-label', 'Copy code to clipboard');
      btn.addEventListener('click', async () => {
        const code = block.querySelector('code');
        const text = code ? code.textContent : block.textContent;
        try {
          await navigator.clipboard.writeText(text);
          btn.textContent = 'Copied';
          btn.classList.add('copied');
          setTimeout(() => {
            btn.textContent = 'Copy';
            btn.classList.remove('copied');
          }, 2000);
        } catch (err) {
          btn.textContent = 'Failed';
          setTimeout(() => { btn.textContent = 'Copy'; }, 2000);
        }
      });
      block.appendChild(btn);
    });
  }
  initCodeCopyButtons();

  /* ── Dust Particles ── */
  function createDustParticles() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const container = document.body;
    for (let i = 0; i < 15; i++) {
      const particle = document.createElement('div');
      particle.className = 'dust-particle';
      particle.style.left = Math.random() * 100 + 'vw';
      particle.style.top = Math.random() * 100 + 'vh';
      particle.style.animationDelay = Math.random() * 8 + 's';
      particle.style.animationDuration = (6 + Math.random() * 6) + 's';
      const size = 1 + Math.random() * 2;
      particle.style.width = size + 'px';
      particle.style.height = size + 'px';
      container.appendChild(particle);
    }
  }
  createDustParticles();

  /* ── Back to Top ── */
  const backToTop = document.querySelector('.back-to-top');
  if (backToTop) {
    window.addEventListener('scroll', () => {
      backToTop.classList.toggle('visible', window.scrollY > 500);
    }, { passive: true });
    backToTop.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

})();
