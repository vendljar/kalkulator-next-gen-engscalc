/* PRAVIDLA POŘADNÍKU (roadmapa/roadmap.json) — kontrola bez Pythonu.
 *
 * PROČ TAHLE SADA VZNIKLA (N18, 22. 9. 2026)
 *
 * `roadmap.json` je jediný zdroj pravdy o tom, co je hotové a co se čeká.
 * Jeho pravidla dosud hlídal jedině generátor `roadmapa.py`, a ten v tomhle
 * repozitáři NENÍ — leží v pracovní kopii mimo GitHub. V CI tedy soubor
 * nekontroloval nikdo: rozbitý JSON, dvakrát použité číslo nebo `blokovano`
 * bez `cekaNa` se poznaly teprve u toho, kdo měl generátor po ruce.
 *
 * Tahle sada tedy nenahrazuje generátor (stránku pořád skládá on), ale
 * ověřuje PRAVIDLA, která README v roadmapě vypisuje — a hlavně to, že se
 * soubor vůbec načte. Ten druhý bod není teoretický: 22. 9. 2026 se soubor
 * rozbil dvakrát (jednou přeformátováním, jednou uvozovkou uvnitř české
 * citace) a chyba se pokaždé našla až ručně.
 *
 * Kontroly jsou schválně jen ty, které jsou v README napsané jako pravidlo.
 * Co README nechává na člověku (pořadí, vlny, důležitost), se tu nehlídá —
 * test nesmí být přísnější než dohoda, jinak začne překážet.
 */
const fs = require('fs');
const path = require('path');

let ok = 0, fail = 0;
const test = (n, cond, info) => {
  if (cond) { ok++; console.log('OK  ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : String(info).slice(0, 300)); }
};

const SOUBOR = path.join(__dirname, '..', 'roadmapa', 'roadmap.json');

let text = null, db = null, chybaCteni = '';
try { text = fs.readFileSync(SOUBOR, 'utf8'); } catch (e) { chybaCteni = e.message; }
test('roadmap.json existuje', text !== null, chybaCteni);

if (text !== null) {
  try { db = JSON.parse(text); } catch (e) { chybaCteni = e.message; }
  test('roadmap.json je platný JSON', db !== null, chybaCteni);
}

const polozky = (db && Array.isArray(db.polozky)) ? db.polozky : null;
test('nese pole `polozky`', Array.isArray(polozky), db && Object.keys(db));

if (polozky) {
  /* ---------- id: jedinečné a vyplněné ---------- */
  const videna = new Map();
  const dvakrat = [];
  const bezId = [];
  polozky.forEach((p, i) => {
    const id = String((p && p.id) || '').trim();
    if (!id) { bezId.push(i); return; }
    if (videna.has(id)) dvakrat.push(id); else videna.set(id, p);
  });
  test('každá položka má id', bezId.length === 0, bezId);
  test('žádné id není použité dvakrát', dvakrat.length === 0, dvakrat);

  /* ---------- stav: jen tři hodnoty ---------- */
  const STAVY = ['hotovo', 'ceka', 'blokovano'];
  const cizi = polozky.filter(p => STAVY.indexOf(String((p && p.stav) || '')) < 0)
    .map(p => (p && p.id) + ':' + (p && p.stav));
  test('stav je jen hotovo / ceka / blokovano', cizi.length === 0, cizi);

  /* ---------- blokovano vyžaduje cekaNa, hotovo ho nemá ---------- */
  const blokBezDuvodu = polozky
    .filter(p => p && p.stav === 'blokovano' && !String(p.cekaNa || '').trim())
    .map(p => p.id);
  test('blokovaná položka říká, na co se čeká', blokBezDuvodu.length === 0, blokBezDuvodu);

  const hotovoCeka = polozky
    .filter(p => p && p.stav === 'hotovo' && String(p.cekaNa || '').trim())
    .map(p => p.id);
  test('hotová položka na nic nečeká', hotovoCeka.length === 0, hotovoCeka);

  /* ---------- `odemyka` se do zdroje nepíše ---------- */
  const sOdemyka = polozky.filter(p => p && p.odemyka !== undefined).map(p => p.id);
  test('`odemyka` se do zdroje nepíše (dopočítá si ho stránka)',
    sOdemyka.length === 0, sOdemyka);

  /* ---------- závislosti míří na existující položky ----------
   * `zavisi` je pole objektů { typ, id, proc } — ne holých čísel. Viselec
   * (odkaz na položku, která neexistuje) je přesně to, co README jmenuje
   * jako důvod pro `roadmapa.py --kontrola`. */
  const visici = [];
  polozky.forEach(p => {
    const z = (p && p.zavisi) || [];
    (Array.isArray(z) ? z : [z]).forEach(x => {
      const cil = String((x && typeof x === 'object' ? x.id : x) || '').trim();
      if (cil && !videna.has(cil)) visici.push((p && p.id) + ' → ' + cil);
    });
  });
  test('závislosti míří na existující položky', visici.length === 0, visici);

  /* ---------- text se vejde do <script> ----------
   * Stránka vzniká vložením JSONu do `const RM = { … }` uvnitř <script>,
   * takže sekvence `</` v textu by značku ukončila dřív, než má.
   *
   * Do 22. 9. 2026 to tahle sada řešila ZÁKAZEM `</` v datech — generátor
   * totiž v repozitáři nebyl a nešlo se spolehnout, že to někdo ošetří.
   * Teď v něm je a escapování dělá sám, takže zákaz by jen bránil napsat
   * do poznámky kus HTML. Hlídá se proto to, na čem to opravdu stojí:
   * že generátor escapuje. Že výsledek v prohlížeči skutečně naběhne,
   * ověřuje `overit_roadmapu.mjs` nad vygenerovanou stránkou. */
  const gen = (() => {
    try { return fs.readFileSync(path.join(__dirname, '..', 'roadmapa', 'roadmapa.py'), 'utf8'); }
    catch (e) { return ''; }
  })();
  test('generátor escapuje `</`, aby text neukončil <script>',
    /replace\('<\/', *'<\\\\\/'\)/.test(gen) || gen.indexOf("replace('</'") >= 0, gen.length);
}

/* ---------- šablona a generátor (22. 9. 2026) ----------
 *
 * Stránka se skládá z `roadmap.json` a `sablona.html`; do 22. 9. 2026 to
 * uměl jen generátor v pracovní kopii mimo GitHub, takže roadmapa zůstala
 * o pět buildů pozadu a nikdo s repozitářem ji neuměl vydat. Tyhle dvě
 * kontroly hlídají, že v repozitáři zůstane obojí — sám JSON je k ničemu,
 * když se nemá do čeho vložit. */
{
  const sablona = path.join(__dirname, '..', 'roadmapa', 'sablona.html');
  const generator = path.join(__dirname, '..', 'roadmapa', 'roadmapa.py');
  let s = '';
  try { s = fs.readFileSync(sablona, 'utf8'); } catch (e) { s = ''; }
  test('šablona stránky je v repozitáři', s.length > 1000, s.length);
  test('a nese značku, kam se vkládají data', s.indexOf('<?ROADMAP_JSON?>') >= 0);
  /* Data jdou do <script>: kdyby v šabloně zůstal kus starých dat, stránka
   * by se vykreslila ze dvou zdrojů naráz. */
  test('v šabloně nezůstala stará data', s.indexOf('"polozky"') < 0);
  test('generátor je v repozitáři', fs.existsSync(generator));
}

console.log('\n' + ok + ' OK, ' + fail + ' FAIL');
process.exit(fail ? 1 : 0);
