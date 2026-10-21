/* ============================================================
 * SMLOUVY O DÍLO A PLNÁ MOC – UI (#143, 15. 8. 2026)
 *
 * Jedna společná obsluha pro tři dokumenty: SoD realizace (typ `sod`,
 * karta v Kalkulaci OCK), SoD projekčních prací (`sodProj`) a plná moc
 * (`plnaMoc`, obojí v Kalkulaci PROJ). Cesta k souboru je stejná jako
 * u nabídek: napřed platná centrální šablona ze serveru (#139), místní
 * soubor jen v měkkém režimu nebo bez přihlášení; generuje jednotný
 * registr dokumentů (dokumenty.js), zamyká zamekPoTisku — plnou moc
 * zámek sám přeskočí (ZAMEK_DOKUMENTY: plnaMoc nezamyká).
 *
 * Ceny ve smlouvě jsou VŽDY ceny nabídky — buildery v sod.js jsou obálky
 * nad nabidkaData/nabidkaProjData, žádný druhý výpočet neexistuje.
 * Symboly, které aplikace nezná (SOD_*, SODP_*, PM_*, OBJEDNATEL_*),
 * zůstávají v dokumentu viditelné jako {{…}} a doplní se ve Wordu.
 * ============================================================ */

/* místní šablony pro relaci – jen nouzová cesta (měkký režim / bez serveru) */
const SOD_DOCX = {};   // { typ: {nazev, data:ArrayBuffer} }

/* Stavový řádek každého typu zvlášť (třídou, ne id – karta OCK je v aplikaci
 * dvakrát: Kalkulace OCK i Přehled cenových nabídek, stejně jako u nabídky). */
function sodStavText(typ, txt) {
  document.querySelectorAll('.sodStav_' + typ).forEach(e => { e.textContent = txt; });
}

/* Plná moc je jednojazyčný úřední dokument pro ČESKÉ úřady – volba jazyka
 * tisku se na ni nevztahuje; smlouvy jazyk tisku respektují (mutace šablony).
 * Od #157 (17. 10. 2026) má karta smlouvy vlastní výběr „Jazyk tisku" (týž
 * jako u nabídek) a smlouva v cizím jazyce bez jazykové šablony nevznikne
 * (sodJazykZabrana) — český právní text s anglickými hodnotami nejde podepsat. */
function sodJazyk(typ) {
  if (typ === 'plnaMoc') return 'cz';
  return (typeof tiskJazyk === 'function') ? tiskJazyk()
    : ((typeof jazyk === 'function') ? jazyk() : 'cz');
}

function sodWord(typ) {
  const L = sodJazyk(typ);
  sablonaProTisk(typ, L).then(srv => {
    const zabrana = (typeof sodJazykZabrana === 'function' && srv) ? sodJazykZabrana(typ, L, !srv.mutaceChybi) : '';
    if (zabrana) { sodStavText(typ, 'Chyba: ' + zabrana); return; }
    if (srv) { sodWordGeneruj(typ, srv); return; }
    /* místní cesta (měkký režim / bez serveru): jazyková šablona z Nastavení */
    if (L !== 'cz' && typeof sodJazykZabrana === 'function') {
      const z = sodJazykZabrana(typ, L, typeof SABLONY !== 'undefined' && !!SABLONY[typ + '_' + L]);
      if (z) { sodStavText(typ, 'Chyba: ' + z); return; }
    }
    // místní cesta – přednost má šablona nahraná v Nastavení → Šablony (SET-6)
    if (typeof SABLONY !== 'undefined' && SABLONY[typ]) SOD_DOCX[typ] = SABLONY[typ];
    if (SOD_DOCX[typ]) { sodWordGeneruj(typ, null); return; }
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = '.docx';
    inp.onchange = () => {
      const f = inp.files[0]; if (!f) return;
      f.arrayBuffer().then(buf => {
        SOD_DOCX[typ] = { nazev: f.name, data: buf };
        if (typeof SABLONY !== 'undefined') SABLONY[typ] = SOD_DOCX[typ];   // zapamatuj pro další generování
        sodWordGeneruj(typ, null);
      });
    };
    inp.click();
  }).catch(err => sodStavText(typ, 'Chyba: ' + err.message));
}

