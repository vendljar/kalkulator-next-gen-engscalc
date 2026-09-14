/* ===== ZÁMEK „JEN KE ČTENÍ" A PŘEPÍNÁNÍ ZAKÁZEK =====
 * (nález V35 / úkol O6, 3. kolo testů, 14. 9. 2026)
 *
 * CO SE STALO
 * Po „Odemknout k úpravám" u jedné zakázky se při otevření další zakázky
 * předchozí bez dotazu uložila na server — změnilo se jí razítko i ceníková
 * verze, aniž by do ní kdokoli sáhl.
 *
 * DVĚ PŘÍČINY
 *  1. NAPLÁNOVANÝ AUTOSAVE PŘEŽIL PŘEPNUTÍ. Časovač automatického ukládání
 *     se při otevření jiné zakázky nerušil, takže doběhl až nad novým oknem.
 *  2. PŘEPOČET NA DNEŠNÍ CENÍK SE TVÁŘIL JAKO NEULOŽENÁ ZMĚNA. Otisk pro
 *     autosave se bral PŘED přepočtem, takže se otevřená zakázka hned lišila
 *     od „naposledy uloženého" a první klik kamkoli spustil zápis.
 *
 * A třetí věc, která chyběla: při přepnutí s neuloženými změnami se dalo jen
 * zahodit nebo zůstat. Kdo chtěl změny uložit, musel dialog zrušit a udělat
 * to ručně — nebo o práci přišel.
 *
 * Obsluha sedí v ui/online_ui.js a ui/dialog.js, které v Node nejde načíst
 * (jsou to části jednosouborové aplikace). Hlídají se proto pravidla na
 * zdroji — stejně jako v test_proj_vzhled.js.
 */
const fs = require('fs');

let ok = 0, fail = 0;
const test = (n, cond, info) => {
  if (cond) { ok++; console.log('OK  ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info)); }
};

const online = fs.readFileSync(__dirname + '/ui/online_ui.js', 'utf8');
const dialog = fs.readFileSync(__dirname + '/ui/dialog.js', 'utf8');
const otevri = (online.match(/async function onlineOtevri\(soubor\)[\s\S]*?\n\}/) || [''])[0];
test('funkce onlineOtevri se našla', otevri.length > 200, otevri.length);

/* ---------- 1) zámek je vlastnost konkrétní otevřené zakázky ---------- */

test('každá otevřená zakázka se zamkne jen ke čtení', /zamekCteniZapni\(\)/.test(otevri));
test('zámek se zapíná PŘED přepočtem i renderem',
  otevri.indexOf('zamekCteniZapni()') < otevri.indexOf('uloSrovnejSPlatnymCenikem'),
  [otevri.indexOf('zamekCteniZapni()'), otevri.indexOf('uloSrovnejSPlatnymCenikem')]);
test('odemčení nikde v onlineOtevri není — odemyká jen člověk tlačítkem',
  !/zamekCteniVypni/.test(otevri));

const common = fs.readFileSync(__dirname + '/ui/common.js', 'utf8');
test('stav zámku žije jen v paměti, po obnovení stránky se nepřenáší',
  /const ZAMEK_CTENI = \{ zamceno: false \};/.test(common)
  && !/localStorage[^\n]*ZAMEK_CTENI/.test(common));
test('v zamčené zakázce autosave nezapisuje', /zamekCteniJe\(\)\) return;/.test(online));

/* Návrat na poslední zakázku po obnovení stránky jde touž cestou, takže se
 * zamkne taky — kdyby si otevíral zakázku po svém, zámek by obešel. */
const obnov = (online.match(/function onlineObnovPosledni\(\)[\s\S]*?\n\}/) || [''])[0];
test('návrat po obnovení stránky otevírá přes onlineOtevri', /onlineOtevri\(soubor\)/.test(obnov));

/* ---------- 2) přepnutí s neuloženými změnami nabídne tři cesty ---------- */

test('dialog umí typ „volba" s víc než dvěma tlačítky', /typ === 'volba'/.test(dialog));
test('volba() je vystavená ven', /function volba\(text, moznosti, opts\)/.test(dialog)
  && /module\.exports = \{ potvrd, hlaska, dotaz, volba \}/.test(dialog));
test('Escape ve volbě vrací null, tedy „nic nedělej"', /zrusit\(\)/.test(dialog));

test('přepnutí nabízí uložit', /kod: 'ulozit'/.test(otevri));
test('přepnutí nabízí zahodit', /kod: 'zahodit'/.test(otevri));
test('přepnutí nabízí zůstat', /kod: 'zustat'/.test(otevri));
test('uložení je předvolená volba', /kod: 'ulozit', popis: '[^']*', primary: true/.test(otevri));
test('cokoli jiného než uložit/zahodit znamená zůstat',
  /if \(co !== 'ulozit' && co !== 'zahodit'\) return false;/.test(otevri));
