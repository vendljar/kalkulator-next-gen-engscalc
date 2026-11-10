/* VS #570 / E5 (#595) — ZÁMEK ODESLANÉ NABÍDKY S VÍC ŠACHTAMI, 10. 11. 2026.
 *
 *  A) snímek (zamekSnimekSpocti): u víc šachet sachty [{id, nazev, ks}]
 *     + sachtyVerze 1; jedna šachta beze změny (4 klíče);
 *  B) zmrazený výsledek: dotisk krycího listu, SoD a Pipedrive ze zámku —
 *     změna dat po odeslání (ceník, název šachty) výstupy nezmění; přísné
 *     ověření nového zámku serverem = shoda, podvržená cena šachty = rozdíl;
 *  C) starý zámek bez sachtyVerze = jedna šachta (výstupy jako dnes);
 *  D) zamčená varianta nedovolí přidat / smazat / změnit šachtu (data
 *     zamčené varianty se porovnávají celá → server 409), vsZamekZmenaSachet
 *     pro UI;
 *  E) velikost zámku u 10 variant šachet.
 * Pojistka: na 079cfc6 sada padá (snímek bez sachty, vsVystup a
 * vsZamekZmenaSachet neexistují) — viz zpráva commitu.
 * Spuštění: node src/test_vs_zamek.js */
'use strict';
const path = require('path');
const fs = require('fs');
const CORE = ['build_info.js', 'nazvy_souboru.js', 'preklad.js', 'format.js', 'engine.js', 'vice_sachet.js', 'engine_proj.js', 'techspec.js',
  'zakazka.js', 'uloziste.js', 'retence_zaloh.js', 'zamek.js', 'seznam.js', 'archiv.js', 'docxgen.js', 'xlsx.js', 'dokumenty.js',
  'sleva.js', 'schvalovani.js', 'zaokrouhleni.js', 'marze.js', 'kontroly.js', 'ares.js', 'poznamky.js', 'protokol.js', 'firma.js',
  'zpracovatel.js', 'podminky.js', 'plan_plateb.js', 'nabidka.js', 'nabidka_proj.js', 'sod.js', 'kryci.js', 'kryci_proj.js',
  'cenik.js', 'cenik_stari.js', 'cenik_rady.js', 'vyjimky.js', 'rucni_ceny.js', 'katalog.js', 'prepisy.js', 'slovnik.js',
  'konfigurace.js', 'sablony_online.js', 'sablona_obsah.js', 'analytika.js', 'nastaveni_db.js', 'program.js', 'ukazkove.js',
  'prava.js', 'zobrazeni.js', 'zakaznici.js', 'controlling.js', 'pd_nanecisto.js', 'objednane.js', 'standard_ock.js'];
CORE.forEach(f => { const m = require(path.join(__dirname, f)); if (m && typeof m === 'object') Object.assign(global, m); });
const ZC = require('./zkusebni_cenik.js');
global.DEFAULT_CENIK = ZC.zkusebniCenik();
global.DEFAULT_CENIK_PROJ = ZC.zkusebniCenikProj();
const J = JSON.parse(fs.readFileSync(path.join(__dirname, 'jekly.json'), 'utf8'));

let ok = 0, fail = 0;
const test = (n, c, info) => { if (c) { ok++; console.log('OK   ' + n); } else { fail++; console.log('FAIL ' + n + '  ' + JSON.stringify(info === undefined ? '' : info).slice(0, 400)); } };
const kop = x => JSON.parse(JSON.stringify(x));
const kc = t => +String(t).replace(/[^\d,-]/g, '').replace(',', '.');

const SKLADBA = { mustekRamBmKc: 10000, mustekPodlahaPlechM2Kc: 1000, mustekPodlahaPororostM2Kc: 1100, mustekPodlahaVanaM2Kc: 1200,
  mustekZabradliKovBmKc: 2000, mustekZabradliSkloBmKc: 5000, mustekKotveniDeskaKc: 3000, mustekKotveniSloupKc: 3100,
  mustekKotveniKonzolaKc: 3200, mustekZabradliSkloMontazHodBm: 1 };
const ZAD = { prejezd: 3.3, zdvih: 12, prohluben: 1.2, sirka: 1.6, hloubka: 2.1, nastupiste: 4 };
const MUSTEK = { ks: 2, sirkaMm: 1600, delkaMm: 1200, podlaha: 'plech', zabradli: 'kov', zabradliStrany: 2, sloupyKs: 0, sloupVyskaM: 0 };

