/* ============================================================
 * PLÁN PLATEB PROJEKCE (etapa B platebních podmínek, roadmapa #367,
 * rozhodnutí J. V. 29. 9. 2026 — podklady/NAVRH_PLATEBNI_PODMINKY_2026-09-29.md,
 * oddíl 3 a 7; bod P9.3 z #366).
 *
 * PROČ. Platby projekce žily na třech místech, která spolu nemluvila:
 * pevná procenta po činnostech v nabídce PROJ (nabidka_proj.js), záloha
 * 30/50/70 % v krycím listu PROJ a věta „100 % po dokončení stupně"
 * v Nastavení → Firma; splátky SoD PROJ se psaly ručně do osmi pevných
 * polí (sodpPlatba1–8) a nikdo nehlídal, že dají cenu díla. Plán plateb je
 * JEDEN: pro každou nabízenou činnost splátky „procento + milník". Nabídka,
 * krycí list i SoD ho jen čtou.
 *
 * TENHLE MODUL je čisté jádro bez DOM (prohlížeč i server, stejný kód):
 *   – katalog milníků projekce a čtyři předvolby (PLAN_PROJ_VYCHOZI; firma si
 *     je smí upravit v Nastavení → Firma — `firemni` parametr všech funkcí),
 *   – řádky splátek činnosti podle předvolby (planRadkyCinnosti),
 *   – dopočet plateb SoD: procento × cena činnosti PO SLEVĚ, splátky se
 *     stejným milníkem se sečtou do jedné platby, zaokrouhlení nese poslední
 *     splátka činnosti (celé koruny, poslední dorovná na haléř), ruční přepis
 *     částky platí (planPlatebDopocet),
 *   – kontroly pro zábranu dokumentu: 100 % u každé nabízené činnosti,
 *     kladná procenta, známý milník, součet plateb = cena díla
 *     (planPlatebKontrola),
 *   – převod starších ručních splátek SoD (planPlatebZeStarych).
 * Autorský dozor se fakturuje měsíčně a do splátek nepatří — v seznamu
 * činností není.
 *
 * DATA VARIANTY (zapojí je další bod etapy B): data.kryciProj.planPlateb =
 *   { v:1, predvolba:'std'|'zaloha'|'sto'|'vlastni', zaloha:0|30|50|70,
 *     cinnosti:{ <k>:[{ p, m, t? }] },   // jen upravené činnosti
 *     prepis:{ <klíč platby>: Kč } }      // ruční částky plateb SoD
 * Chybějící plán = výchozí předvolba firmy. Nic se nezapisuje při importu
 * (parita prohlížeč × server, zamčené varianty — N43).
 * ============================================================ */

const PLAN_PROJ_SEKCE = ['zamereni', 'studie', 'projednani', 'dpz', 'ic', 'dps', 'ezc', 'kolaudace', 'geodet'];
const PLAN_PROJ_PREDVOLBY = ['std', 'zaloha', 'sto', 'vlastni'];
const PLAN_PROJ_ZALOHY = [0, 30, 50, 70];
/* Id milníků jsou stálá (klíč plateb a ručních přepisů), pořadí katalogu =
 * pořadí plateb ve SoD. Texty jsou z prototypu plánu plateb (29. 9. 2026). */
