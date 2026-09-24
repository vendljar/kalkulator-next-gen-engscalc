/* ============================================================
 * CENTRÁLNÍ ŠABLONY DOKUMENTŮ (#139, 13. 8. 2026)
 *
 * Šablony cenových nabídek (.docx) bydlí na serveru vedle platného ceníku
 * a řídí se stejnými pravidly: ZVEŘEJNIT smí jen administrátor, verze se
 * číslují po typech, historie se drží a každá verze nese otisk obsahu,
 * jméno souboru, kdo ji zveřejnil a kdy. Obchodník po přihlášení dostane
 * platnou šablonu automaticky — nikdo netiskne ze staré verze, protože
 * žádnou „svoji" verzi nemá.
 *
 * Proč vlastní modul a ne přílepek k programu (ceníku): ceník je JSON
 * s čísly a rozdílovým porovnáním; šablona je binární soubor, který se
 * porovnává otiskem. Sdílejí myšlenku, ne kód.
 *
 * REJSTŘÍK vs. SOUBORY. Rejstřík (jeden malý JSON) nese jen metadata —
 * verze, otisky, jména. Soubory leží v úložišti zvlášť pod klíčem
 * `data/<typ>/<verze>` a nikdy se nepřepisují: zveřejnění nové verze starou
 * nechává na místě, takže se dá kdykoli doložit, ze které šablony která
 * nabídka vznikla, a případně se k ní vrátit.
 *
 * REŽIM. `prisny` (výchozí): bez serverové šablony dokument nevznikne —
 * stejné pravidlo jako „bez platného ceníku není nabídka". `mekky`: výběr
 * souboru z disku je povolen jako nouzová cesta při výpadku; přepnout smí
 * jen administrátor a rejstřík si pamatuje kdo a kdy, aby tisk mimo
 * centrální šablonu nešel zapřít.
 * ============================================================ */

/* Základní typy drží krok s registrem dokumentů (dokumenty.js) a s obrazovkou
 * Nastavení → Šablony. Jazykové mutace se ukládají jako `typ_jazyk`. */
const SABLONY_ONLINE_TYPY = ['nabidka', 'nabidkaProj', 'sod', 'sodProj', 'plnaMoc'];
const SABLONY_ONLINE_JAZYKY = ['en', 'de', 'fr'];

/* Strop velikosti souboru v base64. Buffered požadavek Netlify unese 6 MB
 * a binární data cestou bobtnají o ~třetinu; 5 MB base64 (≈ 3,7 MB souboru)
 * nechává rezervu na obal JSONu. Šablona OCK má 82 kB, PROJ po zmenšení
 * fotek 550 kB — strop je tu proti omylu (nahrání souboru plného fotek
 * v plném rozlišení), ne proti běžné práci. */
const SABLONA_MAX_B64 = 5 * 1000 * 1000;

function sablonaTypPlatny(typ) {
  if (typeof typ !== 'string' || !typ) return false;
  if (SABLONY_ONLINE_TYPY.includes(typ)) return true;
  const m = /^([a-zA-Z]+)_([a-z]{2})$/.exec(typ);
  return !!(m && SABLONY_ONLINE_TYPY.includes(m[1]) && SABLONY_ONLINE_JAZYKY.includes(m[2]));
}

/* .docx je ZIP a base64 ZIPu začíná „UEsDB" (PK\x03\x04). Kontrola tady,
 * při zveřejnění — kdyby se pustilo dál třeba PDF, spadlo by generování až
 * obchodníkovi při tisku, v nejhorší možné chvíli. */
function sablonaJeDocxB64(b64) {
  return typeof b64 === 'string' && b64.indexOf('UEsDB') === 0;
}

/* Otisk obsahu (FNV-1a nad base64 textem). Není to podpis, jen rozpoznání
 * změny: stejná data = stejný otisk, a to musí platit v prohlížeči i na
 * serveru bez jediné závislosti. */
