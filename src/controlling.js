/* ============================================================
 * CONTROLLING — nákladové skupiny (kapitoly) a rozvrh předkalkulace
 * (#447, dávka C1, 20. 10. 2026; návrh podklady/CONTROLLING_NAVRH_20_10.md)
 *
 * Zadání J. V.: dát controllingu (A. Mácová) předkalkulované náklady
 * rozdělené do nákladových skupin tak, aby šly v Reporting CZ porovnat
 * s účetními daty z Heliosu (PRE × POST).
 *
 * Tři věci v jednom modulu, sdíleném prohlížečem i serverem:
 *   1. ČÍSELNÍK SKUPIN (kapitol) — název, položka manažerské výsledovky,
 *      účet Helios nyní / budoucí, přímý × nepřímý, variabilní × fixní;
 *   2. MAPOVÁNÍ KLÍČE → SKUPINA — podle STABILNÍHO KLÍČE ceníku (`C.…`,
 *      `PC.…`), nikdy podle názvu (Andy 1. 9. 2026: „určitě ty položky mají
 *      nějaké primární klíče, abychom to nemuseli párovat jen dle názvu");
 *   3. ROZVRH VÝSLEDKU VÝPOČTU do skupin — řádek kalkulace → klíč → skupina.
 *
 * MIMO JÁDRO VÝPOČTU, SCHVÁLNĚ. Rozvrh čte hotový výsledek `vypocet` /
 * `vypocetProj` (u zamčené varianty zmrazený `zamek.vysledek`) a nic v něm
 * nemění. Engine se tím nedotkne, Model 1 zůstává 1:1 a nová funkce nemůže
 * pohnout cenou ani o korunu.
 *
 * Výchozí obsah = rozvržení A. Mácové (tabulka „CENIK_2025-v2.9.4_rozvrzeni
 * nakladu", 15. 9. 2026) doplněné o položky, které přibyly později, a o
 * rozhodnutí J. V. 20. 10. 2026 (J1–J11 v podkladu). Do kódu nepatří ceny —
 * jen klíče, názvy, skupiny a čísla účtů z účtové osnovy.
 * ============================================================ */

/* Druh „není náklad" — přirážka, DPH, kurz, počty hodin, výchozí hodnoty
 * zadání, přepínač lakování. Takový klíč nikdy nevytvoří řádek nákladu
 * (hodiny se objeví v řádku, kterému dávají množství). */
const CTRL_NENI_NAKLAD = 'x';
/* Skupina pro všechno, co zařazené není — v exportu se nic neztratí
 * a součet kapitol sedí s nákladem kalkulace. */
const CTRL_NEZARAZENO = 'nezarazeno';

const CTRL_TYPY = ['primy', 'neprimy'];
const CTRL_CHOVANI = ['variabilni', 'fixni'];
const CTRL_OBLASTI = ['ock', 'proj', 'obe'];

/* ČÍSELNÍK SKUPIN. `id` je stabilní (na něj ukazuje mapování i export),
 * `nazev` jde v Nastavení přejmenovat. Účty jsou pole — Andy u lakování,
 * projekce a zámečníků uvádí dva (518800 a 518001). */
