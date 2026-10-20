/* ============================================================
 * PLATEBNÍ A SMLUVNÍ PODMÍNKY FIRMY (#367 fáze 2, V8, 19. 10. 2026)
 *
 * Rozhodnutí J. V. 19. 10. 2026: „Varianta B + z kódu vše převést do Firma.
 * Nechceme mít tato data natvrdo v kódu." Výchozí hodnoty krycích listů OCK
 * a PROJ (splatnost, záloha a splátky, zádržné, záruka, pokuty, limit pokut)
 * do té doby stály jako literály v prefillech kryci.js, kryci_proj.js
 * a nabidka_proj.js. Teď je nese záznam Firma (NAST.firma.podminky) a edituje
 * je administrátor v Nastavení → Smlouvy / Šablony (přepínač OCK | PROJ).
 *
 * V KÓDU ZŮSTÁVÁ JEDINÁ KOPIE DNEŠNÍCH HODNOT — PODMINKY_VYCHOZI níže. Je to
 * továrna pro prázdné Nastavení (nová instalace, starší _nastaveni.json,
 * starší online záznam firmy), stejně jako DEFAULT_FIRMA. Sloučení s Firmou
 * se dělá PŘI ČTENÍ (podminkyEf), ne při načtení: uložená firma se při
 * načtení nahrazuje celá (konfigNahradVMiste) a klíče, které v ní nejsou,
 * by jinak zmizely — přesně tak se v produkci ztratily kapitoly IV.–VI.
 * (rozbor 19. 10. 2026, podklady/367_NASTAVENI_FIRMA_NAVRH.md kap. 8).
 *
 * Pořadí přednosti (beze změny): ruční zápis v krycím listu zakázky →
 * firemní standard (tady) → továrna. Odeslané a zamčené varianty čtou
 * zmrazené hodnoty (kryciZmrazPodminky), rozpracované bez ručního přepisu
 * převezmou změněný standard (Q2, jako plán plateb PROJ).
 *
 * Modul je čistá logika bez DOM: prohlížeč, server (/api/firma přes
 * firmaLzeZverejnit) i testy (test_podminky.js) volají tentýž kód.
 * ============================================================ */

/* Továrna = dnešní hodnoty z kódu (stav e3995e6), aby se výstup nezměnil. */
/* TERMÍN HRUBOPISU DPZ BEZ STUDIE (D1, 20. 10. 2026) — ZNĚNÍ ČEKÁ NA J. V.:
 * „do 12-ti týdnů od objednání a předání podkladů" (návrh J. V., předběžně)
 * nebo „do 10–12 týdnů od zpracování výstupů ze zaměření" (D. Sikora, šablona
 * rev. 33). Obě znění zná slovník (EN/DE/FR); mění se jen tahle konstanta. */
const PODMINKY_TERMIN_DPZ_BEZ_STUDIE = 'do 12-ti týdnů od objednání a předání podkladů';

