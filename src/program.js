/* ============================================================
 * DATABÁZE PROGRAMU – ceníky, ceny a náklady ve složce (_program.json)
 *
 * PROČ VZNIKLA
 * Do včerejška platil ceník, který nesl SESTAVENÝ SOUBOR aplikace:
 * DEFAULT_CENIK a DEFAULT_CENIK_PROJ byly napsané ve zdrojovém kódu a
 * změna jedné ceny znamenala zásah do zdrojáku a nové sestavení. Katalog
 * trvalých položek a slevové stropy na tom byly ještě hůř – žily jen v
 * paměti relace a přežily leda ruční export konfigurace.
 *
 * Tenhle modul přesouvá platný ceník tam, kde už leží zakázky: do složky.
 * Jeden soubor `_program.json` vedle nich nese
 *   – ceník OCK a ceník PROJ (jednotkové ceny a náklady),
 *   – katalog trvalých položek (ty jsou taky ceník, jen se přidávají ručně),
 *   – slevové stropy podle rolí a minimální marži.
 * Podtržítko na začátku jména je záměr: uloJeZakazkovySoubor() takové
 * soubory nepovažuje za zakázky, takže se program nikdy neobjeví v
 * seznamu nabídek ani v rejstříku.
 *
 * VERZE, NE PŘEPIS
 * Ceník se nepřepisuje – přibývá. Každé zveřejnění odloží dosavadní
 * platnou verzi do historie a doplní jí datum, do kdy platila. Důvod je
 * praktický: nabídka z března musí jít i v prosinci vysvětlit cenami,
 * které tehdy platily, a k tomu je potřeba mít je pořád po ruce. Historie
 * je krátká a levná (pár kB na verzi), takže se ukládá celá; strop
 * PROG_HISTORIE_MAX je jen pojistka proti nekonečnému růstu souboru.
 *
 * CO TENHLE MODUL NEDĚLÁ
 * Nesahá na varianty. Ceník zamrzlý ve variantě zůstává, jak byl – to je
 * pravidlo z #35 a platí dál. Nová verze programové databáze jen změní,
 * co je „dnešní ceník", proti kterému se varianta porovnává, a z čeho se
 * skládá nová varianta. Přepočet zůstává vědomým krokem člověka.
 *
 * Čistý model bez DOM a bez souborového API – práci se složkou dělá
 * ui/program_ui.js, protože File System Access API existuje jen v
 * prohlížeči. Díky tomu jde všechno níž otestovat v Node.
 * ============================================================ */

const PROG_SOUBOR = '_program.json';
const PROG_SCHEMA = 1;
const PROG_APLIKACE = 'Kalkulátor OCK';
const PROG_HISTORIE_MAX = 60;

/* VERZE VZORCE OTISKU (P1, nález N20, 21. 9. 2026).
 *
 * Otisk je doklad, že do uložené verze ceníku nikdo ručně nesáhl. Jenže sám
 * vzorec se od zavedení dvakrát změnil — #181 (31. 8. 2026) do něj přidal
 * zahraniční odchylky a #267 (18. 9. 2026) dodatkové texty k položkám.
 * Starší verze byly orazítkované vzorcem, který dnes neexistuje, takže se
 * přepočtený otisk NIKDY netrefí: aplikace hlásila „někdo sáhl do souboru
 * ručně" u všech 27 verzí naráz. Varování, které svítí vždycky, přestane
 * být varováním — a skutečný zásah by v něm zanikl.
 *
 * Řešení: každý záznam si nese číslo vzorce, kterým byl orazítkován, a
 * porovnává se jen se shodným. Záznam orazítkovaný starším vzorcem se
 * neoznačí za podezřelý, jen se u něj přizná, že doložit ho nejde.
 * Jednorázové přerazítkování historie by tentýž problém přineslo znovu při
 * příští změně vzorce; tohle vydrží.
 *
 *   1 = původní (jen ceníky)
 *   2 = od #181 — i zahraniční odchylky
 *   3 = od #267 — i dodatkové texty (`cenik.popisy`)
 *
 * Záznam bez čísla je z doby před touhle pojistkou, tedy vzorec 1 nebo 2 —
 * které přesně, se zpětně nepozná, proto se bere jako „neznámý". */
const PROG_OTISK_VERZE = 3;

/* Oddíly databáze. Slouží k popisu i k výběrovému načtení – kdo si chce
 * vzít ze složky jen ceník a nechat si vlastní katalog, může. */
