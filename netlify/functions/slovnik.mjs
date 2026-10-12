/* Zveřejněný slovník překladů online (12. 10. 2026, #401, zadání J. V.:
 * „potřebuji, aby se slovník ukládal stejným způsobem jako ceník").
 *
 * GET  /api/slovnik  → { ok, db: { schema, platny: { verze, kdy, kdo, poznamka,
 *                        pocet, hesla }, historie: [ … bez hesel ] } | null }
 *                      — každý přihlášený (překládá každý, kdo tiskne nabídku)
 * POST /api/slovnik { hesla: { cz: [EN, DE, FR] }, poznamka }
 *                    → zveřejnit jako platný — JEN Administrátor
 *
 * `hesla` jsou ODCHYLKY od slovníku zabudovaného v sestavení (viz
 * src/slovnik.js, oddíl ZVEŘEJNĚNÝ SLOVNÍK). Verzování a kontrolu dělá tentýž
 * kód jako prohlížeč (slovnikHeslaKontrola, slovnikDbNovaVerze) — server ale
 * klientovi nevěří a kontroluje všechno znovu:
 *   – role z relace (ne z těla), 403 pro ostatní,
 *   – tělo musí být objekt (B131), strop velikosti 413,
 *   – hesla: objekt, klíč neprázdný ≤ 1000 znaků (zabudovaná hesla mají až 419), žádné `__proto__` /
 *     `constructor` / `prototype`, hodnota trojice textů ≤ 2000 znaků bez
 *     řídicích znaků, nejvýš 5000 hesel — jinak 400.
 * Překlady jdou do HTML náhledu i do XML Wordu; tam je escapuje `esc` /
 * `xmlEsc` (ověřuje overit_xss.mjs), tady se hlídá tvar a velikost.
 *
 * Ukládá se do úložiště `program` pod klíč `slovnik` — vedle ceníku, aby ho
 * noční otisk i ruční záloha braly s sebou (lib/zalohovani.mjs →
 * zalohaDoplnky) a obnova vracela (functions/obnova.mjs, část `slovnik`). */
import { uloziste, vyzadujRoli, json } from '../lib/sdilene.mjs';
import { jadro, jadroChyba } from '../lib/jadro.mjs';

export default async (req) => {
  try { await jadro(); } catch (e) { return jadroChyba(e); }
  const M = globalThis.SLOVNIK_MEZE;
  const s = await uloziste('program');

  if (req.method === 'GET') {
    const { chyba } = await vyzadujRoli(req);          // stačí být přihlášen
    if (chyba) return chyba;
    const db = await s.cti('slovnik');
    if (!db) return json({ ok: true, db: null });
    /* Historie jde ven bez hesel: k přehledu verzí stačí kdo, kdy a proč,
     * a obsah starých verzí nese záloha. */
    const historie = (Array.isArray(db.historie) ? db.historie : []).map(h => {
      const { hesla, ...zbytek } = h || {}; return zbytek;
    });
    return json({ ok: true, db: { schema: db.schema || 1, platny: db.platny || null, historie } });
  }
  if (req.method !== 'POST') return json({ ok: false, chyba: 'Použijte GET nebo POST.' }, 405);

  const { chyba, relace } = await vyzadujRoli(req, 'Administrátor');
  if (chyba) return chyba;
  const delka = +req.headers.get('content-length') || 0;
  if (delka > M.telo)
    return json({ ok: false, chyba: 'Slovník je příliš velký (' + Math.round(delka / 1024) + ' kB, strop '
      + Math.round(M.telo / 1024) + ' kB).' }, 413);
  let text; try { text = await req.text(); } catch (e) { return json({ ok: false, chyba: 'Vstup se nepodařilo přečíst.' }, 400); }
  if (text.length > M.telo)
    return json({ ok: false, chyba: 'Slovník je příliš velký (strop ' + Math.round(M.telo / 1024) + ' kB).' }, 413);
  let t; try { t = JSON.parse(text); } catch (e) { return json({ ok: false, chyba: 'Vstup není platný JSON.' }, 400); }
  /* Tělo JSON `null`, číslo nebo pole (B131). */
  if (!t || typeof t !== 'object' || Array.isArray(t)) return json({ ok: false, chyba: 'Vstup musí být objekt JSON.' }, 400);

  const k = globalThis.slovnikHeslaKontrola(t.hesla);
  if (!k.ok) return json({ ok: false, chyba: k.chyba }, 400);

  const db = await s.cti('slovnik');
  if (db && globalThis.slovnikBezeZmeny(db, k.hesla))
    return json({ ok: false, chyba: 'Slovník se od platné verze neliší – není co zveřejňovat.' }, 400);
  const nova = globalThis.slovnikDbNovaVerze(db, { hesla: k.hesla, kdo: relace.email,
    poznamka: typeof t.poznamka === 'string' ? t.poznamka : '' });
  await s.zapis('slovnik', nova);
  return json({ ok: true, verze: nova.platny.verze, kdy: nova.platny.kdy, pocet: nova.platny.pocet });
};
export const config = { path: '/api/slovnik' };
