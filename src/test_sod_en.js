/* SMLOUVA O DÍLO V ANGLIČTINĚ (#157, dávka V3, 17. 10. 2026).
 *
 * Rozhodnutí J. V. 16. 10. 2026: anglická SoD = překlad české šablony
 * (zveřejní se jako jazyková verze EN v Nastavení → Šablony), jazyk se volí
 * u tlačítka jako u nabídek. Hlídá se:
 *   – hodnoty, které do šablony skládá aplikace, jsou v jazyce smlouvy:
 *     seznam splátek SoD realizace, věty plateb SoD PROJ, druh místa plnění,
 *   – částky v eurech (pravidla nabídky #155), jméno souboru s _EN,
 *   – čeština beze změny (stejné věty jako před #157),
 *   – bez jazykové šablony smlouva v cizím jazyce nevznikne (sodJazykZabrana),
 *   – generování Wordu ze SMYŠLENÉ anglické šablony (žádný firemní text):
 *     symboly vyplněné, splátky rozvinuté do odstavců, nic českého.
 * Před opravou: 8 prošlo / 10 selhalo (české řádky splátek a plateb, „bytový
 * dům", chybějící sodJazykZabrana); po opravě 18 / 0. Část 2b (DE/FR,
 * 18. 10.) hlídá slovník z v17.10.6 — mutace hesel DE/FR ji shodí.
 *
 * Spuštění: cd src && node test_sod_en.js */
const nacti = (f) => { const m = require(f); Object.keys(m).forEach(k => { if (global[k] === undefined) global[k] = m[k]; }); return m; };
const ZC = require('./zkusebni_cenik.js');
nacti('./format.js');
nacti('./preklad.js');
const dg = nacti('./docxgen.js');
nacti('./engine.js');
global.DEFAULT_CENIK = Object.assign(ZC.zkusebniCenik(), { kurzEurKc: 25 });
nacti('./engine_proj.js');
global.DEFAULT_CENIK_PROJ = ZC.zkusebniCenikProj();
['./techspec.js', './sleva.js', './zaokrouhleni.js', './firma.js', './zpracovatel.js', './plan_plateb.js',
  './nabidka_proj.js'].forEach(nacti);
const zk = nacti('./zakazka.js');
nacti('./zamek.js');
nacti('./kryci.js');
nacti('./kryci_proj.js');
const dok = nacti('./dokumenty.js');
nacti('./nabidka.js');
const sod = nacti('./sod.js');
const JEKLY = JSON.parse(require('fs').readFileSync(__dirname + '/jekly.json', 'utf8'));

let ok = 0, fail = 0;
const test = (n, cond, info) => { if (cond) { ok++; console.log('OK   ' + n); } else { fail++; console.log('FAIL ' + n, info === undefined ? '' : (typeof info === 'string' ? info.slice(0, 600) : JSON.stringify(info))); } };
const hazi = (fn) => { try { fn(); return ''; } catch (e) { return e.message || String(e); } };
const CESKY = /[ěščřžůťďň]/i;

global.NAST = { firma: global.firmaDefault() };
/* číslo OPR = jen realizace, OVP = projekce (zámek strany P6) */
const novaZ = (cislo) => {
  const z = zk.novaZakazka(); z.cislo = cislo || '2026 - OPR - CN - 0405';
  z.varianty[0].data.proj.cenik = Object.assign(ZC.zkusebniCenikProj(), { kurzEurKc: 25 });
  const v = z.varianty[0];
  v.data.kryci = { hodnoty: { sodMistoPlneni: 'bytový dům' } };
  return z;
};
const sablona = (...symboly) => ({ symboly: new Set(symboly) });

