/* VÝROBA ŠABLON NABÍDEK CN v13 A PROJ v3 I S JAZYKOVÝMI MUTACEMI
 * (rozhodnutí J. V. 29. 9. 2026 k rozboru D kola 16:
 *  P8 „var A", P10.4 „použij nové ale bez DPH", „když budeš tvořit nové
 *  šablony, vytvoř i jejich jazykové mutace").
 *
 * Šablony v repozitáři nejsou (firemní texty) — skript si vezme dodané
 * verze ze složky podkladů a nové uloží vedle nich (nebo do zadané složky):
 *
 *   node nastroje/vyrob_sablony.js <složka podkladů> [výstupní složka]
 *   KNG_PODKLADY=<složka> node nastroje/vyrob_sablony.js
 *
 * Vstup:  Sablona_NABIDKA_CN_v12.docx, Sablona_NABIDKA_PROJ.docx (PROJ v2)
 * Výstup: Sablona_NABIDKA_CN_v13.docx + _EN/_DE/_FR,
 *         Sablona_NABIDKA_PROJ_v3.docx + _EN/_DE/_FR
 *
 * CN v13  = v12 + značky kapitol {{KAP_IV_ZAC}} … {{KAP_DOLOZKY_KON}}
 *           (prázdná kapitola zmizí i s nadpisem — odstranPrazdneBloky)
 *           + věty o dílčích daňových dokladech „(bez DPH)" místo „(+ DPH)".
 * PROJ v3 = v2 + rekapitulace před „Vypracoval" (cena před slevou, sleva,
 *           CELKEM bez DPH; řádky slevy bez slevy zmizí) a blok vlastních
 *           položek {{PROJ_POLOZKY_NAVIC}} (zmizí, když žádné nejsou).
 *
 * Jazykové mutace vyrábí tentýž překlad šablony, jaký používá aplikace
 * v Nastavení → Šablony (docxPrelozSablonu); skript vypíše, co zůstalo
 * česky, a každý soubor ověří (platné XML, symboly shodné s češtinou).
 * Když se vstupní šablona změní tak, že skript nenajde své kotvy
 * (nadpisy kapitol, „Vypracoval:"), skončí chybou — nic nehádá. */
const fs = require('fs');
const path = require('path');
const SRC = path.join(__dirname, '..', 'src');
const nacti = f => { const m = require(path.join(SRC, f)); Object.keys(m).forEach(k => { global[k] = m[k]; }); return m; };
nacti('preklad.js');
const dg = nacti('docxgen.js');
const so = nacti('sablony_online.js');

const PODKLADY = process.argv[2] || process.env.KNG_PODKLADY;
const VYSTUP = process.argv[3] || PODKLADY;
if (!PODKLADY) { console.error('Použití: node nastroje/vyrob_sablony.js <složka podkladů> [výstupní složka]'); process.exit(2); }

const JAZYKY = ['en', 'de', 'fr'];
const chyba = t => { throw new Error(t); };
const enc = new TextEncoder(), dec = new TextDecoder();

/* Prvky nejvyšší úrovně těla dokumentu (odstavce a tabulky) s pozicemi. */
function prvkyTela(body) {
  const re = /<(\/?)w:(p|tbl)(?=[\s>/])[^>]*?(\/?)>/g;
  const zas = [], top = [];
  let m;
  while ((m = re.exec(body))) {
    const [cely, konec, tag, samo] = m;
    if (samo === '/') { if (!zas.length) top.push({ tag, zac: m.index, kon: m.index + cely.length }); continue; }
    if (!konec) zas.push({ tag, zac: m.index });
    else { const z = zas.pop(); if (!zas.length) top.push({ tag: z.tag, zac: z.zac, kon: m.index + cely.length }); }
  }
  return top;
}
const textPrvku = xml => (xml.match(/<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/g) || [])
  .map(t => dg.xmlUnesc(t.replace(/^<w:t(?:\s[^>]*)?>/, '').replace(/<\/w:t>$/, ''))).join('').trim();

/* Odstavec se značkou bloku — drobným šedým písmem, ať v šabloně nepřekáží;
 * do dokumentu se nikdy nedostane (generátor ho vždy odstraní). */
