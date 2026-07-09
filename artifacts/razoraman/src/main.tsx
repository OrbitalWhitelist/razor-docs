// Razoraman — Vanilla TypeScript docs app
// No framework. All content is driven by /public/content.json.

interface Article {
  title: string;
  body: string;
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

const SECTIONS: Record<SectionKey, { label: string; icon: string }> = {
  phishing: { label: 'Phishing Awareness', icon: '🎣' },
  security: { label: 'Account Security', icon: '🔐' },
};

let contentData: ContentData | null = null;

// ─── DOM helpers ────────────────────────────────────────────────────────────

function el<T extends HTMLElement>(id: string): T {
  const elem = document.getElementById(id);
  if (!elem) throw new Error(`Element #${id} not found`);
  return elem as T;
}

function qs<T extends Element>(selector: string, root: Element | Document = document): T | null {
  return root.querySelector<T>(selector);
}

function qsa<T extends Element>(selector: string, root: Element | Document = document): T[] {
  return Array.from(root.querySelectorAll<T>(selector));
}

// ─── Hash Routing ────────────────────────────────────────────────────────────

function parseHash(): RouteState {
  const hash = window.location.hash.slice(1);
  if (!hash) return { section: 'phishing', index: 0 };

  const parts = hash.split('-');
  const section = parts[0] as SectionKey;
  const index = parseInt(parts[1] ?? '0', 10);

  if (!contentData || !(section in contentData)) {
    return { section: 'phishing', index: 0 };
  }

  const articles = contentData[section];
  const safeIndex = Number.isNaN(index) ? 0 : Math.max(0, Math.min(index, articles.length - 1));
  return { section, index: safeIndex };
}

function buildHash(section: SectionKey, index: number): string {
  return `#${section}-${index}`;
}

function navigate(section: SectionKey, index: number): void {
  window.location.hash = buildHash(section, index);
}

// ─── Sidebar rendering ───────────────────────────────────────────────────────

function renderSidebar(data: ContentData): void {
  const nav = el('sidebar-nav');
  nav.innerHTML = '';

  (Object.keys(SECTIONS) as SectionKey[]).forEach((sectionKey) => {
    const articles = data[sectionKey];
    const { label, icon } = SECTIONS[sectionKey];

    const section = document.createElement('div');
    section.className = 'nav-section';
    section.dataset.section = sectionKey;

    // Section header
    const header = document.createElement('button');
    header.className = 'nav-section-header';
    header.dataset.section = sectionKey;
    header.setAttribute('aria-expanded', 'false');
    header.innerHTML = `
      <span class="nav-section-icon">${icon}</span>
      <span class="nav-section-label">${label}</span>
      <span class="nav-section-chevron">▼</span>
    `;
    header.addEventListener('click', () => {
      if (!contentData) return;
      navigate(sectionKey, 0);
    });

    // Articles list
    const articleList = document.createElement('div');
    articleList.className = 'nav-articles';
    articleList.id = `nav-articles-${sectionKey}`;

    articles.forEach((article, idx) => {
      const link = document.createElement('a');
      link.href = buildHash(sectionKey, idx);
      link.className = 'nav-article-link';
      link.dataset.section = sectionKey;
      link.dataset.index = String(idx);
      link.textContent = article.title;
      link.addEventListener('click', (e) => {
        e.preventDefault();
        navigate(sectionKey, idx);
        closeMobileSidebar();
      });
      articleList.appendChild(link);
    });

    section.appendChild(header);
    section.appendChild(articleList);
    nav.appendChild(section);
  });
}

// ─── Active state management ─────────────────────────────────────────────────

function updateActiveStates(route: RouteState): void {
  const { section, index } = route;

  // Update section headers
  qsa<HTMLButtonElement>('.nav-section-header').forEach((btn) => {
    const isActive = btn.dataset.section === section;
    btn.classList.toggle('section-active', isActive);
    btn.setAttribute('aria-expanded', String(isActive));
  });

  // Expand/collapse article lists
  qsa<HTMLDivElement>('.nav-articles').forEach((list) => {
    const sectionKey = list.id.replace('nav-articles-', '');
    list.classList.toggle('expanded', sectionKey === section);
  });

  // Update active article link
  qsa<HTMLAnchorElement>('.nav-article-link').forEach((link) => {
    const isActive = link.dataset.section === section && Number(link.dataset.index) === index;
    link.classList.toggle('active', isActive);
  });
}

// ─── Article rendering ───────────────────────────────────────────────────────

function renderArticle(route: RouteState): void {
  if (!contentData) return;

  const { section, index } = route;
  const articles = contentData[section];
  const article = articles[index];
  if (!article) return;

  const { label } = SECTIONS[section];

  // Breadcrumb
  const breadcrumb = el('article-breadcrumb');
  breadcrumb.innerHTML = `
    <span class="breadcrumb-section">${label}</span>
    <span class="breadcrumb-sep">›</span>
    <span>${article.title}</span>
  `;

  // Title
  el('article-title').textContent = article.title;

  // Body
  el('article-body').innerHTML = article.body;

  // Prev / Next navigation
  renderArticleNavFooter(section, index);

  // Show article, hide loading
  el('loading-state').style.display = 'none';

  const view = el('article-view');
  view.classList.remove('hidden');
  // Trigger fade-in re-animation
  view.style.animation = 'none';
  void view.offsetWidth; // reflow
  view.style.animation = '';

  // Scroll to top of content area
  el('content-main').scrollTo({ top: 0, behavior: 'instant' });
}

function renderArticleNavFooter(section: SectionKey, index: number): void {
  if (!contentData) return;

  const footer = el('article-nav-footer');
  footer.innerHTML = '';

  const allArticles = getAllArticlesFlat();
  const currentFlat = allArticles.findIndex((a) => a.section === section && a.index === index);

  if (currentFlat === -1) return;

  // Previous
  if (currentFlat > 0) {
    const prev = allArticles[currentFlat - 1];
    const btn = document.createElement('a');
    btn.href = buildHash(prev.section, prev.index);
    btn.className = 'nav-btn prev';
    btn.innerHTML = `
      <span>←</span>
      <span>
        <span class="nav-btn-label">Previous</span>
        <span class="nav-btn-title">${prev.title}</span>
      </span>
    `;
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      navigate(prev.section, prev.index);
    });
    footer.appendChild(btn);
  } else {
    // Spacer so Next stays on the right
    const spacer = document.createElement('div');
    footer.appendChild(spacer);
  }

  // Next
  if (currentFlat < allArticles.length - 1) {
    const next = allArticles[currentFlat + 1];
    const btn = document.createElement('a');
    btn.href = buildHash(next.section, next.index);
    btn.className = 'nav-btn next';
    btn.innerHTML = `
      <span>
        <span class="nav-btn-label">Next</span>
        <span class="nav-btn-title">${next.title}</span>
      </span>
      <span>→</span>
    `;
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      navigate(next.section, next.index);
    });
    footer.appendChild(btn);
  }
}

