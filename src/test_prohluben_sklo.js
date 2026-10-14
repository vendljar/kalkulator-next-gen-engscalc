/* ===== P2 (K19-N104): ZKRATKA „PROSKLÍT I PROHLUBEŇ" =====
 * (nálezy 19. kola; rozhodnutí J. V. 2. 10. 2026 — výchozí návrh)
 *
 * Prosklená prohlubeň šla jen po stěnách a „Opláštění začíná" se psalo
 * u každé ze čtyř stěn zvlášť. Zkratka nastaví všem stěnám
 * odM = −prohlubeň (ze standardu přepne na po stěnách s výchozími typy
 * stěn). Stav se odvozuje z mezí, žádný příznak.
 *
 * Hlídá se: bez zaškrtnutí beze změny (výpočet standardu i Model 1);
 * zapnutí ze standardu → po stěnách, 4 stěny v −prohlubeň, plocha skla
 * vzroste o pás prohlubně (skutečnou šířkou stěn); vypnutí vrátí meze na 0;
 * ruční rozdělení stěn zůstává; změna hloubky posune meze, jen dokud zkratka
 * platí; ruční mez u jedné stěny zkratku zruší; nulová prohlubeň nic nedělá.
 * Před zavedením: sada neběží (funkce v jádře chybí).
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
const kopie = (o) => JSON.parse(JSON.stringify(o));
const zadani = (x) => Object.assign(kopie(eng.DEFAULT_ZADANI), x || {});
const C = ZC.zkusebniCenik();
const blizko = (a, b) => Math.abs(a - b) < 1e-9;
const STENY = ['A', 'B', 'C', 'D'];

test('jádro exportuje tři funkce zkratky',
  typeof eng.oplasteniProhlubenVse === 'function' && typeof eng.oplasteniProhlubenNastav === 'function'
  && typeof eng.oplasteniProhlubenSleduj === 'function');

for (const typ of ['exteriérová', 'interiérová']) {
  const z0 = zadani({ typSachty: typ, prohluben: 1.2 });
  test(typ + ': výchozí zadání — zkratka vypnutá', !eng.oplasteniProhlubenVse(z0));

  /* zapnutí ze standardu */
  const z1 = eng.oplasteniProhlubenNastav(kopie(z0), C, true);
  test(typ + ': zapnutí přepne na po stěnách', z1.oplasteni.rezim === 'poStenach');
  test(typ + ': všechny čtyři stěny začínají v −1,2 m', STENY.every(k => z1.oplasteni.steny[k].odM === -1.2), z1.oplasteni.steny);
  test(typ + ': stěny mají výchozí typ jako ve standardu',
    STENY.every(k => z1.oplasteni.steny[k].pasy.length === 1 && z1.oplasteni.steny[k].pasy[0].typ === eng.oplasteniVychoziTyp(z1, C, k)));
  test(typ + ': zkratka se odvodí jako zapnutá', eng.oplasteniProhlubenVse(z1));

  /* plocha: po stěnách s mezí 0 vs. s −prohlubeň — rozdíl = prohlubeň × obvod (skutečné šířky) */
  for (const fixes of [true, false]) {
    const zNula = eng.oplasteniProhlubenNastav(kopie(z0), C, true);
    STENY.forEach(k => { zNula.oplasteni.steny[k].odM = 0; });
    const rN = eng.vypocet(zNula, C, JEKLY, fixes), r1 = eng.vypocet(z1, C, JEKLY, fixes);
    const sir = r1.oplasteni.sirkySten;
    const ocek = 1.2 * (sir.A + sir.B + sir.C + sir.D);
    test(typ + (fixes ? ', Model 2' : ', Model 1') + ': plocha opláštění vzroste o pás prohlubně (1,2 m × obvod)',
      blizko(r1.oplasteni.plochaCelkem - rN.oplasteni.plochaCelkem, ocek), [r1.oplasteni.plochaCelkem, rN.oplasteni.plochaCelkem, ocek]);
    const rStd = eng.vypocet(z0, C, JEKLY, fixes);
    test(typ + (fixes ? ', Model 2' : ', Model 1') + ': bez zaškrtnutí výpočet standardu beze změny (zadání nedotčené)',
      z0.oplasteni.rezim === 'standard' && rStd.oplasteni.rezim === 'standard');
  }

  /* vypnutí */
  const z2 = eng.oplasteniProhlubenNastav(kopie(z1), C, false);
  test(typ + ': vypnutí vrátí meze všech stěn na 0', STENY.every(k => z2.oplasteni.steny[k].odM === 0));
  test(typ + ': vypnutí nechá režim po stěnách', z2.oplasteni.rezim === 'poStenach' && !eng.oplasteniProhlubenVse(z2));

  /* ruční rozdělení stěny se zapnutím nesmaže */
  const z3 = kopie(z1); z3.oplasteni.steny.B.pasy = [{ typ: 'C.cetrisKc', doM: 2 }, { typ: z3.oplasteni.steny.B.pasy[0].typ, doM: null }];
  const z3b = eng.oplasteniProhlubenNastav(kopie(z3), C, true);
  test(typ + ': zapnutí nad rozdělenou stěnou pásy zachová', z3b.oplasteni.steny.B.pasy.length === 2 && z3b.oplasteni.steny.B.pasy[0].typ === 'C.cetrisKc');

  /* změna hloubky prohlubně */
  const z4 = kopie(z1); z4.prohluben = 1.5;
  test(typ + ': změna hloubky posune meze, dokud zkratka platí',
    eng.oplasteniProhlubenSleduj(z4, 1.2) === true && STENY.every(k => z4.oplasteni.steny[k].odM === -1.5) && eng.oplasteniProhlubenVse(z4));
  const z5 = kopie(z1); z5.oplasteni.steny.C.odM = -0.5; z5.prohluben = 1.5;
  test(typ + ': ruční mez u jedné stěny — zkratka neplatí a změna hloubky na meze nesahá',
    !eng.oplasteniProhlubenVse(Object.assign({}, z5, { prohluben: 1.2 }))
    && eng.oplasteniProhlubenSleduj(z5, 1.2) === false && z5.oplasteni.steny.A.odM === -1.2 && z5.oplasteni.steny.C.odM === -0.5);
  const z6 = kopie(z0); z6.prohluben = 1.5;
  test(typ + ': ve standardu změna hloubky nic nemění', eng.oplasteniProhlubenSleduj(z6, 1.2) === false && z6.oplasteni.rezim === 'standard');
}

