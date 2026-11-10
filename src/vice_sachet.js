/* ============================================================
 * VÍC ŠACHET V JEDNÉ NABÍDCE OCK (VS #570, etapa E1 = roadmapa #591)
 *
 * Závazný návrh: podklady/NAVRH_VICE_SACHET_05_11.md (větev
 * claude/vs-vice-sachet, rozhodnutí J. V. R1–R20). Tento modul je datová
 * a výpočetní vrstva — žádné DOM, běží v prohlížeči i na serveru
 * (netlify/lib/jadro_moduly.cjs).
 *
 * DATA (R1, architektura A): šachty jsou uvnitř varianty.
 *   v.data.ock.zadani   šachta 1 (beze změny cesty i obsahu)
 *   v.data.ock.nazev    nepovinný název šachty 1 (chybí = „Šachta 1")
 *   v.data.ock.ks       nepovinný počet stejných kusů šachty 1 (chybí = 1)
 *   v.data.ock.dalsi[]  nepovinné další varianty šachet
 *                       { id, nazev, ks, zadani }  (chybí / [] = dnešní zakázka)
 * `dalsi`, `nazev` ani `ks` nejsou ve vzoru zadání (DEFAULT_ZADANI) — import
 * je tedy nedoplní a stará zakázka zůstane přesně, jak byla. Žádná migrace.
 *
 * ZLATÉ PRAVIDLO: zakázka bez víc šachet (žádná další šachta, ks = 1) dostane
 * z obalu PŘÍMO výsledek jádra `vypocet()` — nic se nesčítá, nic se
 * nezaokrouhluje podruhé. Hlídá to zlatá sada VS-E0 (src/test_vs_zlata.js).
 *
 * VÝPOČET (R2, R3, oddíl 3.1 návrhu): každá šachta se počítá celá, jako
 * samostatná zakázka; cena zakázky = čistý součet šachet × ks; na tisíce se
 * zaokrouhluje JEN součet (ceny před zaokrouhlením z jádra:
 * souhrn.zakladCenaPredZaokr, priplatkyCenaPredZaokr, mustkyCenaPredZaokr).
 * Víc šachet jen v Modelu 2 — Model 1 (předloha Excel) počítá jen šachtu 1.
 * ============================================================ */

const VS_VARIANT_MAX = 10;   // R10: nejvýš 10 variant šachet ve variantě (šachta s N ks je jedna)
const VS_KS_MAX = 20;        // počet stejných kusů jedné varianty šachty
const VS_NAZEV_MAX = 80;     // délka názvu šachty
const VS_ID_TVAR = /^[A-Za-z0-9._-]{1,80}$/;
const VS_CEIL = (x, m) => Math.ceil(x / m - 1e-9) * m;   // týž výraz jako CEIL v engine.js

/* Počet kusů k výpočtu: celé číslo 1–20, jinak 1. Tvar hlídá server
 * (vsTvarProblemy); výpočet se na neplatném čísle nesmí rozbít. */
function vsKs(x) {
  const n = +x;
  return (Number.isInteger(n) && n >= 1 && n <= VS_KS_MAX) ? n : 1;
}

function vsDalsi(ock) {
  return (ock && Array.isArray(ock.dalsi)) ? ock.dalsi.filter(s => s && typeof s === 'object') : [];
}

/* Režim víc šachet (R16): aspoň jedna další šachta, nebo šachta 1 s víc kusy. */
function rezimViceSachet(ock) {
  if (!ock || typeof ock !== 'object') return false;
  return vsDalsi(ock).length > 0 || vsKs(ock.ks) > 1;
}

/* Data víc šachet podle syrových hodnot (bez přepočtu na platné ks) — pro
 * vypínač na serveru: cokoli, co by z jedné šachty dělalo víc šachet. */
function vsMaData(ock) {
  if (!ock || typeof ock !== 'object') return false;
  if (Array.isArray(ock.dalsi) ? ock.dalsi.length > 0 : ock.dalsi !== undefined) return true;
  return ock.ks !== undefined && ock.ks !== null && +ock.ks !== 1;
}

/* Jednotný seznam šachet varianty: [{ id, nazev, ks, zadani }, ...]. Nový kód
 * čte jen tohle. `nazev` je, jak je uložený (prázdný = „Šachta N", viz vsNazev). */
