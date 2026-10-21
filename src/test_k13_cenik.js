/* P3 (K13-N55) a P4 (K13-N58), test 13. kola 24. 9. 2026.
 *
 * P3: každá nová zakázka po prvním otevření ze serveru hlásila „Ceník se
 * změnil, změnily se 2 ceny". Server při importu doplní klíč, který v ceníku
 * zakázky chybí, nulou (cenikDoplnKlice); platný ceník testu ho ale nenese
 * vůbec (je starší než ten klíč). cenikRozdily bral 0 proti ničemu jako změnu.
 *
 * P4: ruční sazba DPH v hlavičce svítila ve varování náhledu jako rozdíl
 * ceníku („Sazba DPH −42,9 %"), i když ji automatický přepočet správně
 * vynechává (CENIK_ZAKAZKOVE). */
const eng = require('./engine.js');
const ZC = require('./zkusebni_cenik.js');
const KOD = Object.assign(JSON.parse(JSON.stringify(eng.DEFAULT_CENIK)), ZC.zkusebniCenik());   // ceník, jak ho zná kód (server)
global.vypocet = eng.vypocet; global.DEFAULT_ZADANI = eng.DEFAULT_ZADANI; global.DEFAULT_CENIK = KOD;
const ep = require('./engine_proj.js');
global.DEFAULT_ZADANI_PROJ = ep.DEFAULT_ZADANI_PROJ; global.DEFAULT_CENIK_PROJ = ZC.zkusebniCenikProj();
global.cenikDoplnKlice = eng.cenikDoplnKlice; global.cenikMigraceLeseni = eng.cenikMigraceLeseni;
const tsm = require('./techspec.js');
global.TECHSPEC_DEF = tsm.TECHSPEC_DEF; global.tsHodnota = tsm.tsHodnota; global.DEFAULT_TECHSPEC = tsm.DEFAULT_TECHSPEC;
const sl = require('./sleva.js');
global.slevaPodil = sl.slevaPodil; global.slevaDefault = sl.slevaDefault;
const ck = require('./cenik.js');
global.CENIK_DEF = ck.CENIK_DEF; global.CENIK_DEF_PROJ = ck.CENIK_DEF_PROJ;
global.cenikGet = ck.cenikGet; global.cenikSet = ck.cenikSet; global.cenikVychozi = ck.cenikVychozi;
const zk = require('./zakazka.js');
global.novaVarianta = zk.novaVarianta; global.novaVariantaData = zk.novaVariantaData;
global.zadaniZCeniku = zk.zadaniZCeniku; global.zadaniRucniZnac = zk.zadaniRucniZnac;
global.zadaniRucniZrus = zk.zadaniRucniZrus; global.zadaniRucniJe = zk.zadaniRucniJe;
global.aktivniVarianta = zk.aktivniVarianta; global.ridiciVarianta = zk.ridiciVarianta;
global.hlavickaVyplneno = zk.hlavickaVyplneno; global.ZAK_CISLO_PREDLOHA = zk.ZAK_CISLO_PREDLOHA;
const zm = require('./zamek.js');
global.zajistiZamek = zm.zajistiZamek; global.variantaCislo = zm.variantaCislo;
global.variantaUzamcena = zm.variantaUzamcena; global.dokumentPopis = zm.dokumentPopis;
const ukz = require('./ukazkove.js');
global.ukazkoveSrovnejZnacku = ukz.ukazkoveSrovnejZnacku;
const cs = require('./cenik_stari.js');
Object.assign(global, cs);

