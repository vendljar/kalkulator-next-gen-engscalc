/* VSD (doplněk J. V. 11. 11. 2026) — POZNÁMKA DEALU SE SEZNAMEM ŠACHET.
 *
 *  1) Vypnutý vypínač víc šachet: uložení s dealem nic do Pipedrive nepíše,
 *     zakázka beze změny (žádné pole pdPoznamkaSachty, žádný požadavek).
 *  2) Zapnuto + víc šachet + deal: první uložení ZALOŽÍ jednu poznámku
 *     (POST /v1/notes, deal_id), id se uloží do pdPoznamkaSachty; uložení bez
 *     změny šachet do Pipedrive nesahá; změna názvu šachty poznámku UPRAVÍ
 *     (PUT, žádná druhá poznámka).
 *  3) Poznámka mezitím v Pipedrive zmizela (404) → založí se nová.
 *  4) Klientovi se nevěří: podvržené pdPoznamkaSachty (cizí id / cizí deal)
 *     se zahodí, platí uložená verze; id poznámky jiného dealu se nepřepíše.
 *  5) Jedna šachta, bez dealu, bez napojení: nic. Změna dealu → nová poznámka
 *     u nového dealu.
 *  6) Text: escapovaný (HTML), délkový strop, jen názvy a kusy (bez cen,
 *     bez kontaktů), stejná věta jako náhled (pd_nanecisto: 'Šachty v nabídce: '
 *     + vsPredmetText).
 *  7) Pipedrive selže (výpadek, strop) → zakázka se uloží s varováním, otisk
 *     zůstane a další uložení zápis zopakuje.
 * Jen simulátor Pipedrive (PIPEDRIVE_SIMULATOR=1), síť je zakázaná.
 * Pojistka: na 4bb5793 (bez pd_poznamka.mjs) sada padá — nic se nezapíše.
 * Spuštění: node netlify/test_vsd_pd_poznamka.mjs */
process.env.TAJEMSTVI_RELACE = 'testovaci-tajemstvi-jen-pro-lokalni-beh';
process.env.ADMIN_INIT_HESLO = 'Docasne.Heslo.123';
process.env.ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'spravce@priklad.cz';
for (const k of ['PIPEDRIVE_SIMULATOR_SCENAR', 'PIPEDRIVE_TOKEN', 'PIPEDRIVE_DOMENA', 'PROSTREDI',
  'NETLIFY', 'SITE_ID', 'SITE_NAME', 'DEPLOY_ID', 'CONTEXT', 'BRANCH', 'HEAD', 'URL']) delete process.env[k];
process.env.PIPEDRIVE_SIMULATOR = '1';
const pamet = new Map();
globalThis.__TEST_ULOZISTE = (nazev) => ({
  async cti(k) { return pamet.has(nazev + '/' + k) ? JSON.parse(pamet.get(nazev + '/' + k)) : null; },
  async zapis(k, v) { pamet.set(nazev + '/' + k, JSON.stringify(v)); },
  async seznam(prefix) { return [...pamet.keys()].filter(x => x.startsWith(nazev + '/' + (prefix || ''))).map(x => x.slice(nazev.length + 1)); },
  async smaz(k) { pamet.delete(nazev + '/' + k); },
});
globalThis.fetch = async (url) => { throw new Error('síť je v testu zakázaná: ' + url); };

const R = new URL('..', import.meta.url).pathname;
const { default: prihlaseni } = await import(R + 'netlify/functions/prihlaseni.mjs');
const { default: program } = await import(R + 'netlify/functions/program.mjs');
const { default: zakazky } = await import(R + 'netlify/functions/zakazky.mjs');
const { default: funkce } = await import(R + 'netlify/functions/funkce.mjs');
const { ADMIN_EMAIL } = await import(R + 'netlify/lib/sdilene.mjs');
const { jadro } = await import(R + 'netlify/lib/jadro.mjs');
const { JEKLY } = await jadro();
const SIM = await import(R + 'netlify/lib/pipedrive_simulator.mjs');
const PP = await import(R + 'netlify/lib/pd_poznamka.mjs');
const { createRequire } = await import('node:module');
const require = createRequire(R + 'netlify/x.mjs');
const zk = require(R + 'src/zakazka.js');
const ZC = require(R + 'src/zkusebni_cenik.js');

