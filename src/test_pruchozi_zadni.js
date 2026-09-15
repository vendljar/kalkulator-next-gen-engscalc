/* ===== PRŮCHOZÍ ŠACHTA: ZADNÍ STĚNA S NÁSTUPIŠTI =====
 * (nález V37 / úkol O8, 3. kolo testů, 14. 9. 2026)
 *
 * ROZHODNUTÍ J. V.: „U průchozí šachty se musí v případě nástupišť počítat
 * s tím, že v nich jsou portály + světlíky. Ostatní patra se počítají jako
 * plné zasklení."
 *
 * CO BYLO ŠPATNĚ
 * Od 9. 9. se nástupiště průchozí šachty rozpadají na čelní (A) a zadní (C)
 * stěnu a jejich SOUČET vstupuje do portálových příčníků, oplechování dveří,
 * kotvení i montáže. Zadní stěna se ale dál zasklívala jako plná stěna:
 * fiktivní 9001 (průchozí 2+2) vycházela na sklo úplně stejně jako 9003
 * (neprůchozí, 4 nástupiště) — 10 ks / 20,98 m². Nástupiště na zadní stěně
 * přitom znamená otvor, ve kterém sklo není, a nad ním světlík.
 *
 * PODMÍNKA, KTEROU NESMÍ PORUŠIT
 * Neprůchozí šachta a průchozí s nulou nástupišť C musí vyjít na korunu
 * stejně jako dřív. Tuhle podmínku hlídá celý oddíl 3 — kdyby padla,
 * změnily by se ceny devatenácti zakázek ze 3. kola.
 */
const fs = require('fs');
const eng = require('./engine.js');
const ZC = require('./zkusebni_cenik.js');