const PLAN_PROJ_MILNIKY = [
  { id: 'podpis', cz: 'po podpisu smlouvy / objednávky' },
  { id: 'za_vystupy', cz: 'po zhotovení výstupů ze zaměření' },
  { id: 'sp_predani', cz: 'po předání studie proveditelnosti' },
  { id: 'sp_pamatky', cz: 'po předání vyjádření odboru památkové péče HMP' },
  { id: 'dpz_doss', cz: 'po dokončení dokumentace pro povolení záměru v rozsahu pro podání na dotčené orgány' },
  { id: 'dpz_su', cz: 'po dokončení dokumentace pro povolení záměru v rozsahu pro podání na stavební úřad' },
  { id: 'ic_podani', cz: 'po získání stanovisek dotčených orgánů a po podání dokumentace na stavební úřad a zahájení řízení' },
  { id: 'ic_povoleni', cz: 'po vydání pravomocného povolení záměru' },
  { id: 'dps_predani', cz: 'po předání kompletní dokumentace pro provedení stavby (DPS)' },
  { id: 'ezc_predani', cz: 'po předání ekonomické zadávací části (EZC)' },
  { id: 'vyber', cz: 'po doporučení dodavatele realizace' },
  { id: 'kol_pred', cz: 'před zahájením kolaudačního řízení' },
  { id: 'kol_po', cz: 'po vydání kolaudačního rozhodnutí' },
  { id: 'geo_predani', cz: 'po předání geodetického zaměření' },
];
const PLAN_PROJ_VYCHOZI = {
  v: 1, vychozi: 'std', zalohaPct: 50,
  milniky: PLAN_PROJ_MILNIKY,
  /* Standard po činnostech = dnešní procenta pevných bloků nabídky PROJ.
   * Projednání a geodet dnes blok nemají — výchozí návrh J. V. (Q1, Q2):
   * 100 % po předání vyjádření OPP HMP, resp. po předání zaměření. */
  standard: {
    zamereni: [{ p: 50, m: 'podpis' }, { p: 50, m: 'za_vystupy' }],
    studie: [{ p: 50, m: 'podpis' }, { p: 40, m: 'sp_predani' }, { p: 10, m: 'sp_pamatky' }],
    projednani: [{ p: 100, m: 'sp_pamatky' }],
    dpz: [{ p: 50, m: 'podpis' }, { p: 30, m: 'dpz_doss' }, { p: 20, m: 'dpz_su' }],
    ic: [{ p: 50, m: 'podpis' }, { p: 30, m: 'ic_podani' }, { p: 20, m: 'ic_povoleni' }],
    dps: [{ p: 50, m: 'podpis' }, { p: 50, m: 'dps_predani' }],
    ezc: [{ p: 50, m: 'podpis' }, { p: 50, m: 'ezc_predani' }],
    kolaudace: [{ p: 50, m: 'kol_pred' }, { p: 50, m: 'kol_po' }],
    geodet: [{ p: 100, m: 'geo_predani' }],
  },
  /* Milník „po předání" činnosti — pro předvolby Záloha a 100 %. */
  predani: { zamereni: 'za_vystupy', studie: 'sp_predani', projednani: 'sp_pamatky', dpz: 'dpz_su',
             ic: 'ic_povoleni', dps: 'dps_predani', ezc: 'ezc_predani', kolaudace: 'kol_po', geodet: 'geo_predani' },
};
/* Názvy činností pro člověka: zkratka do vět kontrol a „složení" plateb,
 * celý název do editoru plánu. */
const PLAN_PROJ_ZKRATKY = { zamereni: 'ZA', studie: 'SP', projednani: 'projednání', dpz: 'DPZ', ic: 'IČ',
  dps: 'DPS', ezc: 'EZC', kolaudace: 'kolaudace', geodet: 'geodet' };
const PLAN_PROJ_NAZVY = { zamereni: 'Zaměření', studie: 'Studie proveditelnosti', projednani: 'Projednání studie',
  dpz: 'Dokumentace pro povolení záměru (DPZ)', ic: 'Inženýrská činnost (IČ)',
  dps: 'Dokumentace pro provedení stavby (DPS)', ezc: 'Ekonomická zadávací část (EZC)',
  kolaudace: 'Zajištění kolaudačního řízení', geodet: 'Geodetické zaměření' };
const PLAN_PROJ_PREDVOLBY_NAZVY = { std: 'Standard po činnostech', zaloha: 'Záloha + zbytek po předání',
  sto: '100 % po dokončení stupně', vlastni: 'Vlastní' };
/* Pořadí ručních splátek starší šablony SoD PROJ (sodpPlatba1–8, krycí list). */
const PLAN_SODP_STARE = ['podpis', 'za_vystupy', 'dpz_doss', 'dpz_su', 'ic_povoleni', 'dps_predani', 'ezc_predani', 'vyber'];

function planFiremni(f) {
  const ok = f && typeof f === 'object' && Array.isArray(f.milniky) && f.standard && f.predani;
  return ok ? f : PLAN_PROJ_VYCHOZI;
}
/* Firemní plán, jak platí pro zakázky: z firemních údajů (Nastavení →
 * Firma, zveřejněné na serveru), a jen když má platný tvar — rozepsaný
 * nebo poškozený plán nesmí rozbít nabídku ani smlouvu, platí pak výchozí
 * z kódu (administrátor vady vidí v Nastavení). */
