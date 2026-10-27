#!/usr/bin/env node
/* KOMPLETNÍ DOKUMENTACE SYSTÉMU — jeden dokument (HTML + PDF) s jedním obsahem.
 *
 *   Část I   Obsluha   = příručka správce (manual/admin/obsah.json, kapitoly A1–A15)
 *                        + příručka obchodníka (manual/obsah.json, kapitoly 1–32), se snímky
 *   Část II  Výpočty   = vizuální manuál výpočtu OCK (manual_vypocet/, kapitoly V1–Vn podle šablony)
 *   Část III Provoz    = manual/kompletni/provoz.json (kapitoly P1–P13 a přílohy 1–4)
 *
 * Zdroje částí I a II se NEMĚNÍ — skládá se z nich až tady. Část I i III
 * vykresluje TÁŽ šablona manual/sablona.html (snímky v shadow DOM, kroky,
 * výklady); doplňkové bloky části III (tabulky, schéma) a vložení části II
 * dělá v prohlížeči manual/kompletni/dokoncit.js, který běží hned po rendereru.
 * Část II má vlastní styl, proto každá její kapitola stojí ve vlastním
 * shadow DOM (styl se s příručkou nepere) a nadpis kapitoly kreslí renderer.
 *
 *   node manual/kompletni/sestav.js <snimky.json> <snimky_admin.json> <výstupní složka> [--bez-pdf]
 *
 * Výstup: <složka>/RRRR-MM-DD_kalkulator_v<verze>_DOKUMENTACE_KOMPLETNI.html (+ .pdf).
 * HOTOVÝ DOKUMENT SE DO REPOZITÁŘE NEUKLÁDÁ (nese snímky kalkulace a postup
 * výpočtu) — složka mimo repozitář je povinná. Kontroly vstupů (verze,
 * prostředí snímků, skutečné firmy, </script) jsou stejné jako v
 * manual/admin/sestav.sh. Exportované funkce volá test
 * src/test_dokumentace_kompletni.js. */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');

const KDE = __dirname;
const KOREN = path.resolve(KDE, '..', '..');
const cti = (p) => fs.readFileSync(p, 'utf8');
const ctiJson = (p) => JSON.parse(cti(p));

function verzeAplikace() { return cti(path.join(KOREN, 'verze.txt')).replace(/\s/g, ''); }