const CTRL_SKUPINY_VYCHOZI = [
  { id: 'cestovne', nazev: 'Cestovné', manVysl: 'Ostatní přímé náklady',
    ucetNyni: ['512001'], ucetBudouci: ['512001'], typ: 'primy', chovani: 'variabilni', oblast: 'obe' },
  { id: 'sl-dopravne', nazev: 'Ostatní služby – dopravné', manVysl: 'Ostatní přímé náklady',
    ucetNyni: ['518400'], ucetBudouci: ['518400'], typ: 'primy', chovani: 'variabilni', oblast: 'ock' },
  { id: 'sl-lakovani', nazev: 'Ostatní služby – lakování', manVysl: 'Ostatní služby k zakázkám',
    ucetNyni: ['518800', '518001'], ucetBudouci: ['518001'], typ: 'primy', chovani: 'variabilni', oblast: 'ock' },
  { id: 'sl-stavebni', nazev: 'Ostatní služby – stavební práce', manVysl: 'Stavební práce – kooperace',
    ucetNyni: ['518800'], ucetBudouci: [], typ: 'primy', chovani: 'variabilni', oblast: 'ock' },
  /* J3 (20. 10. 2026): 3D zaměření dělá interně náš technik/projektant —
   * zůstává tady (projekce), Andy to dostane jako odpověď na svůj dotaz. */
  { id: 'sl-projekce', nazev: 'Ostatní služby – projekce, engineering a dokumentace', manVysl: 'Ostatní služby k zakázkám',
    ucetNyni: ['518800', '518001'], ucetBudouci: [], typ: 'primy', chovani: 'variabilni', oblast: 'ock' },
  { id: 'sl-leseni', nazev: 'Ostatní služby – lešení', manVysl: 'Ostatní služby k zakázkám',
    ucetNyni: ['518800'], ucetBudouci: [], typ: 'primy', chovani: 'variabilni', oblast: 'ock' },
  { id: 'sl-zamecnici', nazev: 'Ostatní služby – zámečníci', manVysl: 'Stavební práce – kooperace',
    ucetNyni: ['518800', '518001'], ucetBudouci: [], typ: 'primy', chovani: 'variabilni', oblast: 'ock' },
  { id: 'mat-ostatni', nazev: 'Spotřeba materiálu – stavební – ostatní', manVysl: 'Přímý materiál',
    ucetNyni: [], ucetBudouci: [], typ: 'primy', chovani: 'variabilni', oblast: 'ock' },
  { id: 'mat-plechy', nazev: 'Spotřeba materiálu – stavební – plechy', manVysl: 'Přímý materiál',
    ucetNyni: [], ucetBudouci: [], typ: 'primy', chovani: 'variabilni', oblast: 'ock' },
  { id: 'mat-profily', nazev: 'Spotřeba materiálu – stavební – profily', manVysl: 'Přímý materiál',
    ucetNyni: [], ucetBudouci: [], typ: 'primy', chovani: 'variabilni', oblast: 'ock' },
  { id: 'mat-sklo', nazev: 'Spotřeba materiálu – stavební – sklo', manVysl: 'Přímý materiál',
    ucetNyni: [], ucetBudouci: [], typ: 'primy', chovani: 'variabilni', oblast: 'ock' },
  { id: 'mat-spojovaci', nazev: 'Spotřeba materiálu – stavební – spojovací materiál', manVysl: 'Přímý materiál',
    ucetNyni: [], ucetBudouci: [], typ: 'primy', chovani: 'variabilni', oblast: 'ock' },
  /* J1 (20. 10. 2026): Režie kanceláře je paušál za zakázku, ne přímý
   * náklad — kalkulační příspěvek na správní režii. Neporovnává se
   * s přímými náklady zakázky z účetnictví. */
  { id: 'rezie-prispevek', nazev: 'Režie – kalkulační příspěvek', manVysl: 'Mix výrobní režie a správní režie',
    ucetNyni: [], ucetBudouci: [], typ: 'neprimy', chovani: 'fixni', oblast: 'ock' },
  /* J4 (20. 10. 2026): rezervy se nerozpouštějí do kapitol — ve vlastní
   * skupině je při porovnání se skutečností vidět, kolik se spotřebovalo. */
  { id: 'rezerva', nazev: 'Rezerva', manVysl: '',
    ucetNyni: [], ucetBudouci: [], typ: 'neprimy', chovani: 'variabilni', oblast: 'ock' },
  /* PROJ — zatím NÁVRH (Andy rozvrhla jen OCK; PROJ s ní v prosinci). */
  { id: 'proj-prace', nazev: 'Projekce – vlastní práce', manVysl: '',
    ucetNyni: [], ucetBudouci: [], typ: 'primy', chovani: 'variabilni', oblast: 'proj' },
  { id: 'proj-subdodavky', nazev: 'Projekce – subdodávky', manVysl: '',
    ucetNyni: [], ucetBudouci: [], typ: 'primy', chovani: 'variabilni', oblast: 'proj' },
  { id: 'proj-ic', nazev: 'Inženýrská činnost a projednání', manVysl: '',
    ucetNyni: [], ucetBudouci: [], typ: 'primy', chovani: 'variabilni', oblast: 'proj' },
  { id: CTRL_NEZARAZENO, nazev: 'Nezařazeno', manVysl: '',
    ucetNyni: [], ucetBudouci: [], typ: 'primy', chovani: 'variabilni', oblast: 'obe' },
];

/* VÝCHOZÍ MAPOVÁNÍ. Klíče ceníku (CENIK_DEF, CENIK_DEF_PROJ, CENIK_STARI_EXTRA)
 * hlídá src/test_controlling.js: nový klíč bez řádku tady shodí testy dřív,
 * než se dostane do provozu.
 *
 * Pseudo-klíče pro řádky výpočtu, které klíč ceníku nemají:
 *   R.rezervaZaklad, R.rezervaPriplatky  rezerva (procento z nákladu)
 *   R.atypPrirazka                       přirážka za ATYP (procento z Režie)
 *   Z.zamecnikAtypKc                     zámečník atyp (částka ze zakázky)
 *   C.spojovaci.*, C.lak.*               souhrnné řádky spojovacího materiálu a lakování
 *   PC.doprava                           doprava sekce PROJ (km a hodiny cesty)
 *   K.<kid>                              trvalá vlastní položka katalogu (přiřadí admin)
 *   V.<sekce>                            ruční / vlastní řádek — výchozí skupina podle sekce */