function planFirmaPlan(firma) {
  const p = firma && typeof firma === 'object' ? firma.planPlatebProj : null;
  return planFiremni(p && !planPlatebFirmaVady(p).length ? p : null);
}
/* 50 → „50 %", 12.5 → „12,5 %" (texty plánu, česky). */
function planPct(p) {
  const n = +p;
  return (isFinite(n) ? String(Math.round(n * 100) / 100).replace('.', ',') : '?') + ' %';
}
function planPredvolba(plan, firemni) {
  const f = planFiremni(firemni);
  const p = plan && plan.predvolba;
  if (PLAN_PROJ_PREDVOLBY.indexOf(p) >= 0) return p;
  return PLAN_PROJ_PREDVOLBY.indexOf(f.vychozi) >= 0 ? f.vychozi : 'std';
}
function planMilnikText(r, firemni) {
  if (!r) return null;
  if (r.m === 'vlastni') { const t = String(r.t == null ? '' : r.t).trim(); return t || null; }
  const m = planFiremni(firemni).milniky.find(x => x && x.id === r.m);
  return m ? String(m.cz || '') : null;
}
/* Řádky splátek jedné činnosti: [{ p, m, t }] (t = text milníku, null =
 * neznámý milník). Upravená činnost (plan.cinnosti[k]) má přednost v každé
 * předvolbě; Vlastní bez úpravy spadne na Standard. */
function planRadkyCinnosti(k, plan, firemni) {
  const f = planFiremni(firemni);
  const kopie = (radky) => (Array.isArray(radky) ? radky : []).map(r => ({
    p: +(r && r.p), m: String((r && r.m) || ''), t: planMilnikText(r, f) }));
  const upr = plan && plan.cinnosti && plan.cinnosti[k];
  if (Array.isArray(upr) && upr.length) return kopie(upr);
  const pv = planPredvolba(plan, f);
  const predani = f.predani[k] || PLAN_PROJ_VYCHOZI.predani[k];
  if (pv === 'zaloha') {
    let z = plan && plan.zaloha != null && plan.zaloha !== '' ? +plan.zaloha : +f.zalohaPct;
    if (!(z >= 0 && z < 100)) z = 0;
    return kopie(z > 0 ? [{ p: z, m: 'podpis' }, { p: 100 - z, m: predani }] : [{ p: 100, m: predani }]);
  }
  if (pv === 'sto') return kopie([{ p: 100, m: predani }]);
  return kopie((f.standard && f.standard[k]) || PLAN_PROJ_VYCHOZI.standard[k]);
}
function planKlicPlatby(r) {
  return r.m === 'vlastni' ? 'v:' + String(r.t || '').trim().toLowerCase() : r.m;
}
const planHal = (x) => Math.round(x * 100) / 100;

/* Dopočet plateb SoD PROJ. `ceny` = { činnost: cena PO SLEVĚ } — jen
 * nabízené činnosti (cena > 0), jak je dává nabidkaProjData. */
