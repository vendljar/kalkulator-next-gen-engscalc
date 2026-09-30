/* ============================================================
 * PLÁN PLATEB PROJEKCE — obrazovky (etapa B platebních podmínek, #367,
 * rozhodnutí J. V. 29. 9. 2026). Jádro (předvolby, dopočet, kontroly,
 * kontrola tvaru firemního plánu) je v src/plan_plateb.js; tady je jen
 * kreslení a zápis:
 *   – Nastavení → Smlouvy / Šablony: firemní výchozí plán (administrátor),
 *   – krycí list PROJ: plán zakázky a platby smlouvy o dílo.
 * ============================================================ */

/* ---------- Nastavení → Smlouvy / Šablony: firemní plán ----------
 * Firemní plán je VÝCHOZÍ pro zakázky: krycí list PROJ z něj bere katalog
 * milníků, výchozí předvolbu, zálohu a Standard po činnostech. Do už
 * odeslaných (zamčených) nabídek se nic nepropíše — ty tisknou snímek.
 * Zveřejňuje se s firemními údaji (firmaKZverejneni). Chybí-li, platí
 * výchozí z kódu (PLAN_PROJ_VYCHOZI). */

/* Všechny zápisy administrátora jdou přes pracovní kopii a firmaSet() —
 * stejné gesto jako ostatní firemní údaje (práva, značka ukázkových dat,
 * překreslení Nastavení). */
function planFirmaUpravit(fn) {
  if (!jeAdmin()) { hlaska('Plán plateb firmy smí měnit jen administrátor.'); return; }
  const f = NAST.firma || (NAST.firma = firmaDefault());
  const zaklad = f.planPlatebProj && typeof f.planPlatebProj === 'object' ? f.planPlatebProj : PLAN_PROJ_VYCHOZI;
  const p = JSON.parse(JSON.stringify(zaklad));
  if (!Array.isArray(p.milniky)) p.milniky = [];
  if (!p.standard || typeof p.standard !== 'object') p.standard = {};
  if (!p.predani || typeof p.predani !== 'object') p.predani = {};
  p.v = 1;
  if (fn(p) === false) return;
  firmaSet('planPlatebProj', p);
}
function planFirmaVychoziPredvolba(v) { planFirmaUpravit(p => { p.vychozi = String(v); }); }
function planFirmaZaloha(v) { planFirmaUpravit(p => { p.zalohaPct = +v; }); }
function planFirmaMilnikText(i, t) {
  planFirmaUpravit(p => { if (!p.milniky[i]) return false; p.milniky[i].cz = String(t == null ? '' : t).slice(0, 300); });
}
function planFirmaMilnikPridej() {
  planFirmaUpravit(p => {
    let n = 1;
    p.milniky.forEach(m => { const x = /^m(\d+)$/.exec((m && m.id) || ''); if (x) n = Math.max(n, +x[1] + 1); });
    p.milniky.push({ id: 'm' + n, cz: '' });
  });
}
/* Kde se milník používá (Standard, „po předání", předvolba Záloha) —
 * použitý milník nejde odebrat, jinak by zakázky ztratily text splátky. */
function planFirmaPouziti(p) {
  const out = new Map();
  const pridej = (id, kde) => { if (!out.has(id)) out.set(id, []); if (out.get(id).indexOf(kde) < 0) out.get(id).push(kde); };
  pridej('podpis', 'předvolba Záloha');
  PLAN_PROJ_SEKCE.forEach(k => {
    ((p.standard || {})[k] || []).forEach(r => { if (r) pridej(r.m, 'Standard ' + PLAN_PROJ_ZKRATKY[k]); });
    if ((p.predani || {})[k]) pridej(p.predani[k], 'po předání ' + PLAN_PROJ_ZKRATKY[k]);
  });
  return out;
}
function planFirmaMilnikOdeber(i) {
  planFirmaUpravit(p => {
    const m = p.milniky[i];
    if (!m) return false;
    const kde = planFirmaPouziti(p).get(m.id);
    if (kde && kde.length) { hlaska('Milník se používá (' + kde.join(', ') + '). Nejdřív ho v těch místech nahraďte jiným.'); return false; }
    p.milniky.splice(i, 1);
  });
}
function planFirmaPredani(k, id) {
  if (PLAN_PROJ_SEKCE.indexOf(k) < 0) return;
  planFirmaUpravit(p => { p.predani[k] = String(id); });
}
/* Standard po činnostech se neupravuje druhým editorem tady, ale PŘEVZETÍM
 * z otevřené zakázky (výchozí návrh Q8): administrátor si splátky nastaví
 * v krycím listu PROJ, jak je zvyklý, a sem je jedním tlačítkem převezme.
 * Bere se jen to, co je v zakázce opravdu upravené (plan.cinnosti), a jen
 * s milníky z katalogu — vlastní text splátky do firemního Standardu
 * nepatří (nejdřív ho přidejte do katalogu). */
