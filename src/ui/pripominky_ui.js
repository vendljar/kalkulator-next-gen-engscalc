/* ============================================================
 * PŘIPOMÍNKY Z APLIKACE — OBRAZOVKY (dávka PR, zadání J. V. 21. 11. 2026)
 *
 * OBCHODNÍK: plovoucí tlačítko „Připomínka" vpravo dole (číslo = nové
 * odpovědi) → panel zprava (430 px) se záložkami Nová připomínka / Moje
 * připomínky. Panel i tlačítko žijí MIMO překreslovaný strom aplikace
 * (vlastní prvky v <body>), takže render() rozepsaný text nesmaže
 * (poučení #178 „překreslení uprostřed psaní").
 *
 * SPRÁVCE: Nastavení → „💬 Připomínky (N)" hned za Uživateli a tlačítko
 * „💬 Připomínky N" v horní liště. Tabulka + detail, akce, nastavení, klíč.
 *
 * SNÍMEK OBRAZOVKY (rozhodnutí dávky, zdůvodnění v BEZPECNOST_MEZE.md B257):
 * CSP povoluje skripty jen z vlastní domény (`script-src 'self' 'unsafe-inline'`,
 * žádné CDN) a aplikace je jeden soubor — žádná knihovna (html2canvas apod.). Snímek se
 * dělá serializací viditelné části DOM do SVG <foreignObject>, vykreslí se
 * do <canvas> a odešle jako JPEG (max. šířka 1280 px). Když prohlížeč
 * vykreslení odmítne (zašpiněné plátno, chyba, víc než 4 s), připomínka
 * odejde BEZ snímku — strukturovaný kontext (obrazovka, zakázka, místo,
 * verze, prohlížeč) jde vždy. Server přijme jen JPEG/PNG (žádné SVG).
 * ============================================================ */

const PRIP = {
  nastaveni: null,            // { zapnuto, smiOdesilat, snimekVychozi, limitDen, zdroj }
  moje: [], novych: 0, mojeNacteno: false,
  panel: false, zalozka: 'nova',
  typ: '', text: '', misto: null, snimekPrilozit: true, nahled: '', nahledBezi: false,
  odesilam: false, odeslano: null, hlaska: '', zvyraznit: [],
  vybira: false,
  sp: { seznam: [], pocty: {}, neprectenych: 0, nacteno: false, nacita: false, filtr: 'nove', zdroj: 'oba', hledej: '',
    vybrana: '', odpoved: '', dupS: '', snimky: {}, nastaveni: null, klic: null, zaznam: [], novyKlic: '', hlaska: '', hlaskaTyp: '' },
};
const PRIP_FAB_ID = 'prip-fab', PRIP_PANEL_ID = 'prip-panel', PRIP_LISTA_ID = 'prip-vyber-lista', PRIP_RAM_ID = 'prip-vyber-ram';

function pripPrihlasen() { return typeof ONLINE_STAV !== 'undefined' && !!ONLINE_STAV.ja; }
function pripJeSpravce() { return typeof jeAdminOnline === 'function' && jeAdminOnline(); }
function pripSmiOdesilat() { return pripPrihlasen() && !!(PRIP.nastaveni && PRIP.nastaveni.smiOdesilat); }

/* ---------- úplný reset (N2 revize 22. 11. 2026) ----------
 * Odhlášení i nové přihlášení vynuluje CELÝ stav: rozepsaný text, náhled
 * snímku (plný snímek předchozího uživatele), seznam a snímky správce,
 * záznam a nový klíč koordinace. Panel a výběr místa se zavřou. */
function pripominkyReset() {
  if (PRIP.vybira && typeof pripMistoKonec === 'function') { try { pripMistoKonec(null); } catch (e) { /* nic */ } }
  Object.assign(PRIP, { nastaveni: null, moje: [], novych: 0, mojeNacteno: false, panel: false, zalozka: 'nova',
    typ: '', text: '', misto: null, snimekPrilozit: true, nahled: '', nahledBezi: false,
    odesilam: false, odeslano: null, hlaska: '', zvyraznit: [], vybira: false,
    sp: { seznam: [], pocty: {}, neprectenych: 0, nacteno: false, nacita: false, filtr: 'nove', zdroj: 'oba', hledej: '',
      vybrana: '', odpoved: '', dupS: '', snimky: {}, nastaveni: null, klic: null, zaznam: [], novyKlic: '', hlaska: '', hlaskaTyp: '' } });
  if (typeof document !== 'undefined') {
    [PRIP_PANEL_ID, PRIP_LISTA_ID, PRIP_RAM_ID].forEach(id => { const e = document.getElementById(id); if (e) { e.style.display = 'none'; if (id === PRIP_PANEL_ID) e.innerHTML = ''; } });
    pripFabKresli();
  }
}
/* Nový klíč se ukazuje jen dokud správce nezavře záložku Připomínky (N2). */
function pripominkyOpustit() { PRIP.sp.novyKlic = ''; }

/* ---------- načtení po přihlášení ---------- */
function pripominkyPoPrihlaseni() {
  pripominkyReset();
  return pripominkyNactiZnovu();
}
/* Načte nastavení, svoje připomínky a (správce) seznam — bez resetu stavu
 * (volá ho i uložení nastavení, které nesmí smazat hlášku ani výběr). */
function pripominkyNactiZnovu() {
  PRIP.nastaveni = null;
  return onlineApi('/api/pripominky?nastaveni=1').then(n => {
    PRIP.nastaveni = n;
    if (n.nastaveni) { PRIP.sp.nastaveni = n.nastaveni; PRIP.sp.klic = n.klic; PRIP.sp.zaznam = n.zaznam || []; }
    PRIP.snimekPrilozit = n.snimekVychozi !== false;
    const kroky = [];
    if (n.smiOdesilat) kroky.push(pripMojeNacti());
    if (pripJeSpravce()) kroky.push(pripSpravceNacti());
    return Promise.all(kroky);
  }).catch(() => { /* připomínky nesmí zastavit přihlášení */ })
    .then(() => { pripFabKresli(); if (typeof renderOnlineLista === 'function') renderOnlineLista(); });
}
function pripMojeNacti() {
  return onlineApi('/api/pripominky?moje=1').then(d => {
    PRIP.moje = d.pripominky || []; PRIP.novych = d.novychOdpovedi || 0; PRIP.mojeNacteno = true;
  }).catch(() => {}).then(() => { pripFabKresli(); if (PRIP.panel) pripPanelKresli(); });
}
function pripSpravceNacti() {
  PRIP.sp.nacita = true;
  return onlineApi('/api/pripominky').then(d => {
    PRIP.sp.seznam = d.pripominky || []; PRIP.sp.pocty = d.pocty || {}; PRIP.sp.neprectenych = d.neprectenych || 0;
    PRIP.sp.nacteno = true;
  }).catch(e => { PRIP.sp.hlaska = 'Připomínky se nepodařilo načíst: ' + e.message; PRIP.sp.hlaskaTyp = 'chyba'; PRIP.sp.nacteno = true; })
    .then(() => { PRIP.sp.nacita = false; pripSpravcePrekresli(); });
}

