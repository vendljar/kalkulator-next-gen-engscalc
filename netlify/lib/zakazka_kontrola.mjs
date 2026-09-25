/* ============================================================
 * JEDNA KONTROLNÍ FUNKCE ZAKÁZKY PRO ULOŽENÍ I OBNOVU (P4 / B72, 25. 9. 2026)
 *
 * PROČ. Hloubkový test 24. 9. 2026 (nález B72): obnova ze zálohy měla vlastní,
 * menší sadu pojistek než běžné uložení přes /api/zakazky. Uložení hlídalo
 * rozhodnutí o slevě (B2), minimální marži (B71), číslo odeslané nabídky
 * (B56, B61), razítka zámku (B62), ověření zmrazeného výsledku (B59)
 * a značky ukázkového ceníku; obnova jen tvar id, typy polí a zámky.
 * Pokusem tak obnovou prošla sleva 60 % „schválená" vymyšleným jménem
 * a záloha ve starším tvaru (se značkou ukázkového ceníku v zamčené
 * variantě) hlásila „změnila by se data uzamčené nabídky", protože uložení
 * značky na obou stranách porovnání čistí a obnova ne (nález A3 z 25. 9.).
 * Dvě kopie pojistek se rozešly a rozcházely by se dál s každou další.
 *
 * Proto stojí pojistky NA JEDNOM MÍSTĚ a volají je obě cesty:
 *   functions/zakazky.mjs  (POST /api/zakazky)   … rezim 'ulozeni'
 *   functions/obnova.mjs   (POST /api/obnova)    … rezim 'obnova'
 *
 * ROZDÍLY MEZI REŽIMY (a proč):
 *   – v obnově je zakázka DOKLAD ze zálohy: razítka (kdo odeslal, kdo odemkl,
 *     autor, kdo schválil slevu) se nepřepisují osobou, která obnovu spouští;
 *     rozhodnutí o slevě se posoudí nad kopií a zapíše se, jak leží v záloze;
 *   – číslo odeslané nabídky, které nesedí s údaji zakázky, obnova
 *     nepřepisuje (uložení ho administrátorovi srovná) — zakázka se přeskočí
 *     s důvodem;
 *   – pojistka B61 (nový zámek musí nést číslo z papíru) platí jen pro
 *     uložení: zámek pořízený před #320 je v záloze historie, ne nový zámek;
 *   – hlášky: uložení mluví k obchodníkovi („Neuloženo: … Pokračujte klonem
 *     varianty."), obnova vrací důvod přeskočení do přehledu.
 * Všechno ostatní je společné: typy polí, očista značek, odemčení jen
 * administrátor, zámky a data odeslané nabídky (N43: obě strany po téže
 * migraci), razítka existujícího zámku z uložené verze, sleva a marže,
 * ověření výsledku zámku.
 *
 * Kontext `ctx`: { ULO, SCHV, JEKLY, slevyNast, verzeServeru, rezim }.
 * Vrací { ok:true, zak, sporne } nebo { ok:false, status, chyba }.
 * ============================================================ */

export const ZAKAZKA_MAX_B = 4 * 1024 * 1024;
export const CISLO_MAX = 60;

/* Značky ukázkového a prázdného ceníku se do databáze neukládají (P2, nálezy
 * N2/N3, 21. 9. 2026). Čistí se OBĚ strany porovnání zamčených variant —
 * příchozí zakázka i kopie uložené verze (zapisuje se jen příchozí). */
export function ocistiZnacky(z) {
  if (!z || typeof globalThis.ukazkoveOcisti !== 'function') return;
  for (const v of (z.varianty || [])) {
    const d = (v && v.data) || null;
    if (!d) continue;
    globalThis.ukazkoveOcisti(d.cenik);
    if (d.proj) globalThis.ukazkoveOcisti(d.proj.cenik);
  }
}

/* PŘIJETÍ ZAKÁZKY: migrace (importZakazka), jméno souboru, délka čísla, tvar
 * a jedinečnost identifikátorů (B1, B26, B29, B45, B82). importZakazka na
 * nesmyslném vstupu vyhodí výjimku — bez obalu by z ní byla holá 502. */
