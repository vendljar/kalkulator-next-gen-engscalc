/* POROVNÁNÍ SESTAVENÍ — PEVNÁ SADA KALKULACÍ (S3, návrh režie 18. 11. 2026).
 *
 * Dva režimy:
 *
 *   node nastroje/porovnani_sada.js otisky <složka src> [--cenik <soubor.json>] [--fuzz N]
 *        Načte jádro ze ZADANÉ složky src (sestavení A nebo B, obvykle dočasný
 *        worktree), spočítá nad ním PEVNOU sadu kalkulací a na stdout vypíše
 *        otisky výstupů (JSON). Sada se bere z TOHOTO stromu (tam, kde leží
 *        nástroj), ne ze stromu, který se počítá — obě strany tak dostanou
 *        bajt po bajtu stejné vstupy:
 *          fixtura:*   zakázky z src/fixtury (každá varianta)
 *          scenar:*    zlatá pojistka #560 + skladebné můstky (jako zlata_vs.js)
 *          k29:*, k36:*  scénáře nálezů K29-N1 (zastřešení vyřazené, měď,
 *                      #451) a K36-N2 (zahraniční montáž můstků, #550)
 *          k50:*       K50-N1 (statika opláštění v zahraniční řadě)
 *          k40:*       K40-N1 (přepnutí typu šachty / zasklení, čelní sklo; #647)
 *          lak:*       LAK #666 (cena lakování z nabídky lakovny, se zdrojem i bez)
 *          vs:*        víc šachet s výchozími názvy, dokumenty EN/DE (DS #648)
 *          dotisk:*    odeslaná nabídka se snímkem zpracovatele (#665, VZD)
 *          proj:*      kalkulace PROJ: sleva 100 % (#683), vyřazená studie, prodaná s lhůtami (D8)
 *          ukazka:*    smyšlené zakázky testovacího webu (src/testdata.js)
 *          fuzz:*      generátor fuzz invariantů, pevné semínko 20261110
 *        Model 1 i Model 2. Ceník: zkušební ceník testů (src/zkusebni_cenik.js
 *        tohoto stromu), nebo --cenik <soubor> ({cenik, cenikProj} nebo
 *        rovnou ceník) — soubor patří MIMO repozitář a do výstupu nejde
 *        žádná jeho hodnota, jen otisky.
 *
 *   node nastroje/porovnani_sada.js porovnej <a.json> <b.json> [--ocekavane <soubor>] [--popis-a T] [--popis-b T] [--max N]
 *        Porovná dvoje otisky, vypíše tabulku a skončí kódem
 *          0  žádný rozdíl, nebo jen rozdíly ze seznamu --ocekavane
 *          1  rozdíl, který v seznamu není (nebo případ chybí v jedné straně)
 *          2  chybné použití / nečitelný vstup
 *
 * Výstup NIKDY nenese ceny ani texty dokumentů — jen jména případů, pole
 * a počty. Ceny se porovnávají přes otisk (sha256, 24 znaků).
 *
 * Pole (co se u případu porovnává):
 *   cena      koncová cena cenaNabidkyOck (základ → sleva → zaokrouhlení)  → „cena celkem"
 *   radky     řádky kalkulace (sekce + příplatky)                          → „řádky"
 *   vyp,vypZ  celý výsledek jádra, výsledek přes vypocetZ                  → „výsledek"
 *   ph-cz/en  symboly cenové nabídky, po klíčích (změněný × jen nový)      → „symboly"
 *   docx      text Wordu nabídky ze zkušební šablony se všemi symboly      → „dokument"
 *   nahled-*, radky-*, kryci-bo/-tech, spec(-en), sod(-en/-de)             → „dokument"
 *   nahled-np-cz/en  Kompletní náhled podkladů (nwBloky, NP #681)          → „dokument"
 *   proj-vyp, proj-cena  výsledek a koncová cena PROJ                      → „cena PROJ"
 *   proj-ph-cz/en  symboly nabídky PROJ po klíčích                          → „symboly"
 *   kryci-proj-bo/-tech, sod-proj, pm, obj-proj                            → „dokument"
 * K56 (24. 11. 2026, svěřené K56-1): krycí list se dřív volal bez verze, takže
 * nenesl žádný řádek; PROJ, náhled podkladů, plná moc, objednávka PROJ a cizí
 * jazyky SoD / specifikace sada neviděla vůbec.
 *   pd, ctrl, snimek, zamek                                                → „ostatní"
 *
 * Soubor --ocekavane (jeden řádek = jedno pravidlo, # komentář):
 *   <vzor případu> <pole,pole|*>   [# důvod]
 *   vzor: jméno případu, * = cokoli (např. „fuzz:*", „*"). Pole: klíč
 *   (cena, radky, docx, …), skupina (cena-celkem, radky, vysledek, symboly,
 *   symboly-nove, dokument, ostatni) nebo * (všechna). Rozdíl případu je
 *   očekávaný, když každé jeho rozdílné pole pokryje aspoň jedno pravidlo.
 *   Pravidlo, které nic nepokrylo, se vypíše jako upozornění (nemění kód).
 * ============================================================ */
'use strict';
const path = require('path');
const fs = require('fs');

const KOREN = path.join(__dirname, '..');
const ZV = require('./zlata_vs.js');
const { kop, otisk, zkus, zkusA, DATUM } = ZV;
/* D4 (19. 11. 2026): popisek a pořadí zobrazení Volitelných se z otisků výsledku
 * očistí (obě strany týmž kódem); cena, dokumenty a controlling se porovnávají celé. */
const { predD4Kopie } = require('./zlata_ocista_d4.js');
const SEMINKO = 20261110;              // semínko generátoru v zlata_vs.js (mulberry32)

