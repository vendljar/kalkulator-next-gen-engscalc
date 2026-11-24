/* Zakázky online — jedna zakázka = jeden záznam, vedle rejstřík (stejný model
 * jako složka: uloziste.js dodává jména souborů i rejstřík — žádná druhá pravda).
 * GET  /api/zakazky            → { rejstrik }            — přihlášení
 * GET  /api/zakazky?soubor=X   → { zakazka }             — přihlášení
 * POST /api/zakazky { zakazka } → uloží + přestaví rejstřík — přihlášení
 *   Pojistka zámku: uzamčená (odeslaná) nabídka se nikdy nepřepíše —
 *   stejná kontrola jako ve složce (uloKontrolaZamku není v modelu, ale
 *   zámky hlídá porovnání razítek: server odmítne zápis, který by změnil
 *   variantu zamčenou v uložené verzi). */
import { uloziste, vyzadujRoli, json, serverVerze, vyhradne, klicZAdresyPlatny, hloubkaChyba, podpisZamkuPriprav, podpisZamkuCti } from '../lib/sdilene.mjs';
import { jadro, jadroChyba } from '../lib/jadro.mjs';
import { zakazkaPrijmi, zakazkaServerKontrola, ZAKAZKA_MAX_B, zakazkaVelikostHlaska } from '../lib/zakazka_kontrola.mjs';
import { pdStavPripoj, pdStavUlozeni } from '../lib/pd_stav.mjs';
import { funkceCti } from '../lib/funkce.mjs';
import { pdPoznamkyUlozeni } from '../lib/pd_poznamka.mjs';
import { pdPoleMapa } from './pd_pole.mjs';
import { pdWebhookOdkaz } from '../lib/pd_webhook.mjs';
import { pdVazbaNorm } from '../lib/pd_vazba.mjs';   // K54-N1 N3: totožnost čerstvé kalkulace

/* Jméno k e-mailu z účtů (P7 / K16-N87) — jen pro hlášku o kolizi verzí
 * u zakázek uložených dřív, než se jméno začalo zapisovat. Jedno čtení,
 * a jen když ke kolizi dojde; selhání není důvod hlášku neposlat. */
