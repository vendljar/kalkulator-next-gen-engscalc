/* ============================================================
 * INTERNÍ POZNÁMKY A PŘÍLOHY K ZAKÁZCE (#37)
 *
 * Proč se dala sleva, co obchodník po telefonu slíbil, na čem se čeká,
 * kdo z investorovy strany rozhoduje. Dnes to žije v e-mailech jednoho
 * člověka a při předání zakázky kolegovi se to ztratí. Tenhle modul dává
 * těmhle větám místo přímo v zakázce, aby cestovaly spolu s ní.
 *
 * Čtyři rozhodnutí, která stojí za vysvětlení:
 *
 * 1) Poznámka patří ZAKÁZCE, ne variantě. Po odeslané (a tedy zamčené)
 *    nabídce se pokračuje klonem varianty – kdyby poznámky visely na
 *    variantě, zmizely by přesně ve chvíli, kdy jsou nejpotřebnější:
 *    když si po měsíci připomínáme, proč jsme šli s cenou dolů.
 *    Vazba na konkrétní variantu se dá zapsat do pole `varianta`, ale je
 *    to jen štítek pro filtrování, ne vlastnictví.
 *
 * 2) Zámek odeslané varianty (#34) se poznámek netýká. Zámek chrání cenu,
 *    která odešla ven. Zápisník je uvnitř firmy a musí zůstat živý –
 *    „zákazník volal, chce to o týden dřív" se dopisuje hlavně potom.
 *    Proto žádná z těchto funkcí nepatří do ZAMEK_CHRANENE.
 *
 * 3) Poznámka se maže měkce: zůstane v datech se záznamem kdo a kdy ji
 *    smazal, jen se přestane zobrazovat. Zápisník, ze kterého jde tiše
 *    vygumovat věta „tohle jsme slíbili", nikomu neposlouží jako opora
 *    při reklamaci. Obnovit se dá jedním klikem.
 *    Přílohy se naopak mažou natvrdo – nosí se v souboru zakázky jako
 *    data URL a ponechaný obsah by ten soubor nafukoval napořád. Zůstane
 *    po nich záznam bez dat (název, velikost, kdo a kdy), takže je pořád
 *    vidět, že tam něco bylo.
 *
 * 4) NIC z toho se netiskne. To je celý smysl funkce: je to místo pro
 *    věty, které zákazník vidět nemá. Žádný generátor dokumentů proto
 *    tento modul nevolá a ani nezná názvy jeho polí; hlídá to test
 *    v test_poznamky.js, který zdrojáky generátorů čte jako text.
 *
 * Stropy velikosti jsou tu kvůli souboru zakázky. Ten se posílá e-mailem
 * a otevírá v prohlížeči; sto megabajtů příloh z něj udělá něco, co se
 * nedá ani odeslat, ani načíst.
 * ============================================================ */

/* Druhy poznámky. Slouží k barevnému odlišení a filtru – nic víc na nich
 * nevisí, takže přidat další je bezpečné. `jine` je záchytný druh: cokoliv
 * neznámého (třeba poznámka ze starší verze) do něj spadne, aby se zápis
 * nikdy neztratil kvůli neznámému kódu. */
const POZN_DRUHY = [
  { kod: 'obchod',   nazev: 'Obchodní jednání' },
  { kod: 'sleva',    nazev: 'Důvod slevy' },
  { kod: 'technika', nazev: 'Technické řešení' },
  { kod: 'termin',   nazev: 'Termíny a čekání' },
  { kod: 'jine',     nazev: 'Jiné' },
];
const POZN_DRUH_VYCHOZI = 'jine';

/* 8 MB na soubor: pohodlně se do toho vejde naskenované zadání investora
 * nebo fotka ze stavby, a přitom to jednu zakázku neznečitelní.
 * 24 MB dohromady je hranice, za kterou přestává být rozumné posílat
 * zakázku e-mailem. */
const POZN_MAX_PRILOHA = 8 * 1024 * 1024;
const POZN_MAX_CELKEM = 24 * 1024 * 1024;

let _poznCitac = 0;
function poznamkyId(predpona) {
  return (predpona || 'p') + Date.now().toString(36) + (_poznCitac++).toString(36);
}

function poznamkyTed() { return new Date().toISOString(); }

/* Zajistí pole na zakázce. Volá se před každým zápisem i po importu –
 * zakázka uložená před #37 tahle pole nemá a první `push` by spadl. */
