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

const zive = (db && Array.isArray(db.polozky)) ? db.polozky : null;
test('nese pole `polozky`', Array.isArray(zive), db && Object.keys(db));

/* ---------- archiv hotových položek (#642, 22. 11. 2026) ----------
 * Hotové položky starší 60 dní leží v `roadmap_archiv.json`
 * (`roadmapa.py --archivuj`). Archiv je část evidence: pravidla níž platí
 * pro živý soubor i archiv DOHROMADY — číslo z archivu nejde použít znovu,
 * závislost na archivované položce není viselec, alias z archivu nemá jiná
 * položka. V archivu smějí být jen hotové položky. */
const SOUBOR_ARCHIV = path.join(__dirname, '..', 'roadmapa', 'roadmap_archiv.json');
let archiv = [];
if (fs.existsSync(SOUBOR_ARCHIV)) {
  let a = null, chyba = '';
  try { a = JSON.parse(fs.readFileSync(SOUBOR_ARCHIV, 'utf8')); } catch (e) { chyba = e.message; }
  test('archiv roadmap_archiv.json je platný JSON s polem `polozky`', a && Array.isArray(a.polozky), chyba);
  archiv = (a && Array.isArray(a.polozky)) ? a.polozky : [];
  const nehotove = archiv.filter(p => !p || p.stav !== 'hotovo').map(p => p && p.id);
  test('v archivu jsou jen hotové položky', nehotove.length === 0, nehotove);
}
const polozky = zive ? archiv.concat(zive) : null;

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

  /* ---------- jedna evidence (S6, 18. 11. 2026) ----------
   * Totéž, co hlídá `roadmapa.py --kontrola` (kontrola_s6): typ ze seznamu,
   * nehotová položka má typ a `cekaNa` „<kdo>: <co>“, nález má kolo, hotová
   * položka s typem má verzi, aliasy nejsou čísla a nemají je dvě položky,
   * nové značky jsou jen čísla. */
  const TYPY = ['ukol', 'nalez', 'otazka', 'rozhodnuti', 'davka'];
  const RE_CEKANA = /^(J\. V\.|kolega|koordinace|dávka|integrátor|externí): \S/;
  const STARA_ID = ['xx', '151a', '151b'];
  const verzeP = p => p.verze || ((String(p.hotovoV || '').match(/v\d{1,2}\.\d{1,2}\.\d{1,2}/) || [''])[0]);
  const s6 = { typ: [], bezTypu: [], cekani: [], kolo: [], verze: [], format: [], alias: [], id: [] };
  const aliasy = new Map();
  polozky.forEach(p => {
    if (!p) return;
    const id = String(p.id);
    if (!/^\d+$/.test(id) && STARA_ID.indexOf(id) < 0) s6.id.push(id);
    if (p.typ !== undefined && TYPY.indexOf(p.typ) < 0) s6.typ.push(id + ':' + p.typ);
    if (p.stav !== 'hotovo') {
      if (p.typ === undefined) s6.bezTypu.push(id);
      if (!RE_CEKANA.test(String(p.cekaNa || ''))) s6.cekani.push(id);
    }
    if (p.typ === 'nalez' && !/^\d{1,3}$/.test(String(p.kolo || ''))) s6.kolo.push(id);
    if (p.stav === 'hotovo' && p.typ !== undefined && !verzeP(p)) s6.verze.push(id);
    /* dočasná značka dávky („G1“) — svěřené G1-T1, totéž pravidlo jako roadmapa.py RE_VERZE_DAVKA */
    if (p.verze !== undefined && !/^v\d{1,2}\.\d{1,2}\.\d{1,2}$/.test(p.verze) && !/^[A-Z]{1,4}\d{0,3}$/.test(p.verze)) s6.format.push(id + ' verze');
    if (p.vetev !== undefined && !/^[A-Za-z0-9._\/-]+$/.test(p.vetev)) s6.format.push(id + ' vetev');
    if (p.dopadCena !== undefined && ['ano', 'ne'].indexOf(p.dopadCena) < 0) s6.format.push(id + ' dopadCena');
    if (p.alias !== undefined) {
      if (!Array.isArray(p.alias)) { s6.alias.push(id + ' není seznam'); return; }
      p.alias.forEach(a => {
        const k = String(a).trim().toLowerCase();
        if (!k || /^#?\d+$/.test(k)) s6.alias.push(id + ' „' + a + '“');
        else if (aliasy.has(k) && aliasy.get(k) !== id) s6.alias.push(a + ' u #' + aliasy.get(k) + ' i #' + id);
        else aliasy.set(k, id);
      });
    }
  });
  test('S6: typ je ukol / nalez / otazka / rozhodnuti / davka', s6.typ.length === 0, s6.typ);
  test('S6: každá nehotová položka má typ', s6.bezTypu.length === 0, s6.bezTypu);
  test('S6: nehotová položka má cekaNa „<kdo>: <co>“', s6.cekani.length === 0, s6.cekani);
  test('S6: nález má číslo kola', s6.kolo.length === 0, s6.kolo);
  test('S6: hotová položka s typem má verzi', s6.verze.length === 0, s6.verze);
  test('S6: verze, větev a dopadCena ve správném tvaru', s6.format.length === 0, s6.format);
  test('S6: aliasy nejsou čísla a nemají je dvě položky', s6.alias.length === 0, s6.alias);
  test('S6: nové značky jsou jen čísla', s6.id.length === 0, s6.id);
  test('S6: staré značky jsou dohledatelné (K40-N1, K48-N1, B1, C7, B0.1 mají položku)',
    ['k40-n1', 'k48-n1', 'b1', 'c7', 'b0.1'].every(k => aliasy.has(k)), [...aliasy.keys()].slice(0, 20));

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