async function sodWordGeneruj(typ, srv) {
  const L = sodJazyk(typ);
  const mutace = (!srv && L !== 'cz' && typeof SABLONY !== 'undefined') ? SABLONY[typ + '_' + L] : null;
  const sablona = srv ? srv.data : (mutace ? mutace.data : SOD_DOCX[typ].data);
  const mutaceChybi = srv ? srv.mutaceChybi : (L !== 'cz' && !mutace);
  /* Razítko šablony do zámku varianty (#139) – u smlouvy je doložitelnost
   * ještě důležitější než u nabídky: podepisuje se. */
  const sablonaInfo = srv
    ? { zdroj: 'server', typ: srv.typ, verze: srv.verze, otisk: srv.otisk, nazev: srv.nazev }
    : { zdroj: 'mistni', nazev: (mutace || SOD_DOCX[typ]).nazev || '' };
  const popis = (typeof dokumentPopis === 'function' && dokumentPopis(typ)) || typ;
  sodStavText(typ, 'Vyplňuji šablonu…' + (L !== 'cz' ? ' (' + L.toUpperCase() + ')' : '')
    + (srv ? ' [serverová verze ' + srv.verze + ']' : ''));
  /* Stejná otázka „otevřená, nebo řídící varianta?" jako u nabídek – smlouva
   * se nikdy nesmí vytisknout z jiné varianty, než jakou má obchodník před
   * sebou (a jakou nese odeslaná nabídka). */
  const varianta = (typeof nabidkaVarianta === 'function')
    ? await nabidkaVarianta()
    : ((typeof aktivniVarianta === 'function') ? aktivniVarianta(ZAK) : (ZAK.varianty || [])[0]);
  /* Zábrany (#377, plán plateb) — hláška dřív než chyba z registru. */
  if (typeof dokumentZabranaHlas === 'function' && dokumentZabranaHlas(typ, varianta, t => sodStavText(typ, t))) return;
  if (typeof tiskZamekCteniPovol === 'function' && !(await tiskZamekCteniPovol(typ, varianta))) { sodStavText(typ, 'Dokument nevznikl — nabídka je otevřená jen ke čtení.'); return; }   // P2 (K13-N54)
  dokumentVygeneruj(typ, sablona.slice(0), ZAK, varianta, JEKLY, L)
    .then(res => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(res.blob);
      a.download = res.nazevSouboru + '.docx';
      a.click();
      let zamcenoText = '';
      if (typeof zamekPoTisku === 'function') {
        const z = zamekPoTisku(typ, varianta.id, sablonaInfo);   // plnou moc přeskočí sám
        if (z) zamcenoText = ' Varianta ' + (z.cislo || '') + ' je nyní uzamčená; pokračujte jejím klonem.';
      }
      sodStavText(typ, 'Hotovo – soubor ' + res.nazevSouboru + '.docx je ve Stažených. '
        + 'Žlutě značené symboly {{…}} (termíny, splátky, zástupci objednatele) doplňte ve Wordu.'
        + (srv ? ' Použita centrální šablona (verze ' + srv.verze + ').'
               : (sablonyOnlineAktivni() ? ' POZOR: použita MÍSTNÍ šablona (měkký režim) – do zámku se to zapsalo.' : ''))
        + (mutaceChybi ? ' Pozor: pevný text šablony zůstal český – jazykovou mutaci šablony '
          + 'zveřejní administrátor v Nastavení → Šablony.' : '')
        + (srv && srv.mutaceZastarala ? ' POZOR: ' + srv.mutaceZastarala : '')
        + zamcenoText);
    })
    .catch(err => {
      /* Zahodit schválně – nejčastější příčina je vybraný špatný soubor;
       * kdyby zůstal v paměti, nešlo by vybrat jiný. */
      delete SOD_DOCX[typ];
      sodStavText(typ, 'Chyba: ' + err.message);
    });
}

/* ---------- objednané příplatky (#447 C6, rozhodnutí J. V. 21. 10. 2026) ----------
 * Obchodník při vystavení SoD zaškrtne, které příplatky z odeslané nabídky
 * zákazník objednal. Zapisuje se do zakázky (ZAK.objednane, src/objednane.js),
 * NE do zamčené varianty — odeslaná nabídka se nemění. Server hlídá, že jde
 * o nabídnutý příplatek a že po vytištěné SoD mění jen administrátor. */
