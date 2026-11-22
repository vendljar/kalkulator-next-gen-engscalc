/* JT (J. V. 22. 11. 2026) — jazyk hlavičky specifikace OCK = Jazyk tisku nabídky
 * (zdrojový text UI + funkce spuštěné v pískovišti, bez prohlížeče).
 *
 *  1) Přepnutí jazyka v hlavičce specifikace (tsJazykPrepni) nastaví jazyk
 *     dokumentu i Jazyk tisku na stejnou hodnotu; zpět CZ tiskne česky.
 *  2) Opačný směr jen u nabídky OCK: volba Jazyka tisku (tiskJazykNastavOck)
 *     přepne i náhled specifikace; „dle Nastavení" nic nepřepíná.
 *     PROJ a SoD volají tiskJazykVyber() bez parametru = dosavadní
 *     tiskJazykNastav, který jazyk dokumentu nemění.
 *  3) Cizojazyčný náhled specifikace kreslí TUTÉŽ kartu „Cenová nabídka (OCK)"
 *     (nabidkaDokumentyBlok: kontroly, zábrany, tři tlačítka ve stejném pořadí
 *     a barvách) jako česká verze — žádná kopie tlačítek v techspec_ui.js.
 * Pojistka: nad origin/claude/integrace-16-10 (05a496d) selžou všechny bloky
 * kromě „PROJ/SoD beze změny" — viz commit.
 * Spuštění: node src/test_jt_jazyk_tisku.js */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const cti = f => fs.readFileSync(path.join(__dirname, f), 'utf8');

let ok = 0, fail = 0;
const test = (n, c, info) => { if (c) { ok++; console.log('OK   ' + n); }
  else { fail++; console.log('FAIL ' + n + '  ' + JSON.stringify(info === undefined ? '' : info).slice(0, 500)); } };

/* tělo funkce podle jména (do další funkce nejvyšší úrovně) */
const funkce = (src, jm) => {
  const i = src.indexOf('function ' + jm + '(');
  if (i < 0) return '';
  const kon = ['\nfunction ', '\nasync function ', '\nlet ', '\nconst ', '\n/*']
    .map(z => src.indexOf(z, i + 10)).filter(x => x > 0);
  return src.slice(i, kon.length ? Math.min(...kon) : src.length);
};

const common = cti('ui/common.js');
const ts = cti('ui/techspec_ui.js');
const zak = cti('ui/zakazka_ui.js');

/* pískoviště: jazyk/jazykSet/T. tisku z common.js + tsJazykPrepni z techspec_ui.js */
const kod = ['jazyk', 'jazykSet', 'tiskJazyk', 'tiskJazykNastav', 'tiskJazykNastavOck', 'tiskJazykVyber']
  .map(f => funkce(common, f)).join('\n') + '\n' + funkce(ts, 'tsJazykPrepni')
  + '\nlet TISK_JAZYK = "";\nfunction _tj() { return TISK_JAZYK; }';
const ctx = { NAST: { jazyk: 'cz' }, JAZYK_IDX: { en: 0, de: 1, fr: 2 }, renderu: 0, ulozeno: 0 };
ctx.render = () => { ctx.renderu++; };
ctx.nastdbZmeneno = () => { ctx.ulozeno++; };
let chybaKodu = '';
try { vm.runInNewContext(kod, ctx); } catch (e) { chybaKodu = e.message; }
const ma = f => typeof ctx[f] === 'function';

