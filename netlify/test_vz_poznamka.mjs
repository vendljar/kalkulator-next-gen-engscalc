/* VZ-E5 (#604, 16. 11. 2026) — POZNÁMKA DEALU „Další zákazníci na zakázce“.
 *
 *  1) VYP (viceZakazniku): uložení zakázky s dalšími zákazníky a dealem do
 *     Pipedrive nesahá, odpověď bez pdPoznamkaZakaznici, pole drží server.
 *  2) ZAP: první uložení ZALOŽÍ jednu poznámku (text návrhu § 7.2 se značkou
 *     zakázky, řádky <br>); bez změny textu do Pipedrive nic; změna názvu
 *     dalšího zákazníka poznámku UPRAVÍ (PUT, žádná druhá).
 *  3) Převzetí podle úvodu a značky (ztracené id) — žádná druhá poznámka.
 *  4) Cizí id: podvržené pole z prohlížeče se zahodí; uložené id poznámky
 *     jiného dealu se nepřepíše.
 *  5) Poznámka šachet se nepřepíše poznámkou zákazníků a naopak (id
 *     prohozená v uložené verzi); obě poznámky v jednom uložení v rozpočtu.
 *  6) „žádní“ po odstranění posledního dalšího zákazníka; zakázka bez
 *     poznámky a bez dalších zákazníků nic.
 *  7) Výpadek, strop (vlastní klíč, nezávislý na šachtách), časový limit
 *     (visi) i společný rozpočet obou poznámek; prošlý termín bez volání.
 *  8) Bez práva crm.pipedrive: bez-prava, bez varování.
 *  9) Text: HTML v názvu escapované, řídicí znaky pryč, bez kontaktů a IČO,
 *     odeslaná nabídka (číslo, den, cena bez DPH ze zmrazeného zámku),
 *     „připravuje se nová“, „— neprodáno“, strop 2 000 znaků „… a další N“.
 * Jen simulátor Pipedrive (PIPEDRIVE_SIMULATOR=1), síť je zakázaná.
 * Pojistka: na e29f2b1 (bez druhu „zákazníci“) sada padá — poznámka
 * zákazníků nevznikne (1, 2, …) a pdPoznamkyUlozeni neexistuje.
 * Spuštění: node netlify/test_vz_poznamka.mjs */
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
const G = globalThis;
if (typeof G.vzPoznamkaText !== 'function' || typeof PP.pdPoznamkyUlozeni !== 'function')
  throw new Error('jádro nenese vz_poznamka.js nebo pd_poznamka.mjs druh zákazníci');

let ok = 0, fail = 0;
const test = (n, cond, info) => { if (cond) { ok++; console.log('OK   ' + n); }
  else { fail++; console.log('FAIL ' + n + '  ' + JSON.stringify(info === undefined ? '' : info).slice(0, 500)); } };
const post = (fn, url, telo, cookie) => fn(new Request(url, { method: 'POST', headers: cookie ? { cookie } : {}, body: JSON.stringify(telo) }));
const kopie = x => JSON.parse(JSON.stringify(x));
async function prihlas(e, h) {
  const r = await post(prihlaseni, 'http://x/api/prihlaseni', { email: e, heslo: h });
  const t = await r.clone().json(); if (!t.ok) throw new Error(e + ' ' + JSON.stringify(t));
  return (r.headers.get('set-cookie') || '').split(';')[0];
}
const cA = await prihlas(ADMIN_EMAIL, 'Docasne.Heslo.123');
{ const r = await post(program, 'http://x/api/program', { cenik: Object.assign(ZC.zkusebniCenik(), ZC.zkusebniMustky()), cenikProj: ZC.zkusebniCenikProj(), poznamka: 'VZ-E5' }, cA);
  if (r.status !== 200) throw new Error('program ' + r.status); }
const vypinac = async (telo) => { const r = await post(funkce, 'http://x/api/funkce', telo, cA); if (r.status !== 200) throw new Error('funkce ' + r.status); };
const ulozeno = (soubor) => JSON.parse(pamet.get('zakazky/z/' + soubor) || 'null');
async function uloz(zak, cookie) {
  const r = await post(zakazky, 'http://x/api/zakazky', { zakazka: zak, ocekavaneRazitko: zak.uloRazitko || undefined }, cookie || cA);
  const t = { status: r.status, ...(await r.json()) };
  if (t.razitko) zak.uloRazitko = t.razitko;
  return t;
}
const D = SIM.pdSimStav().data;
const dealy = D.dealy.filter(d => d.status !== 'deleted').map(d => d.id).slice(40);   // jiné dealy než sada #588
const notes = () => (SIM.pdSimStav().data.poznamky || []).filter(p => p.active_flag !== false);
const pozadavkyNotes = () => SIM.pdSimStav().pozadavky.filter(p => /\/api\/v1\/notes/.test(p));
const poznamka = (id) => notes().find(x => x.id === id);

