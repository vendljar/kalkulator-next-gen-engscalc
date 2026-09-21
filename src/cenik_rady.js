/* ============================================================
 * ŘADY CENÍKU OCK — tuzemsko a zahraničí (#181, 31. 8. 2026)
 *
 * Zadání J. V.: „potřebovali bychom vytvořit paralelní zahraniční ceník pro
 * kalkulaci OCK, tzn. mít možnost na něj při kalkulaci přepnout, protože
 * některé položky mají do zahraničí jinou cenu."
 *
 * ZAHRANIČNÍ CENÍK JE TABULKA ODCHYLEK, NE DRUHÁ TABULKA.
 * Nese jen cesty, které se liší; co v něm není, se bere z tuzemského ceníku.
 * Druhá plná tabulka o třech stech řádcích by znamenala udržovat každé číslo
 * dvakrát — a při každé změně české ceny by hrozilo, že se na zahraniční
 * zapomene. Odchylek je dnes čtrnáct, ne tři sta.
 *
 * JEDNA VERZE PRO OBĚ ŘADY. Odchylky bydlí uvnitř téhož záznamu databáze
 * programu jako tuzemský ceník, takže mají společné číslo verze i otisk.
 * Dvě samostatná čísla by se dřív nebo později rozešla a u roční staré
 * nabídky by nešlo doložit, z jaké DVOJICE se počítalo.
 *
 * POLOŽKY, KTERÉ V TUZEMSKU NEJSOU (cestovní náklady a logistika, překlady
 * CZ→DE) nesou značku `jenZahr`. V tuzemské kalkulaci se nezobrazují vůbec —
 * ne že by se ukazovaly s nulou (rozhodnutí J. V. 31. 8. 2026). Značku
 * i cenu zadává administrátor v ceníku.
 *
 * KURZ JE SPOLEČNÝ pro obě řady (rozhodnutí J. V.): ceny se zadávají
 * v korunách a na eura se převádějí kurzem z ceníku, přesně jako dosud.
 * ============================================================ */

const CENIK_RADY = [
  { id: 'cr', nazev: 'ČR', popis: 'tuzemský ceník' },
  { id: 'zahr', nazev: 'Zahraničí', popis: 'zahraniční ceník' },
];

/* Neznámá hodnota = tuzemsko. Zakázka se nikdy nesmí tiše přepnout jinam. */
function cenikRadaPlatna(rada) { return String(rada) === 'zahr' ? 'zahr' : 'cr'; }
function cenikRadaNazev(rada) {
  const r = CENIK_RADY.find(x => x.id === cenikRadaPlatna(rada));
  return r ? r.nazev : 'ČR';
}
function cenikRadaPopis(rada) {
  const r = CENIK_RADY.find(x => x.id === cenikRadaPlatna(rada));
  return r ? r.popis : 'tuzemský ceník';
}

function cenikZahrPrazdny() { return { ceny: {}, jenZahr: {} }; }

/* Zahraniční odchylky, které PRÁVĚ PLATÍ — protějšek DEFAULT_CENIK.
 * Obsah se vyměňuje na místě (konfigNahradVMiste) při načtení databáze
 * programu, aby na objekt mohly držet odkaz i jiné části aplikace. */
const CENIK_ZAHR = { ceny: {}, jenZahr: {} };

/* Očista přijatých odchylek: jen známé cesty ceníku, jen čísla a texty.
 * Databáze programu leží na serveru a chodí do ní i soubor od uživatele —
 * cizí klíč by se jinak dostal až do výpočtu. */
function cenikZahrOciste(vstup) {
  const v = (vstup && typeof vstup === 'object') ? vstup : {};
  const out = cenikZahrPrazdny();
  const zname = (typeof cenikSledovane === 'function')
    ? new Set(cenikSledovane().map(p => p.cesta)) : null;
  const dovoleno = c => !zname || zname.has(c);
  Object.entries(v.ceny || {}).forEach(([c, h]) => {
    if (!dovoleno(c)) return;
    if (typeof h === 'number' && isFinite(h)) out.ceny[c] = h;
    else if (typeof h === 'string' && h.trim()) out.ceny[c] = h.trim().slice(0, 200);
  });
  Object.entries(v.jenZahr || {}).forEach(([c, b]) => { if (dovoleno(c) && b) out.jenZahr[c] = true; });
  return out;
}

function cenikZahrPrazdna(z) {
  return !z || (!Object.keys(z.ceny || {}).length && !Object.keys(z.jenZahr || {}).length);
}

