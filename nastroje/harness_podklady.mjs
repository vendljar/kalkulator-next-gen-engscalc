/* PODKLADY, KTERÉ NEJSOU V REPOZITÁŘI (N15, 22. 9. 2026)
 *
 * Wordové šablony nabídek a smluv a hotová příručka obchodníka v repozitáři
 * schválně nejsou — jsou to firemní dokumenty a repozitář je veřejný.
 * Harnessy, které je potřebují, si je proto musí najít venku.
 *
 * ROADMAPA.html mezi ně od 22. 9. 2026 UŽ NEPATŘÍ: je to výstup, ne firemní
 * dokument, a skládá se v repozitáři z `roadmapa/roadmap.json`
 * a `roadmapa/sablona.html`. Sada i CI si ji před harnessy vyrobí samy
 * (`python3 roadmapa/roadmapa.py`), takže `overit_roadmapu.mjs` se přestal
 * přeskakovat. Hledání venku u něj zůstává jako záloha.
 *
 * DO 22. 9. 2026 to dělaly napevno zapsanou cestou `/home/claude/work/…`,
 * tedy cestou z cloudového prostředí, ve kterém kdysi vznikly. Jinde než tam
 * se takový harness nemohl spustit NIKDY — v nejlepším případě se přeskočil,
 * v horším spadl na `ENOENT` uprostřed běhu (`overit_sablony_online.mjs`
 * četl šablonu bez kontroly). Sedm kontrol smluv a plné moci proto neběželo
 * osm dní nikde a nikdo o tom nevěděl.
 *
 * Nově se hledá i v adresáři z proměnné `KNG_PODKLADY`. Kdo má šablony po
 * ruce, pustí celou sadu takhle:
 *
 *     KNG_PODKLADY=/cesta/k/sablonam ./spust_testy.sh --smoke
 *
 * Bez té proměnné se harness přeskočí — ale přeskočí se ŘEKNUTÍM, ne pádem,
 * a vypíše, co hledal. Staré cesty zůstávají jako druhá možnost, aby se
 * v původním prostředí nic nerozbilo; nic se nemaže.
 */
import { existsSync } from 'fs';
import { join, basename } from 'path';

/* Vrací první existující cestu, nebo null.
 *
 * `jmeno`     — název souboru, který se hledá v KNG_PODKLADY
 * `kandidati` — pole starých pevných cest (nepovinné) */
export function najdiPodklad(jmeno, kandidati = []) {
  const kde = [];
  const slozka = String(process.env.KNG_PODKLADY || '').trim();
  if (slozka) kde.push(join(slozka, jmeno));
  kde.push(...kandidati);
  return kde.find(p => existsSync(p)) || null;
}

/* Totéž pro SLOŽKU (příručka obchodníka se hledá podle vzoru jména, takže
 * harness potřebuje adresář, ne konkrétní soubor). `readdirSync` nad
 * neexistující složkou hodí ENOENT a shodí celý harness — proto se to ptá
 * napřed. */
export function najdiSlozku(kandidati = []) {
  const kde = [];
  const slozka = String(process.env.KNG_PODKLADY || '').trim();
  if (slozka) kde.push(slozka);
  kde.push(...kandidati);
  return kde.find(p => existsSync(p)) || null;
}

/* Táž otázka pro víc souborů najednou (smlouvy potřebují tři).
 * Vrací { cesty, chybi } — `chybi` je pole názvů, které se nenašly. */
export function najdiPodklady(mapa) {
  const cesty = {};
  const chybi = [];
  Object.entries(mapa).forEach(([klic, kandidati]) => {
    const jmeno = basename(kandidati[0] || klic);
    const p = najdiPodklad(jmeno, kandidati);
    if (p) cesty[klic] = p; else chybi.push(jmeno);
  });
  return { cesty, chybi };
}

/* Jednotná hláška o přeskočení. Harness ji zavolá a skončí kódem 0 —
 * chybějící firemní dokument není chyba aplikace.
 *
 * VYPISUJE SE VŽDY, i v CI: přeskočená kontrola, o které se mlčí, je totéž
 * jako kontrola, která neexistuje. Právě tím se N15 osm dní skrývalo. */
export function preskoc(co, hledano) {
  /* „Chybí: …" schválně — do hlášky se dosazuje šablona, složka i soubor,
   * takže jakékoli sloveso by u některého z nich mělo špatný rod. */
  console.log('PŘESKOČENO – chybí: ' + co + '.');
  console.log('Hledáno v:\n  ' + [].concat(hledano).join('\n  '));
  console.log('Tip: KNG_PODKLADY=/cesta/ke/složce node ' + basename(process.argv[1] || ''));
  process.exit(0);
}
