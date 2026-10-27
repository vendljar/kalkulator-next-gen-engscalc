/* SEC-M klient, bod 10 — injekce do vygenerovaných souborů: DOCX (nabídka
 * OCK a PROJ, SoD OCK a PROJ, plná moc, krycí listy), XLSX (ceník, export
 * předkalkulace, mapování controllingu, slovník) a CSV (export předkalkulace,
 * slovník „jen v aplikaci“, nepřeložené fráze specifikace).
 *
 * Šablony Wordu v repu nejsou (firemní texty) — pokus si pro každý typ
 * vyrobí SYNTETICKOU šablonu ze symbolů, které builder dokumentu plní
 * (každý {{SYMBOL}} ve vlastním odstavci, každý třetí rozdělený mezi běhy,
 * prvních pět i v záhlaví). Pak dokument vyrobí touž cestou jako aplikace
 * (dokumentVygeneruj → docxVyplnSablonu) a výstup rozbalí.
 *
 * Payload (do všech textových polí zakázky, firmy, zpracovatele, ceníku,
 * slovníku a controllingu): začátek = | + | - | @ | TAB | CR | nic, potom
 * „cmd|SECMZN{{FIRMA_ICO}}</w:t></w:r><w:r><w:t>INJ]]><!--"><img …>&amp;“
 * + řídicí znaky \u0000 \u0001 \u0008 \u000b \u001f \u007f ￾ ￿
 * \ud800   + značka cesty.
 * Kontroly: XML každé části well-formed (DOMParser), žádný běh/odstavec
 * vzniklý z payloadu (w:t začínající „INJ“), žádné nepovolené řídicí znaky,
 * {{FIRMA_ICO}} z dat se NErozvine (B122), vlastní kontrola aplikace
 * docxXmlVady bez vad; XLSX bez <f> (vzorců), texty jako inlineStr; CSV:
 * každá buňka začínající = + - @ TAB CR má apostrof (výjimka „+ “/„- “
 * s mezerou je záměrná, test_csv_vzorce.js).
 * Spuštění z kořene repa:
 *   KNG_DIST=<cesta>/dist/kalkulacka.html node podklady/SECM_pokusy/klient/dokumenty_injekce.mjs */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const ZC = require('../../../src/zkusebni_cenik.js');
const KOREN = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../..');
const DIST = process.env.KNG_DIST || path.join(KOREN, 'dist/kalkulacka.html');
const b = await chromium.launch();
const ctx = await b.newContext();
const venku = [];
await ctx.route('**/*', r => { const u = r.request().url(); if (u.startsWith('file:') || u.startsWith('data:') || u.startsWith('blob:')) return r.continue(); venku.push(u); return r.abort(); });
const p = await ctx.newPage();
const chybyStranky = []; p.on('pageerror', e => chybyStranky.push(String(e.message).slice(0, 160)));
await p.goto('file://' + DIST);
await p.waitForFunction(() => typeof render === 'function' && typeof dokumentVygeneruj === 'function', null, { timeout: 20000 });
await p.waitForTimeout(300);

