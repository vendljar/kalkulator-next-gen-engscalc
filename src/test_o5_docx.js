/* DÁVKA O5 — NÁLEZY AUDITU K3 V GENERÁTORU WORDU (20. 10. 2026).
 *
 *  K3-N3  šablona SoD PROJ v4, ze které značky bloku ze seznamu `blokyPryc`
 *         zmizely ÚPLNĚ (oba odstavce {{CIN_X_ZAC}}/{{CIN_X_KON}} smazané ve
 *         Wordu), se vytiskla bez chyby — smlouva vyjmenovala nenabízenou
 *         činnost. Teď: nese-li šablona {{SODP_ROZSAH_DILA}} nebo jakoukoli
 *         značku CIN_*, musí mít blok každého jména z `blokyPryc`, jinak
 *         dokument nevznikne (fail-closed jako B191). v3 beze změny.
 *  K3-N10 text obchodníka ve vlastním řádku TS ve tvaru {{X_ZAC}} se choval
 *         jako značka bloku (odstavecText dekóduje &#123; zpět na „{").
 *         Značka se z entity nerozpoznává.
 *  K3-N11 docxVyvazene počítalo otevírací a zavírací značky bez pořadí —
 *         blok od buňky 1 do buňky 2 téhož řádku prošel jako vyvážený
 *         a odstranění sloučilo buňky. Teď zásobník.
 *
 * Před opravou: K3-N3 (2 kontroly), K3-N10 (2) a K3-N11 (2) selžou.
 * Spuštění: cd src && node test_o5_docx.js */
const dg = require('./docxgen.js');
Object.keys(dg).forEach(k => { if (global[k] === undefined) global[k] = dg[k]; });

