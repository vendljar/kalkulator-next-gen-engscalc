/* ============================================================
 * Nastavení → Mapa polí CRM (#114, CRM-15, 26. 10. 2026)
 *
 * Přehled, jak se pole kalkulace spárovala s vlastními poli Pipedrive.
 * Párování dělá server PŘESNĚ podle názvu a typu (netlify/lib/pd_mapa.mjs),
 * řádky přehledu skládá pdPrehledMapy a posílá /api/pd/pole jen
 * administrátorovi (obchodník dostane 403). Tady se jen kreslí:
 *   souhrn nahoře (počty podle stavu, barevné štítky), tlačítko „Obnovit
 *   z CRM" (vynucené nové načtení mapy), tabulka polí kalkulace × pole CRM
 *   a seznam nezařazených vlastních polí CRM.
 *
 * RUČNÍ PŘIŘAZENÍ SE NEDĚLÁ — název pole je dohoda s integrátorem;
 * přejmenované pole se má ukázat jako „chybí", ne opravit klikem.
 *
 * Načítá se z otevřené záložky (stejně jako Controlling): příznak `nacita`
 * se nastaví PŘED dotazem, jinak by překreslení během čekání spouštělo
 * další dotaz; ze souboru (file://) se na server neptá.
 * ============================================================ */

const PDM_STAV = { nacteno: false, nacita: false, chyba: '', data: null, jenProblemy: false };

const PDM_STAVY = {
  sparovano: { text: 'spárováno', pill: '', popis: 'pole v CRM je, název i typ sedí' },
  chybi: { text: 'chybí v CRM', pill: 'bad', popis: 'pole s dohodnutým názvem v Pipedrive není (nebo bylo přejmenované) — nečte se ani nezapisuje' },
  typNesedi: { text: 'jiný typ', pill: 'warn', popis: 'název sedí, ale typ pole v CRM je jiný — nečte se ani nezapisuje' },
  nejednoznacne: { text: 'dvakrát', pill: 'warn', popis: 'pole s tímhle názvem je v CRM víckrát — nečte se ani nezapisuje' },
};
const PDM_SMER = {
  cteni: 'čte se z CRM',
  zapis: 'zapisuje se do CRM',
  nic: 'jen zná (plní člověk nebo automatizace)',
};
/* Typy polí Pipedrive tak, jak je administrátor vidí v nastavení polí CRM. */
const PDM_TYPY = {
  varchar: 'Text', varchar_auto: 'Text (automatický)', text: 'Velký text', double: 'Číslo', date: 'Datum',
  enum: 'Jedna možnost', set: 'Více možností', monetary: 'Měna', user: 'Uživatel', people: 'Osoba',
  org: 'Organizace', phone: 'Telefon', address: 'Adresa', time: 'Čas', daterange: 'Rozsah dat',
  timerange: 'Rozsah času', varchar_options: 'Text s volbami',
};
function pdmTyp(t) {
  return String(t || '').split(' / ').filter(Boolean).map(x => PDM_TYPY[x] || x).join(' / ');
}

function pdmUiSmi() { return typeof jeAdminOnline === 'function' && jeAdminOnline(); }
function pdmUiServer() { return typeof onlineMozne !== 'function' || onlineMozne(); }
function pdmUiPrekresli() { if (typeof render === 'function') render(); }

function pdmUiNacti(obnovit) {
  if (!pdmUiSmi() || !pdmUiServer() || PDM_STAV.nacita) return Promise.resolve(false);
  PDM_STAV.nacita = true; PDM_STAV.chyba = '';
  if (obnovit) pdmUiPrekresli();
  return onlineApi('/api/pd/pole' + (obnovit ? '?obnovit=1' : ''))
    .then(d => { PDM_STAV.data = d; return true; })
    .catch(e => { PDM_STAV.chyba = (e && e.message) || String(e); return false; })
    .then(v => { PDM_STAV.nacita = false; PDM_STAV.nacteno = true; pdmUiPrekresli(); return v; });
}
/* Z kreslení se načítá přes setTimeout — zápis stavu uvnitř render() je smyčka. */
function pdmUiNactiBrzy() {
  if (PDM_STAV.nacteno || PDM_STAV.nacita || !pdmUiSmi() || !pdmUiServer()) return;
  PDM_STAV.nacita = true;
  setTimeout(() => { PDM_STAV.nacita = false; pdmUiNacti(false); }, 0);
}
function pdmUiObnov() { return pdmUiNacti(true); }
function pdmUiJenProblemy(v) { PDM_STAV.jenProblemy = !!v; pdmUiPrekresli(); }

function pdmUiSouhrn(p) {
  const s = p.souhrn || {};
  const stitek = (k, n) => `<span class="pill ${esc(PDM_STAVY[k].pill)}" data-pdm-souhrn="${k}" title="${esc(PDM_STAVY[k].popis)}">${esc(PDM_STAVY[k].text)}: ${n || 0}</span>`;
  return `<div id="pdmSouhrn" style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:6px 0">
      <b>${s.celkem || 0} polí kalkulace:</b>
      ${stitek('sparovano', s.sparovano)} ${stitek('chybi', s.chybi)} ${stitek('typNesedi', s.typNesedi)}
      ${stitek('nejednoznacne', s.nejednoznacne)}
      <span class="pill mut" data-pdm-souhrn="nezarazeno" title="vlastní pole v CRM, která kalkulátor nezná">nezařazená v CRM: ${s.nezarazeno || 0}</span>
    </div>`;
}

