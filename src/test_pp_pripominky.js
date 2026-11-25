/* DÁVKA PP (J. V. 25. 11. 2026) — připomínky a krycí list PROJ, jádro a zdroj UI.
 *
 * Hlídá:
 *  #781 značky na snímku (src/pripominky.js): ověření tvaru a velikosti
 *       (přijme platné, odmítne cokoli jiného — server se o ně opírá), tah myši
 *       → značka (směr, ořez, kliknutí = nic), SVG přes snímek (jen čísla
 *       a tvar ze seznamu), skloňování počtu;
 *  #780 / #781 UI (src/ui/pripominky_ui.js): editor značek a zvětšení snímku
 *       jsou ve stránce, snímek nezachytí sám sebe, s vyznačením jde PRÁVĚ
 *       snímek z náhledu, správce dostane značky ze serveru;
 *  #792 krycí list PROJ: jedna karta „Objednávka, smlouva o dílo a plná moc",
 *       pořadí tlačítek a jazyk tisku u smlouvy;
 *  #793 „Co by se zapsalo do Pipedrive" jen pro administrátora (KL OCK i PROJ
 *       a sbalovací náhled u Prodeje), zápis prodeje a odeslání beze změny.
 *  (#791 pořadí objednávky hlídá src/test_objednavka_proj.js.)
 *
 * Pojistka proti prázdnému testu: na ebca8ebd sada padá (pripominkaZnackyZkontroluj
 * ani pdnUiNahledSmi neexistují, karta objednávky je samostatná) — viz zpráva commitu.
 *
 * Spuštění: cd src && node test_pp_pripominky.js */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const P = require('./pripominky.js');