/* ---------- skupiny polí ---------- */
const SKUPINY = {
  'cena-celkem': ['cena'],
  'cena-proj': ['proj-vyp', 'proj-cena'],
  radky: ['radky'],
  vysledek: ['vyp', 'vypZ'],
  symboly: ['ph-cz', 'ph-en', 'proj-ph-cz', 'proj-ph-en'],
  dokument: ['docx', 'nahled-cz', 'nahled-en', 'nahled-np-cz', 'nahled-np-en', 'vs-word-cz', 'vs-word-en', 'radky-cz', 'radky-en', 'kryci-bo', 'kryci-tech',
    'spec', 'spec-en', 'sod', 'sod-en', 'sod-de', 'kryci-proj-bo', 'kryci-proj-tech', 'sod-proj', 'pm', 'obj-proj'],
  ostatni: ['pd', 'ctrl', 'snimek', 'zamek'],
};
const POPIS_SKUPINY = { 'cena-celkem': 'cena celkem', 'cena-proj': 'cena PROJ', radky: 'řádky', vysledek: 'výsledek jádra', symboly: 'symboly CN',
  'symboly-nove': 'jen nové symboly', dokument: 'text dokumentu', ostatni: 'ostatní', chybi: 'případ chybí' };
function skupinaPole(k) {
  for (const s of Object.keys(SKUPINY)) if (SKUPINY[s].includes(k)) return s;
  return 'ostatni';
}

/* ============================================================
 * REŽIM 1: otisky nad složkou src
 * ============================================================ */
/* Moduly, které prohlížeč má a ZV.CORE ne (K56): lhůty PROJ (D8), objednávka
 * PROJ (D3), Kompletní náhled podkladů (NP), číslo nabídky (CN). Chybějící
 * soubor (starší sestavení) se přeskočí — funkce pak spadne a porovná se text chyby. */
const MODULY_NAVIC = ['lhuty_proj.js', 'objednavka_proj.js', 'nahled_word.js', 'cislo_nabidky.js'];
function nactiStrom(src) {
  for (const f of ZV.CORE.concat(MODULY_NAVIC)) {
    const p = path.join(src, f);
    if (!fs.existsSync(p)) continue;
    const m = require(p);
    if (m && typeof m === 'object') Object.assign(global, m);
  }
  return JSON.parse(fs.readFileSync(path.join(src, 'jekly.json'), 'utf8'));
}

/* Ceník sady: zkušební z TOHOTO stromu, nebo zadaný soubor. Vrací objekt se
 * stejným rozhraním jako zkusebni_cenik.js (generátor fuzzu ho volá). */
function cenikSady(soubor) {
  const ZC = require(path.join(KOREN, 'src', 'zkusebni_cenik.js'));
  if (!soubor) return { ZC, popis: 'zkušební (src/zkusebni_cenik.js)', zadany: false };
  const d = JSON.parse(fs.readFileSync(soubor, 'utf8'));
  const c = d && d.cenik ? d.cenik : d;
  const cp = d && d.cenikProj ? d.cenikProj : null;
  if (!c || typeof c !== 'object') throw new Error('soubor ceníku nemá tvar {cenik, cenikProj} ani ceníku');
  return {
    ZC: {
      zkusebniCenik: () => kop(c),
      zkusebniCenikProj: () => kop(cp || ZC.zkusebniCenikProj()),
      zkusebniMustky: () => ({}),          // zadaný ceník má můstky v sobě
    },
    popis: 'zadaný soubor (' + path.basename(soubor) + ')', zadany: true,
  };
}

