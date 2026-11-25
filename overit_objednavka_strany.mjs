/* D3-N1 (19. 11. 2026): POČET STRAN OBJEDNÁVKY / SMLOUVY PROJ.
 *
 * Objednávka se 4 činnostmi (zaměření, studie, DPZ, DPS — běžná OVP) má
 * v tisku/PDF vyjít na 2 strany; rozsah prací se nezkracuje (J. V.). Proto
 * popis dodávky dostal celou šířku řádku a číselné sloupce jdou pod něj na
 * samostatný řádek (jako vzor účetního systému). Harness:
 *   1) náhled objednávky (objednavkaProjHtml + objednavkaProjCss, tatáž
 *      cesta jako okno) → PDF z Chromia → počet stran: 4 činnosti ≤ 2,
 *      7 činností ≤ 3;
 *   2) tabulka náhledu: řádek popisu přes celou šířku (colspan) a pod ním
 *      řádek čísel; ve Wordu totéž (gridSpan, řádek čísel);
 *   3) Word orientačně: je-li LibreOffice, převod .docx → PDF a počet stran
 *      se jen vypíše (Carlito ≠ Calibri, MS Word stránkuje jinak).
 * Pojistka: na cda289e (úzký sloupec „Popis dodávky") vyjde PDF 3 / 4 strany
 * a kontrola rozvržení selže — viz zpráva commitu.
 *
 * Spouští se nad sestaveným buildem:
 *   NODE_PATH=$(npm root -g) node overit_objednavka_strany.mjs */
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'module';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const KOREN = fileURLToPath(new URL('.', import.meta.url));
const require = createRequire(import.meta.url);
const KDE = new URL('dist/kalkulacka.html', import.meta.url).href;
const ZC = require(KOREN + 'src/zkusebni_cenik.js');
const chyby = [], konzole = [];
const ok = (co, podm, info) => { console.log((podm ? '  ✓ ' : '  ✗ ') + co + (podm || info === undefined ? '' : '  ' + JSON.stringify(info))); chyby.push(!!podm); };
const stranPdf = buf => (Buffer.from(buf).toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;

const b = await chromium.launch();
const s = await b.newPage({ viewport: { width: 1400, height: 900 } });
s.on('pageerror', e => konzole.push('pageerror: ' + e.message));
await s.goto(KDE);
await s.waitForTimeout(700);

/* Smyšlená zakázka TEST (zkušební ceník, žádné skutečné údaje); `jen` = klíče činností. */
async function priprav(jen, navic) {
  return s.evaluate(([c, cp, jen, navic]) => {
    Object.assign(DEFAULT_CENIK, c); delete DEFAULT_CENIK.prazdny;
    Object.assign(DEFAULT_CENIK_PROJ, cp); delete DEFAULT_CENIK_PROJ.prazdny;
    ZAK = novaZakazka(); syncVarianta();
    ZAK.cislo = '2026 - OVP - CN - 0376';
    ZAK.objednatel = 'TEST zákazník s.r.o.'; ZAK.adresaObjednatele = 'Vzorová 2, 100 00 Praha'; ZAK.ico = '00000001';
    ZAK.adresa = 'Zkušební 1, Praha'; ZAK.nazevAkce = 'TEST akce D3';
    ZAK.jenProj = true;
    const v = aktivniVarianta(ZAK);
    v.data.proj.cenik = JSON.parse(JSON.stringify(cp));
    v.data.proj.zadani.sekce.forEach(x => x.polozky.forEach(p => { p.vyrazeno = jen ? jen.indexOf(x.key) < 0 : false; }));
    syncVarianta();
    kryciProjZmrazPodminky(ZAK, v); kryciProjZmrazPlan(ZAK, v);
    zamkniVariantu(v, { kdy: new Date().toISOString(), typ: 'nabidkaProjTisk', vysledek: { proj: vypocetProj(v.data.proj.zadani, v.data.proj.cenik) } });
    const vt = vzTiskVstup('objednavkaProj', v);
    const o = objednavkaProjData(vt.zak, vt.varianta);
    if (o.chyba) return { chyba: o.chyba };
    /* #791 S1 sonda: víc řádků Termínů (jako delší varianta) a Vystavil */
    if (navic) { o.vystavil = 'TEST Vystavitel'; for (let i = 0; i < navic; i++) o.terminy.push(['Zkušební termín ' + i, 'do 1. 1. 2027']); }
    window.__objO = o;
    const html = `<!DOCTYPE html><html lang="cs"><head><meta charset="utf-8"><style>${objednavkaProjCss()}</style></head>
      <body><div id="dok">${objednavkaProjHtml(o)}</div></body></html>`;
    return { html, radky: o.radky.length, sekce: o.radky.map(x => x.sekce) };
  }, [ZC.zkusebniCenik(), ZC.zkusebniCenikProj(), jen || null, navic || 0]);
}
async function word() {
  return s.evaluate(async () => {
    const vt = vzTiskVstup('objednavkaProj', aktivniVarianta(ZAK));
    const res = await dokumentVygeneruj('objednavkaProj', null, vt.zak, vt.varianta, JEKLY);
    const u8 = new Uint8Array(await res.blob.arrayBuffer());
    let t = ''; for (let i = 0; i < u8.length; i++) t += String.fromCharCode(u8[i]);
    return btoa(t);
  });
}
const soffice = (() => { try { execFileSync('soffice', ['--version'], { stdio: 'ignore', timeout: 30000 }); return true; } catch (e) { return false; } })();
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'kng-obj-'));

