/* ============================================================
 * ÚLOŽIŠTĚ ZAKÁZEK VE SLOŽCE – model (mezikrok před online databází)
 *
 * Dnes se zakázka ukládá ručně: stáhne se JSON a uživatel si ho někam
 * odloží. Tenhle modul je první polovina náhrady – čistý model složkové
 * databáze, kde jedna zakázka = jeden soubor a vedle nich leží malý
 * rejstřík (_rejstrik.json) se stručnými údaji o všech zakázkách.
 *
 * Proč rejstřík: měření na skutečném Disku Google ukázalo 270–390 ms na
 * jeden soubor. Tabulka zakázek, která by kvůli výpisu otevřela pět set
 * souborů, by se načítala minuty. Rejstřík má pro pět set zakázek 57 kB
 * a přečte se za milisekundu.
 *
 * Do rejstříku se ZÁMĚRNĚ neukládají žádné částky. Cena je výsledek
 * výpočtu nad aktuálním ceníkem; opsaná do rejstříku by se rozešla s
 * kalkulací v okamžiku, kdy se ceník přepočítá, a nikdo by nepoznal,
 * které z těch dvou čísel platí.
 *
 * Tenhle soubor je čistý model: žádné DOM, žádné souborové API, žádné
 * globální stavy aplikace. Práci se skutečnou složkou (výběr složky,
 * zápis, oprávnění) dělá ui/uloziste_ui.js, protože File System Access
 * API existuje jen v prohlížeči a v Node se testovat nedá.
 * ============================================================ */

const ULO_PRIPONA = '.json';
const ULO_REJSTRIK_SOUBOR = '_rejstrik.json';
const ULO_SCHEMA = 1;

/* ---------- drobné pomůcky ------------------------------------------- */

/* Normalizace pro hledání. Sdílí se se seznamem variant (seznam.js), aby
 * „Novák" a „novak" znamenaly totéž; v Node testech bez seznam.js se
 * použije shodná záložní implementace. */
function uloNorm(s) {
  if (typeof seznamNorm === 'function') return seznamNorm(s);
  return String(s == null ? '' : s)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().trim();
}

function uloSlova(dotaz) {
  if (typeof seznamSlova === 'function') return seznamSlova(dotaz);
  return uloNorm(dotaz).split(/\s+/).filter(Boolean);
}

/* Číslo zakázky je „vyplněné" jen tehdy, když k předloze někdo doplnil
 * pořadové číslo – jinak by všechny nové zakázky mířily na jeden soubor. */
function uloCisloVyplneno(cislo) {
  if (typeof hlavickaVyplneno === 'function') return hlavickaVyplneno(cislo);
  const s = String(cislo == null ? '' : cislo).trim();
  const predloha = (typeof ZAK_CISLO_PREDLOHA === 'string') ? ZAK_CISLO_PREDLOHA.trim() : '';
  return s !== '' && s !== predloha;
}

/* Jméno souboru musí projít Windows, Diskem Google i URL, takže se drží
 * jen písmen bez diakritiky, číslic, tečky, pomlčky a podtržítka.
 * Tečka zůstává schválně: číslo klonované varianty má tvar …-0500.1. */
function uloKlicSouboru(text) {
  return String(text == null ? '' : text)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^[-.]+/, '').replace(/[-.]+$/, '');
}

/* Zakázka bez čísla se ukládat musí (rozdělaná práce je taky práce), ale
 * nesmí přebít cizí soubor – proto do jména jde datum a id první varianty,
 * které je v rámci aplikace jedinečné. Po doplnění čísla se zakázka uloží
 * pod správným jménem a starý soubor se nabídne ke smazání.
 *
 * Od 4. 8. 2026 se sahá i po čísle nabídky PROJ: zakázka vedená jen jako
 * projekce (hlavička OCK zůstala prázdná) by jinak skončila jako
 * „bez-cisla-…" a v rejstříku by ji nikdo nenašel. Hlavičky zůstávají dvě
 * nezávislé sady – tohle je jen pořadí, ve kterém se hledá jméno souboru. */
function uloJmenoSouboru(zak) {
  const p = (zak && zak.projHlavicka) || {};
  let zaklad = uloCisloVyplneno(zak && zak.cislo) ? uloKlicSouboru(zak.cislo)
    : (uloCisloVyplneno(p.cislo) ? uloKlicSouboru(p.cislo) : '');
  if (!zaklad) {
    const v = ((zak && zak.varianty) || [])[0];
    const datum = uloKlicSouboru((zak && zak.datum) || '') || 'bez-data';
    zaklad = 'bez-cisla-' + datum + (v && v.id ? '-' + uloKlicSouboru(v.id) : '');
  }
  return zaklad + ULO_PRIPONA;
}

/* Do složky přibývají i soubory, které aplikace nezaložila. Disk Google
 * při souběžné úpravě ze dvou počítačů uloží druhou verzi vedle jako
 * „… (konfliktní kopie …).json" a synchronizace umí nechat dočasné
 * soubory. Nic z toho není zakázka a rejstřík to nesmí spolknout.
 * Filtr je proto přísný: jen znaky, které sama aplikace do jména dává. */
function uloJeZakazkovySoubor(jmeno) {
  const j = String(jmeno == null ? '' : jmeno);
  if (!/\.json$/i.test(j)) return false;
  const zaklad = j.slice(0, -ULO_PRIPONA.length);
  if (!zaklad) return false;
  if (zaklad.charAt(0) === '_' || zaklad.charAt(0) === '.') return false;   // _rejstrik.json a skryté
  return /^[A-Za-z0-9._-]+$/.test(zaklad);
}

/* ---------- kdy zakázka smí do databáze ------------------------------ */

/* Zadání 4. 8. 2026: „Každá nová zakázka by se měla automaticky ukládat do
 * databáze. Pro potřeby tohoto kroku budeme vždy zakázku ukládat po vyplnění
 * hlavičky. Systém musí uživatele informovat, že je třeba hlavičku vyplnit
 * a zakázku uložit."
 *
 * Do 4. 8. rozhodovaly o samočinném ukládání dvě podmínky roztroušené v UI
 * (ONLINE_STAV.soubor / ULO_STAV.soubor). Obě znamenaly „už jsme jednou
 * uložili ručně", takže nová zakázka se sama neuložila nikdy – a uživatel
 * si toho neměl jak všimnout. Rozhodnutí proto bydlí tady, v modelu:
 * jedno místo, testovatelné bez prohlížeče, společné pro online i složku.
 *
 * Minimum je číslo nabídky a název akce. Objednatel ani adresa v seznamu
 * chybět můžou (rozdělaná poptávka je taky práce), ale bez čísla by soubor
 * neměl jméno a bez názvu akce by se v rejstříku nedal poznat. */
const ULO_HLAVICKA_POLE = [
  { klic: 'cislo', popis: 'Číslo nabídky (CN)' },
  { klic: 'nazevAkce', popis: 'Název akce' },
];

/* kde: 'ock' (výchozí) | 'proj' – hlavičky jsou dvě nezávislé sady. */
function uloHlavickaChybi(zak, kde) {
  const h = (kde === 'proj') ? ((zak && zak.projHlavicka) || {}) : (zak || {});
  return ULO_HLAVICKA_POLE.filter(p => !uloCisloVyplneno(h[p.klic])).map(p => p.popis);
}

/* Do databáze stačí jedna vyplněná hlavička: obchodník začíná jednou
 * z kalkulací a druhou třeba nikdy neotevře. */
function uloHlavickaVyplnena(zak) {
  return uloHlavickaChybi(zak, 'ock').length === 0 || uloHlavickaChybi(zak, 'proj').length === 0;
}

