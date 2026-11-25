/* ============================================================
 * ODESLÁNÍ NABÍDKY DO PIPEDRIVE — KARTA V LIŠTĚ ZÁMKU (PO #116 CRM-17)
 *
 * Rozhodnutí J. V. 24. 11. 2026: první tisk cenové nabídky (OCK i PROJ, Word
 * i tisk) = odeslání. Po uložení zámku na server karta ukáže tabulku
 * „dnes v Pipedrive / nově“ (pole krycího listu, číslo nabídky, hodnota
 * dealu, fáze jen dopředu, poznámka) a po POTVRZENÍ obchodníkem zapíše;
 * vygenerovaný Word přiloží k dealu. Náhled i zápis skládá SERVER
 * (functions/pd_odeslani.mjs) z uložené zakázky; prohlížeč posílá jen
 * popisky zdroje a soubor Wordu. Tisk se tím NIKDY neblokuje: bez dealu,
 * bez práva, offline nebo s vypnutým zápisem karta jen řekne proč.
 * Dotisk nic sám nezapisuje — zápis i přiložení jdou z karty na výslovnou
 * žádost (tlačítko). Word se drží jen v paměti okna (po obnovení stránky
 * ho jde přiložit jen ručně v Pipedrive).
 * ============================================================ */
const ODESL_PD_TYPY = ['nabidka', 'nabidkaTisk', 'nabidkaProj', 'nabidkaProjTisk'];
const ODESL_PD = { zak: null, varId: '', nacita: false, chyba: '', info: '', data: null, telo: null, soubory: {} };

function odeslPdMuze() {
  return typeof pdnUiOnline === 'function' && pdnUiOnline() && !(typeof pdnUiSmi === 'function' && !pdnUiSmi())
    && typeof ONLINE_STAV !== 'undefined' && !!ONLINE_STAV.soubor;
}
function odeslPdOdeslana(v) {
  return !!(v && v.zamek && v.zamek.zamceno === true && ODESL_PD_TYPY.includes(v.zamek.typ));
}
function odeslPdReset(v) {
  if (ODESL_PD.zak !== ZAK || ODESL_PD.varId !== (v && v.id)) {
    Object.assign(ODESL_PD, { zak: ZAK, varId: v ? v.id : '', nacita: false, chyba: '', info: '', data: null, telo: null });
  }
}

/* Word z tlačítka „Word“ (zakazka_ui / nabidka_proj_ui) — jen v paměti okna.
 * Revize PO R6: vázaný na zakázku (ONLINE_STAV.soubor) a variantu, ne na
 * objekt ZAK — onlineOtevri po pokusu o zápis ZAK vymění a Word musí zůstat
 * pro opakování. Zámek se ověří až při přiložení (zamekKdy z prvního zámku). */
function odeslPdKlic(varId) {
  return (typeof ONLINE_STAV !== 'undefined' && ONLINE_STAV.soubor ? ONLINE_STAV.soubor : '') + '|' + varId;
}
function odeslPdSoubor(varId, blob) {
  if (!varId || !blob || typeof ONLINE_STAV === 'undefined' || !ONLINE_STAV.soubor) return;
  ODESL_PD.soubory = { [odeslPdKlic(varId)]: { blob, zamekKdy: '' } };
}
function odeslPdBlob(v) {
  const x = v && ODESL_PD.soubory[odeslPdKlic(v.id)];
  if (!x) return null;
  if (!x.zamekKdy && v.zamek && v.zamek.kdy) x.zamekKdy = v.zamek.kdy;   // první zámek po stažení Wordu
  return x.zamekKdy && v.zamek && x.zamekKdy === v.zamek.kdy ? x.blob : null;
}
/* VZ (revize PO R4): první tisk pro DALŠÍHO zákazníka do dealu řídícího nepíše. */
function odeslPdJinyZakaznik(v) {
  const t = v && v.zamek && Array.isArray(v.zamek.tisky) ? v.zamek.tisky[0] : null;
  const k = t && t.zakaznik;
  if (!k || !k.id) return '';
  const rid = typeof vzRidiciId === 'function' ? vzRidiciId(ZAK) : '';
  return rid && String(k.id) === String(rid) ? '' : String(k.cislo || k.pismeno || k.id);
}
function odeslPdStavVarianty(v) {
  const r = ZAK && ZAK.pdOdeslani;
  const e = r && r.varianty && v ? r.varianty[v.id] : null;
  return e && e.zamekKdy === v.zamek.kdy ? e : null;
}

