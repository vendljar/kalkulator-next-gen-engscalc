/* ============================================================
 * ZÁMEK VYTIŠTĚNÉ NABÍDKY (#34) + ČÍSLOVÁNÍ VARIANT (#17)
 *
 * Pravidlo z provozu: vytištěná cenová nabídka je vnímaná jako ODESLANÁ.
 * Odeslaná nabídka se už needituje – co zákazník dostal na papíře, musí
 * v systému zůstat doslova. Proto se varianta v okamžiku tisku uzamkne
 * a běžný uživatel do ní už nezasáhne; pokračuje se KLONEM, tedy novou
 * variantou uvnitř téže zakázky.
 *
 * Číslování variant je ploché: původní varianta nese holé číslo zakázky,
 * další varianty příponu podle pořadí — druhá .2, třetí .3 … (#320, 22. 9.
 * 2026; do té doby dostal první klon .1, viz „Jedno číslo varianty" níž).
 * Přípony se nevnořují, jen rostou. Nejvyšší přidělené číslo si zakázka
 * pamatuje (zak.priponaMax), takže ani po smazání varianty se číslo
 * nepoužije podruhé: číslo, které už jednou odešlo na papíře, nesmí patřit
 * jiné nabídce.
 *
 * Tenhle soubor je čistý model – žádné DOM, žádné globální UI stavy.
 * Blokování editace řeší ui/zamek_ui.js, který se ptá jen na
 * variantaEditovatelna().
 * ============================================================ */

/* Které dokumenty zámek ARMUJÍ. Zamykají jen dokumenty, které jdou
 * zákazníkovi – cenová nabídka OCK a PROJ, ať už do Wordu, nebo do tisku.
 * Interní podklady (krycí listy, technická specifikace, náhled podkladů,
 * porovnání variant) se tisknou i mnohokrát během přípravy a zamknout
 * kvůli nim rozpracovanou variantu by práci jen zablokovalo. */
const ZAMEK_DOKUMENTY = {
  nabidka:         { zamyka: true,  popis: 'Cenová nabídka OCK (Word)' },
  nabidkaTisk:     { zamyka: true,  popis: 'Cenová nabídka OCK (tisk)' },
  nabidkaProj:     { zamyka: true,  popis: 'Cenová nabídka PROJ (Word)' },
  nabidkaProjTisk: { zamyka: true,  popis: 'Cenová nabídka PROJ (tisk)' },
  /* Smlouvy (#143). SoD jde zákazníkovi a podepisuje se — varianta, ze které
   * vznikla, se zamyká úplně stejně jako u odeslané nabídky. Plná moc je
   * administrativa (archiv stavebního úřadu), kalkulaci nijak nezmrazuje. */
  sod:             { zamyka: true,  popis: 'Smlouva o dílo — realizace (Word)' },
  sodProj:         { zamyka: true,  popis: 'Smlouva o dílo — projekční práce (Word)' },
  plnaMoc:         { zamyka: false, popis: 'Plná moc (Word)' },
  podklady:        { zamyka: false, popis: 'Náhled podkladů' },
  kryci:           { zamyka: false, popis: 'Krycí list objednávky / SoD' },
  kryciProj:       { zamyka: false, popis: 'Krycí list zakázky PROJ' },
  techspec:        { zamyka: false, popis: 'Technická specifikace' },
  porovnani:       { zamyka: false, popis: 'Porovnání variant' },
};

function dokumentZamyka(typ) {
  const d = ZAMEK_DOKUMENTY[typ];
  return !!(d && d.zamyka);
}

function dokumentPopis(typ) {
  const d = ZAMEK_DOKUMENTY[typ];
  return d ? d.popis : String(typ || '');
}

/* ---------- číslování variant ---------------------------------------- */

/* JEDNO ČÍSLO VARIANTY — ČÍSLO Z PAPÍRU (#320, rozhodnutí J. V. 22. 9. 2026:
 * „platí číslo na papíře, nové klony dostanou příponu shodnou s pořadím
 * a odeslaným nabídkám zůstane číslo, se kterým odešly").
 *
 * Do 22. 9. 2026 měla varianta DVĚ čísla. Dokumenty (nabídky, krycí listy)
 * číslovaly podle POŘADÍ v zakázce — druhá varianta .2 (zadání 19. 8. 2026) —
 * kdežto zámek, seznamy, hlášky i serverová pojistka B56 podle PŘÍPONY, kterou
 * první klon dostal .1. Změřeno: druhá varianta odešla zákazníkovi jako
 * 0555.2, v zámku stálo 0555.1. A číslo podle pořadí se navíc posouvalo:
 * po smazání dřívější varianty dotisk téže odeslané nabídky nesl jiné číslo.
 *
 * Teď je číslo jedno — přípona — a dokumenty ho berou odsud taky
 * (cisloSVariantou v zakazka.js). Zakázky uložené dřív se při načtení JEDNOU
 * přečíslují podle pořadí (zajistiZamek, značka zak.priponySchema), tedy na
 * přesně to číslo, které jim dosud tiskly dokumenty. Od té chvíle se číslo
 * nemění ani po smazání jiné varianty.
 *
 * Mez, kterou nic nezavře: nabídka odeslaná PŘED touto změnou, u níž se
 * mezitím smazala dřívější varianta, na papíře nese jiné číslo, než jaké jí
 * dávalo pořadí v okamžiku migrace. Kolik variant tehdy existovalo, se
 * nikde nezapisovalo — zůstává jí číslo, které aplikace ukazovala naposledy. */
