/* #548 — nález K10-S2 (audit K10, 1. 11. 2026): sestavená aplikace nesmí nést ceny.
 *
 * Do v2.11.2 nesla migrace ceníku můstků (#354 / #529 E) v `src/engine.js`
 * konstantu se SKUTEČNÝMI sazbami (materiál za bm, referenční šířka, sazba
 * a hodiny montáže) a se sestavením odcházela do veřejného `dist/*.html`.
 * Od #548:
 *   1) jádro zná jen jména klíčů (`MUSTKY_CENIK_KLICE`), žádnou sazbu,
 *   2) starý ceník (paušál) se při zveřejnění převede jen z PLATNÉHO ceníku
 *      ze serveru; bez zdroje se nic nevymýšlí,
 *   3) nulová / nepřevedená cena můstku se zveřejní jen na potvrzení správce
 *      (dialog; server u nového tvaru chce `mustkyPotvrzeno: true`).
 * Statická část: `dist/*.html` nenese u žádného klíče ceníku nenulové číslo
 * (výjimka: zákonné sazby DPH) — obecný test „dist bez cen". Test sám nese
 * jen smyšlená čísla (zkusebni_cenik.js).
 * Před opravou: oddíly 1, 2 (bez zdroje) a 4 selžou; po opravě projdou.
 * Spuštění: node src/test_548_mustky_bez_cen.js */
const fs = require('fs');
const path = require('path');
const E = require('./engine.js');
const EP = require('./engine_proj.js');
const ZC = require('./zkusebni_cenik.js');