/* ---------- kontroly vstupů ---------- */
function kontrolaVstupu(o) {
  const chyby = [];
  const V = o.verze;
  const radekVerze = (obs, jmeno) => {
    if (!String(obs.verze || '').startsWith('Platí pro aplikaci v' + V + ' '))
      chyby.push('řádek „verze" v ' + jmeno + ' neříká, že dokument platí pro v' + V);
  };
  radekVerze(o.provoz, 'manual/kompletni/provoz.json');
  for (const [jmeno, text] of [['manual/obsah.json', o.obsahBText], ['manual/admin/obsah.json', o.obsahAText],
    ['manual/kompletni/provoz.json', o.provozText]])
    if (/Co je nového/i.test(text)) chyby.push(jmeno + ' má sekci „Co je nového" (novinky patří do CHANGELOG.md)');
  for (const [jmeno, s, text] of [['snímky obchodníka', o.snimkyB, o.snimkyBText], ['snímky správce', o.snimkyA, o.snimkyAText]]) {
    if (s.verze !== 'Kalkulačka v' + V) chyby.push(jmeno + ' nejsou z aplikace v' + V + ' (' + s.verze + ') — přefoťte je');
    if (s.prostredi !== 'test') chyby.push(jmeno + ' nejsou z testovacího prostředí');
    if (/<\/script/i.test(text)) chyby.push(jmeno + ' obsahují </script');
    const podezrele = (text.match(/[A-ZÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ][^"<>]{2,40}(a\.s\.|s\.r\.o\.|spol\. s r\.o\.|s\.p\.o\.)/g) || [])
      .filter(x => !/Ukázk|Vzorov|Modelov|Zkušebn|Příkladn/.test(x));
    if (podezrele.length) chyby.push(jmeno + ': názvy firem, které nevypadají vymyšleně: ' + [...new Set(podezrele)].join(', '));
  }
  for (const [jmeno, text] of [['obsah.json', o.obsahBText], ['admin/obsah.json', o.obsahAText], ['provoz.json', o.provozText]])
    if (/<\/script/i.test(text)) chyby.push(jmeno + ' obsahuje </script');
  return chyby;
}

/* ---------- část II: rozdělení hotového manuálu výpočtu na kapitoly ---------- */
/* Šablona manuálu výpočtu má kapitoly jako <div class="kap…"> na začátku
 * řádku (pevný tvar, manual_vypocet/sablona.html). Kapitola „Co je nového
 * ve … vydání" se do kompletního dokumentu nebere — novinky verzí patří jen
 * do CHANGELOG — a stejně tak titulní strana a vlastní obsah manuálu. */
function rozdelVypocet(html) {
  const styl = (html.match(/<style>([\s\S]*?)<\/style>/) || [])[1];
  if (!styl) throw new Error('manuál výpočtu: chybí <style>');
  let telo = html.slice(html.indexOf('<body>') + 6, html.lastIndexOf('</body>'));
  const useky = telo.split(/\n(?=<div class="kap[ "])/);
  let uvod = useky.shift();
  uvod = uvod.replace(/<div class="titul">[\s\S]*?\n<\/div>\n/, '').replace(/<div class="obsah">[\s\S]*?\n<\/div>\n/, '');
  /* Věty o rozdílu proti minulému vydání do dokumentu nepatří (jen aktuální stav). */
  uvod = uvod.replace(/\s*Značka <span class="znacka nove">nové<\/span> \/ <span class="znacka zmena">změna<\/span> označuje, co je jinak než ve 2\. vydání\./, '');
  const kapitoly = [];
  for (const u of useky) {
    const m = u.match(/<div class="kaph"><div class="cislo">(\d+)<\/div><h2>([\s\S]*?)<\/h2><div class="detail">([\s\S]*?)<\/div><\/div>/);
    if (!m) { uvod += '\n' + u.replace(/\s*Vzorová šachta je <b>stejná jako ve 2\. vydání<\/b>; nová je jen kapitola o můstcích, která k ní přidává vzorový můstek\./, ''); continue; }
    const cislo = +m[1];
    const nazev = m[2].replace(/<[^>]+>/g, '').trim();
    if (/Co je nového/i.test(nazev)) continue;
    let obsah = u.replace(m[0], '<p class="v-detail">' + m[3].replace(/<[^>]+>/g, '') + '</p>');
    kapitoly.push({ cislo, nazev, html: precisluj(obsah) });
  }
  return { css: stylDoShadow(styl), uvod: precisluj(uvod), kapitoly };
}
/* Odkazy „kap. 11" uvnitř části II míří na její kapitoly → „kap. V11". */
function precisluj(s) {
  return s.replace(/\b(kap\.|kapitol[ayeuo]|kapitolách|kapitole)\s+(\d{1,2})\b/g, '$1 V$2')
    .replace(/\b(kap\. V\d{1,2}|kapitol[ay] V\d{1,2})(\s*(?:a|,|–)\s*)(\d{1,2})\b/g, '$1$2V$3');
}
/* Styl manuálu výpočtu je psaný pro celou stránku (:root, html, body);
 * uvnitř shadow DOM platí pro hostitele a obal .v-telo. Vynucená zalomení
 * stránky kapitol se ruší — v jednom dokumentu by nechávala prázdné půlstrany. */
function stylDoShadow(css) {
  return css.replace(/:root\s*\{/g, ':host{')
    .replace(/(^|[}\s])html\s*\{[^}]*\}/g, '$1')
    .replace(/(^|[}\s,])body\s*\{/g, '$1.v-telo{')
    .replace(/@page\s*\{[^}]*\}/g, '')
    + '\n:host{display:block}'
    + '\n.v-telo{max-width:none!important;margin:0!important;padding:0!important;background:none}'
    + '\n.kap,.kap.bez,.kap.blok{break-before:auto!important;page-break-before:auto!important;break-inside:auto!important;page-break-inside:auto!important;padding-top:0!important}'
    + '\n.znacka{display:none!important}'
    + '\n.v-detail{font-size:9px;color:var(--muted);font-weight:600;margin:0 0 8px}'
    + '\n@media print{*{-webkit-print-color-adjust:exact;print-color-adjust:exact}}';
}

/* ---------- spojení obsahu ---------- */
/* Bloky, které renderer šablony nezná (tabulka, schéma, vložená kapitola
 * části II), se v obsahu nahradí značkou „§BLOK:n§" v textovém bloku;
 * dokoncit.js značku po vykreslení vymění za skutečný prvek. Renderer tak
 * zůstává beze změny a oprava šablony platí i pro tento dokument. */