const PRIPONY_SCHEMA = 2;

function variantaPripona(v) {
  const p = v && v.pripona;
  return (typeof p === 'number' && isFinite(p) && p > 0) ? Math.floor(p) : 0;
}

/* Přípona varianty v zakázce. Varianta, která příponu ještě nemá (zakázka
 * sestavená v kódu mimo importZakazka), dostane tutéž, jakou by jí dala
 * migrace: podle pořadí. */
function variantaPriponaVZakazce(zak, v) {
  if (v && typeof v.pripona === 'number') return variantaPripona(v);
  const i = ((zak && zak.varianty) || []).findIndex(x => x === v || (x && v && x.id === v.id));
  return i > 0 ? i + 1 : 0;
}

/* Příští přípona: podle pořadí (druhá varianta .2), ale nikdy číslo, které
 * už v zakázce padlo — po smazání varianty se tedy pokračuje nad maximem. */
function dalsiPriponaVarianty(zak) {
  let max = (zak && typeof zak.priponaMax === 'number' && isFinite(zak.priponaMax))
    ? Math.floor(zak.priponaMax) : 0;
  const varianty = (zak && zak.varianty) || [];
  varianty.forEach(v => {
    const p = variantaPriponaVZakazce(zak, v);
    if (p > max) max = p;
  });
  return Math.max(max + 1, varianty.length + 1);
}

/* Číslo nabídky konkrétní varianty = číslo na papíře. Bez přípony vrací
 * HOLÉ číslo zakázky. Tutéž příponu tisknou dokumenty (cisloSVariantou). */
function variantaCislo(zak, v) {
  const zaklad = String((zak && zak.cislo) || '');
  const p = variantaPriponaVZakazce(zak, v);
  return p ? zaklad.replace(/\s+$/, '') + '.' + p : zaklad;
}

/* Patří uložené číslo z odeslané nabídky k tomuto číslu zakázky? Pro zámky
 * pořízené před #320: ty v `zamek.cislo` nesou číslo z tehdejší přípony
 * (první klon .1), které se od čísla na papíře může lišit v příponě. Mění se
 * u nich proto jen ZÁKLAD — ten musí sedět; přípona je od migrace dána
 * pořadím, ve kterém dokumenty tiskly. */
function zamekCisloZakladSedi(cisloZamku, zak) {
  const bylo = String(cisloZamku || '');
  const zaklad = String((zak && zak.cislo) || '').replace(/\s+$/, '');
  if (bylo === zaklad || bylo === String((zak && zak.cislo) || '')) return true;
  return bylo.startsWith(zaklad + '.') && /^\d+$/.test(bylo.slice(zaklad.length + 1));
}

/* Klon = nová varianta uvnitř téže zakázky. Přebírá kompletní data
 * (hluboká kopie), ale nikdy ne zámek ani příznak řídící varianty –
 * čerstvý klon je rozpracovaná nabídka, ne odeslaná. */
function klonujVariantu(zak, id, opts) {
  opts = opts || {};
  if (!zak || !Array.isArray(zak.varianty) || !zak.varianty.length) return null;
  const zdroj = zak.varianty.find(v => v.id === id) || aktivniVarianta(zak);
  if (!zdroj) return null;

  const p = dalsiPriponaVarianty(zak);
  /* Název nese totéž číslo jako přípona (#320): „Varianta 3" = …555.3. */
  const kopie = novaVarianta(opts.nazev || ('Varianta ' + p),
                             JSON.parse(JSON.stringify(zdroj.data)));
  /* Id musí být v zakázce jedinečné i po načtení ze složky (B29, 9. 9. 2026). */
  if (typeof zakazkaUnikatniId === 'function') kopie.id = zakazkaUnikatniId(zak, kopie.id);
  kopie.zakaznik = zdroj.zakaznik || '';
  kopie.pozn = zdroj.pozn || '';
  kopie.pripona = p;
  kopie.ridici = false;
  kopie.zamek = null;
  /* Schválení slevy se do klonu nepřenáší (N44, 24. 9. 2026) — viz
   * slevaRozhodnutiZahod v zakazka.js. */
  if (typeof slevaRozhodnutiZahod === 'function') slevaRozhodnutiZahod(kopie.data);
  kopie.klonZ = zdroj.id;
  kopie.klonZCislo = variantaCislo(zak, zdroj);
  /* NOVÁ VARIANTA NESE DNEŠNÍ DATUM (nález D2, 15. 9. 2026). Klon vzniká
   * typicky proto, že se pokračuje po odeslané nabídce — datum založení
   * zakázky by na něm bylo staré o týdny. Zdrojová varianta ani hlavička
   * zakázky se nemění; historické varianty tím pádem zůstávají, jak byly. */
  kopie.datum = (typeof dnesIso === 'function')
    ? dnesIso() : new Date().toISOString().slice(0, 10);

  zak.varianty.push(kopie);
  zak.priponaMax = p;
  if (opts.aktivovat !== false) zak.aktivni = kopie.id;
  return kopie;
}

