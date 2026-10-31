// הצגת האתר מתוך מבנה התוכן (YS_DEFAULT או מה שנשמר בניהול). משותף לאתר ולתצוגה המקדימה בניהול.
(function () {
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var safeUrl = function (u) {
    u = String(u || '').trim();
    if (/^(https?:\/\/|mailto:|tel:)/i.test(u) || /^#[\w-]+$/.test(u) || /^\/(?!\/)/.test(u)) return u;
    return '';
  };
  var fileUrl = function (f) {
    if (!f) return '';
    if (f.src) return f.src;
    if (window.YS_FILE) return window.YS_FILE(f);
    return f.id ? '/api/file?id=' + encodeURIComponent(f.id) : '';
  };

  // **מודגש**, שורות "- " לתבליטים, "1. " לרשימה ממוספרת, שורה ריקה לפסקה, וקישורים.
  function inline(s) {
    s = esc(s);
    s = s.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
    s = s.replace(/(^|[\s(])((https?:\/\/)[^\s<)]+)/g, function (m, pre, url) { return pre + '<a href="' + url + '" target="_blank" rel="noopener">' + url.replace(/^https?:\/\//, '').replace(/\/$/, '') + '</a>'; });
    s = s.replace(/(^|[\s(])([\w.+-]+@[\w-]+\.[\w.-]+)/g, '$1<a href="mailto:$2">$2</a>');
    return s;
  }
  function rich(text) {
    var out = [], list = null;
    var close = function () { if (list) { out.push('</' + list + '>'); list = null; } };
    String(text || '').split('\n').forEach(function (raw) {
      var line = raw.trim(), m;
      if (!line) { close(); return; }
      if ((m = line.match(/^[-•*]\s+(.*)$/))) { if (list !== 'ul') { close(); out.push('<ul>'); list = 'ul'; } out.push('<li>' + inline(m[1]) + '</li>'); return; }
      if ((m = line.match(/^\d+[.)]\s+(.*)$/))) { if (list !== 'ol') { close(); out.push('<ol>'); list = 'ol'; } out.push('<li>' + inline(m[1]) + '</li>'); return; }
      if ((m = line.match(/^#{1,3}\s+(.*)$/))) { close(); out.push('<h3>' + inline(m[1]) + '</h3>'); return; }
      close(); out.push('<p>' + inline(line) + '</p>');
    });
    close();
    return out.join('');
  }

  function video(url) {
    var m = String(url || '').match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,20})/);
    if (m) return 'https://www.youtube-nocookie.com/embed/' + m[1];
    m = String(url || '').match(/vimeo\.com\/(?:video\/)?(\d{5,12})/);
    if (m) return 'https://player.vimeo.com/video/' + m[1];
    return '';
  }
  var kb = function (n) { n = Number(n) || 0; return n > 1048576 ? (n / 1048576).toFixed(1) + ' מגה' : Math.max(1, Math.round(n / 1024)) + ' ק״ב'; };
  var ext = function (name) { return (String(name || '').match(/\.([a-z0-9]{1,5})$/i) || [, ''])[1].toUpperCase(); };

  function item(it, opt) {
    var head = (it.title ? '<h2>' + esc(it.title) + '</h2>' : '') + (it.date ? '<p class="date">' + esc(it.date) + '</p>' : '');
    var body = it.body ? '<div class="rich">' + rich(it.body) + '</div>' : '';
    var cls = 'item it-' + it.type + (it.half ? ' half' : '') + (it.hidden ? ' draft' : '');
    var tag = it.hidden && opt.preview ? '<span class="draft-tag">טיוטה: לא מוצג באתר</span>' : '';
    if (it.type === 'file') {
      var u = fileUrl(it.file);
      var btn = u ? '<a class="btn" href="' + u + '" target="_blank" rel="noopener">⬇ ' + esc(it.label || 'לקובץ') + ' <small>' + esc(ext(it.file.name)) + ' · ' + kb(it.file.size) + '</small></a>' : '<p class="muted">(עוד לא הועלה קובץ)</p>';
      return '<article class="' + cls + '">' + tag + head + body + btn + '</article>';
    }
    if (it.type === 'link') {
      var l = safeUrl(it.url);
      var ext2 = /^https?:/.test(l) ? ' target="_blank" rel="noopener"' : '';
      return '<article class="' + cls + '">' + tag + head + body + (l ? '<a class="btn ghost" href="' + esc(l) + '"' + ext2 + '>' + esc(it.label || 'לקישור') + ' ←</a>' : '') + '</article>';
    }
    if (it.type === 'image') {
      var iu = fileUrl(it.file);
      var long = String(it.body || '').length > 160;
      return '<figure class="' + cls + (long ? ' long' : '') + '">' + tag + (it.title ? '<h2>' + esc(it.title) + '</h2>' : '') + (iu ? '<img src="' + esc(iu) + '" alt="' + esc(it.title || it.body || (it.file && it.file.name) || '') + '" loading="lazy">' : '<p class="muted">(עוד לא הועלתה תמונה)</p>') + (it.body ? '<figcaption class="rich">' + rich(it.body) + '</figcaption>' : '') + '</figure>';
    }
    if (it.type === 'video') {
      var v = video(it.url);
      return '<article class="' + cls + '">' + tag + head + (v ? '<div class="vid"><iframe src="' + v + '" title="' + esc(it.title || 'סרטון') + '" loading="lazy" allow="encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe></div>' : (it.url ? '<a class="btn ghost" href="' + esc(safeUrl(it.url)) + '" target="_blank" rel="noopener">לסרטון ←</a>' : '')) + body + '</article>';
    }
    return '<article class="' + cls + '">' + tag + head + body + '</article>';
  }

  function contactCard(b) {
    var rows = [];
    if (b.email) rows.push('<a class="ct" href="mailto:' + esc(b.email) + '"><span>✉</span><b dir="ltr">' + esc(b.email) + '</b></a>');
    if (b.phone) {
      var digits = String(b.phone).replace(/[^\d]/g, ''), intl = digits.replace(/^0/, '972');
      rows.push('<a class="ct" href="tel:' + esc(digits) + '"><span>☎</span><b dir="ltr">' + esc(b.phone) + '</b></a>');
      rows.push('<a class="ct" href="https://wa.me/' + esc(intl) + '" target="_blank" rel="noopener"><span>💬</span><b>וואטסאפ</b></a>');
    }
    return rows.length ? '<div class="contact">' + rows.join('') + '</div>' : '';
  }

  // כתובת אמיתית לכל דף (/, /neuro, /about), כדי שגוגל יראה כל דף בנפרד
  var pageHref = function (p) { return p.home ? '/' : '/' + p.id; };
  var phoneDigits = function (p) { return String(p || '').replace(/[^\d]/g, ''); };

  // site: מבנה התוכן; pageId: הדף להצגה; opt.preview: להראות גם טיוטות
  function renderPage(site, pageId, opt) {
    opt = opt || {};
    var pages = (site.pages || []).filter(function (p) { return opt.preview || !p.hidden; });
    var home = pages.filter(function (p) { return p.home; })[0] || pages[0];
    var page = pages.filter(function (p) { return p.id === pageId; })[0] || home;
    if (!page) return '';
    var b = site.brand || {};
    var items = (page.items || []).filter(function (it) { return opt.preview || !it.hidden; });
    var about = pages.filter(function (p) { return p.id === 'about'; })[0];
    var html = '';
    if (page.home) {
      // דף הבית (31/10/2026: "משהו דינאמי ונושם יותר"): בלי כרטיסים ובלי התמונה; הסמל, השם, והתחומים כעיגולים צפים בגל
      var areas = pages.filter(function (p) { return !p.home && p !== about; });
      html += '<section class="hero"><span class="blob b1"></span><span class="blob b2"></span><span class="blob b3"></span>' +
        (b.logo ? '<img class="logo" src="' + esc(fileUrl(b.logo)) + '" alt="">' : '') +
        '<h1>' + esc(b.name) + '</h1>' + (b.title ? '<p class="motto">' + esc(b.title) + '</p>' : '') +
        (b.tagline ? '<p class="tagline">' + esc(b.tagline) + '</p>' : '') + '</section>';
      html += '<section class="areas">' + areas.map(function (p, i) {
        var sum = String(p.summary || p.sub || '').split('\n').filter(Boolean).map(function (l) { return '<span>' + esc(l) + '</span>'; }).join('');
        return '<a class="area c' + (i % 3) + '" style="--i:' + i + '" href="' + esc(pageHref(p)) + '">' +
          '<span class="orb">' + (p.icon ? '<img src="' + esc(fileUrl(p.icon)) + '" alt="">' : '') + '</span>' +
          '<b>' + esc(p.nav || p.title) + '</b><span class="sum">' + sum + '</span>' + (p.hidden ? '<span class="draft-tag">דף מוסתר</span>' : '') + '</a>';
      }).join('') + '</section>';
      if (page.intro) html += '<section class="intro rich">' + rich(page.intro) + '</section>';
      if (items.length) html += '<div class="items">' + items.map(function (it) { return item(it, opt); }).join('') + '</div>';
      html += '<p class="reach">' + (b.phone ? '<a class="hand" href="tel:' + phoneDigits(b.phone) + '" dir="ltr">' + esc(b.phone) + '</a>' : '') +
        (b.email ? '<a class="mail" href="mailto:' + esc(b.email) + '" dir="ltr">' + esc(b.email) + '</a>' : '') + '</p>';
      return html;
    }
    var pic = page.id === 'about' && b.photo ? '<img class="head-photo" src="' + esc(fileUrl(b.photo)) + '" alt="">' : '';
    var icon = page.icon ? page.icon : (page.id === 'about' ? b.logo : null);
    html += '<header class="page-head">' + pic + (icon ? '<img class="head-icon" src="' + esc(fileUrl(icon)) + '" alt="">' : '') +
      '<div><h1>' + esc(page.title) + '</h1>' + (page.sub ? '<p class="sub">' + esc(page.sub) + '</p>' : '') + '</div>' +
      (page.hidden && opt.preview ? '<span class="draft-tag">דף מוסתר</span>' : '') + '</header>';
    if (page.intro) html += '<section class="intro rich">' + rich(page.intro) + '</section>';
    html += '<div class="items">' + items.map(function (it) { return item(it, opt); }).join('') + '</div>';
    // כרטיס ההזמנה בצבעי מים שייך למסלולים (31/10/2026: "התמונה הזאת קשורה למסלולים")
    if (page.id === 'neuro' || page.id === 'contact') html += inviteCard(b);
    return html;
  }

  function inviteCard(b) {
    if (!b.invite && !b.phone) return '';
    return '<section class="invite">' + (b.invite ? '<p class="inv-t">' + esc(b.invite).replace(/\n/g, '<br>') + '</p>' : '') +
      '<span class="inv-gap"></span>' +
      (b.phone ? '<a href="tel:' + phoneDigits(b.phone) + '" dir="ltr">' + esc(b.phone) + '</a>' : '') +
      (b.email ? '<a class="inv-mail" href="mailto:' + esc(b.email) + '" dir="ltr">' + esc(b.email) + '</a>' : '') + '</section>';
  }

  function nav(site, current, opt) {
    return (site.pages || []).filter(function (p) { return (opt && opt.preview) || !p.hidden; }).map(function (p) {
      return '<a href="' + esc(pageHref(p)) + '"' + (p.id === current ? ' aria-current="page"' : '') + '>' + esc(p.nav || p.title) + '</a>';
    }).join('');
  }

  window.YS = { pageHref: pageHref, esc: esc, rich: rich, renderPage: renderPage, nav: nav, contactCard: contactCard, inviteCard: inviteCard, fileUrl: fileUrl, video: video, kb: kb };
})();
