/* ============================================================
 * FUZZ INVARIANTŮ VÝPOČETNÍHO JÁDRA — OCK i PROJ (A1, 25. 9. 2026)
 *
 * PROČ TAHLE SADA EXISTUJE. Hloubkový test 24. 9. 2026 (v24.9.2) chytil
 * několik chyb jádra jen proto, že si někdo ručně naklikal zadání, které
 * v žádné pevné sadě nebylo: boční světlíky počítané dvakrát (N45),
 * dva pásy „jiné" téhož názvu slité do jednoho řádku (N52), lešení
 * přepsané na 0 m, které dál stálo fixní částku (N51). Ruční fuzz z toho
 * kola se dělal jednorázovými skripty mimo repozitář — a jednorázový skript
 * nikdo příště nespustí.
 *
 * Tahle sada generuje DETERMINISTICKY (pevné semínko, žádná náhoda bez
 * semínka) zhruba dva tisíce zadání OCK i PROJ — běžná i hraniční (nulové
 * rozměry, nula pater, prázdné přepisy, chybějící klíč ceníku, obě řady
 * ceníku, oba modely výpočtu, standard i opláštění po stěnách) — a nad
 * každým ověřuje INVARIANTY, tedy vztahy, které musí platit pro jakékoli
 * zadání, ne konkrétní částky:
 *
 *   I1  žádné NaN / Infinity / undefined v souhrnu, v součtech ani v řádcích;
 *   I2  součet řádků = součet sekce = souhrn; rezerva podle modelu
 *       (Model 2 z nákladů, Model 1 z ceny s přirážkou jako v předloze);
 *   I3  základní cena a příplatky zaokrouhlené nahoru na tisíce;
 *   I4  DPH = základ × sazba; zahraniční řada bez výslovné sazby = 0 %;
 *   I5  přepnutí volitelné položky změní součet přesně o její cenu
 *       a položka se přesune mezi základní cenou a příplatky;
 *   I6  vyřazení řádku (`nepocitat`) ubere přesně jeho cenu, nic jiného;
 *   I7  zapnutí režimu „po stěnách" s výchozími stěnami nehne ani haléřem
 *       (N46: „stejné pravidlo platí i po stěnách") a změna typu na čelní
 *       stěně (A) nesáhne na B, C, D ani na ostatní sekce;
 *   I8  průchozí šachta: zrcadlení A ↔ C při stejném skle dává stejnou cenu
 *       a zrcadlové plochy stěn; rozdělení nástupišť mezi A a C při stejném
 *       součtu nemění plochu světlíků ani plného opláštění (viz N46 níž);
 *       stěna bez dveří je opláštěná celá, stěna s dveřmi v každém patře
 *       má jen světlíky (pravidlo nástupišť, N45/N46);
 *   I9  řádky mají jedinečný klíč (název v sekci, klíč příplatku, klíč
 *       volitelné položky) — N52;
 *   I10 koncová cena OCK: základ − sleva + zaokrouhlení = cena, na haléř;
 *   I11 přepis množství na 0 znamená 0 Kč i u lešení s fixní částí (N51);
 *   P1–P5 totéž pro projekci: součty sekcí a souhrnu, vyřazená položka,
 *       „prázdno není nula" u přepisů, rozpad ceny po slevě a zaokrouhlení.
 *
 * N46 — CO SE HLÁSÍ A CO NE (rozhodnutí J. V. 24. 9. 2026 večer, v24.9.6).
 * Zadání: „Nástupiště je všude tam, kde jsou dveře. Kde dveře nejsou, je
 * provedeno opláštění zvoleným materiálem po celé ploše." Zrcadlová šachta
 * proto při stejném skle stojí stejně (tvrdý invariant). PŘESUN nástupišť
 * mezi A a C při stejném součtu ale cenu měnit SMÍ: spojovací plechy
 * čelního rámu se počítají za každou stěnu s dveřmi a u exteriérové šachty
 * má čelní stěna jiné sklo než zadní (roadmapa #343, poznámka „ověřit
 * s J. V."). Sada proto u přesunu hlídá jen plochy (světlíky + plné
 * opláštění A+C) a rozdíly ceny POČÍTÁ A VYPÍŠE jako informaci, ne jako
 * selhání — dokud J. V. nerozhodne jinak. Kdo by chtěl rozdíl zakázat,
 * přepne `N46_ROZDIL_JE_CHYBA` níž.
 *
 * Spuštění: node src/test_fuzz_invarianty.js
 *   KNG_FUZZ_POCET=500    méně zadání (rychlejší běh)
 *   KNG_FUZZ_JEN=123      jen jedno zadání s výpisem (reprodukce nálezu)
 * Semínko je pevné, takže tentýž kód dává tytéž výsledky — nález jde
 * zopakovat číslem zadání z výpisu.
 * ============================================================ */
const nacti = f => { const m = require(f); Object.keys(m).forEach(k => { global[k] = m[k]; }); return m; };
nacti('./format.js'); nacti('./cenik.js'); nacti('./cenik_stari.js'); nacti('./cenik_rady.js');
const E = nacti('./engine.js');
const EP = nacti('./engine_proj.js');
nacti('./sleva.js');
const ZO = nacti('./zaokrouhleni.js');
const ZC = require('./zkusebni_cenik.js');
const J = require('./jekly.json');

const SEED = 20260925;
const POCET = Math.max(1, +process.env.KNG_FUZZ_POCET || 2000);
const JEN = process.env.KNG_FUZZ_JEN != null ? +process.env.KNG_FUZZ_JEN : null;
const N46_ROZDIL_JE_CHYBA = false;
const VYPIS = Math.max(1, +process.env.KNG_FUZZ_VYPIS || 3);   /* kolik selhání vypsat na invariant */

/* ---------- deterministický generátor (mulberry32) ---------- */
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
let rnd = mulberry32(SEED);
const pick = arr => arr[Math.floor(rnd() * arr.length)];
const sance = p => rnd() < p;
const kop = x => JSON.parse(JSON.stringify(x));

