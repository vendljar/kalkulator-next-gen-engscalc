/* DÁVKA O9 — OPRAVY KÓDU APLIKACE Z AUDITU K4 BEZ ROZHODNUTÍ J. V. (21. 10. 2026).
 *
 *  K4-N6  nabídka PROJ v7 ({{PROJ_DPZ_UVOD}} / {{PROJ_TITUL_CINNOSTI}}), ze
 *         které ve Wordu zmizely značky bloku BLOK_STUDIE_* ze seznamu
 *         `blokyPryc`, se vytiskla bez chyby — nabídka bez studie nesla rozsah
 *         a cenu studie. Teď fail-closed jako K3-N3 (SoD PROJ v4); v6 beze změny.
 *
 *  K4-N7  „Zapsat výchozí hodnoty" odeslal celou místní Firmu; teď jen podmínky
 *         (firmaJenPodminky — online kopie s novými podmínkami).
 *
 * Pojistka: před opravou K4-N6 2 kontroly selžou (dokument vznikne), K4-N7 3 (funkce chybí); prohlížeč overit_podminky_zverejnit.mjs 3 ✗.
 * Spuštění: cd src && node test_o9_k4.js */
const dg = require('./docxgen.js');

let ok = 0, fail = 0;
const test = (n, cond, info) => { if (cond) { ok++; console.log('OK   ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : (typeof info === 'string' ? info.slice(0, 600) : JSON.stringify(info))); } };
const hazi = (fn) => { try { fn(); return ''; } catch (e) { return e.message || String(e); } };
const odst = t => '<w:p><w:r><w:t xml:space="preserve">' + t + '</w:t></w:r></w:p>';
const zn = j => odst('{{' + j + '}}');
const blok = (j, t) => zn(j + '_ZAC') + odst(t) + zn(j + '_KON');
const text = xml => (xml.match(/<w:p[\s>](?:(?!<\/w:p>)[\s\S])*?<\/w:p>/g) || []).map(dg.odstavecText).filter(Boolean);
const PRYC = ['BLOK_STUDIE_POZN', 'BLOK_STUDIE_ROZSAH', 'BLOK_STUDIE_CENA'];

/* ---- K4-N6 ---- */
{
  const v7 = (bezRozsahu, symbol) => '<w:body>' + odst('{{' + (symbol || 'PROJ_DPZ_UVOD') + '}}')
    + blok('BLOK_STUDIE_POZN', 'Poznámka o studii')
    + (bezRozsahu ? odst('STUDIE PROVEDITELNOSTI (ST): rozsah') : blok('BLOK_STUDIE_ROZSAH', 'STUDIE PROVEDITELNOSTI (ST): rozsah'))
    + blok('BLOK_STUDIE_CENA', 'CENA ZA STUDII') + odst('Projekt DPZ') + '</w:body>';
  const e1 = hazi(() => dg.odstranPrazdneBloky(v7(true), {}, PRYC));
  test('K4-N6: v7 ({{PROJ_DPZ_UVOD}}) bez bloku BLOK_STUDIE_ROZSAH → chyba, nabídka nevznikne',
    /BLOK_STUDIE_ROZSAH/.test(e1) && /nevznikne/.test(e1) && /nabídky PROJ/.test(e1), e1);
  const e2 = hazi(() => dg.odstranPrazdneBloky(v7(true, 'PROJ_TITUL_CINNOSTI'), {}, PRYC));
  test('K4-N6: v7 poznaná podle {{PROJ_TITUL_CINNOSTI}} → také chyba', /BLOK_STUDIE_ROZSAH/.test(e2), e2);
  const t = text(dg.odstranPrazdneBloky(v7(false), {}, PRYC));
  test('K4-N6: úplná v7 bez studie — bloky studie zmizí, ostatní zůstane',
    JSON.stringify(t) === JSON.stringify(['{{PROJ_DPZ_UVOD}}', 'Projekt DPZ']), t);
  test('K4-N6: v7 se studií (seznam pryč prázdný) nehází ani bez bloků',
    hazi(() => dg.odstranPrazdneBloky(v7(true), {}, [])) === '');
  const v6 = '<w:body>' + odst('{{PROJ_CENA_DPZ}}') + odst('STUDIE PROVEDITELNOSTI (ST): rozsah') + '</w:body>';
  test('K4-N6: v6 (bez symbolů v7) se nemění a nehází', hazi(() => dg.odstranPrazdneBloky(v6, {}, PRYC)) === ''
    && dg.odstranPrazdneBloky(v6, {}, PRYC) === v6);
  const e3 = hazi(() => dg.odstranPrazdneBloky('<w:body>' + odst('{{SODP_ROZSAH_DILA}}') + '</w:body>', {}, ['CIN_B']));
  test('K3-N3 beze změny: SoD PROJ v4 dál hlásí chybějící činnost textem smlouvy', /Šablona smlouvy/.test(e3) && /CIN_B/.test(e3), e3);
}

/* ---- K4-N7: „Zapsat výchozí hodnoty" zveřejní jen podmínky (firmaJenPodminky) ---- */
{
  const fm = require('./firma.js');
  const online = Object.assign(fm.firmaDefault(), { nazev: 'Online s.r.o.', kapPozadavky: 'Online IV.', podminky: { v: 1, limitPokutProc: 10 } });
  delete online.ukazkove;
  const mistni = JSON.parse(JSON.stringify(online));
  mistni.podminky = { v: 1, limitPokutProc: 12 };
  const jen1 = typeof fm.firmaJenPodminky === 'function' ? fm.firmaJenPodminky(mistni, online) : null;
  test('K4-N7: liší se jen podmínky → odejde místní Firma, nic dalšího nehlásí',
    !!jen1 && jen1.udaje === mistni && jen1.ostatni.length === 0, jen1);
  mistni.nazev = 'Místní rozepsaný název'; mistni.kapPozadavky = 'Místní IV.';
  const jen2 = typeof fm.firmaJenPodminky === 'function' ? fm.firmaJenPodminky(mistni, online) : null;
  test('K4-N7: další rozdíly → odejde online kopie s místními podmínkami, rozdíly vyjmenované',
    !!jen2 && jen2.udaje.nazev === 'Online s.r.o.' && jen2.udaje.kapPozadavky === 'Online IV.'
      && jen2.udaje.podminky.limitPokutProc === 12 && jen2.ostatni.length === 2 && jen2.ostatni[0] === 'Název firmy', jen2);
  test('K4-N7: online kopie se nepřepíše (kopie, ne odkaz)', online.podminky.limitPokutProc === 10 && online.nazev === 'Online s.r.o.');
  test('K4-N7: bez online kopie null (první zveřejnění jako dosud)',
    typeof fm.firmaJenPodminky === 'function' && fm.firmaJenPodminky(mistni, null) === null);
}

console.log('\n' + ok + ' prošlo, ' + fail + ' selhalo');
process.exit(fail ? 1 : 0);