/* BEZ ČÍSLA NABÍDKY SE NEUKLÁDÁ (P5 / K15-N69, 25. 9. 2026).
 *
 * Jméno souboru v databázi se skládá z čísla nabídky (`uloJmenoSouboru`).
 * Zakázka bez čísla proto skončila jako „bez-cisla-<datum>-<id>.json" —
 * záznam, který v seznamu nikdo nenajde a který po doplnění čísla zůstane
 * ležet jako sirotek vedle správného souboru. Tudy vedly dvě cesty:
 * ruční uložení mimo tlačítko v liště (karta Databáze, dialog „Otevřít
 * jinou zakázku → Uložit změny") a autosave uložené zakázky, které někdo
 * číslo vymazal — ten nepsal do jejího souboru, ale založil nový.
 *
 * Stačí číslo z jedné z hlaviček (stejné pořadí jako `uloJmenoSouboru`). */
function uloMaCislo(zak) {
  return uloCisloVyplneno(zak && zak.cislo)
    || uloCisloVyplneno(((zak && zak.projHlavicka) || {}).cislo);
}

/* Čas posledního uložení jako „HH:MM". Nečitelný nebo chybějící čas vrací
 * prázdno — v liště je lepší čas neuvést než uvést vymyšlený; obchodník se
 * podle něj rozhoduje, jestli může zavřít notebook. */
function uloCasHhMm(kdy) {
  if (kdy == null || kdy === '') return '';
  const d = (kdy instanceof Date) ? kdy : new Date(kdy);
  if (isNaN(d.getTime())) return '';
  const dv = n => (n < 10 ? '0' : '') + n;
  return dv(d.getHours()) + ':' + dv(d.getMinutes());
}

/* Vstup: { zakazka, ulozeno (jméno souboru v databázi, '' = ještě nikdy),
 *          zmeneno (čeká neuložená změna), prihlasen, dostupne,
 *          kdy (čas posledního úspěšného uložení; smí chybět) }
 * Výstup: { stav, text, muzeSam, chybi, cas }
 *
 * `muzeSam` je jediné svolení k samočinnému zápisu. `blokuje` se úmyslně
 * nevrací – KONTROLY_UROVEN = 2 znamená informovat, ne zavírat cestu
 * (jediná zábrana v aplikaci je ukázkový ceník v dokumentech). */
function uloUlozeniStav(vstup) {
  const v = vstup || {};
  const zak = v.zakazka || null;
  const ulozeno = String(v.ulozeno || '');
  const chybi = uloHlavickaChybi(zak, 'ock');
  const chybiProj = uloHlavickaChybi(zak, 'proj');
  const vyplneno = chybi.length === 0 || chybiProj.length === 0;
  const nejmensi = chybi.length <= chybiProj.length ? chybi : chybiProj;
  const cas = uloCasHhMm(v.kdy);

  if (!v.dostupne)
    return { stav: 'nedostupne', muzeSam: false, chybi: nejmensi, cas,
      text: 'Zakázka není v databázi – aplikace neběží proti serveru. '
        + 'Uložte ji do souboru, ať o práci nepřijdete.' };
  if (!v.prihlasen)
    return { stav: 'neprihlasen', muzeSam: false, chybi: nejmensi, cas,
      text: 'Zakázka se do databáze neukládá – nejste přihlášeni. Přihlaste se v Nastavení → Databáze.' };
  if (ulozeno && !v.zmeneno)
    return { stav: 'ulozeno', muzeSam: true, chybi: nejmensi, cas,
      text: 'Uloženo v databázi jako ' + ulozeno + (cas ? ' v ' + cas : '') + '.' };
  /* Uložená zakázka s vymazaným číslem (P5 / K15-N69): změny by nešly do
   * jejího souboru, ale do nového „bez-cisla-…" — proto se nečeká, že se
   * uloží samy, a řekne se, co chybí. */
  if (ulozeno && !uloMaCislo(zak))
    return { stav: 'vyplnit', muzeSam: false, chybi: ['Číslo nabídky (CN)'], cas,
      text: 'Zakázka nemá číslo nabídky, takže se změny neukládají (bez čísla by vznikl záznam, '
        + 'který v seznamu nejde najít). Vyplňte číslo v hlavičce.' };
  if (ulozeno)
    return { stav: 'ceka', muzeSam: true, chybi: nejmensi, cas,
      text: 'Změny se za chvíli uloží samy do databáze (' + ulozeno + ')'
        + (cas ? '; naposledy uloženo v ' + cas : '') + '.' };
  if (!vyplneno)
    return { stav: 'vyplnit', muzeSam: false, chybi: nejmensi, cas,
      text: 'Zakázka ještě není v databázi. Vyplňte v hlavičce: ' + nejmensi.join(', ')
        + ' – pak zakázku uložte (dál už se ukládá sama).' };
  return { stav: 'ulozit', muzeSam: true, chybi: nejmensi, cas,
    text: 'Zakázka ještě není v databázi – uložte ji. Dál se bude ukládat sama po každé změně.' };
}

/* ---------- záloha rozpracované práce v prohlížeči -------------------- */

/* Prohlížeč si po každé změně odkládá stav zakázky do svého úložiště (třetí
 * pojistka vedle databáze a souboru – viz ui/historie.js). Při startu se pak
 * ukazovala lišta „V prohlížeči je rozpracovaná kalkulace… Chcete ji obnovit?".
 *
 * Problém, který uživatel nahlásil 4. 8. 2026: ta lišta se hlásila POKAŽDÉ.
 * Stačilo, aby v úložišti něco leželo – klidně týden stará zkušební zakázka,
 * kterou si nikdo nepamatuje – a aplikace při každém spuštění chtěla
 * rozhodnout „obnovit / zahodit / teď ne". Pojistka proti ztrátě práce se tím
 * změnila v otravný rituál, který se překlikává bez čtení; a přesně takový
 * rituál pak jednou přepíše skutečnou práci.
 *
 * Ptát se má smysl jen tehdy, když je co obnovovat a člověk se k tomu ještě
 * nevyjádřil. Rozhodnutí je tady v modelu (ne v UI), aby se dalo otestovat
 * bez prohlížeče a aby platilo stejně pro OCK i PROJ.
 *
 * Vstup:  zaznam = { kdy, cislo, nazevAkce, zakazka } z úložiště prohlížeče
 *         ctx    = { ted, otevrena (JSON právě otevřené zakázky), odlozeno
 *                    (razítko zálohy, kterou už uživatel odložil) }
 * Výstup: { nabidnout, smazat, duvod }
 *
 * `smazat` je úklid, ne mazání práce: týká se jen záloh, které se stejně
 * nedají nabídnout (prázdná, bez hlavičky, starší než týden). Zálohu, o které
 * má smysl se ptát, nesmaže nikdy nic než uživatel – nebo úspěšný zápis do
 * databáze, po kterém je táž práce na serveru. */
const ULO_ZALOHA_STARI_DNI = 7;

/* Vrací stáří ve dnech, nebo null, když se čas nedá přečíst. Nečitelný čas
 * není důvod zálohu zahodit – radši se zeptáme, než abychom mazali. */
function uloZalohaStariDni(kdy, ted) {
  const t = Date.parse(kdy || '');
  if (!kdy || Number.isNaN(t)) return null;
  const ted2 = Date.parse(ted || '') || Date.now();
  return (ted2 - t) / 86400000;
}