const UDAJE_B = { objednatel: 'TEST – DRUHÝ ODBĚRATEL s.r.o.', adresaObjednatele: 'Zkušební 1, Testov', ico: '12345679', dic: 'CZ12345679', kontakt: 'Zkušební kontakt' };
const UDAJE_C = { objednatel: 'TEST – TŘETÍ ODBĚRATEL s.r.o.', adresaObjednatele: '', ico: '', dic: '', kontakt: '' };
let n = 9700;
function nova(dealId, { sachty = false } = {}) {
  const z = zk.novaZakazka(); z.cislo = '2026 - OPR - CN - ' + (n++) + ' - TEST'; z.nazevAkce = 'TEST VZ-E5'; z.objednatel = 'TEST – TESTOVACÍ ODBĚRATEL s.r.o.';
  const v = z.varianty[0];
  Object.assign(v.data.ock.zadani, { sirka: 1.6, hloubka: 1.8, zdvih: 9, prejezd: 3.2, prohluben: 1.2, nastupiste: 4 });
  v.data.ock.fixes = true;
  v.data.cenik = Object.assign(ZC.zkusebniCenik(), ZC.zkusebniMustky()); v.data.proj.cenik = ZC.zkusebniCenikProj();
  if (sachty) {
    v.data.ock.nazev = 'Výtah A';
    v.data.ock.dalsi = [{ id: 's_b1', nazev: 'Výtah B', ks: 2, zadani: Object.assign(kopie(v.data.ock.zadani), { zdvih: 12 }) }];
  }
  if (dealId) z.pdDealId = String(dealId);
  return z;
}
function sVz(dealId, volby = {}) {
  const z = nova(dealId, volby);
  const p = G.vzPridej(z, UDAJE_B, { kdo: 'Test', kdy: '2026-11-16T10:00:00.000Z' });
  if (!p.ok) throw new Error('vzPridej ' + JSON.stringify(p));
  return z;
}
const cisloB = z => z.cislo + '-B';

await vypinac({ viceZakazniku: true, viceSachet: false });

/* 1) VYP */
{
  await vypinac({ viceZakazniku: false });
  const pred = pozadavkyNotes().length;
  const t0 = await uloz(nova(dealy[0]));
  test('1 VYP: zakázka s jedním zákazníkem a dealem — do Pipedrive nic, odpověď bez klíče', t0.status === 200
    && pozadavkyNotes().length === pred && !('pdPoznamkaZakaznici' in t0) && !('pdPoznamka' in t0), t0);
  await vypinac({ viceZakazniku: true });
  const z = sVz(dealy[1]);
  const t1 = await uloz(z);
  test('1 příprava: ZAP založí poznámku zákazníků', t1.status === 200 && t1.pdPoznamkaZakaznici === 'zalozeno', t1);
  const drz = ulozeno(t1.soubor).pdPoznamkaZakaznici;
  await vypinac({ viceZakazniku: false });
  const req = pozadavkyNotes().length;
  z.nazevAkce = 'TEST VZ-E5 jinak';
  const t2 = await uloz(z);
  test('1 VYP: uložení zakázky s dalšími zákazníky do Pipedrive nesahá', t2.status === 200 && pozadavkyNotes().length === req
    && !('pdPoznamkaZakaznici' in t2), t2);
  z.pdPoznamkaZakaznici = { deal: drz.deal, id: drz.id + 5, otisk: 'f'.repeat(16), kdy: 'podvrh' };
  const t3 = await uloz(z);
  test('1 VYP: pole drží server (podvrh z prohlížeče se neuloží)', t3.status === 200
    && JSON.stringify(ulozeno(t3.soubor).pdPoznamkaZakaznici) === JSON.stringify(drz), ulozeno(t3.soubor).pdPoznamkaZakaznici);
  await vypinac({ viceZakazniku: true });
  const z4 = nova(dealy[0]);
  z4.pdPoznamkaZakaznici = { deal: String(dealy[0]), id: 5, otisk: 'a'.repeat(16), kdy: 'podvrh' };
  const t4 = await uloz(z4);
  test('1 ZAP, jeden zákazník bez poznámky: nic, podvržené pole se neuloží', t4.status === 200
    && !('pdPoznamkaZakaznici' in t4) && ulozeno(t4.soubor).pdPoznamkaZakaznici === undefined, t4);
}

