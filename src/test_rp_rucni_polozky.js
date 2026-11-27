/* RP #736 (rozhodnutí J. V. 23. a 24. 11. 2026, podnět CN-431) — RUČNÍ
 * POLOŽKY KALKULACE OCK V NABÍDCE CN A KRYCÍM LISTU.
 *
 *  A) modul rucni_polozky.js: převod sekcí podle J. V., jednotky (výchozí ks,
 *     starý soubor bez jednotky = ks), starší volitelneVlastni, trvalá
 *     položka z ceníku (kid) a nulové množství se netisknou;
 *  B) nabídka bez ruční položky: symboly ceny beze změny, žádné data.rucni;
 *  C) rozpis ceny: součet řádků (šachta + můstky + ruční) = cena před slevou
 *     na korunu (CZ) i na euro (EN), se slevou i bez; ruční položka Můstků
 *     se odečte z řádku můstků (J. V. 24. 11. bod a); položka s cenou 0 jde
 *     do specifikace, ne do ceny (bod b); CENA CELKEM = koncová cena;
 *  D) řádky specifikace: NÁZEV VELKÝMI | „množství jednotka" + \n dodatkový
 *     text, kotva Wordu podle cílové sekce (i náhradní kotva starší šablony),
 *     překlad z položky / slovníku (jednotky bm → lm, kpl → set);
 *  E) krycí list: „Ruční položky v ceně" jen se ruční položkou (BO i Tech),
 *     text „počet – název, množství jednotka, cena (sekce)", do Pipedrive ne;
 *  F) kontrola rucniPolozkaCesky: EN bez překladu varuje, s překladem ne,
 *     česká nabídka nikdy;
 *  G) odeslaná (zamčená) nabídka: dotisk má řádky a rozpis ceny ze ZMRAZENÉHO
 *     výsledku, zmrazená čísla odpovídají přepočtu (žádný rozdíl B59/B232);
 *  H) víc šachet: řádky u své šachty, Režie s názvem šachty, cena po šachtách
 *     beze změny;
 *  I) nálezy revize Fable 24. 11.: S1 kontrola chybějící kotvy Wordu, N2 Spojovací /
 *     Lakování, N4 Můstky ve v15, N5 pojistka kid, N6 typ a délka polí na serveru;
 *     T1 eura v C, T2 název a krycí list ze zámku v G; N1 (J. V. 24. 11.) krycí list
 *     u šachty s ks > 1 „cena/ks × N ks = celkem“ v H.
 * Pojistka: na d655295 (před dávkou RP) modul neexistuje a nabidkaData ani
 * krycí list ruční položky neznají — sada selže; viz zpráva commitu.
 * Spuštění: node src/test_rp_rucni_polozky.js */
'use strict';
const path = require('path');
const fs = require('fs');
const CORE = ['build_info.js', 'nazvy_souboru.js', 'preklad.js', 'format.js', 'engine.js', 'vice_sachet.js', 'engine_proj.js', 'techspec.js',
  'rucni_polozky.js', 'zakazka.js', 'uloziste.js', 'retence_zaloh.js', 'zamek.js', 'seznam.js', 'archiv.js', 'docxgen.js', 'xlsx.js', 'dokumenty.js',
  'sleva.js', 'schvalovani.js', 'zaokrouhleni.js', 'marze.js', 'kontroly.js', 'ares.js', 'poznamky.js', 'protokol.js', 'firma.js',
  'zpracovatel.js', 'podminky.js', 'plan_plateb.js', 'nabidka.js', 'nabidka_proj.js', 'sod.js', 'kryci.js', 'kryci_proj.js',
  'cenik.js', 'cenik_stari.js', 'cenik_rady.js', 'vyjimky.js', 'rucni_ceny.js', 'katalog.js', 'prepisy.js', 'slovnik.js',
  'konfigurace.js', 'sablony_online.js', 'sablona_obsah.js', 'analytika.js', 'nastaveni_db.js', 'program.js', 'ukazkove.js',
  'prava.js', 'zobrazeni.js', 'zakaznici.js', 'controlling.js', 'pd_nanecisto.js', 'objednane.js', 'standard_ock.js'];
let ok = 0, fail = 0;
const test = (n, c, info) => { if (c) { ok++; console.log('OK   ' + n); } else { fail++; console.log('FAIL ' + n + '  ' + JSON.stringify(info === undefined ? '' : info).slice(0, 500)); } };
for (const f of CORE) {
  const p = path.join(__dirname, f);
  if (!fs.existsSync(p)) { test('modul ' + f + ' existuje', false); continue; }
  const m = require(p); if (m && typeof m === 'object') Object.assign(global, m);
}
if (typeof rucniPolozkyVysledku !== 'function') { console.log(`\nVýsledek: ${ok} OK, ${fail} FAIL`); process.exit(1); }
const ZC = require('./zkusebni_cenik.js');
global.DEFAULT_CENIK = ZC.zkusebniCenik();
global.DEFAULT_CENIK_PROJ = ZC.zkusebniCenikProj();
const J = JSON.parse(fs.readFileSync(path.join(__dirname, 'jekly.json'), 'utf8'));
const kop = x => JSON.parse(JSON.stringify(x));
/* „1 149 000,00 Kč" / „€ 45 960" → číslo */
const cislo = t => +String(t).replace(/[^\d,-]/g, '').replace(',', '.');
const hal = n => Math.round(n * 100);
const mezery = t => String(t).replace(/[\s\u00a0\u202f]+/g, ' ');   // formát čísel má pevné mezery

