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

const ZAKAZKA_MAX_B = 4 * 1024 * 1024;
const CISLO_MAX = 60;

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
  /* importZakazka na nesmyslném vstupu vyhodí výjimku. Bez tohohle obalu by
   * z ní vznikl pád funkce (Netlify vrátí holou 502) — a to je špatná odpověď
   * hned dvakrát: uživatel se nedozví, co poslal špatně, a v odpovědi se může
   * objevit kus vnitřku serveru. Odmítnutí patří sem, srozumitelně. */
  let zak;
  try { zak = globalThis.importZakazka(t.zakazka || {}); }
  catch (e) { return json({ ok: false, chyba: 'Zakázku se nepodařilo přečíst: ' + e.message }, 400); }
  const jmeno = ULO.uloJmenoSouboru(zak);
  if (!jmeno) return json({ ok: false, chyba: 'Zakázka nemá vyplněné číslo nabídky.' }, 400);
  if (String(zak.cislo || '').length > CISLO_MAX)
    return json({ ok: false, chyba: 'Číslo nabídky je příliš dlouhé (nejvýš ' + CISLO_MAX + ' znaků).' }, 400);

  /* Tvar identifikátorů (bezpečnostní audit 22. 8. 2026, nález B1). Id variant,
   * poznámek a příloh jdou v obrazovce do onclick; obrazovka je od 22. 8.
   * escapuje, ale server navíc nepustí dovnitř nic, co není písmeno, číslice,
   * tečka, podtržítko nebo pomlčka. Dvě vrstvy — kdyby jedna selhala. */
  /* Od 9. 9. 2026 (B26, B29) hlídá uloIdProblemy i `kid` trvalých položek
   * ceníku uvnitř variant a jedinečnost id variant, poznámek a příloh. */
  const spatnaId = ULO.uloIdProblemy(zak);
  if (spatnaId.length)
    return json({ ok: false, chyba: 'Zakázka nese ' + ULO.uloIdProblemyText(spatnaId) + '.' }, 400);

  /* vytištěná (odeslaná) nabídka se nikdy nepřepíše. Dvě vrstvy:
   * 1) TÁŽ kontrola jako u složky (uloKontrolaZamku) — zámek nesmí zmizet
   *    ani se změnit; žádná druhá pravda o zámcích.
   * 2) Serverová pojistka navíc: u zamčené varianty se nesmí změnit ANI DATA.
   *    V aplikaci to hlídá obrazovka, ale server mluví s kýmkoli — upravený
   *    klient by jinak mohl přepsat obsah odeslané nabídky a zámek si nechat. */
  const stara = await s.cti('z/' + jmeno);

  /* ZNAČKY UKÁZKOVÉHO A PRÁZDNÉHO CENÍKU SE DO DATABÁZE NEUKLÁDAJÍ
   * (P2, nálezy N2/N3, 21. 9. 2026).
   *
   * Příčinu řeší jádro (`cenikDoplnKlice` značky ze vzoru nedoplňuje);
   * tohle je druhá obrana: značka může přijít i starším klientem, importem
   * souboru nebo ze zakázky uložené dřív, než se oprava nasadila. Uložená
   * značka je zákeřná v tom, že uzamčené varianty se při načtení
   * nepřepočítávají — zůstala by tam napořád a vypínala tisk nabídky
   * u zakázky, která ceník má (ostré 0383 a 377).
   *
   * STOJÍ TO PŘED KONTROLOU UZAMČENÝCH VARIANT, A TO SCHVÁLNĚ. Ta kontrola
   * porovnává `data` uložené a příchozí varianty na shodu znak po znaku;
   * kdyby se značky odstraňovaly až těsně před zápisem, uložená verze by
   * je neměla, příchozí ano, a legitimní uložení by spadlo na 409 „změnila
   * by se data uzamčené nabídky". Čistí se proto OBĚ strany: příchozí
   * zakázka i kopie té uložené, kterou server drží jen pro porovnání
   * (zapisuje se `zak`, `stara` se nikdy neukládá).
   *
   * Čistí se jen značky, ne ceny — obsahu ceníku se to nedotýká. */
  const ocistiZnacky = (z) => {
    if (!z || typeof globalThis.ukazkoveOcisti !== 'function') return;
    for (const v of (z.varianty || [])) {
      const d = (v && v.data) || null;
      if (!d) continue;
      globalThis.ukazkoveOcisti(d.cenik);
      if (d.proj) globalThis.ukazkoveOcisti(d.proj.cenik);
    }
  };
  ocistiZnacky(zak);
  ocistiZnacky(stara);
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
  if (stara) {
    /* Odemčení odeslané nabídky smí jen administrátor (audit 22. 8. 2026, B3).
     * uloKontrolaZamku bere zmizení zámku jako řádné, když přibyl záznam
     * v odemceni[] — ale KDO ho přidal, do té doby nikdo na serveru neověřil.
     * Teď: přibylo-li odemčení, vyžaduje se role Administrátor a razítko
     * kdo/kdy se přepíše z relace, ne z toho, co poslal klient. */
    const odemcene = ULO.uloOdemceniPribylo(stara, zak);
    if (odemcene.length) {
      if (relace.role !== 'Administrátor')
        return json({ ok: false, chyba: 'Odemknout odeslanou (uzamčenou) nabídku smí jen '
          + 'administrátor. Pokračujte klonem varianty.' }, 403);
      for (const v of odemcene) {
        const posledni = v.odemceni[v.odemceni.length - 1];
        if (posledni && typeof posledni === 'object') {
          posledni.kdo = relace.jmeno ? relace.jmeno + ' <' + relace.email + '>' : relace.email;
          posledni.kdy = new Date().toISOString();
        }
      }
    }
    const k = ULO.uloKontrolaZamku(stara, zak);
    if (!k.ok)
      return json({ ok: false, chyba: 'Neuloženo: '
        + k.problemy.map(ULO.uloProblemPopis).join('; ')
        + '. Pokračujte klonem varianty.' }, 409);
    for (const sv of (stara.varianty || [])) {
      if (!(globalThis.variantaUzamcena && globalThis.variantaUzamcena(sv))) continue;
      const nv = (zak.varianty || []).find(v => v && v.id === sv.id);
      if (nv && JSON.stringify(nv.data) !== JSON.stringify(sv.data))
        return json({ ok: false, chyba: 'Neuloženo: změnila by se data uzamčené (odeslané) '
          + 'nabídky. Pokračujte klonem varianty.' }, 409);
    }
    /* Razítka mimo klíč zámku (kdo, popis, šablona, tisky[], odemceni[])
     * se u existujícího zámku berou z uložené verze (nález B62). Až PO
     * razítku nového odemčení výš, aby se jeho kdo/kdy nepřepsalo. */
    ULO.uloZamekRazitkaDrz(stara, zak);
  }

  /* ČÍSLO ODESLANÉ NABÍDKY MĚNÍ JEN ADMINISTRÁTOR — TAKY NA SERVERU
   * (bezpečnostní audit 22. 9. 2026, nález B56).
   *
   * Do 22. 9. to hlídal jedině prohlížeč (`common.js`, rozhodnutí J. V.
   * z 15. 9. 2026: „Pouze administrátor"). Server kontroloval u čísla jen
   * délku — a právě u čísla je díra zákeřná: číslo určuje JMÉNO SOUBORU.
   * Změnou čísla zakázka spadne pod jiné jméno, `stara` je tedy prázdná
   * a VŠECHNY kontroly zámku výš se přeskočí. Odeslaná nabídka tak mohla
   * dostat jiné číslo, než jaké má zákazník na papíře.
   *
   * Pozná se to ZE ZÁMKU SAMOTNÉHO, ne z uložené zakázky: `zamek.cislo`
   * drží číslo z okamžiku odeslání (plní ho `variantaCislo` při zamykání).
   * Kontrola je proto vnitřní a funguje i tam, kde není s čím porovnávat.
   *
   * Zámky pořízené před zavedením pole `cislo` ho mají prázdné — ty se
   * přeskakují, jinak by oprava zablokovala historické zakázky.
   *
   * MEZ, KTEROU TOHLE NEZAVŘE: kdo si upraví klienta, může přepsat číslo
   * i razítko v zámku najednou. Výsledek je ale nová zakázka pod novým
   * jménem; původní soubor s původním číslem zůstává nedotčený, takže se
   * stopa neztrácí. Tady jde o to, aby se číslo nedalo změnit NEDOPATŘENÍM
   * ani běžným klientem. */
  /* JEDNO ČÍSLO VARIANTY (#320, 22. 9. 2026). Zámek pořízený od #320 nese
   * v `cislo` číslo z papíru (značka `cisloPapir`, je v klíči zámku) —
   * u něj se hlídá CELÉ číslo, tedy i přípona: přečíslovat odeslanou nabídku
   * .2 na .7 je stejná změna jako přepsat základ. Starší zámky mají v `cislo`
   * příponu z dřívějšího číslování (první klon .1, na papíře .2); zakázka se
   * při načtení přečíslovala podle papíru, takže u nich se hlídá jen ZÁKLAD
   * čísla — jinak by migrace sama o sobě zablokovala každé uložení zakázky
   * se starou odeslanou variantou. */
  const jineCislo = [];
  for (const v of (zak.varianty || [])) {
    if (!(globalThis.variantaUzamcena && globalThis.variantaUzamcena(v))) continue;
    const bylo = String((v.zamek && v.zamek.cislo) || '');
    if (!bylo) continue;
    const ted = String(globalThis.variantaCislo(zak, v) || '');
    const sedi = v.zamek.cisloPapir ? bylo === ted : globalThis.zamekCisloZakladSedi(bylo, zak);
    if (!sedi) jineCislo.push({ v, bylo, ted });
  }
  if (jineCislo.length) {
    if (relace.role !== 'Administrátor')
      return json({ ok: false, chyba: 'Neuloženo: zakázka má odeslanou (uzamčenou) nabídku '
        + 'číslo ' + jineCislo[0].bylo + ', takže číslo smí změnit jen administrátor. '
        + 'Požádejte ho o opravu — změna se zapisuje do protokolu zakázky.' }, 403);
    /* Administrátor smí. Razítko v zámku pak srovná server, ať zakázka
     * nezůstane natrvalo v rozporu sama se sebou a nepadala při každém
     * dalším uložení kolegy. */
    for (const x of jineCislo) x.v.zamek.cislo = x.ted;
  }

  /* Rozhodnutí o slevě (bezpečnostní audit 22. 8. 2026, nález B2). Stav
   * „schváleno" / „zamítnuto" a jméno schvalovatele se do té doby přebíraly
   * z prohlížeče. Teď je hlídá SCHV.schvalovaniServerKontrola proti stropům
   * z programu (program/db.slevy) a roli z relace; razítka píše server. */
  const prog = await (await uloziste('program')).cti('db');
  const slevyNast = (prog && prog.platny && prog.platny.slevy) || {};
  const rozhodnuti = SCHV.schvalovaniServerKontrola(stara, zak, relace, slevyNast);
  if (!rozhodnuti.ok) return json({ ok: false, chyba: 'Neuloženo: ' + rozhodnuti.chyba }, 403);

  /* Autor zakázky (11. 8. 2026). Doteď se nikde nepsalo, kdo zakázku založil —
   * rejstřík věděl jen, kdo do něj naposledy sáhl. Bez autora se ale nedá
   * převést práce po odcházejícím kolegovi na někoho jiného, což je přesně
   * to, kvůli čemu archivace účtů vznikla.
   *
   * Autor se zapisuje jen jednou, při prvním uložení. Kdyby se přepisoval
   * pokaždé, „autorem" by se stal ten, kdo si zakázku naposledy otevřel
   * a uložil — a razítko by ztratilo smysl. Kdo naposledy sáhl, je `upravil`. */
  /* Razítka při založení (audit 22. 8. 2026, nález B13). Do té doby se
   * `autor` u NOVÉ zakázky přebíral z těla požadavku, když tam byl — obchodník
   * mohl založit zakázku „za" vedoucího. Teď: nová zakázka (v databázi ještě
   * není) dostane autora z relace; cizího autora smí u nové zakázky ponechat
   * jen administrátor (obnova ze souboru/zálohy — tam je razítko doklad).
   * U existující se autor nepřepisuje (11. 8. 2026), viz níž. */
  if (!stara) {
    if (!zak.autor || zak.autor === relace.email || relace.role !== 'Administrátor')
      zak.autor = relace.email;
  } else if (!zak.autor) zak.autor = relace.email;
  zak.upravil = relace.email;
  /* Totéž pro razítko zámku: NOVĚ vzniklý zámek (v uložené verzi varianta
   * zamčená nebyla) nese `kdo` z relace, ne z klienta. `kdy` se nechává —
   * je součástí klíče zámku a klient si ho drží v rozpracované kopii. */
  /* ZMRAZENÝ VÝSLEDEK NOVÉHO ZÁMKU OVĚŘÍ SERVER (nález B59, revize v22.9.9,
   * 22. 9. 2026).
   *
   * B53 chrání zmrazený výsledek PO zamčení — ale ten výsledek do té doby
   * pořizoval jedině prohlížeč a server ho při vzniku zámku převzal, jak
   * přišel. Upravený klient tak mohl zamknout nabídku s jinými čísly, než
   * dávají data (třeba s větší slevou, než smí schválit), a od té chvíle ji
   * B53 chránil jako pravdu.
   *
   * Server teď výsledek každého NOVÉHO zámku přepočítá tímž jádrem
   * (zamekOvereni → zamekVysledekSpocti, tentýž kód, kterým ho pořizuje
   * prohlížeč) a výsledek porovnání zapíše do zámku jako razítko `overeni`.
   *
   * PROČ RAZÍTKO A NE ODMÍTNUTÍ (rozhodnuto při opravě): v okamžiku uložení
   * je dokument už vytištěný nebo stažený — server papír nezastaví. Odmítnutí
   * by jen nechalo variantu v databázi odemčenou a dál upravitelnou, tedy
   * horší stopu než zámek s rozporem zapsaným natrvalo. A poctivého obchodníka
   * se stránkou načtenou těsně před nasazením nové verze (hlídka verze se
   * ptá jednou za 10 minut) by zablokovalo: jeho výsledek spočítalo starší
   * jádro a papír nese právě ta čísla — přesně ta se mají v zámku držet.
   * Rozpor je proto vidět v liště zámku u každého, kdo variantu otevře,
   * a hned v hlášce po uložení.
   *
   * Razítko píše VÝHRADNĚ server: u nového zámku ho spočítá, u zámku, který
   * už v uložené verzi byl, ho převezme z ní (klientské `overeni` se zahodí
   * v obou případech). Klíč zámku (uloZamekKlic) ho neobsahuje schválně —
   * pracovní kopie v prohlížeči ho nemá a mít nemusí. */
  const verzeServeru = serverVerze();
  const sporne = [];
  for (const v of (zak.varianty || [])) {
    if (!v || !v.zamek || !v.zamek.zamceno) continue;
    const sv = stara ? (stara.varianty || []).find(x => x && x.id === v.id) : null;
    if (sv && sv.zamek && sv.zamek.zamceno) {                   // zámek už byl — nesahat
      if (sv.zamek.overeni) v.zamek.overeni = sv.zamek.overeni;
      else delete v.zamek.overeni;
      continue;
    }
    /* NOVÝ ZÁMEK NESE ČÍSLO, KTERÉ DÁVAJÍ DATA (23. 9. 2026, nález B61).
     * Kontrola B56 výš přeskakuje zámek s prázdným `cislo` (kvůli zámkům
     * z doby před tím polem) — upravený klient tak mohl založit NOVÝ zámek
     * s vymazaným číslem a zakázka pod jiným jménem souboru prošla bez
     * porovnání. Nový zámek ale vzniká jedině v aplikaci od #320, která
     * do něj píše číslo z papíru i značku `cisloPapir`; co se liší, není
     * z aplikace. Odmítá se každému — i administrátorovi, protože jeho
     * aplikace takový zámek vyrobit neumí. */
    const cisloMaBy = String(globalThis.variantaCislo(zak, v) || '');
    if (String(v.zamek.cislo || '') !== cisloMaBy || v.zamek.cisloPapir !== true)
      return json({ ok: false, chyba: 'Neuloženo: nová odeslaná (uzamčená) nabídka nese jiné číslo ('
        + (v.zamek.cislo || 'prázdné') + '), než dávají údaje zakázky (' + (cisloMaBy || 'prázdné')
        + '). Obnovte stránku (Ctrl+F5) a nabídku vytiskněte znovu.' }, 409);
    v.zamek.kdo = relace.jmeno ? relace.jmeno + ' <' + relace.email + '>' : relace.email;
    const ov = globalThis.zamekOvereni(v, JEKLY, verzeServeru);
    if (ov) v.zamek.overeni = ov; else delete v.zamek.overeni;
    if (ov && ov.stav !== 'shoda') sporne.push({ cislo: v.zamek.cislo || globalThis.variantaCislo(zak, v), ov });
  }
  /* Jméno obchodníka do rejstříku (21. 8. 2026, zadání J. V.). Bere se
   * z RELACE, ne od klienta — jméno v seznamu je stejné razítko jako autor
   * a nesmí jít podvrhnout. Zapisuje se při každém uložení, aby se
   * v seznamu projevila i změna jména v profilu. */
  if (zak.autor === relace.email && relace.jmeno) zak.autorJmeno = relace.jmeno;

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