function sablonaOtisk(b64) {
  const s = String(b64 || '');
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  /* dvě kola s posunutým začátkem – 32 bitů málo, 64 se skládá ze dvou */
  let h2 = 0x811c9dc5;
  for (let i = s.length - 1; i >= 0; i--) {
    h2 ^= s.charCodeAt(i);
    h2 = Math.imul(h2, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0') + h2.toString(16).padStart(8, '0');
}

function sablonyNovyRejstrik() {
  return { verze: 1, rezim: 'prisny', rezimZmenil: '', rezimKdy: '', typy: {} };
}

/* Klíč souboru v úložišti. Verze je vždy číslo z rejstříku, typ prošel
 * sablonaTypPlatny — do klíče se tedy nedostane nic, co by cestu rozbilo. */
function sablonaKlicSouboru(typ, verze) {
  return 'data/' + typ + '/' + (+verze || 0);
}

/* Zveřejnění nové verze. Vrací NOVÝ rejstřík, nebo null, když vstup nedává
 * smysl — volající pak nic nezapíše a starý rejstřík zůstává netknutý. */
function sablonyZverejni(rej, info) {
  if (!rej || !info || !sablonaTypPlatny(info.typ)) return null;
  const nazev = String(info.nazev || '').trim();
  if (!nazev || !info.otisk) return null;
  const out = JSON.parse(JSON.stringify(rej));
  const t = out.typy[info.typ] || { platna: null, historie: [] };
  const verze = (t.platna ? t.platna.verze : 0) + 1;
  if (t.platna) t.historie.unshift(t.platna);
  t.platna = {
    verze,
    nazev,
    otisk: String(info.otisk),
    velikost: +info.velikost || 0,
    zverejnil: String(info.kdo || ''),
    kdy: String(info.kdy || ''),
    poznamka: String(info.poznamka || ''),
  };
  /* ZE KTERÉ ČESKÉ VERZE MUTACE VZNIKLA (#348, 24. 9. 2026). Otisk české
   * šablony, ze které se jazyková verze vyrobila (nebo ke které se ručně
   * doladila). Podle něj se pozná zastaralá mutace — obsahem, ne časem
   * zveřejnění. Jen u jazykových typů a jen v platném tvaru. */
  if (/_[a-z]{2}$/.test(info.typ) && sablonaOtiskPlatny(info.zdrojOtisk))
    t.platna.zdrojOtisk = info.zdrojOtisk;
  if (+info.vracenoZ > 0) t.platna.vracenoZ = +info.vracenoZ;
  out.typy[info.typ] = t;
  return out;
}

function sablonaOtiskPlatny(o) {
  return typeof o === 'string' && /^[0-9a-f]{16}$/.test(o);
}

function sablonaPlatna(rej, typ) {
  const t = rej && rej.typy && rej.typy[typ];
  return (t && t.platna) || null;
}

/* Všechny známé verze typu (platná + historie), od nejnovější. */
function sablonaVerze(rej, typ) {
  const t = rej && rej.typy && rej.typy[typ];
  if (!t) return [];
  return [t.platna].concat(t.historie || []).filter(Boolean);
}

/* STAV JAZYKOVÉ VERZE (#348, 24. 9. 2026).
 *
 * Do 24. 9. se zastaralost poznávala jen podle času: mutace zveřejněná dřív
 * než platná čeština = zastaralá. Jenže server stejný soubor podruhé
 * nezveřejní, takže mutace vyrobená ze stejné češtiny zůstala po novém
 * zveřejnění češtiny „starší" natrvalo — hláška „zastaralá" nešla odstranit.
 * Mutace teď nese otisk české verze, ze které vznikla (`zdrojOtisk`);
 * starší záznamy bez něj se posuzují postaru podle času.
 *
 * Vrací { stav: 'chybi' | 'aktualni' | 'zastarala' | 'bezZdroje',
 *         meta, zVerze, podleCasu }. */
function sablonaMutaceStav(rej, typ, lang) {
  const m = sablonaPlatna(rej, typ + '_' + lang);
  if (!m) return { stav: 'chybi', meta: null };
  const cz = sablonaPlatna(rej, typ);
  if (!cz) return { stav: 'bezZdroje', meta: m };
  if (m.zdrojOtisk) {
    const zdroj = sablonaVerze(rej, typ).find(v => v.otisk === m.zdrojOtisk);
    return { stav: m.zdrojOtisk === cz.otisk ? 'aktualni' : 'zastarala', meta: m,
             zVerze: zdroj ? zdroj.verze : null, podleCasu: false };
  }
  const a = Date.parse(cz.kdy || ''), b = Date.parse(m.kdy || '');
  return { stav: (isFinite(a) && isFinite(b) && b < a) ? 'zastarala' : 'aktualni', meta: m,
           zVerze: null, podleCasu: true };
}

/* JAZYK SOUBORU ŠABLONY (#348, 24. 9. 2026).
 *
 * 24. 9. se jako ČESKÁ šablona nabídky zveřejnil soubor „…_v11_DE.docx"
 * a aplikace nic nenamítla. Odhad jazyka z odstavců: každý odstavec dostane
 * body za typická slova a znaky každého jazyka; rozhoduje většina odstavců,
 * které se daly zařadit. Odstavce jen se symboly, čísly nebo adresou se
 * nezařadí (nemají žádný znak jazyka). Stačí to na rozlišení čeština ×
 * němčina × angličtina × francouzština v obchodním textu; nejde o obecný
 * detektor. */
const SABLONA_JAZYK_ZNAKY = {
  cz: /[ěřůťďň]/gi, de: /[äöüß]/gi, fr: /[àâçèêëîïôûœ]/gi, en: null,
};
const SABLONA_JAZYK_SLOVA = {
  cz: ['se', 'na', 'je', 've', 'pro', 'ze', 'od', 'jsou', 'nebo', 'bude', 'dle', 'při', 'této', 'není',
       'cena', 'šachty', 'dveří', 'objednatel', 'zhotovitel', 'nabídka', 'dodávka', 'montáž', 'včetně'],
  en: ['the', 'and', 'of', 'for', 'with', 'is', 'are', 'by', 'be', 'shall', 'price', 'shaft', 'offer',
       'delivery', 'including', 'customer', 'contractor', 'this', 'will'],
  de: ['und', 'der', 'die', 'das', 'mit', 'für', 'ist', 'von', 'zu', 'auf', 'den', 'dem', 'wird', 'nicht',
       'preis', 'schacht', 'angebot', 'lieferung', 'inklusive', 'auftraggeber', 'auftragnehmer'],
  fr: ['le', 'la', 'les', 'des', 'et', 'pour', 'avec', 'est', 'du', 'une', 'sur', 'sont', 'prix', 'gaine',
       'offre', 'livraison', 'compris', 'client', 'entrepreneur'],
};
function sablonaJazykOdhad(odstavce) {
  const pocty = { cz: 0, en: 0, de: 0, fr: 0 };
  let zarazeno = 0;
  (Array.isArray(odstavce) ? odstavce : []).forEach(t => {
    const text = String(t || '').replace(/\{\{[^}]*\}\}/g, ' ').toLowerCase();
    const slova = text.split(/[^a-zà-ÿěščřžýáíéůúťďňœß]+/i).filter(Boolean);
    if (!slova.length) return;
    const body = {};
    Object.keys(pocty).forEach(j => {
      const mn = new Set(SABLONA_JAZYK_SLOVA[j]);
      let b = slova.filter(w => mn.has(w)).length;
      const zn = SABLONA_JAZYK_ZNAKY[j];
      if (zn) b += 2 * ((text.match(zn) || []).length);
      body[j] = b;
    });
    const max = Math.max.apply(null, Object.values(body));
    if (max <= 0) return;
    const viteze = Object.keys(body).filter(j => body[j] === max);
    if (viteze.length !== 1) return;
    pocty[viteze[0]]++;
    zarazeno++;
  });
  let jazyk = null, podil = 0;
  Object.keys(pocty).forEach(j => { if (zarazeno && pocty[j] / zarazeno > podil) { podil = pocty[j] / zarazeno; jazyk = j; } });
  return { jazyk, podil, pocty, zarazeno };
}

/* Symboly {{…}} z odstavců šablony — seřazené, bez opakování. */
function sablonaSymboly(odstavce) {
  const mn = new Set();
  (Array.isArray(odstavce) ? odstavce : []).forEach(t => {
    String(t || '').replace(/\{\{\s*([A-Z0-9_]+)\s*\}\}/g, (_m, k) => { mn.add(k); return _m; });
  });
  return Array.from(mn).sort();
}
function sablonaSymbolyRozdil(stare, nove) {
  const a = new Set(stare || []), b = new Set(nove || []);
  return { pribylo: Array.from(b).filter(k => !a.has(k)).sort(),
           ubylo: Array.from(a).filter(k => !b.has(k)).sort() };
}

/* Přepnutí režimu. Neznámá hodnota se tiše nezapíše — vrací se rejstřík
 * beze změny, aby překlep nevypnul přísný režim. */
function sablonyRezimNastav(rej, rezim, kdo, kdy) {
  if (!rej || (rezim !== 'prisny' && rezim !== 'mekky')) return rej;
  const out = JSON.parse(JSON.stringify(rej));
  out.rezim = rezim;
  out.rezimZmenil = String(kdo || '');
  out.rezimKdy = String(kdy || '');
  return out;
}

if (typeof module !== 'undefined')
  module.exports = { sablonaOtiskPlatny, sablonaVerze, sablonaMutaceStav, sablonaJazykOdhad, sablonaSymboly,
                     sablonaSymbolyRozdil, SABLONA_JAZYK_SLOVA,
                     SABLONY_ONLINE_TYPY, SABLONY_ONLINE_JAZYKY, SABLONA_MAX_B64,
                     sablonaTypPlatny, sablonaJeDocxB64, sablonaOtisk,
                     sablonyNovyRejstrik, sablonaKlicSouboru, sablonyZverejni,
                     sablonaPlatna, sablonyRezimNastav };
