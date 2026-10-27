/* Dokončení KOMPLETNÍ DOKUMENTACE po vykreslení šablonou manual/sablona.html.
 *
 * Běží hned za rendererem šablony (vkládá ho manual/kompletni/sestav.js před
 * </body>). Renderer vykreslil všechny kapitoly částí I–III; tady se:
 *  1. značky „§BLOK:n§" vymění za tabulky, schéma a kapitoly části II
 *     (část II má vlastní styl → každý její kus stojí ve vlastním shadow DOM),
 *  2. před první kapitolu každé části a skupiny vloží předěl,
 *  3. obsah se přestaví na dvě úrovně (části / kapitoly) s místem pro čísla
 *     stran, aby se vešel na jednu stranu A4,
 *  4. do window.KOMPLETNI se zapíše stav pro kontrolu a pro čísla stran PDF.
 * Data čte z bloku #data-kompletni; zdroje částí I a II se nemění. */
(function () {
  'use strict';
  var D = JSON.parse(document.getElementById('data-kompletni').textContent);
  var cil = document.getElementById('cil');
  var chyby = [];

  function el(tag, trida, text) {
    var e = document.createElement(tag);
    if (trida) e.className = trida;
    if (text != null) e.textContent = text;
    return e;
  }
  /* Stejné zvýraznění jako renderer šablony: **tučně**, *kurzíva*, `kód`. */
  function bohate(rodic, s) {
    var zbytek = String(s), kus;
    var vzor = /(\*\*[^*]+\*\*|\*[^*\s](?:[^*]*[^*\s])?\*|`[^`]+`)/;
    while ((kus = zbytek.match(vzor))) {
      if (kus.index > 0) rodic.appendChild(document.createTextNode(zbytek.slice(0, kus.index)));
      var t = kus[0];
      if (t.slice(0, 2) === '**') rodic.appendChild(el('b', null, t.slice(2, -2)));
      else if (t.charAt(0) === '*') rodic.appendChild(el('i', null, t.slice(1, -1)));
      else rodic.appendChild(el('code', null, t.slice(1, -1)));
      zbytek = zbytek.slice(kus.index + t.length);
    }
    if (zbytek) rodic.appendChild(document.createTextNode(zbytek));
    return rodic;
  }

  var styl = el('style');
  styl.textContent = [
    '.podtitul-k { color:var(--mut); font-size:17px; margin:-18px 0 22px; }',
    'table.tab { width:100%; border-collapse:collapse; margin:10px 0 20px; font-size:14px; line-height:1.4; }',
    'table.tab caption { caption-side:top; text-align:left; font-weight:600; font-size:14px; color:var(--text); padding:0 0 6px; }',
    'table.tab th { background:#0b2e6b; color:#fff; text-align:left; font-weight:600; padding:6px 8px; vertical-align:bottom; }',
    'table.tab td { border-bottom:1px solid var(--line); padding:5px 8px; vertical-align:top; }',
    'table.tab tr:nth-child(even) td { background:#f7f9fc; }',
    'table.tab code { font-size:12px; }',
    'figure.schema { margin:16px 0 22px; }',
    'figure.schema svg { width:100%; height:auto; display:block; border:1px solid var(--line); border-radius:10px; background:#fff; }',
    '.v-kus { margin:6px 0 18px; }',
    '.predel { margin:56px 0 0; padding:18px 22px; border-radius:10px; background:#0b2e6b; color:#fff; break-after:avoid; page-break-after:avoid; break-inside:avoid; }',
    '.predel .cast { font-size:13px; letter-spacing:.16em; text-transform:uppercase; color:#86e8ad; font-weight:700; margin:0 0 4px; }',
    '.predel h1 { color:#fff; font-size:24px; margin:0 0 6px; }',
    '.predel p { margin:0; opacity:.92; font-size:15px; }',
    '.predel.skupina { background:#eff4ff; color:var(--text); border-left:5px solid var(--akcent); padding:12px 18px; }',
    '.predel.skupina h1 { color:var(--text); font-size:19px; }',
    '.predel + h2 { margin-top:22px; }',
    '#obsah .obsah-k { columns:2; column-gap:26px; font-size:12.5px; line-height:1.38; }',
    '#obsah .skup { break-inside:avoid; margin:0 0 6px; }',
    '#obsah .skup .cast-n { font-weight:700; color:#0b2e6b; text-transform:uppercase; letter-spacing:.06em; font-size:11px; margin:4px 0 0; }',
    '#obsah .skup .sk-n { font-weight:700; margin:2px 0 1px; }',
    '#obsah .pol { display:flex; gap:6px; break-inside:avoid; }',
    '#obsah .pol a { flex:1; min-width:0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; color:var(--text); text-decoration:none; border:0; }',
    '#obsah .pol .str { flex:none; color:var(--mut); font-variant-numeric:tabular-nums; }',
    '@media print {',
    '  #obsah .obsah-k { font-size:8.2pt; line-height:1.3; }',
    '  #obsah .skup .cast-n { font-size:7.4pt; }',
    '  table.tab { font-size:8.8pt; }',
    '  table.tab code { font-size:8pt; }',
    '  table.tab tr, figure.schema { break-inside:avoid; page-break-inside:avoid; }',
    '  table.tab thead { display:table-header-group; }',
    '  .predel { margin-top:26px; }',
    /* Sazba bez prázdných půlstran: nedělitelný je jen obrázek s titulkem;
     * vysvětlivky pod ním a kroky postupu smějí přetéct na další stranu
     * (text kroku zůstává se svým obrázkem). */
    '  figure.snimek, li.krok { break-inside:auto !important; page-break-inside:auto !important; }',
    '  .snimek-ram, figure.snimek figcaption, .odkazy li { break-inside:avoid; page-break-inside:avoid; }',
    '  .snimek-ram { break-after:avoid; page-break-after:avoid; }',
    '  li.krok > p:first-of-type:has(+ figure.snimek) { break-after:avoid; page-break-after:avoid; }',
    '}'
  ].join('\n');
  document.head.appendChild(styl);

  /* Styl části II se parsuje jednou a sdílí (adoptedStyleSheets). */
  var stylV = null;
  try { stylV = new CSSStyleSheet(); stylV.replaceSync(D.cssVypocet); } catch (e) { stylV = null; }

  function tabulka(b) {
    var t = el('table', 'tab');
    if (b.titulek) t.appendChild(el('caption', null, b.titulek));
    var th = el('thead'), tr = el('tr');
    (b.hlavicka || []).forEach(function (h) { tr.appendChild(el('th', null, h)); });
    th.appendChild(tr); t.appendChild(th);
    var tb = el('tbody');
    (b.radky || []).forEach(function (r) {
      var radek = el('tr');
      r.forEach(function (c) { radek.appendChild(bohate(el('td'), c)); });
      tb.appendChild(radek);
    });
    t.appendChild(tb);
    return t;
  }
  var schemat = 0;
  function schema(b) {
    var f = el('figure', 'schema');
    f.innerHTML = b.svg;                   /* SVG z provoz.json v repozitáři */
    schemat++;
    var c = el('figcaption');
    c.appendChild(el('b', null, 'Schéma ' + schemat + '.'));
    c.appendChild(document.createTextNode(' ' + (b.titulek || '')));
    f.appendChild(c);
    return f;
  }
  function kusVypoctu(b) {
    var host = el('div', 'v-kus');
    var sr = host.attachShadow({ mode: 'open' });
    if (stylV) { sr.adoptedStyleSheets = [stylV]; sr.innerHTML = '<div class="v-telo">' + b.html + '</div>'; }
    else sr.innerHTML = '<style>' + D.cssVypocet + '</style><div class="v-telo">' + b.html + '</div>';
    return host;
  }

  /* 1. značky → prvky */
  var vymeneno = 0;
  [].slice.call(cil.querySelectorAll('p')).forEach(function (p) {
    var m = /^§BLOK:(\d+)§$/.exec(p.textContent.trim());
    if (!m) return;
    var b = D.bloky[+m[1]];
    var novy = !b ? null : b.typ === 'tabulka' ? tabulka(b) : b.typ === 'svg' ? schema(b)
      : b.typ === 'vypocet' ? kusVypoctu(b) : null;
    if (!novy) { chyby.push('neznámý blok ' + m[1]); return; }
    p.parentNode.replaceChild(novy, p);
    vymeneno++;
  });
  if (/§BLOK:/.test(cil.textContent)) chyby.push('v dokumentu zůstala značka §BLOK');

  /* podtitul pod řádek verze */
  var verze = cil.querySelector('p.verze');
  if (verze && D.podtitul) verze.parentNode.insertBefore(el('p', 'podtitul-k', D.podtitul), verze.nextSibling);

  /* 2. předěly částí a skupin */
  D.skupiny.forEach(function (s) {
    var h = s.prvni && document.getElementById(s.prvni);
    if (!h) { chyby.push('chybí první kapitola skupiny ' + s.nazev); return; }
    if (s.cast) {
      var d = el('div', 'predel');
      d.appendChild(el('div', 'cast', s.cast));
      d.appendChild(el('h1', null, s.nazev));
      if (s.popis) d.appendChild(el('p', null, s.popis));
      h.parentNode.insertBefore(d, h);
    } else {
      var g = el('div', 'predel skupina');
      g.appendChild(el('h1', null, s.nazev));
      if (s.popis) g.appendChild(el('p', null, s.popis));
      h.parentNode.insertBefore(g, h);
    }
  });

  /* 3. obsah na dvě úrovně */
  var nav = document.getElementById('obsah');
  var nadpisy = [];
  var cislaStran = {};
  if (nav) {
    nav.innerHTML = '';
    nav.appendChild(el('h2', null, 'Obsah'));
    var sloupce = el('div', 'obsah-k');
    D.skupiny.forEach(function (s) {
      var sk = el('div', 'skup');
      if (s.cast) sk.appendChild(el('div', 'cast-n', s.cast));
      sk.appendChild(el('div', 'sk-n', s.nazev));
      sloupce.appendChild(sk);
      s.kapitoly.forEach(function (id) {
        var h = document.getElementById(id);
        if (!h) { chyby.push('obsah: chybí kapitola ' + id); return; }
        var text = h.textContent.replace(/^\s*↑ obsah\s*/, '').trim();
        nadpisy.push({ id: id, text: text });
        var pol = el('div', 'pol');
        var a = el('a', null, text); a.href = '#' + id; a.title = text;
        var st = el('span', 'str', '');
        cislaStran[id] = st;
        pol.appendChild(a); pol.appendChild(st);
        sloupce.appendChild(pol);
      });
    });
    nav.appendChild(sloupce);
  } else chyby.push('chybí blok obsahu');

  /* Výška obsahu v tisku: strana A4 bez okrajů 12 + 14 mm ≈ 1024 px; titul
   * a obsah musí být na první straně. Měří se v px obrazovky v okně 794 px
   * (stejné jako PDF); v tiskovém režimu se přeměří znovu (sestav.js). */
  function vyska() {
    var r0 = cil.getBoundingClientRect().top;
    return nav ? Math.ceil(nav.getBoundingClientRect().bottom - r0) : 0;
  }

  window.KOMPLETNI = {
    get vyskaObsahu() { return vyska(); },
    get obsahNaJedneStrane() { return vyska() <= 1024; },
    nadpisy: nadpisy,
    skupin: D.skupiny.length,
    vymeneno: vymeneno,
    bloku: D.bloky.length,
    chyby: chyby,
    strany: function (v) { Object.keys(v).forEach(function (id) { if (cislaStran[id]) cislaStran[id].textContent = String(v[id]); }); },
    hotovo: true
  };
  if (chyby.length) console.warn('KOMPLETNÍ DOKUMENTACE —', chyby);
})();