async function scenar(zak, v, J) {
  const d = v.data;
  const o = {};
  const ok = !!(d && d.ock && d.cenik);
  const r = ok ? zkus(() => vypocet(kop(d.ock.zadani), kop(d.cenik), J, d.ock.fixes)) : null;
  const rc = predD4Kopie(r);
  o.vyp = otisk(rc);
  o.radky = otisk(rc && rc.sekce ? { sekce: rc.sekce, priplatky: rc.priplatky } : rc);
  const rz = zkus(() => vypocetZ(v, J));
  o.vypZ = otisk(predD4Kopie(rz));
  o.cena = otisk(zkus(() => cenaNabidkyOck(rz, d.sleva, d.zaokr)));
  for (const L of ['cz', 'en']) {
    const nd = zkus(() => nabidkaData(zak, v, J, L));
    if (nd && nd.placeholders) {
      const ph = {};
      Object.keys(nd.placeholders).sort().forEach(k => { ph[k] = otisk(nd.placeholders[k]).slice(0, 12); });
      o['ph-' + L] = ph;
      o['nahled-' + L] = otisk(zkus(() => nabidkaNahledSekce(nd.placeholders, L, nd.platbyOck, nd.tsExtra)));
      o['radky-' + L] = otisk(nd.tsRadkyNavic);
      o['nahled-np-' + L] = otisk(zkus(() => nwBloky(nd, L, { foto: '' })));
      o['vs-word-' + L] = otisk(nd.sachtyWord || null);   // smyčka šachet Wordu (víc šachet, DS #648)
      if (L === 'cz') o.docx = otisk(await zkusA(() => ZV.docxText(Object.keys(nd.placeholders).sort(), nd.placeholders, nd.tsRadkyNavic)));
    } else o['ph-' + L] = { '(chyba)': otisk(nd) };
  }
  /* Krycí list s verzí listu (K56): bez verze kryciData nevrátí žádný řádek. */
  o['kryci-bo'] = otisk(zkus(() => kryciData(zak, v, J, 'bo')));
  o['kryci-tech'] = otisk(zkus(() => kryciData(zak, v, J, 'techdata')));
  const r2 = ok ? zkus(() => vypocet(d.ock.zadani, d.cenik, J, d.ock.fixes)) : null;
  const spec = (L) => otisk(zkus(() => {
    const ts = {};
    TECHSPEC_DEF.forEach(s => (!s.jen || s.jen(r2, d.ock.zadani)) && s.pole.forEach(p => {
      ts[p.id] = tsHodnota(p, d.techspec, r2, d.ock.zadani, d.cenik, L).text;
    }));
    return ts;
  }));
  o.spec = spec('cz');
  o['spec-en'] = spec('en');
  o.sod = otisk(zkus(() => sodData(zak, v, J, 'cz')));
  o['sod-en'] = otisk(zkus(() => sodData(zak, v, J, 'en')));
  o['sod-de'] = otisk(zkus(() => sodData(zak, v, J, 'de')));
  /* PROJ (K56): výsledek, koncová cena, symboly nabídky, krycí list, SoD
   * projekce, plná moc a objednávka PROJ — dřív sada PROJ nepočítala vůbec. */
  const rp = zkus(() => vypocetProjZ(v));
  o['proj-vyp'] = otisk(rp);
  o['proj-cena'] = otisk(zkus(() => cenaNabidkyProj(rp, d.slevaProj, d.zaokrProj)));
  /* PROJ EN bere kurz z ceníku PROJ (kurzEurZ); sada ho jinde nenese, takže
   * se pro EN doplní z ceníku OCK (nebo 25) — jinak by EN spadla všude stejně. */
  const vEn = d.proj && d.proj.cenik && !d.proj.cenik.kurzEurKc
    ? Object.assign({}, v, { data: Object.assign({}, d, { proj: Object.assign({}, d.proj, { cenik: Object.assign({}, d.proj.cenik, { kurzEurKc: (d.cenik && d.cenik.kurzEurKc) || 25 }) }) }) })
    : v;
  for (const L of ['cz', 'en']) {
    const np = zkus(() => nabidkaProjData(zak, L === 'en' ? vEn : v, L));
    if (np && np.placeholders) {
      const ph = {};
      Object.keys(np.placeholders).sort().forEach(k => { ph[k] = otisk(np.placeholders[k]).slice(0, 12); });
      o['proj-ph-' + L] = ph;
    } else o['proj-ph-' + L] = { '(chyba)': otisk(np) };
  }
  o['kryci-proj-bo'] = otisk(zkus(() => kryciProjData(zak, v, J, 'bo')));
  o['kryci-proj-tech'] = otisk(zkus(() => kryciProjData(zak, v, J, 'techdata')));
  o['sod-proj'] = otisk(zkus(() => sodProjData(zak, v, 'cz')));
  o.pm = otisk(zkus(() => plnaMocData(zak, v)));
  o['obj-proj'] = otisk(zkus(() => objednavkaProjData(zak, v)));
  o.pd = otisk(zkus(() => pdnTelo(pdnPodklad(zak, J))));
  o.ctrl = otisk(zkus(() => {
    const { z, vv } = ZV.zamcena(zak, v, J);
    const exp = ctrlExportVarianty(z, vv, { jekly: J, kdo: 'zlata@priklad.cz', kdy: DATUM + 'T10:00:00Z', build: 'zlata' });
    return exp && exp.ok === false ? exp : ctrlExportCsv(exp);
  }));
  o.snimek = otisk(zkus(() => zamekSnimekSpocti(v)));
  o.zamek = otisk(zkus(() => { const x = zamekVysledekSpocti(v, J, 'zlata'); if (x) delete x.kdy; return predD4Kopie(x); }));
  return o;
}

function nova(cislo, nazev) {
  const zak = novaZakazka();
  zak.cislo = cislo; zak.nazevAkce = nazev;
  ZV.pevneDatum(zak);
  return zak;
}

