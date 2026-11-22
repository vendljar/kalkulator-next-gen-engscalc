/* SYNTETICKÉ ŠABLONY SMLUV PRO HARNESS overit_sod.mjs (#646 / K49-I2, 21. 11. 2026)
 *
 * Skutečné šablony smluv (SoD realizace, SoD projekce, plná moc) jsou firemní
 * dokumenty a ve veřejném repozitáři nejsou. Bez `KNG_PODKLADY` se proto
 * overit_sod.mjs do 21. 11. 2026 vždy přeskočil (kód 4) — a když ho kolo
 * 18. 11. poprvé pustilo nad šablonami z Disku (SoD v6, SoD PROJ v4, plná moc),
 * padlo 5 z 51 kontrol na očekáváních z doby šablon v1 a symbolů {{…}}
 * (před tečkami C3 #584). Nikdo to dva měsíce nevěděl.
 *
 * Tenhle modul vyrobí SMYŠLENÉ šablony ve STAVBĚ skutečných — žádný text
 * smlouvy z Disku, jen věty, které harness kontroluje (jsou v harnessu
 * a v nastroje/vyrob_sablony.js už dnes jako kotvy), a symboly, které
 * aplikace plní. Verze vznikají TÝMIŽ nástroji, jakými vznikly skutečné:
 *
 *   SoD realizace  v1 → v2 (sodRealV2) → v3 (sodRealV3) → v4 (sodRealV4)
 *                  → v5 (sodRealV5) → v6 (sodRealV6, žluté symboly);
 *                  na disk jdou v4, v5, v6 (výběr nejvyšší verze, jako Disk)
 *   SoD projekce   v1 → v2 (sodProjV2) → v3 (sodProjCislo) → v4 (sodProjV4);
 *                  na disk jdou v2, v3, v4
 *   plná moc       v1 a v2 (v2 = v1 se žlutými symboly)
 *
 * Každý soubor na disku nese na konci odstavec „Syntetická šablona harnessu —
 * <název>_v<N>" (bez symbolu), takže harness ověří, ze které verze dokument
 * vznikl. Šablony v1 se na disk nezapisují — vrací se v `v1` (base64) pro
 * kontroly, které potřebují starou šablonu (SoD PROJ s osmi pevnými platbami).
 *
 * Použití:
 *   import { vyrobSyntetickeSmlouvy } from './nastroje/smlouvy_syntet.mjs';
 *   const { soubory, v1 } = await vyrobSyntetickeSmlouvy(slozka);
 *   node nastroje/smlouvy_syntet.mjs <složka>      (zapíše šablony do složky)
 */
import { createRequire } from 'module';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const dg = require('../src/docxgen.js');
const VS = require('./vyrob_sablony.js');
const enc = new TextEncoder();

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const RPR = '<w:rPr><w:rFonts w:ascii="Cambria" w:hAnsi="Cambria"/><w:sz w:val="22"/></w:rPr>';
/* odstavec: text v jednom běhu (symbol nikdy rozdělený), volitelně odrážka / zarovnání */
const p = (t, o = {}) => {
  const pPr = (o.num || o.stred) ? '<w:pPr>' + (o.num ? '<w:numPr><w:ilvl w:val="0"/><w:numId w:val="' + o.num + '"/></w:numPr>' : '')
    + (o.stred ? '<w:jc w:val="center"/>' : '') + '</w:pPr>' : '';
  return '<w:p>' + pPr + (t ? '<w:r>' + RPR + '<w:t xml:space="preserve">' + esc(t) + '</w:t></w:r>' : '') + '</w:p>';
};
const dokument = telo => '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
  + '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>'
  + telo + '<w:sectPr/></w:body></w:document>';

