/* ============================================================
 * UKÁZKOVÁ DATA – červená lišta (#40, UI)
 *
 * Logika je v ukazkove.js; tady je jen čtení aktuálního stavu z běžící
 * aplikace a lišta pod hlavičkou.
 *
 * Proč červená a proč se nedá zavřít: lišta stáří sestavení (build_lista)
 * se schovat dá, protože říká „tvoje kopie je stará" – nepříjemné, ale
 * čísla sedí. Tahle říká „čísla nesedí". Kdyby šla utnout jedním
 * kliknutím, přesně to by se stalo hned první den a pak by chyběla ve
 * chvíli, kdy by byla potřeba. Zhasne jediným správným způsobem –
 * připojením složky se skutečnými daty.
 *
 * Ceník se čte z AKTIVNÍ VARIANTY, ne z DEFAULT_CENIK. Varianta má ceník
 * zmrazený v okamžiku vzniku, takže to, co se počítá právě teď, může být
 * vymyšlené i tehdy, když je složka mezitím připojená.
 * ============================================================ */

function ukazkoveStavAkt() {
  const v = (typeof aktivniVarianta === 'function' && typeof ZAK !== 'undefined')
    ? aktivniVarianta(ZAK) : null;
  const d = (v && v.data) || null;
  return ukazkoveStav({
    cenik: d ? d.cenik : (typeof DEFAULT_CENIK !== 'undefined' ? DEFAULT_CENIK : null),
    cenikProj: d && d.proj ? d.proj.cenik
      : (typeof DEFAULT_CENIK_PROJ !== 'undefined' ? DEFAULT_CENIK_PROJ : null),
    slevy: (typeof NAST !== 'undefined') ? NAST.slevy : null,
    firma: (typeof NAST !== 'undefined') ? NAST.firma : null,
  });
}

/* Smí tenhle uživatel vůbec mapovat složku _DB?
 *
 * Od zavedení online databáze (4. 8. 2026) je mapování Disku výhradně věcí
 * administrátora: obchodníkovi teče ceník z online databáze a složku na
 * disku správce nemá a mít nemá. Karta úložiště se mu už skryla, ale lišta
 * ho pořád posílala „Připojit složku _DB" – hlášeno uživatelem tentýž den.
 * Rozhoduje jediná funkce, aby se to příště nerozešlo. */
function ukazkoveSlozkaSmi() {
  return (typeof smiZobrazit !== 'function') || smiZobrazit('uloziste.slozka');
}

function ukazkoveLista() {
  const s = ukazkoveStavAkt();
  if (!s.jsou) return '';
  /* Běžný uživatel: žádné tlačítko, jiná věta – viz ukazkoveSlozkaSmi(). */
  /* #150 (18. 8. 2026): složka _DB skončila — na složku se neposílá už nikdo,
   * všem platí věta o online databázi (dřív jen běžným uživatelům). */
  if (!ukazkoveSlozkaSmi() || !(typeof uloPodporovano === 'function' && uloPodporovano()))
    return `<div class="ukazkove-lista">
      <span class="ikona">⛔</span>
      <span>${esc(ukazkoveText(s, '', '', true))}</span>
      <span class="sp"></span>
      <span class="kde">${esc(ukazkoveVyctem(s))}</span>
    </div>`;
  /* Tlačítko rovnou v liště. Prohlížeč se na právo k zápisu do složky smí
   * zeptat jen v reakci na kliknutí, takže po restartu (a po otevření
   * nového sestavení, které je pro prohlížeč jiná stránka) zůstane složka
   * odpojená a svítí nuly. Odkaz na Nastavení → Úložiště je správný, ale
   * je to obrazovka navíc přesně ve chvíli, kdy uživatel čeká čísla. */
  const u = (typeof ULO_STAV !== 'undefined') ? ULO_STAV : null;
  const jak = ukazkovePripojeni(u, typeof uloPodporovano === 'function' && uloPodporovano());
  const jmeno = (u && u.jmeno) || '_DB';
  const tlacitko = jak
    ? `<button class="primary" onclick="uloPripojZnovu()">`
      + (jak === 'znovu' ? `Připojit znovu složku „${esc(jmeno)}"` : 'Připojit složku _DB')
      + `</button>`
    : '';
  return `<div class="ukazkove-lista">
    <span class="ikona">⛔</span>
    <span>${esc(ukazkoveText(s, jak, jmeno))}</span>
    ${tlacitko}
    <span class="sp"></span>
    <span class="kde">${esc(ukazkoveVyctem(s))}</span>
  </div>`;
}