const CTRL_MAPA_VYCHOZI = (() => {
  const m = {};
  const dej = (skupina, klice) => klice.forEach(k => { m[k] = skupina; });
  dej('cestovne', ['C.cestovniKc', 'PC.dopravaKmKc', 'PC.dopravaHodKc', 'PC.doprava']);
  dej('sl-dopravne', ['C.transportKc']);
  dej('sl-lakovani', ['C.lak.lakovnaProfilBm', 'C.lak.lakovnaListaBm', 'C.lak.lakovnaM2', 'C.lak.tomasProfilM2',
    'C.lak.tomasListaBm', 'C.lak.tomasPlechKs', 'C.lak.tomasOplechM2', 'C.lak.tomasTercKs', 'C.lak.*']);
  /* J6: tmelení zůstává jednou sazbou materiál + práce → stavební práce. */
  dej('sl-stavebni', ['C.montazHodKc', 'C.priplatky.montazDveriKc', 'C.priplatky.prechMontKc',
    'C.priplatky.demontazOhrazeniKc', 'C.priplatky.demontazVytahuKc', 'C.cisteniKc', 'C.priplatky.malbaSchodnicKc',
    'C.priplatky.naterOhrazeniKc', 'C.priplatky.naterOkopovychKc', 'C.oplechPracKc', 'C.praceOplasteniKc',
    'C.zabradliKc', 'C.soklBmKc', 'C.stavbyvedouciKc', 'C.tmeleniKc']);
  dej('rezie-prispevek', ['C.rezieKancelareKc']);
  /* J4: přirážka za ATYP je práce projektanta navíc → projekce. */
  dej('sl-projekce', ['C.sken3dKc', 'C.vystupZamereniKc', 'C.engineeringKc', 'C.projekceHodKc', 'C.statikaKc',
    'C.prekladyKc', 'R.atypPrirazka']);
  dej('sl-leseni', ['C.leseniVnitrniKc', 'C.leseniFix', 'C.leseniVnejsiKc', 'C.priplatky.leseniHlavaKc']);
  /* J10: můstek (dodávka vč. montáže) → zámečníci. */
  dej('sl-zamecnici', ['C.spodniRamKc', 'C.cilkoKc', 'C.nytKc', 'C.zamecnikAtypKc', 'Z.zamecnikAtypKc', 'C.mustekKc']);
  dej('mat-ostatni', ['C.montazniNosnik', 'C.lemovaniKgKc', 'C.vetraciMrizkaKc', 'C.zastreseniM2Kc',
    'C.oplechFasadaBmKc', 'C.plastKotvyKc', 'C.striskaDvurKc', 'C.hakyKc', 'C.priplatky.medStrechaM2',
    'C.priplatky.ventilatorKc', 'C.priplatky.zabranyDvereKc', 'C.priplatky.madlaBmKc', 'C.priplatky.zabranyPadKc',
    'C.priplatky.destovySvodKc', 'C.cetrisKc']);
  dej('mat-plechy', ['C.powertechExt', 'C.powertechInt', 'C.prechodoveKgKc']);
  dej('mat-profily', ['C.profilasKgKc']);
  dej('mat-sklo', ['C.skloBokyKc', 'C.skloCelniKc', 'C.skloVsg442Kc', 'C.priplatky.vsgFolieM2', 'C.priplatky.sknM2',
    'C.priplatky.prosklenaStenaKc']);
  dej('mat-spojovaci', ['C.spojovaci.riplockM10', 'C.spojovaci.riplockM8', 'C.spojovaci.nordlock', 'C.spojovaci.nytM10',
    'C.spojovaci.nytM8', 'C.spojovaci.nytM6', 'C.spojovaci.tSrouby', 'C.spojovaci.sroubM10', 'C.spojovaci.sroubM8',
    'C.spojovaci.sroubM6', 'C.spojovaci.zavitTyc', 'C.spojovaci.chemKotva', 'C.spojovaci.*']);
  dej('rezerva', ['R.rezervaZaklad', 'R.rezervaPriplatky']);
  dej('proj-prace', ['PC.sazby.projektant', 'PC.sazby.statik', 'PC.sazby.zamereni']);
  dej('proj-subdodavky', ['PC.fixy.pbr', 'PC.fixy.studieOsvitu', 'PC.fixy.elektroDpz', 'PC.fixy.elektroDps',
    'PC.fixy.ezc', 'PC.fixy.geodet']);
  dej('proj-ic', ['PC.fixy.pamatkari', 'PC.fixy.uzemniRozvoj', 'PC.fixy.ic', 'PC.fixy.kolaudace']);
  /* Ruční a vlastní řádky: výchozí skupina podle sekce, ve které stojí. */
  dej('mat-ostatni', ['V.hrubaOck', 'V.oplasteni', 'V.volitelne', 'V.priplatky']);
  dej('sl-zamecnici', ['V.atyp']);
  dej('sl-projekce', ['V.rezie']);
  dej('mat-spojovaci', ['V.spojovaci']);
  dej('sl-lakovani', ['V.lakovani']);
  dej('proj-prace', ['V.proj']);
  /* Není náklad: přirážky, DPH, kurz, počty hodin a výchozí hodnoty zadání,
   * typy skel (text), přepínač lakování a procenta ATYP, která jen
   * předvyplní zadání (náklad pak nese řádek, do kterého jdou). */
  dej(CTRL_NENI_NAKLAD, ['C.marze', 'C.dph', 'PC.marze', 'PC.dph', 'C.dphZakladni', 'C.dphSnizena', 'C.dphNulova',
    'C.kurzEurKc', 'PC.kurzEurKc', 'C.statikaHod', 'C.statikaOplHod', 'C.stavbyvedouciHod', 'C.zaskleniListyProjHod',
    'C.vychMontazZakladHod', 'C.vychProjekceZakladHod', 'C.vychOplechOstatniKg', 'C.vychOplechOstatniHod',
    'C.lak.rezim', 'C.skloBokyNazev', 'C.skloCelniNazev', 'C.atypPrirazka', 'C.atypMontazPct', 'C.atypProjekcePct',
    'C.atypZamecnikKc', 'C.atypRezervaZakladPct', 'C.atypRezervaPriplatkyPct']);
  return m;
})();

