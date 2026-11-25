/* #759 HLÍDAČ PŘEKLADU PEVNÝCH TEXTŮ (rychlá cesta PT-ZAB, 24. 11. 2026).
 *
 * Vada: pole ZÁBRADLÍ NA PODESTÁCH technické specifikace OCK (interiérová
 * šachta se zaškrtnutou volitelnou položkou zábradlí) dávalo pevný text
 * „úpravy a napojení stávajícího zábradlí na podestách", který ve vestavěném
 * slovníku chyběl (od srpna) → EN/DE/FR specifikace ho tiskla česky
 * (export NEPRELOZENE_2026-11-24-SPECIFIKACE-EN_24.11.5.csv). Stávající
 * hlídače (test_preklad.js oddíl 10, test_k13_preklad.js) měřily jen
 * popisky, číselníky a symboly TS_* nabídky — hodnoty, které specifikace
 * doplňuje sama (prefill), pro všechna zadání neprocházely.
 *
 * Tento test projde pro reprezentativní sadu zadání (interiér / exteriér,
 * průchozí, každá volitelná položka zapnutá i vypnutá, přechodové plechy,
 * stříšky, můstky ve všech modelech, víc šachet) a pro EN, DE i FR:
 *  1) celý dokument technické specifikace tak, jak ho skládá
 *     renderTechspecPreklad / tsVsechnyFraze (src/ui/techspec_ui.js):
 *     hlavička, nadpisy sekcí (jen platné — `jen`), popisky, hodnoty polí
 *     (tsHodnota: odvozené, prefill, prefillTs, výchozí), poznámky sekcí,
 *     výchozí vlastní řádky (DEFAULT_TECHSPEC.extra);
 *  2) data cenové nabídky OCK (nabidkaData v cílovém jazyce) — všechno, co
 *     nabídka cestou pošle přes tr() a co spadne na češtinu.
 * Hodnota pole, které si jazyk skládá samo (`jazykSam`), se slovníkem celá
 * neměří (slovník ji nemá znát) — ale sledování překladu (prekladSledujZacni,
 * #518) zachytí každou její ČÁST, kterou tr() nepřeložil. Čísla, rozměry
 * a kódy řeší prekladNeutral a vzory (PREKLAD_VZORY) jako v aplikaci.
 *
 * Nepřeložený pevný text = chyba testu. Výjimky jen ze seznamu „čeká na
 * J. V." (překlad schvaluje J. V.); výjimka, která už chybí není, je také
 * chyba (seznam se nesmí zanášet).
 *
 * Pojistka: bez hesla „úpravy a napojení stávajícího zábradlí na podestách"
 * v src/preklad.js test selže (EN/DE/FR, pole zabradliPodesty); bez vzoru
 * pro výčet víc skupin můstků (PREKLAD_VZORY) také.
 * Spuštění: cd src && node test_759_pevne_texty_preklad.js */
'use strict';
const nacti = f => { const m = require(f); Object.keys(m).forEach(k => { global[k] = m[k]; }); return m; };
const ZC = require('./zkusebni_cenik.js');
nacti('./format.js');
const PR = nacti('./preklad.js');
const E = nacti('./engine.js');
global.DEFAULT_CENIK = ZC.zkusebniCenik();
nacti('./engine_proj.js');
global.DEFAULT_CENIK_PROJ = ZC.zkusebniCenikProj();
nacti('./vice_sachet.js');
const TS = nacti('./techspec.js');
nacti('./sleva.js'); nacti('./zaokrouhleni.js'); nacti('./firma.js');
const ZK = nacti('./zakazka.js');
nacti('./zamek.js');
const N = nacti('./nabidka.js');
const J = require('./jekly.json');

let ok = 0, fail = 0;
const test = (n, c, info) => { if (c) { ok++; console.log('OK   ' + n); }
  else { fail++; console.log('FAIL ' + n + (info === undefined ? '' : '\n     ' + [].concat(info).join('\n     '))); } };
