// Razor Docs — Vanilla TypeScript docs app
// No framework. All content driven by /public/content.json.

interface Article {
  title: string;
  summary: string;
  example: string;
}

interface ContentData {
  phishing: Article[];
  security: Article[];
  hacking: Article[];
}

type SectionKey = keyof ContentData;

interface RouteState {
  section: SectionKey;
  index: number;
}

// Lucide icons (MIT licensed, 24×24 stroke-based)
const ICON_PHISHING = `<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
  <line x1="12" y1="9" x2="12" y2="13"/>
  <line x1="12" y1="17" x2="12.01" y2="17"/>
</svg>`;

const ICON_SECURITY = `<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  <polyline points="9 12 11 14 15 10"/>
</svg>`;

const ICON_HACKING = `<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <polyline points="4 17 10 11 4 5"/>
  <line x1="12" y1="19" x2="20" y2="19"/>
</svg>`;

const ICON_CHEVRON = `<svg class="nav-chevron-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <polyline points="6 9 12 15 18 9"/>
</svg>`;

const SECTIONS: Record<SectionKey, { label: string; iconSvg: string }> = {
  phishing: { label: 'Phishing Awareness',           iconSvg: ICON_PHISHING },
  security: { label: 'Account Security',             iconSvg: ICON_SECURITY },
  hacking:  { label: 'Cara Peretas Hack Akun Mu',   iconSvg: ICON_HACKING  },
};

let contentData: ContentData | null = null;

// ─── DOM helpers ─────────────────────────────────────────────────────────────

function el<T extends HTMLElement>(id: string): T {
  const e = document.getElementById(id);
  if (!e) throw new Error(`#${id} not found`);
  return e as T;
}

function qsa<T extends Element>(sel: string, root: Element | Document = document): T[] {
  return Array.from(root.querySelectorAll<T>(sel));
}

// ─── Hash routing ─────────────────────────────────────────────────────────────

function parseHash(): RouteState {
  const hash = window.location.hash.slice(1);
  if (!hash) return { section: 'phishing', index: 0 };
  const [sectionRaw, indexRaw] = hash.split('-');
  const section = sectionRaw as SectionKey;
  const index   = parseInt(indexRaw ?? '0', 10);
  if (!contentData || !(section in contentData)) return { section: 'phishing', index: 0 };
  const safeIdx = Number.isNaN(index) ? 0 : Math.max(0, Math.min(index, contentData[section].length - 1));
  return { section, index: safeIdx };
}

function buildHash(section: SectionKey, index: number): string {
  return `#${section}-${index}`;
}

function navigate(section: SectionKey, index: number): void {
  window.location.hash = buildHash(section, index);
}

// ─── Sidebar rendering ────────────────────────────────────────────────────────

function renderSidebar(data: ContentData): void {
  const nav = el('sidebar-nav');
  nav.innerHTML = '';

  (Object.keys(SECTIONS) as SectionKey[]).forEach((sectionKey, sectionIdx) => {
    const articles = data[sectionKey];
    const { label, iconSvg } = SECTIONS[sectionKey];

    const section = document.createElement('div');
    section.className = 'nav-section';
    section.dataset.section = sectionKey;

    const header = document.createElement('button');
    header.className = 'nav-section-header';
    header.dataset.section = sectionKey;
    header.setAttribute('aria-expanded', 'false');
    header.style.animationDelay = `${sectionIdx * 60}ms`;
    header.innerHTML = `
      <span class="nav-icon-wrap">${iconSvg}</span>
      <span class="nav-section-label">${label}</span>
      ${ICON_CHEVRON}
    `;
    header.addEventListener('click', () => {
      if (!contentData) return;
      // Navigate to first article in section but keep sidebar OPEN
      // so the user can browse article links without reopening.
      // Sidebar closes only when an article link is tapped, or via the
      // X button / overlay tap.
      navigate(sectionKey, 0);
    });

    // CSS grid trick — smooth accordion without max-height snap
    const articleList = document.createElement('div');
    articleList.className = 'nav-articles';
    articleList.id = `nav-articles-${sectionKey}`;

    const inner = document.createElement('div');
    inner.className = 'nav-articles-inner';

    articles.forEach((article, idx) => {
      const link = document.createElement('a');
      link.href     = buildHash(sectionKey, idx);
      link.className = 'nav-article-link';
      link.dataset.section = sectionKey;
      link.dataset.index   = String(idx);
      link.textContent     = article.title;
      link.title           = article.title;
      link.addEventListener('click', (e) => {
        e.preventDefault();
        navigate(sectionKey, idx);
        closeMobileSidebar();
      });
      inner.appendChild(link);
    });

    articleList.appendChild(inner);
    section.appendChild(header);
    section.appendChild(articleList);
    nav.appendChild(section);
  });
}