/* Meze uloženého záznamu — server klientovi nevěří (vzor slovníku #401). */
const CTRL_MEZE = {
  skupin: 100,
  klicu: 2000,
  klic: 120,
  text: 200,
  uctu: 10,
  ucet: 20,
  poznamka: 500,
  telo: 256 * 1024,
  db: 1024 * 1024,
  historie: 30,
  verze: 1000000,
};
const CTRL_ID_TVAR = /^[a-z0-9][a-z0-9-]{0,39}$/;
/* Klíč mapování: písmena, číslice, tečka, podtržítko, pomlčka a hvězdička
 * souhrnného řádku (`C.spojovaci.*`). Bez mezer a závorek — jde do exportu. */
const CTRL_KLIC_TVAR = /^[A-Za-z][A-Za-z0-9_.*-]{0,119}$/;
const CTRL_UCET_TVAR = /^[0-9A-Za-z.-]{1,20}$/;
const CTRL_ZAKAZANE_KLICE = ['__proto__', 'constructor', 'prototype']
  .concat(Object.getOwnPropertyNames(Object.prototype))
  .filter((k, i, a) => a.indexOf(k) === i);
const CTRL_RIDICI = /[\u0000-\u001F\u007F￾￿]/;

const ctrlKopie = (x) => JSON.parse(JSON.stringify(x));
const ctrlMa = (o, k) => !!o && Object.prototype.hasOwnProperty.call(o, k);

function ctrlVychozi() {
  return { skupiny: ctrlKopie(CTRL_SKUPINY_VYCHOZI), mapa: Object.assign({}, CTRL_MAPA_VYCHOZI) };
}

/* Všechny klíče ceníku, které má mapování pokrýt: řádky ceníku OCK i PROJ
 * a zakázkové hodnoty mimo tabulku (přirážky, DPH). */
function ctrlKliceCeniku(def, defProj, extra) {
  const D = def || (typeof CENIK_DEF !== 'undefined' ? CENIK_DEF : []);
  const P = defProj || (typeof CENIK_DEF_PROJ !== 'undefined' ? CENIK_DEF_PROJ : []);
  const E = extra || (typeof CENIK_STARI_EXTRA !== 'undefined' ? CENIK_STARI_EXTRA : []);
  const out = [];
  [D, P].forEach(sk => (sk || []).forEach(([, rows]) => (rows || []).forEach(r => { if (r && r[0]) out.push(r[0]); })));
  (E || []).forEach(e => { if (e && e.cesta) out.push(e.cesta); });
  return out.filter((k, i, a) => a.indexOf(k) === i);
}

/* Platné mapování = výchozí z kódu, přes které leží uložené odchylky správce.
 * Nový klíč, který přibyl v kódu, tak hned dostane výchozí skupinu (test
 * úplnosti hlídá, že nějakou má) a uložený záznam ho nemusí znát.
 * Mapování na skupinu, která v číselníku není (správce ji zrušil), padá do
 * Nezařazeno. */
function ctrlPlatne(data) {
  const v = ctrlVychozi();
  const d = (data && typeof data === 'object') ? data : {};
  const skupiny = Array.isArray(d.skupiny) && d.skupiny.length ? ctrlKopie(d.skupiny) : v.skupiny;
  if (!skupiny.some(s => s.id === CTRL_NEZARAZENO))
    skupiny.push(ctrlKopie(CTRL_SKUPINY_VYCHOZI.find(s => s.id === CTRL_NEZARAZENO)));
  const mapa = Object.assign({}, v.mapa);
  if (d.mapa && typeof d.mapa === 'object')
    Object.keys(d.mapa).forEach(k => { if (!CTRL_ZAKAZANE_KLICE.includes(k)) mapa[k] = d.mapa[k]; });
  const ids = new Set(skupiny.map(s => s.id));
  Object.keys(mapa).forEach(k => {
    if (mapa[k] !== CTRL_NENI_NAKLAD && !ids.has(mapa[k])) mapa[k] = CTRL_NEZARAZENO;
  });
  return { skupiny, mapa };
}

