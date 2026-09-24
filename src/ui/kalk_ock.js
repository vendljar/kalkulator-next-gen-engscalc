/* ================= ZÁLOŽKA KALKULACE OCK ================= */

/* PRŮCHOZÍ ŠACHTA (9. 9. 2026, zadání J. V.).
 *
 * Zaškrtnutí odemkne rozpad nástupišť na čelní (A) a zadní (C) stěnu a pole
 * pro počet pater. Celkový počet nástupišť se pak dopočítává z A + C, takže
 * se přestane zadávat ručně — dvě čísla o téže věci by se dřív nebo později
 * rozešla. Počet pater je vlastní údaj, protože u průchozí šachty nepadne
 * na jedno patro jedno nástupiště, ale klidně dvě; výška podlaží se počítá
 * z pater (viz engine.js).
 *
 * Při zaškrtnutí se A ani C nepředvyplňují — J. V. 9. 9. 2026: „v případě
 * zaškrtnutí průchozí šachty na rozpracované zakázce klidně shoď celkový
 * počet nástupišť na nulu". Obchodník je hned vyplní a vidí, že to musí
 * udělat; předvyplnění by naopak vypadalo jako hotová práce. */
function pruchoziPrepni(zap) {
  set('Z.pruchoziSachta', !!zap);
  render();
}

/* Dvě úzká pole vedle sebe: A (čelní stěna) a C (zadní stěna). */
function nastupisteACRadek() {
  if (!Z.pruchoziSachta) return '';
  const pole = (klic, ozn, titulek) => `<span class="ozn" title="${esc(titulek)}">${ozn}</span>`
    + `<input type="number" step="1" min="0" value="${esc(+Z[klic] || 0)}"`
    + ` title="${esc(titulek)}" onchange="set('Z.${escJs(klic)}', +this.value)">`;
  return `<div class="row"><label>Počet nástupišť</label>
      <span class="par">${pole('nastupisteA', 'A', 'nástupiště na čelní stěně')}${pole('nastupisteC', 'C', 'nástupiště na zadní stěně')}</span>
      <span class="u">ks</span></div>`
    + `<div class="row"><label>Počet pater</label>
        <input type="number" step="1" min="0" value="${esc(+Z.patra || 0)}"
          title="z počtu pater se počítá výška podlaží; u průchozí šachty nejde odvodit z nástupišť"
          onchange="set('Z.patra', +this.value)"><span class="u">ks</span></div>`
    + (patraVarovani() || '');
}

/* Celkový počet nástupišť. U průchozí šachty je dopočítaný z A + C, takže se
 * ukazuje jen ke čtení — ručně zadaná hodnota by si s tím součtem odporovala
 * a jedna z nich by musela vyhrát potichu. */
function nastupisteRadek() {
  if (!Z.pruchoziSachta) return inp('Z.nastupiste', { l: 'Počet nástupišť', step: 1, u: 'ks' });
  const celkem = (typeof nastupisteCelkem === 'function') ? nastupisteCelkem(Z) : (+Z.nastupiste || 0);
  return `<div class="row"><label>Počet nástupišť</label>
      <input type="number" value="${esc(celkem)}" readonly
        title="dopočítáno z nástupišť A + C (${+Z.nastupisteA || 0} + ${+Z.nastupisteC || 0})"><span class="u">ks</span></div>`;
}

/* Výška podlaží se počítá jako zdvih / (patra − 1). Pod dvě patra to nedává
 * číslo, se kterým jde počítat, takže se to říká nahlas — jinak by obchodník
 * viděl jen tiše nulové rozměry. */
function patraVarovani() {
  if (!Z.pruchoziSachta) return '';
  const p = +Z.patra || 0;
  if (p >= 2) return '';
  return `<div class="note warn" style="margin:-2px 0 8px">Zadejte počet pater (aspoň 2) — bez něj
    se nedá spočítat výška podlaží a rozměry vycházejí nulové.</div>`;
}

/* Přepnutí typu šachty dosadí výchozí dimenze profilů (9. 9. 2026, zadání
 * J. V.). Interiérová a exteriérová šachta se liší profily i zasklením, a
 * obchodník je dosud musel po přepnutí přenastavovat ručně — tedy na ně
 * pravidelně zapomínal. Změna se říká nahlas, protože mění cenu; kdo si
 * dimenze upravil po svém, přepíšou se mu, a musí to vědět. */
function typSachtyPrepni(typ) {
  const t = (typ === 'interiérová') ? 'interiérová' : 'exteriérová';
  const puvodni = JSON.stringify(Z.profily);
  set('Z.typSachty', t);
  if (typeof PROFILY_VYCHOZI !== 'undefined' && PROFILY_VYCHOZI[t]) {
    Z.profily = JSON.parse(JSON.stringify(PROFILY_VYCHOZI[t]));
    if (JSON.stringify(Z.profily) !== puvodni && typeof progZprava === 'function')
      progZprava('Typ šachty „' + t + '": dosazeny výchozí dimenze profilů podle typu. '
        + 'Pokud jste si je upravil, nastavte je znovu.', 'varovani');
  }
  /* DÍRA V AUTOMATU ATYP (nález V36, 14. 9. 2026). `set` výš pustil kontrolu
   * standardu ještě nad STARÝMI profily; nové se dosazují až tady, přímo do
   * zadání, takže o nich automat nevěděl. Kdo přepnul typ šachty ze stavu,
   * v němž byl ATYP zaškrtnutý automatem, měl pak ATYP i přirážku zapnutou
   * u šachty, kterou odznak hlásil jako STANDARD. Kontrola se proto pustí
   * znovu, až jsou profily na místě. */
  if (typeof standardAtypAutomat === 'function') standardAtypAutomat();
  syncVarianta(); render();
}

function renderInputs() {
  const dims = Object.keys(JEKLY);
  const ext = Z.typSachty === 'exteriérová';
  const profRow = (key, label) => {
    const p = Z.profily[key];
    /* Lemování je jen exteriérová položka — u interiérové šachty se do
     * výpočtu vůbec nedostane (engine: `ext ? mkItem('PROFILY - LEMOVÁNÍ…')`).
     * Místo dimenzí, které nic neovlivní, se proto ukáže pomlčka (9. 9. 2026,
     * zadání J. V.). Dimenze v datech zůstávají platné: nula by v nich byla
     * neplatný klíč do katalogu jeklů a rozbila by výpočet po přepnutí zpět. */
    if (key === 'lemovani' && !ext)
      return `<div class="row"><label>${label}</label>
        <span class="note" style="width:158px;display:inline-block">— (jen exteriérová šachta)</span><span class="u"></span></div>`;
    const tls = Object.keys(JEKLY[p.dim].kg);
    return `<div class="row"><label>${label}</label>
      <select style="width:86px" onchange="set('Z.profily.${escJs(key)}.dim', this.value); zkontrolujTl('${escJs(key)}')">${dims.map(d =>
        `<option ${d === p.dim ? 'selected' : ''}>${esc(d)}</option>`).join('')}</select>
      <select style="width:64px" onchange="set('Z.profily.${escJs(key)}.tl', +this.value)">${tls.map(t =>
        `<option ${+t === p.tl ? 'selected' : ''} value="${esc(t)}">${esc(t)}</option>`).join('')}</select></div>`;
  };
  /* ZADÁNÍ ŠACHTY VE ČTYŘECH PEVNÝCH SLOUPCÍCH (9. 9. 2026, zadání J. V.,
   * odsouhlaseno nad vizuálním návrhem).
   *
   * Do 9. 9. se pole sypala za sebou a zalamovala podle šířky okna, takže
   * jejich pořadí záviselo na velikosti obrazovky a obchodník je pokaždé
   * hledal jinde. Teď stojí na svém: 1) šachta jako celek a výšky,
   * 2) půdorys a nástupiště, 3) opláštění a doplňky, 4) dveře a ATYP.
   *
   * Karta má vlastní třídu `zadani-ctyri`, protože `.inputs .card .body`
   * skládá pole vlastním gridem (auto-fill) — bez přebití by vznikl grid
   * v gridu a sloupce by se zúžily tak, že se popisky lámou. */
  const sl = (obsah) => `<div>${obsah}</div>`;
  document.getElementById('inputs').innerHTML =
    kartaRezim('ock', 'zadani', 'Zadání šachty',
      `<div class="zadani-ctyri">`
      + sl(
        /* Vlastní obsluha (9. 9. 2026): přepnutí typu dosadí výchozí profily. */
        `<div class="row"><label>Typ šachty</label>
          <select onchange="typSachtyPrepni(this.value)">
            <option ${ext ? 'selected' : ''} value="exteriérová">exteriérová</option>
            <option ${ext ? '' : 'selected'} value="interiérová">interiérová</option>
          </select><span class="u"></span></div>`
        + inp('Z.zdvih', { l: 'Zdvih', u: 'm' })
        + inp('Z.prejezd', { l: 'Horní přejezd', u: 'm' })
        + inp('Z.prohluben', { l: 'Prohlubeň', u: 'm' })
        + `<div class="row"><label>Průchozí šachta</label>
            <input type="checkbox" ${Z.pruchoziSachta ? 'checked' : ''}
              onchange="pruchoziPrepni(this.checked)"><span class="u"></span></div>`
        + nastupisteACRadek())
      + sl(
        inp('Z.sirka', { l: 'Vnitřní šířka', u: 'm' })
        + inp('Z.hloubka', { l: 'Vnitřní hloubka', u: 'm' })
        + inp('Z.typPortalu', { type: 'sel', l: 'Typ portálů', o: [['zapuštěný', 'zapuštěný'], ['předsazený', 'předsazený']] })
        + nastupisteRadek()
        /* Popisný text pod polem se 10. 9. 2026 přestěhoval do Detailu výpočtu
         * (zadání J. V.); v zadání zůstal jako tooltip, aby nezabíral řádek. */
        + inp('Z.striskaKs', {
          l: 'Stříška nad nástupiště', step: 1, u: 'ks',
          t: 'počet kusů; nula znamená bez stříšky, každý kus násobí cenu i náklad',
        }))
      + sl(
        inp('Z.zaskleni', { type: 'sel', l: 'Způsob zasklení', o: [['na terče', 'na terče'], ['mezi příčníky', 'mezi příčníky (lišty)']] })
        /* OPLÁŠTĚNÍ PO STĚNÁCH (#268, 3. krok). Přepínač stojí tady, mezi
         * zasklením a sloupky, protože to je místo, kde se o plášti rozhoduje.
         * Vlastní stěny jsou ve zvláštní kartě, která se kreslí až po
         * přepnutí — ve standardním režimu o nich obchodník nemá vědět. */
        + `<div class="row"><label>Opláštění</label>
            <select style="width:150px" onchange="oplRezimSet(this.value)">
              <option value="standard" ${oplPoStenach() ? '' : 'selected'}>jednotné (standard)</option>
              <option value="poStenach" ${oplPoStenach() ? 'selected' : ''}>po stěnách A–D</option>
            </select><span class="u"></span></div>`
        + inp('Z.rohoveSloupky', { l: 'Počet sloupků', step: 1, u: 'ks' })
        + inp('Z.svetlikyBoky', { type: 'sel', l: 'Světlíky na bocích dveří', o: [[0, 'bez'], [1, 'na jedné straně'], [2, 'na obou stranách']] })
        + inp('Z.prechodovePlechy', { type: 'check', l: 'Přechodové plechy' })
        /* Můstek (#163, 21. 8. 2026). Do výpočtu nevstupuje — je to vstup pro
         * kontrolu standardu a pro technickou specifikaci. Rozměry se ptají,
         * jen když můstek je; prázdné pole znamená „nevyplněno", ne nulu. */
        + `<div class="row"><label>Můstek mezi budovou a OCK</label>
            <input type="checkbox" ${Z.mustek ? 'checked' : ''} onchange="set('Z.mustek', this.checked)"><span class="u"></span></div>`
        + (Z.mustek
          ? `<div class="row"><label>Hloubka můstku</label>
               <input type="number" step="10" min="0" value="${esc(Z.mustekHloubkaMm == null ? '' : Z.mustekHloubkaMm)}"
                 placeholder="mm" title="vzdálenost mezi budovou a OCK; standard max 1 000 mm"
                 onchange="set('Z.mustekHloubkaMm', this.value)"><span class="u">mm</span></div>
             <div class="row"><label>Šířka můstku</label>
               <input type="number" step="10" min="0" value="${esc(Z.mustekSirkaMm == null ? '' : Z.mustekSirkaMm)}"
                 placeholder="mm" title="standard: max na šířku OCK"
                 onchange="set('Z.mustekSirkaMm', this.value)"><span class="u">mm</span></div>`
          : ''))
      + sl(
        inp('Z.roztec', { l: 'Svislá rozteč příčníků', u: 'm' })
        + inp('Z.sirkaRamuMm', { l: 'Šířka rámu dveří', step: 5, u: 'mm' })
        + inp('Z.cistyVstupMm', { l: 'Čistý vstup – šířka', step: 10, u: 'mm' })
        + inp('Z.svetlikNadDvermi', { type: 'check', l: 'Světlík nad šachetními dveřmi' })
        /* ATYP má vlastní obsluhu (17. 8. večer): zaškrtnutí předvyplní všechny
         * čtyři rezervy a Zámečníka atyp z ceníku; odškrtnutí vrací pole, do
         * kterých nikdo ručně nesáhl — atypové přirážky bez atypu nemají co
         * dělat. Když ceník některou sazbu nemá, dosadí se náhrada z kódu —
         * a `atypNahradyHtml()` to řekne nahlas (#263). */
        + `<div class="row"><label>ATYP (nestandardní zakázka)</label>
            <input type="checkbox" ${Z.atyp ? 'checked' : ''} onchange="atypPrepni(this.checked)"><span class="u">${atypNahradyHtml()}</span></div>`)
      + `</div>` +
      /* SAZBA ATYP UŽ V ZADÁNÍ ŠACHTY NENÍ (9. 9. 2026, zadání J. V.:
       * „přirážku za atyp v zadání šachty skryj a ponech pouze v ceníku“).
       * Cestovala sem 20. 8. 2026 z Nastavení, protože je to parametr TÉTO
       * zakázky, ne aplikace — jenže zadání šachty popisuje stavbu, ne ceny,
       * a dlouhé vysvětlení pod ním kartu jen natahovalo. Sazba zůstává
       * v ceníku varianty (`C.atypPrirazka`, sekce REŽIE), takže se pořád
       * mění u jednotlivé nabídky a starší nabídky se nepřepočítávají;
       * mění ji ten, kdo vidí ceník. */
      '', 'ock-zadani') +
    /* Stěny stojí hned za zadáním šachty: navazují na přepínač Opláštění
       o pár polí výš a patří k popisu stavby, ne k cenám. */
    oplasteniKarta() +
    kartaRezim('ock', 'profily', 'Dimenze profilů',
      profRow('sloupek', 'Sloupek') + profRow('precnikBok', 'Příčníky bok/zadek') + profRow('sloupekPortal', 'Sloupek portálu') +
      profRow('precnikPortal', 'Příčníky portálu') + profRow('spojka', 'Spojka sloupků') + profRow('lemovani', 'Lemování ext. šachty') +
      /* Rezervy se zadávají v PROCENTECH (17. 8. večer): 30 = +30 % k množství
       * profilů/plechů. V datech zůstává desetinný podíl (0,30) — staré
       * zakázky se počítají beze změny, jen zadávání je lidské. */
      inp('Z.rezervaProfilyPct', { type: 'pct', l: 'Rezerva profily (atyp)' }) +
      /* Karta je od 19. 8. 2026 ve výchozím stavu SBALENÁ (zadání J. V.):
       * dimenze se mění zřídka a obchodníka při běžné práci jen ruší.
       * Kliknutím na nadpis se karta kdykoli rozbalí. */
      inp('Z.rezervaPlechyPct', { type: 'pct', l: 'Rezerva plechy (atyp)' }), 'ock-profily', true) +
    kartaRezim('ock', 'prace', 'Práce a režie',
      inp('Z.montazZakladHod', { min: 0, l: 'Montáž – základ (1 os.)', step: 1, u: 'hod', klic: 'Z.montazZakladHod ← C.vychMontazZakladHod' }) +
      inp('Z.montazAtypHod', { min: 0, l: 'Montáž – atyp navíc', step: 1, u: 'hod', klic: 'Z.montazAtypHod ← C.atypMontazPct' }) +
      inp('Z.projekceZakladHod', { min: 0, l: 'Projekce – základ', step: 1, u: 'hod', klic: 'Z.projekceZakladHod ← C.vychProjekceZakladHod' }) +
      inp('Z.projekceAtypHod', { min: 0, l: 'Projekce – atyp navíc', step: 1, u: 'hod', klic: 'Z.projekceAtypHod ← C.atypProjekcePct' }) +
      inp('Z.oplechOstatniKg', { l: 'Oplechování ostatní – materiál', step: 1, u: 'kg', klic: 'Z.oplechOstatniKg ← C.vychOplechOstatniKg' }) +
      inp('Z.oplechOstatniHod', { l: 'Oplechování ostatní – práce', step: 1, u: 'hod', klic: 'Z.oplechOstatniHod ← C.vychOplechOstatniHod' }) +
      /* Zámečník atyp je od 17. 8. večer JEDNA částka: pole „množství" zmizelo,
       * v kalkulaci je řádek s množstvím vždy 1 a hodnotou z tohoto pole.
       * Prázdné pole = řádek není (příp. ceníková sazba u starých zakázek
       * s uloženými kusy); zaškrtnutí ATYP předvyplní 50 000 Kč. */
      inp('Z.zamecnikAtypKc', { l: 'Zámečník atyp (prázdné = žádný)', step: 1000, u: 'Kč', klic: 'Z.zamecnikAtypKc ← C.atypZamecnikKc (sazba: C.zamecnikAtypKc)' }) +
      inp('Z.engineeringKs', { type: 'anone', l: 'Engineering' }) +
      inp('Z.vystupZamereni', { type: 'anone', l: 'Výstup ze zaměření pro zákazníka' }) +
      /* REZERVY v procentech (17. 8. večer): 30 = +30 %. Základ se počítá
       * z celého základu kalkulace, příplatky z příplatků — jako dosud,
       * mění se jen zadávání (v datech zůstává desetinný podíl). */
      inp('Z.rezervaZakladPct', { type: 'pct', l: 'REZERVA základ', klic: 'Z.rezervaZakladPct ← C.atypRezervaZakladPct' }) +
      inp('Z.rezervaPriplatkyPct', { type: 'pct', l: 'REZERVA příplatky', klic: 'Z.rezervaPriplatkyPct ← C.atypRezervaPriplatkyPct' }), 'ock-prace');
}

