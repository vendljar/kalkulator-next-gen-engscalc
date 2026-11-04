/* ============================================================
 * INTERNÍ POZNÁMKY – obrazovka (#37, zjednodušeno 22. 9. 2026)
 *
 * Karta stojí v Kalkulaci OCK i v Kalkulaci PROJ, hned pod souhrnem
 * zakázky. Logika je celá v poznamky.js; tady je jen jedno textové pole.
 *
 * CO SE 22. 9. 2026 ZMĚNILO A PROČ (zadání J. V.)
 *
 * Z karty zmizely tři věci: štítky druhu poznámky (Obchodní jednání,
 * Důvod slevy, …), zápisník jednotlivých záznamů s měkkým mazáním
 * a nahrávání příloh. Zůstalo VOLNÉ TEXTOVÉ POLE. Zápisník se v provozu
 * používal jako jeden odstavec pod druhým, takže druh, autor a čas u každé
 * věty byly režie navíc; a přílohy se nosily přímo v souboru zakázky jako
 * data URL, čímž ho nafukovaly na hranici odeslatelnosti e-mailem.
 *
 * NIC SE NESMAZALO. Model v poznamky.js umí dál všechno, co uměl, a starší
 * zakázky si své záznamy i přílohy nesou dál:
 *   • staré strukturované poznámky se v poli ukážou jako předvyplněný text
 *     (poznamkyPoleText), takže je uživatel vidí a může s nimi pracovat;
 *   • přílohy, které v zakázce už jsou, jdou pořád stáhnout — jen nové
 *     přibývat nemůžou.
 *
 * Text nedrží pomocná proměnná, ale přímo zakázka. Dřív žil v POZN_ROZEPSANO,
 * protože render() překresluje celou stránku a rozepsaný odstavec by z DOM
 * zmizel. Teď se při psaní zapisuje rovnou do ZAK (bez překreslení, takže
 * kurzor neutíká) a při překreslení se z ní zase načte — nemá se tedy
 * odkud ztratit a automatické ukládání ho vezme s sebou.
 *
 * „Netiskne se" je napsané přímo v kartě, ne schované v nápovědě. Celá
 * funkce stojí na tom, že si tím uživatel je jistý; kdyby si nebyl, psal by
 * dál do e-mailů a pole by zůstalo prázdné.
 *
 * KRYCÍ LIST (IK, rozhodnutí J. V. 4. 11. 2026): totéž pole stojí i na
 * krycím listu OCK a PROJ jako první sekce se stejným nadpisem a tiskne se
 * do obou verzí krycího listu (BO i Tech). Do nabídky ani nikam jinam ne —
 * popisek karty to proto říká přesně. Všechna čtyři textová pole (karta
 * OCK, karta PROJ, krycí list OCK, krycí list PROJ) zapisují do téhož
 * `ZAK.poznamkyText`; po opuštění pole se překreslí a ostatní ukážou totéž.
 * Kdo zakázku nesmí upravovat (poznamkySmiPsat), vidí pole jen ke čtení.
 * ============================================================ */

function poznamkyZak() {
  return (typeof ZAK !== 'undefined' && ZAK) ? poznamkyZajisti(ZAK) : null;
}
/* Smí přihlášený do pole psát? (poznamkySmiPsat v poznamky.js) */
function poznamkyPsatSmi() {
  const ja = (typeof ONLINE_STAV !== 'undefined' && ONLINE_STAV) ? ONLINE_STAV.ja : null;
  return (typeof poznamkySmiPsat === 'function') ? poznamkySmiPsat(ZAK, ja) : true;
}
function poznamkyKdo() {
  return (typeof NAST !== 'undefined' && NAST && NAST.uzivatel) ? NAST.uzivatel : '';
}
function poznamkyZmena() {
  if (typeof historieNeulozeno === 'function') historieNeulozeno();
  render();
}

/* ---------- textové pole ---------- */

/* Při psaní se NEPŘEKRESLUJE — render() by přepsal innerHTML a kurzor by
 * skočil na začátek. Zápis do zakázky stačí: automatické ukládání se řídí
 * porovnáním se stavem na disku, takže změnu uvidí i bez překreslení. */
function poznamkyPoleSet(v) {
  const zak = poznamkyZak(); if (!zak || !poznamkyPsatSmi()) return;
  poznamkyTextNastav(zak, v);
}

/* Po opuštění pole se překreslí, aby se srovnal zbytek obrazovky
 * (lišta uložení, počítadlo znaků). */
function poznamkyPoleHotovo(v) {
  const zak = poznamkyZak(); if (!zak || !poznamkyPsatSmi()) return;
  poznamkyTextNastav(zak, v);
  poznamkyZmena();
}

/* ---------- přílohy: jen stažení ---------- */

/* Nahrávání skončilo 22. 9. 2026, ale co v zakázce leží, musí jít dostat
 * ven — jinak by se obsah stal nedosažitelným, aniž by ho kdokoli smazal. */
