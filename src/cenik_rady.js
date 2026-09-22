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

/* ---------- výchozí NULOVÁ sazba DPH v zahraniční řadě (22. 9. 2026 večer) ----------
 *
 * J. V.: „sazba DPH se při přepnutí na zahraniční ceník nepřepíná na 0 %
 * … to by bylo optimální."
 *
 * Do té doby se sazba DPH chovala jako každá jiná cesta ceníku: bez výslovné
 * zahraniční odchylky platila tuzemská. Pole pro tu odchylku přibylo dávkou
 * N18 (v22.9.13), jenže v zveřejněném ceníku nic není — a ceník se během
 * testu nemění. Zahraniční nabídka se tak dál tiskla s českou sazbou.
 *
 * U sazby DPH proto „prázdné" v zahraniční řadě neznamená „jako v ČR", ale
 * NULU: dodávka s montáží do jiného státu se běžně fakturuje bez české daně
 * (přenesená daňová povinnost, vývoz). Výslovně zadaná sazba má přednost —
 * kdo chce i v zahraničí českou sazbu, zapíše ji do ceníku.
 *
 * VÝCHOZÍ HODNOTA SE NEUKLÁDÁ do ceníku: nemění otisk ani verzi a pojistka
 * zveřejnění (`cenikZverejneniShody`) ji nevidí. Doplňuje se jen tam, kde se
 * zahraniční řada SKLÁDÁ — přepnutí varianty, dnešní ceník pro přepočet
 * a složení řady. Všechna tři místa musí mluvit stejně: kdyby výchozí nulu
 * znalo jen přepnutí, přepočet při příštím otevření by prázdné zakázce
 * sazbu vrátil na tuzemskou (zakázkové hodnoty se u NEROZDĚLANÉ zakázky
 * z ceníku natahují, viz cenikPrepoctiRozpracovane).
 *
 * Ruční volba obchodníka se nepřepisuje (cenikChranena, #177) a u rozdělané
 * zakázky ji nemění ani přepočet (V23). */