const PROG_ODDILY = [
  { kod: 'cenik', nazev: 'Ceník OCK – jednotkové ceny a náklady' },
  { kod: 'cenikProj', nazev: 'Ceník PROJ – sazby a fixní částky projekce' },
  { kod: 'katalog', nazev: 'Katalog trvalých položek ceníku' },
  { kod: 'slevy', nazev: 'Slevové stropy podle rolí a minimální marže' },
];

function progKopie(v) { return v === undefined ? undefined : JSON.parse(JSON.stringify(v)); }

function progDnes(iso) { return String(iso || new Date().toISOString().slice(0, 10)); }
function progCas(iso) { return String(iso || new Date().toISOString()); }

/* ---------- otisk ----------------------------------------------------- */

/* Krátký otisk ceníků. Když je po ruce cenik_stari.js, počítá se přes
 * cenikOtisk() nad stejným seznamem sledovaných položek, jaký hlídá stáří
 * ceníku ve variantě – dvě různá čísla pro tutéž otázku by jen mátla.
 * Bez něj (samostatný test modulu) se použije stejná FNV-1a nad JSON. */
function progOtiskText(text) {
  let h = 0x811c9dc5;
  const s = String(text == null ? '' : text);
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return ('0000000' + h.toString(16)).slice(-8);
}

/* Záznam ceníku ve tvaru, jaký očekává cenik_stari.js: { cenik, proj:{cenik} }.
 * Díky tomu jde programová verze porovnat s ceníkem varianty beze změny
 * čehokoli v #35. */
function programData(zaznam) {
  return { cenik: (zaznam && zaznam.cenik) || {},
           proj: { cenik: (zaznam && zaznam.cenikProj) || {} } };
}

/* ROZDÍLY ZAHRANIČNÍ ŘADY MEZI DVĚMA VERZEMI (#264, 17. 9. 2026).
 *
 * `cenikRozdily()` sem nedosáhne: čte tvar `{ cenik, proj:{cenik} }`, který
 * vyrábí `programData()` — a ten klíč `zahranicni` zahodí. Zveřejnění verze,
 * která mění JEN zahraniční sazby, se pak v historii ceníku tvářilo jako
 * „nezměnila se žádná sledovaná cena". Nález V45 z 5. kola: po doplnění 24
 * zahraničních sazeb hlásilo tlačítko Rozdíly, že se nic nezměnilo.
 *
 * Je to táž díra, jakou u OTISKU zalepilo #181 — tam se `zahranicni` musela
 * přidat výslovně, protože jinak by databáze změnu odmítla zapsat jako
 * shodnou. Otisk se opravil, výpis rozdílů zůstal slepý.
 *
 * Vrací záznamy ve stejném tvaru jako `cenikRozdily()`, aby je tabulka
 * v historii uměla vykreslit beze změny. */
function programRozdilyZahr(stary, novy) {
  const A = (stary || {}).zahranicni || {}, B = (novy || {}).zahranicni || {};
  const cenyA = A.ceny || {}, cenyB = B.ceny || {};
  const jenA = A.jenZahr || {}, jenB = B.jenZahr || {};
  const popisy = {};
  if (typeof cenikSledovane === 'function')
    cenikSledovane().forEach(p => { popisy[p.cesta] = p; });
  const cesty = Object.keys(cenyA)
    .concat(Object.keys(cenyB), Object.keys(jenA), Object.keys(jenB))
    .filter((c, i, a) => a.indexOf(c) === i);
  const out = [];
  cesty.forEach(c => {
    const a = cenyA[c], b = cenyB[c];
    const jenSeZmenil = !!jenA[c] !== !!jenB[c];
    const stejna = String(a == null ? '' : a) === String(b == null ? '' : b);
    if (stejna && !jenSeZmenil) return;
    const cislo = typeof a === 'number' && typeof b === 'number';
    const p = popisy[c] || {};
    /* Přepnutí „platí jen pro zahraniční" je změna, i když se částka nehnula
     * — jinak by zmizení položky z tuzemské řady prošlo bez povšimnutí. */
    const znacka = jenSeZmenil
      ? (jenB[c] ? ' — nově jen zahraniční' : ' — už neplatí jen pro zahraniční')
      : '';
    out.push({
      cesta: c, popis: (p.popis || c) + ' (zahraniční)' + znacka,
      jed: p.jed, skupina: p.skupina, sekce: p.sekce,
      stara: a, nova: b, cislo,
      zmena: (cislo && a !== 0) ? (b - a) / a : null,
    });
  });
  return out;
}

