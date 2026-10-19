/* ŠABLONA NABÍDKY PROJ v6 — TEXTY NABÍDKY PROJ Z NASTAVENÍ → FIRMA
 * (dávka W1, zadání J. V. 19. 10. 2026; navazuje na #367 fáze 2b / Q5).
 *
 * Od v19.10.7 má Firma texty nabídky PROJ (Cena nezahrnuje, Požadováno od
 * investora, Termíny, Doložky) a online nabídka je bere, šablona Wordu PROJ
 * v5 je ale nesla natvrdo. PROJ v6 (nastroje/vyrob_sablony.js --proj-v6) je
 * nahradí symboly:
 *
 *   {{BLOK_CENA_NEZAHRNUJE_ZAC}}
 *   [ CENA NEZAHRNUJE:              ]  ← nadpisový řádek z v5
 *   [ {{PROJ_CENA_NEZAHRNUJE}}      ]  ← aplikace řádek zopakuje za odrážku
 *   {{BLOK_CENA_NEZAHRNUJE_KON}}
 *   … POŽADOVÁNO OD INVESTORA totéž,
 *   … TERMÍNY: [ {{PROJ_TERMINY_CINNOST}} | {{PROJ_TERMINY_TERMIN}} ] + poznámky,
 *   … DOLOŽKY (nový blok, zmizí, když jsou doložky PROJ vypnuté / prázdné).
 *
 * Hlídá se úprava šablony (syntetické XML — skutečné šablony v repozitáři
 * nejsou), rozvinutí řádků v aplikaci (docxgen rozvinRadkyZaRadek, dvojice
 * sloupců termínů) a to, že s výchozí Firmou dá v6 tytéž texty jako online
 * nabídka. S KNG_PODKLADY (složka se Sablona_NABIDKA_PROJ_v5.docx) se ověří
 * i skutečná v5: mimo tři bloky je text v6 shodný s v5 („výstup se
 * nezměnil") a rozdíly v blocích jsou jen známé rozdíly znění v5 × Firma.
 * Před zavedením režimu v6 sada selže na první kontrole.
 *
 * Spuštění: cd src && node test_sablona_proj_v6.js */
const fs = require('fs');
const path = require('path');
const nacti = (f) => { const m = require(f); Object.keys(m).forEach(k => { if (global[k] === undefined) global[k] = m[k]; }); return m; };
const ZC = require('./zkusebni_cenik.js');
nacti('./format.js');
nacti('./preklad.js');
const dg = nacti('./docxgen.js');
nacti('./engine.js');
global.DEFAULT_CENIK = ZC.zkusebniCenik();
nacti('./engine_proj.js');
global.DEFAULT_CENIK_PROJ = ZC.zkusebniCenikProj();
nacti('./techspec.js');
nacti('./sleva.js');
nacti('./zaokrouhleni.js');
nacti('./firma.js');
nacti('./plan_plateb.js');
const PD = nacti('./podminky.js');
const NP = nacti('./nabidka_proj.js');
const zk = nacti('./zakazka.js');
nacti('./zamek.js');
nacti('./kryci.js');
nacti('./kryci_proj.js');

let ok = 0, fail = 0;
const test = (n, cond, info) => { if (cond) { ok++; console.log('OK   ' + n); } else { fail++; console.log('FAIL ' + n, info === undefined ? '' : (typeof info === 'string' ? info.slice(0, 600) : JSON.stringify(info).slice(0, 600))); } };
const chybaZ = (fn) => { try { fn(); return ''; } catch (e) { return e.message; } };

let VS = null;
try { VS = require(path.join(__dirname, '..', 'nastroje', 'vyrob_sablony.js')); } catch (e) { VS = null; }
test('nastroje/vyrob_sablony.js exportuje projV6', !!(VS && typeof VS.projV6 === 'function'));
test('docxgen rozvíjí řádky tabulky i pro texty PROJ (dvojice termínů)',
  dg.DOCX_RADKY_ZA_RADEK.indexOf('PROJ_CENA_NEZAHRNUJE') >= 0
  && dg.DOCX_RADKY_ZA_RADEK.some(k => Array.isArray(k) && k.join() === 'PROJ_TERMINY_CINNOST,PROJ_TERMINY_TERMIN'));
if (fail) { console.log(`\n${ok} prošlo, ${fail} selhalo`); process.exit(1); }

