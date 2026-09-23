#!/usr/bin/env node
/* POROVNÁNÍ MODELU 1 A MODELU 2 NAD VZOROVÝMI ZAKÁZKAMI (#149, 23. 9. 2026)
 *
 * Podklad k rozhodnutí, co z oprav Modelu 2 převzít do Modelu 3. Spočítá
 * tytéž vzorové zakázky oběma modely a vypíše, o kolik se liší jednotlivé
 * složky kalkulace a výsledná cena.
 *
 * CENÍK: bez parametru se počítá se ZKUŠEBNÍM ceníkem ze src/zkusebni_cenik.js
 * (smyšlená čísla — procenta z něj jsou jen řád, ne skutečný dopad). Skutečný
 * dopad se spočítá lokálně se skutečným ceníkem:
 *
 *     node nastroje/porovnani_modelu.js --cenik /cesta/k/ceniku_ock.json
 *
 * Soubor ceníku do repozitáře NEPATŘÍ a nástroj ho nikam nezapisuje. Výstup
 * se skutečným ceníkem obsahuje částky — neposílat ho na GitHub.
 *
 * Volitelně `--md` vypíše tabulky v Markdownu (do podkladu).
 */
const fs = require('fs');
const path = require('path');
const KOREN = path.resolve(__dirname, '..');
const eng = require(path.join(KOREN, 'src/engine.js'));
const ZC = require(path.join(KOREN, 'src/zkusebni_cenik.js'));
const JEKLY = JSON.parse(fs.readFileSync(path.join(KOREN, 'src/jekly.json'), 'utf8'));

const arg = (n) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : null; };
const MD = process.argv.includes('--md');
const cestaCeniku = arg('--cenik');
const cenik = () => cestaCeniku
  ? Object.assign(ZC.zkusebniCenik(), JSON.parse(fs.readFileSync(cestaCeniku, 'utf8')))
  : ZC.zkusebniCenik();

/* Vzorové zakázky. Rozměry jsou výchozí z jádra; mění se jen to, na čem se
 * který rozdíl projeví. */
const zad = (e) => Object.assign(JSON.parse(JSON.stringify(eng.DEFAULT_ZADANI)), e || {});
const VZORY = [
  { id: 'A', popis: 'exteriér, zasklení na terče, bez rezerv', z: zad({ typSachty: 'exteriérová' }) },
  { id: 'B', popis: 'interiér, zasklení na terče, bez rezerv', z: zad({ typSachty: 'interiérová' }) },
  { id: 'C', popis: 'interiér, zasklení mezi příčníky, světlík nad dveřmi', z: zad({ typSachty: 'interiérová', zaskleni: 'mezi příčníky', svetlikNadDvermi: true }) },
  { id: 'D', popis: 'exteriér, ATYP s rezervami 30 % (základ i příplatky)', z: zad({ typSachty: 'exteriérová', atyp: true, rezervaZakladPct: 0.3, rezervaPriplatkyPct: 0.3 }) },
  { id: 'E', popis: 'nízká podlaží (světlá výška pod 2,3 m) se světlíkem', z: zad({ typSachty: 'exteriérová', zdvih: 6, nastupiste: 4, svetlikNadDvermi: true }) },
  { id: 'F', popis: 'starší zakázka: zámečník ATYP v kusech (2 ks)', z: zad({ typSachty: 'exteriérová', zamecnikAtypKs: 2 }) },
];