/* 2) založení, beze změny, úprava */
let Z2, ID2;
{
  const deal = dealy[2];
  Z2 = sVz(deal);
  const t = await uloz(Z2);
  const ul = ulozeno(t.soubor);
  const p = notes().filter(x => x.deal_id === deal);
  ID2 = ul.pdPoznamkaZakaznici && ul.pdPoznamkaZakaznici.id;
  test('2 první uložení: jedna poznámka u dealu, id v pdPoznamkaZakaznici', t.status === 200 && t.pdPoznamkaZakaznici === 'zalozeno'
    && p.length === 1 && ID2 === p[0].id && ul.pdPoznamkaZakaznici.deal === String(deal) && /^[0-9a-f]{16}$/.test(ul.pdPoznamkaZakaznici.otisk), { t, p });
  test('2 text poznámky (návrh § 7.2, řádky <br>, escapované)', p[0] && p[0].content === 'Další zákazníci na zakázce:<br>• TEST – DRUHÝ ODBĚRATEL s.r.o. — nabídka zatím neodeslána ('
    + cisloB(Z2) + ')<br>— nabídka ' + Z2.cislo, p[0] && p[0].content);
  test('2 poznámka šachet nevznikla (vypínač víc šachet VYP)', !('pdPoznamka' in t) && ul.pdPoznamkaSachty === undefined);
  const req = pozadavkyNotes().length;
  Z2.nazevAkce = 'TEST VZ-E5 beze změny zákazníků';
  const t2 = await uloz(Z2);
  test('2 bez změny textu: do Pipedrive nic', t2.status === 200 && t2.pdPoznamkaZakaznici === 'beze-zmeny' && pozadavkyNotes().length === req, t2);
  Z2.dalsiZakaznici[0].hlavicka.objednatel = 'TEST – PŘEJMENOVANÝ ODBĚRATEL a.s.';
  const t3 = await uloz(Z2);
  const p3 = notes().filter(x => x.deal_id === deal);
  test('2 změna názvu: poznámka UPRAVENA (PUT), pořád jedna', t3.pdPoznamkaZakaznici === 'upraveno' && p3.length === 1 && p3[0].id === ID2
    && /PŘEJMENOVANÝ/.test(p3[0].content) && pozadavkyNotes().slice(req).includes('PUT /api/v1/notes/' + ID2)
    && !pozadavkyNotes().slice(req).includes('POST /api/v1/notes'), { t3, p3 });
}

/* 3) převzetí podle úvodu a značky + poznámka zmizela */
{
  const soubor = (await uloz(Z2)).soubor;
  const raw = ulozeno(soubor);
  delete raw.pdPoznamkaZakaznici; pamet.set('zakazky/z/' + soubor, JSON.stringify(raw)); Z2.uloRazitko = raw.uloRazitko;
  G.vzPridej(Z2, UDAJE_C, { kdo: 'Test', kdy: '2026-11-16T11:00:00.000Z' });
  const t = await uloz(Z2);
  const p = notes().filter(x => x.deal_id === dealy[2]);
  test('3 ztracené id: převzata vlastní poznámka podle úvodu a značky (GET ?deal_id), žádná druhá', t.status === 200 && t.pdPoznamkaZakaznici === 'upraveno'
    && p.length === 1 && p[0].id === ID2 && ulozeno(soubor).pdPoznamkaZakaznici.id === ID2 && /TŘETÍ/.test(p[0].content), { t: t.pdPoznamkaZakaznici, p });
  SIM.pdSimSmazPoznamku(ID2);
  Z2.dalsiZakaznici[1].hlavicka.objednatel = 'TEST – TŘETÍ JINAK s.r.o.';
  const t2 = await uloz(Z2);
  const p2 = notes().filter(x => x.deal_id === dealy[2]);
  test('3 smazaná poznámka (404) → založena nová', t2.pdPoznamkaZakaznici === 'zalozeno' && p2.length === 1 && p2[0].id !== ID2
    && ulozeno(soubor).pdPoznamkaZakaznici.id === p2[0].id, { t2: t2.pdPoznamkaZakaznici, p2 });
  ID2 = p2[0].id;
}