/* VÝSLEDEK VARIANTY — JEDINÉ MÍSTO, KDE SE ROZHODUJE (nálezy A1, D1).
 *
 * Odeslaná nabídka vydá svůj otisk; rozpracovaná se počítá. Kdo se ptá téhle
 * dvojice, nemůže na zamčené variantě omylem spustit dnešní jádro.
 *
 * Zamčená varianta BEZ otisku (vše, co odešlo před 15. 9. 2026) se počítá
 * dál jako dosud. Zpětně se otisk dopočítat nedá — to už by nebyl otisk, ale
 * dnešní výpočet s dnešní chybou. U těch nabídek tedy A1 zůstává a jedinou
 * cestou k aktuálním číslům je nová varianta, jak rozhodl J. V.
 *
 * Funkce NIC NEUKLÁDÁ a vrací hluboký klon: kdyby volající do výsledku sáhl
 * (a UI to dělá — dopisuje si do něj mezivýpočty), přepsal by otisk odeslané
 * nabídky. To je přesně ta třída chyby, kterou tenhle nález řeší. */
function vypocetZ(v, jekly) {
  const zmr = zamekVysledek(v);
  if (zmr && zmr.ock) return JSON.parse(JSON.stringify(zmr.ock));
  const d = (v && v.data) || {};
  if (!d.ock || !d.cenik) return null;
  return vypocet(d.ock.zadani, d.cenik, jekly, d.ock.fixes);
}

function vypocetProjZ(v) {
  const zmr = zamekVysledek(v);
  if (zmr && zmr.proj) return JSON.parse(JSON.stringify(zmr.proj));
  const d = (v && v.data) || {};
  if (!d.proj) return null;
  return vypocetProj(d.proj.zadani, d.proj.cenik);
}

/* Kurz EUR pro cizojazyčný dokument. U odeslané nabídky ten, který platil
 * v okamžiku odeslání — doplnit ho dodatečně nejde, nabídka se nemění (D1). */
function kurzEurZ(v, zaklad) {
  const zmr = zamekVysledek(v);
  if (zmr && zmr.kurzEurKc) return zmr.kurzEurKc;
  return zaklad;
}

/* Nese zakázka aspoň jednu ODESLANOU (uzamčenou) nabídku? (nález A3,
 * 15. 9. 2026.) Číslo nabídky je hlavičkové pole, a hlavička je ze zámku
 * VARIANTY vědomě vyjmutá — zámek chrání cenu, ne adresu zákazníka. U čísla
 * to ale neplatí: je to identifikátor dokumentu, který už odešel, a otisk
 * zámku ho neobsahuje, takže se dosud dal přepsat beze stopy.
 *
 * Dokud nic neodešlo, číslo si obchodník vyplňuje volně — nová zakázka ho
 * má jen jako předlohu „2026 - OPR - CN - " a bez dopsání pořadí by nešla
 * odeslat vůbec. Teprve odeslání z něj dělá údaj, který se nemění jen tak. */
function zakazkaMaOdeslanou(zak) {
  return !!(zak && Array.isArray(zak.varianty)
    && zak.varianty.some(v => typeof variantaUzamcena === 'function' && variantaUzamcena(v)));
}

/* ---------- stav zámku ------------------------------------------------ */

function zamekInfo(v) {
  return (v && v.zamek && v.zamek.zamceno) ? v.zamek : null;
}

function variantaUzamcena(v) {
  return !!zamekInfo(v);
}

function variantaEditovatelna(v) {
  return !variantaUzamcena(v);
}

/* Uzamčení. První tisk je ten definitivní okamžik „odesláno" – uloží se
 * datum, typ dokumentu, číslo nabídky a otisk částek, které odešly.
 * Každý další tisk téže (už zamčené) varianty se jen připíše do seznamu
 * tisky[]; původní záznam se nepřepisuje, jinak by se ztratilo datum
 * skutečného odeslání. */