/* Čekání lišty při startu (S5, v15.10.4) — rozhoduje ukazkoveListaRozhodni
 * v ukazkove.js. Jediný stav: kdy začalo a jestli první pokus o načtení
 * z online databáze doběhl. `od: null` = nečeká se (file://, kde se online
 * nic nenačítá). Nad http(s) se čas zapíše hned při načtení skriptu — dřív,
 * než cokoli poprvé překreslí obrazovku. */
const UKAZKOVE_CEKANI = { od: null, dobehlo: false };

function ukazkoveCekaniStart(ted) {
  if (UKAZKOVE_CEKANI.od !== null) return;
  UKAZKOVE_CEKANI.od = (typeof ted === 'number') ? ted : Date.now();
  /* Pojistka pro server, který neodpoví: po uplynutí doby se lišta
   * vyhodnotí sama, i když by do té doby nic jiného nepřekreslilo. */
  if (typeof setTimeout === 'function')
    setTimeout(renderUkazkoveLista, UKAZKOVE_CEKANI_MS + 50);
}

/* Volá onlineStart(), když první pokus (zdraví → ja → ceník a firma) doběhl.
 * Až v dalším tiku: onlineTik nasazuje stažený ceník a firmu v setTimeout(0)
 * a ty jsou ve frontě dřív — lišta se tak vyhodnotí až nad skutečnými daty
 * a nic neblikne. */
function ukazkoveCekaniKonec() {
  const hotovo = () => { UKAZKOVE_CEKANI.dobehlo = true; renderUkazkoveLista(); };
  if (typeof setTimeout === 'function') setTimeout(hotovo, 0); else hotovo();
}

if (typeof location !== 'undefined' && /^https?:$/.test(location.protocol)
    && typeof fetch === 'function')
  ukazkoveCekaniStart();

function renderUkazkoveLista() {
  const el = document.getElementById('ukazkoveLista');
  if (!el) return;
  /* Během čekání se lišta NEKRESLÍ — obsah (ukazkoveLista) ani zábrany
   * dokumentů se ale nemění. */
  el.innerHTML = ukazkoveListaRozhodni(ukazkoveStavAkt(), UKAZKOVE_CEKANI, Date.now()) === 'ukazat'
    ? ukazkoveLista() : '';
}

/* Varování do náhledu dokumentu – poslední místo před odesláním.
 * Vrací prázdný řetězec, když je všechno skutečné. */
function ukazkoveTiskLista() {
  const s = ukazkoveStavAkt();
  if (!s.jsou) return '';
  return `<div class="ukazkove-tisk noprint">⛔ ${esc(ukazkoveKratce(s, !ukazkoveSlozkaSmi()))}</div>`;
}

/* ---------- zábrana: nulový ceník ----------
 * „Buď se z databáze natáhne ostrý ceník, anebo svítí všude nuly a není
 * z čeho počítat." Dokument spočítaný z nul není nabídka za nula korun,
 * je to prázdný formulář s razítkem – a ten se zákazníkovi poslat nesmí.
 * Vrací důvod (text), nebo prázdný řetězec, když je cesta volná. */