function sachtyZ(ock) {
  if (!ock || typeof ock !== 'object') return [];
  const prvni = { id: 's1', nazev: typeof ock.nazev === 'string' ? ock.nazev : '', ks: vsKs(ock.ks), zadani: ock.zadani };
  return [prvni].concat(vsDalsi(ock).map((s, i) => ({
    id: typeof s.id === 'string' && s.id ? s.id : 's' + (i + 2),
    nazev: typeof s.nazev === 'string' ? s.nazev : '',
    ks: vsKs(s.ks), zadani: s.zadani })));
}

function vsNazev(s, i) {
  const t = s && typeof s.nazev === 'string' ? s.nazev.trim() : '';
  return t || ('Šachta ' + (i + 1));
}

/* Počty pro štítky (R19): variant šachet a šachet celkem (Σ ks). */
function vsPocty(ock) {
  const l = sachtyZ(ock);
  return { variant: l.length, celkem: l.reduce((a, s) => a + s.ks, 0) };
}

/* ---------- rozpočet zaokrouhlení do šachet (R7, oddíl 3.6) ----------
 * T = základ zakázky v celých Kč (už zaokrouhlený), castky = kᵢ·Uᵢ (Kč,
 * s haléři). Výsledek: celé Kč po šachtách, součet = T PŘESNĚ. Celé haléře
 * v BigInt, metoda největšího zbytku; při shodě zbytku dražší šachta, pak
 * nižší pořadí. Bez plovoucí čárky, vždy stejný výsledek. */
function rozpocetSachet(T, castky) {
  const n = Array.isArray(castky) ? castky.length : 0;
  if (!n) return [];
  const TT = BigInt(Math.round(+T || 0));
  if (n === 1) return [Number(TT)];
  const s = castky.map(x => { const h = Math.round((+x || 0) * 100); return BigInt(h > 0 ? h : 0); });
  const S = s.reduce((a, b) => a + b, 0n);
  if (S === 0n) return castky.map(() => 0);
  const q = s.map(x => TT * x / S);
  const zb = s.map(x => (TT * x) % S);
  let r = TT - q.reduce((a, b) => a + b, 0n);
  const cmp = (a, b) => (a > b ? 1 : a < b ? -1 : 0);
  const poradi = s.map((_, i) => i).sort((a, b) => cmp(zb[b], zb[a]) || cmp(s[b], s[a]) || a - b);
  for (let i = 0; r > 0n; i++, r--) q[poradi[i % n]] += 1n;
  return q.map(Number);
}

/* ---------- slučování řádků ----------
 * Řádky sekcí, volitelných a příplatků se slučují podle KLÍČE a JEDNOTKOVÉ
 * SAZBY (na haléř): množství, náklad, marže a cena se sečtou × ks. Stejný
 * ceník → stejná položka se sloučí; vlastní položka s jinou cenou zůstane
 * zvlášť. Popisná pole (název, jednotka, poznámka) ze šachty, kde se řádek
 * objevil poprvé; `vsSachty` = [{ i, ks }] šachty, kterých se řádek týká. */
const VS_SCITANA_POLE = ['mnozstvi', 'mnozstviAuto', 'naklad', 'marze', 'sMarzi'];

function vsNormNazev(t) { return String(t == null ? '' : t).replace(/\s+/g, ' ').trim().toLowerCase(); }

/* Klíč příplatku (5.1.1): klíč příplatku; vlastní z katalogu podle `kid`,
 * ruční vlastní podle názvu po normalizaci. */
function vsKlicPriplatku(r) {
  const k = String(r && r.key || '');
  if (r && (r.vlastni || /^vlastni:/.test(k))) return r.kid ? 'kid:' + r.kid : 'nazev:' + vsNormNazev(r.origNazev || r.nazev);
  return k || 'nazev:' + vsNormNazev(r && (r.origNazev || r.nazev));
}
function vsKlicRadku(r) {
  if (r && r.key) return 'key:' + r.key;
  return 'nazev:' + vsNormNazev(r && (r.origNazev || r.nazev));
}
const vsSazba = r => Math.round((+(r && r.cena) || 0) * 100);

function vsSlucRadky(seznamy, ksy, klicFn) {
  const mapa = new Map(), out = [];
  seznamy.forEach((rows, i) => (Array.isArray(rows) ? rows : []).forEach(r => {
    if (!r || typeof r !== 'object') return;
    const k = klicFn(r) + '|' + vsSazba(r);
    let x = mapa.get(k);
    if (!x) {
      x = JSON.parse(JSON.stringify(r));
      VS_SCITANA_POLE.forEach(f => { if (typeof x[f] === 'number') x[f] = 0; });
      x.vsSachty = [];
      mapa.set(k, x); out.push(x);
    }
    VS_SCITANA_POLE.forEach(f => { if (typeof r[f] === 'number' && typeof x[f] === 'number') x[f] += ksy[i] * r[f]; });
    x.vsSachty.push({ i, ks: ksy[i] });
  }));
  return out;
}