let ok = 0, fail = 0;
const test = (n, cond, info) => { if (cond) { ok++; console.log('OK   ' + n); }
  else { fail++; console.log('FAIL ' + n + '  ' + JSON.stringify(info === undefined ? '' : info).slice(0, 400)); } };
const post = (fn, url, telo, cookie) => fn(new Request(url, { method: 'POST', headers: cookie ? { cookie } : {}, body: JSON.stringify(telo) }));
const kopie = x => JSON.parse(JSON.stringify(x));
async function prihlas(e, h) {
  const r = await post(prihlaseni, 'http://x/api/prihlaseni', { email: e, heslo: h });
  const t = await r.clone().json(); if (!t.ok) throw new Error(e + ' ' + JSON.stringify(t));
  return (r.headers.get('set-cookie') || '').split(';')[0];
}
const cA = await prihlas(ADMIN_EMAIL, 'Docasne.Heslo.123');
{ const r = await post(program, 'http://x/api/program', { cenik: Object.assign(ZC.zkusebniCenik(), ZC.zkusebniMustky()), cenikProj: ZC.zkusebniCenikProj(), poznamka: 'VSD' }, cA);
  if (r.status !== 200) throw new Error('program ' + r.status); }
const vypinac = async (h) => { const r = await post(funkce, 'http://x/api/funkce', { viceSachet: h }, cA); if (r.status !== 200) throw new Error('funkce ' + r.status); };
const ulozeno = (soubor) => JSON.parse(pamet.get('zakazky/z/' + soubor) || 'null');
/* Uloží zakázku jako prohlížeč: s razítkem poslední verze (je-li). */
async function uloz(zak) {
  const r = await post(zakazky, 'http://x/api/zakazky', { zakazka: zak, ocekavaneRazitko: zak.uloRazitko || undefined }, cA);
  const t = { status: r.status, ...(await r.json()) };
  if (t.razitko) zak.uloRazitko = t.razitko;
  return t;
}
const D = SIM.pdSimStav().data;
const dealy = D.dealy.filter(d => d.status !== 'deleted').map(d => d.id);
const notes = () => (SIM.pdSimStav().data.poznamky || []).filter(p => p.active_flag !== false);
const pozadavkyNotes = () => SIM.pdSimStav().pozadavky.filter(p => /\/api\/v1\/notes/.test(p));

let n = 9600;
function nova(viceSachet, dealId) {
  const z = zk.novaZakazka(); z.cislo = '2026 - OPR - CN - ' + (n++) + ' - TEST'; z.nazevAkce = 'TEST VSD'; z.objednatel = 'TEST – TESTOVACÍ ODBĚRATEL s.r.o.';
  const v = z.varianty[0];
  Object.assign(v.data.ock.zadani, { sirka: 1.6, hloubka: 1.8, zdvih: 9, prejezd: 3.2, prohluben: 1.2, nastupiste: 4 });
  v.data.ock.fixes = true;
  v.data.cenik = Object.assign(ZC.zkusebniCenik(), ZC.zkusebniMustky()); v.data.proj.cenik = ZC.zkusebniCenikProj();
  if (viceSachet) {
    v.data.ock.nazev = 'Výtah A';
    v.data.ock.dalsi = [{ id: 's_b1', nazev: 'Výtah B', ks: 2, zadani: Object.assign(kopie(v.data.ock.zadani), { zdvih: 12 }) }];
  }
  if (dealId) z.pdDealId = String(dealId);
  return z;
}
const soubor = (t) => t.soubor;
const fetchZobrazeni = (fn, c) => fn(new Request('http://x/api/zobrazeni', { headers: { cookie: c } }));