function uloZalohaRozhodni(zaznam, ctx) {
  const c = ctx || {};
  const z = zaznam || null;
  if (!z || !z.zakazka)
    return { nabidnout: false, smazat: !!z, duvod: 'prázdná záloha' };

  /* Bez čísla nabídky i bez názvu akce se v liště nedá napsat, CO se má
   * obnovit („bez názvu“) – a od zadání ze 4. 8. 2026 se každá zakázka
   * zakládá vyplněnou hlavičkou. Takový záznam je zbytek starého provozu. */
  if (!uloCisloVyplneno(z.cislo) && !uloCisloVyplneno(z.nazevAkce))
    return { nabidnout: false, smazat: true, duvod: 'záloha bez čísla i názvu akce' };

  const stari = uloZalohaStariDni(z.kdy, c.ted);
  if (stari !== null && stari > ULO_ZALOHA_STARI_DNI)
    return { nabidnout: false, smazat: true,
             duvod: 'záloha je starší než ' + ULO_ZALOHA_STARI_DNI + ' dní' };

  /* Totéž, co je právě na obrazovce – obnovovat by nebylo co. */
  if (c.otevrena && c.otevrena === z.zakazka)
    return { nabidnout: false, smazat: false, duvod: 'shodná s otevřenou zakázkou' };

  /* „Teď ne" platí, dokud se záloha nezmění. Jakmile v ní přibude nová práce,
   * změní se razítko a aplikace se zeptá znovu – to už je jiná nabídka. */
  if (c.odlozeno && c.odlozeno === String(z.kdy || ''))
    return { nabidnout: false, smazat: false, duvod: 'uživatel ji už odložil' };

  return { nabidnout: true, smazat: false, duvod: 'rozpracovaná práce k obnovení' };
}

/* Zadání 19. 8. 2026: po obnovení stránky se online přihlášení a načtení
 * ceníku tiše dotknou čerstvě založené PRÁZDNÉ zakázky – autosave by tou
 * prázdnou zakázkou přepsal zálohu s rozpracovanou prací dřív, než uživatel
 * stihne v liště kliknout „Obnovit rozpracovanou kalkulaci". Pravidlo:
 * zakázka bez čísla nabídky i bez názvu akce nesmí přepsat zálohu, která
 * obsah má. Jakmile uživatel cokoli z toho vyplní, píše se normálně –
 * to už je vědomá nová práce, ne cizí start aplikace. */
function uloZalohaSmiPrepsat(stavajici, ctx) {
  const c = ctx || {};
  const novaPrazdna = !uloCisloVyplneno(c.cislo) && !uloCisloVyplneno(c.nazevAkce);
  if (!novaPrazdna) return true;
  const s = stavajici || null;
  const stavajiciMaObsah = !!(s && s.zakazka
    && (uloCisloVyplneno(s.cislo) || uloCisloVyplneno(s.nazevAkce)));
  return !stavajiciMaObsah;
}

/* ---------- razítko posledního zápisu -------------------------------- */

/* Každý zápis do složky si do zakázky poznamená čas. Podle něj se pozná,
 * že soubor mezitím přepsal někdo jiný (nebo jiné okno téhle aplikace). */
function uloRazitkoNove(kdy) {
  return String(kdy || new Date().toISOString());
}

function uloRazitko(zak) {
  const r = zak && zak.uloRazitko;
  return (typeof r === 'string') ? r : '';
}

/* Kolize = na disku leží něco jiného, než z čeho jsme vyšli.
 * Prázdné očekávané razítko znamená „tuhle zakázku jsme odsud nenačetli",
 * což je taky důvod se zeptat – pod stejným jménem může být cizí práce. */
function uloKolize(naDisku, ocekavaneRazitko) {
  if (!naDisku) return { kolize: false, naDisku: '' };
  const disk = uloRazitko(naDisku);
  const ock = (typeof ocekavaneRazitko === 'string') ? ocekavaneRazitko : '';
  return { kolize: !ock || disk !== ock, naDisku: disk };
}

/* ---------- rejstřík -------------------------------------------------- */

function uloRejstrikZaznam(zak, opts) {
  opts = opts || {};
  const varianty = (zak && zak.varianty) || [];
  const zamcena = v => (typeof variantaUzamcena === 'function')
    ? variantaUzamcena(v) : !!(v && v.zamek && v.zamek.zamceno);
  let upraveno = String(opts.razitko || uloRazitko(zak) || '');
  if (!upraveno)
    varianty.forEach(v => {
      if (v && typeof v.upraveno === 'string' && v.upraveno > upraveno) upraveno = v.upraveno;
    });
  return {
    soubor: String(opts.soubor || uloJmenoSouboru(zak)),
    /* Autor (11. 8. 2026) — v rejstříku proto, aby šlo vypsat „zakázky po
     * kolegovi" bez čtení všech souborů zvlášť. Prázdno u starších zakázek
     * je v pořádku: znamená to jen „vzniklo dřív, než se autor zapisoval". */
    autor: String((zak && zak.autor) || ''),
    /* Jméno obchodníka (21. 8. 2026, zadání J. V.: „přidej do seznamu zakázek
     * i jméno obchodníka"). V rejstříku, ne dohledávané z účtů: seznam se
     * musí vypsat jedním čtením a jméno je jediné, co z účtu potřebuje.
     * Prázdno u starších zakázek je v pořádku — seznam pak ukáže e-mail. */
    autorJmeno: String((zak && zak.autorJmeno) || ''),
    cislo: uloCisloVyplneno(zak && zak.cislo) ? String(zak.cislo).trim() : '',
    nazevAkce: String((zak && zak.nazevAkce) || ''),
    objednatel: String((zak && zak.objednatel) || ''),
    datum: String((zak && zak.datum) || ''),
    /* Druh zakázky pro filtr OCK × PROJ v přehledu nabídek. */
    jenProj: !!(zak && zak.jenProj),
    /* Řada ceníku řídící varianty (#181, 31. 8. 2026): v přehledu se ukáže
     * štítkem, aby šly zahraniční zakázky poznat i vypsat zvlášť. Tuzemská
     * se nezapisuje — je výchozí a starší rejstříky ji nemají. */
    rada: (() => {
      const rid = (typeof ridiciVarianta === 'function') ? ridiciVarianta(zak) : (varianty[0] || null);
      const r = (typeof cenikRadaVarianty === 'function' && rid) ? cenikRadaVarianty(rid.data) : 'cr';
      return r === 'zahr' ? 'zahr' : '';
    })(),
    variant: varianty.length,
    odeslane: varianty.filter(zamcena).length,
    upraveno,
  };
}

/* Rejstřík je soubor na sdíleném disku – může být poškozený, prázdný,
 * ručně upravený nebo v tvaru z jiné verze. Nikde jinde se proto nesmí
 * předpokládat, že má správný tvar; všechno prochází tudy. */
function uloRejstrikNormalizuj(x) {
  let pole = x;
  if (pole && !Array.isArray(pole) && Array.isArray(pole.zakazky)) pole = pole.zakazky;
  if (!Array.isArray(pole)) return [];
  const cislo = (h) => (typeof h === 'number' && isFinite(h)) ? Math.max(0, Math.floor(h)) : 0;
  return pole
    .filter(z => z && typeof z === 'object' && typeof z.soubor === 'string' && z.soubor)
    .map(z => ({
      soubor: z.soubor,
      autor: String(z.autor || ''),
      autorJmeno: String(z.autorJmeno || ''),
      cislo: String(z.cislo || ''),
      nazevAkce: String(z.nazevAkce || ''),
      objednatel: String(z.objednatel || ''),
      datum: String(z.datum || ''),
      jenProj: !!z.jenProj,
      rada: z.rada === 'zahr' ? 'zahr' : '',      // #181: řada ceníku, prázdno = tuzemsko
      variant: cislo(z.variant),
      odeslane: cislo(z.odeslane),
      upraveno: String(z.upraveno || ''),
    }));
}