const SKLADBA = { mustekRamBmKc: 10000, mustekPodlahaPlechM2Kc: 1000, mustekPodlahaPororostM2Kc: 1100, mustekPodlahaVanaM2Kc: 1200,
  mustekZabradliKovBmKc: 2000, mustekZabradliSkloBmKc: 5000, mustekKotveniDeskaKc: 3000, mustekKotveniSloupKc: 3100,
  mustekKotveniKonzolaKc: 3200, mustekZabradliSkloMontazHodBm: 1 };
const ZAD = { prejezd: 3.3, zdvih: 12, prohluben: 1.2, sirka: 1.6, hloubka: 2.1, nastupiste: 4, typSachty: 'exteriérová' };
const MUSTEK = { ks: 2, sirkaMm: 1600, delkaMm: 1200, podlaha: 'plech', zabradli: 'kov', zabradliStrany: 2, sloupyKs: 0, sloupVyskaM: 0 };
const RUCNI = () => ({
  hrubaOck: [{ nazev: 'Výztuha navíc', mnozstvi: 2.5, cena: 1200, jednotka: 'bm' }],
  oplasteni: [{ nazev: 'Oplechování atiky', mnozstvi: 3, cena: 900, jednotka: 'm²', dodatek: 'pozink lakovaný RAL 7016' }],
  volitelne: [{ nazev: 'Nosná konstrukce s pochozím dnem prohlubně', mnozstvi: 1, cena: 56000, dodatek: 'Pochozí plech tl. 5 mm' }],
  rezie: [{ nazev: 'Doprava jeřábem', mnozstvi: 1, cena: 8000, jednotka: 'kpl' }],
});
function zakazka(o) {
  o = o || {};
  const zak = novaZakazka();
  zak.cislo = '2026-OPR-CN-9736'; zak.nazevAkce = 'RP ruční položky';
  const v = zak.varianty[0];
  v.data.cenik = Object.assign(ZC.zkusebniCenik(), ZC.zkusebniMustky(), SKLADBA, { kurzEurKc: 25 });
  v.data.ock.fixes = true;
  Object.assign(v.data.ock.zadani, ZAD, o.mustky ? { mustky: [kop(MUSTEK)] } : {});
  if (o.rucni !== false) v.data.ock.zadani.vlastniPolozky = Object.assign({}, v.data.ock.zadani.vlastniPolozky, o.rucni || RUCNI());
  if (o.sleva) v.data.sleva = { procenta: o.sleva, stav: 'schváleno' };
  return { zak, v };
}

/* ---------- A) modul ---------- */
{
  test('A převod sekcí podle J. V. 23. 11. (+ Můstky 24. 11.)',
    ['hrubaOck', 'atyp', 'spojovaci', 'lakovani'].every(k => RP_SEKCE_TS[k] === 'KONSTRUKČNÍ ŘEŠENÍ ŠACHTY')
    && RP_SEKCE_TS.oplasteni === 'OPLÁŠTĚNÍ ŠACHTY' && RP_SEKCE_TS.volitelne === 'DOPLŇKOVÉ KONSTRUKCE'
    && RP_SEKCE_TS.rezie === 'PROJEKČNÍ A PŘÍPRAVNÉ PRÁCE' && RP_SEKCE_TS.mustky === 'MŮSTKY MEZI BUDOVOU A OCK', RP_SEKCE_TS);
  test('A jednotky ks, bm, m², kpl; bez jednotky (starý soubor) i neznámá = ks',
    JSON.stringify(RP_JEDNOTKY) === '["ks","bm","m²","kpl"]' && rpJednotka({}) === 'ks' && rpJednotka({ jednotka: 'xx' }) === 'ks'
    && rpJednotka({ jednotka: 'bm' }) === 'bm');
  const { v } = zakazka({ rucni: { hrubaOck: [{ nazev: 'Ruční', mnozstvi: 1, cena: 100 }, { nazev: 'Nula', mnozstvi: 0, cena: 100 },
    { nazev: 'Trvalá z ceníku', mnozstvi: 1, cena: 100, kid: 'k1' }] } });
  const r = vypocetZ(v, J);
  const a = rucniPolozkyVysledku(r, v.data.ock.zadani);
  test('A tiskne se ruční položka; nulové množství a trvalá položka z ceníku (kid) ne',
    a.length === 1 && a[0].nazev === 'Ruční' && a[0].jednotka === 'ks' && a[0].sekceTs === 'KONSTRUKČNÍ ŘEŠENÍ ŠACHTY', a);
  const st = zakazka({ rucni: false }); st.v.data.ock.zadani.volitelneVlastni = [{ nazev: 'Ze srpna', mnozstvi: 2, cena: 500 }];
  const b = rucniPolozkyVysledku(vypocetZ(st.v, J), st.v.data.ock.zadani);
  test('A starší soubor (volitelneVlastni) → DOPLŇKOVÉ KONSTRUKCE, 2 ks', b.length === 1 && b[0].sekceTs === 'DOPLŇKOVÉ KONSTRUKCE' && b[0].mnozstvi === 2, b);
  test('A kotva Wordu: v18 poslední řádek sekce; starší šablona náhradní; bez kotvy null',
    rpKotva('DOPLŇKOVÉ KONSTRUKCE', new Set(['TS_SOKL', 'TS_PRECHODOVE_PLECHY'])) === 'TS_SOKL'
    && rpKotva('DOPLŇKOVÉ KONSTRUKCE', new Set(['TS_PRECHODOVE_PLECHY'])) === 'TS_PRECHODOVE_PLECHY'
    && rpKotva('OPLÁŠTĚNÍ ŠACHTY', new Set(['X'])) === null && rpKotva('KONSTRUKČNÍ ŘEŠENÍ ŠACHTY', null) === 'TS_POZARNI');
}

