/* Můstky podle rozměru (#354, M6 — schváleno J. V. 26. 10. 2026).
 *
 * Do 26. 10. byl můstek paušál `C.mustekKc` Kč/ks včetně montáže. Nově:
 *   – šířka můstku = šířka šachty (pole `mustekSirkaMm` se nezadává),
 *     délka = `mustekHloubkaMm` (prázdná → 1 000 mm a kontrola „Doplňte"),
 *   – materiál = délka_m × C.mustekKc × (šířka_mm / C.mustekRefSirkaMm),
 *   – hodiny = max(min, základ + za bm × délka_m), montáž = hodiny × sazba,
 *   – dva řádky kalkulace (materiál, montáž), nabídka jeden řádek Š × D.
 * HISTORIE (podmínka J. V.): starý ceník (bez kladné referenční šířky —
 * zamčená varianta, ceník zveřejněný před #354) počítá dál paušál × počet,
 * ceny odeslaných nabídek se nemění ani o korunu. Hlídá se i proti jádru
 * před změnou (git 9484ef4), je-li historie po ruce.
 * Spuštění: node src/test_354_mustky.js */
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');
const nacti = (f) => { const m = require(f); Object.keys(m).forEach(k => { if (global[k] === undefined) global[k] = m[k]; }); return m; };
const ZC = require('./zkusebni_cenik.js');
nacti('./format.js');
const PR = nacti('./preklad.js');
const E = nacti('./engine.js');
global.DEFAULT_CENIK = ZC.zkusebniCenik();
nacti('./engine_proj.js');
global.DEFAULT_CENIK_PROJ = ZC.zkusebniCenikProj();
const TS = nacti('./techspec.js');
nacti('./sleva.js');
nacti('./zaokrouhleni.js');
nacti('./firma.js');
const zk = nacti('./zakazka.js');
const K = require('./kontroly.js');
const S = require('./standard_ock.js');
const J = require('./jekly.json');

