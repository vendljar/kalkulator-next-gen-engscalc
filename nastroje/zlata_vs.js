/* ZLATÁ SADA VS-E0 (#570 / roadmapa #590, 10. 11. 2026).
 *
 * „Jedna šachta = beze změny, bajt po bajtu." Víc šachet v nabídce (VS) sahá
 * do cesty výpočtu (obal vypocetZakazkyOck za vypocetZ) a postupně do všech
 * výstupů. Zakázka s jednou šachtou — tedy každá dnešní zakázka — přitom
 * nesmí dát ani o haléř nebo znak jiný výsledek či dokument. Tahle sada to
 * hlídá od první změny kódu (etapa E0) do poslední (E6).
 *
 * Otisk (sha256, 24 znaků) se bere z TÉHOŽ skriptu nad stromem výchozího
 * commitu VS (integrace 3ff5403 = v10.11.1) a ukládá se do
 * src/test_vs_zlata.json; src/test_vs_zlata.js pustí skript nad dnešním
 * stromem a porovná otisk po otisku.
 *
 *   node nastroje/zlata_vs.js <složka src> > src/test_vs_zlata.json
 *
 * Co se otiskuje (pro každý scénář):
 *   vyp        výsledek jádra vypocet() (celý JSON)
 *   vypZ       výsledek přes vypocetZ() — jediné místo zámek / výpočet (sem jde obal VS)
 *   cena       koncová cena cenaNabidkyOck() (základ → sleva → zaokrouhlení)
 *   ph-cz/en   symboly cenové nabídky (nabidkaData, Word v16) + online náhled + řádky navíc
 *   docx       text dokumentu z docxVyplnSablonu nad zkušební šablonou se všemi symboly
 *   kryci      krycí list OCK (kryciData)
 *   spec       technická specifikace (TECHSPEC_DEF, předvyplnění tsHodnota)
 *   sod        smlouva o dílo (sodData)
 *   pd         Pipedrive náhled (pdnTelo(pdnPodklad))
 *   ctrl       controlling export CSV (zamčená řídící varianta)
 *   snimek     snímek zámku zamekSnimekSpocti
 *   zamek      výsledek zámku zamekVysledekSpocti (bez razítka času)
 *
 * Scénáře: fixtury src/fixtury (každá varianta), scénáře zlaté pojistky #560
 * (můstky starého tvaru, oba ceníky můstků), dva se skladebnými můstky
 * Z.mustky[] a POCET zadání fuzzu (generátor z test_fuzz_invarianty.js,
 * pevné semínko) — Model 1 i Model 2, česká i zahraniční řada ceníku.
 *
 * Nové symboly, které přidá E4 (smyčka šachet v17), se z otisku vynechají
 * výčtem VS_NOVE_SYMBOLY — jedna šachta je nezná a mít je nesmí jinak než
 * prázdné; počítají se zvlášť (test_vs_nabidka.js).
 *
 * Jen smyšlený zkušební ceník (zkusebni_cenik.js), datumy pevné — krok kola
 * „hodiny +400 dní" otisk nesmí změnit. */
'use strict';
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');

const CORE = ['build_info.js', 'nazvy_souboru.js', 'preklad.js', 'format.js', 'engine.js', 'vice_sachet.js', 'engine_proj.js', 'techspec.js',
  'zakazka.js', 'uloziste.js', 'retence_zaloh.js', 'zamek.js', 'seznam.js', 'archiv.js', 'docxgen.js', 'xlsx.js', 'dokumenty.js',
  'sleva.js', 'schvalovani.js', 'zaokrouhleni.js', 'marze.js', 'kontroly.js', 'ares.js', 'poznamky.js', 'protokol.js', 'firma.js',
  'zpracovatel.js', 'podminky.js', 'plan_plateb.js', 'nabidka.js', 'nabidka_proj.js', 'sod.js', 'kryci.js', 'kryci_proj.js',
  'cenik.js', 'cenik_stari.js', 'cenik_rady.js', 'vyjimky.js', 'rucni_ceny.js', 'katalog.js', 'prepisy.js', 'slovnik.js',
  'konfigurace.js', 'sablony_online.js', 'sablona_obsah.js', 'analytika.js', 'nastaveni_db.js', 'program.js', 'ukazkove.js',
  'prava.js', 'zobrazeni.js', 'zakaznici.js', 'controlling.js', 'pd_nanecisto.js', 'objednane.js', 'standard_ock.js'];

