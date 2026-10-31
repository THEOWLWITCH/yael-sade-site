// כל דף בכתובת משלו עם התוכן בתוך ה-HTML, מפת אתר ו-robots.txt (31/10/2026: "תעשה שאנשים ימצאו את האתר בגוגל")
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { handle } from '../netlify/functions/page.mjs';

const pub = new URL('../public/', import.meta.url);
const asset = async (name) => readFileSync(new URL(name, pub), 'utf8');
const BASE = 'https://yael-sade.example';
const get = (path, saved = null) => handle(new Request('https://x.netlify.app' + path), { asset, getSite: async () => saved, base: BASE });

test('home page: title, description, canonical, JSON-LD and the content itself in the HTML', async () => {
  const r = await get('/');
  assert.equal(r.status, 200);
  const h = await r.text();
  assert.match(h, /<title>ד״ר יעל שדה · חוסן \| קהילה \| חינוך<\/title>/);
  assert.match(h, /<link rel="canonical" href="https:\/\/yael-sade\.example\/">/);
  assert.match(h, /<meta name="description" content="[^"]*מסלולים[^"]*">/);
  assert.match(h, /application\/ld\+json/);
  assert.match(h, /<body class="is-home">/);
  assert.match(h, /<main id="main" class="wrap pg-home"[^>]*>[\s\S]*מסלולים[\s\S]*<\/main>/);
  assert.match(h, /href="\/neuro"/);
  assert.doesNotMatch(h, /href="#\//);
});

test('inner page and its address; unknown and hidden pages are 404 with noindex', async () => {
  const r = await get('/neuro');
  assert.equal(r.status, 200);
  const h = await r.text();
  assert.match(h, /<title>מסלולים · ד״ר יעל שדה<\/title>/);
  assert.match(h, /canonical" href="https:\/\/yael-sade\.example\/neuro"/);
  assert.match(h, /מהו אימון נוירו-קוגניטיבי/);
  assert.match(h, /aria-current="page">מסלולים</);
  const nf = await get('/no-such-page');
  assert.equal(nf.status, 404);
  assert.match(await nf.text(), /noindex/);
  const saved = { brand: { name: 'ד״ר יעל שדה', title: 'x', gsc: 'abc123' }, pages: [{ id: 'home', home: true, title: 'בית', items: [] }, { id: 'secret', title: 'סוד', hidden: true, items: [] }] };
  assert.equal((await get('/secret', saved)).status, 404);
  assert.match(await (await get('/', saved)).text(), /google-site-verification" content="abc123"/);
  assert.equal((await get('/home')).status, 301);
});

test('sitemap lists visible pages; robots points to it and keeps the admin out', async () => {
  const sm = await (await get('/sitemap.xml')).text();
  assert.match(sm, /<loc>https:\/\/yael-sade\.example\/<\/loc>/);
  for (const id of ['neuro', 'courses', 'research', 'about']) assert.match(sm, new RegExp(`<loc>https://yael-sade\\.example/${id}</loc>`));
  const rb = await (await get('/robots.txt')).text();
  assert.match(rb, /Sitemap: https:\/\/yael-sade\.example\/sitemap\.xml/);
  assert.match(rb, /Disallow: \/admin/);
});