// ─── Active state ─────────────────────────────────────────────────────────────

function updateActiveStates(route: RouteState): void {
  const { section, index } = route;

  qsa<HTMLButtonElement>('.nav-section-header').forEach((btn) => {
    const active = btn.dataset.section === section;
    btn.classList.toggle('section-active', active);
    btn.setAttribute('aria-expanded', String(active));
  });

  qsa<HTMLDivElement>('.nav-articles').forEach((list) => {
    list.classList.toggle('expanded', list.id === `nav-articles-${section}`);
  });

  qsa<HTMLAnchorElement>('.nav-article-link').forEach((link) => {
    link.classList.toggle('active',
      link.dataset.section === section && Number(link.dataset.index) === index);
  });
}

// ─── Article rendering ────────────────────────────────────────────────────────

function renderArticle(route: RouteState): void {
  if (!contentData) return;
  const { section, index } = route;
  const article = contentData[section][index];
  if (!article) return;

  const { label } = SECTIONS[section];

  el('article-breadcrumb').innerHTML = `
    <span class="breadcrumb-section">${label}</span>
    <span class="breadcrumb-sep">›</span>
    <span>${article.title}</span>
  `;

  el('article-title').textContent = article.title;

  el('article-body').innerHTML = `
    <div class="content-card summary-card">
      <div class="card-label">Ringkasan</div>
      <p class="summary-text">${article.summary}</p>
    </div>
    <div class="content-card example-card">
      <div class="card-label">Contoh Nyata</div>
      <div class="example-body">${article.example}</div>
    </div>
  `;

  renderNavFooter(section, index);

  el('loading-state').style.display = 'none';

  const view = el('article-view');
  view.classList.remove('hidden');
  view.style.animation = 'none';
  void view.offsetWidth;
  view.style.animation = '';

  window.scrollTo({ top: 0, behavior: 'instant' });
  el('content-main').scrollTo({ top: 0, behavior: 'instant' });
}

interface FlatArticle { section: SectionKey; index: number; title: string; }

function getAllFlat(): FlatArticle[] {
  if (!contentData) return [];
  const out: FlatArticle[] = [];
  (Object.keys(SECTIONS) as SectionKey[]).forEach((k) =>
    contentData![k].forEach((a, i) => out.push({ section: k, index: i, title: a.title })));
  return out;
}

function renderNavFooter(section: SectionKey, index: number): void {
  if (!contentData) return;
  const footer = el('article-nav-footer');
  footer.innerHTML = '';
  const all = getAllFlat();
  const cur = all.findIndex((a) => a.section === section && a.index === index);
  if (cur === -1) return;

  if (cur > 0) {
    const prev = all[cur - 1];
    const btn  = document.createElement('a');
    btn.href      = buildHash(prev.section, prev.index);
    btn.className = 'nav-btn prev';
    btn.innerHTML = `<span class="nav-btn-arrow">←</span><span class="nav-btn-content"><span class="nav-btn-label">Sebelumnya</span><span class="nav-btn-title">${prev.title}</span></span>`;
    btn.addEventListener('click', (e) => { e.preventDefault(); navigate(prev.section, prev.index); });
    footer.appendChild(btn);
  } else {
    footer.appendChild(document.createElement('div'));
  }

  if (cur < all.length - 1) {
    const next = all[cur + 1];
    const btn  = document.createElement('a');
    btn.href      = buildHash(next.section, next.index);
    btn.className = 'nav-btn next';
    btn.innerHTML = `<span class="nav-btn-content"><span class="nav-btn-label">Berikutnya</span><span class="nav-btn-title">${next.title}</span></span><span class="nav-btn-arrow">→</span>`;
    btn.addEventListener('click', (e) => { e.preventDefault(); navigate(next.section, next.index); });
    footer.appendChild(btn);
  }
}