function spojObsah(obsahA, obsahB, provoz, vypocet) {
  const bloky = [];
  const znacka = (b) => { bloky.push(b); return { typ: 'text', text: '§BLOK:' + (bloky.length - 1) + '§' }; };
  const kopie = (k) => JSON.parse(JSON.stringify(k));
  const kapA = obsahA.kapitoly.map(kopie);
  const kapB = obsahB.kapitoly.map(kopie);
  const kapV = vypocet.kapitoly.map((k, i) => {
    const b = [];
    if (i === 0) b.push(znacka({ typ: 'vypocet', html: vypocet.uvod }));
    b.push(znacka({ typ: 'vypocet', html: k.html }));
    return { id: 'kap-v-' + k.cislo, nadpis: 'V' + k.cislo + '. ' + k.nazev, bloky: b };
  });
  const kapP = provoz.kapitoly.map(k => {
    const n = kopie(k);
    n.bloky = n.bloky.map(b => (b.typ === 'tabulka' || b.typ === 'svg') ? znacka(b) : b);
    return n;
  });
  const prvni = (pole) => pole[0] && pole[0].id;
  const castiPrilohy = kapP.filter(k => /^Příloha/.test(k.nadpis));
  const castiP = kapP.filter(k => !/^Příloha/.test(k.nadpis));
  const skupiny = [
    { cast: 'Část I — Obsluha', nazev: 'A · Správa aplikace (kapitoly A1–A' + kapA.length + ')', prvni: prvni(kapA),
      popis: 'Práce správce v aplikaci: role a práva, uživatelé, Nastavení, ceník, zálohy a obnova, provoz, testování, potíže.', kapitoly: kapA.map(k => k.id) },
    { nazev: 'B · Práce obchodníka (kapitoly 1–' + kapB.length + ')', prvni: prvni(kapB),
      popis: 'Příručka obchodníka beze změny — tak, jak ji dostávají obchodníci; odkazy „kapitola 22" míří sem.', kapitoly: kapB.map(k => k.id) },
    { cast: 'Část II — Výpočty', nazev: 'Jak kalkulačka počítá OCK (kapitoly V1–V' + kapV.length + ')', prvni: prvni(kapV),
      popis: 'Vizuální manuál výpočtu ocelové konstrukce šachty na vzorové šachtě. Množství jsou skutečné výsledky výpočetního jádra, částky v Kč ze zkušebního ceníku (nejsou to ceny firmy).', kapitoly: kapV.map(k => k.id) },
    { cast: 'Část III — Provoz systému', nazev: 'Provoz, zálohy, bezpečnost a předání (kapitoly P1–P' + castiP.length + ')', prvni: prvni(castiP),
      popis: 'Architektura, prostředí, přístupy, data, zálohy, nasazení, testy, bezpečnost, dohled, havarijní postupy a odpovědnosti.', kapitoly: castiP.map(k => k.id) },
    { nazev: 'Přílohy', prvni: prvni(castiPrilohy), popis: '', kapitoly: castiPrilohy.map(k => k.id) },
  ];
  const obsah = {
    titul: provoz.titul, verze: provoz.verze, uvod: provoz.uvod,
    kapitoly: kapA.concat(kapB, kapV, kapP),
  };
  return { obsah, doplnky: { podtitul: provoz.podtitul, skupiny, bloky, cssVypocet: vypocet.css } };
}

function spojSnimky(snimkyB, snimkyA) {
  const s = JSON.parse(JSON.stringify(snimkyB));
  const jsou = new Set(snimkyB.snimky.map(x => x.id));
  s.snimky = snimkyB.snimky.concat(snimkyA.snimky.filter(x => !jsou.has(x.id)));
  if (snimkyA.prostredi !== snimkyB.prostredi) s.prostredi = 'NESHODA';
  return s;
}

/* JSON do <script type="application/json">: jediná nebezpečná sekvence je
 * „</" (ukončila by blok) — v JSON jde zapsat jako „<\/". */
