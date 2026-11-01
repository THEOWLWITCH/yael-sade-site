// כל דף באתר בכתובת משלו, עם התוכן כבר בתוך ה-HTML, כדי שגוגל ימצא ויקרא אותו
// (31/10/2026: "תעשה שאנשים ימצאו את האתר בגוגל").
// /  /neuro  /courses  /research  /about  → הדף המלא (כותרת, תיאור, קישור קנוני, Open Graph, JSON-LD)
// /sitemap.xml → רשימת הדפים הגלויים · /robots.txt → מאפשר הכול חוץ מהניהול, ומצביע על מפת האתר
// התבנית היא public/shell.html, והתוכן מוצג באותו קוד שמציג אותו בדפדפן (public/site.js), כדי שיהיה מקור אחד.
import vm from 'node:vm';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const plain = (s) => String(s || '').replace(/\*\*/g, '').replace(/^[-•*]\s+/gm, '').replace(/^\d+[.)]\s+/gm, '').replace(/\s+/g, ' ').trim();
const clip = (s, n) => (s.length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…' : s);
const html = (body, status = 200, extra = {}) => new Response(body, { status, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=0, must-revalidate', ...extra } });

// מריץ את site-data.js ואת site.js בסביבה סגורה, ומחזיר את הפונקציות שמציגות את הדף
export function loadRenderer(dataJs, siteJs) {
  const ctx = { window: {} };
  vm.createContext(ctx);
  vm.runInContext(dataJs + '\n' + siteJs, ctx, { timeout: 2000 });
  return { YS: ctx.window.YS, DEFAULT: ctx.window.YS_DEFAULT };
}

const pageOf = (site, id) => {
  const pages = (site.pages || []).filter((p) => !p.hidden);
  if (!id) return pages.find((p) => p.home) || pages[0];
  return pages.find((p) => p.id === id && !p.home) || null;
};

function describe(page, site) {
  const b = site.brand || {};
  const parts = page.home
    ? [b.name, b.title, plain(page.intro), (site.pages || []).filter((p) => !p.home && !p.hidden).map((p) => p.nav || p.title).join(' · ')]
    : [plain(page.summary) || plain(page.sub), plain(page.intro), plain(((page.items || []).find((i) => !i.hidden && i.body) || {}).body)];
  return clip(parts.filter(Boolean).join('. ').replace(/\.\./g, '.'), 158);
}

function jsonLd(site, base) {
  const b = site.brand || {};
  const img = (f) => (f && f.src ? base + f.src : f && f.id ? base + '/api/file?id=' + f.id : undefined);
  const person = {
    '@context': 'https://schema.org', '@type': 'Person', name: b.name, alternateName: 'Dr. Yael Sade', url: base + '/',
    jobTitle: 'חוקרת חוסן חברתי ומנחת תהליכים', description: b.title,
    email: b.email ? 'mailto:' + b.email : undefined, telephone: b.phone || undefined, image: img(b.photo),
    alumniOf: { '@type': 'CollegeOrUniversity', name: 'אוניברסיטת אריאל' },
    address: { '@type': 'PostalAddress', addressLocality: 'מושב בקוע', addressCountry: 'IL' },
    knowsAbout: ['חוסן חברתי', 'חוסן קהילתי', 'חינוך', 'יצירתיות', 'תירגול נוירו-קוגניטיבי', 'מסלולים', 'למידה בתנועה', 'הנחיית קבוצות'],
  };
  return JSON.stringify(person).replace(/</g, '\\u003c');
}

export function renderPage({ shell, YS, site, id, base }) {
  const page = pageOf(site, id);
  const status = page ? 200 : 404;
  const p = page || pageOf(site, '');
  const b = site.brand || {};
  const title = p.home ? `${b.name} · ${b.title}` : `${p.title} · ${b.name}`;
  const desc = describe(p, site);
  const url = base + YS.pageHref(p);
  const ogImg = b.logo && b.logo.src ? base + b.logo.src : '';
  const head = [
    `<link rel="canonical" href="${esc(url)}">`,
    `<meta property="og:type" content="${p.home ? 'website' : 'article'}">`,
    `<meta property="og:locale" content="he_IL">`,
    `<meta property="og:site_name" content="${esc(b.name)}">`,
    `<meta property="og:title" content="${esc(title)}">`,
    `<meta property="og:description" content="${esc(desc)}">`,
    `<meta property="og:url" content="${esc(url)}">`,
    ogImg ? `<meta property="og:image" content="${esc(ogImg)}">` : '',
    `<meta name="twitter:card" content="summary">`,
    b.gsc ? `<meta name="google-site-verification" content="${esc(b.gsc)}">` : '',
    status === 404 ? '<meta name="robots" content="noindex">' : '',
    p.home ? `<script type="application/ld+json">${jsonLd(site, base)}</script>` : '',
    `<script>window.YS_SITE=${JSON.stringify(site).replace(/</g, '\\u003c')};</script>`,
  ].filter(Boolean).join('\n  ');
  const brand = (b.logo ? `<img src="${esc(YS.fileUrl(b.logo))}" alt="">` : '') + `<span>${esc(b.name)}<small>${esc(b.title)}</small></span>`;
  const foot = `<span>${esc(b.footer || '')}</span><span class="fill"></span>` +
    (b.email ? `<a href="mailto:${esc(b.email)}" dir="ltr">${esc(b.email)}</a>` : '') +
    (b.phone ? `<a href="tel:${esc(String(b.phone).replace(/[^\d]/g, ''))}" dir="ltr">${esc(b.phone)}</a>` : '');
  let out = shell
    .replace(/<title>[^<]*<\/title>/, `<title>${esc(title)}</title>`)
    .replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${esc(desc)}">`)
    .replace('</head>', `  ${head}\n</head>`)
    .replace('id="brand"></a>', `id="brand">${brand}</a>`)
    .replace('aria-label="דפי האתר"></nav>', `aria-label="דפי האתר">${YS.nav(site, p.id)}</nav>`)
    .replace('<main id="main" class="wrap" tabindex="-1"></main>', `<main id="main" class="wrap pg-${esc(p.id)}" tabindex="-1">${YS.renderPage(site, p.id)}</main>`)
    .replace('<div class="wrap" id="foot"></div>', `<div class="wrap" id="foot">${foot}</div>`);
  if (p.home) out = out.replace('<body>', '<body class="is-home">');
  return { status, body: out };
}

export function sitemap(site, base, YS) {
  const last = String(site.updatedAt || '').slice(0, 10);
  const urls = (site.pages || []).filter((p) => !p.hidden).map((p) =>
    `  <url><loc>${esc(base + YS.pageHref(p))}</loc>${last ? `<lastmod>${last}</lastmod>` : ''}<priority>${p.home ? '1.0' : '0.8'}</priority></url>`);
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
}

// asset(name) → טקסט הקובץ מ-public ; getSite() → האתר השמור או null ; base: הכתובת הראשית של האתר
export async function handle(req, { asset, getSite, base }) {
  const url = new URL(req.url);
  base = (base || url.origin).replace(/\/$/, '');
  const path = url.pathname.replace(/\/+$/, '') || '/';
  if (path === '/robots.txt') {
    return new Response(`User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /admin.html\nDisallow: /api/\n\nSitemap: ${base}/sitemap.xml\n`, { headers: { 'content-type': 'text/plain; charset=utf-8' } });
  }
  const [shell, dataJs, siteJs, saved] = await Promise.all([asset('shell.html'), asset('site-data.js'), asset('site.js'), getSite().catch(() => null)]);
  const { YS, DEFAULT } = loadRenderer(dataJs, siteJs);
  const site = saved && saved.pages && saved.pages.length ? saved : DEFAULT;
  if (path === '/sitemap.xml') return new Response(sitemap(site, base, YS), { headers: { 'content-type': 'application/xml; charset=utf-8' } });
  const id = path === '/' ? '' : decodeURIComponent(path.slice(1));
  if (id === 'home') return new Response(null, { status: 301, headers: { location: '/' } });
  if (id && !/^[\w-]{1,40}$/.test(id)) return html(renderPage({ shell, YS, site, id: '#none', base }).body, 404);
  const r = renderPage({ shell, YS, site, id, base });
  return html(r.body, r.status);
}

let cache = { at: 0, files: {} };
export default async (req) => {
  const origin = new URL(req.url).origin;
  const asset = async (name) => {
    if (cache.files[name] && Date.now() - cache.at < 60000) return cache.files[name];
    const r = await fetch(origin + '/' + name);
    if (!r.ok) throw new Error(name + ' ' + r.status);
    const t = await r.text();
    cache.files[name] = t; cache.at = Date.now();
    return t;
  };
  const getSite = async () => {
    const { getStore } = await import('@netlify/blobs');
    return getStore({ name: 'site', consistency: 'strong' }).get('site', { type: 'json' });
  };
  // הכתובת הראשית של האתר ב-Netlify (הדומיין שנקבע כראשי), כדי שלכל דף תהיה כתובת קנונית אחת
  const base = process.env.URL || origin;
  try {
    return await handle(req, { asset, getSite, base });
  } catch (e) {
    return new Response('<!doctype html><meta charset="utf-8"><p>הדף לא נטען. אפשר לרענן.</p>', { status: 500, headers: { 'content-type': 'text/html; charset=utf-8' } });
  }
};

// preferStatic: קבצים קיימים (תמונות, admin.html, הסגנון) מוגשים כרגיל; כל השאר עובר כאן
// הניהול, הקבצים והתמונות לא עוברים כאן בכלל (01/11/2026: "אני לא מצליחה להכנס אל אזור הניהול")
export const config = {
  path: ['/', '/:page', '/sitemap.xml', '/robots.txt'],
  excludedPath: ['/admin', '/admin.html', '/api/*', '/img/*', '/*.html', '/*.js', '/*.css', '/*.webp', '/*.png', '/*.ico'],
  preferStatic: true,
};
