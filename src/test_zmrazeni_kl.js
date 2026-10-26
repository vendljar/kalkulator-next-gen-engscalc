/* ZMRAZENÍ KRYCÍCH LISTŮ PO TISKU CENOVÉ NABÍDKY PO POLÍCH (Z1, rozhodnutí
 * J. V. 22. 10. 2026, tabulka podklady/ZMRAZENI_KL_VOLBY_JV_22_10.json).
 *
 * Do v22.10.2 se po tisku CN zamykaly celé sekce krycího listu, které jdou do
 * nabídky (KRYCI_NABIDKA_SEKCE / KRYCI_PROJ_NABIDKA_SEKCE), a hlavička
 * zakázky (ZAK.*) se nezamykala vůbec. Teď rozhoduje tabulka po polích:
 *   1) matice pole × stav po tisku CN (OCK i PROJ) přesně podle `volba_jv`,
 *      po tisku SoD vše zmrazené kromě plné moci (pm*),
 *   2) zámek bez snímku (odeslaný před v22.10.3) drží pole nabídky jako dřív,
 *   3) sazba DPH (C.dph / PC.dph) je po tisku CN editovatelná, server
 *      (zamekDataPorovnani) změnu pustí, po SoD ne,
 *   4) hlavička: ZAK.nazevAkce / ZAK.adresa (i projHlavicka) zmrazené po
 *      tisku CN, ostatní pole krycích listů v hlavičce po tisku SoD,
 *   5) dotisk odeslané CN po změně DPH a podmínek ukáže původní znění
 *      (snímek zámku), SoD už nové,
 *   6) Zaměření strojovna po zamčení: odvozená hodnota jako předvyplnění,
 *      starý ruční přepis z doby před zámkem neožije.
 *
 * Pojistka proti prázdnému testu: nad kódem v22.10.2 (fcf14e3) sada selže
 * hned na exportech (zamekKryciPoleStav, zamekSnimekSpocti …) a matice
 * nesedí (obchodnik editovatelný, zaloha1 zmrazená, DPH zamčená).
 *
 * Spuštění: cd src && node test_zmrazeni_kl.js */
const fs = require('fs');
const path = require('path');
const nacti = (f) => { const m = require(f); Object.keys(m).forEach(k => { if (global[k] === undefined) global[k] = m[k]; }); return m; };
const ZC = require('./zkusebni_cenik.js');
const F = nacti('./format.js');
nacti('./preklad.js');
nacti('./docxgen.js');
nacti('./engine.js');
global.DEFAULT_CENIK = ZC.zkusebniCenik();
nacti('./engine_proj.js');
global.DEFAULT_CENIK_PROJ = ZC.zkusebniCenikProj();
nacti('./techspec.js');
nacti('./sleva.js');
nacti('./zaokrouhleni.js');
nacti('./podminky.js');
const FM = nacti('./firma.js');
nacti('./plan_plateb.js');
const zk = nacti('./zakazka.js');
const ZM = nacti('./zamek.js');
const K = nacti('./kryci.js');
const KP = nacti('./kryci_proj.js');
nacti('./dokumenty.js');
const NB = nacti('./nabidka.js');
const NP = nacti('./nabidka_proj.js');
const SD = nacti('./sod.js');

let ok = 0, fail = 0;
const test = (n, cond, info) => { if (cond) { ok++; console.log('OK   ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info).slice(0, 400)); } };
const JEKLY = JSON.parse(fs.readFileSync(path.join(__dirname, 'jekly.json'), 'utf8'));
global.NAST = { firma: FM.firmaDefault() };
const kopie = x => JSON.parse(JSON.stringify(x));

const potreba = ['zamekKryciPoleStav', 'zamekSnimekSpocti', 'zamekNabidkaPohled', 'zamekDphVolna',
  'zamekZakCestaZmrazena', 'zamekZakZmeny'];
potreba.forEach(f => test('zamek.js exportuje ' + f, typeof ZM[f] === 'function'));
test('zamek.js exportuje ZAMEK_KRYCI_PO_CN', !!(ZM.ZAMEK_KRYCI_PO_CN && ZM.ZAMEK_KRYCI_PO_CN.kryci && ZM.ZAMEK_KRYCI_PO_CN.kryciProj));
if (fail) { console.log(`\n${ok} prošlo, ${fail} selhalo`); process.exit(1); }

const TAB = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'podklady', 'ZMRAZENI_KL_VOLBY_JV_22_10.json'), 'utf8'));
const LISTY = [['ock', 'kryci', K.KRYCI_SEKCE], ['proj', 'kryciProj', KP.KRYCI_PROJ_SEKCE]];

const nova = () => {
  const z = zk.novaZakazka(); z.cislo = '2026 - OPR - CN - 4771'; z.nazevAkce = 'Ukázková akce'; z.adresa = 'Ukázková 1';
  const v = z.varianty[0];
  Object.assign(v.data.ock.zadani, { sirka: 1.6, hloubka: 1.8, zdvih: 9, prejezd: 3.2, prohluben: 1.2, nastupiste: 4 });
  return z;
};
/* Zamčení tak, jak ho dělá zamekPoTisku: zmrazení podmínek, výsledek, snímek. */
const zamkni = (z, typ, v) => {
  v = v || z.varianty[0];
  const prvni = !ZM.variantaUzamcena(v);
  let vysledek = null, snimek = null;
  if (prvni) {
    vysledek = ZM.zamekVysledekSpocti(v, JEKLY, 'test');
    K.kryciZmrazPodminky(z, v, JEKLY); KP.kryciProjZmrazPodminky(z, v);
    snimek = ZM.zamekSnimekSpocti(v);
  }
  ZM.zamkniVariantu(v, { typ, cislo: ZM.variantaCislo(z, v), vysledek, snimek });
  return v;
};
/* Id polí jednoho řádku tabulky (`plan_*` = všechny řádky plánu plateb). */
const idRadku = (sekce, id) => /\*$/.test(id)
  ? sekce.reduce((a, s) => a.concat(s.pole.map(p => p.id).filter(x => x.startsWith(id.slice(0, -1)))), [])
  : [id];

