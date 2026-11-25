/* ============================================================
 * ZPRACOVATEL NABÍDKY (#146)
 *
 * Zadání z 5. 8. 2026: „V cenové nabídce se musí zobrazovat jméno a kontaktní
 * údaje obchodníka = Obchodního technika, která nabídku tvořil. Jedná se
 * o uživatele.“
 *
 * Do té doby měla aplikace jedinou firemní sadu údajů (Nastavení → Firma →
 * Zpracovatel nabídky) a v šabloně byl navíc jeden kolega vepsaný natvrdo
 * i s zapečeným skenem podpisu. Nabídku ale dělá ten, kdo je přihlášený.
 *
 * Modul je schválně tenký: bere profil z ONLINE_STAV.ja (ten se plní při
 * přihlášení a mění v okně Můj profil) a překládá ho na symboly {{ZPRAC_…}}
 * pro šablonu. Nic si nepamatuje – jediný zdroj pravdy je přihlášení.
 *
 * Firemní záloha z Nastavení → Firma SKONČILA 19. 8. 2026 (zadání J. V.);
 * bez přihlášení zůstává blok „Vypracoval" prázdný — dokumenty stejně
 * vznikají výhradně přihlášené (online databáze je jediná, #150).
 * ============================================================ */

/* Profil přihlášeného uživatele, nebo null. ONLINE_STAV existuje jen
 * v prohlížeči – v Node testech a v generátorech se sem prostě nedostaneme. */
function zpracovatelAktualni() {
  const j = (typeof ONLINE_STAV !== 'undefined' && ONLINE_STAV && ONLINE_STAV.ja) || null;
  if (!j || !j.email) return null;
  const t = x => String(x == null ? '' : x).trim();
  return { email: t(j.email), jmeno: t(j.jmeno), titul: t(j.titul),
           funkce: t(j.funkce), telefon: t(j.telefon), podpis: t(j.podpis) };
}

/* „Ing. Jan Novák“ – titul před jménem, jak si ho uživatel zadal.
 * Účet bez jména (založí se e-mailem) vrací prázdno; volající pak sáhne
 * po firemním údaji, protože e-mailová adresa v patičce nabídky vypadá
 * jako chyba, ne jako podpis. */
function zpracovatelJmeno(z) {
  if (!z) return '';
  return [z.titul, z.jmeno].filter(Boolean).join(' ').trim();
}

/* Symboly do šablony. Od 19. 8. 2026 (zadání J. V.: „měla by se vždy
 * vyplňovat podle uživatele, který zpracovává nabídku") je JEDINÝM zdrojem
 * přihlášený uživatel — firemní záloha z Nastavení → Firma skončila spolu
 * se sekcí „Zpracovatel nabídky" (dávalo smysl, dokud aplikace uživatele
 * neznala; dnes je online databáze jediná a dokumenty vznikají přihlášené).
 * FIRMA_ZPRACOVAL* se vyplňují VŽDY (i prázdné) — starší šablony (v5, v6)
 * je mají v bloku „Vypracoval" a nesmí v nich zůstat viset stará osoba ani
 * syrový symbol {{…}}. Parametr f zůstává kvůli volajícím, už se nečte. */
/* #665 (rozhodnutí J. V. 18. 11. 2026): blok „Vypracoval" odeslané nabídky
 * je ZMRAZENÝ — snímek zpracovatele v zámku (`zamek.zpracovatel`, píše ho
 * server z relace při prvním přijetí zámku, drží ho jako `kdo`). Dotisk
 * zamčené varianty tiskne člověka z doby odeslání, ne dnes přihlášený účet
 * (dřív: po opravě jména v účtu nové jméno, dotisk kolegou jeho jméno).
 * Zámek bez snímku (starší) a nezamčená varianta → přihlášený jako dřív. */
function zpracovatelZeZamku(varianta) {
  const z = varianta && varianta.zamek;
  const s = z && z.zamceno && z.zpracovatel;
  if (!s || typeof s !== 'object' || Array.isArray(s)) return null;
  const t = x => String(x == null ? '' : x).trim();
  const otisk = /^[0-9a-f]{32}$/.test(String(s.podpisOtisk || '')) ? s.podpisOtisk : '';
  return { email: t(s.email), jmeno: t(s.jmeno), titul: t(s.titul), funkce: t(s.funkce), telefon: t(s.telefon), podpis: '', podpisOtisk: otisk };
}

/* #665 (RJ, rozhodnutí J. V. 22. 11. 2026): sken podpisu PŮVODNÍHO zpracovatele
 * odeslané nabídky. Server ho při prvním přijetí zámku zmrazil (kopie v úložišti
 * podpisů, ve snímku zámku jen `podpisOtisk`); prohlížeč si kopii načte
 * (zpracovatelPodpisPriprav) a drží ji tady podle otisku. Tisk je synchronní,
 * proto se kopie připravuje předem: při otevření zakázky a před Wordem. */
const ZPRAC_PODPISY_ZAMKU = new Map();   // otisk → data URL
function zpracovatelPodpisZamkuUloz(otisk, obrazek) {
  if (/^[0-9a-f]{32}$/.test(String(otisk || '')) && /^data:image\/(png|jpeg);base64,/.test(String(obrazek || '')))
    ZPRAC_PODPISY_ZAMKU.set(otisk, obrazek);
}
/* Načte chybějící kopie pro zamčené varianty zakázky. `nacti(variantaId)` →
 * Promise s { obrazek } (v prohlížeči GET /api/zakazky?soubor=…&podpisZamku=…).
 * Vrací Promise s počtem nově načtených; chyba čtení nic nezastaví (tisk pak
 * jako u zámku bez kopie: podpis jen téhož člověka). */