/* ---- ceník → zadání pro jednu variantu (1. 9. 2026) ----
 *
 * Zadání J. V.: „hodnoty z ceníku se do atypů a režií nepropisují. Ceník má
 * být zdrojem pravdy." Tohle je ta ruka, která to dělá: srovná pole zadání
 * s ceníkem varianty. Jednoduchá pole umí jádro (zadaniZCeniku v zakazka.js),
 * tady se k nim přidávají HODINY NAVÍC — ty se nepřebírají, ale počítají
 * z podílu v ceníku, a k tomu je potřeba výpočet (hodiny navíc dle konstrukce),
 * který v jádru zakázky není.
 *
 * Nesahá na to, co obchodník přepsal sám (`data.zadaniRucni`), a volá se jen
 * nad rozpracovanou variantou — zamčené a kvitované vynechává volající. */
function cenikDoZadani(v) {
  const d = v && v.data;
  if (!d || typeof zadaniZCeniku !== 'function') return 0;
  let zmen = zadaniZCeniku(d).zmen;
  const z = d.ock && d.ock.zadani, c = d.cenik;
  if (!z || !c || !z.atyp || typeof cenikVychozi !== 'function') return zmen;
  /* SAZBA SE BERE Z CENÍKU V OBOU CESTÁCH (rozhodnutí J. V. 22. 9. 2026,
   * uzavírá #298 / nález N24).
   *
   * Do 22. 9. se tyhle dvě cesty lišily NE vzorcem, ale zdrojem sazby:
   *   · zaškrtnutí ATYP (`atypPrepni`) sáhlo při chybějící sazbě po náhradě
   *     ze sestavení (ATYP_NAHRADA) a hodiny spočítalo,
   *   · přepočet na platný ceník (tahle funkce) dostal `null` a hodiny
   *     nechal, jak byly.
   * Táž zakázka proto vycházela jednou na 5 a jednou na 6 hodin podle toho,
   * kudy se k ATYP došlo. Rozhodnutí J. V.: „sazba by se měla brát vždy
   * z ceníku, ať už se atyp spustí automaticky nebo manuálně. To, že si to
   * pak obchodník přepíše, už je jeho věc."
   *
   * Obě cesty tedy nově čtou touž hodnotu týmž způsobem. Ruční přepis
   * obchodníka zůstává nedotčený — hlídá ho `zadaniRucniJe` o řádek níž —
   * a uzamčené a kvitované varianty se sem vůbec nedostanou
   * (`progSrovnejNedotcene` je vynechává), takže odeslanými nabídkami to
   * nehne. */
  const pm = cenikVychozi(c, 'atypMontazPct', ATYP_NAHRADA.atypMontazPct);
  const pp = cenikVychozi(c, 'atypProjekcePct', ATYP_NAHRADA.atypProjekcePct);
  if (pm != null && !zadaniRucniJe(d, 'montazAtypHod')) {
    let navic = 0;
    try { navic = vypocet(z, c, JEKLY, (d.ock || {}).fixes).montaz.hodinyNavicCelkem || 0; } catch (e) { navic = 0; }
    const nova = Math.round(pm * ((+z.montazZakladHod || 0) + navic));
    if (z.montazAtypHod !== nova) { z.montazAtypHod = nova; zmen++; }
  }
  if (pp != null && !zadaniRucniJe(d, 'projekceAtypHod')) {
    const nova = Math.round(pp * (+z.projekceZakladHod || 0));
    if (z.projekceAtypHod !== nova) { z.projekceAtypHod = nova; zmen++; }
  }
  return zmen;
}

/* SAZBY ATYP, KTERÉ MAJÍ PŘIJÍT Z CENÍKU (nález #263, 17. 9. 2026).
 *
 * Když je ceník nemá vyplněné, dosadí se číslo natvrdo odsud. Do 17. 9. se
 * to dělo POTICHU: obchodník dostal u zámečníka dvojnásobek toho, co má
 * testovací ceník, a neměl jak poznat, že to číslo nikdo nezadal. Je to
 * stejná třída vady jako V38 u skla, kde padlo, že tichá náhrada musí pryč.
 *
 * Náhrada se ale NERUŠÍ. Není odsud vidět, jestli má ostrý ceník těch pět
 * sazeb vyplněných — a kdyby neměl, znamenalo by zrušení náhrady nulové
 * rezervy, tedy tichou změnu ceny opačným směrem. Zvolena proto varianta
 * „dosadit a viditelně označit": hodnota zůstává, jen se o ní ví.
 *
 * Jeden seznam pro předlohu i pro upozornění. Dvě kopie by se rozešly a
 * upozornění by mlčelo přesně o tom, co se dosadilo. */
const ATYP_SAZBY = [
  { klic: 'atypZamecnikKc', nahrada: 50000, popis: 'zámečník atyp' },
  { klic: 'atypRezervaZakladPct', nahrada: 0.30, popis: 'rezerva základ' },
  { klic: 'atypRezervaPriplatkyPct', nahrada: 0.30, popis: 'rezerva příplatky' },
  { klic: 'atypMontazPct', nahrada: 0.30, popis: 'montážní hodiny' },
  { klic: 'atypProjekcePct', nahrada: 0.30, popis: 'projekční hodiny' },
];
const ATYP_NAHRADA = ATYP_SAZBY.reduce((m, s) => { m[s.klic] = s.nahrada; return m; }, {});

/* Ptá se SAMOTNÉHO CENÍKU, ne vlastní kopie pravidla: pošle mu značku, kterou
 * ceníková hodnota nikdy být nemůže, a když ji dostane zpátky, je jasné, že
 * sazba chybí. Kdyby se `cenikVychozi` někdy začal rozhodovat jinak (třeba
 * začal brát i nulu), pozná to tohle samo. */
function atypSazbaChybi(klic) {
  if (typeof cenikVychozi !== 'function') return true;
  const znacka = {};
  return cenikVychozi(typeof C === 'undefined' ? null : C, klic, znacka) === znacka;
}

/* Štítek vedle přepínače ATYP. Ukazuje se jen při zapnutém ATYP — u vypnuté
 * zakázky by to bylo varování před něčím, co se neděje. Netiskne se. */
function atypNahradyHtml() {
  if (typeof Z === 'undefined' || !Z || !Z.atyp) return '';
  const chybi = ATYP_SAZBY.filter(s => atypSazbaChybi(s.klic));
  if (!chybi.length) return '';
  const vse = chybi.length === ATYP_SAZBY.length;
  const titulek = 'V ceníku (sekce ATYP) ' + (vse ? 'nejsou vyplněné tyto sazby' : 'chybí')
    + ': ' + chybi.map(s => s.popis).join(', ')
    + '. Dosadily se náhradní hodnoty ze sestavení aplikace, ne z ceníku — '
    + 'zkontrolujte je, nebo sazby doplňte v Ceníku.';
  return ` <span class="pill warn noprint" title="${esc(titulek)}">`
    + (vse ? 'sazby ATYP nejsou v ceníku' : 'část sazeb ATYP není v ceníku') + '</span>';
}

/* Zaškrtnutí ATYP: předvyplnění rezerv a zámečníka (17. 8. 2026 večer).
 * Stojí MIMO renderInputs — volá se z onchange, musí být globální. */
function atypPrepni(zap, opts) {
  if (typeof zamekStop === 'function' && zamekStop()) return;
  /* Ruční odškrtnutí u nestandardní šachty je rozhodnutí člověka a automat
   * (standardAtypAutomat v common.js) ho musí respektovat — jinak by se
   * zaškrtávátko po každé změně zadání vracelo zpátky. Zapamatuje se
   * v zadání, takže putuje se zakázkou. Zapnutí značku zase maže. */
  if (opts && opts.automat) {
    /* Značka „tohle zaškrtl automat" — jen svoje vlastní zaškrtnutí smí
     * automat později zase vypnout, až potřeba atypu pomine (21. 8. 2026
     * večer, zadání J. V.). Ručního ATYPu se nikdy nedotkne: důvodů k němu
     * je víc než rozměry a ty aplikace nezná. */
    if (zap) Z.atypAutomat = true; else delete Z.atypAutomat;
  } else {
    delete Z.atypAutomat;
    if (zap) delete Z.atypRucneVypnut;
    else Z.atypRucneVypnut = true;
  }
  Z.atyp = !!zap;
  /* ATYP UŽ NIC NEPŘEPISUJE NATVRDO (nálezy C1 a V39, rozhodnutí J. V.
   * 15. 9. 2026: „nic nenulovat, vracet do předchozího stavu").
   *
   * Do 15. 9. přepnutí bezpodmínečně přepsalo sedm polí zadání — a k tomu
   * zrušilo ruční značky, aby si na to nikdo nemohl stěžovat. Obchodník
   * (D. Sikora, 10. 9.) to popsal přesně: „pokud se ta částka změní, tak by
   * ji to tlačítko ATYP měnit zpět na 25 000 nemělo." Na 2026-OPR-CN-0290 to
   * po několikerém prokliknutí srazilo cenu o 64 000.
   *
   * SAMOTNÉ PRAVIDLO TADY NENÍ — bydlí v `atypHodnoty()` v zakazka.js. Je to
   * kvůli testu: logiku uvnitř UI jde ověřit jen čtením zdrojáku jako textu
   * a takový test pozná změněný TVAR kódu, ne změněné CHOVÁNÍ. První verze
   * sady k tomuhle nálezu proto mlčky prošla i nad mutací „vypnutí zase
   * nuluje". Tady zůstalo jen to, co se bez ceníku a výpočtu spočítat nedá:
   * ceníková předloha. */
  const vData = aktivniVarianta(ZAK).data;
  /* Čím se ATYP předvyplní, bere ceník (31. 8. 2026, zadání J. V.: „do ceníku
   * OCK v sekci atyp přidej ještě možnost editovat atypické položky").
   * Prázdná nebo nulová ceníková položka znamená nenastaveno a platí hodnota
   * ze sestavení — proto ta druhá čísla ve volání. */
  const vych = (klic, zaklad) => (typeof cenikVychozi === 'function')
    ? cenikVychozi(C, klic, zaklad) : zaklad;
  const S = (klic) => vych(klic, ATYP_NAHRADA[klic]);
  let predloha = null;
  if (zap) {
    /* Hodiny navíc při ATYP (zadání 19. 8. 2026): projekce +30 % ze základních
     * hodin; montáž +30 % z CELKOVÝCH hodin potřebných pro montáž (základ +
     * hodiny navíc vypočtené z konstrukce — světlíky, přechody atd.). */
    let navic = 0;
    try { navic = vypocetAkt().montaz.hodinyNavicCelkem || 0; } catch (e) { navic = 0; }
    predloha = {
      rezervaProfilyPct: 0.30,
      rezervaPlechyPct: 0.30,
      rezervaZakladPct: S('atypRezervaZakladPct'),
      rezervaPriplatkyPct: S('atypRezervaPriplatkyPct'),
      zamecnikAtypKc: S('atypZamecnikKc'),
      montazAtypHod: Math.round(S('atypMontazPct') * ((+Z.montazZakladHod || 0) + navic)),
      projekceAtypHod: Math.round(S('atypProjekcePct') * (+Z.projekceZakladHod || 0)),
    };
  }
  atypHodnoty(Z, vData, zap, predloha);
  aktivniVarianta(ZAK).upraveno = new Date().toISOString();
  render();
}

/* ---- klíč položky (původní název) do onchange handleru bezpečně ----
 * Dřív se apostrof nahrazoval entitou &#39;. To ale nepomůže: prohlížeč
 * entitu rozkóduje ještě před tím, než obsah atributu předá JavaScriptu,
 * takže apostrof v názvu položky rozbil řetězec v handleru. escJs()
 * escapuje nejdřív pro JavaScript a teprve potom pro HTML (viz common.js). */
function keyAttr(s) { return escJs(s); }

/* ---- ruční přepis množství (klíčem je PŮVODNÍ název položky) ---- */
function mnozstviSet(nazev, v) {
  if (!Z.mnozstviPrepis) Z.mnozstviPrepis = {};
  if (v === '' || v == null) delete Z.mnozstviPrepis[nazev]; else Z.mnozstviPrepis[nazev] = +v;
  aktivniVarianta(ZAK).upraveno = new Date().toISOString();
  render();
}
/* ---- přejmenování položky ---- */
function nazevSet(orig, v) {
  if (!Z.nazvyPrepis) Z.nazvyPrepis = {};
  const nv = (v || '').trim();
  if (!nv || nv === orig) delete Z.nazvyPrepis[orig]; else Z.nazvyPrepis[orig] = nv;
  aktivniVarianta(ZAK).upraveno = new Date().toISOString();
  render();
}
function nazevReset(orig) { if (Z.nazvyPrepis) delete Z.nazvyPrepis[orig]; render(); }
/* Dodatkový text k ceníkové položce (#267, 18. 9. 2026). Píše se do CENÍKU
 * varianty, ne do zadání — proto `C`, a ne `Z`. Zámek varianty se hlídá
 * stejně jako u ostatních zápisů; bez něj by šlo do uzamčené odeslané
 * nabídky dopsat větu, kterou zákazník nikdy neviděl.
 *
 * DVĚ ÚROVNĚ OD 22. 9. 2026 (zadání J. V.):
 *   • ZAKÁZKA — píše každý, platí jen pro tuhle nabídku (`C.popisy`);
 *   • APLIKACE — píše jen administrátor, platí pro všechny budoucí zakázky
 *     (`/api/popisy`, vlévá se do `DEFAULT_CENIK.popisy` při přihlášení).
 *
 * Administrátorův zápis jde do obou: v otevřené zakázce se text projeví
 * hned a zároveň se uloží jako nový výchozí. Ostatním se ukládá jen do
 * zakázky, takže výchozí text nikdo nepřepíše nedopatřením. Do 22. 9. pole
 * viděl jen administrátor a text nepřežil ani zavření zakázky, pokud
 * nezveřejnil celý ceník. */
function popisSet(cesta, v) {
  if (typeof zamekStop === 'function' && zamekStop()) return;
  if (typeof cenikPopisNastav !== 'function') return;
  cenikPopisNastav(C, cesta, v);
  aktivniVarianta(ZAK).upraveno = new Date().toISOString();
  if (typeof jeAdmin === 'function' && jeAdmin() && typeof onlinePopisUloz === 'function')
    onlinePopisUloz(cesta, v);
  render();
}
/* Řádek s dodatkovým textem pod položkou. Jeden pro příplatky i pro
 * volitelné — dvě kopie by se rozešly v popisku i v tom, kdo pole vidí.
 *
 * Pole vidí KAŽDÝ (zadání J. V. 22. 9. 2026: „ostatní uživatelé je mohou
 * v případě potřeby upravovat"). Vlastní položka zakázky ceníkovou položku
 * nemá, ke které by se text vázal, a v příští nabídce stejně nevznikne.
 * Samotné pole se netiskne: je zadávací, ne obsah kalkulace. */
function popisRadekHtml(r, cols) {
  if (!r || r.vlastni || !r.cenaPath) return '';
  /* Klíčem je PŮVODNÍ NÁZEV položky, ne ceníková cesta — dvě různé položky
   * můžou sdílet tutéž sazbu (madla boční × zadní) a v nabídce jsou to dva
   * různé výrobky. Podrobně u `popisZCeniku` v engine.js. */
  const klic = r.origNazev || r.nazev;
  const t = (typeof cenikPopis === 'function') ? cenikPopis(C, klic) : '';
  const admin = (typeof jeAdmin === 'function') && jeAdmin();
  const naped = admin
    ? 'Tiskne se v nabídce pod názvem položky místo množství. Jako administrátor ho ukládáte '
      + 'pro celou aplikaci — předvyplní se i v nabídkách ostatních.'
    : 'Tiskne se v nabídce pod názvem položky místo množství. Změna platí jen pro tuhle '
      + 'zakázku; výchozí text pro celou aplikaci zadává administrátor.';
  return `<tr class="noprint"><td colspan="${cols}" style="padding-top:0">
    <input type="text" style="width:100%" value="${esc(t)}" maxlength="${POPISY_MAX_TEXT}"
      placeholder="dodatkový text do cenové nabídky (nepovinné)"
      title="${esc(naped)}"
      onchange="popisSet('${keyAttr(klic)}', this.value)"></td></tr>`;
}
function popisRadekVol(r, cols) {
  return popisRadekHtml(r, cols);
}
/* ---- ruční přepis jedn. ceny u položek bez ceníkové vazby ---- */
function cenaSet(orig, v) {
  if (!Z.cenyPrepis) Z.cenyPrepis = {};
  if (v === '' || v == null) delete Z.cenyPrepis[orig]; else Z.cenyPrepis[orig] = +v;
  aktivniVarianta(ZAK).upraveno = new Date().toISOString();
  render();
}