/* ---- 0) tabulka a krycí listy se kryjí ---- */
LISTY.forEach(([k, list, sekce]) => {
  const vTab = new Set();
  TAB[k].forEach(r => idRadku(sekce, r.id).forEach(id => vTab.add(id)));
  /* Pole činností PROJ (cin_*, st_*) jsou v tabulce od Z1-1 (J. V. 22. 10.). */
  const vSek = sekce.reduce((a, s) => a.concat(s.pole.map(p => p.id)), []);
  const chybiVTab = vSek.filter(id => !vTab.has(id));
  const chybiVSek = [...vTab].filter(id => vSek.indexOf(id) < 0);
  test(k + ': každé pole krycího listu má řádek v tabulce J. V.', !chybiVTab.length, chybiVTab);
  test(k + ': každý řádek tabulky je pole krycího listu', !chybiVSek.length, chybiVSek);
});

/* ---- 1) matice pole × stav po tisku CN ---- */
['nabidka', 'nabidkaTisk', 'nabidkaProj', 'nabidkaProjTisk'].forEach(typ => {
  const z = nova(); const v = zamkni(z, typ);
  LISTY.forEach(([k, list, sekce]) => {
    const spatne = [];
    TAB[k].forEach(r => idRadku(sekce, r.id).forEach(id => {
      const st = ZM.zamekKryciPoleStav(v, list, id);
      if (st !== r.volba_jv) spatne.push(id + ': ' + st + ' ≠ ' + r.volba_jv);
      if ((st === 'editovatelne') !== ZM.zamekKryciPoleVolne(v, list, id)) spatne.push(id + ': PoleVolne nesouhlasí');
    }));
    test(typ + ' → ' + k + ': stav všech polí podle tabulky J. V. (' + TAB[k].length + ' řádků)', !spatne.length, spatne);
  });
});
{
  const v = nova().varianty[0];
  test('nezamčená varianta: všechno editovatelné', LISTY.every(([k, list, sekce]) =>
    TAB[k].every(r => idRadku(sekce, r.id).every(id => ZM.zamekKryciPoleStav(v, list, id) === 'editovatelne'))));
}
test('Z1-1: generovaná pole činností PROJ (cin_*, st_*) po tisku CN zmrazená, popis jiných činností editovatelný',
  (() => { const v = zamkni(nova(), 'nabidkaProj');
    const ids = KP.KRYCI_PROJ_SEKCE.reduce((a, s) => a.concat(s.pole.map(p => p.id)), []).filter(id => /^(cin|st)_/.test(id));
    return ids.length >= 10 && ids.every(id => ZM.zamekKryciPoleStav(v, 'kryciProj', id) === 'zmrazeno')
      && ZM.zamekKryciPoleStav(v, 'kryciProj', 'rozsahJine') === 'editovatelne'
      && ZM.zamekKryciPoleStav(v, 'kryciProj', 'cin_neznama') === 'zmrazeno'; })());
test('neznámé pole se po tisku CN bere jako zmrazené', (() => { const v = zamkni(nova(), 'nabidka');
  return ZM.zamekKryciPoleStav(v, 'kryci', 'neniTakovePole') === 'zmrazeno'
    && ZM.zamekKryciPoleStav(v, 'kryciProj', 'neniTakovePole') === 'zmrazeno'
    && ZM.zamekKryciPoleStav(v, 'jine', 'jmenoPrijmeni') === 'zmrazeno'; })());

/* ---- 1b) po tisku SoD vše zmrazené kromě plné moci ---- */
[['nabidka', 'sod'], ['nabidkaProjTisk', 'sodProj'], ['sod'], ['sodProj']].forEach(typy => {
  const z = nova(); const v = zamkni(z, typy[0]); typy.slice(1).forEach(t => zamkni(z, t));
  const spatne = [];
  LISTY.forEach(([k, list, sekce]) => TAB[k].forEach(r => idRadku(sekce, r.id).forEach(id => {
    /* po SoD volná jen plná moc (B163) a kontaktní osoba zákazníka (Z1-3) */
    const ceka = r.volba_jv === 'jen_admin' ? 'jen_admin'
      : ((list === 'kryciProj' && /^pm[A-Z]/.test(id)) || ['jmenoPrijmeni', 'kontaktZakaznikTel', 'kontaktZakaznikEmail'].indexOf(id) >= 0
        ? 'editovatelne' : 'zmrazeno');
    const st = ZM.zamekKryciPoleStav(v, list, id);
    if (st !== ceka) spatne.push(list + '.' + id + ': ' + st + ' ≠ ' + ceka);
  })));
  test(typy.join(' + ') + ': po SoD zmrazený celý krycí list kromě plné moci a kontaktní osoby', !spatne.length, spatne);
});

/* ---- 2) zámek bez snímku (odeslaný dřív) ---- */
{
  const z = nova(); const v = z.varianty[0];
  ZM.zamkniVariantu(v, { typ: 'nabidka', cislo: ZM.variantaCislo(z, v) });   // bez snímku
  test('starý zámek bez snímku: podmínky nabídky zůstávají zmrazené',
    ['zaloha1', 'terminDodani', 'splatnostDni', 'sazbaDph'].every(id => !ZM.zamekKryciPoleVolne(v, 'kryci', id))
    && ['splatnostDni', 'sodpPlatba1', 'planPredvolba', 'plan_studie'].every(id => !ZM.zamekKryciPoleVolne(v, 'kryciProj', id)));
  test('starý zámek bez snímku: pole mimo nabídku editovatelná, nová zmrazená podle tabulky',
    ZM.zamekKryciPoleVolne(v, 'kryci', 'jmenoPrijmeni') && !ZM.zamekKryciPoleVolne(v, 'kryci', 'obchodnik')
    && ZM.zamekKryciPoleVolne(v, 'kryciProj', 'odpovednyJmeno'));
  test('starý zámek bez snímku: DPH zamčená', !ZM.zamekDphVolna(v, 'C.dph') && !ZM.zamekDphVolna(v, 'PC.dph'));
}