/* 1) vypnuto */
{
  const pred = pozadavkyNotes().length;
  const z = nova(false, dealy[0]);
  const t = await uloz(z);
  test('1 VYP: jedna šachta s dealem se uloží, do Pipedrive nic', t.status === 200 && pozadavkyNotes().length === pred && !('pdPoznamka' in t), t);
  test('1 VYP: zakázka bez pdPoznamkaSachty', ulozeno(soubor(t)).pdPoznamkaSachty === undefined);
  /* zakázka víc šachet uložená se ZAP, pak VYP: další uložení (jiná změna) do Pipedrive nesahá */
  await vypinac(true);
  const z2 = nova(true, dealy[1]);
  const t2 = await uloz(z2);
  test('1 příprava: ZAP + víc šachet založí poznámku', t2.status === 200 && t2.pdPoznamka === 'zalozeno', t2);
  await vypinac(false);
  const pocet = pozadavkyNotes().length;
  z2.nazevAkce = 'TEST VSD jinak';
  z2.varianty[0].data.ock.zadani.zdvih = 9.5;
  const t3 = await uloz(z2);
  test('1 VYP: uložení zakázky s víc šachtami do Pipedrive nesahá', t3.status === 200 && pozadavkyNotes().length === pocet && !('pdPoznamka' in t3), t3);
  test('1 VYP: id poznámky v zakázce zůstává (server ho drží)', ulozeno(soubor(t3)).pdPoznamkaSachty
    && ulozeno(soubor(t3)).pdPoznamkaSachty.id === ulozeno(soubor(t2)).pdPoznamkaSachty.id);
  /* podvrh pole z prohlížeče, když se do Pipedrive nejde: uloží se hodnota serveru */
  const drz = ulozeno(soubor(t3)).pdPoznamkaSachty;
  z2.pdPoznamkaSachty = { deal: drz.deal, id: drz.id + 777, otisk: 'f'.repeat(16), kdy: 'podvrh' };
  const t4 = await uloz(z2);
  test('1 VYP: podvržené pdPoznamkaSachty se neuloží', t4.status === 200
    && JSON.stringify(ulozeno(soubor(t4)).pdPoznamkaSachty) === JSON.stringify(drz), ulozeno(soubor(t4)).pdPoznamkaSachty);
  const z5 = nova(false, dealy[0]);
  z5.pdPoznamkaSachty = { deal: String(dealy[0]), id: 5, otisk: 'a'.repeat(16), kdy: 'podvrh' };
  const t5 = await uloz(z5);
  test('1 nová zakázka (jedna šachta) s podvrženým polem: pole se neuloží', t5.status === 200
    && ulozeno(soubor(t5)).pdPoznamkaSachty === undefined);
  await vypinac(true);
}

/* 2) zapnuto: založení, beze změny, úprava */
let Z2, ID2;
{
  const deal = dealy[2];
  const pred = notes().length;
  Z2 = nova(true, deal);
  const t = await uloz(Z2);
  const ul = ulozeno(soubor(t));
  const p = notes().filter(x => x.deal_id === deal);
  ID2 = ul.pdPoznamkaSachty && ul.pdPoznamkaSachty.id;
  test('2 první uložení: jedna poznámka u dealu', t.status === 200 && t.pdPoznamka === 'zalozeno' && p.length === 1 && notes().length === pred + 1, { t, p });
  test('2 id a deal v pdPoznamkaSachty', ul.pdPoznamkaSachty && ul.pdPoznamkaSachty.deal === String(deal) && ID2 === p[0].id
    && /^[0-9a-f]{16}$/.test(ul.pdPoznamkaSachty.otisk), ul.pdPoznamkaSachty);
  test('2 text poznámky', p[0].content === 'Šachty v nabídce: 2 varianty šachet, celkem 3 ks (Výtah A 1 ks, Výtah B 2 ks) — nabídka ' + Z2.cislo, p[0].content);
  const req = pozadavkyNotes().length;
  Z2.nazevAkce = 'TEST VSD beze změny šachet';
  const t2 = await uloz(Z2);
  test('2 uložení bez změny šachet: do Pipedrive nic', t2.status === 200 && t2.pdPoznamka === 'beze-zmeny' && pozadavkyNotes().length === req, t2);
  Z2.varianty[0].data.ock.dalsi[0].nazev = 'Výtah C';
  Z2.varianty[0].data.ock.dalsi[0].ks = 3;
  const t3 = await uloz(Z2);
  const p3 = notes().filter(x => x.deal_id === deal);
  test('2 změna šachet: poznámka UPRAVENA (PUT), pořád jedna', t3.pdPoznamka === 'upraveno' && p3.length === 1 && p3[0].id === ID2
    && /Výtah C 3 ks/.test(p3[0].content) && /celkem 4 ks/.test(p3[0].content)
    && pozadavkyNotes().slice(req).some(x => x === 'PUT /api/v1/notes/' + ID2), { t3, p3, r: pozadavkyNotes().slice(req) });
  test('2 nová poznámka nevznikla (POST jen jednou)', pozadavkyNotes().filter(x => x === 'POST /api/v1/notes').length >= 1
    && !pozadavkyNotes().slice(req).includes('POST /api/v1/notes'));
}