const PODMINKY_VYCHOZI = {
  v: 1,
  /* Číselník sazeb smluvní pokuty (dřív KRYCI_POKUTY v kryci.js a kopie
   * v kryci_proj.js). První volba je vždy bez pokuty. */
  sazbyPokut: ['0', '0,05 % / den', '0,1 % / den'],
  /* Limit smluvních pokut v % z ceny díla (dřív v textu KRYCI_LIMIT_POKUT). */
  limitPokutProc: 10,
  ock: {
    splatnostDni: 14,
    /* Volby zálohy v krycím listu; 0 = „Bez zálohy". */
    zalohyProc: [0, 30, 50, 70],
    zalohaMilnik: 'po podpisu smlouvy',
    zalohaProc: 50,
    faktura2Proc: 40,
    faktura2Milnik: 'po zahájení montáže',
    konecnaProc: 10,
    konecnaMilnik: 'po předání',
    zadrzneVan: 'Ano', zadrzneVanProc: '',
    zadrzneZaruka: 'Ne', zadrzneZarukaProc: '',
    zarukaMesicu: 60,
    pokutaDodavka: '0',
    pokutaSplatnost: '0,05 % / den',
    pokutaLimit: 'uplatnen',
    /* Rozšíření (Q6, fáze 2b): typ smlouvy a „Cena nezahrnuje" krycího listu. */
    typSmlouvy: 'Naše bez úprav',
    cenaNezahrnuje: 'dle CN',
  },
  proj: {
    splatnostDni: 14,
    pokutaTermin: '0',
    pokutaSplatnost: '0,05 % / den',
    pokutaLimit: 'uplatnen',
    /* Rozšíření (Q6, fáze 2b) — pole krycího listu PROJ. */
    typSmlouvy: 'Naše bez úprav',
    licence: 'nevýhradní, pro účel stavby dle smlouvy',
    pojisteni: 'ANO – dle pojistné smlouvy zhotovitele',
    cenaNezahrnuje: 'správní poplatky, posudky nad rámec nabídky, činnosti neuvedené v nabídce',
  },
  /* VĚTY PLATEBNÍHO KALENDÁŘE (Q3, fáze 2b). Nabídka OCK (CN v14,
   * {{PODM_PLATEBNI_KALENDAR}}) a seznam splátek smlouvy o dílo realizace
   * ({{SOD_PLATEBNI_KALENDAR}}). Továrna nese jen češtinu — znění šablony CN
   * v13 a dosavadních konstant kryci.js. Cizí jazyk: uložené znění z Firmy,
   * jinak překlad VÝCHOZÍ české věty slovníkem (preklad.js), tedy přesně
   * dnešní výstup. Značky: {PORADI} = pořadí dokladu v jazyce dokumentu
   * („1.", „1st", „1re"), {PROC} = procento („50 %"). */
  vety: {
    zaloha: { cz: '{PORADI} dílčí daňový doklad ve výši {PROC} (bez DPH) z celkové ceny díla bude vystaven po podpisu SoD. Úhrada tohoto daňového dokladu je podmínkou pro dodržení předem dohodnutých realizačních termínů.' },
    faktura2: { cz: 'Po ukončení výroby, dodání materiálu na stavbu a po zahájení prací bude vystaven {PORADI} dílčí daňový doklad ve výši {PROC} (bez DPH) z celkové ceny díla. Úhrada tohoto daňového dokladu je podmínkou pro předání díla objednateli.' },
    konecna: { cz: 'Po ukončení všech výše uvedených prací a po řádném předání a převzetí celého díla předávacím protokolem bude vystaven konečný daňový doklad na zbývající část celkové ceny díla s vyúčtováním DPH v zákonné výši.' },
    mesicne: { cz: 'Fakturace probíhá měsíčně podle skutečně provedených prací.' },
    sodZaloha: { cz: 'při uzavření této smlouvy o dílo' },
    sodKonecna: { cz: 'po provedení celého díla zhotovitele a jeho předání a převzetí bez vad a nedodělků bránících provozu výtahu' },
    sodZbyvajici: { cz: 'zbývajících' },
    sodZCeny: { cz: 'z celkové ceny díla' },
  },
  /* TEXTY NABÍDKY PROJ (Q5, fáze 2b) — do té doby pevné bloky
   * NABIDKA_PROJ_DEF v nabidka_proj.js. Řádek = odrážka; termín = [činnost,
   * text, klíč sekce] (řádek se tiskne, jen když se činnost nabízí). Cizí
   * jazyk jako u vět: uložené znění, jinak slovník. Doložky PROJ jsou
   * výchozí prázdné a VYPNUTÉ (rozhodnutí J. V. 19. 10.: zapnout až
   * jeho rozhodnutím). */
  nabidkaProj: {
    cenaNezahrnuje: { cz: [
      'Případné studie a průzkumy nad rámec nabídky',
      'Správní poplatky úřadům, správcům sítí a za KOLAUDACI',
      'Součástí ceny není řešení samostatných řízení vyplývajících z podmínek stanovisek DOSS, zejména pak Odboru památkové péče, a řešení námitek nebo odvolání účastníků řízení',
    ] },
    pozadovano: { cz: [
      'Plná moc k přístupu do archivu stavebního úřadu',
      'Zajištění přístupu do objektu',
      'Součinnost investora, investorská schválení potřebných podkladů a návrhů',
    ] },
    terminy: { cz: [
      ['Provedení detailního zaměření a stavebně technického průzkumu', 'ZAMĚŘENÍ na stavbě do 4 týdnů od objednání a předání plné moci; zpracování VÝSTUPŮ do 4–6 týdnů od zaměření', 'zamereni'],
      ['Zpracování STUDIE PROVEDITELNOSTI (SP)', 'do 10–12 týdnů od zpracování výstupů ze zaměření', 'studie'],
      ['Projednání s odborem památkové péče HMP', 'do cca 2–3 měsíců od podání žádosti – záleží na vytíženosti úředníků státní správy', 'projednani'],
      /* D1 (20. 10. 2026): termín hrubopisu DPZ podle studie — klíč
       * „dpz+studie" / „dpz-studie" (viz vRozsahu v nabidka_proj.js). Znění
       * bez studie je v PODMINKY_TERMIN_DPZ_BEZ_STUDIE (vybírá J. V.). */
      ['Zpracování dokumentace pro dotčené orgány (hrubopis DPZ)', 'do 10–12 týdnů od schválení studie investorem a objednání', 'dpz+studie'],
      ['Zpracování dokumentace pro dotčené orgány (hrubopis DPZ)', PODMINKY_TERMIN_DPZ_BEZ_STUDIE, 'dpz-studie'],
      ['Zajištění stanovisek dotčených orgánů *)', 'cca do 4 týdnů od podání žádosti (v případě potřeby stanoviska hygieny a/nebo památkové péče cca do 2,5 měsíce)', 'ic'],
      ['Dopracování dokumentace pro povolení záměru (čistopis DPZ)', 'proběhne v průběhu lhůty vyjádření dotčených orgánů', 'dpz'],
      ['Podání žádosti o povolení záměru', 'po obdržení souhlasných stanovisek dotčených orgánů (+ 14 dní v případě nutnosti zapracování podmínek dotčených orgánů do dokumentace)', 'ic'],
      ['Inženýrská činnost (IČ) – vyřízení povolení záměru *)', 'cca 2 měsíce od podání žádosti + 1 měsíc na nabytí právní moci povolení záměru', 'ic'],
      ['Zpracování dokumentace pro provedení stavby (DPS)', 'cca do 6 týdnů od schválení dokumentace a povolení záměru stavebním úřadem', 'dps'],
      ['Ekonomická zadávací část (EZC)', 'do 2 týdnů od zpracování projektu pro provedení stavby', 'ezc'],
    ] },
    dolozky: { cz: [] },
    dolozkyTisk: false,
  },
};
const PODMINKY_JAZYKY = ['cz', 'en', 'de', 'fr'];
const PODMINKY_VETY_TOKENY = { zaloha: ['{PORADI}', '{PROC}'], faktura2: ['{PORADI}', '{PROC}'] };
const PODMINKY_VETA_MAX = 1000;
const PODMINKY_TYPY_SMLOUVY = ['Naše bez úprav', 'Naše s úpravami', 'Cizí'];
const PODMINKY_PROJ_SEKCE = ['zamereni', 'studie', 'projednani', 'dpz', 'ic', 'dps', 'ezc', 'kolaudace', 'geodet'];
/* klíče termínů navíc: činnost jen se studií / jen bez ní (D1) */
const PODMINKY_PROJ_SEKCE_PODMINENE = ['dpz+studie', 'dpz-studie'];
const PODMINKY_RADKU_MAX = 30;