/* ---- 3) DPH a porovnání dat (serverová pojistka) ---- */
{
  const z = nova(); const v = zamkni(z, 'nabidka');
  test('po tisku CN: sazba DPH OCK i PROJ editovatelná', ZM.zamekDphVolna(v, 'C.dph') && ZM.zamekDphVolna(v, 'PC.dph'));
  test('jiná cesta ceníku editovatelná není', !ZM.zamekDphVolna(v, 'C.marze') && !ZM.zamekDphVolna(v, 'PC.marze'));
  const pred = ZM.zamekDataPorovnani(v.data, v);
  const jina = x => (Math.abs((+x || 0) - 0.12) < 1e-9 ? 0.21 : 0.12);   // vždy skutečná změna sazby
  const d1 = kopie(v.data); d1.cenik.dph = jina(d1.cenik.dph); d1.proj.cenik.dph = jina(d1.proj.cenik.dph);
  test('příprava: sazba DPH se v d1 opravdu liší', d1.cenik.dph !== v.data.cenik.dph && d1.proj.cenik.dph !== v.data.proj.cenik.dph);
  d1.kryci.hodnoty = Object.assign({}, d1.kryci.hodnoty, { zaloha1: '50 %', terminDodani: '20 týdnů', sazbaDph: 'x' });
  d1.kryciProj = d1.kryciProj || {}; d1.kryciProj.hodnoty = Object.assign({}, d1.kryciProj.hodnoty, { splatnostDni: '60', sodpPlatba1: '100 %' });
  d1.kryciProj.planPlateb = { predvolba: 'zaloha', zaloha: 0.5 };
  test('po tisku CN: změna DPH, podmínek a plánu plateb porovnání nemění', ZM.zamekDataPorovnani(d1, v) === pred);
  const d2 = kopie(v.data); d2.kryci.hodnoty = Object.assign({}, d2.kryci.hodnoty, { obchodnik: 'Jiný obchodník' });
  test('po tisku CN: změna zmrazeného pole (obchodník) porovnání mění', ZM.zamekDataPorovnani(d2, v) !== pred);
  const d3 = kopie(v.data); d3.kryciProj = d3.kryciProj || {}; d3.kryciProj.hodnoty = Object.assign({}, d3.kryciProj.hodnoty, { platnostNabidky: '1 rok' });
  test('po tisku CN: změna platnosti nabídky PROJ porovnání mění', ZM.zamekDataPorovnani(d3, v) !== pred);
  const d4 = kopie(v.data); d4.cenik.marze = 0.99;
  test('po tisku CN: změna jiné části ceníku porovnání mění', ZM.zamekDataPorovnani(d4, v) !== pred);
  const d5 = kopie(v.data); d5.ock.zadani.zdvih = 12; d5.cenik.dph = jina(d5.cenik.dph);
  test('po tisku CN: změna kalkulace schovaná za DPH porovnání mění', ZM.zamekDataPorovnani(d5, v) !== pred);
  zamkni(z, 'sod');
  test('po SoD: DPH zamčená', !ZM.zamekDphVolna(v, 'C.dph') && !ZM.zamekDphVolna(v, 'PC.dph'));
  test('po SoD: změna DPH porovnání mění', ZM.zamekDataPorovnani(d1, v) !== ZM.zamekDataPorovnani(v.data, v));
  const dJenDph = kopie(v.data); dJenDph.cenik.dph = jina(dJenDph.cenik.dph);
  test('po SoD: samotná změna DPH OCK porovnání mění', ZM.zamekDataPorovnani(dJenDph, v) !== ZM.zamekDataPorovnani(v.data, v));
  const dJenDphP = kopie(v.data); dJenDphP.proj.cenik.dph = jina(dJenDphP.proj.cenik.dph);
  test('po SoD: samotná změna DPH PROJ porovnání mění', ZM.zamekDataPorovnani(dJenDphP, v) !== ZM.zamekDataPorovnani(v.data, v));
  const zs = nova(); const vs = zs.varianty[0]; ZM.zamkniVariantu(vs, { typ: 'nabidka', cislo: ZM.variantaCislo(zs, vs) });   // bez snímku
  const ds = kopie(vs.data); ds.cenik.dph = jina(ds.cenik.dph);
  test('starý zámek bez snímku: samotná změna DPH porovnání mění', ZM.zamekDataPorovnani(ds, vs) !== ZM.zamekDataPorovnani(vs.data, vs));
  const v0 = nova().varianty[0];
  test('nezamčená varianta: DPH volná', ZM.zamekDphVolna(v0, 'C.dph'));
}
{
  /* Snímek je v klíči zámku — přepsat ho jde jen přes rozdíl klíče (server 409). */
  const z = nova(); const v = zamkni(z, 'nabidka');
  const k0 = (require('./uloziste.js').uloZamekKlic)(v);
  const v2 = kopie(v); v2.zamek.snimek.dph = 0;
  test('snímek je součástí klíče zámku', k0 !== (require('./uloziste.js').uloZamekKlic)(v2));
}

