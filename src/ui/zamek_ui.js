/* ================= ZÁMEK VYTIŠTĚNÉ NABÍDKY – UI (#34) =================
 *
 * Model je v zamek.js; tady je jen obsluha: zablokování editace, lišta se
 * stavem, klonování a odemčení správcem.
 *
 * PROČ SEZNAM FUNKCÍ A NE ZAMRAŽENÍ STRÁNKY:
 * nabídku lze tisknout jen ze stránek, na kterých se zároveň edituje
 * (Kalkulace OCK, Přehled cenových nabídek). Kdyby se zamčená varianta
 * „zmrazila" přes CSS (pointer-events:none), vypnula by se s ní i tlačítka
 * tisku, tedy to jediné, co má na zamčené variantě zůstat funkční.
 * Blokujeme proto adresně jednotlivé zapisující funkce.
 *
 * Sestavená aplikace je jeden <script>, takže deklarované funkce jsou
 * zapisovatelné vlastnosti window – obalení je pak jednořádkové a platí
 * i pro volání z atributů onclick v HTML.
 *
 * SEBEKONTROLA: přejmenovaná nebo nová zapisující funkce, která tu chybí,
 * by zámek tiše obešla. Proto overit_lista.mjs kontroluje, že každý název
 * ze ZAMEK_CHRANENE v běžící aplikaci existuje a je obalený (příznak
 * _zamek). Když někdo funkci přejmenuje, spadne test – ne zámek. */

const ZAMEK_CHRANENE = [
  // Kalkulace OCK – množství, ceny, vlastní položky, příplatky, pořadí
  'mnozstviSet', 'nazevSet', 'nazevReset', 'cenaSet',
  'vlastniAdd', 'vlastniDel', 'vlastniSet', 'vlastniDoCeniku',
  /* `volitelneVychoziSet` tu stála do 20. 8. 2026. Zanikla: sloupec Výchozí
   * už nezapisuje do zadání zakázky, ale do matice zobrazení (nastavení
   * aplikace pro nové zakázky) — a nastavení aplikace zámek varianty
   * neblokuje, stejně jako neblokuje volbu režimu sekce. */
  'volitelneToggle', 'viditelnostSet', 'presunRadek',
  /* Dodatkový text pod položkou (nález B63 revize v22.9.9). Do 22. 9. 2026
   * ho viděl jen administrátor; od #310 ho vidí a píše každý. `popisSet`
   * se sám ptal jen na zámek VARIANTY, takže v zakázce otevřené jen ke
   * čtení text přijal, zapsal do ceníku varianty a po F5 byl pryč — bez
   * jediného slova (třída N4). A v náhledu cizího uživatele by administrátor
   * zapsal text do zakázky i na server pod cizím pohledem. Obal přidá obě
   * kontroly, které funkce sama nemá: náhled a zámek čtení. */
  'popisSet',
  /* Opláštění po stěnách (#268, 3. krok, 21. 9. 2026). Zapisují do zadání
   * mimo `set()`, protože zakládají strukturu stěn a pásů — `set()` umí jen
   * dosadit hodnotu na existující cestu. Zámek je proto musí hlídat zvlášť,
   * jinak by šlo měnit plášť odeslané nabídky. */
  'oplRezimSet', 'oplCelaVyskaSet', 'oplOdSet', 'oplPasSet', 'oplPasPridej', 'oplPasSmaz',
  /* Zkratka „prosklít i prohlubeň" (P2 / K19-N104, 2. 10. 2026) — totéž. */
  'prohlubenSkloSet', 'prohlubenSet',
  /* Světlíky na bocích dveří (#375, 30. 9. 2026): před zápisem převádějí
   * starší zadání na nový tvar mimo `set()` — zámek musí stát před tím.
   * Šířka bočního světlíku (#381, 1. 10. 2026) totéž; `bokyKsZpet` navíc
   * mimo `set()` maže ruční šířku. */
  'bokyDveriSet', 'bokyKsSet', 'bokyKsZpet', 'bokySirkaSet', 'bokySirkaZpet', 'cenikPopisDoZakazky',
  'priplatekNabidka', 'priplatekVlastniAdd', 'priplatekVlastniDel',
  'priplatekVlastniSet', 'priplatekDoCeniku',
  'sirotciUklidVse', 'sirotekUklid',
  // Ceníky varianty (katalog, reset, import z Excelu)
  'katAdd', 'katSet', 'katDel', 'resetCenik', 'resetCenikProj', 'cenikImportPotvrd',
  // Technická specifikace + její data
  'tsSet', 'tsReset', 'tsSelect', 'tsExtraAdd', 'tsExtraDel', 'tsExtraSet',
  'sdItemSet', 'sdItemAdd', 'sdItemDel', 'sdItemMove', 'sdDefSet', 'sdDefVlastni', 'sdResetVse',
  // Krycí listy
  'klSet', 'klReset', 'klpSet', 'klpReset',
  /* Výběr z číselníku (O1, 14. 10. 2026). Volba „jiné znění" ruční hodnotu
   * maže mimo klSet / klpSet — u pole nabídky zamčené varianty tak zmizela
   * tiše a server pak uložení odmítl, aniž by obchodník věděl proč. */
  'klVyber', 'klpVyber',
  /* Plán plateb projekce v krycím listu PROJ (etapa B, 30. 9. 2026) —
   * zapisuje do data.kryciProj.planPlateb mimo klpSet (předvolba, splátky,
   * ruční částky plateb smlouvy). */
  'planKlpPredvolba', 'planKlpZaloha', 'planKlpProcento', 'planKlpMilnik', 'planKlpMilnikText',
  'planKlpPridej', 'planKlpOdeber', 'planKlpPosun', 'planKlpVratitCinnost', 'planKlpPrepis', 'planKlpPrepisZrus',
  // Kalkulace PROJ a text nabídky PROJ
  'pjSet', 'pjPolozkaAdd', 'pjPolozkaDel', 'nabidkaProjPopis',
  // Sleva (mění cenu, která už odešla zákazníkovi)
  // `slevaSetSchvalitel` a `slevaSchval` zanikly 5. 8. 2026 se stěhováním
  // schvalování do vlastní záložky. Rozhodování (schvRozhodni) se sem NEPŘIDÁVÁ:
  // zamekStop() se ptá na PRÁVĚ OTEVŘENOU variantu, kdežto v seznamu se
  // rozhoduje o libovolné – zámek si proto hlídá schvRozhodni samo na cílové
  // variantě, jinak by uzamčená otevřená varianta blokovala schválení všech
  // ostatních.
  // Od 12. 8. 2026 (#134) jsou slevy dvě – na výtahovou šachtu a na projekci.
  // Chráněné musí být obě, jinak by zamčenou variantu šlo přecenit tou druhou.
  // Pole „Globální sleva PROJ" (pjSlevaGlobal) tou změnou zaniklo.
  'slevaSet', 'slevaZrus', 'slevaProjSet', 'slevaProjZrus',
  // Obchodní zaokrouhlení (#38) – také mění koncovou cenu nabídky
  // Od 4. 8. 2026 je karta rozdělená na část OCK a část PROJ – chráněné
  // musí být obě, jinak by zamčenou variantu šlo přecenit přes Kalkulaci PROJ.
  'zaokrSetKrok', 'zaokrSetSmer', 'zaokrProjSetKrok', 'zaokrProjSetSmer',
];

