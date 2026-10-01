/* Ověření v prohlížeči: šířka bočního světlíku při ručním počtu světlíků
 * (roadmapa #381, rozhodnutí J. V. 1. 10. 2026: „s návrhem šířky bočního
 * světlíku souhlasím, zapracuj ho pro model 2 (modelu 1 nic neměň)")
 * ============================================================================
 *
 * Hlídá se na sestavené aplikaci (dist/kalkulacka.html), zakázka ze snímku
 * J. V. (exteriér, šířka 1,5 m, 5 nástupišť, vstup 800, rám 100, nad dveřmi
 * plech, boky sklo — mezera vedle dveří 600 mm):
 *   1) řádek „Šířka bočního světlíku" se ukáže JEN v Modelu 2 při ručním
 *      počtu světlíků, hned pod počtem; s předpočítanou šířkou a nápovědou;
 *      v Modelu 1 ani při automatickém počtu ne;
 *   2) zápis šířky (pole na obrazovce) změní plochu v kalkulaci (řádek
 *      MATERIÁL VSG 4.4.1 6,6 → 3,3 m²), označí se „ručně" s ↺, nápověda
 *      a upozornění na zbytek mezery; Detail mezivýpočtů ukáže mezeru,
 *      předpočítanou a použitou šířku i plochu boků; specifikace „šířka
 *      300 mm";
 *   3) šířka 750 mm (širší než mezera): červená věta u pole, zábrana
 *      v kontrole a zhasnutá tlačítka nabídky OCK (dokumenty PROJ ne);
 *   4) ↺ u šířky vrátí předpočítanou; ↺ u počtu řádek schová a šířku smaže;
 *   5) zámek varianty a náhled: zapisovače jsou obalené, zamčená varianta
 *      šířku nepřijme.
 *
 * Spuštění: node overit_svetliky_sirka.mjs (po python3 build.py)
 */
import { chromium } from 'playwright';
import { createRequire } from 'module';

const KDE = new URL('dist/kalkulacka.html', import.meta.url).href;
let ok = 0, fail = 0;
const zkus = (popis, podminka, detail) => {
  if (podminka) { ok++; console.log('  ✓ ' + popis); }
  else { fail++; console.log('  ✕ ' + popis + (detail === undefined ? '' : '  → ' + detail)); }
};

const b = await chromium.launch({ args: ['--no-sandbox'] });
const p = await (await b.newContext({ viewport: { width: 1500, height: 1000 } })).newPage();
const chyby = [];
p.on('pageerror', e => chyby.push('pageerror: ' + e.message));
p.on('console', m => { if (m.type() === 'error') chyby.push('error: ' + m.text()); });
await p.goto(KDE);
await p.waitForFunction(() => typeof NAST !== 'undefined' && typeof render === 'function', null, { timeout: 15000 });
await p.waitForTimeout(400);

/* Sestavení nese nulový ceník (ten sám zastaví všechny dokumenty) — zkušební
 * ceník z repozitáře, stejně jako overit_zabrany_dokumenty.mjs. */
const ZC = createRequire(import.meta.url)('./src/zkusebni_cenik.js');
await p.evaluate(([c, cp]) => {
  Object.assign(DEFAULT_CENIK, c); delete DEFAULT_CENIK.prazdny;
  Object.assign(DEFAULT_CENIK_PROJ, cp); delete DEFAULT_CENIK_PROJ.prazdny;
  ZAK = novaZakazka(); syncVarianta();
  Object.assign(Z, { typSachty: 'exteriérová', profily: JSON.parse(JSON.stringify(PROFILY_VYCHOZI['exteriérová'])),
    zaskleni: 'na terče', sirka: 1.5, hloubka: 1, zdvih: 8, prejezd: 2, prohluben: 2, nastupiste: 5, rohoveSloupky: 4,
    typPortalu: 'zapuštěný', roztec: 1.25, sirkaRamuMm: 100, cistyVstupMm: 800, nadDvermi: 'plech', bokyDveri: 'sklo',
    svetlikyBokyKs: '' });
  OCK.fixes = true;
  prepniTab('kalk'); render();
}, [ZC.zkusebniCenik(), ZC.zkusebniCenikProj()]);