/* ---------- položky, které v tuzemsku nejsou (P4, nález N6) ----------
 *
 * Sjednocuje DVA zdroje pravdy, které se do 21. 9. 2026 vyhodnocovaly každý
 * jinde: značky `jenZahr` od administrátora a pevný seznam `CENIK_JEN_ZAHR`
 * v ceníku (ten přibyl 9. 9. 2026, protože samotnou značku šlo v ceníku
 * nezaškrtnout nebo ji ztratit obnovou a položka se pak v české nabídce
 * objevila). Jádro obojí spojovalo u sebe, skládání řady jen značky —
 * a právě z té nerovnosti plynul nález N6.
 *
 * Vrací pole cest. Pevný seznam jde přidat, ne zrušit. */
function cenikJenZahrCesty(zahr) {
  const z = cenikZahrOciste(zahr);
  const out = Object.keys(z.jenZahr || {});
  if (typeof CENIK_JEN_ZAHR !== 'undefined')
    CENIK_JEN_ZAHR.forEach(c => { if (out.indexOf(c) < 0) out.push(c); });
  return out;
}

/* V TUZEMSKÉ ŘADĚ NEMÁ TAKOVÁ POLOŽKA CENU (P4, nález N6).
 *
 * Ceník verze 27 měl u překladů CZ→DE vyplněnou i ČR hodnotu. Jádro sice
 * řádek v tuzemské kalkulaci skryje, ale hodnota v datech zůstávala — a
 * odtud se dostávala do základu přirážky za ATYP a přes ni i do rezervy.
 * Po otevření a přepočtu „na ceník, který platí dnes" tak cena vyskočila,
 * aniž by přibyl jediný viditelný řádek.
 *
 * Nuluje se na jednom místě: v obou funkcích, které skládají ceník pro
 * danou řadu. Tím se srovnají i obě strany porovnání při přepočtu —
 * varianta má nulu a dnešní ceník taky, takže přepočet nemá co hlásit.
 * `null` by neprošlo: „prázdno není nula" platí pro zadání, tady jde
 * o ceníkovou sazbu, která do součtu vstupuje číslem. */
/* NULUJE SE JEN TEHDY, KDYŽ MÁ POLOŽKA CENU V ZAHRANIČNÍ TABULCE
 * (oprava 21. 9. 2026 po nezávislé revizi).
 *
 * Zahraniční řada je ŘÍDKÁ TABULKA ODCHYLEK — co v ní není, dědí se z ČR
 * sloupce. Bezpodmínečné nulování proto u položky BEZ zahraniční odchylky
 * zničilo cenu i zahraniční řadě: ČR sloupec se vynuloval, zveřejnění tu
 * nulu zapsalo do platného ceníku a každá další zahraniční varianta pak
 * počítala s nulou. Tiše, a v editoru to nešlo ani opravit — ČR pole je
 * u takové položky zašedlé s popiskem „neplatí v ČR".
 *
 * Změřeno: položka se sazbou v ČR a bez odchylky → `cr` 0, `zahr` 0.
 * S odchylkou → `zahr` drží odchylku, což je v pořádku.
 *
 * Nulování je u P4 DRUHOTNÉ opatření: má jen srovnat obě strany porovnání,
 * aby přepočet neměl co hlásit. Vlastní únik do ceny zavřel filtr v jádře
 * (`jenPocitane(rezie)` v základu přirážky za ATYP), a ten platí bez ohledu
 * na tohle. Když tedy položka zahraniční cenu nemá, je bezpečnější hodnotu
 * NECHAT: obě strany porovnání ji mají stejně, takže přepočet mlčí,
 * a zahraniční řada o cenu nepřijde. */
function cenikJenZahrVynuluj(kam, zahr) {
  if (!kam) return kam;
  const z = cenikZahrOciste(zahr);
  cenikJenZahrCesty(zahr).forEach(cesta => {
    const zahrCena = (z.ceny || {})[cesta];
    if (!(+zahrCena > 0)) return;          // bez zahraniční ceny se nenuluje
    if (typeof cenikNastavHodnotu === 'function') cenikNastavHodnotu(kam, cesta, 0);
  });
  return kam;
}

/* ---------- složení ceníku pro danou řadu ---------- */

/* Vrací KOPII tuzemského ceníku s vtisknutými odchylkami. Kopie schválně:
 * ceník varianty je od začátku samostatný, aby dohodnutá cena v jedné
 * nabídce neovlivnila ostatní. Do výsledku se přibalí `rada` a `jenZahr`,
 * takže výpočet i obrazovka poznají, s čím pracují, aniž by se jim to
 * muselo předávat zvlášť. */
