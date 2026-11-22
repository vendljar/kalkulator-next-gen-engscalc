/* AZ-4 — snímek lhůt PROJ (D8 #677) `data.kryciProj.lhutyProj` server nekontroluje a u odeslané
 * NEPRODANÉ varianty ho z porovnání zámku vyjímá (zamek.js:675-676). Kterýkoli přihlášený (i cizí
 * obchodník) tak do odeslané nabídky zapíše libovolný obsah; Prodáno ho pak zmrazí. Tabulku lhůt
 * přitom smí měnit jen administrátor (Nastavení → Firma).
 * Lokálně, bez sítě:  node podklady/audit_2026-11-20/poc_AZ_4_lhuty_snimek.mjs */
import { nova, uloz, nacti, cO, cO2, zamkni, kopie, G, verdikt } from './poc_AZ_zaklad.mjs';
const dnes = new Date().toISOString().slice(0, 10);
const z = nova('AZ-4'); zamkni(z, z.varianty[0], 'nabidka'); const r = await uloz(z, cO); if (!r.ok) throw new Error(r.chyba); let g = await nacti(r.soubor, cO);
console.log('obch1: odeslaná nabídka uložena', r.status);
const vych = G.lhutyProjVychozi(); const podvrh = kopie(vych); Object.keys(podvrh.radky).forEach(id => { podvrh.radky[id] = { do: 0.01 }; });
let a = kopie(g); a.varianty[0].data.kryciProj.lhutyProj = podvrh;
const r1 = await uloz(a, cO2, g.uloRazitko);
console.log('cizí obchodník zapíše vlastní „tabulku lhůt" (vše 0,01) do odeslané nabídky →', r1.status, r1.ok ? 'ULOŽENO' : r1.chyba);
g = await nacti(r.soubor, cO);
a = kopie(g); a.varianty[0].data.kryciProj.lhutyProj = { radky: 'x'.repeat(200000), cokoli: [[[1]]] };
const r2 = await uloz(a, cO2, g.uloRazitko);
console.log('libovolný tvar (200 kB textu, neznámé klíče) →', r2.status, r2.ok ? 'ULOŽENO' : r2.chyba, '| vady podle lhutyProjVady:', G.lhutyProjVady(a.varianty[0].data.kryciProj.lhutyProj).length);
g = await nacti(r.soubor, cO);
a = kopie(g); a.varianty[0].data.kryciProj.lhutyProj = podvrh; a.varianty[0].prodano = { datum: dnes };
const r3 = await uloz(a, cO, g.uloRazitko);
g = await nacti(r.soubor, cO);
const ulozeno = g.varianty[0].data.kryciProj.lhutyProj;
console.log('obch1 prodá s podvrženým snímkem →', r3.status, '| zmrazený snímek = podvrh:', JSON.stringify(ulozeno) === JSON.stringify(podvrh), '| = tabulka firmy (výchozí):', JSON.stringify(ulozeno) === JSON.stringify(G.lhutyProjEf(null)));
a = kopie(g); a.varianty[0].data.kryciProj.lhutyProj = G.lhutyProjEf(null);
const r4 = await uloz(a, cO, g.uloRazitko);
console.log('oprava snímku po prodeji →', r4.status, '(zmrazeno)');
verdikt(r1.ok && r2.ok && r3.ok && JSON.stringify(ulozeno) === JSON.stringify(podvrh), 'AZ-4: snímek lhůt PROJ v odeslané nabídce píše klient bez kontroly tvaru i původu; po Prodáno je zmrazený.');
