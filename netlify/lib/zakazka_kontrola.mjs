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

/* NOVÝ ZÁMEK Z CENÍKU BEZ CEN NEBO ZA NULU (#395 V3, 8. 10. 2026).
 *
 * Nová zakázka smí přijít s ceníkem sestavení (samé nuly — zakázka založená
 * před načtením ceníku, výjimka B113). Server jí ale značky prázdného ceníku
 * strhne (ocistiZnacky) a klient je podle obsahu nikdy nepřidává, takže po
 * znovuotevření zábrana ukazkovyCenik mlčí. Vlastní položka pak určí cenu
 * celé nabídky (standardní stojí 0) a tisk ji uzamkne — odeslaná nabídka
 * za libovolnou cenu bez schválení (revize 6. 10. 2026).
 *
 * Výměnu ceníku sestavení za zveřejněný na serveru (původní návrh) server
 * udělat nemůže: zakázku klientovi nevrací, ten by dál držel nuly a další
 * uložení by B113 odmítl. Hlídá se proto NOVÝ ZÁMEK — zrcadlo dokumentových
 * zábran ukazkovyCenik (ceník bez cen zastaví všechny dokumenty) a cenaNula
 * (nulová cena zastaví dokumenty své strany). Legitimní tisk tím neprojde
 * stejně (zábrany v prohlížeči), takže se nic poctivého nerozbije.
 * Administrátor a role s právem obou ceníků ceník měnit smí — nehlídá se;
 * část (OCK, PROJ), jejíž platný zveřejněný ceník nemá ceny, také ne
 * (stejně jako B113: dokud není s čím porovnat, počítá z nul každý).
 * Vrací větu důvodu, nebo ''. */
export function zamekNovyCenaProblem(zak, v, relace, matice, jekly, program) {
  /* Administrátor smí vždy (zobrazeniSmi), jiná role s právem obou ceníků taky. */
  const role = String((relace && relace.role) || '');
  const smi = (k) => typeof globalThis.zobrazeniSmi === 'function' && !!globalThis.zobrazeniSmi(role, k, matice || null);
  if (smi('tab.cenik') && smi('tab.cenikproj')) return '';
  /* Hlídá se jen část (OCK, PROJ), jejíž PLATNÝ zveřejněný ceník má ceny
   * (jako cenikHlidat v uloCenikProblemy): dokud takový není, počítá z nul
   * každý a nemá se čím nahradit. */
  const maCisla = typeof globalThis.ukazkoveMaCisla === 'function' ? globalThis.ukazkoveMaCisla : () => true;
  const platny = program && program.platny && program.platny.cenik ? program.platny : null;
  if (!platny) return '';
  const d = (v && v.data) || {};
  const hlidatOck = maCisla(platny.cenik), hlidatProj = maCisla(platny.cenikProj);
  if ((hlidatOck && !maCisla(d.cenik)) || (hlidatProj && !maCisla(d.proj && d.proj.cenik)))
    return 'odeslaná nabídka by vznikla z ceníku bez cen (ceník ze sestavení aplikace). '
      + 'Přepočítejte variantu podle platného ceníku a nabídku vytiskněte znovu';
  const z = v.zamek || {};
  const strany = new Set([z.typ].concat((Array.isArray(z.tisky) ? z.tisky : []).map(t => t && t.typ))
    .map(t => typeof globalThis.kontrolyDokumentStrana === 'function' ? globalThis.kontrolyDokumentStrana(t) : '').filter(Boolean));
  if (!strany.size) { strany.add('ock'); strany.add('proj'); }   // neznámý typ dokumentu: obě strany
  const jenProj = !!(zak && zak.jenProj);
  const spatne = [];
  if (hlidatOck && strany.has('ock') && !jenProj) {
    let o;
    try { o = globalThis.vypocet(d.ock.zadani, d.cenik, jekly, d.ock.fixes).souhrn.zakladCena; } catch (e) { o = NaN; }
    if (!(Number(o) > 0)) spatne.push('výtahová šachta (OCK)');
  }
  if (hlidatProj && strany.has('proj')) {
    let pv = null;
    try { pv = globalThis.vypocetProj(d.proj.zadani, d.proj.cenik); } catch (e) { pv = null; }
    const pj = pv && pv.souhrn ? Number(pv.souhrn.celkem) : NaN;
    const prodava = jenProj || (typeof globalThis.kontrolyProjProdava === 'function' && globalThis.kontrolyProjProdava(pv));
    if (!isFinite(pj) || pj < 0 || (prodava && !(pj > 0))) spatne.push('projekční práce (PROJ)');
  }
  return spatne.length ? 'cena odeslané nabídky vyšla nulová nebo to není číslo (' + spatne.join(', ') + ')' : '';
}

