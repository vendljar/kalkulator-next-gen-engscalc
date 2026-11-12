/* TEČKY „……" MÍSTO NEVYPLNĚNÝCH SYMBOLŮ SMLOUVY (C3 #584, rozhodnutí J. V.
 * 11. 11. 2026, B0.5; plná moc — doplněk J. V. 11. 11.: tečky bez kontroly).
 *
 * Hlídá se:
 *   – vygenerovaná SoD realizace i projekce u zakázky bez údajů objednatele,
 *     termínů a firmy neobsahuje „{{" ani „}}"; místa s tečkami = sodNevyplnene
 *     (co kontrola vyjmenuje, to má v dokumentu tečky) = nevyplneneVDokumentu,
 *   – vyplněná zakázka (všechna pole krycího listu, firmy a zástupců) nemá
 *     žádné „……",
 *   – co má zmizet, zmizí (ne tečky): rozpis objednaných bez příplatků,
 *     věta o pokutě „0", šachty u jedné šachty v5, nenabízené činnosti SoD PROJ,
 *   – pokuta zhotovitele s vlastním zněním bez procenta → tečky a položka
 *     ve výpisu („pokuta za prodlení zhotovitele …"),
 *   – generátor: volba `nevyplnene` výchozí vypnutá (ostatní dokumenty beze
 *     změny), tečky jen v textu (ne v alternativním textu, ne značky bloků),
 *     prázdná hodnota ze seznamu dostane tečky, symbol rozdělený mezi běhy,
 *   – nabídka beze změny (neznámý symbol zůstane {{…}} — dnešní chování),
 *     plná moc dostane tečky (doplněk J. V.),
 *   – mapa popisů: každý symbol šablon SoD realizace v4/v5 a SoD projekce v4
 *     má lidský popis (skutečné šablony z KNG_PODKLADY; bez nich přeskočeno),
 *   – záznam tisku pro zámek (objSodSnimek) se generováním nemění a tečky
 *     nenese (tečky jsou věc dokumentu, ne dat).
 * Pojistka: nad bází aa445a1 sada padá (sodNevyplnene neexistuje, ve smlouvě
 * zůstávají {{…}}) — počty ve zprávě commitu.
 * Spuštění: node src/test_sod_tecky.js */
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

let ok = 0, fail = 0;
const test = (n, c, info) => { if (c) { ok++; console.log('OK   ' + n); } else { fail++; console.log('FAIL ' + n + '  ' + JSON.stringify(info === undefined ? '' : info).slice(0, 600)); } };
const kop = x => JSON.parse(JSON.stringify(x));
const enc = new TextEncoder(), dec = new TextDecoder();
const T = '……';
test('sod.js: sodNevyplnene, SOD_TECKY = „……", docxgen DOCX_TECKY', typeof sodNevyplnene === 'function' && typeof SOD_TECKY === 'string'
  && SOD_TECKY === T && dg.DOCX_TECKY === T);
if (fail) { console.log(`\n${ok} prošlo, ${fail} selhalo`); process.exit(1); }

const texty = x => dg.odstavcoveSpany(x).map(sp => dg.odstavecText(x.slice(sp.zac, sp.kon)));
const docx = async xml => (await dg.zipZapis([{ nazev: 'word/document.xml', data: enc.encode(xml) }])).arrayBuffer();
const doc = t => '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>'
  + t + '<w:sectPr/></w:body></w:document>';
const P = t => '<w:p><w:r><w:t xml:space="preserve">' + t + '</w:t></w:r></w:p>';
async function word(typ, sablonaAb, zak, v, L) {
  const res = await dokumentVygeneruj(typ, sablonaAb, zak, v, J, L || 'cz');
  const casti = await dg.zipPrecti(new Uint8Array(await res.blob.arrayBuffer()));
  const xml = casti.filter(p => /^word\/(document|header\d*|footer\d*)\.xml$/.test(p.nazev)).map(p => dec.decode(p.data)).join('');
  return { res, xml, text: texty(xml) };
}
const pocet = (s, x) => s.split(x).length - 1;
const stejne = (a, b) => JSON.stringify((a || []).slice().sort()) === JSON.stringify((b || []).slice().sort());