function zadani(u) { return Object.assign(kop(DEFAULT_ZADANI), ZAD, u || {}); }
/* Zakázka: Výtah A (exteriér, můstky) + Výtah B (interiér, ATYP, 2 ks). */
function zakazka(vs, uprava) {
  const zak = novaZakazka();
  zak.cislo = '2026-OPR-CN-9595'; zak.nazevAkce = 'VS E5 výstupy'; zak.objednatel = 'Zkušební zákazník s.r.o.';
  const v = zak.varianty[0];
  v.data.cenik = Object.assign(ZC.zkusebniCenik(), ZC.zkusebniMustky(), SKLADBA, { kurzEurKc: 25 });
  v.data.ock.fixes = true;
  v.data.ock.zadani = zadani({ typSachty: 'exteriérová', mustky: [kop(MUSTEK)], priplatkyVynechat: ['vsgFolie', 'skn', 'madlaBoky'] });
  if (vs) {
    v.data.ock.nazev = 'Výtah A';
    v.data.ock.dalsi = [{ id: 's_b', nazev: 'Výtah B', ks: 2,
      zadani: zadani({ typSachty: 'interiérová', zdvih: 17.325, sirka: 2.4, atyp: true, profily: kop(PROFILY_VYCHOZI['interiérová']),
        priplatkyVynechat: ['vsgFolie', 'skn'] }) }];
  }
  if (uprava) uprava(zak, v);
  return { zak, v };
}
function zamkni(zak, v) {
  const z = kop(zak);
  const vv = z.varianty.find(x => x.id === v.id);
  const vys = zamekVysledekSpocti(vv, J, 'test');
  vv.zamek = { zamceno: true, kdy: '2026-11-10T10:00:00.000Z', kdo: 'test@priklad.cz', cislo: z.cislo,
    vysledek: JSON.parse(JSON.stringify(vys)), snimek: zamekSnimekSpocti(vv) };
  return { z, vv };
}

/* ---------- A) snímek odeslané nabídky ---------- */
{
  const { v } = zakazka(true);
  const s = zamekSnimekSpocti(v);
  test('A snímek víc šachet: sachty [{id, nazev, ks}] a sachtyVerze 1',
    s.sachtyVerze === 1 && JSON.stringify(s.sachty) === '[{"id":"s1","nazev":"Výtah A","ks":1},{"id":"s_b","nazev":"Výtah B","ks":2}]', s);
  test('A snímek: krycí listy a DPH jako dřív', 'kryci' in s && 'kryciProj' in s && s.dph === v.data.cenik.dph);
  const { v: v1 } = zakazka(false);
  test('A snímek jedné šachty beze změny (4 klíče, bez sachty)', JSON.stringify(Object.keys(zamekSnimekSpocti(v1))) === '["kryci","kryciProj","dph","dphProj"]');
  const { v: v2 } = zakazka(false, (z, vv) => { vv.data.ock.ks = 3; });
  const s2 = zamekSnimekSpocti(v2);
  test('A jedna varianta × 3 ks (R20): snímek „Šachta 1, 3 ks"', s2.sachtyVerze === 1 && s2.sachty.length === 1 && s2.sachty[0].nazev === 'Šachta 1' && s2.sachty[0].ks === 3, s2.sachty);
  test('A snímek je deterministický (server ho porovnává JSONem)', JSON.stringify(zamekSnimekSpocti(v)) === JSON.stringify(zamekSnimekSpocti(kop(v))));
}

/* ---------- B) zmrazený výsledek a dotisk ---------- */
{
  const { zak, v } = zakazka(true);
  const { z, vv } = zamkni(zak, v);
  test('B zámek nese součet, sachty[] a sachtyVerze 1', vv.zamek.vysledek.ock.sachtyVerze === 1 && vv.zamek.vysledek.ock.sachty.length === 2
    && vv.zamek.vysledek.ock.sachty.every(s => typeof s.cenaRozpis === 'number'));
  /* E4 (CN při dotisku) čte ze zámku výsledek každé šachty a cenu před zaokrouhlením. */
  const zz = vypocetZ(vv, J);
  test('B dotisk: zámek po JSON nese sachty[i].vysl a cenaPredZaokr (CN v17)', zz.sachty.every(s => s.vysl && s.vysl.souhrn
    && typeof s.vysl.souhrn.zakladCena === 'number' && typeof s.cenaPredZaokr === 'number' && s.cenaPredZaokr > 0)
    && Math.abs(zz.sachty[1].cenaPredZaokr - 2 * (zz.sachty[1].vysl.souhrn.zakladNaklad + zz.sachty[1].vysl.souhrn.zakladMarze)) < 0.01,
    zz.sachty.map(s => s.cenaPredZaokr));
  const pred = { kl: kryciData(z, vv, J, 'bo'), sod: sodData(z, vv, J, 'cz').placeholders, pd: pdnStranaOck(z, vv, J) };
  /* data varianty se změní (jiná přirážka v ceníku, jiný název šachty) — dotisk musí zůstat */
  vv.data.cenik.marze = (+vv.data.cenik.marze || 0) + 0.25;
  vv.data.ock.dalsi[0].nazev = 'Přejmenováno po odeslání';
  const po = { kl: kryciData(z, vv, J, 'bo'), sod: sodData(z, vv, J, 'cz').placeholders, pd: pdnStranaOck(z, vv, J) };
  const sek = d => JSON.stringify(d.sekce.find(s => s.sekce === 'Šachty v nabídce'));
  test('B dotisk krycího listu: tabulka šachet ze zámku (ceny i názvy)', sek(pred.kl) === sek(po.kl) && /Výtah B/.test(sek(po.kl)), [sek(pred.kl), sek(po.kl)]);
  test('B dotisk SoD: předmět a rozpis ze zámku', pred.sod.SACHTY_SOD_PREDMET === po.sod.SACHTY_SOD_PREDMET
    && pred.sod.SACHTY_SOD_ROZPIS === po.sod.SACHTY_SOD_ROZPIS && pred.sod.CENA_BEZ_DPH === po.sod.CENA_BEZ_DPH);
  test('B dotisk Pipedrive: cena a šachty ze zámku', pred.pd.cena === po.pd.cena && pred.pd.sachty === po.pd.sachty);
  /* přepočet (bez zámku) by dal jiné číslo — zámek opravdu drží */
  const ziva = vypocetOckDat(vv.data, J);
  test('B kontrola testu: živý přepočet se od zámku liší', ziva.souhrn.zakladCena !== vv.zamek.vysledek.ock.souhrn.zakladCena);
  /* ověření nového zámku serverem (B59/B119): přísně shoda */
  const { vv: vv2 } = zamkni(zak, v);
  const rozd = zamekVysledekRozdily(JSON.parse(JSON.stringify(vv2.zamek.vysledek)), JSON.parse(JSON.stringify(zamekVysledekSpocti(vv2, J, ''))), 5, { prisne: true });
  test('B zámek víc šachet: přísné ověření serverem = shoda', rozd.pocet === 0, rozd);
  /* podvržená cena šachty v zámku se pozná */
  const podvrh = JSON.parse(JSON.stringify(vv2.zamek.vysledek));
  podvrh.ock.sachty[1].cenaRozpis -= 1000;
  const rp = zamekVysledekRozdily(podvrh, JSON.parse(JSON.stringify(zamekVysledekSpocti(vv2, J, ''))), 5, { prisne: true });
  test('B podvržená cena šachty v zámku = rozdíl', rp.pocet > 0 && rp.cesty.some(c => /sachty/.test(c)), rp);
}

