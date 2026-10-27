/* Matice zobrazení podle rolí online (5. 8. 2026, zadání #136).
 *
 * Proč to musí být na serveru a ne v `_DB/_nastaveni.json`: rozhodnutí „co
 * vidí obchodník a co vedoucí" je pravidlo pro celou firmu, ne nastavení
 * jednoho počítače. Složku `_DB` mapuje jen administrátor — kdyby matice
 * ležela tam, obchodník by se k ní nikdy nedostal a platila by mu výchozí,
 * tedy by přidělení práv nefungovalo. Je to přesně tentýž důvod, proč se
 * 4. 8. 2026 stěhovaly online firemní údaje; proto i stejný vzor.
 *
 * GET  /api/zobrazeni  → { ok, zobrazeni: { matice, kdo, kdy } | null } — každý přihlášený
 * POST /api/zobrazeni { matice, hesloSpravce } → uložit — JEN Administrátor
 *      s potvrzením vlastním heslem (B168, 18. 10. 2026); matice, která by
 *      administrátorovi skryla zamčený prvek (#539), → 400 kod 'adminZamek'
 *
 * Ukládá se do úložiště `program` pod klíč `zobrazeni`, aby to noční otisk
 * i ruční záloha braly s sebou jedním čtením.
 *
 * Co server vždycky udělá: přijatou matici prožene `zobrazeniOciste()` ze
 * src/zobrazeni.js — týmž kódem, jaký si očistu dělá prohlížeč. Neznámé klíče
 * (například po přejmenování prvku) tak vypadnou a prvky držené serverem
 * (`pevne`) se srazí na „nevidí", i kdyby je někdo poslal zaškrtnuté. Bez toho
 * by aplikace slibovala právo, na které vzápětí přijde od serveru 403.
 *
 * POZOR: tohle je vrstva pohodlí, ne hranice bezpečnosti. Skutečné hranice
 * (zveřejnit ceník, spravovat účty, pořídit otisk databáze) drží dál příslušné
 * funkce vlastní kontrolou role a maticí se ovlivnit nedají.
 *
 * HESLO SPRÁVCE U ZÁPISU (B168, audit 15. 10. 2026, zadání 18. 10. 2026).
 * Matice přesto řídí i serverová práva — přístup do CRM (pipedrive.mjs),
 * čtení nákladového ceníku (program.mjs), úpravy ceníku v zakázce
 * (zakazka_kontrola.mjs). Kdo získal cookie správce, by si jediným POST
 * otevřel tyhle cesty obyčejnému účtu. Zápis proto chce totéž potvrzení
 * jako citlivé akce účtů (B77): pole `hesloSpravce`, odmítnutí 401/429
 * s `kod: 'hesloSpravce'`, tentýž limit pokusů. Heslo se ověří dřív, než
 * se čte matice, a do záznamu se neukládá. */
import { uloziste, vyzadujRoli, json, potvrdHesloSpravce } from '../lib/sdilene.mjs';
import { jadro, jadroChyba } from '../lib/jadro.mjs';

export default async (req) => {
  let ZOB;
  try { ({ ZOB } = await jadro()); } catch (e) { return jadroChyba(e); }

  const s = await uloziste('program');

  if (req.method === 'GET') {
    const { chyba } = await vyzadujRoli(req);          // stačí být přihlášen
    if (chyba) return chyba;
    const z = await s.cti('zobrazeni');
    return json({ ok: true, zobrazeni: z || null });
  }
  if (req.method !== 'POST') return json({ ok: false, chyba: 'Použijte GET nebo POST.' }, 405);

  const { chyba, relace } = await vyzadujRoli(req, 'Administrátor');
  if (chyba) return chyba;
  let t; try { t = await req.json(); } catch (e) { return json({ ok: false, chyba: 'Vstup není platný JSON.' }, 400); }
  /* Tělo JSON `null`, číslo nebo pole (B131): dřív výjimka a 500. */
  if (!t || typeof t !== 'object' || Array.isArray(t)) return json({ ok: false, chyba: 'Vstup musí být objekt JSON.' }, 400);
  /* B168: matice řídí i serverová práva — jen s vlastním heslem správce. */
  { const stop = await potvrdHesloSpravce(req, relace, t.hesloSpravce); if (stop) return stop; }

  /* #539 (27. 10. 2026): sloupec Administrátor smí správci prvky skrýt, ale
   * ne ty, bez kterých by se nedostal zpět (Nastavení, Zobrazení, Uživatelé,
   * Firma, Konfigurace, zveřejnění ceníku, záloha). Matici, která je odebírá,
   * server odmítne celou — tichá oprava by klientovi zatajila, že jeho volba
   * neplatí. Očista níž je druhá pojistka (zamčené vždy true). */
  const zamcene = ZOB.zobrazeniAdminZamekPorusen(t.matice);
  if (zamcene.length)
    return json({ ok: false, kod: 'adminZamek', zamcene,
      chyba: 'Tyto prvky nelze administrátorovi skrýt (bez nich by se nedostal zpět k nastavení): '
        + zamcene.join(', ') + '.' }, 400);

  const matice = ZOB.zobrazeniOciste(t && t.matice);
  const zaznam = { matice, kdo: relace.email, kdy: new Date().toISOString() };
  await s.zapis('zobrazeni', zaznam);
  return json({ ok: true, kdy: zaznam.kdy });
};
export const config = { path: '/api/zobrazeni' };
