/* N58 a N58b (rozhodnutí J. V. 24. 9. 2026) — co je nad šachetními dveřmi
 * a vedle nich.
 *
 * Do 24. 9. byl světlík nad dveřmi zaškrtávátko a bez něj se pole nad
 * dveřmi (šířka stěny × (světlá výška − 2,3 m)) neocenilo vůbec. Teď volba
 * výplně: bez / sklo / plech / materiál opláštění / zajistí stavba; boční
 * pole totéž (bez „bez" — to je počet stran 0). Výchozí u nové zakázky plech.
 *
 * Hlídá se:
 *   – stará zakázka se převede beze změny ceny (zaškrtnuto = sklo, ne = bez)
 *     v obou modelech,
 *   – plech: plocha jako u světlíku, 8,5 kg/m² do plechů dveří, práce +1 ks
 *     na nástupiště, lakování obou stran, montáž jako u světlíku,
 *   – materiál opláštění ve standardu = sklo stěny, zajistí stavba = bez,
 *   – boční pole: plech/stavba bere plochu ze skla,
 *   – specifikace, kontrola před nabídkou, výchozí volba nové zakázky. */
const E = require('./engine.js');
const ZC = require('./zkusebni_cenik.js');
const J = require('./jekly.json');
const tsm = require('./techspec.js');
global.nadDvermiVypln = E.nadDvermiVypln; global.bokyVypln = E.bokyVypln;
const kop = x => JSON.parse(JSON.stringify(x));
let ok = 0, fail = 0;
const test = (n, c, info) => { if (c) { ok++; console.log('OK  ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info)); } };
const blizko = (a, b, tol) => Math.abs(a - b) <= (tol == null ? 1e-6 : tol);
const CENIK = Object.assign(kop(E.DEFAULT_CENIK), ZC.zkusebniCenik());

function spocti(extra, fixes = true, typ = 'interiérová') {
  const z = kop(E.DEFAULT_ZADANI);
  Object.assign(z, { typSachty: typ, profily: kop(E.PROFILY_VYCHOZI[typ]) });
  delete z.nadDvermi; delete z.bokyVypln;
  Object.assign(z, extra || {});
  return E.vypocet(z, kop(CENIK), J, fixes);
}
const polozka = (r, nazev) => {
  for (const k of Object.keys(r.sekce)) {
    const it = (r.sekce[k] || []).find(x => x.nazev === nazev || x.origNazev === nazev);
    if (it) return it;
  }
  return null;
};
const PL_MAT = 'PLECHY - OPLECH. DVEŘÍ A PODEST (MATERIÁL)', PL_PRACE = 'PLECHY - OPLECH. DVEŘÍ A PODEST (PRÁCE)';

/* 1) Převod staré zakázky — v obou modelech beze změny ceny. */
for (const fixes of [true, false]) {
  for (const typ of ['interiérová', 'exteriérová']) {
    const M = (fixes ? 'Model 2' : 'Model 1') + ', ' + typ;
    const stSklo = spocti({ svetlikNadDvermi: true }, fixes, typ), noSklo = spocti({ svetlikNadDvermi: true, nadDvermi: 'sklo' }, fixes, typ);
    test(M + ': zaškrtnutý světlík = sklo (cena i náklad)',
      stSklo.souhrn.zakladCena === noSklo.souhrn.zakladCena && stSklo.souhrn.zakladNaklad === noSklo.souhrn.zakladNaklad);
    const stBez = spocti({ svetlikNadDvermi: false }, fixes, typ), noBez = spocti({ svetlikNadDvermi: false, nadDvermi: 'bez' }, fixes, typ);
    test(M + ': nezaškrtnutý = bez', stBez.souhrn.zakladCena === noBez.souhrn.zakladCena
      && stBez.souhrn.zakladNaklad === noBez.souhrn.zakladNaklad);
    test(M + ': volba má přednost před starým zaškrtávátkem',
      spocti({ svetlikNadDvermi: true, nadDvermi: 'bez' }, fixes, typ).souhrn.zakladCena === stBez.souhrn.zakladCena);
    test(M + ': bez volby boků = sklo (jako dřív)',
      spocti({ svetlikyBoky: 2 }, fixes, typ).souhrn.zakladCena === spocti({ svetlikyBoky: 2, bokyVypln: 'sklo' }, fixes, typ).souhrn.zakladCena);
  }
}

/* 2) Plech nad dveřmi. */
{
  const bez = spocti({ nadDvermi: 'bez' }), plech = spocti({ nadDvermi: 'plech' }), sklo = spocti({ nadDvermi: 'sklo' });
  const n = bez.parametry.nastupist != null ? bez.parametry.nastupist : null;
  const nast = E.nastupisteCelkem(Object.assign(kop(E.DEFAULT_ZADANI), { typSachty: 'interiérová' }));
  const h = bez.odvozene.svetlaVyska - 2.3, sir = bez.zaskleni.rozmer.sir;
  const m2 = nast * sir * h;
  test('plech: plocha = nástupiště × šířka stěny × (světlá výška − 2,3)',
    blizko(plech.zaskleni.vypln.nadPlechM2, m2, 1e-9), { m2, v: plech.zaskleni.vypln });
  test('plech: sklo stěn jako „bez" (žádný světlík)',
    blizko(plech.zaskleni.steny.A, bez.zaskleni.steny.A, 1e-9) && plech.zaskleni.svetliky.m2 === 0);
  const kgBez = polozka(bez, PL_MAT).mnozstvi, kgPlech = polozka(plech, PL_MAT).mnozstvi;
  test('plech: +8,5 kg/m² v plechu dveří', blizko(kgPlech - kgBez, 8.5 * m2, 1e-6), { kgBez, kgPlech, m2 });
  test('plech: práce +1 ks na nástupiště', polozka(plech, PL_PRACE).mnozstvi === polozka(bez, PL_PRACE).mnozstvi + nast,
    [polozka(plech, PL_PRACE).mnozstvi, polozka(bez, PL_PRACE).mnozstvi]);
  test('plech: montáž jako u světlíku (bez odečtu 0,2 h)', plech.montaz.hodinyNavic.svetlik === sklo.montaz.hodinyNavic.svetlik
    && plech.montaz.hodinyNavic.svetlik === 0, [plech.montaz.hodinyNavic.svetlik, bez.montaz.hodinyNavic.svetlik]);
  /* Lakování plechu obou stran: rozdíl = 2 × plocha × sazba plechu (Tomáš i lakovna). */
  test('plech: lakování obou stran (Tomáš)', blizko(plech.lakovani.tomas - bez.lakovani.tomas, 2 * m2 * CENIK.lak.tomasOplechM2, 1e-6),
    [plech.lakovani.tomas, bez.lakovani.tomas]);
  test('plech: lakování obou stran (lakovna)', blizko(plech.lakovani.lakovna - bez.lakovani.lakovna, 2 * m2 * CENIK.lak.lakovnaM2, 1e-6));
  test('plech: cena vyšší než „bez"', plech.souhrn.zakladCena > bez.souhrn.zakladCena);
  /* Nízké podlaží: záporná výška se ořízne (v obou modelech). */
  for (const fixes of [true, false]) {
    const nizke = spocti({ nadDvermi: 'plech', zdvih: 4, nastupiste: 4 }, fixes);
    test('plech, podlaží pod 2,5 m (' + (fixes ? 'M2' : 'M1') + '): plocha 0, ne záporná', nizke.zaskleni.vypln.nadPlechM2 === 0,
      nizke.zaskleni.vypln.nadPlechM2);
  }
}

/* 3) Materiál opláštění a zajistí stavba. */
{
  test('materiál opláštění ve standardu = sklo', spocti({ nadDvermi: 'material' }).souhrn.zakladCena === spocti({ nadDvermi: 'sklo' }).souhrn.zakladCena);
  const st = spocti({ nadDvermi: 'stavba' }), bez = spocti({ nadDvermi: 'bez' });
  test('zajistí stavba = 0 Kč (jako bez)', st.souhrn.zakladCena === bez.souhrn.zakladCena);
}

/* 4) Průchozí šachta: plech nad dveřmi na A i C. */
{
  const x = { pruchoziSachta: true, nastupisteA: 3, nastupisteC: 2, patra: 3 };
  const r = spocti(Object.assign({ nadDvermi: 'plech' }, x));
  const h = r.odvozene.svetlaVyska - 2.3;
  test('průchozí: plech nad všemi dveřmi (A + C)', blizko(r.zaskleni.vypln.nadPlechM2, 5 * r.zaskleni.rozmer.sir * Math.max(h, 0), 1e-9),
    r.zaskleni.vypln);
}

/* 5) Boční pole. */
{
  const sklo = spocti({ svetlikyBoky: 2, bokyVypln: 'sklo' }), plech = spocti({ svetlikyBoky: 2, bokyVypln: 'plech' });
  const stavba = spocti({ svetlikyBoky: 2, bokyVypln: 'stavba' }), bez = spocti({ svetlikyBoky: 0 });
  const bokM2 = sklo.zaskleni.svetlikyBoky.m2;
  test('boky plech: sklo stěny bez bočních světlíků', blizko(plech.zaskleni.steny.A, sklo.zaskleni.steny.A - bokM2, 1e-9));
  test('boky plech: plocha plechu = plocha bočních světlíků', blizko(plech.zaskleni.vypln.bokyPlechM2, bokM2, 1e-9));
  test('boky plech: +8,5 kg/m² v plechu dveří',
    blizko(polozka(plech, PL_MAT).mnozstvi - polozka(sklo, PL_MAT).mnozstvi, 8.5 * bokM2, 1e-6));
  test('boky zajistí stavba: ani sklo, ani plech', stavba.zaskleni.svetlikyBoky.m2 === 0 && stavba.zaskleni.vypln.bokyPlechM2 === 0);
  test('boky zajistí stavba: portálové sloupky zůstávají (pole je orámované)',
    stavba.souhrn.zakladNaklad > bez.souhrn.zakladNaklad);
  test('boky materiál ve standardu = sklo', spocti({ svetlikyBoky: 2, bokyVypln: 'material' }).souhrn.zakladCena === sklo.souhrn.zakladCena);
}

/* 6) Specifikace. */
{
  const pole = id => { let p = null; tsm.TECHSPEC_DEF.forEach(s => s.pole.forEach(x => { if (x.id === id) p = x; })); return p; };
  const pc = pole('portalyCleneni'), on = pole('oplasteniNadsvetliku');
  const Z = x => Object.assign(kop(E.DEFAULT_ZADANI), { svetlikNadDvermi: false, svetlikyBoky: 0 }, x);
  const t = x => pc.prefill(null, Z(x), {}, 'cz');
  test('spec: sklo nad = „světlík nade dveřmi"', t({ nadDvermi: 'sklo' }) === 'světlík nade dveřmi');
  test('spec: stará zakázka se světlíkem a boky 2 = dosavadní znění',
    t({ svetlikNadDvermi: true, svetlikyBoky: 2 }) === 'světlík nade dveřmi a na obou stranách š. dveří');
  test('spec: plech nad', t({ nadDvermi: 'plech' }) === 'plechové nadpraží nade dveřmi', t({ nadDvermi: 'plech' }));
  test('spec: zajistí stavba', t({ nadDvermi: 'stavba' }) === 'nadpraží nade dveřmi zajistí objednatel');
  test('spec: bez = „bez světlíků"', t({ nadDvermi: 'bez' }) === 'bez světlíků');
  test('spec: plech nad + plech boky na jedné straně',
    t({ nadDvermi: 'plech', svetlikyBoky: 1, bokyVypln: 'plech' }) === 'plechové nadpraží nade dveřmi, plechová výplň na jedné straně dveří',
    t({ nadDvermi: 'plech', svetlikyBoky: 1, bokyVypln: 'plech' }));
  const pr = require('./preklad.js'); global.tr = pr.tr;
  const en = pc.prefill(null, Z({ nadDvermi: 'plech', svetlikyBoky: 2, bokyVypln: 'sklo' }), {}, 'en');
  test('spec EN: složená věta přeložená po částech', en === 'Sheet-metal panel above the door, Transom light on both sides of the landing door', en);
  delete global.tr;
  test('spec: opláštění nadsvětlíků u plechu = lakovaný ocelový plech', on.prefill(null, Z({ nadDvermi: 'plech' })) === 'lakovaný ocelový plech');
  test('spec: opláštění nadsvětlíků bez výplně = „ -"', on.prefill(null, Z({ nadDvermi: 'stavba' })) === ' -');
}

/* 7) Kontrola před nabídkou. */
{
  const sl = require('./sleva.js'); global.slevaPodil = sl.slevaPodil;
  const kt = require('./kontroly.js');
  const nal = x => { const z = Object.assign(kop(E.DEFAULT_ZADANI), x);
    return kt.kontrolyProved({ zadani: z, vysledek: E.vypocet(z, kop(CENIK), J, true) }).nalezy.find(n => n.kod === 'nadDvermiBez'); };
  const n = nal({ nadDvermi: 'bez' });
  test('kontrola: „bez" nad dveřmi upozorní na otvor s výškou', !!n && /otvor vysoký 0,9[67] m/.test(n.text), n && n.text);
  test('kontrola: zajistí stavba mlčí', !nal({ nadDvermi: 'stavba' }));
  test('kontrola: plech mlčí', !nal({ nadDvermi: 'plech' }));
}

/* 8) Nová zakázka má plech. */
{
  global.vypocet = E.vypocet; global.DEFAULT_ZADANI = E.DEFAULT_ZADANI; global.DEFAULT_CENIK = CENIK;
  const ep = require('./engine_proj.js');
  global.DEFAULT_ZADANI_PROJ = ep.DEFAULT_ZADANI_PROJ; global.DEFAULT_CENIK_PROJ = ZC.zkusebniCenikProj();
  global.TECHSPEC_DEF = tsm.TECHSPEC_DEF; global.tsHodnota = tsm.tsHodnota; global.DEFAULT_TECHSPEC = tsm.DEFAULT_TECHSPEC;
  const zk = require('./zakazka.js');
  const z = zk.novaZakazka().varianty[0].data.ock.zadani;
  test('nová zakázka: nad dveřmi plech', E.nadDvermiVypln(z) === 'plech', z.nadDvermi);
}

console.log(`\n${ok} prošlo, ${fail} selhalo`);
process.exit(fail ? 1 : 0);