/* ---------- 1) hlavička specifikace → Jazyk tisku ---------- */
{
  test('1 funkce tsJazykPrepni existuje', ma('tsJazykPrepni'), chybaKodu);
  if (ma('tsJazykPrepni')) {
    ctx.tsJazykPrepni('en');
    test('1 EN v hlavičce: jazyk dokumentu = en, Jazyk tisku = en, tisk = en',
      ctx.NAST.jazyk === 'en' && ctx._tj() === 'en' && ctx.tiskJazyk() === 'en', [ctx.NAST.jazyk, ctx._tj()]);
    test('1 EN v hlavičce: volba v selectu Jazyk tisku = anglicky',
      /<option value="en" selected>anglicky/.test(ctx.tiskJazykVyber('ock')));
    ctx.tiskJazykNastav('de');               // obchodník dřív zvolil jiný jazyk tisku…
    ctx.tsJazykPrepni('fr');                 // …hlavička ho přepíše, ať se nerozcházejí
    test('1 FR v hlavičce přepíše dřívější Jazyk tisku DE', ctx.tiskJazyk() === 'fr' && ctx.NAST.jazyk === 'fr');
    ctx.tsJazykPrepni('cz');
    test('1 zpět CZ: tisk česky', ctx.NAST.jazyk === 'cz' && ctx.tiskJazyk() === 'cz');
  }
  test('1 tlačítka vlajek v hlavičce volají tsJazykPrepni (ne holé jazykSet)',
    /onclick="tsJazykPrepni\('\$\{escJs\(j\.kod\)\}'\)"/.test(funkce(ts, 'tsJazykBar'))
    && !/jazykSet\(/.test(funkce(ts, 'tsJazykBar')));
  test('1 tsJazykPrepni nastaví Jazyk tisku i jazyk dokumentu',
    /tiskJazykNastav\(k\)/.test(funkce(ts, 'tsJazykPrepni')) && /jazykSet\(k\)/.test(funkce(ts, 'tsJazykPrepni')));
}

/* ---------- 2) Jazyk tisku OCK → náhled specifikace ---------- */
{
  test('2 funkce tiskJazykNastavOck existuje', ma('tiskJazykNastavOck'), chybaKodu);
  if (ma('tiskJazykNastavOck')) {
    ctx.NAST.jazyk = 'cz'; ctx.tiskJazykNastav('');
    const r0 = ctx.renderu;
    ctx.tiskJazykNastavOck('de');
    test('2 Jazyk tisku DE u nabídky OCK přepne náhled specifikace na DE (a překreslí)',
      ctx.NAST.jazyk === 'de' && ctx.tiskJazyk() === 'de' && ctx.renderu > r0, [ctx.NAST.jazyk, ctx.renderu, r0]);
    const r1 = ctx.renderu;
    ctx.tiskJazykNastavOck('');
    test('2 „dle Nastavení" nic nepřepíná (tisk = jazyk dokumentu, bez překreslení)',
      ctx.NAST.jazyk === 'de' && ctx.tiskJazyk() === 'de' && ctx.renderu === r1);
    ctx.tiskJazykNastavOck('cz');
    test('2 Jazyk tisku česky přepne náhled zpět na CZ', ctx.NAST.jazyk === 'cz' && ctx.tiskJazyk() === 'cz');
    ctx.tiskJazykNastavOck('xx');
    test('2 neznámý jazyk nic nepřepne', ctx.NAST.jazyk === 'cz' && ctx.tiskJazyk() === 'cz');
  }
  if (ma('tiskJazykVyber')) {
    test('2 select OCK volá tiskJazykNastavOck', /onchange="tiskJazykNastavOck\(this\.value\)"/.test(ctx.tiskJazykVyber('ock')));
    test('2 PROJ/SoD beze změny: select bez parametru volá tiskJazykNastav',
      /onchange="tiskJazykNastav\(this\.value\)"/.test(ctx.tiskJazykVyber()));
  }
  ctx.NAST.jazyk = 'en'; ctx.tiskJazykNastav('');
  ctx.tiskJazykNastav('de');
  test('2 PROJ/SoD beze změny: tiskJazykNastav jazyk dokumentu nemění', ctx.NAST.jazyk === 'en' && ctx.tiskJazyk() === 'de');
  ctx.tiskJazykNastav('');
  test('2 nabídka OCK kreslí select s parametrem ock',
    /tiskJazykVyber\('ock'\)/.test(funkce(zak, 'nabidkaDokumentyBlok')));
  test('2 PROJ a SoD kreslí select bez parametru',
    /tiskJazykVyber\(\)/.test(cti('ui/nabidka_proj_ui.js')) && !/tiskJazykVyber\('ock'\)/.test(cti('ui/nabidka_proj_ui.js'))
    && !/tiskJazykVyber\('ock'\)/.test(cti('ui/sod_ui.js')));
}

/* ---------- 3) karta nabídky i v cizojazyčném náhledu ---------- */
{
  const preklad = funkce(ts, 'renderTechspecPreklad');
  const cesky = funkce(ts, 'renderTechspec');
  const karta = funkce(ts, 'tsNabidkaKarta');
  test('3 náhled EN/DE/FR kreslí kartu Cenová nabídka (OCK)', /\$\{tsNabidkaKarta\(\)\}/.test(preklad));
  test('3 karta je pod tlačítkem „Tisk specifikace / PDF"',
    preklad.indexOf("T('Tisk specifikace / PDF')") > 0 && preklad.indexOf('tsNabidkaKarta()') > preklad.indexOf("T('Tisk specifikace / PDF')"));
  test('3 česká verze kreslí tutéž kartu', /\$\{tsNabidkaKarta\(\)\}/.test(cesky));
  test('3 karta = nabidkaDokumentyBlok (stejná tlačítka, kontroly a zábrany)',
    /card\('Cenová nabídka \(OCK\)', nabidkaDokumentyBlok\(\)\)/.test(karta));
  test('3 v techspec_ui.js žádná kopie tlačítek tisku nabídky',
    !/onclick="nabidka(Nahled|Word|OckDokument)\(\)"/.test(ts));
  const blok = funkce(zak, 'nabidkaDokumentyBlok');
  test('3 blok nese kontroly (žlutý blok) a zábrany', /kontrolyPanel\(\)/.test(blok) && /ukazkoveZabranaPanel\(\)/.test(blok)
    && /ukazkoveZabranaAttr\('nabidkaTisk'\)/.test(blok) && /ukazkoveZabranaAttr\('nabidka'\)/.test(blok));
}

console.log('\n' + ok + ' OK, ' + fail + ' FAIL');
process.exit(fail ? 1 : 0);