/* 4) cizí id */
{
  const cizi = await uloz(sVz(dealy[3]));
  const idCizi = ulozeno(cizi.soubor).pdPoznamkaZakaznici.id;
  const obsahCizi = poznamka(idCizi).content;
  Z2.pdPoznamkaZakaznici = { deal: String(dealy[2]), id: idCizi, otisk: '0'.repeat(16), kdy: 'x' };
  Z2.dalsiZakaznici[0].hlavicka.objednatel = 'TEST – PODVRH ODBĚRATEL s.r.o.';
  const t = await uloz(Z2);
  test('4 podvržené id z prohlížeče se zahodí, platí uložené', t.status === 200 && ulozeno(t.soubor).pdPoznamkaZakaznici.id === ID2
    && /PODVRH/.test(poznamka(ID2).content) && poznamka(idCizi).content === obsahCizi, { t: t.pdPoznamkaZakaznici });
  /* uložená verze nese id poznámky jiného dealu (např. obnova ze souboru) */
  const z = sVz(dealy[4]);
  const t1 = await uloz(z);
  const id1 = ulozeno(t1.soubor).pdPoznamkaZakaznici.id;
  const raw = ulozeno(t1.soubor); raw.pdPoznamkaZakaznici.id = idCizi; pamet.set('zakazky/z/' + t1.soubor, JSON.stringify(raw)); z.uloRazitko = raw.uloRazitko;
  z.dalsiZakaznici[0].hlavicka.objednatel = 'TEST – OPRAVA ODBĚRATEL s.r.o.';
  const t2 = await uloz(z);
  test('4 uložené id cizího dealu: cizí nepřepsána, převzata vlastní podle značky', t2.status === 200 && t2.pdPoznamkaZakaznici === 'upraveno'
    && poznamka(idCizi).content === obsahCizi && ulozeno(t2.soubor).pdPoznamkaZakaznici.id === id1 && /OPRAVA/.test(poznamka(id1).content), t2.pdPoznamkaZakaznici);
}

/* 5) šachty ↔ zákazníci: obě v jednom uložení, vzájemně se nepřepíší */
{
  await vypinac({ viceSachet: true });
  const deal = dealy[5];
  const z = sVz(deal, { sachty: true });
  const t = await uloz(z);
  const ul = ulozeno(t.soubor);
  const p = notes().filter(x => x.deal_id === deal);
  const idS = ul.pdPoznamkaSachty && ul.pdPoznamkaSachty.id, idZ = ul.pdPoznamkaZakaznici && ul.pdPoznamkaZakaznici.id;
  test('5 obě poznámky v jednom uložení: dvě poznámky, každá svým úvodem', t.status === 200 && t.pdPoznamka === 'zalozeno' && t.pdPoznamkaZakaznici === 'zalozeno'
    && p.length === 2 && idS && idZ && idS !== idZ && /^Šachty v nabídce: /.test(poznamka(idS).content)
    && /^Další zákazníci na zakázce:/.test(poznamka(idZ).content), { t, p });
  /* prohozená id v uložené verzi: žádná poznámka se nepřepíše cizím druhem */
  const raw = ulozeno(t.soubor);
  raw.pdPoznamkaSachty.id = idZ; raw.pdPoznamkaZakaznici.id = idS;
  pamet.set('zakazky/z/' + t.soubor, JSON.stringify(raw)); z.uloRazitko = raw.uloRazitko;
  z.varianty[0].data.ock.dalsi[0].nazev = 'Výtah X';
  z.dalsiZakaznici[0].hlavicka.objednatel = 'TEST – PROHOZENÝ ODBĚRATEL s.r.o.';
  const t2 = await uloz(z);
  const ul2 = ulozeno(t2.soubor);
  test('5 id prohozená: šachty zůstaly šachtami, zákazníci zákazníky (převzato podle úvodu)', t2.status === 200
    && t2.pdPoznamka === 'upraveno' && t2.pdPoznamkaZakaznici === 'upraveno' && ul2.pdPoznamkaSachty.id === idS && ul2.pdPoznamkaZakaznici.id === idZ
    && /^Šachty v nabídce: .*Výtah X/.test(poznamka(idS).content) && /^Další zákazníci na zakázce:.*PROHOZENÝ/.test(poznamka(idZ).content)
    && notes().filter(x => x.deal_id === deal).length === 2, { t2, s: poznamka(idS).content, z: poznamka(idZ).content });
  test('5 jeNase: poznámka šachet není poznámkou zákazníků a naopak',
    !PP.pdPoznamkaZakJeNase(poznamka(idS).content, z) && !PP.pdPoznamkaJeNase(poznamka(idZ).content, z)
    && PP.pdPoznamkaZakJeNase(poznamka(idZ).content, z) && PP.pdPoznamkaJeNase(poznamka(idS).content, z)
    && PP.pdPoznamkaZakJeNase('<p>' + poznamka(idZ).content.replace(/<br>/g, '</p><p>') + '</p>', z)
    && !PP.pdPoznamkaZakJeNase(poznamka(idZ).content, Object.assign({}, z, { cislo: '1' + z.cislo })));
  await vypinac({ viceSachet: false });
}