/* Zapisující funkce krycích listů → který list (data.kryci / data.kryciProj).
 * Plán plateb PROJ (planKlp…) sem nepatří: jde do nabídky celý. */
const ZAMEK_KRYCI_FUNKCE = { klSet: 'kryci', klReset: 'kryci', klVyber: 'kryci',
  klpSet: 'kryciProj', klpReset: 'kryciProj', klpVyber: 'kryciProj' };
/* Plán plateb PROJ (planKlp…) je od Z1 (J. V. 22. 10. 2026) po tisku CN
 * editovatelný — odeslaná nabídka ho drží ve snímku zámku. Ptá se za něj
 * pole `planPredvolba` (zámek bez snímku ho dál drží zmrazený). */
const ZAMEK_KRYCI_PLAN = ['planKlpPredvolba', 'planKlpZaloha', 'planKlpProcento', 'planKlpMilnik', 'planKlpMilnikText',
  'planKlpPridej', 'planKlpOdeber', 'planKlpPosun', 'planKlpVratitCinnost', 'planKlpPrepis', 'planKlpPrepisZrus'];

/* Pole krycího listu ZAMČENÉ varianty, které se smí doplnit. U nezamčené
 * varianty vrací false — ta jde běžnou cestou (zámek čtení, …). */
function zamekKryciVolnePole(list, id) {
  const v = (typeof aktivniVarianta === 'function') ? aktivniVarianta(ZAK) : null;
  return !!(v && typeof zamekKryciPoleVolne === 'function' && variantaUzamcena(v) && zamekKryciPoleVolne(v, list, id));
}

/* Zakázka otevřená jen ke čtení: doplnění krycího listu odeslané nabídky ji
 * uvolní (odeslanou variantu nejde odemknout jinak než klonem, krycí list
 * by tak zůstal nedoplnitelný). Jen tomu, kdo ji smí upravovat
 * (zamekCteniSmiOdemknout — autor, vedoucí, administrátor). */
function zamekKryciCteniUvolni() {
  if (typeof zamekCteniJe !== 'function' || !zamekCteniJe()) return true;
  const ja = (typeof ONLINE_STAV !== 'undefined') ? ONLINE_STAV.ja : null;
  if (typeof zamekCteniSmiOdemknout === 'function' && !zamekCteniSmiOdemknout(ZAK, ja)) {
    if (typeof hlaska === 'function' && typeof zamekCteniDuvod === 'function') hlaska(zamekCteniDuvod(ZAK, ja));
    if (typeof render === 'function') render();
    return false;
  }
  zamekCteniVypni();
  if (typeof onlineZprava === 'function')
    onlineZprava('Krycí list odeslané nabídky se doplňuje — změny polí mimo cenovou nabídku se zase ukládají samy.');
  return true;
}

/* Poznámka nad krycím listem zamčené varianty: co se po odeslání nabídky
 * ještě doplňuje a co ne. `sekce` = názvy sekcí, které jdou do nabídky. */
