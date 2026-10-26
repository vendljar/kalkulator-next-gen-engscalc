/* ===== SNÍMEK ODESLANÉ NABÍDKY DO PRVNÍHO ULOŽENÍ (K7-K2, audit 23. 10. 2026, #507) =====
 *
 * Do v22.10.6 se snímek zámku (krycí listy + DPH z okamžiku tisku CN) před
 * každým odesláním PŘEPOČÍTAL z aktuálních dat, dokud zámek neležel na
 * serveru. Selhalo-li první uložení a obchodník mezitím změnil DPH nebo
 * podmínky, uložil se snímek s NOVÝMI hodnotami a dotisk CN ukázal jiné DPH,
 * než zákazník dostal. Po obnovení stránky naopak server vracel 409 „snímek
 * nesedí — vytiskněte znovu", ačkoli lokálně zamčenou variantu vytisknout
 * znovu nešlo.
 *
 * Hlídá se:
 *  1) dokud zámek není na serveru, DPH i podmínky nabídky jsou zmrazené;
 *  2) data, která se přece jen rozešla, se před odesláním srovnají PODLE
 *     snímku — snímek se nepřepočítá a server ho přijme (shoda s přepočtem);
 *  3) po obnovení stránky (prázdná paměť) rozhoduje poslední verze ze
 *     serveru: tam zámek není → čeká; po uložení → pole zase volná;
 *  4) ze souboru (bez serveru) se nic nečeká;
 *  5) smlouva vytištěná před uložením zámku nabídky: opsané číslo SoD
 *     a datum podpisu jsou i ve snímku (server by jinak vrátil 409).
 *
 * Spuštění: cd src && node test_snimek_po_tisku.js */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const nacti = (f) => { const m = require(f); Object.keys(m).forEach(k => { if (global[k] === undefined) global[k] = m[k]; }); return m; };
const ZC = require('./zkusebni_cenik.js');
nacti('./format.js');
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
const ULO = nacti('./uloziste.js');