/* ================= OPLÁŠTĚNÍ PO STĚNÁCH (#268, 3. krok, 21. 9. 2026) =======
 *
 * Výpočet, typy i kontrola standardu přišly ve dvou dávkách 18. 9. 2026
 * (plocha rozpojená na stěny A–D beze změny výsledku, pak pásy a sazby).
 * Chyběla obrazovka — režim se zapínal jedině ruční úpravou JSON, takže ho
 * obchodník neměl jak použít. Tohle je ta obrazovka.
 *
 * DATOVÝ TVAR (rozhodnutí z návrhu, dodatek 3): stěna nese JEDNU dolní mez
 * a SEZNAM PÁSŮ se stropem, ne dvě nezávislé dvojice od–do.
 *
 *   B: { odM: -1.2, pasy: [ {typ, doM: 2.2}, {typ, doM: null} ] }
 *
 * Pás začíná tam, kde skončil předchozí; poslední má `doM: null` = až
 * nahoru. Překryv ani mezera nejdou zapsat — není je z čeho složit. Mezera
 * se zadává jako pás typu „bez — dodá stavba", aby v zadání zůstalo vidět,
 * že se na to myslelo.
 *
 * Záporná dolní mez sahá do prohlubně; tam výpočet bere skutečnou šířku
 * stěny, protože nad ní není z čeho brát podíl.
 *
 * SEKCE JE SKRYTÁ, DOKUD SE REŽIM NEZAPNE (návrh, oddíl B): ve standardním
 * režimu obchodník o čtyřech stěnách vůbec neví. */

/* Popisky stěn pro obrazovku. Pořadí a klíče drží jádro (OPLASTENI_STENY),
 * tady je jen to, co se o nich píše člověku. */
const OPL_STENY_POPIS = { A: 'čelní stěna (dveře a světlíky)', B: 'boční stěna',
                          C: 'zadní stěna', D: 'boční stěna' };
const OPL_STENY = (typeof OPLASTENI_STENY !== 'undefined' ? OPLASTENI_STENY : ['A', 'B', 'C', 'D'])
  .map(k => ({ k, popis: OPL_STENY_POPIS[k] || '' }));

/* ZAMČENÁ VARIANTA SE JEN ČTE (N41d z revize v22.9.9, ověřeno 24. 9. 2026).
 * oplZadani() a oplStena() doplňovaly chybějící opláštění, stěny a pásy
 * PŘÍMO do zadání — a volá je vykreslení obrazovky. U zamčené (odeslané)
 * varianty tak pouhé otevření přepsalo data dokladu. U zamčené varianty
 * se proto výchozí podoba jen spočítá a vrátí jako kopie; zapisuje se
 * výhradně do varianty, kterou jde upravovat. */
function oplJenCist() {
  const v = (typeof aktivniVarianta === 'function' && typeof ZAK !== 'undefined') ? aktivniVarianta(ZAK) : null;
  return !!(v && typeof variantaEditovatelna === 'function' && !variantaEditovatelna(v));
}
function oplZadani() {
  if (!Z.oplasteni || typeof Z.oplasteni !== 'object') {
    const vych = { rezim: 'standard', steny: null };
    if (oplJenCist()) return vych;
    Z.oplasteni = vych;
  }
  return Z.oplasteni;
}
function oplPoStenach() { return oplZadani().rezim === 'poStenach'; }

/* Stěna vždy existuje a vždy má aspoň jeden pás — obrazovka se tak nemusí
 * ptát na prázdno na deseti místech. Výchozí typ bere `oplasteniVychoziTyp`
 * z jádra, takže sedí na to, co by na stěně bylo ve standardním režimu. */
function oplStena(k) {
  const o = oplZadani();
  const jenCist = oplJenCist();
  const ulozena = o.steny && typeof o.steny === 'object' && o.steny[k] && typeof o.steny[k] === 'object'
    ? o.steny[k] : null;
  /* U zamčené varianty chybějící nebo prázdnou stěnu jen dopočítat. */
  if (jenCist && !(ulozena && Array.isArray(ulozena.pasy) && ulozena.pasy.length)) {
    const vych = (typeof oplasteniStenyVychozi === 'function')
      ? oplasteniStenyVychozi(Z, aktivniVarianta(ZAK).data.cenik)[k]
      : { odM: 0, pasy: [{ typ: 'bez', doM: null }] };
    return { odM: ulozena && ulozena.odM != null ? ulozena.odM : (vych.odM != null ? vych.odM : 0),
             pasy: JSON.parse(JSON.stringify(vych.pasy)) };
  }
  if (!o.steny || typeof o.steny !== 'object') o.steny = {};
  if (!o.steny[k] || typeof o.steny[k] !== 'object') o.steny[k] = { odM: 0, pasy: [] };
  const st = o.steny[k];
  if (!Array.isArray(st.pasy) || !st.pasy.length) {
    /* Výchozí podobu stěny skládá JÁDRO (`oplasteniStenyVychozi`), ne tahle
     * obrazovka — jedině tak platí slib dávky #268, že zapnutí režimu beze
     * změny zadání nehne cenou. Viz komentář u té funkce. */
    const vych = (typeof oplasteniStenyVychozi === 'function')
      ? oplasteniStenyVychozi(Z, aktivniVarianta(ZAK).data.cenik)[k]
      : { odM: 0, pasy: [{ typ: 'bez', doM: null }] };
    st.pasy = vych.pasy;
    if (st.odM == null) st.odM = vych.odM;
  }
  if (st.odM == null) st.odM = 0;
  return st;
}

/* „Po celé výšce" = dolní mez 0 a jediný pás až nahoru. Není to zvláštní
 * příznak v datech: kdyby byl, musel by se držet v souladu s pásy a dřív
 * nebo později by se rozešel. Odvozuje se z nich. */
function oplCelaVyska(k) {
  const st = oplStena(k);
  return (+st.odM || 0) === 0 && st.pasy.length === 1 && st.pasy[0].doM == null;
}

function oplZmeneno() {
  aktivniVarianta(ZAK).upraveno = new Date().toISOString();
  /* Ručně zadaný náklad u typu „jiné" znamená atyp — stejně jako ručně
   * přepsané množství. Automatiku pouští `set()`; tady se na ni musí
   * sáhnout zvlášť, protože zapisujeme mimo něj. */
  if (typeof standardAtypAutomat === 'function') standardAtypAutomat();
  render();
}

function oplRezimSet(rezim) {
  const o = oplZadani();
  o.rezim = (rezim === 'poStenach') ? 'poStenach' : 'standard';
  /* Stěny se při zapnutí založí hned, ať se dá rovnou psát. Při vypnutí se
   * NEMAŽOU: kdo režim omylem vypne a zase zapne, nesmí přijít o rozdělení
   * stěn. Výpočet je ve standardním režimu stejně ignoruje. */
  if (o.rezim === 'poStenach') OPL_STENY.forEach(s => oplStena(s.k));
  oplZmeneno();
}

/* Kopie pásu pro rozdělení stěny a pro „+ přidat pás".
 *
 * Bere s sebou ruční název a sazbu typu „jiné". Bez toho se nový pás tváří
 * jako „jiné" bez ceny a počítá se za nula — a protože se pásy při slučování
 * berou podle pořadí, zmizelo by tím i to, co obchodník napsal. Dělicí výška
 * se NEKOPÍRUJE: tu si každý pás určuje sám. */
function oplPasKopie(p) {
  const zdroj = p || {};
  const novy = { typ: zdroj.typ, doM: null };
  if (zdroj.nazev != null) novy.nazev = zdroj.nazev;
  if (zdroj.naklad != null) novy.naklad = zdroj.naklad;
  return novy;
}

function oplCelaVyskaSet(k, ano) {
  const st = oplStena(k);
  if (ano) {
    /* Zpátky na jeden pás: ponechá se typ PRVNÍHO pásu, protože ten pokrývá
     * spodek stěny, na který se obchodník dívá nejdřív. */
    st.odM = 0;
    st.pasy = [{ typ: st.pasy[0].typ, nazev: st.pasy[0].nazev, naklad: st.pasy[0].naklad, doM: null }];
  } else if (st.pasy.length === 1) {
    /* ODŠKRTNUTÍ MUSÍ STĚNU OPRAVDU ROZDĚLIT. „Po celé výšce" je ODVOZENÝ
     * stav (dolní mez 0, jediný pás až nahoru), ne příznak v datech — do
     * 21. 9. 2026 se tady pásy jen přepsaly na jeden jediný, takže se ze
     * stejných dat odvodilo zase „po celé výšce" a zaškrtávátko se okamžitě
     * vrátilo zpátky. Rozdělit stěnu na pásy nešlo vůbec; celá funkce po
     * stěnách byla tím nedostupná (nález J. V. při prvním proklikání testu).
     *
     * Druhý pás se přidá stejně jako tlačítkem „+ přidat pás": nad ten
     * stávající a s týmž typem. Dělicí výška zůstává prázdná — vymyslet ji
     * za obchodníka by znamenalo tvrdit něco o stavbě — a obrazovka rovnou
     * řekne, že ji má vyplnit.
     *
     * KOPÍRUJE SE CELÝ PÁS, ne jen typ. Do 21. 9. 2026 (revize téhož dne) se
     * zakládal holý `{ typ, doM }` — a protože zaškrtnutí zpět bere PRVNÍ
     * pás, zahodilo se tím u typu „jiné" jméno materiálu i ruční sazba.
     * Dvě kliknutí tak stěnu tiše zlevnila na nulu: v kalkulaci zůstal řádek
     * „JINÉ" za 0 Kč. */
    st.pasy.splice(0, 0, oplPasKopie(st.pasy[0]));
  }
  oplZmeneno();
}

function oplOdSet(k, val) {
  const st = oplStena(k);
  const s = String(val == null ? '' : val).trim().replace(',', '.');
  st.odM = s === '' ? 0 : (+s || 0);
  oplZmeneno();
}

function oplPasSet(k, i, pole, val) {
  const st = oplStena(k);
  const p = st.pasy[i];
  if (!p) return;
  if (pole === 'doM') {
    const s = String(val == null ? '' : val).trim().replace(',', '.');
    p.doM = s === '' ? null : (+s || 0);
  } else if (pole === 'naklad') {
    const s = String(val == null ? '' : val).trim().replace(',', '.');
    p.naklad = s === '' ? null : (+s || 0);
  } else if (pole === 'typ') {
    p.typ = String(val || '');
    /* Přepnutím na jiný typ ztrácí ruční název a sazba smysl — nechat je
     * viset by znamenalo, že se po návratu na „jiné" objeví cizí čísla. */
    if (p.typ !== 'jine') { delete p.nazev; delete p.naklad; }
  } else if (pole === 'nazev') {
    p.nazev = String(val || '');
  }
  oplZmeneno();
}

/* Nový pás se vkládá NAD poslední: poslední vždy sahá až nahoru, takže nový
 * dělí to, co bylo pod ním. Dělicí výška se nepředvyplňuje — vymyslet ji za
 * obchodníka by znamenalo tvrdit něco o stavbě. */
function oplPasPridej(k) {
  const st = oplStena(k);
  const posledni = st.pasy[st.pasy.length - 1];
  /* Celá kopie včetně názvu a sazby u typu „jiné" — viz `oplPasKopie`. */
  st.pasy.splice(st.pasy.length - 1, 0, oplPasKopie(posledni));
  oplZmeneno();
}

function oplPasSmaz(k, i) {
  const st = oplStena(k);
  if (st.pasy.length <= 1) return;        // stěna bez pásu neexistuje
  st.pasy.splice(i, 1);
  st.pasy[st.pasy.length - 1].doM = null;  // poslední vždycky až nahoru
  oplZmeneno();
}

/* Dělicí výšky musí růst a ležet nad dolní mezí. Výpočet si to hlídá sám
 * (pás s nulovou nebo zápornou výškou prostě přeskočí), ale mlčky — a tiché
 * přeskočení pásu je přesně ten druh chyby, který se pozná až u zákazníka.
 * Vrací text varování, nebo prázdno. */
function oplStenaVarovani(k, opl) {
  const st = oplStena(k);
  const cis = v => (typeof formatCislo === 'function') ? formatCislo(v) : String(v);

  /* „JINÉ" BEZ SAZBY SE POČÍTÁ ZA NULU. Platí i u stěny po celé výšce, proto
   * se to zkouší PŘED odbočkou níž. V kalkulaci z toho je řádek „JINÉ"
   * s cenou 0 Kč — vypadá jako hotová položka, ne jako nedodělek. */
  for (let i = 0; i < st.pasy.length; i++) {
    const p = st.pasy[i];
    if (String(p.typ) === 'jine' && !(+p.naklad > 0))
      return 'Pás ' + (i + 1) + ' je „jiné" bez sazby — dokud ji nevyplníte, počítá se za 0 Kč.';
  }

  /* STĚNA, ZE KTERÉ SE DO CENY NEDOSTANE NIC (nález J. V. 21. 9. 2026).
   *
   * POZOR, NÁSLEDUJÍCÍ ODSTAVCE POPISUJÍ STAV PŘED #295 a N46 — nechávají
   * se kvůli historii. Od 24. 9. 2026 platí pravidlo nástupišť (N46): patro
   * s dveřmi nese jen světlíky, patro bez dveří se opláští celé; stěna
   * s dveřmi v každém patře má bez světlíků plochu 0 m² a varování níž to
   * vysvětlí.
   *
   * Plocha se v režimu po stěnách bere z dosavadního výpočtu (`skloSteny`)
   * a pásy si ji dělí poměrem výšek — aby zapnutí režimu nehnulo cenou.
   * U ČELNÍ STĚNY je ale tou dosavadní plochou jen SVĚTLÍK nad dveřmi a po
   * stranách, protože zbytek čelní stěny zabírají dveře a portály. Bez
   * světlíků je tedy plocha čelní stěny NULA — a obchodník si může vybrat
   * sklo přes celou stěnu, nákres mu ji vybarví celou, specifikace ji
   * zákazníkovi slíbí, a v ceně nebude ani koruna.
   *
   * Změřeno: šachta bez světlíků, stěna A celá ze skla od −2 m do 23 m →
   * 0 m² nad nulou (do ceny jde jen část pod nulou, tedy prohlubeň),
   * zatímco stěny B, C a D dají přes 40 m² každá.
   *
   * Tohle varování ten nesoulad pojmenuje. Čím plochu čelní stěny NAHRADIT
   * je obchodní rozhodnutí (kolik z ní ukrojí dveře a portály), ne otázka
   * pro kód — dokud nepadne, musí být aspoň vidět.
   *
   * POŘADÍ: hlásí se AŽ NAPOSLED. Chybějící dělicí výška nebo „jiné" bez
   * sazby jsou konkrétní chyby zadání, se kterými obchodník něco udělá hned;
   * tohle je vlastnost výpočtu, kterou sám nespraví. Kdyby to bylo naopak,
   * zakrylo by to hlášky, na které se dá reagovat. Počítá se ale už tady,
   * aby se dalo vrátit i u stěny po celé výšce, která má vlastní odbočku. */
  let nulova = '';
  if (opl && Array.isArray(opl.pasy)) {
    const nadNulou = opl.pasy.filter(p => p.stena === k && (+p.doM || 0) > 0);
    const m2 = nadNulou.reduce((a, p) => a + (+p.m2 || 0), 0);
    const jenBez = nadNulou.length > 0 && nadNulou.every(p => String(p.typ) === 'bez');
    /* TEXT PODLE DNEŠNÍHO VÝPOČTU (nález N39 revize v22.9.9). Do 22. 9. 2026
     * tu stálo, že se plocha čelní stěny bere ze světlíků — to platilo před
     * #295. Od té doby je čelní stěna celá stěna MÍNUS otvory dveří
     * a portálů a od #296 se stejně počítá i zadní stěna průchozí šachty.
     * Nula tedy u těch dvou stěn znamená jediné: otvory zaberou celou
     * stěnu (nízká šachta s mnoha nástupišti). Stará věta posílala
     * obchodníka hledat světlíky, které s tím nemají nic společného. */
    /* OD 24. 9. 2026 (N46, pravidlo nástupišť): patro s dveřmi je nástupiště
     * — dveře, portál s plechy, nástupní plech a světlíky; opláštění nese jen
     * světlíky. Stěna s dveřmi v každém patře (čelní stěna běžné šachty)
     * má proto bez světlíků plochu 0 m² — to je správně, ne chyba. Hláška
     * to vysvětlí, aby si obchodník nemyslel, že sklo přes celou stěnu je
     * zdarma. */
    const sDvermi = k === 'A' || (k === 'C' && !!(Z && Z.pruchoziSachta) && (+(Z && Z.nastupisteC) || 0) > 0);
    if (nadNulou.length && !jenBez && m2 < 0.005)
      nulova = 'Z téhle stěny se do ceny nedostane nic: nad úrovní nástupiště vychází 0 m². '
        + (sDvermi
          ? 'Stěna má dveře v každém patře, takže je celá nástupiště: kolem dveří je portál s plechy '
            + 'a nástupní plech, opláštění nese jen světlíky. Bez světlíků je plocha 0 m² — tak to má být. '
            + 'Chcete-li nad dveřmi sklo, zaškrtněte světlík nad dveřmi.'
          : 'Zkontrolujte rozměry šachty — výpočet u téhle stěny žádnou plochu nedává.');
  }

  if (oplCelaVyska(k)) return nulova;

  /* Horní hrana opláštění. Bere se z jádra (`r.oplasteni.vyska`), ne ze
   * zadání — jádro na ni dělicí výšky ořezává, takže se tím pozná pás,
   * který se do ceny vůbec nedostane. */
  const vyska = (opl && +opl.vyska > 0) ? +opl.vyska : null;
  const odM = +st.odM || 0;

  /* DOLNÍ MEZ MIMO ŠACHTU. Nad horní hranou stěna z ceny zmizí celá; pod dnem
   * prohlubně se připočítává plocha, která neexistuje. Výpočet obojí spolkne
   * bez hlesnutí (nález revize 21. 9. 2026). */
  if (vyska != null && odM >= vyska)
    return 'Opláštění začíná v ' + cis(odM) + ' m, ale stěna končí v ' + cis(vyska)
      + ' m — takhle se z ní nepočítá nic.';
  const dno = -(+Z.prohluben || 0);
  if (odM < dno - 1e-9)
    return 'Opláštění začíná v ' + cis(odM) + ' m, tedy pod dnem prohlubně ('
      + cis(dno) + ' m). Plocha pod dnem se počítá, přestože tam žádná stěna není.';

  let dolni = odM;
  for (let i = 0; i < st.pasy.length - 1; i++) {
    const doM = st.pasy[i].doM;
    if (doM == null) return 'Pás ' + (i + 1) + ' nemá dělicí výšku — vyplňte ji, nebo pás odeberte.';
    if (+doM <= dolni) return 'Dělicí výšky musí růst: ' + cis(+doM) + ' m není nad ' + cis(dolni) + ' m.';
    /* Dělicí výška nad horní hranou: jádro ji ořízne a pásy nad ní zmizí,
     * ale technická specifikace je zákazníkovi dál slibuje. */
    if (vyska != null && +doM >= vyska)
      return 'Dělicí výška ' + cis(+doM) + ' m je nad horní hranou stěny (' + cis(vyska)
        + ' m) — pás ' + (i + 2) + ' a výš se do ceny nedostanou.';
    dolni = +doM;
  }
  return nulova;
}

