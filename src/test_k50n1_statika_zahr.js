/* K50-N1 (kolo 50, 19. 11. 2026): statika opláštění v ZAHRANIČNÍ řadě.
 *
 * Od #667 (v19.11.1) má statika opláštění vlastní klíč `C.statikaOplKc`.
 * Migrace (cenikMigraceStatikyOpl) ho v tuzemském ceníku předvyplní
 * TUZEMSKOU statikou; zahraniční řada ho nemá, takže skládání řady nechalo
 * českou sazbu — zahraniční nabídka zlevnila (statika opláštění i přirážka
 * ATYP). Do #667 brala statika opláštění zahraniční `C.statikaKc`.
 *
 * Hlídá se:
 *   1. složení řady (cenikSlozRadu): zahraniční bez vlastní statiky opláštění
 *      = zahraniční statika; vlastní zahraniční statikaOplKc má přednost;
 *      tuzemská řada beze změny; bez zahraniční statiky platí tuzemská;
 *   2. dnešní ceník pro přepočet (cenikDnesniProRadu) a pro výjimky
 *      (vyjimkyDnesniZProgramu) — tytéž hodnoty;
 *   3. dialog přepnutí řady ukáže výchozí hodnotu;
 *   4. výpočet: řádek STATICKÉ POSOUZENÍ OPLÁŠTĚNÍ se zahraniční sazbou;
 *   5. přepočet zakázky: zamčená zahraniční varianta se nemění.
 * Čísla jsou smyšlená (zkušební ceník + částky v testu).
 *
 * Pojistka: proti a3fad44 (před opravou) padají oddíly 1–4 (sazba zůstala
 * tuzemská); po opravě projdou.
 * Spuštění: node src/test_k50n1_statika_zahr.js */
const nacti = f => { const m = require(f); Object.keys(m).forEach(k => { global[k] = m[k]; }); return m; };
nacti('./format.js'); nacti('./cenik.js'); nacti('./cenik_stari.js');
const R = nacti('./cenik_rady.js');
const E = nacti('./engine.js');
nacti('./engine_proj.js'); nacti('./techspec.js'); nacti('./zamek.js'); nacti('./poznamky.js');
nacti('./zakazka.js'); nacti('./vyjimky.js');
const ZC = require('./zkusebni_cenik.js');
const J = require('./jekly.json');