/* SOUČET SPLÁTEK OCK ≠ 100 % (Q4) — ROZHODNUTÍ J. V. 19. 10. 2026: „Nedovolit
 * zveřejnit". Chybný součet ZABLOKUJE zveřejnění firemních podmínek
 * (prohlížeč i server), v Nastavení svítí červený součet. Změna na „jen
 * upozornění" by byla jen přepsání téhle jedné konstanty na false. */
const PODMINKY_SOUCET_BLOKUJE = true;

const PODMINKY_ZADRZNE_MAX = 20;
const PODMINKY_SPLATNOST_MAX = 120;
const PODMINKY_ZARUKA_MAX = 240;
const PODMINKY_MILNIK_MAX = 200;
const PODMINKY_VOLEB_MAX = 6;

/* ---------- pomocné ---------- */

function podmKopie(x) { return JSON.parse(JSON.stringify(x)); }
/* Vlastní klíč tabulky (K3-N6, 20. 10. 2026): `__proto__`, `constructor`
 * a spol. z JSON nejsou pole podmínek — přes `tabulka[klic]` by se sáhlo
 * na prototyp a kontrola spadla výjimkou (HTTP 500 na /api/firma). */
const podmMa = (o, k) => !!o && Object.prototype.hasOwnProperty.call(o, k);

/* Číslo z hodnoty pole: číslo nebo text „12,5". Prázdno a nesmysl = NaN. */
function podmCislo(v) {
  if (typeof v === 'number') return v;
  const t = String(v == null ? '' : v).trim().replace(',', '.');
  return /^-?\d+(\.\d+)?$/.test(t) ? parseFloat(t) : NaN;
}
/* Procento do textu: 50 → „50", 12.5 → „12,5" (česky). */
function podmProcText(n) {
  const r = Math.round(+n * 100) / 100;
  return String(r).replace('.', ',');
}
const podmCeleVRozsahu = (v, min, max) => { const n = podmCislo(v); return Number.isInteger(n) && n >= min && n <= max; };
const podmProcPlatne = v => { const n = podmCislo(v); return isFinite(n) && n >= 0 && n <= 100 && Math.round(n * 100) === n * 100; };
const podmTextPlatny = v => typeof v === 'string' && v.trim() !== '' && v.length <= PODMINKY_MILNIK_MAX;
const podmAnoNe = v => v === 'Ano' || v === 'Ne';
const podmZadrzneProcPlatne = v => v === '' || v == null || (podmProcPlatne(v) && podmCislo(v) <= PODMINKY_ZADRZNE_MAX);
const podmLimitKod = v => v === 'uplatnen' || v === 'neuplatnen';
function podmSazbyPlatne(s) {
  if (!Array.isArray(s) || !s.length || s.length > PODMINKY_VOLEB_MAX) return false;
  if (s[0] !== '0') return false;
  if (new Set(s).size !== s.length) return false;
  return s.slice(1).every(x => typeof x === 'string' && /^\d+(,\d{1,3})? % \/ den$/.test(x));
}
function podmZalohyPlatne(z) {
  if (!Array.isArray(z) || !z.length || z.length > PODMINKY_VOLEB_MAX) return false;
  if (podmCislo(z[0]) !== 0) return false;
  if (new Set(z.map(podmCislo)).size !== z.length) return false;
  return z.every(podmProcPlatne);
}

/* Pravidla jednotlivých polí: [klíč, je platné(v, celek)]. Z nich se skládá
 * jak sloučení (neplatná uložená hodnota → továrna), tak seznam vad. */
