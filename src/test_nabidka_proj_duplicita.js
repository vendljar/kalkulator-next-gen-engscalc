/* ===== TÁŽ CENA SE V NABÍDCE PROJ NESMÍ VYTISKNOUT DVAKRÁT =====
 * (nález B z testování obchodníkem, 15. 9. 2026 — PDF 2026-OVP-CN-0357.3)
 *
 * Zaměření stojí ve VZORu dvakrát: jednou samostatně jako ZA a podruhé jako
 * „část 1" studie proveditelnosti. Do 15. 9. nesly obě místa ČÁSTKU, takže
 * zákazník, který si objednal zaměření i studii, viděl tutéž cenu dvakrát.
 * Rekapitulace ji vedla jen jednou — kdo sčítal řádky, dostal víc než celkem.
 *
 * Proč to nebyl okrajový případ: „část 1" se tiskne jen tehdy, když má cenu
 * `zamereni` A ZÁROVEŇ studie nebo projednání; blok CENA ZA ZAMĚŘENÍ se
 * tiskne, kdykoli má cenu `zamereni`. Tisk „části 1" tedy tisk ZA vždycky
 * implikuje. Duplicita byla jediný možný výsledek.
 *
 * Opravou (rozhodnutí J. V., varianta a) je `odkaz`: blok zůstane, ukáže
 * rozsah, ale místo částky nese odkaz na blok, kde ta cena stojí.
 *
 * SADA NEHLÍDÁ JEN TENHLE JEDEN ŘÁDEK. Hlavní test je obecný: v žádné
 * kombinaci objednaných činností se nesmí tatáž částka objevit ve dvou
 * cenových blocích a součet vytištěných cen musí sedět na rekapitulaci.
 * Kdyby někdo přidal další blok se stejným vzorcem, spadne to tady.
 *
 * Skutečné sazby se nepoužívají — ceník je zkušební.
 */
const eng = require('./engine.js');
const ZC = require('./zkusebni_cenik.js');

global.DEFAULT_ZADANI = JSON.parse(JSON.stringify(eng.DEFAULT_ZADANI));
global.DEFAULT_CENIK = ZC.zkusebniCenik();
const engProj = require('./engine_proj.js');
global.DEFAULT_ZADANI_PROJ = JSON.parse(JSON.stringify(engProj.DEFAULT_ZADANI_PROJ));
global.DEFAULT_CENIK_PROJ = ZC.zkusebniCenikProj();
global.vypocetProj = engProj.vypocetProj;
/* Překlady musí být v globálech, jinak `P()` v nabidka_proj.js tiše vrací
 * češtinu a oddíl 4 by měřil chybějící `tr`, ne chybějící překlad. */
const pr = require('./preklad.js');
Object.keys(pr).forEach(k => { global[k] = pr[k]; });
/* format.js se nahrává VÝSLOVNĚ. Bez něj si nabidka_proj.js sáhne po záložní
 * větvi (`typeof menaDokumentu === 'function'`) a sada měří něco jiného, než
 * co běží v aplikaci. Poprvé to prošlo právě proto, že format.js chyběl —
 * v běhu přes všechny sady ho dodala jiná sada a tahle spadla na chybějící
 * kurz. Sada nesmí záviset na tom, co se náhodou načetlo před ní. */
const fmt = require('./format.js');
Object.keys(fmt).forEach(k => { global[k] = fmt[k]; });
const np = require('./nabidka_proj.js');