let ok = 0, fail = 0;
const test = (n, c, info) => { if (c) { ok++; console.log('OK   ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info).slice(0, 400)); } };
const cti = f => fs.readFileSync(path.join(__dirname, f), 'utf8');

/* ---------- #781 jádro: ověření značek ---------- */
const Z = P.pripominkaZnackyZkontroluj;
test('#781 modul má ověření značek', typeof Z === 'function' && P.PRIPOMINKA_ZNACKY_MAX === 20
  && JSON.stringify(P.PRIPOMINKA_ZNACKA_TVARY) === '["ramecek","kruh"]');
if (typeof Z !== 'function') { console.log(`\n${ok} OK, ${fail} FAIL`); process.exit(1); }
const R = (o) => Object.assign({ tvar: 'ramecek', x: 100, y: 200, w: 300, h: 150 }, o);
test('bez značek = prázdný seznam', Z(undefined).ok && Z(null).ok && Z([]).ok && Z(undefined).znacky.length === 0);
{
  const r = Z([R(), R({ tvar: 'kruh', x: 0, y: 0, w: 1000, h: 1000 })]);
  test('přijme rámeček i kroužek, okraje 0 a 1000', r.ok && r.znacky.length === 2 && r.znacky[1].w === 1000, r);
  test('vrací čisté kopie jen s poli tvar,x,y,w,h', r.ok && Object.keys(r.znacky[0]).join() === 'tvar,x,y,w,h');
}
const zle = {
  'není seznam': { tvar: 'ramecek' },
  'text místo seznamu': 'ramecek',
  'neznámý tvar': [R({ tvar: 'sipka' })],
  'tvar s HTML': [R({ tvar: '<script>' })],
  'pole navíc': [R({ barva: 'red' })],
  'pole navíc __proto__': [JSON.parse('{"tvar":"ramecek","x":1,"y":1,"w":50,"h":50,"__proto__":{"a":1}}')],
  'desetinné číslo': [R({ x: 10.5 })],
  'číslo jako text': [R({ x: '10' })],
  'záporná souřadnice': [R({ x: -1 })],
  'nad 1000': [R({ y: 1001 })],
  'NaN': [R({ w: NaN })],
  'chybí h': [{ tvar: 'ramecek', x: 1, y: 1, w: 50 }],
  'příliš malá': [R({ w: P.PRIPOMINKA_ZNACKA_MIN - 1 })],
  'přesah vpravo': [R({ x: 900, w: 101 })],
  'přesah dolů': [R({ y: 950, h: 51 })],
  'null v seznamu': [null],
  'seznam v seznamu': [[1, 2]],
  'víc než 20': Array.from({ length: 21 }, () => R()),
};
Object.entries(zle).forEach(([n, v]) => { const r = Z(v); test('odmítne: ' + n, r.ok === false && /^Značky na snímku: /.test(r.chyba), r); });
test('přesně 20 značek projde', Z(Array.from({ length: 20 }, () => R())).ok);
test('nejmenší povolená značka projde', Z([R({ w: P.PRIPOMINKA_ZNACKA_MIN, h: P.PRIPOMINKA_ZNACKA_MIN })]).ok);

/* ---------- #781 tah myši → značka ---------- */
const T = P.pripominkaZnackaZTahu;
test('tah zprava dole doleva nahoru = stejný obdélník', JSON.stringify(T(0.5, 0.6, 0.1, 0.2, 'kruh')) === JSON.stringify({ tvar: 'kruh', x: 100, y: 200, w: 400, h: 400 }));
test('tah přes okraj se ořízne do snímku', JSON.stringify(T(-0.2, 0.9, 0.3, 1.4, 'ramecek')) === JSON.stringify({ tvar: 'ramecek', x: 0, y: 900, w: 300, h: 100 }));
test('kliknutí (kratší tah než mez) = žádná značka', T(0.5, 0.5, 0.502, 0.6) === null && T(0.5, 0.5, 0.6, 0.5) === null);
test('neznámý tvar z tahu = rámeček, výsledek projde ověřením', T(0.1, 0.1, 0.2, 0.2, 'x').tvar === 'ramecek' && Z([T(0.1, 0.1, 0.2, 0.2, 'kruh')]).ok);
test('nečíselný vstup tahu nespadne', T('a', null, 0.5, 0.5) && Z([T('a', null, 0.5, 0.5)]).ok);

/* ---------- #781 SVG přes snímek ---------- */
const S = P.pripominkaZnackySvg;
{
  const svg = S([R(), R({ tvar: 'kruh', x: 0, y: 0, w: 100, h: 50 })]);
  test('SVG: viewBox v promilích, roztažení na obrázek', /^<svg class="prip-znacky" viewBox="0 0 1000 1000" preserveAspectRatio="none"/.test(svg));
  test('SVG: rámeček = rect, kroužek = ellipse (s bílým obrysem)', (svg.match(/<rect /g) || []).length === 2 && (svg.match(/<ellipse /g) || []).length === 2
    && /<rect x="100" y="200" width="300" height="150"/.test(svg) && /<ellipse cx="50" cy="25" rx="50" ry="25"/.test(svg));
  test('SVG: tah stálé šířky i ve zvětšení', (svg.match(/vector-effect="non-scaling-stroke"/g) || []).length === 4);
  test('SVG: neplatné značky = nic (žádný text z dat)', S([R({ tvar: '"><img src=x onerror=alert(1)>' })]) === '' && S('x') === '' && S([]) === '');
  test('SVG: vlastní třída', /^<svg class="xy"/.test(S([R()], 'xy')));
}
test('počet slovem', P.pripominkaZnackyText(1) === '1 vyznačené místo' && P.pripominkaZnackyText(3) === '3 vyznačená místa'
  && P.pripominkaZnackyText(5) === '5 vyznačených míst' && P.pripominkaZnackyText(0) === '0 vyznačených míst');

/* ---------- #780 / #781 UI (zdroj) ---------- */
const ui = cti('ui/pripominky_ui.js');
test('#781 panel: tlačítko „Zakroužkovat problém na snímku" a 📍 výběr prvku zůstává',
  /Zakroužkovat problém na snímku/.test(ui) && /onclick="pripMistoZacni\(\)"/.test(ui) && /onclick="pripZnackyOtevri\(\)"/.test(ui));
test('#781 editor: Rámeček, Kroužek, Zpět, Smazat vše, Hotovo, Zrušit, Esc',
  /pripZnackyTvar\('\$\{escJs\(t\)\}'\)/.test(ui) && /nastroj\('ramecek'/.test(ui) && /nastroj\('kruh'/.test(ui)
  && /pripZnackyZpet\(\)/.test(ui) && /pripZnackySmaz\(\)/.test(ui) && /pripZnackyKonec\(true\)/.test(ui) && /pripZnackyKonec\(false\)/.test(ui)
  && /ev\.key === 'Escape'\) \{ ev\.preventDefault\(\); ev\.stopPropagation\(\); pripZnackyKonec\(false\)/.test(ui));
test('#781 odeslání: s vyznačením jde snímek z náhledu a značky, bez snímku žádné značky',
  /znacky\.length \? Promise\.resolve\(PRIP\.nahled\)/.test(ui) && /if \(telo\.snimek && znacky\.length\) telo\.znacky = znacky;/.test(ui));
test('#781 nový snímek maže značky starého', /PRIP\.znacky = \[\];\s+\/\/ #781: nový snímek/.test(ui));
test('#780/#781 snímek nezachytí editor ani zvětšení', /',#' \+ PRIP_ZN_ID \+ ',#' \+ PRIP_ZOOM_ID/.test(ui));
test('#781 správce: značky ze serveru do detailu i zvětšení', /PRIP\.sp\.znacky\[id\] = Array\.isArray\(d\.znacky\)/.test(ui)
  && /pripominkaZnackySvg\(zn\)/.test(ui) && /pripZoomOtevri\(obr, PRIP\.sp\.znacky\[id\] \|\| \[\]/.test(ui));
test('#780 zvětšení: kolečko, +/−, Přizpůsobit, 1:1, tažení, Esc', /addEventListener\('wheel', pripZoomKolecko, \{ passive: false \}\)/.test(ui)
  && /pripZoomKrok\(1 \/ 1\.25\)/.test(ui) && /pripZoomKrok\(1\.25\)/.test(ui) && /pripZoomPrizpusob\(\)/.test(ui) && /pripZoomSkutecna\(\)/.test(ui)
  && /'pointerdown', 'pointermove', 'pointerup', 'pointercancel'\]\.forEach\(t => plocha\.addEventListener\(t, pripZoomTah\)\)/.test(ui)
  && /ev\.key === 'Escape'\) \{ ev\.preventDefault\(\); ev\.stopPropagation\(\); pripZoomZavri\(\)/.test(ui));
test('#780 bez externích knihoven (žádný <script src>, žádné CDN)', !/<script[^>]+src=/i.test(ui) && !/https?:\/\/(?!www\.w3\.org\/)/.test(ui.replace(/\/\*[\s\S]*?\*\//g, '')));
test('reset po odhlášení zavře editor i zvětšení a smaže značky', /pripZnackyZavriTicho\(\); pripZoomZavri\(\);/.test(ui)
  && /vybira: false, znacky: \[\], zn: null,/.test(ui) && /snimky: \{\}, znacky: \{\}, nastaveni: null/.test(ui));

/* zvětšení: měřítko kolem bodu (čistá matematika, bez DOM) */
try {
  const kod = ui.slice(ui.indexOf('const PRIP_ZOOM ='), ui.indexOf('function pripSnimekRamHtml'))
    + ui.slice(ui.indexOf('function pripZoomNa('), ui.indexOf('function pripZoomKrok('));
  const ctx = { Math };
  vm.createContext(ctx);
  vm.runInContext(kod + '\nthis.Z = PRIP_ZOOM; this.na = pripZoomNa; function pripZoomPouzij() {}', ctx);
  ctx.Z.s = 1; ctx.Z.x = 10; ctx.Z.y = 20;
  const bod = (cx, cy) => [(cx - ctx.Z.x) / ctx.Z.s, (cy - ctx.Z.y) / ctx.Z.s];
  const pred = bod(300, 200);
  ctx.na(2.5, 300, 200);
  const po = bod(300, 200);
  test('#780 přiblížení drží bod pod kurzorem na místě', Math.abs(pred[0] - po[0]) < 1e-9 && Math.abs(pred[1] - po[1]) < 1e-9 && ctx.Z.s === 2.5, [pred, po]);
  ctx.na(100, 0, 0); test('#780 měřítko nejvýš 8×', ctx.Z.s === 8);
  ctx.na(0.001, 0, 0); test('#780 měřítko nejméně 0,1×', Math.abs(ctx.Z.s - 0.1) < 1e-12);
} catch (e) { test('#780 zvětšení: měřítko kolem bodu', false, e.message); }

/* ---------- #792 krycí list PROJ: společná karta ---------- */
const sod = cti('ui/sod_ui.js'), kp = cti('ui/kryci_proj_ui.js'), obj = cti('ui/objednavka_proj_ui.js');
test('#792 název karty zahrnuje objednávku', /const SOD_PROJ_KARTA_NAZEV = 'Objednávka, smlouva o dílo a plná moc \(PROJ\)';/.test(sod));
test('#792 samostatná karta „Objednávka / Smlouva (PROJ)" zrušena', !/Objednávka \/ Smlouva \(PROJ\)/.test(kp) && !/objednavkaProjKarta\(\)/.test(kp)
  && /card\(SOD_PROJ_KARTA_NAZEV, sodProjKarta\(\)\)/.test(kp));
{
  /* Karta složená v izolovaném kontextu: pořadí tlačítek a jazyk tisku u smlouvy. */
  try {
  const ctx = { esc: s => String(s), ukazkoveZabranaAttr: () => '', tiskJazykVyber: () => '<select class="JAZYK">Jazyk tisku</select>' };
  vm.createContext(ctx);
  vm.runInContext(obj.slice(obj.indexOf('function objednavkaProjPopis'), obj.indexOf('function objednavkaProjStavText'))
    + sod.slice(sod.indexOf('const SOD_PROJ_KARTA_NAZEV'), sod.indexOf('/* ---------- PRODÁNO')) + '\nthis.k = sodProjKarta();', ctx);
  const k = ctx.k;
  const tl = ['Náhled a tisk objednávky (PDF)', 'Vytvořit objednávku (Word)', 'Vytvořit plnou moc (Word)', 'Vytvořit smlouvu o dílo PROJ (Word)', 'class="JAZYK"'];
  const poz = tl.map(t => k.indexOf(t));
  test('#792 pořadí: objednávka PDF, objednávka Word, plná moc, SoD PROJ poslední, pak jazyk tisku',
    poz.every((x, i) => x >= 0 && (i === 0 || x > poz[i - 1])) && (k.match(/<button/g) || []).length === 4, poz);
  test('#792 popis objednávky přesunut do karty, stavové řádky všech tří dokumentů', /Objednávka<\/b> je stručný doklad/.test(k) && !/jednostránkov/.test(k)
    && /objednavkaProjStav/.test(k) && /sodStav_sodProj/.test(k) && /sodStav_plnaMoc/.test(k));
  test('#792 zábrany: objednávka objednavkaProj, smlouva sodProj, plná moc plnaMoc', /ukazkoveZabranaAttr\('objednavkaProj'\)/.test(obj)
    && /ukazkoveZabranaAttr\('sodProj'\)/.test(sod) && /ukazkoveZabranaAttr\('plnaMoc'\)/.test(sod));
  } catch (e) { test('#792 karta se složí', false, e.message); }
}

/* ---------- #793 „Co by se zapsalo do Pipedrive" jen pro administrátora ---------- */
{
  const pdn = cti('ui/pd_nanecisto_ui.js');
  try {
  const ctx = { ONLINE_STAV: { ja: { role: 'Obchodník' } }, NAST: {}, card: (t) => '<CARD>' + t + '</CARD>', pdnUiObsah: () => '', esc: s => String(s) };
  vm.createContext(ctx);
  vm.runInContext(pdn.slice(pdn.indexOf('function pdnUiSmi()'), pdn.indexOf('function pdnUiOnline()'))
    + pdn.slice(pdn.indexOf('function pdnUiNahledSmi'), pdn.indexOf('function pdnUiPrekresli'))
    + pdn.slice(pdn.indexOf('function pdnKarta(kde)'), pdn.indexOf('\n}', pdn.indexOf('function pdnKarta(kde)')) + 2), ctx);
  const role = (r, pravo) => { ctx.zobrazeniRole = () => r; ctx.smiZobrazit = () => pravo !== false; };
  role('Obchodník'); test('#793 KL: obchodník kartu nevidí', ctx.pdnKarta('ock') === '' && ctx.pdnKarta('proj') === '');
  role('Vedoucí'); test('#793 KL: vedoucí kartu nevidí', ctx.pdnKarta('ock') === '');
  role('Administrátor'); test('#793 KL: administrátor kartu vidí (OCK i PROJ)', /Co by se zapsalo do Pipedrive \(náhled, nic se neodesílá\)/.test(ctx.pdnKarta('ock'))
    && /pdnKarta_proj/.test(ctx.pdnKarta('proj')));
  role('Administrátor', false); test('#793 KL: administrátor bez práva crm.pipedrive nevidí', ctx.pdnKarta('ock') === '');
  test('#793 role podle zobrazeniRole (náhled cizí role = jako ta role)', /zobrazeniRole\(\) === 'Administrátor'/.test(pdn));
  test('#793 Prodej: sbalovací náhled jen pro administrátora', /function prodUiNahledHtml\(v, strana\) \{\s*\/\*[^*]*\*\/\s*if \(typeof pdnUiNahledSmi === 'function' && !pdnUiNahledSmi\(\)\) return '';/.test(sod));
  test('#793 zápis prodeje (#597) a odeslání (#116) se neomezují (pdnUiSmi beze změny)',
    /function pdnUiSmi\(\) \{ return typeof smiZobrazit !== 'function' \|\| smiZobrazit\('crm\.pipedrive'\); \}/.test(pdn)
    && /!\(typeof pdnUiSmi === 'function' && !pdnUiSmi\(\)\)/.test(cti('ui/odeslani_pd_ui.js')));
  } catch (e) { test('#793 karta Pipedrive se složí', false, e.message); }
}

console.log(`\n${ok} OK, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