function programOtisk(zaznam) {
  /* Otisk nese i zahraniční odchylky (#181): bez nich by zveřejnění změny,
   * která se týká JEN zahraniční řady, vypadalo jako „beze změny" a databáze
   * by ho odmítla zapsat.
   *
   * Od 18. 9. 2026 (#267) totéž pro DODATKOVÉ TEXTY k položkám. Do porovnání
   * CEN nepatří — oprava překlepu není zdražení — ale do otisku ano, jinak
   * by ji nešlo zveřejnit vůbec. Je to táž past, jen o tři měsíce později. */
  const zahr = JSON.stringify((zaznam || {}).zahranicni || {})
    + '|' + JSON.stringify(((zaznam || {}).cenik || {}).popisy || {});
  if (typeof cenikOtisk === 'function' && typeof cenikSledovane === 'function')
    return progOtiskText(cenikOtisk(programData(zaznam)) + '|' + zahr);
  return progOtiskText(JSON.stringify([(zaznam || {}).cenik, (zaznam || {}).cenikProj,
                                       (zaznam || {}).zahranicni]));
}

/* ---------- záznam jedné verze --------------------------------------- */

/* ctx = { cenik, cenikProj, zahranicni, katalog, slevy, build, kdo, poznamka, kdy, platnoOd }
 *
 * `zahranicni` = odchylky zahraniční řady ceníku OCK (#181, 31. 8. 2026):
 * `{ ceny: {cesta: hodnota}, jenZahr: {cesta: true} }`. Bydlí UVNITŘ téhož
 * záznamu jako tuzemský ceník, takže obě řady mají společné číslo verze
 * i otisk — dvě samostatná čísla by se dřív nebo později rozešla a u roční
 * staré nabídky by nešlo doložit, z jaké dvojice se počítalo. */
function programZaznam(ctx, verze) {
  ctx = ctx || {};
  const z = {
    verze: Math.max(1, Math.floor(+verze || 1)),
    platnoOd: progDnes(ctx.platnoOd),
    zapsano: progCas(ctx.kdy),
    kdo: String(ctx.kdo || ''),
    poznamka: String(ctx.poznamka || ''),
    build: String(ctx.build || ''),
    /* Runtime klíče řady (`rada`, `jenZahr`) do platného ceníku NEPATŘÍ —
     * u varianty je pokaždé znovu složí `cenikSlozRadu` z tuzemské řady
     * a tabulky odchylek. Do 21. 9. 2026 sem propadaly z ceníku varianty
     * a zveřejněná verze pak nesla `rada: "zahr"` (nález N1). Čistí se tady,
     * na jediném místě, kterým prochází zveřejnění z aplikace, ze serveru
     * i přenos ceníku souborem. */
    cenik: ((typeof cenikZverejneniOcisti === 'function')
      ? cenikZverejneniOcisti(progKopie(ctx.cenik)) : progKopie(ctx.cenik)) || {},
    cenikProj: progKopie(ctx.cenikProj) || {},
    zahranicni: (typeof cenikZahrOciste === 'function')
      ? cenikZahrOciste(ctx.zahranicni)
      : (progKopie(ctx.zahranicni) || { ceny: {}, jenZahr: {} }),
    katalog: progKopie(ctx.katalog) || null,
    slevy: progKopie(ctx.slevy) || null,
  };
  z.otisk = programOtisk(z);
  z.otiskVerze = PROG_OTISK_VERZE;
  return z;
}

function programNovy(ctx) {
  return {
    _popis: 'Databáze programu Kalkulátor OCK – platné ceníky, ceny a náklady. '
      + 'Zapisuje aplikace; ruční úpravy tohoto souboru dělejte jen s rozmyslem, '
      + 'historie verzí je jediný doklad o tom, za jaké ceny která nabídka odešla.',
    aplikace: PROG_APLIKACE,
    schema: PROG_SCHEMA,
    razitko: progCas((ctx || {}).kdy),
    platny: programZaznam(ctx, 1),
    historie: [],
  };
}

/* ---------- načtení a obrana proti poškozenému souboru ---------------- */

/* Soubor leží na sdíleném disku: může být poškozený, ručně upravený,
 * z novější verze aplikace nebo úplně cizí. Všechno, co se s databází
 * dělá, prochází tudy, aby se nikde jinde nemuselo předpokládat, že má
 * správný tvar. Nesrozumitelný soubor je výjimka, ne tichá prázdnota –
 * tiše nahradit platný ceník prázdnem je to nejhorší, co se může stát. */
