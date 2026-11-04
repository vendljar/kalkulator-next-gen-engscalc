/* Ověření v prohlížeči: ruční cena položky obchodníkem s potvrzením
 * (#561, rozhodnutí J. V. 4. 11. 2026).
 *
 * Co se hlídá (model a server hlídají src/test_561_rucni_cena.js
 * a netlify/test_561_rucni_cena.mjs; tady jde o to, co uvidí lidé):
 *   1) obchodník (bez sloupce s náklady) má u položky „✎ cena z nabídky",
 *      řádek s nákupní cenou, dodavatelem, č. nabídky, datem a platností;
 *      pole ceny je prázdné a místo ceníkové sazby „Ceník: skryto" (P12);
 *   2) zadaná cena → štítek „ručně – nepotvrzeno", zábrana tisku
 *      rucniCenaNepotvrzena; „Potvrdit cenu" → „✓ potvrzeno", tisk volný,
 *      cena vč. přirážky = nákupní cena × množství × (1 + přirážka);
 *   3) správce vidí ceníkovou sazbu a odchylku, obchodník ne;
 *   4) prošlá nabídka = štítek „nabídka prošla" a upozornění, ne zábrana;
 *   5) „↺ vrátit na ceník" vrátí sazbu platného ceníku;
 *   6) razítko ze serveru se převezme (onlineSlevyZeServeru);
 *   7) zamčená varianta: štítek bez tlačítka, žádný řádek úprav.
 * Čísla jsou smyšlená (zkusebni_cenik.js + částky v harnessu).
 *
 * Pojistka proti prázdnému testu: proti 6109e39 (v4.11.3) padá oddíl 1
 * (tlačítko ani řádek neexistují) a s ním všechny další.
 *
 * Spuštění: node overit_rucni_cena.mjs */
import { chromium } from 'playwright';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ZC = require('./src/zkusebni_cenik.js');
const KDE = new URL('dist/kalkulacka.html', import.meta.url).href;
let ok = 0, fail = 0;
const zkus = (popis, podminka, detail) => {
  if (podminka) { ok++; console.log('  ✓ ' + popis); }
  else { fail++; console.log('  ✕ ' + popis + (detail === undefined ? '' : '  → ' + JSON.stringify(detail).slice(0, 400))); }
};

const b = await chromium.launch({ args: ['--no-sandbox'] });
const p = await b.newPage({ viewport: { width: 1500, height: 1000 } });
const konzole = [];
p.on('pageerror', e => konzole.push('pageerror: ' + e.message));
p.on('console', m => { if (m.type() === 'error') konzole.push('error: ' + m.text()); });
await p.goto(KDE);
await p.waitForTimeout(600);

const PROF = 'C.profilasKgKc';
const c = ZC.zkusebniCenik(); c.profilasKgKc = 80; c.marze = 0.25;
const cp = ZC.zkusebniCenikProj();
await p.evaluate(([c, cp]) => {
  NAST.jeAdmin = true; zobrNahled('');
  PROG_STAV.db = { platny: { verze: 2, cenik: JSON.parse(JSON.stringify(c)), cenikProj: JSON.parse(JSON.stringify(cp)),
    zahranicni: { ceny: {}, jenZahr: {} } } };
  progPouzij(PROG_STAV.db.platny);
  ZAK = novaZakazka(); ZAK.cislo = '2026 - OPR - CN - 0561'; ZAK.nazevAkce = 'TEST ruční cena'; syncVarianta();
  const d = aktivniVarianta(ZAK).data;
  Object.assign(d.ock.zadani, { sirka: 1.6, hloubka: 1.8, zdvih: 9, prejezd: 3.2, prohluben: 1.2, nastupiste: 4 });
  d.cenik = JSON.parse(JSON.stringify(c)); d.proj.cenik = JSON.parse(JSON.stringify(cp));
  cenikOznacJakoDnesni(d, { verze: 2 }); syncVarianta();
  zobrNahled('Obchodník'); prepniTab('kalk'); render();
}, [c, cp]);
await p.waitForTimeout(250);

