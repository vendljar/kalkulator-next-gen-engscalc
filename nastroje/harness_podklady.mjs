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
import { existsSync, readdirSync } from 'fs';
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

/* NEJNOVĚJŠÍ VERZE PODLE ČÍSLA V NÁZVU (23. 9. 2026, harness šablony CN).
 *
 * Šablona nabídky se vydává jako `…_v7`, `…_v8`, … `…_v10`. Harness, který
 * hledá jednu napevno zapsanou verzi, ověřuje dokument, se kterým se už
 * netiskne — 22. 9. běžel nad v7/v8, zatímco na Drive platila v10. Tahle
 * funkce vezme ve složkách (KNG_PODKLADY první) soubor s NEJVYŠŠÍM číslem
 * verze. Číslo se porovnává jako číslo, ne jako text („v10" > „v9").
 *
 * `vzor` — RegExp s jednou skupinou pro číslo verze, např. /^Sablona_X_v(\d+)\.docx$/
 * `slozky` — další složky k prohledání (nepovinné) */
export function najdiNejnovejsi(vzor, slozky = []) {
  const kde = [];
  const slozka = String(process.env.KNG_PODKLADY || '').trim();
  if (slozka) kde.push(slozka);
  kde.push(...slozky);
  let nej = null;
  for (const s of kde) {
    if (!existsSync(s)) continue;
    let soubory = [];
    try { soubory = readdirSync(s); } catch (e) { continue; }
    for (const f of soubory) {
      const m = vzor.exec(f);
      if (!m) continue;
      const v = Number(m[1]);
      if (!nej || v > nej.verze) nej = { cesta: join(s, f), verze: v };
    }
    if (nej) return nej;          // první složka, ve které něco je, vyhrává (KNG_PODKLADY má přednost)
  }
  return nej;
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

/* Jednotná hláška o přeskočení. Chybějící firemní dokument není chyba
 * aplikace — ale ani „prošlo".
 *
 * VYPISUJE SE VŽDY, i v CI: přeskočená kontrola, o které se mlčí, je totéž
 * jako kontrola, která neexistuje. Právě tím se N15 osm dní skrývalo.
 *
 * VLASTNÍ NÁVRATOVÝ KÓD 4 (nález T3 revize v22.9.9, 22. 9. 2026). Do té doby
 * se končilo kódem 0, takže CI psalo „OK" a `spust_testy.sh` „✓ prošlo"
 * u harnessu, který nic neověřil — souhrn hlásil „všechny prošly", zatímco
 * pět harnessů v CI nikdy neběželo. Kód 4 obě místa počítají zvlášť jako
 * PŘESKOČENO a vypíšou proč.
 *
 * DŘÍVĚJŠÍ SELHÁNÍ SE NEZAMETE (nález T2). Harness, který před přeskočením
 * už něco zkontroloval, předá svůj stav `{ ok, fail }`: selhalo-li cokoli,
 * končí kódem 1 jako každé jiné selhání. `overit_sablony_online.mjs` tak
 * končil kódem 0 i s pěti selhanými kontrolami — přeskočení je přebilo.
 * Že harness s kontrolou před přeskočením stav opravdu předává, hlídá
 * src/test_harness_podklady.js. */
export const KOD_PRESKOCENO = 4;

export function preskoc(co, hledano, stav) {
  /* „Chybí: …" schválně — do hlášky se dosazuje šablona, složka i soubor,
   * takže jakékoli sloveso by u některého z nich mělo špatný rod. */
  console.log('PŘESKOČENO – chybí: ' + co + '.');
  console.log('Hledáno v:\n  ' + [].concat(hledano).join('\n  '));
  console.log('Tip: KNG_PODKLADY=/cesta/ke/složce node ' + basename(process.argv[1] || ''));
  const selhalo = (stav && +stav.fail > 0) ? +stav.fail : 0;
  if (selhalo) {
    console.log('ALE PŘED PŘESKOČENÍM SELHALO ' + selhalo + ' z ' + (selhalo + (+stav.ok || 0))
      + ' kontrol — harness končí jako selhání.');
    process.exit(1);
  }
  if (stav) console.log('Kontroly před přeskočením: ' + (+stav.ok || 0) + ' prošlo, 0 selhalo.');
  process.exit(KOD_PRESKOCENO);
}