/* Volá zamekPoTisku po PRVNÍM zámku varianty (`ulozeni` = slib uložení zámku). */
function odeslPdPoZamku(v, typ, ulozeni) {
  if (!v || !ODESL_PD_TYPY.includes(typ)) return;
  ODESL_PD.zak = null; odeslPdReset(v);
  const jiny = odeslPdJinyZakaznik(v);
  if (jiny) { ODESL_PD.info = 'Nabídka odešla dalšímu zákazníkovi (' + jiny + ') — deal vede řídící zákazník, do Pipedrive se nic nezapisuje.'; render(); return; }
  if (!ZAK.pdDealId) { ODESL_PD.info = 'Zakázka není navázaná na deal v Pipedrive — do Pipedrive se nic nezapsalo (nabídka platí).'; render(); return; }
  if (!odeslPdMuze()) {
    ODESL_PD.info = 'Zápis odeslání do Pipedrive jde jen online s právem „Pipedrive: čtení a zápis do vlastních obchodních případů“ — do Pipedrive se nic nezapsalo.';
    render(); return;
  }
  Promise.resolve(ulozeni).catch(() => false).then(() => odeslPdNahled(1));
}

function odeslPdTelo(v, akce) {
  const pod = typeof pdnPodklad === 'function' ? pdnPodklad(ZAK, typeof JEKLY !== 'undefined' ? JEKLY : null, {}) : null;
  return { soubor: ONLINE_STAV.soubor, varianta: v.id, zamekKdy: v.zamek.kdy, akce, zdroje: (pod && pod.zdroje) || {} };
}

function odeslPdNahled(opakovat) {
  const v = aktivniVarianta(ZAK);
  if (!odeslPdOdeslana(v) || ODESL_PD.nacita || !odeslPdMuze()) return Promise.resolve(false);
  odeslPdReset(v);
  const telo = odeslPdTelo(v, 'nahled');
  ODESL_PD.nacita = true; ODESL_PD.chyba = ''; ODESL_PD.info = ''; render();
  return onlineApi('/api/pd/odeslani', telo)
    .then(d => { ODESL_PD.data = d; ODESL_PD.telo = telo; return true; })
    .catch(e => {
      ODESL_PD.data = null;
      /* Zámek se možná ještě ukládá — jednou zkusit znovu za chvíli. */
      if (opakovat && e && e.data && e.data.kod === 'zamekNeulozen') return 'znovu';
      ODESL_PD.chyba = (e && e.message) || String(e);
      return false;
    })
    .then(x => {
      ODESL_PD.nacita = false; render();
      if (x === 'znovu') return new Promise(h => setTimeout(h, 2000)).then(() => odeslPdNahled(0));
      return x;
    });
}

function odeslPdBase64(blob) {
  return blob.arrayBuffer().then(buf => {
    const b = new Uint8Array(buf);
    let s = '';
    for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000));
    return btoa(s);
  });
}

async function odeslPdPriloz(v, ticho) {
  const blob = odeslPdBlob(v);
  if (!blob) return '';
  try {
    const o = await onlineApi('/api/pd/odeslani', Object.assign(odeslPdTelo(v, 'soubor'), { zdroje: undefined, obsah: await odeslPdBase64(blob) }));
    return o.uz ? 'Soubor nabídky už u dealu je.' : 'Word nabídky přiložen k dealu (' + (o.nazev || '') + ').';
  } catch (e) {
    const t = 'Word se k dealu nepřiložil: ' + ((e && e.message) || String(e));
    if (!ticho) throw new Error(t);
    return t;
  }
}