/* ---------- výsledky ---------- */
let ok = 0, fail = 0;
const SELHANI = {};           // invariant → [popisy]
const KONTROLY = {};          // invariant → počet ověřených zadání
const INFO = { n46Cena: [], n46Zrcadlo: [] };
function over(inv, cond, i, detail) {
  KONTROLY[inv] = (KONTROLY[inv] || 0) + 1;
  if (cond) return true;
  (SELHANI[inv] = SELHANI[inv] || []).push('zadání #' + i + (detail === undefined ? '' : ': ' + (typeof detail === 'string' ? detail : JSON.stringify(detail))));
  return false;
}
const fin = x => typeof x === 'number' && isFinite(x);
const blizko = (a, b, tol) => fin(a) && fin(b) && Math.abs(a - b) <= (tol == null ? 1e-6 + 1e-9 * Math.max(Math.abs(a), Math.abs(b)) : tol);

/* ---------- generátor zadání OCK ---------- */
const ZAHR = { ceny: { 'C.cestovniKc': 20000, 'C.prekladyKc': 15000 }, jenZahr: {} };

function genCenik() {
  const c = Object.assign(kop(E.DEFAULT_CENIK), ZC.zkusebniCenik());
  c.marze = pick([0, 0.2, 0.35]);
  c.dph = pick([0.12, 0.21]);
  c.lak.rezim = pick(['tomas', 'lakovna']);
  c.prekladyKc = 0;
  c.atypPrirazka = pick([0.2, 0.3, null]);
  c.zaskleniListyProjHod = pick([0, 4, 6]);
  const cp = Object.assign(kop(EP.DEFAULT_CENIK_PROJ), ZC.zkusebniCenikProj());
  cp.marze = pick([0, 0.2]);
  cp.dph = pick([0.21, 0.12]);
  cp.dopravaHodKc = pick([0, 1000, 1500]);
  const rada = sance(0.25) ? 'zahr' : 'cr';
  const data = cenikDnesniProRadu({ cenik: c, proj: { cenik: cp } }, ZAHR, rada);
  /* Klíč, který starší zveřejněný ceník nemá (P2 / K14-N61): nesmí dát NaN. */
  if (sance(0.1)) delete data.cenik.mustekKc;
  if (sance(0.1)) delete data.cenik.cetrisKc;
  return { c: data.cenik, cp: data.proj.cenik, rada };
}

function genPasy(z, ext, vyska) {
  const typy = E.oplasteniTypy(ext).map(t => t.id);
  const n = pick([1, 1, 2, 3]);
  const hranice = [];
  for (let k = 0; k < n - 1; k++) hranice.push(Math.round(rnd() * vyska * 100) / 100);
  hranice.sort((a, b) => a - b);
  return Array.from({ length: n }, (_, k) => {
    const typ = pick(typy);
    const p = { typ, doM: k === n - 1 ? null : hranice[k] };
    if (typ === 'jine') { p.nazev = pick(['Trapéz', 'Sendvič', 'Trapéz']); p.naklad = pick([100, 200, 0]); }
    return p;
  });
}

function genZadani() {
  const typ = pick(['exteriérová', 'interiérová']);
  const ext = typ === 'exteriérová';
  const pruchozi = sance(0.35);
  const z = kop(E.DEFAULT_ZADANI);
  Object.assign(z, {
    typSachty: typ, typPortalu: pick(['zapuštěný', 'předsazený']), zaskleni: pick(['na terče', 'mezi příčníky']),
    prejezd: pick([0, 2.7, 3.5]), zdvih: pick([0, 0.5, 3.3, 12, 17.325, 30, 60]), prohluben: pick([0, 1.05, 1.5]),
    sirka: pick([0, 0.9, 1.51, 2.4, 3]), hloubka: pick([0, 0.9, 1.515, 2.4, 3]), roztec: pick([1, 1.25, 1.5]),
    rohoveSloupky: pick([4, 6]), svetlikyBoky: pick([0, 1, 2]),
    cistyVstupMm: pick([700, 800, 900, 1100]), sirkaRamuMm: pick([50, 100]),
    prechodovePlechy: sance(0.5), pruchoziSachta: pruchozi, atyp: sance(0.3), vystupZamereni: sance(0.3),
    striskaKs: pick([0, 0, 1, 2]), mustkyKs: pick([0, 0, 1, 3]),
    rezervaProfilyPct: pick([0, 0.05]), rezervaPlechyPct: pick([0, 0.05]),
    rezervaZakladPct: pick([0, 0, 0.1, 0.3]), rezervaPriplatkyPct: pick([0, 0, 0.1]),
    montazZakladHod: pick([0, 24, 40]), montazAtypHod: pick([0, 0, 10]),
    projekceZakladHod: pick([0, 50]), projekceAtypHod: pick([0, 0, 15]),
    zamecnikAtypKc: pick([null, null, 0, 50000]), zamecnikAtypKs: pick([0, 0, 2]),
    oplechOstatniKg: pick([0, 10]), oplechOstatniHod: pick([0, 5]), engineeringKs: pick([0, 0, 1]),
  });
  if (pruchozi) { z.nastupisteA = pick([0, 1, 2, 3, 4, 6]); z.nastupisteC = pick([0, 1, 2, 3, 4]); z.patra = pick([0, 1, 2, 4, 6, 8]); }
  else { z.nastupiste = pick([0, 1, 2, 6, 12]); z.nastupisteA = 0; z.nastupisteC = 0; z.patra = 0; }
  /* Nad dveřmi: nová volba, nebo starý tvar zaškrtávátka (migrace v jádře). */
  if (sance(0.2)) { delete z.nadDvermi; z.svetlikNadDvermi = sance(0.5); } else z.nadDvermi = pick(E.NAD_DVERMI_VOLBY);
  if (sance(0.8)) z.bokyVypln = pick(E.BOKY_VYPLN_VOLBY);
  z.profily = kop(E.PROFILY_VYCHOZI[typ]);
  z.volitelne = { prechodove: pick([null, null, true, false]), leseniVnitrni: sance(0.5), leseniVnejsi: sance(0.5),
                  prechMont: null, leseniHlava: sance(0.3), haky: sance(0.5), zabradli: sance(0.5), sokl: sance(0.5) };
  z.priplatkyVynechat = ['vsgFolie', 'skn'].filter(() => sance(0.5));
  if (sance(0.2)) z.mnozstviPrepis = { 'LEŠENÍ - vnitřní': pick([0, 3, '']) };
  if (sance(0.15)) z.cenyPrepis = { 'SPOJOVACÍ MATERIÁL': pick([0, 1234]) };
  if (sance(0.15)) z.nazvyPrepis = { 'PROFILY - HLAVNÍ NOSNÉ PRVKY': 'Nosné profily (přejmenováno)' };
  /* Vlastní položky: názvy schválně jedinečné — dvě ruční položky téhož
   * jména jsou dnes známá mez (klíčem přepisů je název). */
  if (sance(0.2)) z.vlastniPolozky.hrubaOck = [{ nazev: 'Ruční položka A', mnozstvi: 2, cena: 1500 }];
  if (sance(0.2)) z.vlastniPolozky.volitelne = [{ nazev: 'Vlastní volitelná', mnozstvi: 1, cena: 5000 }];
  if (sance(0.2)) z.priplatkyVlastni = [{ nazev: 'Vlastní příplatek', mnozstvi: 1, cena: 7000 }];
  if (sance(0.15)) z.vlastniPolozky.spojovaci = [{ nazev: 'Šroub speciální', mnozstvi: 10, cena: 12 }];
  if (sance(0.15)) z.vlastniPolozky.lakovani = [{ nazev: 'Lak navíc', mnozstvi: 1, cena: 800 }];
  if (sance(0.15)) z.vlastniPolozky.atyp = [{ nazev: 'Atypická práce', mnozstvi: 1, cena: pick([0, 9000]) }];
  if (sance(0.4)) {
    const vyska = z.zdvih + z.prejezd;
    z.oplasteni = { rezim: 'poStenach', steny: {} };
    E.OPLASTENI_STENY.forEach(k => { z.oplasteni.steny[k] = { odM: pick([0, 0, -z.prohluben]), pasy: genPasy(z, ext, vyska) }; });
  }
  return z;
}