/* ---------- SoD realizace v1 (smyšlený text ve stavbě šablony v1) ---------- */
export function sodRealizaceV1() {
  return dokument([
    p('SMLOUVA O DÍLO', { stred: true }),
    p('číslo {{SOD_CISLO_SMLOUVY}}', { stred: true }),
    p('Objednatel: {{OBJEDNATEL}}, sídlo {{OBJEDNATEL_SIDLO}}, IČO {{OBJEDNATEL_ICO}}'),
    p('Zhotovitel: {{FIRMA_NAZEV}}, IČO {{FIRMA_ICO}}'),
    p('Čl. II – Předmět smlouvy'),
    p(''),
    p('Předmětem smlouvy je zhotovení zkušební ocelové konstrukce výtahové šachty (smyšlený text harnessu).'),
    p('Akce: {{NAZEV_AKCE}}'),
    p('Čl. III – Místo a doba plnění'),
    p('Místem provádění díla je {{SOD_MISTO_PLNENI_DRUH}} na adrese {{ADRESA}}.'),
    p('Zhotovitel provede montáž ocelové konstrukce od {{SOD_TERMIN_MONTAZ_OD}} do {{SOD_TERMIN_MONTAZ_DO}}, '
      + 'opláštění ocelové konstrukce od {{SOD_TERMIN_OPLASTENI_OD}} do {{SOD_TERMIN_OPLASTENI_DO}} '
      + 'a předání konstrukce k montáži výtahu k {{SOD_TERMIN_PREDANI_K_MONTAZI}}.', { num: 3 }),
    p('Termín: dokončení a předání díla do {{SOD_TERMIN_DOKONCENI}} za předpokladu finálního usazení všech '
      + 'šachetních dveří objednatelem do {{SOD_TERMIN_DVERE}}.', { num: 3 }),
    p('Objednatel se zavazuje k zajištění stavební připravenosti nejdéle k {{SOD_TERMIN_PRIPRAVENOST}} a k dodání '
      + 'kompletních finálních podkladů od dodavatele technologie výtahu včetně zatížení na kotvení do 19.06.2026.', { num: 3 }),
    p('Čl. V – Cena díla'),
    p('Objednatel se zavazuje zaplatit zhotoviteli za provedení díla dohodnutou cenu, a to ve výši', { num: 5 }),
    p('{{CENA_BEZ_DPH}} (bez DPH)', { num: 5 }),
    p('DPH bude účtováno dle platných předpisů v režimu přenesené daňové povinnosti.', { num: 5 }),
    p('3. Objednatel prohlašuje, že objekt je zkušební stavbou pro bydlení a splňuje podmínky snížené sazby DPH.'),
    p('Cena díla bude hrazena takto:'),
    p('při uzavření této smlouvy o dílo {{SOD_SPLATKA1_PROC}} % z celkové ceny díla', { num: 7 }),
    p('po dokončení montáže ocelové konstrukce šachty {{SOD_SPLATKA2_PROC}} % z celkové ceny díla', { num: 7 }),
    p('po provedení základního opláštění konstrukce a předání k montáži výtahu {{SOD_SPLATKA3_PROC}} % z celkové ceny díla', { num: 7 }),
    p('zbývajících {{SOD_SPLATKA4_PROC}} % z celkové ceny díla', { num: 7 }),
    p('Čl. VI – Skladné'),
    p('Za uskladnění materiálu na žádost objednatele náleží zhotoviteli úhrada skladovacích poplatků 150,- Kč za každý den.'),
    p('Čl. VII – Smluvní pokuty'),
    p('Zhotovitel se zavazuje zaplatit objednateli smluvní pokutu ve výši {{PODM_POKUTA_SPLATNOST_PROC}} % z ceny díla bez DPH '
      + 'za každý započatý den prodlení s prováděním díla.', { num: 9 }),
    p('Objednatel se zavazuje zaplatit zhotoviteli v případě prodlení s placením sjednané ceny díla či jejích splátek '
      + 'smluvní pokutu ve výši {{PODM_POKUTA_SPLATNOST_PROC}} % z dlužné částky za každý den prodlení.', { num: 9 }),
    p('Při prodlení objednatele se součinností uhradí objednatel zhotoviteli smluvní pokutu ve výši {{SOD_POKUTA_DENNI}} denně.', { num: 9 }),
    p('Nepředá-li objednatel staveniště včas, uhradí zhotoviteli smluvní pokutu ve výši {{SOD_POKUTA_DENNI}} za každý započatý den prodlení.', { num: 9 }),
    p('Čl. VIII – Záruka'),
    p('Zhotovitel poskytuje na dílo záruku po dobu {{SOD_ZARUKA_MESICU}} měsíců.'),
    p('V Praze, dne {{SOD_DATUM_PODPISU}}'),
  ].join(''));
}