/* ---- syntetická PROJ v5: tabulky o jednom / dvou sloupcích ---- */
const r = t => '<w:r><w:rPr><w:b/><w:sz w:val="22"/></w:rPr><w:t xml:space="preserve">' + t + '</w:t></w:r>';
const p = (t, id) => '<w:p' + (id ? ' w14:paraId="' + id + '"' : '') + '><w:pPr><w:pStyle w:val="Bezmezer"/></w:pPr>' + (t ? r(t) : '') + '</w:p>';
const tc = (...ps) => '<w:tc><w:tcPr><w:tcW w:w="4000" w:type="dxa"/></w:tcPr>' + ps.join('') + '</w:tc>';
const tr = (...tcs) => '<w:tr w14:paraId="0A0A0A0A"><w:trPr><w:trHeight w:val="300"/></w:trPr>' + tcs.join('') + '</w:tr>';
const tbl = (sl, ...trs) => '<w:tbl><w:tblPr><w:tblW w:w="10000" w:type="dxa"/></w:tblPr><w:tblGrid>'
  + '<w:gridCol w:w="4000"/>'.repeat(sl) + '</w:tblGrid>' + trs.join('') + '</w:tbl>';
const NEZ_V5 = ['Případné studie a průzkumy nad rámec nabídky', 'Správní poplatky úřadům, správcům sítí a za KOLAUDACI'];
const V5XML = '<w:document><w:body>'
  + p('{{BLOK_AD_ZAC}}') + tbl(1, tr(tc(p('MĚSÍČNÍ SAZBA'), p('{{PROJ_CENA_AD_BLOK}}')))) + p('{{BLOK_AD_KON}}') + p('')
  + tbl(1, tr(tc(p('CENA NEZAHRNUJE:'))), ...NEZ_V5.map((t, i) => tr(tc(p(t, '1111000' + i))))) + p('')
  + tbl(1, tr(tc('<w:p>' + r('POŽADOVÁNO OD ') + r('INVESTORA:') + '</w:p>')), tr(tc(p('Plná moc k přístupu do archivu stavebního úřadu'))), tr(tc(p('Zajištění přístupu do objektu')))) + p('')
  + tbl(1, tr(tc(p('DPH, SPLATNOST FAKTUR A PLATNOST NABÍDKY:'))), tr(tc(p('Splatnost {{PODM_SPLATNOST_DNI_CISLO}} dní'))))
  + p('') + tbl(2, tr(tc(p(' TERMÍNY:')), tc(p(''))),
    tr(tc(p('Provedení detailního zaměření a stavebně technického průzkumu')), tc(p(''), p('ZAMĚŘENÍ na stavbě do 4 týdnů'), p('Zpracování VÝSTUPŮ do 4-6 týdnů'))),
    tr(tc(p('Ekonomická Zadávací Část (EZC)')), tc(p('do 2 týdnů od zpracování projektu'))))
  + p('*) Termíny pro vyjádření dotčených orgánů a stavebního úřadu nejsou závazné.')
  + p('   Termíny zpracování můžou být upraven dle volných kapacit zhotovitele v okamžiku objednání.')
  + p('') + p('REKAPITULACE CENOVÉ NABÍDKY') + p('{{PROJ_CELKEM_BEZ_DPH}}')
  + '<w:sectPr/></w:body></w:document>';

let v6 = '';
const ch = chybaZ(() => { v6 = VS.projV6(V5XML); });
test('v6: vznikne bez chyby', !ch, ch);
const kl = dg.klicePlaceholderu(v6);
test('v6: symboly textů Firmy a značky bloků jsou', ['PROJ_CENA_NEZAHRNUJE', 'PROJ_POZADOVANO_OD_INVESTORA', 'PROJ_TERMINY_CINNOST',
  'PROJ_TERMINY_TERMIN', 'PROJ_DOLOZKY'].every(k => kl.indexOf(k) >= 0)
  && ['BLOK_CENA_NEZAHRNUJE', 'BLOK_POZADOVANO', 'BLOK_TERMINY', 'BLOK_DOLOZKY'].every(b => kl.indexOf(b + '_ZAC') >= 0 && kl.indexOf(b + '_KON') >= 0), kl);
