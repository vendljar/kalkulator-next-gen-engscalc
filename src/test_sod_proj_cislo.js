/* ČÍSLO SoD VE SMLOUVĚ O DÍLO PROJEKCE (zadání J. V. 15. 10. 2026, dávka S9,
 * v15.10.11): „Aktualizuj šablony, aby se nám do nich číslo SoD propisovalo
 * z krycího listu zakázky ve chvíli, kdy tam bude vyplněné."
 *
 * S7 (v15.10.9) plní {{SOD_CISLO_SMLOUVY}} z pole „Číslo SoD" krycího listu
 * PROJ, ale šablony SoD projekce (v1 i v2) symbol neměly — číslo se do
 * smlouvy PROJ nevypsalo. `nastroje/vyrob_sablony.js --sod-proj-cislo`
 * (sodProjCislo) vloží pod nadpis „SMLOUVA O DÍLO / na zhotovení projektové
 * dokumentace" řádek „číslo {{SOD_CISLO_SMLOUVY}}" jako u realizace.
 *
 * Hlídá:
 *  1) úpravu šablony nad syntetickým XML ve stavbě skutečné šablony (nadpis,
 *     podtitul, seznam plateb v2): nový odstavec hned za podtitulem, stejné
 *     zarovnání a písmo, symbol v JEDNOM běhu, platné XML, nic jiného
 *     se nezmění; v1 i v2 (z výroby sodProjV2),
 *  2) chyby místo hádání: symbol už je, podtitul chybí / je dvakrát,
 *     nad podtitulem není nadpis,
 *  3) vygenerovanou SoD PROJ (dokumentVygeneruj jako v aplikaci): vyplněné
 *     číslo z krycího listu PROJ je ve smlouvě; prázdné → {{SOD_CISLO_SMLOUVY}}
 *     zůstane vidět k doplnění; stará šablona bez symbolu dál projde,
 *  4) se skutečnými šablonami v KNG_PODKLADY (Sablona_SOD_PROJEKCE.docx,
 *     _v2, _v3, _v1_cislo) totéž nad opravdovým Wordem — jinak přeskočeno.
 * Před doplněním sodProjCislo sada selže na první kontrole.
 *
 * Spuštění: cd src && node test_sod_proj_cislo.js */
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
['./techspec.js', './sleva.js', './zaokrouhleni.js', './firma.js', './zpracovatel.js', './plan_plateb.js',
  './nabidka_proj.js'].forEach(nacti);
const zk = nacti('./zakazka.js');
nacti('./zamek.js'); nacti('./kryci.js'); nacti('./kryci_proj.js'); nacti('./kontroly.js');
const DK = nacti('./dokumenty.js');
nacti('./nabidka.js');
nacti('./sod.js');
const JEKLY = JSON.parse(fs.readFileSync(__dirname + '/jekly.json', 'utf8'));
let VS = null;
try { VS = require(path.join(__dirname, '..', 'nastroje', 'vyrob_sablony.js')); } catch (e) { VS = null; }