function zamkniVariantu(v, info) {
  if (!v) return null;
  info = info || {};
  const zaznam = {
    kdy: info.kdy || new Date().toISOString(),
    typ: info.typ || '',
    popis: info.popis || dokumentPopis(info.typ),
    kdo: info.kdo || '',
    /* Ze které šablony dokument vznikl (#139): { zdroj:'server'|'mistni',
     * verze, otisk, nazev }. U serverové šablony je tím doložené, že nabídka
     * odešla z centrálně řízené verze; „mistni" je razítko tisku mimo ni
     * (měkký režim nebo práce bez serveru) a nejde dodatečně zapřít. */
    sablona: info.sablona || null,
  };
  if (variantaUzamcena(v)) {
    if (!Array.isArray(v.zamek.tisky)) v.zamek.tisky = [];
    v.zamek.tisky.push(zaznam);
    return v.zamek;
  }
  v.zamek = {
    zamceno: true,
    kdy: zaznam.kdy, typ: zaznam.typ, popis: zaznam.popis, kdo: zaznam.kdo,
    cislo: info.cislo || '',
    /* `cislo` je číslo Z PAPÍRU (#320) — tatáž přípona, jakou tisknou
     * dokumenty. Zámky pořízené dřív značku nemají a jejich `cislo` může
     * nést starou příponu (první klon .1); server u nich hlídá jen základ
     * čísla (B56). Značka je v klíči zámku, takže se nedá potichu sundat. */
    cisloPapir: true,
    otisk: info.otisk || null,
    /* CELÝ VÝSLEDEK, NE JEN SOUHRN (nálezy A1 a D1, rozhodnutí J. V.
     * 15. 9. 2026: „potřebujeme uzamknout nabídku as is, jakoby to bylo pdf …
     * už se za žádných podmínek nezmění").
     *
     * `otisk` výš nese jen souhrnné částky a slouží k tomu, aby bylo vidět,
     * když se něco rozejde. Jenže rozejít se to smělo: zamčená varianta si
     * drží svá DATA (zadání i ceník jsou zmrazená kopie), ale počítala se
     * DNEŠNÍM KÓDEM. Když se 8. 9. 2026 přesunula doprava do základu
     * přirážky (V29), přepsalo to celkovou cenu nabídky vytištěné 4. 9.
     * — zákazník držel papír s jiným číslem, než jaké aplikace ukazovala.
     * Zmrazit data a nezmrazit vzorec je půlka zámku.
     *
     * Ukládá se proto celý výsledek OCK i PROJ, jak vyšel v okamžiku
     * odeslání, a k tomu kurz EUR: bez něj by cizojazyčný dotisk téže
     * nabídky nešel vyrobit (D1) a doplnit ho už nelze — zamčená nabídka
     * se nemění. Měřeno: OCK ~25 kB, PROJ ~5 kB na variantu; bere se
     * JEDNOU při prvním zamčení, další tisky do `tisky[]` nic nepřidávají.
     *
     * `build` je tu kvůli dohledatelnosti: říká, který kód to číslo vydal. */
    vysledek: info.vysledek || null,
    tisky: [zaznam],
  };
  return v.zamek;
}

/* Zmrazený výsledek odeslané nabídky, nebo null. Ptát se na tuhle funkci je
 * jediný správný způsob, jak zjistit „smí se tahle varianta počítat znovu?" —
 * `variantaUzamcena()` na to nestačí, protože zamčené varianty ze starších
 * zakázek otisk výsledku nemají a počítat se musí dál. */
function zamekVysledek(v) {
  const z = zamekInfo(v);
  return (z && z.vysledek) ? z.vysledek : null;
}

/* VÝSLEDEK K ZAMČENÍ — JEDEN KÓD PRO PROHLÍŽEČ I SERVER (nález B59,
 * revize v22.9.9, 22. 9. 2026).
 *
 * Prohlížeč tím při prvním tisku pořizuje zmrazený výsledek a server tímž
 * kódem ověřuje, že výsledek NOVÉHO zámku odpovídá datům varianty. Dvě kopie
 * téhož vzorce by se časem rozešly a server by hlásil rozpor tam, kde žádný
 * není. Při chybě výpočtu vrací null — stejně jako dosud zamekPoTisku: zámek
 * pak vznikne bez zmrazeného výsledku a dokumenty počítají z dat. */
function zamekVysledekSpocti(v, jekly, build) {
  const d = (v && v.data) || {};
  try {
    return {
      ock: vypocet(d.ock.zadani, d.cenik, jekly, d.ock.fixes),
      proj: vypocetProj(d.proj.zadani, d.proj.cenik),
      kurzEurKc: (d.cenik && +d.cenik.kurzEurKc) || (d.proj && d.proj.cenik && +d.proj.cenik.kurzEurKc) || 0,
      build: build || '',
      kdy: new Date().toISOString(),
    };
  } catch (e) { return null; }
}

/* Části výsledku, ze kterých se tiskne. `build` a `kdy` jsou razítka pořízení,
 * ne čísla nabídky — ta se neporovnávají. */
const ZAMEK_OVERENI_CASTI = ['ock', 'proj', 'kurzEurKc'];

/* Částky, bez kterých žádný dokument nevznikne (cena bez DPH, DPH, s DPH
 * u OCK; cena a celkem u PROJ; kurz EUR). Musí být v OBOU výsledcích —
 * jinak by „chybějící klíč není rozdíl" (P6) pustil podvrh, který souhrn
 * prostě vynechá, a server by mu dal razítko „shoda". */
const ZAMEK_OVERENI_JADRO = ['ock.souhrn.zakladCena', 'ock.souhrn.zakladDph', 'ock.souhrn.zakladSDph',
  'proj.souhrn.cena', 'proj.souhrn.celkem', 'kurzEurKc'];