const PODMINKY_OCK_PROC = ['zalohaProc', 'faktura2Proc', 'konecnaProc'];
const PODMINKY_PRAVIDLA_OCK = {
  splatnostDni: v => podmCeleVRozsahu(v, 1, PODMINKY_SPLATNOST_MAX),
  zalohyProc: podmZalohyPlatne,
  zalohaMilnik: podmTextPlatny,
  zalohaProc: podmProcPlatne,
  faktura2Proc: podmProcPlatne,
  faktura2Milnik: podmTextPlatny,
  konecnaProc: podmProcPlatne,
  konecnaMilnik: podmTextPlatny,
  zadrzneVan: podmAnoNe, zadrzneVanProc: podmZadrzneProcPlatne,
  zadrzneZaruka: podmAnoNe, zadrzneZarukaProc: podmZadrzneProcPlatne,
  zarukaMesicu: v => podmCeleVRozsahu(v, 0, PODMINKY_ZARUKA_MAX),
  pokutaDodavka: (v, sazby) => sazby.indexOf(v) >= 0,
  pokutaSplatnost: (v, sazby) => sazby.indexOf(v) >= 0,
  pokutaLimit: podmLimitKod,
  typSmlouvy: v => PODMINKY_TYPY_SMLOUVY.indexOf(v) >= 0,
  cenaNezahrnuje: podmTextPlatny,
};
const podmDelsiTextPlatny = v => typeof v === 'string' && v.trim() !== '' && v.length <= PODMINKY_VETA_MAX;
const PODMINKY_PRAVIDLA_PROJ = {
  splatnostDni: v => podmCeleVRozsahu(v, 1, PODMINKY_SPLATNOST_MAX),
  pokutaTermin: (v, sazby) => sazby.indexOf(v) >= 0,
  pokutaSplatnost: (v, sazby) => sazby.indexOf(v) >= 0,
  pokutaLimit: podmLimitKod,
  typSmlouvy: v => PODMINKY_TYPY_SMLOUVY.indexOf(v) >= 0,
  licence: podmTextPlatny,
  pojisteni: podmTextPlatny,
  cenaNezahrnuje: podmDelsiTextPlatny,
};
const PODMINKY_POPISKY = {
  splatnostDni: 'splatnost (celé číslo 1–' + PODMINKY_SPLATNOST_MAX + ' dní)',
  zalohyProc: 'volby zálohy (1–' + PODMINKY_VOLEB_MAX + ' různých procent, první 0 = Bez zálohy)',
  zalohaMilnik: 'milník zálohy (text do ' + PODMINKY_MILNIK_MAX + ' znaků)',
  zalohaProc: 'výchozí záloha (0–100 %)',
  faktura2Proc: 'dílčí faktura č. 2 (0–100 %)',
  faktura2Milnik: 'milník dílčí faktury č. 2 (text do ' + PODMINKY_MILNIK_MAX + ' znaků)',
  konecnaProc: 'konečná faktura (0–100 %)',
  konecnaMilnik: 'milník konečné faktury (text do ' + PODMINKY_MILNIK_MAX + ' znaků)',
  zadrzneVan: 'zádržné do odstranění vad (Ano / Ne)',
  zadrzneVanProc: 'procento zádržného do odstranění vad (0–' + PODMINKY_ZADRZNE_MAX + ' %)',
  zadrzneZaruka: 'zádržné po dobu záruky (Ano / Ne)',
  zadrzneZarukaProc: 'procento zádržného po dobu záruky (0–' + PODMINKY_ZADRZNE_MAX + ' %)',
  zarukaMesicu: 'záruka (celé číslo 0–' + PODMINKY_ZARUKA_MAX + ' měsíců)',
  pokutaDodavka: 'pokuta za prodlení dodávky (z číselníku sazeb)',
  pokutaSplatnost: 'pokuta za prodlení splatnosti (z číselníku sazeb)',
  pokutaTermin: 'pokuta za prodlení s odevzdáním (z číselníku sazeb)',
  pokutaLimit: 'limit pokut (uplatněn / neuplatněn)',
  typSmlouvy: 'typ smlouvy (Naše bez úprav / Naše s úpravami / Cizí)',
  cenaNezahrnuje: '„Cena nezahrnuje" (neprázdný text)',
  licence: 'licence k projektové dokumentaci (text do ' + PODMINKY_MILNIK_MAX + ' znaků)',
  pojisteni: 'pojištění projektanta (text do ' + PODMINKY_MILNIK_MAX + ' znaků)',
};

/* ---------- věty a texty nabídky PROJ: platnost ---------- */

function podmVetaPlatna(klic, v) {
  if (typeof v !== 'string' || !v.trim() || v.length > PODMINKY_VETA_MAX) return false;
  return (podmMa(PODMINKY_VETY_TOKENY, klic) ? PODMINKY_VETY_TOKENY[klic] : []).every(t => v.indexOf(t) >= 0);
}
/* Řádky textu nabídky PROJ: pole neprázdných textů (termíny: [činnost,
 * termín, sekce] u češtiny, [činnost, termín] u cizích jazyků). */
function podmRadkyPlatne(klic, jaz, v) {
  if (!Array.isArray(v) || v.length > PODMINKY_RADKU_MAX) return false;
  if (klic === 'dolozky' && !v.length) return true;
  if (!v.length) return false;
  /* K3-N9: konec řádku uvnitř položky by ve Wordu posunul činnosti proti
   * termínům (DOCX_RADKY_ZA_RADEK páruje i-tý řádek) — položka je jeden řádek. */
  const txt = x => typeof x === 'string' && x.trim() !== '' && x.length <= PODMINKY_VETA_MAX && !/[\r\n]/.test(x);
  if (klic !== 'terminy') return v.every(txt);
  return v.every(r => Array.isArray(r) && txt(r[0]) && txt(r[1])
    && (jaz !== 'cz' || PODMINKY_PROJ_SEKCE.indexOf(r[2]) >= 0 || PODMINKY_PROJ_SEKCE_PODMINENE.indexOf(r[2]) >= 0) && r.length === (jaz === 'cz' ? 3 : 2));
}

