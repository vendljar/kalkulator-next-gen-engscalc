/* SoD REALIZACE v5 — VÍC ŠACHET VE SMLOUVĚ (C2 #583, rozhodnutí J. V. 11. 11. 2026, B0.4).
 *
 * Hlídá se:
 *   A) nástroj `vyrob_sablony.js --sod-real-v5` (sodRealV5) nad SMYŠLENÝM úryvkem
 *      (žádný firemní text): za první neprázdný odstavec čl. II odstavec
 *      {{SACHTY_SOD_PREDMET}}, za odstavec se {{SOD_CENA_NABIDKY}} odstavec
 *      {{SACHTY_SOD_ROZPIS}} — bez číslování, symbol v jednom běhu, pořadí w:pPr
 *      podle schématu; text předmětu v jednom i ve víc bězích; mimo nové
 *      odstavce = vstup bajt po bajtu; kotva chybí / dvakrát / šablona už v5
 *      / není v4 → chyba (nic se nehádá),
 *   B) vyplnění jako aplikace (dokumentVygeneruj): jedna šachta → oba odstavce
 *      zmizí (text = v4), víc šachet → předmět vyjmenuje varianty a kusy, rozpis
 *      odstavec na variantu, součet řádků = cena díla před slevou (vsVystup),
 *      i s objednanými příplatky; EN/DE/FR bez českých slov,
 *   C) upozornění u staré šablony (bez {{SACHTY_SOD_PREDMET}}): víc šachet →
 *      d.upozorneni = SOD_SACHTY_BEZ_SABLONY, tisk projde; bez informace
 *      o šabloně a u jedné šachty mlčí,
 *   D) se skutečnými šablonami (KNG_PODKLADY, Sablona_SOD_REALIZACE_v4* a v5*
 *      v podklady/sablony_vystup nebo KNG_PODKLADY): jedna šachta — Word z v5 =
 *      Word z v4 (text všech odstavců) v CZ/EN/DE/FR; víc šachet — šachty ve Wordu.
 * Pojistka: nad bází aa445a1 sada padá (sodRealV5 neexistuje; generátor maže
 * odstavce SACHTY_SOD_* smyčkou CN) — počty ve zprávě commitu.
 * Spuštění: node src/test_sod_v5.js */
'use strict';
const path = require('path');
const fs = require('fs');
const CORE = ['build_info.js', 'nazvy_souboru.js', 'preklad.js', 'format.js', 'engine.js', 'vice_sachet.js', 'engine_proj.js', 'techspec.js',
  'zakazka.js', 'uloziste.js', 'retence_zaloh.js', 'zamek.js', 'seznam.js', 'archiv.js', 'docxgen.js', 'xlsx.js', 'dokumenty.js',
  'sleva.js', 'schvalovani.js', 'zaokrouhleni.js', 'marze.js', 'kontroly.js', 'ares.js', 'poznamky.js', 'protokol.js', 'firma.js',
  'zpracovatel.js', 'podminky.js', 'plan_plateb.js', 'nabidka.js', 'nabidka_proj.js', 'sod.js', 'kryci.js', 'kryci_proj.js',
  'cenik.js', 'cenik_stari.js', 'cenik_rady.js', 'vyjimky.js', 'rucni_ceny.js', 'katalog.js', 'prepisy.js', 'slovnik.js',
  'konfigurace.js', 'sablony_online.js', 'sablona_obsah.js', 'analytika.js', 'nastaveni_db.js', 'program.js', 'ukazkove.js',
  'prava.js', 'zobrazeni.js', 'zakaznici.js', 'controlling.js', 'pd_nanecisto.js', 'objednane.js', 'standard_ock.js'];
CORE.forEach(f => { const m = require(path.join(__dirname, f)); if (m && typeof m === 'object') Object.assign(global, m); });
const ZC = require('./zkusebni_cenik.js');
global.DEFAULT_CENIK = ZC.zkusebniCenik();
global.DEFAULT_CENIK_PROJ = ZC.zkusebniCenikProj();
const J = JSON.parse(fs.readFileSync(path.join(__dirname, 'jekly.json'), 'utf8'));
const dg = require('./docxgen.js');
let VS = null;
try { VS = require(path.join(__dirname, '..', 'nastroje', 'vyrob_sablony.js')); } catch (e) { VS = null; }