/* Porovná výsledek ze zámku s přepočtem. Obě strany mají projít JSONem
 * (klientská jím prošla cestou po síti — NaN je v ní null). Čísla se srovnávají
 * s tolerancí na poslední bit, ne na koruny: jádro používá jen sčítání,
 * násobení a zaokrouhlení, takže stejný kód nad stejnými daty dává shodu
 * přesnou a každý skutečný rozdíl je rozdíl. Vrací počet rozdílů a prvních
 * `max` cest — cesty, ne hodnoty: výsledek nese i náklady firmy.
 *
 * JEN PENÍZE A MNOŽSTVÍ (P6 / K15-N67, 25. 9. 2026). Do té doby se porovnával
 * celý strom znak po znaku — i názvy položek, dodatkové texty, příznaky a klíče,
 * které přidala nebo ubrala jiná verze aplikace. Lišta zámku pak u poctivé
 * nabídky hlásila „čísla nesouhlasí", stačilo tisknout ze stránky načtené před
 * nasazením nové verze. Teď platí:
 *   – porovnávají se ČÍSLA (peníze, množství, hodiny); číslo proti čemukoli
 *     jinému (null z NaN, text) je rozdíl,
 *   – texty a příznaky (ano/ne) se neporovnávají,
 *   – klíč, který je jen v jednom výsledku, se přeskočí — kromě jádra
 *     (ZAMEK_OVERENI_JADRO), to musí mít obě strany,
 *   – řádky se párují podle názvu (`origNazev`, `nazev`, `key`), když jsou
 *     v obou polích jednoznačné: položka navíc v jedné verzi pak ostatní
 *     řádky neposune; jinak po pořadí. Řádek jen na jedné straně rozdílem
 *     není — jeho částka se promítne do součtů, a ty se porovnávají. */
function zamekVysledekRozdily(klient, server, max) {
  const lim = max || 5;
  const out = { pocet: 0, cesty: [] };
  const pridej = (c) => { out.pocet++; if (out.cesty.length < lim) out.cesty.push(c); };
  const stejneCislo = (a, b) => Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b));
  const cislo = (x) => typeof x === 'number';
  const idRadku = (o) => {
    if (!o || typeof o !== 'object' || Array.isArray(o)) return '';
    for (const k of ['origNazev', 'nazev', 'key']) if (typeof o[k] === 'string' && o[k]) return k + ':' + o[k];
    return '';
  };
  const podleId = (pole) => {
    const m = new Map();
    for (const x of pole) { const id = idRadku(x); if (!id || m.has(id)) return null; m.set(id, x); }
    return m;
  };
  const projdi = (a, b, c) => {
    if (a === undefined || b === undefined) return;          // klíč jen v jednom výsledku
    if (cislo(a) || cislo(b)) { if (!(cislo(a) && cislo(b) && stejneCislo(a, b))) pridej(c); return; }
    if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return;   // texty, příznaky, null
    if (Array.isArray(a) !== Array.isArray(b)) return;       // jiný tvar = jiná verze, ne jiná čísla
    if (Array.isArray(a)) {
      const mb = podleId(b);
      if (mb && podleId(a)) {
        a.forEach((x, i) => { const y = mb.get(idRadku(x)); if (y !== undefined) projdi(x, y, c + '[' + i + ']'); });
        return;
      }
      for (let i = 0; i < Math.min(a.length, b.length); i++) projdi(a[i], b[i], c + '[' + i + ']');
      return;
    }
    Object.keys(a).forEach(k => {
      if (Object.prototype.hasOwnProperty.call(b, k)) projdi(a[k], b[k], c + '.' + k);
    });
  };
  ZAMEK_OVERENI_CASTI.forEach(k => projdi(klient ? klient[k] : undefined, server ? server[k] : undefined, k));
  const hodnota = (o, cesta) => cesta.split('.').reduce((x, k) => (x && typeof x === 'object') ? x[k] : undefined, o);
  ZAMEK_OVERENI_JADRO.forEach(cesta => {
    if (hodnota(klient, cesta) === undefined || hodnota(server, cesta) === undefined) pridej(cesta);
  });
  return out;
}

/* Razítko ověření zmrazeného výsledku (B59). Píše ho VÝHRADNĚ server při
 * prvním uložení zámku; klient ho nepodvrhne ani nesmaže — při každém dalším
 * uložení se přenáší z uložené verze. Stav:
 *   'shoda'       výsledek odpovídá datům varianty,
 *   'nesouhlasi'  neodpovídá: upravený klient, nebo stránka se starším jádrem
 *                 (těsně po nasazení); `klient` a `server` říkají, které verze,
 *   'chyba'       server výsledek nepřepočítal, takže ho neověřil.
 * Zámek bez zmrazeného výsledku razítko nedostane (null): dokumenty ho
 * počítají z dat, která server hlídá sám. */