/* ---------- sloučení Firmy s továrnou ---------- */

/* Platné podmínky: co je ve Firmě a projde pravidlem, jinak továrna.
 * Po polích — jedno vadné pole neshodí ostatní (zveřejnit vadné podmínky
 * stejně nejde, tohle je pojistka pro poškozená místní data). */
function podminkyEf(firma) {
  const ul = firma && typeof firma === 'object' && firma.podminky && typeof firma.podminky === 'object'
    ? firma.podminky : {};
  const T = PODMINKY_VYCHOZI;
  const sazby = podmSazbyPlatne(ul.sazbyPokut) ? ul.sazbyPokut.slice() : T.sazbyPokut.slice();
  const limit = podmCeleVRozsahu(ul.limitPokutProc, 0, 100) ? podmCislo(ul.limitPokutProc) : T.limitPokutProc;
  const cast = (k, pravidla) => {
    const zdroj = ul[k] && typeof ul[k] === 'object' && !Array.isArray(ul[k]) ? ul[k] : {};
    const out = {};
    Object.keys(T[k]).forEach(pole => {
      const v = zdroj[pole];
      const ok = v !== undefined && pravidla[pole](v, sazby);
      out[pole] = podmKopie(ok ? v : T[k][pole]);
    });
    /* Pokuta z továrny, kterou upravený číselník nezná → první sazba (0). */
    Object.keys(out).forEach(pole => {
      if (/^pokuta(?!Limit)/.test(pole) && sazby.indexOf(out[pole]) < 0) out[pole] = sazby[0];
    });
    return out;
  };
  const ef = { v: 1, sazbyPokut: sazby, limitPokutProc: limit,
    ock: cast('ock', PODMINKY_PRAVIDLA_OCK), proj: cast('proj', PODMINKY_PRAVIDLA_PROJ) };
  /* Věty: česky uložené (platné) nebo továrna; cizí jen uložené (jinak
   * v podminkyVeta slovník). */
  const uv = ul.vety && typeof ul.vety === 'object' && !Array.isArray(ul.vety) ? ul.vety : {};
  ef.vety = {};
  Object.keys(T.vety).forEach(k => {
    const z = uv[k] && typeof uv[k] === 'object' && !Array.isArray(uv[k]) ? uv[k] : {};
    const out = { cz: podmVetaPlatna(k, z.cz) ? z.cz : T.vety[k].cz };
    PODMINKY_JAZYKY.slice(1).forEach(j => { if (podmVetaPlatna(k, z[j])) out[j] = z[j]; });
    ef.vety[k] = out;
  });
  const un = ul.nabidkaProj && typeof ul.nabidkaProj === 'object' && !Array.isArray(ul.nabidkaProj) ? ul.nabidkaProj : {};
  ef.nabidkaProj = { dolozkyTisk: un.dolozkyTisk === true };
  ['cenaNezahrnuje', 'pozadovano', 'terminy', 'dolozky'].forEach(k => {
    const z = un[k] && typeof un[k] === 'object' && !Array.isArray(un[k]) ? un[k] : {};
    const out = { cz: podmRadkyPlatne(k, 'cz', z.cz) ? podmKopie(z.cz) : podmKopie(T.nabidkaProj[k].cz) };
    PODMINKY_JAZYKY.slice(1).forEach(j => {
      /* cizí znění platí jen se stejným počtem řádků jako čeština */
      if (podmRadkyPlatne(k, j, z[j]) && z[j].length === out.cz.length) out[j] = podmKopie(z[j]);
    });
    ef.nabidkaProj[k] = out;
  });
  /* K3-N7 (20. 10. 2026): procenta zálohy a faktur jako čísla — „12,5" (text
   * z API/importu) projde kontrolou, ale `map(Number)` z něj dělal NaN. */
  ef.ock.zalohyProc = ef.ock.zalohyProc.map(podmCislo);
  PODMINKY_OCK_PROC.forEach(k => { ef.ock[k] = podmCislo(ef.ock[k]); });
  /* Výchozí záloha musí být mezi volbami — jinak by krycí list předvyplnil
   * hodnotu, kterou rozbalovátko nenabízí. */
  if (ef.ock.zalohyProc.indexOf(ef.ock.zalohaProc) < 0) ef.ock.zalohaProc = +ef.ock.zalohyProc[ef.ock.zalohyProc.length - 1];
  return ef;
}

/* Co z Firmy se liší od továrny (pro štítky „upraveno" v Nastavení). */
function podminkyUpraveno(firma, cast, pole) {
  const ef = podminkyEf(firma);
  const a = cast ? ef[cast][pole] : ef[pole];
  const b = cast ? PODMINKY_VYCHOZI[cast][pole] : PODMINKY_VYCHOZI[pole];
  return JSON.stringify(a) !== JSON.stringify(b);
}

/* ---------- texty pro krycí listy ---------- */