async function otisky(src, volby) {
  const o = volby || {};
  const pocetFuzz = Math.max(0, o.fuzz == null ? 300 : +o.fuzz || 0);
  const C = cenikSady(o.cenik);
  const ZC = C.ZC;
  ZV.pevneHodiny();
  const J = nactiStrom(path.resolve(src));
  global.DEFAULT_CENIK = ZC.zkusebniCenik();
  global.DEFAULT_CENIK_PROJ = ZC.zkusebniCenikProj();
  const cenikZ = (mustky) => Object.assign(ZC.zkusebniCenik(), mustky ? ZC.zkusebniMustky() : {}, { kurzEurKc: 25 });
  const out = {};

  /* 1) fixtury — z TOHOTO stromu */
  const fdir = path.join(KOREN, 'src', 'fixtury');
  for (const f of fs.readdirSync(fdir).filter(x => x.endsWith('.json')).sort()) {
    const zak = importZakazka(JSON.parse(fs.readFileSync(path.join(fdir, f), 'utf8')));
    for (const v of zak.varianty) {
      if (C.zadany && v.data) v.data.cenik = Object.assign(ZC.zkusebniCenik(), { kurzEurKc: (v.data.cenik && v.data.cenik.kurzEurKc) || 25 });
      out['fixtura:' + f + ':' + v.id] = await scenar(zak, v, J);
    }
  }

  /* 2) zlatá pojistka #560 + skladebné můstky (stejné jako zlata_vs.js) */
  const ZAD = { prejezd: 3.3, zdvih: 12, prohluben: 1.2, sirka: 1.6, hloubka: 2.1, nastupiste: 4 };
  const SC = [
    ['ext-354', 'exteriérová', {}, true], ['int-pausal', 'interiérová', {}, false],
    ['stare-2ks-354', 'exteriérová', { mustkyKs: 2, mustekHloubkaMm: 1200 }, true],
    ['stare-zaskrtnuty-pausal', 'interiérová', { mustek: true, mustekHloubkaMm: 900, mustekSirkaMm: 1500 }, false],
    ['skladebne-1', 'exteriérová', { mustky: [{ ks: 2, sirkaMm: 1600, delkaMm: 1200, podlaha: 'plech', zabradli: 'kov', zabradliStrany: 2, sloupyKs: 2, sloupVyskaM: 3.2 }] }, true],
    ['skladebne-2', 'interiérová', { mustky: [{ ks: 1, sirkaMm: 1200, delkaMm: 900, podlaha: 'pororost', zabradli: 'sklo', zabradliStrany: 1, sloupyKs: 0, sloupVyskaM: 0 },
      { ks: 3, sirkaMm: 1400, delkaMm: 1500, podlaha: 'vana', zabradli: 'bez', zabradliStrany: 0, sloupyKs: 0, sloupVyskaM: 0 }] }, true],
  ];
  /* 3) K29-N1 / #451 (test_mustky.js) a K36-N2 / #550 (test_550_zahr_mustky.js) */
  const ZAS = 'ZASTŘEŠENÍ ŠACHTY (EXT)', MED = 'PŘÍPLATEK ZA STŘECHU V MĚDI (EXT)';
  const M3 = { mustkyKs: 3, mustekSirkaMm: 1300, mustekHloubkaMm: 900 };
  const K29 = [
    ['k29:zastreseni-vyrazene', {}, { nepocitat: [ZAS] }],
    ['k29:3-mustky-zastreseni-vyrazene', {}, Object.assign({}, M3, { nepocitat: [ZAS] })],
    ['k29:3-mustky-se-zastresenim', {}, M3],
    ['k29:prepis-zastreseni-0', {}, { mnozstviPrepis: { [ZAS]: 0 } }],
    ['k29:prepis-zastreseni-prazdny', {}, { mnozstviPrepis: { [ZAS]: '' } }],
    ['k29:vlastni-med', {}, { nepocitat: [ZAS], mnozstviPrepis: { [MED]: 7.5 } }],
    ['k29:451-prepis-zastreseni-9', {}, Object.assign({}, M3, { mnozstviPrepis: { [ZAS]: '9.5' } })],
  ];
  const K36_ZAHR = { ceny: { 'C.montazHodKc': 777, 'C.cestovniKc': 20000 }, jenZahr: {} };
  const K36 = [
    ['k36:zahr-mustek-bez-vlastni-sazby', K36_ZAHR, { mustkyKs: 1, mustekHloubkaMm: 1000 }],
    ['k36:zahr-mustek-vlastni-sazba', { ceny: Object.assign({}, K36_ZAHR.ceny, { 'C.mustekMontazHodKc': 650 }), jenZahr: {} }, { mustkyKs: 1, mustekHloubkaMm: 1000 }],
    ['k36:zahr-skladebne', K36_ZAHR, SC[4][2]],
    ['k36:cr-mustek', null, { mustkyKs: 1, mustekHloubkaMm: 1000 }],
  ];
  const zadaniScenare = [];
  SC.forEach(([jm, typ, up, mu]) => zadaniScenare.push(['scenar:' + jm, typ, up, mu, null]));
  K29.forEach(([jm, , up]) => zadaniScenare.push([jm, 'exteriérová', up, true, null]));
  K36.forEach(([jm, zahr, up]) => zadaniScenare.push([jm, 'exteriérová', up, true, zahr || 'cr']));
  for (const [jm, typ, up, mu, rada] of zadaniScenare) {
    for (const f of [true, false]) {
      const zak = nova('2026-OPR-CN-9590', 'Porovnání sestavení ' + jm);
      const v = zak.varianty[0];
      Object.assign(v.data.ock.zadani, ZAD, { typSachty: typ, profily: kop((global.PROFILY_VYCHOZI || {})[typ] || v.data.ock.zadani.profily) }, kop(up));
      v.data.ock.fixes = f;
      v.data.cenik = cenikZ(mu);
      if (rada) {
        const zahr = rada === 'cr' ? K36_ZAHR : rada;
        const slozeny = zkus(() => cenikSlozRadu(v.data.cenik, zahr, rada === 'cr' ? 'cr' : 'zahr'));
        if (slozeny && !slozeny.chyba) v.data.cenik = Object.assign(slozeny, { kurzEurKc: 25 });
        if (rada !== 'cr') v.data.cenikRada = 'zahr';
      }
      out[jm + ':' + (f ? 'm2' : 'm1')] = await scenar(zak, v, J);
    }
  }

  /* 3b) K50-N1 (kolo 50): statika opláštění v zahraniční řadě — S3 tuhle
   *     vadu neodhalil, sada neměla zahraniční kalkulaci se statikou
   *     opláštění. Ceník + hodiny statiky opláštění, šachta se zaškrtnutím;
   *     zahraniční statika bez / s vlastní statikou opláštění a tuzemsko.
   *     Čísla smyšlená (test_k50n1_statika_zahr.js). */
  const K50_ZAHR = { ceny: { 'C.statikaKc': 5000, 'C.montazHodKc': 777 }, jenZahr: {} };
  const K50 = [
    ['k50:zahr-statika-opl-bez-vlastni', K50_ZAHR, 'zahr'],
    ['k50:zahr-statika-opl-vlastni', { ceny: Object.assign({}, K50_ZAHR.ceny, { 'C.statikaOplKc': 4200 }), jenZahr: {} }, 'zahr'],
    ['k50:cr-statika-opl', K50_ZAHR, 'cr'],
  ];
  for (const [jm, zahr, rada] of K50) {
    for (const f of [true, false]) {
      const zak = nova('2026-OPR-CN-9591', 'Porovnání sestavení ' + jm);
      const v = zak.varianty[0];
      Object.assign(v.data.ock.zadani, ZAD, { typSachty: 'exteriérová',
        profily: kop((global.PROFILY_VYCHOZI || {})['exteriérová'] || v.data.ock.zadani.profily), statikaOpl: true });
      v.data.ock.fixes = f;
      const slozeny = zkus(() => cenikSlozRadu(Object.assign(cenikZ(false), { statikaOplHod: 6 }), zahr, rada));
      v.data.cenik = (slozeny && !slozeny.chyba) ? Object.assign(slozeny, { kurzEurKc: 25 }) : Object.assign(cenikZ(false), { statikaOplHod: 6 });
      if (rada === 'zahr') v.data.cenikRada = 'zahr';
      out[jm + ':' + (f ? 'm2' : 'm1')] = await scenar(zak, v, J);
    }
  }

  /* 3c) K40-N1 (#614, #647): přepnutí typu šachty / zasklení s vyřazeným nebo
   *     přepsaným čelním sklem. Sada dřív neměla zakázku, kde se po přepnutí
   *     řádek čelního skla přejmenuje (VSG 4.4.2 ↔ 4.4.1), takže porovnání
   *     main × test vadu ceny K40-N1 nevidělo (kolo 49). Přepnutí se dělá jako
   *     v UI `set('Z.typSachty' | 'Z.zaskleni')`: název čelního skla PŘED změnou,
   *     změna zadání, `skloMigraceNazvu(data, { predCelni, zadani })`. Jádro bez
   *     opravy K40-N1 (main v11.11.1) dvojici ignoruje — vyřazené sklo zůstane
   *     pod starým názvem a nové se počítá (jiná cena a řádky). Čísla smyšlená. */
  const K40 = [
    ['k40:int-terce-na-ext-vyrazene', { typSachty: 'interiérová', zaskleni: 'na terče' }, { typSachty: 'exteriérová' }, 'nepocitat'],
    ['k40:int-terce-na-prictniky-vyrazene', { typSachty: 'interiérová', zaskleni: 'na terče' }, { zaskleni: 'mezi příčníky' }, 'nepocitat'],
    ['k40:int-prictniky-na-terce-vyrazene', { typSachty: 'interiérová', zaskleni: 'mezi příčníky' }, { zaskleni: 'na terče' }, 'nepocitat'],
    ['k40:ext-na-int-terce-mnozstvi', { typSachty: 'exteriérová', zaskleni: 'na terče' }, { typSachty: 'interiérová' }, 'mnozstvi'],
  ];
  for (const [jm, pred, po, druh] of K40) {
    for (const f of [true, false]) {
      const zak = nova('2026-OPR-CN-9592', 'Porovnání sestavení ' + jm);
      const v = zak.varianty[0];
      const z = v.data.ock.zadani;
      Object.assign(z, ZAD, pred, { profily: kop((global.PROFILY_VYCHOZI || {})[pred.typSachty] || z.profily) });
      v.data.ock.fixes = f;
      v.data.cenik = cenikZ(false);
      const predCelni = zkus(() => skloVolba(z, v.data.cenik).celni.nazev);
      if (typeof predCelni === 'string') {
        if (druh === 'nepocitat') z.nepocitat = (Array.isArray(z.nepocitat) ? z.nepocitat : []).concat([predCelni]);
        else z.mnozstviPrepis = Object.assign({}, z.mnozstviPrepis, { [predCelni]: 2.5 });
      }
      Object.assign(z, po);
      if (po.typSachty) z.profily = kop((global.PROFILY_VYCHOZI || {})[po.typSachty] || z.profily);
      zkus(() => skloMigraceNazvu(v.data, { predCelni, zadani: z }));
      out[jm + ':' + (f ? 'm2' : 'm1')] = await scenar(zak, v, J);
    }
  }

  /* 3d) K56 — scénáře změn main → test, které pevná sada nepokrývala.
   *     Data se skládají přímo (ne funkcemi rucniCenaNastav ap.), aby obě
   *     sestavení dostala bajt po bajtu stejný vstup. Čísla a jména smyšlená. */
  const LAK = 'C.lak.nabidkaKc';
  const LAK_ZAZNAM = (h, zdroj) => ({ dodavatel: zdroj ? 'Lakovna Příklad s.r.o.' : '', cislo: zdroj ? 'NL-2026-66' : '', datum: '', platnostDo: '',
    zaklad: null, hodnota: h, potvrdil: zdroj ? { jmeno: 'Porovnání', email: '', kdy: DATUM + 'T10:00:00Z', lokalne: true } : null });
  const LAKS = [
    ['lak:ext-tomas-se-zdrojem', 'exteriérová', 'tomas', 54321, true],
    ['lak:ext-lakovna-se-zdrojem', 'exteriérová', 'lakovna', 54321, true],
    ['lak:int-tomas-nula-se-zdrojem', 'interiérová', 'tomas', 0, true],
    ['lak:ext-tomas-bez-zdroje', 'exteriérová', 'tomas', 40000, false],
    ['lak:ext-tomas-vlastni-polozka', 'exteriérová', 'tomas', 54321, true],
  ];
  for (const [jm, typ, rezim, h, zdroj] of LAKS) {
    for (const f of [true, false]) {
      const zak = nova('2026-OPR-CN-9666', 'Porovnání sestavení ' + jm);
      const v = zak.varianty[0];
      Object.assign(v.data.ock.zadani, ZAD, { typSachty: typ, profily: kop((global.PROFILY_VYCHOZI || {})[typ] || v.data.ock.zadani.profily) });
      if (/vlastni/.test(jm)) v.data.ock.zadani.vlastniPolozky = { lakovani: [{ nazev: 'Lak navíc', mnozstvi: 2, cena: 1000 }] };
      v.data.ock.fixes = f;
      v.data.cenik = cenikZ(false);
      v.data.cenik.lak = Object.assign({}, v.data.cenik.lak, { rezim, nabidkaKc: h });
      v.data.rucniCeny = Object.assign({}, v.data.rucniCeny, { [LAK]: LAK_ZAZNAM(h, zdroj) });
      out[jm + ':' + (f ? 'm2' : 'm1')] = await scenar(zak, v, J);
    }
  }
  /* víc šachet s výchozím a ručním názvem (DS #648): nabídka a SoD i EN/DE */
  for (const [jm, nazvy] of [['vs:vychozi-nazvy', ['', 'Šachta 2']], ['vs:rucni-nazvy', ['Výtah A', 'Výtah B']]]) {
    const zak = nova('2026-OPR-CN-9648', 'Porovnání sestavení ' + jm);
    const v = zak.varianty[0];
    Object.assign(v.data.ock.zadani, ZAD, { typSachty: 'exteriérová', profily: kop((global.PROFILY_VYCHOZI || {})['exteriérová'] || v.data.ock.zadani.profily) });
    v.data.ock.fixes = true;
    v.data.cenik = cenikZ(false);
    v.data.ock.nazev = nazvy[0];
    const zB = Object.assign(kop(global.DEFAULT_ZADANI || v.data.ock.zadani), ZAD, { sirka: 2.4, typSachty: 'interiérová',
      profily: kop((global.PROFILY_VYCHOZI || {})['interiérová'] || v.data.ock.zadani.profily) });
    v.data.ock.dalsi = [{ id: 's_b', nazev: nazvy[1], ks: 2, zadani: zB }];
    out[jm + ':m2'] = await scenar(zak, v, J);
  }
  /* odeslaná nabídka se snímkem zpracovatele (#665): dotisk tiskne „Vypracoval“ z doby odeslání */
  for (const [jm, se] of [['dotisk:se-snimkem-zpracovatele', true], ['dotisk:bez-snimku', false]]) {
    const zak = nova('2026-OPR-CN-9665', 'Porovnání sestavení ' + jm);
    zak.projHlavicka = Object.assign({}, zak.projHlavicka, { cislo: '2026 - OVP - CN - 9665' });
    const v = zak.varianty[0];
    Object.assign(v.data.ock.zadani, ZAD);
    v.data.ock.fixes = true;
    v.data.cenik = cenikZ(false);
    const { vv } = ZV.zamcena(zak, v, J);
    v.zamek = vv.zamek;
    if (se) v.zamek.zpracovatel = { email: 'puvodni.obchodnik@priklad.cz', jmeno: 'Petr Původní', titul: 'Ing.', funkce: 'Obchodní technik', telefon: '212 300 111' };
    out[jm + ':m2'] = await scenar(zak, v, J);
  }
  /* PROJ (#683, D8): výchozí, sleva 100 %, vyřazená studie, prodaná s lhůtami */
  const PROJS = [
    ['proj:vychozi', () => {}],
    ['proj:sleva-100', v => { v.data.slevaProj = Object.assign({}, v.data.slevaProj, { procenta: 100, stav: 'schváleno' }); }],
    ['proj:sleva-30', v => { v.data.slevaProj = Object.assign({}, v.data.slevaProj, { procenta: 30, stav: 'schváleno' }); }],
    ['proj:studie-vyrazena', v => { const st = (v.data.proj.zadani.sekce || []).find(s => s.key === 'studie'); if (st) st.polozky.forEach(p => { p.vyrazeno = true; }); }],
    ['proj:prodana-lhuty', v => { v.zamek = { zamceno: true, tisky: [] }; v.prodano = { datum: DATUM, zakaznik: 'z1' };
      if (typeof lhutyProjVychozi === 'function') v.data.kryciProj = Object.assign({ hodnoty: {} }, v.data.kryciProj, { lhutyProj: lhutyProjVychozi() }); }],
    ['proj:prodana-sleva-100', v => { v.data.slevaProj = Object.assign({}, v.data.slevaProj, { procenta: 100, stav: 'schváleno' });
      v.zamek = { zamceno: true, tisky: [] }; v.prodano = { datum: DATUM, zakaznik: 'z1' };
      if (typeof lhutyProjVychozi === 'function') v.data.kryciProj = Object.assign({ hodnoty: {} }, v.data.kryciProj, { lhutyProj: lhutyProjVychozi() }); }],
  ];
  for (const [jm, uprava] of PROJS) {
    const zak = nova('2026-OPR-CN-9683', 'Porovnání sestavení ' + jm);
    zak.projHlavicka = Object.assign({}, zak.projHlavicka, { cislo: '2026 - OVP - CN - 9683' });
    const v = zak.varianty[0];
    Object.assign(v.data.ock.zadani, ZAD);
    v.data.ock.fixes = true;
    v.data.cenik = cenikZ(false);
    v.data.proj.cenik = ZC.zkusebniCenikProj();
    v.data.kryciProj = { hodnoty: {} };
    uprava(v);
    out[jm + ':m2'] = await scenar(zak, v, J);
  }

  /* 4) smyšlené zakázky testovacího webu (src/testdata.js TOHOTO stromu) */
  const TD = require(path.join(KOREN, 'src', 'testdata.js'));
  for (const p of TD.TESTDATA_ZAKAZKY) {
    for (const f of [true, false]) {
      const zak = TD.testDataZakazka(p, novaZakazka);
      ZV.pevneDatum(zak);
      (zak.poznamky || []).forEach(x => { if (x && typeof x === 'object') { x.kdy = DATUM + 'T10:00:00.000Z'; delete x.id; } });
      const v = zak.varianty[0];
      v.data.ock.fixes = f;
      v.data.cenik = cenikZ(false);
      out['ukazka:' + p.cislo.replace(/\s/g, '') + ':' + (f ? 'm2' : 'm1')] = await scenar(zak, v, J);
    }
  }

  /* 5) fuzz — generátor fuzz invariantů, pevné semínko */
  const G = ZV.generator(ZC);
  for (let i = 0; i < pocetFuzz; i++) {
    const { c } = G.genCenik();
    const { z, fixes, sleva, zaokr } = G.genZadani();
    const zak = nova('2026-OPR-CN-' + String(9000 + i), 'Fuzz ' + i);
    const v = zak.varianty[0];
    v.data.ock.zadani = z; v.data.ock.fixes = fixes; v.data.cenik = Object.assign(c, { kurzEurKc: 25 });
    if (sleva && v.data.sleva) { v.data.sleva.procenta = sleva; v.data.sleva.stav = 'schváleno'; }
    if (zaokr) v.data.zaokr = Object.assign({}, v.data.zaokr || {}, zaokr);
    out['fuzz:' + i] = await scenar(zak, v, J);
  }
  return { cenik: C.popis, fuzz: pocetFuzz, seminko: SEMINKO, scenare: out };
}