const SADY = [
  { jm: '4 činnosti', jen: ['zamereni', 'studie', 'dpz', 'dps'], max: 2 },
  { jm: '7 činností', jen: null, max: 3 },
];
for (const sada of SADY) {
  const p = await priprav(sada.jen);
  if (p.chyba) { ok(sada.jm + ': objednávka vznikla', false, p.chyba); continue; }
  const okno = await b.newPage();
  await okno.setContent(p.html, { waitUntil: 'load' });
  const pdf = await okno.pdf({ format: 'A4', preferCSSPageSize: true });
  const n = stranPdf(pdf);
  console.log(`  · ${sada.jm} (${p.radky} řádků: ${p.sekce.join(', ')}): PDF ${n} stran`);
  ok(`${sada.jm}: tisk/PDF nejvýš ${sada.max} strany`, n >= 1 && n <= sada.max, n);
  /* rozvržení: popis přes celou šířku, čísla na řádku pod ním */
  const r = await okno.evaluate(() => {
    const popis = [...document.querySelectorAll('table.polozky tr.radek td.popis')];
    const cisla = [...document.querySelectorAll('table.polozky tr.radek-cisla')];
    const tab = document.querySelector('table.polozky');
    return { popis: popis.length, cisla: cisla.length,
      sirka: popis.length ? Math.min(...popis.map(td => td.getBoundingClientRect().width)) / tab.getBoundingClientRect().width : 0,
      poradi: popis.every(td => { const n = td.parentElement.nextElementSibling; return n && n.classList.contains('radek-cisla'); }) };
  });
  ok(`${sada.jm}: řádek popisu přes celou šířku (≥ 80 % tabulky) a pod ním řádek čísel`,
    r.popis === p.radky && r.cisla >= p.radky && r.sirka >= 0.8 && r.poradi, r);
  await okno.close();
  /* Word: stejné rozvržení (gridSpan popisu, řádek čísel) a orientační stránkování */
  const docx = Buffer.from(await word(), 'base64');
  const { zipPrecti } = require(KOREN + 'src/docxgen.js');
  const xml = new TextDecoder().decode((await zipPrecti(new Uint8Array(docx))).find(x => x.nazev === 'word/document.xml').data);
  ok(`${sada.jm}: Word — popis dodávky přes celou šířku (gridSpan 7) a řádky čísel`,
    (xml.match(/<w:gridSpan w:val="7"\/>/g) || []).length >= p.radky, (xml.match(/<w:gridSpan w:val="7"\/>/g) || []).length);
  if (soffice) {
    const f = path.join(TMP, 'obj.docx');
    fs.writeFileSync(f, docx);
    try {
      execFileSync('soffice', ['--headless', '--convert-to', 'pdf', '--outdir', TMP, f], { stdio: 'ignore', timeout: 120000 });
      console.log(`  · ${sada.jm}: Word (LibreOffice, orientačně) ${stranPdf(fs.readFileSync(path.join(TMP, 'obj.pdf')))} stran`);
    } catch (e) { console.log('  · Word: převod LibreOffice selhal (' + e.message.slice(0, 80) + ')'); }
  } else console.log('  · Word: LibreOffice není — stránkování Wordu přeskočeno');
}

