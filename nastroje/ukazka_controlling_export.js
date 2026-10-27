/* UKÁZKOVÝ EXPORT PRO CONTROLLING (C3 #537, 27. 10. 2026; C4 #540 — Prodáno,
 * verze struktury 4) — dnešním kódem.
 *
 * Vyrobí hromadný export za období (Nastavení → Controlling → Export) z pěti
 * SMYŠLENÝCH zakázek kódem aplikace: src/controlling.js ctrlHromadnyFiltr +
 * ctrlHromadnyZakazka + ctrlExportListy, src/xlsx.js xlsxZapis — stejná cesta
 * jako v aplikaci (server vybírá zakázky, prohlížeč skládá sešit).
 *
 * Nástupce podklady/ukazky/vyrob_controlling_export_v2.js (D1, 22. 10.), který
 * po #504 (výchozí výběr podle data prodeje a filtr Stav Pipedrive = won)
 * žádnou zakázku nevyveze. Tady je výběr řečen výslovně (podle zamčení, všechny
 * stavy Pipedrive), aby ukázka ukázala všech pět případů; zakázky přesto nesou
 * smyšlený deal a stav, aby byly vidět sloupce Pipedrive.
 *
 * Data: „Zkušební zákazník …", IČO 12345678, adresy @priklad.cz, zkušební
 * ceník testů (src/zkusebni_cenik.js — kulatá, schválně nesmyslná čísla),
 * výchozí mapování skupin. Žádná zakázka ani ceník z produkce, proto se
 * výstup smí commitnout (kontrola: nastroje/kontrola_udaju.py).
 *
 * Jméno souboru podle konvence TYP_rok-OBSAH_verze.přípona (E1 #533):
 *   UKAZKA_2026-CONTROLLING-EXPORT_v<verze.txt>.xlsx
 *
 * Spuštění z kořene repozitáře:
 *   node nastroje/ukazka_controlling_export.js [složka nebo soubor.xlsx] [--json]
 * bez cíle → podklady/controlling/. `--json` vypíše na stdout souhrn (listy,
 * počty, zjištění k otevřeným nálezům #500) — používá ho test
 * src/test_ukazka_controlling.js. */
'use strict';
const fs = require('fs');
const path = require('path');
const KOREN = path.join(__dirname, '..');
const SRC = path.join(KOREN, 'src');
const nacti = (f) => { const m = require(path.join(SRC, f)); Object.keys(m).forEach(k => { if (global[k] === undefined) global[k] = m[k]; }); return m; };
const ZC = require(path.join(SRC, 'zkusebni_cenik.js'));
['format.js', 'preklad.js', 'docxgen.js', 'cenik.js', 'cenik_stari.js', 'engine.js'].forEach(nacti);
global.DEFAULT_CENIK = ZC.zkusebniCenik();
nacti('engine_proj.js');
global.DEFAULT_CENIK_PROJ = ZC.zkusebniCenikProj();
['techspec.js', 'sleva.js', 'zaokrouhleni.js', 'podminky.js', 'firma.js', 'zakazka.js', 'zamek.js', 'kryci.js', 'xlsx.js']
  .forEach(f => { try { nacti(f); } catch (e) { /* modul v Node nemusí jít načíst */ } });
const C = nacti('controlling.js');
const O = nacti('objednane.js');
const JEKLY = require(path.join(SRC, 'jekly.json'));

const VERZE = fs.readFileSync(path.join(KOREN, 'verze.txt'), 'utf8').trim();
const JMENO = 'UKAZKA_2026-CONTROLLING-EXPORT_v' + VERZE + '.xlsx';
const kopie = x => JSON.parse(JSON.stringify(x));
const KDO = 'spravce@priklad.cz';
const OBCH = 'obchodnik@priklad.cz';
const PD_NACTENO = '2026-10-27T07:00:00Z';

function zakladZakazky(cislo, nazev, zakaznik, deal, stav) {
  const zak = novaZakazka();
  zak.cislo = cislo; zak.nazevAkce = nazev; zak.objednatel = zakaznik; zak.ico = '12345678'; zak.autor = OBCH;
  if (deal) { zak.pdDealId = deal; zak.pdStav = { status: stav, nacteno: PD_NACTENO }; }
  return zak;
}
function zamkni(zak, v, kdy, typ) {
  zamkniVariantu(v, { cislo: variantaCislo(zak, v), kdo: OBCH, typ, kdy, vysledek: zamekVysledekSpocti(v, JEKLY, 'ukazka') });
  v.zamek.kdy = kdy;
}
function ock(zak, v, zadani, opts) {
  Object.assign(v.data.ock.zadani, zadani);
  v.data.ock.fixes = !!(opts && opts.model2);
  v.data.cenik = ZC.zkusebniCenik();
  /* sleva platí jen schválená (slevaPlati, src/sleva.js) */
  v.data.sleva = (opts && opts.sleva) ? { procenta: opts.sleva, stav: 'schváleno' } : { procenta: 0 };
  if (opts && opts.zahr) v.data.cenikRada = 'zahr';
  zak.jenOck = true;
}
function proj(zak, v, uprava) {
  const z = kopie(DEFAULT_ZADANI_PROJ);
  z.sekce.forEach(s => s.polozky.forEach(p => { p.vyrazeno = false; }));
  v.data.proj.zadani = Object.assign(z, uprava || {});
  v.data.proj.cenik = Object.assign(ZC.zkusebniCenikProj(), { vyjezdTechnikKc: 1000 });
  v.data.slevaProj = { pct: 0 };
  zak.jenProj = true;
}