function programNormalizuj(data) {
  if (typeof data === 'string') {
    try { data = JSON.parse(data); }
    catch (e) { throw new Error('Soubor databáze programu není platný JSON: ' + e.message); }
  }
  if (!data || typeof data !== 'object' || Array.isArray(data))
    throw new Error('Soubor databáze programu není platný objekt.');
  if (data.aplikace && data.aplikace !== PROG_APLIKACE)
    throw new Error('Soubor patří jiné aplikaci: ' + data.aplikace);
  if (+data.schema > PROG_SCHEMA)
    throw new Error('Soubor je z novější verze aplikace (schéma ' + data.schema
      + ', tato zná ' + PROG_SCHEMA + '). Aktualizujte kalkulátor, ať se ceník nepoškodí.');
  if (!data.platny || typeof data.platny !== 'object')
    throw new Error('Soubor neobsahuje platnou verzi ceníku.');
  if (!data.platny.cenik || typeof data.platny.cenik !== 'object')
    throw new Error('Platná verze v souboru nemá ceník OCK.');

  const zaznam = (z, i) => {
    const v = programZaznam({
      cenik: z.cenik, cenikProj: z.cenikProj, zahranicni: z.zahranicni,
      katalog: z.katalog, slevy: z.slevy,
      build: z.build, kdo: z.kdo, poznamka: z.poznamka, kdy: z.zapsano, platnoOd: z.platnoOd,
    }, z.verze || i);
    /* Otisk v souboru se přebírá, jen když sedí: přepsat ho potichu by
     * znamenalo zamlčet, že se se souborem někdo ručně přehraboval.
     *
     * POROVNÁVÁ SE JEN SE SHODNÝM VZORCEM (P1, nález N20). Záznam
     * orazítkovaný starším vzorcem dá jiný otisk vždycky, i když je
     * netknutý — hlásit u něj ruční zásah je lež. Takový záznam se označí
     * `otiskStaryVzorec` a doloží se prostě nedá; za podezřelý se ale
     * neoznačí. Poctivé „nevíme" je víc než falešné „pozor". */
    const vzorecZnamy = +z.otiskVerze === PROG_OTISK_VERZE;
    if (z.otisk && !vzorecZnamy) v.otiskStaryVzorec = z.otiskVerze ? +z.otiskVerze : 0;
    else if (z.otisk && z.otisk !== v.otisk) v.otiskNesedi = String(z.otisk);
    if (z.platnoDo) v.platnoDo = String(z.platnoDo);
    /* Počty změn jsou METADATA, ne data ceníku — `programZaznam` je proto
     * nezná a při načtení by se ztratily. Přenášejí se ručně, stejně jako
     * konec platnosti. Starší verze je nemají a mít nebudou: zpětně se
     * dopočítat dají, ale zapsat je jako by tam byly od začátku by bylo
     * dopisování historie. */
    if (z.zmeny && typeof z.zmeny === 'object') v.zmeny = {
      cr: Math.max(0, Math.floor(+z.zmeny.cr || 0)),
      zahr: Math.max(0, Math.floor(+z.zmeny.zahr || 0)),
      protiVerzi: Math.max(0, Math.floor(+z.zmeny.protiVerzi || 0)),
    };
    return v;
  };

  const out = {
    _popis: String(data._popis || ''),
    aplikace: PROG_APLIKACE,
    schema: PROG_SCHEMA,
    razitko: String(data.razitko || ''),
    platny: zaznam(data.platny, 1),
    historie: [],
  };
  delete out.platny.platnoDo;                 // platná verze konec platnosti nemá
  const h = Array.isArray(data.historie) ? data.historie : [];
  out.historie = h.filter(z => z && typeof z === 'object' && z.cenik)
    .map((z, i) => zaznam(z, i + 1))
    .sort((a, b) => b.verze - a.verze);
  return out;
}

/* ---------- nová verze ------------------------------------------------ */

/* Rozdíly proti platné verzi. Vrací se položku po položce, protože právě
 * ty se ukazují správci před zveřejněním – „ceník se změnil" bez výčtu
 * nikomu nepomůže rozhodnout, jestli je změna zamýšlená. */
function programRozdily(db, ctx) {
  const stary = (db && db.platny) || null;
  const novy = programZaznam(ctx || {}, 1);
  if (typeof cenikRozdily === 'function')
    return cenikRozdily(programData(stary), programData(novy));
  return [];
}

