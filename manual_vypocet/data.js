/* ČÍSLA PRO VIZUÁLNÍ MANUÁL VÝPOČTU OCK (M7, 3. vydání, 27. 10. 2026).
 *
 * Každé číslo, které manuál ukazuje (m, kg, m², ks, hodiny, Kč), vzniká
 * TADY voláním výpočetního jádra `src/engine.js` — nic se nepočítá ručně
 * a nic se neopisuje z minulého vydání. Šablona `sablona.html` na čísla
 * jen odkazuje klíčem `{{klíč}}`; `sestav.js` je dosadí a obalí značkou
 * `data-k`, podle které `src/test_manual_vypocet.js` hotové HTML porovná
 * s jádrem.
 *
 * CENÍK: výhradně ZKUŠEBNÍ ceník z testů (`src/zkusebni_cenik.js`) —
 * kulatá smyšlená čísla, ne ceny firmy. Zkušební ceník nezná dvě věci,
 * které manuál musí ukázat; doplňuje se o ně stejně smyšlenými hodnotami
 * (seznam `DOPLNENI_CENIKU`, vypisuje se i v manuálu):
 *   – 6 h statiky opláštění (stejně jako 2. vydání),
 *   – můstky podle rozměru (#354): referenční šířka 1 600 mm a hodiny
 *     8 h + 8 h/bm, min 16 h (pravidla schváleného návrhu, nejsou to ceny),
 *     sazba montáže 500 Kč/h (= zkušební sazba montáže na stavbě);
 *     materiál bere zkušební `mustekKc` 40 000, nově jako Kč/bm.
 *
 * VZOROVÁ ŠACHTA = DEFAULT_ZADANI (VZOR v1.00), beze změny proti 2. vydání.
 * Vzorový můstek (délka 1 000 mm) se přidává JEN v příkladech kapitoly 11
 * a v řádcích můstků v kapitole 15 — základní čísla vzoru nemění.
 *
 * Spuštění samostatně: node manual_vypocet/data.js   (vypíše JSON) */
'use strict';
const fs = require('fs');
const path = require('path');

const KOREN = path.resolve(__dirname, '..');
const SRC = path.join(KOREN, 'src');

/* Smyšlené doplňky zkušebního ceníku — viz hlavička. */
const DOPLNENI_CENIKU = {
  statikaOplHod: 6,
  mustekRefSirkaMm: 1600,
  mustekMontazHodKc: 500,
  mustekMontazZakladHod: 8,
  mustekMontazBmHod: 8,
  mustekMontazMinHod: 16,
};

function nactiJadro() {
  const nacti = (f) => {
    const m = require(path.join(SRC, f));
    Object.keys(m).forEach(k => { if (global[k] === undefined) global[k] = m[k]; });
    return m;
  };
  const ZC = require(path.join(SRC, 'zkusebni_cenik.js'));
  nacti('format.js');
  nacti('preklad.js');
  const E = nacti('engine.js');
  if (global.DEFAULT_CENIK === undefined || !global.DEFAULT_CENIK.zkusebni) global.DEFAULT_CENIK = ZC.zkusebniCenik();
  const S = nacti('standard_ock.js');
  const ZK = (() => { try { nacti('sleva.js'); nacti('zaokrouhleni.js'); return nacti('zakazka.js'); } catch (e) { return null; } })();
  const J = require(path.join(SRC, 'jekly.json'));
  return { E, ZC, S, ZK, J };
}

/* Sazby, kterými ATYP předvyplní zadání (ATYP_SAZBY v ui/kalk_ock.js) —
 * čtou se ze zdrojáku, ať manuál neopisuje číslo, které se tam může změnit. */
function atypSazby() {
  const t = fs.readFileSync(path.join(SRC, 'ui', 'kalk_ock.js'), 'utf8');
  const m = t.match(/const ATYP_SAZBY = (\[[\s\S]*?\]);/);
  if (!m) throw new Error('ATYP_SAZBY v ui/kalk_ock.js nenalezeno');
  // eslint-disable-next-line no-new-func
  return new Function('return ' + m[1])();
}

/* ---------- formát: česká čísla, nezlomitelná mezera po tisících ---------- */
const NBSP = ' ';
function cz(x, des) {
  if (typeof x !== 'number' || !Number.isFinite(x)) throw new Error('není číslo: ' + x);
  const d = des == null ? 3 : des;
  let s = (Math.round((x + (x >= 0 ? 1e-9 : -1e-9)) * Math.pow(10, d)) / Math.pow(10, d)).toFixed(d);
  if (d > 0) s = s.replace(/0+$/, '').replace(/\.$/, '');
  if (s === '-0') s = '0';
  let [cela, des2] = s.split('.');
  const minus = cela.startsWith('-');
  if (minus) cela = cela.slice(1);
  cela = cela.replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
  return (minus ? '−' : '') + cela + (des2 ? ',' + des2 : '');
}
const kc = x => cz(Math.round(x), 0) + NBSP + 'Kč';