/* Klíč řádku výpočtu OCK. Jen identifikace řádku — skupinu dává mapování.
 *   – ceníkový řádek: `cenaPath` (C.…; u zámečníka atyp Z.zamecnikAtypKc),
 *   – souhrnný řádek: `cenaSkupina` (C.spojovaci.*, C.lak.*),
 *   – trvalá vlastní položka: K.<kid>, ruční řádek: V.<sekce>,
 *   – přirážka za ATYP: R.atypPrirazka (řádek bez klíče, poznaný názvem —
 *     test_controlling hlídá, že jádro ten název pořád vydává). */
const CTRL_NAZEV_ATYP_PRIRAZKA = 'PŘIRÁŽKA ZA ATYP - PROJEKČNÍ A KOORDINAČNÍ PRÁCE';
function ctrlKlicRadku(r, sekce) {
  if (!r || typeof r !== 'object') return 'V.' + (sekce || 'ostatni');
  if (r.kid) return 'K.' + String(r.kid);
  if (r.cenaPath) return String(r.cenaPath);
  if (r.cenaSkupina) return String(r.cenaSkupina);
  const nazev = String(r.origNazev || r.nazev || '');
  if (nazev === CTRL_NAZEV_ATYP_PRIRAZKA) return 'R.atypPrirazka';
  return 'V.' + String(r.sekce || sekce || 'ostatni');
}

/* Skupina klíče podle platného mapování. Trvalá položka bez vlastního
 * zařazení spadne do výchozí skupiny své sekce (V.<sekce>), cokoli dalšího
 * neznámého do Nezařazeno. Vrací { skupina, zarazeno } — `zarazeno: false`
 * u položek, které padly do náhradní skupiny (export je označí). */
function ctrlSkupinaKlice(mapa, klic, sekce) {
  const M = mapa || CTRL_MAPA_VYCHOZI;
  if (ctrlMa(M, klic)) return { skupina: M[klic], zarazeno: true };
  if (String(klic).startsWith('K.')) {
    const v = 'V.' + (sekce || 'ostatni');
    if (ctrlMa(M, v)) return { skupina: M[v], zarazeno: false };
  }
  return { skupina: CTRL_NEZARAZENO, zarazeno: false };
}

/* ROZVRH VÝSLEDKU OCK do řádků se skupinou. `vysledek` = výstup `vypocet`
 * (nebo zmrazený z zámku), `opts.fixes` = Model 2, `opts.rezervaPriplatkyPct`
 * ze zadání (výsledek rezervu příplatků v nákladu nevydává).
 *
 * Řádky základní ceny: sekce Hrubá OCK, Opláštění, Volitelné, Režie + rezerva
 * základu. Jejich náklad dává přesně `souhrn.zakladNaklad`.
 * Příplatky jdou zvlášť s `vZakladu: false` — jsou to volby nabídnuté
 * zákazníkovi, ne součást základní ceny; rezerva příplatků taky.
 *
 * Prodejní cena řádku je cena s přirážkou PŘED zaokrouhlením a slevou —
 * zaokrouhlení a sleva jsou údaje zakázky, ne řádku. */
function ctrlRozvrhOck(vysledek, opts) {
  const o = opts || {};
  const P = ctrlPlatne(o.data);
  const out = [];
  if (!vysledek || !vysledek.sekce) return out;
  const radek = (r, sekce, vZakladu) => {
    const klic = ctrlKlicRadku(r, sekce);
    if (P.mapa[klic] === CTRL_NENI_NAKLAD) return;
    const s = ctrlSkupinaKlice(P.mapa, klic, r.sekce || sekce);
    out.push({ oblast: 'ock', sekce, nazev: String(r.nazev || r.origNazev || ''), klic,
      skupina: s.skupina, zarazeno: s.zarazeno, vZakladu,
      vlastni: !!r.vlastni, mnozstvi: +r.mnozstvi || 0, cena: +r.cena || 0,
      naklad: +r.naklad || 0, prodej: +r.sMarzi || 0 });
  };
  ['hrubaOck', 'oplasteni', 'volitelne', 'rezie'].forEach(sek =>
    (vysledek.sekce[sek] || []).forEach(r => radek(r, sek, true)));
  const rz = vysledek.rezerva;
  if (rz && (+rz.naklad || +rz.sMarzi)) {
    const s = ctrlSkupinaKlice(P.mapa, 'R.rezervaZaklad');
    out.push({ oblast: 'ock', sekce: 'rezerva', nazev: 'REZERVA ZÁKLAD', klic: 'R.rezervaZaklad',
      skupina: s.skupina, zarazeno: s.zarazeno, vZakladu: true, vlastni: false,
      mnozstvi: 1, cena: +rz.naklad || 0, naklad: +rz.naklad || 0, prodej: +rz.sMarzi || 0 });
  }
  const prip = Array.isArray(vysledek.priplatky) ? vysledek.priplatky : [];
  prip.forEach(r => radek(r, 'priplatky', false));
  const pct = +o.rezervaPriplatkyPct || 0;
  if (pct && prip.length) {
    const zaklad = prip.reduce((a, r) => a + (o.fixes === false ? (+r.sMarzi || 0) : (+r.naklad || 0)), 0);
    const naklad = zaklad * pct;
    const m = +o.marze || 0;
    const s = ctrlSkupinaKlice(P.mapa, 'R.rezervaPriplatky');
    out.push({ oblast: 'ock', sekce: 'priplatky', nazev: 'REZERVA PŘÍPLATKY', klic: 'R.rezervaPriplatky',
      skupina: s.skupina, zarazeno: s.zarazeno, vZakladu: false, vlastni: false,
      mnozstvi: 1, cena: naklad, naklad, prodej: naklad * (1 + m) });
  }
  return out;
}