async function jmenoUctu(email) {
  const e = String(email || '').trim().toLowerCase();
  if (!e) return '';
  try {
    const ucet = await (await uloziste('uzivatele')).cti(e);
    return (ucet && ucet.jmeno) ? String(ucet.jmeno) : '';
  } catch (err) { return ''; }
}

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
    if (!klicZAdresyPlatny(soubor)) return json({ ok: false, chyba: 'Neplatné jméno zakázky.' }, 400);   // SEC-I4
    const zak = await s.cti('z/' + soubor);
    /* #665 (RJ, J. V. 22. 11. 2026): sken podpisu PŮVODNÍHO zpracovatele odeslané
     * nabídky — zmrazená kopie, jejíž otisk nese snímek zámku varianty
     * (zamek.zpracovatel.podpisOtisk). Smí každý, kdo smí číst zakázku; jinou
     * kopii než tu ze zámku téže zakázky nevydá. */
    const podpisVar = url.searchParams.get('podpisZamku');
    if (podpisVar !== null) {
      const v = zak && Array.isArray(zak.varianty) ? zak.varianty.find(x => x && x.id === podpisVar) : null;
      const zs = v && v.zamek && v.zamek.zamceno && v.zamek.zpracovatel;
      const obrazek = zs ? await podpisZamkuCti(zs.podpisOtisk) : '';
      return obrazek ? json({ ok: true, otisk: zs.podpisOtisk, obrazek })
                     : json({ ok: false, chyba: 'Odeslaná nabídka nemá uložený podpis zpracovatele.' }, 404);
    }
    /* Stav dealu Pipedrive (P1): poslední známý z úložiště pd_stav. */
    return zak ? json({ ok: true, zakazka: await pdStavPripoj(zak) })
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
    if (!klicZAdresyPlatny(soubor)) return json({ ok: false, chyba: 'Neplatné jméno zakázky.' }, 400);   // SEC-I4
    /* SEC-S1 (#514): kontrola zámků a smazání v témže výhradním úseku jako
     * uložení — souběžný tisk nesmí zamknout zakázku, kterou kontrola viděla
     * nezamčenou. */
    const smazani = await vyhradne('zakazky/z/' + soubor, async () => {
      const zak = await s.cti('z/' + soubor);
      if (zak) {
        const zamcenych = (zak.varianty || [])
          .filter(v => globalThis.variantaUzamcena && globalThis.variantaUzamcena(v)).length;
        if (zamcenych && url.searchParams.get('ismazatOdeslane') !== '1')
          return { odpoved: json({ ok: false, zamcenych,
            chyba: 'Zakázka obsahuje ' + zamcenych + ' odeslanou (uzamčenou) nabídku. '
              + 'Smazání je potřeba potvrdit zvlášť.' }, 409) };
        await s.smaz('z/' + soubor);
      }
      return { zak };
    });
    if (smazani.odpoved) return smazani.odpoved;
    const zak = smazani.zak;
    await vyhradne('zakazky/_rejstrik', async () => {   // K7-S1, viz POST
      const rej = (await s.cti('_rejstrik')) || { schema: 1, zakazky: [] };
      const zbytek = ULO.uloRejstrikOdeber(Array.isArray(rej.zakazky) ? rej.zakazky : [], soubor);
      await s.zapis('_rejstrik', { schema: 1, zakazky: ULO.uloRejstrikSerad(zbytek),
                                   kdo: relace.email, upraveno: new Date().toISOString() });
    });
    return json({ ok: true, soubor, existovala: !!zak });
  }

  if (req.method !== 'POST') return json({ ok: false, chyba: 'Použijte GET, POST nebo DELETE.' }, 405);

  /* Strop velikosti (audit 22. 8. 2026, B14): zakázka má řádově desítky
   * kilobajtů, s přílohami stovky. 4 MB je pojistka proti zaplnění úložiště
   * a proti holé 502 při překročení limitu Blobs — ne provozní hranice. */
  /* K4-N18 (O9): do dvojnásobku stropu se tělo přečte, aby hláška řekla, z čeho
   * se velikost skládá (Netlify samo nepustí tělo nad 6 MB); nad ním bez čtení. */
  const delka = +req.headers.get('content-length') || 0;
  if (delka > 2 * ZAKAZKA_MAX_B)
    return json({ ok: false, chyba: 'Zakázka je příliš velká (' + Math.round(delka / 1024) + ' kB, strop '
      + Math.round(ZAKAZKA_MAX_B / 1024) + ' kB). Zmenšete přílohy, nebo další nabídku založte jako novou zakázku.' }, 413);
  let t; try { t = await req.json(); } catch (e) { return json({ ok: false, chyba: 'Vstup není platný JSON.' }, 400); }
  { const stop = hloubkaChyba(t); if (stop) return stop; }   // SEC-M2 (#542): hluboké vnoření → 400, ne 500
  /* Tělo JSON `null`, číslo nebo pole (B131): dřív výjimka a 500. */
  if (!t || typeof t !== 'object' || Array.isArray(t)) return json({ ok: false, chyba: 'Vstup musí být objekt JSON.' }, 400);
  if (JSON.stringify(t).length > ZAKAZKA_MAX_B)
    return json({ ok: false, chyba: zakazkaVelikostHlaska(t.zakazka, Math.max(delka, JSON.stringify(t).length)) }, 413);

  /* POJISTKY ZAKÁZKY STOJÍ V lib/zakazka_kontrola.mjs (P4 / B72, 25. 9. 2026)
   * a volá je i obnova ze zálohy — dvě kopie by se rozešly (a rozešly).
   * Tady zůstává jen to, co je vlastní ukládání z prohlížeče: strop
   * velikosti, razítko verze proti souběhu (B10), zápis a rejstřík. */
  const prijem = zakazkaPrijmi(t.zakazka, ULO);
  if (!prijem.ok) return json({ ok: false, chyba: prijem.chyba }, prijem.status);
  const { zak, jmeno } = prijem;
  const fotoVarovani = typeof globalThis.uvodniFotoVarovani === 'function' ? globalThis.uvodniFotoVarovani(prijem.fotoZahozena) : '';
  /* ČTENÍ, KONTROLY A ZÁPIS ZAKÁZKY V JEDNOM VÝHRADNÍM ÚSEKU (SEC-S1, #514,
   * audit S1 23. 10. 2026). Do v23.10.4 se `stara` přečetla jednou a zápis
   * nehlídal nic: souběžné uložení starší kopie (autosave z jiného okna,
   * kolega), které četlo dřív, než tisk zapsal zámek, prošlo kolizí razítka
   * i kontrolou zámků proti staré verzi a zámek odeslané nabídky tiše smazalo
   * (podklady/S1_pokusy/server/p3_zamek_soubeh.mjs). Teď se uložení téže
   * zakázky v instanci funkce řadí za sebe a těsně před zápisem se zakázka
   * přečte znovu — jiné razítko než u `stara` (zápis jiné instance nebo jiné
   * cesty) = 409 kolize, nic se nepřepíše. Mimo souběh beze změny. */
  const vysledek = await vyhradne('zakazky/z/' + jmeno, async () => {
  const stara = await s.cti('z/' + jmeno);

  /* K54-N1 (#750, J. V. 24. 11. 2026): SMAZANÁ KALKULACE SE ULOŽENÍM NEVZKŘÍSÍ.
   * Prohlížeč, který kalkulaci načetl ze serveru, posílá razítko verze
   * (`ocekavaneRazitko`) i jméno záznamu, ze kterého vyšel (`ocekavanySoubor`).
   * Když pod tím jménem na serveru nic neleží, kalkulaci mezitím někdo smazal
   * (Seznam zakázek, jiná karta, kolega) — zápis by ji založil znovu ze staré
   * kopie v paměti (zamčené varianty, ceník, protokol, bez serverových polí)
   * a webhook Pipedrive by ji pak bral jako existující. 409 bez `kolize`
   * (tlačítko „Přepsat serverovou verzi“ tu nemá co přepsat) a `prepsat`
   * to neobchází. Nová zakázka razítko nemá, přečíslovaná míří na jiné jméno,
   * obnova ze zálohy jde jinou cestou (obnova.mjs) — těch se to netýká. */
  if (!stara && typeof t.ocekavaneRazitko === 'string' && t.ocekavaneRazitko
      && typeof t.ocekavanySoubor === 'string' && t.ocekavanySoubor === jmeno) {
    const cislo = String(zak.cislo || '').trim() || jmeno;
    return { odpoved: json({ ok: false, smazana: true, soubor: jmeno,
      chyba: 'Kalkulace ' + cislo + ' byla mezitím smazána z databáze — neuloženo. '
        + 'Z této kopie ji znovu založit nejde; zavřete ji (Nová zakázka). '
        + 'Vrátit smazanou kalkulaci jde jen ze zálohy databáze.' }, 409) };
  }

  /* Razítko verze (audit 22. 8. 2026, B10). Klient posílá razítko verze, ze
   * které vyšel (`ocekavaneRazitko`). Když v databázi leží jiná verze —
   * kolega mezitím uložil, nebo jde o cizí zakázku pod stejným číslem — server
   * odmítne 409 a nic nepřepíše. Vědomé přepsání jde s `prepsat: true`
   * (klient se zeptá).
   * NN B237 (22. 11. 2026): razítko už není dobrovolné. Tělo BEZ pole se
   * bere jako prázdné razítko („tuhle zakázku jsem nenačetl") — nad
   * existující zakázkou 409. Výjimka „starší klient bez pole" z 22. 8. 2026
   * propadla: všichni klienti od B10 pole posílají. `prepsat: true` zůstává
   * (vědomé přepsání po dotazu) — práva nerozšiřuje, zakázku smí uložit každý,
   * kdo ji smí načíst (mez v BEZPECNOST_MEZE, NN B237). */
  /* K54-N1 N3 (J. V. 24. 11. 2026): ČERSTVOU KALKULACI Z PIPEDRIVE NEPŘEPÍŠE
   * STARÁ KOPIE. Leží-li pod jménem kalkulace, kterou webhook založil a člověk
   * ji ještě neuložil (`pdCerstva`), uloží ji jen okno s TOUTÉŽ kalkulací:
   * totožnost nese čas založení vazby z webhooku (`pdVazbaWebhook.kdy` — webhook
   * ho při aktualizaci drží, nově založená kalkulace má jiný, okno ho dostane
   * při načtení a nic jiného ho nepíše). Dorevize D1/D2: razítko verze v datech
   * se na to nehodí — mění ho aktualizace webhookem i zápis do složky.
   * Jiná vazba nebo žádná (stará kopie smazané kalkulace, nová zakázka pod
   * týmž číslem) → 409 i s `prepsat`; stejná → běžná cesta včetně kolize B10
   * s „Načíst znovu / Přepsat“. Čte se z těla PŘED pdVazbaDrz (ta vazbu
   * v těle přepíše uloženou). Ochrana proti omylu, ne bezpečnostní mez
   * (dorevize D3, BEZPECNOST_MEZE). */
  if (stara && stara.pdCerstva === true) {
    const kdyUlozene = (pdVazbaNorm(stara.pdVazbaWebhook) || {}).kdy || '';
    const kdyTelo = (pdVazbaNorm(zak.pdVazbaWebhook) || {}).kdy || '';
    if (kdyUlozene && kdyTelo !== kdyUlozene)
      return { odpoved: json({ ok: false, pdCerstvaJina: true, soubor: jmeno,
        chyba: 'Kalkulaci mezitím znovu založil Pipedrive — otevřete ji ze Seznamu / odkazem z dealu; vaše kopie se neuložila.' }, 409) };
  }

  if (stara && t.prepsat !== true) {
    const kol = ULO.uloKolize(stara, typeof t.ocekavaneRazitko === 'string' ? t.ocekavaneRazitko : '');
    if (kol.kolize) {
      /* KOLIZE JMENUJE ČLOVĚKA, NE E-MAIL (P7 / K16-N87, 25. 9. 2026).
       * Do té doby hláška zněla „Zakázku mezitím uložil jan@firma.cz" —
       * nebo „někdo jiný", když e-mail chyběl. Jméno se bere z razítka
       * uložené verze (`upravilJmeno`, píše ho server z relace), u starších
       * zakázek se dohledá v účtech. Nic se nevymýšlí: účet bez jména
       * zůstane e-mailem. `kdoVy` = týž účet, tedy jiné okno nebo záložka. */
      const kdoEmail = String((t.ocekavaneRazitko ? stara.upravil : stara.autor) || stara.upravil || stara.autor || '');
      const ulozeneJmeno = String((t.ocekavaneRazitko ? stara.upravilJmeno : stara.autorJmeno) || '');
      const kdo = ulozeneJmeno || (await jmenoUctu(kdoEmail)) || kdoEmail;
      const kdoVy = !!kdoEmail && kdoEmail.toLowerCase() === String(relace.email || '').toLowerCase();
      return { odpoved: json({ ok: false, kolize: true, naDisku: kol.naDisku,
        kdo, kdoEmail, kdoVy,
        chyba: t.ocekavaneRazitko
          ? 'Zakázku mezitím uložil(a) ' + (kdo || 'někdo jiný') + (kdoVy ? ' (váš účet — jiné okno nebo záložka)' : '')
            + '. Načtěte ji znovu, nebo změny vědomě přepište.'
          : 'Stejné číslo nabídky už používá uložená zakázka ' + jmeno + (kdo ? ' (' + kdo + ')' : '')
            + '. Zvolte vlastní číslo, nebo ji vědomě přepište.' }, 409) };
    }
  }

  const sProg = await uloziste('program');
  const prog = await sProg.cti('db');
  const slevyNast = (prog && prog.platny && prog.platny.slevy) || {};
  /* Matice zobrazení a zveřejněné ceníky pro kontrolu B112 (kdo smí měnit
   * ceník varianty a přepisy). Administrátor matici nepotřebuje — čte se
   * jen pro ostatní role. */
  const zobr = relace.role === 'Administrátor' ? null : await sProg.cti('zobrazeni');
  const { viceSachet, viceZakazniku } = await funkceCti(sProg);   // VS #570 / VZ #598: vypínače správce
  /* NN B238 (audit 20. 11. 2026): snímek lhůt PROJ (D8) píše SERVER.
   * Dřív ho psal klient bez kontroly tvaru a původu — u odeslané neprodané
   * varianty ho přepsal kdokoli a Prodáno ho zmrazilo. Teď: varianta prodaná
   * už v uložené verzi drží zmrazený snímek (změnu odmítne zámek); varianta prodávaná tímto uložením
   * dostane platnou tabulku Firmy ze serveru; neprodaná snímek nenese. */
  /* Chyba snímku lhůt (409) se vrací až po kontrole zakázky — přednost mají
   * její odmítnutí (např. datum prodeje 400). */
  const lhChyba = lhutyProjServerDrz(stara, zak, await sProg.cti('firma'));
  /* #665 (RJ): nese-li uložení NOVÝ zámek, podpis přihlášeného se zmrazí
   * (otisk do snímku zámku, kopie v úložišti podpisů) — čte se jen tehdy. */
  const podpisZamku = await podpisZamkuPriprav(stara, zak, relace, globalThis.variantaUzamcena);
  const kontrola = zakazkaServerKontrola(stara, zak, relace,
    { ULO, SCHV, JEKLY, slevyNast, verzeServeru: serverVerze(), rezim: 'ulozeni',
      program: prog, matice: (zobr && zobr.matice) || null, podpisOtisk: podpisZamku ? podpisZamku.otisk : '',   // #665 (RJ)
      viceSachet, viceZakazniku });   // VS #570 / VZ #598: vypínače správce
  if (!kontrola.ok) return { odpoved: json(Object.assign({ ok: false, chyba: kontrola.chyba }, kontrola.kod ? { kod: kontrola.kod } : {}), kontrola.status) };
  if (lhChyba) return { odpoved: json({ ok: false, chyba: lhChyba }, 409) };
  /* #665: kopie podpisu dřív než zakázka — otisk ve snímku nikdy nevisí naprázdno. */
  if (podpisZamku && (zak.varianty || []).some(v => v && v.zamek && v.zamek.zpracovatel && v.zamek.zpracovatel.podpisOtisk === podpisZamku.otisk))
    await podpisZamku.zapis();
  /* Stav dealu Pipedrive dosazuje server (P1) — z prohlížeče jen tvar. */
  await pdStavUlozeni(zak, stara);

  /* SEC-S1: druhé čtení těsně před zápisem (viz začátek úseku). */
  const tesne = await s.cti('z/' + jmeno);
  if (!!tesne !== !!stara || ULO.uloRazitko(tesne) !== ULO.uloRazitko(stara)) {
    const kdoEmail = String((tesne && (tesne.upravil || tesne.autor)) || '');
    const kdo = String((tesne && (tesne.upravilJmeno || tesne.autorJmeno)) || '') || kdoEmail;
    return { odpoved: json({ ok: false, kolize: true, naDisku: ULO.uloRazitko(tesne),
      kdo, kdoEmail, kdoVy: !!kdoEmail && kdoEmail.toLowerCase() === String(relace.email || '').toLowerCase(),
      chyba: 'Zakázku právě uložil(a) ' + (kdo || 'někdo jiný') + '. Načtěte ji znovu, nebo změny vědomě přepište.' }, 409) };
  }
  /* Poznámka dealu se seznamem šachet (VSD, J. V. 11. 11. 2026): jen se
   * zapnutým vypínačem a u řídící varianty s víc šachtami; id poznámky píše
   * jen server (pdPoznamkaSachty). Selhání Pipedrive uložení nezastaví.
   * Až PO druhém čtení (SEC-S1): kolize 409 po zápisu do Pipedrive by
   * zahodila id nové poznámky a příští uložení by založilo druhou.
   * VZ-E5 (#604): v témž kroku i poznámka „Další zákazníci na zakázce“
   * (vypínač viceZakazniku, pole pdPoznamkaZakaznici) — společný časový
   * rozpočet, šachty první; třetí čtení níž jedno pro obě. */
  const pdPoznamky = await pdPoznamkyUlozeni(zak, stara, { viceSachet, viceZakazniku, relace, matice: (zobr && zobr.matice) || null,
    poleMapa: () => pdPoleMapa(),   // VZ T1 (N3): IČ organizace dealu
    odkaz: pdWebhookOdkaz(jmeno, req) });   // B235: ověření vazby dealu na zakázku (pd_overeni.mjs)
  const pdPoznamka = pdPoznamky.sachty, pdPoznamkaZak = pdPoznamky.zakaznici;
  /* N1 (revize Fable 12. 11. 2026): volání Pipedrive trvá až sekundy —
   * okno mezi druhým čtením a zápisem by se roztáhlo. Po návratu z
   * Pipedrive se zakázka čte POTŘETÍ; jiné razítko = 409 jako u SEC-S1.
   * Zapsanou poznámku příští uložení najde podle značky zakázky (N3). */
  if (pdPoznamky.volano) {
    const potreti = await s.cti('z/' + jmeno);
    if (!!potreti !== !!stara || ULO.uloRazitko(potreti) !== ULO.uloRazitko(stara)) {
      const kdoEmail = String((potreti && (potreti.upravil || potreti.autor)) || '');
      const kdo = String((potreti && (potreti.upravilJmeno || potreti.autorJmeno)) || '') || kdoEmail;
      return { odpoved: json({ ok: false, kolize: true, naDisku: ULO.uloRazitko(potreti),
        kdo, kdoEmail, kdoVy: !!kdoEmail && kdoEmail.toLowerCase() === String(relace.email || '').toLowerCase(),
        chyba: 'Zakázku právě uložil(a) ' + (kdo || 'někdo jiný') + '. Načtěte ji znovu, nebo změny vědomě přepište.' }, 409) };
    }
  }
  const razitko = ULO.uloRazitkoNove();
  zak.uloRazitko = razitko;
  await s.zapis('z/' + jmeno, zak);
  return { sporne: kontrola.sporne, razitko, pdPoznamka, pdPoznamkaZak };
  });
  if (vysledek.odpoved) return vysledek.odpoved;
  const { sporne, razitko, pdPoznamka, pdPoznamkaZak } = vysledek;
  /* REJSTŘÍK JE ČTENÍ–ZMĚNA–ZÁPIS (K7-S1, audit 23. 10. 2026). Dvě souběžná
   * uložení v téže instanci funkce se řadí za sebe (vyhradne) — jinak pozdější
   * zápis tiše vypustil záznam dřívějšího a zakázka chyběla v Přehledu
   * i v hromadném exportu. Mezi instancemi Blobs podmíněný zápis v naší
   * vrstvě nemá (náhrada pro testy ho neumí, viz B4); tam drží export
   * samooprava ze seznamu `z/` (ctrlHromadnyKandidati) — BEZPECNOST_MEZE.md. */
  await vyhradne('zakazky/_rejstrik', async () => {
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
    /* ADRESY STAVEB U STARŠÍCH ZÁZNAMŮ (P15 / K16-N85, 25. 9. 2026).
     *
     * Hledání umí adresu stavby, jenže záznamy uložené dřív ji v rejstříku
     * nemají — a zakázky, které se už neotevírají, by se podle adresy nenašly
     * nikdy. Doplňují se proto po dávkách při ukládání: nejvýš
     * ULO_ADRESY_DAVKA zakázek najednou, čtou se souběžně a jen dokud nějaký
     * záznam klíč `adresa` nenese (pak se tahle větev přestane spouštět sama).
     * Nečitelná zakázka se zkusí příště; zmizelá dostane prázdnou adresu. */
    const bezAdresy = ULO.uloRejstrikBezAdresy(stavajici).filter(x => x !== jmeno);
    /* DNY ZÁMKŮ U STARŠÍCH ZÁZNAMŮ (#504, 22. 10. 2026) — touž cestou: hromadný
     * export controllingu podle nich vybírá zakázky z období; záznam bez nich
     * jde hrubým předvýběrem. Jedno čtení zakázky doplní adresu i dny. */
    const G = globalThis;
    const bezDnu = (typeof G.ctrlRejstrikDny === 'function')
      ? ULO.uloRejstrikBezDnu(stavajici).filter(x => x !== jmeno) : [];
    const kDoplneni = [...new Set(bezAdresy.concat(bezDnu))];
    if (kDoplneni.length) {
      const nalezene = await Promise.all(kDoplneni.map(async (soubor) => {
        try {
          const z = await s.cti('z/' + soubor);
          let dny;
          /* Zmizelá nebo nečitelná zakázka: „čti vždy" — export ji ohlásí jako přeskočenou. */
          try { dny = z ? G.ctrlRejstrikDny(G.importZakazka(z)) : { cist: true }; }
          catch (e) { dny = { cist: true }; }
          return [soubor, { adresa: ULO.uloRejstrikAdresa(z && z.adresa), dny }];
        }
        /* K7-S9 (#508, J. V. 23. 10. 2026): čtení vyhodilo — dny „čti vždy", ať
         * záznam nezůstane navždy na začátku dávky a ostatní se doplní; export
         * ho přečte a případně ohlásí. Adresa se zkusí příště. */
        catch (e) { return [soubor, { dny: { cist: true } }]; }
      }));
      const doplnit = new Map(nalezene.filter(Boolean));
      const sAdresou = new Set(bezAdresy), sDny = new Set(bezDnu);
      stavajici = stavajici.map(z => {
        const d = z && doplnit.get(z.soubor);
        if (!d) return z;
        return { ...z, ...(sAdresou.has(z.soubor) && d.adresa !== undefined ? { adresa: d.adresa } : {}), ...(sDny.has(z.soubor) ? { ctrlDny: d.dny } : {}) };
      });
    }
    const novy = ULO.uloRejstrikSloucit(stavajici,
      ULO.uloRejstrikZaznam(zak, { soubor: jmeno, razitko }));
    await s.zapis('_rejstrik', { schema: 1, zakazky: ULO.uloRejstrikSerad(novy), kdo: relace.email,
                                 upraveno: new Date().toISOString() });
  });
  /* Sporné razítko (B59) se hlásí hned — uložení prošlo, ale obchodník se
   * musí dozvědět, že čísla odeslané nabídky server z dat nedostal. */
  const varovani = sporne.map(x => 'Pozor, nabídka ' + x.cislo + ': '
    + globalThis.zamekOvereniText(x.ov) + ' Obnovte stránku (Ctrl+F5) a nabídku zkontrolujte.')
    .concat(fotoVarovani ? [fotoVarovani] : [])   // SEC-M16
    .concat(pdPoznamka && pdPoznamka.varovani ? [pdPoznamka.varovani] : [])   // VSD
    .concat(pdPoznamkaZak && pdPoznamkaZak.varovani ? [pdPoznamkaZak.varovani] : []).join(' ');   // VZ-E5
  /* Slevy tak, jak je server uložil (revize 13. 10. 2026): schvalovaniServerKontrola
   * může čas rozhodnutí orazítkovat nebo vrátit uložené rozhodnutí (B101,
   * B105). Prohlížeč si je převezme — jinak by ukazoval jiný stav slevy, než
   * jaký leží v databázi, a zámek nabídky by při dalším uložení nesouhlasil. */
  const slevy = (zak.varianty || []).filter(v => v && v.data)
    .map(v => ({ id: v.id, sleva: v.data.sleva || null, slevaProj: v.data.slevaProj || null,
      /* Cenová výjimka (13. 10. 2026) — server ji razí stejně jako slevu. */
      cenovaVyjimka: v.data.cenovaVyjimka || null,
      /* Ruční ceny položek (#561) — razítko potvrzení píše server. */
      rucniCeny: v.data.rucniCeny || null }));
  /* Razítko přijetí zámků (K40-S1, #580) — prohlížeč si ho dopíše do místní
   * kopie zámku (onlinePrijatoZeServeru), ať pole data prodeje bere tutéž mez
   * jako server. Jen zamčené varianty s razítkem. */
  const zamkyPrijato = {};
  (zak.varianty || []).forEach(v => {
    if (v && v.zamek && v.zamek.zamceno && typeof v.zamek.prijato === 'string') zamkyPrijato[v.id] = v.zamek.prijato;
  });
  const pdP = pdPoznamka && pdPoznamka.stav !== 'bez' ? { pdPoznamka: pdPoznamka.stav } : {};   // VSD: jen kde se o zápis šlo
  if (pdPoznamkaZak && pdPoznamkaZak.stav !== 'bez') pdP.pdPoznamkaZakaznici = pdPoznamkaZak.stav;   // VZ-E5
  /* VZ T1 (N3): skutečná organizace dealu, kterou server drží / právě přečetl — prohlížeč si ji převezme
   * (hlavička a náhled poznámky pak počítají s tímtéž jako zápis). Jen když ji zakázka má; stará hodnota
   * jiného dealu v prohlížeči nevadí (vzOrgDealuZnama ji podle dealu nepočítá). */
  if (zak.pdOrgDealu) pdP.pdOrgDealu = zak.pdOrgDealu;
  return json(varovani ? { ok: true, soubor: jmeno, razitko, varovani, slevy, zamkyPrijato, ...pdP }
    : { ok: true, soubor: jmeno, razitko, slevy, zamkyPrijato, ...pdP });
};
export const config = { path: '/api/zakazky' };

