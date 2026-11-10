/* Vypínače zkušebních funkcí (VS #570, 10. 11. 2026).
 *
 * GET  /api/funkce → { ok, funkce: { viceSachet }, kdo, kdy } — každý přihlášený
 *      (aplikace podle toho ukáže nebo schová rozhraní víc šachet)
 * POST /api/funkce { viceSachet: true|false } → JEN Administrátor
 *
 * Výchozí stav je VYPNUTO. Server vypínač zná a s vypnutým odmítne každou
 * změnu šachtové části zakázky (uloVsProblemy v src/uloziste.js, R21), takže
 * zakázka s víc šachtami na ostrém nevznikne, ani kdyby prohlížeč někdo obešel. */
import { uloziste, vyzadujRoli, json, hloubkaChyba } from '../lib/sdilene.mjs';
import { FUNKCE_KLIC, funkceCti, funkceOciste } from '../lib/funkce.mjs';

export default async (req) => {
  const s = await uloziste('program');
  if (req.method === 'GET') {
    const { chyba } = await vyzadujRoli(req);
    if (chyba) return chyba;
    let zaznam = null;
    try { zaznam = await s.cti(FUNKCE_KLIC); } catch (e) { zaznam = null; }
    return json({ ok: true, funkce: await funkceCti(s),
      kdo: zaznam && typeof zaznam.kdo === 'string' ? zaznam.kdo : '', kdy: zaznam && typeof zaznam.kdy === 'string' ? zaznam.kdy : '' });
  }
  if (req.method !== 'POST') return json({ ok: false, chyba: 'Použijte GET nebo POST.' }, 405);
  const { chyba, relace } = await vyzadujRoli(req, 'Administrátor');
  if (chyba) return chyba;
  let t; try { t = await req.json(); } catch (e) { return json({ ok: false, chyba: 'Vstup není platný JSON.' }, 400); }
  { const stop = hloubkaChyba(t); if (stop) return stop; }
  if (!t || typeof t !== 'object' || Array.isArray(t)) return json({ ok: false, chyba: 'Vstup musí být objekt JSON.' }, 400);
  if (typeof t.viceSachet !== 'boolean') return json({ ok: false, chyba: 'Vypínač viceSachet musí být true nebo false.' }, 400);
  const funkce = funkceOciste(Object.assign(await funkceCti(s), { viceSachet: t.viceSachet }));
  const zaznam = Object.assign({}, funkce, { kdo: relace.email, kdy: new Date().toISOString() });
  await s.zapis(FUNKCE_KLIC, zaznam);
  return json({ ok: true, funkce, kdo: zaznam.kdo, kdy: zaznam.kdy });
};
export const config = { path: '/api/funkce' };
