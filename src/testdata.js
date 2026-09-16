/* ============================================================
 * UKÁZKOVÉ ZAKÁZKY PRO TESTOVACÍ WEB
 * (16. 9. 2026, zadání J. V.: „testovací rozhraní musí mít vlastní dummy
 *  data a jiný barevný vizuál")
 *
 * PROČ TENHLE SOUBOR NEOBSAHUJE ANI JEDNU CENU. Pravidlo z 30. 7. 2026 —
 * „ukázkový ceník z aplikace vymaž, s tím nabídka ven jít nesmí" — platí
 * i pro testovací web, protože sestavení je JEDNO pro obě prostředí.
 * Kdyby sem někdo dal sazby, jely by v ostrém webu taky a existovala by
 * cesta, jak poslat zákazníkovi nabídku spočítanou z vymyšlených čísel.
 *
 * Zdejší zakázky proto nesou jen ZADÁNÍ — rozměry, počty, zaškrtávátka —
 * a ceník si vezmou ten, který je na daném webu zveřejněný. Na testovacím
 * webu se zveřejní zkušební ceník ze souboru (Nastavení → Program →
 * Zveřejnit ceník ze souboru), na ostrém by tyhle zakázky nevznikly vůbec:
 * `testDataSmi()` je pustí jen tam, kde server hlásí PROSTREDI=test.
 *
 * KAŽDÁ ZAKÁZKA JE K NĚČEMU. Nejsou to náhodná čísla — každá stojí na
 * jednom nálezu z testování, aby se dal proklikat bez vymýšlení vstupů.
 * Jména objednatelů jsou smyšlená a jako taková označená; čísla nabídek
 * mají řadu 9xxx, která se v ostré databázi nepoužívá.
 * ============================================================ */

const TESTDATA_RADA = '2026 - OPR - CN - 9';

/* Zadání se skládají PŘES výchozí zadání aplikace, ne místo něj — nová pole
 * (přibývají skoro každou dávkou) tím dostanou své výchozí hodnoty samy. */
const TESTDATA_ZAKAZKY = [
  {
    cislo: TESTDATA_RADA + '001',
    nazevAkce: 'TEST — interiérová šachta, zasklení mezi příčníky',
    objednatel: 'Ukázkový objednatel A (smyšlený)',
    kontakt: 'Jan Zkušební', adresa: 'Zkušební 1, Praha',
    proc: 'C3 — technická specifikace musí psát VSG, ne izolační dvojsklo.',
    zadani: { typSachty: 'interiérová', zaskleni: 'mezi příčníky', typPortalu: 'zapuštěný',
      sirka: 1.6, hloubka: 1.8, zdvih: 9, prejezd: 3.2, prohluben: 1.2, roztec: 1.25,
      nastupiste: 4, rohoveSloupky: 4, cistyVstupMm: 900, sirkaRamuMm: 100 },
  },
  {
    cislo: TESTDATA_RADA + '002',
    nazevAkce: 'TEST — interiérová šachta, zasklení na terče',
    objednatel: 'Ukázkový objednatel B (smyšlený)',
    kontakt: 'Petra Zkušební', adresa: 'Zkušební 2, Praha',
    proc: 'V42 — na terče patří jiné sklo než do lišt; Detail výpočtu to má říct.',
    zadani: { typSachty: 'interiérová', zaskleni: 'na terče', typPortalu: 'zapuštěný',
      sirka: 1.6, hloubka: 1.8, zdvih: 9, prejezd: 3.2, prohluben: 1.2, roztec: 1.25,
      nastupiste: 4, rohoveSloupky: 4, cistyVstupMm: 900, sirkaRamuMm: 100 },
  },
  {
    cislo: TESTDATA_RADA + '003',
    nazevAkce: 'TEST — průchozí šachta se světlíkem nad dveřmi',
    objednatel: 'Ukázkový objednatel C (smyšlený)',
    kontakt: 'Tomáš Zkušební', adresa: 'Zkušební 3, Praha',
    proc: 'O10/V40 — pás nad dveřmi nástupišť C se nesmí počítat dvakrát.',
    zadani: { typSachty: 'interiérová', zaskleni: 'na terče', typPortalu: 'zapuštěný',
      sirka: 1.6, hloubka: 1.8, zdvih: 9, prejezd: 3.2, prohluben: 1.2, roztec: 1.25,
      pruchoziSachta: true, nastupisteA: 2, nastupisteC: 2, patra: 3, nastupiste: 4,
      rohoveSloupky: 4, svetlikNadDvermi: true, cistyVstupMm: 900, sirkaRamuMm: 100 },
  },
  {
    cislo: TESTDATA_RADA + '004',
    nazevAkce: 'TEST — exteriérová šachta, ATYP',
    objednatel: 'Ukázkový objednatel D (smyšlený)',
    kontakt: 'Eva Zkušební', adresa: 'Zkušební 4, Praha',
    proc: 'C1/V39 — přepínač ATYP nesmí přepsat ručně zadané hodnoty.',
    zadani: { typSachty: 'exteriérová', zaskleni: 'na terče', typPortalu: 'předsazený',
      sirka: 1.8, hloubka: 2.0, zdvih: 12, prejezd: 3.5, prohluben: 1.2, roztec: 1.25,
      nastupiste: 5, rohoveSloupky: 4, striskaKs: 1, cistyVstupMm: 900, sirkaRamuMm: 100 },
  },
  {
    cislo: TESTDATA_RADA + '005',
    nazevAkce: 'TEST — šachta v zrcadle schodiště',
    objednatel: 'Ukázkový objednatel E (smyšlený)',
    kontakt: 'Marek Zkušební', adresa: 'Zkušební 5, Praha',
    proc: 'C5 — dozdění kolem šachetních dveří se tady nemá nabízet.',
    /* Umístění je pole SPECIFIKACE, ne zadání — proto se dosazuje zvlášť. */
    techspec: { umisteni: 'v interiéru - v zrcadle schodiště' },
    zadani: { typSachty: 'interiérová', zaskleni: 'mezi příčníky', typPortalu: 'zapuštěný',
      sirka: 1.4, hloubka: 1.6, zdvih: 7.5, prejezd: 3.2, prohluben: 1.0, roztec: 1.25,
      nastupiste: 4, rohoveSloupky: 4, cistyVstupMm: 800, sirkaRamuMm: 100 },
  },
  {
    cislo: TESTDATA_RADA + '006',
    nazevAkce: 'TEST — zahraniční zakázka (EN/DE tisk)',
    objednatel: 'Ukázkový objednatel F (smyšlený, DE)',
    kontakt: 'Hans Zkušební', adresa: 'Musterstraße 1, Konstanz, Deutschland',
    proc: 'D1/D3 — tisk v cizím jazyce a název akce jako výběr, ne věta s lomítkem.',
    zahr: true,
    zadani: { typSachty: 'exteriérová', zaskleni: 'na terče', typPortalu: 'předsazený',
      sirka: 1.7, hloubka: 1.9, zdvih: 10.5, prejezd: 3.4, prohluben: 1.2, roztec: 1.25,
      nastupiste: 4, rohoveSloupky: 4, cistyVstupMm: 900, sirkaRamuMm: 100 },
  },
];