/* Stav řádků zadání: počet a šířka, jejich pořadí, nápověda a věty kontroly. */
const stav = () => p.evaluate(() => {
  prepniTab('kalk'); render();
  const lbl = t => [...document.querySelectorAll('#inputs .row > label')].find(l => l.textContent.trim().indexOf(t) === 0);
  const pocet = lbl('Celkem světlíků na bocích dveří'), sirka = lbl('Šířka bočního světlíku');
  const radek = sirka ? sirka.parentElement : null;
  const pod = [];
  for (let el = radek ? radek.nextElementSibling : null; el && el.classList.contains('note'); el = el.nextElementSibling)
    pod.push({ trida: el.className, text: el.textContent.trim() });
  const vsg = document.querySelector('#page-kalk input[onchange^="mnozstviSet(\'MATERIÁL VSG 4.4.1\'"]');
  return {
    pocet: pocet ? pocet.parentElement.querySelector('input').value : null,
    sirka: !!sirka,
    hned: !!(sirka && pocet && pocet.parentElement.nextElementSibling === radek),
    hodnota: radek ? radek.querySelector('input').value : null,
    rucne: !!(sirka && sirka.querySelector('.pill')),
    pillTitul: sirka && sirka.querySelector('.pill') ? sirka.querySelector('.pill').getAttribute('title') : '',
    zpet: !!(radek && radek.querySelector('button')),
    jednotka: radek ? (radek.querySelector('.u') || {}).textContent : '',
    pod,
    data: Z.svetlikyBokySirkaMm,
    vsg: vsg ? vsg.value : null,
    bokyM2: vypocetAkt().zaskleni.vypln.bokyM2,
  };
});
/* Zápis do pole a klik na ↺ jako uživatel. Chybí-li pole nebo tlačítko
 * (např. sestavení před #381), nic se nestane — selžou kontroly, ne běh. */
const zapis = (popisek, h) => p.evaluate(([popisek, h]) => {
  const l = [...document.querySelectorAll('#inputs .row > label')].find(x => x.textContent.trim().indexOf(popisek) === 0);
  const i = l && l.parentElement.querySelector('input');
  if (!i) return false;
  i.value = h; i.dispatchEvent(new Event('change')); return true;
}, [popisek, h]);
const zapisSirku = h => zapis('Šířka bočního světlíku', h);
const zapisPocet = h => zapis('Celkem světlíků na bocích dveří', h);
const klikZpet = co => p.evaluate(co => {
  const l = [...document.querySelectorAll('#inputs .row > label')].find(x => x.textContent.trim().indexOf(co) === 0);
  const t = l && l.parentElement.querySelector('button');
  if (t) t.click();
  return !!t;
}, co);

/* ---------------------------------------------------------------- */
console.log('\n1) kdy se řádek ukáže');
let s = await stav();
zkus('Model 2, automatický počet (10): řádek šířky se neukáže', s.pocet === '10' && !s.sirka, JSON.stringify(s));
await zapisPocet('5');
s = await stav();
zkus('ruční počet 5 v Modelu 2: řádek „Šířka bočního světlíku" se ukáže hned pod počtem, jednotka mm',
  s.pocet === '5' && s.sirka && s.hned && s.jednotka === 'mm', JSON.stringify(s));
zkus('… s předpočítanou šířkou 600 mm, bez štítku „ručně" a bez ↺', s.hodnota === '600' && !s.rucne && !s.zpet && s.data === '',
  JSON.stringify(s));
zkus('… nápověda „předpočítáno z mezery vedle dveří 600 mm: 5 dveří s jedním (600 mm)"',
  s.pod.length === 1 && s.pod[0].text === 'předpočítáno z mezery vedle dveří 600 mm: 5 dveří s jedním (600 mm)', JSON.stringify(s.pod));
zkus('… plocha v kalkulaci zůstává 6,6 m² (předpočítaná šířka cenou nehne)', s.vsg === '6.6' && Math.abs(s.bokyM2 - 6.6) < 1e-9, s.vsg);
await zapisPocet('7');
s = await stav();
zkus('smíšené 7 ks: předpočítaná 429 mm a nápověda „2 dveře se dvěma (po 300 mm), 3 dveře s jedním (600 mm) → průměr"',
  s.hodnota === '429' && s.pod[0] && s.pod[0].text === 'předpočítáno z mezery vedle dveří 600 mm: 2 dveře se dvěma (po 300 mm), 3 dveře s jedním (600 mm) → průměr',
  JSON.stringify(s));
