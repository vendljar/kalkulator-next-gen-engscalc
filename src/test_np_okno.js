/* NP (19. 11. 2026) — OKNO „Kompletní náhled podkladů" (ui/nahled_word_ui.js) ve vm.
 *
 *  1) jazyk podle volby „Jazyk tisku" (tiskJazyk), ne podle jazyka aplikace;
 *  2) tlačítko „Vytvořit nabídku (Word)" má tytéž zábrany jako v aplikaci
 *     (dokumentZabrana('nabidka', varianta)) — se zábranou vypnuté a s důvodem,
 *     bez ní volá nabidkaWord();
 *  3) data z pohledu zákazníka (vzTiskVstup → vt.zak), ne z celé zakázky ZAK;
 *  4) stránky: šablona stránky se záhlavím („Cenová nabídka", logo / název
 *     firmy, číslo) a zápatím (FIRMA_PATICKA), tok dokumentu, stránkování;
 *     tisk (@media print) bez pruhu; DODAVATEL ani věta „Přesně tyto
 *     hodnoty…" nejsou;
 *  5) zámek strany (OVP) náhled zastaví hláškou, okno se neotevře.
 * Pojistka: mutace [NP] v mutace_jadro.mjs (jazyk aplikace, Word bez zábran,
 * náhled z ZAK) tuhle sadu shodí — viz zpráva commitu.
 * Spuštění: cd src && node test_np_okno.js */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ZV = require('../nastroje/zlata_vs.js');

let ok = 0, fail = 0;
const test = (n, c, info) => { if (c) { ok++; console.log('OK   ' + n); }
  else { fail++; console.log('FAIL ' + n + '  ' + (info === undefined ? '' : JSON.stringify(info).slice(0, 600))); } };

ZV.pevneHodiny();
for (const f of ZV.CORE.concat(['nahled_word.js'])) {
  const p = path.join(__dirname, f);
  if (!fs.existsSync(p)) continue;
  const m = require(p);
  if (m && typeof m === 'object') Object.assign(global, m);
}
const ZC = require('./zkusebni_cenik.js');
global.DEFAULT_CENIK = ZC.zkusebniCenik();
global.DEFAULT_CENIK_PROJ = ZC.zkusebniCenikProj();
const JEKLY = JSON.parse(fs.readFileSync(path.join(__dirname, 'jekly.json'), 'utf8'));

function zakazka() {
  const z = novaZakazka();
  z.cislo = '2026-OPR-CN-9692'; z.nazevAkce = 'NP okno'; z.objednatel = 'Řídící zákazník s.r.o.'; z.kontakt = 'Řídící Kontakt';
  ZV.pevneDatum(z);
  const v = z.varianty[0];
  Object.assign(v.data.ock.zadani, { prejezd: 3.3, zdvih: 12, prohluben: 1.2, sirka: 1.6, hloubka: 2.1, nastupiste: 4, typSachty: 'interiérová' });
  v.data.cenik = Object.assign(ZC.zkusebniCenik(), { kurzEurKc: 25 });
  return z;
}

/* Okno náhledu: document.write sbírá HTML, getElementById vrací tlačítko. */
function falesneOkno() {
  const tlacitka = {};
  const w = {
    html: '', zavreno: false,
    document: {
      write(t) { w.html += t; },
      close() { w.zavreno = true; },
      getElementById(id) { return tlacitka[id] || (tlacitka[id] = { id, onclick: null, textContent: '' }); },
    },
  };
  return w;
}

function spust(o) {
  o = o || {};
  const ZAK = o.zak || zakazka();
  const okna = [], hlasky = [], volano = { word: 0 };
  const pohled = o.pohled ? o.pohled(ZAK) : ZAK;
  const ctx = Object.assign({}, global, {
    ZAK, JEKLY, console,
    tiskJazyk: () => o.tisk || 'cz',
    jazyk: () => o.aplikace || 'cz',
    nabidkaVarianta: async () => ZAK.varianty[0],
    vzTiskVstup: (typ, v) => ({ zak: pohled, varianta: pohled.varianty.find(x => x.id === v.id) || v }),
    dokumentZabrana: () => o.zabrana || '',
    kontrolyStranaZabrana: () => o.strana || '',
    hlaska: (t) => { hlasky.push(t); },
    oknoNahledu: () => { const w = falesneOkno(); okna.push(w); return w; },
    nabidkaWord: () => { volano.word++; },
    esc: s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'),
    window: { focus() {} },
  });
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(__dirname, 'ui', 'nahled_word_ui.js'), 'utf8'), ctx);
  return ctx.nabidkaNahled().then(() => ({ okna, hlasky, volano, html: okna[0] ? okna[0].html : '', okno: okna[0] }));
}