function dokumentZabrana(typ, varianta) {
  /* ZÁMEK STRANY (P6 / K19-N114, 13. 10. 2026): dokument strany, která je
   * u zakázky uzamčená a vynulovaná (podle čísla nabídky nebo jenProj /
   * jenOck), nevznikne — ani dotisk do odeslané varianty (D6d). Stojí
   * první: je to nejpřesnější důvod (žádná oprava ceníku ani zadání
   * dokument vyřazené strany nepustí). */
  if (typ && typeof kontrolyStranaZabrana === 'function' && typeof ZAK !== 'undefined') {
    const duvod = kontrolyStranaZabrana(ZAK, typ);
    if (duvod) return duvod;
  }
  if (typeof ukazkoveBraniDokumentu === 'function') {
    const s = ukazkoveStavAkt();
    if (ukazkoveBraniDokumentu(s)) return ukazkoveKratce(s, !ukazkoveSlozkaSmi());
  }
  /* Plán plateb projekce s vadou (etapa B) — jen dokumenty PROJ, které ho
   * nesou (typ dokumentu a variantu, ZE KTERÉ vzniká, předává
   * dokumentVygeneruj i náhled nabídky PROJ). */
  if (typ && typeof planPlatebZabranaDokumentu === 'function') {
    const duvod = planPlatebZabranaDokumentu(typ, varianta);
    if (duvod) return duvod;
  }
  /* Zábrany z kontroly před nabídkou (#377, 1. 10. 2026) — rozměry, profil
   * mimo katalog, záporná položka, nulová cena, sleva nad stropem. Které
   * zábrany zastaví který dokument, rozhoduje kontrolyZabranaDokumentu
   * (tabulka v kontroly.js); posuzuje se varianta, ZE KTERÉ dokument vzniká.
   * Bez typu (panel prázdného ceníku) se neptá — ten mluví jen o ceníku. */
  if (typ && typeof kontrolyZabranaDokumentu === 'function' && typeof kontrolyStavVarianta === 'function') {
    let vysl = null;
    try { vysl = kontrolyStavVarianta(varianta || null); } catch (e) { vysl = null; }
    const duvod = kontrolyZabranaDokumentu(vysl, typ);
    if (duvod) return duvod;
  }
  return '';
}

/* Pojistka v obsluze tlačítka: zábrana → hláška (stejná věta jako v bublině
 * zhasnutého tlačítka) a stavový řádek; vrací true, když dokument nevznikne. */
function dokumentZabranaHlas(typ, varianta, stav) {
  if (typeof dokumentZabrana !== 'function') return false;
  const duvod = dokumentZabrana(typ, varianta);
  if (!duvod) return false;
  if (typeof stav === 'function') stav('Dokument nevznikl — ' + duvod);
  if (typeof hlaska === 'function') hlaska(duvod, { nadpis: 'Dokument nelze vytvořit' });
  return true;
}

/* Panel na místo tlačítek. Vysvětluje, co se má stát, ne jen že to nejde –
 * uživatel, který vidí „nelze", hledá chybu v aplikaci; uživatel, který
 * vidí „připojte složku _DB", jde ji připojit. */
function ukazkoveZabranaPanel() {
  const duvod = dokumentZabrana();
  if (!duvod) return '';
  /* Nastavení → Úložiště je jen pro administrátora; běžnému uživateli by
   * tlačítko nabízelo obrazovku, na kterou se nedostane. Dostane místo něj
   * větu, se kterou se dá něco dělat. */
  const cesta = ukazkoveSlozkaSmi()
    ? `<button class="mini" onclick="otevriNastaveni()">Otevřít Nastavení → Úložiště</button>`
    : `<span class="pozn">Zveřejnění platného ceníku je práce administrátora – ozvěte se mu.</span>`;
  return `<div class="zabrana-panel">
    <div class="zabrana-hlava"><span class="ikona">⛔</span> <b>Ceník není nahraný – dokument nevznikne.</b></div>
    <div class="zabrana-txt">${esc(duvod)}</div>
    <div class="zabrana-btns">
      ${cesta}
      <span class="pozn">Tohle je jediná věc v aplikaci, která se nedá odklepnout.
        Nabídka s nulami by vypadala jako platná.</span>
    </div>
  </div>`;
}

/* Atribut do tlačítek, která vytvářejí dokument (`<button ${ukazkoveZabranaAttr('nabidka')}>`).
 * Typ dokumentu (#377) zapne i zábrany z kontroly před nabídkou a plánu
 * plateb — posuzuje se otevřená varianta (z té tlačítko dokument nabízí;
 * řídící hlídá dokumentZabrana při generování). */
function ukazkoveZabranaAttr(typ) {
  const duvod = typ
    ? dokumentZabrana(typ, (typeof aktivniVarianta === 'function' && typeof ZAK !== 'undefined') ? aktivniVarianta(ZAK) : null)
    : dokumentZabrana();
  return duvod ? ` disabled title="${esc(duvod)}"` : '';
}