function zamekKryciPoznamka(sekce) {
  const v = (typeof aktivniVarianta === 'function') ? aktivniVarianta(ZAK) : null;
  if (!v || !variantaUzamcena(v)) return '';
  const otevreny = typeof zamekKryciOtevreny === 'function' && zamekKryciOtevreny(v);
  return `<div class="note noprint kl-zamek-pozn" style="margin-bottom:6px">🔒 ${otevreny
    ? (typeof zamekSnimek === 'function' && zamekSnimek(v)
      ? 'Nabídka už odešla. Krycí list dál doplňujte — zmrazená (🔒, šedá) jsou jen pole, která se po odeslání nemění '
        + '(obchodník, název a adresa akce, hodnota zakázky, údaje zhotovitele, typ smlouvy, platnost nabídky). '
        + 'Změna platebních podmínek, DPH nebo termínu se projeví v krycím listu a ve smlouvě; dotisk odeslané nabídky zůstává, jak odešla.'
      : `Nabídka už odešla. Krycí list dál doplňujte — zamčená jsou jen pole, která jsou v cenové nabídce (${esc(sekce.join(', '))}).`)
    : 'Ze zakázky odešla smlouva o dílo — krycí list se už nemění (doplnit jde jen plná moc v krycím listu PROJ). Pokračujte klonem varianty.'}</div>`;
}

/* OZNAČENÍ ZMRAZENÉHO POLE (Z1, bod 5): atributy pro <input>/<select>/
 * <textarea> pole krycího listu nebo cesty hlavičky, které se po odeslání
 * nemění — šedé, neaktivní a s důvodem v bublině, ať obchodník nenaráží až
 * na dialog klonu. Vrací '' u volného pole. */
const ZAMEK_POLE_DUVOD = 'Nabídka už odešla — pole se po tisku cenové nabídky nemění (pokračujte klonem varianty).';
function zamekPoleAttr(list, id) {
  const v = (typeof aktivniVarianta === 'function' && typeof ZAK !== 'undefined') ? aktivniVarianta(ZAK) : null;
  if (!v || typeof zamekKryciPoleStav !== 'function' || !variantaUzamcena(v)) return '';
  const st = zamekKryciPoleStav(v, list, id);
  if (st === 'editovatelne') return '';
  const duvod = st === 'jen_admin' ? 'Číslo odeslané nabídky mění jen administrátor.'
    : (zamekKryciOtevreny(v) ? ZAMEK_POLE_DUVOD
      : 'Ze zakázky odešla smlouva o dílo — krycí list se už nemění (pokračujte klonem varianty).');
  return ` disabled class="zmrazeno" title="${esc('🔒 ' + duvod)}"`;
}
function zamekZakAttr(cesta) {
  const duvod = (typeof zamekZakCestaZmrazena === 'function' && typeof ZAK !== 'undefined') ? zamekZakCestaZmrazena(ZAK, cesta) : '';
  return duvod ? ` disabled class="zmrazeno" title="${esc('🔒 ' + duvod)}"` : '';
}
function zamekDphAttr(cesta) {
  const v = (typeof aktivniVarianta === 'function' && typeof ZAK !== 'undefined') ? aktivniVarianta(ZAK) : null;
  if (!v || !variantaUzamcena(v) || typeof zamekDphVolna !== 'function' || zamekDphVolna(v, cesta)) return '';
  return ` disabled class="zmrazeno" title="${esc('🔒 ' + ZAMEK_POLE_DUVOD)}"`;
}

let _zamekNainstalovan = false;

function zamekChranFunkce() {
  if (_zamekNainstalovan || typeof window === 'undefined') return;
  _zamekNainstalovan = true;
  ZAMEK_CHRANENE.forEach(nazev => {
    const puvodni = window[nazev];
    if (typeof puvodni !== 'function') {
      console.warn('Zámek: funkce ' + nazev + ' neexistuje – zkontrolujte ZAMEK_CHRANENE.');
      return;
    }
    if (puvodni._zamek) return;
    const obal = function (...args) {
      /* Náhled cizího uživatele (20. 8. 2026) je JEN KE ČTENÍ — jinak by
       * v zakázce zůstala změna, o které nikdo neví, kdo ji udělal.
       * Ptá se dřív než zámek varianty: v náhledu neplatí ani to, co by
       * u vlastní odemčené varianty prošlo. */
      if (typeof nahledStop === 'function' && nahledStop(nazev)) return;
      /* Krycí list odeslané nabídky (J. V. 14. 10. 2026): pole, která nejdou
       * do cenové nabídky, se doplňují i po tisku — dokud neodešla smlouva
       * o dílo (model zamekKryciPoleVolne v zamek.js, server hlídá totéž). */
      const kryciList = ZAMEK_KRYCI_FUNKCE[nazev];
      const planVolny = ZAMEK_KRYCI_PLAN.indexOf(nazev) >= 0 && zamekKryciVolnePole('kryciProj', 'planPredvolba');
      if (planVolny || (kryciList && zamekKryciVolnePole(kryciList, args[0]))) {
        if (!zamekKryciCteniUvolni()) return;
        return puvodni.apply(this, args);
      }
      /* Zámek otevřené zakázky (jen ke čtení, 4. 9. 2026) — ptá se dřív než
       * zámek varianty: v zamčeném okně neprojde ani to, co by u odemčené
       * rozpracované varianty prošlo. */
      if (typeof zamekCteniStop === 'function' && zamekCteniStop()) return;
      if (zamekStop()) return;
      return puvodni.apply(this, args);
    };
    obal._zamek = true;
    obal._puvodni = puvodni;
    window[nazev] = obal;
  });
}

/* Vrací true, když je zápis zakázaný (a uživateli to vysvětlí). */
function zamekStop() {
  const v = aktivniVarianta(ZAK);
  if (variantaEditovatelna(v)) return false;
  zamekUpozorni(v);
  return true;
}

