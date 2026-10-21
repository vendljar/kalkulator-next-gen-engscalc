/* ŠABLONA PROJ v7 — JAZYKOVÉ VERZE: ZÁVORKA PŘED SYMBOLEM (S10, 20. 10. 2026)
 *
 * Výroba v7 ze skutečné šablony (Disk, v5 → v6 → v7) dala EN/DE/FR, v nichž
 * zůstal česky nadpis „CENA ZA DOKUMENTACI PRO POVOLENÍ ZÁMĚRU (DPZ)
 * {{PROJ_DPZ_HVEZDICKA_ZNACKA}}:". docxPrelozUseky (src/docxgen.js) odřízne
 * před překladem úseku koncovou „)" a slovník „… (DPZ" nezná. Syntetická
 * šablona D1 to nezachytila — kontrolovala jen českou v7.
 *
 * Oprava je v nástroji (nastroje/vyrob_sablony.js: trStavSeZavorkou,
 * prelozSablonu), kód aplikace se v dávce šablon neměnil. Sada hlídá:
 *   – že bez obalu odstavec zůstane česky (stav aplikace — kdyby se docxgen
 *     opravil, test to ohlásí a obal půjde pryč),
 *   – že s obalem je nadpis přeložený ve všech třech jazycích a symbol
 *     i dvojtečka zůstaly na místě,
 *   – že obal nemění nic jiného (známé texty, vyvážené závorky, neznámé),
 *   – že prelozSablonu vrátí globální trStav i po chybě.
 * Před opravou sada selže na první kontrole (nástroj obal neexportuje).
 *
 * Spuštění: cd src && node test_sablona_proj_v7_preklad.js */
const path = require('path');
const nacti = (f) => { const m = require(f); Object.keys(m).forEach(k => { if (global[k] === undefined) global[k] = m[k]; }); return m; };
const PR = nacti('./preklad.js');
const dg = nacti('./docxgen.js');

let ok = 0, fail = 0;
const test = (n, cond, info) => { if (cond) { ok++; console.log('OK   ' + n); }
  else { fail++; console.log('FAIL ' + n + (info !== undefined ? ' — ' + JSON.stringify(info).slice(0, 300) : '')); } };

let VS = null;
try { VS = require(path.join(__dirname, '..', 'nastroje', 'vyrob_sablony.js')); } catch (e) { /* nic */ }
test('nastroje/vyrob_sablony.js exportuje trStavSeZavorkou a prelozSablonu',
  !!(VS && typeof VS.trStavSeZavorkou === 'function' && typeof VS.prelozSablonu === 'function'));

const NADPIS = 'CENA ZA DOKUMENTACI PRO POVOLENÍ ZÁMĚRU (DPZ)';
const odst = '<w:p><w:pPr><w:jc w:val="left"/></w:pPr><w:r><w:rPr><w:b/></w:rPr><w:t>' + NADPIS + '</w:t></w:r>'
  + '<w:r><w:rPr><w:b/></w:rPr><w:t>{{PROJ_DPZ_HVEZDICKA_ZNACKA}}</w:t></w:r><w:r><w:rPr><w:b/></w:rPr><w:t>:</w:t></w:r></w:p>';
const xml = '<w:document><w:body>' + odst + '</w:body></w:document>';
const text = x => dg.odstavecText(x.slice(x.indexOf('<w:p>'), x.indexOf('</w:p>') + 6));
const OCEK = { en: 'PRICE FOR THE DOCUMENTATION FOR THE PROJECT PERMIT (DPZ){{PROJ_DPZ_HVEZDICKA_ZNACKA}}:',
  de: 'PREIS FÜR DIE UNTERLAGEN ZUR VORHABENGENEHMIGUNG (DPZ){{PROJ_DPZ_HVEZDICKA_ZNACKA}}:',
  fr: "PRIX DU DOSSIER DE DEMANDE D'AUTORISATION (DPZ){{PROJ_DPZ_HVEZDICKA_ZNACKA}}:" };

/* stav aplikace: bez obalu odstavec zůstane česky (do pokrytí se nepočítá) */
{
  const st = {}; const x = dg.docxPrelozXml(xml, 'en', st);
  test('bez obalu (docxgen): nadpis se symbolem zůstane česky a hlásí se v symbolove',
    text(x) === NADPIS + '{{PROJ_DPZ_HVEZDICKA_ZNACKA}}:' && (st.symbolove || []).length === 1, { t: text(x), st });
}
if (VS && VS.trStavSeZavorkou) {
  const puvodni = global.trStav;
  for (const L of ['en', 'de', 'fr']) {
    global.trStav = VS.trStavSeZavorkou(puvodni);
    const st = {};
    let x;
    try { x = dg.docxPrelozXml(xml, L, st); } finally { global.trStav = puvodni; }
    test(L + ': s obalem nadpis přeložený, symbol a dvojtečka na místě', text(x) === OCEK[L], text(x));
    test(L + ': s obalem nic česky, tučné písmo zůstává', !(st.symbolove || []).length && (x.match(/<w:b\/>/g) || []).length === 3, st);
  }
  const ob = VS.trStavSeZavorkou(puvodni);
  const stejne = (cz, L) => JSON.stringify(ob(cz, L)) === JSON.stringify(puvodni(cz, L));
  test('obal: známý text beze změny', stejne(NADPIS, 'en') && stejne('STUDIE PROVEDITELNOSTI', 'de'));
  test('obal: vyvážené závorky beze změny (i neznámý text)', stejne('Neznámý text (XYZ) bez překladu', 'en'));
  test('obal: neznámý text s „(" zůstane nepřeložený', ob('Úplně neznámá věta (abc', 'en').prelozeno === false);
  test('obal: „… (DPZ" → překlad bez koncové „)"', ob('CENA ZA DOKUMENTACI PRO POVOLENÍ ZÁMĚRU (DPZ', 'en').text === 'PRICE FOR THE DOCUMENTATION FOR THE PROJECT PERMIT (DPZ');
}
if (VS && VS.prelozSablonu) {
  (async () => {
    const puvodni = global.trStav;
    let e = '';
    try { await VS.prelozSablonu(new Uint8Array([1, 2, 3]), 'en', {}); } catch (x) { e = x.message; }
    test('prelozSablonu: chyba (vadný soubor) projde ven a trStav se vrátí', !!e && global.trStav === puvodni, e);
    console.log('\n' + ok + ' OK, ' + fail + ' FAIL');
    process.exit(fail ? 1 : 0);
  })();
} else {
  console.log('\n' + ok + ' OK, ' + fail + ' FAIL');
  process.exit(fail ? 1 : 0);
}
