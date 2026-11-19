/* PG #1–#3 (J. V. 19. 11. 2026) — OBRAZOVKY: tlačítka tisku nabídky OCK
 * a vlastní řádky (zdrojový text UI, bez prohlížeče).
 *
 *  1) OCK (`nabidkaDokumentyBlok`): pořadí zleva Kompletní náhled podkladů →
 *     Vytvořit nabídku (Word) → Kompletní náhled a tisk nabídky; modrý
 *     (class="primary") je jen Word; zábrany zab / zabTisk u svých tlačítek;
 *     poznámka pod tlačítky popisuje nové pořadí. PROJ beze změny (tisk modrý
 *     a první, Word druhý bez barvy).
 *  2) Specifikace OCK: u vlastního řádku volba sekce (DALŠÍ UJEDNÁNÍ /
 *     SOUČÁSTÍ DODÁVKY NENÍ), řádky 'neni' na konci sekce NENÍ (editace
 *     i přeložený náhled), výchozí volba klíč `sekce` maže (starší data).
 *  3) Nabídka PROJ: „+ přidat vlastní řádek" se zápisem přes set('PJ.dalsiUjednani').
 * Pojistka: nad origin/claude/integrace-16-10 selže 1) pořadí a třída, 2) a 3) — viz commit.
 * Spuštění: node src/test_pg_tlacitka.js */
'use strict';
const fs = require('fs');
const path = require('path');
const cti = f => fs.readFileSync(path.join(__dirname, f), 'utf8');

let ok = 0, fail = 0;
const test = (n, c, info) => { if (c) { ok++; console.log('OK   ' + n); }
  else { fail++; console.log('FAIL ' + n + '  ' + JSON.stringify(info === undefined ? '' : info).slice(0, 500)); } };

/* tělo funkce podle jména (do další funkce nejvyšší úrovně) */
const funkce = (src, jm) => {
  const i = src.indexOf('function ' + jm + '(');
  if (i < 0) return '';
  const j = src.indexOf('\nfunction ', i + 10), k = src.indexOf('\nasync function ', i + 10);
  const kon = [j, k].filter(x => x > 0);
  return src.slice(i, kon.length ? Math.min(...kon) : src.length);
};
const tlacitka = blok => (blok.match(/<button[^>]*>[^<]*<\/button>/g) || []).map(b => ({
  text: b.replace(/<[^>]+>/g, '').trim(), primary: /class="[^"]*\bprimary\b/.test(b),
  zab: (b.match(/\$\{(zab|zabTisk)\}/) || [])[1] || '', onclick: (b.match(/onclick="([^"(]+)/) || [])[1] || '' }));