const znacka = jmeno => '<w:p><w:pPr><w:pStyle w:val="Bezmezer"/><w:rPr><w:color w:val="A6A6A6"/><w:sz w:val="14"/></w:rPr></w:pPr>'
  + '<w:r><w:rPr><w:color w:val="A6A6A6"/><w:sz w:val="14"/></w:rPr><w:t>{{' + jmeno + '}}</w:t></w:r></w:p>';

function tělo(xml) {
  const zac = xml.indexOf('<w:body>') + '<w:body>'.length, kon = xml.lastIndexOf('</w:body>');
  if (zac < 8 || kon < 0) chyba('document.xml nemá <w:body>');
  return { pred: xml.slice(0, zac), body: xml.slice(zac, kon), po: xml.slice(kon) };
}

/* ---------- CN v13 ---------- */
function cnV13(xml) {
  const t = tělo(xml);
  let body = t.body;
  const top = prvkyTela(body);
  const txt = el => textPrvku(body.slice(el.zac, el.kon));
  const najdi = (re, popis) => {
    const i = top.findIndex(el => el.tag === 'p' && re.test(txt(el)));
    if (i < 0) chyba('CN: nenašel jsem nadpis „' + popis + '"');
    return i;
  };
  const iIV = najdi(/^IV\.\s*POŽADAVKY PRO PROVEDENÍ REALIZACE:?$/, 'IV. POŽADAVKY PRO PROVEDENÍ REALIZACE');
  const iV = najdi(/^V\.\s*TERMÍNY REALIZACE:?$/, 'V. TERMÍNY REALIZACE');
  const iVI = najdi(/^VI\.\s*PŘEDÁNÍ DÍLA:?$/, 'VI. PŘEDÁNÍ DÍLA');
  const iD = najdi(/^DOLOŽKY:?$/, 'DOLOŽKY');
  if (!(iIV < iV && iV < iVI && iVI < iD)) chyba('CN: kapitoly nejsou v pořadí IV., V., VI., DOLOŽKY');
  const iDt = top.findIndex((el, i) => i > iD && el.tag === 'tbl');
  if (iDt < 0) chyba('CN: pod nadpisem DOLOŽKY není tabulka');
  const bloky = [
    ['KAP_IV', iIV, iV - 1, 'FIRMA_NAB_POZADAVKY'],
    ['KAP_V', iV, iVI - 1, 'NAB_KAP_TERMINY'],
    ['KAP_VI', iVI, iD - 1, 'FIRMA_NAB_PREDANI'],
    ['KAP_DOLOZKY', iD, iDt, 'FIRMA_NAB_DOLOZKY'],
  ];
  bloky.forEach(([jm, a, b, sym]) => {
    const obsah = body.slice(top[a].zac, top[b].kon);
    if (!dg.klicePlaceholderu(obsah).includes(sym)) chyba('CN: blok ' + jm + ' neobsahuje symbol {{' + sym + '}}');
  });
  for (const [jm, a, b] of bloky.slice().reverse()) {        // odzadu, ať sedí pozice
    body = body.slice(0, top[b].kon) + znacka(jm + '_KON') + body.slice(top[b].kon);
    body = body.slice(0, top[a].zac) + znacka(jm + '_ZAC') + body.slice(top[a].zac);
  }
  const dph = (body.match(/\(\+ DPH\)/g) || []).length;
  if (dph !== 2) chyba('CN: čekal jsem 2× „(+ DPH)" ve větách o dílčích dokladech, je jich ' + dph);
  body = body.split('(+ DPH)').join('(bez DPH)');
  return t.pred + body + t.po;
}

