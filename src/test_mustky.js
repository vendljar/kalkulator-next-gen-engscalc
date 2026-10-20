/* Můstky mezi budovou a OCK (P7 / K13-N59, zadání J. V. 25. 9. 2026).
 *
 * Do 25. 9. byl můstek zaškrtávátko, které do výpočtu nevstupovalo a do
 * nabídky se nedostalo (K13-08: můstek zadaný, v nabídce nic, bez ceny).
 * Teď počet kusů: 0 = žádný, jinak kolik jich je. Hlídá se:
 *   – převod staré zakázky (zaškrtnuto = 1, jinak 0) a zakázka bez můstků
 *     beze změny (seznam položek i cena, oba modely),
 *   – řádek v hrubé OCK: počet × ceníková cena za kus,
 *   – specifikace (usazení čelní stěny, střecha, nový řádek) a nabídka,
 *   – kontrola před nabídkou: chybějící cena, víc můstků než nástupišť,
 *   – kontrola standardu počítá s počtem. */
const E = require('./engine.js');
const ZC = require('./zkusebni_cenik.js');
const J = require('./jekly.json');
const tsm = require('./techspec.js');
global.mustkyPocet = E.mustkyPocet; global.nastupisteCelkem = E.nastupisteCelkem;
const kop = x => JSON.parse(JSON.stringify(x));
let ok = 0, fail = 0;
const test = (n, c, info) => { if (c) { ok++; console.log('OK  ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info)); } };
const CENIK = Object.assign(kop(E.DEFAULT_CENIK), ZC.zkusebniCenik());
const RADEK = 'MŮSTKY MEZI BUDOVOU A OCK';

function spocti(extra, fixes = true, typ = 'exteriérová', cenik) {
  const z = kop(E.DEFAULT_ZADANI);
  Object.assign(z, { typSachty: typ, profily: kop(E.PROFILY_VYCHOZI[typ]) }, extra || {});
  return { r: E.vypocet(z, kop(cenik || CENIK), J, fixes), z };
}
const radek = r => (r.sekce.hrubaOck || []).find(x => x.nazev === RADEK || x.origNazev === RADEK);

/* Převod a beze změny. */
test('mustkyPocet: staré zaškrtnuto = 1', E.mustkyPocet({ mustek: true }) === 1);
test('mustkyPocet: staré nezaškrtnuto = 0', E.mustkyPocet({ mustek: false }) === 0);
test('mustkyPocet: počet má přednost', E.mustkyPocet({ mustek: true, mustkyKs: 3 }) === 3 && E.mustkyPocet({ mustek: true, mustkyKs: 0 }) === 0);
test('mustkyPocet: záporné / nesmysl = 0 / celé číslo', E.mustkyPocet({ mustkyKs: -2 }) === 0 && E.mustkyPocet({ mustkyKs: 2.7 }) === 2);
test('DEFAULT_ZADANI klíč mustkyKs nenese (import by starým zakázkám dal nulu)', !('mustkyKs' in E.DEFAULT_ZADANI));
for (const fixes of [true, false]) {
  const M = fixes ? 'Model 2' : 'Model 1';
  const bez = spocti({}, fixes).r, nula = spocti({ mustkyKs: 0 }, fixes).r;
  test(M + ': bez můstků žádný řádek a stejná cena', !radek(bez) && !radek(nula)
    && bez.souhrn.zakladCena === nula.souhrn.zakladCena
    && bez.sekce.hrubaOck.length === nula.sekce.hrubaOck.length);
  const dva = spocti({ mustkyKs: 2 }, fixes).r;
  test(M + ': 2 můstky = řádek 2 × cena za kus', radek(dva) && radek(dva).mnozstvi === 2
    && Math.abs(radek(dva).naklad - 2 * CENIK.mustekKc) < 1e-6, radek(dva));
  test(M + ': cena nabídky vzroste', dva.souhrn.zakladCena > bez.souhrn.zakladCena);
  const stary = spocti({ mustek: true }, fixes).r;
  test(M + ': stará zakázka se zaškrtnutým můstkem = 1 ks', radek(stary) && radek(stary).mnozstvi === 1);
}

/* Specifikace. */
{
  const pole = id => { let p = null; tsm.TECHSPEC_DEF.forEach(s => s.pole.forEach(x => { if (x.id === id) p = x; })); return p; };
  const Z = x => Object.assign(kop(E.DEFAULT_ZADANI), { typSachty: 'exteriérová', nastupiste: 5 }, x);
  const u = pole('usazeniCelni'), st = pole('strecha'), m = pole('mustky');
  test('spec: bez můstků usazení beze změny', u.prefill(null, Z({})) === 'přisazena k fasádě (dle odchylky podest od svislice)');
  test('spec: 1 můstek', u.prefill(null, Z({ mustkyKs: 1 })) === 'přisazena k fasádě, v jednom nástupišti přes můstek');
  test('spec: 2 můstky (interiér)', u.prefill(null, Z({ mustkyKs: 2, typSachty: 'interiérová' })) === 'přisazena k podestám, v 2 nástupištích přes můstky');
  test('spec: můstek v každém nadzemním nástupišti', u.prefill(null, Z({ mustkyKs: 4 })) === 's nástupními můstky ve všech nadzemních nástupištích');
  test('spec: střecha přetažená přes můstek, jen když je i v nejvyšším',
    /přetažená i přes nástupní můstek/.test(st.prefill(null, Z({ mustkyKs: 4 }))) && /RAL 3011/.test(st.prefill(null, Z({ mustkyKs: 2 }))));
  test('spec: řádek můstků s rozměry', m.prefill(null, Z({ mustkyKs: 2, mustekHloubkaMm: 900, mustekSirkaMm: 1300 })) === '2 ks, hloubka 900 mm, šířka 1300 mm');
  test('spec: bez můstků řádek „ -"', m.prefill(null, Z({})) === ' -');
  const pr = require('./preklad.js');
  test('spec EN: řádek i usazení přeložené vzorem',
    pr.tr('2 ks, hloubka 900 mm, šířka 1300 mm', 'en') === '2 pcs, depth 900 mm, width 1300 mm'
    && pr.tr('přisazena k fasádě, v 3 nástupištích přes můstky', 'de') === 'An die Fassade angebaut, an 3 Zugangsstellen über Brücken');
}

/* Nabídka. */
{
  global.vypocet = E.vypocet; global.DEFAULT_ZADANI = E.DEFAULT_ZADANI; global.DEFAULT_CENIK = CENIK;
  const ep = require('./engine_proj.js');
  global.DEFAULT_ZADANI_PROJ = ep.DEFAULT_ZADANI_PROJ; global.DEFAULT_CENIK_PROJ = ZC.zkusebniCenikProj();
  global.TECHSPEC_DEF = tsm.TECHSPEC_DEF; global.tsHodnota = tsm.tsHodnota; global.DEFAULT_TECHSPEC = tsm.DEFAULT_TECHSPEC;
  const fm = require('./firma.js'); Object.keys(fm).forEach(k => { global[k] = fm[k]; });
  const zk = require('./zakazka.js');
  const { nabidkaData, nabidkaNahledSekce } = require('./nabidka.js');
  const zak = zk.novaZakazka(); zak.cislo = '2026 - OPR - CN - 9137';
  Object.assign(zak.varianty[0].data.ock.zadani, { prejezd: 3.5, zdvih: 12, prohluben: 1.1, sirka: 1.6, hloubka: 1.5,
    mustkyKs: 1, mustekHloubkaMm: 900, mustekSirkaMm: 1300 });
  const ph = nabidkaData(zak, zak.varianty[0], J, 'cz').placeholders;
  test('nabídka: TS_MUSTKY', ph.TS_MUSTKY === '1 ks, hloubka 900 mm, šířka 1300 mm', ph.TS_MUSTKY);
  const radky = []; nabidkaNahledSekce(ph, 'cz').forEach(s => s.radky.forEach(r => radky.push(r)));
  test('online nabídka: řádek MŮSTKY v doplňkových konstrukcích', radky.some(r => r[0] === RADEK && /900/.test(r[1])));
  zak.varianty[0].data.ock.zadani.mustkyKs = 0;
  test('nabídka bez můstků: zástupce prázdný', nabidkaData(zak, zak.varianty[0], J, 'cz').placeholders.TS_MUSTKY === '');
}

/* Kontrola před nabídkou. */
{
  const sl = require('./sleva.js'); global.slevaPodil = sl.slevaPodil;
  const kt = require('./kontroly.js');
  const nal = (x, c) => { const { r, z } = spocti(x, true, 'exteriérová', c);
    return kt.kontrolyProved({ zadani: z, vysledek: r, cenik: c || CENIK }).nalezy.find(n => n.kod === 'mustky'); };
  test('kontrola: s cenou a rozumným počtem mlčí', !nal({ mustkyKs: 1 }));
  const bezCeny = Object.assign(kop(CENIK), { mustekKc: 0 });
  const n = nal({ mustkyKs: 2 }, bezCeny);
  test('kontrola: chybí cena → 0 Kč se řekne', n && /chybí cena můstku/.test(n.text) && /0 Kč/.test(n.text), n && n.text);
  const n2 = nal({ mustkyKs: 9, nastupiste: 5 });
  test('kontrola: víc můstků než nástupišť', n2 && /víc než nástupišť/.test(n2.text), n2 && n2.text);
  test('kontrola: bez můstků mlčí i bez ceny', !nal({}, bezCeny));
}

/* Kontrola standardu počítá s počtem. */
{
  const so = require('./standard_ock.js');
  const std = Object.assign(so.standardOciste({}), { zapnuto: true });
  const z = Object.assign(kop(E.DEFAULT_ZADANI), { mustkyKs: 2, mustekHloubkaMm: 1500, mustekSirkaMm: 800 });
  const v = so.standardVyhodnot(z, 20, std, {});
  test('standard: hloubka můstku nad limit se hlásí i při zadání počtem', (v.nalezy || []).some(n => /Hloubka můstku/.test(n.co || n.nazev || JSON.stringify(n))), v.nalezy);
  const v0 = so.standardVyhodnot(Object.assign(kop(E.DEFAULT_ZADANI), { mustkyKs: 0, mustekHloubkaMm: 1500 }), 20, std, {});
  test('standard: 0 můstků = rozměry se nehlídají', !(v0.nalezy || []).some(n => /můstku/.test(JSON.stringify(n))));
}

/* #355 (rozhodnutí J. V. 16. 10. 2026): přechodové plechy se v nástupišti
 * s můstkem počítají dál, kontrola před nabídkou jen upozorní. */
{
  const kt = require('./kontroly.js');
  const KOD = 'mustkyPrechodove';
  const proved = (x, jazyk) => { const { r, z } = spocti(x, true);
    return { r, z, k: kt.kontrolyProved({ zadani: z, vysledek: r, cenik: CENIK, jazyk }) }; };
  const nalez = (x, j) => proved(x, j).k.nalezy.find(n => n.kod === KOD);
  const zakl = proved({ mustkyKs: 0 }).r, sMust = proved({ mustkyKs: 2 }).r;
  const plech = r => r.sekce.volitelne.filter(x => /PŘECHODOVÉ/.test(x.origNazev)).map(x => [x.mnozstvi, x.naklad]);
  test('#355: výpočet plechů s můstky beze změny', JSON.stringify(plech(zakl)) === JSON.stringify(plech(sMust))
    && sMust.dily.prechKs === zakl.dily.prechKs, [plech(zakl), plech(sMust)]);
  const n = nalez({ mustkyKs: 2 });
  test('#355: můstek + plechy v základní ceně → upozornění s počty', n && /2 můstky/.test(n.text)
    && /6 nástupišť/.test(n.text) && /materiál i montáž/.test(n.text) && /v základní ceně/.test(n.text), n && n.text);
  test('#355: upozornění nezastaví dokument', n && n.uroven !== kt.KONTROLY_UROVEN_ZABRANA);
  for (const j of ['cz', 'en', 'de', 'fr']) {
    const p = proved({ mustkyKs: 1 }, j);
    test('#355: jazyk tisku ' + j.toUpperCase() + ' — upozornění je, tisk nezastaví',
      p.k.nalezy.some(x => x.kod === KOD) && !p.k.nalezy.some(x => x.kod === KOD && x.uroven === kt.KONTROLY_UROVEN_ZABRANA));
  }
  const vse = nalez({ mustkyKs: 5 });
  test('#355: můstky ve všech nadzemních nástupištích se řeknou', vse && /ve všech nadzemních nástupištích/.test(vse.text), vse && vse.text);
  test('#355: bez můstků mlčí', !nalez({ mustkyKs: 0 }));
  test('#355: bez plechů mlčí', !nalez({ mustkyKs: 2, prechodovePlechy: false,
    volitelne: Object.assign(kop(E.DEFAULT_ZADANI.volitelne), { prechodove: false, prechMont: false }),
    priplatkyVynechat: ['vsgFolie', 'skn', 'prechMat', 'prechMont'] }), nalez({ mustkyKs: 2, prechodovePlechy: false,
    volitelne: Object.assign(kop(E.DEFAULT_ZADANI.volitelne), { prechodove: false, prechMont: false }),
    priplatkyVynechat: ['vsgFolie', 'skn', 'prechMat', 'prechMont'] }));
  const prip = nalez({ mustkyKs: 1, volitelne: Object.assign(kop(E.DEFAULT_ZADANI.volitelne), { prechodove: false, prechMont: false }) });
  test('#355: plechy jen v příplatcích nabídky → upozornění na příplatek', prip && /příplat/.test(prip.text), prip && prip.text);
  const vyn = nalez({ mustkyKs: 1, volitelne: Object.assign(kop(E.DEFAULT_ZADANI.volitelne), { prechodove: false, prechMont: false }),
    priplatkyVynechat: ['vsgFolie', 'skn', 'prechMat', 'prechMont'] });
  test('#355: příplatky plechů vynechané z nabídky → mlčí', !vyn, vyn && vyn.text);
}

/* #356 (rozhodnutí J. V. 16. 10. 2026): střecha EXT přetažená přes nejvyšší
 * můstek — plocha navíc se připočte do zastřešení i do příplatku za měď.
 * RUČNÍ REFERENCE (výchozí zadání: šířka 1,51 m, hloubka 1,515 m, 6 nástupišť,
 * zkušební ceník 5 000 Kč/m² zastřešení i mědi):
 *   šachta  (1,51 + 0,2) × (1,515 + 0,1)      = 2,76165 m²  → 13 808,25 Kč
 *   můstek  (1,300 + 0,2) × 0,900              = 1,35 m²
 *   celkem                                     = 4,11165 m²  → 20 558,25 Kč
 * Můstek jen v nižších nástupištích (2 ks z 5 nadzemních) střechu nemění. */
{
  const ZAS = 'ZASTŘEŠENÍ ŠACHTY (EXT)', MED = 'medStrecha';
  const zas = r => r.sekce.hrubaOck.find(x => x.origNazev === ZAS);
  const med = r => r.priplatky.find(x => x.key === MED);
  const rozm = { mustekSirkaMm: 1300, mustekHloubkaMm: 900 };
  const blizko = (a, b) => Math.abs(a - b) < 1e-6;
  for (const fixes of [true, false]) {
    const M = fixes ? 'Model 2' : 'Model 1';
    const bez = spocti({}, fixes).r;
    test(M + ' #356: bez můstku střecha 2,76165 m² (beze změny)', blizko(zas(bez).mnozstvi, 2.76165) && blizko(zas(bez).naklad, 13808.25), zas(bez));
    const vse = spocti(Object.assign({ mustkyKs: 5 }, rozm), fixes).r;
    test(M + ' #356: můstek i v nejvyšším → střecha 4,11165 m² / 20 558,25 Kč', blizko(zas(vse).mnozstvi, 4.11165)
      && blizko(zas(vse).naklad, 20558.25), zas(vse));
    test(M + ' #356: příplatek za měď má tutéž plochu', blizko(med(vse).mnozstvi, 4.11165) && blizko(med(bez).mnozstvi, 2.76165), [med(bez), med(vse)]);
    const nizsi = spocti(Object.assign({ mustkyKs: 2 }, rozm), fixes).r;
    test(M + ' #356: můstky jen v nižších nástupištích → střecha beze změny', blizko(zas(nizsi).mnozstvi, 2.76165), zas(nizsi));
    const bezRozm = spocti({ mustkyKs: 5 }, fixes).r;
    test(M + ' #356: bez rozměrů můstku nic navíc', blizko(zas(bezRozm).mnozstvi, 2.76165), zas(bezRozm));
    const int = spocti(Object.assign({ mustkyKs: 5 }, rozm), fixes, 'interiérová').r;
    test(M + ' #356: interiér bez zastřešení', !zas(int) && !med(int));
    test(M + ' #356: cena vzroste o plochu můstku', vse.souhrn.zakladCena > bez.souhrn.zakladCena);
  }
  const { r, z } = spocti(Object.assign({ mustkyKs: 5 }, rozm));
  test('#356: výsledek nese plochu střechy nad můstkem', r.strecha && blizko(r.strecha.mustekM2, 1.35), r.strecha);
  const kt = require('./kontroly.js');
  const chybi = spocti({ mustkyKs: 5 });
  const n = kt.kontrolyProved({ zadani: chybi.z, vysledek: chybi.r, cenik: CENIK }).nalezy.find(x => x.kod === 'mustekStrecha');
  test('#356: chybí rozměry můstku → upozornění, ne zábrana', n && /rozměr/.test(n.text) && n.uroven !== kt.KONTROLY_UROVEN_ZABRANA, n && n.text);
  test('#356: s rozměry upozornění mlčí', !kt.kontrolyProved({ zadani: z, vysledek: r, cenik: CENIK }).nalezy.some(x => x.kod === 'mustekStrecha'));
}

/* K3-N17 (audit K3, dávka O5 20. 10. 2026): rozměr můstku Infinity
 * (`+z.mustekSirkaMm > 0` ho propustil) dal nekonečnou plochu a cenu.
 * Nekonečný rozměr = jako nevyplněný (střecha jen nad šachtou, kontrola
 * mustekStrecha upozorní). Horní mez rozměru je číslo k rozhodnutí J. V.
 * Před opravou selžou 3 kontroly (plocha i cena Infinity). */
{
  const kt = require('./kontroly.js');
  const ZAS = 'ZASTŘEŠENÍ ŠACHTY (EXT)';
  const zas = r => r.sekce.hrubaOck.find(x => x.origNazev === ZAS);
  for (const [popis, rozm] of [['šířka Infinity', { mustekSirkaMm: Infinity, mustekHloubkaMm: 900 }],
                               ['hloubka „1e400"', { mustekSirkaMm: 1300, mustekHloubkaMm: '1e400' }]]) {
    const { r, z } = spocti(Object.assign({ mustkyKs: 5 }, rozm));
    test('K3-N17: ' + popis + ' → střecha jen nad šachtou (konečná plocha)', Number.isFinite(zas(r).mnozstvi)
      && Math.abs(zas(r).mnozstvi - 2.76165) < 1e-6, zas(r).mnozstvi);
    test('K3-N17: ' + popis + ' → konečná cena', Number.isFinite(r.souhrn.zakladCena), r.souhrn.zakladCena);
    test('K3-N17: ' + popis + ' → kontrola upozorní na chybějící rozměr',
      kt.kontrolyProved({ zadani: z, vysledek: r, cenik: CENIK }).nalezy.some(x => x.kod === 'mustekStrecha'));
  }
}

/* K3-N17 (rozhodnutí J. V. 20. 10. 2026, dávka O7): rozměry můstku „jen
 * upozornit". Velký rozměr se přijme a započte, kontrola mustekRozmer
 * upozorní nad KONTROLY_MUSTEK_MAX_MM (6000 mm); nečíselný údaj jádro bere
 * jako prázdný a kontrola to řekne. Upozornění, ne zábrana.
 * Před opravou (bez pravidla mustekRozmer) selže 5 kontrol. */
{
  const kt = require('./kontroly.js');
  const ZAS = 'ZASTŘEŠENÍ ŠACHTY (EXT)';
  const zas = r => r.sekce.hrubaOck.find(x => x.origNazev === ZAS);
  const najdi = (zr) => kt.kontrolyProved({ zadani: zr.z, vysledek: zr.r, cenik: CENIK }).nalezy.find(x => x.kod === 'mustekRozmer');
  test('K3-N17 O7: práh nezvyklého rozměru můstku je 6000 mm', kt.KONTROLY_MUSTEK_MAX_MM === 6000);
  const velky = spocti({ mustkyKs: 5, mustekSirkaMm: 13000, mustekHloubkaMm: 900 });
  const n = najdi(velky);
  test('K3-N17 O7: šířka 13 000 mm → upozornění (ne zábrana) s rozměrem a prahem',
    !!n && n.uroven !== kt.KONTROLY_UROVEN_ZABRANA && /šířka 13\s000 mm je nezvykle velká/.test(n.text) && /6\s000 mm/.test(n.text), n && n.text);
  test('K3-N17 O7: velký rozměr se přijme a započte (plocha 13,2 × 0,9 nad šachtou)',
    Math.abs(zas(velky.r).mnozstvi - (2.76165 + 13.2 * 0.9)) < 1e-6, zas(velky.r).mnozstvi);
  test('K3-N17 O7: hranice — 6000 mm mlčí, 6001 mm upozorní',
    !najdi(spocti({ mustkyKs: 5, mustekSirkaMm: 6000, mustekHloubkaMm: 6000 }))
    && !!najdi(spocti({ mustkyKs: 5, mustekSirkaMm: 1300, mustekHloubkaMm: 6001 })));
  const text = najdi(spocti({ mustkyKs: 5, mustekSirkaMm: 'abc', mustekHloubkaMm: 900 }));
  test('K3-N17 O7: nečíselný rozměr → upozornění, že se bere jako nevyplněný', !!text && /„abc" není platné číslo/.test(text.text), text && text.text);
  test('K3-N17 O7: Infinity → upozornění', !!najdi(spocti({ mustkyKs: 5, mustekSirkaMm: Infinity, mustekHloubkaMm: 900 })));
  test('K3-N17 O7: běžné rozměry a prázdno mlčí', !najdi(spocti({ mustkyKs: 5, mustekSirkaMm: 1300, mustekHloubkaMm: 900 }))
    && !najdi(spocti({ mustkyKs: 5 })));
  test('K3-N17 O7: bez můstku mlčí i s velkým rozměrem', !najdi(spocti({ mustekSirkaMm: 99999 })));
}

/* K29-N1 (rozhodnutí J. V. 20. 10. 2026: „pokud není na zakázce střecha,
 * tak zastřešení můstku nejspíš řešit nebudeme"). Zastřešení šachty mimo
 * nabídku (vyřazené přes `nepocitat`, nebo ruční množství 0) → příplatek
 * za měď se nenabízí a `mustekStrecha` mlčí. Prázdný přepis není nula.
 * Výjimka: vlastní ruční množství mědi = vědomá dohoda, řádek zůstává. */
{
  const ZAS = 'ZASTŘEŠENÍ ŠACHTY (EXT)', MED_N = 'PŘÍPLATEK ZA STŘECHU V MĚDI (EXT)';
  const med = r => r.priplatky.find(x => x.key === 'medStrecha');
  const kt = require('./kontroly.js');
  const mlci = ({ r, z }) => !kt.kontrolyProved({ zadani: z, vysledek: r, cenik: CENIK }).nalezy.some(x => x.kod === 'mustekStrecha');
  const blizko = (a, b) => Math.abs(a - b) < 1e-6;
  for (const fixes of [true, false]) {
    const M = fixes ? 'Model 2' : 'Model 1';
    const vyr = spocti({ nepocitat: [ZAS] }, fixes).r;
    test(M + ' K29-N1: zastřešení vyřazené, bez můstků → žádná měď', !med(vyr) && vyr.strecha.vNabidce === false, med(vyr));
    test(M + ' K29-N1: název mědi zůstává v rejstříku (přepisy nejsou sirotci)', vyr.nazvyPolozek.indexOf(MED_N) >= 0);
    const m3 = { nastupiste: 4, mustkyKs: 3, mustekSirkaMm: 1300, mustekHloubkaMm: 900, nepocitat: [ZAS] };
    const s3 = spocti(m3, fixes);
    test(M + ' K29-N1: 4 nástupiště, 3 můstky, zastřešení vyřazené → žádná měď', !med(s3.r) && s3.r.strecha.vNabidce === false
      && s3.r.strecha.mustekNahore === true, s3.r.strecha);
    const s3b = spocti(Object.assign({}, m3, { mustekSirkaMm: '', mustekHloubkaMm: '' }), fixes);
    test(M + ' K29-N1: zastřešení vyřazené → mustekStrecha mlčí i bez rozměrů', s3b.r.strecha.mustekNahore === true && mlci(s3b));
    const nula = spocti({ mnozstviPrepis: { [ZAS]: 0 } }, fixes).r;
    test(M + ' K29-N1: ruční množství zastřešení 0 → žádná měď', !med(nula) && nula.strecha.vNabidce === false);
    const nulaTxt = spocti({ mnozstviPrepis: { [ZAS]: '0' } }, fixes).r;
    test(M + ' K29-N1: ruční množství zastřešení „0" → žádná měď', !med(nulaTxt));
    const prazdno = spocti({ mnozstviPrepis: { [ZAS]: '' } }, fixes).r;
    test(M + ' K29-N1: prázdný přepis zastřešení není nula → měď zůstává', med(prazdno) && blizko(med(prazdno).mnozstvi, 2.76165)
      && prazdno.strecha.vNabidce === true, med(prazdno));
    const vyj = spocti({ nepocitat: [ZAS], mnozstviPrepis: { [MED_N]: 7.5 } }, fixes).r;
    test(M + ' K29-N1: výjimka — vlastní ruční množství mědi → řádek zůstává s ním', med(vyj) && med(vyj).mnozstvi === 7.5
      && med(vyj).prepsano === true && vyj.strecha.vNabidce === false, med(vyj));
    const ok1 = spocti({}, fixes).r, ok2 = spocti(Object.assign({}, m3, { nepocitat: [] }), fixes).r;
    test(M + ' K29-N1: se zastřešením beze změny (bez můstku 2,76165 m², s můstkem nahoře 4,11165 m²)',
      med(ok1) && blizko(med(ok1).mnozstvi, 2.76165) && ok1.strecha.vNabidce === true
      && med(ok2) && blizko(med(ok2).mnozstvi, 4.11165), [med(ok1), med(ok2)]);
    const int = spocti({}, fixes, 'interiérová').r;
    test(M + ' K29-N1: interiér → žádná měď, vNabidce false', !med(int) && int.strecha.vNabidce === false);
  }
}

console.log(`\n${ok} prošlo, ${fail} selhalo`);
process.exit(fail ? 1 : 0);