let ok = 0, fail = 0;
const test = (n, cond, info) => {
  if (cond) { ok++; console.log('OK  ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info)); }
};
const blizko = (a, b, tol = 1e-6) => Math.abs(a - b) <= tol;

const JEKLY = JSON.parse(fs.readFileSync(__dirname + '/jekly.json', 'utf8'));
const cenik = () => ZC.zkusebniCenik();
const zad = (zmeny) => Object.assign(JSON.parse(JSON.stringify(eng.DEFAULT_ZADANI)), zmeny || {});
const spocti = (z, fixes) => eng.vypocet(z, cenik(), JEKLY, !!fixes);

/* Fiktivní 9001: interiér 1,6 × 1,8, zdvih 9, přejezd 3,2, prohlubeň 1,2,
 * průchozí A 2 + C 2, 3 patra, zasklení na terče.
 * Fiktivní 9003: totéž neprůchozí se 4 nástupišti. */
const z9001 = () => zad({
  typSachty: 'interiérová', zaskleni: 'na terče', typPortalu: 'zapuštěný',
  sirka: 1.6, hloubka: 1.8, zdvih: 9, prejezd: 3.2, prohluben: 1.2, roztec: 1.25,
  pruchoziSachta: true, nastupisteA: 2, nastupisteC: 2, patra: 3,
  nastupiste: 4, rohoveSloupky: 4, svetlikNadDvermi: false, svetlikyBoky: 0,
  cistyVstupMm: 900, sirkaRamuMm: 100,
});
const z9003 = () => zad({
  typSachty: 'interiérová', zaskleni: 'na terče', typPortalu: 'zapuštěný',
  sirka: 1.6, hloubka: 1.8, zdvih: 9, prejezd: 3.2, prohluben: 1.2, roztec: 1.25,
  pruchoziSachta: false, nastupiste: 4, rohoveSloupky: 4,
  svetlikNadDvermi: false, svetlikyBoky: 0, cistyVstupMm: 900, sirkaRamuMm: 100,
});

[false, true].forEach(fixes => {
  const rezim = fixes ? 'opravený' : 'Excel 1:1';

  /* ---------- 1) zadní stěna průchozí šachty má otvory ---------- */

  const a = spocti(z9001(), fixes), b = spocti(z9003(), fixes);
  const za = a.zaskleni, zb = b.zaskleni;

  test(`[${rezim}] JÁDRO NÁLEZU: průchozí 2+2 má MENŠÍ plochu zadní stěny než neprůchozí 4`,
    za.bokyZadniM2 < zb.bokyZadniM2, [za.bokyZadniM2, zb.bokyZadniM2]);
  test(`[${rezim}] celá plocha zadní stěny zůstává stejná — ubírají se až otvory`,
    blizko(za.zadni.m2, zb.zadni.m2), [za.zadni.m2, zb.zadni.m2]);
  test(`[${rezim}] otvory odpovídají dvěma nástupištím C`,
    za.zadniPortaly.ks === 2, za.zadniPortaly.ks);

  /* Otvor = šířka dveřního otvoru × 2,3 m. Šířka otvoru je (čistý vstup
   * + 2 · rám + 2 · 20) / 1000 = (900 + 200 + 40) / 1000 = 1,04 m. */
  test(`[${rezim}] otvor je šířka dveřního otvoru × 2,3 m`,
    blizko(za.zadniPortaly.otvorM2, a.odvozene.sirkaDveri * 2.3), [za.zadniPortaly.otvorM2, a.odvozene.sirkaDveri]);
  test(`[${rezim}] ubraná plocha = počet C × otvor`,
    blizko(za.zadniPortaly.m2, 2 * za.zadniPortaly.otvorM2), za.zadniPortaly.m2);
  test(`[${rezim}] plné sklo = celá stěna minus otvory`,
    blizko(za.zadniPlne.m2, za.zadni.m2 - za.zadniPortaly.m2), [za.zadniPlne.m2, za.zadni.m2, za.zadniPortaly.m2]);
  test(`[${rezim}] do materiálu bočních a zadní stěny jde plné sklo, ne celá stěna`,
    blizko(za.bokyZadniM2, za.bocni.m2 + za.zadniPlne.m2), [za.bokyZadniM2, za.bocni.m2, za.zadniPlne.m2]);

  /* ---------- 2) světlíky a spoje na zadní stěně ---------- */

  {
    /* Bez světlíku nad dveřmi žádný nepřibude ani na zadní stěně. */
    test(`[${rezim}] bez světlíku nad dveřmi se na zadní stěně žádný nepočítá`,
      za.svetlikyZadni.ks === 0 && blizko(za.svetlikyZadni.m2, 0), za.svetlikyZadni);

    const sSvetlikem = z9001(); sSvetlikem.svetlikNadDvermi = true;
    const r = spocti(sSvetlikem, fixes).zaskleni;
    test(`[${rezim}] 2 ze světlíků sedí na zadní stěně`,
      r.svetlikyZadni.ks === 2, r.svetlikyZadni.ks);

    /* POZOR NA DVOJÍ POČÍTÁNÍ. `svetliky.ks` stojí od 9. 9. na SOUČTU A + C,
     * takže světlíky nad dveřmi C v položce „čelní stěna" už jsou. Rozpad
     * níž je jen informace do Detailu výpočtu; přičíst ho znovu by sklo
     * zdvojnásobilo. Chyba, které jsem se při první verzi O8 dopustil. */
    test(`[${rezim}] světlíky celkem stojí na součtu A + C`,
      r.svetliky.ks === 4, r.svetliky.ks);
    test(`[${rezim}] rozpad zadní stěny se do materiálu NEpřičítá znovu`,
      blizko(r.celniM2, r.svetliky.m2 + r.svetlikyBoky.m2),
      [r.celniM2, r.svetliky.m2, r.svetlikyBoky.m2, r.svetlikyZadni.m2]);
    test(`[${rezim}] a světlíky C jsou podmnožinou všech světlíků`,
      r.svetlikyZadni.ks <= r.svetliky.ks && r.svetlikyZadni.m2 <= r.svetliky.m2 + 1e-9,
      [r.svetlikyZadni.ks, r.svetliky.ks]);
    /* Přesun nástupiště z čelní stěny na zadní materiálem čelní stěny nehne:
     * počet světlíků i světlá výška zůstávají. Srovnává se se stejnou šachtou,
     * jen se všemi nástupišti vepředu — kdyby se porovnávalo s neprůchozí,
     * lišila by se výška podlaží (ta se u průchozí počítá z pater). */
    const vsechnaVpredu = z9001();
    vsechnaVpredu.svetlikNadDvermi = true;
    vsechnaVpredu.nastupisteA = 4; vsechnaVpredu.nastupisteC = 0;
    test(`[${rezim}] přesun nástupiště na zadní stěnu materiálem čelní stěny nehne`,
      blizko(r.celniM2, spocti(vsechnaVpredu, fixes).zaskleni.celniM2),
      [r.celniM2, spocti(vsechnaVpredu, fixes).zaskleni.celniM2]);
  }

  /* ---------- O10 / V40: pás nad dveřmi C se nesmí počítat dvakrát -------
   *
   * Do 15. 9. 2026 se od zadní stěny odečítal jen dveřní otvor po 2,3 m. Pás
   * mezi 2,3 m a světlou výškou zůstal ve skle ZADNÍ stěny — a týž pás se
   * počítal jako světlík ve stěně ČELNÍ. Tatáž plocha byla v ceně dvakrát.
   * Komentář v jádře přitom tvrdil, že se nezdvojuje; popisoval záměr, ke
   * kterému odečet nikdo nedopsal.
   *
   * Testuje se VZTAH, ne opsaná čísla: zapnutí světlíku smí celkovou plochu
   * změnit přesně o „přibyly světlíky A+C vepředu, ubyly světlíky C vzadu".
   * Tím sada drží i tehdy, když se rozměry fiktivní šachty někdy změní. */
  {
    const bez = spocti(z9001(), fixes).zaskleni;
    const se = (() => { const x = z9001(); x.svetlikNadDvermi = true; return spocti(x, fixes).zaskleni; })();

    test(`[${rezim}] odečet zadní stěny = dveře + světlíky`,
      blizko(se.zadniPortaly.m2, se.zadniPortaly.dvereM2 + se.zadniPortaly.svetlikyM2, 1e-9),
      [se.zadniPortaly.m2, se.zadniPortaly.dvereM2, se.zadniPortaly.svetlikyM2]);
    test(`[${rezim}] a odečtená část světlíků sedí s rozpadem`,
      blizko(se.zadniPortaly.svetlikyM2, se.svetlikyZadni.m2, 1e-9),
      [se.zadniPortaly.svetlikyM2, se.svetlikyZadni.m2]);
    test(`[${rezim}] zadní stěna se beze zbytku rozpadá na plnou a odečtenou`,
      blizko(se.zadniPlne.m2 + se.zadniPortaly.m2, se.zadni.m2, 1e-9),
      [se.zadniPlne.m2, se.zadniPortaly.m2, se.zadni.m2]);

    /* Jádro nálezu: přírůstek po zapnutí světlíku. */
    const cekano = bez.celkemM2 + se.svetliky.m2 + se.svetlikyBoky.m2 - se.svetlikyZadni.m2;
    test(`[${rezim}] zapnutí světlíku přidá světlíky vepředu a ubere je vzadu`,
      blizko(se.celkemM2, cekano, 1e-9),
      { bez: bez.celkemM2, se: se.celkemM2, cekano, svetlikyC: se.svetlikyZadni.m2 });
    test(`[${rezim}] a pás nad dveřmi C už není v zadní stěně`,
      se.celkemM2 < bez.celkemM2 + se.svetliky.m2 + se.svetlikyBoky.m2 - 1e-9,
      [se.celkemM2, bez.celkemM2 + se.svetliky.m2 + se.svetlikyBoky.m2]);

    /* Vypnutý světlík = dnešní chování, odečítá se jen dveřní otvor. */
    test(`[${rezim}] bez světlíku se odečítá jen dveřní otvor`,
      blizko(bez.zadniPortaly.m2, bez.zadniPortaly.dvereM2, 1e-9)
      && blizko(bez.zadniPortaly.svetlikyM2, 0, 1e-9),
      [bez.zadniPortaly.m2, bez.zadniPortaly.dvereM2, bez.zadniPortaly.svetlikyM2]);

    /* Neprůchozí šachta se světlíkem se změnit NESMÍ — nemá nástupiště C. */
    const nepr = (() => { const x = z9003(); x.svetlikNadDvermi = true; return spocti(x, fixes).zaskleni; })();
    test(`[${rezim}] neprůchozí šachta se světlíkem se nemění`,
      blizko(nepr.zadniPortaly.m2, 0, 1e-9) && blizko(nepr.svetlikyZadni.m2, 0, 1e-9),
      [nepr.zadniPortaly.m2, nepr.svetlikyZadni.m2]);

    /* Průchozí s nulou nástupišť C taky ne. */
    const c0 = (() => {
      const x = z9001(); x.svetlikNadDvermi = true; x.nastupisteA = 4; x.nastupisteC = 0;
      return spocti(x, fixes).zaskleni;
    })();
    test(`[${rezim}] průchozí s nulou nástupišť C nemá co odečítat`,
      blizko(c0.zadniPortaly.m2, 0, 1e-9), c0.zadniPortaly.m2);
  }

  {
    /* Spoje čelní strany se u průchozí šachty počítají dvakrát: portály jsou
     * na obou stěnách. */
    const spoj = (r) => r.plechy.spojeRows.find(x => x.key === 'celni');
    test(`[${rezim}] spoje čelní strany se u průchozí šachty počítají dvakrát`,
      spoj(a).spoju === 2 * spoj(b).spoju, [spoj(a).spoju, spoj(b).spoju]);
  }

  {
    /* Portálové příčníky, oplechování dveří a kotvení stojí na SOUČTU A + C
     * (od 9. 9.), takže u 2+2 vycházejí stejně jako u neprůchozích 4 —
     * a to je správně. Tahle kontrola hlídá, že to O8 nerozhodilo. */
    test(`[${rezim}] portálové příčníky stojí na součtu A + C`,
      a.parametry.portPricniky === b.parametry.portPricniky, [a.parametry.portPricniky, b.parametry.portPricniky]);
    test(`[${rezim}] oplechování dveří stojí na součtu A + C`,
      a.dily.oplDvereKs === b.dily.oplDvereKs, [a.dily.oplDvereKs, b.dily.oplDvereKs]);
  }

  /* ---------- 3) REGRESE: co nesmí změnit ani o korunu ---------- */

  {
    /* Neprůchozí šachta se nesmí hnout: nastupistC je 0. */
    const bezC = z9003();
    const r = spocti(bezC, fixes).zaskleni;
    test(`[${rezim}] neprůchozí: ubraná plocha je nula`, blizko(r.zadniPortaly.m2, 0));
    test(`[${rezim}] neprůchozí: plné sklo = celá zadní stěna`, blizko(r.zadniPlne.m2, r.zadni.m2));
    test(`[${rezim}] neprůchozí: žádné světlíky na zadní stěně`, r.svetlikyZadni.ks === 0);
  }

  {
    /* Průchozí s C = 0 (tak vypadají starší zakázky 0089 a 0636 po migraci:
     * A = původní počet nástupišť, C = 0) musí dát TOTÉŽ co neprůchozí. */
    const sC0 = z9003(); sC0.pruchoziSachta = true; sC0.nastupisteA = 4; sC0.nastupisteC = 0; sC0.patra = 4;
    const r1 = spocti(sC0, fixes), r0 = spocti(z9003(), fixes);
    test(`[${rezim}] průchozí s C = 0 dá stejnou plochu skla jako neprůchozí`,
      blizko(r1.zaskleni.bokyZadniM2, r0.zaskleni.bokyZadniM2)
      && blizko(r1.zaskleni.celniM2, r0.zaskleni.celniM2),
      [r1.zaskleni.bokyZadniM2, r0.zaskleni.bokyZadniM2]);
    test(`[${rezim}] průchozí s C = 0 má stejné spoje čelní strany jako neprůchozí`,
      r1.plechy.spojeRows.find(x => x.key === 'celni').spoju
      === r0.plechy.spojeRows.find(x => x.key === 'celni').spoju);
  }

  {
    /* Starší zakázka 2026-OPR-CN-0089: průchozí, ale bez A/C (uložená před
     * 9. 9.). Po migraci má C = 0, takže se cena nesmí změnit. */
    const stara = zad({
      typSachty: 'exteriérová', zaskleni: 'na terče', typPortalu: 'zapuštěný',
      sirka: 1.59, hloubka: 1.74, zdvih: 15.5, prejezd: 3.9, prohluben: 0.97, roztec: 1.25,
      pruchoziSachta: true, nastupiste: 6, nastupisteA: 6, nastupisteC: 0, patra: 6,
      rohoveSloupky: 4, svetlikNadDvermi: false, svetlikyBoky: 0, cistyVstupMm: 900, sirkaRamuMm: 100,
    });
    const r = spocti(stara, fixes).zaskleni;
    test(`[${rezim}] 0089 po migraci (C = 0): zadní stěna beze změny`,
      blizko(r.zadniPlne.m2, r.zadni.m2) && r.zadniPortaly.ks === 0);
  }

  /* ---------- 4) záporné sklo nevzniká ---------- */
  {
    /* Nízká šachta s mnoha nástupišti C: otvory by přesáhly plochu stěny. */
    const extrem = z9001();
    extrem.zdvih = 2; extrem.prejezd = 0.5; extrem.nastupisteC = 12; extrem.patra = 2;
    const r = spocti(extrem, fixes).zaskleni;
    test(`[${rezim}] plocha plného skla nikdy nespadne pod nulu`, r.zadniPlne.m2 >= 0, r.zadniPlne.m2);
    test(`[${rezim}] ani celková plocha skla`, r.celkemM2 >= 0, r.celkemM2);
  }

  /* ---------- 5) cena jde dolů, ne nahoru ---------- */
  {
    /* Ubrané sklo znamená nižší cenu opláštění. Kdyby vyšla vyšší, znamená to,
     * že se někde přičítá místo odečítá. */
    test(`[${rezim}] průchozí 2+2 nestojí na skle víc než neprůchozí 4`,
      a.souctySekci.oplasteni.naklad <= b.souctySekci.oplasteni.naklad,
      [a.souctySekci.oplasteni.naklad, b.souctySekci.oplasteni.naklad]);
  }
});

/* ===== N14: ZÁPORNÁ PLOCHA SVĚTLÍKŮ (19. kolo testů, 14. 9. 2026) =====
 *
 * Předloha počítá světlík nad dveřmi jako šířka × (světlá výška − 2,3)
 * a nehlídá, že rozdíl může vyjít záporně. Pod 2,5 m výšky podlaží se dveře
 * o výšce 2,3 m do patra nevejdou a vzorec začne sklo ODEČÍTAT.
 *
 * ROZHODNUTÍ J. V. 14. 9. 2026: opraveno JEN v Modelu 2. Model 1 zůstává
 * 1:1 s předlohou včetně téhle chyby — a tenhle oddíl je její evidence.
 * Kdyby ji někdo „opravil" i v Modelu 1, sada padne a bude vidět proč.
 */
{
  const zadaniN14 = (patra) => zad({
    typSachty: 'interiérová', zaskleni: 'na terče', typPortalu: 'zapuštěný',
    sirka: 1.8, hloubka: 1.8, zdvih: 12, prejezd: 3, prohluben: 1.2, roztec: 1.25,
    pruchoziSachta: true, nastupisteA: 5, nastupisteC: 0, patra,
    nastupiste: 5, rohoveSloupky: 4, svetlikNadDvermi: true, svetlikyBoky: 0,
    cistyVstupMm: 900, sirkaRamuMm: 100,
  });
  const svetliky = (patra, fixes) => spocti(zadaniN14(patra), fixes).zaskleni.svetliky.m2;
  const vyskaPodlazi = (patra) => (patra >= 2 ? 12 / (patra - 1) : 0);

  /* Nad prahem se oba modely shodují — oprava sahá jen na záporné hodnoty. */
  test('N14: nad 2,5 m výšky podlaží je plocha kladná a oba modely se shodují',
    svetliky(5, false) > 0 && blizko(svetliky(5, false), svetliky(5, true)),
    [vyskaPodlazi(5), svetliky(5, false), svetliky(5, true)]);

  [6, 8, 1].forEach(patra => {
    const m1 = svetliky(patra, false), m2 = svetliky(patra, true);
    test(`N14: Model 1 při ${patra} patrech (výška podlaží ${vyskaPodlazi(patra).toFixed(2)} m) drží ZÁPORNOU plochu — chyba předlohy`,
      m1 < 0, m1);
    test(`N14: Model 2 při ${patra} patrech plochu neodečítá (nula)`, blizko(m2, 0), m2);
  });

  /* Práh je přesně 2,5 m: světlá výška = výška podlaží − 0,2 a dveře 2,3 m. */
  const naPrahu = spocti(Object.assign(zadaniN14(2), { zdvih: 2.5 }), false).zaskleni.svetliky.m2;
  test('N14: přesně na prahu 2,5 m je plocha nula i v Modelu 1', blizko(naPrahu, 0), naPrahu);

  /* Bez světlíku nad dveřmi se nález neprojeví vůbec — ani v Modelu 1. */
  const bezSvetliku = Object.assign(zadaniN14(8), { svetlikNadDvermi: false });
  test('N14: bez světlíku nad dveřmi je plocha nula v obou modelech',
    blizko(spocti(bezSvetliku, false).zaskleni.svetliky.m2, 0)
    && blizko(spocti(bezSvetliku, true).zaskleni.svetliky.m2, 0));

  /* Záporná plocha tekla do tří položek, ne jedné. V Modelu 2 tedy musí
   * stoupnout cena opláštění — jinak se oprava někde ztratila. */
  const m1Cena = spocti(zadaniN14(8), false).souctySekci.oplasteni.naklad;
  const m2Cena = spocti(zadaniN14(8), true).souctySekci.oplasteni.naklad;
  test('N14: v Modelu 2 vyjde opláštění dráž než v Modelu 1 (sklo se neodečítá)',
    m2Cena > m1Cena, [m1Cena, m2Cena]);

  /* A celková plocha skla v Modelu 2 nikdy nespadne pod plochu bočních
   * a zadní stěny — víc než nulu světlíky ubrat nemůžou. */
  const z8 = spocti(zadaniN14(8), true).zaskleni;
  test('N14: Model 2 nemá zápornou žádnou z ploch skla',
    z8.celniM2 >= 0 && z8.bokyZadniM2 >= 0 && z8.celkemM2 >= 0, z8.celkemM2);
}

console.log(`\n${ok} OK, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