/* 6) „žádní“ */
{
  const deal = dealy[6];
  const z = sVz(deal);
  const t = await uloz(z);
  const id = ulozeno(t.soubor).pdPoznamkaZakaznici.id;
  const r = G.vzOdstran(z, z.dalsiZakaznici[0].id, { smazatVariantu: true });
  const t2 = await uloz(z);
  test('6 po odstranění posledního dalšího: táž poznámka „žádní“, klíče VZ pryč', r.ok && t2.status === 200 && t2.pdPoznamkaZakaznici === 'upraveno'
    && poznamka(id).content === 'Další zákazníci na zakázce: žádní — nabídka ' + z.cislo
    && !('dalsiZakaznici' in ulozeno(t2.soubor)) && ulozeno(t2.soubor).pdPoznamkaZakaznici.id === id, { r, t2: t2.pdPoznamkaZakaznici, c: poznamka(id).content });
  const req = pozadavkyNotes().length;
  z.nazevAkce = 'TEST VZ-E5 žádní znovu';
  const t3 = await uloz(z);
  test('6 další uložení „žádní“: beze změny', t3.pdPoznamkaZakaznici === 'beze-zmeny' && pozadavkyNotes().length === req, t3.pdPoznamkaZakaznici);
  const t4 = await uloz(nova(dealy[7]));
  test('6 zakázka bez poznámky a bez dalších zákazníků: nic', t4.status === 200 && !('pdPoznamkaZakaznici' in t4) && pozadavkyNotes().length === req, t4);
  test('6 bez dealu: nic', (await uloz(sVz(null))).pdPoznamkaZakaznici === undefined && pozadavkyNotes().length === req);
}

/* 7) výpadek, strop, časový limit, společný rozpočet */
{
  const z = sVz(dealy[8]);
  const pred = pozadavkyNotes().length;
  SIM.pdSimNastav({ scenar: 'vypadek' });
  const t = await uloz(z);
  const kolik = pozadavkyNotes().length - pred;
  SIM.pdSimNastav({ scenar: '' });
  test('7 výpadek: uloženo, stav chyba, varování, bez id, jediný požadavek', t.status === 200 && t.pdPoznamkaZakaznici === 'chyba'
    && /Seznam dalších zákazníků se do poznámky dealu v Pipedrive nezapsal/.test(t.varovani || '') && ulozeno(t.soubor).pdPoznamkaZakaznici === undefined
    && kolik === 1, { t, kolik });
  z.nazevAkce = 'TEST VZ-E5 po výpadku';
  const t2 = await uloz(z);
  test('7 další uložení zápis zopakuje', t2.pdPoznamkaZakaznici === 'zalozeno' && notes().filter(x => x.deal_id === dealy[8]).length === 1, t2.pdPoznamkaZakaznici);
  let posledni = null;
  for (let i = 0; i < PP.PD_POZNAMKA_STROP + 2; i++) {
    z.dalsiZakaznici[0].hlavicka.objednatel = 'TEST – STROP ' + i;
    posledni = await uloz(z);
  }
  test('7 strop zápisů na deal: nad stropem nezapsáno, uložení s varováním', posledni.status === 200 && posledni.pdPoznamkaZakaznici === 'strop'
    && /strop/.test(posledni.varovani || ''), posledni);
  const s = await G.__TEST_ULOZISTE('pd_cache').cti('strop:poznamka-zakaznici:deal:' + dealy[8]);
  test('7 strop má vlastní klíč strop:poznamka-zakaznici:deal:<id> (šachty nečerpá)', s && s.pocet === PP.PD_POZNAMKA_STROP
    && (await G.__TEST_ULOZISTE('pd_cache').cti('strop:poznamka:deal:' + dealy[8])) === null, s);
  /* visi: obě poznámky hlásí chybu a celé uložení se vejde do rozpočtu */
  await vypinac({ viceSachet: true });
  const z2 = sVz(dealy[9], { sachty: true });
  SIM.pdSimNastav({ scenar: 'visi' });
  const t0 = Date.now();
  const t3 = await uloz(z2);
  const trvalo = Date.now() - t0;
  SIM.pdSimNastav({ scenar: '' });
  test('7 visi: obě poznámky chyba, varování o obou, uloženo', t3.status === 200 && t3.pdPoznamka === 'chyba' && t3.pdPoznamkaZakaznici === 'chyba'
    && /Seznam šachet/.test(t3.varovani || '') && /Seznam dalších zákazníků/.test(t3.varovani || '') && /neodpověděl/.test(t3.varovani || ''), { t3 });
  test('7 společný rozpočet: obě poznámky dohromady nejvýš PD_POZNAMKA_CELKEM_MS (+ rezerva)', trvalo < PP.PD_POZNAMKA_CELKEM_MS + 1500
    && trvalo >= 2 * PP.PD_POZNAMKA_VOLANI_MS - 200, trvalo);
  const t4 = await uloz(z2);
  test('7 po obnovení Pipedrive se obě zapíší', t4.pdPoznamka === 'zalozeno' && t4.pdPoznamkaZakaznici === 'zalozeno', t4);
  await vypinac({ viceSachet: false });
  /* prošlý termín rozpočtu: chyba bez volání a bez čerpání stropu */
  const z3 = sVz(dealy[10]);
  const req = SIM.pdSimStav().pozadavky.length;
  const r = await PP.pdPoznamkaDruhUlozeni(PP.PD_POZNAMKA_DRUH_ZAKAZNICI, z3, null,
    { zapnuto: true, relace: { role: 'Administrátor' }, termin: Date.now() - 1 });
  test('7 prošlý rozpočet: chyba, varování, žádné volání, strop nečerpán', r.stav === 'chyba' && !r.volano && /neodpověděl včas/.test(r.varovani || '')
    && SIM.pdSimStav().pozadavky.length === req && (await G.__TEST_ULOZISTE('pd_cache').cti('strop:poznamka-zakaznici:deal:' + dealy[10])) === null, r);
  /* rozpočet sdílený (pdPoznamkyUlozeni): šachty vyčerpají termín → zákazníci chyba bez volání */
  await vypinac({ viceSachet: true });
  const z4 = sVz(dealy[11], { sachty: true });
  let volani = 0;
  const puvodni = Date.now;
  const posun = PP.PD_POZNAMKA_CELKEM_MS + 1000;
  SIM.pdSimNastav({ poPozadavku: async (r) => { volani++; if (/^POST /.test(r)) { const t = puvodni(); Date.now = () => t + posun + (puvodni() - t); } } });
  let obe;
  try { obe = await PP.pdPoznamkyUlozeni(z4, null, { viceSachet: true, viceZakazniku: true, relace: { role: 'Administrátor' } }); }
  finally { Date.now = puvodni; SIM.pdSimNastav({ poPozadavku: null }); }
  test('7 společný termín: šachty zapsány, zákazníci po vyčerpání rozpočtu chyba bez volání (zkusí se příště)', obe.sachty.stav === 'zalozeno'
    && obe.zakaznici.stav === 'chyba' && !obe.zakaznici.volano && obe.volano === true && volani === 2
    && /neodpověděl včas/.test(obe.zakaznici.varovani || '') && z4.pdPoznamkaZakaznici === undefined && z4.pdPoznamkaSachty, { obe, volani });
  await vypinac({ viceSachet: false });
}