const r = await p.evaluate(async ([c, cp]) => {
  const out = { docx: [], xlsx: [], csv: [], chyby: [] };
  Object.assign(DEFAULT_CENIK, c); Object.assign(DEFAULT_CENIK_PROJ, cp);
  const bez = o => { if (o) { delete o.ukazkove; delete o.prazdny; } };
  window.potvrd = () => Promise.resolve(true); window.hlaska = () => Promise.resolve(); window.dokumentZabrana = () => '';
  window.kontrolyStranaZabrana = () => '';
  window.volba = async (t, m) => (m && m[0] && m[0].kod) || null;
  ZAK = novaZakazka(); syncVarianta();
  [DEFAULT_CENIK, DEFAULT_CENIK_PROJ, C, PC, NAST.slevy, NAST.firma].forEach(bez);
  ZAK.varianty.forEach(v => { bez(v.data.cenik); bez(v.data.proj.cenik); });
  ZAK.cislo = '2026 - OPR - CN - 0901'; ZAK.datum = '2026-10-27';
  ZAK.varianty.forEach(vv => { vv.data.cenik.kurzEurKc = 25; if (vv.data.proj && vv.data.proj.cenik) vv.data.proj.cenik.kurzEurKc = 25; });
  C.kurzEurKc = 25; PC.kurzEurKc = 25;
  Object.assign(Z, { prejezd: 2.7, zdvih: 12, prohluben: 1.05, sirka: 1.51, hloubka: 1.515, patra: 5 });
  const d = aktivniVarianta(ZAK).data;
  if (!d.ock.zadani.vlastniPolozky) d.ock.zadani.vlastniPolozky = {};
  for (const s of ['hrubaOck', 'atyp', 'oplasteni', 'volitelne', 'rezie']) d.ock.zadani.vlastniPolozky[s] = [{ nazev: 'Vlastní ' + s, mnozstvi: 1, cena: 10, jednotka: 'ks' }];
  d.proj.zadani.sekce[0].polozky.push({ nazev: 'Vlastní PROJ', typ: 'hod', sazba: 'projektant', hodiny: 1, rezerva: 0, kid: 'pk1' });
  d.techspec.extra = [{ label: 'Extra', hodnota: 'h' }];
  if (typeof TECHSPEC_DEF !== 'undefined') TECHSPEC_DEF.forEach(s => (s.pole || s.radky || []).forEach(pp => { if (pp && pp.id) d.techspec.hodnoty[pp.id] = 'x'; }));
  if (typeof KRYCI_SEKCE !== 'undefined') KRYCI_SEKCE.forEach(s => (s.pole || []).forEach(pp => { d.kryci.hodnoty[pp.id] = 'x'; }));
  if (typeof KRYCI_PROJ_SEKCE !== 'undefined') KRYCI_PROJ_SEKCE.forEach(s => (s.pole || []).forEach(pp => { d.kryciProj.hodnoty[pp.id] = 'x'; }));
  if (typeof poznamkyPridej === 'function') poznamkyPridej(ZAK, 'Poznámka', { kdo: 'x', druh: 'interni' });
  Object.assign(d.sleva, { poznamka: 'p' });
  ONLINE_STAV.ja = { email: 'zpracovatel@priklad.cz', jmeno: 'Zpracovatel', titul: 'Ing.', funkce: 'f', telefon: '+420 111 222 333', podpis: '', role: 'Obchodník' };

  /* --- otrava --- */
  let n = 0;
  const STARTY = ['=', '+', '-', '@', '\t', '\r', ''];
  const PAY = (cesta) => STARTY[n++ % STARTY.length] + 'cmd|SECMZN{{FIRMA_ICO}}</w:t></w:r><w:r><w:t>INJ]]><!--"><img src=x onerror=alert(1)>&amp;'
    + '\u0000\u0001\u0008\u000b\u001f\u007f￾￿\ud800  [' + cesta + ']';
  const SKIP = /^(schema|priponySchema|aktivni|cenikRada|typ|sazba|fixKey|rezim|smer|stav|druh|role|ridici|varianta|zapnuto|jazyk|cast|zamceno|id|kid|cislo|datum|email|logo|podpis|uvodniFoto|uvodniFotoProj|ico|dic)$/;
  function otrav(o, cesta) {
    if (!o || typeof o !== 'object') return;
    for (const k of Object.keys(o)) {
      const v = o[k], cc = cesta + '.' + k;
      if (v && typeof v === 'object') { otrav(v, cc); continue; }
      if (typeof v !== 'string' || SKIP.test(k)) continue;
      o[k] = PAY(cc);
    }
  }
  for (const k of ['nazevAkce', 'adresa', 'adresaObjednatele', 'objednatel', 'kontakt', 'uvodniFotoNazev', 'uvodniFotoPopis', 'uvodniFotoProjNazev', 'uvodniFotoProjPopis'])
    ZAK[k] = PAY('zak.' + k);
  otrav(ZAK.zastupci, 'zak.zastupci'); otrav(ZAK.projHlavicka, 'zak.projHlavicka');
  ZAK.varianty.forEach((v, i) => { v.nazev = PAY('varianta.' + i + '.nazev'); });
  otrav(d.techspec, 'techspec'); otrav(d.kryci, 'kryci'); otrav(d.kryciProj, 'kryciProj');
  otrav(d.ock.zadani.vlastniPolozky, 'vlastniPolozky'); otrav(d.proj.zadani.sekce, 'proj.sekce'); otrav(d.sleva, 'sleva');
  otrav(NAST.firma, 'firma'); otrav(ONLINE_STAV.ja, 'ja');
  NAST.firma.ico = '87654321';
  const ICO_FIRMY = '87654321';

  /* --- rozbor --- */
  const RIDICI = /[\u0000-\u0008\u000b\u000c\u000e-\u001f￾￿]/;
  const dek = new TextDecoder();
  const rozborZipu = async (blob, kde) => {
    const pol = await zipPrecti(new Uint8Array(await blob.arrayBuffer()));
    const v = { kde, casti: pol.length, vadneXml: [], injekce: 0, ridici: 0, vzorce: 0, znacek: 0, rozvinuto: 0, text: '' };
    for (const x of pol) {
      if (!/\.(xml|rels)$/.test(x.nazev)) continue;
      const s = dek.decode(x.data);
      if (RIDICI.test(s)) v.ridici++;
      const dom = new DOMParser().parseFromString(s, 'application/xml');
      if (dom.getElementsByTagName('parsererror').length) { v.vadneXml.push(x.nazev + ': ' + dom.getElementsByTagName('parsererror')[0].textContent.slice(0, 120)); continue; }
      const ts = [...dom.getElementsByTagName('*')].filter(e => e.localName === 't');
      v.injekce += ts.filter(t => /^INJ/.test(t.textContent)).length;
      v.injekce += [...dom.getElementsByTagName('*')].filter(e => e.localName === 'img' || e.localName === 'script').length;
      v.vzorce += [...dom.getElementsByTagName('*')].filter(e => e.localName === 'f').length;
      const text = ts.map(t => t.textContent).join('');
      v.text += text;
      v.znacek += (text.match(/SECMZN/g) || []).length;
      v.rozvinuto += (text.match(new RegExp('SECMZN(?!\\{\\{FIRMA_ICO\\}\\})', 'g')) || []).length;
    }
    if (typeof docxXmlVady === 'function' && /docx/.test(kde)) { try { const vady = await docxXmlVady(await blob.arrayBuffer()); v.appVady = (vady || []).length; } catch (e) { v.appVady = 'chyba ' + e.message; } }
    delete v.text;
    return v;
  };
  const sablona = async (klice, bloky) => {
    const enc = new TextEncoder();
    const odst = klice.map((k, i) => i % 3 === 0
      ? `<w:p><w:r><w:t>{{</w:t></w:r><w:r><w:t>${k}}}</w:t></w:r></w:p>`
      : `<w:p><w:r><w:t xml:space="preserve">{{${k}}}</w:t></w:r></w:p>`).join('')
      + (bloky || []).map(bl => `<w:p><w:r><w:t>{{${bl}_ZAC}}</w:t></w:r></w:p><w:p><w:r><w:t>Blok ${bl}</w:t></w:r></w:p><w:p><w:r><w:t>{{${bl}_KON}}</w:t></w:r></w:p>`).join('');
    const W = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';
    const doc = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document ${W}><w:body>${odst}<w:sectPr><w:headerReference w:type="default" r:id="rId2"/></w:sectPr></w:body></w:document>`;
    const hdr = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:hdr ${W}>${klice.slice(0, 5).map(k => `<w:p><w:r><w:t>{{${k}}}</w:t></w:r></w:p>`).join('')}</w:hdr>`;
    const ct = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/></Types>';
    const rels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>';
    const drels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header1.xml"/></Relationships>';
    return zipZapis([{ nazev: '[Content_Types].xml', data: enc.encode(ct) }, { nazev: '_rels/.rels', data: enc.encode(rels) },
      { nazev: 'word/document.xml', data: enc.encode(doc) }, { nazev: 'word/_rels/document.xml.rels', data: enc.encode(drels) },
      { nazev: 'word/header1.xml', data: enc.encode(hdr) }]).arrayBuffer();
  };

  /* --- DOCX ze šablony --- */
  const v = aktivniVarianta(ZAK);
  for (const typ of ['nabidka', 'nabidkaProj', 'sod', 'sodProj', 'plnaMoc']) {
    for (const lang of ['cz', 'en']) {
      try {
        const def = dokumentDef(typ);
        if (!def) { out.chyby.push(typ + ': není registrován'); continue; }
        const d0 = def.builder(ZAK, v, JEKLY, lang, def.sablonaSymboly ? { symboly: new Set() } : null);
        const klice = Object.keys(d0.placeholders).filter(k => /^[A-Z0-9_]+$/.test(k));
        /* Bloky, které builder od šablony vyžaduje, se doplní podle hlášky (nejvýš 30 kol). */
        const bloky = []; let res = null;
        for (let kolo = 0; kolo < 30 && !res; kolo++) {
          try { res = await dokumentVygeneruj(typ, await sablona(klice, bloky), ZAK, v, JEKLY, lang); }
          catch (e) { const m = /(?:nemá blok|chybí v ní blok) (\w+)/.exec(e.message); if (!m || bloky.includes(m[1])) throw e; bloky.push(m[1]); }
        }
        const a = await rozborZipu(res.blob, 'docx ' + typ + ' ' + lang);
        a.symbolu = klice.length; out.docx.push(a);
      } catch (e) { out.chyby.push('docx ' + typ + ' ' + lang + ': ' + e.message.slice(0, 160)); }
    }
  }
  /* --- DOCX bez šablony (krycí listy) --- */
  for (const typ of dokumentTypyPrefix('kryci')) {
    try { const res = await dokumentVygeneruj(typ, null, ZAK, v, JEKLY); out.docx.push(await rozborZipu(res.blob, 'docx ' + typ)); }
    catch (e) { out.chyby.push('docx ' + typ + ': ' + e.message.slice(0, 160)); }
  }
  /* --- XLSX --- */
  const Cp = JSON.parse(JSON.stringify(C)), PCp = JSON.parse(JSON.stringify(PC));
  otrav(Cp, 'cenik'); otrav(PCp, 'cenikProj');
  const xl = async (popis, fn) => { try { out.xlsx.push(await rozborZipu(xlsxZapis(fn()), 'xlsx ' + popis)); } catch (e) { out.chyby.push('xlsx ' + popis + ': ' + e.message.slice(0, 160)); } };
  await xl('ceník (cenikToSheets)', () => cenikToSheets(Cp, PCp));
  const cdata = ctrlVychozi(); cdata.skupiny.forEach((s, i) => { s.nazev = PAY('ctrl.skupina.' + i); });
  if (typeof zamkniVariantu === 'function') zamkniVariantu(v, { kdo: PAY('zamek.kdo'), cislo: '2026 - OPR - CN - 0901', typ: 'CN', popis: PAY('zamek.popis') });
  const exp = ctrlExportVarianty(ZAK, v, { jekly: JEKLY, data: cdata, verzeMapovani: PAY('ctrl.verze'), kdo: PAY('ctrl.kdo'), build: PAY('build') });
  if (!exp.ok) out.chyby.push('ctrlExportVarianty: ' + exp.chyba);
  else {
    await xl('export předkalkulace (ctrlExportListy)', () => ctrlExportListy(exp, cdata));
    out.csv.push({ kde: 'csv export předkalkulace (ctrlExportCsv)', text: ctrlExportCsv(exp, cdata) });
  }
  await xl('mapování controllingu (ctrlMapaListy)', () => ctrlMapaListy(cdata, typeof ctrlUiKatalogNazvy === 'function' ? ctrlUiKatalogNazvy() : {}));
  const PR = JSON.parse(JSON.stringify(PREKLAD));
  Object.keys(PR).slice(0, 40).forEach((k, i) => { PR[k] = [PAY('slovnik.en.' + i), PAY('slovnik.de.' + i), PAY('slovnik.fr.' + i)]; });
  PR[PAY('slovnik.klic')] = [PAY('slovnik.klic.en'), '', ''];
  await xl('slovník (slovnikToSheets)', () => slovnikToSheets(PR, JAZYKY.filter(j => j.kod !== 'cz')));
  /* --- CSV --- */
  out.csv.push({ kde: 'csv slovník jen v aplikaci (slovnikCsvJenVApp)', text: slovnikCsvJenVApp([{ klic: PAY('sl.klic'), hodnoty: { en: PAY('sl.en'), de: PAY('sl.de'), fr: PAY('sl.fr') } }, { klic: '- odrážka', hodnoty: { en: '+ 1 patro', de: '', fr: '' } }]) });
  {
    const bloby = []; const puvURL = URL.createObjectURL; URL.createObjectURL = (bl) => { bloby.push(bl); return 'blob:x'; };
    const puvClick = HTMLAnchorElement.prototype.click; HTMLAnchorElement.prototype.click = function () {};
    try { NAST.jazyk = 'en'; tsChybejiciExport(); } catch (e) { out.chyby.push('tsChybejiciExport: ' + e.message); }
    NAST.jazyk = 'cz'; URL.createObjectURL = puvURL; HTMLAnchorElement.prototype.click = puvClick;
    for (const bl of bloby) out.csv.push({ kde: 'csv nepřeložené fráze specifikace (tsChybejiciExport)', text: await bl.text() });
  }
  return out;
}, [ZC.zkusebniCenik(), ZC.zkusebniCenikProj()]);