let ok = 0, fail = 0;
const test = (n, c, info) => { if (c) { ok++; console.log('OK   ' + n); } else { fail++; console.log('FAIL ' + n + '  ' + JSON.stringify(info === undefined ? '' : info).slice(0, 500)); } };
const kop = x => JSON.parse(JSON.stringify(x));
const kc = t => +String(t).replace(/[^\d,-]/g, '').replace(',', '.');
const enc = new TextEncoder(), dec = new TextDecoder();

/* ---------- A) nástroj nad smyšleným úryvkem ---------- */
const rPr = '<w:rPr><w:rFonts w:ascii="Cambria" w:hAnsi="Cambria"/><w:sz w:val="22"/></w:rPr>';
const rPrB = '<w:rPr><w:rFonts w:ascii="Cambria" w:hAnsi="Cambria"/><w:b/><w:sz w:val="22"/></w:rPr>';
const r = (t, rp) => '<w:r>' + (rp || rPr) + '<w:t xml:space="preserve">' + t + '</w:t></w:r>';
const pNum = '<w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="19"/></w:numPr><w:spacing w:line="240" w:lineRule="auto"/><w:ind w:left="0" w:right="340" w:hanging="567"/><w:jc w:val="both"/><w:rPr><w:b/></w:rPr></w:pPr>';
const pRozpis = '<w:pPr><w:pStyle w:val="Normlnweb"/><w:ind w:left="1080" w:right="340"/><w:jc w:val="both"/></w:pPr>';
const P = (pPr, obsah) => '<w:p>' + pPr + obsah + '</w:p>';
function telo(predmetVicBehu, nadpis) {
  return P('', r(nadpis || 'Čl. II – PŘEDMĚT SMLOUVY (smyšlený)', rPrB)) + P('<w:pPr><w:jc w:val="center"/></w:pPr>', '')
    + P(pNum, predmetVicBehu ? r('Předmětem je smyšlená dodávka ocelové konstrukce (dále jen „') + r('dílo', rPrB) + r('“).')
      : r('Předmětem je smyšlená dodávka ocelové konstrukce (dále jen „dílo“).'))
    + P(pNum, r('Další smyšlený odstavec článku.'))
    + P('', r('Čl. V – CENA (smyšlená)', rPrB))
    + P(pNum, r('Objednatel zaplatí dohodnutou cenu, a to ve výši'))
    + P(pRozpis, r('{{CENA_BEZ_DPH}} (bez DPH)'))
    + P(pRozpis, r('z toho cena díla dle nabídky č. {{CISLO_NABIDKY}}: {{SOD_CENA_NABIDKY}} (bez DPH)'))
    + P(pRozpis, r('objednané příplatky:') + '<w:r>' + rPr + '<w:br/><w:t>{{SOD_PRIPLATKY_OBJEDNANE}}</w:t></w:r>')
    + P(pRozpis, r('příplatky celkem: {{SOD_PRIPLATKY_KC}} (bez DPH)'))
    + P(pNum, r('{{SOD_DPH_REZIM}}'))
    + P('', r('Objednatel: {{OBJEDNATEL}}, IČ {{OBJEDNATEL_ICO}}'));
}
const doc = t => '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>'
  + t + '<w:sectPr/></w:body></w:document>';