const kop = x => JSON.parse(JSON.stringify(x));
let ok = 0, fail = 0;
const test = (n, c, info) => { if (c) { ok++; console.log('OK  ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info)); } };
const blizko = (a, b) => Math.abs(a - b) < 1e-6;

const V = E.MUSTKY_CENIK_VYCHOZI || {};
const STARY = kop(Object.assign(kop(E.DEFAULT_CENIK), ZC.zkusebniCenik()));   // paušál 40 000 Kč/ks (smyšlený)
const NOVY = Object.assign(kop(STARY), V);
const MAT = 'MŮSTKY VČ. ZÁBRADLÍ – MATERIÁL', MONT = 'MONTÁŽ MŮSTKŮ', PAUSAL = 'MŮSTKY MEZI BUDOVOU A OCK';
const zadani = (x, typ = 'exteriérová') => Object.assign(kop(E.DEFAULT_ZADANI),
  { typSachty: typ, profily: kop(E.PROFILY_VYCHOZI[typ]), sirka: 1.6 }, x || {});
const spocti = (x, c, fixes = true) => E.vypocet(zadani(x), kop(c), J, fixes);
const radek = (r, n) => (r.sekce.hrubaOck || []).find(i => i.origNazev === n);
const mustkyKc = r => (r.sekce.hrubaOck || []).filter(i => [MAT, MONT, PAUSAL].includes(i.origNazev))
  .reduce((s, i) => s + i.naklad, 0);

/* --- ceník: výchozí hodnoty schváleného návrhu --- */
test('výchozí hodnoty nových buněk (28 600 / 1 600 / 400 / 8 / 8 / 16)',
  V.mustekKc === 28600 && V.mustekRefSirkaMm === 1600 && V.mustekMontazHodKc === 400
  && V.mustekMontazZakladHod === 8 && V.mustekMontazBmHod === 8 && V.mustekMontazMinHod === 16, V);
test('DEFAULT_CENIK nese nové klíče nulou (vynulovaný ceník = starý tvar)',
  ['mustekRefSirkaMm', 'mustekMontazHodKc', 'mustekMontazZakladHod', 'mustekMontazBmHod', 'mustekMontazMinHod']
    .every(k => E.DEFAULT_CENIK[k] === 0));
test('rozpoznání tvaru ceníku: kladná referenční šířka = nový', typeof E.mustkyCenikNovy === 'function'
  && E.mustkyCenikNovy(NOVY) && !E.mustkyCenikNovy(STARY) && !E.mustkyCenikNovy({ mustekRefSirkaMm: 0 })
  && !E.mustkyCenikNovy({ mustekRefSirkaMm: 'x' }) && !E.mustkyCenikNovy(null));
{
  const def = require('./cenik.js').CENIK_DEF;
  const hruba = (def.find(([g]) => g === 'HRUBÁ OCK') || [null, []])[1];
  const cesty = hruba.map(r => r[0]);
  const m = hruba.find(r => r[0] === 'C.mustekKc') || [];
  test('ceník HRUBÁ OCK: C.mustekKc = materiál vč. zábradlí, Kč/bm při ref. šířce',
    /vč\. zábradlí – materiál/.test(m[1]) && m[2] === 'Kč/bm délky při ref. šířce' && /bez montáže/.test(m[3]), m);
  test('ceník HRUBÁ OCK: pět nových buněk hned za materiálem',
    ['C.mustekRefSirkaMm', 'C.mustekMontazHodKc', 'C.mustekMontazZakladHod', 'C.mustekMontazBmHod', 'C.mustekMontazMinHod']
      .every((k, i) => cesty.indexOf(k) === cesty.indexOf('C.mustekKc') + 1 + i), cesty);
}

/* --- vzorec a příklady návrhu (šířka 1,6 m, 1 ks) --- */
for (const [delka, cekam] of [[600, 23560], [1000, 35000], [1500, 50900], [2000, 66800], [3000, 98600]]) {
  const r = spocti({ mustkyKs: 1, mustekHloubkaMm: delka }, NOVY);
  test('příklad ' + (delka / 1000).toLocaleString('cs-CZ') + ' m = ' + cekam + ' Kč (náklad)', blizko(mustkyKc(r), cekam), mustkyKc(r));
}
{
  const r = spocti({ mustkyKs: 1, mustekHloubkaMm: 600 }, NOVY);
  test('minimum 16 h: 0,6 m → 8 + 4,8 = 12,8 h → 16 h', radek(r, MONT) && blizko(radek(r, MONT).mnozstvi, 16), radek(r, MONT));
  const r2 = spocti({ mustkyKs: 1, mustekHloubkaMm: 2000 }, NOVY);
  test('nad minimem: 2 m → 8 + 16 = 24 h', radek(r2, MONT) && blizko(radek(r2, MONT).mnozstvi, 24));
  test('dva řádky: materiál (C.mustekKc) a montáž (C.mustekMontazHodKc), paušál není',
    radek(r, MAT) && radek(r, MAT).cenaPath === 'C.mustekKc' && radek(r, MAT).cena === 28600
    && radek(r, MONT).cenaPath === 'C.mustekMontazHodKc' && radek(r, MONT).cena === 400 && !radek(r, PAUSAL));
  const tri = spocti({ mustkyKs: 3, mustekHloubkaMm: 1500 }, NOVY);
  test('× počet můstků: 3 × 50 900', blizko(mustkyKc(tri), 3 * 50900), mustkyKc(tri));
  const sir = spocti({ mustkyKs: 1, mustekHloubkaMm: 1000, sirka: 2.4 }, NOVY);
  test('materiál úměrně šířce šachty: 2,4 m = 1,5× materiál, montáž stejná',
    blizko(radek(sir, MAT).naklad, 1.5 * 28600) && blizko(radek(sir, MONT).naklad, 16 * 400), [radek(sir, MAT).naklad, radek(sir, MONT).naklad]);
  const stare = spocti({ mustkyKs: 1, mustekHloubkaMm: 1000, mustekSirkaMm: 900 }, NOVY);
  test('staré pole mustekSirkaMm se ignoruje (šířka = šachta)', blizko(mustkyKc(stare), 35000), mustkyKc(stare));
  for (const prazdna of ['', null, undefined, 'abc', 0, -5]) {
    const x = spocti({ mustkyKs: 1, mustekHloubkaMm: prazdna }, NOVY);
    test('neplatná/prázdná délka ' + JSON.stringify(prazdna) + ' → počítá se 1 000 mm', blizko(mustkyKc(x), 35000), mustkyKc(x));
  }
  const m1 = spocti({ mustkyKs: 1, mustekHloubkaMm: 1500 }, NOVY, false);
  test('Model 1 počítá můstky stejně', blizko(mustkyKc(m1), 50900), mustkyKc(m1));
  test('rozpad ve výsledku (r.mustky) pro specifikaci', r.mustky && r.mustky.novy && r.mustky.sirkaMm === 1600
    && r.mustky.delkaMm === 600 && r.mustky.ks === 1, r.mustky);
  const bez = spocti({}, NOVY), bezS = spocti({}, STARY);
  test('bez můstků: žádný řádek a stejná cena se starým i novým ceníkem',
    !radek(bez, MAT) && !radek(bez, MONT) && bez.souhrn.zakladCena === bezS.souhrn.zakladCena);
  const sMarzi = spocti({ mustkyKs: 1, mustekHloubkaMm: 1000 }, NOVY);
  test('cena nabídky = náklad + přirážka (základ vzroste o 35 000 × (1 + přirážka))',
    Math.abs(sMarzi.souhrn.zakladCena - bez.souhrn.zakladCena - 35000 * (1 + NOVY.marze)) <= 1000 + 1e-6,
    [sMarzi.souhrn.zakladCena, bez.souhrn.zakladCena]);
}

/* --- střecha přes nejvyšší můstek ze šířky šachty --- */
{
  const r = spocti({ mustkyKs: 4, nastupiste: 5, mustekHloubkaMm: 900 }, NOVY);
  test('zastřešení můstku: (šířka šachty + 0,2) × délka', r.strecha.mustekNahore && blizko(r.strecha.mustekM2, (1.6 + 0.2) * 0.9), r.strecha);
  const r2 = spocti({ mustkyKs: 4, nastupiste: 5 }, NOVY);
  test('zastřešení můstku bez délky: 1 000 mm, kontrola střechy mlčí', blizko(r2.strecha.mustekM2, 1.8)
    && !K.kontrolyProved({ zadani: zadani({ mustkyKs: 4, nastupiste: 5 }), vysledek: r2, cenik: NOVY }).nalezy.some(n => n.kod === 'mustekStrecha'));
}

/* --- STARÝ CENÍK = CENA PŘESNĚ JAKO PŘED ZMĚNOU --- */
/* Uložená (odeslaná, zamčená) zakázka z testovacích dat: fixtura 23. 9. 2026
 * s paušálem — můstky se do ní doplní tak, jak je tehdy ukládal klient
 * (počet, hloubka a šířka), ceník je zkušební paušál 40 000 Kč/ks. Projde
 * importem jako v prohlížeči (cenikDoplnKlice doplní nové buňky NULOU). */
const FIX = path.join(__dirname, 'fixtury', 'zakazka_2026-09-23_odemcena_znovu_odeslana.json');
const ulozena = () => {
  const zak = JSON.parse(fs.readFileSync(FIX, 'utf8'));
  zak.varianty.forEach(v => {
    Object.assign(v.data.ock.zadani, { mustkyKs: 4, mustekHloubkaMm: 900, mustekSirkaMm: 1300 });
    v.data.cenik.mustekKc = 40000;
  });
  return zk.importZakazka(zak);
};
/* Hodnoty z jádra PŘED #354 (9484ef4) nad stejnou zakázkou. */
const ZAKLAD_PRED = 990000;
const PRED = { zaklad: null };
{
  const zak = ulozena();
  const v = zak.varianty[0];
  test('fixtura: varianta je zamčená (odeslaná)', !!(v.zamek && v.zamek.zamceno));
  test('uložený ceník bez nových buněk → starý tvar ceníku', !E.mustkyCenikNovy(v.data.cenik), v.data.cenik.mustekRefSirkaMm);
  const doplneny = kop(v.data.cenik); E.cenikDoplnKlice(doplneny, E.DEFAULT_CENIK);
  test('doplnění klíčů ze sestavení (nula) → pořád starý tvar', doplneny.mustekRefSirkaMm === 0 && !E.mustkyCenikNovy(doplneny)
    && JSON.stringify(E.vypocet(kop(v.data.ock.zadani), doplneny, J, true).souhrn)
       === JSON.stringify(E.vypocet(kop(v.data.ock.zadani), kop(v.data.cenik), J, true).souhrn));
  const r = E.vypocet(v.data.ock.zadani, v.data.cenik, J, true);
  test('starý ceník: jeden řádek paušál × počet (4 × 40 000)', radek(r, PAUSAL) && radek(r, PAUSAL).mnozstvi === 4
    && blizko(radek(r, PAUSAL).naklad, 160000) && !radek(r, MAT) && !radek(r, MONT));
  test('starý ceník: střecha nad můstkem ze starého pole šířky (1,3 + 0,2) × 0,9',
    blizko(r.strecha.mustekM2, 1.5 * 0.9), r.strecha.mustekM2);
  PRED.zaklad = r.souhrn.zakladCena; PRED.vysledek = r;
  /* Pojistka proti jádru před změnou (je-li v repozitáři historie). */
  let stary = null;
  try {
    const kod = execFileSync('git', ['show', '9484ef4:src/engine.js'], { cwd: path.join(__dirname, '..'), stdio: ['ignore', 'pipe', 'ignore'] }).toString();
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kng354-'));
    fs.writeFileSync(path.join(dir, 'engine.js'), kod);
    stary = require(path.join(dir, 'engine.js'));
  } catch (e) { stary = null; }
  if (stary) {
    const zakS = ulozena();
    let shoda = true, info = null;
    zakS.varianty.forEach((vs, i) => {
      for (const fixes of [true, false]) {
        const a = stary.vypocet(kop(vs.data.ock.zadani), kop(vs.data.cenik), J, fixes);
        const b = E.vypocet(kop(vs.data.ock.zadani), kop(vs.data.cenik), J, fixes);
        const ca = JSON.stringify([a.souhrn, a.sekce, a.priplatky]);
        const cb = JSON.stringify([b.souhrn, b.sekce, b.priplatky]);
        if (ca !== cb) { shoda = false; info = info || { varianta: i, fixes, a: a.souhrn.zakladCena, b: b.souhrn.zakladCena }; }
      }
    });
    test('starý ceník: souhrn, sekce i příplatky bajt po bajtu jako jádro před #354 (obě varianty, oba modely)', shoda, info);
    const a = stary.vypocet(zadani({ mustkyKs: 2, mustekHloubkaMm: 700, mustekSirkaMm: 1500, nastupiste: 3 }), kop(STARY), J, true);
    const b = E.vypocet(zadani({ mustkyKs: 2, mustekHloubkaMm: 700, mustekSirkaMm: 1500, nastupiste: 3 }), kop(STARY), J, true);
    test('starý ceník: nová zakázka do zveřejnění ceníku = jako dřív (střecha i cena)',
      JSON.stringify([a.souhrn, a.sekce]) === JSON.stringify([b.souhrn, b.sekce]) && blizko(a.strecha.mustekM2, b.strecha.mustekM2));
  } else console.log('INFO jádro před #354 (git 9484ef4) není po ruce — srovnání bajt po bajtu přeskočeno');
  /* Pevné číslo (platí i bez gitu): zakladCena zamčené varianty před #354. */
  test('starý ceník: základní cena zamčené varianty = ' + ZAKLAD_PRED + ' Kč (spočteno jádrem před #354)',
    PRED.zaklad === ZAKLAD_PRED, PRED.zaklad);
  /* Zámek: uložený výsledek a otisk odeslané nabídky import nemění. */
  const puvodni = JSON.parse(fs.readFileSync(FIX, 'utf8')).varianty[0].zamek;
  test('zamčená varianta: zmrazený otisk ceny beze změny', JSON.stringify(v.zamek.otisk) === JSON.stringify(puvodni.otisk));
}

/* --- migrace zveřejňovaného ceníku --- */
{
  const c = kop(STARY);
  test('migrace: starý ceník → výchozí hodnoty a C.mustekKc 28 600', E.cenikMigraceMustku(c, STARY) === true
    && c.mustekKc === 28600 && c.mustekRefSirkaMm === 1600 && c.mustekMontazHodKc === 400
    && c.mustekMontazZakladHod === 8 && c.mustekMontazBmHod === 8 && c.mustekMontazMinHod === 16, c);
  test('migrace: nový ceník se nemění', E.cenikMigraceMustku(c, STARY) === false && c.mustekKc === 28600);
  const z0 = Object.assign(kop(STARY), { mustekRefSirkaMm: 0, mustekMontazHodKc: 0, mustekMontazZakladHod: 0, mustekMontazBmHod: 0, mustekMontazMinHod: 0 });
  E.cenikMigraceMustku(z0, STARY);
  test('migrace: buňky doplněné nulou (import) dostanou výchozí hodnoty — žádné NaN',
    z0.mustekRefSirkaMm === 1600 && z0.mustekMontazMinHod === 16 && Number.isFinite(mustkyKc(spocti({ mustkyKs: 1 }, z0))));
  const vlastni = Object.assign(kop(STARY), { mustekMontazHodKc: 450, mustekKc: 30000 });
  E.cenikMigraceMustku(vlastni, STARY);
  test('migrace: co správce už vyplnil (sazba montáže, změněná cena) zůstane',
    vlastni.mustekMontazHodKc === 450 && vlastni.mustekKc === 30000 && vlastni.mustekRefSirkaMm === 1600);
  const bezKlicu = kop(STARY); delete bezKlicu.mustekKc;
  E.cenikMigraceMustku(bezKlicu, {});
  test('migrace: ceník bez C.mustekKc dostane 28 600', bezKlicu.mustekKc === 28600);
  /* Zveřejnění online i do složky jde přes progKontext → kopie se migruje. */
  const src = fs.readFileSync(path.join(__dirname, 'ui', 'program_ui.js'), 'utf8');
  test('progKontext migruje kopii ceníku pro zveřejnění', /cenikMigraceMustku\(o, platnyCenik\)/.test(src)
    && /sMustky\(bez\(doplneno\(d\.cenik/.test(src));
}

/* --- controlling: materiál a montáž zvlášť --- */
{
  const C = require('./controlling.js');
  const m = C.CTRL_MAPA_VYCHOZI || {};
  test('controlling: materiál → zámečníci, montáž → stavební práce, hodiny a šířka nejsou náklad',
    m['C.mustekKc'] === 'sl-zamecnici' && m['C.mustekMontazHodKc'] === 'sl-stavebni'
    && ['C.mustekRefSirkaMm', 'C.mustekMontazZakladHod', 'C.mustekMontazBmHod', 'C.mustekMontazMinHod'].every(k => m[k] === C.CTRL_NENI_NAKLAD),
    ['C.mustekKc', 'C.mustekMontazHodKc', 'C.mustekRefSirkaMm'].map(k => m[k]));
}

/* --- kontroly a standard --- */
{
  const najdi = (x, c, kod) => { const z = zadani(x); const r = E.vypocet(kop(z), kop(c), J, true);
    return K.kontrolyProved({ zadani: z, vysledek: r, cenik: c }).nalezy.find(n => n.kod === kod); };
  const n = najdi({ mustkyKs: 1, mustekHloubkaMm: '' }, NOVY, 'mustekRozmer');
  test('prázdná délka → „Doplňte délku můstku", počítá se 1 000 mm', n && /Doplňte délku můstku/.test(n.text) && /1\s000 mm/.test(n.text), n);
  test('vyplněná délka → kontrola mlčí', !najdi({ mustkyKs: 1, mustekHloubkaMm: 900 }, NOVY, 'mustekRozmer'));
  test('starý ceník: prázdná délka se nehlásí (paušál)', !najdi({ mustkyKs: 1 }, STARY, 'mustekRozmer'));
  const bezSazby = Object.assign(kop(NOVY), { mustekMontazHodKc: 0 });
  const n2 = najdi({ mustkyKs: 1, mustekHloubkaMm: 900 }, bezSazby, 'mustky');
  test('nový ceník bez sazby montáže → upozornění', n2 && /sazba montáže můstků/.test(n2.text), n2);
  test('nový ceník s cenami → kontrola cen mlčí', !najdi({ mustkyKs: 1, mustekHloubkaMm: 900 }, NOVY, 'mustky'));
  const std = Object.assign(S.standardOciste({}), { zapnuto: true });
  const ve = S.standardVyhodnot(zadani({ mustkyKs: 1, mustekHloubkaMm: 1200, sirka: 3 }), 20, std, {});
  test('standard: délka nad 1 000 mm se hlásí („Délka můstku")', (ve.nalezy || []).some(x => x.co === 'Délka můstku' && x.stav === 'mimo'), ve.nalezy);
  const vs = S.standardVyhodnot(zadani({ mustkyKs: 1, mustekHloubkaMm: 800, mustekSirkaMm: 5000 }), 20, std, {});
  test('standard: šířka můstku se nehlídá', !(vs.nalezy || []).some(x => /Šířka můstku/.test(x.co)), vs.nalezy);
}

/* --- specifikace, nabídka a překlady --- */
{
  const pole = (() => { let p = null; TS.TECHSPEC_DEF.forEach(s => s.pole.forEach(x => { if (x.id === 'mustky') p = x; })); return p; })();
  const zN = zadani({ mustkyKs: 2, mustekHloubkaMm: 900 });
  const rN = E.vypocet(kop(zN), kop(NOVY), J, true);
  const VETA = '2 ks, rozměr 1600 × 900 mm (šířka × délka), ocelová konstrukce vč. zábradlí a montáže';
  test('specifikace: jeden řádek Š × D vč. zábradlí a montáže', pole.prefill(rN, zN) === VETA, pole.prefill(rN, zN));
  const zP = zadani({ mustkyKs: 1 });
  test('specifikace: prázdná délka = 1 000 mm jako v ceně',
    pole.prefill(E.vypocet(kop(zP), kop(NOVY), J, true), zP) === '1 ks, rozměr 1600 × 1000 mm (šířka × délka), ocelová konstrukce vč. zábradlí a montáže');
  const zS = zadani({ mustkyKs: 2, mustekHloubkaMm: 900, mustekSirkaMm: 1300 });
  test('specifikace se starým ceníkem: věta jako dřív', pole.prefill(E.vypocet(kop(zS), kop(STARY), J, true), zS)
    === '2 ks, hloubka 900 mm, šířka 1300 mm');
  test('překlad EN', PR.tr(VETA, 'en') === '2 pcs, size 1600 × 900 mm (width × length), steel structure incl. railing and installation', PR.tr(VETA, 'en'));
  test('překlad DE', PR.tr(VETA, 'de') === '2 Stk., Abmessung 1600 × 900 mm (Breite × Länge), Stahlkonstruktion inkl. Geländer und Montage', PR.tr(VETA, 'de'));
  test('překlad FR', PR.tr(VETA, 'fr') === '2 pcs, dimensions 1600 × 900 mm (largeur × longueur), structure en acier y compris garde-corps et montage', PR.tr(VETA, 'fr'));
  /* Nabídka: řádek v doplňkových konstrukcích. */
  global.vypocet = E.vypocet; global.DEFAULT_ZADANI = E.DEFAULT_ZADANI;
  global.TECHSPEC_DEF = TS.TECHSPEC_DEF; global.tsHodnota = TS.tsHodnota; global.DEFAULT_TECHSPEC = TS.DEFAULT_TECHSPEC;
  const { nabidkaData, nabidkaNahledSekce } = require('./nabidka.js');
  const zak = zk.novaZakazka(); zak.cislo = '2026 - OPR - CN - 9354';
  zak.varianty[0].data.cenik = kop(NOVY);
  Object.assign(zak.varianty[0].data.ock.zadani, { prejezd: 3.5, zdvih: 12, prohluben: 1.1, sirka: 1.6, hloubka: 1.5,
    mustkyKs: 1, mustekHloubkaMm: 1500 });
  const ph = nabidkaData(zak, zak.varianty[0], J, 'cz').placeholders;
  test('nabídka CZ: TS_MUSTKY', ph.TS_MUSTKY === '1 ks, rozměr 1600 × 1500 mm (šířka × délka), ocelová konstrukce vč. zábradlí a montáže', ph.TS_MUSTKY);
  const radky = []; nabidkaNahledSekce(ph, 'cz').forEach(s => s.radky.forEach(r => radky.push(r)));
  test('nabídka: jediný řádek můstků', radky.filter(r => /MŮSTK/.test(r[0])).length === 1, radky.filter(r => /MŮSTK/.test(r[0])));
  for (const j of ['en', 'de', 'fr']) {
    zak.varianty[0].data.cenik.kurzEurKc = 25;
    const t = nabidkaData(zak, zak.varianty[0], J, j).placeholders.TS_MUSTKY;
    test('nabídka ' + j.toUpperCase() + ': řádek přeložený', !!t && !/ks|šířka|zábradlí/.test(t) && /1600 × 1500/.test(t), t);
  }
}

console.log(`\n${ok} OK, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
