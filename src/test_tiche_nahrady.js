/* ===== CO APLIKACE DOSADÍ SAMA, MUSÍ BÝT VIDĚT =====
 * (nálezy #263 a #264, 17. 9. 2026)
 *
 * Obě vady jsou jedna věc ze dvou stran: aplikace ukáže číslo, které do ní
 * nikdo nezadal, a neřekne to.
 *
 *   #263 — chybí-li v ceníku sazba ATYP, dosadí se hodnota natvrdo z kódu.
 *          U zámečníka je to dvojnásobek toho, co má testovací ceník.
 *   #264 — zveřejnění verze, která mění JEN zahraniční sazby, hlásilo
 *          „nezměnila se žádná sledovaná cena" (nález V45 z 5. kola).
 *
 * Předchůdcem obou je V38 u skla (14. 9. 2026), kde padlo, že tichá náhrada
 * musí pryč: „nulu nejde přehlédnout, tiše zaměněné sklo ano."
 *
 * POZOR NA ROZSAH #263. Náhrada se NERUŠÍ — není odsud vidět, jestli má
 * ostrý ceník těch pět sazeb vyplněných, a kdyby neměl, znamenalo by
 * zrušení náhrady nulové rezervy, tedy tichou změnu ceny opačným směrem.
 * Zvoleno „dosadit a viditelně označit". Tahle sada tedy hlídá, že se
 * označí — ne že se přestane dosazovat.
 */
const fs = require('fs');
const eng = require('./engine.js');
const ZC = require('./zkusebni_cenik.js');