test('v6: pevné texty bloků z v5 zmizely', !/Případné studie|Správní poplatky|Plná moc k přístupu|Zajištění přístupu|Provedení detailního|ZAMĚŘENÍ na stavbě|Zadávací Část/.test(v6));
test('v6: nadpisy, poznámky pod termíny a okolní text zůstaly', ['CENA NEZAHRNUJE:', 'INVESTORA:', ' TERMÍNY:', 'DOLOŽKY:',
  '*) Termíny pro vyjádření', 'Termíny zpracování můžou', 'DPH, SPLATNOST FAKTUR', 'REKAPITULACE CENOVÉ NABÍDKY', '{{PROJ_CENA_AD_BLOK}}'].every(t => v6.indexOf(t) >= 0));
test('v6: platné XML', !dg.xmlStrukturaVada(v6), dg.xmlStrukturaVada(v6));
/* Bloky vyvážené: ZAC před KON, ve stejné úrovni (tělo), obsah tvoří celé tabulky / odstavce. */
{
  const zn = dg.docxZnackyBloku(v6);
  const jmena = ['BLOK_CENA_NEZAHRNUJE', 'BLOK_POZADOVANO', 'BLOK_TERMINY', 'BLOK_DOLOZKY'];
  const vyv = jmena.every(j => {
    const a = zn.filter(z => z.jmeno === j && z.typ === 'ZAC'), b = zn.filter(z => z.jmeno === j && z.typ === 'KON');
    return a.length === 1 && b.length === 1 && a[0].kon <= b[0].zac && dg.docxVyvazene(v6.slice(a[0].kon, b[0].zac)) && !dg.docxVBunce(v6, a[0].zac);
  });
  test('v6: bloky vyvážené (jeden pár, mimo tabulku, uvnitř celé tabulky)', vyv, zn.map(z => z.jmeno + '_' + z.typ));
  const i = t => v6.indexOf(t);
  test('v6: poznámky pod termíny jsou uvnitř bloku termínů, doložky hned za ním',
    i('{{BLOK_TERMINY_ZAC}}') < i('*) Termíny') && i('Termíny zpracování') < i('{{BLOK_TERMINY_KON}}')
    && i('{{BLOK_TERMINY_KON}}') < i('{{BLOK_DOLOZKY_ZAC}}') && i('{{BLOK_DOLOZKY_KON}}') < i('REKAPITULACE'));
}
test('v6: řádky se symboly nenesou w14:paraId (aplikace je opakuje)', !/w14:paraId="1111000/.test(v6)
  && (v6.match(/<w:tr w14:paraId=/g) || []).length === 6, (v6.match(/<w:tr w14:paraId=/g) || []).length);
test('v6: řádek se symbolem má písmo prvního běhu vzoru', /<w:rPr><w:b\/><w:sz w:val="22"\/><\/w:rPr><w:t xml:space="preserve">\{\{PROJ_CENA_NEZAHRNUJE\}\}/.test(v6));
test('v6: druhý průchod odmítne', /už texty nabídky PROJ/.test(chybaZ(() => VS.projV6(v6))));
test('v6: vstup bez bloku AD (v4) odmítne', /není PROJ v5/.test(chybaZ(() => VS.projV6(V5XML.replace('{{PROJ_CENA_AD_BLOK}}', '{{PROJ_CENA_AD}}')))));
test('v6: chybí tabulka CENA NEZAHRNUJE → chyba (nic nehádá)', /CENA NEZAHRNUJE/.test(chybaZ(() => VS.projV6(V5XML.replace('CENA NEZAHRNUJE:', 'X')))));
test('v6: chybí poznámky pod termíny → chyba', /poznámky/.test(chybaZ(() => VS.projV6(V5XML.replace('*) Termíny pro vyjádření', 'Jiná věta')))));
test('v6: termíny o jednom sloupci → chyba', /buněk/.test(chybaZ(() => VS.projV6(V5XML.replace(
  '<w:tc><w:tcPr><w:tcW w:w="4000" w:type="dxa"/></w:tcPr>' + p('Provedení detailního zaměření a stavebně technického průzkumu') + '</w:tc>', '')))));