const kop = x => JSON.parse(JSON.stringify(x));
const JAZ = ['en', 'de', 'fr'];

/* Výjimky „čeká na J. V." — pevné texty, které hlídač našel a jejichž
 * překlad ještě J. V. neschválil (sezení je samo nepřekládá). Tvar:
 * { vzor: RegExp celého textu (čísla se mění), jazyky, popis }.
 * Po schválení heslo / vzor patří do src/preklad.js a řádek odsud pryč. */
const CEKA_NA_JV = [
  /* prázdné: výčet víc skupin můstků (Model 2 + ceník #354) schválil J. V. 24. 11. → vzor v PREKLAD_VZORY */
];

/* Smyšlený ceník: názvy položek zkušebního ceníku (… (zkušební)) nejsou
 * texty aplikace — slovník nese názvy skutečného ceníku. */
const zCeniku = t => /\(zkušební\)\s*$/.test(t);

const chybi = new Map();   // text → { jazyky:Set, kde:Set }
function zapis(text, L, kde) {
  const t = String(text == null ? '' : text).trim();
  if (!t || PR.prekladNeutral(t) || zCeniku(t)) return;
  if (!chybi.has(t)) chybi.set(t, { jazyky: new Set(), kde: new Set() });
  const x = chybi.get(t); x.jazyky.add(L); if (x.kde.size < 3) x.kde.add(kde);
}
function over(text, L, kde) {
  const t = String(text == null ? '' : text);
  if (!t.trim() || PR.prekladNeutral(t)) return;
  if (!PR.trStav(t, L).prelozeno) zapis(t, L, kde);
}

/* ---------------- zadání ---------------- */
const ZAD = { prejezd: 3.3, zdvih: 12, prohluben: 1.2, sirka: 1.6, hloubka: 2.1, nastupiste: 4 };
const SKLADBA = { mustekRamBmKc: 10000, mustekPodlahaPlechM2Kc: 1000, mustekPodlahaPororostM2Kc: 1100, mustekPodlahaVanaM2Kc: 1200,
  mustekZabradliKovBmKc: 2000, mustekZabradliSkloBmKc: 5000, mustekKotveniDeskaKc: 3000, mustekKotveniSloupKc: 3100,
  mustekKotveniKonzolaKc: 3200, mustekZabradliSkloMontazHodBm: 1 };
const VOL = ['haky', 'zabradli', 'sokl', 'leseniVnitrni', 'leseniVnejsi', 'leseniHlava'];
const CEN = { stary: () => ZC.zkusebniCenik(), m354: () => Object.assign(ZC.zkusebniCenik(), ZC.zkusebniMustky()),
  skladba: () => Object.assign(ZC.zkusebniCenik(), ZC.zkusebniMustky(), SKLADBA) };
const MUSTKY = {
  zadne: { cenik: 'stary', fixes: true, z: {} },
  stare: { cenik: 'stary', fixes: true, z: { mustkyKs: 1, mustekHloubkaMm: 900, mustekSirkaMm: 1500 } },
  m354: { cenik: 'm354', fixes: false, z: { mustky: [{ ks: 2, delkaMm: 1200 }] } },
  m354vic: { cenik: 'm354', fixes: true, z: { mustky: [{ ks: 1, delkaMm: 1000 }, { ks: 2, sirkaMm: 1000, delkaMm: 800 }] } },
  skladebne: { cenik: 'skladba', fixes: true, z: { mustky: [
    { ks: 2, sirkaMm: 1600, delkaMm: 1200, podlaha: 'plech', zabradli: 'kov', zabradliStrany: 2, kotveni: 'deska', sloupyKs: 2, sloupVyskaM: 3 },
    { ks: 1, sirkaMm: 1200, delkaMm: 900, podlaha: 'pororost', zabradli: 'sklo', zabradliStrany: 1, kotveni: 'sloup' },
    { ks: 1, sirkaMm: 1000, delkaMm: 800, podlaha: 'vana', zabradli: 'zadne', kotveni: 'konzola' }] } },
};