let ok = 0, fail = 0;
const zkus = (popis, podminka, detail) => { if (podminka) { ok++; console.log('  ✓ ' + popis); } else { fail++; console.log('  ✕ ' + popis + (detail === undefined ? '' : '  → ' + String(detail).slice(0, 300))); } };
console.log('DOCX');
for (const a of r.docx) {
  zkus(`${a.kde}: všechny XML části well-formed (${a.casti} částí${a.symbolu ? ', ' + a.symbolu + ' symbolů' : ''})`, a.vadneXml.length === 0, a.vadneXml.join(' | '));
  zkus(`${a.kde}: payload se do dokumentu dostal (${a.znacek}×)`, a.znacek > 0, a.znacek);
  zkus(`${a.kde}: žádný běh/prvek vložený z payloadu (</w:t>…<w:t>INJ, img, script)`, a.injekce === 0, a.injekce);
  zkus(`${a.kde}: žádné nepovolené řídicí znaky v XML`, a.ridici === 0, a.ridici);
  zkus(`${a.kde}: {{FIRMA_ICO}} z dat se nerozvinul (B122)`, a.rozvinuto === 0, a.rozvinuto);
  if (a.appVady !== undefined) zkus(`${a.kde}: kontrola aplikace docxXmlVady bez vad`, a.appVady === 0, a.appVady);
}
console.log('XLSX');
for (const a of r.xlsx) {
  zkus(`${a.kde}: XML well-formed (${a.casti} částí)`, a.vadneXml.length === 0, a.vadneXml.join(' | '));
  zkus(`${a.kde}: payload se do sešitu dostal (${a.znacek}×)`, a.znacek > 0, a.znacek);
  zkus(`${a.kde}: žádný vzorec <f>, text jen jako inlineStr`, a.vzorce === 0 && a.injekce === 0, `vzorce=${a.vzorce}, injekce=${a.injekce}`);
  zkus(`${a.kde}: žádné nepovolené řídicí znaky`, a.ridici === 0, a.ridici);
}
console.log('CSV');
const csvBunky = (t) => { const out = []; let i = 0, cell = '', q = false; const s = t.replace(/^﻿/, '');
  for (; i < s.length; i++) { const ch = s[i];
    if (q) { if (ch === '"' && s[i + 1] === '"') { cell += '"'; i++; } else if (ch === '"') q = false; else cell += ch; }
    else if (ch === '"') q = true; else if (ch === ';' || ch === ',' ) { out.push(cell); cell = ''; } else if (ch === '\n' || ch === '\r') { if (cell) out.push(cell); cell = ''; } else cell += ch; }
  if (cell) out.push(cell); return out; };