await zapisPocet('5');
const m1 = await p.evaluate(() => { OCK.fixes = false; render(); return null; });
s = await stav();
zkus('Model 1: řádek šířky se neukáže ani při ručním počtu', s.pocet === '5' && !s.sirka, JSON.stringify(s));
await p.evaluate(() => { OCK.fixes = true; render(); });

/* ---------------------------------------------------------------- */
console.log('\n2) zápis šířky změní plochu v kalkulaci');
await zapisSirku('300');
s = await stav();
zkus('šířka 300 mm se uloží jako číslo a označí „ručně" s ↺', s.data === 300 && s.hodnota === '300' && s.rucne && s.zpet
  && /předpočítaná šířka 600 mm/.test(s.pillTitul), JSON.stringify(s));
zkus('kalkulace: MATERIÁL VSG 4.4.1 6,6 → 3,3 m² (5 × 0,3 × 2,2)', s.vsg === '3.3' && Math.abs(s.bokyM2 - 3.3) < 1e-9, s.vsg);
zkus('nápověda „zadáno ručně; předpočítaná šířka 600 mm" a oranžové upozornění na zbytek 1,50 m',
  s.pod.length === 2 && s.pod[0].text === 'zadáno ručně; předpočítaná šířka 600 mm'
  && /boky-sirka-upozorneni/.test(s.pod[1].trida) && s.pod[1].text === 'Vedle dveří zůstane 1,50 m šířky, kterou nic neoceňuje.',
  JSON.stringify(s.pod));
const det = await p.evaluate(() => { prepniTab('detail'); render(); const t = document.getElementById('page-detail').textContent; prepniTab('kalk'); render(); return t; });
zkus('Detail mezivýpočtů: mezera 600 mm, šířka předpočítaná / použitá 600 mm / 300 mm (ručně), plocha boků 3,3 m² = 5 × 0,3 × 2,2',
  /Mezera vedle dveří\s*600 mm/.test(det) && /Šířka bočního světlíku — předpočítaná \/ použitá\s*600 mm \/ 300 mm \(ručně\)/.test(det)
  && /Plocha boků \(výplň vedle dveří\)\s*3,3 m²\s*počet × šířka × 2,2 m = 5 × 0,3 × 2,2/.test(det),
  det.slice(det.indexOf('Plocha boků'), det.indexOf('Plocha boků') + 200));
const spec = await p.evaluate(() => {
  const pole = TECHSPEC_DEF.map(x => x.pole).flat().find(x => x.id === 'svetlikyDveri');
  return tsHodnota(pole, TS, vypocetAkt(), Z, C, 'cz').text;
});
zkus('technická specifikace: „Světlíky na bocích dveří: 5 ks, šířka 300 mm, sklo VSG 4.4.1, na terče"',
  spec.indexOf('Světlíky na bocích dveří: 5 ks, šířka 300 mm, sklo VSG 4.4.1, na terče') >= 0, spec);
const pred = await p.evaluate(() => ({ zab: dokumentZabrana('nabidka'), kody: kontrolyStavAkt().kodyBrani }));
zkus('zbytek mezery dokument nezastaví (jen upozornění)', pred.zab === '' && pred.kody.indexOf('bokyDveri') < 0, JSON.stringify(pred));

/* ---------------------------------------------------------------- */
console.log('\n3) šířka 750 mm — širší než mezera: zábrana');
await zapisSirku('750');
s = await stav();
zkus('pod polem červená věta „Boční světlík (750 mm) je širší než mezera vedle dveří (600 mm)…"',
  s.pod.some(x => /boky-sirka-zabrana/.test(x.trida) && x.text.indexOf('Boční světlík (750 mm) je širší než mezera vedle dveří (600 mm)') === 0),
  JSON.stringify(s.pod));