/* 8) bez práva crm.pipedrive */
{
  const { default: uzivatele } = await import(R + 'netlify/functions/uzivatele.mjs');
  const { default: zobrazeni } = await import(R + 'netlify/functions/zobrazeni.mjs');
  const x = await (await post(uzivatele, 'http://x/api/uzivatele', { akce: 'zaloz', email: 'obch.vze5@priklad.cz', jmeno: 'Obch VZE5', role: 'Obchodník', heslo: 'Heslo12345x' }, cA)).json();
  if (!x.ok) throw new Error('uzivatel ' + JSON.stringify(x));
  const cO = await prihlas('obch.vze5@priklad.cz', 'Heslo12345x');
  const pravo = async (hodnota) => {
    const m = await (await zobrazeni(new Request('http://x/api/zobrazeni', { headers: { cookie: cA } }))).json();
    const matice = kopie(m.matice || {});
    matice['crm.pipedrive'] = Object.assign({}, matice['crm.pipedrive'] || {}, { 'Obchodník': hodnota });
    return (await post(zobrazeni, 'http://x/api/zobrazeni', { matice, hesloSpravce: 'Docasne.Heslo.123' }, cA)).status;
  };
  test('8 příprava: právo crm.pipedrive obchodníkovi odebráno', (await pravo(false)) === 200);
  const z = sVz(null);
  const t0 = await uloz(z, cO);
  if (t0.status !== 200) throw new Error('obchodník ' + JSON.stringify(t0).slice(0, 300));
  await vypinac({ viceZakazniku: false });
  const za = ulozeno(t0.soubor); za.pdDealId = String(dealy[12]);
  const ta = await uloz(za);
  if (ta.status !== 200) throw new Error('správce ' + JSON.stringify(ta).slice(0, 300));
  await vypinac({ viceZakazniku: true });
  z.pdDealId = String(dealy[12]); z.uloRazitko = ta.razitko;
  z.dalsiZakaznici[0].hlavicka.objednatel = 'TEST – BEZ PRÁVA s.r.o.';
  const req = pozadavkyNotes().length;
  const t = await uloz(z, cO);
  test('8 bez práva: uloženo, stav bez-prava, bez varování, do Pipedrive nic', t.status === 200 && t.pdPoznamkaZakaznici === 'bez-prava'
    && !t.varovani && pozadavkyNotes().length === req, { s: t.status, p: t.pdPoznamkaZakaznici, v: t.varovani, ch: t.chyba });
  test('8 příprava: právo přiděleno', (await pravo(true)) === 200);
  z.nazevAkce = 'TEST VZ-E5 s právem';
  const t2 = await uloz(z, cO);
  test('8 s právem: zapsáno', t2.status === 200 && t2.pdPoznamkaZakaznici === 'zalozeno', t2.pdPoznamkaZakaznici);
}