/* ---------- plovoucí tlačítko ---------- */
function pripEl(id, tag, cls) {
  let el = document.getElementById(id);
  if (!el) { el = document.createElement(tag || 'div'); el.id = id; if (cls) el.className = cls; document.body.appendChild(el); }
  return el;
}
function pripFabKresli() {
  if (typeof document === 'undefined') return;
  const el = pripEl(PRIP_FAB_ID, 'button', 'prip-fab noprint');
  el.type = 'button';
  const vidi = pripSmiOdesilat() && !PRIP.panel && !PRIP.vybira;
  el.style.display = vidi ? '' : 'none';
  el.setAttribute('aria-label', 'Připomínka k aplikaci');
  el.onclick = () => pripPanelOtevri(PRIP.novych ? 'moje' : 'nova');
  el.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" style="fill:currentColor"><path d="M4 3h16a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H9l-5 4v-4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/></svg>
    <span>Připomínka</span>${PRIP.novych ? `<b class="prip-fab-pocet" title="Nové odpovědi">${esc(PRIP.novych)}</b>` : ''}`;
  if (!pripSmiOdesilat()) { const p = document.getElementById(PRIP_PANEL_ID); if (p) p.style.display = 'none'; PRIP.panel = false; }
}

/* ---------- panel obchodníka ---------- */
function pripPanelOtevri(zalozka) {
  if (!pripSmiOdesilat()) return;
  PRIP.panel = true; PRIP.zalozka = zalozka || 'nova';
  if (PRIP.zalozka === 'nova' && !PRIP.odeslano && PRIP.snimekPrilozit && !PRIP.nahled) pripNahledObnov();
  if (PRIP.zalozka === 'moje') pripMojeOtevreno();   // nejdřív zvýraznění, pak kreslení
  pripPanelKresli(); pripFabKresli();
}
function pripPanelZavri() {
  PRIP.panel = false; PRIP.nahled = '';   // N6: po návratu se snímek pořídí znovu
  const p = document.getElementById(PRIP_PANEL_ID); if (p) p.style.display = 'none';
  pripFabKresli();
}
function pripZalozka(z) {
  PRIP.zalozka = z;
  if (z === 'nova' && PRIP.snimekPrilozit && !PRIP.nahled && !PRIP.odeslano) pripNahledObnov();
  if (z === 'moje') pripMojeOtevreno();
  pripPanelKresli();
}
/* Otevření „Moje připomínky": nové odpovědi se zvýrazní a označí jako přečtené. */
function pripMojeOtevreno() {
  const nove = PRIP.moje.filter(p => p.odpovedNova).map(p => p.id);
  if (!nove.length) return;
  PRIP.zvyraznit = nove;
  onlineApi('/api/pripominky', { akce: 'precteno', ids: nove, jako: 'autor' }, 'PATCH').then(() => {
    PRIP.moje.forEach(p => { if (nove.includes(p.id)) p.odpovedNova = false; });
    PRIP.novych = 0; pripFabKresli();
  }).catch(() => {});
}
function pripTyp(id) {
  PRIP.typ = id; pripPanelKresli();
  const t = document.getElementById('prip-text'); if (t) t.focus();
}
function pripTextZmena(el) {
  PRIP.text = el.value;
  const b = document.getElementById('prip-odeslat');
  if (b) b.disabled = !pripominkaLzeOdeslat(PRIP.typ, PRIP.text) || PRIP.odesilam;
}
function pripSnimekPrepni(v) {
  PRIP.snimekPrilozit = !!v;
  if (v && !PRIP.nahled) pripNahledObnov(); else pripPanelKresli();
}
function pripNahledObnov() {
  if (PRIP.nahledBezi) return;
  PRIP.nahledBezi = true;
  pripSnimekPoriz().then(d => { PRIP.nahled = d || ''; }).catch(() => { PRIP.nahled = ''; })
    .then(() => { PRIP.nahledBezi = false; if (PRIP.panel) pripPanelKresli(); });
}
function pripObrazovkaNazev() {
  if (typeof nastOtevreno === 'function' && nastOtevreno()) {
    const a = typeof nastPanelAktivni === 'function' ? nastPanelAktivni() : null;
    return 'Nastavení' + (a ? ' → ' + String(a.nazev).replace(/\s*\(\d+\)$/, '') : '');
  }
  const b = typeof TAB !== 'undefined' ? document.getElementById('tab-' + TAB) : null;
  return b ? b.textContent.trim() : '';
}
function pripKontext() {
  let zak = { cislo: '', varianta: '', soubor: '' };
  try {
    if (typeof ZAK !== 'undefined' && ZAK) {
      const v = typeof aktivniVarianta === 'function' ? aktivniVarianta(ZAK) : null;
      zak = { cislo: (typeof cisloSVariantou === 'function' && v ? cisloSVariantou(ZAK, v) : ZAK.cislo) || '',
        varianta: v ? (v.nazev || v.id || '') : '', soubor: (typeof ONLINE_STAV !== 'undefined' && ONLINE_STAV.soubor) || '' };
    }
  } catch (e) { /* kontext je doplněk */ }
  return { obrazovka: pripObrazovkaNazev(), zalozka: typeof TAB !== 'undefined' ? TAB : '', zakazka: zak,
    misto: PRIP.misto, verze: typeof buildVerze === 'function' ? buildVerze() : '',
    prohlizec: navigator.userAgent, okno: { w: window.innerWidth, h: window.innerHeight },
    pole: PRIP.misto && PRIP.misto.hodnota ? [{ popisek: PRIP.misto.popisek, hodnota: PRIP.misto.hodnota }] : [] };
}
function pripOdeslat() {
  if (!pripominkaLzeOdeslat(PRIP.typ, PRIP.text) || PRIP.odesilam) return;
  PRIP.odesilam = true; PRIP.hlaska = ''; pripPanelKresli();
  /* N6 revize (22. 11. 2026): snímek se pořizuje ČERSTVÝ při odeslání — ten
   * z otevření panelu mohl být z jiné obrazovky. Selže-li, použije se náhled. */
  const snimek = PRIP.snimekPrilozit ? pripSnimekPoriz().then(d => d || PRIP.nahled) : Promise.resolve('');
  snimek.catch(() => '').then(obr => {
    const sn = pripominkaSnimekZkontroluj(obr || '');
    return onlineApi('/api/pripominky', { typ: PRIP.typ, text: PRIP.text, kontext: pripKontext(), snimek: sn.ok ? sn.obrazek : '' });
  }).then(d => {
    PRIP.odeslano = { id: d.id };
    PRIP.typ = ''; PRIP.text = ''; PRIP.misto = null; PRIP.nahled = '';
    PRIP.snimekPrilozit = !PRIP.nastaveni || PRIP.nastaveni.snimekVychozi !== false;
    if (d.pripominka) PRIP.moje.unshift(d.pripominka);
  }).catch(e => { PRIP.hlaska = e.message || 'Odeslání se nepovedlo.'; })
    .then(() => { PRIP.odesilam = false; pripPanelKresli(); });
}
function pripNovaZnovu() { PRIP.odeslano = null; if (PRIP.snimekPrilozit) pripNahledObnov(); pripPanelKresli(); }

function pripKartaAutora(p) {
  const t = pripominkaTyp(p.typ) || { ikona: '', nazev: p.typ };
  const s = pripominkaStav(p.stav) || { nazev: p.stav };
  const krok = pripominkaKrok(p.stav);
  const oranz = pripominkaOranzove(p.stav);
  const kroky = PRIPOMINKA_KROKY.map((k, i) => `<span class="prip-krok${!oranz && i <= krok ? ' hotovy' : ''}">${esc(k)}</span>`).join('<span class="prip-krok-sip">→</span>');
  const nova = PRIP.zvyraznit.includes(p.id);
  return `<div class="card prip-karta${nova ? ' prip-nova' : ''}" data-id="${esc(p.id)}"><div class="body">
    <div class="prip-karta-hlava"><b>${esc(p.id)}</b> <span class="stav-pill prip-stav-${esc(p.stav)}">${esc(s.nazev)}</span>
      <span class="note" style="display:inline;margin:0 0 0 auto">${esc(t.ikona)} ${esc(t.nazev)} · ${esc(pripDatum(p.kdy))}</span></div>
    <div class="prip-text">${esc(p.text)}</div>
    <div class="prip-prubeh">${kroky}</div>
    ${p.odpoved ? `<div class="prip-odpoved${oranz ? ' oranzova' : ''}"><b>Odpověď správce${p.odpovedKdy ? ' · ' + esc(pripDatum(p.odpovedKdy)) : ''}:</b><br>${esc(p.odpoved)}${p.duplicitniS ? '<br><span class="note">Duplicitní s ' + esc(p.duplicitniS) + '.</span>' : ''}</div>` : ''}
    ${nova ? '<div class="note prip-nova-stitek">● nová odpověď</div>' : ''}
  </div></div>`;
}
function pripDatum(iso) {
  const d = new Date(iso); if (!isFinite(d)) return '';
  return d.getDate() + '. ' + (d.getMonth() + 1) + '. ' + d.getFullYear() + ' ' + d.getHours() + ':' + String(d.getMinutes()).padStart(2, '0');
}

function pripPanelKresli() {
  const el = pripEl(PRIP_PANEL_ID, 'div', 'modal prip-panel noprint');
  if (!PRIP.panel) { el.style.display = 'none'; return; }
  el.style.display = '';
  el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Připomínka k aplikaci');
  const novych = PRIP.moje.filter(p => p.odpovedNova).length;
  const tab = (id, nazev, pocet) => `<button class="${PRIP.zalozka === id ? 'act' : ''}" onclick="pripZalozka('${escJs(id)}')">${esc(nazev)}${pocet ? ` <b class="prip-pocet">${esc(pocet)}</b>` : ''}</button>`;
  let telo;
  if (PRIP.zalozka === 'moje') {
    telo = PRIP.moje.length ? PRIP.moje.map(pripKartaAutora).join('')
      : `<div class="note">Zatím jste žádnou připomínku neposlali.</div>`;
  } else if (PRIP.odeslano) {
    telo = `<div class="prip-dekujeme"><div class="prip-fajfka">✓</div>
      <h3>Děkujeme, připomínka je odeslaná</h3><div>Číslo připomínky <b>${esc(PRIP.odeslano.id)}</b></div></div>
      <div class="sec-title">Co bude dál</div>
      <ol class="prip-dal"><li><b>Správce si připomínku přečte</b> a rozhodne, jestli jde o opravu, návrh nebo dotaz.</li>
        <li><b>Oprava jde do fronty</b> — stav uvidíte v záložce Moje připomínky.</li>
        <li><b>Odpověď vám přijde sem</b>; na tlačítku Připomínka se ukáže číslo.</li></ol>
      <div class="btns"><button class="mini" onclick="pripNovaZnovu()">Napsat další</button>
        <button class="mini" onclick="pripZalozka('moje')">Moje připomínky</button></div>`;
  } else {
    const typy = PRIPOMINKA_TYPY.map(t => `<button type="button" class="prip-typ${PRIP.typ === t.id ? ' act' : ''}" data-typ="${esc(t.id)}"
        onclick="pripTyp('${escJs(t.id)}')"><span class="prip-typ-ikona">${esc(t.ikona)}</span><b>${esc(t.nazev)}</b><span>${esc(t.popis)}</span></button>`).join('');
    const typ = pripominkaTyp(PRIP.typ);
    const misto = PRIP.misto
      ? `<span class="prip-cip">📍 ${esc(pripominkaMistoPopis(PRIP.misto))} <button type="button" title="Zrušit označení" onclick="pripMistoZrus()">×</button></span>`
      : `<button type="button" class="mini" id="prip-misto" onclick="pripMistoZacni()">📍 Ukázat místo na obrazovce</button>`;
    const k = pripKontext();
    const nahled = PRIP.snimekPrilozit
      ? (PRIP.nahled ? `<img class="prip-miniatura" src="${esc(PRIP.nahled)}" alt="Náhled snímku obrazovky">`
        : `<div class="prip-miniatura prazdna">${PRIP.nahledBezi ? 'Pořizuji snímek…' : 'Snímek se nepodařilo pořídít — odešle se jen popis obrazovky.'}</div>`)
      : `<div class="prip-miniatura prazdna">bez snímku</div>`;
    telo = `
      <div class="sec-title">1 · Co chcete nahlásit?</div>
      <div class="prip-typy">${typy}</div>
      <div class="sec-title">2 · Popište to vlastními slovy</div>
      <textarea id="prip-text" rows="5" maxlength="${PRIPOMINKA_TEXT_MAX}" placeholder="${esc(typ ? typ.placeholder : 'Nejdřív zvolte, co chcete nahlásit.')}"
        oninput="pripTextZmena(this)">${esc(PRIP.text)}</textarea>
      <div class="sec-title">3 · Kde to je? <span style="text-transform:none;font-weight:400">(nepovinné)</span></div>
      <div>${misto}</div>
      <div class="prip-auto">
        <div class="prip-auto-nadpis">Přiložíme automaticky — nic nevyplňujete</div>
        <div class="prip-auto-obsah">${nahled}
          <div class="note" style="margin:0">Obrazovka: <b>${esc(k.obrazovka || '—')}</b><br>
            Zakázka: <b>${esc(k.zakazka.cislo || '—')}</b>${k.zakazka.varianta ? ' · varianta ' + esc(k.zakazka.varianta) : ''}<br>
            Verze aplikace: <b>${esc(k.verze || '—')}</b></div></div>
        <label class="prip-chk"><input type="checkbox" id="prip-snimek-chk" ${PRIP.snimekPrilozit ? 'checked' : ''}
          onchange="pripSnimekPrepni(this.checked)"> Přiložit snímek obrazovky</label>
      </div>
      ${PRIP.hlaska ? `<div class="prip-chyba">${esc(PRIP.hlaska)}</div>` : ''}
      <button class="primary prip-odeslat" id="prip-odeslat" ${pripominkaLzeOdeslat(PRIP.typ, PRIP.text) && !PRIP.odesilam ? '' : 'disabled'}
        onclick="pripOdeslat()">${PRIP.odesilam ? 'Odesílám…' : 'Odeslat připomínku'}</button>
      <div class="note" style="text-align:center">Odesláním se nic v zakázce nezmění.</div>`;
  }
  /* Rozepsaný text a kurzor přežijí překreslení panelu (např. po doběhnutí náhledu). */
  const fokus = document.activeElement && document.activeElement.id === 'prip-text'
    ? [document.activeElement.selectionStart, document.activeElement.selectionEnd] : null;
  el.innerHTML = `<h2>💬 Připomínka k aplikaci <span class="sp" style="flex:1"></span>
      <button class="mini" onclick="pripPanelZavri()" aria-label="Zavřít">✕</button></h2>
    <div class="nast-tabs">${tab('nova', 'Nová připomínka')}${tab('moje', 'Moje připomínky', novych)}</div>
    <div class="body">${telo}</div>`;
  if (fokus) { const t = document.getElementById('prip-text'); if (t) { t.focus(); try { t.setSelectionRange(fokus[0], fokus[1]); } catch (e) {} } }
}

/* ---------- výběr místa na obrazovce ---------- */
function pripMistoZacni() {
  PRIP.vybira = true;
  const p = document.getElementById(PRIP_PANEL_ID); if (p) p.style.display = 'none';
  pripFabKresli();
  const lista = pripEl(PRIP_LISTA_ID, 'div', 'prip-vyber-lista noprint');
  lista.style.display = '';
  lista.innerHTML = `<span>Klikněte na místo, kterého se připomínka týká</span>
    <button class="mini" onclick="pripMistoKonec(null)">Zrušit</button>`;
  pripEl(PRIP_RAM_ID, 'div', 'prip-vyber-ram noprint').style.display = 'none';
  ['mousemove', 'mousedown', 'mouseup', 'click', 'pointerdown', 'pointerup', 'dblclick', 'keydown'].forEach(t =>
    document.addEventListener(t, pripMistoUdalost, true));
}
function pripMistoMimo(t) {
  return !t || !t.closest || !!t.closest('#' + PRIP_LISTA_ID + ',#' + PRIP_PANEL_ID + ',#' + PRIP_FAB_ID + ',#' + PRIP_RAM_ID);
}
function pripMistoUdalost(ev) {
  if (!PRIP.vybira) return;
  if (ev.type === 'keydown') { if (ev.key === 'Escape') { ev.preventDefault(); pripMistoKonec(null); } return; }
  const t = ev.target;
  if (pripMistoMimo(t)) return;          // lišta s tlačítkem Zrušit funguje normálně
  if (ev.type === 'mousemove') { pripRamNa(t); return; }
  /* Klik NESMÍ prvek aktivovat — zachytí se mousedown, pointerdown i click. */
  ev.preventDefault(); ev.stopPropagation(); if (ev.stopImmediatePropagation) ev.stopImmediatePropagation();
  if (ev.type === 'click') pripMistoKonec(t);
}
function pripRamNa(t) {
  const r = t.getBoundingClientRect(), ram = document.getElementById(PRIP_RAM_ID);
  if (!ram) return;
  Object.assign(ram.style, { display: '', left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px' });
}
function pripMistoKonec(t) {
  ['mousemove', 'mousedown', 'mouseup', 'click', 'pointerdown', 'pointerup', 'dblclick', 'keydown'].forEach(x =>
    document.removeEventListener(x, pripMistoUdalost, true));
  PRIP.vybira = false;
  ['#' + PRIP_LISTA_ID, '#' + PRIP_RAM_ID].forEach(s => { const e = document.querySelector(s); if (e) e.style.display = 'none'; });
  if (t) PRIP.misto = pripMistoPopis(t);
  PRIP.panel = true; PRIP.nahled = '';
  if (PRIP.snimekPrilozit) pripNahledObnov();
  pripPanelKresli(); pripFabKresli();
}
function pripMistoZrus() { PRIP.misto = null; PRIP.nahled = ''; if (PRIP.snimekPrilozit) pripNahledObnov(); pripPanelKresli(); }
/* Popis místa: sekce (nadpis karty / záložka), popisek prvku, selektor,
 * obdélník vůči oknu (správce ho vyznačí ve snímku). Hodnota pole jen
 * u polí, která nejsou cenová (ceny ke koordinaci nesmí — B257). */
const PRIP_CENOVE = /cen|kč|kc\b|eur|přirážk|prirazk|marž|marz|slev|dph|náklad|naklad|sazb|částk|castk/i;
function pripMistoPopis(t) {
  const txt = s => String(s || '').replace(/\s+/g, ' ').trim();
  const karta = t.closest('.card');
  const h = karta && karta.querySelector('h2');
  let sekce = h ? txt(h.textContent) : '';
  if (!sekce) { const m = t.closest('.modal'); const mh = m && m.querySelector('h2'); sekce = mh ? txt(mh.textContent) : pripObrazovkaNazev(); }
  /* `zdroj` popisku (N1 revize 22. 11. 2026): 'popis' = popis prvku (label,
   * aria-label, title, placeholder), 'obsah' = text ze stránky (první buňka
   * řádku, text prvku) — ten může nést cenu nebo jméno, ke koordinaci nejde. */
  let popisek = '', zdroj = 'popis';
  const lab = t.closest('label') || (t.id && document.querySelector('label[for="' + CSS.escape(t.id) + '"]'));
  if (lab) popisek = txt(lab.textContent);
  if (!popisek) popisek = txt(t.getAttribute('aria-label') || t.getAttribute('title') || t.getAttribute('placeholder'));
  if (!popisek && t.closest('td,th')) {
    const tr = t.closest('tr'); const prvni = tr && tr.cells && tr.cells[0];
    popisek = txt(prvni ? prvni.textContent : ''); zdroj = 'obsah';
  }
  if (!popisek) { popisek = txt(t.textContent); zdroj = 'obsah'; }
  popisek = popisek.slice(0, 80);
  const r = t.getBoundingClientRect();
  const cesta = [];
  for (let e = t, i = 0; e && e.nodeType === 1 && i < 5 && e !== document.body; e = e.parentElement, i++) {
    if (e.id) { cesta.unshift('#' + e.id); break; }
    const tag = e.tagName.toLowerCase();
    const sour = e.parentElement ? [...e.parentElement.children].filter(x => x.tagName === e.tagName) : [];
    cesta.unshift(sour.length > 1 ? tag + ':nth-of-type(' + (sour.indexOf(e) + 1) + ')' : tag);
  }
  const jePole = /^(INPUT|SELECT|TEXTAREA)$/.test(t.tagName) && t.type !== 'password';
  const hodnota = jePole && !PRIP_CENOVE.test(popisek + ' ' + (t.id || '') + ' ' + (t.name || '')) ? txt(t.value).slice(0, 120) : '';
  return { sekce: sekce.slice(0, 100), popisek, zdroj, selektor: cesta.join(' > ').slice(0, 300), hodnota,
    rect: { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height), vw: window.innerWidth, vh: window.innerHeight } };
}

/* ---------- snímek obrazovky (SVG foreignObject → canvas → JPEG) ---------- */
function pripSnimekPoriz() {
  return new Promise(resolve => {
    let hotovo = false;
    const konec = (v) => { if (!hotovo) { hotovo = true; resolve(v || ''); } };
    setTimeout(() => konec(''), 4000);
    try {
      const W = window.innerWidth, H = window.innerHeight;
      const klon = document.body.cloneNode(true);
      /* hodnoty polí: klon nese jen atributy, ne rozepsaný stav */
      const puv = document.body.querySelectorAll('input,textarea,select'), kop = klon.querySelectorAll('input,textarea,select');
      puv.forEach((e, i) => {
        const k = kop[i]; if (!k) return;
        if (e.tagName === 'TEXTAREA') k.textContent = e.value;
        else if (e.tagName === 'SELECT') [...k.options].forEach((o, j) => { if (e.options[j] && e.options[j].selected) o.setAttribute('selected', ''); else o.removeAttribute('selected'); });
        else if (e.type === 'checkbox' || e.type === 'radio') { if (e.checked) k.setAttribute('checked', ''); else k.removeAttribute('checked'); }
        else if (e.type === 'password') k.setAttribute('value', '');
        else k.setAttribute('value', e.value);
      });
      /* Atribut s neplatným jménem (vadný title s uvozovkou uvnitř rozpadne
       * HTML parser na „—=“ apod.) by XML parser SVG odmítl → pryč. */
      klon.querySelectorAll('*').forEach(e => { for (const a of [...e.attributes]) if (!/^[A-Za-z_][\w.:-]*$/.test(a.name)) e.removeAttribute(a.name); });
      klon.querySelectorAll('script,#' + PRIP_PANEL_ID + ',#' + PRIP_FAB_ID + ',#' + PRIP_LISTA_ID + ',#' + PRIP_RAM_ID + ',input[type=file]').forEach(e => e.remove());
      /* skryté stránky aplikace ven — zmenší to snímek na zlomek */
      document.querySelectorAll('[id^="page-"]').forEach(e => { if (e.style.display === 'none') { const k = klon.querySelector('#' + CSS.escape(e.id)); if (k) k.remove(); } });
      const css = [...document.querySelectorAll('style')].map(s => s.textContent).join('\n')
        .replace(/(^|[\s,}>])body(?=[\s.,{:#\[>])/g, '$1.prip-body').replace(/(^|[\s,}])html(?=[\s,{])/g, '$1.prip-html');
      const tridy = ['prip-body'].concat([...document.body.classList]).join(' ');
      const data = Object.entries(document.body.dataset).map(([k, v]) => ' data-' + k.replace(/[A-Z]/g, m => '-' + m.toLowerCase()) + '="' + esc(v) + '"').join('');
      const vnitrek = new XMLSerializer().serializeToString(klon).replace(/^<body[^>]*>/, '').replace(/<\/body>$/, '');
      const pozadi = getComputedStyle(document.body).backgroundColor || '#fff';
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><foreignObject x="0" y="0" width="${W}" height="${H}">`
        + `<div xmlns="http://www.w3.org/1999/xhtml" class="prip-html" style="width:${W}px;height:${H}px;overflow:hidden;position:relative;background:${pozadi}">`
        /* CSS jde do XML: & a < se musí zapsat jako entity, jinak SVG neprojde parserem */
        + `<style>${css.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</style>`
        + `<div class="${esc(tridy)}"${data} style="position:absolute;left:${-window.scrollX}px;top:${-window.scrollY}px;width:${+document.documentElement.scrollWidth}px;margin:0">${vnitrek}</div>`
        + `</div></foreignObject></svg>`;
      const img = new Image();
      img.onload = () => {
        try {
          const meritko = Math.min(1, 1280 / W);
          const c = document.createElement('canvas');
          c.width = Math.round(W * meritko); c.height = Math.round(H * meritko);
          const g = c.getContext('2d');
          g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
          g.drawImage(img, 0, 0, c.width, c.height);
          let d = c.toDataURL('image/jpeg', 0.72);
          if (d.length > PRIPOMINKA_SNIMEK_MAX) d = c.toDataURL('image/jpeg', 0.45);
          konec(d.length <= PRIPOMINKA_SNIMEK_MAX && /^data:image\/jpeg;base64,/.test(d) ? d : '');
        } catch (e) { konec(''); }       // zašpiněné plátno apod. → bez snímku
      };
      img.onerror = () => konec('');
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    } catch (e) { konec(''); }
  });
}