/* ---------- C) starý zámek bez sachtyVerze = jedna šachta ---------- */
{
  const { zak, v } = zakazka(false);
  const { z, vv } = zamkni(zak, v);
  test('C zámek jedné šachty nemá sachty ani sachtyVerze', !('sachty' in vv.zamek.vysledek.ock) && !('sachtyVerze' in vv.zamek.vysledek.ock));
  test('C výstupy ze starého zámku: vsVystup null, krycí list bez tabulky', vsVystup(vypocetZ(vv, J)) === null
    && !kryciData(z, vv, J, 'bo').sekce.some(s => s.sekce === 'Šachty v nabídce'));
}

/* ---------- D) zamčená varianta a změna šachet ---------- */
{
  const { zak, v } = zakazka(true);
  const { vv } = zamkni(zak, v);
  test('D vsZamekZmenaSachet: zamčená varianta → důvod (klon)', /odeslaná \(uzamčená\)/.test(vsZamekZmenaSachet(vv)) && /klon/.test(vsZamekZmenaSachet(vv)));
  test('D vsZamekZmenaSachet: rozpracovaná → prázdno', vsZamekZmenaSachet(v) === '' && vsZamekZmenaSachet(null) === '');
  const zmen = [
    ['přidaná šachta', d => d.ock.dalsi.push({ id: 's_c', nazev: 'Výtah C', ks: 1, zadani: kop(d.ock.zadani) })],
    ['smazaná šachta', d => { d.ock.dalsi = []; }],
    ['změna ks', d => { d.ock.dalsi[0].ks = 3; }],
    ['kopie šachty 1 navíc', d => { d.ock.dalsi.push({ id: 's_k', nazev: 'Kopie', ks: 1, zadani: kop(d.ock.zadani) }); }],
  ];
  zmen.forEach(([jm, f]) => {
    const d2 = kop(vv.data); f(d2);
    test('D server: ' + jm + ' v zamčené variantě = jiná data (uložení odmítne)', zamekDataPorovnani(d2, vv) !== zamekDataPorovnani(vv.data, vv)
      && /ock\.dalsi/.test(zamekDataRozdilCesta(d2, vv.data, vv)), zamekDataRozdilCesta(d2, vv.data, vv));
  });
}

/* ---------- E) velikost zámku (10 variant šachet) ---------- */
{
  const { v } = zakazka(true, (z, vv) => {
    vv.data.ock.dalsi = Array.from({ length: 9 }, (_, i) => ({ id: 's_' + i, nazev: 'Výtah ' + (i + 2), ks: 2, zadani: kop(vv.data.ock.zadani) }));
  });
  const n = JSON.stringify(zamekVysledekSpocti(v, J, 'test')).length;
  console.log('     (zámek 10 variant šachet: ' + Math.round(n / 1024) + ' kB JSON)');
  test('E zámek 10 variant šachet se vejde pod 1 MB (zakázka ≤ 4 MB, B14)', n < 1024 * 1024, n);
}

console.log(ok + ' OK, ' + fail + ' FAIL');
if (fail) process.exit(1);
