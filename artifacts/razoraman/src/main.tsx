interface Article {
  title: string;
  summary: string;
  example: string;
}

interface ContentData {
  phishing: Article[];
  security: Article[];
}

type SectionKey = keyof ContentData;

interface RouteState {
  section: SectionKey;
  index: number;
}

const ICON_PHISHING = `<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
  <line x1="12" y1="9" x2="12" y2="13"/>
  <line x1="12" y1="17" x2="12.01" y2="17"/>
</svg>`;

const ICON_SECURITY = `<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  <polyline points="9 12 11 14 15 10"/>
</svg>`;

const ICON_CHEVRON = `<svg class="nav-chevron-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <polyline points="6 9 12 15 18 9"/>
</svg>`;

const SECTIONS: Record<SectionKey, { label: string; iconSvg: string }> = {
  phishing: { label: 'Phishing Awareness', iconSvg: ICON_PHISHING },
  security: { label: 'Account Security', iconSvg: ICON_SECURITY },
};

const MOBILE_BREAKPOINT = 768;
const SIDEBAR_CLOSE_FALLBACK_MS = 400;

let contentData: ContentData | null = null;

function el<T extends HTMLElement>(id: string): T {
  const e = document.getElementById(id);
  if (!e) throw new Error(`#${id} not found`);
  return e as T;
}

function qsa<T extends Element>(sel: string, root: Element | Document = document): T[] {
  return Array.from(root.querySelectorAll<T>(sel));
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(value, max));
}

function isSectionKey(value: string): value is SectionKey {
  return value === 'phishing' || value === 'security';
}

function parseHash(): RouteState {
  const hash = window.location.hash.slice(1);
  if (!hash || !contentData) return { section: 'phishing', index: 0 };

  const [sectionRaw, indexRaw] = hash.split('-');
  if (!isSectionKey(sectionRaw)) return { section: 'phishing', index: 0 };

  const articles = contentData[sectionRaw];
  if (!articles.length) return { section: sectionRaw, index: 0 };

  const parsedIndex = parseInt(indexRaw ?? '0', 10);
  const safeIndex = Number.isNaN(parsedIndex) ? 0 : clamp(parsedIndex, 0, articles.length - 1);
  return { section: sectionRaw, index: safeIndex };
}

function buildHash(section: SectionKey, index: number): string {
  return `#${section}-${index}`;
}

function navigate(section: SectionKey, index: number): void {
  window.location.hash = buildHash(section, index);
}

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
    header.setAttribute('aria-label', `${label} section`);
    header.style.animationDelay = `${sectionIdx * 60}ms`;
    header.innerHTML = `
      <span class="nav-icon-wrap">${iconSvg}</span>
      <span class="nav-section-label">${label}</span>
      ${ICON_CHEVRON}
    `;
    header.addEventListener('click', () => {
      if (!contentData || !articles.length) return;
      navigate(sectionKey, 0);
    });

    const articleList = document.createElement('div');
    articleList.className = 'nav-articles';
    articleList.id = `nav-articles-${sectionKey}`;

    const inner = document.createElement('div');
    inner.className = 'nav-articles-inner';

    articles.forEach((article, idx) => {
      const link = document.createElement('a');
      link.href = buildHash(sectionKey, idx);
      link.className = 'nav-article-link';
      link.dataset.section = sectionKey;
      link.dataset.index = String(idx);
      link.textContent = article.title;
      link.title = article.title;
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
    link.classList.toggle(
      'active',
      link.dataset.section === section && Number(link.dataset.index) === index,
    );
  });
}

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

interface FlatArticle {
  section: SectionKey;
  index: number;
  title: string;
}

function getAllFlat(): FlatArticle[] {
  if (!contentData) return [];
  const out: FlatArticle[] = [];
  (Object.keys(SECTIONS) as SectionKey[]).forEach((k) =>
    contentData![k].forEach((a, i) => out.push({ section: k, index: i, title: a.title })),
  );
  return out;
}