function oplTypSelect(k, i) {
  const st = oplStena(k);
  const p = st.pasy[i];
  const ext = Z.typSachty !== 'interiérová';
  const typy = (typeof oplasteniTypy === 'function') ? oplasteniTypy(ext) : [];
  /* Uložený typ, který se do nabídky nevejde (změnil se typ šachty), se
   * přidá navrch — jinak by select tiše ukázal něco jiného, než je v datech,
   * a při nejbližším překreslení by se to do dat i zapsalo. */
  const zname = typy.some(t => t.id === p.typ);
  const navic = zname ? '' : `<option value="${esc(p.typ)}" selected>${esc(p.typ)} (z jiného typu šachty)</option>`;
  return `<select style="width:190px" onchange="oplPasSet('${escJs(k)}', ${+i}, 'typ', this.value)">
      ${navic}${typy.map(t => `<option value="${esc(t.id)}" ${t.id === p.typ ? 'selected' : ''}>${esc(t.nazev)}</option>`).join('')}
    </select>`;
}

function oplJineHtml(k, i) {
  const p = oplStena(k).pasy[i];
  if (p.typ !== 'jine') return '';
  /* Ruční název i sazba patří do zadání, ne do ceníku: je to jednorázové
   * řešení téhle zakázky. Do ceníku se nepropisují schválně — jinak by se
   * jednorázovost stala sazbou pro všechny. */
  return `<span class="par">
      <input type="text" style="width:150px" placeholder="název opláštění"
        value="${esc(p.nazev || '')}" onchange="oplPasSet('${escJs(k)}', ${+i}, 'nazev', this.value)">
      <input type="number" step="any" style="width:100px" placeholder="Kč/m²"
        title="náklad za m²; ruční sazba znamená atyp"
        value="${esc(p.naklad == null ? '' : p.naklad)}" onchange="oplPasSet('${escJs(k)}', ${+i}, 'naklad', this.value)">
    </span>`;
}

/* ---------- NÁKRES STĚNY (#281) ----------
 *
 * Tabulka pásů řekne, co je zadané; neřekne, jak stěna VYPADÁ. Při prvním
 * proklikání (J. V., 21. 9. 2026) se ukázalo, že čtyři stěny po dvou pásech
 * jsou jako text nepřehledné — člověk si musí v hlavě skládat, co je nahoře
 * a co dole, a záporná dolní mez v prohlubni se z čísel nepozná vůbec.
 *
 * Nákres proto kreslí PÁSY, KTERÉ SPOČÍTALO JÁDRO (`r.oplasteni.pasy`), ne
 * vlastní přepočet zadání. Jádro dělicí výšku ořezává (pás nesmí pod
 * předchozí ani nad horní hranu) a plochu pod nulou bere jinak než nad ní;
 * obrázek, který by si to počítal po svém, by při první změně pravidel
 * ukazoval něco jiného, než z čeho vyšla cena. */
const OPL_BARVY = {
  'C.skloBokyKc':   '#bfdbfe',
  'C.skloCelniKc':  '#a7f3d0',
  'C.skloVsg442Kc': '#5eead4',
  'C.cetrisKc':     '#e7d5bb',
  'jine':           '#ddd6fe',
};
/* Neznámý typ dostane šedou, ať nákres přežije, když v jádru přibude
 * materiál — chybějící barva nesmí shodit obrazovku. */
function oplBarva(typ) { return OPL_BARVY[typ] || '#e5e7eb'; }

function oplTypNazev(typ, nazev) {
  if (typ === 'jine') return nazev || 'jiné';
  const t = (typeof OPLASTENI_TYPY !== 'undefined' ? OPLASTENI_TYPY : []).find(x => x.id === typ);
  return t ? t.nazev : String(typ || '');
}

const OPL_NAKRES_PX = 150;

function oplNakresStena(k, opl) {
  const pasy = ((opl && opl.pasy) || []).filter(p => p.stena === k);
  if (!pasy.length) return '';
  const dole = +pasy[0].odM || 0;
  const nahore = +opl.vyska || 0;
  const rozsah = nahore - dole;
  if (!(rozsah > 0)) return '';
  /* VÝŠKY PÁSŮ A KÓTY SE POČÍTAJÍ ZE STEJNÉ TABULKY (oprava 21. 9. 2026,
   * revize téhož dne).
   *
   * Každý pás má minimum 2 px, aby tenký pás nezmizel úplně. Když jich je
   * takových víc, součet přeroste stanovených 150 px — a protože `.opl-bar`
   * má `overflow:hidden`, spodní pás se tiše ořízne. Změřeno: čtyři pásy
   * daly součet 154 px a nejspodnější nebyl vidět.
   *
   * Pruh proto NEMÁ pevnou výšku: je tak vysoký, jak vyšly pásy, a kóty se
   * umisťují podle KUMULOVANÝCH výšek týchž pásů, ne lineárním přepočtem
   * z metrů. Jedině tak kóta sedí přesně na hranu pásu i tehdy, když se
   * minimum uplatnilo. */
  const odshora = pasy.slice().reverse().map(p => ({
    p, vys: Math.max(2, ((+p.doM || 0) - (+p.odM || 0)) / rozsah * OPL_NAKRES_PX),
  }));
  const celkemPx = odshora.reduce((a, x) => a + x.vys, 0);

  const kusy = odshora.map(({ p, vys }) => {
    const jmeno = oplTypNazev(p.typ, p.nazev);
    const m2 = (typeof formatCislo === 'function') ? formatCislo(p.m2) : String(Math.round(p.m2 * 100) / 100);
    return `<div class="opl-pas${p.typ === 'bez' ? ' opl-pas-bez' : ''}"
        style="height:${vys.toFixed(1)}px;background:${esc(oplBarva(p.typ))}"
        title="${esc(jmeno + ' · ' + m2 + ' m²')}"
      >${vys >= 18 ? `<span>${esc(jmeno)}</span>` : ''}</div>`;
  }).join('');

  /* Kóty: horní hrana a pak dolní hrana každého pásu odshora dolů.
   * `videne` kvůli stěně o jednom pásu, kde by se horní hrana opakovala. */
  const videne = [];
  const koty = [];
  let off = 0;
  const kotaHtml = (v, px) => {
    if (videne.some(x => Math.abs(x - v) < 1e-9)) return;
    videne.push(v);
    koty.push(`<span class="opl-kota${v < 0 ? ' opl-kota-pod' : ''}" style="top:${px.toFixed(1)}px">${
      esc((typeof formatCislo === 'function' ? formatCislo(v) : String(v)))}</span>`);
  };
  kotaHtml(nahore, 0);
  odshora.forEach(({ p, vys }) => { off += vys; kotaHtml(+p.odM || 0, off); });

  /* Čára úrovně nástupu: bez ní se z obrázku nepozná, co je prohlubeň.
   * Hledá se uvnitř pásu, ve kterém nula leží, aby seděla i po uplatnění
   * minimální výšky. */
  let nulaPx = null;
  let bezi = 0;
  odshora.forEach(({ p, vys }) => {
    const h = +p.doM || 0, d = +p.odM || 0;
    if (nulaPx === null && d <= 0 && 0 <= h && h > d)
      nulaPx = bezi + (h - 0) / (h - d) * vys;
    bezi += vys;
  });
  const nula = (dole < 0 && nahore > 0 && nulaPx !== null)
    ? `<span class="opl-nula" style="top:${nulaPx.toFixed(1)}px" title="úroveň nástupu (0 m)"></span>` : '';

  /* PLOCHA STĚNY POD OBRÁZKEM. Bez ní by obrázek mohl lhát: čelní stěna nese
   * dveřní portály, takže její plocha k opláštění jsou jen světlíky nad
   * dveřmi — a bez nich vyjde NULA. Barevné pásy by pak slibovaly materiál,
   * za který se nic nepočítá. S číslem je to na první pohled vidět. */
  const stenaM2 = pasy.reduce((a, p) => a + (p.typ === 'bez' ? 0 : (+p.m2 || 0)), 0);
  const cis = v => (typeof formatCislo === 'function') ? formatCislo(v) : String(Math.round(v * 100) / 100);
  const popisek = `<div class="opl-nakres-pata${stenaM2 > 0 ? '' : ' opl-nakres-nic'}">${
    stenaM2 > 0 ? esc(cis(stenaM2)) + ' m²'
      : 'bez plochy k opláštění'}</div>`;

  return `<div class="opl-nakres">
      <div class="opl-bar" style="height:${celkemPx.toFixed(1)}px">${kusy}</div>
      <div class="opl-koty" style="height:${celkemPx.toFixed(1)}px">${koty.join('')}${nula}</div>
      ${popisek}
    </div>`;
}

/* Souhrn ploch podle typu — totéž číslo, které jde do kalkulace. */
function oplSouhrnHtml(opl) {
  const podle = (opl && opl.podleTypu) || [];
  if (!podle.length) return '';
  const cis = v => (typeof formatCislo === 'function') ? formatCislo(v) : String(Math.round(v * 100) / 100);
  const bunky = podle.map(t => `<span class="opl-legenda-kus">
      <i style="background:${esc(oplBarva(t.typ))}"></i>${esc(oplTypNazev(t.typ, t.nazev))}
      <b>${esc(cis(t.m2))} m²</b></span>`).join('');
  return `<div class="opl-legenda">${bunky}
    <span class="opl-legenda-kus opl-legenda-soucet">celkem k opláštění
      <b>${esc(cis(opl.plochaCelkem || 0))} m²</b></span></div>`;
}

function oplStenaHtml(s, opl) {
  const k = s.k;
  const st = oplStena(k);
  const cela = oplCelaVyska(k);
  const varovani = oplStenaVarovani(k, opl);
  /* Varování patří i ke stěně po celé výšce: „jiné" bez sazby se počítá
   * za nulu bez ohledu na to, jestli je stěna rozdělená. */
  const varovaniHtml = varovani
    ? `<div class="seznam-varovani">Stěna ${esc(k)}: ${esc(varovani)}</div>` : '';
  const hlava = `<div class="row"><label title="${esc(s.popis)}">Stěna ${esc(k)}
      <span class="note" style="font-weight:400"> — ${esc(s.popis)}</span></label>
    <span class="par">
      ${cela ? oplTypSelect(k, 0) : ''}
      <label style="font-weight:400" title="celá stěna je z jednoho materiálu">
        <input type="checkbox" ${cela ? 'checked' : ''}
          onchange="oplCelaVyskaSet('${escJs(k)}', this.checked)"> po celé výšce</label>
    </span><span class="u"></span></div>`
    + (cela ? oplJineHtml(k, 0) : '');
  /* Pole vlevo, nákres vpravo. Nákres se kreslí i u stěny po celé výšce —
   * i tam nese informaci (materiál a výšku), a hlavně se tím čtyři stěny
   * vedle sebe čtou stejně. */
  const obal = (obsah) => `<div class="opl-stena-in">
      <div class="opl-pole">${obsah}</div>${oplNakresStena(k, opl)}</div>`;
  if (cela) return obal(hlava + varovaniHtml);

  /* Pásy se vypisují ODSHORA DOLŮ, protože tak se na stěnu člověk dívá;
   * ukládají se zdola nahoru (viz jádro). Proto to obrácené pořadí. */
  const pasy = st.pasy.map((p, i) => {
    const posledni = (i === st.pasy.length - 1);
    return `<div class="row"><label style="font-weight:400">Pás ${i + 1}${posledni ? ' (až nahoru)' : ''}</label>
      <span class="par">${oplTypSelect(k, i)}
        ${posledni ? '<span class="note">po horní hranu</span>'
          : `<input type="number" step="0.01" style="width:90px" placeholder="do (m)"
              title="dělicí výška — kde tenhle pás končí a začíná další"
              value="${esc(p.doM == null ? '' : p.doM)}"
              onchange="oplPasSet('${escJs(k)}', ${+i}, 'doM', this.value)">`}
        ${st.pasy.length > 1 ? `<button class="mini" title="odebrat pás"
          onclick="oplPasSmaz('${escJs(k)}', ${+i})">✕</button>` : ''}
      </span><span class="u"></span></div>`
      + oplJineHtml(k, i);
  }).reverse().join('');

  /* POŘADÍ ŘÁDKŮ ODPOVÍDÁ STĚNĚ (zadání J. V. 21. 9. 2026).
   *
   * Pásy se čtou odshora dolů, takže „Opláštění začíná" — spodní hrana
   * opláštění — patří až pod ně, ne nad ně. Dokud stálo nahoře, čtl se
   * sloupec zdola nahoru a pak zase shora dolů, a nákres vedle toho šel
   * opačně než text. Tlačítko „+ přidat pás" zůstává hned pod pásy, protože
   * se týká jich. */
  return obal(hlava
    + pasy
    + `<div class="row"><label></label><span class="par">
        <button class="mini" onclick="oplPasPridej('${escJs(k)}')">+ přidat pás</button></span><span class="u"></span></div>`
    + `<div class="row"><label style="font-weight:400">Opláštění začíná</label>
        <input type="number" step="0.01" style="width:90px"
          title="výška, od které se opláštění počítá; záporná hodnota sahá do prohlubně"
          value="${esc(st.odM)}" onchange="oplOdSet('${escJs(k)}', this.value)"><span class="u">m</span></div>`
    + varovaniHtml);
}

/* Karta se kreslí JEN v režimu po stěnách (návrh, oddíl B). */
function oplasteniKarta() {
  if (!oplPoStenach()) return '';
  /* Pásy z JÁDRA, jednou pro celou kartu. Zámek respektuje `vypocetAkt()`:
   * u odeslané nabídky vydá zmrazený otisk, takže nákres ukazuje stěnu tak,
   * jak ji viděl zákazník, ne jak by vyšla dnes. Kdyby výpočet z nějakého
   * důvodu spadl, karta se musí vykreslit i bez obrázku — zadání je
   * důležitější než ilustrace.
   *
   * Volá se VÝHRADNĚ `vypocetAkt()`. Záloha přes `vypocet()` by obcházela
   * zámek: odeslaná nabídka by se překreslila dnešním jádrem místo svého
   * otisku (nález A1). Hlídá to `test_zamek_otisk.js` — a chytil to hned. */
  let opl = null;
  try { opl = (vypocetAkt() || {}).oplasteni || null; } catch (e) { opl = null; }
  return kartaRezim('ock', 'oplasteniSteny', 'Opláštění po stěnách (A–D)',
    /* Každá stěna je JEDEN blok. Bez toho ji `.inputs .card .body` rozseká:
     * ten grid sází do sloupců každý `.row` zvlášť, takže hlavičky čtyř stěn
     * stály vedle sebe v ~290px sloupcích (popisek se lámal do svislého
     * proužku) a po rozdělení stěny na pásy by se hlavička, dolní mez a pásy
     * rozletěly do různých sloupců. Viz `.opl-steny` v app_template.html. */
    `<div class="opl-steny">`
    + OPL_STENY.map(s => `<div class="opl-stena">${oplStenaHtml(s, opl)}</div>`).join('')
    + `</div>`
    + oplSouhrnHtml(opl)
    + `<div class="note">Stěny se počítají po pásech a do kalkulace se sčítají <b>podle typu</b>,
      ne podle stěny — nabídka se tím nerozdrobí na osm skoro stejných řádků.
      Pás začíná tam, kde skončil předchozí, takže překryv ani mezera nemůžou vzniknout.
      Úsek, který se oplášťovat nemá, zadejte jako pás typu <b>„bez — dodá stavba"</b>;
      zůstane tak vidět, že se na to myslelo.</div>`
    /* OPRAVENO 21. 9. 2026 (revize téhož dne). Stálo tu „Terče a lišty se
     * počítají jen z pásů se sklem" — a nebyla to pravda: `terceKs`
     * i `listyCelkBm` se počítají z rozměrů šachty a na `z.oplasteni` vůbec
     * nesahají. Změřeno: u čtyř stěn ze skla, z Cetrisu i „bez" vyjde řádek
     * PLECHY - ZASKLENÍ (TERČE/LIŠTY) stejně. Slib v obrazovce, který kód
     * neplní, je horší než mlčení — obchodník podle něj čeká u Cetrisu nižší
     * cenu, která nepřijde. Jestli se terče a lišty MAJÍ vázat na sklo, je
     * otázka na J. V. (zapsáno v roadmapě). */
    + `<div class="note">Záporná hodnota u „Opláštění začíná" sahá <b>do prohlubně</b>.
      <b>Terče, lišty a plastové kotvy</b> se počítají z rozměrů šachty —
      typ opláštění s nimi zatím nehýbe.
      Režim po stěnách je vždy <b>mimo standard</b> — standard zná jen jednotné opláštění.</div>`,
    'ock-oplasteni-steny');
}