/* ---------- B) bez ruční položky beze změny ---------- */
{
  const { zak, v } = zakazka({ rucni: false });
  const d = nabidkaData(zak, v, J, 'cz');
  test('B bez ruční položky: žádné data.rucni, cena jen v řádku VÝTAHOVÁ ŠACHTA (jako dosud)',
    d.rucni === undefined && d.placeholders.CENA_SACHTA_BEZ_DPH === '' && d.placeholders.CENA_BEZ_DPH_CELKEM === ''
    && d.placeholders.CENA_BEZ_DPH_SACHTA === d.placeholders.CENA_BEZ_DPH, d.placeholders.CENA_SACHTA_BEZ_DPH);
  test('B bez ruční položky: v řádcích Wordu nic navíc', !(d.tsRadkyNavic || []).some(x => /CENA_MUSTKY|CENA_BEZ_DPH_CELKEM|TS_POZARNI|TS_STATIKA/.test(x.kotva)));
}

/* ---------- C) rozpis ceny ---------- */
for (const [jm, o, L] of [['CZ bez slevy', {}, 'cz'], ['CZ sleva 5 %', { sleva: 5 }, 'cz'], ['EN (eura) sleva 3 %', { sleva: 3 }, 'en'],
  ['CZ s můstky', { mustky: true }, 'cz'], ['EN s můstky', { mustky: true }, 'en']]) {
  const { zak, v } = zakazka(o);
  const d = nabidkaData(zak, v, J, L);
  const ph = d.placeholders;
  const radky = [ph.CENA_SACHTA_BEZ_DPH, ph.CENA_MUSTKY_BEZ_DPH].concat(d.rucni.ceny.map(x => x.cena)).filter(Boolean);
  const soucet = radky.reduce((s, t) => s + hal(cislo(t)), 0);
  test('C ' + jm + ': součet řádků = cena před slevou na ' + (L === 'cz' ? 'korunu' : 'euro'),
    d.rucni.ceny.length === 4 && soucet === hal(cislo(ph.CENA_PRED_SLEVOU)), { radky, pred: ph.CENA_PRED_SLEVOU });
  test('C ' + jm + ': CENA CELKEM = koncová cena, řádek VÝTAHOVÁ ŠACHTA s koncovou cenou zmizí',
    ph.CENA_BEZ_DPH_CELKEM === ph.CENA_BEZ_DPH && ph.CENA_BEZ_DPH_SACHTA === '');
  if (L === 'cz') test('C ' + jm + ': ruční položka = její cena s marží (56 000 × 1,2 = 67 200,00 Kč)',
    mezery(d.rucni.ceny.find(x => /NOSNÁ/.test(x.nazev)).cena) === '67 200,00 Kč', d.rucni.ceny);
  /* revize T1: v eurech se ruční řádek převádí kurzem (nahoru na celé euro), ne korunová částka se znakem € */
  if (L === 'en') test('C ' + jm + ': ruční řádek v eurech = ceil(67 200 / 25) = € 2 688',
    hal(cislo(d.rucni.ceny.find(x => /NOSNÁ/.test(x.nazev)).cena)) === hal(Math.ceil(67200 / 25)), d.rucni.ceny);
  test('C ' + jm + ': žádný řádek rozpisu není záporný', radky.every(t => cislo(t) >= 0 && !/[-−]/.test(String(t))), radky);
}
{
  /* ruční položka v Můstcích: vlastní řádek, odečtená z řádku můstků */
  const bez = zakazka({ mustky: true, rucni: false });
  const s = zakazka({ mustky: true, rucni: { mustky: [{ nazev: 'Stříška nad můstkem', mnozstvi: 1, cena: 10000 }] } });
  const pb = nabidkaData(bez.zak, bez.v, J, 'cz').placeholders;
  const ds = nabidkaData(s.zak, s.v, J, 'cz');
  const ruc = ds.rucni.ceny.find(x => /STŘÍŠKA/.test(x.nazev));
  test('C Můstky: řádek ruční položky + řádek můstků = můstky celkem; řádek šachty beze změny',
    ruc && hal(cislo(ruc.cena)) + hal(cislo(ds.placeholders.CENA_MUSTKY_BEZ_DPH)) === hal(cislo(pb.CENA_MUSTKY_BEZ_DPH)) + hal(12000)
    && ds.placeholders.CENA_SACHTA_BEZ_DPH === pb.CENA_SACHTA_BEZ_DPH, { ruc, m: ds.placeholders.CENA_MUSTKY_BEZ_DPH, mb: pb.CENA_MUSTKY_BEZ_DPH });
  test('C Můstky: řádek specifikace v sekci MŮSTKY MEZI BUDOVOU A OCK',
    ds.rucni.tsRadky.some(t => t.sekceTs === 'MŮSTKY MEZI BUDOVOU A OCK' && t.nazev === 'STŘÍŠKA NAD MŮSTKEM'), ds.rucni.tsRadky);
  /* nulová cena: do specifikace ano, do ceny ne */
  const n = zakazka({ rucni: { volitelne: [{ nazev: 'Zdarma navíc', mnozstvi: 1, cena: 0 }] } });
  const dn = nabidkaData(n.zak, n.v, J, 'cz');
  test('C položka s cenou 0: řádek specifikace ano, cenový blok beze změny',
    dn.rucni && dn.rucni.tsRadky.length === 1 && dn.rucni.ceny.length === 0 && dn.placeholders.CENA_SACHTA_BEZ_DPH === ''
    && dn.placeholders.CENA_BEZ_DPH_SACHTA === dn.placeholders.CENA_BEZ_DPH, dn.rucni);
}