/* ---------- PROJ v3 ---------- */
function projV3(xml) {
  const t = tělo(xml);
  let body = t.body;
  const top = prvkyTela(body);
  const txt = el => textPrvku(body.slice(el.zac, el.kon));
  if (dg.klicePlaceholderu(body).some(k => k === 'PROJ_SLEVA_KC' || k === 'PROJ_POLOZKY_NAVIC'))
    chyba('PROJ: šablona už rekapitulaci nebo vlastní položky má — není co doplnit');
  const iVyp = top.findIndex(el => el.tag === 'p' && /^Vypracoval:?$/.test(txt(el)));
  if (iVyp < 0) chyba('PROJ: nenašel jsem odstavec „Vypracoval:"');
  const iNadpis = top.findIndex(el => el.tag === 'p' && txt(el) === 'ROZŠÍŘENÁ NABÍDKA');
  if (iNadpis < 0) chyba('PROJ: nenašel jsem vzor nadpisu „ROZŠÍŘENÁ NABÍDKA"');
  const iCena = top.findIndex(el => el.tag === 'tbl' && dg.klicePlaceholderu(body.slice(el.zac, el.kon)).includes('PROJ_CENA_IC'));
  if (iCena < 0) chyba('PROJ: nenašel jsem vzor cenové tabulky (IČ)');

  /* nadpis: kopie „ROZŠÍŘENÁ NABÍDKA" s jiným textem */
  const nadpis = body.slice(top[iNadpis].zac, top[iNadpis].kon)
    .replace(/<w:t(\s[^>]*)?>ROZŠÍŘENÁ NABÍDKA<\/w:t>/, '<w:t>REKAPITULACE CENOVÉ NABÍDKY</w:t>');
  /* tabulka: vlastnosti a mřížka z cenové tabulky IČ, řádky nové */
  const tab = body.slice(top[iCena].zac, top[iCena].kon);
  const tblPr = (tab.match(/<w:tblPr>[\s\S]*?<\/w:tblPr>/) || [''])[0];
  const tblGrid = (tab.match(/<w:tblGrid>[\s\S]*?<\/w:tblGrid>/) || [''])[0];
  const tcPr = tab.match(/<w:tcPr>[\s\S]*?<\/w:tcPr>/g) || [];
  if (tcPr.length < 2 || !tblPr || !tblGrid) chyba('PROJ: vzorová cenová tabulka nemá čekanou stavbu');
  const beh = (text, tucne) => '<w:r><w:rPr>' + (tucne ? '<w:b/>' : '') + '</w:rPr><w:t xml:space="preserve">' + text + '</w:t></w:r>';
  const bunka = (pr, text, tucne, vpravo) => '<w:tc>' + pr + '<w:p><w:pPr><w:spacing w:before="40" w:after="40" w:line="240" w:lineRule="auto"/>'
    + (vpravo ? '<w:jc w:val="right"/>' : '') + '</w:pPr>' + beh(text, tucne) + '</w:p></w:tc>';
  const radek = (popis, hodnota, tucne) => '<w:tr><w:trPr><w:trHeight w:val="340"/></w:trPr>'
    + bunka(tcPr[0], popis, tucne, false) + bunka(tcPr[1], hodnota, tucne, true) + '</w:tr>';
  const tabulka = '<w:tbl>' + tblPr + tblGrid
    + radek('Cena před slevou', '{{PROJ_CENA_PRED_SLEVOU}}', false)
    + radek('Sleva {{PROJ_SLEVA_PROC}} %', '− {{PROJ_SLEVA_KC}}', false)
    + radek('CELKEM bez DPH', '{{PROJ_CELKEM_BEZ_DPH}}', true)
    + '</w:tbl>';
  const prazdny = '<w:p><w:pPr><w:pStyle w:val="Bezmezer"/></w:pPr></w:p>';
  const maly = (text, tucne) => '<w:p><w:pPr><w:pStyle w:val="Bezmezer"/><w:spacing w:before="60"/></w:pPr>'
    + '<w:r><w:rPr>' + (tucne ? '<w:b/>' : '') + '<w:color w:val="2F5496"/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr>'
    + '<w:t xml:space="preserve">' + text + '</w:t></w:r></w:p>';
  const vlozka = prazdny + nadpis + prazdny
    + znacka('BLOK_NAVIC_ZAC') + maly('Další položky zahrnuté v ceně:', true) + maly('{{PROJ_POLOZKY_NAVIC}}', false) + prazdny
    + znacka('BLOK_NAVIC_KON')
    + tabulka + prazdny;
  body = body.slice(0, top[iVyp].zac) + vlozka + body.slice(top[iVyp].zac);
  return t.pred + body + t.po;
}