// ─── Mobile sidebar — overlay controlled by JS only ──────────────────────────

function openMobileSidebar(): void {
  const overlay = el('overlay');
  const sidebar = el('sidebar');

  // Ensure pointer-events:none while opacity is still 0 — the CSS rule handles
  // this globally, but we defensively set it inline here too so no browser
  // quirk can override it during the display:none → display:block transition.
  overlay.style.pointerEvents = 'none';
  overlay.style.display = 'block';
  document.body.classList.add('sidebar-open');
  document.body.style.overflow = 'hidden';

  // Two rAF frames so the browser has painted display:block before we
  // start the opacity transition. pointer-events flips to 'auto' the moment
  // .visible is added (via the CSS rule above), not before.
  requestAnimationFrame(() => requestAnimationFrame(() => {
    sidebar.classList.add('open');
    overlay.classList.add('visible');
    // Remove inline override — the CSS .overlay.visible rule takes over
    overlay.style.removeProperty('pointer-events');
  }));
}

function closeMobileSidebar(): void {
  const overlay = el('overlay');
  const sidebar = el('sidebar');

  sidebar.classList.remove('open');
  overlay.classList.remove('visible');
  // pointer-events falls back to 'none' (CSS default) the instant .visible
  // is removed — so clicks are unblocked immediately, even mid-fade-out.
  document.body.classList.remove('sidebar-open');
  document.body.style.removeProperty('overflow');

  // Remove from DOM after fade-out — prevents stacking context bleed.
  // Fallback timeout covers cases where transitionend never fires.
  let settled = false;
  const hide = () => {
    if (settled) return;
    settled = true;
    overlay.style.display = 'none';
    overlay.style.removeProperty('pointer-events'); // clean up any inline override
  };
  overlay.addEventListener('transitionend', hide, { once: true });
  setTimeout(hide, 400);
}

function setupMobileMenu(): void {
  // Close button inside sidebar
  const closeBtn = document.getElementById('sidebar-close');
  if (closeBtn) closeBtn.addEventListener('click', closeMobileSidebar);

  el('hamburger').addEventListener('click', () => {
    el('sidebar').classList.contains('open') ? closeMobileSidebar() : openMobileSidebar();
  });

  // Overlay tap closes sidebar — guard with target check so events that
  // bubble up from sidebar children never accidentally trigger this.
  el('overlay').addEventListener('pointerdown', (e) => {
    if (e.target === el('overlay')) closeMobileSidebar();
  });

  // Clear scroll-lock on resize to desktop
  let wasMobile = window.innerWidth <= 768;
  window.addEventListener('resize', () => {
    const isMobile = window.innerWidth <= 768;
    if (wasMobile && !isMobile) closeMobileSidebar();
    wasMobile = isMobile;
  });
}

// ─── Router ───────────────────────────────────────────────────────────────────

function handleRoute(): void {
  const route = parseHash();
  updateActiveStates(route);
  renderArticle(route);
}

// ─── Init ─────────────────────────────────────────────────────────────────────

async function init(): Promise<void> {
  setupMobileMenu();

  const base = import.meta.env.BASE_URL;
  const url  = `${base}content.json`.replace('//', '/');

  let data: ContentData;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    data = await res.json() as ContentData;
  } catch (err) {
    el('loading-state').innerHTML = `
      <div style="text-align:center;padding:32px;color:var(--accent-red)">
        <svg style="width:40px;height:40px;margin-bottom:12px;stroke:var(--accent-red)" viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
        <strong>Gagal memuat konten</strong><br>
        <span style="color:var(--text-muted)">Coba refresh halaman.</span>
      </div>`;
    console.error('content.json load error:', err);
    return;
  }

  contentData = data;
  renderSidebar(data);
  handleRoute();

  window.addEventListener('hashchange', handleRoute);
  if (!window.location.hash) window.history.replaceState(null, '', buildHash('phishing', 0));
}

init();
