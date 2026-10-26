/* overit_t4.mjs — T4 z revize v22.9.9 (#319): chování místo tvaru zdrojáku
 *
 * VZNIK (26. 10. 2026, dávka O2 #517, uzavírá #319). Revize v22.9.9 (nález T4)
 * upozornila, že tři sady hlídají regulárními výrazy TVAR zdrojáku, ne
 * chování: `test_poznamky.js` (karta poznámek bez příloh), `test_standard_atyp.js`
 * (automat ATYP a sjednocená sazba hodin P11) a `test_zamek_prepnuti.js`
 * (nová zakázka shodí zámek čtení, P15). Takový test projde i nad rozbitým
 * chováním a spadne, když někdo řádek jen přeformátuje. První dva kroky T4
 * (zaokrouhlení OCK × PROJ v23.9.3, popisky zadání a detail v24.9.3) už ověřují
 * prohlížeč; tady je poslední krok — totéž, co ty tři sady hlídaly, ale
 * v běžící aplikaci:
 *
 *  A) karta Interní poznámky: jedno textové pole, žádné nahrání přílohy ani
 *     vkládání obrázku, žádné štítky druhu poznámky; příloha ze starší
 *     zakázky jde stáhnout;
 *  B) automat ATYP: mlčí nad rozdělaným zadáním, zaškrtne u nestandardní
 *     šachty, vypne jen SVOJE zaškrtnutí, ruční ATYP nechá a označí ho
 *     („ATYP zaškrtnut ručně"), při otevření zakázky jen vypíná (úklid,
 *     s hláškou), přepnutí typu šachty pouští kontrolu až nad novými profily;
 *  C) P11: zaškrtnutí ATYP i přepočet na ceník (cenikDoZadani) dají tytéž
 *     hodiny, s ceníkovou sazbou i bez ní (záchranná hodnota), ruční přepis
 *     přepočet nepřepíše;
 *  D) P15: „Nová zakázka" nad zakázkou jen ke čtení zámek shodí a vazbu na
 *     soubor zruší.
 *
 * Spuštění: NODE_PATH=$(npm root -g) node overit_t4.mjs
 * (pracuje nad dist/kalkulacka.html; ceník je zkušební ze src/zkusebni_cenik.js)
 */
import { chromium } from 'playwright';
import { createRequire } from 'module';
import { fileURLToPath } from 'node:url';

const KOREN = fileURLToPath(new URL('.', import.meta.url));
let ok = 0, fail = 0;
const test = (n, c, info) => {
  if (c) { ok++; console.log('  ✓ ' + n); }
  else { fail++; console.log('  ✗ ' + n + (info !== undefined ? '  → ' + String(typeof info === 'string' ? info : JSON.stringify(info)).slice(0, 300) : '')); }
};

const ZC = createRequire(import.meta.url)('./src/zkusebni_cenik.js');
const b = await chromium.launch({ args: ['--no-sandbox'] });
const p = await b.newPage();
const chyby = [];
p.on('pageerror', e => chyby.push(e.message));
await p.goto('file://' + KOREN + 'dist/kalkulacka.html');
await p.waitForFunction(() => typeof novaZakazka === 'function' && typeof render === 'function');
await p.evaluate(([c, cp]) => {
  Object.assign(DEFAULT_CENIK, c); delete DEFAULT_CENIK.prazdny;
  Object.assign(DEFAULT_CENIK_PROJ, cp); delete DEFAULT_CENIK_PROJ.prazdny;
  NAST.jeAdmin = true;
  window.potvrd = () => Promise.resolve(true);
  window.__zpravy = [];
  const puvodni = window.progZprava;
  window.progZprava = (t, typ) => { window.__zpravy.push(String(t)); if (typeof puvodni === 'function') try { puvodni(t, typ); } catch (e) {} };
  ZAK = novaZakazka(); ZAK.cislo = '2026 - OPR - CN - 0319'; syncVarianta(); render();
}, [ZC.zkusebniCenik(), ZC.zkusebniCenikProj()]);