/* ---------- D) řádky specifikace ---------- */
{
  const { zak, v } = zakazka({});
  const d = nabidkaData(zak, v, J, 'cz', { symboly: new Set(['TS_POZARNI', 'TS_NAPOJENI_DVERI', 'TS_SOKL', 'TS_STATIKA', 'CENA_MUSTKY_BEZ_DPH', 'CENA_SACHTA_BEZ_DPH', 'CENA_BEZ_DPH_CELKEM']) });
  const t = d.rucni.tsRadky;
  test('D řádek NÁZEV VELKÝMI | „množství jednotka" + \\n dodatkový text',
    t.some(x => x.nazev === 'NOSNÁ KONSTRUKCE S POCHOZÍM DNEM PROHLUBNĚ' && x.hodnota === '1 ks\nPochozí plech tl. 5 mm')
    && t.some(x => x.nazev === 'VÝZTUHA NAVÍC' && x.hodnota === '2,5 bm') && t.some(x => x.nazev === 'OPLECHOVÁNÍ ATIKY' && x.hodnota === '3 m²\npozink lakovaný RAL 7016'), t);
  const w = d.tsRadkyNavic;
  const kotva = n => (w.find(x => x.nazev === n) || {}).kotva;
  test('D Word: kotva v cílové sekci šablony v18',
    kotva('VÝZTUHA NAVÍC') === 'TS_POZARNI' && kotva('OPLECHOVÁNÍ ATIKY') === 'TS_NAPOJENI_DVERI'
    && kotva('NOSNÁ KONSTRUKCE S POCHOZÍM DNEM PROHLUBNĚ') === 'TS_SOKL' && kotva('DOPRAVA JEŘÁBEM') === 'TS_STATIKA', w.map(x => [x.nazev, x.kotva]));
  test('D Word cena v16+: řádky z řádku můstků + přejmenovaná CENA CELKEM',
    w.filter(x => x.kotva === 'CENA_MUSTKY_BEZ_DPH').length === 4 && w.some(x => x.kotva === 'CENA_BEZ_DPH_CELKEM' && x.prejmenuj && x.nazev === 'CENA CELKEM'));
  const st = nabidkaData(zak, v, J, 'cz', { symboly: new Set(['TS_POZARNI', 'TS_SOKL', 'CENA_BEZ_DPH', 'CENA_PRED_SLEVOU']) }).tsRadkyNavic;
  test('D Word cena v15 a starší: VÝTAHOVÁ ŠACHTA + 4 ruční řádky před „Cena před slevou" z {{CENA_BEZ_DPH}} (ponese symbol CENA_SACHTA_BEZ_DPH)',
    st.filter(x => x.kotva === 'CENA_BEZ_DPH' && x.predSymbolem === 'CENA_PRED_SLEVOU' && x.symbol === 'CENA_SACHTA_BEZ_DPH').length === 5
    && st.some(x => x.kotva === 'CENA_BEZ_DPH' && x.prejmenuj));
  v.data.ock.zadani.vlastniPolozky.volitelne[0].jazyky = { en: { nazev: 'Load-bearing pit floor', dodatek: 'Plate 5 mm' } };
  const e = nabidkaData(zak, v, J, 'en').rucni;
  test('D EN: překlad z položky, jednotky ze slovníku (bm → lm, kpl → set), bez překladu česky',
    e.tsRadky.some(x => x.nazev === 'LOAD-BEARING PIT FLOOR' && x.hodnota === '1 pcs\nPlate 5 mm')
    && e.tsRadky.some(x => x.nazev === 'VÝZTUHA NAVÍC' && x.hodnota === '2,5 lm') && e.tsRadky.some(x => x.hodnota === '1 set'), e.tsRadky);
  test('D slovník: kpl → set / Kpl. / ens., bm → lm / lfm / ml',
    tr('kpl', 'en') === 'set' && tr('kpl', 'de') === 'Kpl.' && tr('kpl', 'fr') === 'ens.' && tr('bm', 'en') === 'lm' && tr('bm', 'de') === 'lfm' && tr('bm', 'fr') === 'ml');
}