/* 9) text */
{
  const z = sVz(dealy[13]);
  z.dalsiZakaznici[0].hlavicka.objednatel = '<b>A&B</b> "x" \'y\'\u0000\nZ';
  const t = await uloz(z);
  const c = poznamka(ulozeno(t.soubor).pdPoznamkaZakaznici.id).content;
  test('9 název s HTML escapovaný, řídicí znaky pryč', t.status === 200 && c.indexOf('• &lt;b&gt;A&amp;B&lt;/b&gt; &quot;x&quot; &#39;y&#39; Z — nabídka zatím') >= 0
    && !/<b>/.test(c), c);
  const zb = sVz(null);
  const txt = PP.pdPoznamkaZakText(zb, false, G);
  test('9 bez kontaktů, IČO, DIČ, adresy, slev a řídícího zákazníka', !/12345679|Zkušební|kontakt|sleva|TESTOVACÍ ODBĚRATEL/.test(txt) && /DRUHÝ ODBĚRATEL/.test(txt), txt);
  /* odeslaná nabídka (razítko tisku se zákazníkem, E3) ze zmrazeného zámku */
  const zo = nova(null);
  const p = G.vzPridej(zo, UDAJE_B, { vlastni: true, kdo: 'Test', kdy: '2026-11-16T10:00:00.000Z' });
  const vB = zo.varianty.find(v => v.id === zo.dalsiZakaznici[0].varianta);
  const vysl = G.zamekVysledekSpocti(vB, JEKLY);
  G.zamkniVariantu(vB, { kdy: '2026-11-12T09:30:00.000Z', typ: 'cn', cislo: G.variantaCislo(zo, vB), vysledek: vysl });
  vB.zamek.tisky[0].zakaznik = { id: zo.dalsiZakaznici[0].id, pismeno: 'B', cislo: G.variantaCislo(zo, vB) + '-B', objednatel: UDAJE_B.objednatel, ico: '' };
  const cena = G.cenaNabidkyOck(vysl.ock, vB.data.sleva || {}, vB.data.zaokr).cena;
  const ocek = G.vzpCena(cena, 'CZK');
  G.vzPridej(zo, UDAJE_C, { kdo: 'Test', kdy: '2026-11-16T10:00:00.000Z' });
  const t1 = PP.pdPoznamkaZakText(zo, false, G);
  test('9 odeslaná nabídka: CN <číslo z razítka> z <den>, <cena> Kč bez DPH', p.ok && cena > 0 && /^\d{1,3}( \d{3})*(,\d\d)? Kč$/.test(ocek)
    && t1.indexOf('• TEST – DRUHÝ ODBĚRATEL s.r.o. — CN ' + G.variantaCislo(zo, vB) + '-B z 12. 11. 2026, ' + ocek + ' bez DPH\n') >= 0, { t1, ocek });
  test('9 zákazník bez razítka tisku: neodeslaná (razítko jiného zákazníka se nepočítá)',
    t1.indexOf('• TEST – TŘETÍ ODBĚRATEL s.r.o. — nabídka zatím neodeslána (' + zo.cislo + '-C)\n') >= 0, t1);
  /* rozpracovaná nová varianta zákazníka */
  const v3 = G.klonujVariantu ? G.klonujVariantu(zo, vB) : null;
  if (v3) {
    zo.dalsiZakaznici[0].varianta = v3.id;
    const t2 = PP.pdPoznamkaZakText(zo, false, G);
    test('9 připravuje se nová <číslo>', t2.indexOf('bez DPH; připravuje se nová ' + G.variantaCislo(zo, v3) + '-B') >= 0, t2);
    /* pozdější odeslání jiné varianty témuž zákazníkovi: platí poslední */
    G.zamkniVariantu(v3, { kdy: '2026-11-14T09:30:00.000Z', typ: 'cn', cislo: G.variantaCislo(zo, v3), vysledek: G.zamekVysledekSpocti(v3, JEKLY) });
    v3.zamek.tisky[0].zakaznik = { id: zo.dalsiZakaznici[0].id, pismeno: 'B', cislo: G.variantaCislo(zo, v3) + '-B', objednatel: UDAJE_B.objednatel, ico: '' };
    const t2b = PP.pdPoznamkaZakText(zo, false, G);
    test('9 platí poslední odeslaná nabídka (podle času tisku)', t2b.indexOf('— CN ' + G.variantaCislo(zo, v3) + '-B z 14. 11. 2026') >= 0
      && !/připravuje/.test(t2b), t2b);
    delete v3.zamek;
    zo.dalsiZakaznici[0].varianta = vB.id;
  } else test('9 připravuje se nová (klonujVariantu chybí)', false);
  /* VZ-E3 (#602, N6): platna = vzPlatna ze zámků; uložená hodnota je jen
   * kopie pro rejstřík — text poznámky se z ní neskládá (podvrh se neprojeví). */
  zo.dalsiZakaznici[0].platna = { varianta: vB.id, cislo: 'X-1-B', kdy: '2026-11-14T08:00:00.000Z', cena: 1333000, mena: 'CZK' };
  test('9 E3: platna se počítá ze zámků (uložená hodnota se neuplatní)', PP.pdPoznamkaZakText(zo, false, G).indexOf('X-1-B') < 0);
  delete zo.dalsiZakaznici[0].platna;
  /* po prodeji ostatní „— neprodáno“ */
  const vR = zo.varianty[0];
  G.zamkniVariantu(vR, { kdy: '2026-11-13T09:00:00.000Z', typ: 'cn', cislo: zo.cislo, vysledek: G.zamekVysledekSpocti(vR, JEKLY) });
  vR.prodano = { datum: '2026-11-15', kdo: 'test', kdy: '2026-11-15T10:00:00.000Z', pipedrive: { stav: 'ceka', kdy: '2026-11-15T10:00:00.000Z' } };
  const t3 = PP.pdPoznamkaZakText(zo, false, G);
  test('9 prodáno řídícímu: další zákazník „— neprodáno“', /bez DPH — neprodáno\n/.test(t3), t3);
  vR.prodano.zakaznik = zo.dalsiZakaznici[0].id;
  const t4 = PP.pdPoznamkaZakText(zo, false, G);
  test('9 prodáno tomuto zákazníkovi: u něj bez „neprodáno“, u ostatních ano', /bez DPH\n/.test(t4) && !/bez DPH — neprodáno/.test(t4)
    && /-C\) — neprodáno\n/.test(t4), t4);
  /* strop 2 000 znaků */
  const zs = nova(null);
  for (let i = 0; i < 9; i++) {
    const r = G.vzPridej(zs, { objednatel: 'TEST ' + String.fromCharCode(65 + i) + ' ' + 'x'.repeat(480), adresaObjednatele: '', ico: '', dic: '', kontakt: '' }, { kdo: 'T', kdy: '2026-11-16T10:00:00.000Z' });
    if (!r.ok) throw new Error('vzPridej ' + JSON.stringify(r));
  }
  const ts = G.vzPoznamkaText(zs);
  const radky = ts.split('\n');
  test('9 strop 2 000 znaků s „… a další N“', ts.length <= G.VZP_MAX && /^… a další \d+$/.test(radky[radky.length - 1])
    && radky.length - 2 + +radky[radky.length - 1].replace(/\D/g, '') === 9, { delka: ts.length, posledni: radky[radky.length - 1], radku: radky.length });
  test('9 vzpDen a vzpCena', G.vzpDen('2026-11-11T23:30:00.000Z') === '12. 11. 2026' && G.vzpDen('x') === ''
    && G.vzpCena(1333000, 'CZK') === '1 333 000 Kč' && G.vzpCena(1234.5, 'CZK') === '1 234,50 Kč' && G.vzpCena(null) === '' && G.vzpCena(10, 'EUR') === '10 EUR');
  test('9 jeden zákazník: vzPoznamkaText prázdný, se „zadni“ věta žádní', G.vzPoznamkaText(nova(null)) === '' && G.vzPoznamkaText(nova(null), { zadni: true }) === G.VZP_ZADNI);
}

console.log(ok + ' OK, ' + fail + ' FAIL');
if (fail) process.exit(1);