/* ---------- správce ---------- */
function pripominkyZalozkaNazev() { return '💬 Připomínky (' + (PRIP.sp.neprectenych || 0) + ')'; }
function pripominkySpravceOtevri() {
  if (typeof otevriNastaveni === 'function') otevriNastaveni();
  if (typeof nastPanel === 'function') nastPanel('pripominky');
  pripSpravceNacti();
}
function pripominkyListaTlacitko() {
  if (!pripJeSpravce() || (typeof nahledAktivni === 'function' && nahledAktivni())) return '';
  const n = PRIP.sp.neprectenych || 0;
  return `<button class="mini" id="prip-lista-btn" onclick="pripominkySpravceOtevri()" title="Připomínky z aplikace">💬 Připomínky${n ? ` <b class="prip-pocet">${n}</b>` : ''}</button>`;
}
function pripSpravcePrekresli() {
  if (typeof nastOtevreno === 'function' && nastOtevreno() && typeof NAST !== 'undefined' && NAST.panel === 'pripominky'
      && typeof renderNastaveni === 'function') {
    /* Hledání: překreslí se jen tělo, ať pole hledání neztratí kurzor. */
    const el = document.getElementById('prip-sp-telo');
    if (el && document.activeElement && document.activeElement.id === 'prip-sp-hledej') el.innerHTML = pripSpravceTelo();
    else renderNastaveni();
  }
  if (typeof renderOnlineLista === 'function') renderOnlineLista();
}
function pripSpFiltr(f) { PRIP.sp.filtr = f; pripSpravcePrekresli(); }
function pripSpZdroj(z) { PRIP.sp.zdroj = z; pripSpravcePrekresli(); }
function pripSpHledej(v) { PRIP.sp.hledej = v; const el = document.getElementById('prip-sp-telo'); if (el) el.innerHTML = pripSpravceTelo(); }
function pripSpVyber(id) {
  PRIP.sp.vybrana = id; PRIP.sp.odpoved = ''; PRIP.sp.dupS = '';
  const p = PRIP.sp.seznam.find(x => x.id === id);
  if (p && !p.prectenoSpravcem) {
    p.prectenoSpravcem = true; PRIP.sp.neprectenych = pripominkyNeprectenych(PRIP.sp.seznam);
    onlineApi('/api/pripominky', { akce: 'precteno', ids: [id], jako: 'spravce' }, 'PATCH').catch(() => {});
  }
  if (p && p.snimek && PRIP.sp.snimky[id] === undefined) {
    PRIP.sp.snimky[id] = null;
    onlineApi('/api/pripominky?snimek=' + encodeURIComponent(id)).then(d => { PRIP.sp.snimky[id] = d.obrazek || ''; })
      .catch(() => { PRIP.sp.snimky[id] = ''; }).then(() => pripSpravcePrekresli());
  }
  pripSpravcePrekresli();
}
function pripSpAkce(akce) {
  const id = PRIP.sp.vybrana; if (!id) return;
  const telo = { id, akce };
  const odp = (document.getElementById('prip-sp-odpoved') || {}).value;
  if (odp !== undefined) PRIP.sp.odpoved = odp;
  if (PRIP.sp.odpoved.trim()) telo.odpoved = PRIP.sp.odpoved;
  if (akce === 'duplicitni') { const d = (document.getElementById('prip-sp-dup') || {}).value || ''; PRIP.sp.dupS = d; telo.duplicitniS = d; }
  if ((akce === 'odlozit' || akce === 'zamitnout') && !PRIP.sp.odpoved.trim()) {
    PRIP.sp.hlaska = 'U odložení a zamítnutí napište zdůvodnění — autor ho uvidí.'; PRIP.sp.hlaskaTyp = 'chyba';
    pripSpravcePrekresli(); return;
  }
  onlineApi('/api/pripominky', telo, 'PATCH').then(d => {
    const i = PRIP.sp.seznam.findIndex(x => x.id === id);
    if (i >= 0) PRIP.sp.seznam[i] = d.pripominka;
    PRIP.sp.pocty = pripominkyPocty(PRIP.sp.seznam, 'oba'); PRIP.sp.neprectenych = pripominkyNeprectenych(PRIP.sp.seznam);
    PRIP.sp.odpoved = ''; PRIP.sp.dupS = '';
    PRIP.sp.hlaska = 'Uloženo: ' + id + ' → ' + (pripominkaStav(d.pripominka.stav) || {}).nazev + '.'; PRIP.sp.hlaskaTyp = 'ok';
    if (pripSmiOdesilat()) pripMojeNacti();
  }).catch(e => { PRIP.sp.hlaska = e.message; PRIP.sp.hlaskaTyp = 'chyba'; }).then(() => pripSpravcePrekresli());
}
function pripSpOtevriZakazku(soubor) {
  if (!soubor || typeof onlineOtevri !== 'function') return;
  if (typeof zavriNastaveni === 'function') zavriNastaveni();
  onlineOtevri(soubor);
}