async function zamekUpozorni(v) {
  const z = zamekInfo(v);
  const kdy = ((z && z.kdy) || '').slice(0, 10);
  const cislo = variantaCislo(ZAK, v);
  /* Tlačítka nesou, co udělají (P7 / K15-N68, 25. 9. 2026). Text radil
   * „OK = založit klon…, Zrušit = nechat vše beze změny" — jenže modál
   * v aplikaci má tlačítka Ano / Ne, takže obchodník nevěděl, co zmáčknout. */
  const chce = await potvrd(
    `Varianta „${v.nazev}" (${cislo}) je uzamčená.\n\n`
    + `Byla ${kdy ? kdy + ' ' : ''}vytištěna jako ${(z && z.popis) || 'cenová nabídka'}, `
    + `a vytištěná nabídka se považuje za odeslanou zákazníkovi – proto se už needituje.\n\n`
    + `Chcete pokračovat v klonu varianty (${variantaCisloDalsi()})?`,
    { nadpis: 'Uzamčená varianta', ano: 'Založit klon a pokračovat v něm', ne: 'Nechat beze změny' });
  if (chce) zamekKlonUI(v.id);
  else render();   // vrátí do polí hodnoty ze zakázky (uživatel je mohl přepsat)
}

/* Náhled čísla, které dostane příští klon – jen pro text hlášky. */
function variantaCisloDalsi() {
  const p = dalsiPriponaVarianty(ZAK);
  return String(ZAK.cislo || '').replace(/\s+$/, '') + '.' + p;
}

/* ---------- klonování ---------- */

function zamekKlonUI(id) {
  const zdroj = ZAK.varianty.find(x => x.id === id) || aktivniVarianta(ZAK);
  if (!zdroj) return;
  /* KLONOVAT A POKRAČOVAT = I ODEMKNOUT OKNO (#404, 13. 10. 2026). U odeslané
   * nabídky se od #404 modrá lišta „jen ke čtení" obchodníkovi neukazuje —
   * pokračuje se klonem. Klon v zakázce jen ke čtení by se ale neuložil
   * (autosave v režimu čtení mlčí) a po F5 by byl pryč. Kdo zakázku smí
   * odemknout (zamekCteniSmiOdemknout), tomu ji klon odemkne; kdo nesmí
   * (cizí zakázka), dostane důvod a klon nevznikne. */
  if (typeof zamekCteniJe === 'function' && zamekCteniJe()) {
    const ja = (typeof ONLINE_STAV !== 'undefined') ? ONLINE_STAV.ja : null;
    if (typeof zamekCteniSmiOdemknout === 'function' && !zamekCteniSmiOdemknout(ZAK, ja)) {
      hlaska(zamekCteniDuvod(ZAK, ja) + '\n\nNovou nabídku založíte tlačítkem „Založit novou zakázku".');
      return;
    }
    zamekCteniOdemkniUI();
    if (zamekCteniJe()) return;   // odemknutí zastavil náhled (nahledStop)
  }
  const klon = klonujVariantu(ZAK, zdroj.id);
  if (!klon) return;
  syncVarianta();
  render();
  nabidkaStavTextBezpecne(`Založena nová varianta ${variantaCislo(ZAK, klon)} („${klon.nazev}") `
    + `jako kopie ${variantaCislo(ZAK, zdroj)}. Pokračujte v ní.`);
}

/* Stavový řádek nabídky nemusí být na stránce (jiná záložka) – nevadí. */
function nabidkaStavTextBezpecne(txt) {
  if (typeof nabidkaStavText === 'function') nabidkaStavText(txt);
}

/* ---------- odemčení (jen správce, vždy s důvodem) ---------- */

async function zamekOdemkniUI(id) {
  const v = ZAK.varianty.find(x => x.id === id);
  if (!v || !variantaUzamcena(v)) return;
  if (!smiZobrazit('zamek.odemknout')) {
    hlaska('Odemknout odeslanou nabídku může jen správce.\n\n'
      + 'Běžný postup je založit klon varianty a pokračovat v něm – '
      + 'původní nabídka tak zůstane přesně v podobě, v jaké odešla zákazníkovi.');
    return;
  }
  if (typeof nahledStop === 'function' && nahledStop('odemčení odeslané nabídky')) return;
  const duvod = await dotaz('Odemknutí odeslané nabídky ' + variantaCislo(ZAK, v)
    + '.\n\nUveďte důvod (uloží se do zakázky):', '');
  if (duvod === null) return;
  const r = odemkniVariantu(v, { jeAdmin: true, duvod, kdo: zamekKdo() });
  if (!r.ok) { hlaska('Odemknutí neproběhlo: ' + r.duvod); return; }
  /* Modrý pruh „Odemknout k úpravám" (#404) odemyká odeslanou nabídku
   * i okno: záznam o odemčení se musí uložit (server ho ověří — B3)
   * a v režimu čtení by autosave mlčel. */
  if (typeof zamekCteniJe === 'function' && zamekCteniJe()) zamekCteniVypni();
  render();
}

function zamekKdo() {
  return (typeof NAST !== 'undefined' && NAST.uzivatel) ? String(NAST.uzivatel) : '';
}

/* ---------- uzamčení tiskem ---------- */