/* #791 S1 (revize Fable 25. 11. 2026): podpis objednatele NIKDY sám na poslední straně — při
 * přetečení jde na novou stranu s posledním blokem textu (keepNext ve Wordu, break-after: avoid
 * v tisku). Sonda: 7 činností + 0…14 řádků Termínů navíc. Text poslední strany z pdftotext
 * (bez něj se kontrola přeskočí s vysvětlením). Pojistka: na 92973f3 Word při +6 a víc
 * řádcích nese na 3. straně jen „Datum / Podpis objednatele“ → FAIL. */
const pdftotext = (() => { try { execFileSync('pdftotext', ['-v'], { stdio: 'ignore' }); return true; } catch (e) { return false; } })();
const posledniStrana = (buf) => {
  const f = path.join(TMP, 'sonda.pdf'); fs.writeFileSync(f, buf);
  const n = stranPdf(buf);
  return String(execFileSync('pdftotext', ['-f', String(n), '-l', String(n), f, '-'])).replace(/\s+/g, ' ').trim();
};
const sam = t => /Podpis objednatele/.test(t) && !/Vystavil|Termíny|Zkušební termín/.test(t);
if (!pdftotext) console.log('  · S1: pdftotext není — sonda osamoceného podpisu přeskočena');
else for (const navic of [0, 4, 6, 10, 14]) {
  const p = await priprav(null, navic);
  if (p.chyba) { ok('S1 +' + navic + ': objednávka vznikla', false, p.chyba); continue; }
  const okno = await b.newPage();
  await okno.setContent(p.html, { waitUntil: 'load' });
  const t = posledniStrana(await okno.pdf({ format: 'A4', preferCSSPageSize: true }));
  await okno.close();
  ok(`S1 tisk/PDF (+${navic} termínů): podpis není sám na poslední straně`, !sam(t), t.slice(0, 120));
  if (soffice) {
    const docx = Buffer.from(await s.evaluate(async () => {
      const b = new Uint8Array(await objednavkaProjDocxBlob(window.__objO).arrayBuffer());
      let t = ''; for (let i = 0; i < b.length; i++) t += String.fromCharCode(b[i]); return btoa(t); }), 'base64');
    const f = path.join(TMP, 'sonda.docx'); fs.writeFileSync(f, docx);
    try {
      execFileSync('soffice', ['--headless', '--convert-to', 'pdf', '--outdir', TMP, f], { stdio: 'ignore', timeout: 120000 });
      const tw = posledniStrana(fs.readFileSync(path.join(TMP, 'sonda.pdf')));
      ok(`S1 Word/LibreOffice (+${navic} termínů): podpis není sám na poslední straně`, !sam(tw), tw.slice(0, 120));
    } catch (e) { console.log('  · S1 Word: převod LibreOffice selhal (' + e.message.slice(0, 80) + ')'); }
  }
}

await b.close();
if (konzole.length) console.log('Konzole:\n  ' + konzole.join('\n  '));
const spatne = chyby.filter(x => !x).length;
console.log(spatne ? `\n✗ ${spatne} z ${chyby.length} kontrol selhalo` : `\n✓ všech ${chyby.length} kontrol prošlo`);
process.exit(spatne || konzole.length ? 1 : 0);