function pripSpravceTelo() {
  const sp = PRIP.sp;
  const seznam = pripominkyFiltruj(sp.seznam, sp.filtr, sp.zdroj, sp.hledej);
  const radky = seznam.map(p => {
    const t = pripominkaTyp(p.typ) || { ikona: '', nazev: p.typ };
    const s = pripominkaStav(p.stav) || { nazev: p.stav };
    return `<tr class="radek-klik${p.prectenoSpravcem ? '' : ' prip-neprectena'}${sp.vybrana === p.id ? ' prip-vybrana' : ''}" data-id="${esc(p.id)}"
        onclick="pripSpVyber('${escJs(p.id)}')">
      <td><b>${esc(p.id)}</b></td><td>${esc(pripDatum(p.kdy))}</td><td>${esc(p.autorJmeno || p.autor)}</td>
      <td>${esc(t.ikona)} ${esc(t.nazev)}</td><td class="prip-bunka-text">${esc(String(p.text).slice(0, 90))}</td>
      <td><span class="stav-pill prip-stav-${esc(p.stav)}">${esc(s.nazev)}</span>${p.roadmapa ? ' <span class="note" style="display:inline">' + esc(p.roadmapa) + '</span>' : ''}</td></tr>`;
  }).join('');
  const tabulka = `<div class="tab-scroll"><table class="prip-tabulka"><thead><tr><th>Číslo</th><th>Kdy</th><th>Kdo</th><th>Typ</th><th>Text</th><th>Stav</th></tr></thead>
    <tbody>${radky || `<tr><td colspan="6" class="note">Žádná připomínka v tomto výběru.</td></tr>`}</tbody></table></div>`;
  return `<div class="prip-sp-mrizka"><div>${tabulka}</div><div class="prip-sp-detail">${pripSpravceDetail()}</div></div>`;
}
function pripSpravceDetail() {
  const sp = PRIP.sp;
  const p = sp.seznam.find(x => x.id === sp.vybrana);
  if (!p) return `<div class="note">Vyberte připomínku v tabulce.</div>`;
  const t = pripominkaTyp(p.typ) || { ikona: '', nazev: p.typ };
  const s = pripominkaStav(p.stav) || { nazev: p.stav };
  const k = p.kontext || {};
  const zak = k.zakazka || {};
  const m = k.misto;
  const snimek = sp.snimky[p.id];
  let snimekHtml = '<div class="note">Bez snímku obrazovky.</div>';
  if (p.snimek) {
    if (snimek === null || snimek === undefined) snimekHtml = '<div class="note">Načítám snímek…</div>';
    else if (snimek) {
      const r = m && m.rect && m.rect.vw && m.rect.vh ? m.rect : null;
      const ram = r ? `<div class="prip-snimek-ram" style="left:${(r.x / r.vw * 100).toFixed(2)}%;top:${(r.y / r.vh * 100).toFixed(2)}%;width:${(r.w / r.vw * 100).toFixed(2)}%;height:${(r.h / r.vh * 100).toFixed(2)}%"></div>` : '';
      snimekHtml = `<div class="prip-snimek"><img src="${esc(snimek)}" alt="Snímek obrazovky ${esc(p.id)}">${ram}</div>`;
    } else snimekHtml = '<div class="note">Snímek se nepodařilo načíst.</div>';
  }
  const prubeh = (p.prubeh || []).map(x => `<li><b>${esc((pripominkaStav(x.stav) || {}).nazev || x.stav)}</b>
    <span class="note" style="display:inline">${esc(pripDatum(x.kdy))} · ${esc(x.kdo || '')}</span>${x.text ? '<br>' + esc(x.text) : ''}</li>`).join('');
  return `<div class="prip-karta-hlava"><b>${esc(p.id)}</b> <span class="stav-pill prip-stav-${esc(p.stav)}">${esc(s.nazev)}</span>
      ${p.roadmapa ? '<span class="pill">' + esc(p.roadmapa) + '</span>' : ''}
      <span class="note" style="display:inline;margin-left:auto">${esc(t.ikona)} ${esc(t.nazev)} · ${esc(pripDatum(p.kdy))} · ${esc(p.autorJmeno || '')} ${esc(p.autor)} · ${esc(p.zdroj === 'test' ? 'test' : 'ostrý web')}</span></div>
    <div class="prip-text">${esc(p.text)}</div>
    <div class="sec-title">Kontext</div>
    <table class="prip-kontext"><tbody>
      <tr><th>Obrazovka</th><td>${esc(k.obrazovka || '—')}</td></tr>
      <tr><th>Zakázka</th><td>${esc(zak.cislo || '—')}${zak.varianta ? ' · varianta ' + esc(zak.varianta) : ''}
        ${zak.soubor ? ` <a href="#" onclick="event.preventDefault();pripSpOtevriZakazku('${escJs(zak.soubor)}')">otevřít zakázku</a>` : ''}</td></tr>
      <tr><th>Označené místo</th><td>${m ? '📍 ' + esc(pripominkaMistoPopis(m)) : '—'}${(k.pole || []).length ? '<br><span class="note" style="display:inline">' + k.pole.map(x => esc(x.popisek) + ': ' + esc(x.hodnota)).join(', ') + '</span>' : ''}</td></tr>
      <tr><th>Verze a prohlížeč</th><td>${esc(k.verze || '—')}<br><span class="note" style="display:inline">${esc(k.prohlizec || '')}${k.okno && k.okno.w ? ' · ' + esc(k.okno.w + '×' + k.okno.h) : ''}</span></td></tr>
    </tbody></table>
    <div class="sec-title">Snímek</div>${snimekHtml}
    <div class="sec-title">Průběh</div><ul class="prip-osa">${prubeh}</ul>
    ${p.odpoved ? `<div class="prip-odpoved${pripominkaOranzove(p.stav) ? ' oranzova' : ''}"><b>Odpověď (${esc(p.odpovedKdo || '')}):</b><br>${esc(p.odpoved)}</div>` : ''}
    <div class="sec-title">Odpověď autorovi</div>
    <textarea id="prip-sp-odpoved" rows="3" maxlength="${PRIPOMINKA_ODPOVED_MAX}" placeholder="U odložení a zamítnutí povinné — autor zdůvodnění uvidí."
      oninput="PRIP.sp.odpoved=this.value">${esc(sp.odpoved)}</textarea>
    <div class="btns prip-akce">
      <button class="primary" onclick="pripSpAkce('fronta')">➜ Do fronty oprav</button>
      <button class="mini" onclick="pripSpAkce('uzavrit')">Odpovědět a uzavřít</button>
      <button class="mini" onclick="pripSpAkce('odlozit')">Odložit</button>
      <button class="mini" onclick="pripSpAkce('zamitnout')">Zamítnout</button>
      <span class="prip-dup"><button class="mini" onclick="pripSpAkce('duplicitni')">Duplicitní s…</button>
        <input id="prip-sp-dup" size="8" placeholder="P-0000" value="${esc(sp.dupS)}"></span>
    </div>`;
}
function pripSpravceNastaveniHtml() {
  const n = PRIP.sp.nastaveni || pripominkyNastaveniVychozi();
  const k = PRIP.sp.klic || { nastaven: false };
  const role = PRIPOMINKA_ROLE.map(r => `<label class="prip-chk"><input type="checkbox" class="prip-n-role" value="${esc(r)}" ${n.role.includes(r) ? 'checked' : ''}> ${esc(r)}</label>`).join(' ');
  const zdroje = PRIPOMINKA_ZDROJE.map(z => `<option value="${esc(z.id)}" ${n.zdrojFronty === z.id ? 'selected' : ''}>${esc(z.nazev)}</option>`).join('');
  const zaznam = (PRIP.sp.zaznam || []).slice(0, 5).map(z => `<li>${esc(pripDatum(z.kdy))} — ${esc(z.udalost)}</li>`).join('');
  return `<div class="sec-title">Nastavení připomínek</div>
    <div class="prip-nast">
      <label class="prip-chk"><input type="checkbox" id="prip-n-zapnuto" ${n.zapnuto ? 'checked' : ''}> <b>Funkce zapnutá</b> (tlačítko Připomínka se ukáže vybraným rolím)</label>
      <div>Kdo vidí tlačítko: ${role}</div>
      <label class="prip-chk"><input type="checkbox" id="prip-n-snimek" ${n.snimekVychozi ? 'checked' : ''}> Snímek obrazovky přiložit výchozím stavem</label>
      <label class="prip-chk"><input type="checkbox" id="prip-n-email" ${n.emailSpravci ? 'checked' : ''}> E-mail správci o nové připomínce</label>
      <div class="note">Aplikace zatím e-maily neodesílá — volba se uloží a začne platit, až odesílání přibude (roadmapa). Text e-mailu je připravený.</div>
      <div>Zdroj pro frontu oprav: <select id="prip-n-zdroj">${zdroje}</select></div>
      <div>Interval čtení koordinací: <input id="prip-n-interval" size="28" value="${esc(n.intervalKoordinace)}"> <span class="note" style="display:inline">jen informace pro koordinaci</span></div>
      <div>Limit za den na uživatele: <input id="prip-n-limit" ${CISLO_POLE} style="width:80px" value="${esc(n.limitDen)}"></div>
      <div>Uchovávat vyřízené: <input id="prip-n-dni" ${CISLO_POLE} style="width:80px" value="${esc(n.uchovatDni)}"> dní <span class="note" style="display:inline">(0 = navždy)</span></div>
      <div class="btns"><button class="primary" onclick="pripSpUlozNastaveni()">Uložit nastavení připomínek</button></div>
      <div class="sec-title">Klíč pro koordinaci</div>
      <div>${k.nastaven ? `Klíč je vydaný ${esc(pripDatum(k.vytvoren))} (${esc(k.kdo)}). Server drží jen jeho otisk — znovu ho ukázat nejde.`
        : 'Klíč není vydaný — koordinace připomínky číst nemůže.'}</div>
      ${PRIP.sp.novyKlic ? `<div class="prip-klic"><b>Nový klíč (ukazuje se jen teď, zkopírujte ho a předejte koordinaci):</b><br>
        <code id="prip-novy-klic">${esc(PRIP.sp.novyKlic)}</code></div>` : ''}
      <div class="btns"><button class="mini" onclick="pripSpKlic('klic')">${k.nastaven ? 'Vydat nový klíč (starý přestane platit)' : 'Vydat klíč'}</button>
        ${k.nastaven ? `<button class="mini" onclick="pripSpKlic('klicZrusit')">Zrušit klíč</button>` : ''}</div>
      <div class="note">Klíč smí jen číst připomínky puštěné do fronty oprav a měnit jejich stav, odpověď a číslo roadmapy. Posílá se v hlavičce
        Authorization: Bearer; GET /api/pripominky?pro=koordinace&amp;od=&lt;čas&gt;.</div>
      ${zaznam ? `<div class="note">Poslední události klíče:</div><ul class="note">${zaznam}</ul>` : ''}
    </div>`;
}
function pripSpUlozNastaveni() {
  const h = id => document.getElementById(id);
  const n = { zapnuto: h('prip-n-zapnuto').checked, role: [...document.querySelectorAll('.prip-n-role')].filter(x => x.checked).map(x => x.value),
    snimekVychozi: h('prip-n-snimek').checked, emailSpravci: h('prip-n-email').checked, zdrojFronty: h('prip-n-zdroj').value,
    intervalKoordinace: h('prip-n-interval').value, limitDen: +h('prip-n-limit').value, uchovatDni: +h('prip-n-dni').value };
  onlineApi('/api/pripominky', { akce: 'nastaveni', nastaveni: n }).then(d => {
    PRIP.sp.nastaveni = d.nastaveni; PRIP.sp.hlaska = 'Nastavení připomínek uloženo.'; PRIP.sp.hlaskaTyp = 'ok';
    return pripominkyNactiZnovu();
  }).catch(e => { PRIP.sp.hlaska = e.message; PRIP.sp.hlaskaTyp = 'chyba'; }).then(() => pripSpravcePrekresli());
}
async function pripSpKlic(akce) {
  if (akce === 'klicZrusit' && !(await potvrd('Zrušit klíč pro koordinaci? Koordinace přestane připomínky číst, dokud nevydáte nový.'))) return;
  const heslo = typeof onlineHesloSpravce === 'function' ? await onlineHesloSpravce(akce === 'klic' ? 'Vydat klíč pro koordinaci' : 'Zrušit klíč pro koordinaci') : null;
  if (!heslo) return;
  try {
    const d = await onlineApi('/api/pripominky', { akce, hesloSpravce: heslo });
    PRIP.sp.novyKlic = d.klic || '';
    PRIP.sp.hlaska = akce === 'klic' ? 'Klíč vydán. Ukazuje se jen teď.' : 'Klíč zrušen.'; PRIP.sp.hlaskaTyp = 'ok';
    const n = await onlineApi('/api/pripominky?nastaveni=1');
    PRIP.sp.klic = n.klic; PRIP.sp.zaznam = n.zaznam || [];
  } catch (e) { PRIP.sp.hlaska = e.message; PRIP.sp.hlaskaTyp = 'chyba'; }
  pripSpravcePrekresli();
}
/* Tělo záložky Nastavení → Připomínky. */
function nastPripominky() {
  const sp = PRIP.sp;
  if (!pripPrihlasen()) return '<div class="note">Připomínky jsou dostupné po přihlášení k online databázi.</div>';
  if (!sp.nacteno && !sp.nacita) setTimeout(pripSpravceNacti, 0);
  const pocty = pripominkyPocty(sp.seznam, sp.zdroj);
  const cipy = PRIPOMINKA_FILTRY.map(f => `<button class="mini prip-cip-filtr${sp.filtr === f.id ? ' aktivni' : ''}" data-filtr="${esc(f.id)}"
      onclick="pripSpFiltr('${escJs(f.id)}')">${esc(f.nazev)} <b>${esc(pocty[f.id] || 0)}</b></button>`).join(' ');
  const zdroje = PRIPOMINKA_ZDROJE.map(z => `<option value="${esc(z.id)}" ${sp.zdroj === z.id ? 'selected' : ''}>${esc(z.nazev)}</option>`).join('');
  return `<div class="note">Připomínky obchodníků z tlačítka „Připomínka". Snímek a kontext vidí jen správce. Každý web (ostrý i test) má vlastní
      databázi; zdroj filtru platí pro připomínky v tomto webu (${esc((PRIP.nastaveni && PRIP.nastaveni.zdroj) === 'test' ? 'testovací web' : 'ostrý web')}) a pro čtení koordinací.</div>
    ${PRIP.nastaveni && !PRIP.nastaveni.zapnuto ? '<div class="prip-chyba">Funkce je vypnutá — obchodníci tlačítko nevidí. Zapnete ji dole v Nastavení připomínek.</div>' : ''}
    ${sp.hlaska ? `<div class="${sp.hlaskaTyp === 'chyba' ? 'prip-chyba' : 'prip-ok'}">${esc(sp.hlaska)}</div>` : ''}
    <div class="prip-filtry">${cipy}</div>
    <div class="prip-filtry">Zdroj: <select onchange="pripSpZdroj(this.value)">${zdroje}</select>
      <input id="prip-sp-hledej" type="search" placeholder="Hledat (číslo, text, autor, zakázka)" value="${esc(sp.hledej)}" oninput="pripSpHledej(this.value)">
      <button class="mini" onclick="pripSpravceNacti()">↻ Načíst znovu</button></div>
    <div id="prip-sp-telo">${sp.nacteno ? pripSpravceTelo() : '<div class="note">Načítám připomínky…</div>'}</div>
    ${pripSpravceNastaveniHtml()}`;
}
