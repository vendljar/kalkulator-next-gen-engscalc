/* /api/vypocet — spočítá poslanou zakázku službou K2 (sluzba.js) STEJNÝMI
 * jádry, jaká běží v prohlížeči. Vstup: { zakazka, program }; zakázka projde
 * importZakazka (stejné migrace jako v aplikaci), program nese ceníky a
 * slevové stropy pro kontext výpočtu.
 *
 * Moduly aplikace spolu mluví přes globální jména (v prohlížeči je skládá
 * build) — na serveru je do globálních jmen naskládá lib/jadro_moduly.cjs
 * v pořadí podle build.py. Dřív si je tahala každá funkce sama vzorem
 * `const require = createRequire(import.meta.url)`; to ale bundler Netlify
 * (esbuild) neumí vystopovat, zdrojáky se do balíčku nedostaly a funkce
 * padala hned při načtení chybou 502. Podrobný rozbor je v lib/jadro_moduly.cjs. */
import { jadro, jadroChyba } from '../lib/jadro.mjs';
import { vyzadujRoli, json, hloubkaChyba } from '../lib/sdilene.mjs';
import { ZAKAZKA_VARIANT_MAX } from '../lib/zakazka_kontrola.mjs';

/* NN B239 (22. 11. 2026): strop těla (dřív žádný — PoC AZ-5: 401 variant,
 * odpověď 11 MB nad stropem odpovědi Netlify), kontrola hloubky a tvaru
 * a strop počtu variant jako u ukládání. */
export const VYPOCET_TELO_MAX = 1024 * 1024;

export default async (req) => {
  if (req.method !== 'POST')
    return json({ ok: false, chyba: 'Použijte POST s tělem { zakazka, program }.' }, 405);

  /* Přihlášení se vyžaduje od 5. 8. 2026 (bezpečnostní audit). Dosud tahle
   * cesta jako jediná nikoho nekontrolovala — kdokoli z internetu si mohl
   * nechat počítat libovolně velké zakázky na náš účet, a v odpovědi navíc
   * viděl, jak výpočet uvnitř vypadá. Aplikace ji dnes nevolá vůbec (je to
   * služba K2 pro budoucí napojení), takže tím nic nepřestává fungovat. */
  const { chyba } = await vyzadujRoli(req);
  if (chyba) return chyba;

  let JEKLY;
  try { ({ JEKLY } = await jadro()); } catch (e) { return jadroChyba(e); }

  const delka = +req.headers.get('content-length') || 0;
  if (delka > VYPOCET_TELO_MAX) return json({ ok: false, chyba: 'Vstup je příliš velký (nejvýš 1 MB).' }, 413);
  let vstup;
  try {
    const text = await req.text();
    if (text.length > VYPOCET_TELO_MAX) return json({ ok: false, chyba: 'Vstup je příliš velký (nejvýš 1 MB).' }, 413);
    vstup = JSON.parse(text);
  } catch (e) { return json({ ok: false, chyba: 'Vstup není platný JSON.' }, 400); }
  { const stop = hloubkaChyba(vstup); if (stop) return stop; }
  if (!vstup || typeof vstup !== 'object' || Array.isArray(vstup)) return json({ ok: false, chyba: 'Vstup musí být objekt JSON.' }, 400);
  if (vstup.zakazka && Array.isArray(vstup.zakazka.varianty) && vstup.zakazka.varianty.length > ZAKAZKA_VARIANT_MAX)
    return json({ ok: false, chyba: 'Zakázka má příliš mnoho variant (nejvýš ' + ZAKAZKA_VARIANT_MAX + ').' }, 400);
  try {
    const zak = globalThis.importZakazka(vstup.zakazka || {});
    const vysledek = globalThis.sluzbaVypocet(zak, vstup.program || {}, JEKLY);
    return json({ ok: true, vysledek });   // json() nese no-store a nosniff (SEC-I1)
  } catch (e) {
    /* Bez e.message (SEC-I5, #514; jako server.js B23): vnitřní text výjimky
     * jádra nepatří do odpovědi — jen do logu funkce. */
    console.error('vypocet:', e && e.message);
    return json({ ok: false, chyba: 'Vstup se nepodařilo zpracovat — zkontrolujte tvar zakázky.' }, 400);
  }
};

export const config = { path: '/api/vypocet' };