function spocitej() {
  const { E, ZC, S, J } = nactiJadro();
  const kop = x => JSON.parse(JSON.stringify(x));
  const CENIK = Object.assign(kop(E.DEFAULT_CENIK), ZC.zkusebniCenik(), DOPLNENI_CENIKU);
  const CENIK_BEZ_MUSTKU = Object.assign(kop(CENIK), { mustekRefSirkaMm: 0 });   // starý tvar (paušál za kus)

  const H = {};          // klíč → formátovaný text
  const V = {};          // klíč → syrové číslo (pro test a ladění)
  const put = (k, x, des, jak) => {
    if (Object.prototype.hasOwnProperty.call(H, k)) throw new Error('klíč dvakrát: ' + k);
    V[k] = x;
    H[k] = jak === 'kc' ? kc(x) : jak === 'tis' ? cz(Math.round(x / 1000), 0) : cz(x, des);
  };
  const txt = (k, s) => { if (Object.prototype.hasOwnProperty.call(H, k)) throw new Error('klíč dvakrát: ' + k); H[k] = String(s); V[k] = String(s); };

  const zadani = (typ, x) => {
    const z = kop(E.DEFAULT_ZADANI);
    z.typSachty = typ === 'int' ? 'interiérová' : 'exteriérová';
    z.profily = kop(E.PROFILY_VYCHOZI[z.typSachty]);
    return Object.assign(z, x || {});
  };
  const spoctiZ = (z, fixes = true, c = CENIK) => E.vypocet(z, kop(c), J, fixes);
  const spocti = (typ, x, fixes = true, c = CENIK) => spoctiZ(zadani(typ, x), fixes, c);
  const vsechnyRadky = r => [].concat(...Object.values(r.sekce), r.volitelneKatalog || []);
  const radek = (r, nazev) => vsechnyRadky(r).find(i => i.origNazev === nazev || (nazev.endsWith('*') && i.origNazev.startsWith(nazev.slice(0, -1))));
  const mn = (r, nazev) => { const i = radek(r, nazev); return i ? i.mnozstvi : null; };
  const prip = (r, key) => (r.priplatky || []).find(p => p.key === key);
  /* Množství lakování jádro samo nevydává (jen Kč obou režimů). Zjistí se
   * sondou: ceník, ve kterém má jediná sazba lakování hodnotu 1 a ostatní 0
   * — výsledek je přesně množství, které jádro tou sazbou násobí. */
  const lakSonda = (typ, klic, x) => {
    const c = kop(CENIK);
    Object.keys(c.lak).forEach(k => { if (k !== 'rezim') c.lak[k] = 0; });
    c.lak[klic] = 1;
    const r = spocti(typ, x, true, c);
    return /^tomas/.test(klic) ? r.lakovani.tomas : r.lakovani.lakovna;
  };

  /* ===================== vzorová šachta ===================== */
  const Z0 = E.DEFAULT_ZADANI;
  put('z.zdvih', Z0.zdvih); put('z.prejezd', Z0.prejezd); put('z.prohluben', Z0.prohluben);
  put('z.sirka', Z0.sirka); put('z.hloubka', Z0.hloubka); put('z.nast', Z0.nastupiste);
  put('z.sloupky', Z0.rohoveSloupky); put('z.roztec', Z0.roztec);
  put('z.vstup', Z0.cistyVstupMm, 0); put('z.ram', Z0.sirkaRamuMm, 0);
  put('z.montazZaklad', Z0.montazZakladHod); put('z.projekceZaklad', Z0.projekceZakladHod);
  const prof = (typ, k) => { const p = E.PROFILY_VYCHOZI[typ][k]; return p.dim.replace('x', '×') + '×' + String(p.tl).replace('.', ','); };
  ['sloupek', 'precnikBok', 'sloupekPortal', 'precnikPortal', 'spojka', 'lemovani'].forEach(k => {
    txt('pe.' + k, prof('exteriérová', k));
    if (E.PROFILY_VYCHOZI['interiérová'][k]) txt('pi.' + k, prof('interiérová', k));
  });

  const RE = spocti('ext'), RI = spocti('int');
  const RE1 = spocti('ext', null, false), RI1 = spocti('int', null, false);

  for (const [p, r] of [['e', RE], ['i', RI]]) {
    const o = r.odvozene, par = r.parametry;
    put(p + '.H', o.vyskaSachty); put(p + '.podlazi', o.vyskaPodlazi); put(p + '.svetla', o.svetlaVyska);
    put(p + '.prosk', o.vyskaProsklene); put(p + '.dvere', o.sirkaDveri); put(p + '.lesU', o.leseniU, 2);
    put(p + '.lesUp', o.leseniU, 3); put(p + '.lesVez', o.leseniVez);
    put(p + '.ramy', par.ramy, 0); put(p + '.portPr', par.portPricniky, 0); put(p + '.sloupkyPort', par.sloupkyPortalu, 0);
    put(p + '.kratke', par.kratkePricniky, 0); put(p + '.spojky', par.spojky, 0); put(p + '.cilky', par.pocetCilek, 0);
    /* profily */
    const pr = r.profily.rows;
    const jm = ['sloupek', 'precnik', 'sloupekPort', 'precnikPort', 'spojka'];
    pr.forEach((row, i) => {
      put(p + '.pr.' + jm[i] + '.kgm', row.j.kg); put(p + '.pr.' + jm[i] + '.m', row.m, 3);
      put(p + '.pr.' + jm[i] + '.kg', row.kg, 2);
    });
    put(p + '.pr.celkemM', r.profily.celkemM, 2);
    put(p + '.pr.celkemKg', mn(r, 'PROFILY - HLAVNÍ NOSNÉ PRVKY'), 2);
    put(p + '.pr.celkemKg3', mn(r, 'PROFILY - HLAVNÍ NOSNÉ PRVKY'), 3);
    /* plechy (spoje) */
    r.plechy.spojeRows.forEach(s => {
      put(p + '.sp.' + s.key + '.n', s.spoju, 0); put(p + '.sp.' + s.key + '.ks', s.ks, 0); put(p + '.sp.' + s.key + '.kg', s.kg, 2);
    });
    put(p + '.sp.ks', r.plechy.ks, 0); put(p + '.sp.m2', r.plechy.m2, 2);
    put(p + '.plechyKg', mn(r, 'PLECHY - HLAVNÍ KONSTRUKČNÍ PLECHY'), 2);
    put(p + '.plechyKg3', mn(r, 'PLECHY - HLAVNÍ KONSTRUKČNÍ PLECHY'), 3);
    /* díly */
    const d = r.dily;
    put(p + '.terceKs', d.terceKs, 0); put(p + '.terceKg', d.terceKg, 2);
    put(p + '.oplDvereKs', d.oplDvereKs, 0); put(p + '.oplDvereKg', d.oplDvereKg, 2); put(p + '.oplDvereM2', d.oplDvereM2, 2);
    put(p + '.podestKs', d.podestKs, 0); put(p + '.podestKg', d.podestKg, 2);
    put(p + '.prechKs', d.prechKs, 0); put(p + '.prechKg', d.prechKg, 3); put(p + '.prechKg1', d.prechKs ? d.prechKg / d.prechKs : 0, 3);
    /* zasklení */
    const zs = r.zaskleni;
    put(p + '.tab.hl', zs.rozmer.hl); put(p + '.tab.sir', zs.rozmer.sir); put(p + '.tab.vys', zs.rozmer.vys);
    put(p + '.zs.zadniKs', zs.zadni.ks, 0); put(p + '.zs.zadniM2', zs.zadni.m2, 2);
    put(p + '.zs.bocniKs', zs.bocni.ks, 0); put(p + '.zs.bocniM2', zs.bocni.m2, 2); put(p + '.zs.bocni1', zs.bocni.m2 / 2, 2);
    put(p + '.zs.svetlikyM2', zs.svetliky.m2, 2); put(p + '.zs.nad1', zs.svetliky.ks ? zs.svetliky.m2 / zs.svetliky.ks : 0, 2);
    put(p + '.zs.mezera', zs.vypln.mezera, 2);
    put(p + '.opl.celkem', r.oplasteni.plochaCelkem, 2); put(p + '.opl.celkem3', r.oplasteni.plochaCelkem, 3);
    put(p + '.matBoky', mn(r, 'MATERIÁL boční + zadní stěna*'), 2); put(p + '.matBoky3', mn(r, 'MATERIÁL boční + zadní stěna*'), 3);
    put(p + '.matCelo', mn(r, p === 'e' ? 'MATERIÁL VSG 4.4.1' : 'MATERIÁL VSG 4.4.2'), 2);
    put(p + '.matCelo3', mn(r, p === 'e' ? 'MATERIÁL VSG 4.4.1' : 'MATERIÁL VSG 4.4.2'), 3);
    put(p + '.praceOpl', mn(r, 'PRÁCE OPLÁŠTĚNÍ'), 2); put(p + '.praceOpl3', mn(r, 'PRÁCE OPLÁŠTĚNÍ'), 3);
    /* spojovací materiál */
    r.spojovaci.rows.forEach((s, i) => put(p + '.sm.' + i, s.ks, 0));
    put(p + '.nytu', r.spojovaci.nytovaniKs, 0);
    /* montáž */
    const hn = r.montaz.hodinyNavic;
    Object.keys(hn).forEach(k => put(p + '.hn.' + k, hn[k], 4));
    put(p + '.hn.celkem', r.montaz.hodinyNavicCelkem, 4); put(p + '.hn.celkem2', r.montaz.hodinyNavicCelkem, 2);
    put(p + '.hod1', r.montaz.hod1osoba, 2); put(p + '.hodCelkem', r.montaz.hodCelkem, 2); put(p + '.hodCelkem3', r.montaz.hodCelkem, 3);
    put(p + '.dni', r.montaz.dni, 0);
    put(p + '.projekce', mn(r, 'DÍLENSKÁ DOKUMENTACE'));
    put(p + '.statika', mn(r, 'STATICKÉ POSOUZENÍ')); put(p + '.statikaOpl', mn(r, 'STATICKÉ POSOUZENÍ OPLÁŠTĚNÍ'));
    put(p + '.stavbyved', mn(r, 'PRÁCE STAVBYVEDOUCÍHO'));
    /* souhrn */
    const so = r.souhrn, ss = r.souctySekci;
    ['hrubaOck', 'oplasteni', 'volitelne', 'rezie'].forEach(s => {
      put(p + '.sek.' + s + '.n', ss[s].naklad, null, 'kc'); put(p + '.sek.' + s + '.m', ss[s].marze, null, 'kc');
      put(p + '.sek.' + s + '.c', ss[s].sMarzi, null, 'kc'); put(p + '.sek.' + s + '.t', ss[s].naklad, null, 'tis');
    });
    put(p + '.rez.n', r.rezerva.naklad, null, 'kc'); put(p + '.rez.m', r.rezerva.marze, null, 'kc'); put(p + '.rez.c', r.rezerva.sMarzi, null, 'kc');
    put(p + '.zakNaklad', so.zakladNaklad, null, 'kc'); put(p + '.zakMarze', so.zakladMarze, null, 'kc');
    put(p + '.zakPred', so.zakladNaklad + so.zakladMarze, null, 'kc');
    put(p + '.zakCena', so.zakladCena, null, 'kc'); put(p + '.dph', so.zakladDph, null, 'kc'); put(p + '.sDph', so.zakladSDph, null, 'kc');
    put(p + '.pripCena', so.priplatkyCena, null, 'kc');
    put(p + '.zakNakladT', so.zakladNaklad, null, 'tis'); put(p + '.zakMarzeT', so.zakladMarze, null, 'tis');
    put(p + '.zakCenaT', so.zakladCena, null, 'tis'); put(p + '.dphT', so.zakladDph, null, 'tis'); put(p + '.sDphT', so.zakladSDph, null, 'tis');
    put(p + '.zaokr', so.zakladCena - (so.zakladNaklad + so.zakladMarze), null, 'kc');
  }
  put('c.marze', CENIK.marze * 100, 0); put('c.dph', CENIK.dph * 100, 0); put('c.atypPrir', CENIK.atypPrirazka * 100, 0);
  put('c.statikaHod', CENIK.statikaHod); put('c.statikaOplHod', CENIK.statikaOplHod); put('c.stavbyvedHod', CENIK.stavbyvedouciHod);
  put('c.listyProj', CENIK.zaskleniListyProjHod);

  /* Mezivýsledky vzorců, které manuál ukazuje v dosazení (z výsledků jádra). */
  put('v.sirkaLes', Z0.sirka + 0.5); put('v.ram1', 2 * Z0.hloubka + Z0.sirka);
  put('v.nadVys', RE.odvozene.svetlaVyska - 2.3); put('v.prosk3', RE.odvozene.vyskaProsklene - 3);
  /* počet pravidel kontroly před nabídkou */
  { const K = require(path.join(SRC, 'kontroly.js')); put('k.pocet', K.kontrolyPravidla().length, 0); }

  /* exteriérové prvky */
  put('e.strecha', mn(RE, 'ZASTŘEŠENÍ ŠACHTY (EXT)'), 3); put('e.strecha2', mn(RE, 'ZASTŘEŠENÍ ŠACHTY (EXT)'), 2);
  put('e.fasada', mn(RE, 'OPLECHOVÁNÍ K FASÁDĚ (EXT)'), 2);
  put('e.lem', mn(RE, 'PROFILY - LEMOVÁNÍ ŠACHTY (EXT)'), 2); put('e.lem3', mn(RE, 'PROFILY - LEMOVÁNÍ ŠACHTY (EXT)'), 3);
  put('e.lemM', 3 * RE.odvozene.vyskaSachty, 3);
  put('e.lemKgm', mn(RE, 'PROFILY - LEMOVÁNÍ ŠACHTY (EXT)') / (3 * RE.odvozene.vyskaSachty), 2);
  put('e.tmeleni', mn(RE, 'TMELENÍ (MAT. + PRÁCE) (EXT)'), 2); put('e.tmeleni3', mn(RE, 'TMELENÍ (MAT. + PRÁCE) (EXT)'), 3);
  put('e.mrizka', mn(RE, 'VĚTRACÍ MŘÍŽKA (EXT)'), 0);
  put('e.haky', mn(RE, 'HÁKY NA MYTÍ ŠACHTY (EXT)'), 0);
  put('e.sokl', prip(RE, 'sokl').mnozstvi, 2);
  put('e.terceM2', lakSonda('ext', 'lakovnaM2') - RE.plechy.m2 - lakSonda('ext', 'tomasOplechM2'), 3);
  put('e.lak.profM2', lakSonda('ext', 'tomasProfilM2'), 2); put('e.lak.profBm', lakSonda('ext', 'lakovnaProfilBm'), 2);
  put('e.lak.listyBm', lakSonda('ext', 'tomasListaBm'), 2); put('e.lak.oplechM2', lakSonda('ext', 'tomasOplechM2'), 2);
  put('e.lak.plechKs', lakSonda('ext', 'tomasPlechKs'), 0); put('e.lak.tercKs', lakSonda('ext', 'tomasTercKs'), 0);
  put('e.lak.kc', RE.lakovani.tomas, null, 'kc'); put('e.lak.kcL', RE.lakovani.lakovna, null, 'kc');
  put('i.lak.kc', RI.lakovani.tomas, null, 'kc');
  put('i.spodniRam', mn(RI, 'PRÁCE ZÁMEČNÍKA - SPODNÍ RÁM (INT)'), 0);
  put('i.cilkyKs', mn(RI, 'PRÁCE ZÁMEČNÍKA - ČÍLKA (INT)'), 0); put('i.cilkyKg', RI.parametry.pocetCilek * 0.12, 2);
  put('i.zabradli', mn(RI, 'ÚPRAVY/NAPOJENÍ ZÁBRADLÍ (INT)'), 0);

  /* příplatky (vzor) */
  for (const [p, r] of [['e', RE], ['i', RI]]) {
    (r.priplatky || []).forEach(x => put(p + '.pp.' + x.key, x.mnozstvi, 2));
    put(p + '.pp.pocet', r.priplatky.length, 0);
  }

  /* Model 1 bez rezerv */
  put('m1.e.zakCena', RE1.souhrn.zakladCena, null, 'kc'); put('m1.i.zakCena', RI1.souhrn.zakladCena, null, 'kc');

  /* ===================== varianty ===================== */
  /* lišty (mezi příčníky) */
  const RL = spocti('ext', { zaskleni: 'mezi příčníky' });
  put('l.tab.hl', RL.zaskleni.rozmer.hl); put('l.tab.sir', RL.zaskleni.rozmer.sir); put('l.tab.vys', RL.zaskleni.rozmer.vys);
  put('l.listyKs', RL.dily.listyKs, 0); put('l.listyBm', RL.dily.listyBm, 2); put('l.listyKg', RL.dily.listyKg, 2);
  put('l.projekce', mn(RL, 'DÍLENSKÁ DOKUMENTACE'));
  put('l.zakCena', RL.souhrn.zakladCena, null, 'kc');

  /* předsazený portál */
  const RP = spocti('ext', { typPortalu: 'předsazený' });
  put('ps.sloupkyM', RP.profily.rows[2].m - RE.profily.rows[2].m, 2);
  put('ps.spoje', RP.plechy.spojeRows.find(s => s.key === 'predsazene').spoju, 0);
  put('ps.hod', RP.montaz.hodinyNavic.portaly, 2);

  /* výplň nad dveřmi a světlíky na bocích — tabulka variant (kap. 5) */
  const varVypln = [
    ['vz', {}],
    ['np', { nadDvermi: 'plech' }],
    ['ss', { nadDvermi: 'sklo', bokyDveri: 'sklo', svetlikyBokyKs: '' }],
    ['sst', { nadDvermi: 'sklo', bokyDveri: 'stavba', svetlikyBokyKs: '' }],
    ['pp', { nadDvermi: 'plech', bokyDveri: 'plech', svetlikyBokyKs: '' }],
  ];
  for (const [k, x] of varVypln) {
    const r = spocti('ext', x);
    const zs = r.zaskleni;
    put('vv.' + k + '.skloA', zs.svetliky.m2 + zs.svetlikyBoky.m2, 2);
    put('vv.' + k + '.plech', zs.vypln.nadPlechM2 + zs.vypln.bokyPlechM2, 2);
    put('vv.' + k + '.oplKg', mn(r, 'PLECHY - OPLECH. DVEŘÍ A PODEST (MATERIÁL)'), 2);
    put('vv.' + k + '.oplHod', mn(r, 'PLECHY - OPLECH. DVEŘÍ A PODEST (PRÁCE)'), 0);
    put('vv.' + k + '.sloupky', r.parametry.sloupkyPortalu, 0);
    put('vv.' + k + '.terce', r.dily.terceKs, 0);
    put('vv.' + k + '.hod', r.montaz.hodinyNavic.svetlikyBoky + r.montaz.hodinyNavic.svetlik, 2);
    if (k === 'ss') {
      put('vv.ss.N', zs.vypln.bokyKs, 0); put('vv.ss.kratke', r.parametry.kratkePricniky, 0);
      put('vv.ss.sloupM', r.profily.rows[2].m, 2); put('vv.ss.bokyM2', zs.vypln.bokyM2, 2);
    }
  }
  /* rozložení po dveřích */
  for (const N of [12, 9, 6]) {
    const r = spocti('ext', { bokyDveri: 'sklo', svetlikyBokyKs: N });
    const v = r.zaskleni.vypln;
    put('rz.' + N + '.dva', v.dvereDva, 0); put('rz.' + N + '.jeden', v.dvereJeden, 0);
    put('rz.' + N + '.m2', v.bokyM2, 2); put('rz.' + N + '.sirka', v.sirkaPredpocitana * 1000, 0);
  }
  { const r = spocti('ext', { bokyDveri: 'sklo', svetlikyBokyKs: 6, svetlikyBokySirkaMm: 400 });
    put('rs.N', 6, 0); put('rs.sirka', 400, 0); put('rs.m2', r.zaskleni.vypln.bokyM2, 2); }

  /* průchozí šachta: A 4×, C 2×, 4 patra */
  { const r = spocti('ext', { pruchoziSachta: true, nastupisteA: 4, nastupisteC: 2, patra: 4 });
    const zb = r.oplasteni.zakladSten;
    put('pr.A', zb.A, 2); put('pr.C', zb.C, 2); put('pr.B', zb.B, 2);
  }

  /* opláštění po stěnách: B = Cetris od dna prohlubně do 3 m, nad ním dvojsklo; D bez */
  { const z = zadani('ext');
    z.oplasteni = { rezim: 'poStenach', steny: E.oplasteniStenyVychozi(z, CENIK) };
    z.oplasteni.steny.B = { odM: -z.prohluben, pasy: [{ typ: 'C.cetrisKc', doM: 3 }, { typ: 'C.skloBokyKc', doM: null }] };
    z.oplasteni.steny.D = { odM: 0, pasy: [{ typ: 'C.bezKc', doM: null }] };
    const typBez = E.OPLASTENI_TYPY.find(t => /bez/i.test(t.nazev));
    z.oplasteni.steny.D.pasy[0].typ = typBez.id;
    const r = spoctiZ(z);
    const pasy = (r.oplasteni.pasy || []).filter(p => p.stena === 'B');
    const cet = pasy.find(p => p.typ === 'C.cetrisKc'), dvo = pasy.find(p => p.typ === 'C.skloBokyKc');
    put('ps2.cetris', cet.m2, 2); put('ps2.dvojsklo', dvo.m2, 2);
    put('ps2.celkem', r.oplasteni.plochaCelkem, 2);
    txt('ps2.bezNazev', typBez.nazev);
  }
  /* prosklená prohlubeň (zkratka) */
  { const z = zadani('ext'); E.oplasteniProhlubenNastav(z, CENIK, true);
    put('pp2.celkem', spoctiZ(z).oplasteni.plochaCelkem, 2); }
  /* přepis plochy boků na 90 m² */
  { const z = zadani('ext'); z.mnozstviPrepis = {}; z.mnozstviPrepis[radek(RE, 'MATERIÁL boční + zadní stěna*').origNazev] = 90;
    const r = spoctiZ(z); put('pz.prace', mn(r, 'PRÁCE OPLÁŠTĚNÍ'), 2); put('pz.boky', 90, 0); }

  /* ATYP: předvyplnění jako tlačítko ATYP (zakazka.js atypHodnoty + ATYP_SAZBY) */
  const AS = atypSazby().reduce((m, s) => { m[s.klic] = s.nahrada; return m; }, {});
  const sazba = k => (+CENIK[k] > 0 ? +CENIK[k] : AS[k]);
  const atypZ = (typ) => {
    const z = zadani(typ);
    const navic = spoctiZ(z).montaz.hodinyNavicCelkem;
    Object.assign(z, { atyp: true, rezervaProfilyPct: 0.30, rezervaPlechyPct: 0.30,
      rezervaZakladPct: sazba('atypRezervaZakladPct'), rezervaPriplatkyPct: sazba('atypRezervaPriplatkyPct'),
      zamecnikAtypKc: sazba('atypZamecnikKc'),
      montazAtypHod: Math.round(sazba('atypMontazPct') * (z.montazZakladHod + navic)),
      projekceAtypHod: Math.round(sazba('atypProjekcePct') * z.projekceZakladHod) });
    return z;
  };
  { const z = atypZ('ext');
    const r = spoctiZ(z), r1 = spoctiZ(z, false);
    put('at.rezProf', z.rezervaProfilyPct * 100, 0); put('at.rezZaklad', z.rezervaZakladPct * 100, 0);
    put('at.rezPrip', z.rezervaPriplatkyPct * 100, 0); put('at.zamecnik', z.zamecnikAtypKc, null, 'kc');
    put('at.montazHod', z.montazAtypHod, 0); put('at.projHod', z.projekceAtypHod, 0);
    put('at.montazPct', sazba('atypMontazPct') * 100, 0); put('at.projPct', sazba('atypProjekcePct') * 100, 0);
    put('at.profKg', mn(r, 'PROFILY - HLAVNÍ NOSNÉ PRVKY'), 2); put('at.plechKg', mn(r, 'PLECHY - HLAVNÍ KONSTRUKČNÍ PLECHY'), 2);
    put('at.rezerva', r.rezerva.sMarzi, null, 'kc'); put('at.rezervaN', r.rezerva.naklad, null, 'kc');
    put('at.hod1', r.montaz.hod1osoba, 2); put('at.hodCelkem', r.montaz.hodCelkem, 2);
    put('at.projekce', mn(r, 'DÍLENSKÁ DOKUMENTACE'), 0);
    const pr = radek(r, 'PŘIRÁŽKA ZA ATYP*');
    put('at.prirazka', pr ? pr.naklad : 0, null, 'kc');
    const reziePred = r.sekce.rezie.filter(i => !/^PŘIRÁŽKA ZA ATYP/.test(i.origNazev)).reduce((s, i) => s + i.naklad, 0);
    put('at.rezieZaklad', reziePred, null, 'kc');
    put('at.zakCena', r.souhrn.zakladCena, null, 'kc'); put('at.pripCena', r.souhrn.priplatkyCena, null, 'kc');
    put('m1.at.zakCena', r1.souhrn.zakladCena, null, 'kc'); put('m1.at.pripCena', r1.souhrn.priplatkyCena, null, 'kc');
    put('m1.at.rozdilPct', (r1.souhrn.zakladCena / r.souhrn.zakladCena - 1) * 100, 1);
    put('m1.at.prip', r1.souhrn.priplatkyCena, null, 'kc');
  }

  /* ===================== MŮSTKY (#354) ===================== */
  txt('mu.refSirka', cz(CENIK.mustekRefSirkaMm, 0)); V['mu.refSirka'] = CENIK.mustekRefSirkaMm;
  put('mu.cenaBm', CENIK.mustekKc, null, 'kc'); put('mu.hodKc', CENIK.mustekMontazHodKc, null, 'kc');
  put('mu.zakladHod', CENIK.mustekMontazZakladHod); put('mu.bmHod', CENIK.mustekMontazBmHod); put('mu.minHod', CENIK.mustekMontazMinHod);
  put('mu.delkaVych', E.MUSTEK_DELKA_VYCHOZI_MM, 0);
  const mustekR = (x, typ = 'ext', c = CENIK) => spocti(typ, Object.assign({ mustkyKs: 1, mustekHloubkaMm: 1000 }, x || {}), true, c);
  const MAT = 'MŮSTKY VČ. ZÁBRADLÍ – MATERIÁL', MONT = 'MONTÁŽ MŮSTKŮ', PAUS = 'MŮSTKY MEZI BUDOVOU A OCK';
  { const r = mustekR();
    const m = r.mustky;
    put('mu.sirka', m.sirkaMm, 0); put('mu.delka', m.delkaMm, 0);
    put('mu.bmRef', m.bmRef, 4); put('mu.hodKs', m.hodKs, 2);
    put('mu.matKs', m.materialKs, null, 'kc'); put('mu.montKs', m.montazKs, null, 'kc');
    put('mu.matMn', mn(r, MAT), 4); put('mu.montMn', mn(r, MONT), 2);
    put('mu.naklad', radek(r, MAT).naklad + radek(r, MONT).naklad, null, 'kc');
    put('mu.cena', (radek(r, MAT).sMarzi + radek(r, MONT).sMarzi), null, 'kc');
    put('mu.zakCena', r.souhrn.zakladCena, null, 'kc');
    put('mu.zakRozdil', r.souhrn.zakladCena - RE.souhrn.zakladCena, null, 'kc');
    put('mu.strecha', r.strecha.m2, 3);
    /* interiér: tentýž můstek */
    const ri = mustekR(null, 'int');
    put('mu.int.matMn', mn(ri, MAT), 4); put('mu.int.montMn', mn(ri, MONT), 2);
  }
  { const r = mustekR({ mustekHloubkaMm: '' });          // prázdná délka → 1 000 mm
    put('mu.prazdna.delka', r.mustky.delkaMm, 0); }
  { const r = mustekR({ mustekHloubkaMm: 1500 });
    put('mu.d15.hod', r.mustky.hodKs, 2); put('mu.d15.bm', r.mustky.bmRef, 4);
    put('mu.d15.naklad', radek(r, MAT).naklad + radek(r, MONT).naklad, null, 'kc'); }
  { const r = mustekR({ mustekHloubkaMm: 600 });
    put('mu.d06.hod', r.mustky.hodKs, 2); put('mu.d06.bm', r.mustky.bmRef, 4); put('mu.d06.naklad', radek(r, MAT).naklad + radek(r, MONT).naklad, null, 'kc'); }
  { const ks = RE.odvozene && (E.nastupisteCelkem(Z0) - 1);    // můstek ve všech nadzemních nástupištích
    const r = mustekR({ mustkyKs: ks });
    put('mu.n.ks', ks, 0); put('mu.n.matMn', mn(r, MAT), 4); put('mu.n.montMn', mn(r, MONT), 2);
    put('mu.n.naklad', radek(r, MAT).naklad + radek(r, MONT).naklad, null, 'kc');
    put('mu.n.strechaMustek', r.strecha.mustekM2, 3); put('mu.n.strecha', r.strecha.m2, 3);
    put('mu.n.med', prip(r, 'medStrecha').mnozstvi, 3);
    put('mu.n.prechodove', E.nastupisteCelkem(Z0), 0);
  }
  { const r = mustekR({ mustkyKs: 2 }, 'ext', CENIK_BEZ_MUSTKU);   // starý ceník: paušál × kusy
    put('mu.stary.ks', mn(r, PAUS), 0); put('mu.stary.naklad', radek(r, PAUS).naklad, null, 'kc'); }
  put('mu.std.delkaMax', S.STANDARD_VYCHOZI.mustek.hloubkaMaxMm, 0);

  /* ===================== standard OCK (výchozí znění) ===================== */
  const SV = S.STANDARD_VYCHOZI;
  SV.exterier.profily.forEach((p, i) => { txt('st.e' + i + '.profil', p.profil.replace('x', '×'));
    put('st.e' + i + '.H', p.vyskaMaxM, 0); put('st.e' + i + '.s', p.sirkaMaxMm, 0); put('st.e' + i + '.h', p.hloubkaMaxMm, 0); });
  SV.interier.profily.forEach((p, i) => { txt('st.i' + i + '.profil', p.profil.replace('x', '×'));
    put('st.i' + i + '.H', p.vyskaMaxM, 0); put('st.i' + i + '.s', p.sirkaMaxMm, 0); put('st.i' + i + '.h', p.hloubkaMaxMm, 0); });
  put('st.sloupky', SV.exterier.sloupkyStandard, 0);

  /* ===================== kapitola 15: všechny řádky ===================== */
  const RM = mustekR();
  const radky15 = [];
  const R15 = (sekce, nazev, mnoz, jedn, sazba, opts) => radky15.push({ sekce, nazev, mnoz, jedn, sazba, opts: opts || {} });
  /* `opts.vzor` = jen v příkladu se vzorovým můstkem */
  R15('HRUBÁ OCK', 'PROFILY - HLAVNÍ NOSNÉ PRVKY', 'Σ délek profilů × kg/m × (1 + rezerva)', 'kg', 'Profily – hlavní nosné prvky');
  R15('HRUBÁ OCK', 'PROFILY - MONTÁŽNÍ NOSNÍK', '1', 'ks', 'Montážní nosník');
  R15('HRUBÁ OCK', 'PROFILY - LEMOVÁNÍ ŠACHTY (EXT)', '3 × H × kg/m lemování', 'kg', 'Lemování šachty (ext)');
  R15('HRUBÁ OCK', 'PLECHY - HLAVNÍ KONSTRUKČNÍ PLECHY', 'Σ kg spojů + čílka × (1 + rezerva)', 'kg', 'Plechy – ext / int');
  R15('HRUBÁ OCK', 'PLECHY - ZASKLENÍ (TERČE/LIŠTY)', 'terče × 0,15 + lišty bm × 0,255', 'kg', 'Plechy – ext / int');
  R15('HRUBÁ OCK', 'PLECHY - OPLECH. DVEŘÍ A PODEST (MATERIÁL)', 'oplech. dveří + podesty + plech u dveří × 8,5 kg/m²', 'kg', 'Plechy – ext / int');
  R15('HRUBÁ OCK', 'PLECHY - OPLECH. DVEŘÍ A PODEST (PRÁCE)', 'nást × (3 + plech nad dveřmi) + dveře s plechovými boky', 'h', 'Oplechování – práce');
  R15('HRUBÁ OCK', 'PLECHY - OPLECHOVÁNÍ OSTATNÍ (MATERIÁL)', 'ze zadání (výchozí z ceníku)', 'kg', 'Plechy – ext / int');
  R15('HRUBÁ OCK', 'PLECHY - OPLECHOVÁNÍ OSTATNÍ (PRÁCE)', 'ze zadání (výchozí z ceníku)', 'h', 'Oplechování – práce');
  R15('HRUBÁ OCK', 'SPOJOVACÍ MATERIÁL', '1 × Σ ks × cena (12 druhů)', 'soubor', 'Spojovací materiál');
  R15('HRUBÁ OCK', 'PRÁCE ZÁMEČNÍKA - SPODNÍ RÁM (INT)', '1', 'ks', 'Zámečník – spodní rám (int)');
  R15('HRUBÁ OCK', 'PRÁCE ZÁMEČNÍKA - NÝTOVÁNÍ', 'M10 + NordLock + M8 + šrouby M6', 'nýt', 'Zámečník – nýtování');
  R15('HRUBÁ OCK', 'PRÁCE ZÁMEČNÍKA - ČÍLKA (INT)', 'počet čílek', 'ks', 'Zámečník – čílka (int)');
  R15('HRUBÁ OCK', 'PRÁCE ZÁMEČNÍKA - OSTATNÍ (ATYP)', '1 × částka ze zakázky', 'ks', 'částka ze zakázky (ATYP)');
  R15('HRUBÁ OCK', 'LAKOVÁNÍ (ŠACHTA, PLECHY, ZASKLENÍ, OPLECHOVÁNÍ)', '1 × součet režimu lakování', 'soubor', 'Lakovna B / lakovna');
  R15('HRUBÁ OCK', 'MONTÁŽ NA STAVBĚ', '(základ + navíc + ATYP) × 4', 'h', 'Montáž na stavbě');
  R15('HRUBÁ OCK', 'VĚTRACÍ MŘÍŽKA (EXT)', '2', 'ks', 'Větrací mřížka (ext)');
  R15('HRUBÁ OCK', 'INTERNÍ TRANSPORT', '2', 'cesta', 'Interní transport');
  R15('HRUBÁ OCK', 'ZASTŘEŠENÍ ŠACHTY (EXT)', '(š + 0,2) × (hl + 0,1) + střecha nad nejvyšším můstkem', 'm²', 'Zastřešení šachty (ext)');
  R15('HRUBÁ OCK', 'OPLECHOVÁNÍ K FASÁDĚ (EXT)', '2 × (H − prohlubeň)', 'bm', 'Oplechování k fasádě (ext)');
  R15('HRUBÁ OCK', MAT, 'ks × délka × šířka šachty / ref. šířka', 'bm', 'Můstek … vč. zábradlí – materiál (Kč/bm)', { vzor: true });
  R15('HRUBÁ OCK', MONT, 'ks × max(min; základ + h/bm × délka)', 'h', 'Montáž můstků (Kč/hod)', { vzor: true });
  R15('OPLÁŠTĚNÍ', 'MATERIÁL boční + zadní stěna*', 'plocha B + C + D (+ světlíky „materiál opláštění")', 'm²', 'Izolační dvojsklo (ext) / VSG (int)', { nazev: 'MATERIÁL boční + zadní stěna' });
  R15('OPLÁŠTĚNÍ', 'MATERIÁL VSG*', 'plocha A (skleněné světlíky)', 'm²', 'Sklo VSG 4.4.1 / 4.4.2', { nazev: 'MATERIÁL VSG 4.4.1 / 4.4.2' });
  R15('OPLÁŠTĚNÍ', 'PRÁCE OPLÁŠTĚNÍ', 'celková plocha (bez „bez")', 'm²', 'Práce opláštění');
  R15('OPLÁŠTĚNÍ', 'PLASTOVÉ KOTVY', '1 terče / 0 lišty', 'soubor', 'Plastové kotvy');
  R15('OPLÁŠTĚNÍ', 'TMELENÍ (MAT. + PRÁCE) (EXT)', 'celková plocha', 'm²', 'Tmelení (ext)');
  R15('OPLÁŠTĚNÍ', 'STŘÍŠKA NAD NÁSTUPIŠTĚ', 'počet ze zadání (jen > 0)', 'ks', 'Stříška nad vstupem');
  R15('OPLÁŠTĚNÍ', 'CESTOVNÍ NÁKLADY', '1', '', 'Cestovní náklady');
  R15('OPLÁŠTĚNÍ', 'ČIŠTĚNÍ', '1', '', 'Čištění');
  R15('VOLITELNÉ (když jsou zaškrtnuté)', 'PŘECHODOVÉ PLECHY - NEREZ', 'nást × 8 500 × 0,1 × otvor × 0,002', 'kg', 'Přechodové plechy – nerez');
  R15('VOLITELNÉ (když jsou zaškrtnuté)', 'PŘECHODOVÉ PLECHY - NEREZ (MONTÁŽ)', 'nást', 'ks', 'Přechodové plechy – montáž');
  R15('VOLITELNÉ (když jsou zaškrtnuté)', 'LEŠENÍ - vnitřní', 'H + fixní část', 'm', 'Lešení vnitřní + fix');
  R15('VOLITELNÉ (když jsou zaškrtnuté)', 'LEŠENÍ - vnější', 'U + fixní část', 'm²', 'Lešení vnější + fix', { prip: 'leseniVnejsi' });
  R15('VOLITELNÉ (když jsou zaškrtnuté)', 'LEŠENÍ - dokončení hlavy šachty', 'přejezd', 'm', 'Lešení – dokončení hlavy', { prip: 'leseniHlava' });
  R15('VOLITELNÉ (když jsou zaškrtnuté)', 'HÁKY NA MYTÍ ŠACHTY (EXT)', '3', 'ks', 'Háky na mytí (ext)');
  R15('VOLITELNÉ (když jsou zaškrtnuté)', 'ÚPRAVY/NAPOJENÍ ZÁBRADLÍ (INT)', 'nást', 'ks', 'Úpravy zábradlí (int)');
  R15('VOLITELNÉ (když jsou zaškrtnuté)', 'OPLECHOVÁNÍ SOKLU PROHLUBNĚ (EXT)', 'š + 2 × hl', 'bm', 'Sokl prohlubně (ext)', { prip: 'sokl' });
  R15('REŽIE', 'ZAMĚŘENÍ 3D SKENEREM', '1', '', 'Zaměření 3D skenerem');
  R15('REŽIE', 'VÝSTUP ZE ZAMĚŘENÍ PRO ZÁKAZNÍKA', '1 / 0,5', '', 'Výstup ze zaměření');
  R15('REŽIE', 'ENGINEERING', 'ks ze zadání (jen > 0)', 'ks', 'Engineering');
  R15('REŽIE', 'DÍLENSKÁ DOKUMENTACE', 'projekce základ + ATYP (+ 4 h lišty)', 'h', 'Dílenská dokumentace');
  R15('REŽIE', 'STATICKÉ POSOUZENÍ', 'hodin z ceníku', 'h', 'Statické posouzení – sazba');
  R15('REŽIE', 'STATICKÉ POSOUZENÍ OPLÁŠTĚNÍ', 'hodin z ceníku (jen s opláštěním)', 'h', 'Statické posouzení – sazba');
  R15('REŽIE', 'REŽIE KANCELÁŘE', '1', '', 'Režie kanceláře');
  R15('REŽIE', 'PRÁCE STAVBYVEDOUCÍHO', 'hodin z ceníku', 'h', 'Stavbyvedoucí – sazba');
  R15('REŽIE', 'PŘEKLADY CZ→DE', '1 (jen zahraniční řada)', '', 'Překlady CZ→DE', { pomlcka: true });
  R15('REŽIE', 'PŘIRÁŽKA ZA ATYP*', 'sazba × náklad REŽIE', 'Kč', 'ATYP: přirážka (%)', { nazev: 'PŘIRÁŽKA ZA ATYP' });
  const tab15 = [];
  let posl = '';
  radky15.forEach((x, i) => {
    if (x.sekce !== posl) { tab15.push(`<tr class="sek"><td colspan="6">${x.sekce}</td></tr>`); posl = x.sekce; }
    const bunka = (r, strana) => {
      let q = null;
      if (x.opts.pomlcka) q = null;
      else if (x.opts.vzor) q = mn(strana === 'e' ? RM : mustekR(null, 'int'), x.nazev);
      else {
        q = mn(r, x.nazev);
        if (q == null && x.opts.prip && prip(r, x.opts.prip)) q = prip(r, x.opts.prip).mnozstvi;
      }
      if (q == null || q === 0 && /ENGINEERING|STŘÍŠKA/.test(x.nazev)) return '—';
      const k = 't15.' + i + '.' + strana;
      put(k, q, 3);
      return `{{${k}}}`;
    };
    const nazev = (x.opts.nazev || x.nazev) + (x.opts.vzor ? ' <span class="znacka nove">nové</span>' : '');
    tab15.push(`<tr><td>${nazev}</td><td>${x.mnoz}</td><td>${x.jedn}</td><td>${x.sazba}</td>`
      + `<td class="n">${bunka(RE, 'e')}${x.opts.vzor ? '*' : ''}</td><td class="n">${bunka(RI, 'i')}${x.opts.vzor ? '*' : ''}</td></tr>`);
  });

  /* ===================== meta ===================== */
  const verze = fs.readFileSync(path.join(KOREN, 'verze.txt'), 'utf8').trim();
  const meta = { verze, doplneniCeniku: DOPLNENI_CENIKU };
  return { hodnoty: H, cisla: V, bloky: { tab15: tab15.join('\n') }, meta };
}

module.exports = { spocitej, cz, kc, DOPLNENI_CENIKU };

if (require.main === module) {
  const d = spocitej();
  process.stdout.write(JSON.stringify({ meta: d.meta, hodnoty: d.hodnoty }, null, 1) + '\n');
}