/* Smí se vůbec sypat ukázková data? Jen na testovacím webu a jen adminovi.
 * Ptá se SERVERU (PROSTREDI=test v /api/zdravi), ne adresy v prohlížeči —
 * adresu si lze vymyslet, proměnnou prostředí ne. */
function testDataSmi(stav, jeSpravce) {
  return !!(stav && stav.prostredi === 'test' && jeSpravce);
}

/* Postaví zakázku podle předpisu. Ceník se NEDOSAZUJE: zůstane ten, se kterým
 * vzniká každá nová zakázka, a přepočte se na zveřejněný ceník při otevření
 * (uloSrovnejSPlatnymCenikem) — stejnou cestou jako u skutečné nabídky. */
function testDataZakazka(predpis, nova) {
  const zak = nova();
  zak.cislo = predpis.cislo;
  zak.nazevAkce = predpis.nazevAkce;
  zak.objednatel = predpis.objednatel;
  zak.kontakt = predpis.kontakt || '';
  zak.adresa = predpis.adresa || '';
  const v = zak.varianty[0];
  Object.assign(v.data.ock.zadani, predpis.zadani || {});
  if (predpis.zahr) v.data.cenikRada = 'zahr';
  if (predpis.techspec) {
    v.data.techspec = v.data.techspec || { hodnoty: {}, extra: [] };
    v.data.techspec.hodnoty = Object.assign({}, v.data.techspec.hodnoty, predpis.techspec);
  }
  /* Proč zakázka existuje, patří do zápisníku — ne do názvu akce, který jde
   * na dokument zákazníkovi. Zápisník se netiskne (pravidlo #37). */
  if (predpis.proc && typeof poznamkyPridej === 'function') {
    poznamkyPridej(zak, 'UKÁZKOVÁ ZAKÁZKA TESTOVACÍHO WEBU. K čemu je: '
      + predpis.proc + ' Data jsou smyšlená, nabídku odsud neposílejte.',
      { druh: 'jine', kdo: 'testovací data' });
  }
  return zak;
}

if (typeof module !== 'undefined')
  module.exports = { TESTDATA_ZAKAZKY, TESTDATA_RADA, testDataSmi, testDataZakazka };