/* ---------- E) krycí list ---------- */
{
  const { zak, v } = zakazka({});
  const pole = verze => kryciData(zak, v, J, verze).sekce[0].radky.find(x => x[0] === 'Ruční položky v ceně');
  const bo = pole('bo'), te = pole('techdata');
  test('E krycí list BO i Tech: „Ruční položky v ceně" — počet – název, množství jednotka, cena s marží (sekce)',
    bo && te && bo[1] === te[1] && /^4 – Výztuha navíc, 2,5 bm, 3 600 Kč \(Hrubá OCK\); Oplechování atiky, 3 m², 3 240 Kč \(Opláštění\); Nosná konstrukce s pochozím dnem prohlubně, 1 ks, 67 200 Kč \(Volitelné\); Doprava jeřábem, 1 kpl, 9 600 Kč \(Režie\)$/.test(mezery(bo[1])), bo);
  const b = zakazka({ rucni: false });
  test('E bez ruční položky řádek není (krycí list beze změny)', !kryciData(b.zak, b.v, J, 'bo').sekce[0].radky.some(x => x[0] === 'Ruční položky v ceně'));
  const pd = pdnPodklad(zak, J);
  test('E Pipedrive: pole ručních položek se nepíše', !JSON.stringify(pd).includes('Ruční položky v ceně') && !JSON.stringify(pd).includes('rucniPolozky'));
}

/* ---------- F) kontrola před tiskem ---------- */
{
  const { zak, v } = zakazka({});
  const nal = (jazyk) => kontrolyProved({ jazyk, vysledek: vypocetZ(v, J), zadani: v.data.ock.zadani, ock: v.data.ock }).nalezy.find(n => n.kod === 'rucniPolozkaCesky');
  test('F pravidlo rucniPolozkaCesky existuje', kontrolyPravidla().some(p => p.kod === 'rucniPolozkaCesky'));
  const n = nal('en');
  test('F EN bez překladu: varuje a jmenuje položky', n && /Výztuha navíc/.test(n.text) && /Nosná konstrukce/.test(n.text), n);
  test('F česká nabídka: nic', !nal('cz'));
  Object.values(v.data.ock.zadani.vlastniPolozky).forEach(a => (a || []).forEach(p => { p.jazyky = { en: { nazev: 'X ' + p.nazev, dodatek: p.dodatek ? 'Y' : undefined } }; }));
  test('F EN s překladem názvu i dodatku: nic', !nal('en'), nal('en'));
}