async function odeslPdZapis() {
  const d = ODESL_PD.data, t = ODESL_PD.telo, v = aktivniVarianta(ZAK);
  if (!d || !t || ODESL_PD.nacita || !v) return;
  if (typeof nahledStop === 'function' && nahledStop('zápis odeslání do Pipedrive')) return;
  const posle = (d.radky || []).filter(r => r.posle).map(r => '· ' + r.nazev + ': ' + (r.vCrm || '(prázdné)') + ' → ' + r.hodnotaText);
  const otazka = 'Zapsat odeslání nabídky ' + (d.cislo || '') + ' do dealu ' + d.deal.id + ' v Pipedrive?\n\n'
    + (posle.length ? posle.join('\n') : 'Údaje dealu už odpovídají — změní se jen poznámka.')
    + '\n\nK dealu se zapíše poznámka se souhrnem nabídky' + (odeslPdBlob(v) ? ' a přiloží se vygenerovaný Word' : '')
    + '. Stav dealu se nemění; fáze se posouvá jen dopředu.';
  if (!await potvrd(otazka, { nadpis: 'Odeslání nabídky do Pipedrive', ano: 'Zapsat', ne: 'Nezapisovat' })) return;
  ODESL_PD.nacita = true; render();
  const zpravy = []; let chyba = '', znovu = false;
  try {
    const o = await onlineApi('/api/pd/odeslani', Object.assign({}, t, { akce: 'zapis', otisk: d.otisk }));
    zpravy.push('Odeslání zapsáno do Pipedrive' + (o.zapsano && o.zapsano.length ? ': ' + o.zapsano.join(', ') : '') + '.');
    (o.varovani || []).filter(x => !/SIMULÁTOR/.test(x)).forEach(x => zpravy.push(x));
    const p = await odeslPdPriloz(v, true);
    if (p) zpravy.push(p);
  } catch (e) {
    chyba = (e && e.message) || String(e);
    znovu = !!(e && e.data && e.data.kod === 'zmeneno');
  }
  ODESL_PD.nacita = false; ODESL_PD.data = null;
  try { if (typeof onlineOtevri === 'function') await onlineOtevri(ONLINE_STAV.soubor); } catch (e) { /* zakázka zůstane, jak je */ }
  ODESL_PD.zak = ZAK; ODESL_PD.varId = v.id;
  ODESL_PD.info = zpravy.join(' ');
  if (chyba) await hlaska('Zápis do Pipedrive se nepovedl: ' + chyba + (znovu ? '' : '\n\nNabídka platí dál — zápis můžete zkusit znovu.'));
  if (znovu) await odeslPdNahled(0); else render();
}

async function odeslPdPrilozUI() {
  const v = aktivniVarianta(ZAK);
  if (!v || ODESL_PD.nacita) return;
  ODESL_PD.nacita = true; render();
  let t = '';
  try { t = await odeslPdPriloz(v, false); } catch (e) { t = e.message; }
  ODESL_PD.nacita = false;
  try { if (typeof onlineOtevri === 'function') await onlineOtevri(ONLINE_STAV.soubor); } catch (e) { /* beze změny */ }
  ODESL_PD.zak = ZAK; ODESL_PD.varId = v.id; ODESL_PD.info = t;
  render();
}

function odeslPdKrokText(k, nazev) {
  if (!k) return '';
  const kdy = k.kdy ? ' ' + String(k.kdy).slice(0, 10).split('-').reverse().map(x => String(+x)).join('. ') : '';
  if (k.stav === 'zapsano') return nazev + ': zapsáno' + kdy;
  if (k.stav === 'chyba') return nazev + ': NEPOVEDLO SE' + (k.duvod ? ' — ' + k.duvod : '');
  if (k.stav === 'zahajeno') return nazev + ': výsledek nepotvrzen (zkuste znovu)';
  return '';
}

function odeslPdTabulka(d) {
  const tr = (d.radky || []).filter(r => r.stav !== 'prazdne').map(r => {
    const nova = r.stav === 'zapise' || r.klic === 'datumNabidky' ? `<b>${esc(r.hodnotaText || '')}</b>` : '<span class="note">—</span>';
    const stitek = r.posle ? '<span class="pill">zapíše se</span>' : r.bezeZmeny ? '<span class="pill mut">beze změny</span>'
      : r.stav === 'ponechano' ? `<span class="pill mut">ponechá se</span>${r.duvod ? `<div class="note">${esc(r.duvod)}</div>` : ''}`
      : `<span class="pill bad">nezapíše se</span>${r.duvod ? `<div class="note">${esc(r.duvod)}</div>` : ''}`;
    return `<tr data-odeslpd-pole="${esc(r.klic)}" data-odeslpd-posle="${r.posle ? 1 : 0}"><td>${esc(r.nazev)}</td>
      <td class="note">${esc(r.vCrm || '')}</td><td>${nova}</td><td>${stitek}</td></tr>`;
  }).join('');
  return `<div style="overflow-x:auto"><table id="odeslPdTabulka" class="ceniktbl" style="font-size:11px"><thead><tr><th>Pole v Pipedrive</th>
    <th>Dnes v Pipedrive</th><th>Nově</th><th></th></tr></thead><tbody>${tr}</tbody></table></div>
    <details style="margin-top:4px"><summary class="note">Poznámka k dealu</summary><pre class="note" id="odeslPdPoznamka" style="white-space:pre-wrap">${esc(d.poznamka || '')}</pre></details>`;
}

