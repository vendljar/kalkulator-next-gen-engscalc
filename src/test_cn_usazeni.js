/* C1 #582 — NADPISY „USAZENÍ OCK" V JAZYKOVÉ CN (nástroj --cn-usazeni), 11. 11. 2026.
 *
 * Rozhodnutí J. V. 11. 11. 2026 (B0.3 + doplněk): DE nadpisy usazení jednotně
 * „POSITIONIERUNG DER SCHACHTKONSTRUKTION – …", EN „SHAFT STRUCTURE POSITION – …"
 * u všech stěn, ve zveřejněné v16 i ve v17. Sada pracuje nad SYNTETICKOU
 * šablonou (žádné firemní texty):
 *  A) nadpis v jednom běhu i rozdělený do víc běhů se nahradí; písmo běhu zůstane;
 *  B) symboly a ostatní text beze změny, XML bez vad;
 *  C) chybějící řádek / neočekávané znění / jazyk FR = chyba, ne tichý průchod;
 *  D) druhé spuštění nad opraveným souborem nic nezmění (idempotence);
 *  E) tvrdé kontroly souboru (symboly, text mimo nadpisy, XML) a porovnání v17 × v16;
 *  sekce A–D běží pro DE i EN.
 * Pojistka: nad bází aa445a1 nástroj cnUsazeni ani cnUsazeniSoubor nemá —
 * sada skončí chybou (viz zpráva commitu).
 * Spuštění: node src/test_cn_usazeni.js */
'use strict';
const DG = require('./docxgen.js');
const vyrob = require('../nastroje/vyrob_sablony.js');

let ok = 0, fail = 0;
const test = (n, c, info) => { if (c) { ok++; console.log('OK   ' + n); }
  else { fail++; console.log('FAIL ' + n + '  ' + JSON.stringify(info === undefined ? '' : info).slice(0, 500)); } };
const dec = new TextDecoder(), enc = new TextEncoder();
const chybou = async f => { try { await f(); return ''; } catch (e) { return e.message; } };

const STARE = {
  de: ['BEFESTIGUNG DES SCHACHTGERÜSTS - VORDERWAND', 'BEFESTIGUNG DES SCHACHTGERÜSTS - SEITENWÄNDE',
    'POSITIONIERUNG DER SCHACHTKONSTRUKTION – LINKE SEITENWAND', 'POSITIONIERUNG DER SCHACHTKONSTRUKTION – RECHTE SEITENWAND',
    'BEFESTIGUNG DES SCHACHTGERÜSTS - RÜCKWAND'],
  en: ['SHAFT STRUCTURE FIXING - FRONT WALL', 'SHAFT STRUCTURE FIXING - SIDE WALLS', 'SHAFT STRUCTURE POSITION – LEFT SIDE WALL',
    'SHAFT STRUCTURE POSITION – RIGHT SIDE WALL', 'SHAFT STRUCTURE FIXING - REAR WALL'],
};
const NOVE = {
  de: ['VORDERWAND', 'SEITENWÄNDE', 'LINKE SEITENWAND', 'RECHTE SEITENWAND', 'RÜCKWAND'].map(x => 'POSITIONIERUNG DER SCHACHTKONSTRUKTION – ' + x),
  en: ['FRONT WALL', 'SIDE WALLS', 'LEFT SIDE WALL', 'RIGHT SIDE WALL', 'REAR WALL'].map(x => 'SHAFT STRUCTURE POSITION – ' + x),
};
const SYM = ['TS_USAZENI_CELNI', 'TS_USAZENI_BOCNI', 'TS_USAZENI_LEVA', 'TS_USAZENI_PRAVA', 'TS_USAZENI_ZADNI'];