function buildNavButton(
  entry: FlatArticle,
  variant: 'prev' | 'next',
): HTMLAnchorElement {
  const btn = document.createElement('a');
  btn.href = buildHash(entry.section, entry.index);
  btn.className = `nav-btn ${variant}`;

  const arrow = variant === 'prev' ? '←' : '→';
  const label = variant === 'prev' ? 'Sebelumnya' : 'Berikutnya';
  const content = `<span class="nav-btn-content"><span class="nav-btn-label">${label}</span><span class="nav-btn-title">${entry.title}</span></span>`;

  btn.innerHTML = variant === 'prev'
    ? `<span class="nav-btn-arrow">${arrow}</span>${content}`
    : `${content}<span class="nav-btn-arrow">${arrow}</span>`;

  btn.addEventListener('click', (e) => {
    e.preventDefault();
    navigate(entry.section, entry.index);
  });
  return btn;
}

function renderNavFooter(section: SectionKey, index: number): void {
  if (!contentData) return;
  const footer = el('article-nav-footer');
  footer.innerHTML = '';
  const all = getAllFlat();
  const cur = all.findIndex((a) => a.section === section && a.index === index);
  if (cur === -1) return;

  if (cur > 0) {
    footer.appendChild(buildNavButton(all[cur - 1], 'prev'));
  } else {
    footer.appendChild(document.createElement('div'));
  }

  if (cur < all.length - 1) {
    footer.appendChild(buildNavButton(all[cur + 1], 'next'));
  }
}

function openMobileSidebar(): void {
  const overlay = el('overlay');
  const sidebar = el('sidebar');

  overlay.style.pointerEvents = 'none';
  overlay.style.display = 'block';
  document.body.classList.add('sidebar-open');
  document.body.style.overflow = 'hidden';

  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      sidebar.classList.add('open');
      overlay.classList.add('visible');
      overlay.style.removeProperty('pointer-events');
    }),
  );
}

function closeMobileSidebar(): void {
  const overlay = el('overlay');
  const sidebar = el('sidebar');

  sidebar.classList.remove('open');
  overlay.classList.remove('visible');
  document.body.classList.remove('sidebar-open');
  document.body.style.removeProperty('overflow');

  let settled = false;
  const hide = () => {
    if (settled) return;
    settled = true;
    overlay.style.display = 'none';
    overlay.style.removeProperty('pointer-events');
  };
  overlay.addEventListener('transitionend', hide, { once: true });
  setTimeout(hide, SIDEBAR_CLOSE_FALLBACK_MS);
}

function setupMobileMenu(): void {
  const closeBtn = document.getElementById('sidebar-close');
  closeBtn?.addEventListener('click', closeMobileSidebar);

  el('hamburger').addEventListener('click', () => {
    el('sidebar').classList.contains('open') ? closeMobileSidebar() : openMobileSidebar();
  });

  el('overlay').addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    closeMobileSidebar();
  });

  let wasMobile = window.innerWidth <= MOBILE_BREAKPOINT;
  window.addEventListener('resize', () => {
    const isMobile = window.innerWidth <= MOBILE_BREAKPOINT;
    if (wasMobile && !isMobile) closeMobileSidebar();
    wasMobile = isMobile;
  });
}

function handleRoute(): void {
  const route = parseHash();
  updateActiveStates(route);
  renderArticle(route);
}

function renderLoadError(err: unknown): void {
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
}

async function loadContent(): Promise<ContentData | null> {
  const base = import.meta.env.BASE_URL;
  const url = `${base}content.json`.replace('//', '/');

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as ContentData;
  } catch (err) {
    renderLoadError(err);
    return null;
  }
}

async function init(): Promise<void> {
  setupMobileMenu();

  const data = await loadContent();
  if (!data) return;

  contentData = data;
  renderSidebar(data);
  handleRoute();

  window.addEventListener('hashchange', handleRoute);
  if (!window.location.hash) window.history.replaceState(null, '', buildHash('phishing', 0));
}

init();
