/* VS #570, etapa E2 (roadmapa #592) — ZADÁNÍ VÍC ŠACHET: logika obrazovky
 * src/ui/vice_sachet_ui.js bez prohlížeče (ve vm, se stuby aplikace), aby ji
 * hlídaly i mutace. Prohlížeč (rozložení, klávesnice, en-US, srovnání se
 * základem znak po znaku) hlídá overit_vs_zadani.mjs.
 *
 *  – VYP + 1 šachta: žádný prvek (R21); ZAP + 1 šachta: jen Počet variant
 *    a Počet kusů v nadpisu (R17, R20);
 *  – zvýšení počtu = kopie poslední šachty „Šachta N", ks 1, hluboká kopie
 *    zadání, otevře se nová šachta (Z na její zadání);
 *  – neplatný počet / ks → hláška, data beze změny; limity 10 variant, 20 ks;
 *  – snížení = potvrzení (R18); po potvrzení `dalsi: []` — klíč se NEMAŽE
 *    (server 409); šachta 1 zůstává; Smazat u šachty 1 nic;
 *  – ks šachty 1 = 1 se z dat smaže (R20 návrat), název se očistí a zkrátí;
 *  – Model 1, vypnutá funkce, zamčená varianta: zápis odmítnut, Z = šachta 1;
 *  – katalog do ostatních šachet jen se zapnutou funkcí a nezamčené variantě;
 *  – kalkulace: otevřená šachta / Součet, popis a cena řádku CELKEM.
 * Pojistka: na 079cfc6 selže (ui/vice_sachet_ui.js neexistuje).
 * Spuštění: cd src && node test_vs_zadani.js */
const vm = require('vm');
const fs = require('fs');
const path = require('path');
const VS = require('./vice_sachet.js');