/* Druh zakázky pro vyhledávání v přehledu nabídek (21. 8. 2026).
 * Pořadí je záměrné: příznak „jen projekce" je pravda ze zakázky, číslo je
 * jen vodítko pro starší záznamy, které příznak v rejstříku ještě nemají
 * (projekční nabídky nesou v čísle OVP, konstrukční OPR). Když nesedí ani
 * jedno, je to zakázka s ocelovou konstrukcí — tak jich je většina. */
function uloDruhZakazky(z) {
  if (z && z.jenProj) return 'PROJ';
  if (/ovp/i.test(String((z && z.cislo) || ''))) return 'PROJ';
  return 'OCK';
}

/* Jméno obchodníka do seznamu: jméno, jinak e-mail, jinak pomlčka. */
function uloObchodnik(z) {
  const j = String((z && z.autorJmeno) || '').trim();
  if (j) return j;
  const e = String((z && z.autor) || '').trim();
  return e || '—';
}

function uloRejstrikSloucit(rejstrik, zaznam) {
  const pole = uloRejstrikNormalizuj(rejstrik);
  const norm = uloRejstrikNormalizuj([zaznam])[0];
  if (!norm) return pole;
  const i = pole.findIndex(z => z.soubor === norm.soubor);
  if (i >= 0) pole[i] = norm; else pole.push(norm);
  return pole;
}

function uloRejstrikOdeber(rejstrik, soubor) {
  return uloRejstrikNormalizuj(rejstrik).filter(z => z.soubor !== String(soubor));
}

/* Nejnovější nahoře – po otevření složky chce člověk nejčastěji to,
 * na čem dělal naposledy. */
function uloRejstrikSerad(rejstrik) {
  return uloRejstrikNormalizuj(rejstrik).sort((a, b) => {
    const ka = a.upraveno || a.datum, kb = b.upraveno || b.datum;
    if (ka !== kb) return ka < kb ? 1 : -1;
    return uloNorm(a.cislo) < uloNorm(b.cislo) ? 1 : -1;
  });
}

function uloHledej(rejstrik, dotaz) {
  const pole = uloRejstrikNormalizuj(rejstrik);
  const slova = uloSlova(dotaz);
  if (!slova.length) return pole;
  return pole.filter(z => {
    /* Hledá se i ve jménu obchodníka (21. 8. 2026) — v seznamu je jeho
     * sloupec, takže se podle něj lidé přirozeně ptají. */
    const text = uloNorm([z.cislo, z.nazevAkce, z.objednatel, z.datum, z.soubor,
      z.autorJmeno, z.autor].join(' '));
    return slova.every(s => text.includes(s));
  });
}

/* ---------- pojistka na uzamčené varianty (#34) ----------------------- */

/* Vytištěná nabídka je odeslaná a nesmí se změnit. Automatické ukládání
 * do složky je ale zápis bez zeptání, takže potřebuje pojistku: než se
 * soubor přepíše, porovná se to, co v něm je, s tím, co se chystá ven.
 * Uzamčená varianta, která by přišla o zámek, zmizela nebo se jí změnil
 * otisk odeslaných částek, zápis zastaví a rozsvítí varování (Ad2 –
 * nikde se nic tvrdě neblokuje, ale tenhle zápis se neprovede sám). */
const ULO_PROBLEMY = {
  chybi:    'uzamčená varianta v ukládané zakázce chybí',
  odemcena: 'varianta byla uzamčená, teď zamčená není',
  zmenena:  'zámek uzamčené varianty se liší (jiné datum, číslo nebo částky)',
};

function uloZamekKlic(v) {
  const z = v && v.zamek;
  if (!z || !z.zamceno) return '';
  /* ZMRAZENÝ VÝSLEDEK PATŘÍ DO OTISKU ZÁMKU (nález B53, audit 22. 9. 2026).
   *
   * Od 15. 9. 2026 si zámek vedle souhrnného `otisk` ukládá CELÝ výsledek
   * výpočtu (`zamek.vysledek`) a všechny dokumenty i přehledy berou čísla
   * odtud — `vypocetZ()` a `vypocetProjZ()` vracejí zmrazená data, pokud
   * existují. Do klíče se ale `vysledek` nepočítal.
   *
   * Dvě varianty lišící se POUZE ve `vysledek` tedy měly shodný klíč,
   * `uloKontrolaZamku()` vrátila ok a serverová pojistka v zakazky.mjs
   * porovnávala jen `data` — ta jsou shodná. Kdo si stáhl vlastní zakázku
   * z GET /api/zakazky, přepsal v JSONu `varianty[i].zamek.vysledek.ock`
   * a poslal ji zpět, změnil částky UŽ ODESLANÉ nabídky. Tisk téže
   * „neměnné" nabídky, krycí list i přehled pak ukazovaly jiné peníze, než
   * jaké dostal zákazník — a bez jediné stopy, protože `tisky[]` ani
   * `odemceni[]` nepřibyly.
   *
   * Změřeno před opravou: cena v zámku 912 000 → 1, klíč SHODNÝ,
   * `uloKontrolaZamku` ok, `data` shodná.
   *
   * DO KLÍČE JDE CELÝ VÝSLEDEK, NE JEHO OTISK. První verze téhle opravy
   * vkládala krátký otisk (FNV-1a, 32 bitů), aby se nepracovalo s 25 kB
   * na variantu. Jenže FNV není kryptografická funkce a její kód je
   * v každé vydané stránce: kdo chce částky přepsat, dopočítá si k nim
   * výplň se shodným otiskem. U bezpečnostní kontroly je to málo. Přesné
   * porovnání žádnou takovou skulinu nemá a je to totéž, čím se o řádek
   * vedle porovnávají `data` uzamčené varianty (zakazky.mjs).
   *
   * Cena za to je snesitelná: klíč se skládá jen při ULOŽENÍ (server
   * zakazky.mjs a obnova.mjs, v prohlížeči uloziste_ui.js), ne při
   * vykreslování, a celá zakázka se u téhož uložení stejně serializuje.
   *
   * Starší zámky bez `vysledek` to nerozbije — klíč se skládá čerstvě pro
   * obě strany porovnání, takže `null` proti `null` sedí. */
  /* `cisloPapir` (#320): značka, že `cislo` je číslo z papíru. V klíči je,
   * aby ji klient nemohl sundat a tím serveru přepnout hlídání čísla
   * odeslané nabídky na mírnější (u starých zámků jen základ, B56). */
  return JSON.stringify({ kdy: z.kdy || '', typ: z.typ || '', cislo: z.cislo || '',
                          otisk: z.otisk || null, cisloPapir: !!z.cisloPapir,
                          vysledek: z.vysledek || null });
}

/* RAZÍTKA EXISTUJÍCÍHO ZÁMKU DRŽÍ SERVER (23. 9. 2026, nález B62).
 *
 * Klíč zámku (uloZamekKlic) hlídá čísla a data. Pole MIMO klíč — kdo
 * nabídku odeslal, popis dokumentu, šablona, historie tisků `tisky[]`
 * a starší záznamy o odemčení `odemceni[]` — ale mohl u uloženého zámku
 * přepsat kterýkoli přihlášený: zakázky nemají vlastníka a server
 * porovnával jen `data`. Razítko „kdo odeslal" tak nebylo nezměnitelné.
 *
 * Teď: u varianty, která už na serveru byla zamčená a zamčená zůstává,
 * se `kdo`, `popis` a `sablona` vezmou z uložené verze a z `tisky[]`
 * i `odemceni[]` platí uložený ZAČÁTEK — přidávat se smí, přepsat ani ubrat
 * ne. Neodmítá se: poctivý klient tahle pole nemění, takže oprava potká jen
 * podvržený požadavek, a ten dostane zpátky pravdu. Vrací počet oprav. */