/* „Bez zálohy" / „50 % – po podpisu smlouvy" (znění KRYCI_ZALOHY). */
function podminkyZalohaText(ef, proc) {
  return +proc === 0 ? 'Bez zálohy' : podmProcText(proc) + ' % – ' + ef.ock.zalohaMilnik;
}
function podminkyZalohyVolby(ef) { return ef.ock.zalohyProc.map(p => podminkyZalohaText(ef, p)); }
function podminkyZalohaVychozi(ef) { return podminkyZalohaText(ef, ef.ock.zalohaProc); }
function podminkyFaktura2(ef) { return podmProcText(ef.ock.faktura2Proc) + ' % – ' + ef.ock.faktura2Milnik; }
function podminkyKonecna(ef) { return podmProcText(ef.ock.konecnaProc) + ' % – ' + ef.ock.konecnaMilnik; }
/* „Uplatněn limit 10 %" / „NEUPLATNĚN limit 10 %" (znění KRYCI_LIMIT_POKUT). */
function podminkyLimitVolby(ef) {
  const L = podmProcText(ef.limitPokutProc);
  return ['Uplatněn limit ' + L + ' %', 'NEUPLATNĚN limit ' + L + ' %'];
}
function podminkyLimitText(ef, kod) { return podminkyLimitVolby(ef)[kod === 'neuplatnen' ? 1 : 0]; }

/* ---------- součet splátek OCK (Q4) ---------- */

function podminkySoucetOck(ef) {
  const s = +ef.ock.zalohaProc + +ef.ock.faktura2Proc + +ef.ock.konecnaProc;
  const soucet = Math.round(s * 100) / 100;
  const ok = Math.abs(soucet - 100) < 0.001;
  return { soucet, ok, blokuje: !ok && PODMINKY_SOUCET_BLOKUJE };
}

/* ---------- kontrola před zveřejněním ---------- */

/* Seznam vad uložených podmínek (prázdný = v pořádku). Chybějící objekt
 * nevadí — platí továrna. Volá firmaLzeZverejnit (prohlížeč i server). */
function podminkyVady(p) {
  if (p === undefined || p === null) return [];
  if (typeof p !== 'object' || Array.isArray(p)) return ['podmínky nejsou objekt'];
  const v = [];
  if (p.sazbyPokut !== undefined && !podmSazbyPlatne(p.sazbyPokut))
    v.push('sazby pokut (1–' + PODMINKY_VOLEB_MAX + ' různých, první „0", další ve tvaru „N % / den")');
  if (p.limitPokutProc !== undefined && !podmCeleVRozsahu(p.limitPokutProc, 0, 100))
    v.push('limit pokut (celé číslo 0–100 %)');
  const sazby = podmSazbyPlatne(p.sazbyPokut) ? p.sazbyPokut : PODMINKY_VYCHOZI.sazbyPokut;
  [['ock', PODMINKY_PRAVIDLA_OCK, 'OCK'], ['proj', PODMINKY_PRAVIDLA_PROJ, 'PROJ']].forEach(([k, pravidla, jm]) => {
    if (p[k] === undefined) return;
    if (!p[k] || typeof p[k] !== 'object' || Array.isArray(p[k])) { v.push(jm + ': není objekt'); return; }
    Object.keys(p[k]).forEach(pole => {
      if (!podmMa(pravidla, pole)) { v.push(jm + ': neznámé pole „' + pole + '"'); return; }
      if (!pravidla[pole](p[k][pole], sazby)) v.push(jm + ': ' + PODMINKY_POPISKY[pole]);
    });
  });
  if (p.vety !== undefined) {
    if (!p.vety || typeof p.vety !== 'object' || Array.isArray(p.vety)) v.push('věty: nejsou objekt');
    else Object.keys(p.vety).forEach(k => {
      if (!podmMa(PODMINKY_VYCHOZI.vety, k)) { v.push('věty: neznámá věta „' + k + '"'); return; }
      const z = p.vety[k];
      if (!z || typeof z !== 'object' || Array.isArray(z)) { v.push('věty: „' + k + '" není objekt'); return; }
      Object.keys(z).forEach(j => {
        if (PODMINKY_JAZYKY.indexOf(j) < 0) { v.push('věty: neznámý jazyk „' + j + '"'); return; }
        if (z[j] === '' || z[j] == null) return;
        if (!podmVetaPlatna(k, z[j])) v.push('věta „' + k + '" (' + j.toUpperCase() + '): text do '
          + PODMINKY_VETA_MAX + ' znaků' + (PODMINKY_VETY_TOKENY[k] ? ' se značkami {PORADI} a {PROC}' : ''));
      });
    });
  }
  if (p.nabidkaProj !== undefined) {
    const n = p.nabidkaProj;
    if (!n || typeof n !== 'object' || Array.isArray(n)) v.push('texty nabídky PROJ: nejsou objekt');
    else Object.keys(n).forEach(k => {
      if (k === 'dolozkyTisk') { if (typeof n[k] !== 'boolean') v.push('texty nabídky PROJ: tisk doložek není ano/ne'); return; }
      if (!podmMa(PODMINKY_VYCHOZI.nabidkaProj, k)) { v.push('texty nabídky PROJ: neznámý blok „' + k + '"'); return; }
      const z = n[k];
      if (!z || typeof z !== 'object' || Array.isArray(z)) { v.push('texty nabídky PROJ: „' + k + '" není objekt'); return; }
      const pocetCz = podmRadkyPlatne(k, 'cz', z.cz) ? z.cz.length : PODMINKY_VYCHOZI.nabidkaProj[k].cz.length;
      Object.keys(z).forEach(j => {
        if (PODMINKY_JAZYKY.indexOf(j) < 0) { v.push('texty nabídky PROJ: neznámý jazyk „' + j + '"'); return; }
        if (z[j] == null) return;
        if (!podmRadkyPlatne(k, j, z[j])) v.push('texty nabídky PROJ „' + k + '" (' + j.toUpperCase() + '): neplatné řádky');
        else if (j !== 'cz' && z[j].length !== pocetCz) v.push('texty nabídky PROJ „' + k + '" (' + j.toUpperCase() + '): jiný počet řádků než česky');
      });
    });
  }
  const ef = podminkyEf({ podminky: p });
  const volby = p.ock && podmZalohyPlatne(p.ock.zalohyProc) ? p.ock.zalohyProc : PODMINKY_VYCHOZI.ock.zalohyProc;
  if (p.ock && p.ock.zalohaProc !== undefined && podmProcPlatne(p.ock.zalohaProc)
      && volby.map(podmCislo).indexOf(podmCislo(p.ock.zalohaProc)) < 0)
    v.push('OCK: výchozí záloha musí být jednou z voleb zálohy');
  const s = podminkySoucetOck(ef);
  if (s.blokuje) v.push('OCK: záloha + dílčí faktura č. 2 + konečná faktura = ' + podmProcText(s.soucet) + ' %, musí dát 100 %');
  return v;
}