let ok = 0, fail = 0;
const test = (n, cond, info) => {
  if (cond) { ok++; console.log('OK  ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info)); }
};

/* ---------------------------------------------------------------------------
 * #263 — sazby ATYP
 * ------------------------------------------------------------------------- */

/* Pravidlo i štítek bydlí v UI (potřebují globální C a Z), takže se sem
 * načtou jako text a vyhodnotí v malém prostředí. Je to slabší než volání
 * skutečné funkce, proto se vedle toho zkouší i CHOVÁNÍ `cenikVychozi`,
 * na kterém celé rozhodnutí stojí. */
const ui = fs.readFileSync(__dirname + '/ui/kalk_ock.js', 'utf8');

test('seznam sazeb ATYP v UI existuje', /const ATYP_SAZBY = \[/.test(ui));
['atypZamecnikKc', 'atypRezervaZakladPct', 'atypRezervaPriplatkyPct',
 'atypMontazPct', 'atypProjekcePct'].forEach(k => {
  test('a obsahuje ' + k, new RegExp("klic: '" + k + "'").test(ui));
});
/* Jeden seznam pro předlohu i pro štítek. Kdyby se předloha vrátila k
 * vlastním číslům, štítek by mlčel přesně o tom, co se dosadilo. */
test('předloha bere náhrady z téhož seznamu (S(), ne vlastní čísla)',
  /rezervaZakladPct: S\('atypRezervaZakladPct'\)/.test(ui)
  && /zamecnikAtypKc: S\('atypZamecnikKc'\)/.test(ui), 'S()');
test('a v předloze už nezůstalo natvrdo psané 50000',
  ui.indexOf("vych('atypZamecnikKc', 50000)") < 0);
test('štítek se kreslí u přepínače ATYP',
  /atypNahradyHtml\(\)\}<\/span><\/div>/.test(ui));
test('a ukazuje se jen při zapnutém ATYP',
  /function atypNahradyHtml\(\)[\s\S]{0,220}!Z\.atyp\) return '';/.test(ui));
test('štítek se netiskne (je to poznámka pro nás, ne pro zákazníka)',
  /atypNahradyHtml[\s\S]{0,900}pill warn noprint/.test(ui));

/* Chybějící sazbu se UI ptá SAMOTNÉHO CENÍKU přes značku, ne vlastní kopií
 * podmínky. Tady se ověřuje, že se ta cesta chová, jak se od ní čeká. */
{
  const cen = require('./cenik.js');
  const znacka = {};
  const C0 = { atypZamecnikKc: 0, atypMontazPct: 0.3, atypProjekcePct: null };
  test('cenikVychozi: nula = chybí', cen.cenikVychozi(C0, 'atypZamecnikKc', znacka) === znacka);
  test('cenikVychozi: null = chybí', cen.cenikVychozi(C0, 'atypProjekcePct', znacka) === znacka);
  test('cenikVychozi: vyplněná sazba se vrátí',
    cen.cenikVychozi(C0, 'atypMontazPct', znacka) === 0.3);
  test('a UI se ptá touhle cestou, ne vlastní podmínkou',
    /function atypSazbaChybi[\s\S]{0,320}cenikVychozi\([\s\S]{0,60}znacka\) === znacka/.test(ui));
}

/* Výchozí ceník aplikace ty sazby NEMÁ — proto náhrada padá tak často a
 * proto na ni musí být vidět. Kdyby se to změnilo, ať se to ví. */
test('DEFAULT_CENIK sazby ATYP nemá (náhrada je tedy běžný stav, ne výjimka)',
  !eng.DEFAULT_CENIK.atypZamecnikKc && !eng.DEFAULT_CENIK.atypRezervaZakladPct,
  { zam: eng.DEFAULT_CENIK.atypZamecnikKc, rez: eng.DEFAULT_CENIK.atypRezervaZakladPct });

/* ---------------------------------------------------------------------------
 * #264 — rozdíly zahraniční řady
 * ------------------------------------------------------------------------- */

global.DEFAULT_CENIK = ZC.zkusebniCenik();
const prog = require('./program.js');
const cen = require('./cenik.js');
global.cenikSledovane = cen.cenikSledovane;

const zaznam = (ceny, jenZahr) => ({
  cenik: JSON.parse(JSON.stringify(ZC.zkusebniCenik())),
  cenikProj: {},
  zahranicni: { ceny: ceny || {}, jenZahr: jenZahr || {} },
});

{
  const A = zaznam({ 'C.marze': 0.30 });
  const B = zaznam({ 'C.marze': 0.45 });
  const r = prog.programRozdilyZahr(A, B);
  test('změna zahraniční sazby se v rozdílech objeví', r.length === 1, r.length);
  test('a nese starou i novou hodnotu',
    r[0] && r[0].stara === 0.30 && r[0].nova === 0.45, r[0]);
  test('a je poznat, že jde o zahraniční řadu',
    !!r[0] && /zahraniční/.test(r[0].popis), r[0] && r[0].popis);
  test('spočte se i procentní změna', !!r[0] && Math.abs(r[0].zmena - 0.5) < 1e-9,
    r[0] && r[0].zmena);
}

{
  /* Přesně případ V45: do zahraniční řady přibyly sazby, tuzemská beze změny. */
  const A = zaznam({});
  const B = zaznam({ 'C.prechodoveKgKc': 700, 'C.oplechPracKc': 900 });
  const r = prog.programRozdilyZahr(A, B);
  test('doplnění zahraničních sazeb NENÍ „beze změny" (V45)', r.length === 2, r.length);
}

{
  /* Přepnutí „platí jen pro zahraniční" je změna, i když se částka nehnula. */
  const A = zaznam({ 'C.marze': 0.30 }, {});
  const B = zaznam({ 'C.marze': 0.30 }, { 'C.marze': true });
  const r = prog.programRozdilyZahr(A, B);
  test('přepnutí „jen zahraniční" se taky vypíše', r.length === 1, r);
  test('a je v popisu vidět, co se přepnulo',
    !!r[0] && /jen zahraniční/.test(r[0].popis), r[0] && r[0].popis);
}

{
  const A = zaznam({ 'C.marze': 0.30 }, { 'C.marze': true });
  test('shodné záznamy nehlásí nic', prog.programRozdilyZahr(A, zaznam({ 'C.marze': 0.30 }, { 'C.marze': true })).length === 0);
  test('prázdné zahraniční odchylky nespadnou', prog.programRozdilyZahr({}, {}).length === 0);
}

/* A hlavně: obrazovka historie ceníku ty rozdíly opravdu přilepuje. */
{
  const pui = fs.readFileSync(__dirname + '/ui/program_ui.js', 'utf8');
  test('historie ceníku zahraniční rozdíly připojuje',
    /cenikRozdily\(programData[\s\S]{0,160}programRozdilyZahr\(vse\[i - 1\], vse\[i\]\)/.test(pui));
}

console.log('\n' + (fail ? 'SELHALO ' + fail + ' z ' + (ok + fail) : 'OK ' + ok));
if (fail) process.exit(1);
