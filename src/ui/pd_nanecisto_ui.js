/* ============================================================
 * Krycí list → „Co by se zapsalo do Pipedrive" (#536, 27. 10. 2026)
 *
 * Suchý běh zápisu: tlačítko složí podklad z krycích listů řídící varianty
 * (pdnPodklad, src/pd_nanecisto.js), server ho převede TOUŽ logikou jako
 * budoucí zápis (#115) a vrátí tabulku pole v Pipedrive → hodnota → zdroj
 * v kalkulaci s upozorněním na nedopsaná pole, nepřevoditelné hodnoty
 * a kolize. NIC SE NEODESÍLÁ — server jen čte (mapu polí, případně deal).
 * Tabulku jde stáhnout jako CSV pro integrátora.
 *
 * Kdo: právo `crm.pipedrive` (matice zobrazení; server ho hlídá sám přes
 * pdPristup). Ze souboru (file://) a bez přihlášení se na server neptá.
 * Výsledek patří k zakázce, pro kterou se spustil — po přepnutí zakázky
 * se zahodí; po úpravě krycího listu se ukáže, že je třeba spustit znovu.
 * ============================================================ */

const PDN_UI = { nacita: false, chyba: '', data: null, zak: null, podklad: null, otisk: '' };

function pdnUiSmi() { return typeof smiZobrazit !== 'function' || smiZobrazit('crm.pipedrive'); }
function pdnUiOnline() {
  return (typeof onlineMozne !== 'function' || onlineMozne())
    && typeof ONLINE_STAV !== 'undefined' && !!(ONLINE_STAV && ONLINE_STAV.ja);
}
function pdnUiPrekresli() { if (typeof render === 'function') render(); }
function pdnUiOtisk(p) { try { return JSON.stringify([p.strany, p.dealId]); } catch (e) { return ''; } }

function pdnUiSpust() {
  if (PDN_UI.nacita || !pdnUiOnline()) return Promise.resolve(false);
  const p = pdnPodklad(ZAK, typeof JEKLY !== 'undefined' ? JEKLY : null);
  if (!p.ok) { PDN_UI.chyba = p.chyba; pdnUiPrekresli(); return Promise.resolve(false); }
  PDN_UI.nacita = true; PDN_UI.chyba = '';
  pdnUiPrekresli();
  return onlineApi('/api/pd/nanecisto', pdnTelo(p))
    .then(d => { PDN_UI.data = d; PDN_UI.zak = ZAK; PDN_UI.podklad = p; PDN_UI.otisk = pdnUiOtisk(p); return true; })
    .catch(e => { PDN_UI.chyba = (e && e.message) || String(e); PDN_UI.data = null; return false; })
    .then(v => { PDN_UI.nacita = false; pdnUiPrekresli(); return v; });
}

function pdnUiStahni() {
  const d = PDN_UI.data, p = PDN_UI.podklad;
  if (!d || !p) return;
  const verze = (typeof buildVerze === 'function' && buildVerze()) || '';
  const csv = pdnCsv({ radky: d.radky, varovani: (p.upozorneni || []).concat(d.varovani || []) }, {
    cislo: ZAK.cislo || '', nazevAkce: ZAK.nazevAkce || '', varianta: p.varianta.nazev || p.varianta.id,
    rezim: PDN_REZIM[d.rezim] || d.rezim, deal: d.deal ? d.deal.id : (p.dealId || ''), verze,
  });
  souborKeStazeni(nazevExportu('pipedrive-nanecisto', { cislo: ZAK.cislo }), csv, 'text/csv;charset=utf-8');
}

const PDN_REZIM = {
  pipedrive: 'proti skutečnému Pipedrive (jen čtení)',
  simulator: 'SIMULÁTOR Pipedrive — smyšlená data',
  dohoda: 'podle dohodnuté tabulky polí (bez napojení, neověřeno v CRM)',
};

