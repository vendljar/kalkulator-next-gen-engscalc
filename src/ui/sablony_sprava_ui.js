/* ============================================================
 * SPRÁVA ŠABLON DOKUMENTŮ (#348, #349 — 24. 9. 2026)
 *
 * PROČ. J. V. 24. 9. večer: „nahrávání šablon a jazykových mutací je
 * chaotické — přestože jsem nahrál modernizované šablony, systém hlásí
 * chyby." Rozbor obrazovky, která tu byla do v24.9.4:
 *   – jediné tlačítko „Nahrát .docx" nahrávalo VŽDY do češtiny; kdo chtěl
 *     nahrát doladěnou německou verzi, zveřejnil ji jako českou šablonu
 *     (stalo se: jako česká verze 9 byl zveřejněn …_v11_DE.docx);
 *   – soubor „nahraný" v prohlížeči a verze „na serveru" byly dva stavy
 *     vedle sebe a nebylo jasné, co platí;
 *   – zastaralost jazykové verze se poznávala podle data zveřejnění
 *     a stejný soubor server podruhé nezveřejní, takže hláška „zastaralá"
 *     nešla odstranit.
 *
 * CO PLATÍ TEĎ (vizuální návrh odsouhlasen 24. 9.):
 *   – jedna tabulka dokument × jazyk; stav bere ze SERVERU, nic jiného;
 *   – nová česká verze jde přes průvodce: soubor → kontrola (jazyk,
 *     symboly, rozdíl proti platné) → jazykové verze → zveřejnit najednou;
 *   – doladěný soubor se nahrává přímo k jazyku a kontroluje se, že je
 *     v tom jazyce a má symboly platné češtiny;
 *   – jazyková verze si nese otisk české verze, ze které vznikla
 *     (`zdrojOtisk`); „zastaralá" se pozná obsahem, ne časem;
 *   – historie verzí s „vrátit" (server starou verzi zveřejní znovu jako
 *     novou, nic se nepřepisuje).
 *
 * Režim bez serveru (práce offline) zůstává na staré obrazovce
 * v nastaveni_ui.js — tahle se kreslí jen při přihlášení online.
 * ============================================================ */

const SABL_DOKUMENTY = [
  { typ: 'nabidka', nazev: 'Šablona cenové nabídky OCK', kde: 'Kalkulace OCK → Vytvořit nabídku (Word)', jazyky: true },
  { typ: 'nabidkaProj', nazev: 'Šablona cenové nabídky PROJ (OVP-CN)', kde: 'Kalkulace PROJ → Vytvořit nabídku PROJ (Word)', jazyky: true },
  { typ: 'sod', nazev: 'Šablona smlouvy o dílo — REALIZACE (OCK)', kde: 'Krycí list OCK', jazyky: true },
  { typ: 'sodProj', nazev: 'Šablona smlouvy o dílo — PROJEKČNÍ PRÁCE', kde: 'Krycí list PROJ', jazyky: true },
  { typ: 'plnaMoc', nazev: 'Šablona plné moci', kde: 'Krycí list OCK · vždy česky', jazyky: false },
];
const SABL_JAZYKY = [['en', 'Angličtina'], ['de', 'Němčina'], ['fr', 'Francouzština']];
const SABL_JAZYK_NAZEV = { cz: 'česky', en: 'anglicky', de: 'německy', fr: 'francouzsky' };
/* Pod tímhle podílem odstavců v cílovém jazyce se soubor za ten jazyk nepovažuje. */
const SABL_JAZYK_PRAH = 0.5;

const SABL_UI = { vybrany: 'nabidka', pruvodce: null, prace: '' };

function sablDok(typ) { return SABL_DOKUMENTY.find(d => d.typ === typ) || SABL_DOKUMENTY[0]; }
function sablRej() { return (typeof ONLINE_STAV !== 'undefined' && ONLINE_STAV.sablonyRejstrik) || null; }
function sablDatum(kdy) {
  const d = String(kdy || '').slice(0, 10).split('-');
  return d.length === 3 ? (+d[2]) + '. ' + (+d[1]) + '. ' + d[0] : '';
}
function sablStahnoutSoubor(data, nazev) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([data], {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }));
  a.download = nazev;
  document.body.appendChild(a); a.click(); a.remove();
}
function sablVyberSoubor() {
  return new Promise(res => {
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.docx';
    inp.onchange = () => {
      const f = inp.files[0]; if (!f) return res(null);
      f.arrayBuffer().then(data => res({ nazev: f.name, data }));
    };
    inp.click();
  });
}
function sablPrace(text) { SABL_UI.prace = text || ''; nastRefresh(); }

