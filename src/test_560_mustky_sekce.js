/* #560 — SAMOSTATNÁ SEKCE MŮSTKY (rozhodnutí J. V. 4. 11. 2026,
 * podklady/NAVRH_MUSTKY_A_ZMENA_CENY_04_11.md, oddíl A).
 *
 *  A) Zlatá pojistka: zakázky bez můstků a se starým zadáním (počet + délka,
 *     zaškrtávátko) a starým ceníkem (paušál i #354) dávají v Modelu 1 i 2
 *     tentýž výsledek jádra, symboly nabídky CZ/EN, náhled a specifikaci jako
 *     výchozí commit 000924e (otisky v test_560_zlata.json, generátor
 *     nastroje/zlata_560.js).
 *  B) Jádro: skupiny `Z.mustky`, starý tvar = jedna skupina na haléř, Model 1
 *     na vzorci #354, skladebný model v Modelu 2 (každá podlaha a zábradlí
 *     mění jen svou část, vana jen za ocelovou vanu, sloupy = sloupky šachty,
 *     kotvení, „jiné" bez ceny), žádné dvojí zábradlí, cena můstků v souhrnu.
 *  C) Ceník: kontrola zveřejnění (nulová sazba provedení), seznamy serveru
 *     shodné s jádrem, controlling zařazuje nové klíče.
 *  D) Specifikace a nabídka: sekce MŮSTKY, řádek ceny (bez slevy, se slevou,
 *     v eurech sedí rozpad), starý ceník beze změny, krycí list.
 *  E) Word: šablona v16 (nastroje/vyrob_sablony.js --cn-v16 nad syntetickou
 *     v15) i klon do v15; bez můstků dá v16 tentýž text jako v15.
 *
 * Pojistka: na 000924e část A projde (je to otisk té verze) a části B–E
 * selžou (Z.mustky, skladebný model, sekce ani symboly neexistují);
 * po změně projde vše. Smyšlený ceník (zkusebni_cenik.js).
 * Spuštění: cd src && node test_560_mustky_sekce.js */
const fs = require('fs');
const path = require('path');
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
const N = require('./nabidka.js');
const DG = require('./docxgen.js');
const K = require('./kontroly.js');
const U = require('./uloziste.js');
const CTRL = require('./controlling.js');
const KR = require('./kryci.js');
const J = require('./jekly.json');