/* Sloučené příplatky (R8, R13, oddíl 5.1.1) — jen to, co obal dal do
 * součtu (`vysl.priplatky`), s výčtem šachet. Pro CN (E4) a krycí list (E5). */
function priplatkySloucene(vysl) {
  return (vysl && Array.isArray(vysl.priplatky)) ? vysl.priplatky : [];
}

/* ---------- součet výsledků šachet ---------- */
function vsSoucetSouhrnu(vys, ksy, cenik) {
  const dph = +(cenik && cenik.dph) || 0;
  const S = (fn) => vys.reduce((a, r, i) => a + ksy[i] * (+fn(r) || 0), 0);
  const pred = (r, k, z) => { const x = r.souhrn[k]; return typeof x === 'number' ? x : z(r); };
  const U = S(r => pred(r, 'zakladCenaPredZaokr', x => x.souhrn.zakladNaklad + x.souhrn.zakladMarze));
  const N = S(r => r.souhrn.zakladNaklad);
  const Z = VS_CEIL(U, 1000);                                     // R3: jen na součtu
  const Pp = S(r => pred(r, 'priplatkyCenaPredZaokr', x => x.souhrn.priplatkyCena));
  const P = VS_CEIL(Pp, 1000);
  const souhrn = { zakladNaklad: N, zakladMarze: U - N, zakladCena: Z, zakladDph: Z * dph, zakladSDph: Z * (1 + dph),
    priplatkyCena: P, priplatkyDph: P * dph, priplatkySDph: P * (1 + dph) };
  /* Můstky (#560): jen když aspoň jedna šachta má sekci MŮSTKY; pravidlo
   * min(CEIL, základ) jako v jádře, jen ze součtu. */
  let Mp = null;
  if (vys.some(r => r.souhrn.mustkyCena !== undefined)) {
    Mp = S(r => r.souhrn.mustkyCena === undefined ? 0 : pred(r, 'mustkyCenaPredZaokr', x => x.souhrn.mustkyCena));
    souhrn.mustkyNaklad = S(r => r.souhrn.mustkyNaklad || 0);
    souhrn.mustkyCena = Math.min(VS_CEIL(Mp, 1000), Z);
  }
  const predZ = { zakladCenaPredZaokr: U, priplatkyCenaPredZaokr: Pp };
  if (Mp !== null) predZ.mustkyCenaPredZaokr = Mp;
  Object.keys(predZ).forEach(k => Object.defineProperty(souhrn, k, { value: predZ[k], enumerable: false, writable: true, configurable: true }));
  return souhrn;
}

/* Popisné (nesčitatelné) části výsledku — odvozene, parametry, oplasteni,
 * zaskleni, mustky, profily, plechy, dily, spojovaci, strecha, lakovani,
 * nazvyPolozek — nese součet ZE ŠACHTY 1 (kód, který o šachtách neví, dostane
 * platná data a razítka, např. skloJenSPlochou #572). Kdo popisuje šachtu
 * (specifikace, kontroly, nákres), čte výsledek své šachty `sachty[i].vysl`. */
function vsSoucet(vys, ksy, cenik) {
  const r0 = vys[0];
  const r = Object.assign({}, r0);
  r.sekce = {};
  const klSek = [];
  vys.forEach(x => Object.keys(x.sekce || {}).forEach(k => { if (klSek.indexOf(k) < 0) klSek.push(k); }));
  klSek.forEach(k => { r.sekce[k] = vsSlucRadky(vys.map(x => (x.sekce || {})[k]), ksy, vsKlicRadku); });
  r.volitelneKatalog = vsSlucRadky(vys.map(x => x.volitelneKatalog), ksy, vsKlicRadku);
  r.priplatky = vsSlucRadky(vys.map(x => x.priplatky), ksy, vsKlicPriplatku);
  const klSou = [];
  vys.forEach(x => Object.keys(x.souctySekci || {}).forEach(k => { if (klSou.indexOf(k) < 0) klSou.push(k); }));
  r.souctySekci = {};
  klSou.forEach(k => {
    const o = { naklad: 0, marze: 0, sMarzi: 0 };
    vys.forEach((x, i) => { const s = (x.souctySekci || {})[k]; if (s) ['naklad', 'marze', 'sMarzi'].forEach(f => { o[f] += ksy[i] * (+s[f] || 0); }); });
    r.souctySekci[k] = o;
  });
  r.rezerva = { naklad: 0, marze: 0, sMarzi: 0 };
  vys.forEach((x, i) => ['naklad', 'marze', 'sMarzi'].forEach(f => { r.rezerva[f] += ksy[i] * (+(x.rezerva || {})[f] || 0); }));
  r.montaz = Object.assign({}, r0.montaz);
  ['hodinyNavicCelkem', 'hod1osoba', 'hodCelkem', 'dni'].forEach(f => {
    r.montaz[f] = vys.reduce((a, x, i) => a + ksy[i] * (+(x.montaz || {})[f] || 0), 0);
  });
  r.souhrn = vsSoucetSouhrnu(vys, ksy, cenik);
  return r;
}