/* ---- rozvinutí řádků v aplikaci ---- */
{
  const t2 = tbl(2, tr(tc(p('{{A_CIN}}')), tc(p('{{A_TER}}'))));
  const puv = dg.DOCX_RADKY_ZA_RADEK.slice();
  dg.DOCX_RADKY_ZA_RADEK.push(['A_CIN', 'A_TER']);
  const x = dg.rozvinRadkyZaRadek(t2, { A_CIN: 'Jedna\n\nTři', A_TER: 'do 1\nnic vlevo\n' });
  dg.DOCX_RADKY_ZA_RADEK.length = 0; puv.forEach(k => dg.DOCX_RADKY_ZA_RADEK.push(k));
  const radky = (x.match(/<w:tr[\s>][\s\S]*?<\/w:tr>/g) || []).map(rr => (rr.match(/<w:t[^>]*>[^<]*<\/w:t>/g) || []).map(t => t.replace(/<[^>]+>/g, '')).join('|'));
  test('dvojice sloupců: řádek za každý index, sloupce zarovnané, prázdný index vynechán', radky.join(' / ') === 'Jedna|do 1 / |nic vlevo / Tři|', radky);
}

/* ---- co do v6 dosadí aplikace ---- */
global.NAST = { firma: global.firmaDefault() };
const novaZ = (vse) => {
  const z = zk.novaZakazka(); z.cislo = '2026 - OVP - CN - 406'; z.varianty[0].data.proj.cenik = ZC.zkusebniCenikProj();
  if (vse) z.varianty[0].data.proj.zadani.sekce.forEach(s => (s.polozky || []).forEach(x => { x.vyrazeno = false; }));
  return z;
};
/* pořadí jako v docxVyplnSablonu */
const vyplnXml = (xml, ph) => dg.nahradPlaceholdery(dg.rozvinRadkyZaRadek(dg.odstranPrazdneBloky(xml, ph), ph), ph);
const textTabulky = (xml, kotva) => {
  const i = xml.indexOf(kotva); if (i < 0) return null;
  const tab = xml.slice(xml.lastIndexOf('<w:tbl>', i), xml.indexOf('</w:tbl>', i) + 8);
  return (tab.match(/<w:tr[\s>][\s\S]*?<\/w:tr>/g) || []).map(rr => (rr.match(/<w:tc[\s>][\s\S]*?<\/w:tc>/g) || [])
    .map(c => dg.xmlUnesc((c.match(/<w:t(?:\s[^>]*)?>[^<]*<\/w:t>/g) || []).map(t => t.replace(/<[^>]+>/g, '')).join(''))).join(' | '));
};
{
  const z = novaZ(true), v = z.varianty[0];
  const ph = NP.nabidkaProjData(z, v, 'cz').placeholders;
  const x = vyplnXml(v6, ph);
  const ef = PD.podminkyEfektivni ? PD.podminkyEfektivni(null) : null;
  const vych = PD.PODMINKY_VYCHOZI.nabidkaProj;
  test('výchozí Firma: CENA NEZAHRNUJE = výchozí odrážky, každá ve vlastním řádku',
    JSON.stringify(textTabulky(x, 'CENA NEZAHRNUJE:')) === JSON.stringify(['CENA NEZAHRNUJE:'].concat(vych.cenaNezahrnuje.cz)), textTabulky(x, 'CENA NEZAHRNUJE:'));
  test('výchozí Firma: POŽADOVÁNO OD INVESTORA = výchozí odrážky',
    JSON.stringify(textTabulky(x, 'INVESTORA:')) === JSON.stringify(['POŽADOVÁNO OD INVESTORA:'].concat(vych.pozadovano.cz)), textTabulky(x, 'INVESTORA:'));
  const ter = textTabulky(x, ' TERMÍNY:');
  const terOnline = ((NP.nabidkaProjData(z, v, 'cz').bloky || []).find(b => b.nadpis === 'TERMÍNY') || { radky: [] }).radky;
  test('nabízené činnosti: TERMÍNY = dvojice činnost | termín ve dvou sloupcích, tytéž jako online nabídka (aspoň 8)',
    terOnline.length >= 8 && JSON.stringify(ter) === JSON.stringify([' TERMÍNY: | '].concat(terOnline.map(t => t[0] + ' | ' + t[1])))
    && terOnline.every(t => vych.terminy.cz.some(d => d[0] === t[0] && d[1] === t[1])), [ter, terOnline]);
  test('doložky PROJ výchozí vypnuté: blok DOLOŽKY zmizel celý', x.indexOf('DOLOŽKY') < 0 && !/\{\{/.test(x.replace(/<[^>]+>/g, '')), ef);
  test('platné XML po vyplnění', !dg.xmlStrukturaVada(x), dg.xmlStrukturaVada(x));
  /* online nabídka a Word mají tytéž řádky */
  const d = NP.nabidkaProjData(z, v, 'cz');
  const online = (d.bloky || []).find(b => b.nadpis === 'CENA NEZAHRNUJE');
  test('Word v6 = online nabídka (CENA NEZAHRNUJE)', online && JSON.stringify(online.radky) === JSON.stringify(textTabulky(x, 'CENA NEZAHRNUJE:').slice(1)), online);
}
{
  const z = novaZ(false), v = z.varianty[0];
  const ph = NP.nabidkaProjData(z, v, 'cz').placeholders;
  const ter = textTabulky(vyplnXml(v6, ph), ' TERMÍNY:');
  test('nová zakázka (bez zaměření): termín zaměření se netiskne, ostatní ano', ter.length > 2
    && !ter.some(t => /zaměření a stavebně technického/.test(t)) && ter.some(t => /^Zpracování STUDIE/.test(t)), ter);
}
{
  /* vlastní texty a zapnuté doložky z Firmy */
  const f = global.firmaDefault();
  let pm = PD.podminkyNastavTextProj(f.podminky, 'cenaNezahrnuje', 'cz', ['Vlastní výjimka A', 'Vlastní výjimka B']);
  pm = PD.podminkyNastavTextProj(pm, 'dolozky', 'cz', ['Autorská práva k dokumentaci náleží firmě {FIRMA}.', 'Druhá doložka.']);
  pm = PD.podminkyNastavTextProj(pm, 'dolozkyTisk', null, true);
  f.podminky = pm;
  global.NAST = { firma: f };
  const z = novaZ(true), v = z.varianty[0];
  const ph = NP.nabidkaProjData(z, v, 'cz').placeholders;
  const x = vyplnXml(v6, ph);
  test('vlastní texty Firmy: CENA NEZAHRNUJE tiskne vlastní odrážky', JSON.stringify(textTabulky(x, 'CENA NEZAHRNUJE:').slice(1)) === '["Vlastní výjimka A","Vlastní výjimka B"]', textTabulky(x, 'CENA NEZAHRNUJE:'));
  const dol = textTabulky(x, 'DOLOŽKY:');
  test('zapnuté doložky: blok DOLOŽKY s řádkem za doložku, {FIRMA} nahrazena', dol && dol.length === 3 && /^Autorská práva/.test(dol[1])
    && dol[1].indexOf('{FIRMA}') < 0 && dol[2] === 'Druhá doložka.', dol);
  pm = PD.podminkyNastavTextProj(pm, 'dolozky', 'cz', null);
  f.podminky = pm;
  const x2 = vyplnXml(v6, NP.nabidkaProjData(z, v, 'cz').placeholders);
  test('zapnuté, ale prázdné doložky: blok zmizí', x2.indexOf('DOLOŽKY') < 0);
  global.NAST = { firma: global.firmaDefault() };
}
{
  const z = novaZ(true), v = z.varianty[0];
  v.data.proj.cenik.kurzEurKc = 25;
  const ph = NP.nabidkaProjData(z, v, 'en').placeholders;
  const x = vyplnXml(v6, ph);
  const nez = textTabulky(x, 'CENA NEZAHRNUJE:');
  test('EN: odrážky přeložené slovníkem (bez české diakritiky)', nez.length === 4 && nez.slice(1).every(t => t && !/[ěščřžůú]/i.test(t)), nez);
}

/* ---- skutečná šablona PROJ v5 (jen s KNG_PODKLADY) ---- */
(async () => {
  const zdroj = process.env.KNG_PODKLADY ? path.join(process.env.KNG_PODKLADY, 'Sablona_NABIDKA_PROJ_v5.docx') : '';
  if (!zdroj || !fs.existsSync(zdroj)) {
    console.log('–    skutečná šablona PROJ v5 (KNG_PODKLADY) není po ruce — přeskočeno');
  } else {
    const casti = await dg.zipPrecti(new Uint8Array(fs.readFileSync(zdroj)));
    const xml5 = new TextDecoder().decode(casti.find(x => x.nazev === 'word/document.xml').data);
    let xml6 = '';
    const ch6 = chybaZ(() => { xml6 = VS.projV6(xml5); });
    test('skutečná v5: v6 vznikne bez chyby', !ch6, ch6);
    test('skutečná v5: XML v6 bez vad', !dg.xmlStrukturaVada(xml6), dg.xmlStrukturaVada(xml6));
    /* v5 sama nese pár zdvojených id (Word je při otevření opraví); v6 nesmí přidat další */
    const dvoji = x => { const ids = x.match(/w14:paraId="[^"]*"/g) || []; return ids.length - new Set(ids).size; };
    test('skutečná v5: v6 nepřidala zdvojené w14:paraId', dvoji(xml6) <= dvoji(xml5), [dvoji(xml5), dvoji(xml6)]);
    const z = novaZ(true), v = z.varianty[0];
    v.data.proj.zadani.nabizetAD = true;
    const ph = NP.nabidkaProjData(z, v, 'cz').placeholders;
    const t6 = vyplnXml(xml6, ph), t5 = vyplnXml(xml5, ph);
    /* text mimo tři bloky: tabulky CENA NEZAHRNUJE / POŽADOVÁNO / TERMÍNY se z obou vynechají */
    const bezBloku = xml => {
      let s = xml;
      ['CENA NEZAHRNUJE:', 'POŽADOVÁNO OD', 'TERMÍNY:'].forEach(k => {
        const i = s.indexOf(k); if (i < 0) return;
        s = s.slice(0, s.lastIndexOf('<w:tbl>', i)) + s.slice(s.indexOf('</w:tbl>', i) + 8);
      });
      return dg.xmlUnesc((s.match(/<w:t(?:\s[^>]*)?>[^<]*<\/w:t>/g) || []).map(t => t.replace(/<[^>]+>/g, '')).join(''));
    };
    const a6 = bezBloku(t6), a5 = bezBloku(t5);
    let i = 0; while (i < a6.length && a6[i] === a5[i]) i++;
    test('skutečná v6 s výchozí Firmou: text mimo bloky shodný s v5 (výstup se nezměnil)', a6 === a5,
      'liší se od znaku ' + i + ': v6 „' + a6.slice(i - 40, i + 80) + '" × v5 „' + a5.slice(i - 40, i + 80) + '"');
    /* bloky: řádky v6 = výchozí Firma; od v5 se liší jen známým zněním */
    const norm = s => String(s).toLowerCase().replace(/[–-]/g, '-').replace(/\s+/g, ' ').replace(/\s*\*\)\s*/g, '').replace(/[.\s]+$/, '').trim();
    const ZNAME = [
      'Součástí ceny není řešení samostatných řízení vyplývajících z podmínek stanovisek DOSS, zejména pak Odboru památkové péče, a řešení námitek nebo odvolání účastníků řízení',
      'ZAMĚŘENÍ na stavbě do 4 týdnů od objednání a předání plné moci; zpracování VÝSTUPŮ do 4–6 týdnů od zaměření',
      'cca do 4 týdnů od podání žádosti (v případě potřeby stanoviska hygieny a/nebo památkové péče cca do 2,5 měsíce)',
      'cca 2 měsíce od podání žádosti + 1 měsíc na nabytí právní moci povolení záměru',
      'Ekonomická zadávací část (EZC)',
    ];
    const radky = xml => ['CENA NEZAHRNUJE:', 'POŽADOVÁNO OD', 'TERMÍNY:'].map(k => (textTabulky(xml, k) || []).slice(1)
      .map(rr => rr.split(' | '))).reduce((a, x) => a.concat(...x), []).filter(Boolean);
    const r5 = new Set(radky(t5).map(norm)), r6 = radky(t6);
    const jine = r6.filter(t => !r5.has(norm(t)));
    test('skutečná v6: řádky bloků = v5 až na známé rozdíly znění Firmy', JSON.stringify(jine.slice().sort()) === JSON.stringify(ZNAME.slice().sort()), jine);
    console.log('INFO rozdíly znění v5 → výchozí Firma (v6): ' + jine.length + ' řádků');
  }
  console.log(`\n${ok} prošlo, ${fail} selhalo`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.log('FAIL výjimka: ' + (e && e.stack || e)); process.exit(1); });