/* ---------- A) karta Interní poznámky ---------- */
console.log('A) karta Interní poznámky');
{
  const s = await p.evaluate(() => {
    ZAK.prilohy = [{ id: 'pr1', nazev: 'zadani.pdf', velikost: 1200, kdy: '2026-09-01T10:00:00Z', kdo: 'Zkušební', typ: 'application/pdf', data: 'AA==' }];
    prepniTab('kalk'); render();
    const karty = [...document.querySelectorAll('.pozn-zapis')].map(z => z.parentElement);
    const k = karty[0] || null;
    if (!k) return { karta: false };
    const druhy = (typeof POZN_DRUHY !== 'undefined' ? POZN_DRUHY : []).map(d => d.nazev);
    const text = k.textContent || '';
    return { karta: true,
      textarea: k.querySelectorAll('textarea').length,
      soubor: k.querySelectorAll('input[type=file]').length,
      nahrat: [...k.querySelectorAll('button')].filter(x => /nahr|přidat přílohu|vložit/i.test(x.textContent)).length,
      paste: [...k.querySelectorAll('[onpaste]')].length,
      druhy: druhy.filter(d => [...k.querySelectorAll('.pill,select option,label')].some(e => e.textContent.trim() === d)),
      stahnout: [...k.querySelectorAll('button')].filter(x => /Stáhnout/.test(x.textContent)).length,
      priloha: /zadani\.pdf/.test(text) };
  });
  test('A: karta poznámek se vykreslila', s.karta, s);
  test('A: jedno textové pole', s.textarea === 1, s);
  test('A: žádné nahrání přílohy (pole souboru ani tlačítko)', s.soubor === 0 && s.nahrat === 0, s);
  test('A: žádné vkládání obrázku ze schránky', s.paste === 0, s);
  test('A: žádné štítky druhu poznámky', Array.isArray(s.druhy) && s.druhy.length === 0, s);
  test('A: příloha ze starší zakázky je vidět a jde stáhnout', s.priloha && s.stahnout >= 1, s);
  await p.evaluate(() => { delete ZAK.prilohy; render(); });
}

/* ---------- B) automat ATYP ---------- */
console.log('B) automat ATYP');
/* Nová zakázka s vyplněnými rozměry je ve standardu; zdvih 60 m je mimo
 * (výška konstrukce). */