function uloZamekRazitkaDrz(naDisku, kUlozeni) {
  let oprav = 0;
  const nove = (kUlozeni && kUlozeni.varianty) || [];
  const stejne = (a, b) => JSON.stringify(a === undefined ? null : a) === JSON.stringify(b === undefined ? null : b);
  const zacatek = (stare, nove) => {
    const s = Array.isArray(stare) ? stare : [];
    const n = Array.isArray(nove) ? nove : [];
    const out = s.map(x => JSON.parse(JSON.stringify(x))).concat(n.slice(s.length));
    return { out, zmena: !stejne(out, n) };
  };
  ((naDisku && naDisku.varianty) || []).forEach(sv => {
    const nv = nove.find(v => v && v.id === sv.id);
    if (!nv) return;
    if (Array.isArray(sv.odemceni) && sv.odemceni.length) {
      const r = zacatek(sv.odemceni, nv.odemceni);
      if (r.zmena) { nv.odemceni = r.out; oprav++; }
    }
    const sz = sv.zamek, nz = nv.zamek;
    if (!(sz && sz.zamceno && nz && nz.zamceno)) return;
    ['kdo', 'popis', 'sablona'].forEach(k => {
      if (!stejne(sz[k], nz[k])) {
        if (sz[k] === undefined) delete nz[k]; else nz[k] = JSON.parse(JSON.stringify(sz[k]));
        oprav++;
      }
    });
    if (Array.isArray(sz.tisky) && sz.tisky.length) {
      const r = zacatek(sz.tisky, nz.tisky);
      if (r.zmena) { nz.tisky = r.out; oprav++; }
    }
  });
  return oprav;
}

function uloPocetOdemceni(v) {
  return (v && Array.isArray(v.odemceni)) ? v.odemceni.length : 0;
}

function uloKontrolaZamku(naDisku, kUlozeni) {
  const problemy = [];
  const nove = (kUlozeni && kUlozeni.varianty) || [];
  ((naDisku && naDisku.varianty) || []).forEach(sv => {
    const klicDisk = uloZamekKlic(sv);
    if (!klicDisk) return;                       // nezamčená varianta se přepsat smí
    const cislo = (typeof variantaCislo === 'function')
      ? variantaCislo(naDisku, sv) : String((naDisku && naDisku.cislo) || '');
    const nv = nove.find(v => v && v.id === sv.id);
    if (!nv) { problemy.push({ id: sv.id, cislo, duvod: 'chybi' }); return; }
    const klicNovy = uloZamekKlic(nv);
    if (!klicNovy) {
      // Řádné odemčení správcem se zapisuje do odemceni[] – to není ztráta
      // zámku, ale doložený krok, a přepsat soubor se v tom případě smí.
      if (uloPocetOdemceni(nv) > uloPocetOdemceni(sv)) return;
      problemy.push({ id: sv.id, cislo, duvod: 'odemcena' }); return;
    }
    if (klicNovy !== klicDisk) problemy.push({ id: sv.id, cislo, duvod: 'zmenena' });
  });
  return { ok: problemy.length === 0, problemy };
}

function uloProblemPopis(p) {
  const t = ULO_PROBLEMY[p && p.duvod] || 'neznámý rozdíl';
  return (p && p.cislo) ? t + ' (' + p.cislo + ')' : t;
}

/* ---------- kdo odemkl (bezpečnostní audit 22. 8. 2026, nález B3) --------
 *
 * uloKontrolaZamku přijímá zmizení zámku, když v nové variantě přibyl záznam
 * v `odemceni[]` — to je správně, řádné odemčení správcem je doložený krok.
 * Jenže KDO ten krok udělal, hlídal do 22. 8. jen prohlížeč (odemkniVariantu
 * s `jeAdmin`). Upravený klient obchodníka poslal `zamek: null` + jeden
 * záznam navíc a server to vzal. Tahle funkce vrátí varianty, u kterých
 * se počet odemčení zvedl; server pak u nich vyžaduje roli administrátora
 * a razítko `kdo`/`kdy` doplní sám z relace, ne z toho, co přišlo. */
function uloOdemceniPribylo(naDisku, kUlozeni) {
  const nove = (kUlozeni && kUlozeni.varianty) || [];
  const stare = (naDisku && naDisku.varianty) || [];
  return nove.filter(nv => {
    if (!nv) return false;
    const sv = stare.find(v => v && v.id === nv.id);
    return uloPocetOdemceni(nv) > uloPocetOdemceni(sv);
  });
}

/* ---------- tvar identifikátorů (bezpečnostní audit 22. 8. 2026, B1) ------
 *
 * Identifikátory variant, poznámek a příloh vyrábí aplikace (v<čas><pořadí>,
 * pz…, pr…) a jsou to jediné hodnoty ze zakázky, které se v obrazovce
 * vkládají přímo do `onclick="…('${id}')"`. Server je do 22. 8. přebíral,
 * jak přišly — upravený klient tak mohl do id schovat skript, který by se
 * spustil tomu, kdo zakázku otevře (administrátor: klik na „nastavit jako
 * řídící"). Obrazovka od té doby escapuje, a server navíc nebezpečný tvar
 * odmítne: písmena, číslice, tečka, podtržítko, pomlčka, nejvýš 80 znaků.
 * Starší uložené zakázky mají id právě v tomhle tvaru, nic se nemigruje. */
const ULO_ID_TVAR = /^[A-Za-z0-9._-]{1,80}$/;
function uloIdBezpecne(id) { return ULO_ID_TVAR.test(String(id == null ? '' : id)); }

/* Trvalé položky ceníku (bezpečnostní audit 9. 9. 2026, nález B26).
 *
 * `kid` katalogové položky (OCK: k…, PROJ: pk…) cestuje UVNITŘ uložené
 * zakázky — ceník PROJ i vlastní položky OCK jsou součástí varianty — a
 * administrátor ho v obrazovce Ceník vkládá do onclick tlačítka ✕. Do 9. 9.
 * ho server nekontroloval vůbec: obchodník mohl do zakázky uložit položku
 * s `kid` „x');fetch(…)//", administrátor by na ni klikl a skript by běžel
 * pod jeho relací; „Zveřejnit ceník" by ho pak propsal všem. Kontroluje se
 * proto na všech místech, kde kid v zakázce leží (vlastní položky obou
 * částí, položky sekcí projekce, seznamy odebraných). Prázdný kid je
 * v pořádku — ruční položka bez vazby na katalog ho nemá. */
function uloKidSeznam(mapa, kde, out) {
  if (!mapa || typeof mapa !== 'object') return;
  Object.keys(mapa).forEach(sek => {
    const arr = mapa[sek];
    if (!Array.isArray(arr)) return;
    arr.forEach(p => {
      if (p && p.kid != null && p.kid !== '' && !uloIdBezpecne(p.kid)) out.push({ kde: kde + ' (kid)', id: p.kid });
    });
  });
}
/* Ploché pole položek s `kid` (nález B51, 14. 9. 2026).
 *
 * `uloKidSeznam` čeká MAPU sekce → pole, protože tak jsou uložené trvalé
 * položky kalkulace. Vlastní příplatky ale žádné sekce nemají — je to jedno
 * ploché pole. Vlastní funkce je poctivější než ohýbat tu první: kdyby
 * `uloKidSeznam` brala obojí, prošla by jí i mapa, kterou někdo omylem
 * uložil jako pole, a nikdo by se to nedozvěděl. */