function pdnUiTabulka(d, kde) {
  const tr = (d.radky || []).map(r => {
    const st = PDN_STAVY[r.stav] || PDN_STAVY.prazdne;
    const kolize = (r.kolize || []).map(k => `<div class="pill warn" data-pdn-kolize>${esc(k)}</div>`).join('');
    return `<tr data-pdn-pole="${esc(r.klic)}" data-pdn-stav="${esc(r.stav)}">
      <td>${esc(r.nazev)}</td>
      <td>${r.stav === 'zapise' ? `<b>${esc(r.hodnotaText)}</b>` : '<span class="note">—</span>'}</td>
      <td class="note">${esc(r.zdroj)}${r.hodnotaKalkulace && r.hodnotaKalkulace !== r.hodnotaText ? `<br>„${esc(r.hodnotaKalkulace)}"` : ''}</td>
      <td><span class="pill ${esc(st.pill)}" title="${esc(st.popis)}">${esc(st.text)}</span>
        ${r.duvod ? `<div class="note">${esc(r.duvod)}</div>` : ''}${kolize}</td>
      <td class="note">${esc(r.vCrm || '')}</td></tr>`;
  }).join('');
  return `<div style="overflow-x:auto"><table id="pdnTabulka_${kde}" class="ceniktbl"><thead><tr><th>Pole v Pipedrive</th>
      <th>Hodnota k zápisu</th><th>Zdroj v kalkulaci</th><th>Stav</th><th>Dnes v Pipedrive</th></tr></thead>
      <tbody>${tr}</tbody></table></div>`;
}

function pdnUiObsah(kde) {
  if (!pdnUiOnline()) return `<div class="note" id="pdnInfo_${kde}">Náhled zápisu se skládá na serveru — přihlaste se online
    (z webu, ne ze souboru).</div>`;
  /* Výsledek patří k zakázce, pro kterou se spustil. */
  if (PDN_UI.zak && PDN_UI.zak !== ZAK) { PDN_UI.data = null; PDN_UI.zak = null; PDN_UI.podklad = null; PDN_UI.chyba = ''; }
  const btn = `<button class="primary" id="pdnSpust_${kde}" onclick="pdnUiSpust()" ${PDN_UI.nacita ? 'disabled' : ''}>
      ${PDN_UI.nacita ? '⏳ Skládám náhled…' : (PDN_UI.data ? 'Spustit znovu' : 'Ukázat, co by se zapsalo')}</button>`;
  const d = PDN_UI.data;
  let stare = '';
  if (d && PDN_UI.podklad) {
    let ted = '';
    try { ted = pdnUiOtisk(pdnPodklad(ZAK, typeof JEKLY !== 'undefined' ? JEKLY : null)); } catch (e) { ted = ''; }
    if (ted && ted !== PDN_UI.otisk) stare = `<div class="note" id="pdnStare_${kde}" style="color:var(--red, #c0392b)">Zakázka se od
      spuštění náhledu změnila — spusťte ho znovu.</div>`;
  }
  const chybaBlok = PDN_UI.chyba ? `<div class="note" id="pdnChyba_${kde}" style="color:var(--red, #c0392b)">${esc(PDN_UI.chyba)}</div>` : '';
  if (!d) return `<div class="note" id="pdnInfo_${kde}">Ukáže, které údaje řídící varianty by kalkulace zapsala do obchodního
      případu v Pipedrive, s jakou hodnotou a odkud ji bere. <b>Nic se neodesílá</b> — zápis do Pipedrive zatím není
      zapnutý (#115).</div>${chybaBlok}<div class="btns">${btn}</div>`;
  const s = d.souhrn || {};
  const stitek = (k) => `<span class="pill ${esc(PDN_STAVY[k].pill)}" data-pdn-souhrn="${k}">${esc(PDN_STAVY[k].text)}: ${s[k] || 0}</span>`;
  const upoz = ((PDN_UI.podklad && PDN_UI.podklad.upozorneni) || []).concat(d.varovani || [])
    .map(t => `<li>${esc(t)}</li>`).join('');
  return `<div class="note" id="pdnInfo_${kde}"><b>Nic se neodeslalo.</b> Režim: ${esc(PDN_REZIM[d.rezim] || d.rezim)}${d.deal
      ? ` · obchodní případ ${esc(d.deal.id)} „${esc(d.deal.nazev)}"` : ''}.</div>
    ${d.rezim === 'simulator' ? `<div class="note" id="pdnSimulator_${kde}" style="color:var(--red, #c0392b)"><b>SIMULÁTOR PIPEDRIVE</b> — porovnání „dnes v Pipedrive" je ze smyšlených dat.</div>` : ''}
    ${stare}${chybaBlok}
    <div id="pdnSouhrn_${kde}" style="display:flex;flex-wrap:wrap;gap:6px;margin:6px 0">
      ${stitek('zapise')} ${stitek('nelze')} ${stitek('chybiPole')} ${stitek('neovereno')} ${stitek('prazdne')}
      <span class="pill warn" data-pdn-souhrn="kolize">kolize: ${s.kolize || 0}</span></div>
    ${upoz ? `<ul class="note" id="pdnUpozorneni_${kde}">${upoz}</ul>` : ''}
    <div class="btns" style="margin:8px 0">${btn}
      <button id="pdnStahni_${kde}" onclick="pdnUiStahni()">Stáhnout tabulku (CSV)</button></div>
    ${pdnUiTabulka(d, kde)}`;
}

/* Karta do krycího listu OCK i PROJ (stejný obsah — zapisuje se celá zakázka).
 * Oba krycí listy jsou v dokumentu zároveň, proto id s příponou `kde`
 * ('ock' / 'proj') — jinak by stejná id byla v DOM dvakrát. */
function pdnKarta(kde) {
  if (!pdnUiSmi()) return '';
  kde = kde === 'proj' ? 'proj' : 'ock';
  return `<div class="noprint" style="margin-top:14px" id="pdnKarta_${kde}">${card('Co by se zapsalo do Pipedrive (náhled, nic se neodesílá)', pdnUiObsah(kde), false, 'pdnKartaObsah_' + kde)}</div>`;
}
