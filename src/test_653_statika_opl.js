/* STATIKA OPLÁŠTĚNÍ — ZAŠKRTÁVACÍ POLOŽKA S VLASTNÍ CENOU (#653,
 * zadání J. V. 18. 11. 2026; podnět obchodního technika: statické
 * posouzení opláštění nevyžadují všichni dodavatelé výtahů).
 *
 * Hlídá se:
 *   1. výchozí stav = dnešní cena (šachta s opláštěním má řádek, bez
 *      opláštění nemá); Z.statikaOpl false řádek vyřadí a základní náklad
 *      klesne PRÁVĚ o náklad toho řádku; true ho přidá i bez opláštění;
 *      každá šachta (zadání) zvlášť;
 *   2. vlastní sazba C.statikaOplKc: změna sazby statiky OCK nemění statiku
 *      opláštění a naopak; ceník bez klíče počítá sazbou statiky OCK;
 *   3. migrace: ceník bez klíče dostane statikaOplKc = statikaKc (import
 *      zakázky, migrace ceníku), existující hodnota (i nula) zůstane;
 *      cena uložené zakázky se importem nezmění;
 *   4. „cena z nabídky" u obou statik zvlášť, i NULOVÁ (prohlížeč i očista
 *      na serveru), záporná ne; přepočet proti ceníku bez klíče nehlásí
 *      změnu;
 *   5. server: Z.statikaOpl jen true / false;
 *   6. technická specifikace a krycí list se nemění (statika opláštění se
 *      počítá jako dosud).
 * Čísla jsou smyšlená (zkušební ceník + částky v testu).
 *
 * Revize poradce (18. 11.): N1 vymazaná buňka maže záznam, N2 migrace kopíruje
 * záznam ceny z nabídky na statiku opláštění, N4 volba „výchozí". Pojistka:
 * proti 3c42353 (před opravou) N1 2 FAIL, N2 2 FAIL, N4 chybí funkce.
 *
 * Pojistka proti prázdnému testu: proti integraci 910315b (před #653) sada
 * padá (chybí cenikMigraceStatikyOpl / statikaOplZahrnuta, řádek má cestu
 * C.statikaKc, nula z nabídky se odmítne).
 */
const nacti = f => { const m = require(f); Object.keys(m).forEach(k => { global[k] = m[k]; }); };
nacti('./format.js'); nacti('./cenik.js'); nacti('./cenik_stari.js'); nacti('./cenik_rady.js');
nacti('./engine.js'); nacti('./engine_proj.js'); nacti('./techspec.js'); nacti('./zamek.js');
nacti('./poznamky.js'); nacti('./zakazka.js'); nacti('./zobrazeni.js'); nacti('./sleva.js');
nacti('./schvalovani.js'); nacti('./kontroly.js'); nacti('./vyjimky.js'); nacti('./program.js');
nacti('./uloziste.js'); nacti('./rucni_ceny.js');
const U = require('./uloziste.js');
const ZC = require('./zkusebni_cenik.js');
const JEKLY = require('./jekly.json');
global.JEKLY = JEKLY;