function zadani(o) {
  const z = Object.assign(kop(E.DEFAULT_ZADANI), ZAD, { typSachty: o.typ, profily: kop(E.PROFILY_VYCHOZI[o.typ]) },
    o.pruchozi ? { pruchoziSachta: true, nastupisteA: 3, nastupisteC: 2, striskaKs: 2 } : { striskaKs: o.striska ? 1 : 0 },
    { prechodovePlechy: !!o.plechy }, kop(MUSTKY[o.mustky].z));
  z.volitelne = Object.assign({}, z.volitelne, o.vol);
  return z;
}

/* ---------------- 1) dokument technické specifikace ---------------- */
const HLAVICKA = ['Technická specifikace výtahové šachty',
  '(tato technická specifikace bude použita jako příloha Smlouvy o dílo nebo závazné objednávky)',
  'ČÍSLO NABÍDKY', 'OBJEDNATEL', 'DATUM', 'NÁZEV AKCE', 'ADRESA STAVBY', 'DALŠÍ UJEDNÁNÍ'];
let dokumentu = 0;
function specifikace(Z, C, r, ts, L, kde) {
  dokumentu++;
  TS.TECHSPEC_DEF.filter(sk => !sk.jen || sk.jen(r, Z)).forEach(sk => {
    over(sk.sekce, L, kde + ' / sekce');
    if (sk.pozn) over(sk.pozn, L, kde + ' / poznámka ' + sk.sekce);
    sk.pole.forEach(p => {
      PR.prekladSledujZacni();
      const h = TS.tsHodnota(p, ts, r, Z, C, L);
      const uvnitr = PR.prekladSledujKonec();
      if (h.odvozeno && h.text === '') return;      // řádek do dokumentu nepatří
      over(p.label, L, kde + ' / popisek');
      if (h.prelozeno) uvnitr.forEach(t => zapis(t, L, kde + ' / ' + p.id + ' (jazykSam)'));
      else over(h.text, L, kde + ' / ' + p.id);
    });
  });
  (ts.extra || []).forEach(e => { over(e.label, L, kde + ' / extra'); over(e.hodnota, L, kde + ' / extra'); });
}
HLAVICKA.forEach(t => JAZ.forEach(L => over(t, L, 'hlavička specifikace')));

const SADA = [];
for (const typ of ['interiérová', 'exteriérová'])
  for (const pruchozi of [false, true])
    for (const plechy of [false, true])
      for (let m = 0; m < (1 << VOL.length); m++) {
        const vol = {}; VOL.forEach((k, i) => { vol[k] = !!(m & (1 << i)); });
        SADA.push({ typ, pruchozi, plechy, vol, mustky: 'zadne', striska: m % 2 === 1 });
      }
for (const typ of ['interiérová', 'exteriérová'])
  Object.keys(MUSTKY).forEach(mustky => SADA.push({ typ, pruchozi: false, plechy: true, vol: {}, mustky }));

SADA.forEach(o => {
  const M = MUSTKY[o.mustky];
  const Z = zadani(o), C = CEN[M.cenik]();
  const r = E.vypocet(Z, C, J, M.fixes);
  const ts = kop(TS.DEFAULT_TECHSPEC);
  const kde = [o.typ, o.pruchozi ? 'průchozí' : '', o.plechy ? 'plechy' : '',
    Object.keys(o.vol).filter(k => o.vol[k]).join('+'), 'můstky ' + o.mustky].filter(Boolean).join(', ');
  JAZ.forEach(L => specifikace(Z, C, r, ts, L, kde));
});
test('specifikace: sada zadání prošla (' + SADA.length + ' zadání × 3 jazyky)', dokumentu === SADA.length * 3);