/* 3) poznámka zmizela v Pipedrive → nová */
{
  SIM.pdSimSmazPoznamku(ID2);
  Z2.varianty[0].data.ock.dalsi[0].nazev = 'Výtah D';
  const t = await uloz(Z2);
  const ul = ulozeno(soubor(t));
  const p = notes().filter(x => x.deal_id === dealy[2]);
  test('3 smazaná poznámka (404) → založena nová, id v zakázce nové', t.pdPoznamka === 'zalozeno' && p.length === 1 && p[0].id !== ID2
    && ul.pdPoznamkaSachty.id === p[0].id && /Výtah D/.test(p[0].content), { t, p, pp: ul.pdPoznamkaSachty });
  ID2 = p[0].id;
}

/* 4) klientovi se nevěří */
{
  /* cizí poznámka jiného dealu */
  const cizi = await uloz(nova(true, dealy[3]));
  const idCizi = ulozeno(soubor(cizi)).pdPoznamkaSachty.id;
  const obsahCizi = notes().find(x => x.id === idCizi).content;
  /* podvrh: klient pošle id cizí poznámky a změní šachty */
  Z2.pdPoznamkaSachty = { deal: String(dealy[2]), id: idCizi, otisk: '0000000000000000', kdy: 'x' };
  Z2.varianty[0].data.ock.dalsi[0].nazev = 'Výtah E';
  const t = await uloz(Z2);
  const ul = ulozeno(soubor(t));
  test('4 podvržené id z prohlížeče se zahodí, platí uložené', t.status === 200 && ul.pdPoznamkaSachty.id === ID2, { t, pp: ul.pdPoznamkaSachty });
  test('4 cizí poznámka zůstala beze změny', notes().find(x => x.id === idCizi).content === obsahCizi);
  test('4 vlastní poznámka upravena', /Výtah E/.test(notes().find(x => x.id === ID2).content));
  /* nová zakázka s podvrženým polem: nic se nepřebere, založí se vlastní */
  const z = nova(true, dealy[4]);
  z.pdPoznamkaSachty = { deal: String(dealy[4]), id: idCizi, otisk: PP.pdPoznamkaOtisk('x'), kdy: 'x' };
  const t2 = await uloz(z);
  const ul2 = ulozeno(soubor(t2));
  test('4 nová zakázka s podvrženým polem: vlastní nová poznámka, cizí nedotčená', t2.pdPoznamka === 'zalozeno'
    && ul2.pdPoznamkaSachty.id !== idCizi && notes().find(x => x.id === idCizi).content === obsahCizi, { t2, pp: ul2.pdPoznamkaSachty });
  /* id poznámky jiného dealu v uložené verzi (např. obnova ze souboru): GET ověří deal, nepřepíše */
  const s3 = soubor(t2);
  const raw = ulozeno(s3);
  raw.pdPoznamkaSachty.id = idCizi;
  pamet.set('zakazky/z/' + s3, JSON.stringify(raw));
  z.uloRazitko = raw.uloRazitko;
  z.varianty[0].data.ock.dalsi[0].nazev = 'Výtah F';
  const t3 = await uloz(z);
  const ul3 = ulozeno(s3);
  test('4 uložené id cizího dealu: cizí poznámka nepřepsána, převzata vlastní (podle značky, N3)', t3.status === 200 && t3.pdPoznamka === 'upraveno'
    && notes().find(x => x.id === idCizi).content === obsahCizi && ul3.pdPoznamkaSachty.id === ul2.pdPoznamkaSachty.id
    && /Výtah F/.test(notes().find(x => x.id === ul2.pdPoznamkaSachty.id).content)
    && notes().find(x => x.id === ul3.pdPoznamkaSachty.id).deal_id === dealy[4], { t3, pp: ul3.pdPoznamkaSachty });
}