interface FlatArticle {
  section: SectionKey;
  index: number;
  title: string;
}

function getAllArticlesFlat(): FlatArticle[] {
  if (!contentData) return [];
  const result: FlatArticle[] = [];
  (Object.keys(SECTIONS) as SectionKey[]).forEach((sectionKey) => {
    contentData![sectionKey].forEach((article, idx) => {
      result.push({ section: sectionKey, index: idx, title: article.title });
    });
  });
  return result;
}

// ─── Mobile sidebar ──────────────────────────────────────────────────────────

function openMobileSidebar(): void {
  el('sidebar').classList.add('open');
  el('overlay').classList.add('visible');
  document.body.style.overflow = 'hidden';
}

function closeMobileSidebar(): void {
  el('sidebar').classList.remove('open');
  el('overlay').classList.remove('visible');
  document.body.style.overflow = '';
}

function setupMobileMenu(): void {
  el('hamburger').addEventListener('click', () => {
    const isOpen = el('sidebar').classList.contains('open');
    if (isOpen) {
      closeMobileSidebar();
    } else {
      openMobileSidebar();
    }
  });

  el('overlay').addEventListener('click', closeMobileSidebar);

  // If the viewport crosses the mobile breakpoint while the sidebar is open,
  // force-close it and restore body scroll so desktop is never stuck locked.
  let lastWasMobile = window.innerWidth <= 768;
  window.addEventListener('resize', () => {
    const isMobile = window.innerWidth <= 768;
    if (lastWasMobile && !isMobile) {
      closeMobileSidebar();
    }
    lastWasMobile = isMobile;
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

  // Fetch content.json from the public folder (BASE_URL handles subdirectory)
  const baseUrl = import.meta.env.BASE_URL;
  const contentUrl = `${baseUrl}content.json`.replace('//', '/');

  let data: ContentData;
  try {
    const res = await fetch(contentUrl);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    data = await res.json() as ContentData;
  } catch (err) {
    const loading = el('loading-state');
    loading.innerHTML = `
      <div style="color: var(--accent-red); font-size: 14px; text-align: center;">
        <div style="font-size: 32px; margin-bottom: 12px;">⚠️</div>
        <strong>Failed to load content</strong><br>
        <span style="color: var(--text-muted);">Could not fetch content.json. Please try refreshing.</span>
      </div>
    `;
    console.error('Failed to load content.json:', err);
    return;
  }

  contentData = data;

  // Render navigation
  renderSidebar(data);

  // Initial route
  handleRoute();

  // Listen for hash changes (back/forward, link clicks)
  window.addEventListener('hashchange', handleRoute);

  // If no hash, set a default so the URL is bookmarkable
  if (!window.location.hash) {
    window.history.replaceState(null, '', buildHash('phishing', 0));
  }
}

init();
