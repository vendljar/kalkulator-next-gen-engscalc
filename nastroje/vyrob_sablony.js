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
 * PROJ v4 (etapa B plánu plateb, 30. 9. 2026) — samostatný režim:
 *   node nastroje/vyrob_sablony.js --proj-v4 <složka podkladů> [výstupní složka]
 * Vstup:  Sablona_NABIDKA_PROJ.docx (PROJ v3 — s rekapitulací slevy)
 * Výstup: Sablona_NABIDKA_PROJ_v4.docx + _EN/_DE/_FR
 * PROJ v4 = v3, v níž pevné bloky „PLATEBNÍ PODMÍNKY ZAMĚŘENÍ" … „…KOLAUDAČNÍHO
 *           ŘÍZENÍ" nahradí blok za každou činnost plánu plateb: značky
 *           {{PLATBY_<X>_ZAC}}/{{PLATBY_<X>_KON}}, nadpis a {{PROJ_PLATBY_<X>}}
 *           (řádky „Platba … – N % z nabídkové ceny za …"); nenabízená činnost
 *           zmizí i s nadpisem. Blok autorského dozoru zůstává.
 *           + CENA GEODETICKÉHO ZAMĚŘENÍ (K18-N92, 30. 9. 2026): v3 měla jen
 *           seznam „Provedení zaměření geodetem / Zpracování geometrického
 *           plánu" bez ceny, a tak Word nesečetl činnosti do CELKEM. Pod seznam
 *           přijde cenová tabulka ve stavbě ostatních (vzor = tabulka ceny IČ)
 *           se symbolem {{PROJ_CENA_GEODET_BLOK}} mezi značkami
 *           {{CENA_GEODET_ZAC}}/{{CENA_GEODET_KON}}: nenabízené geodetické
 *           zaměření cenu nemá a blok zmizí (seznam zůstává jako dosud).
 *
 * PROJ v5 (autorský dozor jen když se nabízí, rozhodnutí J. V. 14. 10. 2026):
 *   node nastroje/vyrob_sablony.js --proj-v5 <složka podkladů> [výstupní složka]
 * Vstup:  Sablona_NABIDKA_PROJ_v4.docx
 * Výstup: Sablona_NABIDKA_PROJ_v5.docx + _EN/_DE/_FR
 * PROJ v5 = v4, v níž blok autorského dozoru (mezera, tabulka „AUTORSKÝ
 *           DOZOR (AD):", mezera, tabulka měsíční sazby a věta o sazbě) stojí
 *           mezi {{BLOK_AD_ZAC}}/{{BLOK_AD_KON}} se symbolem
 *           {{PROJ_CENA_AD_BLOK}} místo {{PROJ_CENA_AD}} a tabulka „PLATEBNÍ
 *           PODMÍNKY AUTORSKÉHO DOZORU:" mezi {{PLATBY_AD_ZAC}}/{{PLATBY_AD_KON}}
 *           s nadpisem {{PROJ_PLATBY_AD_NADPIS}}. Varianta, která AD nenabízí,
 *           dá oba symboly prázdné a bloky zmizí. Nadpis ROZŠÍŘENÁ NABÍDKA
 *           zůstává — ve Wordu pod ním stojí i geodetické zaměření.
 *
 * PROJ v6 (texty nabídky PROJ z Nastavení → Firma, W1 19. 10. 2026):
 *   node nastroje/vyrob_sablony.js --proj-v6 <složka podkladů> [výstupní složka]
 * Vstup:  Sablona_NABIDKA_PROJ_v5.docx
 * Výstup: Sablona_NABIDKA_PROJ_v6.docx + _EN/_DE/_FR
 * PROJ v6 = v5, v níž pevné řádky tabulek CENA NEZAHRNUJE a POŽADOVÁNO OD
 *           INVESTORA nahradí jeden řádek (stavba prvního pevného) se symbolem
 *           {{PROJ_CENA_NEZAHRNUJE}} / {{PROJ_POZADOVANO_OD_INVESTORA}}
 *           a řádky TERMÍNŮ jeden dvousloupcový řádek {{PROJ_TERMINY_CINNOST}}
 *           | {{PROJ_TERMINY_TERMIN}}; aplikace řádek zopakuje za každou
 *           odrážku / nabízenou činnost (docxgen rozvinRadkyZaRadek). Každá
 *           tabulka stojí mezi {{BLOK_<X>_ZAC}}/{{BLOK_<X>_KON}} (poznámky pod
 *           termíny patří do bloku termínů). Za termíny přibude blok DOLOŽKY
 *           (tabulka ve stavbě CENA NEZAHRNUJE, {{PROJ_DOLOZKY}}) — zmizí,
 *           když jsou doložky PROJ vypnuté nebo prázdné (odstranPrazdneBloky).
 *           Nadpisy tabulek zůstávají z v5.
 *
 * PROJ v7 (úvod DPZ bez studie, D1 20. 10. 2026, postřeh D. Sikory):
 *   node nastroje/vyrob_sablony.js --proj-v7 <složka podkladů> [výstupní složka]
 * Vstup:  Sablona_NABIDKA_PROJ_v6.docx
 * Výstup: Sablona_NABIDKA_PROJ_v7.docx + _EN/_DE/_FR
 * PROJ v7 = v6, v níž odstavec úvodu DPZ „Dokumentace pro povolení záměru
 *           (DPZ) navazuje na vzájemně odsouhlasenou STUDII PROVEDITELNOSTI.
 *           Ta rozpracovává … obsahuje tyto části:" nese jen {{PROJ_DPZ_UVOD}}
 *           (písmo a odstavec zůstávají). Aplikace dosadí větu v jazyce
 *           dokumentu: se studií v nabídce s navázáním, bez ní bez navázání.
 *
 * CN v14 (etapa A platebních podmínek OCK, 30. 9. 2026) — samostatný režim:
 *   node nastroje/vyrob_sablony.js --cn-v14 <složka podkladů> [výstupní složka]
 * Vstup:  Sablona_NABIDKA_CN_v13.docx
 * Výstup: Sablona_NABIDKA_CN_v14.docx + _EN/_DE/_FR
 * CN v14 = v13, v níž tabulku kapitoly III. s pevnými větami o třech dílčích
 *           dokladech nahradí dvě tabulky ve značkách bloků: splátky
 *           ({{PLATBY_SPLATKY_ZAC/_KON}}, hlavička z v13 a jeden řádek
 *           s odrážkou a {{PODM_PLATEBNI_KALENDAR}} — aplikace ho zopakuje za
 *           každou větu) a měsíční fakturace ({{PLATBY_MESICNE_ZAC/_KON}},
 *           „Způsob fakturace:" a {{PODM_FAKTURACE_MESICNE}}). Nepotřebná
 *           tabulka zmizí; „Bez zálohy" dá dvě věty správně očíslované (D1),
 *           měsíční fakturace jednu schválenou větu (D2).
 *
 * CN v15 (12. 10. 2026, pokyn J. V. „připrav mi šablony v15") — samostatný režim:
 *   node nastroje/vyrob_sablony.js --cn-v15 <složka podkladů> [výstupní složka]
 * Vstup:  Sablona_NABIDKA_CN_v14.docx
 * Výstup: Sablona_NABIDKA_CN_v15.docx + _EN/_DE/_FR
 * CN v15 = v14 + pod řádkem „USAZENÍ OCK – BOČNÍ STĚNY" dva řádky téže stavby
 *           „USAZENÍ OCK – LEVÁ BOČNÍ STĚNA" {{TS_USAZENI_LEVA}} a „… PRAVÁ
 *           BOČNÍ STĚNA" {{TS_USAZENI_PRAVA}} (#396). Řádek bez volby zmizí
 *           (odstranPrazdneTsRadky); s v15 aplikace levou a pravou stěnu do
 *           řádku „boční stěny" neslučuje.
 *
 * SoD PROJ se seznamem plateb (etapa B, 30. 9. 2026) — samostatný režim:
 *   node nastroje/vyrob_sablony.js --sod-proj <složka podkladů> [výstupní složka]
 * Vstup:  Sablona_SOD_PROJEKCE.docx (osm pevných plateb SODP_PLATBA1–8_KC)
 * Výstup: Sablona_SOD_PROJEKCE_v2.docx — osm odstavců „Platba ve výši …"
 *         nahradí jeden odstavec (stejná odrážka a písmo) se symbolem
 *         {{SODP_PLATEBNI_KALENDAR}}; aplikace ho zopakuje za každou platbu.
 *         Věta o prodlení zhotovitele nese pokutu za nedodržení termínu
 *         {{PODM_POKUTA_TERMIN_PROC}} (rozhodnutí J. V. 1. 10. 2026, Q6).
 *         Smlouva je jen česky — jazykové mutace se nevyrábějí.
 *
 * SoD realizace se splátkami z krycího listu (K18-N100, 1. 10. 2026):
 *   node nastroje/vyrob_sablony.js --sod-real <složka podkladů> [výstupní složka]
 * Vstup:  Sablona_SOD_REALIZACE.docx (čtyři pevné splátky SOD_SPLATKA1–4_PROC)
 * Výstup: Sablona_SOD_REALIZACE_v2.docx — čtyři odstavce splátek nahradí
 *         jeden se symbolem {{SOD_PLATEBNI_KALENDAR}} (odstavec za splátku);
 *         věta o prodlení zhotovitele nese pokutu za prodlení dodávky
 *         {{PODM_POKUTA_DODAVKA_PROC}} a pevné datum podkladů dodavatele
 *         výtahu nahradí {{SOD_TERMIN_PODKLADY_VYTAH}} (rozhodnutí J. V.
 *         1. 10. 2026, Q5 a Q6). Jen česky, jako SoD PROJ.
 * Oba režimy vypíšou, co nahradily, a ověří XML a symboly výstupu.
 *
 * SoD PROJ s číslem smlouvy z krycího listu (S9, 15. 10. 2026):
 *   node nastroje/vyrob_sablony.js --sod-proj-cislo <složka podkladů> [výstupní složka]
 * Vstup:  Sablona_SOD_PROJEKCE.docx a/nebo Sablona_SOD_PROJEKCE_v2.docx
 * Výstup: Sablona_SOD_PROJEKCE_v1_cislo.docx (z v1), Sablona_SOD_PROJEKCE_v3.docx
 *         (z v2) — pod nadpisem „SMLOUVA O DÍLO / na zhotovení projektové
 *         dokumentace" řádek „číslo {{SOD_CISLO_SMLOUVY}}" jako u realizace.
 *
 * SoD realizace v3 — režim DPH a skladné (rozhodnutí J. V. 18. 10. 2026):
 *   node nastroje/vyrob_sablony.js --sod-real-v3 <složka podkladů> [výstupní složka]
 * Vstup:  Sablona_SOD_REALIZACE_v2.docx
 * Výstup: Sablona_SOD_REALIZACE_v3.docx — v čl. V věta o režimu DPH →
 *         {{SOD_DPH_REZIM}}, tělo odstavce „3." (prohlášení o snížené
 *         sazbě) → {{SOD_DPH_PROHLASENI}} (číslo „3." a tabulátor zůstávají,
 *         ať sedí odkazy na „bod 4"), pevná částka skladného „… Kč" ve větě
 *         o skladovacích poplatcích → {{SOD_SKLADNE}} („/denně" zůstává).
 *         Věty i částku dosazuje aplikace (krycí list OCK „Režim DPH ve
 *         smlouvě", Nastavení → Firma „Skladné"); jazykové verze dělá
 *         nastroje/preklad_sod.js.
 *
 * SoD PROJ v4 — rozsah díla podle nabídky (#380 Q7, rozhodnutí J. V. 17. 10. 2026):
 *   node nastroje/vyrob_sablony.js --sod-proj-v4 <složka podkladů> [výstupní složka]
 * Vstup:  Sablona_SOD_PROJEKCE_v3.docx
 * Výstup: Sablona_SOD_PROJEKCE_v4.docx — věta přílohy č. 1 se symbolem
 *         {{SODP_ROZSAH_DILA}} místo pevného „DPZ+DSP …", činnosti čl. II a III
 *         ve značkách {{CIN_<X>_ZAC}}/{{CIN_<X>_KON}} (nenabízená zmizí),
 *         ověřený odkaz na odstavec v čl. VII. Jen česky — EN/DE/FR přegeneruje
 *         nastroje/preklad_sod.js.
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
const { NABIDKA_PROJ_PLATBY, NABIDKA_PROJ_DEF, NABIDKA_PROJ_CENA_SYMBOL } = require(path.join(SRC, 'nabidka_proj.js'));

const REZIM = /^--/.test(process.argv[2] || '') ? process.argv[2] : '';
const REZIM_V4 = REZIM === '--proj-v4', REZIM_SOD = REZIM === '--sod-proj', REZIM_CN14 = REZIM === '--cn-v14';
const REZIM_SOD_REAL = REZIM === '--sod-real';
const REZIM_SOD_CISLO = REZIM === '--sod-proj-cislo';
const REZIM_SOD_REAL3 = REZIM === '--sod-real-v3';
const REZIM_CN15 = REZIM === '--cn-v15';
const REZIM_V5 = REZIM === '--proj-v5';
const REZIM_V6 = REZIM === '--proj-v6';
const REZIM_V7 = REZIM === '--proj-v7';
const REZIM_SOD_V4 = REZIM === '--sod-proj-v4';
const ARGY = REZIM ? process.argv.slice(3) : process.argv.slice(2);
const PODKLADY = ARGY[0] || process.env.KNG_PODKLADY;
const VYSTUP = ARGY[1] || PODKLADY;

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

/* ---------- PROJ v4: platební podmínky z plánu plateb ----------
 * V PROJ v3 je každý blok platebních podmínek samostatná tabulka: první
 * řádek nese nadpis („PLATEBNÍ PODMÍNKY ZAMĚŘENÍ:"), další řádky platby.
 * Nahrazuje se rozsah od tabulky zaměření po tabulku autorského dozoru
 * (ta zůstává): za každou činnost plánu tabulka se stejnými vlastnostmi,
 * nadpisovým řádkem ze vzoru a jedním sloučeným řádkem se symbolem. */
function projV4(xml) {
  const t = tělo(xml);
  let body = t.body;
  const top = prvkyTela(body);
  const txt = el => textPrvku(body.slice(el.zac, el.kon));
  const sym = dg.klicePlaceholderu(body);
  if (sym.some(k => /^PROJ_PLATBY_/.test(k))) chyba('PROJ: šablona už platební podmínky z plánu plateb má — není co doplnit');
  if (sym.indexOf('PROJ_SLEVA_KC') < 0) chyba('PROJ: vstup není PROJ v3 (chybí rekapitulace se slevou) — nejdřív vyrobte v3');
  const iZac = top.findIndex(el => /^PLATEBNÍ PODMÍNKY ZAMĚŘENÍ\s*:/.test(txt(el)));
  if (iZac < 0) chyba('PROJ: nenašel jsem blok „PLATEBNÍ PODMÍNKY ZAMĚŘENÍ"');
  const iAd = top.findIndex((el, i) => i > iZac && /^PLATEBNÍ PODMÍNKY AUTORSKÉHO DOZORU\s*:/.test(txt(el)));
  if (iAd < 0) chyba('PROJ: za platebními podmínkami zaměření jsem nenašel blok „PLATEBNÍ PODMÍNKY AUTORSKÉHO DOZORU"');
  const vzor = body.slice(top[iZac].zac, top[iZac].kon);
  if (top[iZac].tag !== 'tbl') chyba('PROJ: blok „PLATEBNÍ PODMÍNKY ZAMĚŘENÍ" není tabulka, jak čekám (PROJ v3)');
  const tblPr = (vzor.match(/<w:tblPr>[\s\S]*?<\/w:tblPr>/) || [''])[0];
  const tblGrid = (vzor.match(/<w:tblGrid>[\s\S]*?<\/w:tblGrid>/) || [''])[0];
  const sirka = (tblGrid.match(/w:w="(\d+)"/g) || []).reduce((a, x) => a + (+x.replace(/\D/g, '')), 0);
  const radek1 = (vzor.match(/<w:tr[\s>][\s\S]*?<\/w:tr>/) || [''])[0];
  const pNadpis = (radek1.match(/<w:p[\s>](?:(?!<\/w:p>)[\s\S])*PLATEBNÍ PODMÍNKY[\s\S]*?<\/w:p>/) || [''])[0];
  const pPr = (pNadpis.match(/<w:pPr>[\s\S]*?<\/w:pPr>/) || [''])[0];
  const rPr = (pNadpis.replace(/<w:pPr>[\s\S]*?<\/w:pPr>/, '').match(/<w:rPr>[\s\S]*?<\/w:rPr>/) || [''])[0];
  if (!tblPr || !tblGrid || !sirka || !radek1 || !pNadpis || !pPr || !rPr)
    chyba('PROJ: tabulka „PLATEBNÍ PODMÍNKY ZAMĚŘENÍ" nemá čekanou stavbu (vlastnosti, mřížka, nadpisový řádek)');
  const nadpisovy = text => radek1.replace(pNadpis, '<w:p>' + pPr + '<w:r>' + rPr + '<w:t xml:space="preserve">'
    + dg.docxEsc(text) + '</w:t></w:r></w:p>');
  const obsahovy = jmeno => '<w:tr><w:trPr><w:trHeight w:val="346"/></w:trPr><w:tc><w:tcPr><w:tcW w:w="' + sirka + '" w:type="dxa"/>'
    + '<w:gridSpan w:val="' + (tblGrid.match(/<w:gridCol[\s>/]/g) || []).length + '"/></w:tcPr>'
    + '<w:p><w:pPr><w:pStyle w:val="Bezmezer"/><w:spacing w:before="60" w:after="60" w:line="300" w:lineRule="auto"/></w:pPr>'
    + '<w:r><w:rPr><w:rFonts w:cs="Calibri"/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr>'
    + '<w:t xml:space="preserve">{{' + jmeno + '}}</w:t></w:r></w:p></w:tc></w:tr>';
  const prazdny = '<w:p><w:pPr><w:pStyle w:val="Bezmezer"/></w:pPr></w:p>';
  const bloky = Object.keys(NABIDKA_PROJ_PLATBY).map(k => {
    const d = NABIDKA_PROJ_PLATBY[k];
    return znacka('PLATBY_' + d.symbol + '_ZAC')
      + '<w:tbl>' + tblPr + tblGrid + nadpisovy(d.nadpis + ':') + obsahovy('PROJ_PLATBY_' + d.symbol) + '</w:tbl>' + prazdny
      + znacka('PLATBY_' + d.symbol + '_KON');
  }).join('');
  body = body.slice(0, top[iZac].zac) + bloky + body.slice(top[iAd].zac);
  body = projV4CenaGeodetu(body);
  return t.pred + body + t.po;
}

/* ---------- PROJ v5: autorský dozor jen když se nabízí ----------
 * Blok AD ve v4: [prázdný odstavec] [tabulka „AUTORSKÝ DOZOR (AD):"]
 * [prázdný odstavec] [tabulka sazby s {{PROJ_CENA_AD}}] [věta „Sazbu je
 * možné určit…"]. Platební podmínky AD jsou tabulka, jejíž první odstavec
 * nese nadpis „PLATEBNÍ PODMÍNKY AUTORSKÉHO DOZORU:" (rozdělený do běhů).
 * Stavba jiná než čekaná = chyba, nic se nehádá. */
function projV5(xml) {
  const t = tělo(xml);
  let body = t.body;
  const sym = dg.klicePlaceholderu(body);
  if (sym.indexOf('PROJ_CENA_AD_BLOK') >= 0) chyba('PROJ: šablona už blok autorského dozoru se značkami má — není co doplnit');
  if (!sym.some(k => /^PROJ_PLATBY_/.test(k))) chyba('PROJ: vstup není PROJ v4 (chybí platební podmínky z plánu plateb) — nejdřív vyrobte v4');
  if (sym.indexOf('PROJ_CENA_AD') < 0) chyba('PROJ: šablona nemá symbol {{PROJ_CENA_AD}}');
  /* platební podmínky AD (stojí níž — upravují se první, pozice výš platí dál) */
  let top = prvkyTela(body);
  const txt = el => textPrvku(body.slice(el.zac, el.kon));
  const iPl = top.findIndex(el => el.tag === 'tbl' && /^PLATEBNÍ PODMÍNKY AUTORSKÉHO DOZORU\s*:/.test(txt(el)));
  if (iPl < 0) chyba('PROJ: nenašel jsem tabulku „PLATEBNÍ PODMÍNKY AUTORSKÉHO DOZORU:"');
  const tab = body.slice(top[iPl].zac, top[iPl].kon);
  const pNadpis = (tab.match(/<w:p[\s>](?:(?!<\/w:p>)[\s\S])*?<\/w:p>/g) || []).find(p => /PLATEBNÍ PODMÍNKY/.test(p));
  if (!pNadpis || textPrvku(pNadpis) !== 'PLATEBNÍ PODMÍNKY AUTORSKÉHO DOZORU:')
    chyba('PROJ: nadpis platebních podmínek AD není samostatný odstavec „PLATEBNÍ PODMÍNKY AUTORSKÉHO DOZORU:"');
  let prvni = true;
  const pNovy = pNadpis.replace(/(<w:t(?:\s[^>]*)?>)[^<]*(<\/w:t>)/g, (x, a, b) => {
    if (prvni) { prvni = false; return '<w:t xml:space="preserve">{{PROJ_PLATBY_AD_NADPIS}}' + b; }
    return a + b;
  });
  body = body.slice(0, top[iPl].zac) + znacka('PLATBY_AD_ZAC') + tab.replace(pNadpis, () => pNovy)
    + znacka('PLATBY_AD_KON') + body.slice(top[iPl].kon);
  /* popis a sazba AD */
  top = prvkyTela(body);
  const iAd = top.findIndex(el => el.tag === 'tbl' && /^AUTORSKÝ DOZOR \(AD\)\s*:/.test(txt(el)));
  if (iAd < 1) chyba('PROJ: nenašel jsem tabulku „AUTORSKÝ DOZOR (AD):"');
  const iSaz = iAd + 2, iVeta = iAd + 3;
  if (!(top[iAd - 1].tag === 'p' && !txt(top[iAd - 1]) && top[iAd + 1] && top[iAd + 1].tag === 'p' && !txt(top[iAd + 1])
      && top[iSaz] && top[iSaz].tag === 'tbl' && dg.klicePlaceholderu(body.slice(top[iSaz].zac, top[iSaz].kon)).indexOf('PROJ_CENA_AD') >= 0
      && top[iVeta] && /^Sazbu je možné určit/.test(txt(top[iVeta]))))
    chyba('PROJ: blok autorského dozoru nemá čekanou stavbu (mezera, popis AD, mezera, tabulka sazby, věta o sazbě)');
  const blok = body.slice(top[iAd - 1].zac, top[iVeta].kon).replace('{{PROJ_CENA_AD}}', '{{PROJ_CENA_AD_BLOK}}');
  if (blok.indexOf('{{PROJ_CENA_AD_BLOK}}') < 0) chyba('PROJ: symbol {{PROJ_CENA_AD}} není v jednom běhu — nic nehádám');
  body = body.slice(0, top[iAd - 1].zac) + znacka('BLOK_AD_ZAC') + blok + znacka('BLOK_AD_KON') + body.slice(top[iVeta].kon);
  return t.pred + body + t.po;
}

/* ---------- PROJ v6: texty nabídky PROJ z Nastavení → Firma ----------
 * Ve v5 jsou CENA NEZAHRNUJE a POŽADOVÁNO OD INVESTORA tabulky o jednom
 * sloupci: první řádek nadpis („CENA NEZAHRNUJE:"), další řádky pevné
 * odrážky. TERMÍNY je tabulka o dvou sloupcích: nadpis a řádky činnost |
 * termín; pod ní dvě poznámky („*) Termíny pro vyjádření…", „Termíny
 * zpracování…"). Nadpisový řádek zůstává, z pevných řádků zbude první se
 * symbolem místo textu (vlastnosti odstavce a písmo prvního běhu buňky);
 * kopie nenesou w14:paraId — aplikace řádek zopakuje a id by se zdvojila.
 * Stavba jiná než čekaná = chyba, nic se nehádá. */
const PROJ_V6_BLOKY = [
  { nadpis: 'CENA NEZAHRNUJE:', blok: 'BLOK_CENA_NEZAHRNUJE', symboly: ['PROJ_CENA_NEZAHRNUJE'] },
  { nadpis: 'POŽADOVÁNO OD INVESTORA:', blok: 'BLOK_POZADOVANO', symboly: ['PROJ_POZADOVANO_OD_INVESTORA'] },
  { nadpis: 'TERMÍNY:', blok: 'BLOK_TERMINY', symboly: ['PROJ_TERMINY_CINNOST', 'PROJ_TERMINY_TERMIN'] },
];
const PROJ_V6_POZNAMKY_TERMINU = [/^\*\)\s*Termíny pro vyjádření/, /^Termíny zpracování/];
const bezW14 = s => s.replace(/\sw14:(?:paraId|textId)="[^"]*"/g, '');
/* Řádek tabulky, v němž každá buňka dostane jediný odstavec se symbolem —
 * vlastnosti odstavce a první běh s písmem z prvního neprázdného odstavce
 * buňky (prázdná buňka: z prvního odstavce). */
function radekSeSymboly(radek, symboly, kde) {
  const bunky = radek.match(/<w:tc[\s>][\s\S]*?<\/w:tc>/g) || [];
  if (bunky.length !== symboly.length) chyba(kde + ': řádek tabulky má ' + bunky.length + ' buněk, čekám ' + symboly.length);
  let i = 0;
  return bezW14(radek.replace(/<w:tc[\s>][\s\S]*?<\/w:tc>/g, tc => {
    const sym = symboly[i++];
    const tcPr = (tc.match(/<w:tcPr>[\s\S]*?<\/w:tcPr>/) || [''])[0];
    const odst = tc.match(/<w:p[\s>](?:(?!<\/w:p>)[\s\S])*?<\/w:p>/g) || [];
    const vzor = odst.find(p => textPrvku(p)) || odst[0];
    if (!vzor) chyba(kde + ': buňka tabulky nemá odstavec');
    const pPr = (vzor.match(/<w:pPr>[\s\S]*?<\/w:pPr>/) || [''])[0];
    const beh = (vzor.replace(pPr, '').match(/<w:r[\s>](?:(?!<\/w:r>)[\s\S])*?<w:t[\s>]/) || [''])[0];
    const rPr = (beh.match(/<w:rPr>[\s\S]*?<\/w:rPr>/) || [''])[0];
    return tc.slice(0, tc.indexOf('>') + 1) + tcPr + '<w:p>' + pPr + '<w:r>' + rPr
      + '<w:t xml:space="preserve">{{' + sym + '}}</w:t></w:r></w:p></w:tc>';
  }));
}
function projV6(xml) {
  const t = tělo(xml);
  let body = t.body;
  const sym = dg.klicePlaceholderu(body);
  if (sym.indexOf('PROJ_CENA_NEZAHRNUJE') >= 0 || sym.indexOf('PROJ_DOLOZKY') >= 0)
    chyba('PROJ: šablona už texty nabídky PROJ z Firmy ({{PROJ_CENA_NEZAHRNUJE}} / {{PROJ_DOLOZKY}}) má — není co doplnit');
  if (sym.indexOf('PROJ_CENA_AD_BLOK') < 0) chyba('PROJ: vstup není PROJ v5 (chybí blok autorského dozoru {{PROJ_CENA_AD_BLOK}}) — nejdřív vyrobte v5');
  const txt = el => textPrvku(body.slice(el.zac, el.kon));
  let vzorDolozek = null;
  /* odzadu (termíny jsou poslední), ať pozice výš platí dál */
  for (const d of PROJ_V6_BLOKY.slice().reverse()) {
    const top = prvkyTela(body);
    const nalez = top.map((el, i) => i).filter(i => top[i].tag === 'tbl'
      && textPrvku((radkyTabulky(body.slice(top[i].zac, top[i].kon))[0] || '')) === d.nadpis);
    if (nalez.length !== 1) chyba('PROJ: čekám právě jednu tabulku s nadpisem „' + d.nadpis + '", je jich ' + nalez.length);
    const i = nalez[0], el = top[i];
    const tab = body.slice(el.zac, el.kon);
    const radky = radkyTabulky(tab);
    if (radky.length < 2) chyba('PROJ: tabulka „' + d.nadpis + '" nemá pod nadpisem žádný řádek');
    if (radky.some(r => dg.klicePlaceholderu(r).length)) chyba('PROJ: tabulka „' + d.nadpis + '" už nese symbol — nic nehádám');
    const zacRadku = tab.indexOf(radky[0]), konRadku = tab.lastIndexOf(radky[radky.length - 1]) + radky[radky.length - 1].length;
    const nova = tab.slice(0, zacRadku) + radky[0] + radekSeSymboly(radky[1], d.symboly, 'PROJ „' + d.nadpis + '"') + tab.slice(konRadku);
    /* termíny: blok bere i poznámky hned pod tabulkou */
    let kon = el.kon;
    if (d.blok === 'BLOK_TERMINY') {
      let j = i + 1;
      for (const re of PROJ_V6_POZNAMKY_TERMINU) {
        if (!top[j] || top[j].tag !== 'p' || !re.test(txt(top[j])))
          chyba('PROJ: pod tabulkou TERMÍNY nejsou čekané poznámky („*) Termíny pro vyjádření…", „Termíny zpracování…")');
        kon = top[j].kon; j++;
      }
    }
    if (d.blok === 'BLOK_CENA_NEZAHRNUJE') vzorDolozek = { tab: nova, nadpis: radky[0] };
    body = body.slice(0, el.zac) + znacka(d.blok + '_ZAC') + nova + body.slice(el.kon, kon) + znacka(d.blok + '_KON') + body.slice(kon);
  }
  /* DOLOŽKY: tabulka ve stavbě CENA NEZAHRNUJE, nadpis přepsaný v prvním běhu */
  let prvni = true;
  const nadpis = bezW14(vzorDolozek.nadpis).replace(/(<w:t(?:\s[^>]*)?>)[^<]*(<\/w:t>)/g, (x, a, b) => {
    if (prvni) { prvni = false; return '<w:t xml:space="preserve">DOLOŽKY:' + b; }
    return a + b;
  });
  if (textPrvku(nadpis) !== 'DOLOŽKY:') chyba('PROJ: nadpis doložek se nepodařilo složit');
  const tabD = bezW14(vzorDolozek.tab).replace(bezW14(vzorDolozek.nadpis), () => nadpis).split('{{PROJ_CENA_NEZAHRNUJE}}').join('{{PROJ_DOLOZKY}}');
  const mezera = '<w:p><w:pPr><w:pStyle w:val="Bezmezer"/></w:pPr></w:p>';
  const dolozky = znacka('BLOK_DOLOZKY_ZAC') + mezera + tabD + znacka('BLOK_DOLOZKY_KON');
  const konTerminu = body.indexOf(znacka('BLOK_TERMINY_KON')) + znacka('BLOK_TERMINY_KON').length;
  body = body.slice(0, konTerminu) + dolozky + body.slice(konTerminu);
  return t.pred + body + t.po;
}

/* ---------- PROJ v7: úvod DPZ symbolem (D1) ----------
 * Právě jeden odstavec, jehož text začíná „Dokumentace pro povolení záměru
 * (DPZ) navazuje na vzájemně odsouhlasenou STUDII" — celý jeho text nahradí
 * {{PROJ_DPZ_UVOD}} v prvním běhu (prepisUsekOdstavce). Jiná stavba = chyba. */
const PROJ_V7_DPZ_UVOD_RE = /^Dokumentace pro povolení záměru \(DPZ\) navazuje na vzájemně odsouhlasenou STUDII/;
function projV7(xml) {
  const t = tělo(xml);
  let body = t.body;
  const sym = dg.klicePlaceholderu(body);
  if (sym.indexOf('PROJ_DPZ_UVOD') >= 0) chyba('PROJ: šablona už úvod DPZ symbolem {{PROJ_DPZ_UVOD}} má — není co doplnit');
  if (sym.indexOf('PROJ_DOLOZKY') < 0) chyba('PROJ: vstup není PROJ v6 (chybí blok doložek {{PROJ_DOLOZKY}}) — nejdřív vyrobte v6');
  const sp = odstavceSTextem(body, x => PROJ_V7_DPZ_UVOD_RE.test(x.trim()));
  if (sp.length !== 1) chyba('PROJ: čekám právě jeden odstavec úvodu DPZ „Dokumentace pro povolení záměru (DPZ) navazuje na…", je jich ' + sp.length + ' — nic nehádám');
  const p = body.slice(sp[0].zac, sp[0].kon);
  /* délka v témže počtu jako prepisUsekOdstavce (texty běhů w:t) */
  const delka = (p.match(/<w:t(?:\s[^>]*)?>[\s\S]*?<\/w:t>/g) || [])
    .reduce((a, x) => a + dg.xmlUnesc(x.replace(/^<w:t(?:\s[^>]*)?>/, '').replace(/<\/w:t>$/, '')).length, 0);
  body = body.slice(0, sp[0].zac) + prepisUsekOdstavce(p, 0, delka, '{{PROJ_DPZ_UVOD}}') + body.slice(sp[0].kon);
  return t.pred + body + t.po;
}

/* ---------- CN v14: platební podmínky z platebního kalendáře OCK ----------
 * V CN v13 je kapitola III. tabulka o jednom sloupci: tmavý řádek „Cena díla
 * je splatná v následujících dílčích splátkách:" a pod ním tři orámované
 * řádky s pevnými větami (odrážky a, b, c): 1. dílčí doklad s
 * {{PODM_ZALOHA1_PROC}}, 2. dílčí s {{PODM_FAKTURA2_PROC}} a konečný. Věty
 * teď skládá aplikace (kryciPlatebniSymboly), takže v14 nese:
 *   {{PLATBY_SPLATKY_ZAC}} [hlavička z v13] [a) {{PODM_PLATEBNI_KALENDAR}}] {{PLATBY_SPLATKY_KON}}
 *   {{PLATBY_MESICNE_ZAC}} [Způsob fakturace:] [{{PODM_FAKTURACE_MESICNE}}] {{PLATBY_MESICNE_KON}}
 * Řádek kalendáře má odstavec věty z v13 (odrážka, odsazení, písmo prvního
 * běhu); věta o měsíční fakturaci totéž bez odrážky. Kopie řádků nenesou
 * w14:paraId, ať se identifikátory v dokumentu nezdvojí. Když tabulka nemá
 * čekanou stavbu, skončí chybou — nic se nehádá. */
function radkyTabulky(tab) {
  const re = /<(\/?)w:(tbl|tr)(?=[\s>/])[^>]*?(\/?)>/g;
  const out = [];
  let hloubka = 0, zac = -1, m;
  while ((m = re.exec(tab))) {
    const [cely, konec, tag, samo] = m;
    if (samo === '/') continue;
    if (tag === 'tbl') { hloubka += konec ? -1 : 1; continue; }
    if (hloubka !== 1) continue;                               // řádky vnořených tabulek ne
    if (!konec) zac = m.index;
    else if (zac >= 0) { out.push(tab.slice(zac, m.index + cely.length)); zac = -1; }
  }
  return out;
}
const CN_HLAVICKA_SPLATEK = 'Cena díla je splatná v následujících dílčích splátkách:';
const CN_HLAVICKA_MESICNE = 'Způsob fakturace:';
/* Word píše za jednopísmennou předložkou nezlomitelnou mezeru („v následujících"). */
const bezNbsp = s => String(s).replace(/ /g, ' ');
const CN_HLAVICKA_SPLATEK_RE = new RegExp('(<w:t(?:\\s[^>]*)?>)' + CN_HLAVICKA_SPLATEK.split(' ').join('(?: |\\u00a0|&#160;)') + '(</w:t>)');
function cnV14(xml) {
  const t = tělo(xml);
  let body = t.body;
  const sym = dg.klicePlaceholderu(body);
  if (sym.indexOf('PODM_PLATEBNI_KALENDAR') >= 0) chyba('CN: šablona už platební kalendář {{PODM_PLATEBNI_KALENDAR}} má — není co doplnit');
  if (sym.indexOf('KAP_IV_ZAC') < 0) chyba('CN: vstup není CN v13 (chybí značky kapitol {{KAP_…}}) — nejdřív vyrobte v13');
  const top = prvkyTela(body);
  const tabulky = top.filter(el => {
    if (el.tag !== 'tbl') return false;
    const k = dg.klicePlaceholderu(body.slice(el.zac, el.kon));
    return k.indexOf('PODM_ZALOHA1_PROC') >= 0 && k.indexOf('PODM_FAKTURA2_PROC') >= 0;
  });
  if (tabulky.length !== 1)
    chyba('CN: čekám právě jednu tabulku s větami o dílčích dokladech ({{PODM_ZALOHA1_PROC}}, {{PODM_FAKTURA2_PROC}}), je jich ' + tabulky.length);
  const el = tabulky[0];
  const tab = body.slice(el.zac, el.kon);
  const radky = radkyTabulky(tab);
  const tblPr = (tab.match(/<w:tblPr>[\s\S]*?<\/w:tblPr>/) || [''])[0];
  const tblGrid = (tab.match(/<w:tblGrid>[\s\S]*?<\/w:tblGrid>/) || [''])[0];
  const maSym = (r, k) => dg.klicePlaceholderu(r).indexOf(k) >= 0;
  if (radky.length !== 4 || !tblPr || !tblGrid || bezNbsp(textPrvku(radky[0])) !== CN_HLAVICKA_SPLATEK
      || !maSym(radky[1], 'PODM_ZALOHA1_PROC') || !maSym(radky[2], 'PODM_FAKTURA2_PROC') || !/konečný daňový doklad/.test(textPrvku(radky[3])))
    chyba('CN: tabulka vět o dílčích dokladech nemá čekanou stavbu (hlavička „' + CN_HLAVICKA_SPLATEK + '" a tři řádky vět)');
  const odstavce = (radky[1].match(/<w:p[\s>](?:(?!<\/w:p>)[\s\S])*?<\/w:p>/g) || []);
  const pVeta = odstavce.find(p => maSym(p, 'PODM_ZALOHA1_PROC'));
  const pPr = pVeta ? (pVeta.match(/<w:pPr>[\s\S]*?<\/w:pPr>/) || [''])[0] : '';
  const rPr = pVeta ? (pVeta.replace(pPr, '').match(/<w:rPr>[\s\S]*?<\/w:rPr>/) || [''])[0] : '';
  if (!pVeta || !/<w:numPr>/.test(pPr) || !rPr)
    chyba('CN: odstavec věty o 1. dílčím dokladu nemá čekanou stavbu (odrážka, písmo běhu)');
  const bezId = s => s.replace(/\sw14:(?:paraId|textId)="[^"]*"/g, '');
  const odstavec = (vlastnosti, jmeno) => '<w:p>' + vlastnosti + '<w:r>' + rPr + '<w:t xml:space="preserve">{{' + jmeno + '}}</w:t></w:r></w:p>';
  const radekKalendare = radky[1].replace(pVeta, () => odstavec(pPr, 'PODM_PLATEBNI_KALENDAR'));
  const pPrBezOdrazky = pPr.replace(/<w:numPr>[\s\S]*?<\/w:numPr>/, '').replace(/<w:ind\s[^>]*\/>/, '');
  const radekMesicne = bezId(radky[1].replace(pVeta, () => odstavec(pPrBezOdrazky, 'PODM_FAKTURACE_MESICNE')));
  const hlavickaMesicne = bezId(radky[0].replace(CN_HLAVICKA_SPLATEK_RE, (x, a, b) => a + CN_HLAVICKA_MESICNE + b));
  if (textPrvku(hlavickaMesicne) !== CN_HLAVICKA_MESICNE) chyba('CN: text hlavičky „' + CN_HLAVICKA_SPLATEK + '" není v jednom běhu — nic nehádám');
  const splatky = '<w:tbl>' + tblPr + tblGrid + radky[0] + radekKalendare + '</w:tbl>';
  const mesicne = '<w:tbl>' + tblPr + tblGrid + hlavickaMesicne + radekMesicne + '</w:tbl>';
  body = body.slice(0, el.zac) + znacka('PLATBY_SPLATKY_ZAC') + splatky + znacka('PLATBY_SPLATKY_KON')
    + znacka('PLATBY_MESICNE_ZAC') + mesicne + znacka('PLATBY_MESICNE_KON') + body.slice(el.kon);
  return t.pred + body + t.po;
}

/* Odstavec bez atributů (w14:paraId, rsid…) — kopie odstavce ze vzoru nesmí
 * v dokumentu zopakovat id, které už v něm je. */
const odstavecBezId = p => p.replace(/^<w:p\b[^>]*>/, '<w:p>');

/* CENOVÁ TABULKA ČINNOSTI VE STAVBĚ VZORU (K18-N92). Cenové tabulky šablony
 * PROJ mají jeden řádek: vlevo nadpis, popis a „bez DPH", vpravo částka.
 * Vlastnosti tabulky, řádku, buněk, odstavců i písma se berou ze vzoru; texty
 * jsou nové a odstavce se skládají znovu (bez id). Vzor jiné stavby = chyba,
 * nic se nehádá. `texty` = [nadpis, popis]; „bez DPH" se opíše ze vzoru. */
/* CN v15: řádky levé a pravé boční stěny pod řádek „boční stěny". Kopie
 * řádku bez w14:paraId / w14:textId (Word si je doplní; dvojí id hlásí). */
function cnV15(xml) {
  const i = xml.indexOf('{{TS_USAZENI_BOCNI}}');
  if (i < 0 || xml.indexOf('{{TS_USAZENI_BOCNI}}', i + 1) >= 0) chyba('CN v14: symbol {{TS_USAZENI_BOCNI}} není právě jednou');
  if (xml.indexOf('TS_USAZENI_LEVA') >= 0) chyba('vstup už řádky levé a pravé boční stěny má');
  const zac = Math.max(xml.lastIndexOf('<w:tr ', i), xml.lastIndexOf('<w:tr>', i));
  const kon = xml.indexOf('</w:tr>', i) + '</w:tr>'.length;
  const radek = xml.slice(zac, kon);
  if ((radek.match(/<w:tr[\s>]/g) || []).length !== 1 || radek.indexOf('USAZENÍ OCK – BOČNÍ STĚNY') < 0)
    chyba('CN v14: řádek „USAZENÍ OCK – BOČNÍ STĚNY" nemá očekávanou stavbu');
  const kopie = (popis, symbol) => radek.replace(/\sw14:(paraId|textId)="[^"]*"/g, '')
    .replace('USAZENÍ OCK – BOČNÍ STĚNY', popis).replace('{{TS_USAZENI_BOCNI}}', '{{' + symbol + '}}');
  return xml.slice(0, kon) + kopie('USAZENÍ OCK – LEVÁ BOČNÍ STĚNA', 'TS_USAZENI_LEVA')
    + kopie('USAZENÍ OCK – PRAVÁ BOČNÍ STĚNA', 'TS_USAZENI_PRAVA') + xml.slice(kon);
}

function cenovaTabulka(vzor, texty, symbol) {
  const tblPr = (vzor.match(/<w:tblPr>[\s\S]*?<\/w:tblPr>/) || [''])[0];
  const tblGrid = (vzor.match(/<w:tblGrid>[\s\S]*?<\/w:tblGrid>/) || [''])[0];
  const radky = vzor.match(/<w:tr[\s>][\s\S]*?<\/w:tr>/g) || [];
  const bunky = radky.length === 1 ? (radky[0].match(/<w:tc[\s>][\s\S]*?<\/w:tc>/g) || []) : [];
  const odstavce = b => b.match(/<w:p[\s>][\s\S]*?<\/w:p>/g) || [];
  const vlevo = bunky.length === 2 ? odstavce(bunky[0]) : [], vpravo = bunky.length === 2 ? odstavce(bunky[1]) : [];
  if (!tblPr || !tblGrid || vlevo.length < 3 || vpravo.length < 1)
    chyba('PROJ: vzorová cenová tabulka nemá čekanou stavbu (jeden řádek, vlevo nadpis–popis–„bez DPH", vpravo částka)');
  const trPr = (radky[0].match(/<w:trPr>[\s\S]*?<\/w:trPr>/) || [''])[0];
  const tcPr = b => (b.match(/<w:tcPr>[\s\S]*?<\/w:tcPr>/) || [''])[0];
  const pPr = p => (p.match(/<w:pPr>[\s\S]*?<\/w:pPr>/) || [''])[0];
  const rPr = p => (p.replace(/<w:pPr>[\s\S]*?<\/w:pPr>/, '').match(/<w:rPr>[\s\S]*?<\/w:rPr>/) || [''])[0];
  const odst = (vz, text) => '<w:p>' + pPr(vz) + '<w:r>' + rPr(vz) + '<w:t xml:space="preserve">'
    + dg.docxEsc(text) + '</w:t></w:r></w:p>';
  return '<w:tbl>' + tblPr + tblGrid + '<w:tr>' + trPr
    + '<w:tc>' + tcPr(bunky[0]) + odst(vlevo[0], texty[0]) + odst(vlevo[1], texty[1]) + odst(vlevo[2], textPrvku(vlevo[2])) + '</w:tc>'
    + '<w:tc>' + tcPr(bunky[1]) + odst(vpravo[0], symbol) + '</w:tc>'
    + '</w:tr></w:tbl>';
}

/* CENA GEODETICKÉHO ZAMĚŘENÍ V PROJ v4 (K18-N92). Pod seznam geodetického
 * zaměření (v3 ho má v ROZŠÍŘENÉ NABÍDCE bez nadpisu i bez ceny) přijde blok
 * {{CENA_GEODET_ZAC}}, mezera, cenová tabulka a {{CENA_GEODET_KON}}. Symbol
 * je podoba `…_BLOK` (nabidka_proj.js): prázdná, když se geodetické zaměření
 * nenabízí, takže blok zmizí a dokument vypadá jako z v3. Texty nadpisu
 * a popisu jsou tytéž jako v online nabídce (NABIDKA_PROJ_DEF), vzor stavby je
 * tabulka ceny IČ — tatáž, ze které bere v3 rekapitulaci. Blok stojí hned za
 * seznamem, jako u IČ: plovoucí seznam se tak ukotví k mezeře a cenová
 * tabulka jde pod něj. Šablona, která cenu geodetu už má, druhou nedostane. */
function projV4CenaGeodetu(body) {
  const symbol = NABIDKA_PROJ_CENA_SYMBOL.geodet;
  const sym = dg.klicePlaceholderu(body);
  if (sym.indexOf(symbol) >= 0 || sym.indexOf(symbol + '_BLOK') >= 0) return body;
  const seznam = NABIDKA_PROJ_DEF.find(b => b.typ === 'seznam' && b.sekce === 'geodet');
  const cena = NABIDKA_PROJ_DEF.find(b => b.typ === 'cena' && b.sekce === 'geodet');
  if (!seznam || !cena) chyba('nabidka_proj.js nemá blok geodetického zaměření — nemám odkud vzít texty');
  const top = prvkyTela(body);
  const txt = el => textPrvku(body.slice(el.zac, el.kon));
  const iSeznam = top.findIndex(el => el.tag === 'tbl' && seznam.radky.every(r => txt(el).indexOf(r) >= 0));
  if (iSeznam < 0) chyba('PROJ: nenašel jsem seznam geodetického zaměření („' + seznam.radky.join('" / „')
    + '") — nevím, kam patří jeho cena');
  const iVzor = top.findIndex(el => el.tag === 'tbl' && dg.klicePlaceholderu(body.slice(el.zac, el.kon)).indexOf('PROJ_CENA_IC') >= 0);
  if (iVzor < 0) chyba('PROJ: nenašel jsem vzor cenové tabulky (IČ) pro cenu geodetického zaměření');
  const tabulka = cenovaTabulka(body.slice(top[iVzor].zac, top[iVzor].kon), [cena.nadpis, cena.popis], '{{' + symbol + '_BLOK}}');
  /* Mezera jako u vzoru: prázdný odstavec, který stojí před tabulkou ceny IČ. */
  const pred = top[iVzor - 1];
  const mezera = (pred && pred.tag === 'p' && !txt(pred)) ? odstavecBezId(body.slice(pred.zac, pred.kon))
    : '<w:p><w:pPr><w:pStyle w:val="Bezmezer"/></w:pPr></w:p>';
  const blok = znacka('CENA_GEODET_ZAC') + mezera + tabulka + znacka('CENA_GEODET_KON');
  return body.slice(0, top[iSeznam].kon) + blok + body.slice(top[iSeznam].kon);
}

/* ---------- přepis textu odstavce přes hranice běhů (1. 10. 2026) ----------
 * Rozhodnutí J. V. k návrhu SoD (Q5, Q6): v šablonách smluv v2 se mění
 * symbol pokuty ve větě o prodlení zhotovitele a pevné datum ve větě
 * o podkladech dodavatele výtahu. Word dělí text odstavce do běhů (<w:r>)
 * podle revizí a kontroly pravopisu — datum „19.06.2026" leží v šabloně SoD
 * realizace ve třech bězích („19", „.06.202", „6") a tečka za ním ve čtvrtém.
 * Znaky spojeného textu odstavce se proto mapují na běhy: náhrada přijde do
 * běhu, ve kterém úsek začíná (s jeho formátováním), ze zbylých běhů se
 * znaky úseku jen vypustí. Vlastnosti odstavce, ostatní běhy i jejich text
 * zůstávají, jak jsou. */
const escTextu = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
function prepisUsekOdstavce(odst, zac, kon, nahrada) {
  const re = /<w:t(\s[^>]*)?>([\s\S]*?)<\/w:t>/g;
  const uzly = [];
  let T = 0, m;
  while ((m = re.exec(odst))) {
    const text = dg.xmlUnesc(m[2]);
    uzly.push({ zac: m.index, kon: m.index + m[0].length, attr: m[1] || '', t: T, text });
    T += text.length;
  }
  if (!(zac >= 0 && kon > zac && kon <= T)) chyba('přepis odstavce: úsek ' + zac + '–' + kon + ' leží mimo jeho text (' + T + ' znaků)');
  let novy = odst;
  for (let i = uzly.length - 1; i >= 0; i--) {              // odzadu, ať sedí pozice
    const n = uzly[i];
    const a = Math.max(zac, n.t) - n.t, b = Math.min(kon, n.t + n.text.length) - n.t;
    if (a >= b) continue;                                     // běh úsek nenese
    const prvni = zac >= n.t && zac < n.t + n.text.length;
    const text = n.text.slice(0, a) + (prvni ? nahrada : '') + n.text.slice(b);
    const attr = (/^\s|\s$/.test(text) && !/xml:space=/.test(n.attr)) ? n.attr + ' xml:space="preserve"' : n.attr;
    novy = novy.slice(0, n.zac) + '<w:t' + attr + '>' + escTextu(text) + '</w:t>' + novy.slice(n.kon);
  }
  return novy;
}
/* Nejvnitřnější odstavce dokumentu, jejichž spojený text splní podmínku.
 * Podmínka dostane text s nezlomitelnými mezerami převedenými na obyčejné
 * (Word je píše za jednopísmennou předložkou: „V případě", „z ceny"). */
function odstavceSTextem(xml, podminka) {
  return dg.odstavcoveSpany(xml).filter(sp => {
    const p = xml.slice(sp.zac, sp.kon);
    return !/<w:p(?:\s[^>]*[^/])?>/.test(p.replace(/^<w:p(?:\s[^>]*)?>/, '')) && podminka(dg.odstavecText(p).replace(/\u00a0/g, ' '));
  });
}
/* Symbol ve větě vybrané podle textu (Q5/Q6): PRÁVĚ JEDEN odstavec se
 * symbolem `stary`, jehož text vyhovuje `jeVeta`, a v něm symbol právě
 * jednou — jinak chyba, nic se nehádá. Ostatní výskyty symbolu (věta
 * o prodlení zákazníka s placením) zůstávají. */
function prepojSymbolVety(body, kde, popisVety, jeVeta, stary, novy) {
  const s = '{{' + stary + '}}';
  const sp = odstavceSTextem(body, t => t.indexOf(s) >= 0 && jeVeta(t));
  if (sp.length !== 1) chyba(kde + ': čekám právě jednu větu ' + popisVety + ' se symbolem ' + s + ', je jich ' + sp.length + ' — nic nehádám');
  const p = body.slice(sp[0].zac, sp[0].kon);
  const t = dg.odstavecText(p);
  const i = t.indexOf(s);
  if (t.indexOf(s, i + 1) >= 0) chyba(kde + ': symbol ' + s + ' je ve větě ' + popisVety + ' víckrát — nic nehádám');
  return body.slice(0, sp[0].zac) + prepisUsekOdstavce(p, i, i + s.length, '{{' + novy + '}}') + body.slice(sp[0].kon);
}

/* ---------- SoD PROJ v2: seznam plateb jedním symbolem ----------
 * + POKUTA ZA PRODLENÍ ZHOTOVITELE (rozhodnutí J. V. 1. 10. 2026, Q6): ve větě
 * „V případě prodlení zhotovitele s plněním dle bodu III. … {{…}} % z ceny
 * části Díla v prodlení" stál symbol pokuty za prodlení s placením; v2 nese
 * pokutu za nedodržení termínu z krycího listu PROJ {{PODM_POKUTA_TERMIN_PROC}}
 * (pole „Smluvní pokuta – prodlení s odevzdáním"). Věta o prodlení objednatele
 * s úhradou zůstává s {{PODM_POKUTA_SPLATNOST_PROC}}. `zaznam` (nepovinný)
 * dostane popis provedených náhrad. */
function sodProjV2(xml, zaznam) {
  const t = tělo(xml);
  let body = t.body;
  const top = prvkyTela(body);
  const sym = dg.klicePlaceholderu(body);
  if (sym.indexOf('SODP_PLATEBNI_KALENDAR') >= 0) chyba('SoD PROJ: šablona už seznam plateb {{SODP_PLATEBNI_KALENDAR}} má');
  const idx = [1, 2, 3, 4, 5, 6, 7, 8].map(n => top.findIndex(el => el.tag === 'p'
    && dg.klicePlaceholderu(body.slice(el.zac, el.kon)).indexOf('SODP_PLATBA' + n + '_KC') >= 0));
  if (idx.some(i => i < 0)) chyba('SoD PROJ: nenašel jsem všech osm odstavců s {{SODP_PLATBA1_KC}} … {{SODP_PLATBA8_KC}}');
  if (idx.some((i, j) => j && i !== idx[j - 1] + 1)) chyba('SoD PROJ: odstavce plateb nejdou po sobě — nic nehádám');
  const vzor = body.slice(top[idx[0]].zac, top[idx[0]].kon);
  const pPr = (vzor.match(/<w:pPr>[\s\S]*?<\/w:pPr>/) || [''])[0];
  const rPr = (vzor.replace(/<w:pPr>[\s\S]*?<\/w:pPr>/, '').match(/<w:rPr>[\s\S]*?<\/w:rPr>/) || [''])[0];
  const novy = '<w:p>' + pPr + '<w:r>' + rPr + '<w:t xml:space="preserve">{{SODP_PLATEBNI_KALENDAR}}</w:t></w:r></w:p>';
  body = body.slice(0, top[idx[0]].zac) + novy + body.slice(top[idx[7]].kon);
  const z = Array.isArray(zaznam) ? zaznam : [];
  z.push('osm odstavců plateb {{SODP_PLATBA1_KC}} … {{SODP_PLATBA8_KC}} → jeden {{SODP_PLATEBNI_KALENDAR}}');
  body = prepojSymbolVety(body, 'SoD PROJ', 'o prodlení zhotovitele', tx => /prodlení zhotovitele/i.test(tx),
    'PODM_POKUTA_SPLATNOST_PROC', 'PODM_POKUTA_TERMIN_PROC');
  z.push('věta o prodlení zhotovitele: {{PODM_POKUTA_SPLATNOST_PROC}} → {{PODM_POKUTA_TERMIN_PROC}}');
  return t.pred + body + t.po;
}

/* ---------- SoD realizace v2: splátky z krycího listu jedním symbolem ----------
 * (K18-N100, 1. 10. 2026) Čtyři odstavce „při uzavření … {{SOD_SPLATKA1_PROC}} %
 * z celkové ceny díla" … „zbývajících {{SOD_SPLATKA4_PROC}} %" nahradí jeden
 * odstavec (stejná odrážka a písmo) se symbolem {{SOD_PLATEBNI_KALENDAR}};
 * aplikace ho zopakuje za každou splátku platebního kalendáře krycího listu
 * OCK (bez zálohy = bez věty o záloze, měsíční fakturace = jedna věta).
 *
 * Rozhodnutí J. V. 1. 10. 2026 k návrhu SoD:
 *   Q5 — ve větě „Zhotovitel se zavazuje zaplatit objednateli smluvní pokutu
 *        ve výši {{…}} % z ceny díla …" stál symbol pokuty za prodlení
 *        s placením; v2 nese pokutu za prodlení dodávky z krycího listu OCK
 *        {{PODM_POKUTA_DODAVKA_PROC}}. Věta o prodlení objednatele s placením
 *        zůstává s {{PODM_POKUTA_SPLATNOST_PROC}}.
 *   Q6 — pevné datum na konci věty „… k dodání kompletních finálních podkladů
 *        od dodavatele technologie výtahu … do DD.MM.RRRR." (v1: 19.06.2026)
 *        nahradí {{SOD_TERMIN_PODKLADY_VYTAH}} (pole krycího listu OCK).
 *        Datum se hledá vzorem v odstavci se {{SOD_TERMIN_PRIPRAVENOST}};
 *        když v něm není PRÁVĚ JEDNO a na konci věty o podkladech, skript
 *        skončí chybou.
 * Nic jiného se v šabloně nemění. `zaznam` (nepovinný) dostane popis
 * provedených náhrad. */
const DATUM_V_TEXTU_RE = /(\d{1,2})\.\s?(\d{1,2})\.\s?(\d{4})/g;
function sodRealDatumPodkladu(body) {
  const sp = odstavceSTextem(body, t => t.indexOf('{{SOD_TERMIN_PRIPRAVENOST}}') >= 0);
  if (sp.length !== 1) chyba('SoD realizace: čekám právě jednu větu se {{SOD_TERMIN_PRIPRAVENOST}} (stavební připravenost a podklady dodavatele výtahu), je jich ' + sp.length + ' — nic nehádám');
  const p = body.slice(sp[0].zac, sp[0].kon);
  const t = dg.odstavecText(p);
  const data = Array.from(t.matchAll(DATUM_V_TEXTU_RE));
  if (data.length !== 1) chyba('SoD realizace: ve větě o stavební připravenosti a podkladech dodavatele výtahu čekám právě jedno datum DD.MM.RRRR, je jich ' + data.length + ' — nic nehádám');
  const m = data[0];
  if (!/podklad/i.test(t.slice(0, m.index)) || !/^\s*\.?\s*$/.test(t.slice(m.index + m[0].length)))
    chyba('SoD realizace: datum ' + m[0] + ' není na konci věty o podkladech dodavatele výtahu („… do DD.MM.RRRR.") — nic nehádám');
  return { body: body.slice(0, sp[0].zac) + prepisUsekOdstavce(p, m.index, m.index + m[0].length, '{{SOD_TERMIN_PODKLADY_VYTAH}}') + body.slice(sp[0].kon),
    datum: m[0] };
}
function sodRealV2(xml, zaznam) {
  const t = tělo(xml);
  let body = t.body;
  const top = prvkyTela(body);
  const sym = dg.klicePlaceholderu(body);
  if (sym.indexOf('SOD_PLATEBNI_KALENDAR') >= 0) chyba('SoD realizace: šablona už seznam splátek {{SOD_PLATEBNI_KALENDAR}} má');
  if (sym.indexOf('SOD_TERMIN_PODKLADY_VYTAH') >= 0) chyba('SoD realizace: šablona už termín podkladů {{SOD_TERMIN_PODKLADY_VYTAH}} má');
  const idx = [1, 2, 3, 4].map(n => top.findIndex(el => el.tag === 'p'
    && dg.klicePlaceholderu(body.slice(el.zac, el.kon)).indexOf('SOD_SPLATKA' + n + '_PROC') >= 0));
  if (idx.some(i => i < 0)) chyba('SoD realizace: nenašel jsem všechny čtyři odstavce s {{SOD_SPLATKA1_PROC}} … {{SOD_SPLATKA4_PROC}}');
  if (idx.some((i, j) => j && i !== idx[j - 1] + 1)) chyba('SoD realizace: odstavce splátek nejdou po sobě — nic nehádám');
  const vzor = body.slice(top[idx[0]].zac, top[idx[0]].kon);
  const pPr = (vzor.match(/<w:pPr>[\s\S]*?<\/w:pPr>/) || [''])[0];
  const rPr = (vzor.replace(/<w:pPr>[\s\S]*?<\/w:pPr>/, '').match(/<w:rPr>[\s\S]*?<\/w:rPr>/) || [''])[0];
  const novy = '<w:p>' + pPr + '<w:r>' + rPr + '<w:t xml:space="preserve">{{SOD_PLATEBNI_KALENDAR}}</w:t></w:r></w:p>';
  body = body.slice(0, top[idx[0]].zac) + novy + body.slice(top[idx[3]].kon);
  const z = Array.isArray(zaznam) ? zaznam : [];
  z.push('čtyři odstavce splátek {{SOD_SPLATKA1_PROC}} … {{SOD_SPLATKA4_PROC}} → jeden {{SOD_PLATEBNI_KALENDAR}}');
  body = prepojSymbolVety(body, 'SoD realizace', 'o prodlení zhotovitele („Zhotovitel se zavazuje zaplatit objednateli …")',
    tx => /zhotovitel se zavazuje zaplatit objednateli/i.test(tx), 'PODM_POKUTA_SPLATNOST_PROC', 'PODM_POKUTA_DODAVKA_PROC');
  z.push('věta o prodlení zhotovitele: {{PODM_POKUTA_SPLATNOST_PROC}} → {{PODM_POKUTA_DODAVKA_PROC}}');
  const dat = sodRealDatumPodkladu(body);
  body = dat.body;
  z.push('věta o podkladech dodavatele výtahu: pevné datum ' + dat.datum + ' → {{SOD_TERMIN_PODKLADY_VYTAH}}');
  return t.pred + body + t.po;
}

/* ---------- SoD realizace v3: režim DPH a skladné (18. 10. 2026) ----------
 * Viz hlavička souboru. Každá kotva musí být PRÁVĚ JEDNA — jinak chyba, nic
 * se nehádá. Text se přepisuje přes prepisUsekOdstavce: symbol stojí v běhu,
 * kde úsek začínal (jeho písmo), vlastnosti odstavce zůstávají. */
const SKLADNE_KC_RE = /\d[\d\s]*,-\s?Kč/g;
function sodRealV3(xml, zaznam) {
  const t = tělo(xml);
  let body = t.body;
  const sym = dg.klicePlaceholderu(body);
  ['SOD_DPH_REZIM', 'SOD_DPH_PROHLASENI', 'SOD_SKLADNE'].forEach(k => {
    if (sym.indexOf(k) >= 0) chyba('SoD realizace: šablona už symbol {{' + k + '}} má');
  });
  const z = Array.isArray(zaznam) ? zaznam : [];
  const jedna = (popis, podminka) => {
    const sp = odstavceSTextem(body, podminka);
    if (sp.length !== 1) chyba('SoD realizace: čekám právě jeden odstavec ' + popis + ', je jich ' + sp.length + ' — nic nehádám');
    const p = body.slice(sp[0].zac, sp[0].kon);
    return { sp: sp[0], p, t: dg.odstavecText(p).replace(/\u00a0/g, ' ') };
  };
  /* 1) věta o režimu DPH — celý odstavec */
  let o = jedna('o režimu DPH („DPH bude účtováno … přenesené daňové povinnosti")',
    tx => /^\s*DPH bude účtováno/.test(tx) && /přenesené daňové povinnosti/.test(tx));
  body = body.slice(0, o.sp.zac) + prepisUsekOdstavce(o.p, 0, o.t.length, '{{SOD_DPH_REZIM}}') + body.slice(o.sp.kon);
  z.push('čl. V: věta o režimu DPH → {{SOD_DPH_REZIM}}');
  /* 2) prohlášení o snížené sazbě — tělo za „3." */
  o = jedna('s prohlášením o snížené sazbě DPH („3. Objednatel prohlašuje, že objekt …")',
    tx => /Objednatel prohlašuje, že objekt/.test(tx) && /snížené sazby DPH/.test(tx));
  const zac = o.t.indexOf('Objednatel prohlašuje');
  if (!/^\s*3\.\s*$/.test(o.t.slice(0, zac))) chyba('SoD realizace: před prohlášením o snížené sazbě čekám jen číslo „3." — nic nehádám');
  body = body.slice(0, o.sp.zac) + prepisUsekOdstavce(o.p, zac, o.t.length, '{{SOD_DPH_PROHLASENI}}') + body.slice(o.sp.kon);
  z.push('čl. V odst. 3: prohlášení o snížené sazbě DPH → {{SOD_DPH_PROHLASENI}} (číslo „3." zůstává)');
  /* 3) skladné — pevná částka v Kč */
  o = jedna('o skladovacích poplatcích', tx => /skladovacích poplatků/.test(tx));
  const castky = Array.from(o.t.matchAll(SKLADNE_KC_RE));
  if (castky.length !== 1) chyba('SoD realizace: ve větě o skladovacích poplatcích čekám právě jednu částku „N,- Kč", je jich ' + castky.length + ' — nic nehádám');
  const m = castky[0];
  body = body.slice(0, o.sp.zac) + prepisUsekOdstavce(o.p, m.index, m.index + m[0].length, '{{SOD_SKLADNE}}') + body.slice(o.sp.kon);
  z.push('čl. VI: pevná částka skladného → {{SOD_SKLADNE}} (částku dosadí aplikace z Nastavení → Firma)');
  return t.pred + body + t.po;
}

/* ---------- SoD PROJ: číslo smlouvy z krycího listu (S9, 15. 10. 2026) ----------
 * Zadání J. V.: „Aktualizuj šablony, aby se nám do nich číslo SoD propisovalo
 * z krycího listu zakázky." SoD realizace má pod nadpisem samostatný řádek
 * „číslo {{SOD_CISLO_SMLOUVY}}"; SoD projekce (v1 i v2) ho neměla. Vloží se
 * stejně: nový odstavec hned za podtitul „na zhotovení projektové
 * dokumentace" (konec nadpisu smlouvy), se stejným zarovnáním a písmem
 * a symbolem v JEDNOM běhu (rozdělený symbol by Word nedosadil). Kotva musí
 * být právě jedna a nad ní nadpis „SMLOUVA O DÍLO" — jinak chyba, nic se
 * nehádá. Funguje nad v1 i v2 (nadpis mají shodný). */
const SODP_PODTITUL = 'na zhotovení projektové dokumentace';
function sodProjCislo(xml, zaznam) {
  const t = tělo(xml);
  const body = t.body;
  if (dg.klicePlaceholderu(body).indexOf('SOD_CISLO_SMLOUVY') >= 0) chyba('SoD PROJ: šablona už číslo smlouvy {{SOD_CISLO_SMLOUVY}} má');
  const norm = s => s.replace(/\s+/g, ' ').trim().toLowerCase();
  const sp = odstavceSTextem(body, tx => norm(tx) === SODP_PODTITUL);
  if (sp.length !== 1) chyba('SoD PROJ: čekám právě jeden podtitul „' + SODP_PODTITUL + '" pod nadpisem smlouvy, je jich ' + sp.length + ' — nic nehádám');
  const nadpis = odstavceSTextem(body.slice(0, sp[0].zac), tx => norm(tx) === 'smlouva o dílo');
  if (!nadpis.length) chyba('SoD PROJ: nad podtitulem „' + SODP_PODTITUL + '" chybí nadpis „SMLOUVA O DÍLO" — nic nehádám');
  const vzor = body.slice(sp[0].zac, sp[0].kon);
  const pPr = (vzor.match(/<w:pPr>[\s\S]*?<\/w:pPr>/) || [''])[0].replace(/<w:sectPr[\s\S]*?<\/w:sectPr>/, '');
  const rPr = (vzor.replace(/<w:pPr>[\s\S]*?<\/w:pPr>/, '').match(/<w:rPr>[\s\S]*?<\/w:rPr>/) || [''])[0];
  const novy = '<w:p>' + pPr + '<w:r>' + rPr + '<w:t xml:space="preserve">číslo {{SOD_CISLO_SMLOUVY}}</w:t></w:r></w:p>';
  const z = Array.isArray(zaznam) ? zaznam : [];
  z.push('pod nadpis „SMLOUVA O DÍLO / ' + SODP_PODTITUL + '" přibyl řádek „číslo {{SOD_CISLO_SMLOUVY}}"');
  return t.pred + body.slice(0, sp[0].kon) + novy + body.slice(sp[0].kon) + t.po;
}
/* ---------- SoD PROJ v4: rozsah díla podle nabídky (#380 Q7) ----------
 * Rozhodnutí J. V. 17. 10. 2026 (varianta B). v3 měla v příloze č. 1 větu
 * „… na vypracování dokumentace DPZ+DSP včetně zajištění inženýringu tj.
 * zajištění vydání povolení záměru včetně nabytí právní moci …" a v čl. II
 * a III všech sedm činností natvrdo. v4:
 *  – věta přílohy „… na činnosti: {{SODP_ROZSAH_DILA}} – objekt …" (symbol
 *    v jednom běhu s písmem původního textu),
 *  – každá činnost v čl. II (Předmět díla) i čl. III (Termíny plnění) mezi
 *    značkami {{CIN_<X>_ZAC}}/{{CIN_<X>_KON}} i s prázdným odstavcem PŘED ní
 *    (mezera mezi odrážkami) — nenabízená zmizí celá, písmena odrážek
 *    přečísluje Word. Věta o předání díla v čl. III ve značkách není.
 *  – odkaz „dle odst. N." v čl. VII na odstavec o potvrzení oznámení poštou
 *    se ověří podle číslování článku (a opraví, kdyby neseděl).
 * Činnost se pozná podle začátku textu odrážky (kotvy níž); každá musí být
 * v článku právě jednou — jinak chyba, nic se nehádá. */
const SODP_V4_CINNOSTI = [
  ['CIN_ZAMERENI', 'Zaměření a zpracování výstupů', 'Zaměření a zpracování výstupů'],
  ['CIN_DPZ', 'Dokumentace pro povolení záměru', 'Dokumentace pro povolení záměru'],
  ['CIN_IC_DOSS', 'Inženýrská činnost DOSS', 'Inženýrská činnost DOSS'],
  ['CIN_POVOLENI', 'Podání žádosti na příslušný stavební úřad', 'Vyřízení povolení záměru'],
  ['CIN_DPS', 'Dokumentace pro provedení stavby', 'Dokumentace pro provedení stavby'],
  ['CIN_EZC', 'Ekonomická zadávací část', 'Ekonomická zadávací část'],
  ['CIN_VYBER', 'Výběr dodavatele pro realizaci záměru', 'Výběr dodavatele pro realizaci záměru'],
];
const SODP_V4_PRILOHA = 'na vypracování dokumentace DPZ+DSP včetně zajištění inženýringu tj. zajištění vydání povolení záměru včetně nabytí právní moci';
/* Značka bloku SoD bez stylu (šablona smlouvy styl „Bezmezer" nemusí mít). */
const znackaSod = jmeno => '<w:p><w:pPr><w:rPr><w:color w:val="A6A6A6"/><w:sz w:val="14"/></w:rPr></w:pPr>'
  + '<w:r><w:rPr><w:color w:val="A6A6A6"/><w:sz w:val="14"/></w:rPr><w:t>{{' + jmeno + '}}</w:t></w:r></w:p>';
function sodProjV4(xml, zaznam) {
  const t = tělo(xml);
  let body = t.body;
  const z = Array.isArray(zaznam) ? zaznam : [];
  if (dg.klicePlaceholderu(body).some(k => k === 'SODP_ROZSAH_DILA' || /^CIN_.+_(ZAC|KON)$/.test(k)))
    chyba('SoD PROJ: šablona už rozsah díla {{SODP_ROZSAH_DILA}} nebo značky činností {{CIN_…}} má');
  const norm = s => s.replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
  const top = () => prvkyTela(body).map(el => Object.assign(el, { text: norm(textPrvku(body.slice(el.zac, el.kon))) }));
  const clanek = (prvky, nadpis) => {
    const i = prvky.findIndex(el => el.tag === 'p' && el.text.toLowerCase() === nadpis.toLowerCase());
    if (i < 0) chyba('SoD PROJ: chybí nadpis článku „' + nadpis + '" — nic nehádám');
    const j = prvky.findIndex((el, k) => k > i && el.tag === 'p' && /^[IVX]+\. \S/.test(el.text));
    return [i + 1, j < 0 ? prvky.length : j];
  };
  /* 1) bloky činností v čl. II a III (odzadu, ať sedí pozice) */
  const vlozit = [];
  [['II. Předmět Díla', 1], ['III. Termíny plnění', 2]].forEach(([nadpis, sl]) => {
    const prvky = top();
    const [od, po] = clanek(prvky, nadpis);
    SODP_V4_CINNOSTI.forEach(c => {
      const kotva = c[sl];
      const nal = [];
      for (let k = od; k < po; k++) if (prvky[k].tag === 'p' && prvky[k].text.indexOf(kotva) === 0) nal.push(k);
      if (nal.length !== 1) chyba('SoD PROJ: v čl. „' + nadpis + '" čekám právě jednu odrážku „' + kotva + ' …", je jich ' + nal.length + ' — nic nehádám');
      const k = nal[0];
      const pred = prvky[k - 1];
      const zac = (k - 1 >= od && pred.tag === 'p' && !pred.text && !/<w:numPr>/.test(body.slice(pred.zac, pred.kon))) ? pred.zac : prvky[k].zac;
      vlozit.push({ zac, kon: prvky[k].kon, jmeno: c[0] });
    });
    z.push('čl. ' + nadpis + ': ' + SODP_V4_CINNOSTI.length + ' činností ve značkách {{CIN_…_ZAC}}/{{CIN_…_KON}}');
  });
  vlozit.sort((a, b) => b.zac - a.zac).forEach(v => {
    body = body.slice(0, v.zac) + znackaSod(v.jmeno + '_ZAC') + body.slice(v.zac, v.kon) + znackaSod(v.jmeno + '_KON') + body.slice(v.kon);
  });
  /* 2) věta přílohy č. 1 */
  const sp = odstavceSTextem(body, tx => tx.indexOf(SODP_V4_PRILOHA) >= 0);
  if (sp.length !== 1) chyba('SoD PROJ: čekám právě jednu větu přílohy „… ' + SODP_V4_PRILOHA + ' …", je jich ' + sp.length + ' — nic nehádám');
  {
    const p = body.slice(sp[0].zac, sp[0].kon);
    const i = dg.odstavecText(p).replace(/ /g, ' ').indexOf(SODP_V4_PRILOHA);
    body = body.slice(0, sp[0].zac) + prepisUsekOdstavce(p, i, i + SODP_V4_PRILOHA.length, 'na činnosti: {{SODP_ROZSAH_DILA}}') + body.slice(sp[0].kon);
    z.push('příloha č. 1: „' + SODP_V4_PRILOHA + '" → „na činnosti: {{SODP_ROZSAH_DILA}}"');
  }
  /* 3) odkaz v čl. VII na odstavec o potvrzení oznámení poštou */
  {
    const prvky = top();
    const [od, po] = clanek(prvky, 'VII. Komunikace smluvních stran');
    let n = 0, cil = 0, ref = -1;
    for (let k = od; k < po; k++) {
      const x = body.slice(prvky[k].zac, prvky[k].kon);
      if (/<w:numPr>/.test(x) && !/<w:numId w:val="0"\/>/.test(x)) n++; else continue;
      if (/potvrzení kteréhokoliv oznámení poštou/.test(prvky[k].text)) cil = n;
      if (/potvrzení oznámení poštou dle odst\. \d+/.test(prvky[k].text)) ref = k;
    }
    if (!cil || ref < 0) chyba('SoD PROJ: v čl. VII chybí odstavec o potvrzení oznámení poštou nebo odkaz „dle odst. N" na něj — nic nehádám');
    const p = body.slice(prvky[ref].zac, prvky[ref].kon);
    const tx = dg.odstavecText(p).replace(/ /g, ' ');
    const m = tx.match(/(potvrzení oznámení poštou dle odst\. )(\d+)/);
    if (+m[2] === cil) z.push('čl. VII: odkaz „dle odst. ' + cil + '." míří na odstavec o potvrzení poštou — beze změny');
    else {
      const i = m.index + m[1].length;
      body = body.slice(0, prvky[ref].zac) + prepisUsekOdstavce(p, i, i + m[2].length, String(cil)) + body.slice(prvky[ref].kon);
      z.push('čl. VII: odkaz „dle odst. ' + m[2] + '." → „dle odst. ' + cil + '." (odstavec o potvrzení oznámení poštou)');
    }
  }
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

async function hlavni() {
  if (!PODKLADY) {
    console.error('Použití: node nastroje/vyrob_sablony.js [--proj-v4 | --proj-v5 | --proj-v6 | --proj-v7 | --sod-proj | --sod-real | --sod-real-v3 | --sod-proj-cislo | --sod-proj-v4 | --cn-v14 | --cn-v15] <složka podkladů> [výstupní složka]');
    process.exit(2);
  }
  const cnVstup = path.join(PODKLADY, 'Sablona_NABIDKA_CN_v12.docx');
  const cn13Vstup = path.join(PODKLADY, 'Sablona_NABIDKA_CN_v13.docx');
  const projVstup = path.join(PODKLADY, 'Sablona_NABIDKA_PROJ.docx');
  const sodVstup = path.join(PODKLADY, 'Sablona_SOD_PROJEKCE.docx');
  const sodRealVstup = path.join(PODKLADY, 'Sablona_SOD_REALIZACE.docx');
  const cn14Vstup = path.join(PODKLADY, 'Sablona_NABIDKA_CN_v14.docx');
  const proj4Vstup = path.join(PODKLADY, 'Sablona_NABIDKA_PROJ_v4.docx');
  const proj5Vstup = path.join(PODKLADY, 'Sablona_NABIDKA_PROJ_v5.docx');
  const proj6Vstup = path.join(PODKLADY, 'Sablona_NABIDKA_PROJ_v6.docx');
  (REZIM_SOD_CISLO || REZIM_SOD_REAL3 || REZIM_SOD_V4 ? [] : REZIM_V7 ? [proj6Vstup] : REZIM_V6 ? [proj5Vstup] : REZIM_V5 ? [proj4Vstup] : REZIM_V4 ? [projVstup] : REZIM_SOD ? [sodVstup] : REZIM_SOD_REAL ? [sodRealVstup] : REZIM_CN14 ? [cn13Vstup]
    : REZIM_CN15 ? [cn14Vstup] : [cnVstup, projVstup])
    .forEach(f => { if (!fs.existsSync(f)) chyba('Chybí vstupní šablona ' + f); });
  if (!fs.existsSync(VYSTUP)) fs.mkdirSync(VYSTUP, { recursive: true });
  if (REZIM_SOD_REAL3) {
    const vstup = path.join(PODKLADY, 'Sablona_SOD_REALIZACE_v2.docx');
    if (!fs.existsSync(vstup)) chyba('Chybí vstupní šablona ' + vstup);
    const zaznam = [];
    const bajty = await vyrob(vstup, x => sodRealV3(x, zaznam));
    const soubor = path.join(VYSTUP, 'Sablona_SOD_REALIZACE_v3.docx');
    fs.writeFileSync(soubor, bajty);
    const vady = await dg.docxXmlVady(bajty.slice().buffer);
    const rozdil = so.sablonaSymbolyRozdil(await symbolyASablona(new Uint8Array(fs.readFileSync(vstup))), await symbolyASablona(bajty));
    const cekane = ['SOD_DPH_PROHLASENI', 'SOD_DPH_REZIM', 'SOD_SKLADNE'];
    const prob = vady.length + rozdil.ubylo.length + (rozdil.pribylo.join() === cekane.join() ? 0 : 1);
    console.log((prob ? '✗ ' : '✓ ') + path.basename(soubor) + ' — z Sablona_SOD_REALIZACE_v2.docx'
      + zaznam.map(r => '\n    nahrazeno: ' + r).join('')
      + '\n    přibyly symboly: ' + rozdil.pribylo.join(', ')
      + (rozdil.ubylo.length ? '\n    ubyly symboly: ' + rozdil.ubylo.join(', ') : '')
      + (vady.length ? '\n    vady XML: ' + vady.join('; ') : '\n    XML: bez vad'));
    console.log('\nVýstup: ' + VYSTUP);
    process.exit(prob ? 1 : 0);
  }
  if (REZIM_SOD_CISLO) {
    /* v1 → _v1_cislo, v2 → v3 (nejvyšší další verze); původní soubory zůstávají. */
    const dvojice = [['Sablona_SOD_PROJEKCE.docx', 'Sablona_SOD_PROJEKCE_v1_cislo.docx'],
      ['Sablona_SOD_PROJEKCE_v2.docx', 'Sablona_SOD_PROJEKCE_v3.docx']]
      .filter(([vstup]) => fs.existsSync(path.join(PODKLADY, vstup)));
    if (!dvojice.length) chyba('Chybí vstupní šablona Sablona_SOD_PROJEKCE.docx ani Sablona_SOD_PROJEKCE_v2.docx v ' + PODKLADY);
    let prob = 0;
    for (const [vstup, vystup] of dvojice) {
      const zaznam = [];
      const bajty = await vyrob(path.join(PODKLADY, vstup), x => sodProjCislo(x, zaznam));
      fs.writeFileSync(path.join(VYSTUP, vystup), bajty);
      const vady = await dg.docxXmlVady(bajty.slice().buffer);
      const symVstup = await symbolyASablona(new Uint8Array(fs.readFileSync(path.join(PODKLADY, vstup))));
      const sym = await symbolyASablona(bajty);
      const rozdil = so.sablonaSymbolyRozdil(symVstup, sym);
      /* Přibýt smí jen číslo smlouvy, ubýt nic. */
      const navic = rozdil.pribylo.filter(k => k !== 'SOD_CISLO_SMLOUVY');
      const p = vady.length + rozdil.ubylo.length + navic.length + (sym.indexOf('SOD_CISLO_SMLOUVY') < 0 ? 1 : 0);
      prob += p;
      console.log((p ? '✗ ' : '✓ ') + vystup + ' — z ' + vstup + ', symbolů ' + sym.length + ' (vstup ' + symVstup.length + ')'
        + zaznam.map(r => '\n    nahrazeno: ' + r).join('')
        + (vady.length ? '\n    vady XML: ' + vady.join('; ') : '\n    XML: bez vad')
        + (rozdil.ubylo.length ? '\n    ubyly symboly: ' + rozdil.ubylo.join(', ') : '')
        + (navic.length ? '\n    navíc symboly: ' + navic.join(', ') : ''));
    }
    console.log('\nVýstup: ' + VYSTUP);
    process.exit(prob ? 1 : 0);
  }
  if (REZIM_SOD_V4) {
    /* v3 → v4 (jen česky; jazykové verze přegeneruje nastroje/preklad_sod.js) */
    const vstup = path.join(PODKLADY, 'Sablona_SOD_PROJEKCE_v3.docx');
    if (!fs.existsSync(vstup)) chyba('Chybí vstupní šablona ' + vstup);
    const zaznam = [];
    const bajty = await vyrob(vstup, x => sodProjV4(x, zaznam));
    const soubor = path.join(VYSTUP, 'Sablona_SOD_PROJEKCE_v4.docx');
    fs.writeFileSync(soubor, bajty);
    const vady = await dg.docxXmlVady(bajty.slice().buffer);
    const symVstup = await symbolyASablona(new Uint8Array(fs.readFileSync(vstup)));
    const sym = await symbolyASablona(bajty);
    const rozdil = so.sablonaSymbolyRozdil(symVstup, sym);
    /* Přibýt smí jen rozsah díla a značky činností (7 × ZAC/KON), ubýt nic. */
    const navic = rozdil.pribylo.filter(k => k !== 'SODP_ROZSAH_DILA' && !/^CIN_[A-Z_]+_(ZAC|KON)$/.test(k));
    const znacek = rozdil.pribylo.filter(k => /^CIN_/.test(k)).length;
    const prob = vady.length + rozdil.ubylo.length + navic.length + (sym.indexOf('SODP_ROZSAH_DILA') < 0 ? 1 : 0) + (znacek !== 14 ? 1 : 0);
    console.log((prob ? '✗ ' : '✓ ') + path.basename(soubor) + ' — symbolů ' + sym.length + ' (vstup ' + symVstup.length + '), značek činností ' + znacek
      + zaznam.map(r => '\n    nahrazeno: ' + r).join('')
      + (vady.length ? '\n    vady XML: ' + vady.join('; ') : '\n    XML: bez vad')
      + (rozdil.ubylo.length ? '\n    ubyly symboly: ' + rozdil.ubylo.join(', ') : '')
      + (navic.length ? '\n    navíc symboly: ' + navic.join(', ') : ''));
    console.log('\nVýstup: ' + VYSTUP);
    process.exit(prob ? 1 : 0);
  }
  if (REZIM_SOD || REZIM_SOD_REAL) {
    const vstup = REZIM_SOD ? sodVstup : sodRealVstup;
    const zaznam = [];
    const bajty = await vyrob(vstup, x => (REZIM_SOD ? sodProjV2 : sodRealV2)(x, zaznam));
    const soubor = path.join(VYSTUP, REZIM_SOD ? 'Sablona_SOD_PROJEKCE_v2.docx' : 'Sablona_SOD_REALIZACE_v2.docx');
    fs.writeFileSync(soubor, bajty);
    const vady = await dg.docxXmlVady(bajty.slice().buffer);
    const symVstup = await symbolyASablona(new Uint8Array(fs.readFileSync(vstup)));
    const sym = await symbolyASablona(bajty);
    const rozdil = so.sablonaSymbolyRozdil(symVstup, sym);
    const zbylo = sym.filter(k => REZIM_SOD ? /^SODP_PLATBA\d_KC$/.test(k) : /^SOD_SPLATKA\d_PROC$/.test(k));
    /* Co v2 nést MUSÍ (rozhodnutí J. V. 1. 10. 2026): seznam plateb, pokutu
     * zhotovitele z krycího listu, u realizace termín podkladů dodavatele
     * výtahu — a věta o prodlení objednatele s placením zůstává. */
    const musi = REZIM_SOD ? ['SODP_PLATEBNI_KALENDAR', 'PODM_POKUTA_TERMIN_PROC', 'PODM_POKUTA_SPLATNOST_PROC']
      : ['SOD_PLATEBNI_KALENDAR', 'PODM_POKUTA_DODAVKA_PROC', 'PODM_POKUTA_SPLATNOST_PROC', 'SOD_TERMIN_PODKLADY_VYTAH'];
    const chybi = musi.filter(k => sym.indexOf(k) < 0);
    const text = (await dg.docxTextSablony(bajty.slice().buffer)).join('\n');
    const datum = REZIM_SOD ? [] : (text.match(DATUM_V_TEXTU_RE) || []);
    const prob = vady.length + zbylo.length + chybi.length + datum.length;
    console.log((prob ? '✗ ' : '✓ ') + path.basename(soubor) + ' — symbolů ' + sym.length + ' (vstup ' + path.basename(vstup) + ': ' + symVstup.length + ')'
      + zaznam.map(r => '\n    nahrazeno: ' + r).join('')
      + (rozdil.pribylo.length ? '\n    přibyly symboly: ' + rozdil.pribylo.join(', ') : '')
      + (rozdil.ubylo.length ? '\n    ubyly symboly: ' + rozdil.ubylo.join(', ') : '')
      + (vady.length ? '\n    vady XML: ' + vady.join('; ') : '\n    XML: bez vad')
      + (zbylo.length ? '\n    zbyly symboly: ' + zbylo.join(', ') : '')
      + (chybi.length ? '\n    chybí symboly: ' + chybi.join(', ') : '')
      + (datum.length ? '\n    zůstalo pevné datum: ' + datum.join(', ') : ''));
    console.log('\nVýstup: ' + VYSTUP);
    process.exit(prob ? 1 : 0);
  }
  const vse = REZIM_V7
    ? await ulozSMutacemi(await vyrob(proj6Vstup, projV7), 'Sablona_NABIDKA_PROJ_v7')
    : REZIM_V6
    ? await ulozSMutacemi(await vyrob(proj5Vstup, projV6), 'Sablona_NABIDKA_PROJ_v6')
    : REZIM_V5
    ? await ulozSMutacemi(await vyrob(proj4Vstup, projV5), 'Sablona_NABIDKA_PROJ_v5')
    : REZIM_V4
    ? await ulozSMutacemi(await vyrob(projVstup, projV4), 'Sablona_NABIDKA_PROJ_v4')
    : REZIM_CN14 ? await ulozSMutacemi(await vyrob(cn13Vstup, cnV14), 'Sablona_NABIDKA_CN_v14')
    : REZIM_CN15 ? await ulozSMutacemi(await vyrob(cn14Vstup, cnV15), 'Sablona_NABIDKA_CN_v15')
    : []
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
}

/* Úpravy document.xml jdou testovat bez souborů (src/test_sablona_proj_v4.js). */
if (require.main === module) hlavni().catch(e => { console.error('CHYBA: ' + e.message); process.exit(1); });
module.exports = { cnV13, cnV14, projV3, projV4, projV5, projV6, projV7, sodProjV2, sodRealV2, sodRealV3, sodProjCislo, sodProjV4, prepisUsekOdstavce };