/* ---- 4) hlavička zakázky (ZAK.*) ---- */
{
  const z = nova();
  test('bez odeslané nabídky: hlavička volná', !ZM.zamekZakCestaZmrazena(z, 'ZAK.nazevAkce') && !ZM.zamekZakCestaZmrazena(z, 'ZAK.dic'));
  const v1 = z.varianty[0];
  const v2 = ZM.klonujVariantu(z, v1.id, { aktivovat: true });
  zamkni(z, 'nabidka', v1);
  ['ZAK.nazevAkce', 'ZAK.adresa', 'ZAK.projHlavicka.nazevAkce', 'ZAK.projHlavicka.adresa'].forEach(c =>
    test('po tisku CN (otevřený je nezamčený klon): ' + c + ' zmrazeno', !!ZM.zamekZakCestaZmrazena(z, c)));
  ['ZAK.dic', 'ZAK.zastupci.smluvniJmeno', 'ZAK.zastupci.banka', 'ZAK.objednatel', 'ZAK.kontakt', 'ZAK.ico'].forEach(c =>
    test('po tisku CN: ' + c + ' editovatelné', !ZM.zamekZakCestaZmrazena(z, c)));
  test('ZAK.cislo řeší pravidlo jen pro administrátora, ne tahle funkce', !ZM.zamekZakCestaZmrazena(z, 'ZAK.cislo'));
  zamkni(z, 'sod', v1);
  ['ZAK.dic', 'ZAK.zastupci.smluvniJmeno', 'ZAK.zastupci.banka', 'ZAK.zastupci.fakturyEmail', 'ZAK.nazevAkce',
   'ZAK.objednatel', 'ZAK.ico', 'ZAK.adresaObjednatele'].forEach(c =>
    test('po tisku SoD: ' + c + ' zmrazeno', !!ZM.zamekZakCestaZmrazena(z, c)));
  test('po tisku SoD: pole hlavičky mimo krycí listy a SoD (datum) zůstává', !ZM.zamekZakCestaZmrazena(z, 'ZAK.datum'));
  test('Z1-3: po tisku SoD zůstává kontaktní osoba zákazníka editovatelná',
    !ZM.zamekZakCestaZmrazena(z, 'ZAK.kontakt') && !ZM.zamekZakCestaZmrazena(z, 'ZAK.projHlavicka.kontakt'));
  { const no = kopie(z); no.kontakt = 'Jiná kontaktní osoba';
    test('Z1-3: server po SoD změnu kontaktní osoby pustí', !ZM.zamekZakZmeny(kopie(z), no).length, ZM.zamekZakZmeny(kopie(z), no)); }
  /* serverová kontrola */
  const st = kopie(z);
  const no = kopie(z); no.nazevAkce = 'Přejmenováno'; no.zastupci = Object.assign({}, no.zastupci, { banka: 'Jiná banka' }); no.datum = '2026-12-31';
  const zm = ZM.zamekZakZmeny(st, no);
  test('server: změněný název akce a banka po SoD hlášeny, datum ne',
    zm.indexOf('ZAK.nazevAkce') >= 0 && zm.indexOf('ZAK.zastupci.banka') >= 0 && zm.indexOf('ZAK.datum') < 0, zm);
  test('server: beze změny nic', !ZM.zamekZakZmeny(st, kopie(st)).length);
  const st2 = kopie(st); st2.varianty.forEach(v => { v.zamek = null; });
  test('server: bez zamčené varianty v uložené verzi nic', !ZM.zamekZakZmeny(st2, no).length);
  const no3 = kopie(no); no3.varianty.forEach(v => { if (v.zamek) { v.zamek = null; v.odemceni = [{ kdo: 'x' }]; } });
  test('server: varianta odemčená správcem v témže uložení hlavičku nehlídá', !ZM.zamekZakZmeny(st, no3).length);
  const stCN = kopie(st); stCN.varianty.forEach(v => { if (v.zamek) v.zamek.tisky = v.zamek.tisky.filter(t => t.typ !== 'sod'); });
  const noCN = kopie(stCN); noCN.zastupci = Object.assign({}, noCN.zastupci, { banka: 'Jiná banka' });
  test('server: po tisku jen CN se banka změnit smí', !ZM.zamekZakZmeny(stCN, noCN).length);
  const noCN2 = kopie(stCN); noCN2.adresa = 'Jiná adresa';
  test('server: po tisku CN se adresa stavby změnit nesmí', ZM.zamekZakZmeny(stCN, noCN2).indexOf('ZAK.adresa') >= 0);
  const noPr = kopie(stCN); delete noPr.adresa; const stPr = kopie(stCN); stPr.adresa = '';
  test('server: chybějící a prázdné pole jsou totéž', !ZM.zamekZakZmeny(stPr, noPr).length);
}

/* ---- 4b) Z1-2: název akce a adresa jen podle ŘÍDÍCÍ varianty ---- */
{
  const z = nova(); const v1 = z.varianty[0];
  const v2 = ZM.klonujVariantu(z, v1.id, { aktivovat: true });
  zamkni(z, 'nabidka', v2);                       // odeslaná je jen klon, řídící (V1) ne
  z.varianty.forEach(v => { v.ridici = v.id === v1.id; });
  test('Z1-2: odeslaná neřídící varianta název akce ani adresu nezmrazí',
    !ZM.zamekZakCestaZmrazena(z, 'ZAK.nazevAkce') && !ZM.zamekZakCestaZmrazena(z, 'ZAK.adresa'));
  const st = kopie(z); const no = kopie(z); no.nazevAkce = 'Přejmenováno'; no.adresa = 'Jinde 1';
  test('Z1-2: server změnu názvu pustí, když řídící varianta odeslaná není', !ZM.zamekZakZmeny(st, no).length, ZM.zamekZakZmeny(st, no));
  z.varianty.forEach(v => { v.ridici = v.id === v2.id; });   // řídící je odeslaná
  test('Z1-2: odeslaná řídící varianta název akce i adresu zmrazí',
    !!ZM.zamekZakCestaZmrazena(z, 'ZAK.nazevAkce') && !!ZM.zamekZakCestaZmrazena(z, 'ZAK.projHlavicka.adresa'));
  const st2 = kopie(z); const no2 = kopie(z); no2.nazevAkce = 'Přejmenováno';
  test('Z1-2: server změnu názvu u odeslané řídící varianty odmítne', ZM.zamekZakZmeny(st2, no2).indexOf('ZAK.nazevAkce') >= 0);
  const no3 = kopie(z); no3.nazevAkce = 'Přejmenováno'; no3.varianty.forEach(v => { v.ridici = v.id === v1.id; });
  /* K7-S2 (#508, J. V. 23. 10. 2026 „Zavřít"): přepnutí řídící na nezamčený klon hlavičku neuvolní. */
  test('K7-S2: server odmítne, když se v témže uložení řídící přepne na nezamčenou variantu a změní název',
    ZM.zamekZakZmeny(st2, no3).indexOf('ZAK.nazevAkce') >= 0, ZM.zamekZakZmeny(st2, no3));
  { const zb = kopie(z); zb.varianty.forEach(v => { delete v.ridici; delete (v.zamek || {}).hlavicka; });   // bez příznaku je řídící první (V1, nezamčená)
    test('Z1-2: bez příznaku řídící rozhoduje první varianta', !ZM.zamekZakCestaZmrazena(zb, 'ZAK.nazevAkce')); }
}

