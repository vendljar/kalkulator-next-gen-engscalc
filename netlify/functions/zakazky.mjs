/* Zakázky online — jedna zakázka = jeden záznam, vedle rejstřík (stejný model
 * jako složka: uloziste.js dodává jména souborů i rejstřík — žádná druhá pravda).
 * GET  /api/zakazky            → { rejstrik }            — přihlášení
 * GET  /api/zakazky?soubor=X   → { zakazka }             — přihlášení
 * POST /api/zakazky { zakazka } → uloží + přestaví rejstřík — přihlášení
 *   Pojistka zámku: uzamčená (odeslaná) nabídka se nikdy nepřepíše —
 *   stejná kontrola jako ve složce (uloKontrolaZamku není v modelu, ale
 *   zámky hlídá porovnání razítek: server odmítne zápis, který by změnil
 *   variantu zamčenou v uložené verzi). */
import { uloziste, vyzadujRoli, json, serverVerze } from '../lib/sdilene.mjs';
import { jadro, jadroChyba } from '../lib/jadro.mjs';
import { zakazkaPrijmi, zakazkaServerKontrola, ZAKAZKA_MAX_B } from '../lib/zakazka_kontrola.mjs';

export default async (req) => {
  let ULO, SCHV, JEKLY;
  try { ({ ULO, SCHV, JEKLY } = await jadro()); } catch (e) { return jadroChyba(e); }

  const { chyba, relace } = await vyzadujRoli(req);
  if (chyba) return chyba;
  const s = await uloziste('zakazky');
  const url = new URL(req.url);

  if (req.method === 'GET') {
    const soubor = url.searchParams.get('soubor');
    if (!soubor) {
      const rejstrik = await s.cti('_rejstrik');
      return json({ ok: true, rejstrik: rejstrik || { schema: 1, zakazky: [] } });
    }
    const zak = await s.cti('z/' + soubor);
    return zak ? json({ ok: true, zakazka: zak })
               : json({ ok: false, chyba: 'Zakázka nenalezena: ' + soubor }, 404);
  }
  /* DELETE /api/zakazky?soubor=X — SMAZÁNÍ ZAKÁZKY (21. 8. 2026, zadání J. V.
   * „přidej možnost hromadného vybírání a mazání pro administrátora").
   *
   * Do té doby se online zakázky nemazaly vůbec — schválně, protože smazaná
   * kalkulace je pryč i s historií cen. Teď to jde, ale jen ADMINISTRÁTOROVI
   * a s dvěma pojistkami:
   *   1) hromadné mazání dělá klient po jedné zakázce, takže když jedna
   *      selže, ostatní se tím nezruší a je vidět která;
   *   2) zakázka s UZAMČENOU (odeslanou) nabídkou se smaže jen s výslovným
   *      `ismazatOdeslane=1` — vytištěná nabídka je doklad, ne pracovní
   *      soubor, a smazat ji musí být vědomé rozhodnutí, ne přehlédnutí.
   * Rejstřík se opravuje ve stejném kroku, aby v seznamu nezůstal sirotek. */
  if (req.method === 'DELETE') {
    if (relace.role !== 'Administrátor')
      return json({ ok: false, chyba: 'Mazat zakázky smí jen administrátor.' }, 403);
    const soubor = url.searchParams.get('soubor');
    if (!soubor) return json({ ok: false, chyba: 'Chybí jméno zakázky.' }, 400);
    const zak = await s.cti('z/' + soubor);
    if (zak) {
      const zamcenych = (zak.varianty || [])
        .filter(v => globalThis.variantaUzamcena && globalThis.variantaUzamcena(v)).length;
      if (zamcenych && url.searchParams.get('ismazatOdeslane') !== '1')
        return json({ ok: false, zamcenych,
          chyba: 'Zakázka obsahuje ' + zamcenych + ' odeslanou (uzamčenou) nabídku. '
            + 'Smazání je potřeba potvrdit zvlášť.' }, 409);
      await s.smaz('z/' + soubor);
    }
    const rej = (await s.cti('_rejstrik')) || { schema: 1, zakazky: [] };
    const zbytek = ULO.uloRejstrikOdeber(Array.isArray(rej.zakazky) ? rej.zakazky : [], soubor);
    await s.zapis('_rejstrik', { schema: 1, zakazky: ULO.uloRejstrikSerad(zbytek),
                                 kdo: relace.email, upraveno: new Date().toISOString() });
    return json({ ok: true, soubor, existovala: !!zak });
  }

  if (req.method !== 'POST') return json({ ok: false, chyba: 'Použijte GET, POST nebo DELETE.' }, 405);

  /* Strop velikosti (audit 22. 8. 2026, B14): zakázka má řádově desítky
   * kilobajtů, s přílohami stovky. 4 MB je pojistka proti zaplnění úložiště
   * a proti holé 502 při překročení limitu Blobs — ne provozní hranice. */
  const delka = +req.headers.get('content-length') || 0;
  if (delka > ZAKAZKA_MAX_B)
    return json({ ok: false, chyba: 'Zakázka je příliš velká (' + Math.round(delka / 1024) + ' kB, strop '
      + Math.round(ZAKAZKA_MAX_B / 1024) + ' kB). Zmenšete přílohy.' }, 413);
  let t; try { t = await req.json(); } catch (e) { return json({ ok: false, chyba: 'Vstup není platný JSON.' }, 400); }
  if (JSON.stringify(t).length > ZAKAZKA_MAX_B)
    return json({ ok: false, chyba: 'Zakázka je příliš velká. Zmenšete přílohy.' }, 413);

  /* POJISTKY ZAKÁZKY STOJÍ V lib/zakazka_kontrola.mjs (P4 / B72, 25. 9. 2026)
   * a volá je i obnova ze zálohy — dvě kopie by se rozešly (a rozešly).
   * Tady zůstává jen to, co je vlastní ukládání z prohlížeče: strop
   * velikosti, razítko verze proti souběhu (B10), zápis a rejstřík. */
  const prijem = zakazkaPrijmi(t.zakazka, ULO);
  if (!prijem.ok) return json({ ok: false, chyba: prijem.chyba }, prijem.status);
  const { zak, jmeno } = prijem;
  const stara = await s.cti('z/' + jmeno);

  /* Razítko verze (audit 22. 8. 2026, B10). Klient posílá razítko verze, ze
   * které vyšel (`ocekavaneRazitko`). Když v databázi leží jiná verze —
   * kolega mezitím uložil, nebo jde o cizí zakázku pod stejným číslem — server
   * odmítne 409 a nic nepřepíše. Vědomé přepsání jde s `prepsat: true`
   * (klient se zeptá). Starší klient bez pole posílá undefined: pak se
   * kontrola neuplatní, aby nasazení nezastavilo rozdělanou práci. */
  if (stara && typeof t.ocekavaneRazitko === 'string' && t.prepsat !== true) {
    const kol = ULO.uloKolize(stara, t.ocekavaneRazitko);
    if (kol.kolize)
      return json({ ok: false, kolize: true, naDisku: kol.naDisku,
        kdo: stara.upravil || stara.autor || '',
        chyba: t.ocekavaneRazitko
          ? 'Zakázku mezitím uložil ' + (stara.upravil || 'někdo jiný') + '. Načtěte ji znovu, nebo změny vědomě přepište.'
          : 'Stejné číslo nabídky už používá uložená zakázka ' + jmeno + ' (' + (stara.autor || '') + '). Zvolte vlastní číslo, nebo ji vědomě přepište.' }, 409);
  }

  const prog = await (await uloziste('program')).cti('db');
  const slevyNast = (prog && prog.platny && prog.platny.slevy) || {};
  const kontrola = zakazkaServerKontrola(stara, zak, relace,
    { ULO, SCHV, JEKLY, slevyNast, verzeServeru: serverVerze(), rezim: 'ulozeni' });
  if (!kontrola.ok) return json({ ok: false, chyba: kontrola.chyba }, kontrola.status);
  const sporne = kontrola.sporne;

  const razitko = ULO.uloRazitkoNove();
  zak.uloRazitko = razitko;
  await s.zapis('z/' + jmeno, zak);
  const rejstrik = (await s.cti('_rejstrik')) || { schema: 1, zakazky: [] };
  /* Doplnění jmen obchodníků u STARŠÍCH záznamů (21. 8. 2026 večer).
   *
   * První verze uměla doplnit jen jméno právě přihlášeného, takže seznam
   * ukazoval u cizích zakázek e-mail, dokud si je jejich autor sám neuložil
   * (hlášeno J. V.: „obchodník měl být uveden jménem, ne e-mailem").
   * Teď se u chybějících jmen jednou přečtou účty a doplní se všechna.
   *
   * Je to bezpečně omezené: čte se JEN tehdy, když nějaké jméno chybí,
   * a po prvním takovém uložení už rejstřík jména má, takže se to
   * neopakuje. Účtů jsou jednotky. Nikdy se nic nevymýšlí — účet bez
   * vyplněného jména zůstane v seznamu e-mailem. */
  let stavajici = (Array.isArray(rejstrik.zakazky) ? rejstrik.zakazky : []).map(z => {
    if (z && !z.autorJmeno && relace.jmeno
        && String(z.autor || '').toLowerCase() === String(relace.email).toLowerCase())
      return { ...z, autorJmeno: relace.jmeno };
    return z;
  });
  if (stavajici.some(z => z && z.autor && !z.autorJmeno)) {
    try {
      const u = await uloziste('uzivatele');
      const mapa = {};
      for (const k of await u.seznam()) {
        const ucet = await u.cti(k);
        if (ucet && ucet.email && ucet.jmeno)
          mapa[String(ucet.email).toLowerCase()] = String(ucet.jmeno);
      }
      stavajici = stavajici.map(z => (z && !z.autorJmeno && mapa[String(z.autor || '').toLowerCase()])
        ? { ...z, autorJmeno: mapa[String(z.autor).toLowerCase()] } : z);
    } catch (e) { /* jména jsou pohodlí, ne podmínka uložení zakázky */ }
  }
  const novy = ULO.uloRejstrikSloucit(stavajici,
    ULO.uloRejstrikZaznam(zak, { soubor: jmeno, razitko }));
  await s.zapis('_rejstrik', { schema: 1, zakazky: ULO.uloRejstrikSerad(novy), kdo: relace.email,
                               upraveno: new Date().toISOString() });
  /* Sporné razítko (B59) se hlásí hned — uložení prošlo, ale obchodník se
   * musí dozvědět, že čísla odeslané nabídky server z dat nedostal. */
  const varovani = sporne.map(x => 'Pozor, nabídka ' + x.cislo + ': '
    + globalThis.zamekOvereniText(x.ov) + ' Obnovte stránku (Ctrl+F5) a nabídku zkontrolujte.').join(' ');
  return json(varovani ? { ok: true, soubor: jmeno, razitko, varovani } : { ok: true, soubor: jmeno, razitko });
};
export const config = { path: '/api/zakazky' };
