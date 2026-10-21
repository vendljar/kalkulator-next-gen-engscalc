/* Analytika užívání (#25 + #26 + #27, 17. 8. 2026).
 *
 * GET  /api/analytika?akce=rezim          → { sber } — přihlášení (klient musí
 *      vědět, jestli má vůbec sbírat, dřív než cokoli pošle)
 * GET  /api/analytika?od=RRRR-MM-DD&do=…  → souhrn za období + řada po
 *      měsících + časy zakázek — JEN Administrátor (rozhodnutí 17. 8.)
 * POST /api/analytika { akce:'udalosti', den, casy } → přičíst dávku klienta
 *      — přihlášení; při vypnutém sběru se dávka tiše zahodí
 * POST /api/analytika { akce:'rezim', sber } → globální vypínač — JEN Administrátor
 *
 * Úložiště `analytika`: klíč `rezim`, denní agregáty `den/RRRR-MM-DD`,
 * časy `cas/<číslo zakázky>` = { ock, proj } v sekundách.
 *
 * ZÁSADY: ukládají se jen SOUČTY za všechny uživatele (žádné jméno, žádná
 * stopa jednotlivce — dávka klienta se přičte a zapomene); čas se váže
 * k zakázce, ne k účtu. Analytika NEJDE do záloh (viz zaloha.mjs — klíč
 * `analytika` tam schválně není). Retence: při každém zápisu se smažou dny
 * starší 24 měsíců. */
import { uloziste, vyzadujRoli, json } from '../lib/sdilene.mjs';
import { jadro, jadroChyba } from '../lib/jadro.mjs';

/* Jména souborů zakázek, ke kterým smí vzniknout klíč `cas/` (B35,
 * rozhodnutí J. V. 13. 10. 2026 „Ano"). Čte se JEDEN záznam — rejstřík
 * zakázek (`_rejstrik` v úložišti `zakazky`) — a jen tehdy, když v dávce
 * přijde číslo, které ještě klíč nemá; zakázky jednotlivě se nečtou.
 * Číslo z hlavičky (klient ho posílá tak, jak je v ZAK.cislo, i s mezerami)
 * se převede na jméno souboru stejnou funkcí, jakou zakázka dostala jméno
 * při uložení (uloKlicSouboru) — žádná druhá pravda o tvaru čísla.
 * Rejstřík se přestavuje při každém uložení i obnově; chybí-li zakázka
 * v něm, čas se nezapíše — ztratí se nanejvýš statistika, ne data. */
/* Povolené klíče cas/ z rejstříku: číslo zakázky PŘESNĚ, jak ho nese
 * hlavička (a rejstřík), a jméno souboru bez přípony. Dřív se poslané číslo
 * převádělo na jméno souboru — jenže převod slévá mezery a pomlčky, takže
 * jedna skutečná zakázka dala desítky tisíc různých klíčů a jeden účet
 * zaplnil strop B35 (B151, audit 15. 10. 2026). */
async function zakazkyZRejstriku(ULO) {
  const rej = await (await uloziste('zakazky')).cti('_rejstrik');
  const cisla = new Set();
  for (const z of (rej && Array.isArray(rej.zakazky)) ? rej.zakazky : []) {
    if (!z) continue;
    if (typeof z.cislo === 'string' && z.cislo.trim()) cisla.add(z.cislo.trim());
    if (typeof z.soubor === 'string' && z.soubor.endsWith(ULO.ULO_PRIPONA))
      cisla.add(z.soubor.slice(0, -ULO.ULO_PRIPONA.length));
  }
  return cisla;
}
function zakazkaVRejstriku(cisla, cislo) {
  return cisla.has(cislo);
}