let ok = 0, fail = 0;
const test = (n, c, info) => { if (c) { ok++; console.log('OK  ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info).slice(0, 400)); } };
const kop = x => JSON.parse(JSON.stringify(x));
const KOREN = path.join(__dirname, '..');

/* ---------- 1) jádro bez sazeb ---------- */
const ENGINE = fs.readFileSync(path.join(__dirname, 'engine.js'), 'utf8');
test('jádro nemá konstantu s výchozími sazbami můstků', !/MUSTKY_CENIK_VYCHOZI/.test(ENGINE) && E.MUSTKY_CENIK_VYCHOZI === undefined);
test('jádro zná jen jména šesti klíčů ceníku můstků', Array.isArray(E.MUSTKY_CENIK_KLICE)
  && E.MUSTKY_CENIK_KLICE.join() === 'mustekKc,mustekRefSirkaMm,mustekMontazHodKc,mustekMontazZakladHod,mustekMontazBmHod,mustekMontazMinHod');
/* Žádný zdroják klienta (src/ bez testů a zkušebního ceníku) nepřiřadí klíči
 * můstku nenulové číslo. */
{
  const zdroje = [];
  const projdi = d => fs.readdirSync(d, { withFileTypes: true }).forEach(e => {
    const p = path.join(d, e.name);
    if (e.isDirectory()) { if (!['fixtury', 'node_modules'].includes(e.name)) projdi(p); }
    else if (/\.js$/.test(e.name) && !/^test/.test(e.name) && e.name !== 'zkusebni_cenik.js') zdroje.push(p);
  });
  projdi(__dirname);
  const RE = /\bmustek(Kc|RefSirkaMm|MontazHodKc|MontazZakladHod|MontazBmHod|MontazMinHod)\s*:\s*[1-9]/;
  const nalez = zdroje.filter(f => RE.test(fs.readFileSync(f, 'utf8'))).map(f => path.relative(KOREN, f));
  test('zdrojáky klienta: žádný klíč můstku s nenulovou hodnotou (' + zdroje.length + ' souborů)', nalez.length === 0, nalez);
}

/* ---------- 2) migrace na smyšleném ceníku ---------- */
const V = ZC.zkusebniMustky();
const KONTROLA = E.mustkyCenikKontrola || (() => ({ ok: true, stary: false, chybi: [], text: '' }));
const KLICE = E.MUSTKY_CENIK_KLICE || Object.keys(V);   // před opravou jádro seznam nemá — test nesmí spadnout
const STARY = Object.assign(kop(E.DEFAULT_CENIK), ZC.zkusebniCenik());      // paušál (smyšlený)
const NOVY = Object.assign(kop(STARY), V);
{
  const c = kop(STARY), zpr = [];
  test('starý ceník + platný v novém tvaru → převod z platného ceníku',
    E.cenikMigraceMustku(c, NOVY, zpr) === true && KLICE.every(k => c[k] === V[k]) && zpr.length === 1, c);
  test('věta pro správce říká, že cena je z platného ceníku', /z platného ceníku/.test(zpr[0] || ''), zpr);
  const bez = kop(STARY), zpr2 = [];
  const pred = JSON.stringify(bez);
  test('starý ceník + platný také starý → nic se nevymýšlí, ceník beze změny',
    E.cenikMigraceMustku(bez, STARY, zpr2) === false && JSON.stringify(bez) === pred && zpr2.length === 0);
  test('bez platného ceníku vůbec → beze změny', E.cenikMigraceMustku(kop(STARY), null) === false
    && E.cenikMigraceMustku(kop(STARY), undefined) === false && E.cenikMigraceMustku(kop(STARY), {}) === false);
  const nul = Object.assign(kop(STARY), { mustekKc: 0 });
  E.cenikMigraceMustku(nul, Object.assign(kop(STARY), { mustekKc: 0 }));
  test('prázdné sestavení (DEFAULT_CENIK) se nepřevádí na nový tvar s nulami', !E.mustkyCenikNovy(nul), nul);
  /* Platný ceník v novém tvaru s nulovou montáží: převede se, kontrola ji ohlásí. */
  const platnyBezMont = Object.assign(kop(NOVY), { mustekMontazHodKc: 0 });
  const c3 = kop(STARY);
  E.cenikMigraceMustku(c3, platnyBezMont);
  test('převod z platného ceníku s nulovou sazbou montáže → kontrola ji hlásí',
    E.mustkyCenikNovy(c3) && !KONTROLA(c3).ok && KONTROLA(c3).chybi.includes('mustekMontazHodKc'),
    KONTROLA(c3));
}

/* ---------- 3) kontrola před zveřejněním ---------- */
{
  const K = KONTROLA;
  test('nový tvar, vše vyplněné → ok', K(NOVY).ok === true && K(NOVY).text === '');
  const n0 = Object.assign(kop(NOVY), { mustekKc: 0 });
  test('nový tvar s nulovou cenou za metr → neprojde, chybí C.mustekKc', !K(n0).ok && !K(n0).stary && K(n0).chybi.includes('mustekKc'), K(n0));
  const h0 = Object.assign(kop(NOVY), { mustekMontazZakladHod: 0, mustekMontazBmHod: 0, mustekMontazMinHod: 0 });
  test('nový tvar bez hodin montáže → neprojde, chybí hodiny', !K(h0).ok && K(h0).chybi.includes('hodiny'), K(h0));
  const jenMin = Object.assign(kop(NOVY), { mustekMontazZakladHod: 0, mustekMontazBmHod: 0 });
  test('nový tvar jen s minimem hodin → ok', K(jenMin).ok, K(jenMin));
  test('starý tvar s paušálem → neprojde bez potvrzení, text vyzve k vyplnění a řekne, že zůstane paušál',
    !K(STARY).ok && K(STARY).stary && /Nastavení → Ceník/.test(K(STARY).text) && /paušálem/.test(K(STARY).text), K(STARY));
  const s0 = Object.assign(kop(STARY), { mustekKc: 0 });
  test('starý tvar s nulovým paušálem → hlásí 0 Kč', !K(s0).ok && /0 Kč/.test(K(s0).text) && K(s0).chybi.includes('mustekKc'), K(s0));
  test('kontrola snese nesmysl na vstupu', K(null).ok === false && K('x').ok === false);
}

/* ---------- 4) dist bez cen (obecně pro klíče ceníku) ---------- */
{
  const klice = new Set();
  const sbirej = o => { for (const k in o) { klice.add(k); if (o[k] && typeof o[k] === 'object') sbirej(o[k]); } };
  sbirej(E.DEFAULT_CENIK);
  sbirej(EP.DEFAULT_CENIK_PROJ || {});
  KLICE.forEach(k => klice.add(k));
  /* Zákonné sazby DPH nejsou ceník firmy. */
  const POVOLENE = new Set(['dph', 'dphZakladni', 'dphSnizena']);
  const nenulove = H => {
    const hits = [];
    for (const k of klice) {
      if (POVOLENE.has(k) || !/^[A-Za-z_$][\w$]*$/.test(k)) continue;
      const re = new RegExp('[{,\\s]' + k + '\\s*:\\s*([0-9]*\\.?[0-9]+)', 'g');
      let m; while ((m = re.exec(H))) if (+m[1] !== 0) hits.push(k + ': ' + m[1].replace(/\d/g, '#'));
    }
    return hits;
  };
  /* Pojistka testu: kontrola chytí přesně ten tvar, který do v2.11.2 v sestavení byl. */
  test('pojistka: kontrola chytí konstantu se sazbou (smyšlené číslo)',
    nenulove('const X = {\n  mustekKc: 12345, mustekRefSirkaMm: 0 };').length === 1);
  const DIST = path.join(KOREN, 'dist');
  const soubory = fs.existsSync(DIST) ? fs.readdirSync(DIST).filter(f => /\.html$/.test(f)) : [];
  if (!soubory.length) console.log('  (dist/*.html zatím není – kontrola sestavení se přeskočila)');
  for (const f of soubory) {
    const H = fs.readFileSync(path.join(DIST, f), 'utf8');
    test('dist/' + f + ': žádná konstanta výchozích sazeb můstků', !/MUSTKY_CENIK_VYCHOZI/.test(H));
    const hits = nenulove(H);
    test('dist/' + f + ': žádný klíč ceníku s nenulovou hodnotou (' + klice.size + ' klíčů)', hits.length === 0, hits);
  }
}

/* ---------- 5) dialog a server ---------- */
{
  const PU = fs.readFileSync(path.join(__dirname, 'ui', 'program_ui.js'), 'utf8');
  const OU = fs.readFileSync(path.join(__dirname, 'ui', 'online_ui.js'), 'utf8');
  const SRV = fs.readFileSync(path.join(KOREN, 'netlify', 'functions', 'program.mjs'), 'utf8');
  test('dialog: progMustkyPotvrd volá kontrolu a ptá se správce', /async function progMustkyPotvrd\(ctx\)/.test(PU)
    && /mustkyCenikKontrola\(ctx\.cenik\)/.test(PU) && /await potvrd\(/.test(PU) && /ctx\.mustkyPotvrzeno = true/.test(PU));
  test('zveřejnění do složky se ptá', /if \(!await progMustkyPotvrd\(ctx\)\) return Promise\.resolve\(false\);/.test(PU));
  test('zveřejnění online se ptá a potvrzení pošle serveru', /!await progMustkyPotvrd\(ctx\)/.test(OU)
    && /mustkyPotvrzeno: ctx\.mustkyPotvrzeno === true/.test(OU));
  test('server převádí z platného ceníku a nový tvar s nulovou cenou bez potvrzení odmítne',
    /cenikMigraceMustku\(ctx\.cenik, platny && platny\.cenik\)/.test(SRV) && /t\.mustkyPotvrzeno !== true/.test(SRV)
    && /kod: 'mustky'/.test(SRV));
}

console.log(`\n${ok} OK, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
