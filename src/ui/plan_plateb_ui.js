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
/* Nepoužitý milník může mít vybraný splátka rozpracované zakázky (krycí
 * list PROJ) — ta by pak hlásila neznámý milník a dokument by nevznikl.
 * Zakázky tady projít nejde, proto se odebrání zeptá (revize etapy B,
 * 30. 9. 2026). Odeslaným nabídkám nevadí: mají snímek i s texty. */
async function planFirmaMilnikOdeber(i) {
  if (!jeAdmin()) { hlaska('Plán plateb firmy smí měnit jen administrátor.'); return; }
  const f = NAST.firma && NAST.firma.planPlatebProj;
  const p0 = f && typeof f === 'object' ? f : PLAN_PROJ_VYCHOZI;
  const m = Array.isArray(p0.milniky) ? p0.milniky[i] : null;
  if (!m || typeof m !== 'object') return;
  const kde = planFirmaPouziti(p0).get(m.id);
  if (kde && kde.length) { hlaska('Milník se používá (' + kde.join(', ') + '). Nejdřív ho v těch místech nahraďte jiným.'); return; }
  const ok = await potvrd('Odebrat milník „' + (m.cz || m.id) + '" z katalogu?\n\n'
    + 'Mohou ho mít vybraný splátky rozpracovaných zakázek (krycí list PROJ). U nich pak plán plateb ohlásí '
    + 'neznámý milník a nabídka PROJ ani smlouva nevznikne, dokud obchodník splátce nevybere jiný. '
    + 'Odeslaných nabídek se to nedotkne.', { ano: 'Odebrat' });
  if (!ok) return;
  planFirmaUpravit(p => {
    const j = p.milniky.findIndex(x => x && x.id === m.id);
    if (j < 0) return false;
    p.milniky.splice(j, 1);
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

/* Poškozený firemní plán (obnova zálohy zapisuje firmu doslova, ručně
 * upravená data) nesmí shodit Nastavení — administrátor musí dostat aspoň
 * vysvětlení a „Vrátit výchozí z kódu". Zakázky mezitím používají výchozí
 * plán (planFirmaPlan vadný plán nepustí). Revize etapy B, 30. 9. 2026. */
function nastPlanPlatebProj() {
  if (typeof PLAN_PROJ_VYCHOZI === 'undefined') return '';
  try { return nastPlanPlatebProjKarta(); } catch (e) {
    let vady = [];
    try { vady = planPlatebFirmaVady((NAST.firma || {}).planPlatebProj); } catch (x) { vady = []; }
    const vadyHtml = vady.map(v => esc(v)).join('<br>');
    return `<div class="sec-title">Plán plateb projekce <span class="pill bad">poškozený</span></div>
      <div class="note" style="color:#b91c1c">Firemní plán plateb nejde zobrazit (${esc(e.message)}). Zakázky používají
        výchozí plán z kódu, dokud ho nevrátíte nebo neopravíte.${vadyHtml ? '<br>' + vadyHtml : ''}</div>
      ${jeAdmin() ? '<div class="btns" style="margin-top:6px"><button class="mini" onclick="planFirmaVratit()">Vrátit výchozí z kódu</button></div>' : ''}`;
  }
}
function nastPlanPlatebProjKarta() {
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

/* ---------- krycí list PROJ: plán plateb zakázky ----------
 * Plán je ŘÍDKÝ (data.kryciProj.planPlateb): ukládá se předvolba, záloha,
 * jen UPRAVENÉ činnosti a ruční částky plateb smlouvy. Neupravená činnost
 * bere řádky z předvolby, takže změna firemního Standardu se do
 * rozpracované zakázky propíše sama; odeslaná nabídka má snímek.
 * Vstupní funkce níž jsou v ZAMEK_CHRANENE (zámek varianty, náhled). */
function planKlpData() {
  if (!KLP.planPlateb || typeof KLP.planPlateb !== 'object') KLP.planPlateb = { v: 1 };
  /* Převod starší zakázky (krok 7): ruční splátky sodpPlatba1–8 se při
   * prvním zápisu do plánu zhmotní jako ruční částky plateb — jinak by je
   * první úprava tiše zahodila. Původní pole zůstávají v datech. */
  if (KLP.planPlateb.prepis === undefined && typeof planPlatebZeStarych === 'function')
    KLP.planPlateb.prepis = planPlatebZeStarych(KLP.hodnoty).prepis;
  return KLP.planPlateb;
}
function planKlpEf() { return nabidkaProjPlatby(ZAK, aktivniVarianta(ZAK), 'cz'); }
function planKlpUlozeno() { aktivniVarianta(ZAK).upraveno = new Date().toISOString(); render(); }
/* Řádky činnosti ke změně: poprvé se zhmotní z předvolby do plan.cinnosti. */
function planKlpRadky(k) {
  const plan = planKlpData();
  if (!plan.cinnosti || typeof plan.cinnosti !== 'object') plan.cinnosti = {};
  if (!Array.isArray(plan.cinnosti[k]) || !plan.cinnosti[k].length) {
    const ef = planKlpEf();
    plan.cinnosti[k] = planRadkyCinnosti(k, plan, ef.firemni)
      .map(r => r.m === 'vlastni' ? { p: r.p, m: 'vlastni', t: r.t || '' } : { p: r.p, m: r.m });
  }
  return plan.cinnosti[k];
}
const planKlpCislo = (v) => { const n = parseFloat(String(v == null ? '' : v).replace(/[\s ]/g, '').replace(',', '.')); return isFinite(n) ? n : 0; };

async function planKlpPredvolba(v) {
  if (PLAN_PROJ_PREDVOLBY.indexOf(v) < 0) return;
  const plan = planKlpData();
  const ef = planKlpEf();
  if (v === 'vlastni') {
    /* Vlastní = obchodník upravuje řádky sám; začíná od toho, co právě vidí. */
    plan.cinnosti = plan.cinnosti && typeof plan.cinnosti === 'object' ? plan.cinnosti : {};
    PLAN_PROJ_SEKCE.forEach(k => { if (+ef.ceny[k] > 0 && !(Array.isArray(plan.cinnosti[k]) && plan.cinnosti[k].length)) planKlpRadky(k); });
    plan.predvolba = 'vlastni';
    planKlpUlozeno();
    return;
  }
  const upr = PLAN_PROJ_SEKCE.filter(k => plan.cinnosti && Array.isArray(plan.cinnosti[k]) && plan.cinnosti[k].length);
  const prep = plan.prepis && Object.keys(plan.prepis).length;
  if (upr.length || prep) {
    const ok = await potvrd('Změna předvolby zahodí ' + [upr.length ? 'upravené splátky (' + upr.map(k => PLAN_PROJ_ZKRATKY[k]).join(', ') + ')' : '',
      prep ? 'ruční částky plateb smlouvy' : ''].filter(Boolean).join(' a ') + '. Pokračovat?', { ano: 'Změnit předvolbu' });
    if (!ok) { render(); return; }
  }
  plan.predvolba = v;
  delete plan.cinnosti;
  plan.prepis = {};            // prázdné, ne chybějící: dřívější ruční splátky se nevrátí
  planKlpUlozeno();
}
/* Dřívější záloha z krycího listu (krok 7, Q5): nepřepíná se sama —
 * obchodník ji jedním tlačítkem použije jako předvolbu „Záloha X %".
 * Upravené splátky předvolba zahodí — jen po potvrzení, jako při změně
 * předvolby; ruční částky plateb (i převzaté ze starších) zůstávají. */
async function planKlpZalohaZeStare(z) {
  const zal = +z;
  if (PLAN_PROJ_ZALOHY.indexOf(zal) < 0) return;
  const plan = planKlpData();
  const upr = PLAN_PROJ_SEKCE.filter(k => plan.cinnosti && Array.isArray(plan.cinnosti[k]) && plan.cinnosti[k].length);
  if (upr.length && !(await potvrd('Předvolba „' + (zal ? 'Záloha ' + zal + ' %' : 'Bez zálohy') + '" zahodí upravené splátky ('
    + upr.map(k => PLAN_PROJ_ZKRATKY[k]).join(', ') + '). Pokračovat?', { ano: 'Použít předvolbu' }))) { render(); return; }
  plan.predvolba = 'zaloha';
  plan.zaloha = zal;
  delete plan.cinnosti;
  planKlpUlozeno();
}
/* Uložená hodnota je text volby („Bez zálohy", „Záloha 30 %" —
 * KRYCI_PROJ_ZALOHY) nebo vlastní znění; procento se hledá kdekoli v textu
 * (do revize 30. 9. 2026 jen na začátku, takže volby nepoznalo). */
function planStaraZaloha() {
  const h = (typeof KLP !== 'undefined' && KLP && KLP.hodnoty) || {};
  const t = String(h.zaloha == null ? '' : h.zaloha).trim();
  if (!t) return null;
  const m = /(\d+)\s*%/.exec(t);
  return { text: t, pct: /bez zálohy/i.test(t) ? 0 : (m ? +m[1] : null) };
}
function planKlpZaloha(v) {
  const z = +v;
  if (PLAN_PROJ_ZALOHY.indexOf(z) < 0) return;
  planKlpData().zaloha = z;
  planKlpUlozeno();
}
function planKlpProcento(k, i, v) {
  const r = planKlpRadky(k);
  if (!r[i]) return;
  r[i].p = Math.round(planKlpCislo(v) * 100) / 100;
  planKlpUlozeno();
}
function planKlpMilnik(k, i, id) {
  const r = planKlpRadky(k);
  if (!r[i]) return;
  r[i].m = String(id || '');
  if (r[i].m === 'vlastni') r[i].t = r[i].t || ''; else delete r[i].t;
  planKlpUlozeno();
}
function planKlpMilnikText(k, i, t) {
  const r = planKlpRadky(k);
  if (!r[i]) return;
  r[i].t = String(t == null ? '' : t).slice(0, 300);
  planKlpUlozeno();
}
function planKlpPridej(k) {
  const r = planKlpRadky(k);
  if (r.length >= PLAN_PROJ_MAX_SPLATEK) { hlaska('Činnost má nejvýš ' + PLAN_PROJ_MAX_SPLATEK + ' splátek.'); return; }
  const zbyva = Math.max(0, Math.round((100 - r.reduce((a, x) => a + (+x.p || 0), 0)) * 100) / 100);
  const ef = planKlpEf();
  r.push({ p: zbyva, m: (ef.firemni.predani || {})[k] || 'podpis' });
  planKlpUlozeno();
}
function planKlpOdeber(k, i) {
  const r = planKlpRadky(k);
  if (r.length <= 1 || !r[i]) return;
  r.splice(i, 1);
  planKlpUlozeno();
}
function planKlpPosun(k, i, d) {
  const r = planKlpRadky(k), j = i + d;
  if (!r[i] || !r[j]) return;
  const x = r[i]; r[i] = r[j]; r[j] = x;
  planKlpUlozeno();
}
function planKlpVratitCinnost(k) {
  const plan = planKlpData();
  if (plan.cinnosti) delete plan.cinnosti[k];
  planKlpUlozeno();
}
function planKlpPrepis(klic, v) {
  const plan = planKlpData();
  const t = String(v == null ? '' : v).trim();
  if (!plan.prepis || typeof plan.prepis !== 'object') plan.prepis = {};
  if (!t) { delete plan.prepis[klic]; planKlpUlozeno(); return; }
  const kc = planCastkaZTextu(t);
  if (kc === null) { hlaska('Částku „' + t + '" nejde přečíst — napište číslo v korunách, např. 95 880 nebo 95 880,50.'); render(); return; }
  plan.prepis[klic] = kc;
  planKlpUlozeno();
}
function planKlpPrepisZrus(klic) {
  const plan = planKlpData();
  if (plan.prepis) delete plan.prepis[klic];
  planKlpUlozeno();
}

/* Karta plánu plateb v krycím listu PROJ (a v podmínkách u nabídky PROJ). */
function planKlpKarta(c) {
  const ef = c && c.planEf;
  if (!ef || ef.stary) return '';
  const v = aktivniVarianta(ZAK);
  const edit = typeof variantaEditovatelna !== 'function' || variantaEditovatelna(v);
  const dis = edit ? '' : ' disabled';
  const plan = ef.plan || {};
  const f = ef.firemni;
  const pv = planPredvolba(plan, f);
  const upr = planUpraveno(plan, f, ef.ceny);
  const fmt = ef.mena.fmt;
  const nabizene = PLAN_PROJ_SEKCE.filter(k => +ef.ceny[k] > 0);
  const volbyMil = (vybrany) => f.milniky.map(m => `<option value="${esc(m.id)}"${m.id === vybrany ? ' selected' : ''}>${esc(m.cz)}</option>`).join('')
    + `<option value="vlastni"${vybrany === 'vlastni' ? ' selected' : ''}>Vlastní text…</option>`
    + (vybrany !== 'vlastni' && !f.milniky.some(m => m.id === vybrany) ? `<option value="${esc(vybrany)}" selected>(milník není v katalogu)</option>` : '');
  const cinnost = (k) => {
    const radky = planRadkyCinnosti(k, plan, f);
    const soucet = Math.round(radky.reduce((a, r) => a + (isFinite(r.p) ? r.p : 0), 0) * 100) / 100;
    const ok100 = soucet === 100;
    const upravena = planCinnostUpravena(k, plan, f);
    const tr = radky.map((r, i) => `<tr><td class="num">${i + 1}</td>
      <td class="nowrap"><input type="text" class="plan-pct" inputmode="decimal" value="${esc(String(r.p).replace('.', ','))}"
        onchange="planKlpProcento('${escJs(k)}', ${i}, this.value)"${dis}> %</td>
      <td><select onchange="planKlpMilnik('${escJs(k)}', ${i}, this.value)"${dis}>${volbyMil(r.m)}</select>
        ${r.m === 'vlastni' ? `<input type="text" value="${esc(r.t || '')}" maxlength="300" placeholder="milník podle dohody se zákazníkem" style="margin-top:4px"
          onchange="planKlpMilnikText('${escJs(k)}', ${i}, this.value)"${dis}>` : ''}</td>
      <td class="nowrap">${edit ? `<button class="mini" title="výš" onclick="planKlpPosun('${escJs(k)}', ${i}, -1)"${i === 0 ? ' disabled' : ''}>↑</button><button class="mini" title="níž" onclick="planKlpPosun('${escJs(k)}', ${i}, 1)"${i === radky.length - 1 ? ' disabled' : ''}>↓</button><button class="mini" title="odebrat splátku" onclick="planKlpOdeber('${escJs(k)}', ${i})"${radky.length === 1 ? ' disabled' : ''}>✕</button>` : ''}</td></tr>`).join('');
    return `<div class="plan-cin"><div class="plan-cin-hlava"><b>${esc(PLAN_PROJ_ZKRATKY[k])}</b> <span>${esc(PLAN_PROJ_NAZVY[k])}</span>
        <span class="note" style="margin:0">cena po slevě ${esc(fmt(ef.ceny[k]))}</span>
        <span class="pill${ok100 ? '' : ' bad'}">${ok100 ? 'součet 100 % ✓' : 'součet ' + esc(planPct(soucet)) + ' — musí být 100 %'}</span>
        ${upravena && pv !== 'vlastni' ? '<span class="pill warn">upraveno</span>' : ''}
        ${upravena && edit ? `<button class="mini" title="vrátit řádky z předvolby" onclick="planKlpVratitCinnost('${escJs(k)}')">↺ předvolba</button>` : ''}</div>
      <table class="plan-tab"><tbody>${tr}</tbody></table>
      ${edit ? `<button class="mini" onclick="planKlpPridej('${escJs(k)}')">+ splátka</button>` : ''}</div>`;
  };
  const zalohy = PLAN_PROJ_ZALOHY.map(z => `<option value="${z}"${planZalohaEf(plan, f) === z ? ' selected' : ''}>${z ? 'Záloha ' + z + ' %' : 'Bez zálohy'}</option>`).join('');
  const nenabizene = PLAN_PROJ_SEKCE.filter(k => !(+ef.ceny[k] > 0)).map(k => PLAN_PROJ_ZKRATKY[k]);
  const nedostatky = (ef.kontrola || []).map(x => esc(x.text)).join('<br>');
  const vychozi = planPredvolba(null, f);
  return `<div class="plan-karta" style="margin:10px 0 4px">
    <h3>Plán plateb ${upr ? '<span class="pill warn">upraveno</span>' : ''} ${ef.zmrazeny ? '<span class="pill mut">zmrazeno při odeslání</span>' : ''}</h3>
    <div class="note" style="margin-top:0">Jeden plán pro <b>nabídku PROJ</b>, tištěný <b>krycí list</b> a <b>platby smlouvy o dílo</b>
      (dopočítají se níž v „Smlouva o dílo — splátky"). Jen nabízené činnosti; součet u každé musí být 100 %.</div>
    <div class="row"><label>Předvolba</label>
      <select class="plan-sel" onchange="planKlpPredvolba(this.value)"${dis}>${PLAN_PROJ_PREDVOLBY.map(x => `<option value="${esc(x)}"${x === pv ? ' selected' : ''}>${esc(PLAN_PROJ_PREDVOLBY_NAZVY[x])}${x === vychozi ? ' (výchozí)' : ''}</option>`).join('')}</select></div>
    ${pv === 'zaloha' ? `<div class="row"><label>Záloha</label><select class="plan-sel" onchange="planKlpZaloha(this.value)"${dis}>${zalohy}</select></div>` : ''}
    ${nabizene.length ? nabizene.map(cinnost).join('') : '<div class="note">Není nabízena žádná činnost s cenou — plán plateb je prázdný.</div>'}
    ${nenabizene.length && nabizene.length ? `<div class="note">Neoceněné činnosti se v plánu neuvádějí (${esc(nenabizene.join(', '))}).</div>` : ''}
    <div class="note">Autorský dozor se fakturuje měsíčně podle skutečně odpracovaných hodin, mimo platby smlouvy.</div>
    ${nedostatky ? `<div class="note" style="color:#b91c1c"><b>Plán plateb má nedostatky:</b><br>${nedostatky}</div>` : ''}
    ${planKlpStareZneni(ef, plan, edit)}
  </div>`;
}
/* Dřívější znění krycího listu (krok 7): ruční splátky převzaté do plateb,
 * nečitelné částky, záloha jako nabídnutá předvolba. */
function planKlpStareZneni(ef, plan, edit) {
  const kusy = [];
  const zs = ef.zeStarych;
  if (zs && Object.keys(zs.prepis).length)
    kusy.push('Ruční splátky smlouvy z dřívějšího krycího listu jsou převzaté jako ruční částky plateb se stejným milníkem ('
      + esc(Object.keys(zs.prepis).length + '×') + ') — zkontrolujte je v tabulce plateb níž.');
  if (zs && zs.necitelne.length)
    kusy.push('Nečitelná ruční splátka: ' + zs.necitelne.map(n => '„' + esc(n.text) + '" (' + esc(n.id) + ')').join(', ')
      + ' — doplňte částku v tabulce plateb.');
  const sz = (!plan || !plan.predvolba) ? planStaraZaloha() : null;
  if (sz) kusy.push('Dřívější znění krycího listu: záloha „' + esc(sz.text) + '".'
    + (edit && sz.pct != null && PLAN_PROJ_ZALOHY.indexOf(sz.pct) >= 0 ? ` <button class="mini" onclick="planKlpZalohaZeStare(${escJs(sz.pct)})">Použít jako předvolbu ${esc(sz.pct ? 'Záloha ' + sz.pct + ' %' : 'Bez zálohy')}</button>` : ''));
  return kusy.length ? `<div class="note" style="color:#b45309">${kusy.join('<br>')}</div>` : '';
}

/* Platby smlouvy o dílo PROJ dopočtené z plánu (krycí list, sekce
 * „Smlouva o dílo — splátky"): milník, složení, dopočet, ruční částka, ↺. */
function planKlpPlatbyKarta(c) {
  const ef = c && c.planEf;
  if (!ef || ef.stary) return '';
  const v = aktivniVarianta(ZAK);
  const edit = typeof variantaEditovatelna !== 'function' || variantaEditovatelna(v);
  const dis = edit ? '' : ' disabled';
  const d = ef.dopocet;
  const fmt = ef.mena.fmt;
  const cislo = (x) => (Math.round(x * 100) / 100).toLocaleString('cs-CZ', { maximumFractionDigits: 2 });
  if (!d.platby.length) return '<div class="note">Není nabízena žádná činnost s cenou — smlouva nemá co rozpočítat.</div>';
  const radky = d.platby.map((x, i) => `<tr${x.prepsano ? ' class="prepsano"' : ''}><td class="num">${i + 1}</td>
    <td>${esc(x.text || '(milník chybí)')}</td>
    <td class="note" style="font-size:11.5px">${esc(x.casti.map(q => planPct(q.p) + ' ' + PLAN_PROJ_ZKRATKY[q.k]).join(' + '))}</td>
    <td class="num">${esc(fmt(x.vypocet))}</td>
    <td class="num"><input type="text" class="plan-kc" inputmode="decimal" value="${x.prepsano ? esc(cislo(x.castka)) : ''}" placeholder="${esc(cislo(x.vypocet))}"
      title="prázdné = dopočet" onchange="planKlpPrepis('${escJs(x.klic)}', this.value)"${dis}></td>
    <td class="nowrap">${x.prepsano && edit ? `<button class="mini" title="vrátit dopočet" onclick="planKlpPrepisZrus('${escJs(x.klic)}')">↺</button>` : ''}</td></tr>`).join('');
  const osirele = (d.osirele || []).map(o => `<div class="note" style="color:#b45309">Ruční částka ${esc(fmt(o.castka))} patří k platbě, která v plánu už není (${esc(o.klic)}) —
    do smlouvy nejde. ${edit ? `<button class="mini" onclick="planKlpPrepisZrus('${escJs(o.klic)}')">Odebrat</button>` : ''}</div>`).join('');
  return `<div class="plan-karta" style="margin:8px 0">
    <div class="tbl-wrap"><table class="plan-tab"><thead><tr><th class="num">#</th><th>milník</th><th>složení</th>
      <th class="num">dopočet</th><th class="num">ve smlouvě</th><th></th></tr></thead>
      <tbody>${radky}</tbody>
      <tfoot><tr><td></td><td colspan="2"><b>součet plateb</b> · cena díla ${esc(fmt(d.cena))}</td><td></td>
        <td class="num"><span class="pill${d.sedi ? '' : ' bad'}">${esc(fmt(d.soucet))}${d.sedi ? ' ✓' : ''}</span></td><td></td></tr></tfoot></table></div>
    ${osirele}
    <div class="note">Prázdné pole = dopočet (procento × cena činnosti po slevě, zaokrouhlení nese poslední splátka činnosti).
      Částku lze přepsat ručně; součet plateb musí dát cenu díla.</div></div>`;
}

/* ---------- brána dokumentů PROJ (etapa B, zábrany J. V. 29. 9. 2026) ----------
 * Plán plateb s vadou (součet činnosti ≠ 100 %, nekladné procento, chybějící
 * milník) nesmí do nabídky PROJ (Word i náhled) ani do smlouvy o dílo PROJ;
 * smlouva navíc potřebuje součet plateb = cena díla. Odeslaná nabídka z doby
 * před plánem se nehlídá (tiskne se, jak odešla). Volá dokumentZabrana(typ). */
const PLAN_DOKUMENTY = ['nabidkaProj', 'nabidkaProjTisk', 'sodProj'];
function planPlatebZabranaDokumentu(typ, varianta) {
  const t = String(typ || '').replace(/_(en|de|fr)$/, '');
  if (PLAN_DOKUMENTY.indexOf(t) < 0 || typeof nabidkaProjPlatby !== 'function' || typeof ZAK === 'undefined') return '';
  if (ZAK.jenOck) return '';
  /* Varianta, ZE KTERÉ dokument vzniká — po odpovědi „Ne" v nabidkaVarianta
   * je to řídící, ne otevřená (revize etapy B, 30. 9. 2026). Plán, který
   * nejde spočítat, dokument nepustí (dřív se výjimka tiše spolkla). */
  const v = varianta || aktivniVarianta(ZAK);
  let pl = null;
  try { pl = nabidkaProjPlatby(ZAK, v, 'cz'); } catch (e) {
    return 'Plán plateb projekce nejde spočítat (' + e.message + ') — dokument nevznikne.';
  }
  if (!pl || pl.stary) return '';
  const vady = (pl.kontrola || []).filter(k => t === 'sodProj' || k.kod !== 'soucet');
  if (!vady.length) return '';
  return 'Plán plateb projekce má nedostatky — ' + (t === 'sodProj' ? 'smlouva o dílo' : 'nabídka PROJ')
    + ' nevznikne, dokud se neopraví (krycí list PROJ → Plán plateb): ' + vady.map(v => v.text).join(' ');
}