/* ---- 4c) K7-S2 (#508, audit K7, J. V. 23. 10. 2026 „Zavřít"): hlavičku po CN nejde obejít
 * přepnutím řídící na nezamčený klon ve dvou (třech) uloženích. Před opravou 0 / 6
 * (server i prohlížeč obcházení pustily, příznak neexistoval), po opravě 6 / 6. ---- */
{
  const OZN = ZM.zamekZakHlavickaOznac || (() => 0);   // před opravou neexistuje
  const z = nova(); const v1 = z.varianty[0];
  zamkni(z, 'nabidka', v1);                        // odeslaná řídící V1
  const v2 = ZM.klonujVariantu(z, v1.id, { aktivovat: true });
  /* Uložená verze: V1 řídící, odeslaná; server doplní stopu „byla řídící". */
  const ulozena = kopie(z); OZN(ulozena, null);
  test('K7-S2: server stopu u odeslané řídící doplní (zamek.hlavicka)', ulozena.varianty[0].zamek.hlavicka === true);
  /* Krok 1: jen přepnout řídící na klon (hlavička beze změny) — smí. */
  const k1 = kopie(ulozena); k1.varianty.forEach(v => { v.ridici = v.id === v2.id; });
  test('K7-S2: samotné přepnutí řídící na nezamčený klon projde', !ZM.zamekZakZmeny(ulozena, k1).length, ZM.zamekZakZmeny(ulozena, k1));
  /* Krok 2: řídící je nezamčený klon, přejmenovat — dřív 200, teď odmítne (V1 nese stopu). */
  const k2 = kopie(k1); k2.nazevAkce = 'Obejito'; k2.adresa = 'Jinde 2';
  test('K7-S2: po přepnutí řídící název ani adresu změnit nejde (stopa odeslané řídící)',
    ['ZAK.nazevAkce', 'ZAK.adresa'].every(c => ZM.zamekZakZmeny(k1, k2).indexOf(c) >= 0), ZM.zamekZakZmeny(k1, k2));
  test('K7-S2: prohlížeč drží hlavičku zmrazenou i po přepnutí řídící na klon',
    !!ZM.zamekZakCestaZmrazena(k1, 'ZAK.nazevAkce') && !!ZM.zamekZakCestaZmrazena(k1, 'ZAK.adresa'));
  /* Klient bez stopy (starší data): nastavRidici ji doplní před přepnutím. */
  const st = kopie(z); delete st.varianty[0].zamek.hlavicka;
  zk.nastavRidici(st, v2.id);
  test('K7-S2: přepnutí řídící v prohlížeči (nastavRidici) dá odeslané řídící stopu',
    st.varianty[0].zamek.hlavicka === true && !!ZM.zamekZakCestaZmrazena(st, 'ZAK.nazevAkce'));
  /* Server: stopu starších dat doplní i nad uloženou řídící (klient ji neposlal). */
  const bezStopy = kopie(z); delete bezStopy.varianty[0].zamek.hlavicka;
  const prepnuta = kopie(bezStopy); prepnuta.varianty.forEach(v => { v.ridici = v.id === v2.id; });
  OZN(prepnuta, bezStopy);
  test('K7-S2: server stopu doplní i podle uložené řídící (přepnutí v témže uložení)', prepnuta.varianty[0].zamek.hlavicka === true);
}