function uloKidPole(arr, kde, out) {
  (Array.isArray(arr) ? arr : []).forEach(p => {
    if (p && p.kid != null && p.kid !== '' && !uloIdBezpecne(p.kid)) out.push({ kde: kde + ' (kid)', id: p.kid });
  });
}
function uloKidOdebrane(arr, kde, out) {
  (Array.isArray(arr) ? arr : []).forEach(kid => {
    if (kid != null && kid !== '' && !uloIdBezpecne(kid)) out.push({ kde: kde + ' (odebraný kid)', id: kid });
  });
}
function uloKidProblemyVarianty(v, out) {
  const d = v && v.data;
  if (!d || typeof d !== 'object') return;
  const ockZ = d.ock && d.ock.zadani;
  if (ockZ && typeof ockZ === 'object') {
    uloKidSeznam(ockZ.vlastniPolozky, 'trvalá položka OCK', out);
    uloKidOdebrane(ockZ.katalogOdebrane, 'trvalá položka OCK', out);
    /* VLASTNÍ PŘÍPLATKY NESOU `kid` TAKY (nález B51, 14. 9. 2026).
     *
     * Kontrola kryla `vlastniPolozky` (trvalé položky kalkulace), ale
     * `priplatkyVlastni` — vlastní příplatkové řádky, které se tlačítkem 📌
     * ukládají natrvalo do ceníku — ne. Klíč odtamtud přitom putuje do
     * katalogu a do zveřejněného ceníku, takže nepovolený tvar by prošel
     * až tam, kde ho čte celá firma. */
    uloKidPole(ockZ.priplatkyVlastni, 'vlastní příplatek OCK', out);
  }
  const proj = d.proj;
  if (proj && typeof proj === 'object') {
    if (proj.cenik && typeof proj.cenik === 'object') uloKidSeznam(proj.cenik.vlastniPolozky, 'trvalá položka PROJ', out);
    if (proj.zadani && typeof proj.zadani === 'object') {
      uloKidOdebrane(proj.zadani.katalogOdebrane, 'trvalá položka PROJ', out);
      (Array.isArray(proj.zadani.sekce) ? proj.zadani.sekce : []).forEach(s => {
        /* DÉLKA NÁZVU SEKCE PROJ (nález B45, 14. 9. 2026).
         *
         * Escapování v `dvKrok()` je hlavní obrana, tohle je druhá vrstva:
         * název sekce jde z dat varianty rovnou do nadpisu Detailu výpočtu
         * a do dokumentů. Omezuje se JEN délka, ne znaky — obchodník si
         * sekci smí pojmenovat česky a s interpunkcí. Dvě stě znaků je
         * nadpis, víc už je pokus něco propašovat. */
        if (s && typeof s.nazev === 'string' && s.nazev.length > 200)
          out.push({ kde: 'název sekce PROJ', id: s.nazev.slice(0, 40) + '…', duvod: 'delka' });
        (s && Array.isArray(s.polozky) ? s.polozky : []).forEach(p => {
          if (p && p.kid != null && p.kid !== '' && !uloIdBezpecne(p.kid)) out.push({ kde: 'položka sekce PROJ (kid)', id: p.kid });
        });
      });
    }
  }
}
/* Totéž pro to, co jde do platného ceníku programu (/api/program a obnova
 * části `program`): katalog OCK (`polozky.<sekce>[].kid`) a ceník PROJ
 * (`vlastniPolozky.<sekce>[].kid`). Zveřejněný ceník se propíše do každé
 * nové nabídky — tudy by se podvržený kid dostal ke všem. */
function uloKidProblemyProgramu(cenikProj, katalog) {
  const out = [];
  if (cenikProj && typeof cenikProj === 'object') uloKidSeznam(cenikProj.vlastniPolozky, 'ceník PROJ', out);
  if (katalog && typeof katalog === 'object') uloKidSeznam(katalog.polozky, 'katalog OCK', out);
  return out;
}

/* Duplicitní id (bezpečnostní audit 9. 9. 2026, nález B29). Kontroly zámku
 * párují varianty přes `varianty.find(v => v.id === sv.id)` — první shoda.
 * Kopie uzamčené varianty se stejným id, jinými daty a cizím `zamek.kdo`
 * do 9. 9. prošla: rejstřík pak hlásil dvě odeslané a každé další uložení
 * končilo 409, protože se k uzamčené variantě „ztratil" pár. Jedinečnost
 * se hlídá u variant, poznámek i příloh; server odmítá 400. */
function uloDuplicity(arr, kde, out) {
  const videno = new Set();
  (Array.isArray(arr) ? arr : []).forEach(x => {
    if (!x || x.id == null) return;
    const id = String(x.id);
    if (videno.has(id)) out.push({ kde, id, duvod: 'duplicita' });
    videno.add(id);
  });
}
/* OBSAH PŘÍLOHY SMÍ BÝT JEN data: ADRESA (nález B82 hloubkového testu
 * 24. 9. 2026). Tlačítko „Stáhnout" dává `p.data` do odkazu a klikne na
 * něj — zakázka s `javascript:…` v příloze tak spustila skript tomu, kdo
 * přílohu stahoval. Přílohy vznikaly jen přes FileReader.readAsDataURL,
 * takže skutečná příloha vždy začíná `data:`. Prázdný obsah se toleruje
 * (starší záznamy bez dat), stažení ho stejně odmítne. */
function uloPrilohaDataBezpecna(data) {
  if (data == null || data === '') return true;
  return typeof data === 'string' && /^data:[\w.+-]*\/?[\w.+-]*(;[\w.+-]+=[^;,]*)*(;base64)?,/i.test(data);
}
function uloIdProblemy(zak) {
  const out = [];
  if (!zak) return out;
  (Array.isArray(zak.varianty) ? zak.varianty : []).forEach(v => {
    if (v && !uloIdBezpecne(v.id)) out.push({ kde: 'varianta', id: v.id });
    uloKidProblemyVarianty(v, out);
  });
  (Array.isArray(zak.poznamky) ? zak.poznamky : []).forEach(p => {
    if (p && !uloIdBezpecne(p.id)) out.push({ kde: 'poznámka', id: p.id });
  });
  (Array.isArray(zak.prilohy) ? zak.prilohy : []).forEach(p => {
    if (p && !uloIdBezpecne(p.id)) out.push({ kde: 'příloha', id: p.id });
    if (p && !uloPrilohaDataBezpecna(p.data)) out.push({ kde: 'příloha', id: p.id, duvod: 'priloha' });
  });
  if (zak.aktivni != null && zak.aktivni !== '' && !uloIdBezpecne(zak.aktivni))
    out.push({ kde: 'aktivní varianta', id: zak.aktivni });
  uloDuplicity(zak.varianty, 'varianta', out);
  uloDuplicity(zak.poznamky, 'poznámka', out);
  uloDuplicity(zak.prilohy, 'příloha', out);
  return out;
}
/* TYPY POLÍ ZAKÁZKY HLÍDÁ SERVER (#340, návrh P1 hloubkového testu
 * 24. 9. 2026). Server do té doby kontroloval jen id, kid, velikost a zámky;
 * čísla a volby zadání i ceníku mohly nést libovolný JSON. Na několika
 * místech se taková hodnota kreslí do HTML (B69, B70) — escapování v UI je
 * první vrstva, tohle je druhá, která kryje celou třídu i u zakázek, které
 * už v databázi leží.
 *
 * Vzorem je výchozí zadání a ceník (DEFAULT_ZADANI, DEFAULT_ZADANI_PROJ,
 * DEFAULT_CENIK, DEFAULT_CENIK_PROJ): kde vzor nese ČÍSLO, smí přijít číslo,
 * prázdno ('' — „prázdno není nula"), null nebo text, který je číslem
 * („12", „3,5"); kde nese PRAVDU/NEPRAVDU, smí přijít boolean, 0/1 nebo
 * prázdno. Volby s pevným výčtem (typ šachty, portál, zasklení, režim
 * opláštění, typ pásu, lakování) musí být z výčtu; dimenze profilu má tvar
 * „80x80". Nic se nepřevádí — hodnota, která nesedí, zakázku zastaví
 * a hláška řekne kde (převod by mlčky měnil data a Model 1 musí zůstat 1:1).
 *
 * Klíče, které vzor nezná, se nekontrolují (ruční přepisy, starší pole).
 * Varianta zamčená už v uložené verzi se přeskakuje: odeslaná nabídka je
 * doklad, její data server nemění ani neposuzuje (hlídá je B53) — a starší
 * zámek může nést tvar dat z doby před změnou vzoru. */
