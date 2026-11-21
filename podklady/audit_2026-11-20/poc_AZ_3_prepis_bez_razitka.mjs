/* AZ-3 — razítko verze (B10) je dobrovolné: tělo BEZ pole `ocekavaneRazitko` (nebo s `prepsat:true`)
 * přepíše cizí rozpracovanou zakázku bez kolize 409 — včetně smazání nezamčených variant (interní poznámky hlídá zvláštní pojistka IK — útočník je jen opíše z GET).
 * Výjimka „starší klient bez pole" je v kódu od 22. 8. 2026 (zakazky.mjs:134-140).
 * Lokálně, bez sítě:  node podklady/audit_2026-11-20/poc_AZ_3_prepis_bez_razitka.mjs */
import { nova, uloz, nacti, cO, cO2, kopie, verdikt } from './poc_AZ_zaklad.mjs';
const z = nova('AZ-3 práce obch1'); const k = kopie(z.varianty[0]); k.id = 'vdruha1'; k.ridici = false; k.pripona = 1; k.nazev = 'Varianta 2'; z.varianty.push(k);
const r = await uloz(z, cO); const g = await nacti(r.soubor, cO);
console.log('obch1 uložil zakázku:', r.status, '| varianty:', g.varianty.length, '| autor:', g.autor);
const utok = nova('AZ-3 podvrh'); utok.cislo = z.cislo; utok.objednatel = 'TEST – jiný odběratel';
const r1 = await uloz(utok, cO2, '');            // poctivý klient: prázdné razítko = „tuhle zakázku jsem nenačetl"
console.log('obch2 s ocekavaneRazitko:"" →', r1.status, r1.kolize ? 'KOLIZE (správně)' : '');
const r2 = await uloz(utok, cO2, undefined);     // tělo bez pole
console.log('obch2 BEZ pole ocekavaneRazitko →', r2.status, r2.ok ? 'PŘEPSÁNO' : r2.chyba);
const g2 = await nacti(r.soubor, cO);
console.log('po útoku: varianty', g2.varianty.length, '| objednatel změněn:', g2.objednatel !== g.objednatel, '| autor:', g2.autor, '| upravil:', g2.upravil);
const r3 = await uloz(utok, cO2, 'cokoli', { prepsat: true });
console.log('obch2 s prepsat:true →', r3.status);
verdikt(r2.ok && g2.varianty.length === 1, 'AZ-3: cizí obchodník přepsal rozpracovanou zakázku bez razítka verze (kolize 409 platí jen pro klienta, který pole pošle).');
