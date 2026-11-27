/* K70-N1 (27. 11. 2026): vyrobí fixturu src/test_k70n1_zamek_main.json —
 * zámky odeslané nabídky pořízené KÓDEM MAIN v24.11.7 (4e69c27).
 * Použití (strom main rozbalený bokem):
 *   mkdir -p /tmp/m && git archive 4e69c27 src | tar -x -C /tmp/m
 *   node nastroje/k70n1_vyrob_fixturu.js /tmp/m > /tmp/fix.json
 * Výstup má klíče bez / rp / razitkoZabudovany / pocetHesel; do repozitáře se
 * ukládá s popisem (_popis, commit). Smyšlené údaje, zkušební ceník. */
const R = process.argv[2] + '/src/';
const nacti = f => { const m = require(R + f); Object.keys(m).forEach(k => { if (global[k] === undefined) global[k] = m[k]; }); return m; };
const ZC = require(R + 'zkusebni_cenik.js');
nacti('format.js'); const PR = nacti('preklad.js'); nacti('docxgen.js'); nacti('engine.js');
global.DEFAULT_CENIK = ZC.zkusebniCenik(); nacti('engine_proj.js'); global.DEFAULT_CENIK_PROJ = ZC.zkusebniCenikProj();
['vice_sachet.js','techspec.js','sleva.js','zaokrouhleni.js','firma.js','plan_plateb.js'].forEach(f => { try { nacti(f); } catch (e) {} });
const zk = nacti('zakazka.js'); const ZM = nacti('zamek.js'); nacti('podminky.js'); const KR = nacti('kryci.js');
const SL = nacti('slovnik.js');
const J = require(R + 'jekly.json');
global.NAST = { firma: global.firmaDefault() };
const out = {};
for (const druh of ['bez', 'rp']) {
  const z = zk.novaZakazka(); z.cislo = '2026 - OPR - CN - 7001'; z.nazevAkce = 'K70-N1 fixtura'; z.objednatel = 'Zkušební s.r.o.';
  const v = z.varianty[0]; v.data.cenik = Object.assign(ZC.zkusebniCenik(), { kurzEurKc: 25 }); v.data.ock.fixes = true;
  Object.assign(v.data.ock.zadani, { sirka: 1.6, hloubka: 2, zdvih: 12, prejezd: 3.3, prohluben: 1.2, nastupiste: 5, engineeringKs: 2 });
  if (druh === 'rp') {
    const Z = v.data.ock.zadani; Z.vlastniPolozky = Z.vlastniPolozky || {};
    (Z.vlastniPolozky.hrubaOck = Z.vlastniPolozky.hrubaOck || []).push({ nazev: 'Kotevní konzola atyp', mnozstvi: 2, cena: 1500 });
  }
  try { KR.kryciZmrazPodminky(z, v, J); } catch (e) { console.error('podm', e.message); }
  let vysledek = null; try { vysledek = ZM.zamekVysledekSpocti(v, J, '24.11.7'); } catch (e) { console.error('vys', e.message); }
  let snimek = null; try { snimek = ZM.zamekSnimekSpocti ? ZM.zamekSnimekSpocti(v) : null; } catch (e) { console.error('sn', e.message); }
  const razitko = SL.slovnikRazitko(PR.PREKLAD, 1);
  ZM.zamkniVariantu(v, { typ: 'nabidka', kdo: 'Test', cislo: z.cislo, otisk: null, vysledek, snimek, slovnik: razitko, kdy: '2026-11-25T10:00:00Z' });
  out[druh] = z;
}
out.razitkoZabudovany = SL.slovnikRazitko(PR.PREKLAD, null);
out.pocetHesel = Object.keys(PR.PREKLAD).length;
process.stdout.write(JSON.stringify(out));