const radek = () => p.evaluate(() => {
  const tr = [...document.querySelectorAll('#page-kalk tr')].find(t => !t.classList.contains('rc-radek')
    && /PROFILY - HLAVNÍ NOSNÉ PRVKY/.test(t.textContent + ' ' + [...t.querySelectorAll('input')].map(i => i.value).join(' ')));
  if (!tr) return null;
  const pod = document.querySelector('#page-kalk tr.rc-radek[data-cesta="C.profilasKgKc"]');
  return { otevri: !!tr.querySelector('.rc-otevri'), nep: !!tr.querySelector('.rc-nepotvrzeno'), potv: !!tr.querySelector('.rc-potvrzeno'),
    prosla: !!tr.querySelector('.rc-prosla'), pod: pod ? pod.textContent.replace(/\s+/g, ' ') : null,
    hodnota: pod ? pod.querySelector('.rc-hodnota').value : null, bunky: tr.querySelectorAll('td').length };
});
const stav = () => p.evaluate(() => {
  const k = kontrolyStavAkt();
  return { brani: k.kodyBrani.includes('rucniCenaNepotvrzena'), text: kontrolyZabranaDokumentu(k, 'nabidka') || '',
    kody: k.nalezy.map(x => x.kod) };
});
const zmen = (sel, hodnota) => p.evaluate(([sel, hodnota]) => {
  const el = document.querySelector('#page-kalk tr.rc-radek[data-cesta="C.profilasKgKc"] ' + sel);
  el.value = hodnota; el.dispatchEvent(new Event('change'));
}, [sel, hodnota]);

console.log('— 1) obchodník: tlačítko a řádek (P12)');
let r = await radek();
zkus('obchodník (bez sloupce s náklady): u profilů tlačítko „✎ cena z nabídky"', r && r.otevri && !r.nep && !r.pod, r);
await p.evaluate(() => rcOtevri('C.profilasKgKc'));
await p.waitForTimeout(150);
r = await radek();
zkus('řádek: nákupní cena, dodavatel, č. nabídky, datum, platnost do, Potvrdit, zavřít', r && r.pod
  && /Nákupní cena/.test(r.pod) && /Dodavatel/.test(r.pod) && /Č\. nabídky/.test(r.pod) && /Datum nabídky/.test(r.pod)
  && /Platnost do/.test(r.pod) && /Potvrdit cenu/.test(r.pod), r);
zkus('P12: pole ceny prázdné (nepředvyplní ceníkovou sazbu), „Ceník: skryto", žádná odchylka', r && r.hodnota === ''
  && /Ceník: skryto/.test(r.pod) && !/odchylka/.test(r.pod) && !/\b80\b/.test(r.pod), r);

console.log('— 2) zadání, zábrana, potvrzení');
await zmen('.rc-hodnota', '95');
await p.waitForTimeout(150);
r = await radek();
let s = await stav();
zkus('zadaná cena → štítek „ručně – nepotvrzeno"', r && r.nep && !r.potv, r);
zkus('… tisk nabídky zastaven zábranou „Potvrďte ruční cenu u: …"', s.brani && /Potvrďte ruční cenu u: PROFILY/i.test(s.text), s);
const ceny = await p.evaluate(() => { const v = vypocetAkt(); const x = v.sekce.hrubaOck.find(r => r.cenaPath === 'C.profilasKgKc');
  return { cena: x.cena, naklad: x.naklad, mn: x.mnozstvi, s: x.sMarzi, c: aktivniVarianta(ZAK).data.cenik.profilasKgKc }; });
zkus('výpočet: nákupní cena 95, cena vč. přirážky = náklad × 1,25', ceny.cena === 95 && ceny.c === 95
  && Math.abs(ceny.naklad - ceny.mn * 95) < 1e-6 && Math.abs(ceny.s - ceny.naklad * 1.25) < 1e-6, ceny);
await zmen('.rc-dodavatel', 'Ocelárna Příklad s.r.o.');
await zmen('.rc-cislo', 'N-2026-0815');
await zmen('.rc-platnostDo', '2099-12-31');
await p.evaluate(() => document.querySelector('#page-kalk tr.rc-radek .rc-potvrdit').click());
await p.waitForTimeout(150);
r = await radek(); s = await stav();
zkus('„Potvrdit cenu" → „✓ potvrzeno", řádek se zavře', r && r.potv && !r.nep && !r.pod, r);
zkus('… tisk nabídky už nic nezastaví', !s.brani && s.text === '', s);
const rec = await p.evaluate(() => aktivniVarianta(ZAK).data.rucniCeny['C.profilasKgKc']);
zkus('záznam: zdroj, prozatímní razítko (server ho po uložení přepíše)', rec && rec.dodavatel === 'Ocelárna Příklad s.r.o.'
  && rec.cislo === 'N-2026-0815' && rec.potvrdil && rec.potvrdil.lokalne === true, rec);
await p.evaluate(() => rcOtevri('C.profilasKgKc'));
await zmen('.rc-cislo', 'N-2026-0816');
await p.waitForTimeout(150);
r = await radek(); s = await stav();
zkus('změna zdroje po potvrzení → zase „nepotvrzeno" a zábrana', r && r.nep && s.brani, { r, s });
await p.evaluate(() => document.querySelector('#page-kalk tr.rc-radek .rc-potvrdit').click());
await p.waitForTimeout(150);