/* Čistá kopie pro zápis na server: jen známé klíče. */
function podminkyCiste(p) {
  if (!p || typeof p !== 'object') return null;
  const out = { v: 1 };
  if (p.sazbyPokut !== undefined) out.sazbyPokut = podmKopie(p.sazbyPokut);
  if (p.limitPokutProc !== undefined) out.limitPokutProc = p.limitPokutProc;
  [['ock', PODMINKY_PRAVIDLA_OCK], ['proj', PODMINKY_PRAVIDLA_PROJ]].forEach(([k, pravidla]) => {
    if (!p[k] || typeof p[k] !== 'object') return;
    const c = {};
    Object.keys(pravidla).forEach(pole => { if (podmMa(p[k], pole) && p[k][pole] !== undefined) c[pole] = podmKopie(p[k][pole]); });
    /* K3-N7: platná procenta OCK se ukládají jako čísla */
    if (k === 'ock') {
      if (podmZalohyPlatne(c.zalohyProc)) c.zalohyProc = c.zalohyProc.map(podmCislo);
      PODMINKY_OCK_PROC.forEach(pole => { if (podmProcPlatne(c[pole])) c[pole] = podmCislo(c[pole]); });
    }
    out[k] = c;
  });
  if (p.vety && typeof p.vety === 'object') {
    const ve = {};
    Object.keys(PODMINKY_VYCHOZI.vety).forEach(k => {
      const z = p.vety[k];
      if (!z || typeof z !== 'object') return;
      const c = {};
      PODMINKY_JAZYKY.forEach(j => { if (typeof z[j] === 'string' && z[j] !== '') c[j] = z[j]; });
      if (Object.keys(c).length) ve[k] = c;
    });
    if (Object.keys(ve).length) out.vety = ve;
  }
  if (p.nabidkaProj && typeof p.nabidkaProj === 'object') {
    const n = {};
    Object.keys(PODMINKY_VYCHOZI.nabidkaProj).forEach(k => {
      if (k === 'dolozkyTisk') { if (typeof p.nabidkaProj[k] === 'boolean') n[k] = p.nabidkaProj[k]; return; }
      const z = p.nabidkaProj[k];
      if (!z || typeof z !== 'object') return;
      const c = {};
      PODMINKY_JAZYKY.forEach(j => { if (Array.isArray(z[j])) c[j] = podmKopie(z[j]); });
      if (Object.keys(c).length) n[k] = c;
    });
    if (Object.keys(n).length) out.nabidkaProj = n;
  }
  return out;
}

/* Zápis věty v jednom jazyce (prázdný text = továrna / slovník). */
function podminkyNastavVetu(p, klic, jaz, text) {
  const out = p && typeof p === 'object' ? podmKopie(p) : { v: 1 };
  out.v = 1;
  out.vety = out.vety && typeof out.vety === 'object' ? out.vety : {};
  out.vety[klic] = out.vety[klic] && typeof out.vety[klic] === 'object' ? out.vety[klic] : {};
  if (text == null || String(text).trim() === '') delete out.vety[klic][jaz];
  else out.vety[klic][jaz] = String(text);
  if (!Object.keys(out.vety[klic]).length) delete out.vety[klic];
  if (!Object.keys(out.vety).length) delete out.vety;
  return out;
}
/* Zápis textu nabídky PROJ v jednom jazyce (null = továrna / slovník). */
function podminkyNastavTextProj(p, klic, jaz, hodnota) {
  const out = p && typeof p === 'object' ? podmKopie(p) : { v: 1 };
  out.v = 1;
  out.nabidkaProj = out.nabidkaProj && typeof out.nabidkaProj === 'object' ? out.nabidkaProj : {};
  if (klic === 'dolozkyTisk') out.nabidkaProj.dolozkyTisk = !!hodnota;
  else {
    out.nabidkaProj[klic] = out.nabidkaProj[klic] && typeof out.nabidkaProj[klic] === 'object' ? out.nabidkaProj[klic] : {};
    if (hodnota == null) delete out.nabidkaProj[klic][jaz]; else out.nabidkaProj[klic][jaz] = podmKopie(hodnota);
    if (!Object.keys(out.nabidkaProj[klic]).length) delete out.nabidkaProj[klic];
  }
  if (!Object.keys(out.nabidkaProj).length) delete out.nabidkaProj;
  return out;
}

