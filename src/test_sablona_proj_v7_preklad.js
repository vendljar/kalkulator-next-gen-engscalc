/* ŠABLONA PROJ v7 — JAZYKOVÉ VERZE: ZÁVORKA PŘED SYMBOLEM (S10, 20. 10. 2026)
 *
 * Výroba v7 ze skutečné šablony (Disk, v5 → v6 → v7) dala EN/DE/FR, v nichž
 * zůstal česky nadpis „CENA ZA DOKUMENTACI PRO POVOLENÍ ZÁMĚRU (DPZ)
 * {{PROJ_DPZ_HVEZDICKA_ZNACKA}}:". docxPrelozUseky (src/docxgen.js) odřízne
 * před překladem úseku koncovou „)" a slovník „… (DPZ" nezná. Syntetická
 * šablona D1 to nezachytila — kontrolovala jen českou v7.
 *
 * Oprava byla nejdřív v nástroji (obal slovníku trStavSeZavorkou v
 * nastroje/vyrob_sablony.js), v O13 se „)" hned za úsekem přenesla do
 * aplikace a v D5 (#485, 22. 10. 2026) i „)" AŽ ZA SYMBOLEM — obal zanikl.
 * Sada hlídá:
 *   – že aplikace (docxPrelozUseky) nadpis přeloží bez obalu,
 *   – že nad slovníkovými texty končícími „)" dává aplikace ve všech vzorech
 *     se „)" v dokumentu TÝŽ výsledek jako dřívější obal (jeho kód je níž
 *     jako vzor k porovnání) — 5 vzorů × texty × EN/DE/FR, 0 rozdílů,
 *   – že text bez „)" v dokumentu zůstane česky (O13 — nic se nedoplňuje),
 *   – že nástroj obal nemá a překládá kódem aplikace.
 * Pojistka #485: před D5 vzory „(…{{X}})" 549 rozdílů z 675 → FAIL.
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
test('nastroje/vyrob_sablony.js: obal trStavSeZavorkou zanikl, prelozSablonu zůstává (#485)',
  !!(VS && typeof VS.prelozSablonu === 'function' && VS.trStavSeZavorkou === undefined));

const NADPIS = 'CENA ZA DOKUMENTACI PRO POVOLENÍ ZÁMĚRU (DPZ)';
const odst = '<w:p><w:pPr><w:jc w:val="left"/></w:pPr><w:r><w:rPr><w:b/></w:rPr><w:t>' + NADPIS + '</w:t></w:r>'
  + '<w:r><w:rPr><w:b/></w:rPr><w:t>{{PROJ_DPZ_HVEZDICKA_ZNACKA}}</w:t></w:r><w:r><w:rPr><w:b/></w:rPr><w:t>:</w:t></w:r></w:p>';
const xml = '<w:document><w:body>' + odst + '</w:body></w:document>';
const text = x => dg.odstavecText(x.slice(x.indexOf('<w:p>'), x.indexOf('</w:p>') + 6));
const OCEK = { en: 'PRICE FOR THE DOCUMENTATION FOR THE PROJECT PERMIT (DPZ){{PROJ_DPZ_HVEZDICKA_ZNACKA}}:',
  de: 'PREIS FÜR DIE UNTERLAGEN ZUR VORHABENGENEHMIGUNG (DPZ){{PROJ_DPZ_HVEZDICKA_ZNACKA}}:',
  fr: "PRIX DU DOSSIER DE DEMANDE D'AUTORISATION (DPZ){{PROJ_DPZ_HVEZDICKA_ZNACKA}}:" };

/* O13 (21. 10. 2026): docxPrelozUseky přeloží nadpis „… (DPZ){{…}}:".
 * Pojistka: před O13 tu byly 3 FAIL (nadpis česky, hlášený v symbolove). */