console.log('— 3) správce vidí ceník a odchylku, obchodník ne');
await p.evaluate(() => { zobrNahled(''); rcOtevri('C.profilasKgKc'); });
await p.waitForTimeout(150);
r = await radek();
zkus('správce: „Ceník: 80 …" a odchylka +15 (+18,8 %)', r && r.pod && /Ceník: 80/.test(r.pod) && /odchylka \+15/.test(r.pod) && /18,8 %/.test(r.pod), r && r.pod);
await p.evaluate(() => { zobrNahled('Obchodník'); render(); });
await p.waitForTimeout(150);
r = await radek();
zkus('obchodník: pořád „Ceník: skryto", bez odchylky', r && r.pod && /Ceník: skryto/.test(r.pod) && !/odchylka/.test(r.pod), r && r.pod);
await p.evaluate(() => rcZavri('C.profilasKgKc'));

console.log('— 4) prošlá nabídka');
await p.evaluate(() => { const x = aktivniVarianta(ZAK).data.rucniCeny['C.profilasKgKc']; x.platnostDo = '2020-01-31'; render(); });
await p.waitForTimeout(150);
r = await radek(); s = await stav();
zkus('prošlá platnost → štítek „nabídka prošla" a upozornění, tisk volný', r && r.prosla && s.kody.includes('rucniCenaProsla') && !s.brani, { r, s });

console.log('— 5) razítko ze serveru');
const sync = await p.evaluate(() => {
  const v = aktivniVarianta(ZAK);
  const odeslane = onlineSlevyOtisk(ZAK);
  const rc = JSON.parse(JSON.stringify(v.data.rucniCeny));
  rc['C.profilasKgKc'].potvrdil = { jmeno: 'Obch Server (Obchodník)', email: 'obch@priklad.cz', kdy: '2026-11-04T10:00:00.000Z' };
  rc['C.profilasKgKc'].zaklad = 80;
  const n = onlineSlevyZeServeru([{ id: v.id, sleva: v.data.sleva, slevaProj: v.data.slevaProj, cenovaVyjimka: null, rucniCeny: rc }], odeslane);
  return { n, p: v.data.rucniCeny['C.profilasKgKc'].potvrdil };
});
zkus('prohlížeč převezme razítko serveru (kdo a kdy)', sync.n === 1 && sync.p.email === 'obch@priklad.cz' && !sync.p.lokalne, sync);

console.log('— 6) ↺ vrátit na ceník');
await p.evaluate(() => { rcOtevri('C.profilasKgKc'); });
await p.waitForTimeout(100);
await p.evaluate(() => document.querySelector('#page-kalk tr.rc-radek .rc-vratit').click());
await p.waitForTimeout(150);
const zpet = await p.evaluate(() => ({ c: aktivniVarianta(ZAK).data.cenik.profilasKgKc, rc: aktivniVarianta(ZAK).data.rucniCeny || null }));
r = await radek();
zkus('↺ vrátí sazbu platného ceníku (80) a smaže záznam', zpet.c === 80 && !zpet.rc && r && !r.nep && !r.potv, { zpet, r });

console.log('— 7) zamčená varianta');
await p.evaluate(() => {
  const v = aktivniVarianta(ZAK);
  rucniCenaNastav(v.data, 'C.profilasKgKc', 95); rucniCenaPotvrd(v.data, 'C.profilasKgKc', 'T');
  zamkniVariantu(v, { typ: 'nabidka', kdy: new Date().toISOString(), kdo: 'T', cislo: variantaCislo(ZAK, v),
    vysledek: zamekVysledekSpocti(v, JEKLY, 'harness') });
  render();
});
await p.waitForTimeout(150);
r = await radek();
zkus('zamčená varianta: štítek „✓ potvrzeno" bez tlačítka a bez řádku úprav', r && r.potv && !r.otevri && !r.pod, r);
const pokus = await p.evaluate(() => { try { rcHodnota('C.profilasKgKc', 50); } catch (e) { /* nic */ }
  return aktivniVarianta(ZAK).data.cenik.profilasKgKc; });
zkus('… a cenu změnit nejde', pokus === 95, pokus);
await p.evaluate(() => { PROG_STAV.db = null; zobrNahled(''); render(); });

zkus('žádná chyba JavaScriptu', konzole.length === 0, konzole.slice(0, 3));
await b.close();
console.log(`\n${ok} OK, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