/* ---- vlastní ruční položky v jednotlivých sekcích ---- */
function vlastniPolozkyArr(sekce) {
  if (!Z.vlastniPolozky) Z.vlastniPolozky = { hrubaOck: [], atyp: [], oplasteni: [], volitelne: [], rezie: [], spojovaci: [], lakovani: [] };
  if (!Array.isArray(Z.vlastniPolozky[sekce])) Z.vlastniPolozky[sekce] = [];
  // migrace starší sekce Volitelné (volitelneVlastni) do nové struktury
  if (sekce === 'volitelne' && Array.isArray(Z.volitelneVlastni) && Z.volitelneVlastni.length && !Z.vlastniPolozky.volitelne.length) {
    Z.vlastniPolozky.volitelne = Z.volitelneVlastni; Z.volitelneVlastni = [];
  }
  return Z.vlastniPolozky[sekce];
}
function vlastniAdd(sekce) { vlastniPolozkyArr(sekce).push({ nazev: 'Nová položka', mnozstvi: 1, cena: 0 }); aktivniVarianta(ZAK).upraveno = new Date().toISOString(); render(); }
async function vlastniDel(sekce, i) {
  const p = vlastniPolozkyArr(sekce)[i];
  // katalogovou (trvalou) položku si zapamatuj jako odebranou, ať se v této zakázce nevrátí
  if (p && p.kid) {
    if (!await potvrd('Položka „' + p.nazev + '" je trvalá (z ceníku).\n\nSmazat ji jen v této zakázce?\nV ceníku a v nových nabídkách zůstane.')) return;
    katalogZapamatujOdebrani(Z, p);
  }
  vlastniPolozkyArr(sekce).splice(i, 1);
  aktivniVarianta(ZAK).upraveno = new Date().toISOString();
  render();
}
/* lokální položku uložit natrvalo do ceníku (katalogu) → bude ve všech nových nabídkách */
function vlastniDoCeniku(sekce, i) {
  katalogUloz(KATALOG, Z, sekce, i);
  aktivniVarianta(ZAK).upraveno = new Date().toISOString();
  render();
}
function vlastniSet(sekce, i, k, v) {
  const p = vlastniPolozkyArr(sekce)[i];
  if (!p) return;
  const puvodni = p.nazev;
  p[k] = k === 'nazev' ? v : +v;
  // přejmenování vlastní položky – přestěhuj ruční přepisy klíčované názvem (#4)
  if (k === 'nazev' && puvodni && puvodni !== p.nazev) prepisyPrejmenuj(Z, puvodni, p.nazev);
  aktivniVarianta(ZAK).upraveno = new Date().toISOString();
  render();
}

/* ---- zaškrtnutí volitelné položky do základní ceny ---- */
function volitelneToggle(key, v) {
  /* Materiál i MONTÁŽ přechodových plechů se přepínají jedním zaškrtávátkem
   * (16. 9. 2026): plechy mají vždy dvě položky, viz `prechMontAno` v jádře.
   * Kliknutí na kteroukoli z těch dvou řádek tedy míří na týž zdroj —
   * jinak by zůstalo zaškrtávátko, které nic nedělá. */
  if (key === 'prechodove' || key === 'prechMont') {
    /* Jednotný zdroj pravdy je `Z.prechodovePlechy`. Jenže `Z.volitelne.prechodove`
     * má u jádra PŘEDNOST, kdykoli není null — a starší zakázky ho nenulové
     * mají, protože ho tam do 16. 9. 2026 zapisovala matice Výchozí. Na takové
     * zakázce bylo zaškrtávátko úplně mrtvé: psalo do pole, které nikdo nečetl.
     * Příčinu řeší zobrazeni.js; tímhle se uzdraví i zakázky, které už
     * poškozené jsou — první kliknutí tu zálohu zase uvolní.
     *
     * Spolu s tím se zahazuje `Z.volitelne.prechMont`. Starší zakázka, ve
     * které někdo montáž ručně vypnul, si to pole nese dál a jádro ho ctí —
     * nové pravidlo o dvojici platí jen pro nové zakázky (J. V. 16. 9. 2026:
     * „zpětně neřeš"). Jenže samostatné zaškrtávátko montáže už neexistuje,
     * takže dokud tam to pole je, nejde montáž nijak vrátit. Uvolní se tedy
     * ve chvíli, kdy obchodník na plechy sáhne: od té chvíle se zakázka řídí
     * materiálem jako každá nová. Dokud na ně nesáhne, cena se jí nemění.
     *
     * Pořadí je schválně takhle: `set()` sám hlídá zámek varianty, takže na
     * uzamčené zakázce neprojde ani jedno volání a stav zůstane, jak byl.
     * Kdybych pole vynuloval napřímo, zámek bych obešel. */
    set('Z.volitelne.prechodove', null);
    set('Z.volitelne.prechMont', null);
    set('Z.prechodovePlechy', v);
    return;
  }
  set('Z.volitelne.' + key, v);
}

/* ---- buňky editovatelných sloupců (sdílené pro všechny sekce) ---- */
function bunkaNazev(r, sekceKey) {
  const origJs = keyAttr(r.origNazev);
  const del = r.vlastni ? ` <button class="mini noprint" title="smazat položku" onclick="vlastniDel('${sekceKey}', ${r.idx})">✕</button>` : '';
  /* Špendlík „uložit natrvalo do ceníku" zmizel 1. 9. 2026 se stejným
   * odůvodněním jako tlačítko „+ přidat položku trvale": trvalé položky se
   * zakládají v ceníku, ne v kalkulaci. Funkce vlastniDoCeniku() zůstává —
   * volá ji katalog při propisu — jen z kalkulace na ni nevede tlačítko. */
  const pin = '';
  const reset = (!r.vlastni && r.nazevPrepsan) ? ` <button class="mini noprint" title="vrátit původní název (${esc(r.origNazev)})" onclick="nazevReset('${origJs}')">↺</button>` : '';
  const onch = r.vlastni ? `vlastniSet('${sekceKey}', ${r.idx}, 'nazev', this.value)` : `nazevSet('${origJs}', this.value)`;
  const pozn = r.pozn ? ` <span class="note">(${esc(r.pozn)})</span>` : '';
  /* Klíč ceníkové položky za tímhle řádkem (1. 9. 2026) — vidí ho jen
   * administrátor. Řádek BEZ klíče je řádek, který se v ceníku neopírá
   * o nic: buď je vlastní (přidaný v zakázce), nebo se cena počítá jinak. */
  /* Souhrnný řádek (spojovací materiál, lakování) nemá jednu ceníkovou cenu,
   * ale celou skupinu — `cenaSkupina` nese `C.spojovaci.*`, ať je i u nich
   * vidět, kam v ceníku sáhnout (1. 9. 2026). */
  const klic = r.vlastni ? '' : klicChip(r.cenaPath || r.cenaSkupina,
    r.cenaSkupina && !r.cenaPath
      ? 'řádek je součet celé skupiny ceníku — jednu cenu nemá'
      : undefined);
  return `<input type="text" class="nazev-ed" value="${esc(r.nazev)}" onchange="${onch}" title="název položky lze přepsat">${reset}${pin}${del}${klic}${pozn}`;
}
function bunkaMnozstvi(r) {
  if (r.vlastni)
    return `<input type="number" step="any" style="width:86px" value="${+(+r.mnozstvi).toFixed(3)}" onchange="vlastniSet('${escJs(r.sekce)}', ${r.idx}, 'mnozstvi', this.value)">`;
  const origJs = keyAttr(r.origNazev);
  return `<input type="number" step="any" style="width:86px" value="${+(+r.mnozstvi).toFixed(3)}" onchange="mnozstviSet('${origJs}', this.value)" title="množství lze ručně přepsat">` +
    (r.prepsano ? ` <button class="mini noprint" title="vrátit vypočtené množství (${num(r.mnozstviAuto, 3)})" onclick="mnozstviSet('${origJs}', '')">↺</button>` : '');
}
function bunkaCena(r) {
  if (r.vlastni)
    return `<input type="number" step="any" style="width:96px" value="${+(+r.cena).toFixed(2)}" onchange="vlastniSet('${escJs(r.sekce)}', ${r.idx}, 'cena', this.value)">`;
  if (r.cenaPath)
    return `<input type="number" step="any" style="width:96px" value="${+(+r.cena).toFixed(2)}" onchange="set('${escJs(r.cenaPath)}', +this.value)" title="jedn. cena z ceníku – změna se propíše i do Ceníku nákladů (obousměrně)">`;
  const origJs = keyAttr(r.origNazev);
  return `<input type="number" step="any" style="width:96px" value="${+(+r.cena).toFixed(2)}" onchange="cenaSet('${origJs}', this.value)" title="jedn. cena – ruční přepis (bez ceníkové vazby)">` +
    (r.cenaPrepsana ? ` <button class="mini noprint" title="vrátit vypočtenou cenu (${fmt(r.cenaAuto)})" onclick="cenaSet('${origJs}', '')">↺</button>` : '');
}
/* ---- stabilní klíč řádku (pro pořadí a viditelnost) ---- */
function radekKey(r) {
  if (r.key) return r.key;                                   // volitelné katalog má vlastní klíč
  return r.vlastni ? ('vlastni:' + r.sekce + ':' + r.idx) : r.origNazev;
}
function jeSkryta(key) { return (Z.skryteProUzivatele || []).includes(key); }
function viditelnostSet(key, viditelne) {
  if (!Z.skryteProUzivatele) Z.skryteProUzivatele = [];
  Z.skryteProUzivatele = Z.skryteProUzivatele.filter(k => k !== key);
  if (!viditelne) Z.skryteProUzivatele.push(key);
  aktivniVarianta(ZAK).upraveno = new Date().toISOString();
  render();
}
/* Výchozí zaškrtnutí volitelné položky (sloupec Výchozí).
 *
 * Do 20. 8. 2026 se zapisovalo do `Z.volitelneVychozi` — do zadání OTEVŘENÉ
 * zakázky, kde ho ale nikdo nečetl: sloupec se dal zaškrtat a nestalo se nic
 * (hlášeno J. V. 20. 8.). Hodnota teď žije v matici zobrazení (klíč `vychozi`)
 * a platí pro každou NOVOU zakázku — viz zobrazeniVychoziAplikuj v zobrazeni.js.
 * Pole `volitelneVychozi` v zadání zůstává kvůli starším uloženým zakázkám,
 * nic se z něj ale nečte. */
/* ZÁKLAD JE TO, S ČÍM NOVÁ ZAKÁZKA OPRAVDU ZAČÍNÁ (16. 9. 2026, nález J. V.:
 * „stále nám nefunguje zaškrtávání výchozích položek").
 *
 * Matice ukládá jen ODCHYLKY od základu — shoda se základem se maže
 * (zobrazeniPolozkaVychoziNastav). Základ tedy musí být přesně ta hodnota,
 * proti které se pak matice aplikuje, jinak se celý sloupec rozjede.
 *
 * A přesně to se dělo u přechodových plechů. Sloupec je kreslil proti
 * `DEFAULT_ZADANI.prechodovePlechy` (= true), jenže nová zakázka začíná
 * z `ZADANI_NOVA`, kde je `false`. Zaškrtávátko proto svítilo zapnuté,
 * ale nová zakázka plechy neměla — a zaškrtnutím se nic neuložilo, protože
 * „true se rovná základu". Sloupec se nedal přepnout ANI JEDNÍM směrem:
 * zapnuto = neukládá se, vypnuto = uloží false, což je totéž jako nic.
 * Administrátor tedy klikal do prázdna.
 *
 * `ZADANI_NOVA` přebíjí `DEFAULT_ZADANI` jen u pár polí zadání; sekce
 * `volitelne` v něm není, takže ostatní položky dopadnou stejně jako dřív. */