/* ---------- zakázky ---------- */
const ZAD = { prejezd: 3.3, zdvih: 12, prohluben: 1.2, sirka: 1.6, hloubka: 2.1, nastupiste: 4 };
function prazdna() {
  const zak = novaZakazka();
  zak.cislo = '2026-OPR-CN-9584'; zak.objednatel = 'Zkušební zákazník s.r.o.';
  const v = zak.varianty[0];
  v.data.cenik = Object.assign(ZC.zkusebniCenik(), { kurzEurKc: 25 });
  v.data.ock.fixes = true;
  v.data.ock.zadani = Object.assign(kop(DEFAULT_ZADANI), ZAD);
  return { zak, v };
}
/* Zakázka PROJ (řada OVP, hlavička PROJ) — SoD projekce a plná moc. */
function prazdnaProj() {
  const zak = novaZakazka();
  zak.cislo = '2026 - OVP - CN - 0584';
  Object.assign(zak.projHlavicka, { cislo: '2026 OVP CN 0584', objednatel: 'SVJ Zkušební', nazevAkce: 'Zkušební projekce' });
  const v = zak.varianty[0];
  v.data.proj.cenik = ZC.zkusebniCenikProj();
  return { zak, v };
}
/* Vyplněná: všechna pole krycího listu OCK/PROJ se symbolem smlouvy, firma, zástupci, hlavička. */
function vzorHodnota(p) {
  if (p.typ === 'date') return '2026-12-01';
  if (/pokuta/i.test(p.id)) return '0,05 % / den';
  if (/[Pp]roc|splatka/.test(p.id)) return '10';
  if (/sodDphRezim/.test(p.id)) return (typeof KRYCI_DPH_REZIMY !== 'undefined' ? KRYCI_DPH_REZIMY[0] : '');
  return 'Smyšlený údaj ' + p.id;
}
function vyplnena(proj) {
  const { zak, v } = proj ? prazdnaProj() : prazdna();
  if (proj) Object.assign(zak.projHlavicka, { adresa: 'Stavba 2, Praha', ico: '12345678', dic: 'CZ12345678', adresaObjednatele: 'Smyšlená 1, Praha' });
  zak.ico = '12345678'; zak.dic = 'CZ12345678'; zak.adresaObjednatele = 'Smyšlená 1, Praha'; zak.kontakt = 'Jan Zkušební';
  zak.adresa = 'Stavba 2, Praha'; zak.nazevAkce = 'Smyšlená akce';
  zak.zastupci = {};
  ['banka', 'ucet', 'zapis', 'smluvniJmeno', 'smluvniPozice', 'smluvniTel', 'smluvniEmail', 'obchodniJmeno', 'obchodniTel', 'obchodniEmail',
    'technickyJmeno', 'technickyTel', 'technickyEmail', 'fakturyEmail'].forEach(k => { zak.zastupci[k] = 'Smyšlený ' + k; });
  const hod = {};
  KRYCI_SEKCE.forEach(s => s.pole.forEach(p => { if (p.sod) hod[p.id] = vzorHodnota(p); }));
  v.data.kryci = { hodnoty: hod };
  const hp = {};
  KRYCI_PROJ_SEKCE.forEach(s => s.pole.forEach(p => { if (p.sod) hp[p.id] = vzorHodnota(p); }));
  v.data.kryciProj = { hodnoty: hp };
  return { zak, v };
}
const firma = {};
FIRMA_POLE.forEach(p => { firma[p.id] = /Kc$|skladne/i.test(p.id) ? '500' : (/email/i.test(p.id) ? 'firma@priklad.cz' : 'Smyšlená firma ' + p.id); });