const CENIK_ZAHR_DPH_CESTY = ['C.dph', 'PC.dph'];
function cenikZahrDphVychozi(cesta) { return CENIK_ZAHR_DPH_CESTY.indexOf(String(cesta)) >= 0; }
function cenikZahrSVychozimi(zahr) {
  const z = cenikZahrOciste(zahr);
  CENIK_ZAHR_DPH_CESTY.forEach(c => {
    if (!Object.prototype.hasOwnProperty.call(z.ceny, c)) z.ceny[c] = 0;
  });
  return z;
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
  /* Zahraniční řada včetně výchozí nulové sazby DPH (viz cenikZahrSVychozimi). */
  Object.entries(cenikZahrSVychozimi(zahr).ceny).forEach(([cesta, hodnota]) => {
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
  /* S výchozí nulovou sazbou DPH: přepnutí ji musí ukázat v dialogu
   * a provést, i když ji ceník výslovně nemá (22. 9. 2026 večer). */
  const vyslovne = cenikZahrOciste(zahr).ceny;
  const z = cenikZahrSVychozimi(zahr);
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
    /* Doplněná výchozí nula, ne odchylka zapsaná v ceníku. */
    vychozi: !Object.prototype.hasOwnProperty.call(vyslovne, cesta),
  }))
    /* Výchozí nula jen tam, kde je tuzemská sazba ZNÁMÁ. Volající, který
     * pošle holý ceník OCK (starší volání), ceník projekce nemá — bez
     * tuzemské hodnoty by se sazba projekce při návratu do tuzemska neměla
     * kam vrátit, a v dialogu by svítil rozdíl „? → 0 %". */
    .filter(r => !(r.vychozi && r.cr === undefined))
    .filter(r => r.jenZahr || String(r.cr) !== String(r.zahr));
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
  /* NÁVRAT DO TUZEMSKA BERE TUZEMSKOU ŘADU, NE SYROVÁ TUZEMSKÁ DATA (nález
   * N38 revize v22.9.9). Položka „jen pro zahraničí" má v tuzemské řadě
   * nulu (`cenikDnesniProRadu` → `cenikJenZahrVynuluj`, P4), jenže návrat
   * sem dosazoval hodnotu z ČR sloupce tak, jak v ceníku leží. Změřeno:
   * ČR 50 000 → zahraničí 60 000 → zpátky ČR 50 000, zatímco tuzemská řada
   * má 0 — a přepočet při příštím otevření pak hlásil „Změnila se 1 cena",
   * ačkoli se nic nezměnilo (výpočet řádek v tuzemsku stejně vynechá).
   * Hodnota se proto bere ze SLOŽENÉ tuzemské řady — tatáž funkce jako při
   * přepočtu, takže obě místa mluví stejně. */
  const crRada = (r === 'cr' && typeof cenikDnesniProRadu === 'function')
    ? cenikDnesniProRadu(crDnesni, zahr, 'cr') : null;
  rozdily.forEach(rd => {
    const nova = (r === 'zahr') ? rd.zahr
      : ((crRada && rd.jenZahr && typeof cenikHodnota === 'function') ? cenikHodnota(crRada, rd.cesta) : rd.cr);
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
  /* Včetně výchozí nulové sazby DPH — jinak by přepočet při otevření vrátil
   * prázdné zahraniční zakázce sazbu, kterou jí přepnutí právě vynulovalo. */
  Object.entries(cenikZahrSVychozimi(zahr).ceny).forEach(([cesta, hodnota]) => {
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

/* Sloučení zahraničních odchylek ze dvou zdrojů: z PLATNÉ VERZE a z toho,
 * co přišlo v požadavku. Příchozí přebíjí uloženou hodnotu u téže cesty.
 *
 * Proč (nález B55, audit 22. 9. 2026): pojistka zveřejnění porovnávala ČR
 * ceny výhradně proti odchylkám Z TÉHOŽ POŽADAVKU. Kdo pole `zahranicni`
 * v požadavku vynechal (starší klient, ruční volání), neměl se s čím
 * shodovat a pojistka mlčky vypadla — přitom právě tehdy je podklad
 * nejpodezřelejší. Uložené odchylky server zná vždycky. */
function cenikZahrSluc(ulozene, prichozi) {
  const a = cenikZahrOciste(ulozene), b = cenikZahrOciste(prichozi);
  const ceny = {}, jenZahr = {};
  Object.keys(a.ceny).forEach(k => { ceny[k] = a.ceny[k]; });
  Object.keys(b.ceny).forEach(k => { ceny[k] = b.ceny[k]; });
  Object.keys(a.jenZahr).forEach(k => { if (a.jenZahr[k]) jenZahr[k] = true; });
  Object.keys(b.jenZahr).forEach(k => { if (b.jenZahr[k]) jenZahr[k] = true; });
  return { ceny, jenZahr };
}

/* Položky, kde se ČR hodnota shoduje se zahraniční odchylkou.
 * `ctx` je podklad zveřejnění ({ cenik, cenikProj }) — tedy tvar, ve kterém
 * ho posílá UI i přijímá server; `cenikHodnota` chce { cenik, proj:{cenik} },
 * proto se uvnitř převádí.
 *
 * `platny` (nepovinný) je ZÁZNAM PLATNÉ VERZE ceníku. Když je po ruce,
 * nepočítají se položky, jejichž ČR cena se tímhle zveřejněním NEMĚNÍ.
 * Bez toho by sloučené odchylky uměly ceník zamknout: kdo chce zrušit víc
 * než pět odchylek naráz, by neprošel, protože by se pořád porovnával proti
 * tomu, co ruší — a zrušit je jinak než zveřejněním nejde. Cena, která
 * zůstala shodná s platnou verzí, přitom z přepnuté varianty pocházet
 * nemůže: v platném ceníku je už dnes a nikdo ji teď nezapisuje. */
function cenikZverejneniShody(ctx, zahr, platny) {
  const z = cenikZahrOciste(zahr);
  const c = ctx || {};
  const data = { cenik: c.cenik || {}, proj: { cenik: c.cenikProj || {} } };
  const stara = platny
    ? { cenik: platny.cenik || {}, proj: { cenik: platny.cenikProj || {} } } : null;
  const popisy = {};
  if (typeof cenikSledovane === 'function')
    cenikSledovane().forEach(p => { popisy[p.cesta] = p.popis; });
  return Object.keys(z.ceny).filter(cesta => {
    const ted = (typeof cenikHodnota === 'function') ? cenikHodnota(data, cesta) : undefined;
    if (ted === undefined || ted === null || ted === '') return false;
    if (String(ted) !== String(z.ceny[cesta])) return false;
    if (stara && typeof cenikHodnota === 'function') {
      const drive = cenikHodnota(stara, cesta);
      if (drive !== undefined && drive !== null && drive !== '' && String(drive) === String(ted))
        return false;                      // ČR cena se nemění — nemá odkud přijít
    }
    return true;
  }).map(cesta => ({ cesta, popis: popisy[cesta] || cesta }));
}

/* Smí se tenhle podklad zveřejnit jako TUZEMSKÝ ceník?
 * Vrací { ok, kod, duvod, shody, rada }. `kod` je pro testy a server,
 * `duvod` je česká věta pro člověka.
 *
 * `rada` se bere přednostně z varianty (UI ji zná), jinak z klíče `rada`
 * v samotném ceníku — ten tam nechal `cenikRadaPrepni`, takže i požadavek
 * poslaný mimo dialog se pozná. */
function cenikZverejneniKontrola(ctx, zahr, rada, platny) {
  const c = ctx || {};
  const r = cenikRadaPlatna(rada !== undefined && rada !== null && rada !== ''
    ? rada : (c.cenik && c.cenik.rada));
  if (r === 'zahr')
    return { ok: false, kod: 'zahr', rada: r, shody: [],
      duvod: 'Tahle varianta je přepnutá na řadu Zahraničí, takže její ceník nese '
        + 'zahraniční ceny. Zveřejněním by se dostaly do tuzemského ceníku pro všechny '
        + 'budoucí zakázky. Přepněte variantu zpět na ČR, nebo ceny zapište do zahraniční '
        + 'řady v Nastavení → Ceník.' };
  const shody = cenikZverejneniShody(c, zahr, platny);
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
                     CENIK_ZAHR_DPH_CESTY, cenikZahrDphVychozi, cenikZahrSVychozimi,
                     cenikJenZahrCesty, cenikJenZahrVynuluj,
                     cenikRadaTuzemskaData, cenikDnesniProRadu,
                     CENIK_ZVEREJNENI_SHODA_MAX, cenikZverejneniOcisti, cenikZahrSluc,
                     cenikZverejneniShody, cenikZverejneniKontrola };
