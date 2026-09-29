/* ZNAČKY BLOKŮ V ŠABLONĚ: PRÁZDNÁ KAPITOLA ZMIZÍ I S NADPISEM
 * (P8 varianta A, K16-N78 / K9-N32; rozhodnutí J. V. 29. 9. 2026).
 *
 * Nález: Word nabídky nechal u prázdné kapitoly IV.–VI. nadpis i prázdný
 * orámovaný rámeček (u VI. i osiřelou větu o předávacím protokolu); online
 * náhled a PDF kapitolu vypustily. Šablona CN v13 obalí každou kapitolu
 * značkami v samostatných odstavcích:
 *
 *   {{KAP_IV_ZAC}}   ← odstavec jen se značkou
 *   IV. POŽADAVKY…   ← nadpis
 *   [ {{FIRMA_NAB_POZADAVKY}} ]
 *   {{KAP_IV_KON}}
 *
 * Když jsou všechny symboly uvnitř bloku prázdné, zmizí celý blok i se
 * značkami; jinak zmizí jen značky. Symbol, který aplikace nezná, blok
 * drží (zůstane vidět a někdo si ho všimne). Šablona bez značek se chová
 * jako dřív. */
const dg = require('./docxgen.js');
Object.keys(dg).forEach(k => { global[k] = dg[k]; });
const pr = require('./preklad.js');
Object.keys(pr).forEach(k => { global[k] = pr[k]; });

let ok = 0, fail = 0;
const test = (n, cond, info) => { if (cond) { ok++; console.log('OK  ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : (typeof info === 'string' ? info : JSON.stringify(info))); } };

const odst = t => `<w:p><w:pPr><w:pStyle w:val="Bezmezer"/></w:pPr><w:r><w:t xml:space="preserve">${t}</w:t></w:r></w:p>`;
const tab = t => `<w:tbl><w:tblPr><w:tblpPr w:vertAnchor="text"/></w:tblPr><w:tr><w:tc><w:p><w:r><w:t>${t}</w:t></w:r></w:p></w:tc></w:tr></w:tbl>`;
const blok = (jmeno, obsah) => odst(`{{${jmeno}_ZAC}}`) + obsah + odst(`{{${jmeno}_KON}}`);
const dokument = telo => `<w:document><w:body>${telo}<w:sectPr/></w:body></w:document>`;
const B = dg.odstranPrazdneBloky;

test('generátor umí značky bloků (odstranPrazdneBloky)', typeof B === 'function');
if (typeof B === 'function') {
  const kapIV = blok('KAP_IV', odst('IV. POŽADAVKY PRO PROVEDENÍ REALIZACE:') + tab('{{FIRMA_NAB_POZADAVKY}}') + odst(''));
  const kapVI = blok('KAP_VI', odst('VI. PŘEDÁNÍ DÍLA:') + tab('{{FIRMA_NAB_PREDANI}}')
    + odst('Předávací protokol z bodů 1. a 2. lze nahradit zápisem do montážního deníku.'));
  const xml = dokument(odst('III. PLATEBNÍ PODMÍNKY:') + kapIV + kapVI + odst('Konec'));

  const prazdna = B(xml, { FIRMA_NAB_POZADAVKY: '', FIRMA_NAB_PREDANI: 'Předání dle protokolu.' });
  test('prázdná kapitola zmizí i s nadpisem a rámečkem', !/IV\. POŽADAVKY/.test(prazdna) && !/FIRMA_NAB_POZADAVKY/.test(prazdna), prazdna);
  test('vyplněná kapitola zůstane celá (nadpis, symbol i pevná věta)',
    /VI\. PŘEDÁNÍ DÍLA/.test(prazdna) && /\{\{FIRMA_NAB_PREDANI\}\}/.test(prazdna) && /Předávací protokol/.test(prazdna), prazdna);
  test('značky zmizí vždy (ani {{…_ZAC}}, ani {{…_KON}} v dokumentu nezůstane)', !/_ZAC\}\}|_KON\}\}/.test(prazdna), prazdna);
  test('okolní text zůstane', /III\. PLATEBNÍ PODMÍNKY/.test(prazdna) && /Konec/.test(prazdna));
  test('výsledek je platné XML', !dg.xmlStrukturaVada(prazdna), dg.xmlStrukturaVada(prazdna));
  const obePrazdne = B(xml, { FIRMA_NAB_POZADAVKY: '', FIRMA_NAB_PREDANI: '' });
  test('u prázdné kapitoly VI. zmizí i osiřelá věta o předávacím protokolu', !/Předávací protokol/.test(obePrazdne), obePrazdne);
  test('„–" nebo mezera se počítá za prázdno (jako u technické specifikace)',
    !/IV\. POŽADAVKY/.test(B(xml, { FIRMA_NAB_POZADAVKY: ' – ', FIRMA_NAB_PREDANI: 'x' })));
  test('neznámý symbol blok drží (zůstane vidět)', /IV\. POŽADAVKY/.test(B(xml, { FIRMA_NAB_PREDANI: 'x' })));
  const dva = dokument(blok('KAP_V', odst('V. TERMÍNY:') + tab('{{PODM_TERMIN_DODANI}} {{FIRMA_NAB_TERMINY}}')));
  test('blok se dvěma symboly zůstane, když je aspoň jeden vyplněný',
    /V\. TERMÍNY/.test(B(dva, { PODM_TERMIN_DODANI: '', FIRMA_NAB_TERMINY: 'text' })));
  test('… a zmizí, když jsou prázdné oba', !/V\. TERMÍNY/.test(B(dva, { PODM_TERMIN_DODANI: '', FIRMA_NAB_TERMINY: '' })));
  const bezKonce = dokument(odst('{{KAP_IV_ZAC}}') + odst('IV. NADPIS') + tab('{{FIRMA_NAB_POZADAVKY}}'));
  const bk = B(bezKonce, { FIRMA_NAB_POZADAVKY: '' });
  test('značka bez páru: obsah zůstane, značka zmizí', /IV\. NADPIS/.test(bk) && !/KAP_IV_ZAC/.test(bk), bk);
  const krizem = dokument(odst('{{KAP_IV_ZAC}}') + odst('IV. NADPIS')
    + `<w:tbl><w:tr><w:tc>${odst('{{KAP_IV_KON}}')}</w:tc></w:tr></w:tbl>`);
  const kr = B(krizem, { });
  test('značky v různé úrovni (tělo × buňka tabulky): obsah zůstane, XML platné, buňka neosiří',
    /IV\. NADPIS/.test(kr) && !/KAP_IV_/.test(kr) && !dg.xmlStrukturaVada(kr) && /<w:tc><w:p\/><\/w:tc>/.test(kr), kr);
  test('šablona bez značek se nemění', B(dokument(odst('A') + tab('{{X}}')), { X: '' }) === dokument(odst('A') + tab('{{X}}')));
  const rozdelena = dokument(`<w:p><w:r><w:t>{{KAP_</w:t></w:r><w:r><w:t>IV_ZAC}}</w:t></w:r></w:p>`
    + odst('IV. NADPIS') + tab('{{FIRMA_NAB_POZADAVKY}}') + odst('{{KAP_IV_KON}}'));
  test('značka rozdělená mezi běhy se pozná taky', !/IV\. NADPIS/.test(B(rozdelena, { FIRMA_NAB_POZADAVKY: '' })), B(rozdelena, { FIRMA_NAB_POZADAVKY: '' }));
}