/* TISK Z NABÍDKY OTEVŘENÉ JEN KE ČTENÍ (P2 / K13-N54, 24. 9. 2026).
 *
 * Tlačítka tisku leží mimo bloky, které zámek čtení šedí, takže dokument šlo
 * vytvořit i ze zakázky otevřené jen ke čtení. Zámek varianty pak vznikl jen
 * v prohlížeči — uložení v režimu čtení se odmítá — a když obchodník zakázku
 * zavřel, odeslaná nabídka zůstala na serveru odemčená.
 *
 * Varianta A (výchozí zadání): před dokumentem, který zamyká, se zeptat
 * stejně jako při uložení. „Odemknout a tisknout" zakázku odemkne a dokument
 * vznikne; zámek se pak uloží autosavem jako u každé jiné změny. Kdo
 * odemknout nesmí, dostane důvod a dokument nevznikne.
 *
 * Ptá se jen u varianty, která ještě zamčená NENÍ: dotisk už odeslané
 * nabídky nic nového nezamyká (zámek je v uložených datech) a čtení je pro
 * něj přesně ten správný režim. Vrací Promise<boolean> — true = tisknout. */
/* RAZÍTKO SLOVNÍKU (revize #401, 12. 10. 2026): kterým slovníkem překladů
 * dokument vzniká — zveřejněná verze (je-li) a otisk celého živého slovníku. */
function zamekSlovnikTed() {
  if (typeof slovnikRazitko !== 'function' || typeof PREKLAD === 'undefined') return null;
  const p = (typeof ONLINE_STAV !== 'undefined' && ONLINE_STAV.slovnik && ONLINE_STAV.slovnik.platny) || null;
  return slovnikRazitko(PREKLAD, p ? p.verze : null);
}
/* Dotisk odeslané nabídky v cizím jazyce poté, co se slovník změnil: částky
 * jsou zmrazené, ale překlady se berou z dnešního slovníku — obsluha to musí
 * vědět dřív, než pošle zákazníkovi „tutéž" nabídku s jiným zněním. Zámky
 * bez razítka (pořízené před v12.10.3) se neptají. Vrací Promise<boolean>. */
async function tiskSlovnikUpozorni(typ, varianta) {
  const z = (varianta && typeof zamekInfo === 'function') ? zamekInfo(varianta) : null;
  const puv = z && (typeof slovnikRazitkoOciste === 'function') ? slovnikRazitkoOciste(z.slovnik) : null;
  if (!puv) return true;
  const L = (typeof tiskJazyk === 'function') ? tiskJazyk() : ((typeof jazyk === 'function') ? jazyk() : 'cz');
  if (!L || L === 'cz') return true;
  const ted = zamekSlovnikTed();
  if (!ted || ted.otisk === puv.otisk) return true;
  const v = (r) => r.verze ? 'zveřejněná verze ' + r.verze : 'slovník zabudovaný v aplikaci';
  return await potvrd('Slovník překladů se od odeslání této nabídky změnil (při odeslání: ' + v(puv)
    + ', teď: ' + v(ted) + ').\n\nDotisk v jazyce ' + L.toUpperCase() + ' ponese DNEŠNÍ znění překladů, '
    + 'takže se textem může lišit od dokumentu, který zákazník dostal. Částky jsou zmrazené a nemění se.',
    { nadpis: 'Dotisk se změněným slovníkem', ano: 'Tisknout', ne: 'Zrušit' });
}
async function tiskZamekCteniPovol(typ, varianta) {
  if (!(await tiskSlovnikUpozorni(typ, varianta))) return false;
  if (typeof zamekCteniJe !== 'function' || !zamekCteniJe()) return true;
  if (typeof dokumentZamyka !== 'function' || !dokumentZamyka(typ)) return true;
  if (varianta && typeof variantaUzamcena === 'function' && variantaUzamcena(varianta)) return true;
  const ja = (typeof ONLINE_STAV !== 'undefined') ? ONLINE_STAV.ja : null;
  const smi = (typeof zamekCteniSmiOdemknout !== 'function') || zamekCteniSmiOdemknout(ZAK, ja);
  const uvod = 'Tisk odešle nabídku a uzamkne variantu. K tomu je potřeba zakázku odemknout.';
  if (!smi) {
    const duvod = (typeof zamekCteniDuvod === 'function') ? zamekCteniDuvod(ZAK, ja) : '';
    await hlaska(uvod + (duvod ? '\n\n' + duvod : ''), { nadpis: 'Nabídka jen ke čtení' });
    return false;
  }
  const ano = await potvrd(uvod + '\n\nZakázka je otevřená jen ke čtení, takže by se zámek '
    + 'neuložil a odeslaná nabídka by na serveru zůstala odemčená.',
    { nadpis: 'Nabídka jen ke čtení', ano: 'Odemknout a tisknout', ne: 'Zrušit' });
  if (!ano) return false;
  zamekCteniOdemkniUI();
  return !zamekCteniJe();   // odemknutí mohl zastavit náhled (nahledStop)
}

/* SNÍMEK, KTERÝ JEŠTĚ NENÍ NA SERVERU (Z1). Server snímek nového zámku
 * ověří proti ukládaným datům; kdyby obchodník mezi tiskem a prvním uložením
 * změnil editovatelné pole nabídky, snímek by nesedil a uložení by spadlo.
 * Dokud zámek na serveru není, obnoví se proto snímek těsně před odesláním
 * (online_ui.js) — stejně, jak ho spočítá server. Vrací id obnovených. */