/* ============================================================
 * REŽIM 2: porovnání
 * ============================================================ */
function nactiOcekavane(soubor) {
  if (!soubor) return [];
  return fs.readFileSync(soubor, 'utf8').split('\n').map((l, i) => ({ l: l.replace(/#.*$/, '').trim(), radek: i + 1 }))
    .filter(x => x.l).map(x => {
      const [vzor, pole] = x.l.split(/\s+/);
      const re = new RegExp('^' + vzor.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$');
      return { vzor, re, pole: (pole || '*').split(','), radek: x.radek, pouzito: 0 };
    });
}
function pravidloKryje(p, pole) {
  return p.pole.some(x => x === '*' || x === pole.klic || x === pole.skupina);
}

/* Rozdílná pole jednoho případu: [{klic, skupina}] */
function rozdilyPripadu(a, b) {
  const out = [];
  const klice = Array.from(new Set(Object.keys(a).concat(Object.keys(b))));
  for (const k of klice) {
    const x = a[k], y = b[k];
    if (x && typeof x === 'object' && y && typeof y === 'object') {
      const kx = Object.keys(x), ky = Object.keys(y);
      const zmenene = kx.filter(q => q in y && x[q] !== y[q]);
      const zmizele = kx.filter(q => !(q in y));
      const nove = ky.filter(q => !(q in x));
      if (zmenene.length || zmizele.length) out.push({ klic: k, skupina: 'symboly', detail: zmenene.concat(zmizele.map(q => '−' + q)) });
      else if (nove.length) out.push({ klic: k, skupina: 'symboly-nove', detail: nove.map(q => '+' + q) });
    } else if (JSON.stringify(x) !== JSON.stringify(y)) out.push({ klic: k, skupina: skupinaPole(k) });
  }
  return out;
}

function skupinaPripadu(jm) {
  const p = jm.split(':')[0];
  return { fixtura: 'fixtury', scenar: 'scénáře #560 + můstky', k29: 'K29-N1 / #451', k36: 'K36-N2 / #550', k50: 'K50-N1', k40: 'K40-N1 / #614', lak: 'LAK #666', vs: 'víc šachet #648', dotisk: 'dotisk #665', proj: 'PROJ #683 / D8', ukazka: 'ukázkové zakázky', fuzz: 'fuzz (semínko)' }[p] || p;
}

function porovnej(A, B, volby) {
  const o = volby || {};
  const pravidla = nactiOcekavane(o.ocekavane);
  const sa = A.scenare || {}, sb = B.scenare || {};
  const jmena = Array.from(new Set(Object.keys(sa).concat(Object.keys(sb))));
  const skup = {};
  const poPoli = {};
  const pripady = [];
  for (const jm of jmena) {
    const g = skupinaPripadu(jm);
    const s = skup[g] || (skup[g] = { celkem: 0, shodne: 0, rozdilne: 0, ocekavane: 0, neocekavane: 0 });
    s.celkem++;
    let pole;
    if (!sa[jm] || !sb[jm]) pole = [{ klic: 'chybi', skupina: 'chybi', detail: [sa[jm] ? 'chybí v B' : 'chybí v A'] }];
    else pole = rozdilyPripadu(sa[jm], sb[jm]);
    if (!pole.length) { s.shodne++; continue; }
    s.rozdilne++;
    pole.forEach(p => { poPoli[p.skupina] = (poPoli[p.skupina] || 0) + 1; });
    const pokryto = pole.every(p => {
      const kdo = pravidla.filter(r => r.re.test(jm) && pravidloKryje(r, p));
      kdo.forEach(r => r.pouzito++);
      return p.skupina !== 'chybi' && kdo.length > 0;
    });
    if (pokryto) s.ocekavane++; else s.neocekavane++;
    pripady.push({ jm, pole, ocekavany: pokryto });
  }
  return { skup, poPoli, pripady, pravidla, celkem: jmena.length };
}

function tabulka(v, A, B, o) {
  const r = [];
  const pad = (s, n) => String(s).padEnd(n);
  const padL = (s, n) => String(s).padStart(n);
  r.push('POROVNÁNÍ SESTAVENÍ');
  r.push('  A = ' + (o.popisA || 'A') + '   B = ' + (o.popisB || 'B'));
  r.push('  ceník: ' + (A.cenik || '?') + (A.cenik !== B.cenik ? ' × ' + B.cenik : '') + '   fuzz: ' + A.fuzz + ' (semínko ' + A.seminko + ')'
    + (o.ocekavane ? '   očekávané: ' + path.basename(o.ocekavane) + ' (' + v.pravidla.length + ' pravidel)' : ''));
  r.push('');
  r.push('  ' + pad('skupina', 24) + padL('kalkulací', 10) + padL('shodné', 8) + padL('rozdílné', 10) + padL('očekávané', 11) + padL('neočekávané', 13));
  const sum = { celkem: 0, shodne: 0, rozdilne: 0, ocekavane: 0, neocekavane: 0 };
  Object.keys(v.skup).forEach(g => {
    const s = v.skup[g];
    Object.keys(sum).forEach(k => { sum[k] += s[k]; });
    r.push('  ' + pad(g, 24) + padL(s.celkem, 10) + padL(s.shodne, 8) + padL(s.rozdilne, 10) + padL(s.ocekavane, 11) + padL(s.neocekavane, 13));
  });
  r.push('  ' + pad('CELKEM', 24) + padL(sum.celkem, 10) + padL(sum.shodne, 8) + padL(sum.rozdilne, 10) + padL(sum.ocekavane, 11) + padL(sum.neocekavane, 13));
  if (sum.rozdilne) {
    r.push('');
    r.push('  Rozdílné případy podle pole: ' + Object.keys(v.poPoli).sort().map(k => (POPIS_SKUPINY[k] || k) + ' ' + v.poPoli[k]).join(', '));
    /* Vzory: případy se stejnou sadou rozdílných polí — z nich se píše seznam očekávaných. */
    const vzory = {};
    v.pripady.forEach(p => {
      const kl = p.pole.map(x => x.skupina === 'symboly-nove' ? x.klic + '(nové)' : x.klic).sort().join(',');
      const z = vzory[kl] || (vzory[kl] = { n: 0, ocek: 0, skupiny: new Set(), prvni: p.jm });
      z.n++; if (p.ocekavany) z.ocek++; z.skupiny.add(p.jm.split(':')[0]);
    });
    r.push('  Vzory rozdílů (pole → počet případů):');
    Object.keys(vzory).sort((a, b) => vzory[b].n - vzory[a].n).forEach(k => {
      const z = vzory[k];
      r.push('    ' + k + ' → ' + z.n + (z.ocek === z.n ? ' (očekávané)' : z.ocek ? ' (' + z.ocek + ' očekávaných)' : '')
        + '   skupiny: ' + Array.from(z.skupiny).join(', ') + '   např. ' + z.prvni);
    });
    const max = o.max == null ? 40 : o.max;
    const nejdriv = v.pripady.filter(p => !p.ocekavany).concat(v.pripady.filter(p => p.ocekavany));
    r.push('  Případy' + (nejdriv.length > max ? ' (prvních ' + max + ' z ' + nejdriv.length + ', neočekávané první)' : '') + ':');
    nejdriv.slice(0, max).forEach(p => {
      const pp = p.pole.map(x => (POPIS_SKUPINY[x.skupina] || x.skupina) + (x.skupina === 'symboly' || x.skupina === 'symboly-nove' || x.skupina === 'chybi'
        ? ' [' + x.klic.replace(/^chybi$/, '') + (x.detail ? (x.klic === 'chybi' ? '' : ': ') + x.detail.slice(0, 4).join(' ') + (x.detail.length > 4 ? ' …+' + (x.detail.length - 4) : '') : '') + ']'
        : ' (' + x.klic + ')'));
      r.push('    ' + (p.ocekavany ? '  očekávaný  ' : '✗ NEOČEKÁVANÝ ') + p.jm + ' — ' + pp.join('; '));
    });
  }
  const nepouzita = v.pravidla.filter(p => !p.pouzito);
  if (nepouzita.length) {
    r.push('');
    r.push('  Upozornění: očekávaný rozdíl se neprojevil (pravidlo nic nepokrylo):');
    nepouzita.forEach(p => r.push('    řádek ' + p.radek + ': ' + p.vzor + ' ' + p.pole.join(',')));
  }
  r.push('');
  r.push('POROVNANI: ' + sum.celkem + ' kalkulací, ' + sum.shodne + ' shodných, ' + sum.rozdilne + ' rozdílných ('
    + sum.ocekavane + ' očekávaných, ' + sum.neocekavane + ' neočekávaných)');
  r.push('Výsledek: ' + (sum.neocekavane ? 'NEOČEKÁVANÝ ROZDÍL' : sum.rozdilne ? 'JEN OČEKÁVANÉ ROZDÍLY' : 'SHODA'));
  return { text: r.join('\n'), kod: sum.neocekavane ? 1 : 0, sum };
}

/* ============================================================
 * příkazová řádka
 * ============================================================ */
function argy(pole, sHodnotou) {
  const o = { _: [] };
  for (let i = 0; i < pole.length; i++) {
    const a = pole[i];
    if (a.startsWith('--')) {
      const k = a.slice(2);
      if (!sHodnotou.includes(k)) throw new Error('neznámá volba: ' + a);
      if (i + 1 >= pole.length) throw new Error('volba ' + a + ' chce hodnotu');
      o[k] = pole[++i];
    } else o._.push(a);
  }
  return o;
}

if (require.main === module) {
  const [rezim, ...zbytek] = process.argv.slice(2);
  try {
    if (rezim === 'otisky') {
      const a = argy(zbytek, ['cenik', 'fuzz']);
      if (a._.length !== 1) throw new Error('otisky chce právě jednu složku src');
      otisky(a._[0], { cenik: a.cenik, fuzz: a.fuzz }).then(x => {
        process.stdout.write(JSON.stringify(x).replace(/\},"/g, '},\n"') + '\n');
      }).catch(e => { console.error('CHYBA: ' + (e && e.stack || e)); process.exit(2); });
    } else if (rezim === 'porovnej') {
      const a = argy(zbytek, ['ocekavane', 'popis-a', 'popis-b', 'max']);
      if (a._.length !== 2) throw new Error('porovnej chce dva soubory otisků');
      const A = JSON.parse(fs.readFileSync(a._[0], 'utf8')), B = JSON.parse(fs.readFileSync(a._[1], 'utf8'));
      if (!A.scenare || !B.scenare) throw new Error('soubor otisků nemá „scenare"');
      if (a.ocekavane && !fs.existsSync(a.ocekavane)) throw new Error('soubor očekávaných rozdílů neexistuje: ' + a.ocekavane);
      const o = { ocekavane: a.ocekavane, popisA: a['popis-a'], popisB: a['popis-b'], max: a.max == null ? undefined : +a.max };
      const t = tabulka(porovnej(A, B, o), A, B, o);
      console.log(t.text);
      process.exit(t.kod);
    } else {
      throw new Error('použití: porovnani_sada.js otisky <src> [--cenik f] [--fuzz N] | porovnej <a.json> <b.json> [--ocekavane f]');
    }
  } catch (e) { console.error('CHYBA: ' + e.message); process.exit(2); }
}
module.exports = { otisky, porovnej, tabulka, rozdilyPripadu, nactiOcekavane, SKUPINY };