const VS_NOVE_SYMBOLY = /^(SACHTA_|SACHTY_|POCET_VARIANT$|POCET_SACHET_CELKEM$)/;
const DATUM = '2026-11-10';
const POCET_FUZZ = Math.max(0, +process.env.KNG_ZLATA_VS_POCET || 300);

function nacti(src) {
  for (const f of CORE) {
    const p = path.join(src, f);
    if (!fs.existsSync(p)) continue;              // vice_sachet.js ve výchozím stromu není
    const m = require(p);
    if (m && typeof m === 'object') Object.assign(global, m);
  }
  const ZC = require(path.join(src, 'zkusebni_cenik.js'));
  global.DEFAULT_CENIK = ZC.zkusebniCenik();
  global.DEFAULT_CENIK_PROJ = ZC.zkusebniCenikProj();
  return { ZC, J: JSON.parse(fs.readFileSync(path.join(src, 'jekly.json'), 'utf8')), src };
}

const kop = x => JSON.parse(JSON.stringify(x));
const otisk = o => crypto.createHash('sha256').update(o === undefined ? 'undefined' : JSON.stringify(o)).digest('hex').slice(0, 24);
/* Chyba je taky výsledek: stejný strom = stejná chyba. Text chyby bez cest. */
function zkus(fn) { try { return fn(); } catch (e) { return { chyba: String(e && e.message || e).slice(0, 200) }; } }
async function zkusA(fn) { try { return await fn(); } catch (e) { return { chyba: String(e && e.message || e).slice(0, 200) }; } }