function poznamkyZajisti(zak) {
  if (!zak) return zak;
  if (!Array.isArray(zak.poznamky)) zak.poznamky = [];
  if (!Array.isArray(zak.prilohy)) zak.prilohy = [];
  if (!Array.isArray(zak.prilohySmazane)) zak.prilohySmazane = [];
  return zak;
}

function poznamkyDruhPlatny(kod) {
  return POZN_DRUHY.some(d => d.kod === kod) ? kod : POZN_DRUH_VYCHOZI;
}

function poznamkyNajdi(zak, id) {
  if (!zak || !Array.isArray(zak.poznamky) || !id) return null;
  return zak.poznamky.find(p => p.id === id) || null;
}

function poznamkyPridej(zak, text, opts) {
  if (!zak) return null;
  const o = opts || {};
  const t = (text == null) ? '' : String(text).trim();
  if (!t) return null;               // prázdný zápis není zápis
  poznamkyZajisti(zak);
  const p = {
    id: poznamkyId('pz'),
    kdy: o.kdy || poznamkyTed(),
    kdo: o.kdo || '',
    druh: poznamkyDruhPlatny(o.druh),
    text: t,
    varianta: o.varianta || null,
  };
  zak.poznamky.push(p);
  return p;
}

/* Úprava mění text, ne historii: `kdy` zůstává časem vzniku a úprava se
 * zapíše zvlášť. Jinak by šlo poznámku přepsat a tvářit se, že tak zněla
 * od začátku. Smazanou poznámku upravovat nejde – nejdřív se obnoví. */
function poznamkyUprav(zak, id, text, opts) {
  const p = poznamkyNajdi(zak, id);
  if (!p || p.smazano) return null;
  const t = (text == null) ? '' : String(text).trim();
  if (!t) return null;
  const o = opts || {};
  p.text = t;
  p.upraveno = { kdy: o.kdy || poznamkyTed(), kdo: o.kdo || '' };
  return p;
}

function poznamkySmaz(zak, id, opts) {
  const p = poznamkyNajdi(zak, id);
  if (!p || p.smazano) return null;
  const o = opts || {};
  p.smazano = { kdy: o.kdy || poznamkyTed(), kdo: o.kdo || '' };
  return p;
}

function poznamkyObnov(zak, id) {
  const p = poznamkyNajdi(zak, id);
  if (!p || !p.smazano) return null;
  delete p.smazano;
  return p;
}

/* Seznam od nejnovější: zápisník se čte odshora, poslední zpráva je ta,
 * která platí. Filtry jsou volitelné; `smazane:true` přidá i tombstony. */
function poznamkySeznam(zak, opts) {
  if (!zak || !Array.isArray(zak.poznamky)) return [];
  const o = opts || {};
  let l = zak.poznamky.filter(p => o.smazane ? true : !p.smazano);
  if (o.druh) l = l.filter(p => p.druh === o.druh);
  if (o.varianta) l = l.filter(p => p.varianta === o.varianta);
  return l.slice().sort((a, b) => (a.kdy < b.kdy ? 1 : a.kdy > b.kdy ? -1 : 0));
}

function poznamkyShrnuti(zak) {
  const prazdne = { pocet: 0, smazanych: 0, prilohy: 0, bajtu: 0, posledni: null };
  if (!zak || !Array.isArray(zak.poznamky)) return prazdne;
  const zive = poznamkySeznam(zak);
  return {
    pocet: zive.length,
    smazanych: zak.poznamky.filter(p => !!p.smazano).length,
    prilohy: prilohySeznam(zak).length,
    bajtu: prilohyVelikost(zak),
    posledni: zive.length ? zive[0] : null,
  };
}

function poznamkyDruhNazev(kod) {
  const d = POZN_DRUHY.find(x => x.kod === kod);
  return d ? d.nazev : kod || '';
}

function poznamkyDatum(kdy) {
  if (!kdy) return '';
  const d = new Date(kdy);
  if (isNaN(d.getTime())) return String(kdy);
  return d.getDate() + '. ' + (d.getMonth() + 1) + '. ' + d.getFullYear();
}