const ZAKLAD = { sirka: 1.6, hloubka: 1.8, zdvih: 9 };
/* Štítek „ATYP zaškrtnut ručně" vedle odznaku standardu (ne text nápovědy). */
await p.evaluate(() => { window.rucne = () => [...document.querySelectorAll('.std-pill')].some(e => e.textContent.trim() === 'ATYP zaškrtnut ručně'); });
const zadani = (zaklad) => p.evaluate((z) => {
  NAST.standard = Object.assign({}, NAST.standard || {}, { zapnuto: true });
  ZAK = novaZakazka(); ZAK.cislo = '2026 - OPR - CN - 0319'; syncVarianta();
  Object.assign(Z, z); delete Z.atyp; delete Z.atypAutomat; delete Z.atypRucneVypnut;
  render();
  return standardVysledek().stav;
}, zaklad);
{
  /* standardní šachta → výchozí stav */
  const st = await zadani(ZAKLAD);
  test('B: příprava — šachta je ve standardu', st === 'standard', st);
  /* nestandardní: přejezd mimo limit */
  const r1 = await p.evaluate(() => { set('Z.zdvih', 60); return { stav: standardVysledek().stav, atyp: !!Z.atyp, automat: !!Z.atypAutomat }; });
  test('B: nestandardní šachta → automat ATYP zaškrtne (se značkou)', r1.stav === 'atyp' && r1.atyp && r1.automat, r1);
  const r2 = await p.evaluate(() => { set('Z.zdvih', 9); return { stav: standardVysledek().stav, atyp: !!Z.atyp }; });
  test('B: zpátky ve standardu → automat SVOJE zaškrtnutí vypne', r2.stav === 'standard' && !r2.atyp, r2);
  /* rozdělané zadání: chybí šířka → automat mlčí */
  const r3 = await p.evaluate(() => { set('Z.sirka', ''); set('Z.zdvih', 60);
    return { chybi: !!standardVysledek().rozmeryChybi, atyp: !!Z.atyp }; });
  test('B: rozdělané zadání (chybí šířka) → automat nic nezaškrtne', r3.chybi && !r3.atyp, r3);
  /* ruční ATYP u standardní šachty: zůstane a označí se */
  await zadani(ZAKLAD);
  const r4 = await p.evaluate(() => { atypPrepni(true); set('Z.zdvih', 10);
    return { atyp: !!Z.atyp, automat: !!Z.atypAutomat, stav: standardVysledek().stav, oznaceni: rucne() }; });
  test('B: ručně zaškrtnutý ATYP automat nevypne', r4.atyp && !r4.automat && r4.stav === 'standard', r4);
  test('B: ruční ATYP u standardní šachty je označený „ATYP zaškrtnut ručně"', r4.oznaceni, r4);
  const r4b = await p.evaluate(() => { set('Z.zdvih', 60); set('Z.zdvih', 9);
    return { atyp: !!Z.atyp, oznaceni: rucne() }; });
  test('B: … ani po výletu mimo standard a zpět', r4b.atyp && r4b.oznaceni, r4b);
  /* automatický ATYP: označení „ručně" se neukazuje */
  await zadani(ZAKLAD);
  const r5 = await p.evaluate(() => { set('Z.zdvih', 60); set('Z.zdvih', 9); return rucne(); });
  test('B: automatický ATYP se po návratu do standardu vypne a označení „ručně" se neukáže', r5 === false);
  /* úklid při otevření: automat jen vypíná, se zprávou; ruční nechá */
  const r6 = await p.evaluate(() => {
    set('Z.zdvih', 60);                    // automat zaškrtl ATYP …
    Z.zdvih = 9;                           // … a zakázka „otevřená" ve standardu se zbylým automatickým ATYP
    window.__zpravy = [];
    const zmena = standardAtypUklid();
    return { zmena, atyp: !!Z.atyp, zprava: window.__zpravy.some(t => /odškrtnut/.test(t)) };
  });
  test('B: úklid po otevření vypne automatický ATYP a řekne to nahlas', r6.zmena && !r6.atyp && r6.zprava, r6);
  const r7 = await p.evaluate(() => {
    Z.zdvih = 60; delete Z.atyp; delete Z.atypAutomat;   // otevřená nestandardní zakázka bez ATYP
    const zmena = standardAtypAutomat({ jenVypnout: true });
    return { zmena, atyp: !!Z.atyp };
  });
  test('B: při otevření se jen vypíná — nestandardní zakázka se nezdraží', !r7.zmena && !r7.atyp, r7);
  const r8 = await p.evaluate(() => { Z.zdvih = 9; atypPrepni(true); return { zmena: standardAtypUklid(), atyp: !!Z.atyp }; });
  test('B: úklid na ručně zaškrtnutý ATYP nesáhne', !r8.zmena && r8.atyp, r8);
  /* přepnutí typu šachty: kontrola až nad dosazenými profily */
  const r9 = await p.evaluate(() => {
    ZAK = novaZakazka(); ZAK.cislo = '2026 - OPR - CN - 0319'; syncVarianta(); Object.assign(Z, { sirka: 1.6, hloubka: 1.8, zdvih: 9 });
    NAST.standard = Object.assign({}, NAST.standard || {}, { zapnuto: true });
    typSachtyPrepni('exteriérová');
    const std = JSON.parse(JSON.stringify(Z.profily));
    /* profil mimo standard → automat zaškrtne; přepnutí typu dosadí výchozí profily → vypne */
    Z.profily.sloupek = { dim: '20x20', tl: 2 };   // sloupek mimo tabulku standardu
    set('Z.sirka', Z.sirka);
    const pred = { stav: standardVysledek().stav, atyp: !!Z.atyp, automat: !!Z.atypAutomat };
    typSachtyPrepni('exteriérová');
    return { pred, po: { stav: standardVysledek().stav, atyp: !!Z.atyp }, profilyZpet: JSON.stringify(Z.profily) === JSON.stringify(std) };
  });
  test('B: příprava — nestandardní profil dal automatický ATYP', r9.pred.stav === 'atyp' && r9.pred.atyp && r9.pred.automat, r9);
  test('B: přepnutí typu šachty (výchozí profily) automatický ATYP vypne', r9.profilyZpet && r9.po.stav !== 'atyp' && !r9.po.atyp, r9);
}