export function zakazkaServerKontrola(stara, zak, relace, ctx) {
  const { ULO, SCHV, JEKLY } = ctx;
  const obnova = ctx.rezim === 'obnova';
  /* Obnova ze SOUBORU (B98, 29. 9. 2026): soubor zálohy jde upravit
   * v editoru (zásada B27), razítka z něj proto nejsou doklad — ověření
   * nového zámku se spočítá znovu a odemčení, které v databázi není, se
   * neobnoví. Obnova z OTISKU (serverová záloha, klient ji upravit nemůže)
   * razítka přebírá, jak byla. */
  const zeSouboru = obnova && ctx.zeSouboru === true;
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
  /* Záporná částka, množství nebo hodiny (B111, 29. 9. 2026) — nikomu. */
  const zaporne = ULO.uloZaporneProblemy(zak, stara);
  if (zaporne.length) return odmitni(400, 'Zakázka nese ' + ULO.uloIdProblemyText(zaporne) + '.');
  /* Krok a směr obchodního zaokrouhlení z výčtu (B96, 29. 9. 2026). */
  const zaokr = ULO.uloZaokrProblemy(zak, stara);
  if (zaokr.length) return odmitni(400, 'Zakázka nese ' + ULO.uloIdProblemyText(zaokr) + '.');
  /* Ceník varianty a skryté přepisy podle role a matice (B112, 29. 9. 2026). */
  const cenik = ULO.uloCenikProblemy(zak, stara, { role: relace.role, matice: ctx.matice, program: ctx.program, importuj: globalThis.importZakazka });
  if (cenik.length) return odmitni(403, veta(ULO.uloCenikProblemyText(cenik)));

  /* NEZNÁMÝ ROZMĚR PROFILU (#372, nález A2-1 z 26. 9. 2026). Zakázka
   * s rozměrem mimo katalog jeklů (nebo s tloušťkou, kterou rozměr nemá) se
   * dřív uložila i obnovila — a pak se nikomu neotevřela. Neuzamčená varianta
   * s takovým profilem se odmítne; uzamčená (odeslaná) se nemění, a proto se
   * nekontroluje — jinak by zakázka po změně katalogu nešla uložit vůbec.
   * Katalog je týž JEKLY, se kterým server počítá, a seznam dává táž funkce
   * jádra jako výpočet (profilyNezname).
   *
   * „Uzamčená" znamená ZAMČENÁ UŽ V ULOŽENÉ VERZI (P1 / K19-N102, 1. 10.
   * 2026). Do té doby se přeskakovala každá varianta, která PŘIŠLA zamčená —
   * zámek, který server ještě neviděl, ale ověřuje až níž (B61, B59)
   * a porovnání s uloženou verzí bere jen varianty zamčené v ní. Tisk se
   * zámkem tak v ostré v30.9.1 uložil 10 zakázek s profilem mimo katalog
   * a v testu v1.10.1 prošla záměrná zkouška K19T-C070 (zámek bez
   * dokumentu). Nově zamčená varianta se proto kontroluje jako nezamčená.
   * Obnova bere zámek ze zálohy jako doklad (viz hlavička souboru) —
   * u ní platí zámek z příchozích dat jako dřív. */
  const zamcenaDriv = (v) => {
    if (obnova) return zamcena(v);
    const sv = stara ? (stara.varianty || []).find(x => x && x.id === v.id) : null;
    return !!sv && zamcena(sv);
  };
  const nezname = [];
  for (const v of (zak.varianty || [])) {
    if (!v || zamcenaDriv(v)) continue;
    const nez = globalThis.profilyNezname(v.data && v.data.ock && v.data.ock.zadani, JEKLY);
    if (nez.length) nezname.push((cisloVarianty(zak, v) || v.nazev || v.id) + ' — ' + nez.join(', '));
  }
  if (nezname.length)
    return odmitni(400, veta('rozměr profilu není v katalogu jeklů (' + nezname.join('; ')
      + '). Vyberte v zadání šachty platný rozměr'));

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

  /* Odemčení ze souboru, které v databázi není (B98): i u zakázky, která
   * v databázi vůbec není — uloOdemceniPribylo(null, …) vrátí každou
   * variantu s odemčením v historii. Výchozí návrh J. V.: přeskočit
   * s důvodem (orazítkovat relací obnovujícího by tvrdilo, že odemkl on). */
  if (zeSouboru && ULO.uloOdemceniPribylo(stara, zak).length)
    return odmitni(409, 'odemčení odeslané nabídky, které v databázi není, se ze souboru neobnovuje '
      + '(soubor zálohy jde upravit, razítko odemčení z něj není doklad) — obnovte zakázku ze serverového otisku');

  if (stara) {
    /* Odemčení odeslané nabídky smí jen administrátor (B3); razítko kdo/kdy
     * píše server z relace — v obnově z otisku zůstává razítko ze zálohy
     * (doklad), obnova ze souboru sem s novým odemčením nedojde (B98). */
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
    /* Jméno do razítka „kdo naposledy uložil" (P7 / K16-N87) — z relace, ne
     * od klienta; kolize verzí ho pak ukáže místo e-mailu. V obnově zůstává
     * razítko ze zálohy jako ostatní. */
    if (relace.jmeno) zak.upravilJmeno = String(relace.jmeno); else delete zak.upravilJmeno;
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
      /* Ze souboru se ověření počítá VŽDY znovu (B98) — podvržená „shoda" na
       * jméno jiného správce by jinak prošla. Nesouhlas se zapíše, jak je
       * („nesouhlasi"), a obnova ho ohlásí v náhledu (sporne). Z otisku se
       * doplní jen tam, kde chybí. */
      if (zeSouboru || !v.zamek.overeni) {
        const ov = globalThis.zamekOvereni(v, JEKLY, verzeServeru);
        if (ov) v.zamek.overeni = ov; else if (zeSouboru) delete v.zamek.overeni;
        if (zeSouboru && ov && ov.stav !== 'shoda') sporne.push({ cislo: v.zamek.cislo || cisloVarianty(zak, v), ov });
      }
      continue;
    }
    const cisloMaBy = cisloVarianty(zak, v);
    if (String(v.zamek.cislo || '') !== cisloMaBy || v.zamek.cisloPapir !== true)
      return odmitni(409, 'Neuloženo: nová odeslaná (uzamčená) nabídka nese jiné číslo ('
        + (v.zamek.cislo || 'prázdné') + '), než dávají údaje zakázky (' + (cisloMaBy || 'prázdné')
        + '). Obnovte stránku (Ctrl+F5) a nabídku vytiskněte znovu.');
    const cenaProblem = zamekNovyCenaProblem(zak, v, relace, ctx.matice, JEKLY, ctx.program);
    if (cenaProblem) return odmitni(403, 'Neuloženo: ' + cenaProblem + '.');
    v.zamek.kdo = relace.jmeno ? relace.jmeno + ' <' + relace.email + '>' : relace.email;
    /* Nový zámek se ověřuje přísně (B119): nespárovaný řádek zmrazeného
     * výsledku je rozdíl a jádro nese i součty příplatků a volitelných —
     * vždy, bez ohledu na verzi, kterou výsledek uvádí (tu posílá klient). */
    const ov = globalThis.zamekOvereni(v, JEKLY, verzeServeru, undefined, { prisne: true });
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