/* Karta pod lištou zámku (renderZamekLista). Prázdná, není-li co ukázat. */
function odeslPdKarta() {
  if (typeof ZAK === 'undefined' || !ZAK) return '';
  const v = aktivniVarianta(ZAK);
  if (!odeslPdOdeslana(v)) return '';
  const rec = odeslPdStavVarianty(v);
  const pozn = ZAK.pdOdeslani && ZAK.pdOdeslani.poznamka;
  const jiny = odeslPdJinyZakaznik(v);
  const tento = ODESL_PD.zak === ZAK && ODESL_PD.varId === v.id;
  if (!tento && !rec && !(ZAK.pdDealId && odeslPdMuze())) return '';
  if (!tento) odeslPdReset(v);
  const kroky = rec ? [odeslPdKrokText(rec.pole, 'údaje dealu'), odeslPdKrokText(pozn, 'poznámka'), odeslPdKrokText(rec.soubor, 'soubor Wordu')].filter(Boolean) : [];
  const hlava = `<div class="note" id="odeslPdStav"><b>Odeslání do Pipedrive</b> (údaje krycího listu, číslo nabídky, hodnota dealu,
    fáze „Nabídka odeslána“ jen dopředu, poznámka${odeslPdBlob(v) ? ', Word' : ''}): ${kroky.length ? esc(kroky.join(' · ')) : 'nezapsáno'}</div>`;
  const info = ODESL_PD.info ? `<div class="note" id="odeslPdInfo"><b>${esc(ODESL_PD.info)}</b></div>` : '';
  const chybaBlok = ODESL_PD.chyba ? `<div class="note" id="odeslPdChyba" style="color:var(--red, #c0392b)">${esc(ODESL_PD.chyba)}</div>` : '';
  if (jiny) return `<div class="zamek-lista zamek-odeslpd" id="odeslPdKarta">${hlava}<div class="note" id="odeslPdJiny">Nabídka odešla dalšímu zákazníkovi (${esc(jiny)}) — deal vede řídící zákazník, do Pipedrive se nic nezapisuje.</div></div>`;
  if (!ZAK.pdDealId || !odeslPdMuze()) return `<div class="zamek-lista zamek-odeslpd" id="odeslPdKarta">${hlava}${info}</div>`;
  const d = ODESL_PD.data;
  const souborBtn = odeslPdBlob(v) && rec && rec.pole && rec.pole.stav === 'zapsano' && !(rec.soubor && rec.soubor.stav === 'zapsano')
    ? ` <button class="mini" id="odeslPdPriloz" onclick="odeslPdPrilozUI()" ${ODESL_PD.nacita ? 'disabled' : ''}>Přiložit Word k dealu</button>` : '';
  const btnNahled = `<button class="mini" id="odeslPdNahled" onclick="odeslPdNahled(0)" ${ODESL_PD.nacita ? 'disabled' : ''}>${ODESL_PD.nacita ? '⏳ Pracuji…'
    : d ? 'Načíst znovu' : rec && rec.pole && rec.pole.stav === 'zapsano' ? 'Porovnat s Pipedrive znovu' : rec ? 'Zkusit zápis znovu' : 'Ukázat, co se zapíše do Pipedrive'}</button>`;
  if (!d) return `<div class="zamek-lista zamek-odeslpd" id="odeslPdKarta"><span>${hlava}${info}${chybaBlok}</span><span class="sp"></span>${btnNahled}${souborBtn}</div>`;
  const nelze = d.zastaveno ? 'Zápis se neprovede: ' + d.zastaveno : !d.zapisPovolen ? 'Zápis do Pipedrive je na serveru vypnutý (PIPEDRIVE_ZAPIS) — nic se neodešle.' : '';
  return `<div class="zamek-odeslpd prod-karta" id="odeslPdKarta">${hlava}
    <div class="note">Deal ${esc(d.deal.id)} „${esc(d.deal.nazev)}“ · ${esc((typeof PDN_REZIM !== 'undefined' && PDN_REZIM[d.rezim]) || d.rezim || '')}.
      Zapíšou se jen pole označená „zapíše se“; nic se nemaže.</div>
    ${d.rezim === 'simulator' ? '<div class="note" style="color:var(--red, #c0392b)"><b>SIMULÁTOR PIPEDRIVE</b> — smyšlená data.</div>' : ''}
    ${nelze ? `<div class="note" id="odeslPdNelze" style="color:var(--red, #c0392b)"><b>${esc(nelze)}</b></div>` : ''}${info}${chybaBlok}
    ${odeslPdTabulka(d)}
    <div class="btns" style="margin:6px 0"><button class="primary" id="odeslPdZapsat" onclick="odeslPdZapis()" ${nelze || ODESL_PD.nacita ? 'disabled' : ''}>Potvrdit a zapsat do Pipedrive</button>
      ${btnNahled}${souborBtn}</div></div>`;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ODESL_PD, ODESL_PD_TYPY, odeslPdSoubor, odeslPdBlob, odeslPdPoZamku, odeslPdKarta, odeslPdOdeslana, odeslPdNahled, odeslPdZapis, odeslPdPrilozUI, odeslPdBase64, odeslPdJinyZakaznik };
}