/* ---------------- 2) cenová nabídka OCK (a víc šachet) ---------------- */
function zakazka(o) {
  const zak = ZK.novaZakazka();
  zak.cislo = '2026-OPR-CN-9759'; zak.nazevAkce = 'Hlídač překladu';
  const v = zak.varianty[0], M = MUSTKY[o.mustky];
  v.data.ock.zadani = zadani(o);
  v.data.ock.fixes = M.fixes;
  v.data.cenik = Object.assign(CEN[M.cenik](), { kurzEurKc: 25 });
  if (o.vice) {
    v.data.ock.nazev = 'Výtah A';
    v.data.ock.dalsi = [{ id: 's_b', nazev: 'Výtah B', ks: 2,
      zadani: zadani({ typ: o.typ === 'interiérová' ? 'exteriérová' : 'interiérová', pruchozi: !o.pruchozi, plechy: !o.plechy,
        vol: Object.fromEntries(VOL.map(k => [k, !o.vol[k]])), mustky: 'zadne' }) },
      { id: 's_c', nazev: '', ks: 1, zadani: zadani(Object.assign({}, o, { mustky: 'zadne' })) }];
  }
  return zak;
}
const NAB = [];
for (const typ of ['interiérová', 'exteriérová'])
  for (const pruchozi of [false, true])
    for (const zap of [false, true]) {
      const vol = Object.fromEntries(VOL.map(k => [k, zap]));
      NAB.push({ typ, pruchozi, plechy: zap, vol, mustky: 'zadne' });
      NAB.push({ typ, pruchozi, plechy: !zap, vol, mustky: zap ? 'skladebne' : 'm354', vice: true });
    }
Object.keys(MUSTKY).forEach(mustky => NAB.push({ typ: 'interiérová', pruchozi: false, plechy: true, vol: { zabradli: true }, mustky }));
let nabidek = 0;
NAB.forEach(o => {
  const zak = zakazka(o), v = zak.varianty[0];
  const kde = 'nabídka OCK: ' + [o.typ, o.pruchozi ? 'průchozí' : '', o.vice ? 'víc šachet' : '', 'můstky ' + o.mustky].filter(Boolean).join(', ');
  JAZ.forEach(L => {
    PR.prekladSledujZacni();
    let d = null;
    try { d = N.nabidkaData(zak, v, J, L); } finally { PR.prekladSledujKonec().forEach(t => zapis(t, L, kde)); }
    if (d) nabidek++;
  });
  /* symboly technické části nabídky (TS_*): hodnota, která v cílovém jazyce
   * zůstala stejná jako česká, musí být neutrální nebo přeložitelná (jako
   * test_k13_preklad.js, jen pro celou sadu zadání). Pole, která si jazyk
   * skládají sama (sekce MŮSTKY), dají jinou hodnotu — jejich části hlídá
   * sledování výše. */
  const ph = N.nabidkaData(zak, v, J, 'cz').placeholders;
  JAZ.forEach(L => {
    const phL = N.nabidkaData(zak, v, J, L).placeholders;
    Object.keys(ph).filter(k => /^TS_/.test(k) && phL[k] === ph[k]).forEach(k => over(ph[k], L, kde + ' / ' + k));
  });
  /* víc šachet: technická specifikace každé šachty z jejího zadání */
  if (o.vice) v.data.ock.dalsi.forEach((s, i) => {
    const r = E.vypocet(s.zadani, v.data.cenik, J, v.data.ock.fixes);
    JAZ.forEach(L => specifikace(s.zadani, v.data.cenik, r, TS.tsSachtaTechspec(v.data, i + 1), L, kde + ' / šachta ' + (i + 2)));
  });
});
test('nabídka: sada zadání prošla (' + NAB.length + ' zakázek × 3 jazyky)', nabidek === NAB.length * 3);