function planPlatebDopocet(ceny, plan, firemni) {
  const f = planFiremni(firemni);
  const poradi = f.milniky.map(m => m.id);
  const skupiny = new Map();
  const cinnosti = {};
  let cena = 0;
  PLAN_PROJ_SEKCE.forEach(k => {
    const c = +((ceny || {})[k]);
    if (!(c > 0) || !isFinite(c)) return;
    cena += c;
    const radky = planRadkyCinnosti(k, plan, f);
    let zbyva = c;
    cinnosti[k] = radky.map((r, i) => {
      /* Celé koruny; zaokrouhlení nese poslední splátka činnosti, takže
       * součet činnosti je přesně její cena (na haléř). */
      const kc = i < radky.length - 1 ? Math.round(c * (r.p || 0) / 100) : planHal(zbyva);
      zbyva -= kc;
      const klic = planKlicPlatby(r);
      if (!skupiny.has(klic)) skupiny.set(klic, { klic, text: r.t, vypocet: 0, casti: [] });
      const g = skupiny.get(klic);
      g.vypocet = planHal(g.vypocet + kc);
      g.casti.push({ k, p: r.p, kc });
      return Object.assign({}, r, { kc, klic });
    });
  });
  const prepis = (plan && plan.prepis && typeof plan.prepis === 'object') ? plan.prepis : {};
  const index = (klic) => { const i = poradi.indexOf(klic); return i < 0 ? poradi.length : i; };
  const vlastniPoradi = [...skupiny.keys()];
  const platby = [...skupiny.values()].sort((a, b) => (index(a.klic) - index(b.klic))
    || (vlastniPoradi.indexOf(a.klic) - vlastniPoradi.indexOf(b.klic))).map(g => {
    const pr = prepis[g.klic];
    const ma = pr !== undefined && pr !== null && pr !== '' && isFinite(+pr);
    return Object.assign(g, { castka: ma ? planHal(+pr) : g.vypocet, prepsano: ma });
  });
  const osirele = Object.keys(prepis).filter(k => !skupiny.has(k) && prepis[k] !== '' && prepis[k] != null)
    .map(k => ({ klic: k, castka: +prepis[k] }));
  const soucet = planHal(platby.reduce((a, p) => a + p.castka, 0));
  cena = planHal(cena);
  return { platby, soucet, cena, sedi: Math.round(soucet * 100) === Math.round(cena * 100), osirele, cinnosti };
}

/* Nálezy pro zábranu dokumentu: [{ kod, k?, text }]. Hlídají se jen
 * nabízené činnosti — plán nenabízené činnosti nikoho nezavazuje. */
function planPlatebKontrola(ceny, plan, firemni) {
  const f = planFiremni(firemni);
  const out = [];
  PLAN_PROJ_SEKCE.forEach(k => {
    if (!(+((ceny || {})[k]) > 0)) return;
    const radky = planRadkyCinnosti(k, plan, f);
    const soucet = radky.reduce((a, r) => a + (isFinite(r.p) ? r.p : 0), 0);
    if (radky.some(r => !(r.p > 0) || !isFinite(r.p)))
      out.push({ kod: 'kladne', k, text: 'Splátka s nulovým, záporným nebo chybějícím procentem (' + k + ').' });
    if (Math.round(soucet * 100) !== 10000)
      out.push({ kod: 'procenta', k, text: 'Splátky činnosti ' + k + ' nedávají 100 % (součet ' + soucet + ' %).' });
    if (radky.some(r => !r.t))
      out.push({ kod: 'milnik', k, text: 'Splátka činnosti ' + k + ' nemá známý milník (vyberte z katalogu nebo napište text).' });
  });
  const d = planPlatebDopocet(ceny, plan, f);
  if (!d.sedi)
    out.push({ kod: 'soucet', text: 'Součet plateb smlouvy (' + d.soucet + ' Kč) se neshoduje s cenou díla (' + d.cena + ' Kč).' });
  return out;
}

/* „95 880 Kč", „95 880,50 Kč", nezlomitelné mezery → číslo; jinak null. */
function planCastkaZTextu(t) {
  const s = String(t == null ? '' : t).replace(/[\s  ]/g, '').replace(/(Kč|CZK|,-|\.-)$/i, '').replace(',', '.');
  return /^\d+(\.\d{1,2})?$/.test(s) ? +s : null;
}
/* Starší ruční splátky SoD (krycí list, sodpPlatba1–8) → přepisy plateb
 * plánu. Nečitelná částka se nezahodí: vrátí se k upozornění. */
function planPlatebZeStarych(hodnoty) {
  const h = hodnoty && typeof hodnoty === 'object' ? hodnoty : {};
  const prepis = {}, necitelne = [];
  PLAN_SODP_STARE.forEach((klic, i) => {
    const id = 'sodpPlatba' + (i + 1);
    const t = h[id];
    if (t === undefined || t === null || String(t).trim() === '') return;
    const kc = planCastkaZTextu(t);
    if (kc === null) necitelne.push({ id, klic, text: String(t) }); else prepis[klic] = kc;
  });
  return { prepis, necitelne };
}