let ok = 0, fail = 0;
const test = (n, cond, info) => { if (cond) { ok++; console.log('OK   ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : (typeof info === 'string' ? info.slice(0, 600) : JSON.stringify(info))); } };
const hazi = (fn) => { try { fn(); return ''; } catch (e) { return e.message || String(e); } };

const odst = t => '<w:p><w:r><w:t xml:space="preserve">' + t + '</w:t></w:r></w:p>';
const zn = j => odst('{{' + j + '}}');
const text = xml => (xml.match(/<w:p[\s>](?:(?!<\/w:p>)[\s\S])*?<\/w:p>/g) || []).map(dg.odstavecText).filter(Boolean);

/* ---- K3-N3 ---- */
{
  const v4 = '<w:body>' + odst('Rozsah: {{SODP_ROZSAH_DILA}}') + zn('CIN_A_ZAC') + odst('Činnost A') + zn('CIN_A_KON')
    + odst('Činnost B') + '</w:body>';                              // značky CIN_B ve Wordu smazané
  const e1 = hazi(() => dg.odstranPrazdneBloky(v4, {}, ['CIN_B']));
  test('K3-N3: v4 bez značek bloku ze seznamu pryč → chyba (dokument nevznikne)', /CIN_B/.test(e1) && /nevznikne/.test(e1), e1);
  const jenSymbol = '<w:body>' + odst('Rozsah: {{SODP_ROZSAH_DILA}}') + odst('Činnost B') + '</w:body>';
  const e2 = hazi(() => dg.odstranPrazdneBloky(jenSymbol, {}, ['CIN_B']));
  test('K3-N3: šablona se symbolem rozsahu, ale bez jakékoli značky → chyba', /CIN_B/.test(e2), e2);
  const v3 = '<w:body>' + odst('Činnost A') + odst('Činnost B') + '</w:body>';
  test('K3-N3: v3 (bez symbolu rozsahu a bez značek CIN_*) se nemění a nehází',
    hazi(() => dg.odstranPrazdneBloky(v3, {}, ['CIN_B'])) === '' && dg.odstranPrazdneBloky(v3, {}, ['CIN_B']) === v3);
  const hlavicka = '<w:hdr>' + odst('Smlouva o dílo {{CISLO_SOD}}') + '</w:hdr>';
  test('K3-N3: záhlaví bez značek se seznamem pryč nehází', hazi(() => dg.odstranPrazdneBloky(hlavicka, {}, ['CIN_B'])) === '');
  const uplna = '<w:body>' + odst('{{SODP_ROZSAH_DILA}}') + zn('CIN_A_ZAC') + odst('Činnost A') + zn('CIN_A_KON')
    + zn('CIN_B_ZAC') + odst('Činnost B') + zn('CIN_B_KON') + '</w:body>';
  const t = text(dg.odstranPrazdneBloky(uplna, {}, ['CIN_B']));
  test('K3-N3: úplná v4 dál funguje (blok ze seznamu zmizí, ostatní zůstane)',
    JSON.stringify(t) === JSON.stringify(['{{SODP_ROZSAH_DILA}}', 'Činnost A']), t);
}

/* ---- K3-N10 ---- */
{
  const radek = '<w:tr><w:tc><w:p><w:r><w:t>KOTVA</w:t></w:r></w:p></w:tc></w:tr>';
  const zRadku = text => (dg.docxRadkyNavic('<w:tbl>' + radek.replace('KOTVA', '{{KOTVA}}') + '</w:tbl>',
    [{ kotva: 'KOTVA', nazev: text, hodnota: 'x' }]).match(/<w:p>[\s\S]*?<\/w:p>/g) || []);
  const vlozeny = zRadku('{{KAP_IV_KON}}');
  test('výchozí stav: vlastní řádek TS nese text uživatele s „{" jako entitou (B122)',
    vlozeny.some(p => p.indexOf('&#123;&#123;KAP_IV_KON}}') >= 0), vlozeny);
  const falesny = '<w:p><w:r><w:t xml:space="preserve">&#123;&#123;KAP_IV_KON}}</w:t></w:r></w:p>';
  test('K3-N10: text z entit se jako značka bloku nerozpozná', dg.docxZnackyBloku(falesny).length === 0, dg.docxZnackyBloku(falesny));
  const xml = '<w:body>' + zn('KAP_IV_ZAC') + odst('IV. Nadpis') + falesny + odst('{{PRAZDNY}}') + zn('KAP_IV_KON') + odst('Dál') + '</w:body>';
  const t = text(dg.odstranPrazdneBloky(xml, { PRAZDNY: '' }));
  /* před opravou falešná KON spárovala blok předčasně → kapitola s prázdným
   * symbolem zůstala v dokumentu; po opravě se blok řídí svým obsahem */
  test('K3-N10: text uživatele ve tvaru značky nerozpáruje skutečný blok (prázdná kapitola zmizí celá)',
    JSON.stringify(t) === JSON.stringify(['Dál']), t);
}

/* ---- K3-N11 ---- */
{
  const prekryv = '<w:tbl><w:tr><w:tc>' + odst('a') + '</w:tc><w:tc>' + odst('b') + '</w:tc></w:tr></w:tbl>';
  test('K3-N11: fragment „konec buňky + začátek další" není vyvážený', !dg.docxVyvazene('</w:tc><w:tc>'));
  test('K3-N11: tabulka, odstavec i prázdný odstavec vyvážené', dg.docxVyvazene(prekryv + '<w:p/>' + odst('c')));
  test('K3-N11: přehozené pořadí </w:p><w:p> není vyvážené', !dg.docxVyvazene('</w:p><w:p>'));
  const presBunky = '<w:body><w:tbl><w:tr><w:tc>' + zn('CIN_B_ZAC') + odst('a') + '</w:tc><w:tc>' + odst('b') + zn('CIN_B_KON')
    + '</w:tc></w:tr></w:tbl></w:body>';
  const e = hazi(() => dg.odstranPrazdneBloky(presBunky, {}, ['CIN_B']));
  test('K3-N11: blok ze seznamu od buňky 1 do buňky 2 → chyba, buňky se neslučují', /CIN_B/.test(e) && /nevznikne/.test(e), e);
  /* neuzavřené prvky na konci (zásobník není prázdný) — mutace „O5: K3-N11
   * vyváženost bez kontroly zbytku zásobníku" s ním přežila */
  test('K3-N11: fragment s neuzavřenou tabulkou není vyvážený', !dg.docxVyvazene('<w:tbl><w:tr><w:tc>' + odst('a')));
  const doBunky = '<w:body>' + zn('CIN_B_ZAC') + odst('a') + '<w:tbl><w:tr><w:tc>' + odst('b') + zn('CIN_B_KON')
    + '</w:tc></w:tr></w:tbl></w:body>';
  const e2 = hazi(() => dg.odstranPrazdneBloky(doBunky, {}, ['CIN_B']));
  test('K3-N11: blok ze seznamu od odstavce před tabulkou do buňky → chyba', /CIN_B/.test(e2) && /nevznikne/.test(e2), e2);
}

console.log(`\n${ok} prošlo, ${fail} selhalo`);
process.exit(fail ? 1 : 0);