function zakazky() {
  const out = [];
  /* 1) OCK ČR, Model 1, deal vyhraný; prodáno 14. 10. (#540) a zákazník
   *    přiobjednal dva příplatky (C6). */
  {
    const zak = zakladZakazky('2026 - OPR - CN - 0901', 'Zkušební bytový dům A', 'Zkušební zákazník s.r.o.', 9001, 'won');
    const v = zak.varianty[0];
    ock(zak, v, { sirka: 1.6, hloubka: 1.8, zdvih: 9, prejezd: 3.2, prohluben: 1.2, rezervaPriplatkyPct: 0.2 });
    zamkni(zak, v, '2026-10-06T08:00:00Z', 'nabidka');
    const nab = O.objNabidnute(v, JEKLY).map(p => p.key);
    const chyba = O.objNastav(zak, v, nab.slice(0, 2), '2026-10-14', { kdo: OBCH, ted: '2026-10-14T10:00:00Z' });
    if (chyba) throw new Error('objNastav: ' + chyba);
    const prod = O.prodNastav(zak, v, '2026-10-14', { kdo: OBCH, kdy: '2026-10-14T10:00:00Z', ted: '2026-10-27T08:00:00Z' });
    if (prod) throw new Error('prodNastav: ' + prod);
    out.push(zak);
  }
  /* 2) OCK ČR, Model 2, sleva 5 %, deal otevřený, bez objednaných příplatků. */
  {
    const zak = zakladZakazky('2026 - OPR - CN - 0902', 'Zkušební administrativní budova B', 'Zkušební zákazník s.r.o.', 9002, 'open');
    const v = zak.varianty[0];
    ock(zak, v, { sirka: 2.1, hloubka: 2.4, zdvih: 15, prejezd: 3.6, prohluben: 1.4 }, { model2: true, sleva: 5 });
    zamkni(zak, v, '2026-10-09T12:30:00Z', 'nabidka');
    out.push(zak);
  }
  /* 3) OCK zahraničí: řídící varianta B není zamčená → export vezme zamčenou
   *    A a označí „Řídící varianta = ne" (C5). Bez dealu. */
  {
    const zak = zakladZakazky('2026 - OPR - CN - 0903', 'Zkušební hotel C', 'Zkušební zákazník GmbH');
    const v = zak.varianty[0];
    ock(zak, v, { sirka: 1.8, hloubka: 2.0, zdvih: 12, prejezd: 3.4, prohluben: 1.3 }, { zahr: true });
    zamkni(zak, v, '2026-10-13T09:15:00Z', 'nabidka');
    const v2 = kopie(v); v2.id = v.id + '-b'; v2.zamek = null; v2.nazev = 'Varianta B';
    zak.varianty.forEach(x => { x.ridici = false; }); v2.ridici = true; zak.varianty.push(v2);
    out.push(zak);
  }
  /* 4) PROJ, Praha, deal vyhraný; prodáno bez objednaných příplatků (#540). */
  {
    const zak = zakladZakazky('2026 - OVP - CN - 0904', 'Zkušební rekonstrukce D', 'Zkušební zákazník s.r.o.', 9004, 'won');
    const v = zak.varianty[0];
    proj(zak, v, { nabizetAD: true });
    zamkni(zak, v, '2026-10-15T07:45:00Z', 'nabidkaProj');
    const prod = O.prodNastav(zak, v, '2026-10-21', { kdo: OBCH, kdy: '2026-10-21T09:00:00Z', ted: '2026-10-27T08:00:00Z' });
    if (prod) throw new Error('prodNastav: ' + prod);
    out.push(zak);
  }
  /* 5) PROJ mimo Prahu, deal prohraný; zámek bez zmrazeného výsledku (jako
   *    nabídky zamčené před 15. 9. 2026) → „Výsledek = přepočtený". */
  {
    const zak = zakladZakazky('2026 - OVP - CN - 0905', 'Zkušební výtah do stávající šachty E', 'Zkušební zákazník a.s.', 9005, 'lost');
    const v = zak.varianty[0];
    proj(zak, v, { akceMimoPrahu: true });
    zamkni(zak, v, '2026-10-20T14:00:00Z', 'nabidkaProj');
    delete v.zamek.vysledek;
    out.push(zak);
  }
  return out;
}