/* ---------- generátor fuzzu (kopie z test_fuzz_invarianty.js, vlastní semínko) ---------- */
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function generator(ZC) {
  const rnd = mulberry32(20261110);
  const pick = arr => arr[Math.floor(rnd() * arr.length)];
  const sance = p => rnd() < p;
  const ZAHR = { ceny: { 'C.cestovniKc': 20000, 'C.prekladyKc': 15000 }, jenZahr: {} };
  function genCenik() {
    const c = Object.assign(kop(DEFAULT_CENIK), ZC.zkusebniCenik());
    c.marze = pick([0, 0.2, 0.35]);
    c.dph = pick([0.12, 0.21]);
    c.lak.rezim = pick(['tomas', 'lakovna']);
    c.prekladyKc = 0;
    c.atypPrirazka = pick([0.2, 0.3, null]);
    c.zaskleniListyProjHod = pick([0, 4, 6]);
    if (sance(0.3)) Object.assign(c, ZC.zkusebniMustky());
    const cp = Object.assign(kop(DEFAULT_CENIK_PROJ), ZC.zkusebniCenikProj());
    const rada = sance(0.25) ? 'zahr' : 'cr';
    const data = cenikDnesniProRadu({ cenik: c, proj: { cenik: cp } }, ZAHR, rada);
    if (sance(0.1)) delete data.cenik.mustekKc;
    return { c: data.cenik, cp: data.proj.cenik, rada };
  }
  function genPasy(ext, vyska) {
    const typy = oplasteniTypy(ext).map(t => t.id);
    const n = pick([1, 1, 2, 3]);
    const hranice = [];
    for (let k = 0; k < n - 1; k++) hranice.push(Math.round(rnd() * vyska * 100) / 100);
    hranice.sort((a, b) => a - b);
    return Array.from({ length: n }, (_, k) => {
      const typ = pick(typy);
      const p = { typ, doM: k === n - 1 ? null : hranice[k] };
      if (typ === 'jine') { p.nazev = pick(['Trapéz', 'Sendvič']); p.naklad = pick([100, 200, 0]); }
      return p;
    });
  }
  function genZadani() {
    const typ = pick(['exteriérová', 'interiérová']);
    const ext = typ === 'exteriérová';
    const pruchozi = sance(0.35);
    const z = kop(DEFAULT_ZADANI);
    Object.assign(z, {
      typSachty: typ, typPortalu: pick(['zapuštěný', 'předsazený']), zaskleni: pick(['na terče', 'mezi příčníky']),
      prejezd: pick([2.7, 3.5, 3.3]), zdvih: pick([3.3, 12, 17.325, 30]), prohluben: pick([0, 1.05, 1.5]),
      sirka: pick([0.9, 1.51, 2.4]), hloubka: pick([0.9, 1.515, 2.4]), roztec: pick([1, 1.25, 1.5]),
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
    if (pruchozi) { z.nastupisteA = pick([1, 2, 3, 4, 6]); z.nastupisteC = pick([0, 1, 2, 3]); z.patra = pick([1, 2, 4, 6, 8]); }
    else { z.nastupiste = pick([1, 2, 6, 12]); z.nastupisteA = 0; z.nastupisteC = 0; z.patra = 0; }
    z.nadDvermi = pick(NAD_DVERMI_VOLBY);
    if (sance(0.8)) z.bokyVypln = pick(BOKY_VYPLN_VOLBY);
    if (sance(0.5)) { z.bokyDveri = pick(BOKY_DVERI_VOLBY); z.svetlikyBokyKs = pick(['', '', 0, 1, 3]); }
    z.profily = kop(PROFILY_VYCHOZI[typ]);
    z.volitelne = { prechodove: pick([null, null, true, false]), leseniVnitrni: sance(0.5), leseniVnejsi: sance(0.5),
                    prechMont: null, leseniHlava: sance(0.3), haky: sance(0.5), zabradli: sance(0.5), sokl: sance(0.5) };
    z.priplatkyVynechat = ['vsgFolie', 'skn'].filter(() => sance(0.5));
    if (sance(0.2)) z.mnozstviPrepis = { 'LEŠENÍ - vnitřní': pick([0, 3, '']) };
    if (sance(0.15)) z.cenyPrepis = { 'SPOJOVACÍ MATERIÁL': pick([0, 1234]) };
    if (sance(0.15)) z.nazvyPrepis = { 'PROFILY - HLAVNÍ NOSNÉ PRVKY': 'Nosné profily (přejmenováno)' };
    if (sance(0.2)) z.vlastniPolozky.hrubaOck = [{ nazev: 'Ruční položka A', mnozstvi: 2, cena: 1500 }];
    if (sance(0.2)) z.vlastniPolozky.volitelne = [{ nazev: 'Vlastní volitelná', mnozstvi: 1, cena: 5000 }];
    if (sance(0.2)) z.priplatkyVlastni = [{ nazev: 'Vlastní příplatek', mnozstvi: 1, cena: 7000 }];
    if (sance(0.15)) z.vlastniPolozky.atyp = [{ nazev: 'Atypická práce', mnozstvi: 1, cena: pick([0, 9000]) }];
    if (sance(0.25) && Array.isArray(z.mustky)) {
      z.mustky = [{ ks: pick([1, 2]), sirkaMm: pick([1200, 1600]), delkaMm: pick([800, 1500]), podlaha: pick(['plech', 'pororost']),
        zabradli: pick(['kov', 'sklo', 'bez']), zabradliStrany: pick([0, 1, 2]), sloupyKs: pick([0, 2]), sloupVyskaM: pick([0, 3.2]) }];
    }
    if (sance(0.4)) {
      const vyska = z.zdvih + z.prejezd;
      z.oplasteni = { rezim: 'poStenach', steny: {} };
      OPLASTENI_STENY.forEach(k => { z.oplasteni.steny[k] = { odM: pick([0, 0, -z.prohluben]), pasy: genPasy(ext, vyska) }; });
    }
    return { z, fixes: sance(0.6), sleva: pick([0, 0, 0, 3, 7.5]), zaokr: pick([null, null, { krok: 1000, smer: 'dolu' }]) };
  }
  return { genCenik, genZadani };
}

/* ---------- zkušební šablona Wordu se všemi symboly CN ---------- */
async function sablona(klice) {
  const radky = klice.map(k => [k, '{{' + k + '}}']);
  const blob = docxDokumentBlob('Nabídka', [{ sekce: 'SYMBOLY', radky }]);
  return await blob.arrayBuffer();
}
async function docxText(klice, ph, radkyNavic) {
  const buf = await sablona(klice);
  const vys = await zipPrecti(new Uint8Array(await (await docxVyplnSablonu(buf, ph, [], {}, { radkyNavic })).arrayBuffer()));
  return new TextDecoder().decode(vys.find(p => p.nazev === 'word/document.xml').data)
    .replace(/<\/w:tc>/g, ' | ').replace(/<\/w:tr>/g, '\n').replace(/<[^>]+>/g, '');
}

/* Zamčená kopie zakázky (řídící varianta) pro controlling — se zmrazeným
 * výsledkem z dnešního kódu, pevné razítko. */
function zamcena(zak, v, J) {
  const z = kop(zak);
  const vv = z.varianty.find(x => x.id === v.id);
  z.varianty.forEach(x => { x.ridici = x.id === vv.id; });
  const vys = zamekVysledekSpocti(vv, J, 'zlata');
  if (vys) vys.kdy = DATUM + 'T10:00:00.000Z';
  vv.zamek = { zamceno: true, kdy: DATUM + 'T10:00:00.000Z', kdo: 'zlata@priklad.cz', cislo: z.cislo || '2026-OPR-CN-9590', vysledek: vys };
  return { z, vv };
}

async function scenar(zak, v, J) {
  const d = v.data;
  const o = {};
  const ok = !!(d && d.ock && d.cenik);
  const r = ok ? zkus(() => vypocet(kop(d.ock.zadani), kop(d.cenik), J, d.ock.fixes)) : null;
  o.vyp = otisk(r);
  if (r && r.souhrn) o.zakladCena = r.souhrn.zakladCena;
  const rz = zkus(() => vypocetZ(v, J));
  o.vypZ = otisk(rz);
  o.cena = otisk(zkus(() => cenaNabidkyOck(rz, d.sleva, d.zaokr)));
  let klice = [];
  for (const L of ['cz', 'en']) {
    const nd = zkus(() => nabidkaData(zak, v, J, L));
    if (nd && nd.placeholders) {
      const ph = {};
      Object.keys(nd.placeholders).filter(k => !VS_NOVE_SYMBOLY.test(k)).sort().forEach(k => { ph[k] = nd.placeholders[k]; });
      o['ph-' + L] = otisk(ph);
      o['nahled-' + L] = otisk(zkus(() => nabidkaNahledSekce(nd.placeholders, L, nd.platbyOck, nd.tsExtra)));
      o['radky-' + L] = otisk(nd.tsRadkyNavic);
      if (L === 'cz') {
        klice = Object.keys(ph);
        o.docx = otisk(await zkusA(() => docxText(klice, nd.placeholders, nd.tsRadkyNavic)));
      }
    } else o['ph-' + L] = otisk(nd);
  }
  o.kryci = otisk(zkus(() => kryciData(zak, v, J)));
  const r2 = ok ? zkus(() => vypocet(d.ock.zadani, d.cenik, J, d.ock.fixes)) : null;
  o.spec = otisk(zkus(() => {
    const ts = {};
    TECHSPEC_DEF.forEach(s => (!s.jen || s.jen(r2, d.ock.zadani)) && s.pole.forEach(p => {
      ts[p.id] = tsHodnota(p, d.techspec, r2, d.ock.zadani, d.cenik, 'cz').text;
    }));
    return ts;
  }));
  o.sod = otisk(zkus(() => sodData(zak, v, J, 'cz')));
  o.pd = otisk(zkus(() => pdnTelo(pdnPodklad(zak, J))));
  o.ctrl = otisk(zkus(() => {
    const { z, vv } = zamcena(zak, v, J);
    const exp = ctrlExportVarianty(z, vv, { jekly: J, kdo: 'zlata@priklad.cz', kdy: DATUM + 'T10:00:00Z', build: 'zlata' });
    return exp && exp.ok === false ? exp : ctrlExportCsv(exp);
  }));
  o.snimek = otisk(zkus(() => zamekSnimekSpocti(v)));
  o.zamek = otisk(zkus(() => { const x = zamekVysledekSpocti(v, J, 'zlata'); if (x) delete x.kdy; return x; }));
  return o;
}

function pevneDatum(zak) {
  zak.datum = DATUM;
  (zak.varianty || []).forEach(v => { if (v.datum) v.datum = DATUM; });
}

/* Pevné hodiny: smlouva o dílo a Pipedrive berou dnešek (datum podpisu,
 * stáří). Otisk nesmí záviset na dni běhu ani na kroku kola „+400 dní". */
function pevneHodiny() {
  const PEVNE = Date.parse(DATUM + 'T10:00:00.000Z');
  const Puvodni = Date;
  if (Puvodni.zlataVs) return;
  class PevnyDate extends Puvodni {
    constructor(...a) { if (a.length === 0) super(PEVNE); else super(...a); }
    static now() { return PEVNE; }
  }
  PevnyDate.zlataVs = true;
  globalThis.Date = new Proxy(PevnyDate, { apply: () => new PevnyDate().toString() });
}

async function zlata(src) {
  pevneHodiny();
  const { ZC, J } = nacti(path.resolve(src));
  const out = {};
  /* 1) fixtury */
  const fdir = path.join(src, 'fixtury');
  for (const f of fs.readdirSync(fdir).filter(x => x.endsWith('.json')).sort()) {
    const zak = importZakazka(JSON.parse(fs.readFileSync(path.join(fdir, f), 'utf8')));
    for (const v of zak.varianty) out['fixtura:' + f + ':' + v.id] = await scenar(zak, v, J);
  }
  /* 2) scénáře zlaté pojistky #560 + skladebné můstky */
  const ZAD = { prejezd: 3.3, zdvih: 12, prohluben: 1.2, sirka: 1.6, hloubka: 2.1, nastupiste: 4 };
  const SC = [
    ['ext-354', 'exteriérová', {}, '354'], ['int-pausal', 'interiérová', {}, 'pausal'],
    ['stare-2ks-354', 'exteriérová', { mustkyKs: 2, mustekHloubkaMm: 1200 }, '354'],
    ['stare-zaskrtnuty-pausal', 'interiérová', { mustek: true, mustekHloubkaMm: 900, mustekSirkaMm: 1500 }, 'pausal'],
    ['skladebne-1', 'exteriérová', { mustky: [{ ks: 2, sirkaMm: 1600, delkaMm: 1200, podlaha: 'plech', zabradli: 'kov', zabradliStrany: 2, sloupyKs: 2, sloupVyskaM: 3.2 }] }, '354'],
    ['skladebne-2', 'interiérová', { mustky: [{ ks: 1, sirkaMm: 1200, delkaMm: 900, podlaha: 'pororost', zabradli: 'sklo', zabradliStrany: 1, sloupyKs: 0, sloupVyskaM: 0 },
      { ks: 3, sirkaMm: 1400, delkaMm: 1500, podlaha: 'vana', zabradli: 'bez', zabradliStrany: 0, sloupyKs: 0, sloupVyskaM: 0 }] }, '354'],
  ];
  for (const [jm, typ, uprava, cen] of SC) {
    for (const f of [true, false]) {
      const zak = novaZakazka();
      zak.cislo = '2026-OPR-CN-9590'; zak.nazevAkce = 'Zlatá sada VS ' + jm;
      pevneDatum(zak);
      const v = zak.varianty[0];
      Object.assign(v.data.ock.zadani, ZAD, { typSachty: typ }, kop(uprava));
      v.data.ock.fixes = f;
      v.data.cenik = Object.assign(ZC.zkusebniCenik(), cen === '354' ? ZC.zkusebniMustky() : {}, { kurzEurKc: 25 });
      out['scenar:' + jm + ':' + (f ? 'm2' : 'm1')] = await scenar(zak, v, J);
    }
  }
  /* 3) fuzz */
  const G = generator(ZC);
  for (let i = 0; i < POCET_FUZZ; i++) {
    const { c } = G.genCenik();
    const { z, fixes, sleva, zaokr } = G.genZadani();
    const zak = novaZakazka();
    zak.cislo = '2026-OPR-CN-' + String(9000 + i); zak.nazevAkce = 'Fuzz VS ' + i;
    pevneDatum(zak);
    const v = zak.varianty[0];
    v.data.ock.zadani = z; v.data.ock.fixes = fixes; v.data.cenik = Object.assign(c, { kurzEurKc: 25 });
    if (sleva && v.data.sleva) { v.data.sleva.procenta = sleva; v.data.sleva.stav = 'schváleno'; }
    if (zaokr) v.data.zaokr = Object.assign({}, v.data.zaokr || {}, zaokr);
    out['fuzz:' + i] = await scenar(zak, v, J);
  }
  return out;
}

if (require.main === module) {
  const src = path.resolve(process.argv[2] || path.join(__dirname, '..', 'src'));
  zlata(src).then(sc => {
    process.stdout.write(JSON.stringify({ zdroj: 'nastroje/zlata_vs.js', vychozi: '3ff5403 (v10.11.1)', pocetFuzz: POCET_FUZZ, scenare: sc }, null, 0)
      .replace(/\},"/g, '},\n"') + '\n');
  }).catch(e => { console.error(e); process.exit(1); });
}
module.exports = { zlata, VS_NOVE_SYMBOLY };