function cenikSlozRadu(cr, zahr, rada) {
  const r = cenikRadaPlatna(rada);
  const zaklad = JSON.parse(JSON.stringify(cr || {}));
  const z = cenikZahrOciste(zahr);
  zaklad.rada = r;
  zaklad.jenZahr = Object.assign({}, z.jenZahr);
  if (r !== 'zahr') {
    /* Tuzemská řada: položky, které v tuzemsku nejsou, jdou na nulu — ať už
     * měl zveřejněný ceník v ČR sloupci cokoli (P4, nález N6). Obal
     * `{ cenik }` je tu proto, že `cenikNastavHodnotu` pracuje s celým
     * datovým objektem; mění se `zaklad` na místě. */
    cenikJenZahrVynuluj({ cenik: zaklad }, zahr);
    return zaklad;
  }
  Object.entries(z.ceny).forEach(([cesta, hodnota]) => {
    if (typeof cenikNastavHodnotu === 'function') cenikNastavHodnotu({ cenik: zaklad }, cesta, hodnota);
  });
  return zaklad;
}

/* Rozdíly mezi řadami pro dialog při přepnutí: [{cesta, popis, cr, zahr}].
 * Uživatel má PŘED přepnutím vidět, čeho se to dotkne — bez toho by se
 * cena zakázky změnila a nikdo by nevěděl proč. */
/* Přijímá buď HOLÝ ceník OCK (jak to bylo od #181), nebo CELÝ datový objekt
 * `{cenik, proj:{cenik}}`. Druhá varianta je nutná od 3. 9. 2026, kdy smí mít
 * zahraniční odchylku i přirážka projekce (`PC.marze`): ta bydlí v ceníku
 * PROJ, a bez něj by se při návratu do tuzemska nebylo kam vrátit. */
function cenikRadaTuzemskaData(cr) {
  if (cr && typeof cr === 'object' && cr.cenik) return cr;
  return { cenik: cr || {}, proj: { cenik: {} } };
}
function cenikRadaRozdily(cr, zahr) {
  const z = cenikZahrOciste(zahr);
  const popisy = {};
  if (typeof cenikSledovane === 'function')
    cenikSledovane().forEach(p => { popisy[p.cesta] = p.popis; });
  const data = cenikRadaTuzemskaData(cr);
  return Object.keys(z.ceny).map(cesta => ({
    cesta,
    popis: popisy[cesta] || cesta,
    cr: (typeof cenikHodnota === 'function') ? cenikHodnota(data, cesta) : undefined,
    zahr: z.ceny[cesta],
    jenZahr: !!z.jenZahr[cesta],
  })).filter(r => r.jenZahr || String(r.cr) !== String(r.zahr));
}

/* ---------- přepnutí řady u varianty ----------
 * Mění se JEN ceníkové ceny na cestách, které se mezi řadami liší. Ručních
 * přepisů v zakázce (data.prepisy) ani zakázkových hodnot (přirážka, DPH —
 * viz CENIK_ZAKAZKOVE) se přepnutí nedotkne.
 * Vrací { rada, zmen, rozdily }. */
function cenikRadaPrepni(data, crDnesni, zahr, rada) {
  const r = cenikRadaPlatna(rada);
  const out = { rada: r, zmen: 0, rozdily: [], chranene: [] };
  if (!data) return out;
  const rozdily = cenikRadaRozdily(crDnesni, zahr);
  rozdily.forEach(rd => {
    const nova = (r === 'zahr') ? rd.zahr : rd.cr;
    if (nova === undefined) return;
    /* Zakázkovou hodnotu (přirážka, DPH), kterou obchodník v TÉHLE nabídce
     * sám nastavil, přepnutí řady nepřepíše — pravidlo #177 platí i tady.
     * Od 3. 9. 2026 smí mít zahraniční odchylku i globální přirážka
     * (zadání J. V.: „pro zahraniční zakázky předvolit 40 % místo 30 %"),
     * takže tenhle případ nastane: ceník ji chce změnit, ale dohodnutá
     * marže jedné nabídky je víc než předvolba. Vypíše se v dialogu. */
    if (typeof cenikChranena === 'function' && cenikChranena(data, rd.cesta)) {
      out.chranene.push(rd);
      return;
    }
    const ted = (typeof cenikHodnota === 'function') ? cenikHodnota(data, rd.cesta) : undefined;
    if (String(ted) === String(nova)) return;
    if (typeof cenikNastavHodnotu === 'function') cenikNastavHodnotu(data, rd.cesta, nova);
    out.zmen++;
    out.rozdily.push(Object.assign({ stara: ted, nova }, rd));
  });
  data.cenikRada = r;
  if (data.cenik && typeof data.cenik === 'object') {
    data.cenik.rada = r;
    data.cenik.jenZahr = Object.assign({}, cenikZahrOciste(zahr).jenZahr);
  }
  return out;
}