/* nulová prohlubeň */
{
  const z = eng.oplasteniProhlubenNastav(zadani({ prohluben: 0 }), C, true);
  test('nulová prohlubeň: meze 0 a zkratka se neodvodí jako zapnutá',
    STENY.every(k => z.oplasteni.steny[k].odM === 0) && !eng.oplasteniProhlubenVse(z));
}
/* starší zakázka bez objektu opláštění */
{
  const z = zadani({ prohluben: 1 }); delete z.oplasteni;
  test('zadání bez objektu opláštění — zkratka vypnutá, zapnutí ho založí',
    !eng.oplasteniProhlubenVse(z) && eng.oplasteniProhlubenVse(eng.oplasteniProhlubenNastav(z, C, true)));
}

/* ---- K23T-N1 (14. 10. 2026): zkratka P2 nad prohlubní projde uložením
 * i kontrolami; začátek opláštění pod dnem prohlubně je chyba s vlastní větou. */
{
  const ULO = require('./uloziste.js');
  const K = require('./kontroly.js');
  global.uloZaporneVZadani = ULO.uloZaporneVZadani;
  const zad = (hl) => {
    const z = JSON.parse(JSON.stringify(eng.DEFAULT_ZADANI));
    z.prohluben = hl;
    return z;
  };
  const C = ZC.zkusebniCenik();
  const p2 = eng.oplasteniProhlubenNastav(zad(1.2), C, true);
  const nalP2 = ULO.uloZaporneVZadani(p2, null);
  test('K23T-N1: zkratka P2 nad prohlubní 1,2 m nastaví odM = −1,2 všem stěnám',
    ['A', 'B', 'C', 'D'].every(k => p2.oplasteni.steny[k] && Math.abs(p2.oplasteni.steny[k].odM + 1.2) < 1e-9), p2.oplasteni.steny);
  test('K23T-N1: zkratka P2 nad prohlubní 1,2 m — uloZaporneVZadani prázdné', nalP2.length === 0, nalP2);
  const kody = K.kontrolyProved({ zadani: p2 }).kody;
  test('K23T-N1: kontroly — zakázka se zkratkou P2 nemá zapornaPolozka', kody.indexOf('zapornaPolozka') < 0, kody);
  const pod = JSON.parse(JSON.stringify(p2)); pod.oplasteni.steny.B.odM = -1.5;
  const nalPod = ULO.uloZaporneVZadani(pod, null);
  test('K23T-N1: odM −1,5 při prohlubni 1,2 m → chyba u stěny B (pod dnem prohlubně)',
    nalPod.length === 1 && nalPod[0].kde === 'ock.zadani.oplasteni.steny.B.odM' && nalPod[0].podProhlubni === true, nalPod);
  const kp = K.kontrolyProved({ zadani: pod }).nalezy.find(n => n.kod === 'zapornaPolozka');
  test('K23T-N1: kontrola — srozumitelná věta „Opláštění stěny B začíná níž, než je dno prohlubně"',
    !!kp && /Opláštění stěny B začíná níž, než je dno prohlubně/.test(kp.text) && !/sleva/.test(kp.text), kp && kp.text);
  const bez = JSON.parse(JSON.stringify(eng.DEFAULT_ZADANI)); bez.prohluben = 0;
  bez.oplasteni = { rezim: 'poStenach', steny: { A: { odM: -0.1, pasy: [] } } };
  const nalBez = ULO.uloZaporneVZadani(bez, null);
  test('K23T-N1: odM −0,1 bez prohlubně → chyba (záporné jako dosud)',
    nalBez.length === 1 && nalBez[0].kde === 'ock.zadani.oplasteni.steny.A.odM' && nalBez[0].duvod === 'zaporne', nalBez);
  const text = JSON.parse(JSON.stringify(p2)); text.oplasteni.steny.A.odM = '-1,2';
  test('K23T-N1: odM jako text s čárkou („-1,2", jádro čte NaN) → typ', ULO.uloZaporneVZadani(text, null).some(p => p.duvod === 'typ'));
  const doM = JSON.parse(JSON.stringify(p2)); doM.oplasteni.steny.C.pasy = [{ typ: 'bez', doM: -0.5 }];
  test('K23T-N1: záporné doM pásu je dál chyba', ULO.uloZaporneVZadani(doM, null).some(p => /pasy\[0\]\.doM/.test(p.kde)));
  test('K23T-N1: server hlásí opláštění pod prohlubní vlastní větou',
    /Opláštění stěny B začíná níž, než je dno prohlubně/.test(ULO.uloPodProhlubniText(nalPod)));
}

console.log(`\n${ok} OK, ${fail} FAIL`);
if (fail) process.exit(1);
