/* ===== P2 (K19-N104, rozhodnutí J. V. 13. 10. 2026): „OPLÁŠTIT I PROHLUBEŇ" =====
 *
 * Zaškrtávátko pod polem Prohlubeň se jmenovalo „Prosklít i prohlubeň".
 * Zkratka ale nastaví všem stěnám začátek OPLÁŠTĚNÍ v −prohlubeň a typ
 * stěny nemusí být sklo (může to být plech) — J. V. 13. 10. 2026: přejmenovat
 * na „Opláštit i prohlubeň", jinak řešení P2 z main ponechat.
 *
 * Hlídá se:
 *  (a) texty pro uživatele (zadání šachty, nápověda, hláška, detail výpočtu,
 *      příručka) nesou nový název a slovo „prosklít" / „Prosklená prohlubeň"
 *      v nich není; po sestavení totéž v dist/kalkulacka.html (je-li);
 *  (b) data se nemění: otisk zadání po zaškrtnutí a odškrtnutí je stejný
 *      jako na 1df7283 (v12.10.4, před přejmenováním) — přejmenování nesmí
 *      sáhnout na klíče ani výpočet.
 * Před opravou (1df7283): (a) selže (5 FAIL), (b) projde.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const eng = require('./engine.js');
const ZC = require('./zkusebni_cenik.js');

let ok = 0, fail = 0;
const test = (n, cond, info) => {
  if (cond) { ok++; console.log('OK  ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info)); }
};
const cti = (f) => fs.readFileSync(path.join(__dirname, f), 'utf8');

/* Jen řetězce, které vidí uživatel — komentáře (historie) se nepřepisují. */
const bezKomentaru = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const kalk = bezKomentaru(cti('ui/kalk_ock.js'));
const detail = bezKomentaru(cti('ui/detail_ui.js'));
const manual = fs.readFileSync(path.join(__dirname, '..', 'manual', 'obsah.json'), 'utf8');

test('(a) zadání šachty: popisek zaškrtávátka „Opláštit i prohlubeň"',
  /<label[^>]*>Opláštit i prohlubeň<\/label>/.test(kalk));
test('(a) nápověda pole Prohlubeň odkazuje na „Opláštit i prohlubeň" (opláštění i v prohlubni)',
  /title="Opláštění i v prohlubni: zaškrtněte „Opláštit i prohlubeň"/.test(kalk));
test('(a) tooltip a hláška nulové prohlubně: „není co opláštit"',
  (kalk.match(/není co opláštit/g) || []).length >= 2 && /\(opláštění i v prohlubni\)/.test(kalk));
test('(a) detail výpočtu: „Opláštěná prohlubeň" a zkratka „Opláštit i prohlubeň"',
  /'Opláštěná prohlubeň'/.test(detail) && /zkratka „Opláštit i prohlubeň"/.test(detail));
const stare = /Prosklít i prohlub|prosklít|Prosklená prohlub|Prosklení i v prohlub|prosklení i v prohlub/i;
test('(a) „Prosklít…" ani „Prosklená prohlubeň" v textech UI (kalk_ock, detail) ani v příručce nejsou',
  !stare.test(kalk) && !stare.test(detail) && !stare.test(manual),
  [kalk, detail, manual].map(s => (s.match(stare) || [''])[0]));

const dist = path.join(__dirname, '..', 'dist', 'kalkulacka.html');
if (fs.existsSync(dist)) {
  /* Sestavený soubor: komentáře v něm zůstávají (historie), proto se hledá
   * jen v řetězcích pro uživatele — popisek a hlášky. */
  const d = fs.readFileSync(dist, 'utf8');
  test('(a) dist/kalkulacka.html: popisek „Opláštit i prohlubeň" a žádné „Prosklít i prohlubeň</label>" ani „není co prosklít"',
    />Opláštit i prohlubeň<\/label>/.test(d) && !/>Prosklít i prohlubeň<\/label>/.test(d) && !/není co prosklít/.test(d)
    && !/'Prosklená prohlubeň'/.test(d));
}

/* (b) otisk dat — zaškrtnutí a odškrtnutí zkratky dává stejná data jako před
 * přejmenováním. Otisk spočítaný na 1df7283 (v12.10.4). */
const C = ZC.zkusebniCenik();
const kopie = (o) => JSON.parse(JSON.stringify(o));
const otisky = [];
for (const typ of ['exteriérová', 'interiérová']) {
  const z0 = Object.assign(kopie(eng.DEFAULT_ZADANI), { typSachty: typ, prohluben: 1.1 });
  const zap = eng.oplasteniProhlubenNastav(kopie(z0), C, true);
  const vyp = eng.oplasteniProhlubenNastav(kopie(zap), C, false);
  otisky.push(JSON.stringify(zap), JSON.stringify(vyp));
}
const otisk = crypto.createHash('sha256').update(otisky.join('\n')).digest('hex');
const OTISK_1DF7283 = 'c360a74b5e924f87c4a775f3da71386a7713c1f97c749afde4fb8d567c20ff19';
test('(b) otisk zadání po zaškrtnutí a odškrtnutí shodný s 1df7283', otisk === OTISK_1DF7283, otisk);

console.log(`\n${ok} OK, ${fail} FAIL`);
if (fail) process.exit(1);
