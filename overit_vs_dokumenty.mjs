/* Ověření v prohlížeči: VÍC ŠACHET — CENOVÁ NABÍDKA A SPECIFIKACE (VS-E4 #570 / #594).
 * ============================================================================
 *
 * Na sestavené aplikaci (dist/kalkulacka.html), vypínač „Víc šachet" ZAP
 * (ONLINE_STAV.funkce.viceSachet), zakázka Výtah A (exteriér, skladebné
 * můstky) + Výtah B (interiér, 2 ks):
 *   1) Technická specifikace: přepínač šachet (Výtah A · Výtah B · 2 ks),
 *      sekce šachty s názvem vybrané šachty a hodnotami z jejího zadání
 *      (šířka 1 600 / 2 400 mm), sekce MŮSTKY jen u A; ruční hodnota pole
 *      šachty u B se zapíše do ock.dalsi[0].techspec a šachtu A nezmění;
 *      pole za zakázku (lešení) jde do v.data.techspec;
 *   2) VYP: pole šachty B jsou jen ke čtení (server by změnu odmítl), zápis
 *      se nestane; pole šachty A i zakázky zůstávají živá;
 *   3) jedna šachta: přepínač se nekreslí, nadpisy bez názvu šachty (jako dnes);
 *   4) náhled podkladů CN i tiskový dokument CN: sekce po šachtách, řádek
 *      za šachtu „Výtah A, vč. můstků", „Výtah B" a „šachet celkem: 3 ks";
 *   5) Word: šablona v16 + víc šachet → zábrana s hláškou o v17; v17 →
 *      dokument s řádky šachet, bez symbolů a značek;
 *   6) rozložení přepínače a specifikace na 1200 / 1440 / 1920: bez překryvů,
 *      bez vodorovného posuvníku; žádná chyba v konzoli.
 *
 * Pojistka: nad 079cfc6 specifikace přepínač ani sekce šachet nemá a náhled
 * CN řádky šachet nezná — body 1, 4, 5 selžou.
 * Spuštění: node overit_vs_dokumenty.mjs (po KNG_NEZVYSOVAT_VERZI=1 python3 build.py)
 */
import { chromium } from 'playwright';
import { createRequire } from 'module';

const KDE = new URL('dist/kalkulacka.html', import.meta.url).href;
const require = createRequire(import.meta.url);
let ok = 0, fail = 0;
const zkus = (popis, podminka, detail) => {
  if (podminka) { ok++; console.log('  ✓ ' + popis); }
  else { fail++; console.log('  ✕ ' + popis + (detail === undefined ? '' : '  → ' + JSON.stringify(detail).slice(0, 500))); }
};

/* šablony v16 a v17 ze syntetické v15 nástrojem (Node), do prohlížeče jako base64 */
const DG = require('./src/docxgen.js');
const vyrob = require('./nastroje/vyrob_sablony.js');
const p15 = await DG.zipPrecti(new Uint8Array(await DG.docxDokumentBlob('Nabídka', [
  { sekce: 'ZÁKLADNÍ PARAMETRY ŠACHTY', radky: [['ROZMĚR ŠACHTY – VNITŘNÍ [mm]', 'šířka {{TS_SIRKA_VNITRNI}} × hloubka {{TS_HLOUBKA_VNITRNI}}'], ['ZDVIH VÝTAHU [m]', '{{TS_ZDVIH}}']] },
  { sekce: 'DOPLŇKOVÉ KONSTRUKCE', radky: [['MŮSTKY MEZI BUDOVOU A OCK', '{{TS_MUSTKY}}'], ['OPLECHOVÁNÍ SOKLU PROHLUBNĚ', '{{TS_SOKL}}']] },
  { sekce: 'STAVEBNÍ A PŘÍPRAVNÉ PRÁCE', radky: [['ZÁBRANY DO DVEŘNÍCH VSTUPŮ', '{{TS_ZABRANY_VSTUPY}}']] },
  { sekce: 'CENA', radky: [['Cena před slevou', '{{CENA_PRED_SLEVOU}}'], ['Sleva', '− {{SLEVA_KC}} ({{SLEVA_PROC}} %)'],
    ['VÝTAHOVÁ ŠACHTA', '{{CENA_BEZ_DPH}} bez DPH'], ['CELKEM za nabídku', '{{CENA_S_DPH}} včetně DPH']] }]).arrayBuffer()));
