/* ===== P5 (K19-N109): STATICKÉ POSOUZENÍ VE DVOU ŘÁDCÍCH =====
 * (nálezy 19. kola; rozhodnutí J. V. 2. 10. 2026: „statiku udělej tak, jak
 * jsem navrhoval — ve dvou řádcích")
 *
 * Excel 2026 má dva řádky (statika OCK + statika opláštění), aplikace měla
 * jeden. Druhý řádek „STATICKÉ POSOUZENÍ OPLÁŠTĚNÍ" má vlastní hodiny
 * v ceníku (C.statikaOplHod) a sdílí sazbu C.statikaKc.
 *
 * Hlídá se: ceník bez položky (starší zveřejněný) i s nulou = seznam položek
 * beze změny (Model 1 i 2); s hodinami řádek vznikne a počítá sazbou
 * statiky; u šachty bez opláštění (po stěnách samé „bez") nevznikne;
 * ruční přepis hodin funguje jako u každé položky; kontrola
 * „statikaDvakrat" upozorní, když je přepsaná statika OCK a zároveň vzniká
 * řádek opláštění, jinak mlčí. Před zavedením 16 OK / 22 FAIL, po něm 38 OK / 0 FAIL.
 *
 * Sada nepoužívá skutečné sazby — pracuje se zkušebním ceníkem.
 */
const fs = require('fs');
const eng = require('./engine.js');
const ep = require('./engine_proj.js');
const sl = require('./sleva.js');
global.slevaPodil = sl.slevaPodil;
global.slevaVyhodnot = sl.slevaVyhodnot;
const zo = require('./zaokrouhleni.js');
global.cenaNabidkyOck = zo.cenaNabidkyOck;
global.cenaNabidkyProj = zo.cenaNabidkyProj;
const mz = require('./marze.js');
global.marzePrehled = mz.marzePrehled;
global.marzeText = mz.marzeText;
global.marzeKc = mz.marzeKc;
global.marzePct = mz.marzePct;
const uk = require('./ukazkove.js');
global.ukazkoveStav = uk.ukazkoveStav;
global.ukazkoveKratce = uk.ukazkoveKratce;
const zk = require('./zakazka.js');
global.hlavickaVyplneno = zk.hlavickaVyplneno;
const kt = require('./kontroly.js');
const ZC = require('./zkusebni_cenik.js');