/* ---------- 1) OCK ---------- */
{
  const blok = funkce(cti('ui/zakazka_ui.js'), 'nabidkaDokumentyBlok');
  const b = tlacitka(blok).filter(x => /nabidka(Nahled|Word|OckDokument)$/.test(x.onclick));
  test('1 OCK: tři tlačítka v pořadí náhled podkladů → Word → náhled a tisk',
    b.map(x => x.text).join(' | ') === 'Kompletní náhled podkladů | Vytvořit nabídku (Word) | Kompletní náhled a tisk nabídky', b);
  test('1 OCK: modrý (primary) je jen Word', b.length === 3 && !b[0].primary && b[1].primary && !b[2].primary, b);
  test('1 OCK: zábrany u svých tlačítek (Word ${zab}, tisk ${zabTisk}, náhled podkladů bez)',
    b.length === 3 && b[0].zab === '' && b[1].zab === 'zab' && b[2].zab === 'zabTisk', b);
  test('1 OCK: zábrany se počítají jako dřív', /ukazkoveZabranaAttr\('nabidkaTisk'\)/.test(blok) && /ukazkoveZabranaAttr\('nabidka'\)/.test(blok));
  test('1 OCK: poznámka pod tlačítky popisuje nové pořadí a modré Word', /zleva v pořadí práce/.test(blok) && /modré <b>Vytvořit nabídku \(Word\)<\/b>/.test(blok));
}
{
  const karta = funkce(cti('ui/nabidka_proj_ui.js'), 'nabidkaProjKarta');
  const b = tlacitka(karta.replace(/\$\{typeof ukazkoveZabranaAttr[^}]*\}/g, '')).filter(x => /nabidkaProj(Nahled|Word)$/.test(x.onclick));
  test('1 PROJ beze změny: tisk modrý a první, Word druhý bez barvy', b.length === 2 && b[0].onclick === 'nabidkaProjNahled' && b[0].primary
    && b[1].onclick === 'nabidkaProjWord' && !b[1].primary, b);
}
/* ---------- 2) specifikace OCK ---------- */
{
  const ui = cti('ui/techspec_ui.js');
  test('2 TS: volba sekce u vlastního řádku (obě sekce)', /class="mini noprint tsExtraSekce"/.test(ui)
    && /<option value="dalsi"[^>]*>DALŠÍ UJEDNÁNÍ<\/option>/.test(ui) && /<option value="neni"[^>]*>SOUČÁSTÍ DODÁVKY NENÍ<\/option>/.test(ui));
  test('2 TS: řádky NENÍ na konci sekce SOUČÁSTÍ DODÁVKY NENÍ (editace i přeložený náhled)',
    (ui.match(/sekce === 'SOUČÁSTÍ DODÁVKY NENÍ' \? extraNeni : ''/g) || []).length === 2);
  test('2 TS: DALŠÍ UJEDNÁNÍ jen z řádků bez sekce NENÍ', (ui.match(/tsExtraSekce\(false\)/g) || []).length === 2
    && (ui.match(/tsExtraSekce\(true\)/g) || []).length === 2);
  /* tsExtraSet: výchozí volba klíč maže */
  global.TS = { extra: [{ label: 'A', hodnota: '' }] }; global.render = () => {};
  const sandbox = funkce(ui, 'tsExtraSet') + '\n' + funkce(ui, 'tsExtraSekce');
  eval(sandbox.replace(/^function (\w+)/gm, 'global.$1 = function $1'));   // eslint-disable-line no-eval
  global.tsExtraSet(0, 'sekce', 'neni');
  const a = JSON.stringify(TS.extra[0]);
  global.tsExtraSet(0, 'sekce', 'dalsi');
  test('2 TS: sekce neni se uloží, návrat na DALŠÍ UJEDNÁNÍ klíč smaže', a === '{"label":"A","hodnota":"","sekce":"neni"}'
    && JSON.stringify(TS.extra[0]) === '{"label":"A","hodnota":""}', [a, TS.extra[0]]);
  TS.extra.push({ label: 'B', hodnota: '', sekce: 'neni' });
  test('2 TS: tsExtraSekce drží původní indexy', JSON.stringify(global.tsExtraSekce(true).map(x => x.i)) === '[1]'
    && JSON.stringify(global.tsExtraSekce(false).map(x => x.i)) === '[0]');
  test('2 TS: zámek hlídá i tsExtraSet (beze změny jména)', /'tsExtraSet'/.test(cti('ui/zamek_ui.js')));
}
/* ---------- 3) nabídka PROJ ---------- */
{
  const ui = cti('ui/nabidka_proj_ui.js');
  test('3 PROJ: karta nabídky kreslí blok DALŠÍ UJEDNÁNÍ s tlačítkem „+ přidat vlastní řádek"',
    /\$\{nabidkaProjDalsiBlok\(\)\}/.test(funkce(ui, 'nabidkaProjKarta')) && /id="projDalsiPridej" onclick="nabidkaProjDalsiPridej\(\)">\+ přidat vlastní řádek</.test(ui));
  test('3 PROJ: zápis jen přes set(\'PJ.dalsiUjednani\') (hlídá ho zámek)',
    ['nabidkaProjDalsiPridej', 'nabidkaProjDalsiSmaz', 'nabidkaProjDalsiNastav'].every(f => /set\('PJ\.dalsiUjednani'/.test(funkce(ui, f)))
    && !/PJ\.dalsiUjednani\s*=/.test(ui) && !/PJ\.dalsiUjednani\.(push|splice)/.test(ui));
  test('3 PROJ: popisek i text escapované', /value="\$\{esc\(e\.label \|\| ''\)\}"/.test(ui) && /value="\$\{esc\(e\.hodnota \|\| ''\)\}"/.test(ui));
}

console.log(`\n${ok} prošlo, ${fail} selhalo`);
process.exit(fail ? 1 : 0);