/* 1) SoD realizace anglicky */
{
  const z = novaZ(), v = z.varianty[0];
  const fn = typeof sod.sodData === 'function' ? sod.sodData : null;
  const d = fn(z, v, JEKLY, 'en', sablona('SOD_PLATEBNI_KALENDAR', 'CENA_BEZ_DPH'));
  const P = d.placeholders;
  const radky = String(P.SOD_PLATEBNI_KALENDAR || '').split('\n');
  test('EN: seznam splátek má tři řádky', radky.length === 3, P.SOD_PLATEBNI_KALENDAR);
  test('EN: řádky splátek bez češtiny', !CESKY.test(P.SOD_PLATEBNI_KALENDAR || 'ě'), P.SOD_PLATEBNI_KALENDAR);
  test('EN: záloha „upon conclusion of this contract for work – 50 % of the total price of the Work"',
    radky[0] === 'upon conclusion of this contract for work – 50 % of the total price of the Work', radky[0]);
  test('EN: konečná splátka „… – the remaining 10 % of the total price of the Work"',
    /^after completion of the entire Work .* – the remaining 10 % of the total price of the Work$/.test(radky[2] || ''), radky[2]);
  test('EN: druh místa plnění přeložený se členem', P.SOD_MISTO_PLNENI_DRUH === 'an apartment building', P.SOD_MISTO_PLNENI_DRUH);
  test('EN: cena v eurech', /^€ [\d\s ]+$/.test(P.CENA_BEZ_DPH || ''), P.CENA_BEZ_DPH);
  test('EN: jméno souboru končí _EN', /_EN$/.test(d.nazevSouboru), d.nazevSouboru);
  /* čeština beze změny */
  const c = fn(z, v, JEKLY, 'cz', sablona('SOD_PLATEBNI_KALENDAR')).placeholders;
  test('CZ: věty splátek beze změny', c.SOD_PLATEBNI_KALENDAR === 'při uzavření této smlouvy o dílo 50 % z celkové ceny díla\n'
    + 'po zahájení montáže 40 % z celkové ceny díla\n'
    + 'po provedení celého díla zhotovitele a jeho předání a převzetí bez vad a nedodělků bránících provozu výtahu zbývajících 10 % z celkové ceny díla',
    c.SOD_PLATEBNI_KALENDAR);
  test('CZ: druh místa plnění česky', c.SOD_MISTO_PLNENI_DRUH === 'bytový dům', c.SOD_MISTO_PLNENI_DRUH);
}

/* 2) SoD projekce anglicky */
{
  const z = novaZ('2026 - OVP - CN - 404'), v = z.varianty[0];
  const d = sod.sodProjData(z, v, 'en', sablona('SODP_PLATEBNI_KALENDAR', 'PROJ_CELKEM_BEZ_DPH'));
  const k = String(d.placeholders.SODP_PLATEBNI_KALENDAR || '');
  test('EN PROJ: seznam plateb existuje a je bez češtiny', k && !CESKY.test(k), k);
  test('EN PROJ: řádek „Payment after signing the contract / order – € … + VAT."',
    /^Payment after signing the contract \/ order – € [\d\s ]+ \+ VAT\.$/.test(k.split('\n')[0]), k.split('\n')[0]);
  const soucet = k.split('\n').map(r => +((/€ ([\d\s ]+) \+/.exec(r) || [])[1] || '0').replace(/[\s ]/g, '')).reduce((a, b) => a + b, 0);
  const cena = +String(d.placeholders.PROJ_CELKEM_BEZ_DPH || '').replace(/[^\d]/g, '');
  test('EN PROJ: součet plateb = cena díla v eurech', soucet > 0 && soucet === cena, [soucet, d.placeholders.PROJ_CELKEM_BEZ_DPH]);
  const c = sod.sodProjData(z, v, 'cz', sablona('SODP_PLATEBNI_KALENDAR')).placeholders.SODP_PLATEBNI_KALENDAR;
  test('CZ PROJ: věta „Platba ve výši … Kč + DPH proběhne …" beze změny', /^Platba ve výši [\d\s ]+,\d\d Kč \+ DPH proběhne po podpisu smlouvy \/ objednávky\.$/.test(String(c).split('\n')[0]), c);
}

