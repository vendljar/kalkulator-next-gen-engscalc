/* UKÁZKA EXPORTU PRO CONTROLLING, VERZE 2 (C5 + C6, #447) — dávka D1 22. 10. 2026.
 *
 * Vyrobí podklady/ukazky/controlling_export_v2_ukazka.xlsx kódem aplikace
 * (src/controlling.js ctrlHromadnyZakazka + ctrlExportListy, src/xlsx.js
 * xlsxZapis) — stejná cesta jako hromadný export za období v Nastavení →
 * Controlling (server vybírá zakázky, prohlížeč skládá sešit).
 *
 * Data jsou SMYŠLENÁ: pět zkušebních nabídek „Zkušební zákazník …“, ceník
 * je zkušební ceník testů (src/zkusebni_cenik.js — kulatá, schválně
 * nesmyslná čísla), mapování výchozí. Žádná zakázka ani ceník z produkce.
 *
 * Spuštění (z kořene repozitáře): node podklady/ukazky/vyrob_controlling_export_v2.js [výstup.xlsx] */
const fs = require('fs');
const path = require('path');
const SRC = path.join(__dirname, '..', '..', 'src');
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

const kopie = x => JSON.parse(JSON.stringify(x));
const KDO = 'spravce@priklad.cz';
const OBCH = 'obchodnik@priklad.cz';

function zakladZakazky(cislo, nazev, zakaznik) {
  const zak = novaZakazka();
  zak.cislo = cislo; zak.nazevAkce = nazev; zak.objednatel = zakaznik; zak.ico = '12345678'; zak.autor = OBCH;
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
  v.data.sleva = { pct: (opts && opts.sleva) || 0 };
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

const zakazky = [];
/* 1) OCK ČR, Model 1, řídící zamčená; zákazník objednal dva příplatky (C6). */
{
  const zak = zakladZakazky('2026 - OPR - CN - 0901', 'Zkušební bytový dům A', 'Zkušební zákazník s.r.o.');
  const v = zak.varianty[0];
  ock(zak, v, { sirka: 1.6, hloubka: 1.8, zdvih: 9, prejezd: 3.2, prohluben: 1.2, rezervaPriplatkyPct: 0.2 });
  zamkni(zak, v, '2026-10-06T08:00:00Z', 'nabidka');
  const nab = O.objNabidnute(v, JEKLY).map(p => p.key);
  const chyba = O.objNastav(zak, v, nab.slice(0, 2), '2026-10-14', { kdo: OBCH, ted: '2026-10-14T10:00:00Z' });
  if (chyba) throw new Error('objNastav: ' + chyba);
  zakazky.push(zak);
}
/* 2) OCK ČR, Model 2, sleva 5 %, řídící zamčená, bez objednaných příplatků. */
{
  const zak = zakladZakazky('2026 - OPR - CN - 0902', 'Zkušební administrativní budova B', 'Zkušební zákazník s.r.o.');
  const v = zak.varianty[0];
  ock(zak, v, { sirka: 2.1, hloubka: 2.4, zdvih: 15, prejezd: 3.6, prohluben: 1.4 }, { model2: true, sleva: 5 });
  zamkni(zak, v, '2026-10-09T12:30:00Z', 'nabidka');
  zakazky.push(zak);
}
/* 3) OCK zahraničí: řídící varianta (druhá) není zamčená, zamčená je jen
 *    první → hromadný export ji vezme a označí „Řídící varianta = ne“ (C5). */
{
  const zak = zakladZakazky('2026 - OPR - CN - 0903', 'Zkušební hotel C', 'Zkušební zákazník GmbH');
  const v = zak.varianty[0];
  ock(zak, v, { sirka: 1.8, hloubka: 2.0, zdvih: 12, prejezd: 3.4, prohluben: 1.3 }, { zahr: true });
  zamkni(zak, v, '2026-10-13T09:15:00Z', 'nabidka');
  const v2 = kopie(v); v2.id = v.id + '-b'; v2.zamek = null; v2.nazev = 'Varianta B';
  zak.varianty.forEach(x => { x.ridici = false; }); v2.ridici = true; zak.varianty.push(v2);
  zakazky.push(zak);
}
/* 4) PROJ, Praha, řídící zamčená. */
{
  const zak = zakladZakazky('2026 - OVP - CN - 0904', 'Zkušební rekonstrukce D', 'Zkušební zákazník s.r.o.');
  const v = zak.varianty[0];
  proj(zak, v, { nabizetAD: true });
  zamkni(zak, v, '2026-10-15T07:45:00Z', 'nabidkaProj');
  zakazky.push(zak);
}
/* 5) PROJ, akce mimo Prahu; zámek bez zmrazeného výsledku (jako nabídky
 *    zamčené před 15. 9. 2026) → sloupec „Výsledek = přepočtený“. */
{
  const zak = zakladZakazky('2026 - OVP - CN - 0905', 'Zkušební výtah do stávající šachty E', 'Zkušební zákazník a.s.');
  const v = zak.varianty[0];
  proj(zak, v, { akceMimoPrahu: true });
  zamkni(zak, v, '2026-10-20T14:00:00Z', 'nabidkaProj');
  delete v.zamek.vysledek;
  zakazky.push(zak);
}

const filtr = C.ctrlHromadnyFiltr({ od: '2026-10-01', do: '2026-10-31', oblast: 'obe', rada: 'obe' });
if (!filtr.ok) throw new Error('filtr: ' + filtr.chyba);
const opts = { jekly: JEKLY, kdo: KDO, kdy: '2026-10-22T08:00:00Z', build: 'ukázka v21.10.6' };
const exporty = [], preskoceno = [];
zakazky.forEach(zak => {
  const r = C.ctrlHromadnyZakazka(zak, filtr.filtr, opts);
  if (r.ok) exporty.push(r.exp); else preskoceno.push({ cislo: zak.cislo, duvod: r.duvod });
});
if (exporty.length !== 5) throw new Error('čekám 5 exportů, je ' + exporty.length + ' ' + JSON.stringify(preskoceno));
const listy = C.ctrlExportListy(exporty, null, { kdy: opts.kdy, kdo: KDO,
  hromadny: { od: filtr.filtr.od, do: filtr.filtr.do, oblast: 'obe', rada: 'obe', preskoceno } });

const vystup = process.argv[2] || path.join(__dirname, 'controlling_export_v2_ukazka.xlsx');
xlsxZapis(listy).arrayBuffer().then(ab => {
  fs.writeFileSync(vystup, Buffer.from(ab));
  console.log('OK -> ' + vystup);
  listy.forEach(l => console.log('  ' + l.nazev + ': ' + (l.rows.length - 1) + ' řádků pod hlavičkou'));
});