let ok = 0, fail = 0;
const test = (n, c, info) => { if (c) { ok++; console.log('OK   ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info).slice(0, 500)); } };
const kop = x => JSON.parse(JSON.stringify(x));
const blizko = (a, b) => Math.abs(a - b) < 1e-6;

const SKLADBA = { mustekRamBmKc: 10000, mustekPodlahaPlechM2Kc: 1000, mustekPodlahaPororostM2Kc: 1100, mustekPodlahaVanaM2Kc: 1200,
  mustekZabradliKovBmKc: 2000, mustekZabradliSkloBmKc: 5000, mustekKotveniDeskaKc: 3000, mustekKotveniSloupKc: 3100,
  mustekKotveniKonzolaKc: 3200, mustekZabradliSkloMontazHodBm: 1 };
const C354 = () => Object.assign(ZC.zkusebniCenik(), ZC.zkusebniMustky());
const CSKL = (zm) => Object.assign(C354(), SKLADBA, zm || {});
const ZAD = (zm) => Object.assign(kop(E.DEFAULT_ZADANI), { prejezd: 3.3, zdvih: 12, prohluben: 1.2, sirka: 1.6, hloubka: 2.1 }, zm || {});
const radek = (r, n) => (r.sekce.mustky || []).concat(r.sekce.hrubaOck).find(x => x.origNazev === n);

/* ---------------- A) zlatá pojistka ---------------- */
{
  const zlata = JSON.parse(fs.readFileSync(path.join(__dirname, 'test_560_zlata.json'), 'utf8')).scenare;
  /* čistý podproces — globály tohoto testu (kryci.js, kontroly.js …) by
   * symboly nabídky doplnily jinak než ve výchozím stavu generátoru */
  const ted = JSON.parse(require('child_process').execFileSync(process.execPath,
    [path.join(__dirname, '..', 'nastroje', 'zlata_560.js'), __dirname], { encoding: 'utf8', maxBuffer: 1 << 24 })).scenare;
  Object.keys(zlata).forEach(sc => Object.keys(zlata[sc]).forEach(k => {
    test('A zlatá pojistka ' + sc + ' · ' + k + ' = 000924e', ted[sc] && ted[sc][k] === zlata[sc][k], ted[sc] && ted[sc][k]);
  }));
}

/* ---------------- B) jádro ---------------- */
{
  /* starý tvar = jedna skupina (Model 1 i 2, #354) */
  for (const f of [true, false]) {
    const a = E.vypocet(ZAD({ mustkyKs: 2, mustekHloubkaMm: 1200 }), C354(), J, f);
    const b = E.vypocet(ZAD({ mustky: [{ ks: 2, delkaMm: 1200 }] }), C354(), J, f);
    test('B starý tvar = jedna skupina na haléř (' + (f ? 'Model 2' : 'Model 1') + ')', a.souhrn.zakladCena === b.souhrn.zakladCena
      && blizko(a.souhrn.zakladNaklad, b.souhrn.zakladNaklad), [a.souhrn.zakladNaklad, b.souhrn.zakladNaklad]);
  }
  test('B mustkySkupiny: starý tvar → jedna skupina s výchozím provedením',
    JSON.stringify(E.mustkySkupiny({ mustkyKs: 3, mustekHloubkaMm: '900' })) === JSON.stringify([E.mustekSkupinaOciste({ ks: 3, delkaMm: 900 })])
    && E.mustkySkupiny({ mustek: true })[0].ks === 1 && E.mustkySkupiny({}).length === 0);
  test('B mustkyPocet sčítá skupiny a má přednost před starým polem', E.mustkyPocet({ mustkyKs: 9, mustky: [{ ks: 2 }, { ks: 3 }] }) === 5);
  const z0 = { mustkyKs: 2, mustekHloubkaMm: 700 };
  const sk0 = E.mustkyNaSkupiny(z0);
  test('B převod na skupiny smaže stará pole', Array.isArray(z0.mustky) && sk0[0].ks === 2 && sk0[0].delkaMm === 700
    && !('mustkyKs' in z0) && !('mustekHloubkaMm' in z0));

  /* Model 1: vzorec #354 i se skladebným ceníkem a provedením; šířka = šířka šachty, bez sloupů */
  const zM1 = ZAD({ mustky: [{ ks: 2, sirkaMm: 1200, delkaMm: 1000, podlaha: 'vana', zabradli: 'sklo', sloupyKs: 2 }] });
  const r1 = E.vypocet(kop(zM1), CSKL(), J, false);
  const r1ref = E.vypocet(ZAD({ mustkyKs: 2, mustekHloubkaMm: 1000 }), CSKL(), J, false);
  test('B Model 1: bez sekce MŮSTKY a se stejnou cenou jako starý tvar (#354)', !r1.sekce.mustky && !r1.mustky.skladebny
    && r1.souhrn.zakladCena === r1ref.souhrn.zakladCena && !r1.souhrn.mustkyCena, [r1.souhrn.zakladCena, r1ref.souhrn.zakladCena]);
  test('B Model 1: řádky #354 (materiál + montáž), šířka = šířka šachty, sloupy ani kotvení nejsou',
    !!radek(r1, 'MŮSTKY VČ. ZÁBRADLÍ – MATERIÁL') && r1.mustky.sirkaMm === 1600 && r1.mustky.sloupyM === 0
    && !r1.sekce.hrubaOck.some(x => /SLOUPY NAVÍC|KOTVENÍ/.test(x.origNazev)));

  /* Model 2 se starým ceníkem: #354 se zadanou šířkou + sloupy */
  const r2s = E.vypocet(kop(zM1), C354(), J, true);
  test('B Model 2 + starý ceník: #354 (žádná sekce MŮSTKY), zadaná šířka 1200 mm', !r2s.sekce.mustky && r2s.mustky.sirkaMm === 1200
    && blizko(radek(r2s, 'MŮSTKY VČ. ZÁBRADLÍ – MATERIÁL').mnozstvi, 2 * 1 * 1200 / 2000));
  const sl = radek(r2s, E.MUSTEK_RADEK.sloupy);
  const jSl = J[zM1.profily.sloupek.dim];
  const kgOcek = 2 * 12 * (1 + zM1.rezervaProfilyPct) * jSl.kg[String(zM1.profily.sloupek.tl)];
  test('B sloupy = sloupky šachty: profil sloupku, rezerva profilů, Kč/kg profilů', !!sl && blizko(sl.mnozstvi, kgOcek)
    && sl.cenaPath === 'C.profilasKgKc' && sl.cena === C354().profilasKgKc, [sl && sl.mnozstvi, kgOcek]);
  const lak = radek(r2s, E.MUSTEK_RADEK.sloupyLak);
  const L = C354().lak;
  const lakOcek = L.rezim === 'tomas' ? L.tomasProfilM2 * 2 * 12 * (1 + zM1.rezervaProfilyPct) * jSl.m2 : L.lakovnaProfilBm * 2 * 12 * (1 + zM1.rezervaProfilyPct);
  test('B sloupy: lakování sazbou profilů', !!lak && blizko(lak.naklad, lakOcek), [lak && lak.naklad, lakOcek]);
  test('B sloupy: nová sazba Kč/bm se nezavádí', !('mustekSloupBmKc' in E.DEFAULT_CENIK) && E.MUSTKY_SKLADBA_KLICE.indexOf('mustekSloupBmKc') < 0);

  /* skladebný model */
  const zS = (zm) => ZAD({ mustky: [Object.assign({ ks: 2, delkaMm: 1200 }, zm || {})] });
  const rS = E.vypocet(zS(), CSKL(), J, true);
  test('B skladebný: sekce MŮSTKY, žádné řádky #354 v Hrubé OCK', rS.mustky.skladebny && Array.isArray(rS.sekce.mustky)
    && !rS.sekce.hrubaOck.some(x => /MŮSTK/.test(x.origNazev)));
  test('B skladebný: zábradlí se nepočítá dvakrát (C.mustekKc se nečte)', !rS.sekce.mustky.some(x => x.cenaPath === 'C.mustekKc'));
  const sM = 1.6, dM = 1.2;
  test('B skladebný: nosná konstrukce = ks × d × (š / ref) × Kč/bm', blizko(radek(rS, E.MUSTEK_RADEK.konstrukce).naklad, 2 * dM * (1600 / 2000) * 10000));
  test('B skladebný: výchozí podlaha pochozí plech m² × sazba', blizko(radek(rS, E.MUSTEK_RADEK.podlaha.plech).naklad, 2 * sM * dM * 1000));
  test('B skladebný: zábradlí kovové oboustranně', blizko(radek(rS, E.MUSTEK_RADEK.zabradli.kov).naklad, 2 * 2 * dM * 2000));
  test('B skladebný: kotvení do desky = sada na můstek', blizko(radek(rS, E.MUSTEK_RADEK.kotveni.deska).naklad, 2 * 3000));
  const hod = 2 * Math.max(14, 6 + 10 * dM);
  test('B skladebný: montáž = hodiny #354 × sazba montáže', blizko(radek(rS, E.MUSTEK_RADEK.montaz).mnozstvi, hod));
  const naklad = r => r.sekce.mustky.reduce((a, x) => a + x.naklad, 0);
  /* každá volba mění jen svou část */
  for (const [pod, kl] of [['pororost', 'mustekPodlahaPororostM2Kc'], ['vana', 'mustekPodlahaVanaM2Kc']]) {
    const r = E.vypocet(zS({ podlaha: pod }), CSKL(), J, true);
    const rad = radek(r, E.MUSTEK_RADEK.podlaha[pod]);
    test('B skladebný: podlaha ' + pod + ' — jen řádek podlahy se změní', !!rad && rad.cenaPath === 'C.' + kl
      && !radek(r, E.MUSTEK_RADEK.podlaha.plech) && blizko(naklad(r) - naklad(rS), 2 * sM * dM * (SKLADBA[kl] - 1000)));
  }
  const rV = E.vypocet(zS({ podlaha: 'vana' }), CSKL(), J, true);
  test('B vana: řádek říká, že beton zajistí stavba, a cena je jen za vanu', /BETON ZAJISTÍ STAVBA/.test(radek(rV, E.MUSTEK_RADEK.podlaha.vana).origNazev)
    && !rV.sekce.mustky.some(x => /BETONÁŽ|BETONU/.test(x.origNazev) && x !== radek(rV, E.MUSTEK_RADEK.podlaha.vana)));
  const rSk = E.vypocet(zS({ zabradli: 'sklo' }), CSKL(), J, true);
  test('B zábradlí sklo: jen zábradlí + montáž skla navíc', !radek(rSk, E.MUSTEK_RADEK.zabradli.kov)
    && blizko(radek(rSk, E.MUSTEK_RADEK.zabradli.sklo).naklad, 2 * 2 * dM * 5000)
    && blizko(radek(rSk, E.MUSTEK_RADEK.montaz).mnozstvi, hod + 2 * 2 * dM * 1));
  const rJs = E.vypocet(zS({ zabradli: 'sklo', zabradliStrany: 1 }), CSKL(), J, true);
  test('B zábradlí jednostranně = polovina metrů', blizko(radek(rJs, E.MUSTEK_RADEK.zabradli.sklo).mnozstvi, 2 * dM));
  const rBez = E.vypocet(zS({ zabradli: 'bez' }), CSKL(), J, true);
  test('B bez zábradlí: žádný řádek zábradlí', !rBez.sekce.mustky.some(x => /ZÁBRADLÍ/.test(x.origNazev)));
  for (const [kt, kl] of [['sloupy', 'mustekKotveniSloupKc'], ['konzola', 'mustekKotveniKonzolaKc']]) {
    const r = E.vypocet(zS({ kotveni: kt }), CSKL(), J, true);
    test('B kotvení ' + kt, blizko(radek(r, E.MUSTEK_RADEK.kotveni[kt]).naklad, 2 * SKLADBA[kl]) && !radek(r, E.MUSTEK_RADEK.kotveni.deska));
  }
  const rJ = E.vypocet(zS({ podlaha: 'jine', podlahaNazev: 'dřevěná prkna', kotveni: 'jine', kotveniText: 'na ocelový nosník' }), CSKL(), J, true);
  const rpj = radek(rJ, E.MUSTEK_RADEK.podlaha.jine);
  test('B „jiné": řádek s cenou 0, příznak bezCeny a název v poznámce', rpj && rpj.bezCeny && rpj.naklad === 0 && /prkna/.test(rpj.pozn)
    && radek(rJ, E.MUSTEK_RADEK.kotveni.jine).bezCeny);
  const kM = K.KONTROLY ? K.KONTROLY.find(x => x.kod === 'mustky') : null;
  const ctxJ = { zadani: zS({ podlaha: 'jine' }), cenik: CSKL(), vysledek: E.vypocet(zS({ podlaha: 'jine' }), CSKL(), J, true) };
  test('B kontrola „mustky" řekne, že „jiné" nemá cenu', !kM || /nemá cenu/.test((kM.zjisti(ctxJ) || {}).text || ''), kM && kM.zjisti(ctxJ));
  const ctxP = { zadani: zS({ podlaha: 'vana' }), cenik: C354(), vysledek: E.vypocet(zS({ podlaha: 'vana' }), C354(), J, true) };
  test('B kontrola „mustky": provedení mimo skladebný model se v ceně neprojeví', !kM || /jen v Modelu 2/.test((kM.zjisti(ctxP) || {}).text || ''));
  /* víc skupin */
  const rG = E.vypocet(ZAD({ mustky: [{ ks: 1, delkaMm: 1000 }, { ks: 2, sirkaMm: 1000, delkaMm: 800, podlaha: 'pororost' }] }), CSKL(), J, true);
  test('B víc skupin: konstrukce sečtená po skupinách', blizko(radek(rG, E.MUSTEK_RADEK.konstrukce).mnozstvi, 1 * 1 * 1600 / 2000 + 2 * 0.8 * 1000 / 2000)
    && blizko(radek(rG, E.MUSTEK_RADEK.podlaha.pororost).mnozstvi, 2 * 1 * 0.8) && blizko(radek(rG, E.MUSTEK_RADEK.podlaha.plech).mnozstvi, 1.6));
  /* souhrn */
  test('B souhrn: celková cena obsahuje můstky, mustkyCena ≤ celková a zaokrouhlená na tisíce', rS.souhrn.mustkyCena > 0
    && rS.souhrn.mustkyCena <= rS.souhrn.zakladCena && rS.souhrn.mustkyCena % 1000 === 0
    && rS.souctySekci.mustky && blizko(rS.souhrn.zakladNaklad, rS.souctySekci.hrubaOck.naklad + rS.souctySekci.oplasteni.naklad
      + rS.souctySekci.volitelne.naklad + rS.souctySekci.rezie.naklad + rS.souctySekci.mustky.naklad + rS.rezerva.naklad));
  { const zz = zS(); zz.rezervaZakladPct = 0.1; const rr = E.vypocet(zz, CSKL(), J, true);
    const m = rr.souctySekci.mustky; const marze = CSKL().marze;
    test('B cena můstků nese podíl rezervy (z nákladu, s přirážkou) a je nahoru na tisíce',
      rr.souhrn.mustkyCena === Math.ceil((m.sMarzi + m.naklad * 0.1 * (1 + marze)) / 1000 - 1e-9) * 1000, [rr.souhrn.mustkyCena, m.sMarzi, m.naklad]); }
  const rN = E.vypocet(ZAD(), CSKL(), J, true);
  test('B bez můstků: žádná sekce ani cena můstků', !rN.sekce.mustky && !('mustkyCena' in rN.souhrn) && !rN.souctySekci.mustky);
  /* standard OCK */
  const S = require('./standard_ock.js');
  const st = S.standardVyhodnot ? S.standardVyhodnot(ZAD({ mustky: [{ ks: 1, sirkaMm: 1800, delkaMm: 900 }] }), null) : null;
  test('B standard OCK: zadaná šířka nad šířkou OCK = mimo standard', !st || st.nalezy.some(n => /Šířka můstku/.test(n.co || n.nazev || JSON.stringify(n))), st && st.nalezy);
}

/* ---------------- C) ceník, server, controlling ---------------- */
{
  test('C kontrola zveřejnění: úplný skladebný ceník ok', E.mustkyCenikKontrola(CSKL()).ok);
  const k = E.mustkyCenikKontrola(CSKL({ mustekZabradliSkloBmKc: 0 }));
  test('C kontrola zveřejnění: nulová sazba skla → potvrzení', !k.ok && k.chybi.includes('mustekZabradliSkloBmKc'));
  test('C kontrola zveřejnění: hodiny skla smějí být 0', E.mustkyCenikKontrola(CSKL({ mustekZabradliSkloMontazHodBm: 0 })).ok);
  test('C kontrola zveřejnění: starý ceník #354 beze změny ok', E.mustkyCenikKontrola(C354()).ok);
  test('C server zná tytéž volby jako jádro', JSON.stringify(U.ULO_MUSTKY_VOLBY.podlaha) === JSON.stringify(E.MUSTEK_PODLAHY.map(x => x[0]))
    && JSON.stringify(U.ULO_MUSTKY_VOLBY.zabradli) === JSON.stringify(E.MUSTEK_ZABRADLI.map(x => x[0]))
    && JSON.stringify(U.ULO_MUSTKY_VOLBY.kotveni) === JSON.stringify(E.MUSTEK_KOTVENI.map(x => x[0]))
    && U.ULO_MUSTKY_MAX === E.MUSTKY_SKUPIN_MAX && U.ULO_MUSTKY_TEXT === E.MUSTEK_TEXT_MAX);
  test('C server zná všechny klíče skupiny', JSON.stringify(Object.keys(E.mustekSkupinaOciste({})).sort()) === JSON.stringify(U.ULO_MUSTKY_KLICE.slice().sort()));
  const def = require('./cenik.js').CENIK_DEF;
  const cesty = []; def.forEach(([, items]) => items.forEach(i => cesty.push(i[0])));
  test('C ceník (Nastavení → Ceník) má všechny nové klíče', E.MUSTKY_SKLADBA_KLICE.every(k2 => cesty.includes('C.' + k2)));
  test('C nové klíče bez sazeb v kódu (#548)', E.MUSTKY_SKLADBA_KLICE.every(k2 => E.DEFAULT_CENIK[k2] === 0));
  const m = CTRL.CTRL_MAPA_VYCHOZI;
  test('C controlling zařazuje nové klíče (sklo → sklo, ostatní → zámečníci)', m['C.mustekZabradliSkloBmKc'] === m['C.skloBokyKc']
    && ['C.mustekRamBmKc', 'C.mustekPodlahaVanaM2Kc', 'C.mustekKotveniDeskaKc'].every(x => m[x] === m['C.mustekKc']), m['C.mustekRamBmKc']);
  const rS = E.vypocet(ZAD({ mustky: [{ ks: 1 }] }), CSKL(), J, true);
  const rows = CTRL.ctrlRadkyOck ? CTRL.ctrlRadkyOck(rS, { fixes: true }) : null;
  test('C controlling: řádky sekce MŮSTKY jsou v exportu', !rows || rows.some(x => x.sekce === 'mustky'), rows && rows.length);
}

/* ---------------- D) specifikace, nabídka, krycí list ---------------- */
const zakazka = (mustky, cen, zm) => {
  const z = zk.novaZakazka(); z.cislo = '2026 - OPR - CN - 9560'; z.nazevAkce = 'Můstky';
  const v = z.varianty[0];
  Object.assign(v.data.ock.zadani, { prejezd: 3.3, zdvih: 12, prohluben: 1.2, sirka: 1.6, hloubka: 2 }, zm || {});
  if (mustky) v.data.ock.zadani.mustky = mustky;
  v.data.ock.fixes = true; v.data.cenik = cen || CSKL();
  return z;
};
const MU = [{ ks: 2, delkaMm: 1200, podlaha: 'vana', zabradli: 'sklo', zabradliStrany: 1, kotveni: 'konzola', sloupyKs: 2, sloupVyskaM: 3.2 }];
{
  const z = zakazka(kop(MU)); const v = z.varianty[0];
  const d = N.nabidkaData(z, v, J, 'cz'); const ph = d.placeholders;
  test('D symboly sekce MŮSTKY', ph.TS_MUSTKY_ROZMER === '2 ks, 1 600 × 1 200 mm (šířka × délka)'
    && ph.TS_MUSTKY_PODLAHA === 'ocelová vana pro beton (betonáž zajistí stavba)' && ph.TS_MUSTKY_ZABRADLI === 'skleněné, jednostranně'
    && ph.TS_MUSTKY_KOTVENI === 'konzolově jen z OCK' && ph.TS_MUSTKY_SLOUPY === '2 ks, výška 3,2 m', [ph.TS_MUSTKY_ROZMER, ph.TS_MUSTKY_ZABRADLI, ph.TS_MUSTKY_SLOUPY]);
  test('D souhrnný řádek v DOPLŇKOVÝCH KONSTRUKCÍCH zmizí', ph.TS_MUSTKY === '');
  const cis = t => +String(t).replace(/[^\d,]/g, '').replace(',', '.');
  test('D řádek ceny: šachta + můstky = cena bez DPH (bez slevy)', cis(ph.CENA_SACHTA_BEZ_DPH) + cis(ph.CENA_MUSTKY_BEZ_DPH) === cis(ph.CENA_BEZ_DPH)
    && cis(ph.CENA_MUSTKY_BEZ_DPH) > 0 && ph.CENA_BEZ_DPH_SACHTA === '' && ph.CENA_BEZ_DPH_CELKEM === ph.CENA_BEZ_DPH, [ph.CENA_SACHTA_BEZ_DPH, ph.CENA_MUSTKY_BEZ_DPH, ph.CENA_BEZ_DPH]);
  const sek = N.nabidkaNahledSekce(ph, 'cz', d.platbyOck, d.tsExtra);
  const sm = sek.find(s => s.sekce === 'MŮSTKY MEZI BUDOVOU A OCK');
  test('D online nabídka: vlastní sekce MŮSTKY s pěti řádky', sm && sm.radky.length === 5, sm);
  const b = sek.find(s => /^B\. OBCHODNÍ/.test(s.sekce)).radky.map(r => r[0]);
  test('D online nabídka: šachta, můstky a cena celkem', b[0] === 'Výtahová šachta (bez DPH)' && b[1] === 'Můstky mezi budovou a OCK (bez DPH)'
    && b[2] === 'Cena celkem (bez DPH)', b);
  /* sleva */
  v.data.sleva = { procenta: 5, stav: 'schváleno automaticky', role: 'Obchodník' };
  const ps = N.nabidkaData(z, v, J, 'cz').placeholders;
  test('D se slevou: šachta + můstky = cena před slevou, cena celkem po slevě', cis(ps.CENA_SACHTA_BEZ_DPH) + cis(ps.CENA_MUSTKY_BEZ_DPH) === cis(ps.CENA_PRED_SLEVOU)
    && cis(ps.CENA_PRED_SLEVOU) - cis(ps.SLEVA_KC) === cis(ps.CENA_BEZ_DPH_CELKEM), [ps.CENA_SACHTA_BEZ_DPH, ps.CENA_MUSTKY_BEZ_DPH, ps.CENA_PRED_SLEVOU, ps.SLEVA_KC, ps.CENA_BEZ_DPH]);
  /* euro */
  v.data.cenik.kurzEurKc = 25; delete v.data.sleva;
  for (const L of ['en', 'de', 'fr']) {
    const pe = N.nabidkaData(z, v, J, L).placeholders;
    const ce = t => +String(t).replace(/[^\d,.]/g, '').replace(/[.,](?=\d{3}\b)/g, '').replace(',', '.');
    test('D ' + L.toUpperCase() + ': rozpad v eurech sedí a texty jsou přeložené', /€|EUR/.test(pe.CENA_MUSTKY_BEZ_DPH)
      && ce(pe.CENA_SACHTA_BEZ_DPH) + ce(pe.CENA_MUSTKY_BEZ_DPH) === ce(pe.CENA_BEZ_DPH)
      && !/[−-]/.test(pe.CENA_SACHTA_BEZ_DPH) && ce(pe.CENA_MUSTKY_BEZ_DPH) < ce(pe.CENA_SACHTA_BEZ_DPH)
      && !/ks|zábradlí|vana|šířka/.test(pe.TS_MUSTKY_ROZMER + pe.TS_MUSTKY_ZABRADLI + pe.TS_MUSTKY_PODLAHA), [pe.CENA_SACHTA_BEZ_DPH, pe.CENA_MUSTKY_BEZ_DPH, pe.CENA_BEZ_DPH, pe.TS_MUSTKY_ZABRADLI]);
  }
  /* specifikace: sekce jen ve skladebném modelu */
  const sekS = TS.TECHSPEC_DEF.find(s => s.sekce === 'MŮSTKY MEZI BUDOVOU A OCK');
  const rStary = E.vypocet(zakazka(kop(MU), C354()).varianty[0].data.ock.zadani, C354(), J, true);
  test('D specifikace: sekce MŮSTKY jen ve skladebném modelu', sekS && sekS.jen(N.nabidkaData ? E.vypocet(v.data.ock.zadani, CSKL(), J, true) : null) && !sekS.jen(rStary));
  const z2 = zakazka(kop(MU), C354());
  const p2 = N.nabidkaData(z2, z2.varianty[0], J, 'cz').placeholders;
  test('D starý ceník: žádná sekce ani řádek ceny, jen souhrnný řádek', p2.TS_MUSTKY_ROZMER === '' && p2.CENA_MUSTKY_BEZ_DPH === ''
    && /2 ks/.test(p2.TS_MUSTKY) && p2.CENA_BEZ_DPH_SACHTA === p2.CENA_BEZ_DPH, p2.TS_MUSTKY);
  /* krycí list */
  const t = KR.kryciMustkyText ? KR.kryciMustkyText(E.vypocet(v.data.ock.zadani, CSKL(), J, true)) : '';
  test('D krycí list: souhrn můstků', /2 ks 1\s?600 × 1\s?200 mm, ocelová vana.*zábradlí skleněné jednostranně, kotvení konzolově jen z OCK, sloupy navíc 2 ks × 3,2 m/.test(t), t);
}

/* ---------------- E) Word ---------------- */
(async () => {
  const vyrob = require('../nastroje/vyrob_sablony.js');
  const sablonaV15 = async () => {
    const pol = await DG.zipPrecti(new Uint8Array(await DG.docxDokumentBlob('Nabídka', [
      { sekce: 'DOPLŇKOVÉ KONSTRUKCE', radky: [['MŮSTKY MEZI BUDOVOU A OCK', '{{TS_MUSTKY}}'], ['PŘECHODOVÉ PLECHY V NÁSTUPIŠTÍCH', '{{TS_PRECHODOVE_PLECHY}}'],
        ['OPLECHOVÁNÍ SOKLU PROHLUBNĚ', '{{TS_SOKL}}']] },
      { sekce: 'STAVEBNÍ A PŘÍPRAVNÉ PRÁCE', radky: [['ZÁBRANY DO DVEŘNÍCH VSTUPŮ', '{{TS_ZABRANY_VSTUPY}}']] },
      { sekce: 'CENA', radky: [['Cena před slevou', '{{CENA_PRED_SLEVOU}}'], ['Sleva', '− {{SLEVA_KC}} ({{SLEVA_PROC}} %)'],
        ['VÝTAHOVÁ ŠACHTA', '{{CENA_BEZ_DPH}} bez DPH'], ['CELKEM za nabídku', '{{CENA_S_DPH}} včetně DPH']] }]).arrayBuffer()));
    return pol;
  };
  const vypln = async (pol, data) => {
    const buf = await DG.zipZapis(pol).arrayBuffer();
    const vys = await DG.zipPrecti(new Uint8Array(await (await DG.docxVyplnSablonu(buf, data.placeholders, [], {}, { radkyNavic: data.tsRadkyNavic })).arrayBuffer()));
    const x = new TextDecoder().decode(vys.find(p => p.nazev === 'word/document.xml').data);
    return x.replace(/<\/w:tc>/g, ' | ').replace(/<\/w:tr>/g, '\n').replace(/<[^>]+>/g, '').replace(/ \| \n/g, '\n');
  };
  const z = zakazka(kop(MU)); const v = z.varianty[0];
  /* v15: klon */
  const p15 = await sablonaV15();
  const d15 = N.nabidkaData(z, v, J, 'cz', { symboly: new Set(['TS_MUSTKY', 'TS_SOKL', 'TS_PRECHODOVE_PLECHY', 'CENA_BEZ_DPH', 'CENA_PRED_SLEVOU']) });
  const t15 = await vypln(p15, d15);
  test('E v15 (klon): pruh MŮSTKY a řádky sekce za DOPLŇKOVÝMI KONSTRUKCEMI', /OPLECHOVÁNÍ SOKLU|PŘECHODOVÉ PLECHY/.test(t15)
    && /\nMŮSTKY MEZI BUDOVOU A OCK\nPOČET A ROZMĚR \| 2 ks, 1 600 × 1 200 mm[^\n]*\nPODLAHA \| ocelová vana[^\n]*\nZÁBRADLÍ \| skleněné, jednostranně\nKOTVENÍ MŮSTKŮ \| konzolově jen z OCK\nSLOUPY NAVÍC \| 2 ks, výška 3,2 m\nSTAVEBNÍ/.test(t15), t15);
  test('E v15 (klon): řádky ceny šachta, můstky a CENA CELKEM', /VÝTAHOVÁ ŠACHTA \| [\d\s ]+,00 Kč bez DPH\nMŮSTKY MEZI BUDOVOU A OCK \| [\d\s ]+,00 Kč bez DPH\nCENA CELKEM \| /.test(t15)
    && !/\{\{/.test(t15) && !/Cena před slevou/.test(t15), t15.slice(t15.indexOf('CENA')));
  /* v15 se slevou: šachta a můstky (před slevou) nad „Cena před slevou" */
  v.data.sleva = { procenta: 5, stav: 'schváleno automaticky', role: 'Obchodník' };
  const t15s = await vypln(await sablonaV15(), N.nabidkaData(z, v, J, 'cz', { symboly: new Set(['TS_MUSTKY', 'TS_SOKL', 'CENA_BEZ_DPH', 'CENA_PRED_SLEVOU']) }));
  test('E v15 (klon) se slevou: šachta, můstky, cena před slevou, sleva, CENA CELKEM',
    /VÝTAHOVÁ ŠACHTA \| [^\n]+\nMŮSTKY MEZI BUDOVOU A OCK \| [^\n]+\nCena před slevou \| [^\n]+\nSleva \| [^\n]+\nCENA CELKEM \| /.test(t15s), t15s.slice(t15s.indexOf('CENA')));
  delete v.data.sleva;
  /* v16 nástrojem */
  const doc = p15.find(p => p.nazev === 'word/document.xml');
  const p16 = p15.map(p => p === doc ? Object.assign({}, p, { data: new TextEncoder().encode(vyrob.cnV16(new TextDecoder().decode(p.data))) }) : p);
  const x16 = new TextDecoder().decode(p16.find(p => p.nazev === 'word/document.xml').data);
  const sym16 = DG.klicePlaceholderu(x16);
  test('E v16: nové symboly v šabloně', ['TS_MUSTKY_ROZMER', 'TS_MUSTKY_PODLAHA', 'TS_MUSTKY_ZABRADLI', 'TS_MUSTKY_KOTVENI', 'TS_MUSTKY_SLOUPY',
    'CENA_SACHTA_BEZ_DPH', 'CENA_MUSTKY_BEZ_DPH', 'CENA_BEZ_DPH_SACHTA', 'CENA_BEZ_DPH_CELKEM'].every(s => sym16.includes(s)) && !sym16.includes('CENA_BEZ_DPH'), sym16);
  const d16 = N.nabidkaData(z, v, J, 'cz', { symboly: new Set(sym16) });
  test('E v16: klon nevznikne (šablona symboly nese)', !d16.tsRadkyNavic.some(x => /MUSTK|CENA/.test(x.symbol || '')));
  const t16 = await vypln(p16, d16);
  test('E v16 s můstky: sekce a řádky ceny', /\nMŮSTKY MEZI BUDOVOU A OCK\nPOČET A ROZMĚR \| 2 ks/.test(t16) && /VÝTAHOVÁ ŠACHTA \| [^\n]+\nMŮSTKY MEZI BUDOVOU A OCK[^|\n]* \| [^\n]+\nCENA CELKEM[^|\n]* \| [^\n]+\nCELKEM za nabídku/.test(t16) && !/\{\{/.test(t16), t16);
  /* bez můstků: v16 = v15 */
  const zb = zakazka(null); const vb = zb.varianty[0];
  const tb15 = await vypln(await sablonaV15(), N.nabidkaData(zb, vb, J, 'cz', { symboly: new Set(['TS_MUSTKY', 'TS_SOKL', 'CENA_BEZ_DPH', 'CENA_PRED_SLEVOU']) }));
  const tb16 = await vypln(p16, N.nabidkaData(zb, vb, J, 'cz', { symboly: new Set(sym16) }));
  test('E v16 bez můstků: tentýž text jako v15', tb15 === tb16, [tb15, tb16]);
  vb.data.sleva = { procenta: 5, stav: 'schváleno automaticky', role: 'Obchodník' };
  const ts15 = await vypln(await sablonaV15(), N.nabidkaData(zb, vb, J, 'cz', { symboly: new Set(['TS_MUSTKY', 'TS_SOKL', 'CENA_BEZ_DPH', 'CENA_PRED_SLEVOU']) }));
  const ts16 = await vypln(p16, N.nabidkaData(zb, vb, J, 'cz', { symboly: new Set(sym16) }));
  test('E v16 bez můstků se slevou: tentýž text jako v15', ts15 === ts16 && /Cena před slevou/.test(ts16), [ts15, ts16]);
  /* starý ceník v v16: dokument jako dnes */
  const zs = zakazka(kop(MU), C354());
  const t16s = await vypln(p16, N.nabidkaData(zs, zs.varianty[0], J, 'cz', { symboly: new Set(sym16) }));
  test('E v16 se starým ceníkem: bez sekce a s jediným řádkem VÝTAHOVÁ ŠACHTA', !/POČET A ROZMĚR|CENA CELKEM/.test(t16s) && (t16s.match(/VÝTAHOVÁ ŠACHTA/g) || []).length === 1, t16s);

  console.log(`\n${ok} OK, ${fail} FAIL`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