/* ---------- generátor zadání PROJ ---------- */
function genProj() {
  const zp = kop(EP.DEFAULT_ZADANI_PROJ);
  zp.sekce.forEach(s => {
    s.prirazkaPct = pick([null, null, 0, 30, 50]);
    if (s.doprava) s.doprava = { km: pick([0, 10, 120]), pausal: pick([0, 500]), mimoPrahu: sance(0.5) };
    s.polozky.forEach(p => {
      p.vyrazeno = sance(0.25);
      if (p.typ === 'hod') {
        p.hodiny = pick([0, '', 5, 24, 100]); p.rezerva = pick([0, '', 2]);
        const sp = pick([undefined, undefined, '', 0, 1500]);
        if (sp !== undefined) p.sazbaPrepis = sp;
      } else {
        const cp = pick([undefined, undefined, '', 0, 9999]);
        if (cp !== undefined) p.cenaPrepis = cp;
      }
    });
    if (sance(0.2)) s.polozky.push({ nazev: 'Vlastní fix', typ: 'fix', cena: 4000 });
    if (sance(0.2)) s.polozky.push({ nazev: 'Vlastní hodiny', typ: 'hod', sazbaKc: 900, hodiny: 3, rezerva: 0 });
  });
  return zp;
}

/* ---------- pomocné ---------- */
const SEKCE = ['hrubaOck', 'oplasteni', 'volitelne', 'rezie'];
const sumSekci = r => SEKCE.reduce((a, k) => a + r.souctySekci[k].sMarzi, 0);
const sumNaklad = r => SEKCE.reduce((a, k) => a + r.souctySekci[k].naklad, 0);
const PENIZE = ['mnozstvi', 'cena', 'naklad', 'marze', 'sMarzi'];

/* Projde objekt a vrátí cesty, kde je číslo nekonečné/NaN nebo kde chybí
 * hodnota tam, kde se čeká číslo (undefined v poli / v souhrnu). */
function nefinitni(o, cesta, out, hloubka) {
  if (hloubka > 8) return out;
  if (typeof o === 'number') { if (!isFinite(o)) out.push(cesta + '=' + o); return out; }
  if (o === undefined) { out.push(cesta + '=undefined'); return out; }
  if (o === null || typeof o !== 'object') return out;
  if (Array.isArray(o)) o.forEach((x, i) => nefinitni(x, cesta + '[' + i + ']', out, hloubka + 1));
  else Object.keys(o).forEach(k => nefinitni(o[k], cesta + '.' + k, out, hloubka + 1));
  return out;
}

function popisZadani(z, c, fixes) {
  return { typ: z.typSachty, model: fixes ? 2 : 1, rada: c.rada, zdvih: z.zdvih, prejezd: z.prejezd, prohluben: z.prohluben,
    sirka: z.sirka, hloubka: z.hloubka, pruchozi: z.pruchoziSachta, A: z.nastupisteA, C: z.nastupisteC, patra: z.patra,
    nastupiste: z.nastupiste, opl: (z.oplasteni || {}).rezim, atyp: z.atyp, rezerva: z.rezervaZakladPct };
}