/* ---------- plán varianty (krok 3 etapy B: krycí list PROJ) ----------
 * Pořadí zdrojů (podklad 3.7): plán varianty (data.kryciProj.planPlateb)
 * → u ODESLANÉ (zamčené) varianty snímek z doby odeslání (zmrazenoPlan) →
 * u zamčené varianty z doby před plánem plateb nic: `stary` = dokumenty
 * tisknou pevné bloky a ruční splátky jako dřív (odeslaná nabídka se nesmí
 * změnit, A1 / P9.5). Firemní plán čte jen rozpracovaná varianta. */
function planPlatebVarianty(varianta, firma) {
  const kl = (varianta && varianta.data && varianta.data.kryciProj) || {};
  const plan = kl.planPlateb && typeof kl.planPlateb === 'object' ? kl.planPlateb : null;
  if (varianta && varianta.zamek && varianta.zamek.zamceno) {
    const z = kl.zmrazenoPlan;
    if (!z || typeof z !== 'object' || !z.cinnosti) return { plan: null, firemni: PLAN_PROJ_VYCHOZI, zmrazeny: false, stary: true };
    const firemni = Object.assign({}, PLAN_PROJ_VYCHOZI, { milniky: Array.isArray(z.milniky) ? z.milniky : [] });
    return { plan: { v: 1, predvolba: z.predvolba, zaloha: z.zaloha, cinnosti: z.cinnosti, prepis: plan && plan.prepis },
             firemni, zmrazeny: true, stary: false };
  }
  return { plan, firemni: planFirmaPlan(firma), zmrazeny: false, stary: false };
}
/* Snímek plánu při prvním zamčení: splátky všech nabízených činností
 * i s texty milníků z katalogu té doby — pozdější změna firemního plánu
 * (texty, Standard, záloha) odeslanou nabídku ani smlouvu nezmění. */
function planPlatebSnimek(plan, firemni, ceny) {
  const f = planFiremni(firemni);
  const cinnosti = {}, pouzite = new Set();
  PLAN_PROJ_SEKCE.forEach(k => {
    if (!(+((ceny || {})[k]) > 0)) return;
    cinnosti[k] = planRadkyCinnosti(k, plan, f).map(r => {
      const x = { p: r.p, m: r.m };
      if (r.m === 'vlastni') x.t = r.t || ''; else pouzite.add(r.m);
      return x;
    });
  });
  const pv = planPredvolba(plan, f);
  const z = plan && plan.zaloha != null && plan.zaloha !== '' ? +plan.zaloha : +f.zalohaPct;
  return { v: 1, predvolba: pv, zaloha: isFinite(z) ? z : 0, cinnosti,
    milniky: f.milniky.filter(m => pouzite.has(m.id)).map(m => ({ id: m.id, cz: m.cz })) };
}
/* Jsou řádky činnosti jiné než v předvolbě? (štítek „upraveno") */
function planCinnostUpravena(k, plan, firemni) {
  const upr = plan && plan.cinnosti && plan.cinnosti[k];
  if (!Array.isArray(upr) || !upr.length) return false;
  const vzor = planRadkyCinnosti(k, Object.assign({}, plan, { cinnosti: {} }), firemni);
  const a = planRadkyCinnosti(k, plan, firemni);
  return a.length !== vzor.length || a.some((r, i) => r.p !== vzor[i].p || r.m !== vzor[i].m || r.m === 'vlastni');
}
function planUpraveno(plan, firemni, ceny) {
  if (planPredvolba(plan, firemni) === 'vlastni') return false;
  return PLAN_PROJ_SEKCE.some(k => (!ceny || +ceny[k] > 0) && planCinnostUpravena(k, plan, firemni));
}
function planZalohaEf(plan, firemni) {
  const f = planFiremni(firemni);
  const z = plan && plan.zaloha != null && plan.zaloha !== '' ? +plan.zaloha : +f.zalohaPct;
  return z >= 0 && z < 100 ? z : 0;
}
/* „Standard po činnostech" / „Záloha 30 % + zbytek po předání" / „Bez
 * zálohy — 100 % po předání" / … (+ „upraveno"). */