function zpracovatelPodpisPriprav(zak, nacti) {
  if (typeof nacti !== 'function' || !zak || !Array.isArray(zak.varianty)) return Promise.resolve(0);
  const chybi = zak.varianty.map(v => ({ v, s: zpracovatelZeZamku(v) }))
    .filter(x => x.s && x.s.podpisOtisk && !ZPRAC_PODPISY_ZAMKU.has(x.s.podpisOtisk));
  return Promise.all(chybi.map(x => Promise.resolve().then(() => nacti(x.v.id))
    .then(o => { if (o && o.obrazek) zpracovatelPodpisZamkuUloz(x.s.podpisOtisk, o.obrazek); return ZPRAC_PODPISY_ZAMKU.has(x.s.podpisOtisk) ? 1 : 0; })
    .catch(() => 0))).then(n => n.reduce((a, b) => a + b, 0));
}
function zpracovatelPlaceholders(f, varianta) {
  const z = zpracovatelZeZamku(varianta) || zpracovatelAktualni();
  const p = {
    ZPRAC_JMENO: zpracovatelJmeno(z),
    ZPRAC_FUNKCE: (z && z.funkce) || '',
    ZPRAC_TEL: (z && z.telefon) || '',
    ZPRAC_EMAIL: (z && z.email) || '',
  };
  p.FIRMA_ZPRACOVAL = p.ZPRAC_JMENO;
  p.FIRMA_ZPRACOVAL_TEL = p.ZPRAC_TEL;
  p.FIRMA_ZPRACOVAL_EMAIL = p.ZPRAC_EMAIL;
  return p;
}

/* Obrázky do šablony – zatím jediný: sken podpisu s razítkem. Předává se jako
 * data URL, přesně v té podobě, v jaké ho prohlížeč vyrobil při nahrání
 * a v jaké leží na serveru. Kdo podpis nahraný nemá, nabídka se vygeneruje
 * bez něj (a rámeček v šabloně se odstraní – viz docxgen.js). */
/* #665: u zamčené varianty se snímkem jen podpis TÉHOŽ člověka (shoda
 * e-mailu) — pod cizí jméno se sken přihlášeného kolegy nevloží.
 * RJ (J. V. 22. 11. 2026): přednost má zmrazený sken PŮVODNÍHO zpracovatele
 * ze snímku zámku (podpisOtisk → načtená kopie) — Word i online tisk, i když
 * tiskne kolega. Bez kopie (starší zámek, nenačteno) jako dřív. */
function zpracovatelObrazky(varianta) {
  const z = zpracovatelAktualni();
  const s = zpracovatelZeZamku(varianta);
  if (s && s.podpisOtisk && ZPRAC_PODPISY_ZAMKU.has(s.podpisOtisk)) return { ZPRAC_PODPIS: ZPRAC_PODPISY_ZAMKU.get(s.podpisOtisk) };
  if (s && (!z || String(z.email).toLowerCase() !== String(s.email).toLowerCase())) return {};
  return z && z.podpis ? { ZPRAC_PODPIS: z.podpis } : {};
}

/* K56-I2 (rozhodnutí J. V. 24. 11. 2026): snímek zpracovatele ze zámku (#665,
 * RJ — jméno, kontakty i sken podpisu z prvního odeslání) platí JEN pro
 * cenovou nabídku (CN OCK i PROJ). Smlouva o dílo (OCK i PROJ) a objednávka
 * PROJ („Vystavil") nesou toho, kdo dokument PRÁVĚ TISKNE — přihlášeného
 * zpracovatele, jako před #665. Buildery smluv a objednávky stojí nad
 * nabidkaData / nabidkaProjData, proto se ZPRAC_*, FIRMA_ZPRACOVAL* a sken
 * podpisu v jejich datech přepíšou tady (bez varianty = aktuální uživatel). */
function zpracovatelTiskneDoklad(d) {
  if (!d || typeof d !== 'object') return d;
  /* PD2 #771 V1, V2 platí jen pro cenovou nabídku — smlouva o dílo a objednávka
   * PROJ (data převzatá z nabídky) popisky nemažou. */
  delete d.odstavceTextPryc;
  if (d.placeholders) Object.assign(d.placeholders, zpracovatelPlaceholders(null));
  if (d.obrazky && typeof d.obrazky === 'object') {
    delete d.obrazky.ZPRAC_PODPIS;
    Object.assign(d.obrazky, zpracovatelObrazky());
  }
  return d;
}

/* ---------- předvyplnění krycího listu ----------
 * Krycí list má pole „Jméno obchodníka“ a „Nabídku vypracoval“. Dřív se braly
 * z Nastavení → Firma, protože aplikace přihlášeného uživatele neznala.
 * Dnes ho zná, takže krycí list ukazuje téhož člověka jako nabídka –
 * ruční přepis samozřejmě zůstává (↺ vrátí automatiku). */
function zpracovatelJmenoProKryci(f) {
  return zpracovatelJmeno(zpracovatelAktualni());
}
function zpracovatelKontaktProKryci(f) {
  const p = zpracovatelPlaceholders(f);
  return [p.ZPRAC_JMENO, p.ZPRAC_TEL, p.ZPRAC_EMAIL].filter(Boolean).join(', ');
}

if (typeof module !== 'undefined')
  module.exports = { zpracovatelAktualni, zpracovatelJmeno, zpracovatelPlaceholders, zpracovatelZeZamku, zpracovatelTiskneDoklad,
    zpracovatelPodpisPriprav, zpracovatelPodpisZamkuUloz, ZPRAC_PODPISY_ZAMKU,
    zpracovatelObrazky, zpracovatelJmenoProKryci, zpracovatelKontaktProKryci };