(async () => {
  /* ---------- generátor ---------- */
  {
    const xml = doc(P('Objednatel {{OBJEDNATEL_ICO}} a {{OBJEDNATEL_DIC}}') + P('{{BLOK_X_ZAC}}') + P('Text {{PRAZDNY}}') + P('{{BLOK_X_KON}}')
      + '<w:p><w:r><w:t>{{ROZ</w:t></w:r><w:r><w:t>DELENY}}</w:t></w:r></w:p>'
      + '<w:p><w:bookmarkStart w:id="1" w:name="{{PODPIS_OBR}}"/><w:r><w:t>z</w:t></w:r></w:p>');
    const ph = { OBJEDNATEL_DIC: '', PRAZDNY: '' };
    const gen = async volby => { const b = await dg.docxVyplnSablonu(await docx(xml), Object.assign({}, ph), [], {}, volby);
      return dec.decode((await dg.zipPrecti(new Uint8Array(await b.arrayBuffer()))).find(p => p.nazev === 'word/document.xml').data); };
    const bez = await gen({});
    test('G bez volby nevyplnene: chování beze změny ({{…}} zůstane, prázdná hodnota = prázdno)', bez.indexOf('{{OBJEDNATEL_ICO}}') > 0
      && bez.indexOf(T) < 0 && texty(bez)[0] === 'Objednatel {{OBJEDNATEL_ICO}} a ', texty(bez));
    const zapis = [];
    const s = await gen({ nevyplnene: ['OBJEDNATEL_ICO', 'OBJEDNATEL_DIC', 'ROZDELENY', 'PODPIS_OBR', 'BLOK_X_ZAC', 'PRAZDNY'], nevyplneneVDokumentu: zapis });
    const tx = texty(s);
    test('G tečky v textu, i u prázdné hodnoty ze seznamu', tx[0] === 'Objednatel ' + T + ' a ' + T, tx);
    test('G blok s jediným prázdným symbolem zmizí celý (odstranPrazdneBloky dřív než tečky)', tx.indexOf('Text ' + T) < 0 && !tx.some(t => /BLOK_X/.test(t)), tx);
    test('G symbol rozdělený mezi běhy → tečky, XML bez vad', tx.indexOf(T) >= 0 && /<w:t>……<\/w:t><\/w:r><w:r><w:t><\/w:t>/.test(s), tx);
    /* (obrázek s alternativním textem {{…}} bez dat odstraní docxVlozObrazky už dřív — beze změny) */
    test('G symbol mimo text (atribut, např. alternativní text) se nemění', s.indexOf('w:name="{{PODPIS_OBR}}"') > 0);
    test('G nevyplneneVDokumentu = symboly, které tečky opravdu dostaly', stejne(zapis, ['OBJEDNATEL_ICO', 'OBJEDNATEL_DIC', 'ROZDELENY']), zapis);
  }
  /* sodNevyplnene: jen se známou šablonou, bez značek, bez odstavcePryc, prázdné = nevyplněné */
  test('S bez informace o šabloně → null', sodNevyplnene({}, null) === null && sodNevyplnene({}, {}) === null);
  test('S seznam: chybí / prázdné / jen mezery; značky a odstavcePryc pryč; Set i pole', stejne(sodNevyplnene({ A: 'x', B: '', C: '  ' },
    { symboly: new Set(['A', 'B', 'C', 'D', 'X_ZAC', 'X_KON', 'E']) }, ['E']), ['B', 'C', 'D'])
    && stejne(sodNevyplnene({}, { symboly: ['D', 'D'] }), ['D']));
  test('S věta: „Ve smlouvě zůstala 2 místa k doplnění … IČO objednatele, termín montáže do."', sodNevyplneneText(['OBJEDNATEL_ICO', 'SOD_TERMIN_MONTAZ_DO'])
    === 'Ve smlouvě zůstala 2 místa k doplnění (tečky „……"): IČO objednatele, termín montáže do.' && sodNevyplneneText([]) === ''
    && /zůstalo 1 místo/.test(sodNevyplneneText(['X'])) && /zůstalo 5 míst/.test(sodNevyplneneText(['A', 'B', 'C', 'D', 'E'])), sodNevyplneneText(['OBJEDNATEL_ICO', 'SOD_TERMIN_MONTAZ_DO']));
  test('S symbol bez popisu se vypíše jménem, stejné popisy se nesčítají', JSON.stringify(sodNevyplnenePopisy(['NEZNAMY_X', 'PODM_POKUTA_DODAVKA_PROC', 'PODM_POKUTA_TERMIN_PROC']))
    === JSON.stringify(['NEZNAMY_X', 'pokuta za prodlení zhotovitele (vlastní znění bez procenta)']));

  /* ---------- SoD realizace nad smyšlenou šablonou (stavba v4/v5) ---------- */
  const SOD = doc(P('SMLOUVA číslo {{SOD_CISLO_SMLOUVY}}') + P('Objednatel: {{OBJEDNATEL}}, IČ {{OBJEDNATEL_ICO}}, DIČ {{OBJEDNATEL_DIC}}')
    + P('Zástupce: {{OBJEDNATEL_ZASTUPCE_SMLUVNI}}') + P('Předmět smyšlený.') + P('{{SACHTY_SOD_PREDMET}}')
    + P('Montáž od {{SOD_TERMIN_MONTAZ_OD}} do {{SOD_TERMIN_MONTAZ_DO}}') + P('{{CENA_BEZ_DPH}} (bez DPH)')
    + P('z toho {{CISLO_NABIDKY}}: {{SOD_CENA_NABIDKY}}') + P('{{SACHTY_SOD_ROZPIS}}') + P('objednané: {{SOD_PRIPLATKY_OBJEDNANE}}')
    + P('příplatky celkem {{SOD_PRIPLATKY_KC}}') + P('{{SOD_DPH_REZIM}}') + P('Pokuta {{PODM_POKUTA_DODAVKA_PROC}} % z ceny')
    + P('Splatnost {{PODM_SPLATNOST_DNI_CISLO}} dní') + P('V Praze dne {{SOD_DATUM_PODPISU}}'));
  const sodAb = await docx(SOD);
  const pz = prazdna();
  const w = await word('sod', sodAb, pz.zak, pz.v);
  const d = w.res.data;
  test('R prázdná zakázka: žádné „{{" ani „}}" ve smlouvě', w.xml.indexOf('{{') < 0 && w.xml.indexOf('}}') < 0, w.text);
  test('R tečky: sodNevyplnene = nevyplneneVDokumentu, počet „……" ≥ seznam', Array.isArray(d.nevyplnene) && d.nevyplnene.length > 3
    && stejne(d.nevyplnene, d.nevyplneneVDokumentu) && pocet(w.xml, T) >= d.nevyplnene.length, [d.nevyplnene, d.nevyplneneVDokumentu]);
  test('R konkrétní místa: IČO, termín montáže, číslo smlouvy mají tečky', w.text.some(t => t === 'Montáž od ' + T + ' do ' + T)
    && w.text.some(t => /IČ ……, DIČ ……/.test(t)), w.text);
  test('R zmizelo (ne tečky): rozpis objednaných bez příplatků, šachty u jedné šachty', !w.text.some(t => /^z toho|^objednané|^příplatky celkem/.test(t))
    && w.text.indexOf(T) !== w.text.indexOf('Předmět smyšlený.') + 1 && w.text[w.text.indexOf('Předmět smyšlený.') + 1].indexOf('Montáž') === 0
    && ['SACHTY_SOD_PREDMET', 'SACHTY_SOD_ROZPIS', 'SOD_CENA_NABIDKY'].every(k => d.nevyplnene.indexOf(k) < 0), w.text);
  /* pokuta: „0" → věta pryč; vlastní znění → tečky + položka výpisu */
  const pn = prazdna();
  pn.v.data.kryci = { hodnoty: { pokutaDodavka: '0' } };
  const wn = await word('sod', sodAb, pn.zak, pn.v);
  test('R pokuta „0": věta zmizí, žádné tečky místo ní', !wn.text.some(t => /^Pokuta/.test(t)) && wn.res.data.nevyplnene.indexOf('PODM_POKUTA_DODAVKA_PROC') < 0);
  const pv = prazdna();
  pv.v.data.kryci = { hodnoty: { pokutaDodavka: 'dle dohody stran' } };
  const wv = await word('sod', sodAb, pv.zak, pv.v);
  test('R pokuta vlastní znění bez procenta: „Pokuta …… % z ceny" a ve výpisu', wv.text.indexOf('Pokuta ' + T + ' % z ceny') >= 0
    && /pokuta za prodlení zhotovitele \(vlastní znění bez procenta\)/.test(sodNevyplneneText(wv.res.data.nevyplnene)), wv.text);
  /* vyplněná zakázka */
  global.NAST = { firma };
  global.ONLINE_STAV = { ja: { email: 'obchodnik@priklad.cz', jmeno: 'Smyšlený Obchodník', funkce: 'obchodník', telefon: '+420 000 000 000' } };
  const vy = vyplnena();
  const wy = await word('sod', sodAb, vy.zak, vy.v);
  test('R vyplněná zakázka: žádné „……", žádné {{', wy.xml.indexOf(T) < 0 && wy.xml.indexOf('{{') < 0 && wy.res.data.nevyplnene.length === 0,
    [wy.res.data.nevyplnene, wy.text]);
  /* zámek: záznam tisku se generováním nemění a teček nenese */
  {
    const z = kop(pz.zak), vv = z.varianty[0];
    vv.zamek = { zamceno: true, kdy: '2026-11-10T10:00:00.000Z', kdo: 'test@priklad.cz', cislo: z.cislo, vysledek: kop(zamekVysledekSpocti(vv, J, 'test')) };
    const pred = JSON.stringify(objSodSnimek(z, vv, J, 'cz', null));
    const zakPred = JSON.stringify(z);
    await word('sod', sodAb, z, vv);
    test('Z otisk záznamu tisku SoD (objSodSnimek) stejný před a po generování, bez teček; zakázka nezměněna',
      pred === JSON.stringify(objSodSnimek(z, vv, J, 'cz', null)) && pred.indexOf(T) < 0 && zakPred === JSON.stringify(z), pred);
  }
  delete global.NAST; delete global.ONLINE_STAV;

  /* ---------- nabídka beze změny, plná moc s tečkami ---------- */
  {
    const CN = doc(P('Nabídka {{CISLO_NABIDKY}} pro {{OBJEDNATEL}}') + P('Neznámý {{NEZNAMY_SYMBOL_CN}}'));
    const p = prazdna();
    const wc = await word('nabidka', await docx(CN), p.zak, p.v);
    test('N nabídka: neznámý symbol zůstane {{…}} (dnešní chování), žádné tečky, data bez nevyplnene',
      wc.text.indexOf('Neznámý {{NEZNAMY_SYMBOL_CN}}') >= 0 && wc.xml.indexOf(T) < 0 && !('nevyplnene' in wc.res.data), wc.text);
    const PM = doc(P('Zmocnitel {{PM_ZMOCNITEL}}, nar. {{PM_ZMOCNITEL_NAROZEN}}, bytem {{PM_ZMOCNITEL_BYTEM}}') + P('Zmocněnec {{FIRMA_NAZEV}} {{ADRESA}}'));
    const pp = prazdnaProj();
    const wp = await word('plnaMoc', await docx(PM), pp.zak, pp.v);
    const SP = doc(P('Smlouva PROJ {{SOD_CISLO_SMLOUVY}} pro {{OBJEDNATEL}}, IČ {{OBJEDNATEL_ICO}}') + P('Poplatky {{SODP_SPRAVNI_POPLATKY}}'));
    const wsp = await word('sodProj', await docx(SP), pp.zak, pp.v);
    test('P SoD projekce (smyšlená šablona): žádné {{, tečky = sodNevyplnene', wsp.xml.indexOf('{{') < 0 && wsp.text[1] === 'Poplatky ' + T
      && wsp.res.data.nevyplnene.indexOf('SODP_SPRAVNI_POPLATKY') >= 0 && stejne(wsp.res.data.nevyplnene, wsp.res.data.nevyplneneVDokumentu), wsp.text);
    test('N plná moc: nevyplněné {{PM_…}} → tečky (doplněk J. V. 11. 11.), žádné {{', wp.xml.indexOf('{{') < 0
      && wp.text[0] === 'Zmocnitel ' + T + ', nar. ' + T + ', bytem ' + T && stejne(wp.res.data.nevyplnene, wp.res.data.nevyplneneVDokumentu), wp.text);
  }

  /* ---------- skutečné šablony (KNG_PODKLADY) ---------- */
  const PODKL = String(process.env.KNG_PODKLADY || '').trim();
  const VYST = path.join(__dirname, '..', 'podklady', 'sablony_vystup');
  const najdi = jm => [PODKL && path.join(PODKL, jm), path.join(VYST, jm)].filter(Boolean).find(f => fs.existsSync(f));
  const ab = f => new Uint8Array(fs.readFileSync(f)).buffer;
  let sk = 0;
  const popisChybi = [];
  for (const [typ, jm] of [['sod', 'Sablona_SOD_REALIZACE_v4.docx'], ['sod', 'Sablona_SOD_REALIZACE_v5.docx'], ['sod', 'Sablona_SOD_REALIZACE_v4_EN.docx'],
    ['sodProj', 'Sablona_SOD_PROJEKCE_v4.docx'], ['plnaMoc', 'Sablona_PLNA_MOC.docx']]) {
    const f = najdi(jm);
    if (!f) continue;
    sk++;
    const sym = Array.from(await dokumentSymbolySablony(ab(f)));
    if (typ !== 'plnaMoc') sym.filter(k => !/_(?:ZAC|KON)$/.test(k) && !SOD_NEVYPLNENE_POPIS[k]).forEach(k => popisChybi.push(jm + ':' + k));
    const p = typ === 'sod' ? prazdna() : prazdnaProj();
    const L = /_EN/.test(jm) ? 'en' : 'cz';
    const g = await word(typ, ab(f), p.zak, p.v, L);
    test('K ' + jm + ' (prázdná zakázka): žádné „{{" ani „}}", tečky = sodNevyplnene', g.xml.indexOf('{{') < 0 && g.xml.indexOf('}}') < 0
      && stejne(g.res.data.nevyplnene, g.res.data.nevyplneneVDokumentu) && g.res.data.nevyplnene.length > 0,
      [g.res.data.nevyplnene, g.res.data.nevyplneneVDokumentu, (g.xml.match(/\{\{[^}]*\}\}/g) || []).slice(0, 5)]);
    if (typ === 'sodProj') test('K ' + jm + ': nenabízené činnosti (bloky CIN_*) zmizely, ne tečky', !g.res.data.nevyplnene.some(k => /^CIN_/.test(k)));
    if (typ !== 'plnaMoc') {
      global.NAST = { firma };
      global.ONLINE_STAV = { ja: { email: 'obchodnik@priklad.cz', jmeno: 'Smyšlený Obchodník', funkce: 'obchodník', telefon: '+420 000 000 000' } };
      const v = vyplnena(typ === 'sodProj');
      const gv = await word(typ, ab(f), v.zak, v.v, L);
      delete global.NAST; delete global.ONLINE_STAV;
      /* „…" v pevném textu šablony (podpisové řádky SoD projekce) se nepočítá */
      const vSablone = pocet((await dg.zipPrecti(new Uint8Array(ab(f)))).filter(q => /^word\/(document|header\d*|footer\d*)\.xml$/.test(q.nazev))
        .map(q => dec.decode(q.data)).join(''), T);
      test('K ' + jm + ' (vyplněná zakázka): žádné nové „……" ani {{', pocet(gv.xml, T) === vSablone && gv.xml.indexOf('{{') < 0, [gv.res.data.nevyplnene, gv.text.filter(t => /……|\{\{/.test(t))]);
    }
  }
  if (sk) test('K mapa popisů: každý symbol šablon SoD má lidský popis', !popisChybi.length, popisChybi);
  else console.log('–    skutečné šablony SoD (KNG_PODKLADY) nejsou po ruce — přeskočeno');
  console.log(`\n${ok} prošlo, ${fail} selhalo`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.log('FAIL výjimka ' + (e && e.stack)); process.exit(1); });