/* ---------- invarianty OCK ---------- */
function overOck(i, z, c, fixes) {
  let r;
  try { r = E.vypocet(z, c, J, fixes); }
  catch (e) { over('I1 výpočet nespadne', false, i, e.message + ' ' + JSON.stringify(popisZadani(z, c, fixes))); return null; }
  const pz = popisZadani(z, c, fixes);

  /* I1 — nic nekonečného. Souhrn, součty a rezerva celé; u řádků peněžní pole. */
  const nf = nefinitni({ souhrn: r.souhrn, soucty: r.souctySekci, rezerva: r.rezerva, odvozene: r.odvozene,
    parametry: r.parametry, zaskleni: r.zaskleni, dily: r.dily, montaz: r.montaz }, 'r', [], 0);
  SEKCE.forEach(k => r.sekce[k].forEach((row, j) => PENIZE.forEach(p => { if (!fin(row[p])) nf.push(k + '[' + j + '].' + p + '=' + row[p]); })));
  r.priplatky.forEach((row, j) => ['mnozstvi', 'cena', 'naklad', 'sMarzi'].forEach(p => { if (!fin(row[p])) nf.push('priplatky[' + j + '].' + p + '=' + row[p]); }));
  r.volitelneKatalog.forEach((row, j) => PENIZE.forEach(p => { if (!fin(row[p])) nf.push('volitelneKatalog[' + j + '].' + p + '=' + row[p]); }));
  over('I1 žádné NaN/Infinity/undefined', nf.length === 0, i, { nf: nf.slice(0, 5), pz });

  /* I2 — součty. */
  let sedi = true; const detaily = [];
  const m = +c.marze || 0;
  SEKCE.forEach(k => {
    const rows = r.sekce[k], s = r.souctySekci[k];
    const sn = rows.reduce((a, x) => a + x.naklad, 0), sm = rows.reduce((a, x) => a + x.marze, 0), ss = rows.reduce((a, x) => a + x.sMarzi, 0);
    if (!blizko(sn, s.naklad) || !blizko(sm, s.marze) || !blizko(ss, s.sMarzi)) { sedi = false; detaily.push(k + ': řádky ' + [sn, sm, ss] + ' vs sekce ' + [s.naklad, s.marze, s.sMarzi]); }
    rows.forEach(x => {
      if (!blizko(x.sMarzi, x.naklad + x.marze) || !blizko(x.marze, x.naklad * m)) { sedi = false; detaily.push(k + '/' + x.origNazev + ': naklad ' + x.naklad + ' marze ' + x.marze + ' sMarzi ' + x.sMarzi); }
    });
  });
  const nakladBez = sumNaklad(r), sMarziBez = sumSekci(r);
  const rezOcek = fixes ? nakladBez * z.rezervaZakladPct : sMarziBez * z.rezervaZakladPct;
  if (!blizko(r.rezerva.naklad, rezOcek) || !blizko(r.rezerva.sMarzi, rezOcek * (1 + m))) { sedi = false; detaily.push('rezerva ' + JSON.stringify(r.rezerva) + ' čekáno ' + rezOcek); }
  if (!blizko(r.souhrn.zakladNaklad, nakladBez + r.rezerva.naklad)) { sedi = false; detaily.push('zakladNaklad ' + r.souhrn.zakladNaklad); }
  if (!blizko(r.souhrn.zakladCena, E.CEIL(sMarziBez + r.rezerva.sMarzi, 1000))) { sedi = false; detaily.push('zakladCena ' + r.souhrn.zakladCena + ' vs ' + (sMarziBez + r.rezerva.sMarzi)); }
  over('I2 součet řádků = sekce = souhrn, rezerva podle modelu', sedi, i, { detaily: detaily.slice(0, 4), pz });

  /* I3 — zaokrouhlení na tisíce. */
  const tisice = x => blizko(x, Math.round(x / 1000) * 1000, 1e-6);
  const pn = r.priplatky.reduce((a, x) => a + x.naklad, 0), pc = r.priplatky.reduce((a, x) => a + x.sMarzi, 0);
  const rezP = z.rezervaPriplatkyPct ? (fixes ? pn : pc) * z.rezervaPriplatkyPct * (1 + m) : 0;
  over('I3 zaokrouhlení nahoru na tisíce', tisice(r.souhrn.zakladCena) && r.souhrn.zakladCena >= sMarziBez + r.rezerva.sMarzi - 1e-6
    && r.priplatky.every(x => tisice(x.sMarzi) && x.sMarzi >= x.naklad * (1 + m) - 1e-6)
    && blizko(r.souhrn.priplatkyCena, E.CEIL(pc + rezP, 1000)), i, { zaklad: r.souhrn.zakladCena, prip: r.souhrn.priplatkyCena, pz });

  /* I4 — DPH. */
  const dph = c.dph;
  over('I4 DPH = základ × sazba (zahraniční řada 0 %)',
    blizko(r.souhrn.zakladDph, r.souhrn.zakladCena * dph) && blizko(r.souhrn.zakladSDph, r.souhrn.zakladCena * (1 + dph))
    && blizko(r.souhrn.priplatkyDph, r.souhrn.priplatkyCena * dph)
    && (c.rada !== 'zahr' || (dph === 0 && r.souhrn.zakladDph === 0)),
    i, { dph, rada: c.rada, zakladDph: r.souhrn.zakladDph, pz });

  /* I9 — jedinečné klíče. */
  const dupl = [];
  SEKCE.forEach(k => { const seen = new Set(); r.sekce[k].forEach(x => { const n = String(x.origNazev); if (seen.has(n)) dupl.push(k + ': ' + n); seen.add(n); }); });
  { const seen = new Set(); r.priplatky.forEach(x => { if (seen.has(x.key)) dupl.push('priplatky: ' + x.key); seen.add(x.key); }); }
  { const seen = new Set(); r.volitelneKatalog.forEach(x => { if (seen.has(x.key)) dupl.push('volitelne: ' + x.key); seen.add(x.key); }); }
  over('I9 řádky mají jedinečný klíč (N52)', dupl.length === 0, i, { dupl, pz });

  /* I5 — přepnutí volitelné položky. Přechodové plechy a jejich montáž jsou
   * dvojice svázaná materiálem (16. 9. 2026), takže se hlídají zvlášť níž. */
  const kat = r.volitelneKatalog.filter(x => !/^vlastni:/.test(x.key) && x.key !== 'prechodove' && x.key !== 'prechMont');
  if (kat.length) {
    const it = pick(kat);
    const z2 = kop(z); z2.volitelne[it.key] = !it.zahrnuto;
    const r2 = E.vypocet(z2, c, J, fixes);
    const ocek = it.zahrnuto ? -it.sMarzi : +it.sMarzi;
    let ok5 = blizko(sumSekci(r2) - sumSekci(r), ocek)
      && blizko(r2.souctySekci.volitelne.sMarzi - r.souctySekci.volitelne.sMarzi, ocek)
      && ['hrubaOck', 'oplasteni', 'rezie'].every(k => blizko(r2.souctySekci[k].sMarzi, r.souctySekci[k].sMarzi));
    const vSekci = (rr) => rr.sekce.volitelne.some(x => x.key === it.key);
    ok5 = ok5 && vSekci(r) === it.zahrnuto && vSekci(r2) === !it.zahrnuto;
    if (it.prip && !z.priplatkyVyber) {
      const vPrip = (rr) => rr.priplatky.some(x => x.key === it.prip);
      ok5 = ok5 && vPrip(r) === !it.zahrnuto && vPrip(r2) === it.zahrnuto;
    }
    over('I5 přepnutí volitelné položky změní součet přesně o její cenu', ok5, i,
      { key: it.key, zahrnuto: it.zahrnuto, cena: it.sMarzi, rozdil: sumSekci(r2) - sumSekci(r), pz });
  }
  /* Dvojice přechodových plechů: zapnutí materiálu zapíná i montáž. */
  {
    const z2 = kop(z); z2.volitelne.prechodove = true; z2.volitelne.prechMont = null;
    const z3 = kop(z); z3.volitelne.prechodove = false; z3.volitelne.prechMont = null;
    const r2 = E.vypocet(z2, c, J, fixes), r3 = E.vypocet(z3, c, J, fixes);
    const mat = r2.sekce.volitelne.find(x => x.key === 'prechodove'), mont = r2.sekce.volitelne.find(x => x.key === 'prechMont');
    over('I5b přechodové plechy jdou vždy s montáží (dvě položky, jeden přepínač)',
      !!mat && !!mont && !r3.sekce.volitelne.some(x => x.key === 'prechodove' || x.key === 'prechMont')
      && blizko(sumSekci(r2) - sumSekci(r3), mat.sMarzi + mont.sMarzi)
      && r3.priplatky.some(x => x.key === 'prechMat') && r3.priplatky.some(x => x.key === 'prechMont')
      && !r2.priplatky.some(x => x.key === 'prechMat') && !r2.priplatky.some(x => x.key === 'prechMont'),
      i, { rozdil: sumSekci(r2) - sumSekci(r3), mat: mat && mat.sMarzi, mont: mont && mont.sMarzi, pz });
  }

  /* I6 — vyřazení řádku ubere přesně jeho cenu. Volitelné se nefiltrují
   * (mají vlastní přepínač), režie s ATYP mění i přirážku — ty se vynechají. */
  const kandidati = [].concat(r.sekce.hrubaOck.map(x => ['hrubaOck', x]), r.sekce.oplasteni.map(x => ['oplasteni', x]),
    z.atyp ? [] : r.sekce.rezie.map(x => ['rezie', x]));
  if (kandidati.length) {
    const [sek, row] = pick(kandidati);
    const z2 = kop(z); z2.nepocitat = [String(row.origNazev)];
    const r2 = E.vypocet(z2, c, J, fixes);
    over('I6 vyřazení řádku ubere přesně jeho cenu',
      blizko(r.souctySekci[sek].sMarzi - r2.souctySekci[sek].sMarzi, row.sMarzi)
      && !r2.sekce[sek].some(x => x.origNazev === row.origNazev)
      && r2.sekce[sek].length === r.sekce[sek].length - 1
      && SEKCE.filter(k => k !== sek).every(k => blizko(r2.souctySekci[k].sMarzi, r.souctySekci[k].sMarzi)),
      i, { sek, radek: row.origNazev, cena: row.sMarzi, rozdil: r.souctySekci[sek].sMarzi - r2.souctySekci[sek].sMarzi, pz });
  }

  /* I11 — „lešení nenabízíme": přepis množství na 0 = 0 Kč i s fixní částí
   * (N51, schváleno J. V. 24. 9. 2026) — ve volitelných i v příplatcích. */
  {
    const nula = Object.keys(z.mnozstviPrepis || {}).filter(k => z.mnozstviPrepis[k] === 0);
    const radky = [].concat(r.volitelneKatalog, r.priplatky).filter(x => nula.indexOf(String(x.origNazev)) >= 0);
    if (radky.length) over('I11 přepis množství na 0 znamená 0 Kč i s fixní částí (N51)',
      radky.every(x => x.mnozstvi === 0 && x.naklad === 0 && x.sMarzi === 0), i,
      { radky: radky.map(x => [x.origNazev, x.fix, x.naklad]), pz });
  }

  /* I7 — po stěnách. Jen ze standardního zadání (výchozí stěny = standard)
   * a jen u šachty s nenulovou výškou prosklení: pásy si plochu stěny dělí
   * POMĚREM VÝŠEK a při nulové výšce není co dělit (zadání s nulovým zdvihem
   * i přejezdem nabídku stejně zastaví — kontrola „rozměry" je zábrana). */
  if ((!z.oplasteni || z.oplasteni.rezim !== 'poStenach') && z.zdvih + z.prejezd > 0) {
    const z2 = kop(z); z2.oplasteni = { rezim: 'poStenach', steny: E.oplasteniStenyVychozi(z, c) };
    const r2 = E.vypocet(z2, c, J, fixes);
    over('I7a zapnutí režimu po stěnách s výchozími stěnami nehne cenou',
      SEKCE.every(k => blizko(r2.souctySekci[k].sMarzi, r.souctySekci[k].sMarzi) && blizko(r2.souctySekci[k].naklad, r.souctySekci[k].naklad))
      && blizko(r2.souhrn.zakladCena, r.souhrn.zakladCena) && blizko(r2.souhrn.priplatkyCena, r.souhrn.priplatkyCena),
      i, { standard: r.souhrn.zakladCena, poStenach: r2.souhrn.zakladCena, pz });
    /* Změna typu jen na čelní stěně: B, C, D a ostatní sekce se nehnou. */
    const ext = z.typSachty === 'exteriérová';
    const jiny = E.oplasteniTypy(ext).map(t => t.id).filter(id => id !== 'bez' && id !== 'jine' && id !== z2.oplasteni.steny.A.pasy[0].typ);
    if (jiny.length) {
      const z3 = kop(z2); z3.oplasteni.steny.A.pasy[0].typ = pick(jiny);
      const r3 = E.vypocet(z3, c, J, fixes);
      const pasy = rr => rr.oplasteni.pasy.filter(p => p.stena !== 'A').map(p => p.stena + ':' + p.typ + ':' + Math.round(p.m2 * 1e6));
      const radek = (rr, n) => (rr.sekce.oplasteni.find(x => x.origNazev === n) || {}).sMarzi;
      over('I7b změna typu na čelní stěně (A) nesáhne na B, C, D ani na ostatní sekce',
        ['hrubaOck', 'volitelne', 'rezie'].every(k => blizko(r3.souctySekci[k].sMarzi, r2.souctySekci[k].sMarzi))
        && pasy(r3).join('|') === pasy(r2).join('|')
        && blizko(radek(r3, 'PRÁCE OPLÁŠTĚNÍ'), radek(r2, 'PRÁCE OPLÁŠTĚNÍ'))
        && blizko(r3.oplasteni.plochaCelkem, r2.oplasteni.plochaCelkem)
        /* Příplatky VSG fólie a SKN se po stěnách počítají jen ze skleněných
         * pásů (N50), takže typ čelní stěny na ně vliv MÁ; ostatní příplatky ne. */
        && r2.priplatky.filter(x => x.key !== 'vsgFolie' && x.key !== 'skn').every(x => {
          const y = r3.priplatky.find(q => q.key === x.key); return !!y && blizko(x.sMarzi, y.sMarzi); }),
        i, { pz });
    }
  }

  /* I8 — průchozí šachta: zrcadlení a přesun nástupišť.
   * Zrcadlení platí jen tehdy, když jedna ze stěn dveře NEMÁ: zadání nese
   * jen počty dveří a jádro předpokládá nejvyšší stanici vpředu, má-li čelní
   * stěna nějaké dveře (v24.9.6). A1C2 zrcadlově otočená je A2C1 s nejvyšší
   * stanicí VZADU — a to zadání vyjádřit neumí; A0C4 ↔ A4C0 ano. */
  if (z.pruchoziSachta && (z.patra || 0) >= 2) {
    const stejneSklo = kop(c); stejneSklo.skloBokyKc = stejneSklo.skloCelniKc; stejneSklo.skloVsg442Kc = stejneSklo.skloCelniKc;
    const zrc = kop(z); zrc.nastupisteA = z.nastupisteC; zrc.nastupisteC = z.nastupisteA;
    if (zrc.oplasteni && zrc.oplasteni.steny) { const t = zrc.oplasteni.steny.A; zrc.oplasteni.steny.A = zrc.oplasteni.steny.C; zrc.oplasteni.steny.C = t; }
    const jednostranna = !(+z.nastupisteA || 0) || !(+z.nastupisteC || 0);
    const a = E.vypocet(z, stejneSklo, J, fixes), b = E.vypocet(zrc, stejneSklo, J, fixes);
    if (jednostranna) over('I8a zrcadlová šachta (A ↔ C) při stejném skle stojí stejně a má zrcadlové stěny',
      blizko(a.souhrn.zakladCena, b.souhrn.zakladCena) && blizko(sumSekci(a), sumSekci(b))
      && blizko(a.zaskleni.steny.A, b.zaskleni.steny.C, 1e-9) && blizko(a.zaskleni.steny.C, b.zaskleni.steny.A, 1e-9)
      && blizko(a.zaskleni.steny.B, b.zaskleni.steny.B, 1e-9) && blizko(a.zaskleni.steny.D, b.zaskleni.steny.D, 1e-9)
      /* Příplatek SKN (náhrada dvojskla) se ve standardu bere jen z boků
       * a zad (N50) — zrcadlením se plocha stěhuje mezi A a C, takže se
       * SKN lišit smí; ostatní příplatky ne. */
      && a.priplatky.filter(x => x.key !== 'skn').every(x => {
        const y = b.priplatky.find(q => q.key === x.key); return !!y && blizko(x.sMarzi, y.sMarzi); }),
      i, { a: a.souhrn.zakladCena, b: b.souhrn.zakladCena, stenyA: a.zaskleni.steny, stenyB: b.zaskleni.steny, pz });
    /* Pravidlo nástupišť napřímo: stěna BEZ dveří je opláštěná celá (táž plocha
     * jako celá zadní stěna), stěna s dveřmi v KAŽDÉM patře nese jen světlíky. */
    {
      const st = r.zaskleni.steny, ns = r.zaskleni.nastupisteSten, cela = r.zaskleni.zadni.m2;
      const nA = +z.nastupisteA || 0, nC = +z.nastupisteC || 0;
      let ok8 = !!ns;
      if (ok8 && nA === 0) ok8 = blizko(ns.A.plne, cela, 1e-9) && blizko(st.A, cela + ns.A.svetliky, 1e-9);
      if (ok8 && nC === 0) ok8 = blizko(ns.C.plne, cela, 1e-9) && blizko(st.C, cela + ns.C.svetliky, 1e-9);
      if (ok8 && nA >= z.patra) ok8 = blizko(ns.A.plne, 0, 1e-9);
      if (ok8 && nA === 0 && nC >= z.patra) ok8 = blizko(ns.C.plne, 0, 1e-9);
      over('I8c stěna bez dveří je opláštěná celá, stěna s dveřmi v každém patře má jen světlíky (N45/N46)',
        ok8, i, { nA, nC, patra: z.patra, cela, st, ns, pz });
    }
    /* S původním sklem se exteriér smí lišit (čelní stěna má jiné sklo) — jen informace. */
    const b0 = E.vypocet(zrc, c, J, fixes);
    if (jednostranna && !blizko(r.souhrn.zakladCena, b0.souhrn.zakladCena)) INFO.n46Zrcadlo.push('#' + i + ' ' + z.typSachty + ' A' + z.nastupisteA + 'C' + z.nastupisteC + ': ' + r.souhrn.zakladCena + ' × ' + b0.souhrn.zakladCena);
    /* Přesun nástupišť při stejném součtu (T ≤ patra): plochy světlíků
     * a plného opláštění A+C se nemění; cena se smí lišit (viz hlavička). */
    const T = (+z.nastupisteA || 0) + (+z.nastupisteC || 0);
    if (T >= 1 && T <= z.patra) {
      const jiny = kop(z); const nA = Math.floor(rnd() * (T + 1)); jiny.nastupisteA = nA; jiny.nastupisteC = T - nA;
      const rj = E.vypocet(jiny, c, J, fixes);
      const s = r.zaskleni.nastupisteSten, sj = rj.zaskleni.nastupisteSten;
      const plochy = s && sj && blizko(s.A.svetliky + s.C.svetliky, sj.A.svetliky + sj.C.svetliky, 1e-9)
        && blizko(s.A.plne + s.C.plne, sj.A.plne + sj.C.plne, 1e-9);
      over('I8b přesun nástupišť mezi A a C při stejném součtu nemění plochu světlíků ani plného opláštění',
        plochy, i, { z: 'A' + z.nastupisteA + 'C' + z.nastupisteC, jiny: 'A' + nA + 'C' + (T - nA), s, sj, pz });
      if (!blizko(r.souhrn.zakladCena, rj.souhrn.zakladCena)) {
        INFO.n46Cena.push('#' + i + ' ' + z.typSachty + ' A' + z.nastupisteA + 'C' + z.nastupisteC + ' ' + r.souhrn.zakladCena
          + ' × A' + nA + 'C' + (T - nA) + ' ' + rj.souhrn.zakladCena);
        if (N46_ROZDIL_JE_CHYBA) over('I8c přesun nástupišť mezi A a C nemění cenu (N46)', false, i, { pz });
      }
    }
  }

  /* I10 — koncová cena OCK: sleva a obchodní zaokrouhlení na haléř. */
  {
    const sleva = { procenta: pick([0, 5, 12.5]), stav: 'schváleno' };
    const zaokr = { krok: pick(ZO.ZAOKR_KROKY).krok, smer: pick(ZO.ZAOKR_SMERY).smer };
    const cn = ZO.cenaNabidkyOck(r, sleva, zaokr);
    const sd = ZO.cenaSDph(cn.cena, dph);
    over('I10 koncová cena OCK: základ − sleva + zaokrouhlení = cena, DPH z ceny',
      !!cn && blizko(cn.zaklad - cn.slevaKc + cn.zaokrKc, cn.cena, 0.011) && blizko(cn.zakladZaokr - cn.slevaKcVykaz, cn.cena, 0.011)
      && (cn.zaklad <= 0 || cn.cena > 0) && blizko(cn.slevaKc, cn.zaklad * sleva.procenta / 100)
      && blizko(sd.dphKc, cn.cena * dph) && blizko(sd.sDph, cn.cena * (1 + dph)),
      i, { cn, sleva, zaokr, pz });
  }
  return r;
}