const texty = x => dg.odstavcoveSpany(x).map(sp => dg.odstavecText(x.slice(sp.zac, sp.kon)));
test('nastroje/vyrob_sablony.js exportuje sodRealV5', !!(VS && typeof VS.sodRealV5 === 'function' && typeof VS.sodRealV5BezNovych === 'function'));
if (!VS || typeof VS.sodRealV5 !== 'function') { console.log(`\n${ok} prošlo, ${fail} selhalo`); process.exit(1); }
const V4 = doc(telo(false)), V4b = doc(telo(true));
const zz = [];
const V5 = VS.sodRealV5(V4, zz), V5b = VS.sodRealV5(V4b, []);
const t5 = texty(V5);
const iP = t5.indexOf('{{SACHTY_SOD_PREDMET}}'), iR = t5.indexOf('{{SACHTY_SOD_ROZPIS}}');
test('A záznam o dvou vložených odstavcích', zz.length === 2 && /čl\. II/.test(zz[0]) && /čl\. V/.test(zz[1]), zz);
test('A předmět: hned za prvním neprázdným odstavcem čl. II (prázdný řádek pod nadpisem přeskočen)',
  iP === 3 && /^Předmětem je/.test(t5[2]) && t5[4] === 'Další smyšlený odstavec článku.', t5);
test('A rozpis: hned za odstavcem se {{SOD_CENA_NABIDKY}}, před objednanými příplatky; celková cena zůstává první',
  iR > 0 && /SOD_CENA_NABIDKY/.test(t5[iR - 1]) && /^objednané příplatky/.test(t5[iR + 1]) && t5[iR - 2] === '{{CENA_BEZ_DPH}} (bez DPH)', t5);
test('A text předmětu ve víc bězích: stejné umístění', texty(V5b).indexOf('{{SACHTY_SOD_PREDMET}}') === 3, texty(V5b));
const spany = dg.odstavcoveSpany(V5);
const pPred = V5.slice(spany[iP].zac, spany[iP].kon), pRoz = V5.slice(spany[iR].zac, spany[iR].kon);
test('A nové odstavce nesou JEN symbol (nic k překladu), symbol v jednom běhu',
  /<w:t>\{\{SACHTY_SOD_PREDMET\}\}<\/w:t>/.test(pPred) && /<w:t>\{\{SACHTY_SOD_ROZPIS\}\}<\/w:t>/.test(pRoz)
  && (pPred.match(/<w:t[ >]/g) || []).length === 1 && (pRoz.match(/<w:t[ >]/g) || []).length === 1, [pPred, pRoz]);
test('A bez číslování (numId 0 přebije i styl), vlevo, předmět odsazený na text (left 0, bez hanging), rozpis left 1080',
  /<w:numId w:val="0"\/>/.test(pPred) && /<w:numId w:val="0"\/>/.test(pRoz) && /<w:jc w:val="left"\/>/.test(pPred) && /<w:jc w:val="left"\/>/.test(pRoz)
  && /<w:ind w:left="0" w:right="340"\/>/.test(pPred) && /<w:ind w:left="1080" w:right="340"\/>/.test(pRoz), [pPred, pRoz]);
test('A písmo předmětu z běhu předmětu bez tučného', pPred.indexOf('<w:rFonts w:ascii="Cambria" w:hAnsi="Cambria"/>') > 0
  && !/<w:r>(?:(?!<\/w:r>)[\s\S])*<w:b\/>/.test(pPred), pPred);
const PORADI = ['pStyle', 'keepNext', 'keepLines', 'pageBreakBefore', 'framePr', 'widowControl', 'numPr', 'suppressLineNumbers',
  'pBdr', 'shd', 'tabs', 'suppressAutoHyphens', 'kinsoku', 'wordWrap', 'overflowPunct', 'topLinePunct', 'autoSpaceDE', 'autoSpaceDN',
  'bidi', 'adjustRightInd', 'snapToGrid', 'spacing', 'ind', 'contextualSpacing', 'mirrorIndents', 'suppressOverlap', 'jc',
  'textDirection', 'textAlignment', 'textboxTightWrap', 'outlineLvl', 'divId', 'cnfStyle', 'rPr', 'sectPr', 'pPrChange'];
