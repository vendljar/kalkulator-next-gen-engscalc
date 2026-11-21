/* AZ-2 — přísné ověření zmrazeného výsledku NOVÉHO zámku (B59/B119/B146) dá razítko „shoda"
 * i výsledku, ze kterého klient ČÍSLA VYPUSTIL nebo do něj číslo PŘIDAL (klíč jen na jedné straně
 * se přeskočí, pokud to není pole nebo 6+2 částek jádra). Zmrazený výsledek je přitom jediný zdroj
 * čísel odeslané nabídky (vypocetZ) — pro dotisk, krycí list, Prodáno i export controllingu.
 * Lokálně, bez sítě:  node podklady/audit_2026-11-20/poc_AZ_2_vysledek_neuplny.mjs */
import { nova, uloz, nacti, cO, zamkni, kopie, G, JEKLY, verdikt } from './poc_AZ_zaklad.mjs';
const imp = z => G.importZakazka(kopie(z));
const ctrl = g => { const z = imp(g); const ce = G.ctrlExportVarianty(z, z.varianty[0], { jekly: JEKLY }); return ce.ok ? ce.strany.map(s => ({ oblast: s.oblast, nakladJeNula: s.naklad === 0, zaokrZakladu: s.zaokrZakladu })) : ce.chyba; };

// poctivý zámek pro srovnání
const z0 = nova('AZ-2 poctivý'); zamkni(z0, z0.varianty[0]); const r0 = await uloz(z0, cO); const g0 = await nacti(r0.soubor, cO);
console.log('poctivý zámek: HTTP', r0.status, '| ověření:', g0.varianty[0].zamek.overeni.stav, '| controlling:', JSON.stringify(ctrl(g0)));

// podvržený: vypuštěná čísla (náklad a marže základu, DPH příplatků, doprava PROJ), řádek příplatku → null, číslo navíc
const z = nova('AZ-2 podvrh'); const v = z.varianty[0]; zamkni(z, v);
const vy = v.zamek.vysledek; let vypusteno = 0;
for (const k of ['zakladNaklad', 'zakladMarze', 'priplatkyDph', 'priplatkySDph']) { if (k in vy.ock.souhrn) { delete vy.ock.souhrn[k]; vypusteno++; } }
for (const k of ['naklad', 'marze', 'doprava', 'vyjezd']) { if (k in vy.proj.souhrn) { delete vy.proj.souhrn[k]; vypusteno++; } }
/* všechna čísla mimo jádro v objektech (ne v polích) — rezerva, součty sekcí kromě hlídaného */
const jadro = new Set(['ock.souhrn.zakladCena', 'ock.souhrn.zakladDph', 'ock.souhrn.zakladSDph', 'ock.souhrn.priplatkyCena', 'ock.souctySekci.volitelne.sMarzi', 'proj.souhrn.cena', 'proj.souhrn.celkem']);
const projdi = (o, c) => { if (!o || typeof o !== 'object') return; for (const k of Object.keys(o)) { const cc = c + '.' + k;
  if (typeof o[k] === 'number' && !jadro.has(cc)) { delete o[k]; vypusteno++; } else projdi(o[k], cc); } };
projdi(vy.ock, 'ock'); projdi(vy.proj, 'proj');
vy.ock.souhrn.mustkyCena = 1;   // číslo NAVÍC (server ho v tomhle výsledku nemá) — čte ho cenaNabidkyOck pro řádek můstků
const zbylo = (JSON.stringify(vy).match(/:-?\d/g) || []).length;
const r = await uloz(z, cO);
const g = r.ok ? await nacti(r.soubor, cO) : null;
const ov = g && g.varianty[0].zamek.overeni;
console.log('podvržený zámek: vypuštěno čísel', vypusteno, '(zbylo ~' + zbylo + ') + 1 přidané → HTTP', r.status, r.varovani ? 'VAROVÁNÍ: ' + r.varovani.slice(0, 80) : 'bez varování');
console.log('razítko ověření serveru:', JSON.stringify(ov && { stav: ov.stav, rozdilu: ov.rozdilu }));
if (g) {
  console.log('controlling z podvrženého zámku:', JSON.stringify(ctrl(g)));
  const zi = imp(g); const vz = G.vypocetZ(zi.varianty[0], JEKLY);
  console.log('vypocetZ (z čeho tisknou dokumenty) — klíče souhrnu, které zbyly:', Object.keys(vz.souhrn).join(', '));
  const cn = G.cenaNabidkyOck(vz, zi.varianty[0].data.sleva, zi.varianty[0].data.zaokr);
  console.log('cenaNabidkyOck nese řádek můstků z přidaného čísla:', !!(cn && cn.mustky));
}
verdikt(!!(ov && ov.stav === 'shoda' && vypusteno > 0), 'AZ-2: zmrazený výsledek s ' + vypusteno + ' vypuštěnými čísly a jedním přidaným dostal razítko „' + (ov && ov.stav) + '".');