function objUiVarianta() { return (typeof ZAK !== 'undefined' && ZAK) ? aktivniVarianta(ZAK) : null; }
function objUiSmi(v) {
  if (!v || !v.zamek || !v.zamek.zamceno) return false;
  const admin = typeof jeAdmin === 'function' && jeAdmin();
  return admin || !objSodVytistena(v);
}
function objUiUloz(klice, datum) {
  const v = objUiVarianta();
  if (!objUiSmi(v)) return;
  const kopie = JSON.parse(JSON.stringify(ZAK));
  const ja = (typeof ONLINE_STAV !== 'undefined' && ONLINE_STAV.ja) ? ONLINE_STAV.ja.email : '';
  const chyba = objNastav(kopie, v, klice, datum, { kdo: ja });
  if (chyba) { hlaska(chyba); return; }
  set('ZAK.objednane', kopie.objednane || null);
}
function objUiPrepni(klic, zap) {
  const o = objStav(ZAK);
  const v = objUiVarianta();
  const klice = (o && v && o.varianta === v.id) ? o.klice.slice() : [];
  const i = klice.indexOf(klic);
  if (zap && i < 0) klice.push(klic);
  if (!zap && i >= 0) klice.splice(i, 1);
  objUiUloz(klice, o && o.datum);
}
function objUiDatum(datum) {
  const o = objStav(ZAK);
  if (!o) return;
  objUiUloz(o.klice, datum);
}
function objKarta() {
  const v = objUiVarianta();
  if (!v) return '';
  if (!v.zamek || !v.zamek.zamceno) return `<div class="note" id="objKarta">Objednané příplatky jde zaznamenat až
      k <b>odeslané (zamčené)</b> nabídce.</div>`;
  const jekly = typeof JEKLY !== 'undefined' ? JEKLY : null;
  const nab = objNabidnute(v, jekly);
  if (!nab.length) return `<div class="note" id="objKarta">Odeslaná nabídka žádné příplatky nenabízela.</div>`;
  const o = objStav(ZAK);
  const moje = o && o.varianta === v.id ? o : null;
  const smi = objUiSmi(v);
  const dis = smi ? '' : ' disabled';
  const radky = nab.map(p => `<label style="display:flex;gap:6px;align-items:center" data-obj-klic="${esc(p.key)}">
      <input type="checkbox"${dis} ${moje && moje.klice.includes(p.key) ? 'checked' : ''}
        onchange="objUiPrepni('${escJs(p.key)}', this.checked)"> ${esc(p.nazev)}
      <span class="note">${fmt0(p.sMarzi)} Kč bez DPH</span></label>`).join('');
  return `<div id="objKarta" style="margin:10px 0;padding:8px 10px;border:1px solid var(--line);border-radius:8px">
      <div class="sec-title">Objednané příplatky</div>
      <div class="note">Zaškrtněte příplatky z odeslané nabídky, které zákazník <b>objednal</b>. Nabídka se tím
        nemění; objednané příplatky jdou do krycího listu a do exportu pro controlling.
        ${smi ? '' : '<b>Smlouva o dílo už je vytištěná — měnit smí jen administrátor.</b>'}</div>
      ${radky}
      ${moje ? `<label style="margin-top:6px;display:inline-flex;gap:6px;align-items:center">Datum prodeje (podpisu SoD)
        <input type="date" id="objDatum"${dis} value="${esc(moje.datum || '')}" onchange="objUiDatum(this.value)"></label>` : ''}
    </div>`;
}