let ok = 0, fail = 0;
const test = (n, cond, info) => { if (cond) { ok++; console.log('OK   ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : (typeof info === 'string' ? info.slice(0, 600) : JSON.stringify(info))); } };
const hazi = (fn) => { try { fn(); return ''; } catch (e) { return e.message || String(e); } };
const konec = () => { console.log(`\n${ok} prošlo, ${fail} selhalo`); process.exit(fail ? 1 : 0); };

test('nastroje/vyrob_sablony.js umí doplnit číslo smlouvy do SoD PROJ (sodProjCislo)', !!(VS && typeof VS.sodProjCislo === 'function'));
if (fail) konec();

/* ---- 1) syntetická šablona ve stavbě skutečné SoD PROJ ---- */
const SYM = 'SOD_CISLO_SMLOUVY';
const PPR_NADPIS = '<w:pPr><w:jc w:val="center"/><w:rPr><w:b/><w:sz w:val="32"/></w:rPr></w:pPr>';
const RPR_NADPIS = '<w:rPr><w:b/><w:sz w:val="32"/></w:rPr>';
const PPR_PODTITUL = '<w:pPr><w:spacing w:after="240"/><w:jc w:val="center"/><w:rPr><w:b/><w:sz w:val="24"/></w:rPr></w:pPr>';
const RPR_PODTITUL = '<w:rPr><w:b/><w:sz w:val="24"/></w:rPr>';
const odst = (pPr, ...behy) => '<w:p w14:paraId="1A2B3C4D">' + pPr + behy.join('') + '</w:p>';
const beh = (t, rPr) => '<w:r>' + (rPr || '') + '<w:t xml:space="preserve">' + t + '</w:t></w:r>';
const NADPIS = odst(PPR_NADPIS, beh('SMLOUVA O DÍLO', RPR_NADPIS));
/* Podtitul rozdělený do běhů a s nezlomitelnou mezerou jako z Wordu. */
const PODTITUL = odst(PPR_PODTITUL, beh('na zhotovení ', RPR_PODTITUL), beh('projektové dokumentace', RPR_PODTITUL));
const STRANY = odst('', beh('I. Smluvní strany')) + odst('', beh('Objednatel: {{OBJEDNATEL}}'));
const VETY = odst('', beh('V případě prodlení zhotovitele s plněním dle bodu III. má právo objednatel zhotoviteli účtovat {{PODM_POKUTA_SPLATNOST_PROC}} % z ceny části Díla v prodlení.'))
  + odst('', beh('Pro případ prodlení objednatele s úhradou peněžitého plnění sjednávají smluvní strany smluvní pokutu ve výši {{PODM_POKUTA_SPLATNOST_PROC}} % z dlužné částky.'));
const PLATBY = [1, 2, 3, 4, 5, 6, 7, 8].map(n => odst('', beh('Platba ve výši {{SODP_PLATBA' + n + '_KC}} + DPH proběhne …'))).join('');
const dokument = telo => '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml"><w:body>'
  + telo + '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/></w:sectPr></w:body></w:document>';
const V1 = dokument(NADPIS + PODTITUL + STRANY + VETY + PLATBY);
const text = x => (x.match(/<w:p[\s>][\s\S]*?<\/w:p>/g) || []).map(p => dg.odstavecText(p));

let v1c = '';
const zaznam = [];
const ch = hazi(() => { v1c = VS.sodProjCislo(V1, zaznam); });
test('SoD PROJ v1: číslo smlouvy se doplní bez chyby', !ch, ch);
{
  const t = text(v1c);
  const iPod = t.findIndex(x => /na zhotovení/.test(x));
  test('SoD PROJ v1: řádek „číslo {{' + SYM + '}}" je hned pod podtitulem nadpisu (jako u realizace)',
    t[0] === 'SMLOUVA O DÍLO' && iPod === 1 && t[2] === 'číslo {{' + SYM + '}}', t.slice(0, 4));
  test('SoD PROJ v1: symbol stojí v jednom běhu (Word ho dosadí)',
    v1c.indexOf('<w:t xml:space="preserve">číslo {{' + SYM + '}}</w:t>') >= 0);
  const novy = (v1c.match(/<w:p>[\s\S]*?číslo \{\{SOD_CISLO_SMLOUVY\}\}[\s\S]*?<\/w:p>/) || [''])[0];
  test('SoD PROJ v1: nový řádek má zarovnání a písmo podtitulu (formát nadpisu zachován)',
    novy.indexOf(PPR_PODTITUL) >= 0 && novy.indexOf('<w:r>' + RPR_PODTITUL + '<w:t') >= 0, novy);
  test('SoD PROJ v1: nový odstavec nenese cizí w14:paraId (duplicitní id by Word hlásil)', !/paraId/.test(novy));
  test('SoD PROJ v1: XML bez vad', !dg.xmlStrukturaVada(v1c), dg.xmlStrukturaVada(v1c));
  test('SoD PROJ v1: kromě nového řádku je dokument beze změny',
    v1c.replace(novy, '') === V1, v1c.length - V1.length);
  test('SoD PROJ v1: přibyl jen symbol čísla smlouvy',
    JSON.stringify(dg.klicePlaceholderu(v1c).filter(k => dg.klicePlaceholderu(V1).indexOf(k) < 0)) === JSON.stringify([SYM]));
  test('záznam výroby popisuje doplněný řádek', zaznam.length === 1 && /číslo \{\{SOD_CISLO_SMLOUVY\}\}/.test(zaznam[0]), zaznam);
}
let v3 = '';
{
  const ch2 = hazi(() => { v3 = VS.sodProjCislo(VS.sodProjV2(V1)); });
  test('SoD PROJ v2 (výroba sodProjV2): číslo smlouvy se doplní → v3', !ch2, ch2);
  const k = dg.klicePlaceholderu(v3);
  test('v3: má číslo smlouvy i seznam plateb a pokutu za nedodržení termínu',
    [SYM, 'SODP_PLATEBNI_KALENDAR', 'PODM_POKUTA_TERMIN_PROC'].every(s => k.indexOf(s) >= 0) && !/SODP_PLATBA\d/.test(v3), k);
  test('v3: XML bez vad', !dg.xmlStrukturaVada(v3), dg.xmlStrukturaVada(v3));
}

/* ---- 2) chyby místo hádání ---- */
{
  const uz = hazi(() => VS.sodProjCislo(v1c));
  test('chyba, když šablona číslo smlouvy už má (nevloží se podruhé)', /už číslo smlouvy/.test(uz), uz);
  const bez = hazi(() => VS.sodProjCislo(dokument(NADPIS + STRANY + PLATBY)));
  test('chyba, když chybí podtitul nadpisu', /právě jeden podtitul/.test(bez), bez);
  const dva = hazi(() => VS.sodProjCislo(dokument(NADPIS + PODTITUL + PODTITUL + STRANY)));
  test('chyba, když je podtitul dvakrát', /právě jeden podtitul/.test(dva), dva);
  const bezNadpisu = hazi(() => VS.sodProjCislo(dokument(PODTITUL + STRANY)));
  test('chyba, když nad podtitulem není nadpis „SMLOUVA O DÍLO"', /chybí nadpis/.test(bezNadpisu), bezNadpisu);
}

/* ---- 3) vygenerovaná SoD PROJ ---- */
global.NAST = { firma: global.firmaDefault() };
const enc = new TextEncoder(), dec = new TextDecoder();
const novaZProj = (cislo) => {
  const z = zk.novaZakazka(); z.cislo = '2026 - OVP - CN - 0411';
  Object.assign(z.projHlavicka, { cislo: '2026 OVP CN 0411', objednatel: 'SVJ Zkušební 11', adresa: 'Zkušební 11, Zkušebín', nazevAkce: 'Zkušební projekce — číslo SoD' });
  const v = z.varianty[0];
  v.data.proj.cenik = ZC.zkusebniCenikProj();
  v.data.kryci = { hodnoty: { cisloSod: '2026 - OPR - SOD - 0011' } };
  v.data.kryciProj = { hodnoty: cislo === undefined ? {} : { cisloSod: cislo } };
  return z;
};
const docx = async xml => (await dg.zipZapis([{ nazev: 'word/document.xml', data: enc.encode(xml) }])).arrayBuffer();
const vygeneruj = async (sablonaAb, cislo) => {
  const z = novaZProj(cislo);
  const res = await DK.dokumentVygeneruj('sodProj', sablonaAb, z, z.varianty[0], JEKLY, 'cz');
  const casti = await dg.zipPrecti(new Uint8Array(await res.blob.arrayBuffer()));
  const xml = dec.decode(casti.find(p => p.nazev === 'word/document.xml').data);
  return { xml, text: text(xml) };
};

(async () => {
  {
    const g = await vygeneruj(await docx(v3), '2026 OVP SOD 0011');
    test('SoD PROJ (v3): vyplněné Číslo SoD z krycího listu PROJ je pod nadpisem smlouvy',
      g.text[2] === 'číslo 2026 OVP SOD 0011', g.text.slice(0, 4));
    test('SoD PROJ (v3): bere číslo z krycího listu PROJ, ne OCK', g.xml.indexOf('OPR - SOD') < 0);
    test('SoD PROJ (v3): symbol čísla ve smlouvě nezůstal', g.xml.indexOf(SYM) < 0);
    /* v1 (osm pevných plateb) smlouvu s výchozím plánem plateb nevyrobí — to S9 nemění. */
    const g1 = await vygeneruj(await docx(v3), ' 2026 OVP SOD 0012 ');
    test('SoD PROJ (v3): číslo ve smlouvě bez okrajových mezer', g1.text[2] === 'číslo 2026 OVP SOD 0012', g1.text.slice(0, 4));
    const prazdne = await vygeneruj(await docx(v3));
    /* Od v17.10.2 (#366) prázdné pole předvyplní návrh z čísla nabídky. */
    test('SoD PROJ (v3): prázdné Číslo SoD → návrh z čísla nabídky (#366)',
      prazdne.text[2] === 'číslo 2026 - OVP - SOD - 0411', prazdne.text.slice(0, 4));
    const mezery = await vygeneruj(await docx(v3), '   ');
    test('SoD PROJ (v3): jen mezery v Čísle SoD = prázdné ({{…}} zůstane)', mezery.text[2] === 'číslo {{' + SYM + '}}', mezery.text.slice(0, 4));
    const stara = await vygeneruj(await docx(VS.sodProjV2(V1)), '2026 OVP SOD 0013');
    test('SoD PROJ (stará v2 bez symbolu): smlouva dál vznikne, jen bez čísla',
      stara.text[1] && /na zhotovení/.test(stara.text[1]) && stara.xml.indexOf('0013') < 0);
  }

  /* ---- 4) skutečné šablony z Disku (jen s KNG_PODKLADY) ---- */
  const slozka = String(process.env.KNG_PODKLADY || '').trim();
  const soubor = j => slozka && fs.existsSync(path.join(slozka, j)) ? path.join(slozka, j) : '';
  const ze = async f => dec.decode((await dg.zipPrecti(new Uint8Array(fs.readFileSync(f)))).find(p => p.nazev === 'word/document.xml').data);
  const nahrad = async (f, xml) => (await dg.zipZapis((await dg.zipPrecti(new Uint8Array(fs.readFileSync(f))))
    .map(c => c.nazev === 'word/document.xml' ? { nazev: c.nazev, data: enc.encode(xml) } : c))).arrayBuffer();
  const kandidati = [['Sablona_SOD_PROJEKCE.docx', true], ['Sablona_SOD_PROJEKCE_v2.docx', true],
    ['Sablona_SOD_PROJEKCE_v3.docx', false], ['Sablona_SOD_PROJEKCE_v1_cislo.docx', false]];
  let skutecnych = 0;
  for (const [jm, upravit] of kandidati) {
    const f = soubor(jm);
    if (!f) continue;
    skutecnych++;
    let xml = await ze(f);
    if (upravit) {
      test(jm + ' (Disk): symbol čísla smlouvy zatím nemá', dg.klicePlaceholderu(xml).indexOf(SYM) < 0);
      const e = hazi(() => { xml = VS.sodProjCislo(xml); });
      test(jm + ' (Disk): číslo smlouvy se doplní bez chyby', !e, e);
      test(jm + ' (Disk): XML po úpravě bez vad', !dg.xmlStrukturaVada(xml), dg.xmlStrukturaVada(xml));
    }
    const sablonaAb = upravit ? await nahrad(f, xml) : fs.readFileSync(f).buffer.slice(0);
    test(jm + ' (Disk): symbol {{' + SYM + '}} je v jednom běhu',
      /<w:t(?:\s[^>]*)?>[^<]*\{\{SOD_CISLO_SMLOUVY\}\}[^<]*<\/w:t>/.test(xml));
    /* v1 s pevnými platbami smlouvu s plánem plateb vyrobit nesmí (S9 to nemění). */
    if (/SODP_PLATBA1_KC/.test(xml)) continue;
    const g = await vygeneruj(sablonaAb, '2026 OVP SOD 0021');
    test(jm + ' (Disk): vygenerovaná SoD PROJ nese číslo z krycího listu PROJ',
      g.text.some(t => /číslo 2026 OVP SOD 0021/.test(t)) && g.xml.indexOf(SYM) < 0, g.text.slice(0, 5));
    /* Od v17.10.2 (#366) prázdné pole předvyplní návrh z čísla nabídky; {{…}} zůstane jen u pole s mezerami. */
    const p = await vygeneruj(sablonaAb);
    test(jm + ' (Disk): prázdné Číslo SoD → návrh z čísla nabídky (#366)',
      p.text.some(t => /číslo 2026 - OVP - SOD - 0411/.test(t)) && p.xml.indexOf(SYM) < 0, p.text.slice(0, 5));
    const m = await vygeneruj(sablonaAb, '   ');
    test(jm + ' (Disk): jen mezery v Čísle SoD → {{' + SYM + '}} zůstane k doplnění', m.xml.indexOf('{{' + SYM + '}}') >= 0);
  }
  if (!skutecnych) console.log('–    skutečné šablony SoD PROJ (KNG_PODKLADY) nejsou po ruce — přeskočeno');
  konec();
})().catch(e => { console.log('FAIL výjimka: ' + (e && e.stack || e)); process.exit(1); });