let ok = 0, fail = 0;
const test = (n, cond, info) => {
  if (cond) { ok++; console.log('OK  ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info)); }
};

/* Zkušební ceník s kulatými sazbami, ať jdou částky odečíst na první pohled. */
function cenik() {
  const c = ZC.zkusebniCenikProj();
  Object.keys(c.sazby || {}).forEach(k => { c.sazby[k] = 100; });
  Object.keys(c.fixy || {}).forEach(k => { c.fixy[k] = 1000; });
  /* Kurz musí být vyplněný, jinak `menaDokumentu` cizojazyčný dokument
   * odmítne vyrobit (format.js, nález D1) a oddíl 4 spadne na výjimku místo
   * na překlad. Číslo je zkušební, ne kurz ČNB. */
  c.kurzEurKc = 25;
  return c;
}

/* Zadání se zapnutými / vypnutými sekcemi. Vyřazení položky = sekce bez ceny. */
function zadani(zapnute) {
  const z = JSON.parse(JSON.stringify(engProj.DEFAULT_ZADANI_PROJ));
  z.sekce.forEach(s => {
    const zap = zapnute.indexOf(s.key) >= 0;
    (s.polozky || []).forEach(p => { p.vyrazeno = !zap; });
  });
  return z;
}

const data = (zapnute, lang) => np.nabidkaProjData({},
  { data: { proj: { zadani: zadani(zapnute), cenik: cenik() } } }, lang || 'cz');

/* Částka z vytištěného řádku na číslo; odkaz ani „není součástí" číslo nedají. */
function castkaNaCislo(t) {
  const s = String(t).replace(/\s/g, '');
  if (!/[\d]/.test(s)) return null;
  const m = s.match(/([\d]+(?:,[\d]+)?)/);
  return m ? parseFloat(m[1].replace(',', '.')) : null;
}

const VSECHNY = ['zamereni', 'studie', 'projednani', 'dpz', 'ic', 'dps', 'ezc', 'kolaudace', 'geodet'];

/* ---------- 1) hlavní pravidlo: žádná částka dvakrát ---------- */

const kombinace = [
  ['zamereni'],
  ['studie'],
  ['zamereni', 'studie'],
  ['zamereni', 'projednani'],
  ['zamereni', 'studie', 'projednani'],
  VSECHNY,
];

kombinace.forEach(zap => {
  const d = data(zap);
  const popis = '[' + zap.join('+') + ']';
  /* Paušály (autorský dozor, variantní řešení) se do součtu nepočítají —
   * nejsou to činnosti této nabídky, ale sazebník navíc. */
  const cenove = d.bloky.filter(b => b.typ === 'cena' && !b.odkaz
    && !/AUTORSK|variantní/i.test(b.nadpis));
  const cisla = cenove.map(b => castkaNaCislo(b.castka)).filter(x => x != null);

  /* Ptáme se na ZDROJ částky, ne na její hodnotu. Dvě různé činnosti můžou
   * vyjít na tutéž korunu čirou náhodou (v téhle sadě se to při kulatých
   * zkušebních sazbách opravdu stává — IČ, EZC, kolaudace i geodet vyjdou
   * stejně) a duplicita to není. Duplicita je, když se DVAKRÁT vypíše cena
   * TÉŽE sekce — přesně to dělala „část 1" proti CENĚ ZA ZAMĚŘENÍ. */
  const sekce = cenove.map(b => b.sekce).filter(Boolean);
  const dvakrat = sekce.filter((s, i) => sekce.indexOf(s) !== i);
  test('žádná sekce nevypíše svou cenu dvakrát ' + popis,
    dvakrat.length === 0,
    { dvakrat, radky: cenove.map(b => b.nadpis + ' ← ' + b.sekce) });

  /* Součet vytištěných cen musí sedět na rekapitulaci — to je ta vada, kterou
   * zákazník uvidí, i kdyby se částky náhodou lišily. */
  const rekap = d.rekapitulace.map(x => castkaNaCislo(x[1])).filter(x => x != null);
  const sR = rekap.reduce((a, b) => a + b, 0);
  const sC = cisla.reduce((a, b) => a + b, 0);
  test('součet cenových řádků sedí na rekapitulaci ' + popis,
    Math.abs(sR - sC) < 0.01, { rekapitulace: sR, radky: sC });
});

/* ---------- 2) konkrétně „část 1" ---------- */
{
  const d = data(['zamereni', 'studie', 'projednani']);
  const ca = d.bloky.find(b => b.typ === 'cena' && /část 1/.test(b.nadpis));
  const za = d.bloky.find(b => b.typ === 'cena' && /^CENA ZA ZAMĚŘENÍ/.test(b.nadpis));
  test('blok „část 1" se pořád tiskne (rozsah se neztrácí)', !!ca);
  test('a nenese částku, ale odkaz', !!ca && ca.odkaz === true && /viz/.test(ca.castka),
    ca && ca.castka);
  test('samostatná CENA ZA ZAMĚŘENÍ částku nese', !!za && castkaNaCislo(za.castka) > 0,
    za && za.castka);
}

/* Objednané JEN zaměření: studie se nenabízí, „část 1" se netiskne vůbec
 * (to je oprava z 23. 8. 2026 — nesmí se rozbít). */
{
  const d = data(['zamereni']);
  test('bez studie se „část 1" netiskne vůbec',
    !d.bloky.some(b => /část 1/.test(b.nadpis)));
  test('a hlavička STUDIE PROVEDITELNOSTI taky ne',
    !d.bloky.some(b => b.typ === 'rozsah' && /STUDIE PROVEDITELNOSTI/.test(b.nadpis)));
}

/* Objednaná jen studie bez zaměření: zaměření nemá cenu, takže „část 1"
 * nemá na co odkazovat — nesmí zůstat odkaz do prázdna. */
{
  const d = data(['studie']);
  const ca = d.bloky.find(b => b.typ === 'cena' && /část 1/.test(b.nadpis));
  test('bez oceněného zaměření nezůstane odkaz do prázdna', !ca, ca && ca.castka);
}

/* ---------- 3) Word: symbol SP1 nese odkaz, ne druhou částku ---------- */
{
  const sObojim = data(['zamereni', 'studie']).placeholders;
  test('Word: PROJ_CENA_SP1 je odkaz, když se tiskne i ZA',
    /viz/i.test(sObojim.PROJ_CENA_SP1), sObojim.PROJ_CENA_SP1);
  test('Word: PROJ_CENA_ZAMERENI zůstává částkou',
    castkaNaCislo(sObojim.PROJ_CENA_ZAMERENI) > 0, sObojim.PROJ_CENA_ZAMERENI);

  const jenZam = data(['zamereni']).placeholders;
  test('Word: bez studie nese SP1 dál částku (pevná šablona ji má kam dát)',
    castkaNaCislo(jenZam.PROJ_CENA_SP1) > 0, jenZam.PROJ_CENA_SP1);
}

/* ---------- 4) odkaz se překládá ---------- */
['en', 'de'].forEach(l => {
  const d = data(['zamereni', 'studie'], l);
  const ca = d.bloky.find(b => b.typ === 'cena' && b.odkaz);
  test('odkaz není v ' + l.toUpperCase() + ' česky',
    !!ca && !/viz |výše/.test(ca.castka), ca && ca.castka);
});

/* ---------- 5) DPZ a DPS „část 1" se nezdvojují ---------- */
{
  const d = data(VSECHNY);
  ['DOKUMENTACI PRO POVOLENÍ ZÁMĚRU', 'DOKUMENTACI PRO PROVEDENÍ STAVBY'].forEach(co => {
    const kolik = d.bloky.filter(b => b.typ === 'cena' && b.nadpis.indexOf(co) >= 0).length;
    test('cena za ' + co + ' je v dokumentu jednou', kolik === 1, kolik);
  });
}

console.log('\n' + (fail ? 'SELHALO ' + fail + ' z ' + (ok + fail) : 'OK ' + ok));
if (fail) process.exit(1);