const poradiOk = p => { const pPr = (p.match(/<w:pPr>([\s\S]*?)<\/w:pPr>/) || [])[1] || '';
  const deti = []; let hl = 0; pPr.replace(/<(\/?)w:([A-Za-z]+)\b[^>]*?(\/?)>/g, (m, z, jm, s) => { if (!z && hl === 0) deti.push(jm); if (!z && !s) hl++; if (z) hl--; return m; });
  const i = deti.map(d => PORADI.indexOf(d)); return i.every((x, k) => x >= 0 && (k === 0 || x > i[k - 1])); };
test('A prvky w:pPr nových odstavců v pořadí schématu OOXML', poradiOk(pPred) && poradiOk(pRoz), [pPred, pRoz]);
test('A mimo nové odstavce = vstup bajt po bajtu (jeden i víc běhů)', VS.sodRealV5BezNovych(V5) === V4 && VS.sodRealV5BezNovych(V5b) === V4b);
const sym = x => dg.klicePlaceholderu(x);
test('A přibyly právě dva symboly, žádný neubyl', sym(V5).filter(k => sym(V4).indexOf(k) < 0).sort().join() === 'SACHTY_SOD_PREDMET,SACHTY_SOD_ROZPIS'
  && sym(V4).every(k => sym(V5).indexOf(k) >= 0));
const chyba = f => { try { f(); return ''; } catch (e) { return e.message; } };
test('A šablona už v5 → chyba', /už symbol \{\{SACHTY_SOD_PREDMET\}\}/.test(chyba(() => VS.sodRealV5(V5))));
test('A bez nadpisu čl. II → chyba', /nadpis/.test(chyba(() => VS.sodRealV5(doc(telo(false, 'Článek druhý')))))) ;
test('A dva odstavce se {{SOD_CENA_NABIDKY}} → chyba', /právě jeden odstavec se \{\{SOD_CENA_NABIDKY\}\}/.test(chyba(() =>
  VS.sodRealV5(doc(telo(false) + P(pRozpis, r('{{SOD_CENA_NABIDKY}}'))))))) ;
test('A šablona bez rozpisu objednaných (v3) → chyba (v5 vzniká z v4)', /z v4/.test(chyba(() =>
  VS.sodRealV5(V4.replace('{{SOD_PRIPLATKY_OBJEDNANE}}', 'x')))));
test('A EN/DE/FR nadpis „Art. II –" je kotva', texty(VS.sodRealV5(doc(telo(false, 'Art. II – SUBJECT (fictitious)')))).indexOf('{{SACHTY_SOD_PREDMET}}') === 3);

/* ---------- B), C) data a Word jako aplikace ---------- */
const ZAD = { prejezd: 3.3, zdvih: 12, prohluben: 1.2, sirka: 1.6, hloubka: 2.1, nastupiste: 4 };
const zadani = u => Object.assign(kop(DEFAULT_ZADANI), ZAD, u || {});
function zakazka(vs) {
  const zak = novaZakazka();
  zak.cislo = '2026-OPR-CN-9583'; zak.objednatel = 'Zkušební zákazník s.r.o.';
  const v = zak.varianty[0];
  v.data.cenik = Object.assign(ZC.zkusebniCenik(), { kurzEurKc: 25 });
  v.data.ock.fixes = true;
  v.data.ock.zadani = zadani({});
  if (vs) { v.data.ock.nazev = 'Výtah A'; v.data.ock.dalsi = [{ id: 's_b', nazev: 'Výtah B', ks: 2, zadani: zadani({ zdvih: 17.3 }) }]; }
  return { zak, v };
}
function zamkni(zak, v) {
  const z = kop(zak);
  const vv = z.varianty.find(x => x.id === v.id);
  z.varianty.forEach(x => { x.ridici = x.id === vv.id; });
  vv.zamek = { zamceno: true, kdy: '2026-11-10T10:00:00.000Z', kdo: 'test@priklad.cz', cislo: z.cislo, vysledek: kop(zamekVysledekSpocti(vv, J, 'test')) };
  return { z, vv };
}
const docx = async xml => (await dg.zipZapis([{ nazev: 'word/document.xml', data: enc.encode(xml) }])).arrayBuffer();
async function word(sablonaAb, zak, v, L) {
  const res = await dokumentVygeneruj('sod', sablonaAb, zak, v, J, L || 'cz');
  const casti = await dg.zipPrecti(new Uint8Array(await res.blob.arrayBuffer()));
  const xml = dec.decode(casti.find(p => p.nazev === 'word/document.xml').data);
  return { res, xml, text: texty(xml) };
}
const CESKA = /[ěščřžýáíéůúťďňó]/i;