let ok = 0, fail = 0;
const test = (n, c, info) => { if (c) { ok++; console.log('OK  ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info)); } };
const kop = x => JSON.parse(JSON.stringify(x));
const CHYBI = ['cetrisKc', 'zaskleniListyProjHod'];

/* Platný ceník v prohlížeči = program ze serveru, starší než oba klíče.
 * Hodnoty v něm jsou nulové stejně jako v testovacím webu (klíč v kódu 0). */
const platny = kop(KOD); CHYBI.forEach(k => delete platny[k]);
const dnesni = () => ({ cenik: kop(platny), proj: { cenik: kop(DEFAULT_CENIK_PROJ) } });

function zakazkaPoUlozeni(upravCenik) {
  global.DEFAULT_CENIK = platny;                // klient zakládá z platného ceníku
  const z = zk.novaZakazka(); z.cislo = '2026 - OPR - CN - 9130'; z.nazevAkce = 'K13';
  if (upravCenik) upravCenik(z.varianty[0].data.cenik);
  global.DEFAULT_CENIK = KOD;                   // server importuje s ceníkem z kódu
  const u = zk.importZakazka(kop(z));
  global.DEFAULT_CENIK = platny;
  return u;
}

/* P3 — nová zakázka. */
{
  const u = zakazkaPoUlozeni();
  const c = u.varianty[0].data.cenik;
  test('P3 příprava: po importu nese zakázka oba klíče s nulou (jako na serveru)',
    CHYBI.every(k => c[k] === 0), CHYBI.map(k => c[k]));
  const rozd = cs.cenikRozdily(u.varianty[0].data, dnesni());
  test('P3: 0 v zakázce proti chybějícímu klíči v ceníku není rozdíl', rozd.length === 0, rozd.map(r => r.cesta));
  const vysl = cs.cenikPrepoctiRozpracovane(u, dnesni(), { verze: 1 });
  test('P3: otevření nad platným ceníkem nic nepřepočítá (žádný dialog)',
    vysl.prepocteno === 0 && vysl.zmen === 0, vysl);
  test('P3: klíče v zakázce zůstaly (přepočet je nesmazal)', CHYBI.every(k => c[k] === 0), CHYBI.map(k => c[k]));
  const pr = cs.cenikPrehled(u.varianty[0], dnesni(), { dnes: '2026-09-24' });
  test('P3: ani lišta varování nesvítí', pr.varovat === false, pr.souhrn);
}

/* P3 — skutečná změna se hlásit musí. */
{
  const u = zakazkaPoUlozeni(c => { c.cetrisKc = 1234; });
  const rozd = cs.cenikRozdily(u.varianty[0].data, dnesni());
  test('P3: nenulová položka, která v ceníku chybí, je rozdíl', rozd.some(r => r.cesta === 'C.cetrisKc'), rozd.map(r => r.cesta));
  const vysl = cs.cenikPrepoctiRozpracovane(u, dnesni(), { verze: 1 });
  test('P3: a přepočet ji zachytí', vysl.prepocteno === 1 && vysl.zmen >= 1, vysl);
  /* Opačně: ceník má nenulovou hodnotu, zakázka klíč nemá. */
  const d = dnesni(); d.cenik.cetrisKc = 500;
  const data = kop(u.varianty[0].data); delete data.cenik.cetrisKc;
  test('P3: chybějící klíč v zakázce proti nenule v ceníku je rozdíl',
    cs.cenikRozdily(data, d).some(r => r.cesta === 'C.cetrisKc'));
  /* Změna z nenuly na nulu. */
  const d0 = dnesni(); const data2 = kop(u.varianty[0].data); data2.cenik.cetrisKc = 800; d0.cenik.cetrisKc = 0;
  test('P3: změna z nenuly na nulu je rozdíl', cs.cenikRozdily(data2, d0).some(r => r.cesta === 'C.cetrisKc'));
}

/* P4 — ruční DPH. */
{
  const u = zakazkaPoUlozeni();
  const v = u.varianty[0];
  const d = dnesni();
  v.data.cenik.dph = 0.21; d.cenik.dph = 0.12;
  const pr = cs.cenikPrehled(v, d, { dnes: '2026-09-24' });
  test('P4: ruční sazba DPH sama nevaruje', pr.varovat === false, pr.souhrn);
  test('P4: v seznamu rozdílů (okno přepočtu) zůstává', pr.rozdily.some(r => r.cesta === 'C.dph'));
  test('P4: text varování je prázdný', cs.cenikVarovaniText(pr) === '', cs.cenikVarovaniText(pr));
  v.data.cenik.marze = 0.4; d.cenik.marze = 0.3;
  test('P4: ani přirážka nevaruje', cs.cenikPrehled(v, d, { dnes: '2026-09-24' }).varovat === false);

  /* Skutečně změněná cena varuje dál — a souhrn nepočítá DPH. */
  const klic = Object.keys(d.cenik).find(k => typeof d.cenik[k] === 'number' && d.cenik[k] > 10 && k !== 'dph');
  d.cenik[klic] = d.cenik[klic] * 1.5;
  const pr2 = cs.cenikPrehled(v, d, { dnes: '2026-09-24' });
  test('P4: změněná cena varuje', pr2.varovat === true, { klic, souhrn: pr2.souhrn });
  test('P4: souhrn varování počítá jen ceny (1 položka, ne DPH a přirážka)', pr2.souhrn.pocet === 1, pr2.souhrn);
  const t = cs.cenikVarovaniText(pr2);
  test('P4: text říká směr: dnes +50 % proti kalkulaci', /dnes \+50 % proti kalkulaci/.test(t), t);
}

console.log(`\n${ok} prošlo, ${fail} selhalo`);
process.exit(fail ? 1 : 0);