/* ROZVRH VÝSLEDKU PROJ. Položka typu hod → PC.sazby.<sazba>, fixní
 * s klíčem ceníku → PC.fixy.<fixKey>, trvalá → K.<kid>, jinak V.proj.
 * Doprava sekce je samostatný řádek PC.doprava. Vyřazené položky se
 * vynechají (nepočítají se ani v ceně). Prodejní cena položky = náklad ×
 * (1 + procento sekce); doprava nese přirážku taky (V29). */
function ctrlRozvrhProj(vysledek, opts) {
  const o = opts || {};
  const P = ctrlPlatne(o.data);
  const out = [];
  if (!vysledek || !Array.isArray(vysledek.sekce)) return out;
  vysledek.sekce.forEach(s => {
    const pct = (+s.pouzitePct || 0) / 100;
    (s.polozky || []).forEach(p => {
      if (p.vyrazeno) return;
      const klic = p.kid ? 'K.' + p.kid
        : (p.typ === 'hod' && p.sazba ? 'PC.sazby.' + p.sazba
          : (p.fixKey ? 'PC.fixy.' + p.fixKey : 'V.proj'));
      const g = ctrlSkupinaKlice(P.mapa, klic, 'proj');
      const hod = p.typ === 'hod';
      out.push({ oblast: 'proj', sekce: String(s.key || ''), nazev: String(p.nazev || ''), klic,
        skupina: g.skupina, zarazeno: g.zarazeno, vZakladu: true, vlastni: !!(p.kid || (!p.fixKey && !hod)),
        mnozstvi: hod ? (+p.hodinyCelkem || 0) : 1, cena: hod ? (+p.sazbaKc || 0) : (+p.cenaEfekt || 0),
        naklad: +p.naklad || 0, prodej: (+p.naklad || 0) * (1 + pct) });
    });
    if (+s.dopravaKc) {
      const g = ctrlSkupinaKlice(P.mapa, 'PC.doprava', 'proj');
      out.push({ oblast: 'proj', sekce: String(s.key || ''), nazev: 'DOPRAVA', klic: 'PC.doprava',
        skupina: g.skupina, zarazeno: g.zarazeno, vZakladu: true, vlastni: false,
        mnozstvi: 1, cena: +s.dopravaKc, naklad: +s.dopravaKc, prodej: (+s.dopravaKc) * (1 + pct) });
    }
  });
  return out;
}

/* Souhrn po kapitolách: { skupina → { naklad, prodej, radku } } v pořadí
 * číselníku. Jen řádky základní ceny, pokud `jenZaklad`. */
function ctrlKapitoly(radky, opts) {
  const o = opts || {};
  const P = ctrlPlatne(o.data);
  const souhrn = {};
  (radky || []).forEach(r => {
    if (o.jenZaklad && !r.vZakladu) return;
    const k = r.skupina || CTRL_NEZARAZENO;
    if (!souhrn[k]) souhrn[k] = { naklad: 0, prodej: 0, radku: 0 };
    souhrn[k].naklad += +r.naklad || 0; souhrn[k].prodej += +r.prodej || 0; souhrn[k].radku++;
  });
  return P.skupiny.filter(s => souhrn[s.id]).map(s => Object.assign({ skupina: s.id, nazev: s.nazev }, souhrn[s.id]))
    .concat(Object.keys(souhrn).filter(k => !P.skupiny.some(s => s.id === k))
      .map(k => Object.assign({ skupina: k, nazev: k }, souhrn[k])));
}

/* Klíče, které platné mapování nezná (J5: upozornit při zveřejnění ceníku
 * a nabídnout zařazení). `klice` = klíče ceníku a trvalých položek
 * (K.<kid>); bez parametru jen ceník ze sestavení. */
function ctrlNezarazene(data, klice) {
  const P = ctrlPlatne(data);
  const K = Array.isArray(klice) ? klice : ctrlKliceCeniku();
  return K.filter(k => !ctrlMa(P.mapa, k));
}
/* Klíče trvalých vlastních položek katalogu OCK a ceníku PROJ (K.<kid>). */
function ctrlKliceKatalogu(katalog, cenikProj) {
  const out = [];
  if (katalog && typeof katalog === 'object')
    Object.keys(katalog).forEach(sek => (Array.isArray(katalog[sek]) ? katalog[sek] : [])
      .forEach(p => { if (p && p.kid) out.push('K.' + p.kid); }));
  const vl = cenikProj && cenikProj.vlastniPolozky;
  if (vl && typeof vl === 'object')
    Object.keys(vl).forEach(sek => (Array.isArray(vl[sek]) ? vl[sek] : [])
      .forEach(p => { if (p && p.kid) out.push('K.' + p.kid); }));
  return out.filter((k, i, a) => a.indexOf(k) === i);
}