/* ---------- SoD projekce v1 (osm pevných plateb, stavba jako overit_sod_proj_rozsah.mjs) ---------- */
export function sodProjekceV1() {
  const cin2 = ['Zaměření a zpracování výstupů – zkušební zaměření.', 'Dokumentace pro povolení záměru – DPZ.',
    'Inženýrská činnost DOSS – stanoviska.', 'Podání žádosti na příslušný stavební úřad – a vyřízení povolení záměru.',
    'Dokumentace pro provedení stavby – DPS.', 'Ekonomická zadávací část – rozpočet.', 'Výběr dodavatele pro realizaci záměru – nabídky.'];
  const cin3 = ['Zaměření a zpracování výstupů – 12 týdnů.', 'Dokumentace pro povolení záměru – 12 týdnů.',
    'Inženýrská činnost DOSS – 12 týdnů.', 'Vyřízení povolení záměru – 10 týdnů.', 'Dokumentace pro provedení stavby – 6 týdnů.',
    'Ekonomická zadávací část – 2 týdny.', 'Zhotovitel předá objednateli dílo v počtu 2 paré.', 'Výběr dodavatele pro realizaci záměru – 6 týdnů.'];
  const platby = [1, 2, 3, 4, 5, 6, 7, 8].map(n => p('Platba ve výši {{SODP_PLATBA' + n + '_KC}} + DPH proběhne po zkušebním milníku ' + n + '.', { num: 4 }));
  return dokument([
    p('SMLOUVA O DÍLO', { stred: true }),
    p('na zhotovení projektové dokumentace', { stred: true }),
    p('Objednatel: {{OBJEDNATEL}}'),
    p('Zhotovitel: {{FIRMA_NAZEV}}, IČO {{FIRMA_ICO}}'),
    p('II. Předmět Díla'),
    p('Předmětem smlouvy je Dílo {{NAZEV_AKCE}}:', { num: 6 }),
    p(''),
    cin2.map(t => p(t, { num: 2 }) + p('')).join(''),
    p('III. Termíny plnění'),
    p(''),
    cin3.map(t => p(t, { num: 10 }) + p('')).join(''),
    p('IV. Cena díla'),
    p('Cena díla činí {{PROJ_CELKEM_BEZ_DPH}} bez DPH.'),
    platby.join(''),
    p('Správní poplatky stavebnímu úřadu ve výši {{SODP_SPRAVNI_POPLATKY}} hradí objednatel nad rámec ceny díla.'),
    p('V. Smluvní pokuty'),
    p('V případě prodlení zhotovitele s plněním dle bodu III. má právo objednatel zhotoviteli účtovat {{PODM_POKUTA_SPLATNOST_PROC}} % '
      + 'z ceny části Díla v prodlení.', { num: 11 }),
    p('Pro případ prodlení objednatele s úhradou peněžitého plnění sjednávají smluvní strany smluvní pokutu ve výši '
      + '{{PODM_POKUTA_SPLATNOST_PROC}} % z dlužné částky.', { num: 11 }),
    p('Při prodlení objednatele se součinností činí smluvní pokuta {{SODP_POKUTA_DENNI}} za každý den.', { num: 11 }),
    p('VII. Komunikace smluvních stran'),
    ['Kontakty jsou uvedeny v záhlaví.', 'Změnu kontaktu strany oznámí.', 'Oznámení mají písemnou formu.', 'Doručuje se na adresy v záhlaví.',
      'Kterákoliv ze smluvních stran je oprávněna požadovat po druhé smluvní straně potvrzení kteréhokoliv oznámení poštou.',
      'Strana je oprávněna požadovat potvrzení oznámení poštou dle odst. 5. tohoto článku.'].map(t => p(t, { num: 8 })).join(''),
    p('VIII. Vyšší moc'),
    p('Příloha č. 1: Cenová nabídka číslo {{CISLO_NABIDKY}} na vypracování dokumentace DPZ+DSP včetně zajištění inženýringu tj. '
      + 'zajištění vydání povolení záměru včetně nabytí právní moci – objekt {{ADRESA}}, ze dne {{DATUM}}.'),
  ].join(''));
}