/* ---- 5) dotisk odeslané CN po změně DPH a podmínek ---- */
{
  const z = nova(); const v = z.varianty[0];
  const pred = NB.nabidkaData(z, v, JEKLY).placeholders;
  zamkni(z, 'nabidka');
  const tisk1 = NB.nabidkaData(z, v, JEKLY).placeholders;
  test('dotisk CN hned po zamčení = první tisk (DPH, cena s DPH, záloha)',
    ['DPH_SAZBA', 'DPH_KC', 'CENA_S_DPH', 'CENA_BEZ_DPH', 'PODM_ZALOHA1', 'PODM_SPLATNOST_DNI', 'PODM_TERMIN_DODANI']
      .every(k => tisk1[k] === pred[k]), ['DPH_SAZBA', 'DPH_KC', 'CENA_S_DPH', 'PODM_ZALOHA1'].map(k => [pred[k], tisk1[k]]));
  const novaSazba = Math.abs(v.data.cenik.dph - 0.12) < 1e-9 ? 0.21 : 0.12;
  v.data.cenik.dph = novaSazba;
  v.data.kryci.hodnoty = Object.assign({}, v.data.kryci.hodnoty, { zaloha1: 'Bez zálohy', faktura2: '90 % – po zahájení montáže', splatnostDni: '60', terminDodani: '30 týdnů' });   // faktura2 dopočtená jako klSet (SEC-S5 #517)
  const tisk2 = NB.nabidkaData(z, v, JEKLY).placeholders;
  test('dotisk CN po změně DPH: sazba, DPH i cena s DPH původní',
    tisk2.DPH_SAZBA === tisk1.DPH_SAZBA && tisk2.DPH_KC === tisk1.DPH_KC && tisk2.CENA_S_DPH === tisk1.CENA_S_DPH,
    [tisk1.DPH_SAZBA, tisk2.DPH_SAZBA, tisk1.CENA_S_DPH, tisk2.CENA_S_DPH]);
  test('dotisk CN po změně podmínek: záloha, splatnost a termín původní',
    tisk2.PODM_ZALOHA1 === tisk1.PODM_ZALOHA1 && tisk2.PODM_SPLATNOST_DNI === tisk1.PODM_SPLATNOST_DNI
    && tisk2.PODM_TERMIN_DODANI === tisk1.PODM_TERMIN_DODANI, [tisk1.PODM_SPLATNOST_DNI, tisk2.PODM_SPLATNOST_DNI]);
  const sod = NB.nabidkaData(z, v, JEKLY, 'cz', null, { zive: true }).placeholders;
  test('příprava: sazba DPH se opravdu změnila', String(Math.round(novaSazba * 100)) !== tisk1.DPH_SAZBA, [novaSazba, tisk1.DPH_SAZBA]);
  test('podklad SoD (živá data): nová sazba DPH a nové podmínky', sod.DPH_SAZBA === String(Math.round(novaSazba * 100)) && sod.PODM_SPLATNOST_DNI === '60'
    && sod.CENA_BEZ_DPH === tisk1.CENA_BEZ_DPH, [sod.DPH_SAZBA, sod.PODM_SPLATNOST_DNI]);
  const sd = SD.sodData(z, v, JEKLY).placeholders;
  test('smlouva o dílo (sodData) po změně: nová sazba DPH a splatnost', sd.DPH_SAZBA === String(Math.round(novaSazba * 100))
    && sd.PODM_SPLATNOST_DNI === '60', [sd.DPH_SAZBA, sd.PODM_SPLATNOST_DNI]);
  test('pohled pro dotisk data varianty nemění', v.data.cenik.dph === novaSazba && v.data.kryci.hodnoty.splatnostDni === '60');
  test('nezamčená varianta: pohled je tatáž varianta', ZM.zamekNabidkaPohled(nova().varianty[0]).data !== undefined
    && (() => { const w = nova().varianty[0]; return ZM.zamekNabidkaPohled(w) === w; })());
}
{
  const z = nova(); z.cislo = '2026 - OVP - CN - 4772'; const v = z.varianty[0];
  const pd = NP.nabidkaProjData(z, v);
  zamkni(z, 'nabidkaProj');
  const p1 = NP.nabidkaProjData(z, v).placeholders || {};
  v.data.proj.cenik.dph = Math.abs(v.data.proj.cenik.dph - 0.12) < 1e-9 ? 0.21 : 0.12;
  v.data.kryciProj = v.data.kryciProj || {};
  v.data.kryciProj.hodnoty = Object.assign({}, v.data.kryciProj.hodnoty, { splatnostDni: '90' });
  const p2 = NP.nabidkaProjData(z, v).placeholders || {};
  const klice = Object.keys(p1).filter(k => /DPH|PODM_SPLATNOST|CELKEM/.test(k));
  test('PROJ: dotisk CN po změně DPH a splatnosti beze změny (' + klice.join(', ') + ')',
    klice.length >= 2 && klice.every(k => p1[k] === p2[k]) && !!pd, klice.map(k => [k, p1[k], p2[k]]));
  const ps = NP.nabidkaProjData(z, v, 'cz', { slevaZvlast: false, zive: true }).placeholders || {};
  test('PROJ: podklad SoD (živá data) nese novou splatnost', ps.PODM_SPLATNOST_DNI === '90', ps.PODM_SPLATNOST_DNI);
  const sp = SD.sodProjData(z, v).placeholders || {};
  test('PROJ: smlouva o dílo (sodProjData) nese novou splatnost', sp.PODM_SPLATNOST_DNI === '90', sp.PODM_SPLATNOST_DNI);
}

/* ---- 5a) plán plateb PROJ upravený po odeslání (Z1, editovatelný podle tabulky) ----
 * Pojistka: nad v22.10.5 (1e40538) planPlatebVarianty zamčené varianty čte vždy
 * zmrazenoPlan — úprava plánu po CN se neprojeví v krycím listu ani SoD. */
{
  const z = nova(); z.cislo = '2026 - OVP - CN - 4774'; const v = z.varianty[0];
  v.data.kryciProj = { hodnoty: {}, planPlateb: { v: 1, predvolba: 'zaloha', zaloha: 30 } };
  zamkni(z, 'nabidkaProj');
  const radky = (vv) => { const pl = NP.nabidkaProjPlatby(z, vv, 'cz'); return pl && pl.dopocet ? pl.dopocet.platby.map(x => x.klic + ':' + x.castka).join('|') : ''; };
  const cnPred = radky(ZM.zamekNabidkaPohled(v)), zivePred = radky(v);
  test('příprava: plán plateb PROJ odeslané nabídky má platby', !!cnPred && cnPred === zivePred, [cnPred, zivePred]);
  v.data.kryciProj.planPlateb = { v: 1, predvolba: 'sto' };
  const cnPo = radky(ZM.zamekNabidkaPohled(v)), zivePo = radky(v);
  test('plán upravený po CN: krycí list / SoD (živě) nesou nový plán', zivePo !== zivePred && !!zivePo, [zivePred, zivePo]);
  test('plán upravený po CN: dotisk CN ze snímku beze změny', cnPo === cnPred, [cnPred, cnPo]);
  const ef = (typeof planPlatebVarianty === 'function') ? planPlatebVarianty(v, null) : null;
  test('plán upravený po CN: není „zmrazeno při odeslání", texty milníků ze snímku', !!ef && ef.zmrazeny === false && ef.plan.predvolba === 'sto');
  v.data.kryciProj.planPlateb = JSON.parse(JSON.stringify(v.zamek.snimek.kryciProj.planPlateb));
  test('plán vrácený na stav ze snímku: zase zmrazený plán', planPlatebVarianty(v, null).zmrazeny === true && radky(v) === zivePred);
}