function zamekOvereni(v, jekly, verzeServeru, kdy) {
  const z = zamekInfo(v);
  if (!z || !z.vysledek) return null;
  const zaklad = { kdy: kdy || new Date().toISOString(), server: String(verzeServeru || ''),
                   klient: String(z.vysledek.build || '').slice(0, 40) };
  const server = zamekVysledekSpocti(v, jekly, '');
  if (!server) return Object.assign({ stav: 'chyba', rozdilu: 0, cesty: [] }, zaklad);
  /* Výsledek od klienta může být cokoli, co projde JSONem — ani patologický
   * tvar nesmí shodit uložení; skončí jako „neověřeno". */
  let r;
  try { r = zamekVysledekRozdily(JSON.parse(JSON.stringify(z.vysledek)), JSON.parse(JSON.stringify(server))); }
  catch (e) { return Object.assign({ stav: 'chyba', rozdilu: 0, cesty: [] }, zaklad); }
  return Object.assign({ stav: r.pocet ? 'nesouhlasi' : 'shoda', rozdilu: r.pocet, cesty: r.cesty }, zaklad);
}

/* Věta o sporném razítku pro lištu zámku a pro hlášku po uložení. Prázdno =
 * není co říct (shoda, žádné razítko, starší zámek). */
function zamekOvereniText(ov) {
  if (!ov || typeof ov !== 'object') return '';
  const verze = 'výsledek spočítala verze aplikace ' + (ov.klient || 'neuvedená')
    + ', server běžel na ' + (ov.server || 'neznámé verzi');
  const n = +ov.rozdilu || 0;
  const rozdilu = n + (n === 1 ? ' rozdíl' : (n >= 2 && n <= 4) ? ' rozdíly' : ' rozdílů');
  if (ov.stav === 'nesouhlasi')
    return 'Čísla této odeslané nabídky nesouhlasí s výpočtem serveru z jejích dat ('
      + rozdilu + '; ' + verze + '). Dokumenty se dál tisknou tak, '
      + 'jak nabídka odešla — rozpor je zapsaný v jejím zámku.';
  if (ov.stav === 'chyba')
    return 'Čísla této odeslané nabídky server při uzamčení nepřepočítal, takže je neověřil ('
      + verze + ').';
  return '';
}

/* Odemknutí je výjimka, ne běžný krok: smí ho udělat jen správce a musí
 * uvést důvod. Původní zámek se neztrácí – uloží se do historie odemčení,
 * aby zůstalo dohledatelné, co a kdy bylo odesláno. */
function odemkniVariantu(v, opts) {
  opts = opts || {};
  if (!v) return { ok: false, duvod: 'varianta neexistuje' };
  if (!variantaUzamcena(v)) return { ok: false, duvod: 'varianta není zamčená' };
  if (!opts.jeAdmin) return { ok: false, duvod: 'odemknout smí jen správce' };
  const duvod = String(opts.duvod || '').trim();
  if (!duvod) return { ok: false, duvod: 'bez uvedení důvodu odemknout nelze' };

  if (!Array.isArray(v.odemceni)) v.odemceni = [];
  v.odemceni.push({
    kdy: opts.kdy || new Date().toISOString(),
    kdo: opts.kdo || '',
    duvod,
    zamek: v.zamek,
  });
  v.zamek = null;
  return { ok: true, duvod: '' };
}

/* ---------- otisk odeslaných částek ----------------------------------- */

/* Záměrně jen souhrnná čísla, ne hluboká kopie celé varianty: zakázka se
 * ukládá do JSON a plný snapshot u každého tisku by ji nafoukl. Tvar je
 * shodný s metrikami porovnání variant (POROVNANI_METRIKY), takže se otisk
 * dá zobrazit stejnými formátovači. */
/* DPH v otisku po částech (audit 1. 8. 2026, N3) – stejné klíče jako
 * v POROVNANI_METRIKY. Starší zámky nesou dphSazba/dphKc z doby jediné
 * sazby; zůstávají, jak byly pořízeny – otisk se zpětně nepřepisuje. */
/* Do otisku patří obě slevy zvlášť (#134, 12. 8. 2026): kdyby se hlídala jen
 * jedna, dalo by se u odeslané nabídky přepsat procento u té druhé a otisk by
 * mlčel. */
const ZAMEK_OTISK_POLE = ['ockZaklad', 'slevaPct', 'slevaKc', 'ockPoSleve',
                          'projZaklad', 'slevaProjPct', 'slevaProjKc',
                          'projCelkem', 'celkemBezDph',
                          'dphOckSazba', 'dphOckKc', 'dphProjSazba', 'dphProjKc',
                          'celkemSDph', 'priplatky'];

function zamekOtisk(hodnoty) {
  const o = {};
  ZAMEK_OTISK_POLE.forEach(k => {
    const h = hodnoty ? hodnoty[k] : null;
    o[k] = (typeof h === 'number' && isFinite(h)) ? h : null;
  });
  return o;
}

function zamekOtiskZPorovnani(porovnani, id) {
  const sl = ((porovnani && porovnani.varianty) || []).find(x => x.id === id);
  return zamekOtisk(sl ? sl.hodnoty : null);
}

/* ---------- migrace --------------------------------------------------- */

