/* ===== P3 (K19-N105): RUČNÍ PŘEPIS PLOCHY SKLA A NAVAZUJÍCÍ ŘÁDKY =====
 * (nálezy 19. kola, 1. 10. 2026)
 *
 * V Excelu je PRÁCE OPLÁŠTĚNÍ součtem buněk ploch skel a TMELENÍ navazuje na
 * sklo — ruční úprava plochy skla posune i práci. V aplikaci se ruční přepis
 * množství uplatnil jen na řádku skla; PRÁCE a TMELENÍ se ve standardním
 * režimu dál braly z geometrie (K19T-C071: sklo boků přepsáno na 93,2 m²,
 * práce 213,8 m², Excel 120,6 m²).
 *
 * Hlídá se: bez přepisu beze změny (Model 1 i 2), přepis skla boků → PRÁCE
 * i TMELENÍ = přepsané sklo boků + čelní sklo, přepis čelního skla totéž,
 * přepis přímo na PRÁCI vyhrává, interiér (bez tmelení) jen PRÁCE, režim po
 * stěnách beze změny, značka pro Detail
 * výpočtu jen tam, kde přepis skla platí. Před opravou 31 OK / 22 FAIL
 * (PRÁCE/TMELENÍ z geometrie, chybějící značka), po opravě 53 OK / 0 FAIL.
 *
 * Sada nepoužívá skutečné sazby — pracuje se zkušebním ceníkem.
 */
const fs = require('fs');
const eng = require('./engine.js');
const ZC = require('./zkusebni_cenik.js');