function planPopisPredvolby(plan, firemni, ceny) {
  const pv = planPredvolba(plan, firemni);
  let t = PLAN_PROJ_PREDVOLBY_NAZVY[pv];
  if (pv === 'zaloha') { const z = planZalohaEf(plan, firemni); t = z ? 'Záloha ' + z + ' % + zbytek po předání' : 'Bez zálohy — 100 % po předání'; }
  return t + (planUpraveno(plan, firemni, ceny) ? ' (upraveno)' : '');
}
/* „50 % po podpisu smlouvy / objednávky · 50 % po zhotovení výstupů …" */
function planRadekText(r) { return planPct(r.p) + ' ' + (r.t || '(milník chybí)'); }
function planCinnostText(k, plan, firemni) { return planRadkyCinnosti(k, plan, firemni).map(planRadekText).join(' · '); }
/* Způsob fakturace projekce odvozený z předvolby (výchozí návrh Q10):
 * dřív věta z Nastavení → Firma, která se s procenty nabídky rozcházela.
 * Věta z Firmy zůstává pro předvolbu „100 % po dokončení stupně". */
function planZpusobFakturace(plan, firemni, vetaFirmy) {
  const pv = planPredvolba(plan, firemni);
  if (planUpraveno(plan, firemni) || pv === 'vlastni') return 'podle dohodnutého plánu plateb';
  if (pv === 'zaloha') {
    const z = planZalohaEf(plan, firemni);
    return z ? 'záloha ' + z + ' % po podpisu smlouvy, zbytek po předání jednotlivých stupňů dokumentace'
      : 'po předání jednotlivých stupňů dokumentace';
  }
  if (pv === 'sto') return String(vetaFirmy || '').trim() || 'po dokončení jednotlivých stupňů dokumentace';
  return 'po milnících jednotlivých činností podle plánu plateb';
}

/* ---------- firemní plán (Nastavení → Firma, krok 2 etapy B) ----------
 * Administrátor smí upravit katalog milníků, výchozí předvolbu, zálohu,
 * Standard po činnostech a milník „po předání". Zveřejňuje se s firemními
 * údaji (firma.js → /api/firma) a čte ho každá nabídka a smlouva — proto
 * stejná kontrola tvaru v prohlížeči i na serveru a čistá kopie jen se
 * známými klíči (vzor B68: objekt místo textu nebo megabajt v jednom poli
 * by zpomalil každé přihlášení). Chybějící plán (undefined) je v pořádku:
 * platí výchozí z kódu. */