let ok = 0, fail = 0;
const test = (n, c, info) => { if (c) { ok++; console.log('OK   ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info).slice(0, 400)); } };

const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const zadani = (zdvih) => ({ zdvih, sirka: 1.6, mustky: [{ ks: 1 }] });

function prostredi({ zap = true, fixes = true, zamcena = false, ock } = {}) {
  const st = { hl: [], katalog: [], render: 0 };
  const ctx = vm.createContext(Object.assign({ console, esc, JSON, Math, String, Set, Array, Object,
    CISLO_POLE: 'inputmode="decimal" autocomplete="off" data-cislo="1"',
    kartaRezim: (o, k, t, obsah, id, z, navic) => '<karta id="' + id + '"><h2>' + t + (navic || '') + '</h2>' + obsah + '</karta>',
    fmt: x => 'F' + (Math.round(x * 100) / 100), fmt0: x => 'F0' + Math.round(x),
    VS_UI: { vid: null, akt: 0, pohled: 'akt', potvrdit: null },
    KATALOG: { k: 1 }, katalogAplikuj: (kat, z) => st.katalog.push(z),
    hlaska: t => { st.hl.push(String(t)); return Promise.resolve(); },
    render: () => { st.render++; },
    viceSachetZapnuto: () => zap,
    nahledStop: () => false, zamekCteniStop: () => false, zamekStop: () => zamcena,
    variantaUzamcena: () => zamcena,
  }, VS));
  vm.runInContext(fs.readFileSync(path.join(__dirname, 'ui', 'vice_sachet_ui.js'), 'utf8'), ctx, { filename: 'vice_sachet_ui.js' });
  vm.runInContext(`
    var V = { id: 'v1', data: { ock: null } };
    var ZAK = { varianty: [V] };
    var OCK, Z;
    function aktivniVarianta() { return V; }
    function syncVarianta() { OCK = V.data.ock; Z = OCK.zadani; vsSyncZ(V, variantaUzamcena(V)); }
  `, ctx);
  ctx.V.data.ock = ock || { zadani: zadani(12), fixes };
  ctx.syncVarianta();
  return { ctx, st };
}
const run = (c, kod) => vm.runInContext(kod, c);

/* ---------- vypnuto / zapnuto, jedna šachta ---------- */
{
  const { ctx } = prostredi({ zap: false });
  test('VYP + 1 šachta: žádný prvek v nadpisu, karta ani titul', run(ctx, "vsZadaniNavic() === '' && vsKartaSachty() === '' && vsZadaniTitul() === ''"));
  test('VYP: řádek CELKEM jako dosud', run(ctx, "vsCelkemPopis({}) === 'CELKEM (zaokrouhleno ↑ na tisíce)'")
    && run(ctx, "vsCelkemBunka({ souhrn: { zakladCena: 123000 } }) === 'F0123000'"));
}
{
  const { ctx } = prostredi();
  const h = run(ctx, 'vsZadaniNavic()');
  test('ZAP + 1 šachta: Počet variant (1) a Počet kusů (1) přes CISLO_POLE', /id="vsPocet"[^>]*value="1"/.test(h) && /id="vsKs1"[^>]*value="1"/.test(h)
    && (h.match(/data-cislo="1"/g) || []).length === 2 && !/type="number"/.test(h), h);
  test('ZAP + 1 šachta: bez karty a titulu (R16)', run(ctx, "vsKartaSachty() === '' && vsZadaniTitul() === ''"));
}

/* ---------- zvýšení počtu ---------- */
{
  const { ctx, st } = prostredi();
  run(ctx, "vsPocetVariant('3')");
  const o = ctx.V.data.ock;
  test('3 varianty: dvě další šachty „Šachta 2", „Šachta 3", ks 1', o.dalsi.length === 2 && o.dalsi[0].nazev === 'Šachta 2'
    && o.dalsi[1].nazev === 'Šachta 3' && o.dalsi.every(s => s.ks === 1), o.dalsi.map(s => s.nazev));
  test('kopie zadání je hluboká (ne tentýž objekt)', o.dalsi[0].zadani !== o.zadani && o.dalsi[1].zadani !== o.dalsi[0].zadani
    && o.dalsi[0].zadani.mustky !== o.zadani.mustky && JSON.stringify(o.dalsi[1].zadani) === JSON.stringify(o.zadani));
  test('otevřená je nová šachta, Z = její zadání', ctx.VS_UI.akt === 2 && ctx.Z === o.dalsi[1].zadani);
  test('id šachet jedinečná a v tvaru serveru, tvar dat bez problémů', new Set(o.dalsi.map(s => s.id)).size === 2
    && VS.vsTvarProblemy(o).length === 0, o.dalsi.map(s => s.id));
  test('nadpis zadání „Počet kusů této šachty: 1 ks", titul „ — Šachta 3"', /Počet kusů této šachty: <b id="vsKsTeto">1 ks/.test(run(ctx, 'vsZadaniNavic()'))
    && run(ctx, 'vsZadaniTitul()') === ' — Šachta 3');
  const k = run(ctx, 'vsKartaSachty()');
  test('karta Šachty varianty: Počet variant 3 a Počet šachet celkem 3 ks v nadpisu (R19)', /<h2>Šachty varianty[\s\S]*id="vsPocet"[^>]*value="3"[\s\S]*id="vsCelkem">3 ks<\/b>[\s\S]*<\/h2>/.test(k), k.slice(0, 600));
  test('karta: přepínač se třemi šachtami, Smazat aktivní (ne šachta 1)', (k.match(/onclick="vsAkt\(/g) || []).length === 3 && !/id="vsSmaz"[^>]*disabled/.test(k));
  run(ctx, "vsKsSet('2')");
  test('Počet stejných kusů šachty 3 = 2 → celkem 4 ks', o.dalsi[1].ks === 2 && /id="vsCelkem">4 ks/.test(run(ctx, 'vsKartaSachty()')));
  test('zápis bez hlášky', st.hl.length === 0, st.hl);
}

/* ---------- neplatné vstupy a limity ---------- */
{
  const { ctx, st } = prostredi();
  const pred = JSON.stringify(ctx.V.data.ock);
  ['0', '11', 'abc', '2.5', '', '-1'].forEach(t => run(ctx, `vsPocetVariant(${JSON.stringify(t)})`));
  test('Počet variant 0 / 11 / abc / 2.5 / prázdné / -1 → hláška, data beze změny', JSON.stringify(ctx.V.data.ock) === pred && st.hl.length === 6, st.hl.length);
  ['0', '21', '1.5'].forEach(t => run(ctx, `vsKsSet(${JSON.stringify(t)})`));
  test('Počet kusů 0 / 21 / 1.5 → hláška, data beze změny', JSON.stringify(ctx.V.data.ock) === pred && st.hl.length === 9);
  run(ctx, "vsPocetVariant('10')");
  test('10 variant jde', ctx.V.data.ock.dalsi.length === 9);
  run(ctx, 'vsKopie()');
  test('Kopírovat nad 10 variant odmítnuto', ctx.V.data.ock.dalsi.length === 9 && /nejvýš 10/.test(st.hl[st.hl.length - 1]));
  run(ctx, "vsKsSet('20')");
  test('20 ks jde', ctx.V.data.ock.dalsi[8].ks === 20);
}

/* ---------- snížení, smazání (R18) ---------- */
{
  const { ctx } = prostredi();
  run(ctx, "vsPocetVariant('3'); vsAkt(1); vsNazevSet('Výtah B')");
  const o = ctx.V.data.ock;
  run(ctx, "vsPocetVariant('1')");
  test('snížení na 1: čeká potvrzení [1, 2], data beze změny', JSON.stringify(ctx.VS_UI.potvrdit) === '[1,2]' && o.dalsi.length === 2);
  test('potvrzení vyjmenuje mazané šachty', /Smazat šachty Výtah B, Šachta 3\?/.test(run(ctx, 'vsKartaSachty()')));
  run(ctx, 'vsPotvrd(false)');
  test('Zrušit: nic se nesmaže', o.dalsi.length === 2 && ctx.VS_UI.potvrdit === null);
  run(ctx, "vsAkt(0); vsSmaz()");
  test('Smazat u šachty 1: nic (šachta 1 zůstává)', ctx.VS_UI.potvrdit === null);
  run(ctx, "vsAkt(1); vsSmaz()");
  test('Smazat šachtu 2: potvrzení se jménem', JSON.stringify(ctx.VS_UI.potvrdit) === '[1]' && /Smazat šachtu Výtah B\?/.test(run(ctx, 'vsKartaSachty()')));
  run(ctx, 'vsPotvrd(true)');
  test('po potvrzení: zbyla Šachta 3, otevřená šachta 1', o === ctx.V.data.ock && ctx.V.data.ock.dalsi.length === 1
    && ctx.V.data.ock.dalsi[0].nazev === 'Šachta 3' && ctx.VS_UI.akt === 0 && ctx.Z === ctx.V.data.ock.zadani);
  run(ctx, "vsPocetVariant('1'); vsPotvrd(true)");
  test('snížení na 1: `dalsi` zůstává jako [] (klíč se NEMAŽE — server 409)', 'dalsi' in ctx.V.data.ock
    && Array.isArray(ctx.V.data.ock.dalsi) && ctx.V.data.ock.dalsi.length === 0);
  test('po snížení na 1: dnešní zobrazení (bez karty, s polem v zadání)', run(ctx, "vsKartaSachty() === '' && /id=\"vsPocet\"/.test(vsZadaniNavic())"));
}

/* ---------- ks šachty 1 (R20), název ---------- */
{
  const { ctx } = prostredi();
  run(ctx, "vsKsSet('3')");
  test('R20: ks šachty 1 = 3 → režim víc šachet, celkem 3 ks', ctx.V.data.ock.ks === 3 && VS.rezimViceSachet(ctx.V.data.ock)
    && /id="vsCelkem">3 ks/.test(run(ctx, 'vsKartaSachty()')));
  run(ctx, "vsKsSet('1')");
  test('R20: návrat na 1 ks → klíč ks pryč, dnešní zobrazení', !('ks' in ctx.V.data.ock) && run(ctx, "vsKartaSachty() === ''"));
  run(ctx, "vsKsSet('2'); vsNazevSet('  Výtah   A  ')");
  test('název šachty se očistí od mezer', ctx.V.data.ock.nazev === 'Výtah A');
  run(ctx, `vsNazevSet(${JSON.stringify('x'.repeat(100))})`);
  test('název se zkrátí na 80 znaků', ctx.V.data.ock.nazev.length === 80);
  test('název v kartě se escapuje', (run(ctx, "vsNazevSet('<b>x</b>'); vsKartaSachty()")).indexOf('<b>x</b>') < 0);
}

/* ---------- Model 1, vypnuto, zamčeno ---------- */
{
  const { ctx, st } = prostredi({ fixes: false });
  run(ctx, "vsPocetVariant('2')");
  test('Model 1: přidání šachty odmítnuto s hláškou', !ctx.V.data.ock.dalsi && /jen Model 2/.test(st.hl.join(' ')));
  test('Model 1: pole zhasnutá', /id="vsPocet"[^>]*disabled/.test(run(ctx, 'vsZadaniNavic()').replace(/\s+/g, ' ')) && /id="vsKs1"[^>]*disabled/.test(run(ctx, 'vsZadaniNavic()').replace(/\s+/g, ' ')));
  const o = { zadani: zadani(12), fixes: false, dalsi: [{ id: 's_b', nazev: 'B', ks: 1, zadani: zadani(9) }] };
  const p = prostredi({ ock: o });
  run(p.ctx, 'VS_UI.akt = 1; syncVarianta()');
  test('Model 1 s daty víc šachet: zadání = šachta 1', p.ctx.Z === o.zadani && p.ctx.VS_UI.akt === 0);
}
{
  const o = { zadani: zadani(12), fixes: true, nazev: 'A', dalsi: [{ id: 's_b', nazev: 'B', ks: 2, zadani: zadani(9) }] };
  const { ctx, st } = prostredi({ zap: false, ock: o });
  run(ctx, 'VS_UI.akt = 1; syncVarianta()');
  test('VYP + víc šachet: zadání vždy šachta 1', ctx.Z === o.zadani && ctx.VS_UI.akt === 0);
  const pred = JSON.stringify(o);
  run(ctx, "vsKopie(); vsKsSet('3'); vsNazevSet('X'); vsPocetVariant('3'); vsAkt(1); vsSmaz()");
  test('VYP + víc šachet: žádný zápis, hláška „vypnuté"', JSON.stringify(o) === pred && st.hl.length >= 4 && st.hl.every(t => /vypnuté/.test(t)), st.hl);
  const k = run(ctx, 'vsKartaSachty()');
  test('VYP + víc šachet: karta s lištou, bez vstupů', /id="vsVypnuto"/.test(k) && /funkce je v Nastavení vypnutá/.test(k) && !/<input/.test(k));
  test('VYP + víc šachet: v zadání „Počet kusů této šachty: 1 ks" (šachta 1)', /Počet kusů této šachty: <b id="vsKsTeto">1 ks/.test(run(ctx, 'vsZadaniNavic()')));
  test('VYP: katalog do šachet 2+ nesahá (server by změnu odmítl)', st.katalog.length === 0);
}
{
  const o = { zadani: zadani(12), fixes: true, dalsi: [{ id: 's_b', nazev: 'B', ks: 1, zadani: zadani(9) }] };
  const { ctx, st } = prostredi({ zamcena: true, ock: o });
  const pred = JSON.stringify(o);
  run(ctx, "vsKopie(); vsKsSet('3'); vsPocetVariant('3')");
  test('zamčená varianta: žádný zápis', JSON.stringify(o) === pred && st.katalog.length === 0);
  run(ctx, 'vsAkt(1)');
  test('zamčená varianta: šachtu 2 jde otevřít ke čtení, vstupy zhasnuté', ctx.Z === o.dalsi[0].zadani
    && /id="vsKs"[^>]*disabled/.test(run(ctx, 'vsKartaSachty()')));
}
{
  const o = { zadani: zadani(12), fixes: true, dalsi: [{ id: 's_b', ks: 1, zadani: zadani(9) }, { id: 's_c', ks: 1, zadani: zadani(8) }] };
  const { ctx, st } = prostredi({ ock: o });
  test('ZAP: katalog dostanou ostatní šachty (ne otevřená)', st.katalog.length === 2 && st.katalog[0] === o.dalsi[0].zadani && st.katalog[1] === o.dalsi[1].zadani);
  run(ctx, 'VS_UI.akt = 5; syncVarianta()');
  test('akt mimo rozsah se srovná na poslední šachtu', ctx.VS_UI.akt === 2 && ctx.Z === o.dalsi[1].zadani);
  ctx.V = { id: 'v2', data: { ock: { zadani: zadani(5), fixes: true } } }; run(ctx, 'syncVarianta()');
  test('přepnutí varianty otevře šachtu 1', ctx.VS_UI.akt === 0 && ctx.Z === ctx.V.data.ock.zadani);
}

/* ---------- kalkulace: šachta / součet ---------- */
{
  const { ctx } = prostredi();
  const r1 = { souhrn: { zakladCenaPredZaokr: 1234.5, zakladCena: 2000, priplatkyCenaPredZaokr: 10.5, priplatkyCena: 1000 } };
  const r2 = { souhrn: { zakladCenaPredZaokr: 99.25, zakladCena: 1000 } };
  const r = { sachty: [{ vysl: r1, ks: 1, nazev: 'A' }, { vysl: r2, ks: 2 }], souhrn: { zakladCena: 2000 } };
  ctx.V.data.ock.dalsi = [{ id: 's_b', ks: 2, zadani: zadani(1) }];
  ctx.VS_UI.akt = 1;
  test('kalkulace: otevřená šachta → její výsledek', ctx.vsKalkVysledek(r) === r2 && ctx.VS_UI.kalkSachta === true);
  test('řádek CELKEM šachty: nezaokrouhleno, název šachty', /^CELKEM ŠACHTY Šachta 2 \(1 ks, nezaokrouhleno/.test(ctx.vsCelkemPopis(r2)) && ctx.vsCelkemBunka(r2) === 'F99.25');
  ctx.VS_UI.akt = 0;
  test('příplatky šachty před zaokrouhlením', ctx.vsKalkVysledek(r) === r1 && ctx.vsPriplatkyCelkem(r1) === 10.5);
  ctx.VS_UI.pohled = 'soucet';
  test('pohled Součet → celá varianta, CELKEM jako dosud', ctx.vsKalkVysledek(r) === r && ctx.VS_UI.kalkSachta === false
    && ctx.vsCelkemBunka(r) === 'F02000');
  const jedna = { souhrn: { zakladCena: 5000 } };
  test('bez víc šachet: tentýž objekt', ctx.vsKalkVysledek(jedna) === jedna && ctx.VS_UI.kalkSachta === false);
}

console.log(`\n${ok} OK, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
