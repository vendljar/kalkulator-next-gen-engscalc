/* NABÍDKA PROJ: VLASTNÍ POLOŽKY, SLEVA A SOUČET VE WORDU
 * (P4 / K14-N64, K15-N66, kolo 16, dávka C; 25. 9. 2026).
 *
 * Nálezy: (1) položka, kterou obchodník do sekce PROJ přidal sám („+ přidat
 * položku") nebo která přišla z ceníku PROJ jako trvalá, v nabídce vůbec
 * nebyla — cena sekce ji obsahovala, text ne; (2) wordová nabídka PROJ
 * neukázala slevu ani součet — šablona PROJ v2 nemá jediný jejich symbol,
 * ačkoli aplikace je posílá (PROJ_CELKEM_BEZ_DPH, PROJ_SLEVA_KC…).
 *
 * Co se hlídá:
 *   – vlastní i katalogová položka, která se počítá, je v nabídce u své sekce
 *     (online blok ceny) i v symbolech pro Word (PROJ_POLOZKY_NAVIC a po
 *     sekcích PROJ_NAVIC_<SEKCE>); vyřazená nebo nulová ne, předlohová ne,
 *   – řádky slevy PROJ ve wordové tabulce zmizí, když sleva není (jako u OCK),
 *   – kontroly před nabídkou řeknou, když šablona PROJ slevu nebo vlastní
 *     položky neukáže. */
const ep = require('./engine_proj.js');
Object.keys(ep).forEach(k => { global[k] = ep[k]; });
const eng = require('./engine.js');
const ZC = require('./zkusebni_cenik.js');
global.vypocet = eng.vypocet; global.DEFAULT_ZADANI = eng.DEFAULT_ZADANI; global.DEFAULT_CENIK = ZC.zkusebniCenik();
global.DEFAULT_CENIK_PROJ = ZC.zkusebniCenikProj();
const tsm = require('./techspec.js');
Object.keys(tsm).forEach(k => { global[k] = tsm[k]; });
const zk = require('./zakazka.js');
global.projHlavicka = zk.projHlavicka;
global.projHlavickaEfektivni = zk.projHlavickaEfektivni;
global.projCisloNabidky = zk.projCisloNabidky;
const fm = require('./firma.js');
Object.keys(fm).forEach(k => { global[k] = fm[k]; });
const pr = require('./preklad.js');
Object.keys(pr).forEach(k => { global[k] = pr[k]; });
const SLV = require('./sleva.js');
Object.keys(SLV).forEach(k => { global[k] = SLV[k]; });
const { nabidkaProjData } = require('./nabidka_proj.js');
const dg = require('./docxgen.js');
const K = require('./kontroly.js');