let ok = 0, fail = 0;
const test = (n, c, info) => { if (c) { ok++; console.log('OK  ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info).slice(0, 300)); } };
const kop = x => JSON.parse(JSON.stringify(x));

const CR_STATIKA = 1000, ZAHR_STATIKA = 5000, ZAHR_OPL = 4200;      // smyšlené
/* Tuzemský ceník po migraci (#667): statikaOplKc = tuzemská statika. */
const CR = () => { const c = Object.assign(kop(E.DEFAULT_CENIK), ZC.zkusebniCenik(),
  { statikaKc: CR_STATIKA, statikaOplHod: 6 }); delete c.statikaOplKc; E.cenikMigraceStatikyOpl(c); return c; };
const zahr = (ceny) => ({ ceny: Object.assign({ 'C.statikaKc': ZAHR_STATIKA }, ceny || {}), jenZahr: {} });

test('příprava: migrace dosadila tuzemskou statiku opláštění', CR().statikaOplKc === CR_STATIKA, CR().statikaOplKc);

/* 1) složení řady */
{
  const s = R.cenikSlozRadu(CR(), zahr(), 'zahr');
  test('zahraniční řada bez vlastní statiky opláštění = zahraniční statika', s.statikaOplKc === ZAHR_STATIKA, s.statikaOplKc);
  test('… a statika OCK zahraniční', s.statikaKc === ZAHR_STATIKA, s.statikaKc);
  const s2 = R.cenikSlozRadu(CR(), zahr({ 'C.statikaOplKc': ZAHR_OPL }), 'zahr');
  test('vlastní zahraniční statika opláštění má přednost', s2.statikaOplKc === ZAHR_OPL, s2.statikaOplKc);
  const s3 = R.cenikSlozRadu(CR(), { ceny: { 'C.montazHodKc': 777 }, jenZahr: {} }, 'zahr');
  test('bez zahraniční statiky platí tuzemská (nic se nevymýšlí)', s3.statikaOplKc === CR_STATIKA, s3.statikaOplKc);
  const t = R.cenikSlozRadu(CR(), zahr(), 'cr');
  test('tuzemská řada beze změny', t.statikaOplKc === CR_STATIKA && t.statikaKc === CR_STATIKA, [t.statikaKc, t.statikaOplKc]);
  test('výchozí hodnota se do odchylek neukládá', !('C.statikaOplKc' in R.cenikZahrOciste(zahr()).ceny));
}

/* 2) dnešní ceník pro přepočet a výjimky */
{
  const d = R.cenikDnesniProRadu({ cenik: CR(), proj: { cenik: ZC.zkusebniCenikProj() } }, zahr(), 'zahr');
  test('cenikDnesniProRadu (přepočet): zahraniční statika opláštění', d.cenik.statikaOplKc === ZAHR_STATIKA, d.cenik.statikaOplKc);
  const dc = R.cenikDnesniProRadu({ cenik: CR(), proj: { cenik: ZC.zkusebniCenikProj() } }, zahr(), 'cr');
  test('cenikDnesniProRadu tuzemsko beze změny', dc.cenik.statikaOplKc === CR_STATIKA, dc.cenik.statikaOplKc);
  /* Platný ceník ze záznamu programu — zveřejněná verze bez klíče (migrace v té funkci). */
  const pc = CR(); delete pc.statikaOplKc;
  const v = vyjimkyDnesniZProgramu({ cenik: pc, cenikProj: ZC.zkusebniCenikProj(), zahranicni: zahr(), verze: 50 },
    { cenikRada: 'zahr' });
  test('vyjimkyDnesniZProgramu: zahraniční statika opláštění', v && v.cenik.statikaOplKc === ZAHR_STATIKA, v && v.cenik.statikaOplKc);
}

/* 3) dialog přepnutí řady */
{
  const r = R.cenikRadaRozdily(CR(), zahr()).find(x => x.cesta === 'C.statikaOplKc');
  test('dialog přepnutí ukáže statiku opláštění jako výchozí (ze zahraniční statiky)',
    r && r.zahr === ZAHR_STATIKA && r.cr === CR_STATIKA && r.vychozi === true, r);
  const d = { cenik: CR(), proj: { cenik: ZC.zkusebniCenikProj() } };
  R.cenikRadaPrepni(d, { cenik: CR(), proj: { cenik: ZC.zkusebniCenikProj() } }, zahr(), 'zahr');
  test('přepnutí varianty na zahraničí přepne i statiku opláštění', d.cenik.statikaOplKc === ZAHR_STATIKA, d.cenik.statikaOplKc);
  R.cenikRadaPrepni(d, { cenik: CR(), proj: { cenik: ZC.zkusebniCenikProj() } }, zahr(), 'cr');
  test('návrat do tuzemska vrátí tuzemskou statiku opláštění', d.cenik.statikaOplKc === CR_STATIKA, d.cenik.statikaOplKc);
}

/* 4) výpočet */
{
  const z = Object.assign(kop(E.DEFAULT_ZADANI), { typSachty: 'exteriérová', profily: kop(E.PROFILY_VYCHOZI['exteriérová']),
    sirka: 1.6, hloubka: 1.8, zdvih: 9, prejezd: 3.2, prohluben: 1.2, nastupiste: 4, statikaOpl: true });
  const radek = (c) => (E.vypocet(kop(z), c, J, true).sekce.rezie || []).find(i => i.origNazev === 'STATICKÉ POSOUZENÍ OPLÁŠTĚNÍ');
  const rZ = radek(R.cenikSlozRadu(CR(), zahr(), 'zahr'));
  test('zahraniční zakázka: řádek statiky opláštění se zahraniční sazbou', rZ && rZ.cena === ZAHR_STATIKA, rZ);
  const rC = radek(R.cenikSlozRadu(CR(), zahr(), 'cr'));
  test('tuzemská zakázka: tuzemská sazba', rC && rC.cena === CR_STATIKA, rC);
}

/* 5) přepočet zakázky: zamčená zahraniční varianta (uložená s chybnou sazbou
 *    v19.11.1) se nemění; rozpracovaná dostane zahraniční sazbu. */
{
  const zak = novaZakazka();
  const mk = (id, zamcena) => { const v = kop(zak.varianty[0]); v.id = id; v.ridici = id === 'a';
    v.data.cenikRada = 'zahr';
    v.data.cenik = R.cenikSlozRadu(CR(), zahr(), 'zahr');
    v.data.cenik.statikaOplKc = CR_STATIKA;                 // jako po chybě v19.11.1
    if (zamcena) v.zamek = { zamceno: true, typ: 'nabidka', kdy: '2026-11-19T08:00:00Z', kdo: 'Test' };
    return v; };
  zak.varianty = [mk('a', true), mk('b', false)];
  const vys = cenikPrepoctiRozpracovane(zak, { cenik: CR(), proj: { cenik: ZC.zkusebniCenikProj() } }, { zahr: zahr() });
  test('zamčená zahraniční varianta: statika opláštění beze změny', zak.varianty[0].data.cenik.statikaOplKc === CR_STATIKA,
    zak.varianty[0].data.cenik.statikaOplKc);
  test('… a přepočet ji hlásí jako zamčenou', vys && vys.zamcene === 1, vys);
  test('rozpracovaná zahraniční varianta: přepočet vrátí zahraniční statiku opláštění',
    zak.varianty[1].data.cenik.statikaOplKc === ZAHR_STATIKA, zak.varianty[1].data.cenik.statikaOplKc);
}

console.log(`\n${ok} OK, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
