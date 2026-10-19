/* ROZSAH DÍLA SoD PROJEKCE PODLE NABÍDKY (#380 Q7, rozhodnutí J. V.
 * 17. 10. 2026 — varianta B; dávka V5, v18.10.3).
 *
 * Šablona SoD PROJ v3 měla natvrdo (a) větu přílohy č. 1 „Cenová nabídka …
 * na vypracování dokumentace DPZ+DSP včetně zajištění inženýringu …" a (b)
 * v čl. II (Předmět díla) a III (Termíny plnění) všech sedm činností bez
 * ohledu na nabídku. `nastroje/vyrob_sablony.js --sod-proj-v4` (sodProjV4)
 * dá do věty přílohy {{SODP_ROZSAH_DILA}} a činnosti do značek
 * {{CIN_<X>_ZAC}}/{{CIN_<X>_KON}}; builder (sodProjData) plní výčet nabízených
 * činností a nenabízené bloky pošle generátoru v `blokyPryc`.
 *
 * Hlídá:
 *  1) výrobu v4 nad syntetickým XML ve stavbě skutečné šablony: značky kolem
 *     odrážky i s mezerou před ní, věta o předání díla mimo značky, symbol
 *     přílohy v jednom běhu, odkaz v čl. VII podle číslování (oprava i „beze
 *     změny"), chyby místo hádání,
 *  2) generátor: blok ze seznamu `blokyPryc` zmizí celý, ostatní zůstanou,
 *  3) builder: výčet plnými názvy, `blokyPryc` nenabízených činností, nic
 *     nenabízeno → symbol zůstane vidět,
 *  4) vygenerovanou SoD PROJ (dokumentVygeneruj jako v aplikaci) z v4: jen
 *     nabízené činnosti v čl. II i III, odrážky souvislé, věta přílohy;
 *     stará v3 bez značek dál vznikne jako dřív,
 *  5) se skutečnou šablonou v KNG_PODKLADY (Sablona_SOD_PROJEKCE_v3.docx,
 *     případně _v4) totéž nad opravdovým Wordem — jinak přeskočeno.
 * Před opravou sada selže na první kontrole (sodProjV4 neexistuje).
 *
 * Spuštění: cd src && node test_sod_proj_rozsah.js */
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
const sod = nacti('./sod.js');
const JEKLY = JSON.parse(fs.readFileSync(__dirname + '/jekly.json', 'utf8'));
let VS = null;
try { VS = require(path.join(__dirname, '..', 'nastroje', 'vyrob_sablony.js')); } catch (e) { VS = null; }