/* ---------- G) odeslaná nabídka ---------- */
{
  const { zak, v } = zakazka({ sleva: 5 });
  const z = kop(zak); const vv = z.varianty[0];
  kryciZmrazPodminky(z, vv, J);   // K70-I3: odeslání po opravě (snímek podmínek se značkou rpTisk)
  const vys = zamekVysledekSpocti(vv, J, 'test');
  vv.zamek = { zamceno: true, kdy: '2026-11-20T10:00:00.000Z', kdo: 'test@priklad.cz', cislo: z.cislo,
    vysledek: kop(vys), snimek: zamekSnimekSpocti(vv) };
  const rozd = zamekVysledekRozdily(kop(vv.zamek.vysledek), kop(zamekVysledekSpocti(vv, J, '')), 5, { prisne: true });
  test('G zmrazený výsledek = přepočet (ruční položky čísla zámku nemění)', rozd.pocet === 0, rozd);
  /* po odeslání se ceník změní — dotisk má jít ze ZMRAZENÉHO výsledku */
  vv.data.cenik.zamecnikAtypKc = (+vv.data.cenik.zamecnikAtypKc || 0) + 1;
  vv.data.ock.zadani.vlastniPolozky.volitelne[0].cena = 99999;   // data se po zámku mění jen podvrhem — dotisk je nesmí vzít
  vv.data.ock.zadani.vlastniPolozky.volitelne[0].nazev = 'Podvržený název';   // revize T2a: název ze zámku, ne ze zadání
  const d = nabidkaData(z, vv, J, 'cz');
  const dz = nabidkaData(zak, v, J, 'cz');
  test('G dotisk odeslané nabídky: řádky specifikace a rozpis ceny jsou, ceny ze zmrazeného výsledku',
    d.rucni && d.rucni.tsRadky.length === 4 && JSON.stringify(d.rucni.ceny) === JSON.stringify(dz.rucni.ceny)
    && d.placeholders.CENA_BEZ_DPH === dz.placeholders.CENA_BEZ_DPH && d.placeholders.CENA_PRED_SLEVOU === dz.placeholders.CENA_PRED_SLEVOU,
    { a: d.rucni && d.rucni.ceny, b: dz.rucni.ceny });
  test('G dotisk: název řádku ze zmrazeného výsledku, podvržený název v zadání se nevytiskne (revize T2a)',
    d.rucni.tsRadky.some(t => t.nazev === 'NOSNÁ KONSTRUKCE S POCHOZÍM DNEM PROHLUBNĚ') && !JSON.stringify(d.rucni).includes('PODVRŽENÝ'), d.rucni.tsRadky);
  const kl = kryciData(z, vv, J, 'bo').sekce[0].radky.find(x => x[0] === 'Ruční položky v ceně');
  test('G krycí list odeslané nabídky: cena i název ze zámku, ne z podvrženého zadání (revize T2b)',
    kl && /Nosná konstrukce s pochozím dnem prohlubně, 1 ks, 67 200 Kč/.test(mezery(kl[1])) && !/Podvržený|99/.test(kl[1]), kl);
}

/* ---------- H) víc šachet ---------- */
{
  const { zak, v } = zakazka({ mustky: true });
  v.data.ock.nazev = 'Výtah A';
  v.data.ock.dalsi = [{ id: 's_b', nazev: 'Výtah B', ks: 2, zadani: Object.assign(kop(DEFAULT_ZADANI), ZAD,
    { typSachty: 'interiérová', profily: kop(PROFILY_VYCHOZI['interiérová']), vlastniPolozky: Object.assign({}, kop(DEFAULT_ZADANI.vlastniPolozky),
      { oplasteni: [{ nazev: 'Jen u B', mnozstvi: 1, cena: 1000 }], rezie: [{ nazev: 'Doprava B', mnozstvi: 1, cena: 500 }] }) }) }];
  const d = nabidkaData(zak, v, J, 'cz', { symboly: new Set(['TS_NAPOJENI_DVERI', 'TS_STATIKA', 'SACHTA_NAZEV', 'SACHTA_CENA_BEZ_DPH']) });
  const sA = d.sachty[0], sB = d.sachty[1];
  test('H sekce šachty u své šachty (náhled rucniTs, Word __radkyNavic ve smyčce)',
    sA.rucniTs.some(t => t.nazev === 'OPLECHOVÁNÍ ATIKY') && !sA.rucniTs.some(t => t.nazev === 'JEN U B') && sB.rucniTs.some(t => t.nazev === 'JEN U B')
    && d.sachtyWord.polozky[1].__radkyNavic.some(x => x.nazev === 'JEN U B' && x.kotva === 'TS_NAPOJENI_DVERI'), { a: sA.rucniTs, b: sB.rucniTs });
  test('H Režie (společná sekce) s názvem šachty; cenový blok po šachtách bez ručních řádků',
    d.rucni.tsRadky.some(t => t.nazev === 'DOPRAVA JEŘÁBEM (Výtah A)') && d.rucni.tsRadky.some(t => t.nazev === 'DOPRAVA B (Výtah B)')
    && d.rucni.ceny.length === 0 && d.tsRadkyNavic.some(x => x.nazev === 'DOPRAVA B (Výtah B)' && x.kotva === 'TS_STATIKA'), d.rucni);
  const kl = kryciData(zak, v, J, 'bo').sekce[0].radky.find(x => x[0] === 'Ruční položky v ceně');
  test('H krycí list: šachta v závorce u sekce', kl && /\(Opláštění, Výtah B\)/.test(kl[1]) && /\(Režie, Výtah A\)/.test(kl[1]), kl);
  /* N1 (J. V. 24. 11. 2026): šachta s ks > 1 — cena za kus × kusy = celkem; 1 ks jen cena (BO i Tech, i ze zámku) */
  const n1 = t => /Jen u B, 1 ks, 1 200 Kč\/ks × 2 ks = 2 400 Kč \(Opláštění, Výtah B\)/.test(mezery(t))
    && /Doprava B, 1 ks, 600 Kč\/ks × 2 ks = 1 200 Kč \(Režie, Výtah B\)/.test(mezery(t))
    && /Doprava jeřábem, 1 kpl, 9 600 Kč \(Režie, Výtah A\)/.test(mezery(t)) && !/Výtah A\)[^;]*×/.test(mezery(t));
  const kt = kryciData(zak, v, J, 'techdata').sekce[0].radky.find(x => x[0] === 'Ruční položky v ceně');
  test('H N1 krycí list BO i Tech: ks > 1 „cena/ks × N ks = celkem“, 1 ks jen cena', kl && kt && n1(kl[1]) && n1(kt[1]), kl && kl[1]);
  const z2 = kop(zak); const v2 = z2.varianty[0];
  kryciZmrazPodminky(z2, v2, J);   // K70-I3: odeslání po opravě (značka rpTisk)
  v2.zamek = { zamceno: true, kdy: '2026-11-20T10:00:00.000Z', kdo: 'test@priklad.cz', cislo: z2.cislo,
    vysledek: kop(zamekVysledekSpocti(v2, J, 'test')), snimek: zamekSnimekSpocti(v2) };
  v2.data.ock.dalsi[0].zadani.vlastniPolozky.oplasteni[0].cena = 5000;   // podvrh po odeslání — KL ze zámku
  v2.data.ock.dalsi[0].ks = 7;   // dorevize D2: počet kusů po odeslání se nesmí propsat — ks ze zmrazeného výsledku
  const kz = kryciData(z2, v2, J, 'bo').sekce[0].radky.find(x => x[0] === 'Ruční položky v ceně');
  test('H N1 odeslaná nabídka: krycí list ze zámku i s kusy', kz && n1(kz[1]), kz && kz[1]);
}