/* ---------- invarianty PROJ ---------- */
function overProj(i, zp, cp) {
  let r;
  try { r = EP.vypocetProj(zp, cp); }
  catch (e) { over('P1 výpočet PROJ nespadne', false, i, e.message); return; }
  const nf = nefinitni({ souhrn: r.souhrn }, 'r', [], 0);
  r.sekce.forEach((s, j) => {
    ['naklad', 'marze', 'cena', 'dopravaKc', 'cenaSDopravou', 'celkem', 'pouzitePct'].forEach(p => { if (!fin(s[p])) nf.push('sekce[' + j + '].' + p + '=' + s[p]); });
    s.polozky.forEach((p, k) => { if (!fin(p.naklad) || !fin(p.hodinyCelkem)) nf.push('sekce[' + j + '].polozky[' + k + ']'); });
  });
  over('P1 žádné NaN/Infinity/undefined (PROJ)', nf.length === 0, i, nf.slice(0, 5));

  let sedi = true; const det = [];
  r.sekce.forEach((s, j) => {
    const zs = zp.sekce[j];
    const pct = zs.prirazkaPct != null ? zs.prirazkaPct / 100 : (+cp.marze || 0);
    const sn = s.polozky.reduce((a, p) => a + p.naklad, 0);
    if (!blizko(sn, s.naklad) || !blizko(s.marze, (s.naklad + s.dopravaKc) * pct) || !blizko(s.cena, s.naklad + s.marze)
        || !blizko(s.cenaSDopravou, s.cena + s.dopravaKc) || !blizko(s.celkem, s.cenaSDopravou)) { sedi = false; det.push(s.key + ' ' + JSON.stringify({ sn, s: [s.naklad, s.marze, s.cena, s.dopravaKc, s.celkem], pct })); }
    s.polozky.forEach((p, k) => {
      const zpol = zs.polozky[k];
      if (zpol.vyrazeno && p.naklad !== 0) { sedi = false; det.push(s.key + ': vyřazená položka má náklad ' + p.naklad); }
      if (!zpol.vyrazeno && p.typ === 'hod') {
        const hod = (+zpol.hodiny || 0) + (+zpol.rezerva || 0);
        const sazba = prepisPlati(zpol.sazbaPrepis) ? +zpol.sazbaPrepis || 0 : (cp.sazby[zpol.sazba] != null ? cp.sazby[zpol.sazba] : (+zpol.sazbaKc || 0));
        if (!blizko(p.naklad, hod * sazba)) { sedi = false; det.push(s.key + '/' + p.nazev + ': ' + p.naklad + ' vs ' + hod + '×' + sazba); }
      }
    });
  });
  const sum = f => r.sekce.reduce((a, s) => a + s[f], 0);
  if (!blizko(r.souhrn.naklad, sum('naklad')) || !blizko(r.souhrn.marze, sum('marze')) || !blizko(r.souhrn.doprava, sum('dopravaKc'))
      || !blizko(r.souhrn.cena, sum('cenaSDopravou')) || !blizko(r.souhrn.celkem, sum('celkem'))) { sedi = false; det.push('souhrn ' + JSON.stringify(r.souhrn)); }
  over('P2 součty položek = sekce = souhrn; „prázdno není nula" u přepisů', sedi, i, det.slice(0, 4));

  /* P3 — vyřazení položky ubere přesně její cenu s přirážkou. */
  const zive = [];
  zp.sekce.forEach((s, j) => s.polozky.forEach((p, k) => { if (!p.vyrazeno && r.sekce[j].polozky[k].naklad > 0) zive.push([j, k]); }));
  if (zive.length) {
    const [j, k] = pick(zive);
    const z2 = kop(zp); z2.sekce[j].polozky[k].vyrazeno = true;
    const r2 = EP.vypocetProj(z2, cp);
    const pct = r.sekce[j].pouzitePct / 100;
    over('P3 vyřazení položky PROJ ubere přesně její cenu',
      blizko(r.sekce[j].celkem - r2.sekce[j].celkem, r.sekce[j].polozky[k].naklad * (1 + pct))
      && r.sekce.every((s, q) => q === j || blizko(s.celkem, r2.sekce[q].celkem))
      && blizko(r.souhrn.celkem - r2.souhrn.celkem, r.sekce[j].polozky[k].naklad * (1 + pct)),
      i, { sekce: r.sekce[j].key, polozka: r.sekce[j].polozky[k].nazev, rozdil: r.sekce[j].celkem - r2.sekce[j].celkem });
  }

  /* P4 — cena po slevě a zaokrouhlení, DPH. */
  {
    const sleva = { procenta: pick([0, 7, 15]), stav: 'schváleno' };
    const zaokr = { krok: pick(ZO.ZAOKR_KROKY).krok, smer: pick(ZO.ZAOKR_SMERY).smer };
    const cn = ZO.cenaNabidkyProj(r, sleva, zaokr);
    const sd = ZO.cenaSDph(cn.cena, cp.dph);
    over('P4 koncová cena PROJ: zaokrouhlený základ − sleva = cena, DPH z ceny (zahraniční 0 %)',
      !!cn && blizko(cn.zakladZaokr - cn.slevaKcVykaz, cn.cena, 0.011) && blizko(cn.slevaKc, cn.zaklad * sleva.procenta / 100)
      && (cn.zaklad <= 0 || cn.cena > 0) && blizko(sd.dphKc, cn.cena * cp.dph)
      && (cp.rada === undefined || true),
      i, { cn, sleva, zaokr });
  }
}