let ok = 0, fail = 0;
const test = (n, cond, info) => { if (cond) { ok++; console.log('OK   ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info).slice(0, 300)); } };
const JEKLY = JSON.parse(fs.readFileSync(path.join(__dirname, 'jekly.json'), 'utf8'));
global.JEKLY = JEKLY;
global.NAST = { firma: FM.firmaDefault() };

/* Prohlížečová část (ui/zamek_ui.js): blok snímku a zamekPoTisku. */
const ui = fs.readFileSync(path.join(__dirname, 'ui', 'zamek_ui.js'), 'utf8');
const vyrez = (jm) => { const i = ui.indexOf('function ' + jm + '('); if (i < 0) return ''; const j = ui.indexOf('\n}\n', i); return ui.slice(i, j + 2); };
const blokOd = ui.indexOf('const ZAMEK_SNIMEK_NEULOZENY');
const blokDo = ui.indexOf('\n}\n', ui.indexOf('function zamekSnimkyUlozeno(')) + 3;
global.ONLINE_STAV = { ja: { email: 'obchodnik@priklad.cz' }, posledni: '' };   // přihlášeně (K8-K4)
global.ONLINE_MOZNE = true;
global.onlineMozne = () => global.ONLINE_MOZNE;
global.render = () => {};
global.porovnaniData = () => null;
global.zamekKdo = () => 'Zkušební obchodník';
global.zamekSlovnikTed = () => null;
global.buildVerze = () => 'test';
const cekaOd = ui.indexOf('const ZAMEK_POLE_CEKA');   // K8-K4: text hlášky u zmrazeného pole
const cekaText = cekaOd >= 0 ? ui.slice(cekaOd, ui.indexOf(';\n', cekaOd) + 2) : '';
vm.runInThisContext(cekaText + ui.slice(blokOd, blokDo) + vyrez('zamekPoTisku') + vyrez('zamekPoTiskuUloz'));
test('prohlížečová část snímku je v ui/zamek_ui.js', typeof global.zamekPoTisku === 'function');
const vrat = () => (typeof zamekSnimkyVrat === 'function') ? zamekSnimkyVrat() : zamekSnimkyObnov();   // eslint-disable-line no-undef
const ceka = (v) => (typeof zamekSnimekCekaNaServer === 'function') && zamekSnimekCekaNaServer(v);    // eslint-disable-line no-undef

const nova = () => {
  const z = zk.novaZakazka(); z.cislo = '2026 - OPR - CN - 5071'; z.nazevAkce = 'Ukázková akce'; z.adresa = 'Ukázková 1';
  Object.assign(z.varianty[0].data.ock.zadani, { sirka: 1.6, hloubka: 1.8, zdvih: 9, prejezd: 3.2, prohluben: 1.2, nastupiste: 4 });
  z.varianty[0].data.cenik.dph = 0.21;
  return z;
};
/* Tisk CN tak, jak ho dělá prohlížeč (zamekPoTisku). */
const tiskni = (typ) => { const v = global.ZAK.varianty[0]; global.zamekPoTisku(typ, v.id); return v; };

/* ---- 1) + 2) tisk → selhané uložení → změna DPH a podmínek → odeslání ---- */
{
  global.ZAK = nova(); global.ONLINE_STAV.posledni = ''; global.ONLINE_MOZNE = true;
  const v = tiskni('nabidka');
  test('tisk CN zamkl variantu se snímkem', ZM.variantaUzamcena(v) && v.zamek.snimek && v.zamek.snimek.dph === 0.21);
  test('dokud zámek není na serveru, čeká na uložení', ceka(v));
  test('… DPH odeslané nabídky je zmrazená', !ZM.zamekDphVolna(v, 'C.dph'));
  test('… platební podmínky jsou zmrazené', ZM.zamekKryciPoleStav(v, 'kryci', 'sazbaDph') === 'zmrazeno');
  /* Rozejdou-li se data přece jen (starší koncept, obnovená záloha): */
  v.data.cenik.dph = 0.12;
  v.data.kryci = v.data.kryci || { hodnoty: {} };
  v.data.kryci.hodnoty = v.data.kryci.hodnoty || {};
  v.data.kryci.hodnoty.platebniPodminkyText = 'nové podmínky po tisku';
  const zpravy = []; global.onlineZprava = (t) => zpravy.push(String(t));
  const ids = vrat();
  delete global.onlineZprava;
  test('K8-K1: srovnání podle snímku se ohlásí (ne potichu)', zpravy.some(t => /vrátily/.test(t)), zpravy);
  test('před odesláním se čekající varianta ohlásí', Array.isArray(ids) && ids.indexOf(v.id) >= 0);
  test('snímek se nepřepočítal — nese DPH z tisku', v.zamek.snimek.dph === 0.21, v.zamek.snimek.dph);
  test('data se srovnala podle snímku (DPH)', v.data.cenik.dph === 0.21, v.data.cenik.dph);
  test('data se srovnala podle snímku (podmínky)', !(v.data.kryci && v.data.kryci.hodnoty
    && v.data.kryci.hodnoty.platebniPodminkyText === 'nové podmínky po tisku'));
  test('server snímek přijme (shoda s přepočtem z dat)',
    JSON.stringify(ZM.zamekSnimekSpocti(v)) === JSON.stringify(v.zamek.snimek));
  test('dotisk CN nese DPH z tisku', ZM.zamekNabidkaPohled(v).data.cenik.dph === 0.21);
}

/* ---- 3) obnovení stránky: paměť prázdná, rozhoduje verze ze serveru ---- */
{
  global.ZAK = nova(); global.ONLINE_MOZNE = true;
  const naServeru = JSON.stringify(global.ZAK);            // uložená verze bez zámku
  const v = tiskni('nabidka');
  if (typeof zamekSnimkyUlozeno === 'function') zamekSnimkyUlozeno([v.id]);   // eslint-disable-line no-undef
  if (typeof ZAMEK_SNIMEK_NEULOZENY !== 'undefined') ZAMEK_SNIMEK_NEULOZENY.clear();   // eslint-disable-line no-undef
  global.ONLINE_STAV.posledni = naServeru;
  test('po obnovení stránky zámek bez serveru dál čeká', ceka(v));
  test('… a DPH zůstává zmrazená (žádná 409 smyčka)', !ZM.zamekDphVolna(v, 'C.dph'));
  global.ONLINE_STAV.posledni = JSON.stringify(global.ZAK);   // uloženo
  test('po uložení zámku nic nečeká', !ceka(v));
  test('… a DPH jde zase změnit (snímek drží dotisk)', ZM.zamekDphVolna(v, 'C.dph'));
}

/* ---- 4) ze souboru se nic nečeká ---- */
{
  global.ZAK = nova(); global.ONLINE_STAV.posledni = ''; global.ONLINE_MOZNE = false;
  const v = tiskni('nabidka');   // paměť tisků se ze souboru nikdy nevyprázdní (nic se neukládá)
  test('ze souboru zámek na server nečeká', !ceka(v));
  test('ze souboru DPH volná jako dřív (Z1)', ZM.zamekDphVolna(v, 'C.dph'));
  global.ONLINE_MOZNE = true;
}

/* ---- 4b) K8-K4 (#517): bez přihlášení se nečeká (jako ze souboru) ---- */
{
  global.ZAK = nova(); global.ONLINE_STAV.posledni = ''; global.ONLINE_MOZNE = true;
  const ja = global.ONLINE_STAV.ja; global.ONLINE_STAV.ja = null;
  const v = tiskni('nabidka');
  test('K8-K4: nepřihlášený tisk CN na uložení nečeká', !ceka(v));
  test('K8-K4: nepřihlášeně DPH volná jako ze souboru', ZM.zamekDphVolna(v, 'C.dph'));
  test('K8-K4: nepřihlášeně se uložení po tisku nespouští', global.zamekPoTiskuUloz() === false);
  global.ONLINE_STAV.ja = ja;
  test('K8-K4: po přihlášení zámek bez serveru zase čeká', ceka(v));
  test('K8-K4: hláška u zmrazeného pole zmiňuje přihlášení',
    typeof ZAMEK_POLE_CEKA === 'string' && /přihl/i.test(ZAMEK_POLE_CEKA), typeof ZAMEK_POLE_CEKA);   // eslint-disable-line no-undef
}

/* ---- 5) SoD vytištěná dřív, než se zámek nabídky uložil ---- */
{
  global.ZAK = nova(); global.ONLINE_STAV.posledni = ''; global.ONLINE_MOZNE = true;
  const v = tiskni('nabidka');
  tiskni('sod');
  vrat();
  test('SoD před uložením: snímek sedí s daty (server nevrátí 409)',
    JSON.stringify(ZM.zamekSnimekSpocti(v)) === JSON.stringify(v.zamek.snimek));
  test('SoD před uložením: DPH snímku zůstala z tisku CN', v.zamek.snimek.dph === 0.21);
  const h = (v.data.kryci && v.data.kryci.hodnoty) || {};
  test('SoD před uložením: opsané číslo SoD a datum podpisu v datech zůstaly (srovnání podle snímku je nesmaže)',
    !!h.cisloSod && !!h.sodDatumPodpisu, h);
}

/* ---- 6) K8-K1 (#516): zakázka ze SOUBORU se zámkem, který už na serveru je ----
 * V okně byla otevřená jiná zakázka (ONLINE_STAV.posledni patří jí). Zámek
 * nesmí „čekat na uložení" — jinak se krycí list zmrazí a zamekSnimkyVrat
 * před odesláním tiše vrátí úpravy provedené po CN. */
{
  global.ZAK = nova(); global.ONLINE_MOZNE = true; global.ONLINE_STAV.rejstrik = [];
  const v = tiskni('nabidka');
  zamekSnimkyUlozeno([v.id]);                                   // eslint-disable-line no-undef
  global.ONLINE_STAV.posledni = JSON.stringify(global.ZAK);     // zámek uložen na server
  global.ONLINE_STAV.rejstrik = [{ soubor: ULO.uloJmenoSouboru(global.ZAK) }];
  test('K8-K1: uložený zámek nečeká', !ceka(v));
  v.data.kryci = v.data.kryci || { hodnoty: {} };
  v.data.kryci.hodnoty = v.data.kryci.hodnoty || {};
  test('K8-K1: splatnost je po CN editovatelná', ZM.zamekKryciPoleStav(v, 'kryci', 'splatnostDni') === 'editovatelne');
  v.data.kryci.hodnoty.splatnostDni = '45';                      // dovolená úprava po CN, uložena
  const soubor = zk.StorageAdapter.exportuj(global.ZAK);
  const jina = nova(); jina.cislo = '2026 - OPR - CN - 5072';
  global.ZAK = jina; global.ONLINE_STAV.posledni = JSON.stringify(jina);   // v okně jiná zakázka
  global.ZAK = zk.StorageAdapter.importuj(soubor);               // import souboru
  const vi = global.ZAK.varianty[0];
  test('K8-K1: po importu ze souboru zámek na server nečeká', !ceka(vi));
  test('K8-K1: … splatnost zůstává editovatelná (krycí list se nezmrazil)',
    ZM.zamekKryciPoleStav(vi, 'kryci', 'splatnostDni') === 'editovatelne');
  const ids = vrat();
  test('K8-K1: před odesláním se nic nevrací', ids.length === 0, ids);
  test('K8-K1: úprava po CN zůstala v odesílaných datech', vi.data.kryci.hodnoty.splatnostDni === '45',
    vi.data.kryci.hodnoty);
  test('K8-K1: snímek CN se nepřepsal (splatnost z tisku)', !(vi.zamek.snimek.kryci && vi.zamek.snimek.kryci.hodnoty
    && vi.zamek.snimek.kryci.hodnoty.splatnostDni === '45'));
  /* SoD po importu: snímek CN se nepřepočítá (K8-K6). */
  const snimekPred = JSON.stringify(vi.zamek.snimek);
  global.zamekPoTisku('sod', vi.id);
  test('K8-K6: SoD u uloženého zámku snímek CN nepřepíše', JSON.stringify(vi.zamek.snimek) === snimekPred);
}

/* ---- 7) K8-K1: zakázka, která na serveru vůbec není → zámek čeká ---- */
{
  global.ZAK = nova(); global.ONLINE_MOZNE = true;
  const v = tiskni('nabidka');
  zamekSnimkyUlozeno([v.id]); ZAMEK_SNIMEK_NEULOZENY.clear();   // eslint-disable-line no-undef
  const jina = nova(); jina.cislo = '2026 - OPR - CN - 5073';
  global.ONLINE_STAV.posledni = JSON.stringify(jina);
  global.ONLINE_STAV.rejstrik = [{ soubor: ULO.uloJmenoSouboru(jina) }];
  test('K8-K1: zakázka mimo rejstřík serveru — zámek čeká (server ho ověří)', ceka(v));
  test('K8-K1: … číslo nabídky (jen admin) je při čekání zmrazené', ZM.zamekKryciPoleStav(v, 'kryci', 'cisloCN') === 'zmrazeno');
  global.ONLINE_STAV.rejstrik = [];
  test('K8-K1: bez znalosti serveru (prázdný rejstřík, cizí poslední verze) se nečeká', !ceka(v));
}

/* ---- 8) K8-K6: SoD před uložením zámku přepíše ve snímku jen opsaná pole ---- */
{
  global.ZAK = nova(); global.ONLINE_MOZNE = true; global.ONLINE_STAV.posledni = ''; global.ONLINE_STAV.rejstrik = [];
  const v = tiskni('nabidka');
  /* data se od snímku rozešla (obnovená záloha) — SoD to nesmí vtisknout do snímku */
  v.data.kryci = v.data.kryci || { hodnoty: {} }; v.data.kryci.hodnoty = v.data.kryci.hodnoty || {};
  v.data.kryci.hodnoty.splatnostDni = '99';
  tiskni('sod');
  test('K8-K6: SoD před uložením nevtiskne do snímku jiné pole než opsané',
    v.zamek.snimek.kryci.hodnoty.splatnostDni !== '99', v.zamek.snimek.kryci.hodnoty.splatnostDni);
  test('K8-K6: … opsané číslo SoD ve snímku je', !!v.zamek.snimek.kryci.hodnoty.cisloSod);
  vrat();
  test('K8-K6: po srovnání podle snímku server snímek přijme',
    JSON.stringify(ZM.zamekSnimekSpocti(v)) === JSON.stringify(v.zamek.snimek));
}

console.log(`\n${ok} prošlo, ${fail} selhalo`);
process.exit(fail ? 1 : 0);