for (const c of r.csv) {
  const bunky = csvBunky(c.text);
  const nebezpecne = bunky.filter(x => /^[=+\-@\t\r]/.test(x) && !/^[+\-]\s/.test(x));
  const znacek = (c.text.match(/SECMZN/g) || []).length;
  zkus(`${c.kde}: payload v souboru (${znacek}×, ${bunky.length} buněk)`, znacek > 0, znacek);
  zkus(`${c.kde}: žádná buňka nezačíná = + - @ TAB CR bez apostrofu`, nebezpecne.length === 0, nebezpecne.slice(0, 3).map(x => JSON.stringify(x.slice(0, 40))).join(' | '));
}
r.chyby.forEach(x => console.log('   chyba: ' + x));
zkus('výroba dokumentů bez výjimky', r.chyby.length === 0, r.chyby.length);
zkus('stránka bez chyby', chybyStranky.length === 0, chybyStranky.join(' | '));
zkus('žádný požadavek ven', venku.length === 0, venku.join(', '));
await b.close();
console.log(`\n${ok} OK, ${fail} FAIL`);
console.log(fail ? 'VÝSLEDEK: FAIL (viz ✕ výš)' : `VÝSLEDEK: ${r.docx.length} DOCX, ${r.xlsx.length} XLSX a ${r.csv.length} CSV s otrávenými poli — XML well-formed, bez injekce, bez rozvinutí {{…}}, bez vzorců`);
process.exit(fail ? 1 : 0);