let ok = 0, fail = 0;
const test = (n, cond, info) => {
  if (cond) { ok++; console.log('OK  ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info).slice(0, 400)); }
};
const kopie = x => JSON.parse(JSON.stringify(x));
const fn = (n) => typeof global[n] === 'function';
const OPL = 'STATICKÉ POSOUZENÍ OPLÁŠTĚNÍ', OCK = 'STATICKÉ POSOUZENÍ';

test('jádro má statikaOplZahrnuta, statikaOplSazba a cenikMigraceStatikyOpl',
  fn('statikaOplZahrnuta') && fn('statikaOplSazba') && fn('cenikMigraceStatikyOpl'));
if (!fn('statikaOplZahrnuta') || !fn('cenikMigraceStatikyOpl')) { console.log(`\n${ok} OK, ${fail} FAIL`); process.exit(1); }

const cenik = (x) => Object.assign(ZC.zkusebniCenik(), { statikaOplHod: 6, statikaKc: 1000 }, x || {});
const zadani = (x) => Object.assign(kopie(DEFAULT_ZADANI), x || {});
const radek = (r, n) => r.sekce.rezie.find(x => x.origNazev === n) || null;
const BEZ_OPL = (() => {
  const bez = { odM: 0, pasy: [{ typ: 'bez', doM: null }] };
  return { oplasteni: { rezim: 'poStenach', steny: { A: kopie(bez), B: kopie(bez), C: kopie(bez), D: kopie(bez) } },
    nadDvermi: 'stavba', bokyDveri: 'stavba', svetlikNadDvermi: false, svetlikyBoky: 0 };
})();

console.log('===== 1. zaškrtnutí =====');
for (const fixes of [true, false]) {
  const M = fixes ? 'Model 2' : 'Model 1';
  const c = cenik();
  const r0 = vypocet(zadani(), c, JEKLY, fixes);
  const rAno = vypocet(zadani({ statikaOpl: true }), c, JEKLY, fixes);
  const rNe = vypocet(zadani({ statikaOpl: false }), c, JEKLY, fixes);
  const o = radek(r0, OPL);
  test(M + ': výchozí stav u šachty s opláštěním = řádek je', !!o && r0.oplasteni.plochaCelkem > 0);
  test(M + ': zaškrtnuto výslovně = stejný výsledek jako výchozí stav', JSON.stringify(rAno) === JSON.stringify(r0));
  test(M + ': odškrtnuto = řádek není, statika OCK zůstala', !radek(rNe, OPL) && !!radek(rNe, OCK));
  test(M + ': odškrtnuto = základní náklad klesne právě o náklad řádku',
    !!o && Math.abs((r0.souhrn.zakladNaklad - rNe.souhrn.zakladNaklad) - o.naklad) < 1e-6 && o.naklad === 6000,
    [r0.souhrn.zakladNaklad, rNe.souhrn.zakladNaklad, o && o.naklad]);
  test(M + ': odškrtnuto = cena nabídky nižší', rNe.souhrn.zakladCena < r0.souhrn.zakladCena);
  const rB = vypocet(zadani(BEZ_OPL), c, JEKLY, fixes);
  const rBA = vypocet(zadani(Object.assign({ statikaOpl: true }, BEZ_OPL)), c, JEKLY, fixes);
  test(M + ': bez opláštění výchozí = řádek není (jako dosud)', rB.oplasteni.plochaCelkem === 0 && !radek(rB, OPL));
  test(M + ': bez opláštění zaškrtnuto = řádek je', !!radek(rBA, OPL));
  test(M + ': neplatná hodnota = výchozí stav', JSON.stringify(vypocet(zadani({ statikaOpl: 'ne' }), c, JEKLY, fixes)) === JSON.stringify(r0));
  test(M + ': ceník s 0 h = řádek nevznikne ani zaškrtnutý',
    !radek(vypocet(zadani({ statikaOpl: true }), cenik({ statikaOplHod: 0 }), JEKLY, fixes), OPL));
}
test('výchozí zadání klíč statikaOpl nenese (import ho nedoplní)', !('statikaOpl' in DEFAULT_ZADANI));

console.log('===== 2. vlastní sazba =====');
{
  const c = cenik({ statikaOplKc: 1000 });
  const r = vypocet(zadani(), c, JEKLY, true);
  test('řádek statiky opláštění má cestu C.statikaOplKc, statika OCK C.statikaKc',
    radek(r, OPL).cenaPath === 'C.statikaOplKc' && radek(r, OCK).cenaPath === 'C.statikaKc');
  const r1 = vypocet(zadani(), cenik({ statikaOplKc: 1000, statikaKc: 1500 }), JEKLY, true);
  test('změna sazby statiky OCK nemění statiku opláštění', radek(r1, OPL).cena === 1000 && radek(r1, OCK).cena === 1500);
  const r2 = vypocet(zadani(), cenik({ statikaOplKc: 700 }), JEKLY, true);
  test('změna sazby statiky opláštění nemění statiku OCK', radek(r2, OPL).cena === 700 && radek(r2, OCK).cena === 1000
    && radek(r2, OPL).naklad === 4200);
  const r3 = vypocet(zadani(), cenik({ statikaOplKc: 0 }), JEKLY, true);
  test('nulová sazba statiky opláštění platí (nula není „chybí")', radek(r3, OPL).cena === 0 && radek(r3, OPL).naklad === 0);
  const cBez = cenik(); delete cBez.statikaOplKc;
  test('ceník bez klíče = sazba statiky OCK (dosavadní cena)', radek(vypocet(zadani(), cBez, JEKLY, true), OPL).cena === 1000);
}

console.log('===== 3. migrace =====');
{
  const c = { statikaKc: 1234 }; cenikMigraceStatikyOpl(c);
  test('ceník bez klíče: statikaOplKc = statikaKc', c.statikaOplKc === 1234);
  const c0 = { statikaKc: 1234, statikaOplKc: 0 }; cenikMigraceLeseni(c0);
  test('existující hodnota (i nula) zůstane; volá ji i cenikMigraceLeseni', c0.statikaOplKc === 0);
  const cl = { statikaKc: 55 }; cenikMigraceLeseni(cl);
  test('cenikMigraceLeseni klíč doplní', cl.statikaOplKc === 55);
  /* uložená zakázka se starším ceníkem (bez klíče) */
  const z = novaZakazka(); z.cislo = '2026 - OPR - CN - 0645'; z.nazevAkce = 'TEST statika';
  const d = z.varianty[0].data;
  d.ock.zadani = zadani(); d.cenik = cenik({ statikaKc: 1500 }); delete d.cenik.statikaOplKc;
  const pred = vypocet(d.ock.zadani, d.cenik, JEKLY, d.ock.fixes);
  const zi = importZakazka(kopie(z)); const di = zi.varianty[0].data;
  test('import: klíč předvyplněn sazbou statiky varianty (ne nulou ze vzoru)', di.cenik.statikaOplKc === 1500, di.cenik.statikaOplKc);
  const po = vypocet(di.ock.zadani, di.cenik, JEKLY, di.ock.fixes);
  test('… zakázka má řádek statiky opláštění', !!radek(pred, OPL));
  test('import: cena zakázky beze změny', JSON.stringify(po.souhrn) === JSON.stringify(pred.souhrn), [po.souhrn, pred.souhrn]);
  /* přepočet proti ceníku bez klíče */
  const dn = { cenik: cenik({ statikaKc: 1500 }), proj: { cenik: kopie(di.proj.cenik) } }; delete dn.cenik.statikaOplKc;
  test('rozdíly ceníku: chybějící klíč v novém ceníku čte sazbu statiky (žádná „změna")',
    !cenikRozdily(di, dn).some(x => x.cesta === 'C.statikaOplKc'), cenikRozdily(di, dn));
  const dn2 = kopie(dn); dn2.cenik.statikaKc = 1600;
  test('… skutečná změna sazby se hlásí u obou statik', cenikRozdily(di, dn2).filter(x => /^C\.statika(Opl)?Kc$/.test(x.cesta)).length === 2);
}

console.log('===== 4. cena z nabídky u každé statiky zvlášť, i nulová =====');
{
  test('obě statiky smí mít cenu z nabídky', rucniCenaSmi('C.statikaKc') && rucniCenaSmi('C.statikaOplKc'));
  const z = novaZakazka(); z.cislo = '2026 - OPR - CN - 0646'; z.nazevAkce = 'TEST statika z nabídky';
  z.varianty[0].data.cenik = cenik({ statikaOplKc: 1000 }); z.varianty[0].data.ock.zadani = zadani();
  const zi = importZakazka(z); const d = zi.varianty[0].data;
  test('nulová cena z nabídky u statiky opláštění projde', rucniCenaNastav(d, 'C.statikaOplKc', 0) === true
    && d.cenik.statikaOplKc === 0 && rucniCenaPlati(d, 'C.statikaOplKc'));
  const r = vypocet(d.ock.zadani, d.cenik, JEKLY, d.ock.fixes);
  test('… řádek statiky opláštění 0 Kč, statika OCK beze změny', radek(r, OPL).naklad === 0 && radek(r, OCK).cena === 1000);
  test('… potvrdit nulovou cenu jde', rucniCenaPotvrd(d, 'C.statikaOplKc', 'Obch Test', '2026-11-18T10:00:00Z'));
  test('jiná cena z nabídky u statiky OCK nemění statiku opláštění', rucniCenaNastav(d, 'C.statikaKc', 1800)
    && radek(vypocet(d.ock.zadani, d.cenik, JEKLY, d.ock.fixes), OPL).cena === 0
    && radek(vypocet(d.ock.zadani, d.cenik, JEKLY, d.ock.fixes), OCK).cena === 1800);
  test('záporná ani prázdná cena nejde', !rucniCenaNastav(d, 'C.statikaKc', -1) && !rucniCenaNastav(d, 'C.statikaKc', '')
    && !rucniCenaNastav(d, 'C.statikaKc', '  ') && d.cenik.statikaKc === 1800);
  const o0 = rucniCenyOciste({ 'C.statikaOplKc': { hodnota: 0, dodavatel: 'Statik Příklad', cislo: '', datum: '', platnostDo: '' } });
  test('server: očista pustí nulu', o0.ok && o0.mapa['C.statikaOplKc'].hodnota === 0, o0);
  const oz = rucniCenyOciste({ 'C.statikaOplKc': { hodnota: -1 } });
  test('server: očista zápornou odmítne', !oz.ok && /nezáporné/.test(oz.chyba), oz);
  /* Vrácení na ceník vrátí sazbu z ceníku, ne nulu. */
  test('↺ vrátit na ceník vrátí sazbu', rucniCenaVrat(d, 'C.statikaOplKc', 1000) && d.cenik.statikaOplKc === 1000);
}

console.log('===== 4b. revize poradce N1, N2, N4 =====');
{
  /* N1: buňka ceny posílá +'' = 0 → záznam se smaže (jako před #653). */
  const mk = () => { const z = novaZakazka(); z.varianty[0].data.cenik = cenik({ statikaOplKc: 1000 });
    z.varianty[0].data.ock.zadani = zadani(); return importZakazka(z).varianty[0].data; };
  const d = mk(); rucniCenaNastav(d, 'C.statikaKc', 800);
  test('N1: vymazaná buňka ceny (0) záznam ceny z nabídky smaže', rucniCenaPoSet(d, 'C.statikaKc', 0) === true
    && !rucniCenaZaznam(d, 'C.statikaKc'));
  const d2 = mk(); rucniCenaNastav(d2, 'C.statikaKc', 800);
  test('N1: prázdná hodnota záznam smaže', rucniCenaPoSet(d2, 'C.statikaKc', '') === true && !rucniCenaZaznam(d2, 'C.statikaKc'));
  const d3 = mk(); rucniCenaNastav(d3, 'C.statikaKc', 800);
  test('N1: jiné kladné číslo záznam srovná a shodí potvrzení', rucniCenaPoSet(d3, 'C.statikaKc', 900) === true
    && rucniCenaZaznam(d3, 'C.statikaKc').hodnota === 900);
  /* N2: stará varianta s cenou z nabídky u statiky (dřív kryla obě). */
  const stara = (zamcena) => {
    const z = novaZakazka(); z.cislo = '2026 - OPR - CN - 0647'; z.nazevAkce = 'TEST N2';
    const d = z.varianty[0].data; d.ock.zadani = zadani();
    d.cenik = cenik({ statikaKc: 800 }); delete d.cenik.statikaOplKc;
    d.rucniCeny = { 'C.statikaKc': { hodnota: 800, dodavatel: 'Statik Příklad', cislo: 'N-1', datum: '2026-11-01', platnostDo: '',
      zaklad: 1000, potvrdil: { jmeno: 'Obch Test', email: 'obch@priklad.cz', kdy: '2026-11-02T08:00:00.000Z' } } };
    if (zamcena) z.varianty[0].zamek = { zamceno: true, typ: 'nabidka', kdy: '2026-11-02T09:00:00.000Z' };
    return importZakazka(z).varianty[0].data;
  };
  const n2 = stara(false);
  const rec = n2.rucniCeny && n2.rucniCeny['C.statikaOplKc'];
  test('N2: import zkopíruje záznam ceny z nabídky i na statiku opláštění (s potvrzením)', !!rec && rec.hodnota === 800
    && n2.cenik.statikaOplKc === 800 && rec.potvrdil && rec.potvrdil.jmeno === 'Obch Test' && rec.dodavatel === 'Statik Příklad', rec);
  test('N2: záznam kryje sazbu (B112 ji pustí)', rucniCenaPlati(n2, 'C.statikaOplKc'));
  test('N2: kopie je samostatná (změna jedné neovlivní druhou)', (rucniCenaNastav(n2, 'C.statikaOplKc', 500), n2.rucniCeny['C.statikaKc'].hodnota === 800));
  const n2z = stara(true);
  test('N2: zamčená varianta záznam nedostane (doklad), sazba ano', !(n2z.rucniCeny && n2z.rucniCeny['C.statikaOplKc']) && n2z.cenik.statikaOplKc === 800);
  const n2b = (() => { const z = novaZakazka(); const d = z.varianty[0].data; d.cenik = cenik({ statikaOplKc: 1000, statikaKc: 800 });
    d.rucniCeny = { 'C.statikaKc': { hodnota: 800, potvrdil: null } }; return importZakazka(z).varianty[0].data; })();
  test('N2: varianta, která klíč už má, záznam nedostane', !n2b.rucniCeny['C.statikaOplKc'] && n2b.cenik.statikaOplKc === 1000);
  /* N4: volba „výchozí" */
  const vol = (v, pl) => statikaOplVolby(v === undefined ? {} : { statikaOpl: v }, pl).filter(o => o.vybrano).map(o => o.hodnota + ':' + o.text);
  test('N4: bez volby je vybraná „výchozí (Ano)" u šachty s opláštěním', JSON.stringify(vol(undefined, 10)) === '[":výchozí (Ano)"]', vol(undefined, 10));
  test('N4: bez opláštění „výchozí (Ne)"', JSON.stringify(vol(null, 0)) === '[":výchozí (Ne)"]');
  test('N4: výslovné Ano / Ne', JSON.stringify(vol(true, 0)) === '["1:Ano"]' && JSON.stringify(vol(false, 10)) === '["0:Ne"]');
  test('N4: volby jsou tři (výchozí jde vždy vrátit)', statikaOplVolby({ statikaOpl: true }, 10).length === 3);
  const c = cenik();
  test('N4: null (výchozí) počítá jako bez volby', JSON.stringify(vypocet(zadani({ statikaOpl: null }), c, JEKLY, true))
    === JSON.stringify(vypocet(zadani(), c, JEKLY, true)));
  const src = require('fs').readFileSync(__dirname + '/ui/kalk_ock.js', 'utf8');
  test('N4: výběr v UI zapisuje null pro „výchozí"', /set\('Z\.statikaOpl', this\.value === '' \? null : this\.value === '1'\)/.test(src)
    && /statikaOplVolby\(Z, plocha\)/.test(src));
}

console.log('===== 5. server: tvar zaškrtnutí =====');
{
  const s1 = f => { const z = novaZakazka(); f(z.varianty[0].data.ock.zadani); return U.uloTypyProblemy(z); };
  test('true / false / null / chybí projde', !s1(z => { z.statikaOpl = true; }).length && !s1(z => { z.statikaOpl = false; }).length
    && !s1(z => { z.statikaOpl = null; }).length && !s1(() => {}).length);
  test('jiná hodnota = chyba tvaru', s1(z => { z.statikaOpl = 'ano'; }).some(p => /statikaOpl/.test(p.kde) && p.duvod === 'typ'));
}

console.log('===== 6. specifikace a krycí list beze změny =====');
{
  const c = cenik({ statikaOplKc: 1000 });
  const r = vypocet(zadani({ mnozstviPrepis: { [OCK]: 0 } }), c, JEKLY, true);
  test('specifikace: statika OCK 0 h + statika opláštění → „ano" jako dosud', tsStatikaVCene(r) === true);
  const rN = vypocet(zadani({ mnozstviPrepis: { [OCK]: 0 }, statikaOpl: false }), c, JEKLY, true);
  test('specifikace: obě vypnuté → „ne"', tsStatikaVCene(rN) === false);
  test('krycí list: hodiny statiky počítají obě cesty', KRYCI_HODINY_OCK_CESTY_OK());
}
function KRYCI_HODINY_OCK_CESTY_OK() {
  const src = require('fs').readFileSync(__dirname + '/kryci.js', 'utf8');
  return /popis: 'statické posouzení', cesty: \['C\.statikaKc', 'C\.statikaOplKc'\]/.test(src);
}

console.log(`\n${ok} OK, ${fail} FAIL`);
if (fail) process.exit(1);