function prilohyStahni(id) {
  const zak = poznamkyZak(); if (!zak) return;
  const p = (zak.prilohy || []).find(x => x.id === id); if (!p) return;
  /* Jen data: adresa (B82, 24. 9. 2026) — `javascript:` v odkazu by se
   * kliknutím spustil. Server takovou zakázku už ani neuloží. */
  if (!p.data || !uloPrilohaDataBezpecna(p.data)) {
    if (typeof hlaska === 'function') hlaska('Přílohu „' + (p.nazev || id) + '" nejde stáhnout: nenese data souboru.');
    return;
  }
  const a = document.createElement('a');
  a.href = p.data; a.download = p.nazev;
  document.body.appendChild(a); a.click(); a.remove();
}

function prilohyRadek(p) {
  return `<li class="pozn-priloha">
    <span class="nazev">${esc(p.nazev)}</span>
    <span class="vel">${esc(poznamkyVelikostText(p.velikost))}</span>
    <span class="kdy">${esc(poznamkyDatum(p.kdy))}${p.kdo ? ', ' + esc(p.kdo) : ''}</span>
    <span class="ovl">
      <button class="mini" onclick="prilohyStahni('${escJs(p.id)}')">Stáhnout</button>
    </span></li>`;
}

/* ---------- vykreslení ---------- */

/* `kde` je 'ock' / 'proj' a jde JEN o jedinečnost id v dokumentu. Karta se
 * vykresluje na obou stránkách naráz (obě jsou v DOM, jen skryté), takže
 * pevné `id="poznText"` by v dokumentu vzniklo dvakrát — a na to je vlastní
 * kontrola v harnessech. Obsah i chování jsou přitom totožné: je to jeden
 * zápisník zakázky. */
function poznamkyKarta(kde) {
  const zak = poznamkyZak();
  if (!zak) return '';
  const prilohy = prilohySeznam(zak);
  const pole = poznamkyTextarea('poznText-' + (kde === 'proj' ? 'proj' : 'ock'), 6);

  /* Seznam příloh se ukáže jen tehdy, když v zakázce opravdu nějaké jsou.
   * U nové zakázky by prázdný nadpis „Přílohy" jen mátl: působil by jako
   * nabídka něco nahrát, což už nejde. */
  const listPril = prilohy.length
    ? `<div class="note" style="font-weight:600;margin-top:12px">Přílohy ze starších zakázek
         (nové už nahrát nejdou):</div>
       <ul class="pozn-prilohy">${prilohy.map(prilohyRadek).join('')}</ul>`
    : '';

  return `<div class="pozn-zapis">${pole}</div>` + listPril
    + `<div class="note" style="margin-top:10px"><b>Do nabídky se netiskne</b> – text se tiskne jen
       na krycím listu OCK a PROJ (verze Backoffice i Technické odd.), kde je to samé pole jako první sekce.
       Neobjeví se v cenové nabídce, smlouvě, plné moci, technické specifikaci ani v Pipedrive.</div>`;
}

/* Jedno textové pole zápisníku — karta v Kalkulaci i krycí list sdílejí
 * totéž `ZAK.poznamkyText`. Id musí být v dokumentu jedinečné (všechny
 * stránky jsou v DOM naráz). Kdo zakázku jen čte, má pole readonly. */
function poznamkyTextarea(id, radku) {
  const zak = poznamkyZak();
  if (!zak) return '';
  const smi = poznamkyPsatSmi();
  const ro = smi ? '' : ' readonly title="Jen ke čtení — poznámky smí upravovat ten, kdo smí upravovat zakázku."';
  return `<textarea id="${id}" class="pozn-pole" rows="${radku || 6}" style="width:100%;text-align:left"${ro}
      placeholder="Např.: Sleva 6 % dohodnutá s p. Novákem – tři šachty v jedné budově, montáž v jednom nájezdu."
      oninput="poznamkyPoleSet(this.value)"
      onchange="poznamkyPoleHotovo(this.value)">${esc(poznamkyPoleText(zak))}</textarea>`;
}

/* Krycí list OCK / PROJ: první sekce, nadpis stejný jako karta v Kalkulaci
 * (IK, J. V. 4. 11. 2026). Tiskne se do obou verzí, prázdné pole ne. */
function poznamkyKryciBlok(kde) {
  const zak = poznamkyZak();
  if (!zak) return '';
  const k = kde === 'proj' ? 'proj' : 'ock';
  return `<div class="kl-ik" id="klIk-${k}">
    <h3>${esc(typeof POZN_NADPIS !== 'undefined' ? POZN_NADPIS : 'Interní poznámky k zakázce')}
      <span class="pill mut kl-verze" title="v obou verzích">BO+Tech</span></h3>
    <div class="note">Totéž pole jako karta v Kalkulaci — co napíšete tady, je vidět tam a naopak.
      Tiskne se do obou verzí krycího listu (prázdné ne), nikam jinam. Doplňovat jde vždy, i po odeslání nabídky,
      po SoD i po Prodáno.</div>
    ${poznamkyTextarea('poznText-kl-' + k, 5)}
  </div>`;
}