/* ---------- stav buněk ---------- */
function sablBunkaCz(rej, typ) {
  const m = sablonaPlatna(rej, typ);
  if (!m) return { cls: 'miss', label: 'chybí', sub: 'nezveřejněno' };
  return { cls: 'ok', label: '✓ v' + m.verze, sub: 'zveřejněno ' + sablDatum(m.kdy), soubor: m.nazev };
}
function sablBunkaJazyk(rej, typ, lang) {
  const st = sablonaMutaceStav(rej, typ, lang);
  const cz = sablonaPlatna(rej, typ);
  if (st.stav === 'chybi') return { cls: 'miss', label: 'chybí', sub: 'tiskne se česky', stav: st };
  if (st.stav === 'bezZdroje') return { cls: 'warn', label: '⚠ bez češtiny', sub: 'česká šablona chybí', stav: st };
  if (st.stav === 'zastarala')
    return { cls: 'warn sablona-zastarala', label: '⚠ ' + (st.zVerze ? 'z v' + st.zVerze : 'zastaralá'),
             sub: 'starší čeština – přegenerovat', soubor: st.meta && st.meta.nazev, stav: st };
  return { cls: 'ok', label: '✓ ' + (st.podleCasu ? 'v' + st.meta.verze : 'z v' + (cz ? cz.verze : '?')),
           sub: st.podleCasu ? 'zveřejněno ' + sablDatum(st.meta.kdy) : 'k platné češtině',
           soubor: st.meta && st.meta.nazev, stav: st };
}
/* Číslo „v10" je pořadí zveřejnění na serveru, ne číslo z názvu souboru —
 * proto se pod ním ukazuje i nahraný soubor (J. V. 25. 9. 2026: nahrál CN v12
 * a tabulka hlásila v10). */
function sablChip(b) {
  return `<span class="sabl-chip ${b.cls}">${esc(b.label)}</span><span class="sabl-sub">${esc(b.sub || '')}</span>`
    + (b.soubor ? `<span class="sabl-sub sabl-soubor" title="${esc(b.soubor)}">${esc(String(b.soubor).replace(/\.docx$/i, ''))}</span>` : '');
}

/* ---------- hlavní obrazovka ---------- */
function sablonySpravaHtml() {
  const rej = sablRej();
  if (!rej) return `<div class="sabl-banner">Rejstřík šablon se nepodařilo načíst ze serveru. Zkuste obnovit stránku;
    v přísném režimu se do té doby dokumenty ve Wordu nevytvoří.</div>`;
  const admin = jeAdmin();
  const zastarale = [];
  SABL_DOKUMENTY.filter(d => d.jazyky).forEach(d => SABL_JAZYKY.forEach(([l, n]) => {
    if (sablonaMutaceStav(rej, d.typ, l).stav === 'zastarala') zastarale.push(d.typ + '_' + l);
  }));
  const banner = zastarale.length ? `<div class="sabl-banner"><b>${zastarale.length} ${zastarale.length === 1
      ? 'jazyková verze vznikla' : 'jazykové verze vznikly'} ze starší české šablony.</b> V přísném režimu se z nich
      netiskne, dokud je administrátor nepřegeneruje (tlačítko „Přegenerovat" u dokumentu níže).</div>` : '';
  const radky = SABL_DOKUMENTY.map(d => {
    const bunky = [sablBunkaCz(rej, d.typ)].concat(SABL_JAZYKY.map(([l]) => d.jazyky
      ? sablBunkaJazyk(rej, d.typ, l) : { cls: 'na', label: '—', sub: '' }));
    return `<tr class="sabl-radek ${d.typ === SABL_UI.vybrany ? 'sabl-vybrany' : ''}" data-sabl-typ="${esc(d.typ)}"
        onclick="sablVyber('${escJs(d.typ)}')">
      <td><b>${esc(d.nazev)}</b><span class="sabl-sub">${esc(d.kde)}</span></td>
      ${bunky.map(b => `<td>${sablChip(b)}</td>`).join('')}</tr>`;
  }).join('');
  return `${banner}
    <table class="sabl-tab" aria-label="Šablony dokumentů podle jazyka">
      <thead><tr><th>Dokument</th><th>Čeština (zdroj)</th><th>Angličtina</th><th>Němčina</th><th>Francouzština</th></tr></thead>
      <tbody>${radky}</tbody></table>
    ${SABL_UI.prace ? `<div class="note" id="sablPrace"><b>${esc(SABL_UI.prace)}</b></div>` : ''}
    ${SABL_UI.pruvodce ? sablPruvodceHtml() : sablDetailHtml(rej, admin)}`;
}
function sablVyber(typ) {
  if (SABL_UI.pruvodce) return;           // během průvodce se dokument nemění
  SABL_UI.vybrany = sablDok(typ).typ;
  nastRefresh();
}