async function planFirmaPrevzit() {
  if (!jeAdmin()) { hlaska('Plán plateb firmy smí měnit jen administrátor.'); return; }
  const plan = (typeof KLP !== 'undefined' && KLP && KLP.planPlateb) || null;
  const upr = PLAN_PROJ_SEKCE.filter(k => plan && plan.cinnosti && Array.isArray(plan.cinnosti[k]) && plan.cinnosti[k].length);
  if (!upr.length) {
    hlaska('Otevřená zakázka nemá v plánu plateb žádnou upravenou činnost. Upravte splátky v krycím listu PROJ '
      + '(Plán plateb) a pak je sem převezměte.');
    return;
  }
  const katalog = new Set(planFirmaPlan(NAST.firma).milniky.map(m => m.id));
  const f = NAST.firma && NAST.firma.planPlatebProj;
  if (f && Array.isArray(f.milniky)) f.milniky.forEach(m => m && katalog.add(m.id));
  const vlastni = upr.filter(k => plan.cinnosti[k].some(r => !r || !katalog.has(r.m)));
  const brat = upr.filter(k => vlastni.indexOf(k) < 0);
  if (!brat.length) {
    hlaska('Upravené splátky otevřené zakázky mají vlastní text milníku (' + vlastni.map(k => PLAN_PROJ_ZKRATKY[k]).join(', ')
      + '). Do firemního Standardu jdou jen milníky z katalogu — přidejte je nejdřív do katalogu níž.');
    return;
  }
  const ok = await potvrd('Převzít splátky otevřené zakázky jako firemní Standard po činnostech pro: '
    + brat.map(k => PLAN_PROJ_ZKRATKY[k]).join(', ') + '?'
    + (vlastni.length ? '\n\nBez činností s vlastním textem milníku: ' + vlastni.map(k => PLAN_PROJ_ZKRATKY[k]).join(', ') + '.' : '')
    + '\n\nOdeslaných nabídek se to nedotkne; platí pro zakázky, které Standard používají.', { ano: 'Převzít' });
  if (!ok) return;
  planFirmaUpravit(p => { brat.forEach(k => { p.standard[k] = plan.cinnosti[k].map(r => ({ p: +r.p, m: String(r.m) })); }); });
}
async function planFirmaVratit() {
  if (!jeAdmin()) { hlaska('Plán plateb firmy smí měnit jen administrátor.'); return; }
  const ok = await potvrd('Vrátit plán plateb projekce na výchozí z kódu? Vlastní katalog milníků, předvolba '
    + 'a Standard firmy se zahodí (po zveřejnění i pro ostatní).', { ano: 'Vrátit výchozí' });
  if (ok) firmaSet('planPlatebProj', undefined);
}