function volitelneVychoziZaklad(key) {
  return vychoziZakladVolitelne(key);
}
/* seřazení řádků sekce dle uloženého pořadí (Z.poradi[sekce]); neuvedené na konec */
function serazSekci(rows, sekceKey) {
  const poradi = Z.poradi && Z.poradi[sekceKey];
  if (!poradi || !poradi.length) return rows;
  const idx = k => { const i = poradi.indexOf(k); return i < 0 ? 1e9 : i; };
  return rows.map((r, i) => ({ r, i })).sort((a, b) => (idx(radekKey(a.r)) - idx(radekKey(b.r))) || (a.i - b.i)).map(x => x.r);
}
/* ---- přetahování řádků v rámci sekce (jen admin) ---- */
let _dragKey = null, _dragSek = null;
function dragStart(e, sek, key) { _dragSek = sek; _dragKey = key; if (e.dataTransfer) { e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/plain', key); } catch (_) {} } }
function dragOver(e) { if (_dragKey != null) { e.preventDefault(); if (e.dataTransfer) e.dataTransfer.dropEffect = 'move'; } }
function dragDrop(e, sek, key) { e.preventDefault(); if (_dragSek === sek && _dragKey != null && _dragKey !== key) presunRadek(sek, _dragKey, key); _dragKey = null; _dragSek = null; }
function presunRadek(sekceKey, fromKey, toKey) {
  let r; try { r = vypocetAkt(); } catch (e) { return; }
  const zdroj = sekceKey === 'volitelne' ? r.volitelneKatalog : (r.sekce[sekceKey] || []);
  let ord = serazSekci(zdroj, sekceKey).map(radekKey).filter(k => k !== fromKey);
  const ti = ord.indexOf(toKey);
  ord.splice(ti < 0 ? ord.length : ti, 0, fromKey);
  if (!Z.poradi) Z.poradi = {};
  Z.poradi[sekceKey] = ord;
  aktivniVarianta(ZAK).upraveno = new Date().toISOString();
  render();
}

/* viditelnost sloupců podle role/nastavení + koncové admin sloupce (viditelnost, výchozí) */
function kalkSloupce() {
  /* Dřív `jeAdmin()`. Sloupce s nákladem a přirážkou (a s nimi koncové
   * sloupce Viditelnost / Výchozí) teď stojí na právu `sloupce.naklad`, aby
   * je šlo přidělit vedoucímu bez zbytku administrátorských funkcí. Výchozí
   * matice právo nikomu nedává, takže se dnešní chování nemění. */
  const admin = smiZobrazit('sloupce.naklad');
  const showCost = admin && NAST.zobrazitNaklady;
  /* Sloupec „Výchozí" nastavuje CELOU APLIKACI (co uvidí v nové zakázce
   * všichni), ne tuhle zakázku — proto ho od 3. 9. 2026 (zadání J. V.:
   * „obchodníci vidí tlačítka Výchozí v kalkulacích a to by neměli") vidí
   * jen administrátor. Nestačilo by ho pověsit na `sloupce.naklad`: to je
   * právo přidělitelné obchodníkovi i vedoucímu, a kdo smí vidět nákupní
   * cenu, ještě nemá přenastavovat program všem ostatním. */
  const spravce = (typeof zobrazeniRole === 'function')
    ? zobrazeniRole() === 'Administrátor' : !!NAST.jeAdmin;
  /* Od 3. 9. 2026 (druhé zadání J. V.: „sloupec Viditelné obchodníkům také
   * skryj") jsou ADMINISTRÁTORSKÉ OBA koncové sloupce: „Viditelné" i „Výchozí"
   * nastavují program všem uživatelům, ne tuhle zakázku. Kdo má jen právo
   * `sloupce.naklad`, vidí náklad a přirážku — ale nepřenastavuje aplikaci. */
  const adminExtra = (admin && spravce) ? 2 : 0;
  return { admin, spravce, showCost, adminExtra,
    NC: 2 + (admin ? 1 : 0) + (showCost ? 2 : 0) + 1 + adminExtra };
}
function poznHtml(r) { return r.pozn ? ` <span class="note">(${esc(r.pozn)})</span>` : ''; }
/* Atypická položka bez ceny (#7). Nula v ceníku vypadá v tabulce úplně stejně
 * jako skutečná nula a v součtu po ní nezůstane stopa – nabídka by práci navíc
 * rozdala zdarma a přišlo by se na to až při fakturaci. Proto je vidět přímo
 * u řádku, nejen v kontrolách před nabídkou, a vidí ji i běžný uživatel:
 * je to on, kdo nabídku skládá. Částku odznak nenese (běžný uživatel náklady
 * nevidí, #36) a do tisku nejde – je to poznámka pro nás, ne pro zákazníka. */
function bezCenyHtml(r) {
  return r && r.bezCeny ? ' <span class="pill warn noprint" title="Atypická práce nemá cenu – doplňte sazbu v ceníku (sekce ATYP), nebo položku odeberte.">bez ceny</span>' : '';
}
function gripHtml(r, sekceKey) {
  return `<span class="grip" draggable="true" ondragstart="dragStart(event,'${sekceKey}','${keyAttr(radekKey(r))}')" title="přetáhnout řádek">⠿</span>`;
}
function adminKoncBunky(r, sekceKey) {
  if (!kalkSloupce().spravce) return '';        // oba sloupce jsou administrátorské
  const key = radekKey(r), ka = keyAttr(key);
  const vis = `<td class="admincol"><input type="checkbox" ${jeSkryta(key) ? '' : 'checked'} onchange="viditelnostSet('${ka}', this.checked)" title="viditelné pro běžného uživatele"></td>`;
  /* Sloupec Výchozí. Od 21. 8. 2026 večer ho mají VŠECHNY položky kalkulace
   * (zadání J. V.), ne jen volitelné — u sekcí Hrubá OCK, Opláštění a Režie
   * říká, jestli se položka v NOVÉ zakázce vůbec počítá.
   *
   * Dvě různá úložiště pro jednu otázku, protože jde o dvě různé věci:
   *   volitelná položka → `ock.<klíč>`      = je rovnou v základní ceně,
   *   běžná položka     → `ock.pocitat:<název>` = počítá se vůbec.
   * Vlastní řádek zakázky sloupec nemá: v nové zakázce vůbec nevznikne,
   * takže není co přednastavovat. */
  let vych = '';
  if (sekceKey === 'volitelne' && !r.vlastni) {
    /* Montáž přechodových plechů nemá vlastní přednastavení: od 16. 9. 2026
     * se řídí materiálem (J. V.: „Plechy mají vždy 2 položky"). Kdyby si
     * nesla vlastní klíč, byl by ze sloupce Výchozí u toho řádku mrtvý
     * přepínač — zaškrtnutí by se uložilo a nová zakázka by ho ignorovala.
     * Obě řádky proto píší do `ock.prechodove`: přepnutím kterékoliv z nich
     * se přednastaví dvojice. */
    const vychKey = (key === 'prechMont') ? 'prechodove' : key;
    vych = vychoziPolozkaChk('ock.' + vychKey, volitelneVychoziZaklad(vychKey),
      'zaškrtnuto = položka je v NOVÉ zakázce rovnou v základní ceně (platí pro všechny)');
  } else if (!r.vlastni) {
    vych = vychoziPolozkaChk(ZOBRAZENI_POCITAT + String(r.origNazev || r.nazev), true,
      'zaškrtnuto = položka se v NOVÉ zakázce počítá (platí pro všechny); '
      + 'odškrtnutím ji z každé nové kalkulace vyřadíte. Otevřená zakázka se nemění.');
  }
  return vis + `<td class="admincol">${vych}</td>`;
}
/* Štítek u položky vypnuté ručním množstvím 0 (nález V22, 4. 9. 2026).
 * Stejný typ štítku jako „skrytá ostatním" nebo „bez ceny" — jeden vzhled
 * pro jednu třídu sdělení. Netiskne se: je to poznámka pro nás, ne pro
 * zákazníka (obchodník ostatně vypnutou položku do nabídky nedává). */
function vypnutoHtml(r) {
  return (typeof radekVypnutyNulou === 'function' && radekVypnutyNulou(r))
    ? ` <span class="pill vyp noprint" title="${esc(VYPNUTO_POPIS)}">vypnuto (množství 0)</span>` : '';
}
/* Třída řádku. Ztlumuje se BARVOU textu, ne opacity — opacity rodiče se
 * násobí na potomky a zesvětlila by i zaškrtávátka admin sloupců (týž nález
 * jsme měli u .vyrazeno i u .nezahrnuto). */
function vypnutoTrida(r) {
  return (typeof radekVypnutyNulou === 'function' && radekVypnutyNulou(r)) ? ' vypnuto-nulou' : '';
}

function radekKalk(r, sekceKey) {
  const { admin, showCost } = kalkSloupce();
  const key = radekKey(r);
  const dz = admin ? ` ondragover="dragOver(event)" ondrop="dragDrop(event,'${sekceKey}','${keyAttr(key)}')"` : '';
  /* Vlastní položku smí upravit i ten, kdo ji směl přidat (19. 8. 2026,
   * právo kalk.pridatPolozku) — jinak by obchodník přidal řádek, který sám
   * nedokáže pojmenovat ani ocenit. Jednotková cena vlastní položky se mu
   * ukazuje přímo u názvu (nákladové sloupce nevidí). */
  const vlastniEd = !admin && r.vlastni && smiZobrazit('kalk.pridatPolozku');
  let c = `<td style="white-space:normal">${admin
    ? `<div class="vol-name">${gripHtml(r, sekceKey)}${bunkaNazev(r, sekceKey)}${bezCenyHtml(r)}${vypnutoHtml(r)}</div>`
    : vlastniEd
      ? `<input type="text" class="nazev-ed" style="width:55%" value="${esc(r.nazev)}" onchange="vlastniSet('${escJs(r.sekce)}', ${r.idx}, 'nazev', this.value)">
         à <input type="number" step="any" style="width:96px" value="${+(+r.cena).toFixed(2)}" title="jednotková cena této položky (jen pro tuto zakázku)"
           onchange="vlastniSet('${escJs(r.sekce)}', ${r.idx}, 'cena', this.value)"> Kč
         <button class="mini noprint" title="odebrat vlastní položku" onclick="vlastniDel('${escJs(r.sekce)}', ${r.idx})">✕</button>`
      : esc(r.nazev) + poznHtml(r) + bezCenyHtml(r) + vypnutoHtml(r)}</td>`;
  c += `<td style="white-space:nowrap">${(admin || vlastniEd) ? bunkaMnozstvi(r) : num(r.mnozstvi, 3)}</td>`;
  if (admin) c += `<td style="white-space:nowrap">${bunkaCena(r)}</td>`;
  if (showCost) c += `<td>${fmt(r.naklad)}</td><td>${fmt(r.marze)}</td>`;
  c += `<td>${fmt(r.sMarzi)}</td>`;
  if (admin) c += adminKoncBunky(r, sekceKey);
  return `<tr${dz} class="${vypnutoTrida(r).trim()}">${c}</tr>`;
}
function radekPridat(sekceKey, popis) {
  const { NC } = kalkSloupce();
  return `<tr class="pridat noprint"><td colspan="${NC}"><button class="mini" onclick="vlastniAdd('${sekceKey}')">+ ${popis}</button></td></tr>`;
}
/* Sjednocený řádek přidávání (zadání 19. 8. 2026 večer): v KAŽDÉ sekci
 * kalkulace stojí vedle sebe
 *   „+ přidat položku"        — obchodník, vedoucí i admin (právo
 *                               kalk.pridatPolozku); řádek jen této zakázky,
 *   „+ přidat položku trvale" — JEN administrátor; zapíše položku do
 *                               ceníku (katalogu), takže platí pro všechny
 *                               budoucí zakázky,
 * a v Hrubé OCK navíc historické „+ přidat atypickou položku (práce navíc)"
 * — funkčně beze změny, jen vizuálně ve stejném řádku vedle obou tlačítek. */
function radekPridatSekce(sekceKey) {
  const { NC } = kalkSloupce();
  const admin = jeAdmin();
  const btns = [];
  if (admin || smiZobrazit('kalk.pridatPolozku'))
    btns.push(`<button class="mini" title="vlastní řádek jen této zakázky" onclick="vlastniAdd('${sekceKey}')">+ přidat položku</button>`);
  /* „+ přidat položku trvale" z kalkulace ZMIZELO 1. 9. 2026 (pokyn J. V.:
   * „nově už budeme trvalé položky přidávat pouze v cenících"). Důvod je
   * pořádek ve zdroji pravdy: trvalá položka je ceníková věc a měnit ceník
   * uprostřed počítání nabídky svádí k tomu udělat to omylem. Přidává se
   * v záložce Ceník nákladů tlačítkem „+ přidat trvalou položku do sekce"
   * — sekce ceníku jsou tytéž jako sekce kalkulace. */
  /* Tlačítko „+ přidat atypickou položku (práce navíc)" bylo z Hrubé OCK
   * ODEBRÁNO 20. 8. 2026 na pokyn J. V. — od sjednocení přidávání (19. 8.)
   * dělalo totéž co „+ přidat položku", jen řádek posílalo do sekce atyp.
   * Sekce `atyp` v zadání i ve výpočtu zůstává beze změny (nese předvyplnění
   * ATYP a starší zakázky s atypickými řádky se počítají dál) — zmizelo jen
   * tlačítko, kterým se nové řádky zakládaly. */
  if (!btns.length) return '';
  return `<tr class="pridat noprint"><td colspan="${NC}">${btns.join(' ')}</td></tr>`;
}
/* „+ přidat položku trvale" (jen admin): rovnou do katalogu ceníku, odkud se
 * propíše do této i každé nové zakázky (existující mechanismus vlastniDoCeniku
 * / katalogPridejVc — stejná cesta jako tlačítko + v záložce Ceník). */
function vlastniAddTrvale(sekce) {
  if (!jeAdmin()) return;
  katalogPridejVc(KATALOG, Z, sekce, { nazev: 'Nová položka', mnozstvi: 1, cena: 0 });
  aktivniVarianta(ZAK).upraveno = new Date().toISOString();
  render();
}
function sumRadek(cls, label, sum, rows) {
  const { admin, showCost, adminExtra } = kalkSloupce();
  /* Kolik položek sekce je vypnutých nulou — ať je to vidět i u SBALENÉ
   * sekce, kde se jednotlivé řádky nekreslí (zadání J. V. 4. 9. 2026). */
  const vyp = (typeof vypnutychVSekci === 'function') ? vypnutychVSekci(rows) : 0;
  const pozn = vyp ? ` <span class="note" style="font-weight:400">· ${vyp} ${
    vyp === 1 ? 'položka vypnuta' : (vyp < 5 ? 'položky vypnuty' : 'položek vypnuto')}</span>` : '';
  let c = `<td>${label}${pozn}</td><td></td>`;
  if (admin) c += `<td></td>`;
  if (showCost) c += `<td>${fmt(sum.naklad)}</td><td>${fmt(sum.marze)}</td>`;
  c += `<td>${fmt(sum.sMarzi)}</td>`;
  c += '<td class="admincol"></td>'.repeat(adminExtra);
  return `<tr class="${cls}">${c}</tr>`;
}
function tbl(rows, sum, nazevSekce, sekceKey) {
  const { admin, spravce, NC } = kalkSloupce();
  /* Režim sekce (19. 8. 2026 večer): skrytou sekci obchodník/vedoucí vůbec
   * nedostane (počítá se dál!), srolovaná ukáže jen nadpis + CELKEM a jde
   * rozbalit. Administrátor vidí vždy vše a v nadpisu má select s volbou. */
  const rezim = sekceRezim('ock', sekceKey);
  if (rezim === 'skryt') return '';
  const sbaleno = sekceSbalena('ock', sekceKey);
  const vpravo = admin ? sekceRezimSelect('ock', sekceKey)
    : (rezim === 'srolovat' ? sekceRozbalBtn('ock', sekceKey) : '');
  rows = serazSekci(rows, sekceKey);
  if (!spravce) rows = rows.filter(r => !jeSkryta(radekKey(r)));  // skryté vidí jen ten, kdo je umí odkrýt
  // id řádku s názvem sekce = cíl kotvy v klouzající liště (kalkLista)
  return `<tr class="sechd" id="ock-sek-${sekceKey}"><td colspan="${NC}"><div style="display:flex;align-items:center;gap:12px"><span style="flex:1">${nazevSekce}</span>${vpravo}</div></td></tr>` +
    (sbaleno ? '' : rows.map(r => radekKalk(r, sekceKey)).join('')) +
    /* ATYP má vlastní sekci v zadání i v ceníku, ale v kalkulaci a v nabídce
     * spadá do HRUBÉ OCK – zákazník má vidět jednu ocelovou konstrukci, ne
     * účet za „něco navíc". Tlačítko je proto tady, ne ve vlastní tabulce (#7).
     * Od 19. 8. 2026 večer jsou všechna přidávací tlačítka sekce v JEDNOM
     * řádku (radekPridatSekce): položku / položku trvale / atypickou. */
    (sbaleno ? '' : radekPridatSekce(sekceKey)) +
    sumRadek('sectot', nazevSekce + ' CELKEM', sum, rows);
}
/* Volitelné položky – zaškrtávátkem přímo v hlavním sloupci (jako příplatky) */
function tblVolitelne(katalog, sum) {
  const { admin, spravce, showCost, NC } = kalkSloupce();
  /* režim sekce (19. 8. 2026 večer) — viz tbl() */
  const rezimV = sekceRezim('ock', 'volitelne');
  if (rezimV === 'skryt') return '';
  const sbalenoV = sekceSbalena('ock', 'volitelne');
  const vpravoV = admin ? sekceRezimSelect('ock', 'volitelne')
    : (rezimV === 'srolovat' ? sekceRozbalBtn('ock', 'volitelne') : '');
  let rows = serazSekci(katalog, 'volitelne');
  /* NÁLEZ 20. 8. 2026 (J. V.): obchodník tu neměl zaškrtávátka a viděl JEN
   * položky, které už zahrnuté byly — nemohl tedy žádnou přidat ani ubrat,
   * a v seznamu mu chyběly i položky, které měl podle sloupce Viditelné
   * vidět. Filtr `r.zahrnuto` byl chybný: zahrnutí je VOLBA OBCHODNÍKA
   * (levé zaškrtávátko), kdežto co vůbec smí vidět, řídí výhradně sloupec
   * Viditelné (jeSkryta) — ten nastavuje vedoucí nebo admin vpravo.
   * Teď tedy: uživatel vidí všechny NESKRYTÉ položky a každou si může
   * zaškrtnout; sloupce Viditelné a Výchozí zůstávají jen administrátorovi
   * (3. 9. 2026 — dřív je viděl každý s právem `sloupce.naklad`). */
  if (!spravce) rows = rows.filter(r => !jeSkryta(radekKey(r)));
  if (sbalenoV) rows = [];
  return `<tr class="sechd" id="ock-sek-volitelne"><td colspan="${NC}"><div style="display:flex;align-items:center;gap:12px"><span style="flex:1">VOLITELNÉ POLOŽKY DO ZÁKLADNÍ CENY <span class="note" style="font-weight:400">(zaškrtnuté se počítají do základní ceny)</span></span>${vpravoV}</div></td></tr>` +
    rows.map(r => {
      const key = radekKey(r);
      const dz = admin ? ` ondragover="dragOver(event)" ondrop="dragDrop(event,'volitelne','${keyAttr(key)}')"` : '';
      let c;
      if (admin) {
        const chk = r.vlastni ? '<span class="vol-spacer"></span>'
          : `<input type="checkbox" ${r.zahrnuto ? 'checked' : ''} onchange="volitelneToggle('${escJs(r.key)}', this.checked)" title="zahrnout do základní ceny">`;
        c = `<td style="white-space:normal"><div class="vol-name">${gripHtml(r, 'volitelne')} ${chk}${bunkaNazev(r, 'volitelne')}${vypnutoHtml(r)}</div></td>`;
        c += `<td style="white-space:nowrap">${bunkaMnozstvi(r)}</td><td style="white-space:nowrap">${bunkaCena(r)}</td>`;
      } else {
        /* Vlastní volitelnou položku smí upravit i ten, kdo ji směl přidat
         * (19. 8. 2026, právo kalk.pridatPolozku) — stejné pravidlo jako
         * v ostatních sekcích (radekKalk). Trvalé (kid) upravuje jen admin. */
        const vlEdV = r.vlastni && !r.kid && smiZobrazit('kalk.pridatPolozku');
        /* Zaškrtávátko „počítat do základní ceny" má i obchodník (20. 8. 2026).
         * Vlastní řádek zakázky se nezaškrtává — ten se počítá vždycky,
         * proto jen mezera, aby text řádků lícoval. */
        const chkU = r.vlastni ? '<span class="vol-spacer"></span>'
          : `<input type="checkbox" ${r.zahrnuto ? 'checked' : ''} onchange="volitelneToggle('${escJs(r.key)}', this.checked)" title="zahrnout do základní ceny"> `;
        c = vlEdV
          ? `<td style="white-space:normal">${chkU}<input type="text" class="nazev-ed" style="width:55%" value="${esc(r.nazev)}" onchange="vlastniSet('volitelne', ${r.idx}, 'nazev', this.value)">
               à <input type="number" step="any" style="width:96px" value="${+(+r.cena).toFixed(2)}" title="jednotková cena této položky (jen pro tuto zakázku)"
                 onchange="vlastniSet('volitelne', ${r.idx}, 'cena', this.value)"> Kč
               <button class="mini noprint" title="odebrat vlastní položku" onclick="vlastniDel('volitelne', ${r.idx})">✕</button></td>
             <td style="white-space:nowrap"><input type="number" step="any" style="width:86px" value="${+(+r.mnozstvi).toFixed(3)}" onchange="vlastniSet('volitelne', ${r.idx}, 'mnozstvi', this.value)"></td>`
          : `<td style="white-space:normal">${chkU}${esc(r.nazev) + poznHtml(r) + vypnutoHtml(r)}</td><td style="white-space:nowrap">${num(r.mnozstvi, 3)}</td>`;
      }
      /* NEZAŠKRTNUTÝ ŘÁDEK NEUKAZUJE ČÁSTKU (16. 9. 2026, nález J. V.:
       * „volitelné položky nám zřejmě také stále nefungují podle
       * zaškrtávátek").
       *
       * Jádro spočítá každou položku katalogu bez ohledu na zaškrtnutí —
       * do součtu pustí jen zaškrtnuté, ale samotný řádek si svou částku
       * nese pořád. U většiny položek to nebylo vidět náhodou: mají
       * množství 0, takže se stejně vypsala nula. Lešení má ale FIXNÍ
       * část, a tak u odškrtnutého řádku svítilo 20 000 Kč, přestože se
       * nikam nepočítalo. Vypadalo to, že zaškrtávátko nefunguje.
       *
       * Pomlčka místo nuly je záměr: nula by tvrdila „tahle položka nic
       * nestojí", což není pravda — jen se nepočítá SEM. Kolik stojí, se
       * dozvíte v Příplatcích, kam odškrtnutá položka spadne. Stejnou
       * pomlčku ze stejného důvodu ukazuje i opačný případ v tabulce
       * příplatků (priplatkyZakladniCena). Množství a jednotková cena
       * v řádku zůstávají, takže je pořád z čeho odhadnout dopad. */
      const castka = (x) => r.zahrnuto ? fmt(x) : '—';
      if (showCost) c += `<td>${castka(r.naklad)}</td><td>${castka(r.marze)}</td>`;
      c += `<td>${castka(r.sMarzi)}</td>`;
      if (admin) c += adminKoncBunky(r, 'volitelne');
      /* Ztlumení nezahrnuté položky řídí třída, ne inline opacity (20. 8.
       * 2026): opacity rodiče se násobila i na zaškrtávátka admin sloupců
       * a ta pak vypadala „světle modře“ — stejný nález jako u .vyrazeno. */
      /* Tři různé stavy vedle sebe: nezahrnutá do základní ceny × vypnutá
       * nulou. Můžou nastat oba naráz, proto se třídy skládají. */
      const tridy = (r.zahrnuto ? '' : 'nezahrnuto') + vypnutoTrida(r);
      /* Dodatkový text i u volitelných položek (#267) — zadání J. V. mluví
       * o „příplatkových a volitelných položkách“, takže obojí. */
      return `<tr${dz}${tridy.trim() ? ` class="${tridy.trim()}"` : ''}>${c}</tr>`
        + popisRadekVol(r, NC);
    }).join('') +
    (sbalenoV ? '' : radekPridatSekce('volitelne')) +
    sumRadek('sectot', 'VOLITELNÉ CELKEM (jen zaškrtnuté)', sum, rows);
}

/* Výběr příplatků, které se propíší do cenové nabídky */
/* ŘÁDEK, KTERÝ SE NENABÍZÍ, SE NESMÍ JEN TAK ZTRATIT (nález J. V. 16. 9. 2026:
 * „myslím, že mi u příplatkové výbavy chybí minimálně dva řádky lešení").
 *
 * Lešení je v aplikaci na dvou místech: ve VOLITELNÝCH (je v základní ceně)
 * a v PŘÍPLATCÍCH (zákazník si ho může doobjednat). Aby se nezapočítalo
 * dvakrát, vypadne z příplatků to, co je zaškrtnuté ve Volitelných —
 * `engine.js` to dělá řádky `v.leseniVnejsi ? null : mkPrip(...)`.
 *
 * Věcně je to správně a nic se tím neztrácí. Jenže řádek prostě ZMIZÍ a nikde
 * není poznat proč: v ceníku variant se z ničeho nic nedá najít položka, která
 * tam včera byla. Vysvětlující věta pod tabulkou to říkala obecně, což při
 * hledání konkrétní položky nepomůže.
 *
 * Tenhle řádek proto vyjmenuje, CO PRÁVĚ TEĎ vypadlo a kam se pro to jít
 * podívat. Nic nepočítá a do žádného dokumentu nejde — je to jen odpověď na
 * otázku „kde je lešení". */
/* ŘÁDKY, KTERÉ VYPADLY DO VOLITELNÝCH, VIDÍ SPRÁVCE V TABULCE (J. V.
 * 16. 9. 2026: „ty položky by měly být každopádně viditelné minimálně pro
 * administrátora a to nejsou").
 *
 * Ověřeno v prohlížeči na testovacím webu: v matici Výchozí je zveřejněno
 * `ock.leseniHlava=true`, `ock.leseniVnejsi=true`, `ock.sokl=true`
 * a `ock.prechMont=true`, takže tyhle položky patří do základní ceny a jádro
 * je z příplatků správně vynechá. Správce ale kouká do ceníku variant a tři
 * řádky z něj beze stopy zmizí — a nemá kde ověřit, že se to nepočítá
 * dvakrát, ani z čeho se ta částka skládá.
 *
 * Řádky se proto vypisují znovu, ale ZTLUMENÉ a bez zaškrtávátka Nabídka:
 * jsou to údaje, ne položky. Do `r.priplatky` nepatří, takže se do žádného
 * součtu ani dokumentu nepromítnou — dvojí započtení tudy nehrozí. Vidí je
 * jen správce; obchodníkovi by v ceníku pro zákazníka jen překážely, tomu
 * stačí věta pod tabulkou. */
function priplatkyZakladniCena(r, col) {
  if (!col.admin) return '';
  const kat = (r && r.volitelneKatalog) || [];
  /* Katalog je už profiltrovaný podle dostupnosti (jádro do něj nepustí
   * položku, která se u téhle šachty nenabízí), takže stačí `zahrnuto`.
   * Ověřeno v prohlížeči: `dostupne` se do katalogu vůbec nepřenáší —
   * filtrovat na něj by vrátilo prázdno, což se mi napoprvé stalo.
   *
   * `prip` navíc (16. 9. 2026): smysl tohohle bloku je ukázat řádky, které
   * z tabulky příplatků ZMIZELY. Vlastní volitelná položka zakázky tu nikdy
   * nebyla, takže se nemá kde ztratit — vypisovat ji sem by byl jen šum. */
  const v = kat.filter(x => x.zahrnuto && x.prip);
  if (!v.length) return '';
  const sirka = (col.admin ? 1 : 0) + 2 + (col.admin ? 1 : 0) + (col.showCost ? 1 : 0) + 1 + col.adminExtra;
  return `<tr class="subhead"><td colspan="${sirka}">V ZÁKLADNÍ CENĚ (sekce Volitelné) — nepočítá se sem</td></tr>`
    + v.map(x => {
      const m = (+x.mnozstvi || 0), c = (+x.cena || 0);
      return `<tr class="nezahrnuto">
        <td></td>
        <td>${esc(x.nazev)} <span class="pill mut" title="položka je zaškrtnutá v sekci Volitelné, tedy už v základní ceně">v základní ceně</span></td>
        <td>${num(m, 3)}</td>
        <td>${num(c, 0)}</td>
        ${col.showCost ? `<td>${fmt0(x.naklad)}</td>` : ''}
        <td>—</td>
        ${'<td class="admincol"></td>'.repeat(col.adminExtra)}
      </tr>`;
    }).join('');
}

function priplatkyVeVolitelnych(r) {
  const kat = (r && r.volitelneKatalog) || [];
  /* Rozhoduje příznak `prip` z jádra (klíč zastupujícího příplatku), ne
   * název. Do 16. 9. 2026 se tu hledalo `/LEŠENÍ/i`, takže věta mlčela
   * o přechodových plechách — ty jsou dvojdomé úplně stejně. Od téhož dne
   * jsou dvojdomé i háky, zábradlí a sokl; podle názvu by se to muselo
   * dopisovat pokaždé znovu a na jedno by se zapomnělo. */
  const skryte = kat.filter(x => x.zahrnuto && x.prip);
  if (!skryte.length) return '';
  /* Názvy se spojí NEJDŘÍV a escapují se jedním voláním. Escapovat po
   * položkách a slepit je `</b>, <b>` by bylo stejně bezpečné, ale statický
   * hlídač v test_escape.js vidí jen vnější výraz — a `join()` mu bezpečný
   * nepřipadá. Obejít ho zápisem do PROVERENO kvůli tučnému písmu nestojí za
   * to: hlídač, který má výjimky pro kosmetiku, přestane být hlídačem. */
  const nazvy = esc(skryte.map(x => x.nazev).join(', '));
  const jedna = skryte.length === 1;
  return `<div class="note" style="margin-top:6px">V příplatcích se nenabízí
    <b>${nazvy}</b> — ${jedna ? 'tahle položka je zaškrtnutá' : 'tyhle položky jsou zaškrtnuté'}
    v sekci <b>Volitelné</b>, tedy už v základní ceně. Odškrtnutím tam se
    ${jedna ? 'vrátí' : 'vrátí'} sem jako příplatek.</div>`;
}

function priplatekNabidka(key, zahrnout) {
  if (!Z.priplatkyVynechat) Z.priplatkyVynechat = [];
  Z.priplatkyVynechat = Z.priplatkyVynechat.filter(k => k !== key);
  if (!zahrnout) Z.priplatkyVynechat.push(key);
  render();
}
/* Vlastní příplatkové položky */
function priplatekVlastniAdd() { if (!Z.priplatkyVlastni) Z.priplatkyVlastni = []; Z.priplatkyVlastni.push({ nazev: 'Nový příplatek', mnozstvi: 1, cena: 0 }); aktivniVarianta(ZAK).upraveno = new Date().toISOString(); render(); }
async function priplatekVlastniDel(i) {
  const p = Z.priplatkyVlastni[i];
  if (p && p.kid) {
    if (!await potvrd('Příplatek „' + p.nazev + '" je trvalý (z ceníku).\n\nSmazat jen v této zakázce?\nV ceníku a v nových nabídkách zůstane.')) return;
    katalogZapamatujOdebrani(Z, p);
  }
  Z.priplatkyVlastni.splice(i, 1);
  aktivniVarianta(ZAK).upraveno = new Date().toISOString();
  render();
}
/* „+ přidat položku trvale" u příplatků (19. 8. 2026): rovnou do katalogu
 * ceníku (sekce priplatky) – stejná cesta jako 📌 u existujícího řádku. */
function priplatekVlastniAddTrvale() {
  if (!jeAdmin()) return;
  katalogPridejVc(KATALOG, Z, 'priplatky', { nazev: 'Nový příplatek', mnozstvi: 1, cena: 0 });
  aktivniVarianta(ZAK).upraveno = new Date().toISOString();
  render();
}
/* vlastní příplatek uložit natrvalo do ceníku */
function priplatekDoCeniku(i) {
  katalogUloz(KATALOG, Z, 'priplatky', i);
  aktivniVarianta(ZAK).upraveno = new Date().toISOString();
  render();
}
function priplatekVlastniSet(i, k, v) {
  const p = Z.priplatkyVlastni[i];
  if (!p) return;
  const puvodni = p.nazev;
  p[k] = k === 'nazev' ? v : +v;
  if (k === 'nazev' && puvodni && puvodni !== p.nazev) prepisyPrejmenuj(Z, puvodni, p.nazev);
  aktivniVarianta(ZAK).upraveno = new Date().toISOString();
  render();
}

/* ---------- sirotčí ruční přepisy (#4) ----------
 * Přepis množství / ceny / názvu je klíčovaný názvem položky. Když položka
 * z výpočtu zmizí nebo se přejmenuje mimo hlídané cesty (import staršího
 * souboru, ruční úprava JSONu, změna ceníku ve starší verzi), přepis zůstane
 * v datech, ale už se na nic nenaváže – navenek to vypadá, že se ruční úprava
 * ztratila. Kartu ukazujeme jen administrátorovi a úklid je vždy jeho vědomé
 * rozhodnutí: sirotek může být dočasný (položka je jen vypnutá nastavením
 * šachty a po přepnutí se vrátí i s přepisem). */
async function sirotciUklidVse() {
  let r; try { r = vypocetAkt(); } catch (e) { return; }
  const s = prepisySirotci(Z, r.nazvyPolozek);
  if (!s.length) return render();
  if (!await potvrd('Smazat ' + s.length + ' nepoužitý ruční přepis/y?\n\nTýká se jen přepisů, které v tomto výpočtu nemají odpovídající položku. Vrátit zpět to lze tlačítkem „Zpět“ (Ctrl+Z).')) return;
  prepisyUklid(Z, s);
  aktivniVarianta(ZAK).upraveno = new Date().toISOString();
  render();
}
function sirotekUklid(mapa, klic) {
  prepisyUklid(Z, [{ mapa, klic }]);
  aktivniVarianta(ZAK).upraveno = new Date().toISOString();
  render();
}
function sirotciKarta(r) {
  if (!jeAdmin()) return '';
  const s = prepisySirotci(Z, r.nazvyPolozek);
  if (!s.length) return '';
  const radky = s.map(x => `<tr>
      <td style="white-space:normal">${esc(x.klic)}</td>
      <td>${esc(x.popis)}</td>
      <td style="white-space:nowrap">${esc(prepisHodnotaText(x))}</td>
      <td class="noprint"><button class="mini" title="smazat tento přepis" onclick="sirotekUklid('${escJs(x.mapa)}', '${escJs(x.klic)}')">✕</button></td>
    </tr>`).join('');
  return card(`Nepoužité ruční přepisy (${s.length})`,
    `<div class="note">Tyto ruční úpravy jsou uložené u položek, které se v aktuálním výpočtu nevyskytují –
       typicky proto, že se položka přejmenovala nebo ji vyřadilo jiné nastavení šachty. <b>Na výslednou cenu
       nemají vliv.</b> Pokud jde o položku, která se sem ještě vrátí, nechte je být; jinak je můžete uklidit.</div>
     <table><tr><th>Položka (klíč přepisu)</th><th>Druh přepisu</th><th>Hodnota</th><th class="noprint"></th></tr>
       ${radky}</table>
     <div class="noprint" style="margin-top:8px"><button class="mini" onclick="sirotciUklidVse()">Uklidit všechny nepoužité přepisy</button></div>`);
}

function renderOutputs() {
  let r;
  try { r = vypocetAkt(); }
  catch (e) {
    const elS = document.getElementById('kalk-souhrn'); if (elS) elS.innerHTML = '';
    document.getElementById('outputs').innerHTML = `<div class="card"><div class="body neg">Chyba výpočtu: ${esc(e.message)}</div></div>`; return; }
  // štítek režimu výpočtu se obnovuje v render() (viz renderRezimPill v common.js),
  // aby zůstal správný i tehdy, když výpočet spadne a tahle funkce skončí dřív
  const s = r.souctySekci, o = r.odvozene, p = r.parametry;

  const col = kalkSloupce();
  // hodnoty hlavičky – zohlední schválenou slevu (jinak podíl 0)
  // koncovou cenu skládá zaokrouhleni.js (#38), ať hlavička ukazuje totéž co nabídka
  const cn = (typeof cenaNabidkyOck === 'function') ? cenaNabidkyOck(r, SL, ZO) : null;
  const podil = cn ? cn.slevaPct : ((typeof slevaPodil === 'function') ? slevaPodil(SL) : 0);
  const zaklad = r.souhrn.zakladCena;
  const slevaKc = cn ? cn.slevaKc : zaklad * podil;
  const cenaPoSleve = cn ? cn.cena : zaklad - slevaKc;
  const _dph = cenaSDph(cenaPoSleve, C.dph), dphKc = _dph.dphKc, celkemSDph = _dph.sDph;   // #14 krok 1
  const naklad = r.souhrn.zakladNaklad, hrubyZisk = cenaPoSleve - naklad;
  const marze = cenaPoSleve > 0 ? hrubyZisk / cenaPoSleve : 0;
  const kv = NAST.kpiViditelne || {};
  /* Ukazatele Náklad / Hrubý zisk / Marže řídí právo `kpi.marze` z matice
   * zobrazení (oprava 22. 8. 2026, hlášení J. V.: obchodník je v náhledu viděl,
   * protože se do té doby ptaly na `sloupce.naklad` — jiné právo, které má
   * obchodník kvůli přirážce položek). Zaškrtávátko u ukazatele je ruční
   * výjimka pro všechny („zviditelnit pro běžného uživatele") a smí ho jen
   * skutečný administrátor — ne kdokoli se sloupci nákladů. */
  const kpiAdmin = zobrazeniRole() === 'Administrátor';
  const vidKpi = k => kpiAdmin || smiZobrazit('kpi.marze') || kv[k];
  const kpiChk = k => kpiAdmin ? `<input type="checkbox" class="kpi-chk" ${kv[k] ? 'checked' : ''} onchange="kpiVidSet('${k}', this.checked)" title="zviditelnit pro běžného uživatele">` : '';
  const kpiLine = (k, label, val) => vidKpi(k)
    ? `<div class="kpi-line"><span class="kl">${label}${kpiChk(k)}</span><span class="kv">${val}</span></div>` : '';
  const pct = x => (Math.round(x * 1000) / 10).toLocaleString('cs-CZ') + ' %';
  const box3 = kpiLine('naklad', 'Náklad', fmt0(naklad)) + kpiLine('hrubyZisk', 'Hrubý zisk', fmt0(hrubyZisk));
  const box4 = kpiLine('sleva', 'Poskytnutá sleva', pct(podil)) + kpiLine('marze', 'Marže', pct(marze));
  /* Obchodní zaokrouhlení (#38) vidí každý – je to cena, ne náklad. Ukazuje se
   * jen když opravdu něco změnilo, jinak by hlavička nesla prázdný řádek. */
  const zaokrLine = (cn && cn.zaokrKc && typeof zaokrKc === 'function')
    ? `<div class="kpi-line"><span class="kl">Obchodní zaokrouhlení</span><span class="kv">${esc(zaokrKc(cn.zaokrKc))}</span></div>`
      + `<div class="kpi-line"><span class="kl">Cena nabídky bez DPH</span><span class="kv">${fmt0(cenaPoSleve)}</span></div>`
    : '';
  const hlava = `<div class="kalk-title">${ZAK.cislo ? `<span class="kt-cislo">${esc(ZAK.cislo)}</span>` : ''}${esc(ZAK.nazevAkce || 'Bez názvu akce')}</div>
  <div class="grand">
    <div class="kpi main"><div class="l">Základní cena bez DPH</div><div class="v">${fmt0(zaklad)}</div></div>
    <div class="kpi kpi-multi">
      ${zaokrLine}
      <div class="kpi-line"><span class="kl">DPH ${Math.round(C.dph * 100)} %</span><span class="kv">${fmt0(dphKc)}</span></div>
      <div class="kpi-line"><span class="kl">Celkem s DPH</span><span class="kv">${fmt0(celkemSDph)}</span></div>
    </div>
    ${box3 ? `<div class="kpi kpi-multi">${box3}</div>` : ''}
    ${box4 ? `<div class="kpi kpi-multi">${box4}</div>` : ''}
  </div>`;

  const thCena = col.admin ? 'Cena vč. přirážky' : 'Cena';
  const adminTh = (col.admin && col.spravce)
    ? '<th class="admincol" title="viditelné pro běžného uživatele">Viditelné</th>'
      + '<th class="admincol" title="výchozí stav položky v NOVÉ zakázce: u volitelných „rovnou v základní ceně", u ostatních „počítá se">Výchozí</th>'
    : '';
  const adminTd = '<td class="admincol"></td>'.repeat(col.adminExtra);
  const kalkulace = `<table>
    <tr><th>Položka</th><th>Množství</th>${col.admin ? '<th>Jedn. cena</th>' : ''}${col.showCost ? '<th>Náklad</th><th>Přirážka</th>' : ''}<th>${thCena}</th>${adminTh}</tr>
    ${tbl(r.sekce.hrubaOck, s.hrubaOck, 'HRUBÁ OCK', 'hrubaOck')}
    ${tbl(r.sekce.oplasteni, s.oplasteni, 'OPLÁŠTĚNÍ', 'oplasteni')}
    ${tblVolitelne(r.volitelneKatalog, s.volitelne)}
    ${tbl(r.sekce.rezie, s.rezie, 'REŽIE', 'rezie')}
    ${Z.rezervaZakladPct ? `<tr><td>REZERVA (${num(Z.rezervaZakladPct * 100)} %)</td><td></td>${col.admin ? '<td></td>' : ''}${col.showCost ? `<td>${fmt(r.rezerva.naklad)}</td><td>${fmt(r.rezerva.marze)}</td>` : ''}<td>${fmt(r.rezerva.sMarzi)}</td>${adminTd}</tr>` : ''}
    <tr class="tot"><td>CELKEM (zaokrouhleno ↑ na tisíce)</td><td></td>${col.admin ? '<td></td>' : ''}${col.showCost ? `<td>${fmt(r.souhrn.zakladNaklad)}</td><td>${fmt(r.souhrn.zakladMarze)}</td>` : ''}<td>${fmt0(r.souhrn.zakladCena)}</td>${adminTd}</tr>
  </table>
  ${col.admin ? `<div class="note">Řádky přetáhnete úchopem <b>⠿</b> vlevo (v rámci sekce).${col.spravce ? ` Zaškrtávátko <b>Viditelné</b> určuje,
  zda položku vidí běžný uživatel. Zaškrtávátko <b>Výchozí</b> platí pro <b>nové</b> zakázky, ne pro tuhle:
    u volitelné položky znamená „je rovnou v základní ceně", u ostatních „počítá se". Odškrtnutá položka
    se v každé nové kalkulaci vynechá; otevřená zakázka se tím nemění.` : ''} Název i jednotkovou cenu
  lze přepsat přímo v tabulce (cena s ceníkovou vazbou obousměrně s Ceníkem).</div>` : ''}`;

  const vynech = Z.priplatkyVynechat || [];
  const pripNazev = (x) => {
    const origJs = keyAttr(x.origNazev);
    if (x.vlastni) {
      const i = +String(x.key).split(':')[1];
      const pinP = (!x.kid && jeAdmin())
        ? ` <button class="mini noprint" title="uložit natrvalo do ceníku – bude ve všech nových nabídkách" onclick="priplatekDoCeniku(${i})">📌</button>` : '';
      const trv = x.kid ? ' <span class="pill ok" title="trvalá položka z ceníku">trvalá</span>' : '';
      return `<input type="text" class="nazev-ed" value="${esc(x.nazev)}" onchange="priplatekVlastniSet(${i}, 'nazev', this.value)" title="název příplatku">${trv}${pinP}
        <button class="mini noprint" title="smazat příplatek" onclick="priplatekVlastniDel(${i})">✕</button>`;
    }
    const reset = x.nazevPrepsan ? ` <button class="mini noprint" title="vrátit původní název" onclick="nazevReset('${origJs}')">↺</button>` : '';
    /* Klíč ceníkové položky i u příplatku (2. 9. 2026): řádky kalkulace ho mají
     * od 1. 9., příplatky na něj tehdy zapomněly — a přitom je to jediné místo,
     * kde je vidět, ze které ceníkové položky se cena bere. */
    return `<input type="text" class="nazev-ed" value="${esc(x.nazev)}" onchange="nazevSet('${origJs}', this.value)" title="název příplatku lze přepsat">${reset}${klicChip(x.cenaPath)}${vypnutoHtml(x)}`;
  };
  /* Množství u příplatku jde od 2. 9. 2026 PŘEPSAT (zadání J. V. po testu
   * Kornpfortstraße): předloha má u některých položek pod čarou nulu, aby se
   * nenabízely, a obchodník se se zákazníkem běžně domluví na jiném počtu.
   * Pole je stejné jako u řádků kalkulace (bunkaMnozstvi) včetně tlačítka ↺,
   * které vrátí vypočtené množství; prázdné pole = platí výpočet. */
  const pripMnozstvi = (x) => {
    if (x.vlastni)
      return `<input type="number" step="any" style="width:80px" value="${+(+x.mnozstvi).toFixed(3)}" onchange="priplatekVlastniSet(${+String(x.key).split(':')[1]}, 'mnozstvi', this.value)">`;
    const origJs = keyAttr(x.origNazev);
    return `<input type="number" step="any" style="width:80px" value="${+(+x.mnozstvi).toFixed(3)}" onchange="mnozstviSet('${origJs}', this.value)" title="množství lze ručně přepsat (prázdné = vypočtené)">`
      + (x.prepsano ? ` <button class="mini noprint" title="vrátit vypočtené množství (${num(x.mnozstviAuto, 3)})" onclick="mnozstviSet('${origJs}', '')">↺</button>` : '');
  };
  const pripCena = (x) => x.vlastni
    ? `<input type="number" step="any" style="width:96px" value="${+(+x.cena).toFixed(2)}" onchange="priplatekVlastniSet(${+String(x.key).split(':')[1]}, 'cena', this.value)">`
    : (x.cenaPath
        ? `<input type="number" step="any" style="width:96px" value="${+(+x.cena).toFixed(2)}" onchange="set('${escJs(x.cenaPath)}', +this.value)" title="jedn. cena z ceníku – propíše se i do Ceníku (obousměrně)">`
        : fmt(x.cena));
  const pripHlava = (col.admin ? '<th title="zaškrtnuté položky se propíší do cenové nabídky">Nabídka</th>' : '')
    + '<th>Položka</th><th>Množství</th>' + (col.admin ? '<th>Jedn. cena</th>' : '')
    + (col.showCost ? '<th>Náklad</th>' : '') + '<th>Cena vč. přirážky</th>'
    + ((col.admin && col.spravce)
      ? '<th class="admincol" title="viditelné pro běžného uživatele">Viditelné</th>'
        + '<th class="admincol" title="výchozí stav sloupce Nabídka v NOVÉ zakázce">Výchozí</th>' : '');
  /* Dodatkový text pod příplatkem (#267) — táž funkce jako u volitelných. */
  const popisRadek = (x, cols) => popisRadekHtml(x, cols);
  const pripRadek = (x) => {
    let c = '';
    if (col.admin) c += `<td style="text-align:center"><input type="checkbox" ${vynech.includes(x.key) ? '' : 'checked'}
        onchange="priplatekNabidka('${keyAttr(x.key)}', this.checked)" title="propsat do cenové nabídky"></td>`;
    c += `<td style="white-space:normal">${col.admin ? pripNazev(x) : esc(x.nazev) + vypnutoHtml(x)}</td>`;
    c += `<td style="white-space:nowrap">${col.admin ? pripMnozstvi(x) : num(x.mnozstvi, 3)}</td>`;
    if (col.admin) c += `<td style="white-space:nowrap">${pripCena(x)}</td>`;
    if (col.showCost) c += `<td>${fmt(x.naklad)}</td>`;
    c += `<td>${fmt0(x.sMarzi)}</td>`;
    if (col.spravce) {
      c += `<td class="admincol"><input type="checkbox" ${jeSkryta(x.key) ? '' : 'checked'} onchange="viditelnostSet('${keyAttr(x.key)}', this.checked)" title="viditelné pro běžného uživatele"></td>`;
      /* Sloupec Výchozí i u příplatků (21. 8. 2026 večer, zadání J. V.):
       * říká, jestli se příplatek v NOVÉ zakázce propíše do cenové nabídky
       * (sloupec Nabídka vlevo). Vlastní příplatek zakázky ho nemá — ten
       * v nové zakázce vůbec nevznikne. */
      c += `<td class="admincol">${x.vlastni ? ''
        : vychoziPolozkaChk(ZOBRAZENI_PRIPLATEK + x.key, true,
          'zaškrtnuto = příplatek jde v NOVÉ zakázce do cenové nabídky (platí pro všechny); '
          + 'otevřená zakázka se nemění')}</td>`;
    }
    const radek = `<tr class="${vypnutoTrida(x).trim()}">${c}</tr>`;
    return radek + popisRadek(x, pripCols);
  };
  /* Skryté položky vidí ten, kdo je umí odkrýt — tedy administrátor.
   * Vedoucímu s právem na náklady by jinak v tabulce svítily řádky, které
   * nemá jak vrátit zpátky a které v nabídce stejně nejsou. */
  const pripRows = col.spravce ? r.priplatky : r.priplatky.filter(x => !jeSkryta(x.key));
  const pripCols = (col.admin ? 1 : 0) + 2 + (col.admin ? 1 : 0) + (col.showCost ? 1 : 0) + 1 + col.adminExtra;
  const prip = `<table>
    <tr>${pripHlava}</tr>
    ${pripRows.map(pripRadek).join('')}
    ${priplatkyZakladniCena(r, col)}
    ${col.admin ? `<tr class="pridat noprint"><td colspan="${pripCols}">
      <button class="mini" title="vlastní příplatek jen této zakázky" onclick="priplatekVlastniAdd()">+ přidat položku</button></td></tr>` : ''}
    <tr class="tot"><td colspan="${pripCols - 1 - col.adminExtra}">PŘÍPLATKY CELKEM (pokud vše)</td><td>${fmt0(r.souhrn.priplatkyCena)}</td>${'<td class="admincol"></td>'.repeat(col.adminExtra)}</tr>
  </table>
  ${priplatkyVeVolitelnych(r)}
  <div class="note">Příplatkové položky jsou ceník variant pro zákazníka – do základní ceny se nezapočítávají.${col.admin ? `
  Název, množství i jedn. cenu lze přepsat (↺ vrátí vypočtené množství), tlačítkem lze přidat vlastní příplatek. Sloupec <b>Nabídka</b> určuje, které
  příplatky se propíší do generované cenové nabídky (sekce II.). Položky zvolené ve „Volitelné" se zde
  automaticky nenabízejí podruhé, aby nedošlo k dvojímu započtení.` : ''}</div>`;

  const det = `
    <table><tr class="subhead"><td colspan="4">Odvozené parametry</td></tr>
    <tr><td>Výška šachty</td><td>${num(o.vyskaSachty, 3)} m</td><td>Výška podlaží</td><td>${num(o.vyskaPodlazi, 3)} m</td></tr>
    <tr><td>Světlá výška nástupiště</td><td>${num(o.svetlaVyska, 3)} m</td><td>Výška prosklené části</td><td>${num(o.vyskaProsklene, 3)} m</td></tr>
    <tr><td>Šířka otvoru š. dveří</td><td>${num(o.sirkaDveri, 3)} m</td><td>Lešení věž / U-dokola</td><td>${num(o.leseniVez, 2)} m / ${num(o.leseniU, 2)} m²</td></tr>
    <tr class="subhead"><td colspan="4">Konstrukce</td></tr>
    <tr><td>Počet rámů</td><td>${esc(p.ramy)}</td><td>Portálové příčníky</td><td>${esc(p.portPricniky)}</td></tr>
    <tr><td>Spojky sloupků</td><td>${esc(p.spojky)}</td><td>Počet čílek (int)</td><td>${esc(p.pocetCilek)}</td></tr>
    <tr class="subhead"><td colspan="4">Materiál</td></tr>
    <tr><td>Profily celkem</td><td>${num(r.profily.celkemM, 2)} m · ${num(r.profily.celkemKg, 1)} kg</td>
        <td>Lemování ext</td><td>${num(r.profily.lemovani.m, 2)} m · ${num(r.profily.lemovani.kg, 1)} kg</td></tr>
    <tr><td>Konstrukční plechy</td><td>${esc(r.plechy.ks)} ks · ${num(r.plechy.kg, 1)} kg</td>
        <td>Terče / lišty</td><td>${esc(r.dily.terceKs)} ks / ${num(r.dily.listyBm, 1)} bm</td></tr>
    <tr><td>Oplechování dveří</td><td>${esc(r.dily.oplDvereKs)} ks · ${num(r.dily.oplDvereKg, 1)} kg</td>
        <td>Přechodové plechy</td><td>${esc(r.dily.prechKs)} ks · ${num(r.dily.prechKg, 1)} kg</td></tr>
    <tr class="subhead"><td colspan="4">Zasklení (rozměr skla ${num(r.zaskleni.rozmer.sir, 3)}×${num(r.zaskleni.rozmer.vys, 3)} m)</td></tr>
    <tr><td>Zadní stěna</td><td>${esc(r.zaskleni.zadni.ks)} ks · ${num(r.zaskleni.zadni.m2, 2)} m²</td>
        <td>Boční stěny</td><td>${esc(r.zaskleni.bocni.ks)} ks · ${num(r.zaskleni.bocni.m2, 2)} m²</td></tr>
    <tr><td>Světlíky</td><td>${esc(r.zaskleni.svetliky.ks + r.zaskleni.svetlikyBoky.ks)} ks · ${num(r.zaskleni.svetliky.m2 + r.zaskleni.svetlikyBoky.m2, 2)} m²</td>
        <td><b>Zasklení celkem</b></td><td><b>${num(r.zaskleni.celkemM2, 2)} m²</b></td></tr>
    <tr class="subhead"><td colspan="4">Práce</td></tr>
    <tr><td>Montáž – hodiny navíc</td><td>${num(r.montaz.hodinyNavicCelkem, 2)} h</td>
        <td>Montáž celkem (4 os.)</td><td>${num(r.montaz.hodCelkem, 1)} h · ${num(r.montaz.dni, 1)} dní</td></tr>
    <tr><td>Lakování – Tomáš</td><td>${fmt(r.lakovani.tomas)}</td><td>Lakování – lakovna</td><td>${fmt(r.lakovani.lakovna)}</td></tr>
    <tr><td>Spojovací materiál</td><td>${fmt(r.spojovaci.celkem)}</td><td>Nýtování</td><td>${esc(r.spojovaci.nytovaniKs)} ks</td></tr>
    </table>`;

  /* Souhrn (základní cena, DPH, náklad, marže) stojí NAD zadáním šachty —
   * rozvržení 3. 8. 2026: souhrn → zadání → dimenze → práce a režie →
   * cenová kalkulace, vše na plnou šířku jako v kalkulaci PROJ. */
  /* INTERNÍ POZNÁMKY STOJÍ HNED POD SOUHRNEM (zadání J. V. 22. 9. 2026).
   *
   * Do 22. 9. visely úplně dole, pod Detailem mezivýpočtů — obchodník k nim
   * musel projet celou kalkulaci a psal proto dál do e-mailu. Teď jsou tam,
   * kam se dívá jako první. Schválně do `kalk-souhrn`, ne do `inputs`:
   * `.inputs .card .body` skládá obsah vlastním gridem pro dvojice
   * popisek/pole a textové pole by se v něm zalomilo do sloupce.
   *
   * Táž karta se vykresluje i v Kalkulaci PROJ (kalk_proj.js) — je to jeden
   * zápisník zakázky, ne dva. */
  const kartaPoznamek = (typeof poznamkyKarta === 'function')
    ? kartaRezim('ock', 'poznamky', 'Interní poznámky k zakázce (netisknou se)',
                 poznamkyKarta('ock'), 'ock-poznamky')
    : '';
  const elSouhrn = document.getElementById('kalk-souhrn');
  if (elSouhrn) elSouhrn.innerHTML =
    (typeof standardRozpis === 'function' ? standardRozpis() : '')
    + `<div class="card"><div class="body">${hlava}${marzeLista({ cast: 'ock' })}</div></div>`
    + kartaPoznamek;
  document.getElementById('outputs').innerHTML =
    (elSouhrn ? '' : `<div class="card"><div class="body">${hlava}${marzeLista({ cast: 'ock' })}</div></div>`
      + kartaPoznamek) +
    kartaRezim('ock', 'kalkulace', 'Cenová kalkulace', kalkulace, 'ock-kalkulace') +
    /* Obě karty mají od 20. 8. 2026 režim sekce (zobrazit/skrýt/srolovat)
     * stejně jako sekce v tabulce kalkulace — dřív ho neměly, ačkoli je
     * obchodník vidí jako úplně stejné bloky. */
    kartaRezim('ock', 'priplatky', 'Příplatkové položky (ceník variant)', prip, 'ock-priplatky') +
    sirotciKarta(r) +
    (col.admin ? kartaRezim('ock', 'detailMezivypoctu', 'Detail mezivýpočtů', det, 'ock-detail') : '');
}

function zkontrolujTl(key) {
  const p = Z.profily[key], tls = Object.keys(JEKLY[p.dim].kg);
  if (!tls.includes(String(p.tl))) p.tl = +tls[Math.floor(tls.length / 2)];
  render();
}