function pdmUiTabulka(p) {
  const radky = (p.radky || []).filter(r => !PDM_STAV.jenProblemy || r.stav !== 'sparovano');
  if (!radky.length) return '<div class="note">Žádné pole s problémem — všechna pole kalkulace jsou v CRM spárovaná.</div>';
  const tr = radky.map(r => {
    const st = PDM_STAVY[r.stav] || PDM_STAVY.chybi;
    let crm = '—';
    if (r.stav === 'sparovano') crm = `${esc(r.crmNazev)} <span class="note">(${esc(pdmTyp(r.crmTyp))})</span>`
      + (r.zapisovatelne === false && r.smer === 'zapis' ? ' <span class="pill warn" title="pole v CRM nejde zapisovat">jen ke čtení</span>' : '');
    else if (r.stav === 'typNesedi') crm = `${esc(r.crmNazev)} — v CRM <b>${esc(pdmTyp(r.crmTyp))}</b>, čeká se ${esc(pdmTyp(r.typ))}`;
    else if (r.stav === 'nejednoznacne') crm = `v CRM ${esc(r.pocet)}× stejný název`;
    else crm = 'v CRM není — založí integrátor pod tímto názvem';
    return `<tr data-pdm-pole="${esc(r.oblast + ':' + r.klic)}" data-pdm-stav="${esc(r.stav)}">
      <td>${esc(r.nazev)}${r.oblast === 'organizace' ? ' <span class="note">(organizace)</span>' : ''}</td>
      <td>${esc(pdmTyp(r.typ))}</td>
      <td>${esc(PDM_SMER[r.smer] || r.smer || '')}</td>
      <td>${esc((r.zdroj || []).join(' + ') || '—')}</td>
      <td><span class="pill ${esc(st.pill)}" title="${esc(st.popis)}">${esc(st.text)}</span></td>
      <td>${crm}</td></tr>`;
  }).join('');
  return `<div style="overflow-x:auto"><table id="pdmTabulka" class="ceniktbl"><thead><tr><th>Pole kalkulace (název v CRM)</th><th>Typ</th>
      <th>Směr</th><th>Zdroj</th><th>Stav</th><th>Pole v CRM</th></tr></thead><tbody>${tr}</tbody></table></div>`;
}

function pdmUiNezarazene(p) {
  const n = p.nezarazeno || [];
  if (!n.length) return '<div class="note" id="pdmNezarazene">Žádná nezařazená vlastní pole — kalkulátor zná všechna pole dealu v CRM.</div>';
  return `<div class="note">Vlastní pole dealu v Pipedrive, která kalkulátor nezná. Nic se do nich nezapisuje
      a nic se z nich nečte. Má-li kalkulátor některé používat, domluví se název s integrátorem a doplní se do mapy
      v kódu — přejmenované pole kalkulace najdete i tady.</div>
    <table id="pdmNezarazene" class="ceniktbl"><thead><tr><th>Název pole v CRM</th><th>Typ</th></tr></thead><tbody>
      ${n.map(x => `<tr data-pdm-nezarazeno><td>${esc(x.nazev)}</td><td>${esc(pdmTyp(x.typ))}</td></tr>`).join('')}
    </tbody></table>`;
}

function pdmUiChyba(d) {
  if (!PDM_STAV.chyba) return '';
  return `<div class="note" id="pdmChyba" style="color:var(--red, #c0392b)">Mapu polí se nepodařilo načíst z Pipedrive: ${esc(PDM_STAV.chyba)}${d ? ' Ukazuje se poslední načtená mapa.' : ''}</div>`;
}

function nastPdMapa() {
  if (!pdmUiSmi()) return `<div class="note">Mapa polí CRM je dostupná <b>jen administrátorovi přihlášenému online</b>.</div>`;
  if (!pdmUiServer()) return `<div class="note">Mapa polí se skládá na serveru — otevřete aplikaci z webu (ne ze souboru).</div>`;
  if (!PDM_STAV.nacteno) { pdmUiNactiBrzy(); return `<div class="note" id="pdmInfo">Načítám mapu polí z Pipedrive…</div>`; }
  const tlacitko = `<button class="primary" id="pdmObnov" onclick="pdmUiObnov()" ${PDM_STAV.nacita ? 'disabled' : ''}>
      ${PDM_STAV.nacita ? '⏳ Načítám z CRM…' : 'Obnovit z CRM'}</button>`;
  const d = PDM_STAV.data;
  if (!d) return `${pdmUiChyba(d)}<div class="btns">${tlacitko}</div>`;
  if (d.nastaveno === false) return `<div class="note" id="pdmChyba">${esc(d.chyba || 'Napojení na Pipedrive zatím není nastavené.')}</div>`;
  const p = d.prehled || { radky: [], nezarazeno: [], souhrn: {} };
  const kdy = d.poridano ? new Date(d.poridano) : null;
  const info = `Pole se párují <b>přesně podle názvu a typu</b> dohodnutého s integrátorem. Ruční přiřazení se nedělá:
      přejmenované pole v Pipedrive se tu ukáže jako „chybí v CRM". Mapa se drží den;
      ${kdy && !isNaN(kdy) ? 'načtena z CRM <b>' + esc(kdy.toLocaleString('cs-CZ')) + '</b>.' : ''}`;
  return `<div class="note" id="pdmInfo">${info}</div>
    ${pdmUiChyba(d)}
    ${pdmUiSouhrn(p)}
    <div class="btns" style="margin:8px 0">${tlacitko}
      <label style="margin-left:12px"><input type="checkbox" id="pdmJenProblemy" ${PDM_STAV.jenProblemy ? 'checked' : ''}
        onchange="pdmUiJenProblemy(this.checked)"> jen pole s problémem</label></div>
    ${card('Pole kalkulace × pole CRM', pdmUiTabulka(p), false, 'pdmKartaPole')}
    ${card('Nezařazená vlastní pole CRM', pdmUiNezarazene(p), false, 'pdmKartaNezarazene')}`;
}