/* Zjištění k otevřeným nálezům #500 z ukázky 21. 10. — čísla, ne částky. */
function zjisteni(exporty, listy) {
  const kap = listy.find(l => l.nazev === 'Kapitoly').rows;
  const iPod = kap[0].indexOf('Podíl na nákladu (%)');
  const soucetPodilu = {};
  kap.slice(1).forEach(r => { if (r.length > iPod && typeof r[iPod] === 'number' && r[0]) soucetPodilu[r[0] + ' ' + r[1]] = (soucetPodilu[r[0] + ' ' + r[1]] || 0) + r[iPod]; });
  const podilyMimo100 = Object.entries(soucetPodilu).filter(([, s]) => Math.abs(s - 100) > 1e-9)
    .map(([k, s]) => ({ strana: k, soucet: Math.round(s * 100) / 100 }));
  const iZaokr = kap.findIndex(r => r[0] === 'Souhrn zakázky');
  const hl = kap[iZaokr];
  const zaokrNenulove = kap.slice(iZaokr + 1).filter(r => r[1] === 'OCK' && +r[hl.indexOf('Zaokrouhlení (Kč)')] !== 0).length;
  const ockStran = kap.slice(iZaokr + 1).filter(r => r[1] === 'OCK').length;
  const prodane = exporty.filter(e => e.hlavicka.datumProdeje).map(e => e.strany.map(x => x.cislo).join(' + ') + ' ' + e.hlavicka.datumProdeje);
  return { podilyMimo100, zaokrouhleniOck: { stran: ockStran, nenulove: zaokrNenulove }, prodane };
}

function vyrob(cil) {
  const filtr = C.ctrlHromadnyFiltr({ od: '2026-10-01', do: '2026-10-31', oblast: 'obe', rada: 'obe', podle: 'zamceni', pd: 'vse' });
  if (!filtr.ok) throw new Error('filtr: ' + filtr.chyba);
  const opts = { jekly: JEKLY, kdo: KDO, kdy: '2026-10-27T08:00:00Z', build: 'ukázka v' + VERZE };
  const exporty = [], preskoceno = [];
  zakazky().forEach(zak => {
    const r = C.ctrlHromadnyZakazka(zak, filtr.filtr, opts);
    if (r.ok) exporty.push(r.exp); else preskoceno.push({ cislo: zak.cislo, duvod: r.duvod });
  });
  if (exporty.length !== 5) throw new Error('čekám 5 exportů, je ' + exporty.length + ' ' + JSON.stringify(preskoceno));
  const listy = C.ctrlExportListy(exporty, null, { kdy: opts.kdy, kdo: KDO,
    hromadny: Object.assign({}, filtr.filtr, { preskoceno, vyrazenoPd: { jiny: 0, bez: 0 } }) });
  let soubor = cil || path.join(KOREN, 'podklady', 'controlling');
  if (!/\.xlsx$/i.test(soubor)) soubor = path.join(soubor, JMENO);
  fs.mkdirSync(path.dirname(soubor), { recursive: true });
  return xlsxZapis(listy).arrayBuffer().then(ab => {
    fs.writeFileSync(soubor, Buffer.from(ab));
    return { soubor, jmeno: path.basename(soubor), verzeStruktury: C.CTRL_EXPORT_VERZE, filtr: filtr.filtr,
      zakazek: exporty.length, preskoceno,
      listy: listy.map(l => ({ nazev: l.nazev, radku: l.rows.length - 1, hlavicka: l.rows[0] })),
      zjisteni: zjisteni(exporty, listy) };
  });
}

if (require.main === module) {
  const arg = process.argv.slice(2);
  const json = arg.includes('--json');
  vyrob(arg.find(a => a !== '--json')).then(s => {
    if (json) { console.log(JSON.stringify(s)); return; }
    console.log('OK -> ' + s.soubor);
    s.listy.forEach(l => console.log('  ' + l.nazev + ': ' + l.radku + ' řádků pod hlavičkou'));
    console.log('  Kapitoly — součet podílů ≠ 100 %: ' + (s.zjisteni.podilyMimo100.map(x => x.strana + ' ' + x.soucet).join('; ') || 'nikde'));
    console.log('  Souhrn — nenulové zaokrouhlení u OCK: ' + s.zjisteni.zaokrouhleniOck.nenulove + ' z ' + s.zjisteni.zaokrouhleniOck.stran);
  }).catch(e => { console.error('CHYBA: ' + (e && e.stack || e)); process.exit(1); });
}
module.exports = { vyrob, JMENO };