/* ---------- obal výpočtu ----------
 * `ock` = v.data.ock, `cenik` = v.data.cenik. Jedna šachta → přímo vypocet().
 * Víc šachet → součet se stejným tvarem jako vypocet() a navíc
 *   sachty: [{ id, nazev, ks, vysl, cenaPredZaokr, cenaRozpis }]
 * (cenaRozpis = celé Kč po rozpočtu R7, Σ = souhrn.zakladCena). */
function vypocetZakazkyOck(ock, cenik, jekly) {
  if (!ock || typeof ock !== 'object') return vypocet(undefined, cenik, jekly, true);
  if (!rezimViceSachet(ock) || ock.fixes === false)
    return vypocet(ock.zadani, cenik, jekly, ock.fixes);          // dnešní cesta beze změny (i Model 1, 3.5)
  const l = sachtyZ(ock);
  const vys = l.map(s => vypocet(s.zadani, cenik, jekly, ock.fixes));
  const ksy = l.map(s => s.ks);
  const r = vsSoucet(vys, ksy, cenik);
  const castky = vys.map((x, i) => ksy[i] * (typeof x.souhrn.zakladCenaPredZaokr === 'number'
    ? x.souhrn.zakladCenaPredZaokr : x.souhrn.zakladNaklad + x.souhrn.zakladMarze));
  const rozpis = rozpocetSachet(r.souhrn.zakladCena, castky);
  r.sachty = l.map((s, i) => ({ id: s.id, nazev: vsNazev(s, i), ks: s.ks, vysl: vys[i],
    cenaPredZaokr: castky[i], cenaRozpis: rozpis[i] }));
  r.sachtyVerze = 1;
  return r;
}

/* Výsledek OCK varianty z jejích dat (v.data) — náhrada volání
 * `vypocet(d.ock.zadani, d.cenik, jekly, d.ock.fixes)` všude, kde se počítá
 * cena celé varianty (zámek, server, schvalování, výjimky, sluzba). */
function vypocetOckDat(d, jekly) {
  if (!d || !d.ock) return vypocet(undefined, d && d.cenik, jekly, true);
  return vypocetZakazkyOck(d.ock, d.cenik, jekly);
}

/* ---------- tvar dat pro server ----------
 * Vrací seznam problémů { kde, duvod } (duvod 'typ' | 'limit'). Prázdný =
 * tvar v pořádku. Zadání šachet 2+ kontroluje server stejnými funkcemi jako
 * šachtu 1 přes vsRozvinZakazku (uloziste.js). */
function vsTvarProblemy(ock) {
  const out = [];
  if (!ock || typeof ock !== 'object') return out;
  const ksOk = x => x === undefined || (Number.isInteger(x) && x >= 1 && x <= VS_KS_MAX);
  const nazevOk = x => x === undefined || (typeof x === 'string' && x.length <= VS_NAZEV_MAX);
  if (!ksOk(ock.ks)) out.push({ kde: 'ock.ks', duvod: 'typ' });
  if (!nazevOk(ock.nazev)) out.push({ kde: 'ock.nazev', duvod: 'typ' });
  if (ock.dalsi === undefined) return out;
  if (!Array.isArray(ock.dalsi)) { out.push({ kde: 'ock.dalsi', duvod: 'typ' }); return out; }
  if (ock.dalsi.length > VS_VARIANT_MAX - 1) { out.push({ kde: 'ock.dalsi', duvod: 'limit' }); return out; }
  const ids = new Set();
  ock.dalsi.forEach((s, i) => {
    const c = 'ock.dalsi[' + i + ']';
    if (!s || typeof s !== 'object' || Array.isArray(s)) { out.push({ kde: c, duvod: 'typ' }); return; }
    if (typeof s.id !== 'string' || !VS_ID_TVAR.test(s.id) || s.id === 's1' || ids.has(s.id)) out.push({ kde: c + '.id', duvod: 'typ' });
    else ids.add(s.id);
    if (!ksOk(s.ks)) out.push({ kde: c + '.ks', duvod: 'typ' });
    if (!nazevOk(s.nazev)) out.push({ kde: c + '.nazev', duvod: 'typ' });
    if (!s.zadani || typeof s.zadani !== 'object' || Array.isArray(s.zadani)) out.push({ kde: c + '.zadani', duvod: 'typ' });
    const navic = Object.keys(s).filter(k => ['id', 'nazev', 'ks', 'zadani', 'techspec'].indexOf(k) < 0);
    if (navic.length) out.push({ kde: c, duvod: 'typ' });
  });
  return out;
}