/* ---------- uložený záznam (úložiště program/controlling) ----------
 * Tvar jako zveřejněný slovník: { schema, platny: { verze, kdy, kdo,
 * poznamka, data: { skupiny, mapa } }, historie: [...] }. Mapování má vlastní
 * historii — mimo otisk ceníku, takže jeho změna nevynutí nové zveřejnění
 * ceníku ani přepočet zakázek. */
function ctrlBajty(x) {
  const t = typeof x === 'string' ? x : JSON.stringify(x === undefined ? null : x);
  if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(t).length;
  return unescape(encodeURIComponent(t)).length;
}
const ctrlTextOk = (x, max) => typeof x === 'string' && x.length <= max && !CTRL_RIDICI.test(x);

/* Přísná kontrola dat { skupiny, mapa }. Nic se nedomýšlí: co neprojde,
 * odmítne se celé s důvodem. Vrací { ok, data (čistá kopie) } nebo { ok:false, chyba }. */
function ctrlDataKontrola(data) {
  const M = CTRL_MEZE;
  if (!data || typeof data !== 'object' || Array.isArray(data))
    return { ok: false, chyba: 'Controlling musí být objekt { skupiny, mapa }.' };
  if (!Array.isArray(data.skupiny) || !data.skupiny.length)
    return { ok: false, chyba: 'Číselník skupin je prázdný.' };
  if (data.skupiny.length > M.skupin) return { ok: false, chyba: 'Skupin je víc než ' + M.skupin + '.' };
  const skupiny = [], ids = new Set();
  for (const s of data.skupiny) {
    if (!s || typeof s !== 'object' || Array.isArray(s)) return { ok: false, chyba: 'Skupina musí být objekt.' };
    if (typeof s.id !== 'string' || !CTRL_ID_TVAR.test(s.id) || s.id === CTRL_NENI_NAKLAD)
      return { ok: false, chyba: 'Identifikátor skupiny „' + String(s.id).slice(0, 40) + '" není v povoleném tvaru (a–z, 0–9, pomlčka).' };
    if (ids.has(s.id)) return { ok: false, chyba: 'Skupina „' + s.id + '" je v číselníku dvakrát.' };
    ids.add(s.id);
    const nazev = typeof s.nazev === 'string' ? s.nazev.trim() : '';
    if (!nazev || !ctrlTextOk(nazev, M.text)) return { ok: false, chyba: 'Skupina „' + s.id + '" nemá platný název.' };
    const manVysl = s.manVysl == null ? '' : s.manVysl;
    if (!ctrlTextOk(manVysl, M.text)) return { ok: false, chyba: 'Položka výsledovky u skupiny „' + s.id + '" není platný text.' };
    const ucty = (u, co) => {
      if (u == null) return [];
      if (!Array.isArray(u) || u.length > M.uctu || u.some(x => typeof x !== 'string' || !CTRL_UCET_TVAR.test(x)))
        return { chyba: co + ' u skupiny „' + s.id + '" musí být seznam čísel účtů (nejvýš ' + M.uctu + ').' };
      return u.slice();
    };
    const un = ucty(s.ucetNyni, 'Účet Helios nyní'); if (un.chyba) return { ok: false, chyba: un.chyba };
    const ub = ucty(s.ucetBudouci, 'Účet Helios budoucí'); if (ub.chyba) return { ok: false, chyba: ub.chyba };
    if (!CTRL_TYPY.includes(s.typ)) return { ok: false, chyba: 'Typ nákladu u skupiny „' + s.id + '" musí být přímý nebo nepřímý.' };
    if (!CTRL_CHOVANI.includes(s.chovani)) return { ok: false, chyba: 'Chování u skupiny „' + s.id + '" musí být variabilní nebo fixní.' };
    const oblast = s.oblast == null ? 'obe' : s.oblast;
    if (!CTRL_OBLASTI.includes(oblast)) return { ok: false, chyba: 'Oblast u skupiny „' + s.id + '" musí být OCK, PROJ nebo obě.' };
    skupiny.push({ id: s.id, nazev, manVysl, ucetNyni: un, ucetBudouci: ub, typ: s.typ, chovani: s.chovani, oblast });
  }
  if (!ids.has(CTRL_NEZARAZENO)) return { ok: false, chyba: 'Skupinu „Nezařazeno" nejde zrušit.' };
  const m = data.mapa;
  if (!m || typeof m !== 'object' || Array.isArray(m)) return { ok: false, chyba: 'Mapování musí být objekt { klíč: skupina }.' };
  const klice = Object.keys(m);
  if (klice.length > M.klicu) return { ok: false, chyba: 'Mapování má víc než ' + M.klicu + ' klíčů.' };
  const mapa = {};
  for (const k of klice) {
    if (CTRL_ZAKAZANE_KLICE.includes(k) || !CTRL_KLIC_TVAR.test(k))
      return { ok: false, chyba: 'Klíč „' + String(k).slice(0, 40) + '" není v povoleném tvaru.' };
    const v = m[k];
    if (v !== CTRL_NENI_NAKLAD && !(typeof v === 'string' && ids.has(v)))
      return { ok: false, chyba: 'Klíč „' + k + '" ukazuje na skupinu, která v číselníku není.' };
    mapa[k] = v;
  }
  return { ok: true, data: { skupiny, mapa } };
}