const tl = await p.evaluate(() => {
  const kody = kontrolyStavAkt().kodyBrani;
  prepniTab('spec'); render();
  const el = document.getElementById('page-spec');
  const najdi = re => [...el.querySelectorAll('button')].find(x => re.test(x.getAttribute('onclick') || ''));
  const st = x => x ? { dis: x.disabled, title: x.getAttribute('title') || '' } : null;
  const out = { kody, ockTisk: st(najdi(/^nabidkaOckDokument\(/)), ockWord: st(najdi(/^nabidkaWord\(/)),
    proj: dokumentZabrana('nabidkaProj'), plnaMoc: dokumentZabrana('plnaMoc'), sod: dokumentZabrana('sod') };
  prepniTab('kalk'); render();
  return out;
});
zkus('kontrola hlásí zábranu „bokyDveri"', tl.kody.indexOf('bokyDveri') >= 0, JSON.stringify(tl.kody));
zkus('„Kompletní náhled a tisk nabídky" i „Vytvořit nabídku (Word)" OCK zhasnuté s bublinou, co opravit',
  tl.ockTisk && tl.ockTisk.dis && tl.ockWord && tl.ockWord.dis && /Světlíky na bocích dveří: Boční světlík \(750 mm\)/.test(tl.ockTisk.title),
  JSON.stringify({ a: tl.ockTisk, b: tl.ockWord }));
zkus('SoD OCK zastavená, nabídka PROJ a plná moc ne', /Boční světlík/.test(tl.sod) && tl.proj === '' && tl.plnaMoc === '', JSON.stringify(tl));
const m1z = await p.evaluate(() => { OCK.fixes = false; render(); const r = { kody: kontrolyStavAkt().kodyBrani, zab: dokumentZabrana('nabidka') };
  OCK.fixes = true; render(); return r; });
zkus('v Modelu 1 se šířka nehlídá (stejná data, žádná zábrana)', m1z.kody.indexOf('bokyDveri') < 0 && m1z.zab === '', JSON.stringify(m1z));

/* ---------------------------------------------------------------- */
console.log('\n4) ↺ u šířky a ↺ u počtu');
await klikZpet('Šířka bočního světlíku');
s = await stav();
zkus('↺ u šířky: předpočítaná 600 mm, bez štítku, plocha zpět 6,6 m², zábrana pryč', s.data === '' && s.hodnota === '600' && !s.rucne && !s.zpet
  && s.vsg === '6.6' && await p.evaluate(() => dokumentZabrana('nabidka') === ''), JSON.stringify(s));
await zapisSirku('300');
await klikZpet('Celkem světlíků na bocích dveří');
s = await stav();
zkus('↺ u počtu: automatika 10 ks, řádek šířky zmizí a ruční šířka se smaže', s.pocet === '10' && !s.sirka && s.data === ''
  && s.vsg === '6.6', JSON.stringify(s));
await zapisPocet('5');
s = await stav();
zkus('… a po novém ručním počtu je šířka zase předpočítaná (600 mm)', s.sirka && s.hodnota === '600' && !s.rucne, JSON.stringify(s));

/* ---------------------------------------------------------------- */
console.log('\n5) zámek varianty a náhled');
const zam = await p.evaluate(() => ({ set: !!(window.bokySirkaSet && window.bokySirkaSet._zamek),
  zpet: !!(window.bokySirkaZpet && window.bokySirkaZpet._zamek), ks: !!(window.bokyKsZpet && window.bokyKsZpet._zamek) }));
zkus('bokySirkaSet, bokySirkaZpet i bokyKsZpet jsou obalené zámkem (ZAMEK_CHRANENE)', zam.set && zam.zpet && zam.ks, JSON.stringify(zam));
const zamceno = await p.evaluate(async () => {
  const v = aktivniVarianta(ZAK);
  v.zamek = { zamceno: true, kdy: '2026-10-01T08:00:00.000Z', typ: 'nabidka', cislo: 'X', otisk: {} };
  if (typeof bokySirkaSet !== 'function') { delete v.zamek; return 'bokySirkaSet chybí'; }
  bokySirkaSet('200');
  await new Promise(r => setTimeout(r, 120));
  /* Dotaz zámku „Založit klon…?" — „Nechat beze změny" (klon nechceme). */
  const t = document.querySelector('#dlg [data-dlg="ne"]');
  if (t) t.click();
  await new Promise(r => setTimeout(r, 80));
  const data = Z.svetlikyBokySirkaMm;
  delete v.zamek; render();
  return data;
});
zkus('zamčená (odeslaná) varianta šířku nepřijme', zamceno === '', JSON.stringify(zamceno));

zkus('žádná chyba stránky', chyby.length === 0, chyby.join(' | '));
await b.close();
console.log(`\n${ok} OK, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