/* ---------- plná moc v1 ---------- */
export function plnaMocV1() {
  return dokument([
    p('PLNÁ MOC', { stred: true }),
    p('Zmocnitel: {{PM_ZMOCNITEL}}, narozen {{PM_ZMOCNITEL_NAROZEN}}, bytem {{PM_ZMOCNITEL_BYTEM}}'),
    p('zmocňuje'),
    p('Zmocněnec: {{FIRMA_NAZEV}}, sídlo {{FIRMA_SIDLO}}, IČO {{FIRMA_ICO}}'),
    p('k zastupování ve věci zkušební stavby výtahu na adrese {{ADRESA}} (smyšlený text harnessu).'),
    p('Za zmocnitele jedná: {{PM_JEDNAJICI}}'),
  ].join(''));
}

/* plná moc v2 = v1 se žlutými symboly (jako skutečná z Disku) */
const zlute = xml => xml.replace(/<w:r><w:rPr>(<w:rFonts[^>]*\/><w:sz w:val="22"\/>)<\/w:rPr>(<w:t xml:space="preserve">[^<]*\{\{)/g,
  '<w:r><w:rPr>$1<w:highlight w:val="yellow"/></w:rPr>$2');

/* odstavec se značkou verze na konec těla (bez symbolu — šablonu nemění) */
export const ZNACKA_VERZE = 'Syntetická šablona harnessu — ';
const sVerzi = (xml, jmeno) => xml.replace('<w:sectPr/>', p(ZNACKA_VERZE + jmeno) + '<w:sectPr/>');

const CT = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
  + '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
  + '<Default Extension="xml" ContentType="application/xml"/>'
  + '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>';
const RELS = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
  + '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>';
export async function docxZXml(xml) {
  const blob = dg.zipZapis([{ nazev: '[Content_Types].xml', data: enc.encode(CT) }, { nazev: '_rels/.rels', data: enc.encode(RELS) },
    { nazev: 'word/document.xml', data: enc.encode(xml) }]);
  return new Uint8Array(await blob.arrayBuffer());
}

/* Řetězec verzí týmiž nástroji jako skutečné šablony. Vrací { jmeno: xml }. */
export function verzeSmluv() {
  const r1 = sodRealizaceV1();
  const r2 = VS.sodRealV2(r1), r3 = VS.sodRealV3(r2), r4 = VS.sodRealV4(r3), r5 = VS.sodRealV5(r4), r6 = VS.sodRealV6(r5);
  const p1 = sodProjekceV1();
  const p2 = VS.sodProjV2(p1), p3 = VS.sodProjCislo(p2), p4 = VS.sodProjV4(p3);
  const m1 = plnaMocV1(), m2 = zlute(m1);
  return {
    na_disk: {
      Sablona_SOD_REALIZACE_v4: r4, Sablona_SOD_REALIZACE_v5: r5, Sablona_SOD_REALIZACE_v6: r6,
      Sablona_SOD_PROJEKCE_v2: p2, Sablona_SOD_PROJEKCE_v3: p3, Sablona_SOD_PROJEKCE_v4: p4,
      Sablona_PLNA_MOC_v1: m1, Sablona_PLNA_MOC_v2: m2,
    },
    v1: { sod: r1, sodProj: p1, plnaMoc: m1 },
  };
}

/* Zapíše šablony do `slozka`. Vrací { soubory: [cesty], v1: { typ: base64 } }. */
export async function vyrobSyntetickeSmlouvy(slozka) {
  mkdirSync(slozka, { recursive: true });
  const v = verzeSmluv();
  const soubory = [];
  for (const [jmeno, xml] of Object.entries(v.na_disk)) {
    const cesta = join(slozka, jmeno + '.docx');
    writeFileSync(cesta, await docxZXml(sVerzi(xml, jmeno)));
    soubory.push(cesta);
  }
  const v1 = {};
  for (const [typ, xml] of Object.entries(v.v1)) v1[typ] = Buffer.from(await docxZXml(xml)).toString('base64');
  return { soubory, v1 };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const slozka = process.argv[2];
  if (!slozka) { console.error('Použití: node nastroje/smlouvy_syntet.mjs <složka>'); process.exit(2); }
  const { soubory } = await vyrobSyntetickeSmlouvy(slozka);
  console.log('Syntetické šablony smluv (smyšlený text):\n  ' + soubory.join('\n  '));
}