const PLAN_FIRMA_MAX_MILNIKU = 40, PLAN_FIRMA_MAX_TEXT = 300, PLAN_FIRMA_MAX_RADKU = 10;
const PLAN_ID_TVAR = /^[a-z0-9_]{1,30}$/;
function planPlatebFirmaVady(f) {
  if (f === undefined || f === null) return [];
  if (typeof f !== 'object' || Array.isArray(f)) return ['plán plateb projekce není objekt'];
  const v = [];
  if (f.v !== undefined && f.v !== 1) v.push('neznámá verze tvaru plánu (' + String(f.v).slice(0, 10) + ')');
  if (PLAN_PROJ_PREDVOLBY.indexOf(f.vychozi) < 0) v.push('výchozí předvolba musí být jedna ze čtyř (Standard, Záloha, 100 %, Vlastní)');
  if (PLAN_PROJ_ZALOHY.indexOf(f.zalohaPct) < 0) v.push('záloha musí být 0, 30, 50 nebo 70 %');
  const ids = new Set();
  if (!Array.isArray(f.milniky) || !f.milniky.length) v.push('katalog milníků je prázdný');
  else {
    if (f.milniky.length > PLAN_FIRMA_MAX_MILNIKU) v.push('katalog má víc než ' + PLAN_FIRMA_MAX_MILNIKU + ' milníků');
    f.milniky.forEach((m, i) => {
      const id = m && m.id, cz = m && m.cz;
      if (typeof id !== 'string' || !PLAN_ID_TVAR.test(id) || id === 'vlastni')
        v.push('milník ' + (i + 1) + ' nemá platný klíč (malá písmena, číslice a podtržítko, ne „vlastni")');
      else if (ids.has(id)) v.push('klíč milníku „' + id + '" je v katalogu dvakrát');
      else ids.add(id);
      if (typeof cz !== 'string' || !cz.trim()) v.push('milník ' + (i + 1) + ' nemá text');
      else if (cz.length > PLAN_FIRMA_MAX_TEXT) v.push('text milníku ' + (i + 1) + ' je delší než ' + PLAN_FIRMA_MAX_TEXT + ' znaků');
    });
    if (!ids.has('podpis')) v.push('katalog musí mít milník „podpis" (po podpisu smlouvy) — stojí na něm předvolba Záloha');
  }
  const cinnost = (k) => PLAN_PROJ_ZKRATKY[k] || k;
  if (!f.standard || typeof f.standard !== 'object' || Array.isArray(f.standard)) v.push('Standard po činnostech chybí');
  else Object.keys(f.standard).forEach(k => {
    if (PLAN_PROJ_SEKCE.indexOf(k) < 0) { v.push('Standard obsahuje neznámou činnost „' + String(k).slice(0, 30) + '"'); return; }
    const r = f.standard[k];
    if (!Array.isArray(r) || !r.length) { v.push('Standard ' + cinnost(k) + ' nemá žádnou splátku'); return; }
    if (r.length > PLAN_FIRMA_MAX_RADKU) v.push('Standard ' + cinnost(k) + ' má víc než ' + PLAN_FIRMA_MAX_RADKU + ' splátek');
    let soucet = 0;
    r.forEach((x, i) => {
      const p = x && x.p;
      if (typeof p !== 'number' || !isFinite(p) || !(p > 0) || p > 100)
        v.push('Standard ' + cinnost(k) + ', splátka ' + (i + 1) + ': procento musí být kladné číslo do 100');
      else soucet += p;
      if (!x || !ids.has(x.m)) v.push('Standard ' + cinnost(k) + ', splátka ' + (i + 1) + ': milník není v katalogu');
    });
    if (Math.round(soucet * 100) !== 10000) v.push('Standard ' + cinnost(k) + ' nedává 100 % (součet ' + planHal(soucet) + ' %)');
  });
  if (!f.predani || typeof f.predani !== 'object' || Array.isArray(f.predani)) v.push('milníky „po předání" chybí');
  else Object.keys(f.predani).forEach(k => {
    if (PLAN_PROJ_SEKCE.indexOf(k) < 0) v.push('„po předání" obsahuje neznámou činnost „' + String(k).slice(0, 30) + '"');
    else if (!ids.has(f.predani[k])) v.push('„po předání" u ' + cinnost(k) + ': milník není v katalogu');
  });
  return v;
}
/* Čistá hluboká kopie jen se známými klíči (pro zápis na server a srovnání
 * se zveřejněnou verzí). Předpokládá platný tvar — volá se po kontrole. */
function planPlatebFirmaCisty(f) {
  const radky = (r) => (Array.isArray(r) ? r : []).map(x => ({ p: +x.p, m: String(x.m) }));
  const out = { v: 1, vychozi: f.vychozi, zalohaPct: f.zalohaPct,
    milniky: f.milniky.map(m => ({ id: String(m.id), cz: String(m.cz) })), standard: {}, predani: {} };
  PLAN_PROJ_SEKCE.forEach(k => {
    if (f.standard && f.standard[k]) out.standard[k] = radky(f.standard[k]);
    if (f.predani && f.predani[k]) out.predani[k] = String(f.predani[k]);
  });
  return out;
}

if (typeof module !== 'undefined')
  module.exports = { PLAN_PROJ_SEKCE, PLAN_PROJ_PREDVOLBY, PLAN_PROJ_ZALOHY, PLAN_PROJ_MILNIKY, PLAN_PROJ_VYCHOZI,
    PLAN_PROJ_ZKRATKY, PLAN_PROJ_NAZVY, PLAN_PROJ_PREDVOLBY_NAZVY,
    PLAN_SODP_STARE, planFiremni, planFirmaPlan, planPct, planPredvolba, planMilnikText, planRadkyCinnosti, planPlatebDopocet,
    planPlatebKontrola, planCastkaZTextu, planPlatebZeStarych, planPlatebFirmaVady, planPlatebFirmaCisty,
    planPlatebVarianty, planPlatebSnimek, planCinnostUpravena, planUpraveno, planZalohaEf, planPopisPredvolby,
    planRadekText, planCinnostText, planZpusobFakturace, planKlicPlatby };
