/* AZ-6 — schválení slevy se váže na id varianty a procento, ne na obsah (cenu) varianty.
 * Vedoucí schválí 10 % na malé šachtě; obchodník pak pod týmž id uloží jinou (dražší) šachtu
 * a schválení drží — sleva v Kč vzroste bez nového rozhodnutí.
 * Lokálně, bez sítě:  node podklady/audit_2026-11-20/poc_AZ_6_schvaleni_obsah.mjs */
import { nova, uloz, nacti, cO, cV, kopie, G, SCHV, cenaOck, verdikt } from './poc_AZ_zaklad.mjs';
const z = nova('AZ-6'); Object.assign(z.varianty[0].data.ock.zadani, { zdvih: 3, nastupiste: 2 }); Object.assign(z.varianty[0].data.sleva, { procenta: 10, stav: 'čeká na schválení' });
const r = await uloz(z, cO); let g = await nacti(r.soubor, cV);
let a = G.importZakazka(kopie(g)); SCHV.schvalovaniSchval(a.varianty[0].data.sleva, 'Ved Test'); const rs = await uloz(a, cV, g.uloRazitko);
g = await nacti(r.soubor, cO); const c1 = cenaOck(g.varianty[0]);
console.log('vedoucí schválil 10 % na malé šachtě:', rs.status, g.varianty[0].data.sleva.stav);
a = kopie(g); Object.assign(a.varianty[0].data.ock.zadani, { zdvih: 30, nastupiste: 10 });
const r2 = await uloz(a, cO, g.uloRazitko); const g2 = await nacti(r.soubor, cO); const c2 = cenaOck(g2.varianty[0]); const sl = g2.varianty[0].data.sleva;
console.log('obchodník změní šachtu (zdvih 3 → 30 m) →', r2.status, '| sleva dál:', sl.stav, sl.procenta + ' %, schválil:', sl.schvalil, '| platí:', G.slevaPlati(sl), '| základ vzrostl ×' + (c2 / c1).toFixed(1));
verdikt(r2.ok && G.slevaPlati(sl) && c2 > c1 * 1.5, 'AZ-6: schválení 10 % platí dál i pro několikanásobně dražší obsah téže varianty (návrh, vlastnost schvalování — informativní).');