/* ---- 5c) SEC-S6 + SEC-N8 (#516, rozhodnutí J. V. 26. 10. 2026): plán plateb PROJ po CN ----
 * Snímek zmrazenoPlan nese jen milníky použité při odeslání. Po přepnutí
 * předvolby chyběly milníky („milník chybí", SoD zablokovaná); při stejné
 * předvolbě a jiné záloze se splátky braly ze snímku (změna 70 → 30 % se
 * neprojevila). Karta plánu byla po CN `disabled`, ač ji Z1 povoluje.
 * Pojistka: nad 9bc4965 selžou kontroly milníků, splátky 30 % i karta. */
{
  const zamcena = (plan) => {
    const z = nova(); z.cislo = '2026 - OVP - CN - 4775'; const v = z.varianty[0];
    v.data.kryciProj = { hodnoty: {}, planPlateb: plan };
    zamkni(z, 'nabidkaProj');
    return { z, v };
  };
  const castky = (z, v) => NP.nabidkaProjPlatby(z, v, 'cz').dopocet.platby.map(x => x.klic + ':' + x.castka).join('|');
  [[{ v: 1, predvolba: 'zaloha', zaloha: 70 }, { v: 1, predvolba: 'std', prepis: {} }],
   [{ v: 1, predvolba: 'sto' }, { v: 1, predvolba: 'std', prepis: {} }]].forEach(([pred, po]) => {
    const { z, v } = zamcena(pred);
    v.data.kryciProj.planPlateb = po;
    const pl = NP.nabidkaProjPlatby(z, v, 'cz');
    test('SEC-S6: ' + pred.predvolba + ' → std po CN — žádný chybějící milník',
      !pl.kontrola.some(k => k.kod === 'milnik'), pl.kontrola);
    const sod = SD.sodProjData(z, v, 'cz', { symboly: new Set(['SODP_PLATEBNI_KALENDAR']) }).placeholders.SODP_PLATEBNI_KALENDAR;
    test('SEC-S6: ' + pred.predvolba + ' → std po CN — SoD bez „(milník chybí)"', !/milník chybí/.test(String(sod)), sod);
    /* stejně jako nezamčená varianta se Standardem */
    const zn = nova(); zn.cislo = z.cislo; zn.varianty[0].data.kryciProj = { hodnoty: {}, planPlateb: { v: 1, predvolba: 'std' } };
    test('SEC-S6: ' + pred.predvolba + ' → std po CN — splátky jako u nezamčené', castky(z, v) === castky(zn, zn.varianty[0]),
      [castky(z, v), castky(zn, zn.varianty[0])]);
  });
  {
    const { z, v } = zamcena({ v: 1, predvolba: 'zaloha', zaloha: 70 });
    const odeslano = castky(z, v);
    v.data.kryciProj.planPlateb = { v: 1, predvolba: 'zaloha', zaloha: 30, prepis: {} };
    const zn = nova(); zn.cislo = z.cislo; zn.varianty[0].data.kryciProj = { hodnoty: {}, planPlateb: { v: 1, predvolba: 'zaloha', zaloha: 30 } };
    test('SEC-S6: záloha 70 → 30 % po CN — splátky podle 30 % (ne ze snímku)', castky(z, v) === castky(zn, zn.varianty[0]) && castky(z, v) !== odeslano,
      [odeslano, castky(z, v), castky(zn, zn.varianty[0])]);
    test('SEC-S6: … dotisk CN dál ze snímku (70 %)', castky(z, ZM.zamekNabidkaPohled(v)) === odeslano);
    /* text milníku ze snímku má přednost před firemním katalogem */
    const z2 = zamcena({ v: 1, predvolba: 'zaloha', zaloha: 70 });
    const zm = z2.v.data.kryciProj.zmrazenoPlan;
    const mid = zm.milniky[0].id; zm.milniky[0].cz = 'text milníku z odeslané nabídky';
    z2.v.data.kryciProj.planPlateb = { v: 1, predvolba: 'std', prepis: {} };
    const ef = planPlatebVarianty(z2.v, NAST.firma);
    const m = ef.firemni.milniky.filter(x => x.id === mid);
    test('SEC-S6: katalog po změně předvolby — milník ze snímku jednou a s textem snímku',
      m.length === 1 && m[0].cz === 'text milníku z odeslané nabídky', m);
    test('SEC-S6: katalog doplněný o milníky firemního plánu', ef.firemni.milniky.length > zm.milniky.length);
    test('SEC-S6: stejná předvolba i záloha — splátky dál ze snímku', (() => {
      const z3 = zamcena({ v: 1, predvolba: 'zaloha', zaloha: 70 });
      const pred = castky(z3.z, z3.v);
      z3.v.data.kryciProj.planPlateb = { v: 1, predvolba: 'zaloha', zaloha: 70, prepis: {} };
      return castky(z3.z, z3.v) === pred;
    })());
  }
  /* SEC-N8: karta plánu (ui/plan_plateb_ui.js) po CN editovatelná, po SoD ne */
  {
    const vm = require('vm');
    const ui = fs.readFileSync(path.join(__dirname, 'ui', 'plan_plateb_ui.js'), 'utf8');
    const zui = fs.readFileSync(path.join(__dirname, 'ui', 'zamek_ui.js'), 'utf8');
    const vyrez = (zdroj, jm) => { const i = zdroj.indexOf('function ' + jm + '('); const j = zdroj.indexOf('\n}\n', i); return i < 0 ? '' : zdroj.slice(i, j + 2); };
    global.esc = (x) => String(x == null ? '' : x).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    global.escJs = (x) => String(x == null ? '' : x).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    vm.runInThisContext(ui + '\n' + vyrez(zui, 'zamekKryciVolnePole'));
    const { z, v } = zamcena({ v: 1, predvolba: 'zaloha', zaloha: 70 });
    global.ZAK = z;
    const karta = () => { const c = KP.kryciProjCtx(z, v); return planKlpKarta(c) + planKlpPlatbyKarta(c); };
    const k1 = karta();
    test('SEC-N8: karta plánu po CN — volba předvolby bez disabled',
      /onchange="planKlpPredvolba\([^"]*"(?![^>]*disabled)/.test(k1), k1.slice(0, 300));
    zamkni(z, 'sodProj', v);
    const k2 = karta();
    test('SEC-N8: karta plánu po SoD — zamčená (disabled)', /onchange="planKlpPredvolba\([^>]*disabled/.test(k2));
    delete global.ZAK;
  }
}

/* ---- 5b) ceny činností v krycím listu PROJ jako v nabídce (Z1, podnět obchodníka) ----
 * Pojistka: nad v22.10.2 nesl krycí list nezaokrouhlené ceny činností, součet
 * řádků neseděl s „Celkem bez DPH" nabídky (oba případy níž selžou). */
const kc0 = n => Math.round(n || 0).toLocaleString('cs-CZ') + ' Kč';   // = kryciProjKc
[['krok 1000 bez slevy', { krok: 1000, smer: 'nahoru' }, null],
 ['krok 100 se slevou 7 %', { krok: 100, smer: 'nahoru' }, { procenta: 7, stav: 'schváleno' }]].forEach(([nazev, zaokr, sleva]) => {
  const z = nova(); z.cislo = '2026 - OVP - CN - 4773'; const v = z.varianty[0];
  v.data.zaokrProj = zaokr; if (sleva) v.data.slevaProj = sleva;
  const nc = NP.nabidkaProjCeny(v, 'cz');
  const c = KP.kryciProjCtx(z, v);
  const klice = Object.keys(nc.cenyPo).filter(k => c.sekce[k]);
  const p = sleva ? sleva.procenta / 100 : 0;
  test(nazev + ': příprava — aspoň jedna činnost má cenu, kterou nabídka zaokrouhlí',
    nc.r.sekce.some(s => s.celkem > 0 && Math.abs(s.celkem * (1 - p) - nc.cenyPo[s.key]) > 0.5));
  test(nazev + ': cena každé činnosti v krycím listu = cena v nabídce',
    klice.length > 0 && klice.every(k => Math.abs(c.sekce[k].celkem - nc.cenyPo[k]) < 1e-9), klice.map(k => [k, c.sekce[k].celkem, nc.cenyPo[k]]));
  const soucet = klice.reduce((a, k) => a + (c.sekce[k].celkem || 0), 0);
  const pd = NP.nabidkaProjData(z, v, 'cz', { slevaZvlast: false }).placeholders || {};
  test(nazev + ': součet činností = hodnota zakázky = Celkem bez DPH v nabídce',
    kc0(soucet) === c.hodnota && pd.PROJ_CELKEM_BEZ_DPH === F.formatKc2(soucet), [kc0(soucet), c.hodnota, pd.PROJ_CELKEM_BEZ_DPH]);
});

/* ---- 6) Zaměření strojovna ---- */
{
  const z = nova(); const v = z.varianty[0];
  const pole = K.KRYCI_SEKCE.reduce((a, s) => a || s.pole.find(p => p.id === 'zamereniStrojovna'), null);
  const odvozena = K.kryciHodnota(pole, v.data.kryci, K.kryciCtx(z, v, JEKLY));
  v.data.kryci = v.data.kryci || { hodnoty: {} };
  v.data.kryci.hodnoty = Object.assign({}, v.data.kryci.hodnoty, { zamereniStrojovna: odvozena === 'Ano' ? 'Ne' : 'Ano' });   // přepis z doby před zámkem (neplatil)
  test('před zámkem: platí odvozená hodnota, ne ruční přepis', K.kryciHodnota(pole, v.data.kryci, K.kryciCtx(z, v, JEKLY)) === odvozena);
  zamkni(z, 'nabidka');
  test('po zámku: dřívější ruční přepis neožije, platí odvozená hodnota',
    K.kryciHodnota(pole, v.data.kryci, K.kryciCtx(z, v, JEKLY)) === odvozena, K.kryciHodnota(pole, v.data.kryci, K.kryciCtx(z, v, JEKLY)));
  test('po zámku: pole je editovatelné (tabulka J. V.)', ZM.zamekKryciPoleVolne(v, 'kryci', 'zamereniStrojovna'));
  const jina = odvozena === 'Ano' ? 'Ne' : 'Ano';
  v.data.kryci.hodnoty.zamereniStrojovna = jina;
  test('po zámku: ruční přepis po odeslání platí', K.kryciHodnota(pole, v.data.kryci, K.kryciCtx(z, v, JEKLY)) === jina);
  delete v.data.kryci.hodnoty.zamereniStrojovna;
  test('po zámku: ↺ vrátí odvozenou hodnotu', K.kryciHodnota(pole, v.data.kryci, K.kryciCtx(z, v, JEKLY)) === odvozena);
}

console.log(`\n${ok} prošlo, ${fail} selhalo`);
process.exit(fail ? 1 : 0);
