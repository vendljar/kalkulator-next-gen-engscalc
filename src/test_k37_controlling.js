/* K37 — controlling: identita souhrnu Kapitol (K37-N3) a nečitelné datum
 * prodeje (K37-N9). Kolo 37 (test v27.10.6), 2. 11. 2026.
 *
 * K37-N3: v řádku souhrnu OCK neplatilo Cena před slevou − Sleva +
 * Zaokrouhlení = Cena nabídky — rozdíl byl přesně CEIL základu na tisíce
 * („Cena před slevou" už po CEIL a sloupec Zaokrouhlení ho přičítal znovu).
 * Ověřuje identitu u OCK i PROJ se slevou a obchodním zaokrouhlením.
 * K37-N9: Prodáno / objednané s textovým datem, které není platný den
 * ('xx', '2026-13-45', '', '2026-02-30'), skončilo tiše „zamčena mimo
 * období"; má být mezi přeskočenými s důvodem.
 *
 * Pojistka: nad v27.10.6 sada selže (K37-N3 OCK identita + před CEIL,
 * K37-N9 všechny případy neplatného data). Ceník je SMYŠLENÝ. */
const path = require('path');
const nacti = f => { const m = require(f); Object.keys(m).forEach(k => { global[k] = m[k]; }); return m; };
const ZC = require('./zkusebni_cenik.js');
['./format.js', './preklad.js', './docxgen.js', './cenik.js', './cenik_stari.js', './engine.js'].forEach(f => { try { nacti(f); } catch (e) {} });
global.DEFAULT_CENIK = ZC.zkusebniCenik();
nacti('./engine_proj.js');
global.DEFAULT_CENIK_PROJ = ZC.zkusebniCenikProj();
['./techspec.js', './sleva.js', './zaokrouhleni.js', './podminky.js', './firma.js', './zakazka.js', './zamek.js', './kryci.js', './kryci_proj.js',
  './plan_plateb.js', './xlsx.js'].forEach(f => { try { nacti(f); } catch (e) { /* modul v Node nemusí jít načíst */ } });
const C = nacti('./controlling.js');
const O = nacti('./objednane.js');
const JEKLY = require('./jekly.json');

