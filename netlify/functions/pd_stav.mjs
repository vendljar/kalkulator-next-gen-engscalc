/* Stav dealu Pipedrive u zakázky (P1, rozhodnutí J. V. 22. 10. 2026).
 *
 * GET /api/pd/stav?soubor=<jméno uložené zakázky>
 *   → { ok, nastaveno, pdStav: { status, nacteno } | null }
 *
 * Volá se při otevření zakázky. Deal id bere SERVER z uložené zakázky
 * (`pdDealId`) — prohlížeč žádné id neposílá, takže se tudy nedá procházet
 * CRM podle čísel. Vidí ho každý přihlášený, kdo vidí zakázku (právo
 * `crm.pipedrive` se nevyžaduje, původ ano). Ven jde jen stav z whitelistu
 * a čas načtení; token zůstává na serveru. Chyby API ani nenastavené
 * napojení se nehlásí — vrátí se poslední známý stav (lib/pd_stav.mjs). */
import { uloziste, json } from '../lib/sdilene.mjs';
import { jadro, jadroChyba } from '../lib/jadro.mjs';
import { pdPristup } from '../lib/pipedrive.mjs';
import { pdStavObnov } from '../lib/pd_stav.mjs';

/* Jméno souboru zakázky má tvar z uloKlicSouboru + „.json". */
const SOUBOR_TVAR = /^[A-Za-z0-9][A-Za-z0-9._-]{0,199}$/;

export default async (req) => {
  const { chyba, relace } = await pdPristup(req, { bezPrava: true });
  if (chyba) return chyba;
  if (req.method !== 'GET') return json({ ok: false, chyba: 'Použijte GET.' }, 405);
  let g;
  try { await jadro(); g = globalThis; } catch (e) { return jadroChyba(e); }

  const soubor = String(new URL(req.url).searchParams.get('soubor') || '');
  if (!SOUBOR_TVAR.test(soubor)) return json({ ok: false, chyba: 'Chybí jméno zakázky.' }, 400);
  const zak = await (await uloziste('zakazky')).cti('z/' + soubor);
  if (!zak || typeof zak !== 'object') return json({ ok: false, chyba: 'Zakázka nenalezena.' }, 404);

  const { nastaveno, pdStav } = await pdStavObnov(zak.pdDealId, relace.email);
  /* Bez záznamu v úložišti (např. zakázka obnovená ze zálohy) platí stav,
   * který nese uložená zakázka — pokud má deal. */
  const stav = pdStav || (g.ctrlPdDealIdNorm(zak.pdDealId) ? (g.pdStavNorm(zak.pdStav) || null) : null);
  return json({ ok: true, nastaveno, pdStav: stav });
};
export const config = { path: '/api/pd/stav' };