function progStejne(a, b) { return JSON.stringify(a === undefined ? null : a)
                                === JSON.stringify(b === undefined ? null : b); }

/* Beze změny se nová verze nezakládá. Jinak by každé kliknutí vyrobilo
 * verzi lišící se jen časem a historie by přestala něco znamenat. */
function programBezeZmeny(db, ctx) {
  const p = (db && db.platny) || null;
  if (!p) return false;
  const n = programZaznam(ctx || {}, 1);
  return p.otisk === n.otisk
    && progStejne(p.katalog, n.katalog)
    && progStejne(p.slevy, n.slevy);
}

/* Zveřejnění: dosavadní platná verze se odloží do historie s datem, do
 * kdy platila, a novou verzi dostane další pořadové číslo. Vrací NOVÝ
 * objekt, aby se při neúspěšném zápisu na disk nedalo skončit s databází
 * v paměti, která na disku není. */
function programNovaVerze(db, ctx) {
  ctx = ctx || {};
  const zaklad = db ? programNormalizuj(db) : null;
  if (!zaklad) return programNovy(ctx);
  const stary = zaklad.platny;
  const nova = programZaznam(ctx, (+stary.verze || 0) + 1);
  /* CO SE TOU VERZÍ VLASTNĚ ZMĚNILO (P1, nález N20, 21. 9. 2026).
   *
   * Historie do té doby nesla jen poznámku, kterou napsal člověk — a u verze
   * 27 stálo „17-8-1", z čehož nešlo poznat vůbec nic. Rozdíl se dal zjistit
   * leda ručním porovnáním dvou verzí. Počty se proto zapisují rovnou do
   * záznamu, a to ZVLÁŠŤ pro tuzemskou řadu a zvlášť pro zahraniční: kdyby
   * to bylo jedno číslo, právě ten případ, kdy někdo zveřejnil zahraniční
   * ceny jako tuzemské, by v něm nebyl vidět.
   *
   * Do otisku počty nevstupují — počítají se až po `programZaznam`, takže
   * otisk zůstává otiskem CEN, ne metadat. */
  nova.zmeny = {
    cr: programRozdily(zaklad, ctx).length,
    zahr: programRozdilyZahr(zaklad.platny, ctx).length,
    protiVerzi: +stary.verze || 0,
  };
  stary.platnoDo = nova.platnoOd;
  const historie = [stary].concat(zaklad.historie).slice(0, PROG_HISTORIE_MAX);
  return {
    _popis: zaklad._popis || programNovy(ctx)._popis,
    aplikace: PROG_APLIKACE,
    schema: PROG_SCHEMA,
    razitko: progCas(ctx.kdy),
    platny: nova,
    historie,
  };
}

/* ---------- dotazy nad historií --------------------------------------- */

function programVerze(db, cislo) {
  if (!db) return null;
  const c = +cislo;
  if (db.platny && +db.platny.verze === c) return db.platny;
  return (db.historie || []).find(z => +z.verze === c) || null;
}

/* Která verze platila k danému dni. Odpovídá na otázku „za jaké ceny to
 * tehdy odešlo", když varianta razítko ceníku nemá (starší zakázky). */
function programProDatum(db, iso) {
  if (!db) return null;
  const d = String(iso || '');
  if (!d) return db.platny || null;
  const vse = [db.platny].concat(db.historie || []).filter(Boolean)
    .filter(z => !z.platnoOd || z.platnoOd <= d)
    .sort((a, b) => (a.platnoOd < b.platnoOd ? 1 : a.platnoOd > b.platnoOd ? -1 : b.verze - a.verze));
  return vse[0] || null;
}

/* ---------- popisy pro UI --------------------------------------------- */

function programPocetKatalogu(zaznam) {
  const k = zaznam && zaznam.katalog;
  if (!k || !k.polozky) return 0;
  return Object.keys(k.polozky).reduce((a, s) =>
    a + (Array.isArray(k.polozky[s]) ? k.polozky[s].length : 0), 0);
}

function programPopisVerze(zaznam) {
  if (!zaznam) return '';
  const d = (typeof cenikDatumCz === 'function') ? cenikDatumCz(zaznam.platnoOd) : zaznam.platnoOd;
  let t = 'verze ' + zaznam.verze + ' od ' + d;
  if (zaznam.platnoDo) t += ' do ' + ((typeof cenikDatumCz === 'function')
    ? cenikDatumCz(zaznam.platnoDo) : zaznam.platnoDo);
  if (zaznam.kdo) t += ' · ' + zaznam.kdo;
  return t;
}