let ok = 0, fail = 0;
const test = (n, cond, info) => {
  if (cond) { ok++; console.log('OK  ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info)); }
};

const JEKLY = JSON.parse(fs.readFileSync(__dirname + '/jekly.json', 'utf8'));
const zadani = (x) => Object.assign(JSON.parse(JSON.stringify(eng.DEFAULT_ZADANI)), x || {});
const cenik = () => ZC.zkusebniCenik();
const blizko = (a, b) => Math.abs(a - b) < 1e-9;

const spocti = (z, fixes) => eng.vypocet(z, cenik(), JEKLY, fixes !== false);
const radek = (r, nazev) => r.sekce.oplasteni.find(x => x.origNazev === nazev) || null;
const PRACE = 'PRÁCE OPLÁŠTĚNÍ', TMEL = 'TMELENÍ (MAT. + PRÁCE) (EXT)';

for (const [typ, fixes] of [['exteriérová', true], ['exteriérová', false], ['interiérová', true], ['interiérová', false]]) {
  const model = fixes ? 'Model 2' : 'Model 1';
  const pop = typ + ', ' + model;
  const z0 = zadani({ typSachty: typ });
  const r0 = spocti(z0, fixes);
  const sv = eng.skloVolba(z0, cenik());
  const boky0 = radek(r0, sv.boky.nazev), celni0 = radek(r0, sv.celni.nazev), prace0 = radek(r0, PRACE);
  const ext = typ === 'exteriérová';

  /* 1) bez přepisu beze změny */
  test(pop + ': bez přepisu PRÁCE = plocha skla z geometrie',
    !!prace0 && blizko(prace0.mnozstvi, r0.zaskleni.celkemM2),
    prace0 && [prace0.mnozstvi, boky0.mnozstvi, celni0.mnozstvi]);
  test(pop + ': bez přepisu řádek PRÁCE nenese značku přepisu skla', prace0 && prace0.zPrepisuSkla === undefined, prace0);
  test(pop + ': TMELENÍ jen u exteriéru', ext ? !!radek(r0, TMEL) : !radek(r0, TMEL));

  /* 2) přepis skla boků */
  const z1 = zadani({ typSachty: typ, mnozstviPrepis: { [sv.boky.nazev]: 93.2 } });
  const r1 = spocti(z1, fixes);
  const ocek1 = 93.2 + radek(r1, sv.celni.nazev).mnozstvi;
  test(pop + ': přepis skla boků se uplatní na řádku skla', blizko(radek(r1, sv.boky.nazev).mnozstvi, 93.2));
  test(pop + ': přepis skla boků → PRÁCE = přepsané sklo boků + čelní sklo',
    blizko(radek(r1, PRACE).mnozstvi, ocek1), [radek(r1, PRACE).mnozstvi, ocek1]);
  test(pop + ': … PRÁCE nese značku „z ručně přepsané plochy skla"', radek(r1, PRACE).zPrepisuSkla === true);
  if (ext) {
    test(pop + ': přepis skla boků → TMELENÍ = totéž', blizko(radek(r1, TMEL).mnozstvi, ocek1), radek(r1, TMEL).mnozstvi);
    test(pop + ': … TMELENÍ nese značku', radek(r1, TMEL).zPrepisuSkla === true);
  } else {
    test(pop + ': interiér: TMELENÍ nevzniká ani s přepisem', !radek(r1, TMEL));
  }
  /* příplatky VSG / SKN jdou od #392 taky z přepsané plochy skla —
   * podrobně hlídá src/test_vsg_skn_prepis.js */
  const pr = (r, k) => (r.priplatky || []).find(x => x.key === k);
  test(pop + ': příplatek VSG s mléčnou fólií z přepsané plochy (#392)',
    !pr(r0, 'vsgFolie') || blizko(pr(r1, 'vsgFolie').mnozstvi, radek(r1, PRACE).mnozstvi));

  /* 3) přepis čelního skla */
  const z2 = zadani({ typSachty: typ, mnozstviPrepis: { [sv.celni.nazev]: 4.5 } });
  const r2 = spocti(z2, fixes);
  test(pop + ': přepis čelního skla → PRÁCE = sklo boků + přepsané čelní',
    blizko(radek(r2, PRACE).mnozstvi, radek(r2, sv.boky.nazev).mnozstvi + 4.5));

  /* 4) přepis přímo na PRÁCI vyhrává */
  const z3 = zadani({ typSachty: typ, mnozstviPrepis: { [sv.boky.nazev]: 93.2, [PRACE]: 50 } });
  const r3 = spocti(z3, fixes);
  test(pop + ': ruční přepis na řádku PRÁCE má přednost', radek(r3, PRACE).mnozstvi === 50 && radek(r3, PRACE).zPrepisuSkla === undefined, radek(r3, PRACE));
  if (ext) test(pop + ': … TMELENÍ dál z přepsané plochy skla', blizko(radek(r3, TMEL).mnozstvi, 93.2 + radek(r3, sv.celni.nazev).mnozstvi));

  /* 5) prázdný přepis („prázdno není nula") nic nemění — v aplikaci platí prepisPlati */
  global.prepisPlati = (v) => v !== null && v !== undefined && v !== '' && isFinite(+v);
  const r4 = spocti(zadani({ typSachty: typ, mnozstviPrepis: { [sv.boky.nazev]: '' } }), fixes);
  test(pop + ': prázdný přepis skla PRÁCI nemění', blizko(radek(r4, PRACE).mnozstvi, prace0.mnozstvi) && radek(r4, PRACE).zPrepisuSkla === undefined);
  delete global.prepisPlati;

  /* 6) cena PRÁCE = plocha × sazba */
  test(pop + ': náklad PRÁCE = přepsaná plocha × sazba', blizko(radek(r1, PRACE).naklad, ocek1 * cenik().praceOplasteniKc));
}

/* 7) režim po stěnách beze změny: přepis řádku standardního skla se ho netýká */
{
  const z = zadani({ typSachty: 'exteriérová', oplasteni: { rezim: 'poStenach', steny: null } });
  const r0 = eng.vypocet(z, cenik(), JEKLY, true);
  if (r0.oplasteni && r0.oplasteni.rezim === 'poStenach') {
    const sv = eng.skloVolba(z, cenik());
    const z1 = JSON.parse(JSON.stringify(z)); z1.mnozstviPrepis = { [sv.boky.nazev]: 93.2 };
    const r1 = eng.vypocet(z1, cenik(), JEKLY, true);
    test('po stěnách: PRÁCE se řídí pásy, ne přepisem standardního skla',
      blizko(radek(r1, PRACE).mnozstvi, radek(r0, PRACE).mnozstvi) && radek(r1, PRACE).zPrepisuSkla === undefined);
  } else {
    test('po stěnách: režim se zapnul (pole oplasteni.rezim)', false, r0.oplasteni && r0.oplasteni.rezim);
  }
}

console.log(`\n${ok} OK, ${fail} FAIL`);
if (fail) process.exit(1);