const ULO_CISLO_TEXT = /^\s*-?\d+(?:[.,]\d+)?\s*$/;
const ULO_TOKEN = /^[A-Za-z0-9_.-]{0,80}$/;
const ULO_DIMENZE = /^\d{1,4}(?:[x×]\d{1,4}){1,2}$/;
const ULO_VYCTY = {
  'ock.zadani.typSachty': ['exteriérová', 'interiérová'],
  'ock.zadani.typPortalu': ['zapuštěný', 'předsazený'],
  'ock.zadani.zaskleni': ['na terče', 'mezi příčníky'],
  'ock.zadani.oplasteni.rezim': ['standard', 'poStenach'],
  'cenik.lak.rezim': ['tomas', 'lakovna'],
};
/* Pole, která vzor vede jako '' nebo null, ale jsou to čísla. */
const ULO_CISLA_NAVIC = ['ock.zadani.mustekHloubkaMm', 'ock.zadani.mustekSirkaMm',
                         'ock.zadani.zamecnikAtypKc'];
function uloCisloSedi(h) {
  return h === null || h === undefined || h === ''
    || (typeof h === 'number' && isFinite(h))
    || (typeof h === 'string' && ULO_CISLO_TEXT.test(h));
}
function uloPravdaSedi(h) {
  return h === null || h === undefined || h === '' || typeof h === 'boolean' || h === 0 || h === 1;
}
function uloTypyStrom(vzor, h, cesta, out) {
  if (h === null || h === undefined) return;
  if (typeof h !== 'object' || Array.isArray(h)) { out.push({ kde: cesta, duvod: 'typ' }); return; }
  Object.keys(vzor).forEach(k => {
    const v = vzor[k], x = h[k], c = cesta + '.' + k;
    if (ULO_VYCTY[c]) {
      if (x !== undefined && x !== null && x !== '' && ULO_VYCTY[c].indexOf(x) < 0) out.push({ kde: c, duvod: 'typ' });
    } else if (ULO_CISLA_NAVIC.indexOf(c) >= 0 || typeof v === 'number') {
      if (!uloCisloSedi(x)) out.push({ kde: c, duvod: 'typ' });
    } else if (typeof v === 'boolean') {
      if (!uloPravdaSedi(x)) out.push({ kde: c, duvod: 'typ' });
    } else if (Array.isArray(v)) {
      if (x !== undefined && x !== null && !Array.isArray(x)) out.push({ kde: c, duvod: 'typ' });
    } else if (v && typeof v === 'object') {
      uloTypyStrom(v, x, c, out);
    }
  });
}
/* Části, které vzor nepopíše (null nebo pole ve vzoru), mají vlastní pravidla. */
function uloTypyOplasteni(opl, cesta, out) {
  const steny = opl && opl.steny;
  if (steny === null || steny === undefined) return;
  if (typeof steny !== 'object' || Array.isArray(steny)) { out.push({ kde: cesta, duvod: 'typ' }); return; }
  const typy = (typeof OPLASTENI_TYPY !== 'undefined') ? OPLASTENI_TYPY.map(t => t.id) : null;
  Object.keys(steny).forEach(k => {
    const st = steny[k], c = cesta + '.' + k;
    if (st === null || st === undefined) return;
    if (typeof st !== 'object' || Array.isArray(st)) { out.push({ kde: c, duvod: 'typ' }); return; }
    if (!uloCisloSedi(st.odM)) out.push({ kde: c + '.odM', duvod: 'typ' });
    if (st.pasy === null || st.pasy === undefined) return;
    if (!Array.isArray(st.pasy)) { out.push({ kde: c + '.pasy', duvod: 'typ' }); return; }
    st.pasy.forEach((p, i) => {
      const cp = c + '.pasy[' + i + ']';
      if (!p || typeof p !== 'object') { out.push({ kde: cp, duvod: 'typ' }); return; }
      if (typy ? typy.indexOf(p.typ) < 0 : !ULO_TOKEN.test(String(p.typ || ''))) out.push({ kde: cp + '.typ', duvod: 'typ' });
      if (!uloCisloSedi(p.doM)) out.push({ kde: cp + '.doM', duvod: 'typ' });
    });
  });
}
function uloTypyProfily(profily, cesta, out) {
  if (!profily || typeof profily !== 'object') return;
  Object.keys(profily).forEach(k => {
    const p = profily[k];
    if (p && typeof p === 'object' && p.dim !== undefined && p.dim !== null && p.dim !== ''
        && !ULO_DIMENZE.test(String(p.dim))) out.push({ kde: cesta + '.' + k + '.dim', duvod: 'typ' });
  });
}
const ULO_PROJ_CISLA = ['hodiny', 'rezerva', 'sazbaKc', 'cena', 'naklad', 'sazbaPrepis', 'cenaPrepis'];
function uloTypyProj(zadani, cesta, out) {
  const sekce = zadani && zadani.sekce;
  if (sekce === null || sekce === undefined) return;
  if (!Array.isArray(sekce)) { out.push({ kde: cesta + '.sekce', duvod: 'typ' }); return; }
  sekce.forEach((s, i) => {
    const cs = cesta + '.sekce[' + i + ']';
    if (!s || typeof s !== 'object') { out.push({ kde: cs, duvod: 'typ' }); return; }
    if (!ULO_TOKEN.test(String(s.key || ''))) out.push({ kde: cs + '.key', duvod: 'typ' });
    if (!uloCisloSedi(s.prirazkaPct)) out.push({ kde: cs + '.prirazkaPct', duvod: 'typ' });
    if (s.doprava && typeof s.doprava === 'object')
      ['km', 'pausal'].forEach(k => { if (!uloCisloSedi(s.doprava[k])) out.push({ kde: cs + '.doprava.' + k, duvod: 'typ' }); });
    if (s.polozky === null || s.polozky === undefined) return;
    if (!Array.isArray(s.polozky)) { out.push({ kde: cs + '.polozky', duvod: 'typ' }); return; }
    s.polozky.forEach((p, j) => {
      const cp = cs + '.polozky[' + j + ']';
      if (!p || typeof p !== 'object') { out.push({ kde: cp, duvod: 'typ' }); return; }
      ULO_PROJ_CISLA.forEach(k => { if (!uloCisloSedi(p[k])) out.push({ kde: cp + '.' + k, duvod: 'typ' }); });
      ['typ', 'sazba', 'fixKey'].forEach(k => {
        if (p[k] !== undefined && p[k] !== null && !ULO_TOKEN.test(String(p[k]))) out.push({ kde: cp + '.' + k, duvod: 'typ' });
      });
      if (!uloPravdaSedi(p.vyrazeno)) out.push({ kde: cp + '.vyrazeno', duvod: 'typ' });
    });
  });
}
function uloTypyProblemy(zak, stara) {
  const out = [];
  if (!zak || !Array.isArray(zak.varianty)) return out;
  const g = (n) => (typeof globalThis !== 'undefined' && globalThis[n]) || null;
  const vzZad = (typeof DEFAULT_ZADANI !== 'undefined') ? DEFAULT_ZADANI : g('DEFAULT_ZADANI');
  const vzCen = (typeof DEFAULT_CENIK !== 'undefined') ? DEFAULT_CENIK : g('DEFAULT_CENIK');
  const vzCenP = (typeof DEFAULT_CENIK_PROJ !== 'undefined') ? DEFAULT_CENIK_PROJ : g('DEFAULT_CENIK_PROJ');
  const stare = (stara && Array.isArray(stara.varianty)) ? stara.varianty : [];
  zak.varianty.forEach(v => {
    if (!v || !v.data || typeof v.data !== 'object') return;
    const sv = stare.find(x => x && x.id === v.id);
    if (sv && sv.zamek && sv.zamek.zamceno) return;                // doklad — nesahat
    const d = v.data, pred = 'varianta ' + String(v.nazev || v.id || '?') + ': ';
    const vlastni = [];
    if (d.ock && typeof d.ock === 'object') {
      if (vzZad) uloTypyStrom(vzZad, d.ock.zadani, 'ock.zadani', vlastni);
      const z = d.ock.zadani;
      if (z && typeof z === 'object') {
        uloTypyOplasteni(z.oplasteni, 'ock.zadani.oplasteni.steny', vlastni);
        uloTypyProfily(z.profily, 'ock.zadani.profily', vlastni);
      }
    }
    if (vzCen) uloTypyStrom(vzCen, d.cenik, 'cenik', vlastni);
    if (d.proj && typeof d.proj === 'object') {
      uloTypyProj(d.proj.zadani, 'proj.zadani', vlastni);
      if (vzCenP) uloTypyStrom(vzCenP, d.proj.cenik, 'proj.cenik', vlastni);
    }
    vlastni.forEach(p => out.push({ kde: pred + p.kde, duvod: 'typ' }));
  });
  return out;
}

