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
        /* K6-K4: do záznamu tisku SoD otisk objednaných a cena díla (dotisk
         * nese stav posledního tisku, viz sodObjednaneSymboly). */
        const navic = (typ === 'sod' && typeof objSodSnimek === 'function')
          ? { sod: objSodSnimek(ZAK, varianta, JEKLY, L, objSodZaznam(varianta)) } : null;
        const z = zamekPoTisku(typ, varianta.id, sablonaInfo, navic);   // plnou moc přeskočí sám
        if (z) zamcenoText = ' Varianta ' + (z.cislo || '') + ' je nyní uzamčená; pokračujte jejím klonem.';
      }
      const upoz = sodUpozorneniText(res);
      if (upoz) hlaska(upoz, { nadpis: 'Smlouva o dílo' });
      sodStavText(typ, (upoz ? '⚠ ' + upoz + ' ' : '') + 'Hotovo – soubor ' + res.nazevSouboru + '.docx je ve Stažených. '
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

/* Upozornění builderu SoD (K6-K2: šablona bez rozpisu objednaných) jednou větou, nebo ''. */
function sodUpozorneniText(res) {
  const u = res && res.data && Array.isArray(res.data.upozorneni) ? res.data.upozorneni : [];
  return Array.from(new Set(u)).join(' ');
}

/* ---------- objednané příplatky (#447 C6, rozhodnutí J. V. 21. 10. 2026) ----------
 * Obchodník při vystavení SoD zaškrtne, které příplatky z odeslané nabídky
 * zákazník objednal. Zapisuje se do zakázky (ZAK.objednane, src/objednane.js),
 * NE do zamčené varianty — odeslaná nabídka se nemění. Server hlídá, že jde
 * o nabídnutý příplatek a že po podpisu SoD (datum podpisu v krycím listu ≤ dnes)
 * mění jen administrátor. */
function objUiVarianta() { return (typeof ZAK !== 'undefined' && ZAK) ? aktivniVarianta(ZAK) : null; }
function objUiSmi(v) {
  if (!v || !v.zamek || !v.zamek.zamceno) return false;
  const admin = typeof jeAdmin === 'function' && jeAdmin();
  return admin || !objPodepsano(v);
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
/* Přepnutí položky (klíč nebo dvojice klíčů — přechodové plechy jdou jen
 * celé, K6-K3). Záznam patří k jiné zamčené variantě → nejdřív potvrzení
 * (K6-K5, rozhodnutí J. V. 22. 10. 2026); bez něj se nic nemění. */
async function objUiPrepni(klic, zap) {
  const o = objStav(ZAK);
  const v = objUiVarianta();
  if (o && v && o.varianta !== v.id) {
    const jina = (ZAK.varianty || []).find(x => x && x.id === o.varianta);
    const cislo = jina ? variantaCislo(ZAK, jina) : String(o.varianta || '');
    if (!await potvrd(objUiNahraditText(cislo), { nadpis: 'Objednané příplatky' })) { render(); return false; }
  }
  const klice = (o && v && o.varianta === v.id) ? o.klice.slice() : [];
  const sada = Array.isArray(klic) ? klic : [klic];
  sada.forEach(k => {
    const i = klice.indexOf(k);
    if (zap && i < 0) klice.push(k);
    if (!zap && i >= 0) klice.splice(i, 1);
  });
  objUiUloz(klice, o && o.varianta === (v && v.id) ? o.datum : '');
  return true;
}
function objUiNahraditText(cislo) {
  return 'Objednané příplatky varianty ' + cislo + ' budou nahrazeny objednanými příplatky této varianty. '
    + 'Zakázka nese objednané příplatky jen jedné odeslané nabídky.';
}
function objUiDatum(datum) {
  const o = objStav(ZAK);
  if (!o) return;
  objUiUloz(o.klice, datum);
}
/* Měna karty = měna smlouvy (K6-K9): jazyk tisku ≠ česky → eura kurzem
 * odeslané nabídky, celá eura nahoru po položkách (menaDokumentu, jako SoD). */
function objUiMena(v) {
  const L = (typeof sodJazyk === 'function') ? sodJazyk('sod') : 'cz';
  const kurz = (typeof kurzEurZ === 'function') ? kurzEurZ(v, v && v.data && v.data.cenik && v.data.cenik.kurzEurKc) : 0;
  try { return Object.assign({ chyba: '' }, menaDokumentu(L, kurz)); }
  catch (e) { return { eur: true, chyba: 'chybí kurz EUR', na: n => n, fmt: () => '€ —' }; }
}
function objKarta() {
  const v = objUiVarianta();
  if (!v) return '';
  if (!v.zamek || !v.zamek.zamceno) return `<div class="note" id="objKarta">Objednané příplatky jde zaznamenat až
      k <b>odeslané (zamčené)</b> nabídce.</div>`;
  const jekly = typeof JEKLY !== 'undefined' ? JEKLY : null;
  const nab = objPolozky(objNabidnute(v, jekly));
  if (!nab.length) return `<div class="note" id="objKarta">Odeslaná nabídka žádné příplatky nenabízela.</div>`;
  const o = objStav(ZAK);
  const moje = o && o.varianta === v.id ? o : null;
  const smi = objUiSmi(v);
  const dis = smi ? '' : ' disabled';
  const mena = objUiMena(v);
  const cena = p => mena.chyba ? `€ — (${esc(mena.chyba)})` : esc(mena.fmt(mena.na(p.sMarzi)));
  const jsKlic = p => p.klice.length > 1 ? `[${p.klice.map(k => `'${escJs(k)}'`).join(',')}]` : `'${escJs(p.key)}'`;
  const radky = nab.map(p => `<label style="display:flex;gap:6px;align-items:center" data-obj-klic="${esc(p.key)}">
      <input type="checkbox"${dis} ${moje && p.klice.every(k => moje.klice.includes(k)) ? 'checked' : ''}
        onchange="objUiPrepni(${jsKlic(p)}, this.checked)"> ${esc(p.nazev)}
      <span class="note">${cena(p)} bez DPH</span></label>`).join('');
  const jina = o && !moje ? (ZAK.varianty || []).find(x => x && x.id === o.varianta) : null;
  const sod = typeof objZmenenoPoSod === 'function' ? objZmenenoPoSod(ZAK, v) : null;
  const zm = Array.isArray(ZAK.objednaneZmeny) ? ZAK.objednaneZmeny[ZAK.objednaneZmeny.length - 1] : null;
  return `<div id="objKarta" style="margin:10px 0;padding:8px 10px;border:1px solid var(--line);border-radius:8px">
      <div class="sec-title">Objednané příplatky</div>
      <div class="note">Zaškrtněte příplatky z odeslané nabídky, které zákazník <b>objednal</b> — <b>před tiskem smlouvy</b>
        (smlouva i její dotisk nesou objednané z tisku). Nabídka se tím nemění; objednané příplatky jdou do krycího listu
        a do exportu pro controlling. Ceny jsou v měně smlouvy (jazyk tisku).
        ${smi ? '' : '<b>Smlouva o dílo je podepsaná (datum podpisu v krycím listu výše) — měnit smí jen administrátor.</b>'}</div>
      ${jina ? `<div class="note obj-jina">Zakázka nese objednané příplatky varianty ${esc(variantaCislo(ZAK, jina))} — zaškrtnutím
        je nahradíte (aplikace se zeptá).</div>` : ''}
      ${sod ? `<div class="note obj-po-sod" style="color:#b45309">⚠ Objednané se od tisku smlouvy o dílo změnily${zm
        ? ` (${esc(zm.kdo || '')}, ${esc(String(zm.kdy || '').slice(0, 10))})` : ''} — smlouva i její dotisk nesou cenu díla
        z tisku${sod.mena && sod.bezDph != null ? ` (${esc(sod.mena === 'EUR' ? '€ ' + Math.round(sod.bezDph).toLocaleString('cs-CZ') : fmt0(sod.bezDph))} bez DPH)` : ''}.</div>` : ''}
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
      nemůže rozejít. <b>Objednané příplatky</b> (níž) se k ceně díla přičtou v ceně z nabídky (bez slevy);
      DPH se počítá z celku. <b>Zástupci a kontakty zákazníka</b> i bankovní údaje se od 20. 8. 2026 berou z krycího
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

/* ---------- PRODÁNO (#540, rozhodnutí J. V. 27. 10. 2026) ----------
 * Karta na konci krycího listu OCK i PROJ. „Prodáno" u odeslané (zamčené)
 * varianty zapíše datum prodeje a prodanou variantu (controlling bere prodej
 * odsud), definitivně zamkne krycí list i hlavičku a připraví zápis do
 * Pipedrive (deal → Vyhráno + data krycího listu). Napojení na Pipedrive
 * zatím není (#510) — zápis se jen uloží jako „čeká na odeslání" a karta
 * ukáže, co by se zapsalo. Odemknout smí vedoucí a administrátor s důvodem.
 * Pravidla i razítka drží server (src/objednane.js prodServer). */
function prodUiRole() {
  return (typeof ONLINE_STAV !== 'undefined' && ONLINE_STAV.ja && ONLINE_STAV.ja.role) ? String(ONLINE_STAV.ja.role) : '';
}
function prodUiSmiOdemknout() { return PROD_ROLE_ODEMKNOUT.includes(prodUiRole()); }
function prodUiDatumText(d) {
  return objDatumPlatne(d) ? d.split('-').reverse().map(x => String(+x)).join('. ') : String(d || '');
}
function prodUiNahledHtml(v) {
  const z = prodPdZapis(ZAK, v, typeof JEKLY !== 'undefined' ? JEKLY : null);
  if (!z) return '';
  const kc = n => (typeof fmtKc === 'function') ? fmtKc(n) : (Math.round(n).toLocaleString('cs-CZ') + ' Kč');
  const radky = [['Deal Pipedrive', z.dealId ? z.dealId : 'zakázka zatím nemá deal id — doplní správce (Nastavení → Controlling)'],
    ['Stav dealu', z.stavDealuText], ['Prodaná varianta', z.varianta], ['Datum prodeje', prodUiDatumText(z.datumProdeje)]]
    .concat(z.hodnota.map(h => ['Hodnota ' + h.oblast + ' bez DPH', kc(h.bezDphKc)]));
  const kryci = z.kryci.map(k => `<div class="note" style="font-weight:600;margin-top:6px">Krycí list ${esc(k.list)} (Backoffice)</div>
    <table class="tbl" style="font-size:11px">${k.sekce.map(s => `<tr><th colspan="2" style="text-align:left">${esc(s.sekce)}</th></tr>`
      + s.radky.map(r => `<tr><td>${esc(r[0])}</td><td>${esc(r[1])}</td></tr>`).join('')).join('')}</table>`).join('');
  return `<details class="prod-nahled" style="margin-top:6px"><summary>Co by se zapsalo do Pipedrive</summary>
    <table class="tbl" style="font-size:11px">${radky.map(r => `<tr><td>${esc(r[0])}</td><td>${esc(r[1])}</td></tr>`).join('')}</table>
    ${kryci}
    <div class="note">Převod na pole Pipedrive udělá až zápis po zapnutí napojení; prázdná pole se nezapisují.</div></details>`;
}
function prodejKarta(strana) {
  if (typeof ZAK === 'undefined' || !ZAK) return '';
  const v = aktivniVarianta(ZAK);
  if (!v) return '';
  const p = prodStav(ZAK);
  const historie = Array.isArray(ZAK.prodejHistorie) ? ZAK.prodejHistorie : [];
  const stopa = historie.length ? `<details style="margin-top:6px"><summary>Historie prodeje (${historie.length})</summary>
    <ul class="note">${historie.slice().reverse().map(h => `<li>${h.akce === 'prodano' ? 'Prodáno' : 'Odemčeno'}
      ${esc(h.cislo || '')} ${h.datum ? '(' + esc(prodUiDatumText(h.datum)) + ')' : ''} — ${esc(h.kdo || '')}, ${esc(String(h.kdy || '').slice(0, 10))}
      ${h.duvod ? ' — důvod: ' + esc(h.duvod) : ''}</li>`).join('')}</ul></details>` : '';
  if (p && p.v.id === v.id) {
    const pd = prodPdStavText(p.prodano) || 'čeká na odeslání';
    return `<div id="prodejKarta_${esc(strana)}" class="prod-karta">
      <div><span class="pill" style="background:#86e8ad;color:#0B2E6B">✔ Prodáno ${esc(prodUiDatumText(p.prodano.datum))}</span>
        <span class="note">${esc(p.prodano.kdo || '')}</span></div>
      <div class="note">Krycí list i hlavička zakázky jsou <b>definitivně zamčené</b>. Zápis do Pipedrive (deal → Vyhráno
        a data krycího listu): <b>${esc(pd)}</b> — napojení na Pipedrive zatím není zapnuté, nic se neodeslalo.</div>
      ${prodUiNahledHtml(v)}
      ${prodUiSmiOdemknout() ? `<div class="btns" style="margin-top:6px"><button class="mini" onclick="prodejUiOdemkni()">Odemknout prodej</button></div>`
        : '<div class="note">Odemknout prodej smí vedoucí nebo administrátor.</div>'}
      ${stopa}</div>`;
  }
  const proc = prodNelzeProdat(ZAK, v);
  const dnes = objDnes();
  return `<div id="prodejKarta_${esc(strana)}" class="prod-karta">
    <div class="note">Až zákazník nabídku přijme, stiskněte <b>Prodáno</b>: zapíše se datum prodeje a prodaná varianta
      (podle nich bere zakázku controlling), krycí list se <b>definitivně zamkne</b> a připraví se zápis do Pipedrive
      (deal → Vyhráno a data krycího listu). Odemknout smí jen vedoucí nebo administrátor.</div>
    ${proc ? `<div class="note"><b>${esc(proc)}</b></div>` : ''}
    <div class="btns" style="margin-top:6px">
      <label class="note">Datum prodeje <input type="date" id="prodejDatum_${esc(strana)}" value="${esc(dnes)}" max="${esc(dnes)}"${proc ? ' disabled' : ''}></label>
      <button class="primary" ${proc ? 'disabled title="' + esc(proc) + '"' : ''} onclick="prodejUiProdej('${escJs(strana)}')">Prodáno</button>
    </div>
    ${proc ? '' : prodUiNahledHtml(v)}
    ${stopa}</div>`;
}
async function prodejUiProdej(strana) {
  const v = aktivniVarianta(ZAK);
  if (typeof nahledStop === 'function' && nahledStop('zápis prodeje')) return;
  const el = document.getElementById('prodejDatum_' + strana);
  const datum = el && el.value ? el.value : objDnes();
  const proc = prodNelzeProdat(ZAK, v);
  if (proc) { hlaska(proc); return; }
  if (!await potvrd('Označit variantu ' + variantaCislo(ZAK, v) + ' jako PRODANOU k ' + prodUiDatumText(datum) + '?\n\n'
    + '– krycí list i hlavička zakázky se definitivně zamknou (odemknout smí jen vedoucí nebo administrátor),\n'
    + '– controlling vezme zakázku jako prodanou k tomuto datu,\n'
    + '– připraví se zápis do Pipedrive (deal → Vyhráno a data krycího listu); napojení zatím není zapnuté, '
    + 'zápis se jen uloží jako „čeká na odeslání".', { nadpis: 'Prodáno' })) return;
  const ja = (typeof ONLINE_STAV !== 'undefined' && ONLINE_STAV.ja) ? ONLINE_STAV.ja.email : '';
  const chyba = prodNastav(ZAK, v, datum, { kdo: ja });
  if (chyba) { hlaska(chyba); return; }
  if (typeof onlineZmenaUzivatele === 'function') onlineZmenaUzivatele({});
  const ok = typeof zakUlozUI === 'function' ? await zakUlozUI() : true;
  if (ok === false) {
    delete v.prodano;
    hlaska('Prodej se neuložil' + (typeof ONLINE_STAV !== 'undefined' && ONLINE_STAV.hlaska ? ': ' + ONLINE_STAV.hlaska : '.')
      + '\n\nZakázka zůstává neprodaná.');
  }
  render();
}
async function prodejUiOdemkni() {
  const p = prodStav(ZAK);
  if (!p) return;
  if (!prodUiSmiOdemknout()) { hlaska('Odemknout prodej smí vedoucí nebo administrátor.'); return; }
  if (typeof nahledStop === 'function' && nahledStop('odemčení prodeje')) return;
  const duvod = await dotaz('Odemčení prodeje varianty ' + variantaCislo(ZAK, p.v)
    + '.\n\nUveďte důvod (uloží se do historie zakázky):', '');
  if (duvod === null) return;
  const zaloha = JSON.parse(JSON.stringify(p.prodano));
  const chyba = prodOdemkni(ZAK, p.v, duvod);
  if (chyba) { hlaska(chyba); return; }
  if (typeof onlineZmenaUzivatele === 'function') onlineZmenaUzivatele({});
  const ok = typeof zakUlozUI === 'function' ? await zakUlozUI() : true;
  if (ok === false) {
    p.v.prodano = zaloha; delete ZAK.prodejOdemknout;
    hlaska('Odemčení prodeje se neuložilo' + (typeof ONLINE_STAV !== 'undefined' && ONLINE_STAV.hlaska ? ': ' + ONLINE_STAV.hlaska : '.'));
  }
  render();
}