/* ---------- společné: přepis document.xml, zápis, mutace, ověření ---------- */
async function vyrob(vstup, uprava) {
  const polozky = await dg.zipPrecti(new Uint8Array(fs.readFileSync(vstup)));
  const doc = polozky.find(p => p.nazev === 'word/document.xml');
  if (!doc) chyba(vstup + ': chybí word/document.xml');
  doc.data = enc.encode(uprava(dec.decode(doc.data)));
  return new Uint8Array(await dg.zipZapis(polozky).arrayBuffer());
}
async function symbolyASablona(bajty) {
  return so.sablonaSymboly(await dg.docxTextSablony(bajty.slice().buffer));
}
async function ulozSMutacemi(bajty, zaklad) {
  const vysledek = [];
  const cz = path.join(VYSTUP, zaklad + '.docx');
  fs.writeFileSync(cz, bajty);
  const symCz = await symbolyASablona(bajty);
  const vadyCz = await dg.docxXmlVady(bajty.slice().buffer);
  vysledek.push({ soubor: path.basename(cz), vady: vadyCz, symbolu: symCz.length });
  for (const L of JAZYKY) {
    const stat = {};
    const blob = await dg.docxPrelozSablonu(bajty.slice().buffer, L, stat);
    const b = new Uint8Array(await blob.arrayBuffer());
    const soubor = path.join(VYSTUP, zaklad + '_' + L.toUpperCase() + '.docx');
    fs.writeFileSync(soubor, b);
    const sym = await symbolyASablona(b);
    const rozdil = so.sablonaSymbolyRozdil(symCz, sym);
    vysledek.push({ soubor: path.basename(soubor), vady: await dg.docxXmlVady(b.slice().buffer),
      symbolu: sym.length, ubylo: rozdil.ubylo, pribylo: rozdil.pribylo,
      prelozeno: stat.prelozeno + ' z ' + stat.celkem, cesky: (stat.chybi || []).concat(stat.symbolove || []) });
  }
  return vysledek;
}

(async () => {
  const cnVstup = path.join(PODKLADY, 'Sablona_NABIDKA_CN_v12.docx');
  const projVstup = path.join(PODKLADY, 'Sablona_NABIDKA_PROJ.docx');
  [cnVstup, projVstup].forEach(f => { if (!fs.existsSync(f)) chyba('Chybí vstupní šablona ' + f); });
  if (!fs.existsSync(VYSTUP)) fs.mkdirSync(VYSTUP, { recursive: true });
  const vse = []
    .concat(await ulozSMutacemi(await vyrob(cnVstup, cnV13), 'Sablona_NABIDKA_CN_v13'))
    .concat(await ulozSMutacemi(await vyrob(projVstup, projV3), 'Sablona_NABIDKA_PROJ_v3'));
  let problemu = 0;
  for (const v of vse) {
    const prob = v.vady.length + (v.ubylo || []).length + (v.pribylo || []).length + (v.cesky || []).length;
    problemu += prob;
    console.log((prob ? '✗ ' : '✓ ') + v.soubor + ' — symbolů ' + v.symbolu
      + (v.prelozeno ? ', přeloženo ' + v.prelozeno : '')
      + (v.vady.length ? '\n    vady XML: ' + v.vady.join('; ') : '')
      + ((v.ubylo || []).length ? '\n    chybí symboly: ' + v.ubylo.join(', ') : '')
      + ((v.pribylo || []).length ? '\n    navíc symboly: ' + v.pribylo.join(', ') : '')
      + ((v.cesky || []).length ? '\n    česky zůstalo: ' + v.cesky.map(t => '„' + String(t).slice(0, 70) + '"').join(' | ') : ''));
  }
  console.log('\nVýstup: ' + VYSTUP + (problemu ? '\nPROBLÉMŮ: ' + problemu : '\nBez problémů.'));
  process.exit(problemu ? 1 : 0);
})().catch(e => { console.error('CHYBA: ' + e.message); process.exit(1); });