const ZAMEK_SNIMEK_NEULOZENY = new Set();
function zamekSnimkyObnov() {
  const ids = [];
  ZAMEK_SNIMEK_NEULOZENY.forEach(id => {
    const v = ((typeof ZAK !== 'undefined' && ZAK.varianty) || []).find(x => x && x.id === id);
    if (!v || !variantaUzamcena(v) || !v.zamek.snimek) { ZAMEK_SNIMEK_NEULOZENY.delete(id); return; }
    v.zamek.snimek = zamekSnimekSpocti(v);
    ids.push(id);
  });
  return ids;
}
function zamekSnimkyUlozeno(ids) { (ids || []).forEach(id => ZAMEK_SNIMEK_NEULOZENY.delete(id)); }

/* Volá se ze dvou míst: po stažení nabídky do Wordu a z tiskového náhledu
 * (okno náhledu si sáhne přes window.opener). Zamykají jen dokumenty, které
 * jdou zákazníkovi – viz ZAMEK_DOKUMENTY v zamek.js. */
function zamekPoTisku(typ, varId, sablona, navic) {
  if (!dokumentZamyka(typ)) return null;
  const v = (varId && ZAK.varianty.find(x => x.id === varId)) || aktivniVarianta(ZAK);
  if (!v) return null;
  const prvni = !variantaUzamcena(v);
  let otisk = null, vysledek = null;
  /* První smlouva o dílo zamkne číslo SoD a datum podpisu (#366): opíšou
   * se do krycích listů dřív, než zámek pole uzavře. */
  if (typeof zamekPrvniSmlouva === 'function' && zamekPrvniSmlouva(v, typ)) {
    try { if (typeof kryciZmrazSod === 'function') kryciZmrazSod(ZAK, v, JEKLY); } catch (e) {}
    try { if (typeof kryciProjZmrazSod === 'function') kryciProjZmrazSod(ZAK, v); } catch (e) {}
  }
  if (prvni) {
    try { otisk = zamekOtiskZPorovnani(porovnaniData(), v.id); } catch (e) { otisk = null; }
    /* CELÝ VÝSLEDEK SE BERE PŘI PRVNÍM ZAMČENÍ (nálezy A1 a D1, rozhodnutí
     * J. V. 15. 9. 2026). Tohle je ten jediný okamžik, kdy nabídka odchází —
     * od téhle chvíle se má chovat jako PDF. Bere se celý výsledek OCK i PROJ
     * a kurz EUR; bez kurzu by se cizojazyčný dotisk téže nabídky už nedal
     * vyrobit, protože doplnit ho do zamčené varianty nelze.
     *
     * Každý další tisk téže varianty sem nesahá (`prvni`), takže se otisk
     * nepřepíše novějším výpočtem a zakázka neroste.
     *
     * Výsledek skládá zamekVysledekSpocti — TÝŽ kód, kterým ho server při
     * prvním uložení zámku ověřuje (B59). */
    vysledek = zamekVysledekSpocti(v, JEKLY, (typeof buildVerze === 'function') ? buildVerze() : '');
    /* S nabídkou zamrznou i podmínky krycích listů předvyplněné z Nastavení
     * (P9.5, rozhodnutí J. V. 29. 9. 2026) — pozdější smlouva ani dotisk
     * nesmí nést jiné podmínky, než jaké odešly. */
    try { if (typeof kryciZmrazPodminky === 'function') kryciZmrazPodminky(ZAK, v, JEKLY); } catch (e) {}
    try { if (typeof kryciProjZmrazPodminky === 'function') kryciProjZmrazPodminky(ZAK, v); } catch (e) {}
  }
  /* Snímek krycích listů a DPH odeslané nabídky (Z1) — až PO zmrazení
   * podmínek, aby nesl i předvyplněné věty. Server ho u nového zámku
   * spočítá z dat znovu (klientskému nevěří). */
  const snimek = (prvni && typeof zamekSnimekSpocti === 'function') ? zamekSnimekSpocti(v) : null;
  if (snimek) ZAMEK_SNIMEK_NEULOZENY.add(v.id);
  zamkniVariantu(v, { typ, kdo: zamekKdo(), cislo: variantaCislo(ZAK, v), otisk, vysledek, snimek,
                      sablona: sablona || null, slovnik: zamekSlovnikTed(), sod: (navic && navic.sod) || null });
  render();
  return v.zamek;
}

/* ---------- lišta se stavem zámku ---------- */