function nastPlanPlatebProj() {
  if (typeof PLAN_PROJ_VYCHOZI === 'undefined') return '';
  const f = NAST.firma || {};
  const vlastni = !!(f.planPlatebProj && typeof f.planPlatebProj === 'object');
  const p = vlastni ? f.planPlatebProj : PLAN_PROJ_VYCHOZI;
  const vady = vlastni ? planPlatebFirmaVady(p) : [];
  const admin = jeAdmin(), dis = admin ? '' : ' disabled';
  const milniky = Array.isArray(p.milniky) ? p.milniky : [];
  const pouziti = planFirmaPouziti(p);
  const volbyMilniku = (vybrany) => milniky.map(m => `<option value="${esc(m.id)}"${m.id === vybrany ? ' selected' : ''}>${esc(m.cz || '(bez textu)')}</option>`).join('');
  const radkyKatalogu = milniky.map((m, i) => {
    const kde = pouziti.get(m.id) || [];
    return `<tr><td class="num">${i + 1}</td>
      <td style="width:48%"><input type="text" value="${esc(m.cz)}" maxlength="300" placeholder="např. po předání …"
        onchange="planFirmaMilnikText(${i}, this.value)"${dis}></td>
      <td class="nowrap"><code>${esc(m.id)}</code></td>
      <td class="note" style="font-size:11.5px">${kde.length ? esc(kde.join(', ')) : '—'}</td>
      <td class="nowrap">${admin ? `<button class="mini" onclick="planFirmaMilnikOdeber(${i})"${kde.length ? ' disabled title="milník se používá — nejdřív ho nahraďte jiným"' : ''}>Odebrat</button>` : ''}</td></tr>`;
  }).join('');
  const pf = planFiremni(p);
  const radkyStandardu = PLAN_PROJ_SEKCE.map(k => {
    const radky = planRadkyCinnosti(k, { predvolba: 'std' }, pf);
    const veta = radky.map(r => planPct(r.p) + ' ' + (r.t || '(milník není v katalogu)')).join(' · ');
    return `<tr><td class="nowrap"><b>${esc(PLAN_PROJ_ZKRATKY[k])}</b></td>
      <td>${esc(veta)}</td>
      <td style="width:30%"><select onchange="planFirmaPredani('${escJs(k)}', this.value)"${dis}>${volbyMilniku((p.predani || {})[k])}</select></td></tr>`;
  }).join('');
  const volbyPredvoleb = PLAN_PROJ_PREDVOLBY.map(v => `<option value="${esc(v)}"${p.vychozi === v ? ' selected' : ''}>${esc(PLAN_PROJ_PREDVOLBY_NAZVY[v])}</option>`).join('');
  const volbyZaloh = PLAN_PROJ_ZALOHY.map(z => `<option value="${z}"${p.zalohaPct === z ? ' selected' : ''}>${z ? 'Záloha ' + z + ' %' : 'Bez zálohy'}</option>`).join('');
  const stav = vady.length
    ? `<div class="note" style="color:#b91c1c;margin:6px 0"><b>Plán má vady — dokud je neopravíte, zakázky používají výchozí plán z kódu a zveřejnit nepůjde:</b><br>${vady.map(v => esc(v)).join('<br>')}</div>`
    : '';
  return `<div class="sec-title">Plán plateb projekce <span class="pill ${vlastni ? '' : 'mut'}">${vlastni ? 'vlastní plán firmy' : 'platí výchozí z kódu'}</span></div>
    <div class="note" style="margin-top:0">Z tohohle plánu vychází <b>krycí list PROJ</b> každé zakázky: obchodník zvolí
      předvolbu a může ji upravit. Nabídka PROJ, tištěný krycí list i splátky smlouvy o dílo PROJ plán jen čtou.
      Do odeslaných (zamčených) nabídek se změna nepropíše. Zveřejňuje se spolu s firemními údaji.</div>
    ${stav}
    <div class="row"><label>Výchozí předvolba nové zakázky</label>
      <select class="plan-sel" onchange="planFirmaVychoziPredvolba(this.value)"${dis}>${volbyPredvoleb}</select></div>
    <div class="row"><label>Záloha v předvolbě „Záloha + zbytek po předání"</label>
      <select class="plan-sel" onchange="planFirmaZaloha(this.value)"${dis}>${volbyZaloh}</select></div>
    <div style="margin:10px 0 4px"><b>Standard po činnostech</b> <span class="note">— procenta a milníky; poslední sloupec je milník
      „po předání" činnosti pro předvolby Záloha a 100 %.</span></div>
    <div class="tbl-wrap"><table class="plan-tab"><thead><tr><th>činnost</th><th>splátky (Standard)</th><th>po předání</th></tr></thead>
      <tbody>${radkyStandardu}</tbody></table></div>
    ${admin ? `<div class="btns" style="margin-top:6px">
      <button onclick="planFirmaPrevzit()" title="splátky upravené v krycím listu PROJ otevřené zakázky se stanou firemním Standardem">Převzít Standard z otevřené zakázky</button>
      ${vlastni ? '<button class="mini" onclick="planFirmaVratit()">Vrátit výchozí z kódu</button>' : ''}</div>` : ''}
    <div style="margin:12px 0 4px"><b>Katalog milníků</b> <span class="note">— texty „Platba …" v nabídce PROJ i ve smlouvě; pořadí
      katalogu je pořadí plateb ve smlouvě o dílo. Klíč milníku se nemění (drží ruční částky smluv).</span></div>
    <div class="tbl-wrap"><table class="plan-tab"><thead><tr><th class="num">#</th><th>text milníku</th><th>klíč</th><th>používá se</th><th></th></tr></thead>
      <tbody>${radkyKatalogu}</tbody></table></div>
    ${admin ? '<div class="btns" style="margin-top:6px"><button class="mini" onclick="planFirmaMilnikPridej()">+ přidat milník</button></div>' : ''}`;
}