/* Řada varianty. Starší zakázky pole nemají — jsou tuzemské. */
function cenikRadaVarianty(data) {
  if (!data) return 'cr';
  if (data.cenikRada) return cenikRadaPlatna(data.cenikRada);
  return cenikRadaPlatna(data.cenik && data.cenik.rada);
}

/* ---------- ceník, který pro danou variantu PRÁVĚ PLATÍ (nález V23) ----------
 *
 * Automatický přepočet při otevření zakázky porovnával variantu vždycky
 * s TUZEMSKÝM ceníkem, ať byla varianta jakákoli. U zahraniční zakázky se tím
 * každá odchylka tvářila jako zastaralá cena a přepsala se tuzemskou —
 * nabídka do Koblenz se sama podhodnotila o třetinu, přestože přepínač
 * i štítek dál hlásily „Zahraničí". UI četlo řadu správně, přepočet ne;
 * dva zdroje pravdy. Tohle je ten druhý a od 4. 9. 2026 se ptá na řadu.
 *
 * Vrací TÝŽ TVAR jako `cenikDnesniData()` — { cenik, proj: { cenik } } —,
 * takže se dá podstrčit všude, kde se dnešní ceník používá. Pro tuzemskou
 * řadu je to kopie beze změny; pro zahraniční kopie s vtisknutými odchylkami
 * (včetně `PC.*`, které bydlí v ceníku projekce — proto celý objekt, ne jen
 * ceník OCK jako v `cenikSlozRadu`). */
function cenikDnesniProRadu(dnesni, zahr, rada) {
  const zaklad = cenikRadaTuzemskaData(dnesni);
  const kopie = x => JSON.parse(JSON.stringify(x || {}));
  const out = { cenik: kopie(zaklad.cenik),
                proj: { cenik: kopie(zaklad.proj && zaklad.proj.cenik) } };
  const r = cenikRadaPlatna(rada);
  const z = cenikZahrOciste(zahr);
  out.cenik.rada = r;
  out.cenik.jenZahr = Object.assign({}, z.jenZahr);
  if (r !== 'zahr') {
    /* Táž nula jako v `cenikSlozRadu` (P4, nález N6) — a právě proto, že je
     * na obou stranách, nemá přepočet při otevření zakázky co hlásit. */
    cenikJenZahrVynuluj(out, zahr);
    return out;
  }
  Object.entries(z.ceny).forEach(([cesta, hodnota]) => {
    if (typeof cenikNastavHodnotu === 'function') cenikNastavHodnotu(out, cesta, hodnota);
  });
  return out;
}

/* ---------- pojistky zveřejnění (P1, nálezy N1/N20/N6, 21. 9. 2026) ----------
 *
 * CO SE STALO: platný ceník verze 27 měl u čtrnácti položek v ČR sloupci
 * ZAHRANIČNÍ hodnoty. Nešlo o překlep — vzniklo to cestou, kterou aplikace
 * sama nabízí:
 *
 *   1. obchodník přepne variantu na řadu Zahraničí,
 *   2. `cenikRadaPrepni` vtiskne odchylky PŘÍMO do `data.cenik` (tak to má
 *      být — varianta má jen jednu řadu a počítá se z ní),
 *   3. administrátor nad toutéž variantou klikne „Zveřejnit ceník této
 *      varianty jako platný" a `progKontext` vezme `d.cenik` jako podklad.
 *
 * Zahraniční ceny tím propadnou do TUZEMSKÉ řady pro všechny budoucí
 * zakázky. Zveřejněný ceník navíc odnese i runtime klíče `rada` a `jenZahr`,
 * které do databáze programu nepatří vůbec — u varianty je pokaždé znovu
 * skládá `cenikSlozRadu`.
 *
 * Krok 2 je správně a nemění se. Chybí zábrana v kroku 3, a ta patří sem,
 * do modelu: volá ji UI i server (`netlify/functions/program.mjs`), protože
 * server klientovi nevěří — kdyby kontrola žila jen v dialogu, stačilo by
 * poslat požadavek mimo něj. */