/* ---------------- vyhodnocení ---------------- */
const nove = [], zastarale = [];
const pouzito = CEKA_NA_JV.map(() => new Set());
chybi.forEach((x, t) => {
  const navic = [...x.jazyky].filter(L => !CEKA_NA_JV.some((v, i) => {
    const hit = v.vzor.test(t) && v.jazyky.indexOf(L) >= 0;
    if (hit) pouzito[i].add(L);
    return hit;
  }));
  if (navic.length) nove.push(JSON.stringify(t) + '  [' + navic.join(',') + ']  ← ' + [...x.kde].join(' | '));
});
CEKA_NA_JV.forEach((v, i) => v.jazyky.forEach(L => {
  if (!pouzito[i].has(L)) zastarale.push(v.popis + ' [' + L + ']');
}));
CEKA_NA_JV.forEach(v => console.log('INFO čeká na J. V.: ' + v.popis + ' [' + v.jazyky.join(',') + ']'));
test('všechny pevné texty specifikace a nabídky OCK mají překlad EN/DE/FR (mimo „čeká na J. V.")', nove.length === 0, nove);
test('seznam „čeká na J. V." nemá zastaralé výjimky (už přeložené / už se netisknou)', zastarale.length === 0, zastarale);

/* PT-ZAB: konkrétní vada — heslo a jeho schválený překlad (J. V. 24. 11. 2026) */
{
  const zab = TS.tsPole('zabradliPodesty');
  const Z = zadani({ typ: 'interiérová', vol: { zabradli: true }, mustky: 'zadne' });
  const r = E.vypocet(Z, CEN.stary(), J, true);
  const h = TS.tsHodnota(zab, kop(TS.DEFAULT_TECHSPEC), r, Z, CEN.stary(), 'en');
  test('PT-ZAB: interiér + zábradlí → česká hodnota pole beze změny', h.text === 'úpravy a napojení stávajícího zábradlí na podestách', h.text);
  const CIL = { en: 'modification and connection of the existing railing at the landings',
    de: 'Anpassung und Anschluss des bestehenden Geländers an den Podesten',
    fr: 'adaptation et raccordement du garde-corps existant sur les paliers' };
  JAZ.forEach(L => test('PT-ZAB: ' + L.toUpperCase() + ' = schválený překlad', PR.tr(h.text, L) === CIL[L], PR.tr(h.text, L)));
}

/* PT-ZAB (J. V. 24. 11. 2026): výčet víc skupin můstků stejnými slovy jako věta pro jednu skupinu. */
{
  const cz = '1 ks 1600 × 1000 mm, 2 ks 1000 × 800 mm (šířka × délka), ocelová konstrukce vč. zábradlí a montáže';
  const CIL = { en: '1 pcs 1600 × 1000 mm, 2 pcs 1000 × 800 mm (width × length), steel structure incl. railing and installation',
    de: '1 Stk. 1600 × 1000 mm, 2 Stk. 1000 × 800 mm (Breite × Länge), Stahlkonstruktion inkl. Geländer und Montage',
    fr: '1 pcs 1600 × 1000 mm, 2 pcs 1000 × 800 mm (largeur × longueur), structure en acier y compris garde-corps et montage' };
  JAZ.forEach(L => test('PT-ZAB: víc skupin můstků ' + L.toUpperCase() + ' = schválený překlad', PR.tr(cz, L) === CIL[L], PR.tr(cz, L)));
  const jedna = PR.tr('1 ks, rozměr 1600 × 1000 mm (šířka × délka), ocelová konstrukce vč. zábradlí a montáže', 'de');
  test('PT-ZAB: věta pro jednu skupinu beze změny', jedna === '1 Stk., Abmessung 1600 × 1000 mm (Breite × Länge), Stahlkonstruktion inkl. Geländer und Montage', jedna);
}

console.log(`\n${ok} prošlo, ${fail} selhalo`);
process.exit(fail ? 1 : 0);