/* ---------- jedno textové pole (zadání J. V. 22. 9. 2026) ----------------
 *
 * Zápisník se scvrkl na JEDNO VOLNÉ TEXTOVÉ POLE. Druhy poznámky, měkké
 * mazání i přílohy zůstávají v datech i v modelu — starší zakázky je nesou
 * a nic se z nich nemaže —, ale obrazovka je nenabízí.
 *
 * `poznamkyPoleText` vrací to, co se má v poli ukázat:
 *   • `poznamkyText` (nové pole), jakmile do něj někdo jednou sáhl,
 *   • jinak text složený ze starých strukturovaných poznámek.
 *
 * Schválně se NIC nepřepisuje při čtení: kdyby se pole materializovalo už
 * při vykreslení, zakázka by se sama označila za změněnou, aniž by na ni
 * kdokoli sáhl — přesně ta chyba, kterou 22. 9. 2026 ráno řešily nálezy
 * N12/N13 („zakázkou hýbe i sama aplikace"). Pole vznikne až prvním
 * uživatelským zápisem, a protože se do něj předvyplní tentýž odvozený
 * text, nic se tím neztratí. */
function poznamkyPoleText(zak) {
  if (!zak) return '';
  if (typeof zak.poznamkyText === 'string') return zak.poznamkyText;
  return poznamkyText(zak);
}

function poznamkyTextNastav(zak, v) {
  if (!zak) return '';
  zak.poznamkyText = (v == null) ? '' : String(v);
  return zak.poznamkyText;
}

/* Textová podoba zápisníku – pro protokol o kalkulaci (#41) a pro schránku,
 * když se zakázka předává kolegovi. Smazané se nevypisují. */
function poznamkyText(zak) {
  const l = poznamkySeznam(zak);
  if (!l.length) return '';
  return l.map(p => {
    const kdo = p.kdo ? ', ' + p.kdo : '';
    const upr = p.upraveno ? ' (upraveno ' + poznamkyDatum(p.upraveno.kdy) + ')' : '';
    return poznamkyDatum(p.kdy) + kdo + ' – ' + poznamkyDruhNazev(p.druh) + upr + ':\n' + p.text;
  }).join('\n\n');
}

function poznamkyVelikostText(bajtu) {
  const b = Number(bajtu) || 0;
  if (b < 1024) return b + ' B';
  if (b < 1024 * 1024) return Math.round(b / 1024) + ' kB';
  return (Math.round(b / (1024 * 1024) * 10) / 10) + ' MB';
}

/* ---------- přílohy ---------- */

function prilohySeznam(zak) {
  if (!zak || !Array.isArray(zak.prilohy)) return [];
  return zak.prilohy.slice().sort((a, b) => (a.kdy < b.kdy ? 1 : a.kdy > b.kdy ? -1 : 0));
}

function prilohyVelikost(zak) {
  if (!zak || !Array.isArray(zak.prilohy)) return 0;
  return zak.prilohy.reduce((s, p) => s + (Number(p.velikost) || 0), 0);
}

/* Vrací {ok, priloha} nebo {ok:false, duvod}. Důvod je věta pro člověka,
 * ne kód – jde rovnou do červené hlášky pod tlačítkem. */
function prilohyPridej(zak, soubor, opts) {
  if (!zak) return { ok: false, duvod: 'Není otevřená zakázka.' };
  const s = soubor || {};
  const nazev = (s.nazev == null) ? '' : String(s.nazev).trim();
  if (!nazev) return { ok: false, duvod: 'Soubor nemá název.' };
  if (!s.data) return { ok: false, duvod: 'Soubor je prázdný nebo se nepodařilo načíst jeho obsah.' };
  const velikost = Number(s.velikost) || String(s.data).length;
  if (velikost > POZN_MAX_PRILOHA)
    return { ok: false, duvod: 'Soubor je příliš velký (' + poznamkyVelikostText(velikost)
      + '). Nejvýš ' + poznamkyVelikostText(POZN_MAX_PRILOHA) + ' na jeden soubor.' };
  poznamkyZajisti(zak);
  if (prilohyVelikost(zak) + velikost > POZN_MAX_CELKEM)
    return { ok: false, duvod: 'Přílohy zakázky by dohromady přesáhly '
      + poznamkyVelikostText(POZN_MAX_CELKEM) + '. Něco nejdřív odeberte.' };
  const o = opts || {};
  const p = {
    id: poznamkyId('pr'),
    nazev: nazev,
    typ: s.typ || '',
    velikost: velikost,
    data: s.data,
    kdy: o.kdy || poznamkyTed(),
    kdo: o.kdo || '',
    popis: (s.popis || o.popis || ''),
  };
  zak.prilohy.push(p);
  return { ok: true, priloha: p };
}

/* Tvrdé smazání, ale se stopou bez dat: v zakázce má zůstat vidět, že tu
 * příloha byla a kdo ji odebral, jen se nenese její obsah. */