/* Kolik položek smí mít ČR hodnotu shodnou se zahraniční, než to začne být
 * podezřelé. Shoda u jedné dvou položek je normální (cena se prostě neliší);
 * u čtrnácti je to otisk přepnuté varianty. Pět je práh, ne pravda — proto
 * se při jeho překročení NEHÁDÁ, ale vypíšou se konkrétní položky. */
const CENIK_ZVEREJNENI_SHODA_MAX = 5;

/* Ceník připravený ke zveřejnění: bez runtime klíčů řady. Kopie, originál
 * (ceník varianty) musí zůstat, jak byl — počítá se z něj otevřená nabídka. */
function cenikZverejneniOcisti(cenik) {
  if (!cenik || typeof cenik !== 'object') return cenik;
  const k = JSON.parse(JSON.stringify(cenik));
  delete k.rada;
  delete k.jenZahr;
  return k;
}

/* Položky, kde se ČR hodnota shoduje se zahraniční odchylkou.
 * `ctx` je podklad zveřejnění ({ cenik, cenikProj }) — tedy tvar, ve kterém
 * ho posílá UI i přijímá server; `cenikHodnota` chce { cenik, proj:{cenik} },
 * proto se uvnitř převádí. */
function cenikZverejneniShody(ctx, zahr) {
  const z = cenikZahrOciste(zahr);
  const c = ctx || {};
  const data = { cenik: c.cenik || {}, proj: { cenik: c.cenikProj || {} } };
  const popisy = {};
  if (typeof cenikSledovane === 'function')
    cenikSledovane().forEach(p => { popisy[p.cesta] = p.popis; });
  return Object.keys(z.ceny).filter(cesta => {
    const ted = (typeof cenikHodnota === 'function') ? cenikHodnota(data, cesta) : undefined;
    if (ted === undefined || ted === null || ted === '') return false;
    return String(ted) === String(z.ceny[cesta]);
  }).map(cesta => ({ cesta, popis: popisy[cesta] || cesta }));
}

/* Smí se tenhle podklad zveřejnit jako TUZEMSKÝ ceník?
 * Vrací { ok, kod, duvod, shody, rada }. `kod` je pro testy a server,
 * `duvod` je česká věta pro člověka.
 *
 * `rada` se bere přednostně z varianty (UI ji zná), jinak z klíče `rada`
 * v samotném ceníku — ten tam nechal `cenikRadaPrepni`, takže i požadavek
 * poslaný mimo dialog se pozná. */
function cenikZverejneniKontrola(ctx, zahr, rada) {
  const c = ctx || {};
  const r = cenikRadaPlatna(rada !== undefined && rada !== null && rada !== ''
    ? rada : (c.cenik && c.cenik.rada));
  if (r === 'zahr')
    return { ok: false, kod: 'zahr', rada: r, shody: [],
      duvod: 'Tahle varianta je přepnutá na řadu Zahraničí, takže její ceník nese '
        + 'zahraniční ceny. Zveřejněním by se dostaly do tuzemského ceníku pro všechny '
        + 'budoucí zakázky. Přepněte variantu zpět na ČR, nebo ceny zapište do zahraniční '
        + 'řady v Nastavení → Ceník.' };
  const shody = cenikZverejneniShody(c, zahr);
  if (shody.length > CENIK_ZVEREJNENI_SHODA_MAX)
    return { ok: false, kod: 'shoda', rada: r, shody,
      duvod: 'U ' + shody.length + ' položek se tuzemská cena shoduje se zahraniční odchylkou. '
        + 'Tolik shod obvykle znamená, že podklad vznikl z varianty přepnuté na Zahraničí. '
        + 'Zkontrolujte vypsané položky; pokud je to opravdu záměr, opravte je v ceníku tak, '
        + 'aby se řady lišily, nebo zahraniční odchylku zrušte.' };
  return { ok: true, kod: '', rada: r, shody, duvod: '' };
}

if (typeof module !== 'undefined')
  module.exports = { CENIK_RADY, CENIK_ZAHR, cenikRadaPlatna, cenikRadaNazev, cenikRadaPopis,
                     cenikZahrPrazdny, cenikZahrOciste, cenikZahrPrazdna,
                     cenikSlozRadu, cenikRadaRozdily, cenikRadaPrepni, cenikRadaVarianty,
                     cenikJenZahrCesty, cenikJenZahrVynuluj,
                     cenikRadaTuzemskaData, cenikDnesniProRadu,
                     CENIK_ZVEREJNENI_SHODA_MAX, cenikZverejneniOcisti,
                     cenikZverejneniShody, cenikZverejneniKontrola };