(async () => {
  /* 1) jazyk tisku */
  {
    const r = await spust({ tisk: 'en', aplikace: 'cz' });
    test('1 jazyk podle „Jazyk tisku" (EN), ne podle aplikace (CZ)', /Jazyk: EN/.test(r.html) && /lang="en"/.test(r.html) && !/>Objednatel:</.test(r.html),
      (r.html.match(/Jazyk: [A-Z]+/) || [])[0]);
    const c = await spust({ tisk: 'cz', aplikace: 'en' });
    test('1 Jazyk tisku CZ při anglické aplikaci → česky', /Jazyk: CZ/.test(c.html) && />Objednatel:</.test(c.html));
  }
  /* 2) zábrany tlačítka Word */
  {
    const r = await spust({ zabrana: 'Zkušební zábrana (test).' });
    test('2 se zábranou: tlačítko Word vypnuté s důvodem a hláška v pruhu', /id="nwWord" disabled title="Zkušební zábrana \(test\)\."/.test(r.html)
      && /Word teď vytvořit nejde: Zkušební zábrana/.test(r.html), (r.html.match(/<button class="nw-primary"[^>]*>/) || [])[0]);
    test('2 se zábranou: tlačítko nemá obsluhu', !r.okno.document.getElementById('nwWord').onclick);
    const b = await spust({});
    const btn = b.okno.document.getElementById('nwWord');
    test('2 bez zábrany: tlačítko zapnuté a volá nabidkaWord()', /id="nwWord">/.test(b.html) && typeof btn.onclick === 'function' && (btn.onclick(), b.volano.word === 1));
  }
  /* 3) pohled zákazníka */
  {
    const r = await spust({ pohled: z => {
      const p = JSON.parse(JSON.stringify(z));
      p.objednatel = 'Další zákazník a.s.'; p.kontakt = 'Další Kontakt';
      return p;
    } });
    test('3 hlavička z pohledu zákazníka (vt.zak), ne z ZAK', /Další zákazník a\.s\./.test(r.html) && !/Řídící zákazník/.test(r.html));
  }
  /* 4) stránky, tisk, co v náhledu není */
  {
    const r = await spust({});
    const h = r.html;
    test('4 šablona stránky: záhlaví „Cenová nabídka", logo/firma, číslo, zápatí s patičkou',
      /<template id="nwSablonaStrany">/.test(h) && /nw-zahlavi-text">Cenová nabídka</.test(h) && /nw-logo(-text)?/.test(h) && /class="nw-cislo"/.test(h)
      && /<footer class="nw-zapati">[^<]*IČ/.test(h), (h.match(/<footer class="nw-zapati">[\s\S]{0,120}/) || [])[0]);
    test('4 tok dokumentu a stránkování', /<div id="nwTok">/.test(h) && /<div id="nwStranky">/.test(h) && /window\.nwRozloz=rozloz/.test(h) && r.okno.zavreno);
    test('4 tisk: @media print skryje pruh a tok', /@media print\{[\s\S]*\.nw-lista[^}]*display:none[\s\S]*#nwTok\{display:none\}/.test(h));
    test('4 písmo Calibri, náhradou Carlito (systémové, bez externích serverů)', /font-family:Calibri,Carlito/.test(h) && !/https?:\/\//.test(h.replace(/www\.[^<\s]*/g, '')));
    test('4 DODAVATEL a věta „Přesně tyto hodnoty…" nejsou', !/DODAVATEL/.test(h) && !/Přesně tyto hodnoty/.test(h));
    test('4 pořadí: I. CENOVÁ NABÍDKA → II. příplatky → III. platební podmínky', h.indexOf('I. CENOVÁ NABÍDKA:') > 0
      && h.indexOf('II. ROZŠÍŘENÍ CENOVÉ NABÍDKY') > h.indexOf('CELKEM za nabídku') && h.indexOf('III. PLATEBNÍ PODMÍNKY:') > h.indexOf('II. ROZŠÍŘENÍ CENOVÉ NABÍDKY'));
    test('4 upozornění v pruhu (bez fotky)', /<ul class="nw-varovani"><li>Chybí úvodní fotka/.test(h));
  }
  /* 5) zámek strany */
  {
    const r = await spust({ strana: 'Zakázka je jen projekce (OVP).' });
    test('5 zámek strany: hláška, okno se neotevře', r.okna.length === 0 && r.hlasky.length === 1 && /OVP/.test(r.hlasky[0]));
  }
  console.log(`\nVýsledek: ${ok} OK, ${fail} FAIL`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