function prilohySmaz(zak, id, opts) {
  if (!zak || !Array.isArray(zak.prilohy) || !id) return null;
  const i = zak.prilohy.findIndex(p => p.id === id);
  if (i < 0) return null;
  poznamkyZajisti(zak);
  const p = zak.prilohy.splice(i, 1)[0];
  const o = opts || {};
  zak.prilohySmazane.push({
    id: p.id, nazev: p.nazev, typ: p.typ, velikost: p.velikost,
    kdy: p.kdy, kdo: p.kdo,
    smazano: { kdy: o.kdy || poznamkyTed(), kdo: o.kdo || '' },
  });
  return p;
}

/* ---------- „změnil se JEN zápisník?" (nálezy C6 a V41, 15. 9. 2026) -------
 *
 * Čtecí zámek okna (ZAMEK_CTENI) zakazoval ukládání paušálně. Jenže zápisník
 * je ze zámku vyňatý schválně (rozhodnutí 2 nahoře) — obchodník do něj smí
 * psát i nad otevřenou zakázkou. Výsledek: text se přijal, zobrazil a při
 * dalším načtení stránky zmizel, protože ho autosave nikdy nezapsal.
 *
 * Opravou není zámek zrušit, ale rozlišit, CO se změnilo. Tahle funkce je to
 * jediné místo, kde se pravidlo „zápisník ano, výpočet ne" vyslovuje — čte ji
 * autosave i ruční uložení, aby se nemohly rozejít.
 *
 * Pozor na dvě věci, kvůli kterým je to funkce a ne dvě podmínky vedle sebe:
 *  - Neptáme se „přibyla poznámka?", ale „je zápisník JEDINÝ rozdíl?". Kdyby
 *    se spolu s poznámkou změnila i cena, uložit se to nesmí ANI TAK.
 *  - Porovnává se se stabilním pořadím klíčů. Zakázka se po načtení ze
 *    serveru skládá znovu a pořadí klíčů se může lišit; bez seřazení by
 *    vyšlo „liší se všechno" a poznámka by se zase neuložila. */
const POZN_POLE_ZAPISNIKU = ['poznamky', 'prilohy', 'prilohySmazane', 'poznamkyText'];

function poznamkyStabilne(v) {
  if (v === null || typeof v !== 'object') return JSON.stringify(v === undefined ? null : v);
  if (Array.isArray(v)) return '[' + v.map(poznamkyStabilne).join(',') + ']';
  return '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + poznamkyStabilne(v[k])).join(',') + '}';
}

function poznamkyBezZapisniku(zak) {
  if (!zak || typeof zak !== 'object') return null;
  const kopie = Object.assign({}, zak);
  POZN_POLE_ZAPISNIKU.forEach(k => { delete kopie[k]; });
  return kopie;
}

/* Vrací true, jen když se `ted` proti `ulozeno` liší VÝHRADNĚ v zápisníku.
 * Shodné objekty vracejí false — nemá se co ukládat a volající se nemá
 * čeho chytit. Nečitelný nebo chybějící vstup je taky false: u zakázky,
 * se kterou se nemám s čím porovnat, je bezpečnější neuložit. */
function poznamkyJedinaZmena(ted, ulozeno) {
  const rozbal = (x) => {
    if (x == null) return null;
    if (typeof x === 'string') { try { return JSON.parse(x); } catch (e) { return null; } }
    return (typeof x === 'object') ? x : null;
  };
  const a = rozbal(ted), b = rozbal(ulozeno);
  if (!a || !b) return false;
  if (poznamkyStabilne(a) === poznamkyStabilne(b)) return false;      // nic se nezměnilo
  return poznamkyStabilne(poznamkyBezZapisniku(a)) === poznamkyStabilne(poznamkyBezZapisniku(b));
}

if (typeof module !== 'undefined')
  module.exports = { POZN_DRUHY, POZN_DRUH_VYCHOZI, POZN_MAX_PRILOHA, POZN_MAX_CELKEM,
                     POZN_POLE_ZAPISNIKU, poznamkyJedinaZmena, poznamkyBezZapisniku,
                     poznamkyZajisti, poznamkyPridej, poznamkyUprav, poznamkySmaz, poznamkyObnov,
                     poznamkySeznam, poznamkyNajdi, poznamkyShrnuti, poznamkyText,
                     poznamkyPoleText, poznamkyTextNastav,
                     poznamkyDruhNazev, poznamkyDatum, poznamkyVelikostText,
                     prilohyPridej, prilohySmaz, prilohySeznam, prilohyVelikost };