function zamekLista() {
  const v = aktivniVarianta(ZAK);
  const z = zamekInfo(v);
  if (!z) return '';
  const kdy = (z.kdy || '').slice(0, 10);
  const pocet = Array.isArray(z.tisky) ? z.tisky.length : 1;
  /* Razítko serveru o ověření zmrazeného výsledku (B59) — ukazuje se jen
   * rozpor nebo neověření; shoda je běžný stav a lištu nezatěžuje. */
  const overeni = (typeof zamekOvereniText === 'function') ? zamekOvereniText(z.overeni) : '';
  /* Částky bez zmrazeného výsledku počítá dnešní jádro (B130) — řekne se to. */
  /* Jen strany, které zakázka počítá (jen OCK / jen PROJ — revize 13. 10.). */
  const dnes = ((typeof zamekPrepoctenoDnes === 'function') ? zamekPrepoctenoDnes(v) : [])
    .filter(s => !(s === 'proj' && ZAK.jenOck) && !(s === 'ock' && ZAK.jenProj));
  const dnesText = dnes.length ? 'Částky ' + (dnes.length === 2 ? 'OCK i PROJ' : dnes[0].toUpperCase())
    + ' nejsou u zámku zmrazené — zobrazují se přepočtené dnes '
    + 'a od odeslaného dokumentu se mohou lišit.' : '';
  /* JEDNOŘÁDKOVÁ INFORMACE (#404, J. V. 13. 10. 2026): „Odeslaná nabídka …
   * (vytištěno …) — needituje se" a dvě tlačítka, bez dlouhého textu.
   * Řádky B59 (rozpor ověření) a B130 (částky nejsou zmrazené) zůstávají —
   * nesou varování, ne návod. Odemknutí správcem má vlastní modrý pruh. */
  const st = listaZakazkyStav();
  const modra = st.lista === 'odeslana' && st.modra;
  return `<div class="zamek-lista">
    <span class="ikona">🔒</span>
    <span><b>Odeslaná nabídka ${esc(v.nazev)} (${esc(variantaCislo(ZAK, v))})</b>
      (vytištěno ${esc(kdy)} jako ${esc(z.popis || 'cenová nabídka')}${pocet > 1 ? `, výtisků: ${pocet}` : ''}) — needituje se.${overeni
        ? `<span class="zamek-overeni">⚠ ${esc(overeni)}</span>` : ''}${dnesText
        ? `<span class="zamek-overeni zamek-dnes">⚠ ${esc(dnesText)}</span>` : ''}</span>
    <span class="sp"></span>
    <button class="primary cteni-ok" onclick="zamekKlonUI('${escJs(v.id)}')"
      title="založit novou variantu jako kopii odeslané a pokračovat v ní — odeslaná zůstane, jak odešla">Klonovat a pokračovat</button>
    <!-- Založit novou zakázku (8. 9. 2026, zadání J. V.: „když chci začít novou
         zakázku, musím nejprve klonovat tu starou, což je hloupost"). Táž cesta
         jako tlačítko ✚ Nová zakázka v liště — potvrzení, prázdná zakázka. -->
    <button class="cteni-ok" onclick="novaZakazkaUI()"
      title="začít novou prázdnou zakázku — tahle zůstane uložená tak, jak odešla">Založit novou zakázku</button>
  </div>${modra ? `
  <div class="zamek-lista zamek-cteni zamek-odemknout">
    <span class="ikona">🔓</span>
    <span class="sp"><b>Odeslanou nabídku můžete odemknout k úpravám.</b>
      Odemčení se zapíše do zakázky i s důvodem; obchodník tuhle možnost nemá.</span>
    <button class="primary cteni-ok" onclick="zamekOdemkniUI('${escJs(v.id)}')">Odemknout k úpravám</button>
  </div>` : ''}`;
}

function renderZamekLista() {
  const el = document.getElementById('zamekLista');
  if (el) el.innerHTML = zamekLista();
  renderListaZakazky();
}

/* ---------- JEDINÁ ŽLUTÁ LIŠTA ROZPRACOVANÉ ZAKÁZKY (#404, 13. 10. 2026) ----------
 *
 * Nahrazuje dvě lišty: žlutou „V prohlížeči je rozpracovaná kalkulace…
 * Obnovit / Zahodit zálohu" (dřív v historie.js) a modrou „Nabídka je
 * otevřená jen ke čtení… Odemknout k úpravám" (dřív zamekCteniLista
 * v common.js nad kalkulacemi a ceníky). Kterou lištu ukázat, rozhoduje
 * model listaZakazkyRozhodni (zamek.js, test_lista_zakazky.js); tady se jen
 * kreslí a obsluhují tlačítka. Lišta je jedna nad záložkami, takže je vidět
 * na každé záložce (dřív ji musely nést jednotlivé stránky). */
function listaZakazkyStav() {
  const ja = (typeof ONLINE_STAV !== 'undefined') ? ONLINE_STAV.ja : null;
  /* HIST žije v historie.js (poslední soubor sestavení) — při render() před
   * jeho vyhodnocením by i `typeof` na const v mrtvé zóně spadl. */
  let zaloha = null;
  try { zaloha = HIST.nabidka || null; } catch (e) { zaloha = null; }
  let otevrena = '';
  if (zaloha) { try { otevrena = JSON.stringify(ZAK); } catch (e) { /* cyklus – nevadí */ } }
  const prava = { odemknout: typeof smiZobrazit === 'function' && smiZobrazit('zamek.odemknout') };
  const cteni = (typeof zamekCteniJe === 'function') && zamekCteniJe();
  return listaZakazkyRozhodni(ZAK, zaloha, ja, prava, { cteni, otevrena });
}

function listaKdyText(kdy) {
  const t = Date.parse(kdy || '');
  return Number.isNaN(t) ? '' : new Date(t).toLocaleString('cs-CZ');
}