test('nepodaří-li se uložit, nikam se nepřepíná',
  /if \(!uspech\)[\s\S]{0,200}?return false;/.test(otevri));
test('a řekne se to nahlas', /nepodařilo uložit, zakázka zůstává otevřená/.test(otevri));

/* ---------- 3) předchozí zakázka se sama neuloží ---------- */

test('naplánovaný autosave se při přepnutí ruší',
  /if \(ONLINE_STAV\.timer\) \{ clearTimeout\(ONLINE_STAV\.timer\); ONLINE_STAV\.timer = null; \}/.test(otevri));
test('a ruší se PŘED načtením nové zakázky',
  otevri.indexOf('clearTimeout(ONLINE_STAV.timer)') < otevri.indexOf('importZakazka'),
  [otevri.indexOf('clearTimeout(ONLINE_STAV.timer)'), otevri.indexOf('importZakazka')]);
test('značka „uživatel něco udělal" se při přepnutí shodí',
  (otevri.match(/ONLINE_STAV\.zmenaUzivatele = false/g) || []).length >= 2);

/* JÁDRO NÁLEZU: otisk pro autosave se bere AŽ po přepočtu na dnešní ceník,
 * jinak je otevřená zakázka od první chvíle „změněná". */
{
  const iPrepocet = otevri.indexOf('uloSrovnejSPlatnymCenikem');
  const iOtisk = otevri.lastIndexOf('ONLINE_STAV.posledni = JSON.stringify(ZAK)');
  test('otisk pro autosave se bere až po přepočtu na dnešní ceník',
    iPrepocet >= 0 && iOtisk > iPrepocet, [iPrepocet, iOtisk]);
  const iUklid = otevri.indexOf('standardAtypUklid()');
  test('i po úklidu ATYPu — ani ten sám o sobě nesmí spustit zápis',
    iUklid >= 0 && iOtisk > iUklid, [iUklid, iOtisk]);
}

/* Pojistka: kdyby někdo otisk vrátil před přepočet, kontrola výš to musí
 * poznat. Sonda na sobě samé. */
{
  const vzor = 'a uloSrovnejSPlatnymCenikem b ONLINE_STAV.posledni = JSON.stringify(ZAK) c';
  const spatne = 'a ONLINE_STAV.posledni = JSON.stringify(ZAK) b uloSrovnejSPlatnymCenikem c';
  const poradi = (s) => s.lastIndexOf('ONLINE_STAV.posledni = JSON.stringify(ZAK)') > s.indexOf('uloSrovnejSPlatnymCenikem');
  test('hlídač pořadí opravdu rozliší správné od špatného', poradi(vzor) && !poradi(spatne));
}

/* ---------- 4) kolize verzí při ukládání (V27 / úkol O2) ----------
 *
 * Oprava z prompty O2 (7. 9. 2026) v buildu JE — ověřeno 14. 9. 2026 čtením
 * zdroje. Tenhle oddíl ji jen zajišťuje proti návratu, protože se o ni opírá
 * i oprava V35 výš: „Uložit změny" při přepnutí se spoléhá na to, že se
 * neúspěšný zápis pozná. */
const uloz = (online.match(/function onlineUloz\(opts\)[\s\S]*?\n\}/) || [''])[0];
test('funkce onlineUloz se našla', uloz.length > 200, uloz.length);

test('razítko ze serveru se po každém zápisu přebírá',
  /ONLINE_STAV\.razitko = o\.razitko \|\| ''/.test(uloz));
test('a jde i do zakázky samé, ať kopie v okně odpovídá serveru',
  /ZAK\.uloRazitko = o\.razitko/.test(uloz));
test('zápis vychází z očekávaného razítka (optimistický zámek)',
  /ocekavaneRazitko: ONLINE_STAV\.razitko/.test(uloz));
test('kolize se zapamatuje místo modálu, který nikdo neviděl',
  /e\.data && e\.data\.kolize/.test(uloz) && /ONLINE_STAV\.kolize = \{/.test(uloz));
test('hláška nabízí obě cesty — načíst znovu i přepsat',
  /Načíst znovu ze serveru/.test(online) && /Přepsat serverovou verzi/.test(online));
test('po kolizi se autosave zastaví, aby nesypal 409 dál',
  /ONLINE_STAV\.kolize[\s\S]{0,200}?clearTimeout\(ONLINE_STAV\.timer\)/.test(uloz));
test('a dokud kolize trvá, další zápis se vůbec nepokusí',
  /if \(ONLINE_STAV\.kolize\) return;/.test(online));
test('tlačítko se po chybě vrátí do klidu (pracuje = false v obou větvích)',
  (uloz.match(/ONLINE_STAV\.pracuje = false/g) || []).length >= 2);
test('jeden zápis najednou — druhý počká, než první doběhne',
  /if \(ONLINE_STAV\.ukladaBeh\)/.test(uloz));
test('neúspěch se vrací jako false, aby se dal poznat', /return false;/.test(uloz));

console.log(`\n${ok} OK, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
