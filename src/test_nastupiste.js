/* Průchozí šachta — pravidlo nástupišť (N45, N46; zadání J. V. 24. 9. 2026)
 * a lešení při přepisu množství (N51, schváleno J. V. 24. 9. 2026).
 *
 * „Nástupiště obsahuje světlíky, dveře, portály s plechy a nástupní plechy.
 * Nástupiště je všude tam, kde jsou dveře. Kde dveře nejsou, je provedeno
 * opláštění zvoleným materiálem po celé ploše." Stejně pro čelní i zadní
 * stěnu, ve standardu i po stěnách.
 *
 * Sada hlídá pravidla, ne konkrétní částky zkušebního ceníku:
 *   – zrcadlová šachta (A4C0 × A0C4) má stejné plochy stěn,
 *   – neprůchozí šachta se nezměnila,
 *   – stěna bez dveří = celá výška prosklení, stěna s dveřmi v každém
 *     patře = jen světlíky, hlava (přejezd) patří nejvyššímu patru,
 *   – boční světlíky patří ke stěně s dveřmi (N45),
 *   – režim po stěnách má týž základ,
 *   – lešení: m × sazba + celý fix v obou místech, přepis 0 m = 0 Kč.
 */
const E = require('./engine.js');
const ZC = require('./zkusebni_cenik.js');
const J = require('./jekly.json');
const kop = x => JSON.parse(JSON.stringify(x));
let ok = 0, fail = 0;
const test = (n, c, info) => { if (c) { ok++; console.log('OK  ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info)); } };
const blizko = (a, b, tol) => Math.abs(a - b) <= (tol == null ? 1e-6 : tol);

function spocti(typ, A, C, extra) {
  const z = kop(E.DEFAULT_ZADANI);
  Object.assign(z, { typSachty: typ, pruchoziSachta: true, nastupisteA: A, nastupisteC: C, patra: 4,
    svetlikyBoky: 0, svetlikNadDvermi: false, profily: kop(E.PROFILY_VYCHOZI[typ]) }, extra || {});
  const c = Object.assign(kop(E.DEFAULT_CENIK), ZC.zkusebniCenik());
  return { r: E.vypocet(z, c, J, true), z };
}

for (const typ of ['interiérová', 'exteriérová']) {
  for (const [boky, nad] of [[0, false], [1, true]]) {
    const x = { svetlikyBoky: boky, svetlikNadDvermi: nad };
    const a = spocti(typ, 4, 0, x).r.zaskleni.steny, b = spocti(typ, 0, 4, x).r.zaskleni.steny;
    test(`${typ}, světlíky ${boky}/${nad}: A4C0 a A0C4 mají zrcadlové stěny`,
      blizko(a.A, b.C, 1e-9) && blizko(a.C, b.A, 1e-9) && blizko(a.B, b.B, 1e-9), { a, b });
  }
}

/* Stěna bez dveří = celá stěna; stěna s dveřmi v každém patře = jen světlíky. */
{
  const { r } = spocti('interiérová', 4, 0);
  const s = r.zaskleni.steny;
  test('A4C0 bez světlíků: čelní stěna nemá opláštění (nástupiště v každém patře)', blizko(s.A, 0), s);
  test('A4C0: zadní stěna bez dveří je celá', s.C > 30, s);
  const { r: r2 } = spocti('interiérová', 4, 4);
  test('A4C4: zadní stěna s dveřmi — kolem dveří už není sklo (jen hlava bez dveří nahoře)', r2.zaskleni.steny.C < 6, r2.zaskleni.steny);
  test('A4C4 je levnější než dřív kvůli zdvojení skla a portálu — a pořád dražší než A4C0', r2.souhrn.zakladCena > r.souhrn.zakladCena);
}

/* Hlava (přejezd) patří nejvyššímu patru: A0C4 — nahoře jsou dveře vzadu,
 * takže zadní stěna nemá opláštění vůbec, čelní celé. */
{
  const s = spocti('interiérová', 0, 4).r.zaskleni.steny;
  test('A0C4: zadní stěna jen světlíky (tady žádné) — i hlava je nástupiště', blizko(s.C, 0), s);
  const s2 = spocti('interiérová', 3, 1).r.zaskleni.steny;
  const cela = spocti('interiérová', 0, 4).r.zaskleni.steny.A;
  /* A3C1: nahoře vpředu → vzadu 1 dveře v nižším patře; vzadu chybí jeden pás
   * výšky podlaží, vpředu 1 nižší patro bez dveří. */
  test('A3C1: přední + zadní opláštění = jedna celá stěna (dveře jsou v každém patře právě jednou)',
    blizko(s2.A + s2.C, cela, 1e-9), { s2, cela });
}

/* N45: boční světlíky patří ke stěně s dveřmi. */
{
  const x = { svetlikyBoky: 1 };
  const a = spocti('exteriérová', 4, 0, x).r.zaskleni.steny, b = spocti('exteriérová', 0, 4, x).r.zaskleni.steny;
  const c = spocti('exteriérová', 4, 4, x).r.zaskleni.steny;
  test('N45: A0C4 nemá na čelní stěně boční světlíky navíc (je celá, bez dveří)', blizko(b.A, a.C, 1e-9), { a, b });
  test('N45: A4C4 — boční světlíky vpředu jen za dveře vpředu', blizko(c.A, a.A, 1e-9), { a, c });
}

/* Neprůchozí šachta beze změny proti pravidlu „čelní = světlíky, zadní = celá". */
for (const typ of ['interiérová', 'exteriérová']) {
  const z = kop(E.DEFAULT_ZADANI); z.typSachty = typ; z.profily = kop(E.PROFILY_VYCHOZI[typ]); z.svetlikyBoky = 1;
  const r = E.vypocet(z, Object.assign(kop(E.DEFAULT_CENIK), ZC.zkusebniCenik()), J, true);
  const zp = r.zaskleni.zadniPlne || r.zaskleni.detail;
  test(`neprůchozí ${typ}: zadní stěna celá, čelní jen světlíky`,
    r.zaskleni.steny.C > 30 && r.zaskleni.steny.A < r.zaskleni.steny.C, r.zaskleni.steny);
}

/* Po stěnách: týž základ jako standard (#295 podle nového pravidla). */
{
  const vse = t => ({ A: { odM: 0, pasy: [{ typ: t, doM: null }] }, B: { odM: 0, pasy: [{ typ: t, doM: null }] },
                      C: { odM: 0, pasy: [{ typ: t, doM: null }] }, D: { odM: 0, pasy: [{ typ: t, doM: null }] } });
  const { r } = spocti('interiérová', 0, 4, { oplasteni: { rezim: 'poStenach', steny: vse('C.cetrisKc') } });
  const zakl = r.oplasteni.zakladSten;
  const st = spocti('interiérová', 0, 4).r.zaskleni.steny;
  test('po stěnách: základ stěn = plochy podle pravidla nástupišť',
    zakl ? (blizko(zakl.A, st.A, 1e-9) && blizko(zakl.C, st.C, 1e-9)) : false, { zakl, st });
}

/* N51: lešení. */
{
  const c = ZC.zkusebniCenik();
  const les = (vCene, prepis) => {
    const z = kop(E.DEFAULT_ZADANI);
    Object.assign(z, { typSachty: 'interiérová', profily: kop(E.PROFILY_VYCHOZI['interiérová']),
      sirka: 1.8, hloubka: 1.9, zdvih: 12, prejezd: 3.5, prohluben: 1.2, nastupiste: 5 });
    z.volitelne = Object.assign({}, z.volitelne, { leseniVnitrni: vCene });
    if (prepis != null) z.mnozstviPrepis = { 'LEŠENÍ - vnitřní': prepis };
    const r = E.vypocet(z, c, J, true);
    return { v: r.volitelneKatalog.find(x => x.origNazev === 'LEŠENÍ - vnitřní'),
             p: r.priplatky.find(x => x.origNazev === 'LEŠENÍ - vnitřní') };
  };
  const bez = les(false, null), tri = les(false, 3), nula = les(false, 0), nulaV = les(true, 0);
  test('N51: bez přepisu příplatek = volitelná položka', blizko(bez.p.naklad, bez.v.naklad));
  test('N51: přepis 3 m — příplatek = 3 × sazba + celý fix', blizko(tri.p.naklad, 3 * c.leseniVnitrniKc + c.leseniFix), tri.p.naklad);
  test('N51: přepis 3 m — volitelné i příplatek stejně', blizko(tri.p.naklad, tri.v.naklad));
  test('N51: přepis 0 m = 0 Kč v příplatcích', nula.p.naklad === 0);
  test('N51: přepis 0 m = 0 Kč ve volitelných (dřív zůstal fix)', nulaV.v.naklad === 0, nulaV.v.naklad);
}

console.log(`\n${ok} prošlo, ${fail} selhalo`);
process.exit(fail ? 1 : 0);