let ok = 0, fail = 0;
const test = (n, cond, info) => {
  if (cond) { ok++; console.log('OK  ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info).slice(0, 400)); }
};
const kopie = x => JSON.parse(JSON.stringify(x));
const fn = n => typeof global[n] === 'function';
const DNES = '2026-10-27';
const TED = '2026-10-27T10:00:00.000Z';
const OBCH = { email: 'obchodnik@priklad.cz', role: 'Obchodník' };
const VED = { email: 'vedouci@priklad.cz', role: 'Vedoucí' };
const ADM = { email: 'spravce@priklad.cz', role: 'Administrátor' };

function zakazka() {
  const zak = novaZakazka();
  zak.cislo = '2026 - OPR - CN - 0951'; zak.nazevAkce = 'Zkušební akce C4'; zak.objednatel = 'Zkušební zákazník s.r.o.'; zak.ico = '12345678';
  zak.autor = OBCH.email; zak.jenOck = true;
  const v = zak.varianty[0];
  Object.assign(v.data.ock.zadani, { sirka: 1.6, hloubka: 1.8, zdvih: 9, prejezd: 3.2, prohluben: 1.2, rezervaPriplatkyPct: 0.2 });
  v.data.cenik = ZC.zkusebniCenik();
  v.data.sleva = { procenta: 0 };
  return zak;
}
function zamkni(zak, v, kdy) {
  zamkniVariantu(v, { cislo: variantaCislo(zak, v), kdo: OBCH.email, typ: 'nabidka', kdy: kdy || '2026-10-20T08:00:00.000Z',
    vysledek: zamekVysledekSpocti(v, JEKLY, 'test') });
  if (kdy) v.zamek.kdy = kdy;
  return v;
}
const srv = (stara, zak, rel, ctx) => O.prodServer(stara, zak, rel, Object.assign({ ted: TED, kdy: TED }, ctx || {}));


/* ---------- K37-N3: identita řádku souhrnu v listu Kapitoly ---------- */
function souhrnRadky(zak, v) {
  const ex = C.ctrlExportVarianty(zak, v, { jekly: JEKLY });
  const kap = C.ctrlExportListy(ex).find(l => l.nazev === 'Kapitoly').rows;
  const iS = kap.findIndex(r => r[0] === 'Souhrn zakázky');
  const h = kap[iS];
  return kap.slice(iS + 1).filter(r => r.length === h.length).map(r => {
    const g = n => r[h.indexOf(n)];
    return { oblast: r[1], pred: g('Cena před slevou (Kč)'), sleva: g('Sleva (Kč)'), zaokr: g('Zaokrouhlení (Kč)'), cena: g('Cena nabídky bez DPH (Kč)') };
  });
}
const identita = r => Math.abs(r.pred - r.sleva + r.zaokr - r.cena) < 0.011;
{
  const zak = zakazka();
  const v = zak.varianty[0];
  /* sleva i obchodní zaokrouhlení nenulové — všechny tři členy identity se uplatní */
  v.data.sleva = { procenta: 3, stav: 'schváleno' };
  v.data.zaokr = { krok: 1000, smer: 'dolu' };
  zamkni(zak, v);
  const ock = souhrnRadky(zak, v).find(r => r.oblast === 'OCK');
  /* PROJ zvlášť: zakázka jen projekce (u čísla OPR je PROJ vyřazená, D6). */
  const zp = zakazka(); zp.jenOck = false; zp.jenProj = true;
  const vp = zp.varianty[0];
  vp.data.slevaProj = { procenta: 2, stav: 'schváleno' };
  vp.data.zaokrProj = { krok: 100, smer: 'nahoru' };
  zamkni(zp, vp);
  const rr = souhrnRadky(zp, vp);
  const proj = rr.find(r => r.oblast === 'PROJ');
  const vO = vypocetZ(v, JEKLY);
  const ceil = vO.souhrn.zakladCena - (vO.souhrn.zakladNaklad + vO.souhrn.zakladMarze);
  test('K37-N3 příprava: CEIL na tisíce nenulový, sleva i obchodní zaokrouhlení OCK nenulové',
    ceil > 0.5 && ock && ock.sleva > 0 && Math.abs(ock.zaokr - ceil) > 0.5, { ceil, ock });
  test('K37-N3: OCK — Cena před slevou − Sleva + Zaokrouhlení = Cena nabídky', !!ock && identita(ock), ock);
  test('K37-N3: OCK — Cena před slevou je před CEIL (náklad + marže základu)', !!ock
    && Math.abs(ock.pred - Math.round((vO.souhrn.zakladNaklad + vO.souhrn.zakladMarze) * 100) / 100) < 0.011, { ock, s: vO.souhrn });
  test('K37-N3: PROJ — strana v souhrnu je, se slevou a obchodním zaokrouhlením', !!proj && proj.sleva > 0 && proj.zaokr !== 0, rr);
  test('K37-N3: PROJ — Cena před slevou − Sleva + Zaokrouhlení = Cena nabídky', !!proj && identita(proj), proj);
}

/* ---------- K37-N9: nečitelné textové datum prodeje ---------- */
const FILTR = C.ctrlHromadnyFiltr({ od: '2026-10-01', do: '2026-10-31', podle: 'prodej' }).filtr;
['xx', '2026-13-45', '', '2026-02-30'].forEach(d => {
  const zak = zakazka(); const v = zak.varianty[0]; zamkni(zak, v);
  v.prodano = { datum: d, kdo: OBCH.email, kdy: TED };
  const r = C.ctrlHromadnyZakazka(zak, FILTR, { jekly: JEKLY });
  test('K37-N9: Prodáno s datem ' + JSON.stringify(d) + ' → přeskočeno s důvodem, ne tiše mimo období',
    r && r.ok === false && !r.mimo && /neplatný tvar/.test(r.duvod), r);
  test('K37-N9: předvýběr z rejstříku ji s datem ' + JSON.stringify(d) + ' přečte (cist)', (C.ctrlRejstrikDny(zak) || {}).cist === true,
    C.ctrlRejstrikDny(zak));
});
{
  const zak = zakazka(); const v = zak.varianty[0]; zamkni(zak, v);
  zak.objednane = { klice: ['x'], varianta: v.id, datum: '2026-10-99' };
  const r = C.ctrlHromadnyZakazka(zak, FILTR, { jekly: JEKLY });
  test('K37-N9: objednané příplatky s neplatným datem → přeskočeno s důvodem', r && r.ok === false && !r.mimo && /neplatný tvar/.test(r.duvod), r);
}
{
  const zak = zakazka(); const v = zak.varianty[0]; zamkni(zak, v);
  v.prodano = { datum: '2026-09-15', kdo: OBCH.email, kdy: TED };
  const r = C.ctrlHromadnyZakazka(zak, FILTR, { jekly: JEKLY });
  test('K37-N9: platné datum mimo období zůstává tiše mimo (mimo: true)', r && r.ok === false && r.mimo === true, r);
}

console.log(`\n${ok} OK, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