/* ---------- C) P11: tytéž hodiny ze zaškrtnutí i z přepočtu ceníku ---------- */
console.log('C) P11 — hodiny ATYP');
{
  const r = await p.evaluate(() => {
    ZAK = novaZakazka(); ZAK.cislo = '2026 - OPR - CN - 0319'; syncVarianta();
    Object.assign(Z, { montazZakladHod: 40, projekceZakladHod: 20 });
    const v = aktivniVarianta(ZAK);
    const mer = () => ({ m: Z.montazAtypHod, p: Z.projekceAtypHod });
    atypPrepni(true);
    const zaskrt = mer();
    Z.montazAtypHod = 0; Z.projekceAtypHod = 0;
    cenikDoZadani(v);
    const prepocet = mer();
    /* ceník bez sazby → obě cesty berou tutéž záchrannou hodnotu */
    atypPrepni(false);
    delete C.atypMontazPct; delete C.atypProjekcePct;
    atypPrepni(true);
    const zaskrtBez = mer();
    Z.montazAtypHod = 0; Z.projekceAtypHod = 0;
    cenikDoZadani(v);
    const prepocetBez = mer();
    /* ruční přepis obchodníka přepočet nepřepíše */
    Z.montazAtypHod = 77; zadaniRucniZnac(v.data, 'montazAtypHod');
    cenikDoZadani(v);
    return { zaskrt, prepocet, zaskrtBez, prepocetBez, rucni: Z.montazAtypHod };
  });
  test('C: zaškrtnutí dalo nenulové hodiny', r.zaskrt.m > 0 && r.zaskrt.p > 0, r);
  test('C: přepočet ceníku dá tytéž hodiny jako zaškrtnutí', r.prepocet.m === r.zaskrt.m && r.prepocet.p === r.zaskrt.p, r);
  test('C: bez sazby v ceníku obě cesty tytéž hodiny (záchranná hodnota)',
    r.zaskrtBez.m > 0 && r.prepocetBez.m === r.zaskrtBez.m && r.prepocetBez.p === r.zaskrtBez.p, r);
  test('C: ruční přepis hodin přepočet nepřepíše', r.rucni === 77, r);
}

/* ---------- D) P15: nová zakázka shodí zámek čtení ---------- */
console.log('D) P15 — nová zakázka nad zakázkou jen ke čtení');
{
  const r = await p.evaluate(async () => {
    ZAK = novaZakazka(); ZAK.cislo = '2026 - OPR - CN - 0319'; syncVarianta();
    ONLINE_STAV.soubor = 'puvodni.json'; ONLINE_STAV.razitko = 'r1'; ONLINE_STAV.posledni = JSON.stringify(ZAK);
    ULO_STAV.soubor = 'puvodni.json';
    zamekCteniZapni(); render();
    const pred = zamekCteniJe();
    await novaZakazkaUI();
    return { pred, po: zamekCteniJe(), soubor: ONLINE_STAV.soubor, ulo: ULO_STAV.soubor, razitko: ONLINE_STAV.razitko,
             cislo: ZAK.cislo === novaZakazka().cislo };
  });
  test('D: příprava — zakázka byla jen ke čtení', r.pred, r);
  test('D: nová zakázka zámek čtení shodila', r.po === false, r);
  test('D: vazba na původní soubor je zrušená (online i složka)', r.soubor === '' && r.ulo === '' && r.razitko === '', r);
  test('D: nová zakázka má číslo z předlohy', r.cislo, r);
}

test('bez chyb stránky', chyby.length === 0, chyby);
await b.close();
console.log(`\n${ok} prošlo, ${fail} selhalo`);
process.exit(fail ? 1 : 0);