/* 5) bez dealu / jedna šachta / změna dealu */
{
  const req = pozadavkyNotes().length;
  const t = await uloz(nova(true, null));
  test('5 víc šachet bez dealu: nic', t.status === 200 && pozadavkyNotes().length === req && ulozeno(soubor(t)).pdPoznamkaSachty === undefined);
  const t2 = await uloz(nova(false, dealy[5]));
  test('5 jedna šachta s dealem (ZAP): nic', t2.status === 200 && pozadavkyNotes().length === req && !('pdPoznamka' in t2));
  const z = nova(true, dealy[6]);
  const t3 = await uloz(z);
  const id1 = ulozeno(soubor(t3)).pdPoznamkaSachty.id;
  z.pdDealId = String(dealy[7]);
  const t4 = await uloz(z);
  const ul = ulozeno(soubor(t4));
  test('5 změna dealu: nová poznámka u nového dealu, stará nedotčená', t4.pdPoznamka === 'zalozeno' && ul.pdPoznamkaSachty.deal === String(dealy[7])
    && ul.pdPoznamkaSachty.id !== id1 && notes().find(x => x.id === ul.pdPoznamkaSachty.id).deal_id === dealy[7]
    && notes().find(x => x.id === id1).deal_id === dealy[6], ul.pdPoznamkaSachty);
}

/* 6) text: esc, strop, obsah */
{
  const G = globalThis;
  const z = nova(true, dealy[8]);
  z.varianty[0].data.ock.nazev = '<b>A&B</b> "x" \'y\'';
  const t = await uloz(z);
  const p = notes().find(x => x.id === ulozeno(soubor(t)).pdPoznamkaSachty.id);
  test('6 obsah je escapovaný HTML', p.content.indexOf('&lt;b&gt;A&amp;B&lt;/b&gt; &quot;x&quot; &#39;y&#39; 1 ks') >= 0 && !/<b>/.test(p.content), p.content);
  /* 10 šachet × název 80 znaků: v mezích, celé */
  const z2 = nova(true, null);
  const ock = z2.varianty[0].data.ock;
  ock.nazev = 'N'.repeat(80);
  for (let i = 2; i <= 9; i++) ock.dalsi.push(Object.assign(kopie(ock.dalsi[0]), { id: 's_' + i, nazev: String(i).repeat(80), ks: 20 }));
  const txt = PP.pdPoznamkaText(z2, G);
  test('6 10 šachet × 80 znaků se vejde celé (pod stropem)', txt.length < PP.PD_POZNAMKA_MAX && /10 variant šachet/.test(txt) && !/…$/.test(txt), txt.length);
  const dlouhy = PP.pdPoznamkaText({ varianty: [{ ridici: true, data: { ock: { nazev: 'x', zadani: {}, dalsi: [] } } }] }, Object.assign(Object.create(G),
    { sachtyZ: () => Array.from({ length: 10 }, (_, i) => ({ nazev: 'Z'.repeat(400), ks: 1 })), rezimViceSachet: () => true, vsTvarProblemy: () => [] }));
  test('6 délkový strop (PD_POZNAMKA_MAX) s „…"', dlouhy.length === PP.PD_POZNAMKA_MAX && /…$/.test(dlouhy), dlouhy.length);
  test('6 řídicí znaky pryč', PP.pdPoznamkaText((() => { const q = nova(true, null); q.varianty[0].data.ock.nazev = 'A\u0000\nB'; return q; })(), G).indexOf('A B 1 ks') >= 0);
  /* stejná věta jako náhled (pd_nanecisto.js) z výsledku výpočtu */
  const v = Z2.varianty[0];
  const r = G.vypocetZ(v, JEKLY);
  const nahled = 'Šachty v nabídce: ' + G.vsPredmetText(G.vsVystup(r));
  test('6 text = řádek náhledu (vsPredmetText z výsledku) + značka zakázky', PP.pdPoznamkaText(Z2, G) === nahled + ' — nabídka ' + Z2.cislo, [PP.pdPoznamkaText(Z2, G), nahled]);
  test('6 bez cen a kontaktů (jen názvy a kusy)', !/Kč|CZK|EUR|@|\+420|TESTOVACÍ ODBĚRATEL/.test(PP.pdPoznamkaText(Z2, G)));
  test('6 neplatný tvar šachet: nic', PP.pdPoznamkaText((() => { const q = nova(true, null); q.varianty[0].data.ock.dalsi[0].ks = 0; return q; })(), G) === '');
  test('6 řídící varianta rozhoduje', (() => {
    const q = nova(false, null); const v2 = kopie(nova(true, null).varianty[0]); v2.id = 'v2'; q.varianty.push(v2);
    q.varianty.forEach(x => { x.ridici = x.id === 'v2'; }); const a = PP.pdPoznamkaText(q, G);
    q.varianty.forEach(x => { x.ridici = x.id !== 'v2'; }); return /Výtah B/.test(a) && PP.pdPoznamkaText(q, G) === '';
  })());
}