/* Složky, ve kterých se modely liší — a která čísla rozdílu odpovídají. */
const soucetSekce = (r, k) => (r.sekce[k] || []).reduce((a, x) => a + (x.naklad || 0), 0);
const radek = (r, re) => Object.values(r.sekce).reduce((a, s) => a.concat(s || []), []).find(x => re.test(x.origNazev || x.nazev || ''));
const spoj = (r, k) => (r.plechy.spojeRows || []).find(x => x.key === k) || { ks: 0, m2: 0 };
const SLOZKY = [
  { nazev: 'Spoje „spodní rám roh" (ks)', rozdily: '1', f: r => spoj(r, 'spodniRamRoh').ks, jednotka: 'ks' },
  { nazev: 'Spoje „kotvení" (ks)', rozdily: '1', f: r => spoj(r, 'kotveni').ks, jednotka: 'ks' },
  { nazev: 'Spoje „kotvení" (m² k lakování)', rozdily: '2', f: r => spoj(r, 'kotveni').m2, jednotka: 'm²' },
  { nazev: 'Spojovací materiál (Kč)', rozdily: '1, 2', f: r => r.spojovaci.celkem },
  { nazev: 'Lakování (Kč)', rozdily: '3, 4, 5', f: r => r.lakovani.pouzito },
  { nazev: 'Boční zasklení (m²)', rozdily: '6', f: r => r.zaskleni.bocni.m2, jednotka: 'm²' },
  { nazev: 'Lišty vč. kotvicích (bm)', rozdily: '7', f: r => r.dily.listyBm, jednotka: 'bm' },
  { nazev: 'Světlíky čelní + zadní (m²)', rozdily: '8, 9', f: r => r.zaskleni.svetliky.m2 + r.zaskleni.svetlikyZadni.m2, jednotka: 'm²' },
  { nazev: 'Zámečník ATYP (Kč)', rozdily: '10', f: r => { const x = radek(r, /ZÁMEČNÍKA - OSTATNÍ/); return x ? x.naklad : 0; } },
  { nazev: 'Opláštění — náklad sekce (Kč)', rozdily: '6, 8, 9', f: r => soucetSekce(r, 'oplasteni') },
  { nazev: 'Rezerva základu (Kč, s přirážkou)', rozdily: '11', f: r => r.rezerva.sMarzi },
  { nazev: 'Základní cena (Kč, zaokrouhlená)', rozdily: 'vše', f: r => r.souhrn.zakladCena, hlavni: true },
  { nazev: 'Příplatky celkem (Kč, vč. rezervy)', rozdily: '12', f: r => r.souhrn.priplatkyCena, hlavni: true },
];

const fmt = (x, j) => {
  const v = Math.round((+x || 0) * 100) / 100;
  return v.toLocaleString('cs-CZ', { maximumFractionDigits: j ? 2 : 0 });
};
const vysledek = [];
for (const v of VZORY) {
  const c = cenik();
  const m1 = eng.vypocet(v.z, c, JEKLY, false);
  const m2 = eng.vypocet(v.z, cenik(), JEKLY, true);
  const zaklad = m2.souhrn.zakladCena || 1;
  const radky = SLOZKY.map(s => {
    const a = s.f(m1), b = s.f(m2);
    return { ...s, m1: a, m2: b, rozdil: b - a, pct: s.jednotka ? null : (b - a) / zaklad * 100 };
  });
  vysledek.push({ ...v, radky });
}

if (MD) {
  console.log('Ceník: ' + (cestaCeniku ? 'skutečný (' + path.basename(cestaCeniku) + ')' : 'ZKUŠEBNÍ — procenta jsou jen řád') + '\n');
  for (const v of vysledek) {
    console.log('### Vzor ' + v.id + ' — ' + v.popis + '\n');
    console.log('| Složka | Rozdíly | Model 1 | Model 2 | M2 − M1 | % základní ceny |');
    console.log('|---|---|--:|--:|--:|--:|');
    for (const r of v.radky) {
      const j = !!r.jednotka;
      const t = s => r.hlavni ? '**' + s + '**' : s;
      console.log('| ' + t(r.nazev) + ' | ' + r.rozdily + ' | ' + fmt(r.m1, j) + ' | ' + fmt(r.m2, j) + ' | ' + t(fmt(r.rozdil, j))
        + ' | ' + (r.pct == null ? '—' : (r.pct >= 0 ? '+' : '') + fmt(r.pct, true) + ' %') + ' |');
    }
    console.log('');
  }
} else {
  console.log(JSON.stringify(vysledek.map(v => ({ id: v.id, popis: v.popis,
    radky: v.radky.map(r => ({ nazev: r.nazev, rozdily: r.rozdily, m1: r.m1, m2: r.m2, rozdil: r.rozdil, pct: r.pct })) })), null, 1));
}