for (const L of ['en', 'de', 'fr']) {
  const st = {}; const x = dg.docxPrelozXml(xml, L, st);
  test(L + ': aplikace přeloží „… (DPZ){{…}}:", symbol a dvojtečka na místě',
    text(x) === OCEK[L] && !(st.symbolove || []).length && (x.match(/<w:b\/>/g) || []).length === 3, { t: text(x), st });
}
{
  const odst2 = '<w:p><w:r><w:t>Úplně neznámá věta (abc</w:t></w:r><w:r><w:t>{{X}}</w:t></w:r></w:p>';
  const st = {}; const x = dg.docxPrelozXml('<w:document><w:body>' + odst2 + '</w:body></w:document>', 'en', st);
  test('aplikace: neznámý text s „(" zůstane česky', text(x) === 'Úplně neznámá věta (abc{{X}}', text(x));
  const odst3 = '<w:p><w:r><w:t>' + NADPIS.slice(0, -1) + '</w:t></w:r><w:r><w:t>{{X}}</w:t></w:r></w:p>';
  const x3 = dg.docxPrelozXml('<w:document><w:body>' + odst3 + '</w:body></w:document>', 'en', {});
  test('aplikace: „… (DPZ" bez „)" v dokumentu se nedoplňuje (zůstane česky)', text(x3) === NADPIS.slice(0, -1) + '{{X}}', text(x3));
  const x4 = dg.docxPrelozXml('<w:document><w:body><w:p><w:r><w:t>' + NADPIS.slice(0, -1) + '</w:t></w:r><w:r><w:t>{{X}}</w:t>'
    + '<w:tab/><w:t>)</w:t></w:r></w:p></w:body></w:document>', 'en', {});
  test('aplikace: „)" za tabulátorem k úseku nepatří (zůstane česky)', text(x4) === NADPIS.slice(0, -1) + '{{X}})', text(x4));
}
/* #485 (D5): „(…{{SYMBOL}})" — závorka až za symbolem. */
for (const L of ['en', 'de', 'fr']) {
  const xs = '<w:document><w:body><w:p><w:r><w:t>' + NADPIS.slice(0, -1) + '</w:t></w:r><w:r><w:t>{{X}}</w:t></w:r><w:r><w:t>)</w:t></w:r></w:p></w:body></w:document>';
  const st = {}; const t = text(dg.docxPrelozXml(xs, L, st));
  test(L + ': #485 aplikace přeloží „… (DPZ{{X}})" (závorka za symbolem)', t === OCEK[L].replace('(DPZ){{PROJ_DPZ_HVEZDICKA_ZNACKA}}:', '(DPZ{{X}})')
    && !(st.symbolove || []).length, { t, st });
}