const b64 = async pol => Buffer.from(await DG.zipZapis(pol).arrayBuffer()).toString('base64');
const uprav = (pol, fn) => pol.map(x => x.nazev === 'word/document.xml'
  ? Object.assign({}, x, { data: new TextEncoder().encode(fn(new TextDecoder().decode(x.data))) }) : x);
const p16 = uprav(p15, vyrob.cnV16);
const v16 = await b64(p16), v17 = await b64(uprav(p16, vyrob.cnV17));

const ZC = require('./src/zkusebni_cenik.js');
const SKLADBA = { mustekRamBmKc: 10000, mustekPodlahaPlechM2Kc: 1000, mustekPodlahaPororostM2Kc: 1100, mustekPodlahaVanaM2Kc: 1200,
  mustekZabradliKovBmKc: 2000, mustekZabradliSkloBmKc: 5000, mustekKotveniDeskaKc: 3000, mustekKotveniSloupKc: 3100,
  mustekKotveniKonzolaKc: 3200, mustekZabradliSkloMontazHodBm: 1 };
const cen = Object.assign(ZC.zkusebniCenik(), ZC.zkusebniMustky(), SKLADBA, { kurzEurKc: 25 });
const cenProj = ZC.zkusebniCenikProj();

const b = await chromium.launch({ args: ['--no-sandbox'] });
const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'cs-CZ' });
const p = await ctx.newPage();
const chyby = [];
p.on('pageerror', e => chyby.push('pageerror: ' + e.message));
p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|net::ERR|\/api\//.test(m.text())) chyby.push('error: ' + m.text()); });
p.on('dialog', d => d.dismiss().catch(() => {}));
await p.goto(KDE);
await p.waitForFunction(() => typeof NAST !== 'undefined' && typeof render === 'function', null, { timeout: 15000 });
await p.waitForTimeout(400);

/* zakázka se dvěma variantami šachet, vypínač ZAP */
const priprav = (vice, zapnuto) => p.evaluate(([c, cp, vice, zapnuto]) => {
  Object.assign(DEFAULT_CENIK, c); delete DEFAULT_CENIK.prazdny;
  Object.assign(DEFAULT_CENIK_PROJ, cp); delete DEFAULT_CENIK_PROJ.prazdny;
  ONLINE_STAV.ja = { email: 'spravce@priklad.cz', role: 'Administrátor', jmeno: 'S' };
  ONLINE_STAV.funkce = { viceSachet: !!zapnuto };
  ZAK = novaZakazka(); syncVarianta();
  const zad = { typSachty: 'exteriérová', profily: JSON.parse(JSON.stringify(PROFILY_VYCHOZI['exteriérová'])), zaskleni: 'na terče',
    sirka: 1.6, hloubka: 2.1, zdvih: 12, prejezd: 3.3, prohluben: 1.2, nastupiste: 4 };
  Object.assign(Z, zad, { mustky: [{ ks: 2, sirkaMm: 1600, delkaMm: 1200, podlaha: 'plech', zabradli: 'kov', zabradliStrany: 2, sloupyKs: 0, sloupVyskaM: 0 }] });
  OCK.fixes = true; Object.keys(C).forEach(k => delete C[k]); Object.assign(C, JSON.parse(JSON.stringify(c))); delete C.prazdny; delete C.ukazkove;
  ZAK.cislo = '2026 - OPR - CN - 9594'; ZAK.nazevAkce = 'TEST VS E4'; ZAK.objednatel = 'TEST s.r.o.';
  if (vice) {
    OCK.nazev = 'Výtah A';
    const zB = Object.assign(JSON.parse(JSON.stringify(DEFAULT_ZADANI)), zad, { typSachty: 'interiérová', sirka: 2.4, zdvih: 17.325,
      profily: JSON.parse(JSON.stringify(PROFILY_VYCHOZI['interiérová'])) });
    OCK.dalsi = [{ id: 's_b', nazev: 'Výtah B', ks: 2, zadani: zB }];
  }
  TS_SACHTA = 0;
  prepniTab('spec'); render();
}, [cen, cenProj, vice, zapnuto]);
const spec = () => p.evaluate(() => {
  const el = document.getElementById('page-spec');
  const h3 = [...el.querySelectorAll('h3')].map(h => h.textContent.trim());
  const radek = lbl => { const r = [...el.querySelectorAll('.spec-row')].find(x => x.querySelector('.lbl') && x.querySelector('.lbl').textContent.trim() === lbl);
    if (!r) return null; const i = r.querySelector('input, select'); return { hodnota: i ? i.value : r.textContent, disabled: !!(i && i.disabled) }; };
  return { h3, lista: [...el.querySelectorAll('.rada-prep button')].map(x => x.textContent.trim()),
    strecha: radek('STŘECHA ŠACHTY'), leseni: radek('LEŠENÍ – UVNITŘ ŠACHTY'), text: el.innerText };
});

