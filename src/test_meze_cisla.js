/* ===== K40-P1: ČÍSLA MEZÍ V BEZPECNOST_MEZE.md SE NEOPAKUJÍ =====
 * (dávka K40a, roadmapa #579, 11. 11. 2026)
 *
 * Meze webhooku #553 dostaly čísla B176–B179, která už nesly starší meze
 * (B176 neznámé právo, B177 podobné znaky, B178 pásy stěny, B179 příznak
 * „cena dle nabídky"). Odkaz „B178" pak ukazoval na dvě různé věci. K40a je
 * přečíslovala na B199–B202 a tahle sada hlídá, aby se to nevrátilo.
 *
 * Hlídá se jen DEFINIČNÍ výskyt (posudek K40, oddíl 3.7): nadpis `### B<n> — `,
 * odrážka `- **B<n> — ` a odrážka `- **B<n>:**`. Rozsahy („B191–B193"),
 * nadpisy typu „Kolize čísla B178" a odkazy v textu definice nejsou.
 *
 * POJISTKA: nad c664c9e selže (4 FAIL — B176–B179 dvakrát; ověřeno
 * `KNG_MEZE_SOUBOR=<(git show c664c9e:BEZPECNOST_MEZE.md)`). Mutace nemá —
 * hlídá dokument, ne kód; sada běží v každém kole (spust_testy.sh).
 */
const fs = require('fs');
const path = require('path');

let ok = 0, fail = 0;
const test = (n, cond, info) => {
  if (cond) { ok++; console.log('OK  ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info).slice(0, 400)); }
};

const soubor = process.env.KNG_MEZE_SOUBOR || path.join(__dirname, '..', 'BEZPECNOST_MEZE.md');
const text = fs.readFileSync(soubor, 'utf8');

/* Definice mezí: { cislo, radek }. Exportováno kvůli testu samotného hledání. */
function mezeDefinice(t) {
  const out = [];
  String(t).split('\n').forEach((l, i) => {
    const m = /^(?:### |- \*\*)(B\d+[a-z]?)(?: — |:\*\*)/.exec(l);
    if (m) out.push({ cislo: m[1], radek: i + 1 });
  });
  return out;
}

/* Samotné hledání: oba tvary ano, rozsahy a „Kolize čísla" ne. */
const vzorek = ['### B1 — první', '- **B2 — druhá.** text', '- **B3:** třetí',
  '### B4–B6 — rozsah', '### Kolize čísla B7 — nadpis', 'text s odkazem B8 — v řádku',
  '- **B9 porovnává** (popis bez pomlčky)', '### B162a — doplnění'].join('\n');
test('hledání: definice ve tvarech ###, - ** — a - **:**', JSON.stringify(mezeDefinice(vzorek).map(x => x.cislo))
  === JSON.stringify(['B1', 'B2', 'B3', 'B162a']), mezeDefinice(vzorek));

const def = mezeDefinice(text);
test('BEZPECNOST_MEZE.md: aspoň 50 definic (hledání něco našlo)', def.length >= 50, def.length);
const podle = {};
def.forEach(d => { (podle[d.cislo] = podle[d.cislo] || []).push(d.radek); });
const dvakrat = Object.keys(podle).filter(k => podle[k].length > 1).map(k => k + ' (ř. ' + podle[k].join(', ') + ')');
test('žádné číslo meze není definované dvakrát', dvakrat.length === 0, dvakrat);

/* Meze #553 po přečíslování (K40a) a věta v oddílu AS #577. */
const sekce = (od, po) => { const i = text.indexOf(od); const j = text.indexOf(po, i + 1); return i < 0 ? '' : text.slice(i, j < 0 ? undefined : j); };
const pw = sekce('## PW #553', '\n## ');
test('meze #553 nesou B199–B202', ['B199', 'B200', 'B201', 'B202'].every(b => pw.includes('- **' + b + ' — ')), pw.slice(0, 200));
test('meze #553 už nenesou B176–B179 jako definici', !/^- \*\*B17[6-9] — /m.test(pw));
test('oddíl AS #577 drží pro K40 čísla B199–B209', /Čísla B199–B209 drží K40/.test(text));

console.log('\n' + ok + ' OK, ' + fail + ' FAIL');
process.exit(fail ? 1 : 0);