const ctrlOtisk = (data) => JSON.stringify({ skupiny: (data && data.skupiny) || [],
  mapa: Object.keys((data && data.mapa) || {}).sort().map(k => [k, data.mapa[k]]) });
function ctrlBezeZmeny(db, data) {
  const p = db && db.platny;
  return !!p && ctrlOtisk(p.data) === ctrlOtisk(data);
}
function ctrlDbNovaVerze(db, ctx) {
  const c = ctx || {};
  const kdy = c.kdy || new Date().toISOString();
  const k = ctrlDataKontrola(c.data);
  if (!k.ok) throw new Error(k.chyba);
  const stary = db && db.platny ? db.platny : null;
  const platny = { verze: stary ? (+stary.verze || 0) + 1 : 1, kdy, kdo: String(c.kdo || '').slice(0, 200),
    poznamka: String(c.poznamka || '').slice(0, CTRL_MEZE.poznamka), data: k.data };
  const historie = (stary ? [Object.assign({}, stary, { platnoDo: kdy })] : [])
    .concat(Array.isArray(db && db.historie) ? db.historie : []).slice(0, CTRL_MEZE.historie);
  const nove = { schema: 1, platny, historie };
  while (nove.historie.length && ctrlBajty(nove) > CTRL_MEZE.db) nove.historie.pop();
  return nove;
}
/* Očista uloženého záznamu (obnova ze zálohy): platná verze musí projít
 * touž kontrolou jako zápis, vadné starší verze z historie vypadnou. */
function ctrlDbOciste(db) {
  if (!db || typeof db !== 'object' || Array.isArray(db) || !db.platny || typeof db.platny !== 'object')
    return { ok: false, chyba: 'záznam controllingu nemá platnou verzi' };
  const txt = (x, max) => (typeof x === 'string' ? x.slice(0, max) : '');
  const zaznam = (z) => {
    if (!z || typeof z !== 'object' || Array.isArray(z)) return null;
    const k = ctrlDataKontrola(z.data);
    if (!k.ok) return { chyba: k.chyba };
    const v = (typeof z.verze === 'number' || typeof z.verze === 'string') ? +z.verze : NaN;
    if (!Number.isInteger(v) || v < 1 || v > CTRL_MEZE.verze) return { chyba: 'verze není celé číslo 1 až ' + CTRL_MEZE.verze };
    const out = { verze: v, kdy: txt(z.kdy, 40), kdo: txt(z.kdo, 200), poznamka: txt(z.poznamka, CTRL_MEZE.poznamka), data: k.data };
    if (typeof z.platnoDo === 'string') out.platnoDo = txt(z.platnoDo, 40);
    return out;
  };
  const p = zaznam(db.platny);
  if (!p || p.chyba) return { ok: false, chyba: 'platná verze controllingu neprošla kontrolou' + (p && p.chyba ? ' (' + p.chyba + ')' : '') };
  const historie = (Array.isArray(db.historie) ? db.historie : []).map(zaznam)
    .filter(z => z && !z.chyba).slice(0, CTRL_MEZE.historie);
  const out = { schema: 1, platny: p, historie };
  while (out.historie.length && ctrlBajty(out) > CTRL_MEZE.db) out.historie.pop();
  if (ctrlBajty(out) > CTRL_MEZE.db) return { ok: false, chyba: 'záznam controllingu je větší než povolený strop' };
  return { ok: true, db: out };
}

if (typeof module !== 'undefined' && module.exports)
  module.exports = { CTRL_NENI_NAKLAD, CTRL_NEZARAZENO, CTRL_TYPY, CTRL_CHOVANI, CTRL_OBLASTI,
    CTRL_SKUPINY_VYCHOZI, CTRL_MAPA_VYCHOZI, CTRL_MEZE, CTRL_NAZEV_ATYP_PRIRAZKA,
    ctrlVychozi, ctrlKliceCeniku, ctrlPlatne, ctrlKlicRadku, ctrlSkupinaKlice, ctrlRozvrhOck, ctrlRozvrhProj,
    ctrlKapitoly, ctrlNezarazene, ctrlKliceKatalogu, ctrlBajty, ctrlDataKontrola, ctrlBezeZmeny,
    ctrlDbNovaVerze, ctrlDbOciste };