/* ---------- běh ---------- */
const od = JEN != null ? JEN : 0, doI = JEN != null ? JEN + 1 : POCET;
for (let i = 0; i < doI; i++) {
  /* Generuje se i pro přeskočená zadání, aby číslo zadání určovalo data
   * nezávisle na tom, kolik se jich ověřuje. */
  const { c, cp, rada } = genCenik();
  const z = genZadani();
  const zp = genProj();
  const fixes = sance(0.5);
  if (i < od) continue;
  if (JEN != null) console.log('zadání #' + i + ':', JSON.stringify({ rada, fixes, z, cp: { marze: cp.marze, dph: cp.dph } }));
  if (rada === 'zahr') cp.dph = c.dph;   /* zahraniční řada: projekce se fakturuje bez české daně stejně jako šachta */
  overOck(i, z, c, fixes);
  overProj(i, zp, cp);
}

/* ---------- souhrn ---------- */
const nazvy = Object.keys(KONTROLY).sort();
nazvy.forEach(n => {
  const s = SELHANI[n] || [];
  if (!s.length) { ok++; console.log('OK  ' + n + '   (' + KONTROLY[n] + ' zadání)'); }
  else { fail++; console.log('FAIL ' + n + '   (' + s.length + ' z ' + KONTROLY[n] + ' zadání)\n      ' + s.slice(0, VYPIS).join('\n      ') + (s.length > VYPIS ? '\n      … a další ' + (s.length - VYPIS) : '')); }
});
if (INFO.n46Cena.length || INFO.n46Zrcadlo.length) {
  console.log('\nINFO N46 (není selhání — rozhodnutí J. V. 24. 9. 2026, roadmapa #343 „ověřit s J. V."):');
  console.log('  přesun nástupišť A ↔ C při stejném součtu změnil cenu u ' + INFO.n46Cena.length + ' zadání'
    + (INFO.n46Cena.length ? ', např. ' + INFO.n46Cena.slice(0, 3).join('; ') : ''));
  console.log('  zrcadlení s původním (různým) sklem změnilo cenu u ' + INFO.n46Zrcadlo.length + ' zadání'
    + (INFO.n46Zrcadlo.length ? ', např. ' + INFO.n46Zrcadlo.slice(0, 2).join('; ') : ''));
}
console.log('\n' + ok + ' OK, ' + fail + ' FAIL' + '   (ověřeno ' + (doI - od) + ' zadání, semínko ' + SEED + ')');
process.exit(fail ? 1 : 0);