function listaZakazkyHtml(r) {
  if (r.lista !== 'rozpracovana') return '';
  const kdy = listaKdyText(r.kdy);
  const zdroj = r.obnovit && !(typeof zamekCteniJe === 'function' && zamekCteniJe())
    ? ' (záloha v prohlížeči)' : '';
  const jina = r.jinaZaloha
    ? `<button class="odkaz" onclick="listaObnovJinouUI()" title="otevřít místo téhle zakázky rozpracovanou práci uloženou v prohlížeči">obnovit zálohu jiné kalkulace (${esc(r.jinaZaloha.co)}${
        listaKdyText(r.jinaZaloha.kdy) ? ', ' + esc(listaKdyText(r.jinaZaloha.kdy)) : ''})</button>` : '';
  return `<span>✎ <b>Rozpracovaná kalkulace</b> ${esc(r.co)}${zdroj}${kdy ? ', naposledy ' + esc(kdy) : ''}.${
      r.cizi ? ' ' + esc(r.cizi) : ''}</span>
    <span class="sp"></span>
    ${r.pokracovat ? `<button class="primary cteni-ok" onclick="listaPokracujUI()"
      title="${r.obnovit ? 'obnovit rozpracovanou práci z prohlížeče a pokračovat v ní' : 'odemknout zakázku k úpravám — změny se pak zase ukládají samy'}">Pokračovat v rozpracované kalkulaci</button>` : ''}
    <button class="cteni-ok" onclick="listaZalozNovouUI()" title="začít novou prázdnou kalkulaci">Založit novou kalkulaci</button>
    ${jina}
    ${r.zahodit ? '<button class="odkaz" onclick="historieZahodZalohu()" title="smazat zálohu rozpracované kalkulace uloženou v prohlížeči">Zahodit zálohu</button>' : ''}`;
}

function renderListaZakazky() {
  const el = document.getElementById('obnovaLista');
  if (!el || typeof ZAK === 'undefined') return;
  let r = listaZakazkyStav();
  /* Záloha odeslané nebo přežité zakázky se tiše zahodí (#404, bod 2) —
   * a model se zeptá znovu, už bez ní. */
  if (r.zahoditTise && typeof historieZalohaZahodTise === 'function') {
    historieZalohaZahodTise(HIST.nabidka);
    r = listaZakazkyStav();
  }
  const html = listaZakazkyHtml(r);
  el.innerHTML = html;
  el.classList.toggle('zobraz', !!html);
}

/* Pokračovat v rozpracované kalkulaci = odemknout režim jen ke čtení
 * (smí-li to uživatel — B-pravidlo zamekCteniSmiOdemknout, náhled zastaví)
 * a je-li v prohlížeči novější záloha, obnovit ji. */
function listaPokracujUI() {
  const r = listaZakazkyStav();
  if (r.lista !== 'rozpracovana' || !r.pokracovat) return;
  if (typeof zamekCteniJe === 'function' && zamekCteniJe()) {
    zamekCteniOdemkniUI();
    if (zamekCteniJe()) return;   // zastavil náhled nebo právo
  }
  if (r.obnovit) {
    /* Záloha JINÉ zakázky než té, která je otevřená pod jménem souboru
     * (typicky po startu, když se mezitím otevřela poslední zakázka):
     * obnova nesmí zdědit jméno souboru, jinak by se cizí práce uložila
     * přes otevřenou zakázku. */
    const zal = HIST.nabidka;
    const pojmenovana = (typeof ONLINE_STAV !== 'undefined' && ONLINE_STAV.soubor)
      || (typeof ULO_STAV !== 'undefined' && ULO_STAV.soubor);
    if (pojmenovana && !listaZalohaStejna(ZAK, zal) && typeof zakOdpojUlozeni === 'function') zakOdpojUlozeni();
    historieObnovZalohu();
  } else historieSkryjListu();
  render();
}

/* Obnova zálohy jiné kalkulace z liště otevřené zakázky (odkaz, #404). */
async function listaObnovJinouUI() {
  const r = listaZakazkyStav();
  if (!r.jinaZaloha) return;
  if (!await potvrd('Obnovit rozpracovanou kalkulaci ' + r.jinaZaloha.co + ' ze zálohy v prohlížeči?\n\n'
    + 'Otevřená zakázka se zavře (v databázi zůstane, jak je); obnovená kalkulace zatím není uložená.',
    { nadpis: 'Obnovit zálohu jiné kalkulace', ano: 'Obnovit zálohu', ne: 'Zrušit' })) return;
  if (typeof zakOdpojUlozeni === 'function') zakOdpojUlozeni();
  historieObnovZalohu();
  render();
}

/* Založit novou kalkulaci — táž cesta jako ✚ Nová zakázka (potvrzení,
 * prázdná zakázka). Nabídka zálohy se tím vyřídí jen tehdy, když nová
 * zakázka opravdu vznikla; záloha v prohlížeči zůstává, dokud ji nepřepíše
 * nová práce. */
async function listaZalozNovouUI() {
  const pred = ZAK;
  await novaZakazkaUI();
  if (ZAK !== pred && typeof historieSkryjListu === 'function') historieSkryjListu();
}

/* Stav varianty do přehledové tabulky (sloupec „Stav"). */
function zamekStavText(v) {
  const z = zamekInfo(v);
  if (z) return `<span class="zamek-stav zamceno" title="${esc((z.popis || '') + ' · ' + (z.kdy || '').slice(0, 10))}">🔒 odeslána</span>`;
  if (Array.isArray(v.odemceni) && v.odemceni.length)
    return `<span class="zamek-stav odemceno" title="odemkl správce – viz historie v souboru zakázky">🔓 odemčena</span>`;
  return `<span class="zamek-stav">rozpracovaná</span>`;
}