async function sablona(L, nadpisy) {
  const n = nadpisy || STARE[L];
  return new Uint8Array(await DG.docxDokumentBlob('Angebot / Quotation', [
    { sekce: 'PARAMETRY', radky: [['Zeile A', '{{TS_ZDVIH}} m'], ...SYM.map((s, i) => [n[i], '{{' + s + '}}']), ['Zeile B', 'Text {{TS_STRECHA}}']] },
    { sekce: 'PREIS', radky: [['Zeile C', '{{CENA_BEZ_DPH}}']] }]).arrayBuffer());
}
const docXml = async b => dec.decode((await DG.zipPrecti(b)).find(p => p.nazev === 'word/document.xml').data);
async function sXml(b, fn) {
  const pol = await DG.zipPrecti(b);
  const d = pol.find(p => p.nazev === 'word/document.xml');
  d.data = enc.encode(fn(dec.decode(d.data)));
  return new Uint8Array(await DG.zipZapis(pol).arrayBuffer());
}
const text = async b => DG.docxTextSablony(b.slice().buffer);

(async () => {
  for (const L of ['de', 'en']) {
    const b = await sablona(L);
    /* A) první nadpis rozdělit do tří běhů (s kurzívou v prvním) */
    const prvni = STARE[L][0], [p1, p2] = [prvni.slice(0, 7), prvni.slice(7, 20)];
    const deleny = await sXml(b, x => x.replace(new RegExp('<w:r>(<w:rPr>(?:(?!</w:r>)[\\s\\S])*?</w:rPr>)?<w:t xml:space="preserve">' + prvni + '</w:t></w:r>'),
      (_m, rpr) => '<w:r><w:rPr><w:i/></w:rPr><w:t xml:space="preserve">' + p1 + '</w:t></w:r><w:r>' + (rpr || '') + '<w:t>' + p2 + '</w:t></w:r><w:r>'
        + (rpr || '') + '<w:t xml:space="preserve">' + prvni.slice(20) + '</w:t></w:r>'));
    const xd = await docXml(deleny);
    test('A ' + L + ': syntetický nadpis je opravdu ve 3 bězích', xd.indexOf('>' + prvni + '<') < 0 && xd.indexOf('>' + p2 + '<') > 0);

    const v = await vyrob.cnUsazeniSoubor(deleny, L);
    const t = await text(v.bajty), t0 = await text(deleny);
    test('A ' + L + ': 3 nadpisy nahrazeny, 2 už správně', v.nahrazeno.length === 3 && v.uzSpravne.length === 2, [v.nahrazeno, v.uzSpravne]);
    test('A ' + L + ': všech 5 nadpisů v novém znění (i rozdělený)', NOVE[L].every(n => t.indexOf(n) >= 0), t);
    test('A ' + L + ': starý nadpis nikde', !t.some(x => /BEFESTIGUNG DES SCHACHTGERÜSTS|SHAFT STRUCTURE FIXING/.test(x)), t);
    const x = await docXml(v.bajty);
    test('A ' + L + ': písmo prvního běhu (kurzíva) zůstalo u nadpisu', new RegExp('<w:r><w:rPr><w:i/></w:rPr><w:t xml:space="preserve">' + NOVE[L][0] + '</w:t></w:r>').test(x),
      (x.match(new RegExp('.{80}' + NOVE[L][0])) || [])[0]);
    /* B) */
    test('B ' + L + ': symboly před = po', DG.klicePlaceholderu(xd).join('|') === DG.klicePlaceholderu(x).join('|'));
    test('B ' + L + ': ostatní text znak po znaku stejný', t.length === t0.length && t.every((s, i) => s === t0[i] || (STARE[L].indexOf(t0[i]) >= 0 && NOVE[L].indexOf(s) >= 0)), [t0, t]);
    test('B ' + L + ': XML bez vad', (await DG.docxXmlVady(v.bajty.slice().buffer)).length === 0);
    /* D) idempotence */
    const v2 = await vyrob.cnUsazeniSoubor(v.bajty, L);
    test('D ' + L + ': druhé spuštění nic nenahradí a document.xml je stejný', v2.nahrazeno.length === 0 && v2.uzSpravne.length === 5
      && (await docXml(v2.bajty)) === x);
    /* C) vady */
    const bezZadni = await sXml(b, s => s.replace(/<w:tr>(?:(?!<w:tr>)[\s\S])*?\{\{TS_USAZENI_ZADNI\}\}[\s\S]*?<\/w:tr>/, ''));
    test('C ' + L + ': řádek ZADNÍ chybí → chyba', /TS_USAZENI_ZADNI/.test(await chybou(() => vyrob.cnUsazeniSoubor(bezZadni, L))));
    const jiny = await sablona(L, STARE[L].map((s, i) => i === 1 ? s + ' X' : s));
    test('C ' + L + ': neočekávané znění nadpisu → chyba (nic nehádá)', /nic nehádám/.test(await chybou(() => vyrob.cnUsazeniSoubor(jiny, L))));
    const dvakrat = await sXml(b, s => s.replace('{{TS_STRECHA}}', '{{TS_USAZENI_CELNI}}'));
    test('C ' + L + ': symbol řádku dvakrát → chyba', /není právě jednou/.test(await chybou(() => vyrob.cnUsazeniSoubor(dvakrat, L))));
  }
  /* E) tvrdé kontroly souboru chytí vadnou úpravu (nic se nevrátí) */
  {
    const b = await sablona('de');
    const s1 = (x, L) => Object.assign(vyrob.cnUsazeni(x, L), {});
    const sym = (x, L) => { const v = vyrob.cnUsazeni(x, L); v.xml = v.xml.replace('{{TS_STRECHA}}', ''); return v; };
    test('E symbol zmizel → chyba', /symboly před a po/.test(await chybou(() => vyrob.cnUsazeniSoubor(b, 'de', sym))));
    const jinyText = (x, L) => { const v = vyrob.cnUsazeni(x, L); v.xml = v.xml.replace('Zeile B', 'Zeile X'); return v; };
    test('E změna textu mimo nadpisy → chyba', /mimo nadpisy/.test(await chybou(() => vyrob.cnUsazeniSoubor(b, 'de', jinyText))));
    const vadne = (x, L) => { const v = vyrob.cnUsazeni(x, L); v.xml = v.xml.replace('</w:tbl>', ''); return v; };
    test('E vadné XML → chyba', /vady XML/.test(await chybou(() => vyrob.cnUsazeniSoubor(b, 'de', vadne))));
    test('E výchozí úprava = cnUsazeni', (await vyrob.cnUsazeniSoubor(b, 'de', s1)).nahrazeno.length === 3);
    /* text v17 vs v16: rozdíl se nahlásí, řádky smyčky ne */
    const v17 = await sXml(b, x => x.replace('Zeile B', 'Zeile Y'));
    const r = await vyrob.cnV17TextRozdil(b, v17);
    test('E cnV17TextRozdil hlásí změněný text', r.length === 1 && /Zeile B/.test(r[0]) && /Zeile Y/.test(r[0]), r);
    const sm = await sXml(b, x => x.replace('<w:t xml:space="preserve">Zeile A</w:t>', '<w:t xml:space="preserve">Zeile A</w:t></w:r></w:p><w:p><w:r><w:t>{{SACHTA_TS_NAZEV}}</w:t>'));
    test('E cnV17TextRozdil přeskočí řádky smyčky', (await vyrob.cnV17TextRozdil(b, sm)).length === 0, await vyrob.cnV17TextRozdil(b, sm));
  }
  test('C fr: jazyk FR se neopravuje → chyba', /neopravuje/.test(await chybou(async () => vyrob.cnUsazeni(await docXml(await sablona('de')), 'fr'))));
  test('C de: německý soubor opravovaný jako EN → chyba', /nic nehádám/.test(await chybou(async () => vyrob.cnUsazeniSoubor(await sablona('de'), 'en'))));

  console.log(`\n${ok} OK, ${fail} FAIL`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