/* 7) Pipedrive selže → uložení projde s varováním, zápis se zopakuje */
{
  const z = nova(true, dealy[9]);
  const postPred = pozadavkyNotes().length;
  SIM.pdSimNastav({ scenar: 'vypadek' });
  const t = await uloz(z);
  const postVypadek = pozadavkyNotes().length - postPred;
  SIM.pdSimNastav({ scenar: '' });
  test('7 výpadek: zakázka uložena, varování, bez id', t.status === 200 && t.pdPoznamka === 'chyba' && /poznámky dealu/.test(t.varovani || '')
    && ulozeno(soubor(t)).pdPoznamkaSachty === undefined, t);
  test('7 bez opakování (jediný požadavek při výpadku)', postVypadek === 1, postVypadek);
  z.nazevAkce = 'TEST VSD po výpadku';
  const t2 = await uloz(z);
  test('7 další uložení zápis zopakuje', t2.pdPoznamka === 'zalozeno' && notes().filter(x => x.deal_id === dealy[9]).length === 1, t2);
  /* strop zápisů na deal (B217) */
  let posledni = null;
  for (let i = 0; i < PP.PD_POZNAMKA_STROP + 2; i++) {
    z.varianty[0].data.ock.dalsi[0].nazev = 'Výtah S' + i;
    posledni = await uloz(z);
  }
  test('7 strop zápisů na deal: nad stropem nezapsáno, uložení projde s varováním', posledni.status === 200 && posledni.pdPoznamka === 'strop'
    && /strop/.test(posledni.varovani || ''), posledni);
}

