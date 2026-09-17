/* ===== KOTVICÍ LIŠTY: PŘÍDAVEK V METRECH, NE KUSY =====
 * (nález V25, rozhodnutí J. V. 17. 9. 2026, varianta B)
 *
 * „Správný je výpočet Model 2: +10 % z délky a dále pracovat v bm. Opravu
 * proveď jen v modelu dva a toto rozhodnutí zafixuj."
 *
 * PROČ TAHLE SADA VŮBEC JE. Předloha si u kotvicích lišt odporuje sama:
 * v listu VZORCE (C60 = C59) je vykazuje 1 : 1 k vnějším a KALKULÁK C127
 * sčítá 204 + 204 = 408 ks, ale do DÉLKY přičte jen 10 %. Obojí platit
 * nemůže — mezi „ke každé vnější liště patří jedna kotvicí" a „kotvení
 * stojí desetinu materiálu navíc" je faktor deset.
 *
 * Rozhodnuto ve prospěch té desetiny: kotvicí lišta není samostatný kus,
 * je to přídavek materiálu, a přídavek se měří v metrech. `listyKs` proto
 * počítá VÝHRADNĚ vnější lišty.
 *
 * Tahle sada tedy nehlídá vzorec (ten hlídá test_kornpfortstrasse.js na
 * skutečné zakázce), ale ROZHODNUTÍ. Kdyby někdo v dobré víře „srovnal"
 * počet kusů s předlohou na dvojnásobek, nebo přehodil Model 2 zpátky na
 * procento z kusů, spadne to tady — a v hlášce se dočte proč.
 */
const eng = require('./engine.js');
const ZC = require('./zkusebni_cenik.js');
const JEKLY = require('./jekly.json');