/* 1) specifikace po šachtách (ZAP) */
await priprav(true, true);
let s = await spec();
zkus('1 přepínač šachet: Výtah A · Výtah B · 2 ks', s.lista.join('|') === 'Výtah A|Výtah B · 2 ks', s.lista);
zkus('1 šachta A: nadpisy sekcí šachty s názvem, MŮSTKY ano, stavební práce bez názvu', s.h3.includes('ZÁKLADNÍ PARAMETRY ŠACHTY – Výtah A')
  && s.h3.includes('MŮSTKY MEZI BUDOVOU A OCK – Výtah A') && s.h3.includes('STAVEBNÍ A PŘÍPRAVNÉ PRÁCE'), s.h3);
await p.evaluate(() => tsSachtaPrepni(1));
s = await spec();
zkus('1 šachta B: nadpisy s názvem B, bez sekce MŮSTKY', s.h3.includes('ZÁKLADNÍ PARAMETRY ŠACHTY – Výtah B') && !s.h3.some(h => /MŮSTKY MEZI BUDOVOU A OCK/.test(h)), s.h3);
const zapis = await p.evaluate(() => {
  tsSet('strecha', 'ruční střecha B'); tsSet('leseniUvnitr', 'ruční lešení zakázka');
  const v = aktivniVarianta(ZAK);
  return { b: (OCK.dalsi[0].techspec || {}).hodnoty, a: v.data.techspec.hodnoty };
});
zkus('1 ruční pole šachty B → ock.dalsi[0].techspec, ne do šachty A', zapis.b && zapis.b.strecha === 'ruční střecha B' && zapis.a.strecha === undefined, zapis);
zkus('1 pole za zakázku → v.data.techspec (ne do šachty B)', zapis.a.leseniUvnitr === 'ruční lešení zakázka' && !('leseniUvnitr' in zapis.b), zapis);
s = await spec();
zkus('1 šachta B ukazuje ruční střechu', s.strecha && s.strecha.hodnota === 'ruční střecha B', s.strecha);
await p.evaluate(() => tsSachtaPrepni(0));
s = await spec();
zkus('1 šachta A ruční střechu B nemá', s.strecha && s.strecha.hodnota !== 'ruční střecha B', s.strecha);

/* 2) VYP: šachta B jen ke čtení */
await priprav(true, false);
await p.evaluate(() => tsSachtaPrepni(1));
s = await spec();
zkus('2 VYP: pole šachty B zakázaná, pole zakázky živé', s.strecha && s.strecha.disabled && s.leseni && !s.leseni.disabled, [s.strecha, s.leseni]);
const vyp = await p.evaluate(() => { tsSet('strecha', 'nesmí'); return (OCK.dalsi[0].techspec || { hodnoty: {} }).hodnoty.strecha; });
zkus('2 VYP: zápis do šachty B se nestane', vyp === undefined, vyp);
await p.evaluate(() => tsSachtaPrepni(0));
s = await spec();
zkus('2 VYP: šachta A živá', s.strecha && !s.strecha.disabled);

/* 3) jedna šachta */
await priprav(false, true);
s = await spec();
zkus('3 jedna šachta: bez přepínače, nadpisy jako dnes', s.lista.length === 0 && s.h3.includes('ZÁKLADNÍ PARAMETRY ŠACHTY') && !s.h3.some(h => / – /.test(h)), s.h3);