/* 8) N1 — souběžné uložení během volání Pipedrive: třetí čtení → 409, poznámka se pak převezme */
{
  const z = nova(true, dealy[10]);
  const t0 = await uloz(z);
  test('8 příprava', t0.status === 200 && t0.pdPoznamka === 'zalozeno', t0);
  const sb = soubor(t0);
  const id0 = ulozeno(sb).pdPoznamkaSachty.id;
  /* jiná instance uloží zakázku právě ve chvíli, kdy tahle čeká na Pipedrive */
  let jednou = false;
  SIM.pdSimNastav({ poPozadavku: async (r) => {
    if (jednou || !/^PUT \/api\/v1\/notes\//.test(r)) return;
    jednou = true;
    const cizi = ulozeno(sb); cizi.nazevAkce = 'TEST VSD jiná instance'; cizi.uloRazitko = '2099-01-01T00:00:00.000Z';
    pamet.set('zakazky/z/' + sb, JSON.stringify(cizi));
  } });
  z.varianty[0].data.ock.dalsi[0].nazev = 'Výtah G';
  const t1 = await uloz(z);
  SIM.pdSimNastav({ poPozadavku: null });
  test('8 N1: změna razítka během Pipedrive → 409, zápis jiné instance zůstal', t1.status === 409 && t1.kolize === true
    && ulozeno(sb).nazevAkce === 'TEST VSD jiná instance' && jednou, { status: t1.status, chyba: t1.chyba });
  /* znovu z čerstvé verze: poznámka se nepřidá, převezme se (id beze změny) */
  z.uloRazitko = ulozeno(sb).uloRazitko; z.nazevAkce = 'TEST VSD jiná instance';
  z.varianty[0].data.ock.dalsi[0].nazev = 'Výtah H';
  const t2 = await uloz(z);
  const p = notes().filter(x => x.deal_id === dealy[10]);
  test('8 N1: další uložení — pořád jedna poznámka, id stejné', t2.status === 200 && p.length === 1 && p[0].id === id0
    && ulozeno(sb).pdPoznamkaSachty.id === id0 && /Výtah H/.test(p[0].content), { t2: t2.pdPoznamka, p });
}

/* 9) N2 — Pipedrive visí: časový limit, uložení projde s varováním */
{
  const z = nova(true, dealy[11]);
  SIM.pdSimNastav({ scenar: 'visi' });
  const t0 = Date.now();
  const t = await uloz(z);
  const trvalo = Date.now() - t0;
  SIM.pdSimNastav({ scenar: '' });
  test('9 N2: visící Pipedrive — uloženo, stav chyba, varování o čase', t.status === 200 && t.pdPoznamka === 'chyba'
    && /neodpověděl/.test(t.varovani || '') && ulozeno(soubor(t)).pdPoznamkaSachty === undefined, { t: t.pdPoznamka, v: t.varovani });
  test('9 N2: uložení netrvalo déle než limit volání (+ rezerva)', trvalo < PP.PD_POZNAMKA_VOLANI_MS + 1500 && trvalo >= PP.PD_POZNAMKA_VOLANI_MS - 100, trvalo);
  const t2 = await uloz(z);
  test('9 N2: po obnovení Pipedrive se zápis zopakuje', t2.pdPoznamka === 'zalozeno' && notes().filter(x => x.deal_id === dealy[11]).length === 1, t2.pdPoznamka);
}

/* 10) N3 — dvě zakázky na jednom dealu: dvě poznámky; ztracené id se převezme podle značky */
{
  const a = nova(true, dealy[12]), b = nova(true, dealy[12]);
  b.varianty[0].data.ock.dalsi[0].nazev = 'Výtah Z';
  const ta = await uloz(a), tb = await uloz(b);
  const p = notes().filter(x => x.deal_id === dealy[12]);
  test('10 N3: dvě zakázky na dealu = dvě poznámky se svou značkou', ta.pdPoznamka === 'zalozeno' && tb.pdPoznamka === 'zalozeno' && p.length === 2
    && p.some(x => x.content.endsWith(' — nabídka ' + a.cislo)) && p.some(x => x.content.endsWith(' — nabídka ' + b.cislo)), p.map(x => x.content));
  /* ztracené id (např. kolize) — server poznámku najde a neduplikuje */
  const sa = soubor(ta); const raw = ulozeno(sa); const idA = raw.pdPoznamkaSachty.id;
  delete raw.pdPoznamkaSachty; pamet.set('zakazky/z/' + sa, JSON.stringify(raw)); a.uloRazitko = raw.uloRazitko;
  a.varianty[0].data.ock.dalsi[0].nazev = 'Výtah Y';
  const ta2 = await uloz(a);
  const p2 = notes().filter(x => x.deal_id === dealy[12]);
  test('10 N3: bez id se převezme vlastní poznámka (GET ?deal_id), žádná třetí', ta2.pdPoznamka === 'upraveno' && p2.length === 2
    && ulozeno(sa).pdPoznamkaSachty.id === idA && /Výtah Y/.test(p2.find(x => x.id === idA).content)
    && /Výtah Z/.test(p2.find(x => x.id !== idA).content), { s: ta2.pdPoznamka, p2: p2.map(x => [x.id, x.content]) });
  test('10 N3: značka v obsahu (Pipedrive obalí do <p>) se pozná', PP.pdPoznamkaJeNase('<p>' + PP.pdPoznamkaEsc(PP.pdPoznamkaText(a)) + '</p>', a)
    && !PP.pdPoznamkaJeNase(PP.pdPoznamkaEsc(PP.pdPoznamkaText(a)), b) && !PP.pdPoznamkaJeNase('Jiná poznámka — nabídka ' + a.cislo, a));
}

/* 11) (a) právo crm.pipedrive */
{
  const { default: uzivatele } = await import(R + 'netlify/functions/uzivatele.mjs');
  const { default: zobrazeni } = await import(R + 'netlify/functions/zobrazeni.mjs');
  const x = await (await post(uzivatele, 'http://x/api/uzivatele', { akce: 'zaloz', email: 'obch.vsd@priklad.cz', jmeno: 'Obch VSD', role: 'Obchodník', heslo: 'Heslo12345x' }, cA)).json();
  if (!x.ok) throw new Error('uzivatel ' + JSON.stringify(x));
  const cO = await prihlas('obch.vsd@priklad.cz', 'Heslo12345x');
  const ulozO = async (zak) => { const r = await post(zakazky, 'http://x/api/zakazky', { zakazka: zak, ocekavaneRazitko: zak.uloRazitko || undefined }, cO);
    const t = { status: r.status, ...(await r.json()) }; if (t.razitko) zak.uloRazitko = t.razitko; return t; };
  /* deal zadává jen administrátor: obchodník založí zakázku, správce (s VYP, ať sám nezapíše) naváže deal */
  /* právo crm.pipedrive (matice[klíč][role]; výchozí pro obchodníka ano) — odebrat */
  const pravo = async (hodnota) => {
    const m = await (await fetchZobrazeni(zobrazeni, cA)).json();
    const matice = JSON.parse(JSON.stringify(m.matice || {}));
    matice['crm.pipedrive'] = Object.assign({}, matice['crm.pipedrive'] || {}, { 'Obchodník': hodnota });
    return (await post(zobrazeni, 'http://x/api/zobrazeni', { matice, hesloSpravce: 'Docasne.Heslo.123' }, cA)).status;
  };
  test('11 příprava: právo crm.pipedrive obchodníkovi odebráno', (await pravo(false)) === 200);
  const z = nova(true, null);
  const t0 = await ulozO(z);
  if (t0.status !== 200) throw new Error('obchodník ' + JSON.stringify(t0).slice(0, 200));
  await vypinac(false);
  const za = JSON.parse(pamet.get('zakazky/z/' + soubor(t0))); za.pdDealId = String(dealy[13]);
  const ta = await uloz(za);
  if (ta.status !== 200) throw new Error('správce ' + JSON.stringify(ta).slice(0, 200));
  await vypinac(true);
  z.pdDealId = String(dealy[13]); z.uloRazitko = ta.razitko;
  z.varianty[0].data.ock.dalsi[0].nazev = 'Výtah O';
  const req = pozadavkyNotes().length;
  const t = await ulozO(z);
  test('11 (a) obchodník bez práva crm.pipedrive: uloženo, stav bez-prava, bez varování, do Pipedrive nic', t.status === 200
    && t.pdPoznamka === 'bez-prava' && !t.varovani && pozadavkyNotes().length === req, { s: t.status, p: t.pdPoznamka, v: t.varovani, ch: t.chyba });
  /* administrátor přidělí právo → nejbližší uložení zapíše */
  test('11 příprava: právo přiděleno', (await pravo(true)) === 200);
  z.nazevAkce = 'TEST VSD s právem';
  const t2 = await ulozO(z);
  test('11 (a) s právem crm.pipedrive: zapsáno', t2.status === 200 && t2.pdPoznamka === 'zalozeno', t2.pdPoznamka);
}

/* 12) (b) přechod na jednu šachtu: poznámka se nemaže, upraví se na „1 šachta“ */
{
  const z = nova(true, dealy[14]);
  const t = await uloz(z);
  const id = ulozeno(soubor(t)).pdPoznamkaSachty.id;
  z.varianty[0].data.ock.dalsi = [];
  const t2 = await uloz(z);
  const p = notes().filter(x => x.deal_id === dealy[14]);
  test('12 (b) jedna šachta: táž poznámka upravena na „1 šachta“', t2.status === 200 && t2.pdPoznamka === 'upraveno' && p.length === 1
    && p[0].id === id && p[0].content === 'Šachty v nabídce: 1 šachta — nabídka ' + z.cislo, { s: t2.pdPoznamka, p });
  const req = pozadavkyNotes().length;
  z.nazevAkce = 'TEST VSD jedna šachta znovu';
  const t3 = await uloz(z);
  test('12 (b) další uložení s jednou šachtou: beze změny', t3.pdPoznamka === 'beze-zmeny' && pozadavkyNotes().length === req, t3.pdPoznamka);
}

console.log(ok + ' OK, ' + fail + ' FAIL');
if (fail) process.exit(1);