/* 2b) němčina a francouzština (rozhodnutí J. V. 18. 10. 2026 — šablony
 * SoD i v DE a FR): hodnoty skládané aplikací jsou ve slovníku pro všechny
 * tři jazyky už od v17.10.6, tady se to jen hlídá. */
{
  const z = novaZ(), v = z.varianty[0];
  const de = sod.sodData(z, v, JEKLY, 'de', sablona('SOD_PLATEBNI_KALENDAR')).placeholders;
  test('DE: splátky bez češtiny, místo plnění „ein Wohngebäude"', !CESKY.test(de.SOD_PLATEBNI_KALENDAR || 'ě') && de.SOD_MISTO_PLNENI_DRUH === 'ein Wohngebäude'
    && /des Gesamtpreises des Werks$/.test(de.SOD_PLATEBNI_KALENDAR || ''), [de.SOD_PLATEBNI_KALENDAR, de.SOD_MISTO_PLNENI_DRUH]);
  const zp = novaZ('2026 - OVP - CN - 404');
  const fr = String(sod.sodProjData(zp, zp.varianty[0], 'fr', sablona('SODP_PLATEBNI_KALENDAR')).placeholders.SODP_PLATEBNI_KALENDAR || '');
  test('FR PROJ: platby bez češtiny, „Paiement … + TVA."', fr && !CESKY.test(fr) && /^Paiement .* – € [\d\s ]+ \+ TVA\.$/.test(fr.split('\n')[0]), fr);
}

/* 3) bez jazykové šablony smlouva nevznikne */
{
  const z = typeof sod.sodJazykZabrana === 'function' ? sod.sodJazykZabrana : () => '';
  const t = z('sod', 'en', false);
  test('EN bez šablony: srozumitelná hláška s cestou k nápravě',
    /nevznikne/.test(t) && /Nastavení → Šablony/.test(t) && /EN/.test(t) && /česky/.test(t), t);
  test('EN se šablonou / česky / plná moc: bez zábrany',
    z('sod', 'en', true) === '' && z('sodProj', 'cz', false) === '' && z('plnaMoc', 'en', false) === '' && z('sodProj', 'de', false) !== '', '');
}

/* 4) Word ze smyšlené anglické šablony (žádný firemní text) */
(async () => {
  const enc = new TextEncoder();
  const p = (t) => '<w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="3"/></w:numPr></w:pPr><w:r><w:t xml:space="preserve">' + t + '</w:t></w:r></w:p>';
  const telo = ['TEST CONTRACT No. {{SOD_CISLO_SMLOUVY}}', 'Site: {{SOD_MISTO_PLNENI_DRUH}} at {{ADRESA}}',
    'Price: {{CENA_BEZ_DPH}} (excluding VAT)', 'Instalments:', '{{SOD_PLATEBNI_KALENDAR}}',
    'Warranty {{SOD_ZARUKA_MESICU}} months'].map(p).join('');
  const xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>'
    + telo + '</w:body></w:document>';
  const buf = await (await dg.zipZapis([{ nazev: 'word/document.xml', data: enc.encode(xml) }])).arrayBuffer();
  const z = novaZ(), v = z.varianty[0];
  z.adresa = 'Testovací 1, Praha';
  let res = null, chyba = '';
  try { res = await dok.dokumentVygeneruj('sod', buf, z, v, JEKLY, 'en'); } catch (e) { chyba = e.message; }
  test('Word EN ze smyšlené šablony vznikl', !!res, chyba);
  if (res) {
    const text = (await dg.docxTextSablony(await res.blob.arrayBuffer())).join('\n');
    test('Word EN: splátky rozvinuté do tří odstavců', (text.match(/of the total price of the Work/g) || []).length === 3, text);
    test('Word EN: žádný český text z aplikace (mimo adresu stavby) a cena v eurech',
      !CESKY.test(text.replace(/Testovací 1, Praha/, '')) && /Price: € /.test(text) && /an apartment building/.test(text), text);
  } else { test('Word EN: splátky rozvinuté do tří odstavců', false); test('Word EN: žádný český text', false); }
  console.log('\n' + ok + ' prošlo, ' + fail + ' selhalo');
  process.exit(fail ? 1 : 0);
})();