let ok = 0, fail = 0;
const test = (n, cond, info) => {
  if (cond) { ok++; console.log('OK  ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info)); }
};
const blizko = (a, b, tol) => Math.abs(a - b) < (tol || 1e-9);

/* Zadání se zasklením MEZI PŘÍČNÍKY — jen tehdy lišty vůbec vznikají.
 * Rozměry jsou vymyšlené; jde o poměry, ne o konkrétní zakázku. */
function spocti(fixes, zmeny) {
  const z = JSON.parse(JSON.stringify(eng.DEFAULT_ZADANI));
  z.typSachty = 'interiérová';
  z.zaskleni = 'mezi příčníky';
  z.sirka = 1.6; z.hloubka = 2.0;
  z.zdvih = 8.35; z.prejezd = 3.5; z.prohluben = 0.65;
  z.nastupist = 4; z.svetlikNadDvermi = true;
  Object.assign(z, zmeny || {});
  return eng.vypocet(z, ZC.zkusebniCenik(), JEKLY, !!fixes);
}

const M1 = spocti(false).dily;
const M2 = spocti(true).dily;

/* ---------- 1) počet kusů jsou VNĚJŠÍ lišty, v obou modelech týž ---------- */

test('lišty vůbec vznikly (jinak by zbytek sady nic neměřil)',
  M1.listyKs > 0 && M1.listyBm > 0, { ks: M1.listyKs, bm: M1.listyBm });
test('počet kusů je v obou modelech stejný — modely se liší jen v metrech',
  M1.listyKs === M2.listyKs, { m1: M1.listyKs, m2: M2.listyKs });

/* JÁDRO ROZHODNUTÍ: počet kusů se na tomhle zadání nesmí hnout. Ptát se
 * „nejsou kusy zdvojnásobené?" nejde — není proti čemu to poměřovat, kód
 * sám je ta jediná definice. Proto se číslo přibíjí natvrdo: 168 vnějších
 * lišt. Kdyby k nim někdo přidal kotvicí (jak to dělá KALKULÁK C127),
 * vyjde 336 a spadne to tady. */
const KS_VNEJSI = 168;
test('počet kusů = jen vnější lišty (336 by znamenalo přičtené kotvicí)',
  M2.listyKs === KS_VNEJSI, { dostal: M2.listyKs, cekano: KS_VNEJSI });

/* ---------- 2) Model 2 přičítá 10 % z DÉLKY ---------- */
{
  /* Holá délka se nedá přečíst přímo — jádro ji nevrací. Dá se ale dopočítat
   * ze VZORCE MODELU 1 (holá + kusy × 0,1) a proti tomu ověřit Model 2. Tím
   * to přestává být kruh: kdyby Model 2 bral procento z kusů, nevyjde to,
   * a kdyby se změnil Model 1, spadne oddíl 3. */
  const holeBm = M1.listyBm - M1.listyKs * 0.1;
  test('Model 2: délka je přesně 110 % holé délky, tedy přídavek jde z METRŮ',
    blizko(M2.listyBm, holeBm * 1.1, 1e-9),
    { m2: M2.listyBm, cekano: holeBm * 1.1, hole: holeBm });

  /* A ještě jednou na jiné geometrii: délka se hne, počet kusů zůstane.
   * Kdyby přídavek vycházel z kusů, byl by na obou zadáních stejný. */
  const uzsi = spocti(true, { sirka: 1.2 }).dily;
  test('kontrolní zadání má jiné metry, ale týž počet kusů',
    uzsi.listyKs === M2.listyKs && !blizko(uzsi.listyBm, M2.listyBm, 1e-6),
    { ks: uzsi.listyKs, bm: uzsi.listyBm });
  const pridavekTady = M2.listyBm - holeBm;
  const pridavekTam = uzsi.listyBm - uzsi.listyBm / 1.1;
  test('a přídavek se mezi nimi LIŠÍ — u procenta z kusů by byl stejný',
    !blizko(pridavekTady, pridavekTam, 1e-6),
    { tady: pridavekTady, tam: pridavekTam });
}

/* ---------- 3) Model 1 zůstává 1:1 s předlohou ---------- */
{
  /* Rozhodnutí J. V. z 15. 9. 2026: opravovat jen Model 2, Model 1 kopíruje
   * předlohu i s její chybou. Model 1 tedy bere procento z KUSŮ — číslo bez
   * rozměru sečtené s metry. Je to špatně a je to tak schválně. */
  /* Tady se holá délka bere z MODELU 2 — opačně než v oddílu 2. Obě cesty
   * musí dát totéž; kdyby se rozešly, nesedí aspoň jeden z modelů. */
  const holeBm = M2.listyBm / 1.1;
  test('Model 1 přičítá 10 % z POČTU KUSŮ, jako předloha',
    blizko(M1.listyBm, holeBm + M1.listyKs * 0.1, 1e-9),
    { m1: M1.listyBm, cekano: holeBm + M1.listyKs * 0.1 });
  test('modely se tedy v délce liší', !blizko(M1.listyBm, M2.listyBm, 1e-6),
    { m1: M1.listyBm, m2: M2.listyBm });
  /* Po přechodu výhradně na Model 2 (avizováno 17. 9. 2026) tenhle oddíl
   * padá celý — do té doby musí platit, jinak by se starší nabídky přestaly
   * shodovat s předlohou, ze které vznikly. */
}

/* ---------- 4) hmotnost i lakování jdou z METRŮ ---------- */
{
  /* Peníze se počítají z kilogramů a ty z metrů — počet kusů do ceny
   * nevstupuje nikde. Právě proto je varianta B kosmetika výkazu a ne
   * změna ceny; kdyby se to někdy obrátilo, ať je to vidět tady. */
  const kgNaBm = M2.listyKg / M2.listyBm;
  test('hmotnost je úměrná metrům (konstanta kg/bm)',
    blizko(kgNaBm, M1.listyKg / M1.listyBm, 1e-9), kgNaBm);
  const uzsi = spocti(true, { sirka: 1.2 }).dily;
  test('a při jiné délce drží táž konstanta',
    blizko(uzsi.listyKg / uzsi.listyBm, kgNaBm, 1e-9), uzsi.listyKg / uzsi.listyBm);
}

/* ---------- 5) na terče lišty nejsou vůbec ---------- */
{
  const terce = spocti(true, { zaskleni: 'na terče' }).dily;
  test('zasklení na terče lišty nepočítá',
    terce.listyKs === 0 && terce.listyBm === 0 && terce.listyKg === 0,
    { ks: terce.listyKs, bm: terce.listyBm });
}

console.log('\n' + (fail ? 'SELHALO ' + fail + ' z ' + (ok + fail) : 'OK ' + ok));
if (fail) process.exit(1);