/* ---------- I) nálezy revize Fable 24. 11. (S1, N2, N4, N5, N6, N10) ---------- */
{
  /* S1: šablona bez kotvy cílové sekce / bez řádku pro cenu → kontrola */
  const { zak, v } = zakazka({});
  const ctx = sym => ({ jazyk: 'cz', vysledek: vypocetZ(v, J), zadani: v.data.ock.zadani, ock: v.data.ock,
    sablonaNabidka: sym ? { nazev: 'CN', verze: 'x', symboly: sym } : null });
  const n = sym => kontrolyProved(ctx(sym)).nalezy.find(x => x.kod === 'rucniPolozkaWord');
  const v18 = ['TS_POZARNI', 'TS_NAPOJENI_DVERI', 'TS_SOKL', 'TS_STATIKA', 'CENA_MUSTKY_BEZ_DPH', 'CENA_SACHTA_BEZ_DPH'];
  test('I S1 pravidlo rucniPolozkaWord existuje', kontrolyPravidla().some(p => p.kod === 'rucniPolozkaWord'));
  test('I S1 šablona v18: nic', !n(v18), n(v18));
  test('I S1 šablona neznámá: nic', !n(null));
  const bez = n(['TS_POZARNI', 'TS_SOKL', 'TS_STATIKA', 'CENA_MUSTKY_BEZ_DPH']);
  test('I S1 šablona bez kotvy OPLÁŠTĚNÍ: varuje a jmenuje položku i sekci', bez && /Oplechování atiky/.test(bez.text) && /OPLÁŠTĚNÍ ŠACHTY/.test(bez.text)
    && !/Výztuha navíc/.test(bez.text), bez);
  const bc = n(['TS_POZARNI', 'TS_NAPOJENI_DVERI', 'TS_SOKL', 'TS_STATIKA']);
  test('I S1 šablona bez řádku pro cenu (ani CENA_MUSTKY_BEZ_DPH, ani CENA_BEZ_DPH): varuje', bc && /řádek ceny ruční položky/.test(bc.text), bc);
  const bz = zakazka({ rucni: false });
  test('I S1 bez ruční položky: nic', !kontrolyProved({ jazyk: 'cz', vysledek: vypocetZ(bz.v, J), zadani: bz.v.data.ock.zadani, ock: bz.v.data.ock,
    sablonaNabidka: { symboly: ['X'] } }).nalezy.some(x => x.kod === 'rucniPolozkaWord'));
}
{
  /* N2: ruční položka ve Spojovacím materiálu / Lakování (jen import) se vytiskne v KONSTRUKČNÍM ŘEŠENÍ */
  const { zak, v } = zakazka({ rucni: { spojovaci: [{ nazev: 'Kotvy navíc', mnozstvi: 10, cena: 100 }, { nazev: 'Trvalá', mnozstvi: 1, cena: 50, kid: 'k9' }],
    lakovani: [{ nazev: 'Lak navíc', mnozstvi: 2, cena: 500 }] } });
  const r = vypocetZ(v, J);
  const a = rucniPolozkyVysledku(r, v.data.ock.zadani);
  const sp = r.sekce.hrubaOck.find(x => x.origNazev === 'SPOJOVACÍ MATERIÁL');
  const k = a.find(x => x.nazev === 'Kotvy navíc'), l = a.find(x => x.nazev === 'Lak navíc');
  test('I N2 Spojovací a Lakování: ruční položka v KONSTRUKČNÍM ŘEŠENÍ, trvalá ne',
    a.length === 2 && k && l && k.sekceTs === 'KONSTRUKČNÍ ŘEŠENÍ ŠACHTY' && l.sekceTs === 'KONSTRUKČNÍ ŘEŠENÍ ŠACHTY' && k.mnozstvi === 10, a);
  test('I N2 cena s marží jejich řádku Hrubé OCK (1 000 × cena/náklad)', k && Math.abs(k.sMarzi - 1000 * sp.sMarzi / sp.naklad) < 1e-6, { k, sp: sp && [sp.naklad, sp.sMarzi] });
  const d = nabidkaData(zak, v, J, 'cz');
  const soucet = [d.placeholders.CENA_SACHTA_BEZ_DPH].concat(d.rucni.ceny.map(x => x.cena)).reduce((s0, t) => s0 + hal(cislo(t)), 0);
  test('I N2 rozpis ceny sedí na korunu', soucet === hal(cislo(d.placeholders.CENA_PRED_SLEVOU)) && d.rucni.ceny.length === 2, d.rucni.ceny);
}
{
  /* N4: šablona v15 (bez sekce MŮSTKY) — ruční Můstky až za naklonovanou sekcí MŮSTKY */
  const { zak, v } = zakazka({ mustky: true, rucni: { mustky: [{ nazev: 'Stříška nad můstkem', mnozstvi: 1, cena: 10000 }],
    volitelne: [{ nazev: 'Doplněk', mnozstvi: 1, cena: 1000 }] } });
  const w = nabidkaData(zak, v, J, 'cz', { symboly: new Set(['TS_MUSTKY', 'TS_SOKL', 'TS_PRECHODOVE_PLECHY', 'CENA_BEZ_DPH', 'CENA_PRED_SLEVOU']) }).tsRadkyNavic;
  const i = n0 => w.findIndex(x => x.nazev === n0);
  const iPruh = w.findIndex(x => x.pruh && x.nazev === 'MŮSTKY MEZI BUDOVOU A OCK');
  test('I N4 v15: Doplněk (Volitelné) před pruhem MŮSTKY, Stříška (Můstky) za řádky sekce MŮSTKY',
    iPruh >= 0 && i('DOPLNĚK') >= 0 && i('DOPLNĚK') < iPruh && i('STŘÍŠKA NAD MŮSTKEM') > iPruh
    && w.filter((x, j) => x.kotva === 'TS_SOKL' && j > i('STŘÍŠKA NAD MŮSTKEM')).length === 0, w.map(x => [x.nazev, x.kotva]));
}
{
  /* N5: zmrazený výsledek bez kid — trvalou položku pozná i podle zadání */
  const { v } = zakazka({ rucni: { volitelne: [{ nazev: 'Trvalá z ceníku', mnozstvi: 1, cena: 100, kid: 'k1' }, { nazev: 'Ruční', mnozstvi: 1, cena: 100 }] } });
  const r = kop(vypocetZ(v, J));
  Object.keys(r.sekce).forEach(s0 => (r.sekce[s0] || []).forEach(x => { delete x.kid; }));
  const a = rucniPolozkyVysledku(r, v.data.ock.zadani);
  test('I N5 výsledek bez kid: trvalá položka (kid v zadání) se netiskne', a.length === 1 && a[0].nazev === 'Ruční', a);
}
{
  /* N6: server — typ a délka nových polí */
  const ch = z => uloZaporneVZadani(z).map(x => x.kde + ':' + x.duvod);
  const pol = o => ({ vlastniPolozky: { volitelne: [Object.assign({ nazev: 'A', mnozstvi: 1, cena: 1 }, o)] } });
  test('I N6 platná položka s jednotkou, dodatkem a překladem projde',
    !ch(pol({ jednotka: 'm²', dodatek: 'x'.repeat(2000), jazyky: { en: { nazev: 'A', dodatek: 'B' } } })).length);
  const e = ch(pol({ jednotka: 'x'.repeat(11), dodatek: 'x'.repeat(2001), jazyky: { en: { nazev: 'y'.repeat(501) }, xx: {} } }));
  test('I N6 dlouhý dodatek / jednotka / překlad a neznámý jazyk se odmítnou', e.includes('ock.zadani.vlastniPolozky.volitelne[0].dodatek:delka')
    && e.includes('ock.zadani.vlastniPolozky.volitelne[0].jednotka:delka') && e.includes('ock.zadani.vlastniPolozky.volitelne[0].jazyky.en.nazev:delka')
    && e.includes('ock.zadani.vlastniPolozky.volitelne[0].jazyky.?:typ'), e);
  test('I N6 špatný typ (dodatek číslo, jazyky pole)', ch(pol({ dodatek: 5, jazyky: [] })).length === 2, ch(pol({ dodatek: 5, jazyky: [] })));
}

console.log(`\nVýsledek: ${ok} OK, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