function programSouhrn(db) {
  if (!db || !db.platny) return 'databáze programu není načtená';
  const p = db.platny;
  return programPopisVerze(p) + ' · katalog ' + programPocetKatalogu(p) + ' položek'
    + ' · otisk ' + p.otisk + ' · ' + ((db.historie || []).length) + ' starších verzí';
}

/* ---------- most mezi ostrým a testovacím webem ----------
 *
 * Netlify Blobs jsou vázané na site, takže testovací web má vlastní databázi
 * a vlastní ceník. Most je soubor: v ostrém webu se platný ceník stáhne,
 * v testovacím se z něj zveřejní. Spojení mezi weby záměrně není.
 *
 * PRAVIDLO: soubor musí nést VŠECHNO, co umí přijmout zveřejnění
 * (/api/program). Do 16. 9. 2026 to neplatilo — zahraniční řada (#181,
 * 31. 8. 2026) přibyla do zveřejnění, ale do mostu se nikdy nedoplnila.
 * Test proto počítal zahraniční nabídky z výchozích cen ze sestavení
 * a nikdo nevěděl proč: soubor se tvářil kompletní a chyběl v něm jediný
 * klíč. (J. V. 16. 9. 2026: „proč se nám do zálohy neukládá zahraniční
 * ceník? z toho důvodu nám zřejmě chybí v testu.")
 *
 * Pravidlo bydlí tady, a ne v UI, schválně: soubory v src/ui/ se v Node
 * testech nenačítají, takže by šlo ověřit jen znění zápisu. Že se obě
 * strany nerozejdou znovu, hlídá test_cenik_prenos.js — porovnává tenhle
 * tvar s poli, která server z požadavku OPRAVDU čte. */
const PROG_PRENOS_TYP = 'kalkulator-cenik';
/* 1 = původní (bez zahraniční řady), 2 = od 16. 9. 2026 i se zahraniční.
 * Starší soubory se čtou dál — chybějící klíč není chyba, jen prázdno. */
const PROG_PRENOS_SCHEMA = 2;

function programPrenosData(platny) {
  if (!platny) return null;
  const p = platny;
  return {
    typ: PROG_PRENOS_TYP, schema: PROG_PRENOS_SCHEMA,
    verze: p.verze || null, platnoOd: p.platnoOd || '',
    poznamka: p.poznamka || '',
    cenik: p.cenik || {}, cenikProj: p.cenikProj || {},
    katalog: p.katalog || {}, slevy: p.slevy || {},
    zahranicni: p.zahranicni || null,
  };
}

/* Tělo pro /api/program ze souboru. Verze ceníku je celek — co je v souboru,
 * to se zveřejní; nedoplňuje se nic ze serveru, aby nevznikl míchanec části
 * ze souboru a části z databáze. Že starý soubor zahraniční řadu nepřinese,
 * proto musí být VIDĚT dopředu (programPrenosZahrPocet). */
function programPrenosZverejneni(d, poznamka, build) {
  const x = d || {};
  return {
    cenik: x.cenik, cenikProj: x.cenikProj || {},
    katalog: x.katalog || {}, slevy: x.slevy || {},
    zahranicni: x.zahranicni || null,
    poznamka: String(poznamka || ''), build: String(build || ''),
  };
}

/* Kolik zahraničních odchylek soubor nese. Ukazuje se správci PŘED
 * zveřejněním: nula u souboru staženého ze starší verze aplikace je tak
 * vidět dřív, než přepíše zahraniční ceník na cílovém webu. */
function programPrenosZahrPocet(d) {
  const z = d && d.zahranicni;
  if (!z || typeof z !== 'object') return 0;
  return Object.keys(z.ceny || {}).length + Object.keys(z.jenZahr || {}).length;
}

if (typeof module !== 'undefined')
  module.exports = { PROG_SOUBOR, PROG_SCHEMA, PROG_APLIKACE, PROG_HISTORIE_MAX, PROG_ODDILY,
    PROG_OTISK_VERZE,
    progOtiskText, programData, programRozdilyZahr, programOtisk, programZaznam, programNovy, programNormalizuj,
    programRozdily, programBezeZmeny, programNovaVerze, programVerze, programProDatum,
    programPocetKatalogu, programPopisVerze, programSouhrn,
    PROG_PRENOS_TYP, PROG_PRENOS_SCHEMA, programPrenosData, programPrenosZverejneni,
    programPrenosZahrPocet };