const doSkriptu = (data) => JSON.stringify(data).replace(/<\//g, '<\\/');

function sestavHtml(sablona, obsah, snimky, doplnky, dokoncit) {
  if (!sablona.includes('__SNIMKY__') || !sablona.includes('__OBSAH__') || !sablona.includes('</body>'))
    throw new Error('šablona manual/sablona.html nemá očekávané značky');
  let h = sablona.replace(/<title>[^<]*<\/title>/, '<title>Kalkulátor Next Gen — kompletní dokumentace systému</title>');
  h = h.replace('__SNIMKY__', () => doSkriptu(snimky));
  h = h.replace('__OBSAH__', () => doSkriptu(obsah) + '</script>\n<script type="application/json" id="data-kompletni">' + doSkriptu(doplnky));
  const i = h.lastIndexOf('</body>');
  return h.slice(0, i) + '<script>\n' + dokoncit + '\n</script>\n' + h.slice(i);
}

/* ---------- PDF a čísla stran v obsahu ---------- */
function playwright() {
  try { return require('playwright'); } catch (e) {
    const glob = execFileSync('npm', ['root', '-g'], { encoding: 'utf8' }).trim();
    return require(path.join(glob, 'playwright'));
  }
}
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const PDF_VOLBY = (verze) => ({
  format: 'A4', printBackground: true, outline: true, tagged: true,
  margin: { top: '12mm', bottom: '14mm', left: '12mm', right: '12mm' },
  displayHeaderFooter: true, headerTemplate: '<span></span>',
  footerTemplate: '<div style="font:7px Arial,sans-serif;color:#5b6673;width:100%;padding:0 12mm;display:flex;justify-content:space-between">'
    + '<span>Kalkulátor Next Gen — kompletní dokumentace · v' + esc(verze) + ' · interní</span>'
    + '<span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>',
});
const norm = s => s.replace(/\s+/g, ' ').trim();
/* Strana každé kapitoly podle textu PDF: první strana za obsahem, na které
 * nějaký řádek začíná nadpisem kapitoly (kapitoly jdou po sobě, hledá se
 * od strany předchozí kapitoly). */
function stranyZPdf(pdf, nadpisy) {
  const r = spawnSync('pdftotext', ['-layout', pdf, '-'], { encoding: 'utf8', maxBuffer: 1 << 28 });
  if (r.status !== 0) return null;
  const strany = r.stdout.split('\f').map(t => t.split('\n').map(norm));
  const vysl = {};
  let od = 1;
  for (const n of nadpisy) {
    const klic = norm(n.text).slice(0, 28);
    let nalez = -1;
    for (let s = od; s < strany.length && nalez < 0; s++)
      if (strany[s].some(l => l.startsWith(klic))) nalez = s;
    if (nalez >= 0) { vysl[n.id] = nalez + 1; od = nalez; }
  }
  return { vysl, pocet: strany.filter((t, i) => i < strany.length - 1 || t.join('').trim()).length };
}

async function vyrobPdf(htmlSoubor, pdfSoubor, verze, log) {
  const pw = playwright();
  const prohl = await pw.chromium.launch();
  try {
    const str = await prohl.newPage({ viewport: { width: 794, height: 1123 } });
    await str.goto('file://' + htmlSoubor, { waitUntil: 'load' });
    await str.waitForFunction(() => window.KOMPLETNI && window.KOMPLETNI.hotovo, null, { timeout: 120000 });
    await str.emulateMedia({ media: 'print' });
    await str.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
    /* Výška obsahu se měří až v tiskovém režimu (menší písmo obsahu). */
    const stav = await str.evaluate(() => ({ P: window.PRIRUCKA,
      K: { obsahNaJedneStrane: window.KOMPLETNI.obsahNaJedneStrane, vyskaObsahu: window.KOMPLETNI.vyskaObsahu, chyby: window.KOMPLETNI.chyby } }));
    await str.pdf(Object.assign({ path: pdfSoubor }, PDF_VOLBY(verze)));
    const nadpisy = await str.evaluate(() => window.KOMPLETNI.nadpisy);
    const s = stranyZPdf(pdfSoubor, nadpisy);
    let pocet = null;
    if (!s) log('POZOR: pdftotext není k dispozici — obsah PDF zůstane bez čísel stran.');
    else {
      await str.evaluate((v) => window.KOMPLETNI.strany(v), s.vysl);
      await str.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
      await str.pdf(Object.assign({ path: pdfSoubor }, PDF_VOLBY(verze)));
      const s2 = stranyZPdf(pdfSoubor, nadpisy);
      pocet = s2.pocet;
      const nesedi = nadpisy.filter(n => s2.vysl[n.id] !== s.vysl[n.id]).map(n => n.id);
      if (nesedi.length) log('POZOR: čísla stran se po doplnění posunula u ' + nesedi.join(', '));
      const chybi = nadpisy.filter(n => !s2.vysl[n.id]).map(n => n.id);
      if (chybi.length) log('POZOR: v PDF se nenašel nadpis ' + chybi.join(', '));
    }
    return Object.assign({ pocet }, stav);
  } finally { await prohl.close(); }
}

function pocetStran(pdf) {
  const r = spawnSync('pdfinfo', [pdf], { encoding: 'utf8' });
  const m = r.status === 0 && r.stdout.match(/Pages:\s+(\d+)/);
  return m ? +m[1] : null;
}

/* ---------- hlavní běh ---------- */
function nactiZdroje(snimkyBCesta, snimkyACesta) {
  const t = {
    obsahBText: cti(path.join(KOREN, 'manual', 'obsah.json')),
    obsahAText: cti(path.join(KOREN, 'manual', 'admin', 'obsah.json')),
    provozText: cti(path.join(KDE, 'provoz.json')),
    snimkyBText: cti(snimkyBCesta), snimkyAText: cti(snimkyACesta),
  };
  return Object.assign(t, {
    obsahB: JSON.parse(t.obsahBText), obsahA: JSON.parse(t.obsahAText), provoz: JSON.parse(t.provozText),
    snimkyB: JSON.parse(t.snimkyBText), snimkyA: JSON.parse(t.snimkyAText), verze: verzeAplikace(),
    sablona: cti(path.join(KOREN, 'manual', 'sablona.html')), dokoncit: cti(path.join(KDE, 'dokoncit.js')),
  });
}

function vyrobManualVypoctu(cil) {
  execFileSync(process.execPath, [path.join(KOREN, 'manual_vypocet', 'sestav.js'), '--out', cil], { stdio: ['ignore', 'ignore', 'inherit'] });
  const html = fs.readdirSync(cil).filter(f => /_MANUAL_VYPOCET_OCK\.html$/.test(f)).sort().pop();
  if (!html) throw new Error('manuál výpočtu nevznikl');
  return cti(path.join(cil, html));
}

async function main() {
  const a = process.argv.slice(2);
  const bezPdf = a.includes('--bez-pdf');
  const arg = a.filter(x => !x.startsWith('--'));
  if (arg.length !== 3) {
    console.error('Použití: node manual/kompletni/sestav.js <snimky.json> <snimky_admin.json> <výstupní složka> [--bez-pdf]');
    process.exit(2);
  }
  const vystup = path.resolve(arg[2]);
  if ((vystup + path.sep).startsWith(KOREN + path.sep)) {
    console.error('CHYBA: hotový dokument se do repozitáře neukládá — zvolte složku mimo ' + KOREN);
    process.exit(2);
  }
  const z = nactiZdroje(arg[0], arg[1]);
  const chyby = kontrolaVstupu(z);
  if (chyby.length) { console.error('CHYBA:\n  ' + chyby.join('\n  ')); process.exit(1); }

  const docasne = fs.mkdtempSync(path.join(os.tmpdir(), 'kng_vypocet_'));
  const vypocet = rozdelVypocet(vyrobManualVypoctu(docasne));
  const { obsah, doplnky } = spojObsah(z.obsahA, z.obsahB, z.provoz, vypocet);
  const html = sestavHtml(z.sablona, obsah, spojSnimky(z.snimkyB, z.snimkyA), doplnky, z.dokoncit);

  fs.mkdirSync(vystup, { recursive: true });
  const jmeno = new Date().toISOString().slice(0, 10) + '_kalkulator_v' + z.verze + '_DOKUMENTACE_KOMPLETNI';
  const htmlSoubor = path.join(vystup, jmeno + '.html');
  fs.writeFileSync(htmlSoubor, html);
  console.log('HTML: ' + htmlSoubor + ' (' + Math.round(html.length / 1024) + ' kB, ' + obsah.kapitoly.length + ' kapitol)');
  if (bezPdf) return;
  const pdfSoubor = path.join(vystup, jmeno + '.pdf');
  const r = await vyrobPdf(htmlSoubor, pdfSoubor, z.verze, (t) => console.error(t));
  if (r.P.nesedi.length) { console.error('CHYBA: vysvětlivky nebo cíle kliknutí bez cíle: ' + r.P.nesedi.join(', ')); process.exit(1); }
  if (r.K.chyby.length) { console.error('CHYBA: dokončení dokumentu: ' + r.K.chyby.join(', ')); process.exit(1); }
  if (!r.K.obsahNaJedneStrane) console.error('POZOR: obsah se nevejde na jednu stranu A4 (' + r.K.vyskaObsahu + ' px)');
  const stran = pocetStran(pdfSoubor) || r.pocet;
  console.log('PDF:  ' + pdfSoubor + ' (' + Math.round(fs.statSync(pdfSoubor).size / 1024) + ' kB, ' + stran + ' stran)');
}

module.exports = { kontrolaVstupu, rozdelVypocet, spojObsah, spojSnimky, sestavHtml, stylDoShadow, precisluj, stranyZPdf, verzeAplikace };
if (require.main === module) main().catch(e => { console.error(e); process.exit(1); });