/* Zakázka rozvinutá na šachty: varianta s dalšími šachtami dostane za sebe
 * „stínové" varianty se zadáním šachty 2+ (id `<id>.<id šachty>`), aby je
 * server prověřil TÝMIŽ kontrolami jako šachtu 1 (typy, záporné hodnoty,
 * rozměry, skupiny můstků, přepisy cen podle role, vyřazené řádky…).
 * Stínové varianty mají jen data, ne zámek, a jinde se nepoužívají. */
function vsRozvinZakazku(zak) {
  if (!zak || typeof zak !== 'object' || !Array.isArray(zak.varianty)) return zak;
  const varianty = [];
  zak.varianty.forEach(v => {
    const d = v && v.data;
    if (!d || !d.ock || !Array.isArray(d.ock.dalsi)) return;
    d.ock.dalsi.forEach((s, i) => {
      if (!s || typeof s !== 'object' || !s.zadani || typeof s.zadani !== 'object') return;
      const sid = (typeof s.id === 'string' && VS_ID_TVAR.test(s.id)) ? s.id.slice(0, 39) : 's' + (i + 2);
      varianty.push(Object.assign({}, v, { id: String(v.id).slice(0, 40) + '.' + sid,
        data: Object.assign({}, d, { ock: { zadani: s.zadani, fixes: d.ock.fixes } }) }));
    });
  });
  return Object.assign({}, zak, { varianty });
}

/* ZAKÁZKA S VÍC ŠACHTAMI A VYPNUTÝ VYPÍNAČ (VS #570, R21 — J. V. 10. 11. 2026).
 * Cena a dokumenty se počítají podle dat (vypnutí nemění cenu uložené
 * nabídky, tisk funguje); měnit šachty nejde — server změnu šachtové části
 * odmítne (409, uloVsProblemy) a lišta to řekne hned při otevření. Vrací text
 * lišty, nebo '' (funkce zapnutá / zakázka bez víc šachet). */
function vsVypnutoHlaska(zak, zapnuto) {
  if (zapnuto) return '';
  const vs = (zak && Array.isArray(zak.varianty) ? zak.varianty : [])
    .filter(v => v && v.data && vsMaData(v.data.ock));
  if (!vs.length) return '';
  return 'Zakázka má víc šachet — funkce je v Nastavení vypnutá. Cena a dokumenty se počítají podle uložených dat; '
    + 'šachty (počet variant, kusy, názvy) teď nejde měnit — zapnout je může administrátor (Nastavení → Zkušební funkce).';
}
function vsZakazkaMaData(zak) {
  return !!(zak && Array.isArray(zak.varianty) && zak.varianty.some(v => v && v.data && vsMaData(v.data.ock)));
}

/* Názvy šachet varianty pro hledání v seznamu variant (VS #570 E3). Bez
 * víc šachet '' — hledání beze změny. */
function vsNazvySachetText(ock) {
  if (!rezimViceSachet(ock)) return '';
  return sachtyZ(ock).map((s, i) => vsNazev(s, i)).join(' ');
}

if (typeof module !== 'undefined' && module.exports)
  module.exports = { VS_VARIANT_MAX, VS_KS_MAX, VS_NAZEV_MAX, vsKs, vsDalsi, rezimViceSachet, vsMaData, sachtyZ, vsNazev, vsPocty,
    rozpocetSachet, vsKlicPriplatku, vsKlicRadku, vsSlucRadky, priplatkySloucene, vsSoucetSouhrnu, vsSoucet,
    vypocetZakazkyOck, vypocetOckDat, vsTvarProblemy, vsRozvinZakazku, vsVypnutoHlaska, vsZakazkaMaData, vsNazvySachetText };