/* --- celou cestou: vyplnění šablony a její překlad --- */
(async () => {
  const enc = new TextEncoder(), dec = new TextDecoder();
  const telo = odst('III. PLATEBNÍ PODMÍNKY:')
    + blok('KAP_IV', odst('IV. POŽADAVKY PRO PROVEDENÍ REALIZACE:') + tab('{{FIRMA_NAB_POZADAVKY}}'))
    + blok('KAP_DOLOZKY', odst('DOLOŽKY:') + tab('{{FIRMA_NAB_DOLOZKY}}')) + odst('Konec');
  const sablona = await (await dg.zipZapis([{ nazev: 'word/document.xml', data: enc.encode(dokument(telo)) }])).arrayBuffer();
  const blob = await dg.docxVyplnSablonu(sablona.slice(0), { FIRMA_NAB_POZADAVKY: '', FIRMA_NAB_DOLOZKY: 'Doložka.' }, [], {});
  const vystup = await blob.arrayBuffer();
  const doc = dec.decode((await dg.zipPrecti(new Uint8Array(vystup))).find(p => p.nazev === 'word/document.xml').data);
  test('Word: prázdná kapitola IV. ve vyplněném dokumentu není', !/IV\. POŽADAVKY/.test(doc), doc.slice(0, 300));
  test('Word: vyplněné doložky jsou, bez značek', /DOLOŽKY/.test(doc) && /Doložka\./.test(doc) && !/_ZAC|_KON/.test(doc), doc.slice(0, 400));
  test('Word: dokument je platné XML', (await dg.docxXmlVady(vystup)).length === 0, await dg.docxXmlVady(vystup));
  const stat = {};
  const prelozena = await dg.docxPrelozSablonu(sablona.slice(0), 'en', stat);
  const docEn = dec.decode((await dg.zipPrecti(new Uint8Array(await prelozena.arrayBuffer ? await prelozena.arrayBuffer() : prelozena))).find(p => p.nazev === 'word/document.xml').data);
  test('překlad šablony značky nechá beze změny (EN)', /\{\{KAP_IV_ZAC\}\}/.test(docEn) && /\{\{KAP_DOLOZKY_KON\}\}/.test(docEn), docEn.slice(0, 400));

  console.log(`\n${ok} prošlo, ${fail} selhalo`);
  process.exit(fail ? 1 : 0);
})();