let ok = 0, fail = 0;
const test = (n, cond, info) => { if (cond) { ok++; console.log('OK   ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : (typeof info === 'string' ? info.slice(0, 600) : JSON.stringify(info))); } };
const hazi = (fn) => { try { fn(); return ''; } catch (e) { return e.message || String(e); } };
const konec = () => { console.log(`\n${ok} prošlo, ${fail} selhalo`); process.exit(fail ? 1 : 0); };

test('nastroje/vyrob_sablony.js umí vyrobit SoD PROJ v4 (sodProjV4)', !!(VS && typeof VS.sodProjV4 === 'function'));
test('generátor zná výslovný seznam bloků pryč (odstranPrazdneBloky(xml, ph, blokyPryc))', dg.odstranPrazdneBloky.length >= 3);
if (fail) konec();

/* ---- syntetická šablona ve stavbě skutečné SoD PROJ v3 ---- */
const beh = (t, rPr) => '<w:r>' + (rPr || '') + '<w:t xml:space="preserve">' + t + '</w:t></w:r>';
const odst = (t, num) => '<w:p><w:pPr>' + (num ? '<w:numPr><w:ilvl w:val="0"/><w:numId w:val="' + num + '"/></w:numPr>' : '') + '</w:pPr>'
  + (t ? beh(t) : '') + '</w:p>';
const prazdny = '<w:p/>';
const CL2 = [
  'Zaměření a zpracování výstupů – detailní zaměření na místě.',
  'Dokumentace pro povolení záměru – dokumentace dle nabídky {{CISLO_NABIDKY}} ze dne {{DATUM}}.',
  'Inženýrská činnost DOSS – zajištění projednání stanovisek.',
  'Podání žádosti na příslušný stavební úřad – a vyřízení povolení záměru.',
  'Dokumentace pro provedení stavby – rozsah, způsob provádění.',
  'Ekonomická zadávací část – slepý rozpočet a výkaz výměr',
  'Výběr dodavatele pro realizaci záměru – vyhodnocení nabídek.'];
const CL3 = [
  'Zaměření a zpracování výstupů – do 12 týdnů od podpisu.',
  'Dokumentace pro povolení záměru – do 12 týdnů od výstupů.',
  'Inženýrská činnost DOSS – 12 týdnů od schválení.',
  'Vyřízení povolení záměru – do 10 týdnů od stanovisek.',
  'Dokumentace pro provedení stavby – do 6 týdnů.',
  'Ekonomická zadávací část – do 2 týdnů.',
  'PREDANI', 'Výběr dodavatele pro realizaci záměru – maximálně 6 týdnů'];
const PREDANI = 'Zhotovitel předá objednateli dílo v počtu 2 paré.';
const VII = (ref) => odst('VII. Komunikace smluvních stran') + odst('Oznámení se předávají kontaktním místům:', 8)
  + odst('Objednatel: {{OBJEDNATEL}}') + odst('Kterákoliv strana může změnit kontaktní místo.', 8)
  + odst('Forma oznámení je e-mail, osobně nebo poštou.', 8) + odst('Oznámení doručená e-mailem se považují za doručená.', 8)
  + odst('Kterákoliv ze smluvních stran je oprávněna požadovat po druhé smluvní straně potvrzení kteréhokoliv oznámení poštou.', 8)
  + odst('Písemná forma je zachována, strana je oprávněna požadovat potvrzení oznámení poštou dle odst. ' + ref + '. tohoto článku smlouvy.', 8)
  + odst('Chybu v dokumentaci zhotovitel opraví.', 8);
const PRILOHA = '<w:p><w:r><w:t xml:space="preserve">Cenová nabídka číslo {{CISLO_NABIDKY}} </w:t></w:r><w:r><w:rPr><w:b/></w:rPr>'
  + '<w:t xml:space="preserve">na vypracování dokumentace DPZ+DSP včetně zajištění inženýringu tj. zajištění vydání povolení záměru </w:t></w:r>'
  + '<w:r><w:rPr><w:b/></w:rPr><w:t xml:space="preserve">včetně nabytí právní moci – objekt {{ADRESA}}, ze dne {{DATUM}}.</w:t></w:r></w:p>';
const dokument = telo => '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>'
  + telo + '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/></w:sectPr></w:body></w:document>';
const v3Telo = (ref) => odst('SMLOUVA O DÍLO') + odst('číslo {{SOD_CISLO_SMLOUVY}}') + odst('Objednatel: {{OBJEDNATEL}}')
  + odst('II. Předmět Díla') + prazdny + odst('Předmětem smlouvy je provedení Díla na akci {{NAZEV_AKCE}}, {{ADRESA}}:', 6) + prazdny
  + CL2.map((t, i) => odst(t, 2) + (i < CL2.length - 1 ? prazdny : '')).join('')
  + odst('Objednatel předá Zhotoviteli podklady.', 6) + prazdny
  + odst('III. Termíny plnění') + prazdny + prazdny
  + CL3.map((t, i) => odst(t === 'PREDANI' ? PREDANI : t, 10) + (i < CL3.length - 1 ? prazdny : '')).join('') + prazdny
  + odst('IV. Cena díla') + odst('Celková cena díla {{PROJ_CELKEM_BEZ_DPH}} bez DPH.', 9)
  + odst('VI. Platební podmínky') + odst('{{SODP_PLATEBNI_KALENDAR}}', 4)
  + VII(ref) + odst('VIII. Vyšší moc') + odst('Příloha č. 1 k SoD') + PRILOHA;
const V3 = dokument(v3Telo(5));
const text = x => (x.match(/<w:p[\s>][\s\S]*?<\/w:p>|<w:p\/>/g) || []).map(p => dg.odstavecText(p));
const mezi = (t, od, po) => { const a = t.indexOf(od), b = t.indexOf(po, a + 1); return t.slice(a + 1, b); };

/* ---- 1) výroba v4 ---- */
let v4 = '';
const zaznam = [];
{
  const ch = hazi(() => { v4 = VS.sodProjV4(V3, zaznam); });
  test('v4: výroba bez chyby', !ch, ch);
  const k = dg.klicePlaceholderu(v4);
  const cin = k.filter(x => /^CIN_/.test(x));
  test('v4: 7 činností × 2 články = 14 značek, ZAC i KON ke každé',
    cin.length === 28 && ['ZAMERENI', 'DPZ', 'IC_DOSS', 'POVOLENI', 'DPS', 'EZC', 'VYBER']
      .every(c => cin.filter(x => x === 'CIN_' + c + '_ZAC').length === 2 && cin.filter(x => x === 'CIN_' + c + '_KON').length === 2), cin);
  test('v4: přibyl symbol {{SODP_ROZSAH_DILA}}, žádný symbol neubyl',
    k.indexOf('SODP_ROZSAH_DILA') >= 0 && dg.klicePlaceholderu(V3).every(x => k.indexOf(x) >= 0));
  test('v4: XML bez vad', !dg.xmlStrukturaVada(v4), dg.xmlStrukturaVada(v4));
  const t = text(v4);
  const ii = mezi(t, 'II. Předmět Díla', 'III. Termíny plnění');
  const iz = ii.indexOf('{{CIN_ZAMERENI_ZAC}}');
  test('v4: blok zaměření v čl. II = mezera před odrážkou + odrážka', ii[iz + 1] === '' && /^Zaměření a zpracování/.test(ii[iz + 2]) && ii[iz + 3] === '{{CIN_ZAMERENI_KON}}', ii.slice(iz - 1, iz + 4));
  test('v4: úvodní věta čl. II zůstává mimo značky (mezera za ní patří k první činnosti)', /^Předmětem smlouvy/.test(ii[iz - 1]), ii.slice(0, iz + 1));
  const iii = mezi(t, 'III. Termíny plnění', 'IV. Cena díla');
  const ip = iii.indexOf(PREDANI);
  test('v4: věta o předání díla v čl. III je mimo značky', ip > 0 && iii[ip - 1] === '' && iii[ip - 2] === '{{CIN_EZC_KON}}' && iii[ip + 1] === '{{CIN_VYBER_ZAC}}' && iii[ip + 2] === '', iii.slice(ip - 2, ip + 3));
  test('v4: povolení záměru v čl. III podle „Vyřízení povolení záměru"', /^Vyřízení povolení/.test(iii[iii.indexOf('{{CIN_POVOLENI_ZAC}}') + 2]));
  const pr = t.find(x => /^Cenová nabídka/.test(x));
  test('v4: věta přílohy „… na činnosti: {{SODP_ROZSAH_DILA}} – objekt …"',
    pr === 'Cenová nabídka číslo {{CISLO_NABIDKY}} na činnosti: {{SODP_ROZSAH_DILA}} – objekt {{ADRESA}}, ze dne {{DATUM}}.', pr);
  test('v4: symbol přílohy v jednom běhu s písmem původního textu', /<w:rPr><w:b\/><\/w:rPr><w:t xml:space="preserve">na činnosti: \{\{SODP_ROZSAH_DILA\}\}<\/w:t>/.test(v4));
  test('v4: správný odkaz „dle odst. 5." v čl. VII zůstává', t.some(x => /poštou dle odst\. 5\. tohoto/.test(x)) && zaznam.some(r => /beze změny/.test(r)), zaznam);
  test('v4: záznam výroby popisuje čl. II, III a přílohu', zaznam.length === 4 && /II\./.test(zaznam[0]) && /III\./.test(zaznam[1]) && /příloha/.test(zaznam[2]), zaznam);
}
{
  const z2 = [];
  const opr = VS.sodProjV4(dokument(v3Telo(4)), z2);
  test('v4: chybný odkaz „dle odst. 4." v čl. VII se opraví na 5 (odstavec o potvrzení poštou)',
    text(opr).some(x => /poštou dle odst\. 5\. tohoto/.test(x)) && z2.some(r => /odst\. 4\.” → „dle odst\. 5|odst\. 4\." → „dle odst\. 5/.test(r)), z2);
  const uz = hazi(() => VS.sodProjV4(v4));
  test('chyba, když šablona značky činností už má (nevloží se podruhé)', /už rozsah díla/.test(uz), uz);
  const bezVyberu = hazi(() => VS.sodProjV4(V3.replace('Výběr dodavatele pro realizaci záměru – vyhodnocení', 'Jiná činnost – vyhodnocení')));
  test('chyba, když v čl. II chybí činnost', /právě jednu odrážku „Výběr dodavatele/.test(bezVyberu), bezVyberu);
  const dvakrat = hazi(() => VS.sodProjV4(V3.replace(odst(CL3[0], 10), odst(CL3[0], 10) + odst(CL3[0], 10))));
  test('chyba, když je činnost v čl. III dvakrát', /je jich 2/.test(dvakrat), dvakrat);
  const bezPrilohy = hazi(() => VS.sodProjV4(V3.replace(PRILOHA, odst('Cenová nabídka {{CISLO_NABIDKY}}.'))));
  test('chyba, když chybí věta přílohy s „DPZ+DSP"', /větu přílohy/.test(bezPrilohy), bezPrilohy);
}

/* ---- 2) generátor: výslovný seznam bloků ---- */
{
  const zn = j => odst('{{' + j + '}}');
  const xml = '<w:body>' + zn('CIN_A_ZAC') + odst('Činnost A') + zn('CIN_A_KON') + zn('CIN_B_ZAC') + odst('Činnost B') + zn('CIN_B_KON')
    + zn('CIN_C_ZAC') + odst('Činnost C {{X}}') + zn('CIN_C_KON') + '</w:body>';
  const t = text(dg.odstranPrazdneBloky(xml, { X: 'x' }, ['CIN_B', 'CIN_C']));
  test('generátor: blok ze seznamu zmizí celý (i s textem bez symbolu i se symbolem)', JSON.stringify(t) === JSON.stringify(['Činnost A']), t);
  const t2 = text(dg.odstranPrazdneBloky(xml, { X: 'x' }));
  test('generátor: bez seznamu zůstane obsah, zmizí jen značky (jako dřív)', JSON.stringify(t2) === JSON.stringify(['Činnost A', 'Činnost B', 'Činnost C {{X}}']), t2);
  /* B191 (audit kola 28): nevyvážený blok ze seznamu pryč → chyba, ne tiché ponechání */
  const nevyv = '<w:body><w:tbl><w:tr><w:tc>' + zn('CIN_B_ZAC') + odst('Činnost B') + '</w:tc></w:tr></w:tbl>' + zn('CIN_B_KON') + '</w:body>';
  const e1 = hazi(() => dg.odstranPrazdneBloky(nevyv, {}, ['CIN_B']));
  test('B191: blok ze seznamu se začátkem v tabulce a koncem za ní → chyba (dokument nevznikne)', /CIN_B/.test(e1) && /nevznikne/.test(e1), e1);
  const e2 = hazi(() => dg.odstranPrazdneBloky('<w:body>' + zn('CIN_B_ZAC') + odst('Činnost B') + '</w:body>', {}, ['CIN_B']));
  test('B191: blok ze seznamu bez koncové značky → chyba', /CIN_B/.test(e2), e2);
  const e3 = hazi(() => dg.odstranPrazdneBloky(nevyv, {}, ['CIN_A']));
  test('B191: nevyvážený blok mimo seznam pryč → bez chyby, obsah zůstane (jako dřív)', e3 === ''
    && text(dg.odstranPrazdneBloky(nevyv, {}, ['CIN_A'])).indexOf('Činnost B') >= 0, e3);
  test('B191: vyvážený blok ze seznamu dál zmizí bez chyby', hazi(() => dg.odstranPrazdneBloky(xml, { X: 'x' }, ['CIN_B'])) === '');
}

/* ---- 3) builder ---- */
global.NAST = { firma: global.firmaDefault() };
const zakazka = (sekce) => {
  const z = zk.novaZakazka(); z.cislo = '2026 - OVP - CN - 0418';
  Object.assign(z.projHlavicka, { cislo: '2026 OVP CN 0418', objednatel: 'SVJ Zkušební 18', adresa: 'Zkušební 18, Zkušebín', nazevAkce: 'Zkušební projekce — rozsah díla' });
  const v = z.varianty[0];
  v.data.proj.cenik = ZC.zkusebniCenikProj();
  v.data.proj.zadani.sekce.forEach(s => (s.polozky || []).forEach(p => { p.vyrazeno = sekce.indexOf(s.key) < 0; }));
  v.data.kryciProj = { hodnoty: { cisloSod: '2026 OVP SOD 0418' } };
  return z;
};
const sab = (...k) => ({ symboly: new Set(k) });
{
  const z = zakazka(['dpz', 'ic', 'dps']);
  const d = sod.sodProjData(z, z.varianty[0], 'cz', sab('SODP_PLATEBNI_KALENDAR', 'SODP_ROZSAH_DILA'));
  test('builder: DPZ + IČ + DPS → výčet plnými názvy jako v čl. II',
    d.placeholders.SODP_ROZSAH_DILA === 'dokumentace pro povolení záměru, inženýrská činnost DOSS, podání žádosti na příslušný stavební úřad a vyřízení povolení záměru a dokumentace pro provedení stavby',
    d.placeholders.SODP_ROZSAH_DILA);
  test('builder: bez zaměření a EZČ jdou pryč bloky zaměření, EZČ a výběru dodavatele',
    JSON.stringify((d.blokyPryc || []).slice().sort()) === JSON.stringify(['CIN_EZC', 'CIN_VYBER', 'CIN_ZAMERENI']), d.blokyPryc);
  const vse = zakazka(['zamereni', 'dpz', 'ic', 'dps', 'ezc']);
  const dv = sod.sodProjData(vse, vse.varianty[0], 'cz', sab('SODP_PLATEBNI_KALENDAR'));
  test('builder: všech sedm činností → žádný blok pryč', !(dv.blokyPryc || []).length, dv.blokyPryc);
  test('builder: výčet začíná zaměřením a končí výběrem dodavatele',
    /^zaměření a zpracování výstupů, dokumentace pro povolení záměru, .* a výběr dodavatele pro realizaci záměru$/.test(dv.placeholders.SODP_ROZSAH_DILA), dv.placeholders.SODP_ROZSAH_DILA);
  const jen = zakazka(['studie']);
  const dj = sod.sodProjData(jen, jen.varianty[0], 'cz', sab('SODP_PLATEBNI_KALENDAR'));
  test('builder: nabídka jen se studií → symbol rozsahu se neplní (zůstane {{…}} k doplnění)', !('SODP_ROZSAH_DILA' in dj.placeholders), dj.placeholders.SODP_ROZSAH_DILA);
  test('výčet: jedna činnost bez spojky, dvě se spojkou', sod.sodProjRozsahText(['Ekonomická zadávací část'], 'cz') === 'ekonomická zadávací část'
    && sod.sodProjRozsahText(['A b', 'C d'], 'en') === 'a b and c d' && sod.sodProjRozsahText(['Aa', 'Bb'], 'de') === 'Aa und Bb');
}

/* ---- 4) vygenerovaná SoD PROJ ---- */
const enc = new TextEncoder(), dec = new TextDecoder();
const docx = async xml => (await dg.zipZapis([{ nazev: 'word/document.xml', data: enc.encode(xml) }])).arrayBuffer();
const vygeneruj = async (sablonaAb, sekce) => {
  const z = zakazka(sekce);
  const res = await DK.dokumentVygeneruj('sodProj', sablonaAb, z, z.varianty[0], JEKLY, 'cz');
  const casti = await dg.zipPrecti(new Uint8Array(await res.blob.arrayBuffer()));
  const xml = dec.decode(casti.find(p => p.nazev === 'word/document.xml').data);
  return { xml, text: text(xml) };
};
const odrazky = (xml, nadpis, dalsi) => {
  const ps = xml.match(/<w:p[\s>][\s\S]*?<\/w:p>|<w:p\/>/g) || [];
  const t = ps.map(p => dg.odstavecText(p));
  const a = t.findIndex(x => x === nadpis), b = t.findIndex((x, i) => i > a && x === dalsi);
  return ps.slice(a + 1, b);
};

(async () => {
  {
    const g = await vygeneruj(await docx(v4), ['dpz', 'ic', 'dps']);
    const ii = mezi(g.text, 'II. Předmět Díla', 'III. Termíny plnění').filter(Boolean);
    test('SoD (v4, DPZ + IČ + DPS): čl. II nese jen nabízené činnosti v pořadí šablony',
      ii.length === 6 && /^Dokumentace pro povolení/.test(ii[1]) && /^Inženýrská/.test(ii[2]) && /^Podání žádosti/.test(ii[3]) && /^Dokumentace pro provedení/.test(ii[4]), ii);
    const iii = mezi(g.text, 'III. Termíny plnění', 'IV. Cena díla').filter(Boolean);
    test('SoD (v4): čl. III nese jen nabízené termíny a větu o předání díla',
      iii.length === 5 && iii[4] === PREDANI && !iii.some(x => /^(Zaměření|Ekonomická|Výběr)/.test(x)), iii);
    test('SoD (v4): značky {{CIN_…}} ani {{SODP_ROZSAH_DILA}} v dokumentu nezůstaly', !/CIN_|SODP_ROZSAH_DILA/.test(g.xml));
    const pr = g.text.find(x => /^Cenová nabídka/.test(x));
    test('SoD (v4): věta přílohy vyjmenuje nabízené činnosti',
      /^Cenová nabídka číslo .+ na činnosti: dokumentace pro povolení záměru, inženýrská činnost DOSS, podání žádosti na příslušný stavební úřad a vyřízení povolení záměru a dokumentace pro provedení stavby – objekt Zkušební 18, Zkušebín, ze dne /.test(pr) && !/DPZ\+DSP/.test(g.xml), pr);
    /* Odrážky čl. II: číslování (numId) mají jen činnosti, mezi nimi právě jedna mezera — Word je přečísluje a), b), c) … */
    const ps = odrazky(g.xml, 'II. Předmět Díla', 'III. Termíny plnění');
    const typ = ps.map(p => (/<w:numId w:val="2"\/>/.test(p) ? 'o' : dg.odstavecText(p) ? 't' : '_')).join('');
    test('SoD (v4): v čl. II se střídá odrážka a mezera, žádné dvě mezery ani prázdná odrážka (souvislé a) b) c) d))', /^_t_o_o_o_ot_$/.test(typ), typ);
    const tisk = await vygeneruj(await docx(v4), ['zamereni', 'dpz', 'ic', 'dps', 'ezc']);
    test('SoD (v4, vše): všech sedm činností v čl. II i III', mezi(tisk.text, 'II. Předmět Díla', 'III. Termíny plnění').filter(Boolean).length === 9
      && mezi(tisk.text, 'III. Termíny plnění', 'IV. Cena díla').filter(Boolean).length === 8);
    const v3g = await vygeneruj(await docx(V3), ['dpz', 'ic', 'dps']);
    test('SoD (stará v3 bez značek): smlouva vznikne jako dřív — všech 7 činností a věta „DPZ+DSP"',
      mezi(v3g.text, 'II. Předmět Díla', 'III. Termíny plnění').filter(Boolean).length === 9 && /DPZ\+DSP/.test(v3g.xml) && !/SODP_ROZSAH_DILA/.test(v3g.xml));
  }

  /* ---- 5) skutečná šablona z Disku (jen s KNG_PODKLADY) ---- */
  const slozka = String(process.env.KNG_PODKLADY || '').trim();
  const soubor = j => slozka && fs.existsSync(path.join(slozka, j)) ? path.join(slozka, j) : '';
  const ze = async f => dec.decode((await dg.zipPrecti(new Uint8Array(fs.readFileSync(f)))).find(p => p.nazev === 'word/document.xml').data);
  const nahrad = async (f, xml) => (await dg.zipZapis((await dg.zipPrecti(new Uint8Array(fs.readFileSync(f))))
    .map(c => c.nazev === 'word/document.xml' ? { nazev: c.nazev, data: enc.encode(xml) } : c))).arrayBuffer();
  let skutecnych = 0;
  for (const [jm, upravit] of [['Sablona_SOD_PROJEKCE_v3.docx', true], ['Sablona_SOD_PROJEKCE_v4.docx', false]]) {
    const f = soubor(jm);
    if (!f) continue;
    skutecnych++;
    let xml = await ze(f);
    if (upravit) {
      const e = hazi(() => { xml = VS.sodProjV4(xml); });
      test(jm + ' (Disk): v4 se vyrobí bez chyby', !e, e);
      test(jm + ' (Disk): XML po úpravě bez vad', !dg.xmlStrukturaVada(xml), dg.xmlStrukturaVada(xml));
    }
    const ab = upravit ? await nahrad(f, xml) : fs.readFileSync(f).buffer.slice(0);
    const g = await vygeneruj(ab, ['dpz', 'ic', 'dps']);
    const ii = mezi(g.text, 'II. Předmět Díla', 'III. Termíny plnění').filter(Boolean);
    test(jm + ' (Disk): čl. II bez zaměření, EZČ a výběru dodavatele',
      ii.some(x => /^Dokumentace pro povolení/.test(x)) && !ii.some(x => /^(Zaměření a zpracování|Ekonomická zadávací|Výběr dodavatele)/.test(x)), ii.map(x => x.slice(0, 40)));
    const iii = mezi(g.text, 'III. Termíny plnění', 'IV. Cena díla').filter(Boolean);
    test(jm + ' (Disk): čl. III bez zaměření, EZČ a výběru, předání díla zůstává',
      iii.some(x => /^Vyřízení povolení/.test(x)) && iii.some(x => /^Zhotovitel předá/.test(x)) && !iii.some(x => /^(Zaměření a zpracování|Ekonomická zadávací|Výběr dodavatele)/.test(x)), iii.map(x => x.slice(0, 40)));
    test(jm + ' (Disk): věta přílohy s nabízenými činnostmi, bez „DPZ+DSP", bez {{…}} značek',
      g.text.some(x => /na činnosti: dokumentace pro povolení záměru, .* a dokumentace pro provedení stavby – objekt/.test(x)) && !/DPZ\+DSP|CIN_|SODP_ROZSAH/.test(g.xml));
  }
  if (!skutecnych) console.log('–    skutečné šablony SoD PROJ v3/v4 (KNG_PODKLADY) nejsou po ruce — přeskočeno');
  konec();
})().catch(e => { console.log('FAIL výjimka: ' + (e && e.stack || e)); process.exit(1); });
