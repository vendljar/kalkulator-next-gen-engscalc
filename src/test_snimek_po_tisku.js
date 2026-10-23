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
global.ONLINE_STAV = { ja: null, posledni: '' };
global.ONLINE_MOZNE = true;
global.onlineMozne = () => global.ONLINE_MOZNE;
global.render = () => {};
global.porovnaniData = () => null;
global.zamekKdo = () => 'Zkušební obchodník';
global.zamekSlovnikTed = () => null;
global.buildVerze = () => 'test';
vm.runInThisContext(ui.slice(blokOd, blokDo) + vyrez('zamekPoTisku') + vyrez('zamekPoTiskuUloz'));
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
  const ids = vrat();
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
  const v = tiskni('nabidka');
  if (typeof ZAMEK_SNIMEK_NEULOZENY !== 'undefined') ZAMEK_SNIMEK_NEULOZENY.clear();   // eslint-disable-line no-undef
  test('ze souboru zámek na server nečeká', !ceka(v));
  test('ze souboru DPH volná jako dřív (Z1)', ZM.zamekDphVolna(v, 'C.dph'));
  global.ONLINE_MOZNE = true;
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

console.log(`\n${ok} prošlo, ${fail} selhalo`);
process.exit(fail ? 1 : 0);