/* ---------- karta v Kalkulaci OCK: smlouva o dílo — realizace ---------- */
function sodKarta() {
  const zab = (typeof ukazkoveZabranaAttr === 'function') ? ukazkoveZabranaAttr('sod') : '';   // #377
  return `<div class="note" style="font-weight:600;margin-top:14px">Smlouva o dílo — realizace (Word):</div>
    <div class="note">Smlouva se plní <b>stejnými daty jako cenová nabídka</b> (hlavička zakázky, cena bez DPH,
      platební podmínky z krycího listu, firemní údaje) – cenu si nikdy nepočítá sama, takže se s nabídkou
      nemůže rozejít. <b>Zástupci a kontakty zákazníka</b> i bankovní údaje se od 20. 8. 2026 berou z krycího
      listu výše. Co aplikace nezná – <b>termíny, splátkový kalendář, číslo smlouvy</b> – zůstane
      v dokumentu viditelně jako <code>{{SOD_…}}</code> a doplní se ve Wordu.
      Vytištěná smlouva variantu <b>uzamkne</b> stejně jako odeslaná nabídka.</div>
    ${objKarta()}
    <div class="btns" style="margin-top:6px">
      <button class="primary"${zab} onclick="sodWord('sod')">Vytvořit smlouvu o dílo (Word)</button>
      ${typeof tiskJazykVyber === 'function' ? tiskJazykVyber() : ''}
    </div>
    ${sodDphZabranaNote()}
    <div class="note">Anglická smlouva (Jazyk tisku „anglicky") vzniká z anglické šablony smlouvy (překlad české,
      Nastavení → Šablony → EN) s cenou v eurech; bez ní aplikace smlouvu v angličtině nevytvoří.</div>
    <div class="note sodStav_sod" style="margin-top:4px"></div>`;
}

/* B189 (19. 10. 2026): bez zvoleného režimu DPH (zákazník s cizím DIČ)
 * svítí pod tlačítkem důvod a odkaz přímo na volbu v krycím listu výše. */
function sodDphZabranaNote() {
  if (typeof sodDphZabrana !== 'function' || typeof ZAK === 'undefined') return '';
  let duvod = '';
  try { duvod = sodDphZabrana(ZAK, aktivniVarianta(ZAK)); } catch (e) { duvod = ''; }
  if (!duvod) return '';
  return `<div class="note sod-dph-zabrana" style="color:#b91c1c;font-weight:600;margin-top:4px">⛔ ${esc(duvod)}
    <button class="mini noprint" onclick="sodDphNaVolbu()">Přejít na volbu režimu DPH</button></div>`;
}
function sodDphNaVolbu() {
  const el = document.querySelector('select[onchange^="klVyber(\'sodDphRezim\'"]');
  if (!el) return;
  if (typeof el.scrollIntoView === 'function') el.scrollIntoView({ block: 'center' });
  el.focus();
}

/* ---------- karta v Kalkulaci PROJ: SoD projekce + plná moc ---------- */
function sodProjKarta() {
  /* #377: SoD PROJ hlídá zábrany projekce, plná moc jen prázdný ceník. */
  const zab = (typeof ukazkoveZabranaAttr === 'function') ? ukazkoveZabranaAttr('sodProj') : '';
  const zabPm = (typeof ukazkoveZabranaAttr === 'function') ? ukazkoveZabranaAttr('plnaMoc') : '';
  return `<div class="note" style="font-weight:600;margin-top:14px">Smlouva o dílo a plná moc (Word):</div>
    <div class="note">Smlouva o dílo na projekční práce nese <b>cenu z nabídky PROJ</b> (číslo nabídky, celkem
      bez DPH, podmínky z krycího listu PROJ). Symboly <code>{{SODP_…}}</code> (platby po fázích, termíny
      odevzdání) se doplňují ve Wordu; vytištěná smlouva variantu <b>uzamkne</b>.
      <b>Plná moc</b> je administrativa k objektu – nese firemní údaje zmocněnce a adresu stavby (z hlavičky
      PROJ, případně OCK); údaje zmocnitele <code>{{PM_…}}</code> se doplní ručně a varianta se <b>nezamyká</b>.</div>
    <div class="btns" style="margin-top:6px">
      <button class="primary"${zab} onclick="sodWord('sodProj')">Vytvořit smlouvu o dílo PROJ (Word)</button>
      <button class="primary"${zabPm} onclick="sodWord('plnaMoc')">Vytvořit plnou moc (Word)</button>
      ${typeof tiskJazykVyber === 'function' ? tiskJazykVyber() : ''}
    </div>
    <div class="note">Jazyk tisku platí pro smlouvu (anglicky jen s anglickou šablonou smlouvy PROJ, cena v eurech);
      plná moc je vždy česky.</div>
    <div class="note sodStav_sodProj" style="margin-top:4px"></div>
    <div class="note sodStav_plnaMoc"></div>`;
}