/* Doplní nová pole do zakázek uložených před zavedením zámku.
 *
 * Přípony: první varianta zůstává na holém čísle zakázky, další dostanou
 * .2, .3 … v pořadí, v jakém jsou v zakázce — číslo, které jim tiskly
 * dokumenty (#320, 22. 9. 2026; původní migrace z #34 rozdávala .1, .2 …
 * a číslo v zámku se tím rozešlo s číslem na papíře).
 *
 * Funkce je idempotentní – opakované volání už nic nemění. */
function zajistiZamek(zak) {
  if (!zak || !Array.isArray(zak.varianty)) return zak;

  /* JEDNO ČÍSLO VARIANTY (#320). Zakázka uložená před 22. 9. 2026 se
   * JEDNOU přečísluje podle pořadí: první varianta holé číslo, další .2, .3 …
   * — přesně to číslo, které jí dosud tiskly dokumenty (cisloSVariantou
   * číslovala podle pořadí). Týká se to i odeslaných variant: jejich papír
   * nesl číslo podle pořadí, ne podle staré přípony. Zámku samotného se to
   * nedotkne — `zamek.cislo` zůstává, jak byl pořízen (je v klíči zámku),
   * a server u takového zámku hlídá jen základ čísla (B56).
   *
   * Značka zak.priponySchema zajistí, že se to stane jednou: po smazání
   * varianty se už NEpřečísluje — právě to posouvání čísel byla chyba.
   * Nová zakázka značku nese od založení (novaZakazka). */
  if (zak.priponySchema !== PRIPONY_SCHEMA) {
    zak.varianty.forEach((v, i) => { v.pripona = i === 0 ? 0 : i + 1; });
    zak.priponaMax = zak.varianty.length > 1 ? zak.varianty.length : 0;
    zak.priponySchema = PRIPONY_SCHEMA;
  }

  // Přípony, které chybí (varianta přidaná mimo klonujVariantu): podle
  // pořadí, ale vždy nad dosavadní maximum, aby se číslo neopakovalo.
  const zname = zak.varianty.filter(v => typeof v.pripona === 'number');
  let volne = Math.max(0, ...zname.map(variantaPripona),
                       (typeof zak.priponaMax === 'number' && isFinite(zak.priponaMax))
                         ? Math.floor(zak.priponaMax) : 0);
  /* Varianta bez přípony NA PRVNÍM MÍSTĚ je první varianta zakázky: holé
   * číslo, pokud ho v zakázce ještě nikdo nemá (P1 / K13-N53, 24. 9. 2026).
   * Dřív dostala 0 jen tehdy, když příponu neměla žádná varianta — po klonu
   * založeném před prvním uložením (klon .2) tak vytištěná varianta 1
   * dostala .3 a server obchodníkovi uložení odmítl (B56). */
  const nulaObsazena = zname.some(v => variantaPripona(v) === 0);
  zak.varianty.forEach((v, i) => {
    if (typeof v.pripona === 'number') return;
    if (i === 0 && !nulaObsazena) { v.pripona = 0; return; }
    volne = Math.max(volne + 1, i + 1);
    v.pripona = volne;
  });

  let max = 0;
  zak.varianty.forEach(v => {
    v.pripona = variantaPripona(v);
    if (v.pripona > max) max = v.pripona;
    if (v.zamek && v.zamek.zamceno) {
      if (!Array.isArray(v.zamek.tisky) || !v.zamek.tisky.length)
        v.zamek.tisky = [{ kdy: v.zamek.kdy || '', typ: v.zamek.typ || '',
                           popis: v.zamek.popis || dokumentPopis(v.zamek.typ),
                           kdo: v.zamek.kdo || '' }];
    } else if (v.zamek != null) {
      v.zamek = null;   // rozbitý/nedokončený zápis zámku se nebere jako zámek
    } else {
      v.zamek = null;   // sjednocení undefined → null
    }
  });
  if (typeof zak.priponaMax !== 'number' || !isFinite(zak.priponaMax) || zak.priponaMax < max)
    zak.priponaMax = max;
  return zak;
}

/* ============================================================
 * ZÁMEK OTEVŘENÉ ZAKÁZKY — JEN PRO ČTENÍ (nález V23-B, 4. 9. 2026)
 *
 * Jiná věc než zámek vytištěné nabídky nahoře. Ten je TRVALÝ a patří k datům
 * (odeslaná nabídka je doklad). Tenhle je DOČASNÝ a patří k oknu: zakázka
 * otevřená z databáze začíná jen ke čtení, ať si ji jde prohlédnout, aniž by
 * se cokoli změnilo. Zadání J. V.: „stačí, aby si obchodník otevřel starší
 * zahraniční nabídku ‚jen se podívat‘, a uložená nabídka je tiše přepsaná."
 *
 * KDO SMÍ ODEMKNOUT (rozhodnutí J. V. 4. 9. 2026: „obchodník může své zakázky
 * odemykat"):
 *   – administrátor a vedoucí kohokoli,
 *   – obchodník zakázku, kterou sám založil (`zak.autor` = jeho e-mail),
 *   – zakázku BEZ autora smí odemknout každý: starší soubory a zakázky
 *     z doby před online databází autora nemají a jinak by je nešlo upravit,
 *   – bez přihlášení (aplikace ze souboru) se neptáme vůbec — není koho.
 *
 * Odemčení NEOTVÍRÁ uzamčenou (vytištěnou) variantu: ta má svůj vlastní
 * zámek a ten platí dál.
 * ============================================================ */