export default async (req) => {
  let ULO;
  try { ({ ULO } = await jadro()); } catch (e) { return jadroChyba(e); }
  const g = globalThis;
  const s = await uloziste('analytika');
  const dnes = new Date().toISOString().slice(0, 10);

  if (req.method === 'GET') {
    const url = new URL(req.url);
    if (url.searchParams.get('akce') === 'rezim') {
      const { chyba } = await vyzadujRoli(req);              // stačí být přihlášen
      if (chyba) return chyba;
      const rez = (await s.cti('rezim')) || g.analytikaRezimNovy();
      return json({ ok: true, sber: rez.sber !== false });
    }

    /* souhrn — jen administrátor (rozhodnutí 17. 8.: analytiku vidí jen on) */
    const { chyba } = await vyzadujRoli(req, 'Administrátor');
    if (chyba) return chyba;
    const od = url.searchParams.get('od') || '0000-00-00';
    const doD = url.searchParams.get('do') || '9999-99-99';
    const klice = (await s.seznam('den/')).filter(k => {
      const den = k.slice(4);
      return den >= od && den <= doD;
    }).sort();
    const dvojice = [];
    for (const k of klice) {
      const den = await s.cti(k);
      if (den) dvojice.push([k, den]);
    }
    const souhrn = g.analytikaObdobi(dvojice);
    const rez = (await s.cti('rezim')) || g.analytikaRezimNovy();
    /* časy zakázek (#25): mapa číslo zakázky → { ock, proj } v sekundách */
    const casy = {};
    for (const k of await s.seznam('cas/')) {
      const c = await s.cti(k);
      if (c && g.analytikaKlicPovolen(k.slice(4))) casy[k.slice(4)] = { ock: +c.ock || 0, proj: +c.proj || 0 };   // B81
    }
    return json({ ok: true, od, do: doD, dnu: dvojice.length,
                  celkem: souhrn.celkem, poMesicich: souhrn.poMesicich,
                  casy, rezim: { sber: rez.sber !== false, kdo: rez.kdo || '', kdy: rez.kdy || '' } });
  }

  if (req.method !== 'POST') return json({ ok: false, chyba: 'Použijte GET nebo POST.' }, 405);
  let t; try { t = await req.json(); } catch (e) { return json({ ok: false, chyba: 'Vstup není platný JSON.' }, 400); }
  /* Tělo JSON `null`, číslo nebo pole (B131): dřív výjimka a 500. */
  if (!t || typeof t !== 'object' || Array.isArray(t)) return json({ ok: false, chyba: 'Vstup musí být objekt JSON.' }, 400);

  if (t.akce === 'rezim') {
    const { chyba, relace } = await vyzadujRoli(req, 'Administrátor');
    if (chyba) return chyba;
    const novy = g.analytikaRezimNastav(null, t.sber, relace.email, new Date().toISOString());
    if (!novy) return json({ ok: false, chyba: 'Hodnota sběru musí být ano/ne.' }, 400);
    await s.zapis('rezim', novy);
    return json({ ok: true, sber: novy.sber });
  }

  if (t.akce === 'udalosti') {
    const { chyba, relace } = await vyzadujRoli(req);        // stačí být přihlášen
    if (chyba) return chyba;
    const rez = (await s.cti('rezim')) || g.analytikaRezimNovy();
    /* Vypnutý sběr: dávka se TIŠE zahodí (ok:true). Klient o vypnutí ví
     * z GET ?akce=rezim, ale mezi vypnutím a jeho příští kontrolou nesmí
     * uživateli vyskakovat chyba kvůli statistice. */
    if (rez.sber === false) return json({ ok: true, sber: false });

    if (t.den && typeof t.den === 'object') {
      const stary = await s.cti('den/' + dnes);
      /* Dávka se nejdřív očistí (B8, 22. 8. 2026): jen čtyři mapy, čísla
       * nezáporná a se stropem, klíče oříznuté. `poUzivateli` od klienta se
       * nikdy nepřičítá — do 22. 8. se slilo DŘÍV než serverová atribuce,
       * takže šlo poslat cizímu kolegovi stovky chyb nebo mínus zakázek. */
      const cista = g.analytikaDavkaOcisti(t.den);
      const novy = g.analytikaSlij(stary, cista);
      /* Atribuci dělá SERVER z přihlášené relace (20. 8. 2026): klient svůj
       * e-mail neposílá, takže ho nemůže podvrhnout. Od 31. 8. 2026 se
       * uživateli přiřazují i OTEVŘENÉ ZÁLOŽKY a KLIKNUTÉ PRVKY (zadání
       * J. V.) — do té doby zůstávaly jen v anonymním souhrnu a filtr
       * uživatele u nich nic neukázal. Zdržení (heat mapa „čas nad prvkem")
       * dál anonymní zůstává. Přičítá se OČIŠTĚNÁ dávka, ne to, co přišlo. */
      g.analytikaPrictiUzivateli(novy, relace && relace.email, cista.pocty, cista);
      await s.zapis('den/' + dnes, novy);
    }
    /* časy zakázek: { '2026-OPR-CN-0155': { ock: 120, proj: 30 }, … } */
    if (t.casy && typeof t.casy === 'object') {
      /* STROP POČTU KLÍČŮ cas/ (B35, audit 9. 9. 2026; 13. 10. 2026). Tvar
       * čísla hlídá B8, ale počet ne: kdokoli přihlášený zakládal po padesáti
       * nových klíčích na požadavek do nekonečna (a souhrn je pak čte
       * všechny). Nad stropem se nové zakázky nezakládají, existující se
       * přičítají dál. Seznam se čte jen jednou a jen když přijde nový klíč. */
      let existujici = null, vRejstriku = null;
      for (const [zak, c] of Object.entries(t.casy).slice(0, 50)) {
        /* Klíč musí vypadat jako číslo nabídky (B8): písmena, číslice,
         * pomlčky, mezery, tečky — a nanejvýš 60 znaků. Cizí tvar se zahodí,
         * ne „opraví" — jinak kdokoli přihlášený zakládá klíče do nekonečna. */
        const cislo = String(zak).trim();
        if (!/^[\w\-. ]{1,60}$/.test(cislo) || !g.analytikaKlicPovolen(cislo)) continue;   // B81: ani __proto__
        const klic = 'cas/' + cislo;
        const ock = g.analytikaCislo(c && c.ock);
        const proj = g.analytikaCislo(c && c.proj);
        if (!ock && !proj) continue;
        let stary = await s.cti(klic);
        if (!stary) {
          /* B35 (13. 10. 2026, J. V. „Ano"): strop sám nestačil — jeden účet
           * ho zaplnil smyšlenými čísly a měření pak skončilo pro všechny.
           * Nový klíč jen pro zakázku, která v databázi existuje; strop
           * zůstává jako druhá pojistka. */
          if (!vRejstriku) vRejstriku = await zakazkyZRejstriku(ULO);
          if (!zakazkaVRejstriku(vRejstriku, cislo)) continue;
          if (!existujici) existujici = new Set(await s.seznam('cas/'));
          if (!existujici.has(klic) && existujici.size >= g.ANALYTIKA_MAX_CASU) continue;   // B35
          existujici.add(klic);
          stary = { ock: 0, proj: 0 };
        }
        await s.zapis(klic, { ock: (+stary.ock || 0) + ock, proj: (+stary.proj || 0) + proj });
      }
    }
    /* retence: dny starší 24 měsíců pryč (levné — seznam klíčů, ne data) */
    if (typeof s.smaz === 'function') {
      for (const k of g.analytikaRetence(await s.seznam('den/'), dnes)) await s.smaz(k);
    }
    return json({ ok: true, sber: true });
  }

  return json({ ok: false, chyba: 'Neznámá akce.' }, 400);
};
export const config = { path: '/api/analytika' };