(async () => {
  const ab4 = await docx(V4), ab5 = await docx(V5);
  /* jedna šachta: odstavce zmizí, text = v4 */
  const j = zakazka(false);
  const w4 = await word(ab4, j.zak, j.v), w5 = await word(ab5, j.zak, j.v);
  test('B jedna šachta: Word z v5 = Word z v4 (text všech odstavců)', JSON.stringify(w5.text) === JSON.stringify(w4.text), [w4.text, w5.text]);
  test('B jedna šachta: v datech žádný SACHTY_*, v odstavcePryc oba symboly (šablona je má)',
    !Object.keys(w5.res.data.placeholders).some(k => /^SACHTY_/.test(k))
    && ['SACHTY_SOD_PREDMET', 'SACHTY_SOD_ROZPIS'].every(k => (w5.res.data.odstavcePryc || []).indexOf(k) >= 0), w5.res.data.odstavcePryc);
  test('B jedna šachta se šablonou v4: odstavcePryc bez SACHTY_* (jen symboly, které šablona má)',
    !(w4.res.data.odstavcePryc || []).some(k => /^SACHTY_/.test(k)), w4.res.data.odstavcePryc);
  test('C jedna šachta + stará šablona: žádné upozornění', !(w4.res.data.upozorneni || []).length, w4.res.data.upozorneni);
  /* víc šachet */
  const m = zakazka(true);
  const m5 = await word(ab5, m.zak, m.v);
  const vo = vsVystup(vypocetZ(m.v, J));
  const iP5 = m5.text.findIndex(t => /^Předmětem je/.test(t));
  test('B víc šachet: předmět pod popisem předmětu vyjmenuje varianty a kusy',
    m5.text[iP5 + 1] === '2 varianty šachet, celkem 3 ks (Výtah A 1 ks, Výtah B 2 ks)', m5.text.slice(iP5, iP5 + 2));
  const iC = m5.text.indexOf(m5.res.data.placeholders.CENA_BEZ_DPH + ' (bez DPH)');
  const rz = m5.text.slice(iC + 1, iC + 3);
  test('B víc šachet bez příplatků: rozpis hned pod celkovou cenou, odstavec na variantu', iC > 0 && /^Výtah A – 1 ks – /.test(rz[0]) && /^Výtah B – 2 ks – /.test(rz[1])
    && /SOD_DPH_REZIM|přenesené|DPH/.test(m5.text[iC + 3]), m5.text.slice(iC, iC + 4));
  test('B rozpis: součet řádků = cena díla před slevou (vsVystup)', kc(rz[0].split(' – ')[2]) + kc(rz[1].split(' – ')[2]) === vo.zaklad, [rz, vo.zaklad]);
  test('B víc šachet + v5: žádné upozornění, žádný {{', !(m5.res.data.upozorneni || []).length && m5.xml.indexOf('{{') < 0, m5.res.data.upozorneni);
  /* s objednanými příplatky */
  const { z, vv } = zamkni(m.zak, m.v);
  const nab = objNabidnute(vv, J);
  const ch = objNastav(z, vv, [nab[0].key], '', { kdo: 'test@priklad.cz' });
  const p5 = await word(ab5, z, vv);
  const iN = p5.text.findIndex(t => /^z toho cena díla dle nabídky/.test(t));
  test('B s objednaným příplatkem: celková cena → z toho nabídka → rozpis šachet → objednané → celkem příplatky',
    !ch && iN > 0 && /\(bez DPH\)$/.test(p5.text[iN - 1]) && /^Výtah A – 1 ks – /.test(p5.text[iN + 1]) && /^Výtah B – 2 ks – /.test(p5.text[iN + 2])
    && /^objednané příplatky/.test(p5.text[iN + 3]) && p5.text.some(t => /^příplatky celkem/.test(t)), [ch, p5.text.slice(iN - 1, iN + 6)]);
  test('B s příplatkem: rozpis šachet dál dává cenu díla před slevou', kc(p5.text[iN + 1].split(' – ')[2]) + kc(p5.text[iN + 2].split(' – ')[2]) === vo.zaklad);
  /* EN/DE/FR — smyšlená šablona je česká, kontroluje se jen text dosazených šachet */
  for (const L of ['en', 'de', 'fr']) {
    const w = await word(ab5, m.zak, m.v, L);
    const nove = [w.res.data.placeholders.SACHTY_SOD_PREDMET].concat(String(w.res.data.placeholders.SACHTY_SOD_ROZPIS).split('\n'));
    test('B ' + L + ': předmět a rozpis ve Wordu bez českých slov (kromě názvů šachet)', nove.every(t => w.text.indexOf(t) >= 0)
      && !nove.some(t => CESKA.test(t.replace(/Výtah [AB]/g, ''))), nove);
  }
  /* C) upozornění u staré šablony */
  const m4 = await word(ab4, m.zak, m.v);
  test('C víc šachet + šablona v4: upozornění = SOD_SACHTY_BEZ_SABLONY, tisk projde (blob)', (m4.res.data.upozorneni || []).indexOf(SOD_SACHTY_BEZ_SABLONY) >= 0
    && m4.res.blob && m4.xml.indexOf('Výtah B') < 0, m4.res.data.upozorneni);
  test('C bez informace o šabloně (náhled): mlčí', !(sodData(m.zak, m.v, J, 'cz').upozorneni || []).length);
  test('C sodSablonaUmiSachty: null bez symbolů, false v4, true v5', sodSablonaUmiSachty(null) === null
    && sodSablonaUmiSachty(new Set(sym(V4))) === false && sodSablonaUmiSachty(sym(V5)) === true);

  /* D) skutečné šablony */
  const PODKL = String(process.env.KNG_PODKLADY || '').trim();
  const VYST = path.join(__dirname, '..', 'podklady', 'sablony_vystup');
  const najdi = jm => [PODKL && path.join(PODKL, jm), path.join(VYST, jm)].filter(Boolean).find(f => fs.existsSync(f));
  let sk = 0;
  for (const suf of ['', '_EN', '_DE', '_FR']) {
    const f4 = najdi('Sablona_SOD_REALIZACE_v4' + suf + '.docx'), f5 = najdi('Sablona_SOD_REALIZACE_v5' + suf + '.docx');
    if (!f4 || !f5) continue;
    sk++;
    const L = suf ? suf.slice(1).toLowerCase() : 'cz';
    const ab = f => new Uint8Array(fs.readFileSync(f)).buffer;
    const a = await word(ab(f4), j.zak, j.v, L), b = await word(ab(f5), j.zak, j.v, L);
    test('D ' + (L) + ' jedna šachta: Word z v5 = Word z v4 (všechny odstavce)', JSON.stringify(a.text) === JSON.stringify(b.text));
    const c = await word(ab(f5), m.zak, m.v, L);
    test('D ' + L + ' víc šachet: předmět a rozpis ve Wordu, žádný {{', c.text.indexOf(c.res.data.placeholders.SACHTY_SOD_PREDMET) >= 0
      && String(c.res.data.placeholders.SACHTY_SOD_ROZPIS).split('\n').every(t => c.text.indexOf(t) >= 0) && c.xml.indexOf('{{') < 0);
  }
  if (!sk) console.log('–    skutečné šablony SoD realizace v4/v5 nejsou po ruce (KNG_PODKLADY, podklady/sablony_vystup) — přeskočeno');
  console.log(`\n${ok} prošlo, ${fail} selhalo`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.log('FAIL výjimka ' + (e && e.stack)); process.exit(1); });