/* PŘÍPONA PRVNÍ VARIANTY — nález a oprava dat (K13-P1, 25. 9. 2026).
 *
 * Kód je opravený od 24. 9. (nová zakázka dává první variantě 0), ale
 * zakázky uložené předtím můžou mít u první varianty .3 místo holého čísla.
 * Do 25. 9. se to dalo opravit jen skriptem nad staženou zálohou
 * (podklady/K13_pripona_oprava.mjs); J. V.: „jak to mám udělat? nemůžeš to
 * provést ty?" — teď to administrátor udělá tlačítkem v Nastavení →
 * Databáze a logika je tady, jedna pro skript i pro aplikaci.
 *
 * „První varianta" = nejstarší (`vytvoreno`), která nevznikla klonem ani
 * jako alternativa. Nález vrací null, když je v pořádku. */
function priponaPrvniNalez(zak) {
  if (!zak || !Array.isArray(zak.varianty) || !zak.varianty.length) return null;
  const puvodni = zak.varianty.filter(v => v && !v.klonZ && !v.alternativaZ);
  if (!puvodni.length) return null;
  const prvni = puvodni.slice().sort((a, b) => String(a.vytvoreno || '').localeCompare(String(b.vytvoreno || '')))[0];
  if (!(typeof prvni.pripona === 'number' && prvni.pripona > 0)) return null;
  return {
    id: prvni.id, nazev: prvni.nazev || prvni.id, pripona: prvni.pripona,
    zamcena: variantaUzamcena(prvni),
    cisloVZamku: (prvni.zamek && prvni.zamek.cislo) || '',
    /* Holé číslo už drží jiná varianta — oprava by vyrobila dvě stejná
     * čísla; tady musí rozhodnout člověk. */
    holeZabrane: zak.varianty.some(v => v && v !== prvni && (v.pripona === 0 || v.pripona == null)),
  };
}
/* Oprava na místě: první varianta dostane příponu 0. Uzamčenou (odeslanou)
 * variantu NEOPRAVUJE — zámek nese číslo z papíru a server jeho změnu
 * odmítne; postup je odemknout, opravit, znovu vytisknout. Vrací
 * { opraveno, duvod }. */
function priponaPrvniOprav(zak) {
  const n = priponaPrvniNalez(zak);
  if (!n) return { opraveno: false, duvod: 'v pořádku' };
  if (n.zamcena) return { opraveno: false, duvod: 'odeslaná (uzamčená) varianta — nejdřív odemknout' };
  if (n.holeZabrane) return { opraveno: false, duvod: 'holé číslo už má jiná varianta — rozhodne člověk' };
  const v = zak.varianty.find(x => x && x.id === n.id);
  v.pripona = 0;
  return { opraveno: true, duvod: '.' + n.pripona + ' → holé číslo' };
}

function zamekCteniSmiOdemknout(zak, ja) {
  if (!ja || !ja.email) return true;                    // offline / bez přihlášení
  if (ja.role === 'Administrátor' || ja.role === 'Vedoucí') return true;
  const autor = String((zak && zak.autor) || '').trim().toLowerCase();
  if (!autor) return true;                              // starší zakázka bez autora
  return autor === String(ja.email).trim().toLowerCase();
}

/* Věta pro toho, kdo odemknout nesmí. Prázdno = smí. */
function zamekCteniDuvod(zak, ja) {
  if (zamekCteniSmiOdemknout(zak, ja)) return '';
  const jmeno = String((zak && (zak.autorJmeno || zak.autor)) || '').trim();
  return 'Tuhle nabídku založil ' + (jmeno || 'jiný obchodník')
    + '. Upravit ji může on, vedoucí nebo administrátor.';
}

if (typeof module !== 'undefined')
  module.exports = { zakazkaMaOdeslanou, zamekVysledek, vypocetZ, vypocetProjZ, kurzEurZ, ZAMEK_DOKUMENTY, dokumentZamyka, dokumentPopis,
                     zamekVysledekSpocti, ZAMEK_OVERENI_CASTI, ZAMEK_OVERENI_JADRO, zamekVysledekRozdily, zamekOvereni, zamekOvereniText,
                     zamekCteniSmiOdemknout, zamekCteniDuvod, priponaPrvniNalez, priponaPrvniOprav,
                     variantaPripona, dalsiPriponaVarianty, variantaCislo,
                     PRIPONY_SCHEMA, variantaPriponaVZakazce, zamekCisloZakladSedi,
                     klonujVariantu, zamekInfo, variantaUzamcena,
                     variantaEditovatelna, zamkniVariantu, odemkniVariantu,
                     ZAMEK_OTISK_POLE, zamekOtisk, zamekOtiskZPorovnani,
                     zajistiZamek };