function sablDetailHtml(rej, admin) {
  const d = sablDok(SABL_UI.vybrany);
  const cz = sablonaPlatna(rej, d.typ);
  const verze = sablonaVerze(rej, d.typ);
  const jazyky = d.jazyky ? SABL_JAZYKY.map(([l, n]) => {
    const b = sablBunkaJazyk(rej, d.typ, l);
    const akce = !admin ? '' : `
      <button class="mini" ${cz ? '' : 'disabled'} onclick="sablPregeneruj('${escJs(d.typ)}','${l}')">${b.stav.stav === 'chybi' ? 'Vyrobit z češtiny' : 'Přegenerovat z češtiny'}</button>
      <button class="mini" ${cz ? '' : 'disabled'} onclick="sablNahrajJazyk('${escJs(d.typ)}','${l}')">Nahrát doladěný soubor</button>
      ${b.stav.meta ? `<button class="mini" onclick="sablStahni('${escJs(d.typ + '_' + l)}')">Stáhnout</button>` : ''}
      <button class="mini" ${cz ? '' : 'disabled'} onclick="sablChybejici('${escJs(d.typ)}','${l}')">Nepřeložené fráze (CSV)</button>`;
    return `<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;padding:6px 0;border-top:1px solid var(--line)">
      <span style="width:110px"><b>${esc(n)}</b></span><span style="min-width:170px">${sablChip(b)}</span>
      <span class="btns" style="margin:0">${akce}</span></div>`;
  }).join('') : '<div class="note">Plná moc je úřední dokument pro české úřady — tiskne se vždy česky.</div>';
  const historie = verze.length ? verze.map(v => `<div style="display:flex;gap:10px;font-size:12.5px;padding:3px 0;align-items:baseline">
      <b style="width:34px">v${esc(v.verze)}</b><span style="flex:1">${esc(v.nazev)} · ${esc(sablDatum(v.kdy))} · ${esc(v.zverejnil || '')}${v.poznamka ? ' · ' + esc(v.poznamka) : ''}</span>
      ${cz && v.verze === cz.verze ? '<span class="pill">platná</span>'
        : (admin ? `<button class="mini" onclick="sablVrat('${escJs(d.typ)}','${escJs(+v.verze)}')">Vrátit</button>` : '')}</div>`).join('')
    : '<div class="note">Žádná verze zatím nebyla zveřejněna.</div>';
  return `<div class="sabl-panel">
    <div style="display:flex;gap:16px;flex-wrap:wrap;align-items:flex-start;justify-content:space-between">
      <div><div class="note" style="margin:0">Vybraný dokument</div><h3 style="margin:2px 0 6px">${esc(d.nazev)}</h3>
        ${cz ? `<div>Platná česká verze <b>${esc(cz.verze)}</b> · <code>${esc(cz.nazev)}</code> · ${esc(sablDatum(cz.kdy))} · ${esc(cz.zverejnil || '')}</div>`
          : '<div><b>Česká šablona zatím není zveřejněná.</b> V přísném režimu se tento dokument nevytvoří.</div>'}</div>
      <div class="btns" style="margin:0">
        ${admin ? `<button class="primary" onclick="sablPruvodceStart('${escJs(d.typ)}')">Nahrát novou českou verzi…</button>` : ''}
        ${cz ? `<button class="mini" onclick="sablStahni('${escJs(d.typ)}')">Stáhnout .docx</button>` : ''}</div>
    </div>
    <div style="margin-top:12px"><b>Jazykové verze</b>${jazyky}</div>
    <div style="margin-top:12px"><b>Historie</b>${historie}</div>
  </div>`;
}