let ok = 0, fail = 0;
const test = (n, cond, info) => { if (cond) { ok++; console.log('OK  ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : (typeof info === 'string' ? info : JSON.stringify(info))); } };

function zakazka() {
  const zak = zk.novaZakazka();
  zak.cislo = '2026 OVP CN 0161'; zak.nazevAkce = 'Projekce'; zak.objednatel = 'SVJ';
  const v = zak.varianty[0];
  v.data.proj.cenik = ZC.zkusebniCenikProj();
  return { zak, v, sekce: key => v.data.proj.zadani.sekce.find(s => s.key === key) };
}

/* --- 1) vlastní a katalogová položka v nabídce --- */
{
  const { zak, v, sekce } = zakazka();
  const zam = sekce('zamereni');
  zam.polozky.push({ nazev: 'Zaměření sklepa navíc', typ: 'fix', cena: 12000, vlastni: true });
  zam.polozky.push({ nazev: 'Vyřazená vlastní', typ: 'fix', cena: 5000, vlastni: true, vyrazeno: true });
  zam.polozky.push({ nazev: 'Nulová vlastní', typ: 'fix', cena: 0, vlastni: true });
  const dps = sekce('dps');
  dps.polozky.push({ kid: 'pk7', nazev: 'Požární zpráva (trvalá)', typ: 'hod', sazba: 'projektant', hodiny: 10, rezerva: 0, vlastni: true });
  const d = nabidkaProjData(zak, v);
  const blokZam = d.bloky.find(b => b.typ === 'cena' && b.sekce === 'zamereni');
  test('příprava: sekce zaměření má v nabídce cenový blok', !!blokZam, d.bloky.map(b => b.sekce).filter(Boolean));
  test('P4: vlastní položka je v nabídce u své sekce (online)',
    !!blokZam && Array.isArray(blokZam.navic) && blokZam.navic.includes('Zaměření sklepa navíc'), blokZam);
  test('P4: vyřazená ani nulová vlastní položka v nabídce není',
    !!blokZam && !blokZam.navic.includes('Vyřazená vlastní') && !blokZam.navic.includes('Nulová vlastní'), blokZam && blokZam.navic);
  test('P4: předlohová položka se jako „navíc" nevypisuje', !!blokZam && blokZam.navic.length === 1, blokZam && blokZam.navic);
  const blokDps = d.bloky.find(b => b.typ === 'cena' && b.sekce === 'dps');
  test('P4: trvalá položka z ceníku PROJ (kid) je v nabídce taky',
    !!blokDps && (blokDps.navic || []).includes('Požární zpráva (trvalá)'), blokDps);
  const p = d.placeholders;
  test('P4: symbol sekce pro Word nese položku s pomlčkou', p.PROJ_NAVIC_ZAMERENI === '– Zaměření sklepa navíc', p.PROJ_NAVIC_ZAMERENI);
  test('P4: sekce bez vlastních položek má symbol prázdný', p.PROJ_NAVIC_STUDIE === '', p.PROJ_NAVIC_STUDIE);
  test('P4: souhrnný symbol nese sekce i položky',
    /Zaměření sklepa navíc/.test(p.PROJ_POLOZKY_NAVIC) && /Požární zpráva \(trvalá\)/.test(p.PROJ_POLOZKY_NAVIC)
    && p.PROJ_POLOZKY_NAVIC.split('\n').length >= 4, p.PROJ_POLOZKY_NAVIC);
  const bez = zakazka();
  test('P4: bez vlastních položek je souhrnný symbol prázdný', nabidkaProjData(bez.zak, bez.v).placeholders.PROJ_POLOZKY_NAVIC === '');
}

/* --- 2) řádky slevy PROJ ve wordové tabulce zmizí, když sleva není --- */
{
  const bunka = txt => `<w:tr><w:tc><w:p><w:r><w:t>${txt}</w:t></w:r></w:p></w:tc></w:tr>`;
  const xml = '<w:tbl>' + bunka('Cena před slevou {{PROJ_CENA_PRED_SLEVOU}}') + bunka('Sleva {{PROJ_SLEVA_PROC}} % − {{PROJ_SLEVA_KC}}')
    + bunka('CELKEM bez DPH {{PROJ_CELKEM_BEZ_DPH}}') + '</w:tbl>';
  const bezSlevy = dg.odstranPrazdneTsRadky(xml, { PROJ_CENA_PRED_SLEVOU: '', PROJ_SLEVA_PROC: '', PROJ_SLEVA_KC: '', PROJ_CELKEM_BEZ_DPH: '1 000 Kč' });
  test('P4: bez slevy PROJ řádky „Cena před slevou" a „Sleva" zmizí',
    !/PROJ_SLEVA|PROJ_CENA_PRED_SLEVOU/.test(bezSlevy) && /PROJ_CELKEM_BEZ_DPH/.test(bezSlevy), bezSlevy);
  const seSlevou = dg.odstranPrazdneTsRadky(xml, { PROJ_CENA_PRED_SLEVOU: '1 100 Kč', PROJ_SLEVA_PROC: '10', PROJ_SLEVA_KC: '100 Kč', PROJ_CELKEM_BEZ_DPH: '1 000 Kč' });
  test('P4: se slevou řádky zůstanou', seSlevou === xml);
}

/* --- 3) kontroly: šablona PROJ slevu / vlastní položky neukáže --- */
{
  const nalez = (ctx, kod) => K.kontrolyProved(ctx).nalezy.find(n => n.kod === kod);
  test('P4: kontrola „sleva PROJ se ve Wordu neukáže" je v katalogu',
    K.kontrolyPravidla().some(p => p.kod === 'slevaWordProj'));
  test('P4: kontrola „vlastní položky PROJ se ve Wordu neukážou" je v katalogu',
    K.kontrolyPravidla().some(p => p.kod === 'polozkyNavicWordProj'));
  const slevaProj = { procenta: 10, stav: 'schváleno' };
  const sablona = (symboly) => ({ typ: 'nabidkaProj', verze: 2, nazev: 'Sablona_NABIDKA_PROJ.docx', symboly });
  const v2 = ['PROJ_CENA_ZAMERENI', 'PROJ_DPH_SAZBA'];
  const s1 = nalez({ slevaProj, sablonaNabidkaProj: sablona(v2) }, 'slevaWordProj');
  test('P4: se slevou PROJ a šablonou bez {{PROJ_SLEVA_KC}} se ozve', !!s1, s1);
  test('P4: věta jmenuje symbol, šablonu i procenta',
    s1 && /PROJ_SLEVA_KC/.test(s1.text) && /Sablona_NABIDKA_PROJ/.test(s1.text) && /10 %/.test(s1.text), s1 && s1.text);
  test('P4: je to jen varování (dokument se nezastaví)', s1 && s1.uroven === 2);
  test('P4: šablona se symbolem slevy je v pořádku',
    !nalez({ slevaProj, sablonaNabidkaProj: sablona(v2.concat('PROJ_SLEVA_KC')) }, 'slevaWordProj'));
  test('P4: bez slevy mlčí', !nalez({ slevaProj: { procenta: 0, stav: 'schváleno' }, sablonaNabidkaProj: sablona(v2) }, 'slevaWordProj'));
  test('P4: neschválená sleva mlčí (do ceny nejde)',
    !nalez({ slevaProj: { procenta: 10, stav: 'čeká na schválení' }, sablonaNabidkaProj: sablona(v2) }, 'slevaWordProj'));
  test('P4: neznámá šablona = mlčí (nehádá se)', !nalez({ slevaProj, sablonaNabidkaProj: null }, 'slevaWordProj'));
  test('P4: zakázka bez PROJ (jen OCK) mlčí', !nalez({ slevaProj, sablonaNabidkaProj: sablona(v2), jenOck: true }, 'slevaWordProj'));

  const ctx = (symboly, navic) => ({ projNavic: navic, sablonaNabidkaProj: sablona(symboly) });
  const n1 = nalez(ctx(v2, ['Zaměření sklepa navíc']), 'polozkyNavicWordProj');
  test('P4: vlastní položky a šablona bez jejich symbolu → ozve se a jmenuje položku',
    !!n1 && /Zaměření sklepa navíc/.test(n1.text) && /PROJ_POLOZKY_NAVIC/.test(n1.text), n1);
  test('P4: šablona se souhrnným symbolem {{PROJ_POLOZKY_NAVIC}} je v pořádku',
    !nalez(ctx(v2.concat('PROJ_POLOZKY_NAVIC'), ['A']), 'polozkyNavicWordProj'));
  test('P4: šablona se symbolem po sekcích je v pořádku',
    !nalez(ctx(v2.concat('PROJ_NAVIC_ZAMERENI'), ['A']), 'polozkyNavicWordProj'));
  test('P4: bez vlastních položek mlčí', !nalez(ctx(v2, []), 'polozkyNavicWordProj'));
}

/* --- 4) Word PROJ se slevou nese částku slevy a vlastní položky — až je
 *        šablona má (syntetická šablona se symboly, v2 je zatím nemá) --- */
(async () => {
  const enc = new TextEncoder(), dec = new TextDecoder();
  const bunka = txt => `<w:tr><w:tc><w:p><w:r><w:t>${txt}</w:t></w:r></w:p></w:tc></w:tr>`;
  const telo = '<w:p><w:r><w:t>{{PROJ_POLOZKY_NAVIC}}</w:t></w:r></w:p><w:tbl>'
    + bunka('Cena před slevou {{PROJ_CENA_PRED_SLEVOU}}') + bunka('Sleva {{PROJ_SLEVA_PROC}} % − {{PROJ_SLEVA_KC}}')
    + bunka('CELKEM bez DPH {{PROJ_CELKEM_BEZ_DPH}}') + '</w:tbl>';
  const sablona = await (await dg.zipZapis([{ nazev: 'word/document.xml',
    data: enc.encode('<w:document><w:body>' + telo + '</w:body></w:document>') }])).arrayBuffer();
  const vyplnit = async (zak, v) => {
    const d = nabidkaProjData(zak, v);
    const blob = await dg.docxVyplnSablonu(sablona.slice(0), d.placeholders, [], {});
    const pol = await dg.zipPrecti(new Uint8Array(await blob.arrayBuffer()));
    return { d, doc: dec.decode(pol.find(p => p.nazev === 'word/document.xml').data) };
  };
  const { zak, v, sekce } = zakazka();
  sekce('zamereni').polozky.push({ nazev: 'Zaměření sklepa navíc', typ: 'fix', cena: 12000, vlastni: true });
  v.data.slevaProj = { procenta: 10, stav: 'schváleno automaticky', role: 'Obchodník', schvalenoProc: 10 };
  const s = await vyplnit(zak, v);
  test('příprava: sleva projekce se v datech projevila', !!s.d.placeholders.PROJ_SLEVA_KC, s.d.placeholders);
  test('P4: Word PROJ se slevou nese částku slevy a cenu před slevou',
    s.doc.includes(s.d.placeholders.PROJ_SLEVA_KC) && s.doc.includes(s.d.placeholders.PROJ_CENA_PRED_SLEVOU), s.doc.slice(0, 300));
  test('P4: a součet', s.doc.includes(s.d.placeholders.PROJ_CELKEM_BEZ_DPH));
  test('P4: vlastní položka je ve Wordu na vlastním řádku pod názvem sekce',
    /ZAMĚŘENÍ:<\/w:t><w:br\/><w:t xml:space="preserve">– Zaměření sklepa navíc/.test(s.doc), s.doc.slice(0, 300));
  const bez = zakazka();
  const b = await vyplnit(bez.zak, bez.v);
  test('P4: bez slevy řádky slevy ve Wordu nejsou, součet ano',
    !/Sleva|před slevou/.test(b.doc) && b.doc.includes(b.d.placeholders.PROJ_CELKEM_BEZ_DPH), b.doc.slice(0, 300));

  console.log(`\n${ok} prošlo, ${fail} selhalo`);
  process.exit(fail ? 1 : 0);
})();