/* ---------- vykreslení vět v jazyce dokumentu ---------- */

/* Pořadí dokladu v jazyce: „1." česky a německy, „1st" anglicky, „1re" /
 * „2e" francouzsky (stejně jako prekladPoradiEn/Fr v preklad.js). */
function podmPoradi(n, jaz) {
  const k = parseInt(n, 10);
  if (!isFinite(k)) return String(n == null ? '' : n);
  if (jaz === 'en') { const d = k % 100; return k + ((d >= 11 && d <= 13) ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' }[k % 10] || 'th')); }
  if (jaz === 'fr') return k === 1 ? '1re' : k + 'e';
  return k + '.';
}
/* Procento v jazyce: anglicky desetinná tečka. */
function podmProcJazyk(proc, jaz) {
  const t = String(proc == null ? '' : proc);
  return jaz === 'en' ? t.replace(',', '.') : t;
}
function podmDosad(sablona, jaz, poradi, proc) {
  return String(sablona).split('{PORADI}').join(podmPoradi(poradi, jaz)).split('{PROC}').join(podmProcJazyk(proc, jaz));
}
/* Věta platebního kalendáře v jazyce dokumentu. P = překlad slovníkem do
 * téhož jazyka (tr); bez uloženého cizího znění se překládá VÝCHOZÍ česká
 * věta — u ní slovník přesně ví, co s ní (žádná čeština v cizí nabídce). */
function podminkyVeta(ef, klic, jaz, poradi, proc, P) {
  const L = jaz || 'cz';
  const z = (ef && ef.vety && ef.vety[klic]) || PODMINKY_VYCHOZI.vety[klic];
  if (L === 'cz') return podmDosad(z.cz, 'cz', poradi, proc);
  if (z[L]) return podmDosad(z[L], L, poradi, proc);
  const cesky = podmDosad(PODMINKY_VYCHOZI.vety[klic].cz, 'cz', poradi, proc);
  return typeof P === 'function' ? P(cesky) : cesky;
}
/* Upravená čeština bez vlastního cizího znění — cizí dokument dostane
 * překlad VÝCHOZÍ věty, ne úpravy (hlásí Nastavení). */
function podminkyVetaJenVychoziPreklad(ef, klic, jaz) {
  const z = ef.vety[klic];
  return jaz !== 'cz' && !z[jaz] && z.cz !== PODMINKY_VYCHOZI.vety[klic].cz;
}
/* Řádky textu nabídky PROJ v jazyce: česky z Firmy, cizí uložené, jinak
 * slovník (P). Termíny: [činnost, termín, sekce] — sekce vždy z češtiny. */
function podminkyTextProj(ef, klic, jaz, P) {
  const L = jaz || 'cz';
  const z = (ef && ef.nabidkaProj && ef.nabidkaProj[klic]) || PODMINKY_VYCHOZI.nabidkaProj[klic];
  const T = typeof P === 'function' ? P : (x => x);
  if (klic === 'terminy') {
    if (L !== 'cz' && z[L]) return z.cz.map((r, i) => [z[L][i][0], z[L][i][1], r[2]]);
    return z.cz.map(r => [T(r[0]), T(r[1]), r[2]]);
  }
  if (L !== 'cz' && z[L]) return z[L].slice();
  return z.cz.map(T);
}

/* Zápis jednoho pole (Nastavení). Vrací nový objekt podmínek. Prázdná
 * hodnota pole vrátí továrnu (klíč se odstraní). */
function podminkyNastav(p, cast, pole, hodnota) {
  const out = p && typeof p === 'object' ? podmKopie(p) : { v: 1 };
  out.v = 1;
  if (!cast) {
    if (hodnota === undefined || hodnota === '') delete out[pole]; else out[pole] = hodnota;
    return out;
  }
  out[cast] = out[cast] && typeof out[cast] === 'object' ? out[cast] : {};
  if (hodnota === undefined) delete out[cast][pole]; else out[cast][pole] = hodnota;
  if (!Object.keys(out[cast]).length) delete out[cast];
  return out;
}

/* Jeden objekt pro ostatní moduly — v prohlížeči jsou soubory v jednom
 * scope, v Node se načte přes require (vzor firmaPlanModul). */
const PODMINKY = { PODMINKY_VYCHOZI, PODMINKY_TERMIN_DPZ_BEZ_STUDIE, PODMINKY_SOUCET_BLOKUJE, PODMINKY_JAZYKY, PODMINKY_TYPY_SMLOUVY, podminkyEf, podminkyUpraveno,
  podminkyVeta, podminkyVetaJenVychoziPreklad, podminkyTextProj, podminkyNastavVetu, podminkyNastavTextProj, podmPoradi,
  podminkyZalohaText, podminkyZalohyVolby, podminkyZalohaVychozi, podminkyFaktura2, podminkyKonecna,
  podminkyLimitVolby, podminkyLimitText, podminkySoucetOck, podminkyVady, podminkyCiste, podminkyNastav,
  podmProcText, podmCislo };

if (typeof module !== 'undefined') module.exports = Object.assign({ PODMINKY }, PODMINKY);