/* Věta pro odmítnutí (server i obnova): tvar a duplicita se hlásí zvlášť,
 * aby člověk věděl, co má opravit. */
function uloIdProblemyText(problemy) {
  const dupl = problemy.filter(p => p.duvod === 'duplicita');
  const delka = problemy.filter(p => p.duvod === 'delka');
  const priloha = problemy.filter(p => p.duvod === 'priloha');
  const typ = problemy.filter(p => p.duvod === 'typ');
  const tvar = problemy.filter(p => p.duvod !== 'duplicita' && p.duvod !== 'delka' && p.duvod !== 'priloha'
    && p.duvod !== 'typ');
  const casti = [];
  if (tvar.length) casti.push('identifikátor v nepovoleném tvaru (' + tvar.map(x => x.kde).join(', ')
    + ') — povolená jsou písmena, číslice, tečka, podtržítko a pomlčka');
  if (dupl.length) casti.push('duplicitní id (' + dupl.map(x => x.kde + ' ' + x.id).join(', ') + ')');
  /* Délka se hlásí zvlášť (B45): není to špatný tvar, je to příliš dlouhý
   * text — a člověk má vědět, že stačí zkrátit, ne přepsat znaky. */
  if (delka.length) casti.push('příliš dlouhý text (' + delka.map(x => x.kde).join(', ')
    + ') — nejvýš 200 znaků');
  if (priloha.length) casti.push('přílohu s nepovoleným obsahem (' + priloha.map(x => x.id).join(', ')
    + ') — příloha smí nést jen data souboru');
  /* Typy polí (#340): cesty, ne hodnoty — hodnota může být právě ten skript. */
  if (typ.length) casti.push('hodnotu nesprávného typu (' + typ.slice(0, 5).map(x => x.kde).join(', ')
    + (typ.length > 5 ? ' a další ' + (typ.length - 5) : '')
    + ') — číselné pole nese text, nebo volba není z nabídky');
  return casti.join('; ');
}

/* HLÍDKA NOČNÍ ZÁLOHY (#152, 24. 9. 2026).
 *
 * Noční funkce (zaloha_nocni) pořizuje otisk databáze sama. Kdyby přestala
 * běžet, nikdo by si toho nevšiml: administrátor při přihlášení dnešní
 * otisk dopořídí sám (onlineZalohaAuto) a přehled záloh pak vypadá zdravě.
 * Hlídá se proto zvlášť NOČNÍ otisk (zdroj „nocni-otisk") — když je
 * poslední starší než 48 hodin, zmeškala se aspoň dvě noci po sobě.
 *
 * Čistá funkce nad souhrny z /api/zaloha_vynuceno (bez dat), `ted`
 * v milisekundách, aby šla zkoušet bez hodin. */
const ULO_NOCNI_ZALOHA_MAX_HODIN = 48;
function uloZalohaHlidka(otisky, ted) {
  const seznam = Array.isArray(otisky) ? otisky : [];
  const cas = o => { const t = Date.parse(o.porizena || o.den || ''); return isFinite(t) ? t : NaN; };
  const nocni = seznam.filter(o => o && o.zdroj === 'nocni-otisk' && isFinite(cas(o)))
    .sort((a, b) => cas(b) - cas(a));
  const posledni = nocni[0] || null;
  if (!posledni) {
    return { posledni: null, hodin: null, stara: true,
      text: 'Noční záloha databáze: mezi ' + seznam.length + ' posledními zálohami není žádná noční. '
        + 'Zkontrolujte v Netlify naplánovanou funkci zaloha_nocni — zálohy pořízené ručně '
        + 'nebo při přihlášení administrátora její výpadek zakrývají.' };
  }
  const hodin = Math.max(0, Math.floor(((+ted || Date.now()) - cas(posledni)) / 3600000));
  const kdy = new Date(cas(posledni)).toLocaleString('cs-CZ');
  const stara = hodin > ULO_NOCNI_ZALOHA_MAX_HODIN;
  return { posledni, hodin, stara,
    text: stara
      ? 'Noční záloha databáze naposledy proběhla ' + kdy + ' — před ' + Math.floor(hodin / 24) + ' dny. '
        + 'Noční funkce zřejmě neběží; zálohy pořízené ručně nebo při přihlášení administrátora to zakrývají. '
        + 'Zkontrolujte v Netlify naplánovanou funkci zaloha_nocni.'
      : 'Poslední noční záloha: ' + kdy + '.' };
}

if (typeof module !== 'undefined')
  module.exports = { uloTypyProblemy, ULO_VYCTY, uloPrilohaDataBezpecna, uloZalohaHlidka, ULO_NOCNI_ZALOHA_MAX_HODIN, uloZamekRazitkaDrz, ULO_PRIPONA, ULO_REJSTRIK_SOUBOR, ULO_SCHEMA, ULO_PROBLEMY,
                     uloNorm, uloSlova, uloCisloVyplneno, uloKlicSouboru,
                     uloJmenoSouboru, uloJeZakazkovySoubor,
                     ULO_HLAVICKA_POLE, uloHlavickaChybi, uloHlavickaVyplnena, uloMaCislo, uloUlozeniStav,
                     uloCasHhMm,
                     ULO_ZALOHA_STARI_DNI, uloZalohaStariDni, uloZalohaRozhodni,
                     uloZalohaSmiPrepsat,
                     uloRazitkoNove, uloRazitko, uloKolize,
                     uloRejstrikZaznam, uloRejstrikNormalizuj, uloRejstrikSloucit,
                     uloDruhZakazky, uloObchodnik,
                     uloRejstrikOdeber, uloRejstrikSerad, uloHledej,
                     uloZamekKlic, uloPocetOdemceni, uloKontrolaZamku, uloProblemPopis,
                     uloOdemceniPribylo, ULO_ID_TVAR, uloIdBezpecne, uloIdProblemy,
                     uloIdProblemyText, uloKidProblemyProgramu };