/* VZOR K POROVNÁNÍ: obal nástroje šablon, jak byl do D5 (nastroje/vyrob_sablony.js). */
function trStavSeZavorkou(puvodni) {
  return (cz, lang) => {
    const st = puvodni(cz, lang);
    if (st && st.prelozeno) return st;
    const s = String(cz), poc = re => (s.match(re) || []).length;
    if (poc(/\(/g) !== poc(/\)/g) + 1 || /\)\s*$/.test(s)) return st;
    const z = puvodni(s + ')', lang);
    if (!z || !z.prelozeno || z.zdroj === 'neutrální' || !/\)\s*$/.test(z.text)) return st;
    return Object.assign({}, z, { text: String(z.text).replace(/\)\s*$/, '') });
  };
}
{
  const puvodni = global.trStav, ob = trStavSeZavorkou(puvodni);
  const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const run = t => '<w:r><w:t xml:space="preserve">' + esc(t) + '</w:t></w:r>';
  const VZORY = {
    '(…{{X}})': b => run(b) + run('{{X}}') + run(')'),
    '(…{{X}}):': b => run(b) + run('{{X}}') + run('):'),
    '(…{{X}} {{Y}})': b => run(b) + run('{{X}} {{Y}}') + run(')'),
    '(…){{X}}': b => run(b + ')') + run('{{X}}'),
    '(…){{X}}:': b => run(b + ')') + run('{{X}}') + run(':'),
  };
  const klice = Object.keys(PR.PREKLAD).filter(k => /\)\s*$/.test(k) && k.includes('('));
  const stat = () => ({ celkem: 0, prelozeno: 0, neutralni: 0, chybi: [], symbolove: [] });
  const preloz = (xs, L, tr) => { global.trStav = tr; try { return text(dg.docxPrelozXml(xs, L, stat())); } finally { global.trStav = puvodni; } };
  let por = 0, roz = 0, prelozenych = 0; const uk = [];
  for (const [n, f] of Object.entries(VZORY)) for (const cz of klice) for (const L of ['en', 'de', 'fr']) {
    const bez = cz.replace(/\)\s*$/, '');
    const xs = '<w:document><w:body><w:p>' + f(bez) + '</w:p></w:body></w:document>';
    const a = preloz(xs, L, puvodni), b = preloz(xs, L, ob);
    por++;
    if (a !== b) { roz++; if (uk.length < 3) uk.push({ n, cz, L, a, b }); }
    if (!a.startsWith(bez)) prelozenych++;
  }
  test('#485: aplikace = dřívější obal ve všech vzorech se „)" v dokumentu (' + por + ' porovnání, ' + klice.length + ' textů)',
    klice.length >= 50 && por === klice.length * 15 && roz === 0, { roz, uk });
  test('#485: porovnání není prázdné — většina textů se opravdu přeloží', prelozenych > por / 2, { prelozenych, por });
  /* Bez „)" v dokumentu se aplikace a obal liší záměrně (O13): obal by
   * přeložil, aplikace nechá česky — nic se nedoplňuje. */
  const jenSeZavorkou = klice.filter(cz => !cz.includes('{{')).filter(cz => { const bez = cz.replace(/\)\s*$/, ''); const st = puvodni(bez, 'en'); return !(st && st.prelozeno); });
  const bezZ = jenSeZavorkou.filter(cz => { const bez = cz.replace(/\)\s*$/, '');
    return preloz('<w:document><w:body><w:p>' + run(bez) + run('{{X}}') + '</w:p></w:body></w:document>', 'en', puvodni).startsWith(bez); }).length;
  test('#485: bez „)" v dokumentu zůstane text, který slovník zná jen se „)", česky (O13)', jenSeZavorkou.length > 50 && bezZ === jenSeZavorkou.length,
    { bezZ, n: jenSeZavorkou.length });
}
/* Nástroj šablon překládá kódem aplikace: „(…{{X}})" v .docx → EN (#485). */
(async () => {
  if (VS && VS.prelozSablonu) {
    const enc = new TextEncoder();
    const doc = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>'
      + '<w:p><w:r><w:t>' + NADPIS.slice(0, -1) + '</w:t></w:r><w:r><w:t>{{X}}</w:t></w:r><w:r><w:t>)</w:t></w:r></w:p></w:body></w:document>';
    let t = '', e = '';
    try {
      const bajty = new Uint8Array(await (await dg.zipZapis([{ nazev: 'word/document.xml', data: enc.encode(doc) }])).arrayBuffer());
      const out = await VS.prelozSablonu(bajty, 'en', {});
      const pol = await dg.zipPrecti(new Uint8Array(await out.arrayBuffer()));
      t = text(new TextDecoder().decode(pol.find(x => x.nazev === 'word/document.xml').data));
    } catch (x) { e = x.message; }
    test('nástroj: prelozSablonu přeloží „… (DPZ{{X}})" kódem aplikace', t === 'PRICE FOR THE DOCUMENTATION FOR THE PROJECT PERMIT (DPZ{{X}})', { t, e });
  }
  console.log('\n' + ok + ' OK, ' + fail + ' FAIL');
  process.exit(fail ? 1 : 0);
})();