/* 4) náhledy CN */
await priprav(true, true);
const okno = async fn => {
  const [w] = await Promise.all([ctx.waitForEvent('page', { timeout: 15000 }).catch(() => null), p.evaluate(fn)]);
  if (!w) return '';
  await w.waitForLoadState().catch(() => {});
  const t = await w.evaluate(() => document.body.innerText).catch(() => '');
  await w.close();
  return t;
};
const nahled = await okno(() => nabidkaNahled());
zkus('4 náhled podkladů: sekce po šachtách', /ZÁKLADNÍ PARAMETRY ŠACHTY – VÝTAH A/i.test(nahled) && /ZÁKLADNÍ PARAMETRY ŠACHTY – VÝTAH B \(2 KS\)/i.test(nahled), nahled.slice(0, 400));
zkus('4 náhled podkladů: řádky šachet a součet', /Výtah A, vč\. můstků – 1 ks \(bez DPH\)/.test(nahled) && /Výtah B – 2 ks \(bez DPH\)/.test(nahled)
  && /šachet celkem: 3 ks/.test(nahled) && !/Výtahová šachta \(bez DPH\)/.test(nahled), nahled.slice(nahled.indexOf('OBCHODNÍ') - 10, nahled.indexOf('OBCHODNÍ') + 400));
const dok = await okno(() => nabidkaOckDokument());
zkus('4 tiskový dokument CN: řádky šachet, počet kusů a cena celkem', /Výtah A, vč\. můstků\s+počet kusů: 1/.test(dok) && /Výtah B\s+počet kusů: 2/.test(dok)
  && /Cena celkem \(bez DPH\)\s+šachet celkem: 3 ks/.test(dok), dok.slice(dok.indexOf('OBCHODNÍ'), dok.indexOf('OBCHODNÍ') + 500));

/* 5) Word v16 (zábrana) a v17 */
const word = await p.evaluate(async ([s16, s17]) => {
  const buf = x => { const bin = atob(x); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u.buffer; };
  const text = async (sab) => {
    try {
      const g = await dokumentVygeneruj('nabidka', buf(sab), ZAK, aktivniVarianta(ZAK), JEKLY, 'cz');
      const pol = await zipPrecti(new Uint8Array(await g.blob.arrayBuffer()));
      const x = new TextDecoder().decode(pol.find(q => q.nazev === 'word/document.xml').data);
      return x.replace(/<\/w:tc>/g, ' | ').replace(/<\/w:tr>/g, '\n').replace(/<[^>]+>/g, '');
    } catch (e) { return 'CHYBA: ' + e.message; }
  };
  return { v16: await text(s16), v17: await text(s17) };
}, [v16, v17]);
zkus('5 Word v16 + víc šachet: zábrana s hláškou o v17', /^CHYBA: .*neumí rozpis po šachtách.*v17/.test(word.v16), word.v16.slice(0, 200));
zkus('5 Word v17: řádky šachet, šachet celkem, bez symbolů a značek', /Výtah A, vč\. můstků/.test(word.v17) && /Výtah B/.test(word.v17)
  && /šachet celkem: 3 ks/.test(word.v17) && /VARIANTA ŠACHTY: Výtah B – 2 ks/.test(word.v17) && !/\{\{|\{#|\{\//.test(word.v17), word.v17.slice(-700));

/* 6) rozložení specifikace s přepínačem */
for (const w of [1200, 1440, 1920]) {
  await p.setViewportSize({ width: w, height: 900 });
  await priprav(true, true);
  const roz = await p.evaluate(() => {
    const el = document.getElementById('page-spec');
    const lista = el.querySelector('.rada-prep');
    const tl = [...lista.querySelectorAll('button')].map(x => x.getBoundingClientRect());
    const prekryv = tl.some((a, i) => tl.some((c, j) => i < j && a.left < c.right - 1 && c.left < a.right - 1 && a.top < c.bottom - 1 && c.top < a.bottom - 1));
    const radky = [...el.querySelectorAll('.spec-row')].slice(0, 30).map(r => r.getBoundingClientRect());
    const prekryvRadku = radky.some((a, i) => i && a.top < radky[i - 1].bottom - 1);
    return { prekryv, prekryvRadku, posuv: document.documentElement.scrollWidth > window.innerWidth + 1,
      viditelna: tl.every(r => r.width > 20 && r.height > 10) };
  });
  zkus('6 rozložení ' + w + ': přepínač bez překryvů, řádky specifikace bez překryvů, bez vodorovného posuvníku',
    !roz.prekryv && !roz.prekryvRadku && !roz.posuv && roz.viditelna, roz);
}

zkus('žádná chyba v konzoli', chyby.length === 0, chyby);
await b.close();
console.log(`\n${ok} OK, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