export function zakazkaPrijmi(telo, ULO) {
  let zak;
  try { zak = globalThis.importZakazka(telo || {}); }
  catch (e) { return { ok: false, status: 400, chyba: 'Zakázku se nepodařilo přečíst: ' + e.message }; }
  const jmeno = ULO.uloJmenoSouboru(zak);
  if (!jmeno) return { ok: false, status: 400, chyba: 'Zakázka nemá vyplněné číslo nabídky.' };
  if (String(zak.cislo || '').length > CISLO_MAX)
    return { ok: false, status: 400, chyba: 'Číslo nabídky je příliš dlouhé (nejvýš ' + CISLO_MAX + ' znaků).' };
  const spatnaId = ULO.uloIdProblemy(zak);
  if (spatnaId.length)
    return { ok: false, status: 400, chyba: 'Zakázka nese ' + ULO.uloIdProblemyText(spatnaId) + '.' };
  return { ok: true, zak, jmeno };
}

export function zakazkaServerKontrola(stara, zak, relace, ctx) {
  const { ULO, SCHV, JEKLY } = ctx;
  const obnova = ctx.rezim === 'obnova';
  const slevyNast = ctx.slevyNast || {};
  const verzeServeru = ctx.verzeServeru || '';
  relace = relace || {};
  const odmitni = (status, chyba) => ({ ok: false, status, chyba });
  /* Věta odmítnutí: obchodníkovi „Neuloženo: … Pokračujte klonem varianty.",
   * do přehledu obnovy jen důvod. */
  const veta = (duvod, klon) => (obnova ? duvod : 'Neuloženo: ' + duvod + (klon ? '. Pokračujte klonem varianty.' : ''));
  const zamcena = (v) => !!(globalThis.variantaUzamcena && globalThis.variantaUzamcena(v));
  const cisloVarianty = (z, v) => String((globalThis.variantaCislo && globalThis.variantaCislo(z, v)) || '');

  /* Typy polí zadání a ceníku (#340, návrh P1): čísla, pravdy a volby musí
   * mít tvar, jaký dává výchozí zadání. Varianty zamčené už v uložené verzi
   * se přeskakují — doklad se neposuzuje. */
  const spatneTypy = ULO.uloTypyProblemy(zak, stara);
  if (spatneTypy.length)
    return odmitni(400, 'Zakázka nese ' + ULO.uloIdProblemyText(spatneTypy) + '.');

  ocistiZnacky(zak);
  ocistiZnacky(stara);

  /* Uložená verze PO TÉŽE MIGRACI (N43): porovnává se s ní obsah zamčených
   * variant i rozhodnutí o slevě — „stejné rozhodnutí, jaké už v databázi
   * je" musí znamenat totéž, co z databáze udělá dnešní import. Zakázka
   * z doby před vlastní slevou PROJ (12. 8. 2026) nese slevu jen jako
   * `slevaPct`; import z ní udělá schválenou slevu s razítkem „převzato",
   * a kdyby se porovnávala se syrovou uloženou verzí, vypadala by při
   * každém uložení jako NOVÉ rozhodnutí: server by ji obchodníkovi nad
   * stropem odmítl a jinak by razítko přepsal jménem toho, kdo ukládá —
   * i uvnitř odeslané nabídky. */
  let staraPorovnani = stara;
  if (stara) {
    try { staraPorovnani = globalThis.importZakazka(JSON.parse(JSON.stringify(stara))); ocistiZnacky(staraPorovnani); }
    catch (e) { staraPorovnani = stara; }
  }

  if (stara) {
    /* Odemčení odeslané nabídky smí jen administrátor (B3); razítko kdo/kdy
     * píše server z relace — v obnově zůstává razítko ze zálohy (doklad). */
    const odemcene = ULO.uloOdemceniPribylo(stara, zak);
    if (odemcene.length) {
      if (relace.role !== 'Administrátor')
        return odmitni(403, 'Odemknout odeslanou (uzamčenou) nabídku smí jen '
          + 'administrátor. Pokračujte klonem varianty.');
      if (!obnova) for (const v of odemcene) {
        const posledni = v.odemceni[v.odemceni.length - 1];
        if (posledni && typeof posledni === 'object') {
          posledni.kdo = relace.jmeno ? relace.jmeno + ' <' + relace.email + '>' : relace.email;
          posledni.kdy = new Date().toISOString();
        }
      }
    }
    /* Vytištěná (odeslaná) nabídka se nikdy nepřepíše: 1) táž kontrola
     * zámků jako u složky, 2) u zamčené varianty se nesmí změnit ani data. */
    const k = ULO.uloKontrolaZamku(stara, zak);
    if (!k.ok)
      return odmitni(409, obnova
        ? 'uzamčená (odeslaná) nabídka: ' + k.problemy.map(ULO.uloProblemPopis).join('; ')
        : 'Neuloženo: ' + k.problemy.map(ULO.uloProblemPopis).join('; ') + '. Pokračujte klonem varianty.');
    /* STARŠÍ TVAR DAT NESMÍ ZABLOKOVAT ODESLANOU NABÍDKU (N43, 24. 9. 2026).
     * Příchozí zakázka prošla `importZakazka`, uložená verze je v úložišti
     * ve starém tvaru — porovnává se proto s KOPIÍ uložené verze, která
     * prošla toutéž migrací a očistou (výš). Zapisuje se dál jen `zak`. */
    for (const sv of (staraPorovnani.varianty || [])) {
      if (!zamcena(sv)) continue;
      const nv = (zak.varianty || []).find(v => v && v.id === sv.id);
      if (nv && JSON.stringify(nv.data) !== JSON.stringify(sv.data))
        return odmitni(409, obnova
          ? 'změnila by se data uzamčené (odeslané) nabídky' + (cisloVarianty(stara, sv) ? ' (' + cisloVarianty(stara, sv) + ')' : '')
          : 'Neuloženo: změnila by se data uzamčené (odeslané) nabídky. Pokračujte klonem varianty.');
    }
    /* Razítka mimo klíč zámku (kdo, popis, šablona, tisky[], odemceni[])
     * se u existujícího zámku berou z uložené verze (B62). */
    ULO.uloZamekRazitkaDrz(stara, zak);
  }

  /* ČÍSLO ODESLANÉ NABÍDKY MĚNÍ JEN ADMINISTRÁTOR (B56): zámek nese číslo
   * z okamžiku odeslání. Zámek od #320 se hlídá celý (cisloPapir), starší
   * jen v základu čísla. Administrátorovi uložení razítko srovná; obnova
   * nic nepřepisuje a zakázku přeskočí. */
  const jineCislo = [];
  for (const v of (zak.varianty || [])) {
    if (!zamcena(v)) continue;
    const bylo = String((v.zamek && v.zamek.cislo) || '');
    if (!bylo) continue;
    const ted = cisloVarianty(zak, v);
    const sedi = v.zamek.cisloPapir ? bylo === ted : globalThis.zamekCisloZakladSedi(bylo, zak);
    if (!sedi) jineCislo.push({ v, bylo, ted });
  }
  if (jineCislo.length) {
    if (obnova)
      return odmitni(409, 'odeslaná (uzamčená) nabídka nese jiné číslo (' + jineCislo[0].bylo + ') než údaje zakázky ('
        + jineCislo[0].ted + ') — obnova číslo nepřepisuje');
    if (relace.role !== 'Administrátor')
      return odmitni(403, 'Neuloženo: zakázka má odeslanou (uzamčenou) nabídku '
        + 'číslo ' + jineCislo[0].bylo + ', takže číslo smí změnit jen administrátor. '
        + 'Požádejte ho o opravu — změna se zapisuje do protokolu zakázky.');
    for (const x of jineCislo) x.v.zamek.cislo = x.ted;
  }

  /* Rozhodnutí o slevě (B2) hlídá SCHV.schvalovaniServerKontrola proti
   * stropům z programu a roli z relace; razítka píše server. V obnově se
   * posuzuje kopie — razítka v záloze jsou doklad a zůstávají. */
  const cil = obnova ? JSON.parse(JSON.stringify(zak)) : zak;
  const rozhodnuti = SCHV.schvalovaniServerKontrola(staraPorovnani, cil, relace, slevyNast);
  if (!rozhodnuti.ok) return odmitni(403, veta(rozhodnuti.chyba));
  /* Minimální marže u platné slevy (#341, B71): strop role nestačí, marži
   * přepočítá server týmž jádrem jako prohlížeč. */
  const marze = SCHV.schvalovaniServerMarze(staraPorovnani, zak, JEKLY, slevyNast);
  if (!marze.ok) return odmitni(403, veta(marze.chyba));

  if (!obnova) {
    /* Autor: nová zakázka dostane autora z relace (cizího smí ponechat jen
     * administrátor — obnova ze souboru); u existující je autor ten
     * z uložené verze, z těla požadavku se nebere (B13, B73). */
    if (!stara) {
      if (!zak.autor || zak.autor === relace.email || relace.role !== 'Administrátor')
        zak.autor = relace.email;
    } else {
      zak.autor = stara.autor || relace.email;
    }
    zak.upravil = relace.email;
  }

  /* Zámky: u zámku, který už v uložené verzi byl, se razítko ověření
   * převezme z ní (klientské se zahodí, B59). NOVÝ zámek při uložení musí
   * nést číslo z papíru (B61), `kdo` z relace (B13) a server mu výsledek
   * ověří (B59). V obnově je zámek ze zálohy doklad: číslo se nehlídá
   * (zámky před #320 značku nemají), `kdo` zůstává, ověření se doplní jen
   * tam, kde chybí. */
  const sporne = [];
  for (const v of (zak.varianty || [])) {
    if (!v || !v.zamek || !v.zamek.zamceno) continue;
    const sv = stara ? (stara.varianty || []).find(x => x && x.id === v.id) : null;
    if (sv && sv.zamek && sv.zamek.zamceno) {                   // zámek už byl — nesahat
      if (sv.zamek.overeni) v.zamek.overeni = sv.zamek.overeni;
      else delete v.zamek.overeni;
      continue;
    }
    if (obnova) {
      if (!v.zamek.overeni) {
        const ov = globalThis.zamekOvereni(v, JEKLY, verzeServeru);
        if (ov) v.zamek.overeni = ov;
      }
      continue;
    }
    const cisloMaBy = cisloVarianty(zak, v);
    if (String(v.zamek.cislo || '') !== cisloMaBy || v.zamek.cisloPapir !== true)
      return odmitni(409, 'Neuloženo: nová odeslaná (uzamčená) nabídka nese jiné číslo ('
        + (v.zamek.cislo || 'prázdné') + '), než dávají údaje zakázky (' + (cisloMaBy || 'prázdné')
        + '). Obnovte stránku (Ctrl+F5) a nabídku vytiskněte znovu.');
    v.zamek.kdo = relace.jmeno ? relace.jmeno + ' <' + relace.email + '>' : relace.email;
    const ov = globalThis.zamekOvereni(v, JEKLY, verzeServeru);
    if (ov) v.zamek.overeni = ov; else delete v.zamek.overeni;
    if (ov && ov.stav !== 'shoda') sporne.push({ cislo: v.zamek.cislo || cisloMaBy, ov });
  }

  if (!obnova) {
    /* Jméno obchodníka do rejstříku: z RELACE, ne od klienta (21. 8. 2026);
     * u cizí zakázky z uložené verze (B73). */
    if (zak.autor === relace.email && relace.jmeno) zak.autorJmeno = relace.jmeno;
    else if (stara && stara.autor === zak.autor) {
      if (stara.autorJmeno) zak.autorJmeno = stara.autorJmeno; else delete zak.autorJmeno;
    } else if (relace.role !== 'Administrátor') delete zak.autorJmeno;
  }

  return { ok: true, zak, sporne };
}