let ok = 0, fail = 0;
const test = (n, cond, info) => {
  if (cond) { ok++; console.log('OK  ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info)); }
};

const JEKLY = JSON.parse(fs.readFileSync(__dirname + '/jekly.json', 'utf8'));
const kopie = (o) => JSON.parse(JSON.stringify(o));
const zadani = (x) => Object.assign(kopie(eng.DEFAULT_ZADANI), x || {});
const cenik = (x) => Object.assign(ZC.zkusebniCenik(), x || {});
const OPL = 'STATICKÉ POSOUZENÍ OPLÁŠTĚNÍ', OCK = 'STATICKÉ POSOUZENÍ';
const radek = (r, n) => r.sekce.rezie.find(x => x.origNazev === n) || null;
const nazvy = (r) => Object.keys(r.sekce).map(k => (r.sekce[k] || []).map(x => x.origNazev).join('|')).join('#');

for (const fixes of [true, false]) {
  const model = fixes ? 'Model 2' : 'Model 1';
  for (const typ of ['exteriérová', 'interiérová']) {
    const pop = typ + ', ' + model;
    const z = zadani({ typSachty: typ });
    /* 1) starší ceník bez klíče a ceník s nulou = beze změny */
    const cBez = cenik(); delete cBez.statikaOplHod;
    const rBez = eng.vypocet(z, cBez, JEKLY, fixes);
    const r0 = eng.vypocet(z, cenik({ statikaOplHod: 0 }), JEKLY, fixes);
    test(pop + ': ceník bez položky — řádek statiky opláštění nevznikne', !radek(rBez, OPL));
    test(pop + ': ceník s nulou — řádek nevznikne a položky i cena jsou shodné se starším ceníkem',
      !radek(r0, OPL) && nazvy(r0) === nazvy(rBez) && r0.souhrn.zakladCena === rBez.souhrn.zakladCena);

    /* 2) s hodinami řádek vznikne, sazbou statiky, hned za statikou OCK */
    const c6 = cenik({ statikaOplHod: 6 });
    const r6 = eng.vypocet(z, c6, JEKLY, fixes);
    const o = radek(r6, OPL);
    test(pop + ': 6 h v ceníku — řádek STATICKÉ POSOUZENÍ OPLÁŠTĚNÍ vznikne', !!o);
    test(pop + ': … 6 h × sazba statiky, cesta sazby C.statikaKc',
      !!o && o.mnozstvi === 6 && o.cena === c6.statikaKc && o.naklad === 6 * c6.statikaKc && o.cenaPath === 'C.statikaKc', o);
    const i = r6.sekce.rezie.findIndex(x => x.origNazev === OCK);
    test(pop + ': … stojí hned za statikou OCK', r6.sekce.rezie[i + 1] && r6.sekce.rezie[i + 1].origNazev === OPL);
    test(pop + ': … statika OCK beze změny', radek(r6, OCK).mnozstvi === c6.statikaHod);
    test(pop + ': … základní cena vzroste', r6.souhrn.zakladCena > r0.souhrn.zakladCena);

    /* 3) ruční přepis hodin řádku opláštění */
    const rP = eng.vypocet(zadani({ typSachty: typ, mnozstviPrepis: { [OPL]: 2 } }), c6, JEKLY, fixes);
    test(pop + ': ruční přepis hodin statiky opláštění platí', !!radek(rP, OPL) && radek(rP, OPL).mnozstvi === 2 && radek(rP, OPL).prepsano === true);
  }
}

/* 4) šachta bez opláštění (po stěnách samé „bez", světlíky u dveří zajistí
 * stavba) — řádek nevznikne */
{
  const bez = { odM: 0, pasy: [{ typ: 'bez', doM: null }] };
  const z = zadani({ typSachty: 'exteriérová', oplasteni: { rezim: 'poStenach', steny: { A: kopie(bez), B: kopie(bez), C: kopie(bez), D: kopie(bez) } },
    nadDvermi: 'stavba', bokyDveri: 'stavba', svetlikNadDvermi: false, svetlikyBoky: 0 });
  const r = eng.vypocet(z, cenik({ statikaOplHod: 6 }), JEKLY, true);
  test('bez opláštění (všechny stěny „bez") — plocha opláštění 0', r.oplasteni.plochaCelkem === 0, r.oplasteni.plochaCelkem);
  test('bez opláštění — řádek statiky opláštění nevznikne', !radek(r, OPL));
}

/* 5) kontrola dvojího započtení */
{
  const NAST = { slevy: { minMarze: mz.MARZE_MIN_VYCHOZI, maxGlobalni: 0.30, stropy: { 'Obchodník': 0.05 } } };
  const ctx = (z, c) => {
    const x = { zadani: z, cenik: c, cenikProj: ZC.zkusebniCenikProj(), projZadani: kopie(ep.DEFAULT_ZADANI_PROJ),
      sleva: sl.slevaDefault(), nast: NAST, zak: { cislo: '2026 - OPR - CN - 014', nazevAkce: 'Zkouška', objednatel: 'Zkouška s.r.o.' }, zaokr: null };
    x.vysledek = eng.vypocet(z, c, JEKLY, true);
    x.projVysledek = ep.vypocetProj(x.projZadani, x.cenikProj);
    return x;
  };
  const kody = (c) => kt.kontrolyProved(c).nalezy.map(n => n.kod);
  const zP = zadani({ mnozstviPrepis: { [OCK]: 14 } });
  test('kontrola: přepsaná statika OCK + řádek opláštění → upozorní', kody(ctx(zP, cenik({ statikaOplHod: 6 }))).includes('statikaDvakrat'));
  const n = kt.kontrolyProved(ctx(zP, cenik({ statikaOplHod: 6 }))).nalezy.find(x => x.kod === 'statikaDvakrat');
  test('kontrola: je to upozornění, ne zábrana', !!n && n.uroven !== kt.KONTROLY_UROVEN_ZABRANA, n);
  test('kontrola: přepsaná statika bez řádku opláštění (ceník 0) mlčí', !kody(ctx(zP, cenik({ statikaOplHod: 0 }))).includes('statikaDvakrat'));
  test('kontrola: řádek opláštění bez přepisu statiky mlčí', !kody(ctx(zadani(), cenik({ statikaOplHod: 6 }))).includes('statikaDvakrat'));
}

console.log(`\n${ok} OK, ${fail} FAIL`);
if (fail) process.exit(1);