/* ---------- jednoduché akce ---------- */
function sablStahni(typ) {
  onlineSablonaStahni(typ).then(v => { if (v) sablStahnoutSoubor(v.data, v.nazev); })
    .catch(e => hlaska('Šablonu se nepodařilo stáhnout: ' + e.message));
}
async function sablVrat(typ, verze) {
  if (!jeAdmin()) return;
  verze = +verze;
  if (!await potvrd('Vrátit šablonu na verzi ' + verze + '?\n\nZveřejní se znovu jako nová verze; nic se nesmaže '
    + 'a všichni budou tisknout z ní.' + (/_/.test(typ) ? '' : '\nJazykové verze vyrobené z jiné češtiny se označí jako zastaralé.'))) return;
  sablPrace('Vracím verzi ' + verze + '…');
  try { const o = await onlineSablonaVrat(typ, verze); sablPrace('Hotovo: platná je verze ' + o.verze + ' (vrácená z v' + verze + ').'); }
  catch (e) { sablPrace(''); hlaska('Vrácení se nepovedlo: ' + e.message); }
}
async function sablChybejici(typ, lang) {
  try {
    const cz = await onlineSablonaStahni(typ); if (!cz) return;
    const stat = {};
    await docxPrelozSablonu(cz.data.slice(0), lang, stat);
    const csv = '\ufeff' + ['český text;překlad (' + lang.toUpperCase() + ')']
      .concat(stat.chybi.map(t => '"' + t.replace(/"/g, '""') + '";'))
      /* #350: odstavce se symbolem {{…}}, které slovník nezná — zůstanou česky
       * a do procent se nepočítají, proto se vypisují zvlášť. */
      .concat((stat.symbolove || []).map(t => '"' + t.replace(/"/g, '""') + '";(odstavec se symbolem)')).join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = 'sablona_' + typ + '_nepreloz_' + lang + '.csv';
    document.body.appendChild(a); a.click(); a.remove();
  } catch (e) { hlaska('Seznam nepřeložených frází se nepodařilo vytvořit: ' + e.message); }
}

/* Jazyková verze z PLATNÉ české šablony — vyrobí, ukáže pokrytí, zveřejní. */
async function sablPregeneruj(typ, lang) {
  if (!jeAdmin()) return;
  const cz = sablonaPlatna(sablRej(), typ);
  if (!cz) return hlaska('Nejdřív zveřejněte českou šablonu.');
  sablPrace('Vyrábím ' + lang.toUpperCase() + ' verzi z české verze ' + cz.verze + '…');
  try {
    const zdroj = await onlineSablonaStahni(typ);
    const stat = {};
    const blob = await docxPrelozSablonu(zdroj.data.slice(0), lang, stat);
    const data = await blob.arrayBuffer();
    const nazev = zdroj.nazev.replace(/\.docx$/i, '') + '_' + lang.toUpperCase() + '.docx';
    sablPrace('');
    if (!await potvrd(lang.toUpperCase() + ' verze je připravená: přeloženo ' + stat.procenta + ' % odstavců'
      + (stat.chybi.length ? ', ' + stat.chybi.length + ' zůstalo česky (seznam: „Nepřeložené fráze")' : '')
      + ((stat.symbolove || []).length ? '; česky zůstane i ' + stat.symbolove.length + ' odstavců se symbolem {{…}}' : '') + '.\n\n'
      + 'Zveřejnit ji k české verzi ' + cz.verze + '?')) return;
    sablPrace('Zveřejňuji…');
    const o = await onlineSablonaZverejni(typ + '_' + lang, nazev, data, 'vyrobeno z české verze ' + cz.verze, cz.otisk);
    sablPrace('Hotovo: ' + lang.toUpperCase() + ' verze ' + o.verze + ' k české verzi ' + cz.verze + '.');
  } catch (e) { sablPrace(''); hlaska('Jazykovou verzi se nepodařilo vyrobit: ' + e.message); }
}

/* Kontrola souboru, který má být v jazyce `lang` (cz / en / de / fr). */
async function sablKontrolaSouboru(data, lang, symbolyVzor) {
  const odstavce = await docxTextSablony(data);
  const jaz = sablonaJazykOdhad(odstavce);
  const symboly = sablonaSymboly(odstavce);
  const out = { jaz, symboly, rozdil: symbolyVzor ? sablonaSymbolyRozdil(symbolyVzor, symboly) : null, chyby: [], varovani: [] };
  if (!odstavce.length) out.chyby.push('V souboru není žádný text — je to šablona Word (.docx)?');
  /* Poškozená struktura (25. 9. 2026): Word by soubor otevřel jen s opravou. */
  if (typeof docxXmlVady === 'function') {
    const vady = await docxXmlVady(data);
    if (vady.length) out.chyby.push('Soubor je poškozený — Word by ho otevřel jen s opravou ('
      + vady.join('; ') + '). Otevřete ho ve Wordu, uložte znovu a nahrajte.');
  }
  if (!symboly.length) out.chyby.push('Soubor nemá žádné symboly {{…}} — aplikace by do něj nic nedosadila.');
  const podilCil = jaz.zarazeno ? (jaz.pocty[lang] || 0) / jaz.zarazeno : 0;
  if (jaz.jazyk && jaz.jazyk !== lang && jaz.podil >= SABL_JAZYK_PRAH)
    out.jinyJazyk = jaz.jazyk;
  else if (jaz.zarazeno && podilCil < SABL_JAZYK_PRAH)
    out.varovani.push('Jen ' + Math.round(podilCil * 100) + ' % odstavců je ' + SABL_JAZYK_NAZEV[lang] + '.');
  if (out.rozdil && out.rozdil.ubylo.length)
    out.varovani.push('Proti platné české verzi chybí symboly: ' + out.rozdil.ubylo.join(', ') + ' — tyto údaje se do dokumentu nedosadí.');
  return out;
}

/* Doladěný soubor přímo k jazyku (#348). */
async function sablNahrajJazyk(typ, lang, predvybrany) {
  if (!jeAdmin()) return;
  const cz = sablonaPlatna(sablRej(), typ);
  if (!cz) return hlaska('Nejdřív zveřejněte českou šablonu.');
  const soubor = predvybrany || await sablVyberSoubor(); if (!soubor) return;
  sablPrace('Kontroluji ' + soubor.nazev + '…');
  try {
    const vzor = sablonaSymboly(await docxTextSablony((await onlineSablonaStahni(typ)).data));
    const k = await sablKontrolaSouboru(soubor.data, lang, vzor);
    sablPrace('');
    if (k.chyby.length) return hlaska('Soubor nejde použít:\n– ' + k.chyby.join('\n– '));
    if (k.jinyJazyk)
      return hlaska('Soubor „' + soubor.nazev + '" je ' + SABL_JAZYK_NAZEV[k.jinyJazyk] + ' ('
        + Math.round(k.jaz.podil * 100) + ' % odstavců), ne ' + SABL_JAZYK_NAZEV[lang] + '. Zvolte správný soubor.');
    if (!await potvrd('Zveřejnit „' + soubor.nazev + '" jako ' + lang.toUpperCase() + ' verzi k české verzi ' + cz.verze + '?'
      + (k.varovani.length ? '\n\nUpozornění:\n– ' + k.varovani.join('\n– ') : ''))) return;
    sablPrace('Zveřejňuji…');
    const o = await onlineSablonaZverejni(typ + '_' + lang, soubor.nazev, soubor.data,
      'doladěný soubor k české verzi ' + cz.verze, cz.otisk);
    sablPrace('Hotovo: ' + lang.toUpperCase() + ' verze ' + o.verze + ' k české verzi ' + cz.verze + '.');
  } catch (e) { sablPrace(''); hlaska('Zveřejnění se nepovedlo: ' + e.message); }
}

/* ---------- průvodce novou českou verzí ---------- */
async function sablPruvodceStart(typ, predvybrany) {
  if (!jeAdmin()) return;
  const soubor = predvybrany || await sablVyberSoubor(); if (!soubor) return;
  const d = sablDok(typ);
  SABL_UI.pruvodce = { typ: d.typ, krok: 'kontrola', soubor, kontrola: null, mutace: {}, vybrane: {}, poznamka: '' };
  sablPrace('Kontroluji ' + soubor.nazev + '…');
  try {
    let vzor = null;
    if (sablonaPlatna(sablRej(), d.typ))
      vzor = sablonaSymboly(await docxTextSablony((await onlineSablonaStahni(d.typ)).data));
    SABL_UI.pruvodce.kontrola = await sablKontrolaSouboru(soubor.data, 'cz', vzor);
  } catch (e) {
    SABL_UI.pruvodce.kontrola = { chyby: ['Soubor se nepodařilo přečíst: ' + e.message], varovani: [], symboly: [], jaz: {} };
  }
  sablPrace('');
}
function sablPruvodceZrus() { SABL_UI.pruvodce = null; SABL_UI.prace = ''; nastRefresh(); }

function sablPruvodceHtml() {
  const p = SABL_UI.pruvodce, d = sablDok(p.typ), k = p.kontrola;
  const kroky = ['Soubor', 'Kontrola', d.jazyky ? 'Jazykové verze' : null, 'Zveřejnit'].filter(Boolean);
  const aktIdx = p.krok === 'kontrola' ? 1 : (d.jazyky ? 2 : 3);
  const hlavicka = `<div class="sabl-kroky">${kroky.map((n, i) =>
    `<span class="${i < aktIdx ? 'hot' : (i === aktIdx ? 'akt' : '')}">${i + 1} · ${esc(n)}</span>`).join('')}</div>
    <div><b>${esc(d.nazev)} — nová česká verze</b> · <code>${esc(p.soubor.nazev)}</code>
      <span class="note">(${esc(Math.round(p.soubor.data.byteLength / 1024))} kB · zatím nic nezveřejněno)</span></div>`;
  if (!k) return `<div class="sabl-panel" id="sablPruvodce">${hlavicka}<div class="note">Kontroluji…</div></div>`;
  if (p.krok === 'kontrola') {
    const lze = !k.chyby.length && !k.jinyJazyk;
    const jinyLang = k.jinyJazyk && k.jinyJazyk !== 'cz' && d.jazyky ? k.jinyJazyk : null;
    const radky = [];
    radky.push(k.jinyJazyk ? `<div class="sabl-kontrola"><b class="chyba">✕</b><span>Jazyk: soubor je <b>${esc(SABL_JAZYK_NAZEV[k.jinyJazyk])}</b>
        (${Math.round(k.jaz.podil * 100)} % odstavců), ne česky.</span></div>`
      : `<div class="sabl-kontrola"><b class="ok">✓</b><span>Jazyk: česky${k.jaz && k.jaz.zarazeno ? ' (' + Math.round((k.jaz.pocty.cz || 0) / k.jaz.zarazeno * 100) + ' % odstavců)' : ''}</span></div>`);
    radky.push(k.symboly && k.symboly.length ? `<div class="sabl-kontrola"><b class="ok">✓</b><span>Symboly: ${k.symboly.length} různých {{…}}</span></div>` : '');
    if (k.rozdil) {
      const r = k.rozdil;
      radky.push(!r.pribylo.length && !r.ubylo.length
        ? '<div class="sabl-kontrola"><b class="ok">✓</b><span>Symboly stejné jako v platné verzi</span></div>'
        : `<div class="sabl-kontrola"><b class="${r.ubylo.length ? 'warn' : 'ok'}">${r.ubylo.length ? '⚠' : 'i'}</b><span>Proti platné verzi:
            ${r.pribylo.length ? 'přibylo ' + esc(r.pribylo.join(', ')) : ''}${r.pribylo.length && r.ubylo.length ? '; ' : ''}
            ${r.ubylo.length ? '<b>chybí ' + esc(r.ubylo.join(', ')) + '</b> (tyto údaje se nedosadí)' : ''}</span></div>`);
    }
    k.chyby.forEach(t => radky.push(`<div class="sabl-kontrola"><b class="chyba">✕</b><span>${esc(t)}</span></div>`));
    k.varovani.forEach(t => radky.push(`<div class="sabl-kontrola"><b class="warn">⚠</b><span>${esc(t)}</span></div>`));
    return `<div class="sabl-panel" id="sablPruvodce">${hlavicka}
      ${k.jinyJazyk ? `<div class="sabl-chyba"><b>Soubor je ${esc(SABL_JAZYK_NAZEV[k.jinyJazyk])}, ne česky.</b> Česká šablona je zdroj,
        ze kterého se vyrábějí všechny jazyky — kdyby se zveřejnila tahle, české dokumenty by vyšly ${esc(SABL_JAZYK_NAZEV[k.jinyJazyk])}.
        ${jinyLang ? '<div class="btns" style="margin-top:8px"><button class="primary" onclick="sablPruvodceJakoJazyk()">Uložit jako '
          + esc(jinyLang.toUpperCase()) + ' verzi</button></div>' : ''}</div>` : ''}
      <div style="margin-top:8px">${radky.join('')}</div>
      <div class="btns" style="margin-top:10px">
        <button onclick="sablPruvodceZrus()">Zrušit</button>
        <button onclick="sablPruvodceJinySoubor()">Vybrat jiný soubor</button>
        <button class="primary" ${lze ? '' : 'disabled'} onclick="sablPruvodceDal()">Pokračovat</button></div></div>`;
  }
  /* krok jazyky / zveřejnit */
  const karty = d.jazyky ? SABL_JAZYKY.map(([l, n]) => {
    const m = p.mutace[l];
    const chybaVl = p.vlastniChyba && p.vlastniChyba[l];
    const obsah = !m ? '<div class="note">Vyrábím…</div>'
      : m.vlastni
      ? `<div>Vlastní soubor: <b>${esc(m.nazev)}</b></div>
         ${(m.varovani || []).map(t => `<div class="note" style="color:var(--warn)">⚠ ${esc(t)}</div>`).join('')}`
      : m.chyba
      ? `<div class="sabl-chyba">${esc(m.chyba)}</div>`
      : `<div>Přeloženo <b>${m.stat.procenta} %</b> odstavců${m.stat.chybi.length ? `, <b>${m.stat.chybi.length}</b> zůstalo česky` : ''}.</div>
         ${(m.stat.symbolove || []).length ? `<div class="note" style="color:var(--warn)">Česky zůstane i ${m.stat.symbolove.length} odstavců se symbolem {{…}} (např. cena nebo platby) — jsou v seznamu „Nepřeložené fráze".</div>` : ''}
         ${m.stat.procenta < 90 ? '<div class="note" style="color:var(--warn)">Slovník tento dokument zatím nepokrývá — verze by vyšla z velké části česky.</div>' : ''}`;
    /* NAHRÁT VLASTNÍ VERZI (25. 9. 2026, zadání J. V.: „při nahrávání šablon
     * přidej možnost nahrát vlastní verzi jazykové mutace"). Soubor doladěný
     * ve Wordu (nebo přeložený překladatelem) nahradí strojový překlad ještě
     * před zveřejněním; projde stejnou kontrolou jako nahrání k jazyku. */
    const tlVlastni = m ? `<button class="mini" onclick="sablPruvodceVlastni('${l}')">${m.vlastni ? 'Nahrát jiný soubor' : 'Nahrát vlastní verzi'}</button>` : '';
    const tlZpet = (m && m.vlastni && m.stroj) ? `<button class="mini" onclick="sablPruvodceVlastniZpet('${l}')">Vrátit překlad aplikace</button>` : '';
    return `<div class="sabl-panel" style="margin:0;flex:1;min-width:220px">
      <label style="display:flex;gap:8px;align-items:center"><input type="checkbox" id="sablVyb-${l}" ${p.vybrane[l] ? 'checked' : ''}
        ${m && !m.chyba ? '' : 'disabled'} onchange="sablPruvodceVyber('${l}', this.checked)"> <b>${esc(n)}</b></label>${obsah}
      ${chybaVl ? `<div class="sabl-chyba">${esc(chybaVl)}</div>` : ''}
      ${m ? `<div class="btns" style="margin-top:6px">${m.chyba ? '' : `<button class="mini" onclick="sablPruvodceStahniMutaci('${l}')">${m.vlastni ? 'Stáhnout' : 'Stáhnout a doladit ve Wordu'}</button>`}
        ${tlVlastni}${tlZpet}</div>` : ''}
    </div>`;
  }).join('') : '';
  const vybrane = SABL_JAZYKY.filter(([l]) => p.vybrane[l]).map(([l]) => l.toUpperCase());
  return `<div class="sabl-panel" id="sablPruvodce">${hlavicka}
    ${d.jazyky ? `<div class="note">Jazykové verze aplikace vyrobila z nové češtiny. Zaškrtnuté se zveřejní spolu s ní;
      ostatní zůstanou, jak jsou (a označí se jako zastaralé). Místo překladu aplikace můžete u jazyka
      <b>nahrát vlastní verzi</b> (doladěnou ve Wordu nebo od překladatele); doladěný soubor lze nahrát i později přímo k jazyku.</div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin:8px 0">${karty}</div>` : ''}
    <div class="row" style="margin-top:8px"><label for="sablPozn">Poznámka ke změně</label>
      <input type="text" id="sablPozn" value="${esc(p.poznamka)}" onchange="SABL_UI.pruvodce.poznamka=this.value"></div>
    <div class="btns" style="margin-top:10px">
      <button onclick="sablPruvodceZrus()">Zrušit</button>
      <button class="primary" onclick="sablPruvodceZverejni()">Zveřejnit najednou: čeština${vybrane.length ? ' + ' + esc(vybrane.join(' + ')) : ''}</button></div>
  </div>`;
}
async function sablPruvodceJinySoubor() {
  const typ = SABL_UI.pruvodce && SABL_UI.pruvodce.typ;
  SABL_UI.pruvodce = null;
  if (typ) await sablPruvodceStart(typ);
}
async function sablPruvodceJakoJazyk() {
  const p = SABL_UI.pruvodce; if (!p || !p.kontrola || !p.kontrola.jinyJazyk) return;
  const lang = p.kontrola.jinyJazyk, typ = p.typ, soubor = p.soubor;
  SABL_UI.pruvodce = null; nastRefresh();
  await sablNahrajJazyk(typ, lang, soubor);
}
/* Vlastní soubor místo strojového překladu (25. 9. 2026). Kontrola je táž
 * jako u nahrání k jazyku: soubor musí být šablona se symboly, v tom
 * jazyce, a proti NOVÉ české verzi (ne proti té platné) se hlídá, jestli mu
 * nechybí symboly. Strojový překlad se schová, aby šel vrátit. */
async function sablPruvodceVlastni(l, predvybrany) {
  const p = SABL_UI.pruvodce; if (!p || !jeAdmin()) return;
  const soubor = predvybrany || await sablVyberSoubor(); if (!soubor || SABL_UI.pruvodce !== p) return;
  if (!p.vlastniChyba) p.vlastniChyba = {};
  delete p.vlastniChyba[l];
  sablPrace('Kontroluji ' + soubor.nazev + '…');
  try {
    const vzor = (p.kontrola && p.kontrola.symboly) || null;
    const k = await sablKontrolaSouboru(soubor.data, l, vzor);
    if (k.chyby.length) p.vlastniChyba[l] = 'Soubor nejde použít: ' + k.chyby.join(' ');
    else if (k.jinyJazyk)
      p.vlastniChyba[l] = 'Soubor „' + soubor.nazev + '" je ' + SABL_JAZYK_NAZEV[k.jinyJazyk] + ' ('
        + Math.round(k.jaz.podil * 100) + ' % odstavců), ne ' + SABL_JAZYK_NAZEV[l] + '.';
    else {
      const puvodni = p.mutace[l];
      p.mutace[l] = { data: soubor.data, nazev: soubor.nazev, vlastni: true,
                      varovani: k.varovani.map(t => t.replace('platné české verzi', 'nové české verzi')),
                      stroj: (puvodni && puvodni.vlastni) ? puvodni.stroj : puvodni };
      p.vybrane[l] = true;
    }
  } catch (e) { p.vlastniChyba[l] = 'Soubor se nepodařilo přečíst: ' + e.message; }
  sablPrace('');
}
function sablPruvodceVlastniZpet(l) {
  const p = SABL_UI.pruvodce, m = p && p.mutace[l];
  if (!m || !m.vlastni || !m.stroj) return;
  p.mutace[l] = m.stroj;
  if (p.vlastniChyba) delete p.vlastniChyba[l];
  nastRefresh();
}
function sablPruvodceVyber(l, ano) { if (SABL_UI.pruvodce) SABL_UI.pruvodce.vybrane[l] = !!ano; nastRefresh(); }
function sablPruvodceStahniMutaci(l) {
  const p = SABL_UI.pruvodce, m = p && p.mutace[l];
  if (m && m.data) sablStahnoutSoubor(m.data, m.nazev);
}
async function sablPruvodceDal() {
  const p = SABL_UI.pruvodce; if (!p) return;
  p.krok = 'jazyky';
  const d = sablDok(p.typ);
  nastRefresh();
  if (!d.jazyky) return;
  const rej = sablRej();
  for (const [l] of SABL_JAZYKY) {
    try {
      const stat = {};
      const blob = await docxPrelozSablonu(p.soubor.data.slice(0), l, stat);
      p.mutace[l] = { data: await blob.arrayBuffer(), stat,
                      nazev: p.soubor.nazev.replace(/\.docx$/i, '') + '_' + l.toUpperCase() + '.docx' };
      /* Výchozí výběr: jazyky, které už na serveru jsou — aby po nové
       * češtině nezůstaly pozadu. Nový jazyk si administrátor zaškrtne sám. */
      p.vybrane[l] = !!sablonaPlatna(rej, p.typ + '_' + l);
    } catch (e) { p.mutace[l] = { chyba: e.message }; }
    if (SABL_UI.pruvodce !== p) return;
    nastRefresh();
  }
}
async function sablPruvodceZverejni() {
  const p = SABL_UI.pruvodce; if (!p || !jeAdmin()) return;
  const el = document.getElementById('sablPozn'); if (el) p.poznamka = el.value;
  const jazyky = SABL_JAZYKY.map(([l]) => l).filter(l => p.vybrane[l] && p.mutace[l] && p.mutace[l].data);
  if (!await potvrd('Zveřejnit „' + p.soubor.nazev + '" jako platnou českou šablonu'
    + (jazyky.length ? ' spolu s ' + jazyky.map(l => l.toUpperCase()).join(', ') : '') + '?\n\nOd této chvíle z ní tisknou všichni přihlášení.')) return;
  sablPrace('Zveřejňuji českou šablonu…');
  const vysledky = [];
  try {
    const o = await onlineSablonaZverejni(p.typ, p.soubor.nazev, p.soubor.data, p.poznamka);
    vysledky.push('čeština v' + o.verze);
    for (const l of jazyky) {
      sablPrace('Zveřejňuji ' + l.toUpperCase() + '…');
      try {
        const m = p.mutace[l];
        const oj = await onlineSablonaZverejni(p.typ + '_' + l, m.nazev, m.data,
          (m.vlastni ? 'vlastní soubor k české verzi ' : 'vyrobeno z české verze ') + o.verze
          + (p.poznamka ? ' – ' + p.poznamka : ''), o.otisk);
        vysledky.push(l.toUpperCase() + ' v' + oj.verze);
      } catch (e) { vysledky.push(l.toUpperCase() + ': ' + e.message); }
    }
    SABL_UI.pruvodce = null;
    sablPrace('Hotovo: ' + vysledky.join(' · '));
  } catch (e) { sablPrace(''); hlaska('Zveřejnění se nepovedlo: ' + e.message); }
}

if (typeof module !== 'undefined')
  module.exports = { SABL_DOKUMENTY, SABL_JAZYKY, sablBunkaCz, sablBunkaJazyk };