/* NN B238: snímek lhůt PROJ drží server (viz volání výš). */
export function lhutyProjServerDrz(stara, zak, firma) {
  const G = globalThis;
  if (!zak || !Array.isArray(zak.varianty) || typeof G.lhutyProjEf !== 'function' || typeof G.variantaProdana !== 'function') return '';
  const obj = (x) => !!x && typeof x === 'object' && !Array.isArray(x);
  const ulozene = new Map(((stara && Array.isArray(stara.varianty)) ? stara.varianty : []).filter(obj).map(v => [v.id, v]));
  const tabulka = obj(firma) && obj(firma.udaje) ? firma.udaje.lhutyProj : (obj(firma) ? firma.lhutyProj : null);
  for (const v of zak.varianty) {
    if (!obj(v) || !obj(v.data)) continue;
    const sv = ulozene.get(v.id);
    /* Prodaná už v uložené verzi: snímek je zmrazený v porovnání zámku —
     * změnu odmítne kontrola (403), tady se nesahá. */
    if (sv && G.variantaProdana(sv)) continue;
    /* Zámek nový v tomto uložení (tisk + případně Prodáno najednou): data
     * varianty ověřuje snímek zámku, který spočítal klient — přepis by ho
     * rozbil (409). Snímek lhůt se proto jen OVĚŘÍ proti tabulce Firmy. */
    const zamekNovy = !!(v.zamek && v.zamek.zamceno) && !(sv && sv.zamek && sv.zamek.zamceno);
    const klientsky = obj(v.data.kryciProj) ? v.data.kryciProj.lhutyProj : undefined;
    if (zamekNovy) {
      /* Revize Fable R2 — MEZ: chybějící snímek se NEodmítá. Skutečný klient ho
       * v cestě „Prodáno po neuloženém tisku klonu“ (overit_klon_tisk #555)
       * neposílá a 409 by zablokovalo poctivý prodej; přidat ho server nemůže
       * (rozbil by snímek zámku spočítaný klientem). Prodaná varianta pak
       * termíny počítá z aktuální tabulky Firmy (stav před D8). */
      if (G.variantaProdana(v) && klientsky !== undefined
        && JSON.stringify(klientsky) !== JSON.stringify(G.lhutyProjEf(tabulka)))
        return 'Neuloženo: lhůty PROJ v prodávané variantě nesedí s tabulkou Firmy. Načtěte Firmu znovu (obnovte stránku) a prodejte znovu.';
      continue;
    }
    if (G.variantaProdana(v) && obj(v.data.proj)) {
      if (!obj(v.data.kryciProj)) v.data.kryciProj = { hodnoty: {} };
      v.data.kryciProj.lhutyProj = JSON.parse(JSON.stringify(G.lhutyProjEf(tabulka)));
    } else if (obj(v.data.kryciProj)) delete v.data.kryciProj.lhutyProj;
  }
  return '';
}
