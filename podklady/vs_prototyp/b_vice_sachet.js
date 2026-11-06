/* PROTOTYP VS (#570) — vrstva B: víc šachet v jedné nabídce podle R1–R18.
 * Vkládá se ZA sestavenou aplikaci z main (v4.11.8). Výpočet každé šachty
 * dělá skutečné jádro `vypocet()` z main; vrstva jen sčítá podle pravidel
 * R (čistý součet × ks, CEIL na tisíce jen na součtu, rozpočet do šachet)
 * a vkládá prvky víc šachet komponentami aplikace (kartaRezim, .rada-prep,
 * .mini, tabulky). U jedné šachty se mění jen pole „Počet šachet v nabídce"
 * v nadpisu karty Zadání šachty (R16, R17) a štítek PROTOTYP. */
(function () {
  'use strict';
  const R = {
    R1: 'Architektura A — šachty uvnitř varianty: šachta 1 = dnešní zadání, další šachty vedle ní (ock.dalsi[]).',
    R2: 'Každá šachta se počítá celá, jako samostatná zakázka; N ks = čistý násobek.',
    R3: 'Na tisíce se zaokrouhluje jen součet; jedna sleva ze součtu; víc šachet jen v Modelu 2.',
    R4: 'Cenová nabídka: tabulka šachet (název, ks, cena), součet, sleva, cena celkem.',
    R7: 'Zaokrouhlovací rozdíl se rozpočítá do šachet podle podílu (celé Kč, největší zbytek).',
    R8: 'Stejné příplatky všech šachet se sloučí do jednoho řádku s počtem (klíč + sazba).',
    R9: 'Jeden krycí list za variantu s tabulkou šachet.',
    R10: 'Nejvýš 10 šachet ve variantě.',
    R12: 'U šachty s víc kusy jen cena za všechny kusy dohromady.',
    R14: 'U víc šachet je cena můstků v ceně šachty (dovětek „vč. můstků“).',
    R16: 'Jedna šachta = dnešní kalkulátor beze změny vzhledu; rozhraní víc šachet až od 2 šachet.',
    R17: 'Počet šachet se nastavuje polem „Počet šachet v nabídce“ nahoře v kartě Zadání šachty; ks zvlášť u šachty.',
    R18: 'Snížení počtu šachet se potvrzuje na stránce se jmény mazaných šachet; šachta 1 zůstává; omyl vrátí Zpět.',
  };
  const VS = { akt: 0, pohled: 'akt', force: null, potvrdit: null };
  const st = document.createElement('style');
  st.textContent = `
    .vs-panel { position:fixed; left:max(8px, env(safe-area-inset-left, 0px)); bottom:max(8px, env(safe-area-inset-bottom, 0px)); z-index:60;
      display:flex; flex-wrap:wrap; gap:6px 10px; align-items:center; max-width:calc(100vw - 16px); box-sizing:border-box;
      background:rgba(255,255,255,.96); border:1px solid #f2a7a7; border-radius:8px; padding:5px 8px; box-shadow:0 2px 10px rgba(0,0,0,.12);
      font:12px "Segoe UI", system-ui, sans-serif; color:#1a2332; }
    .vs-panel .rada-prep button { font-size:11.5px; padding:2px 9px; }
    .vs-proto { background:#b91c1c; color:#fff; font:700 10.5px "Segoe UI", system-ui, sans-serif; letter-spacing:.05em; text-transform:uppercase; padding:3px 8px; border-radius:5px; }
    .vs-pz { color:#6b7686; display:inline-flex; align-items:center; gap:6px; }
    .vs-navod { position:fixed; right:max(12px, env(safe-area-inset-right, 0px)); bottom:max(56px, env(safe-area-inset-bottom, 0px)); z-index:61; width:min(520px, calc(100vw - 24px));
      max-height:70vh; overflow:auto; background:#fff; border:1px solid #dde3ea; border-radius:10px; box-shadow:0 10px 30px rgba(0,0,0,.2); padding:14px 16px; font:13.5px/1.45 "Segoe UI", system-ui, sans-serif; color:#1a2332; }
    .vs-navod h3 { margin:0 0 8px; font-size:14px; } .vs-navod ol { margin:0; padding-left:20px; } .vs-navod li { margin:4px 0; }
    .vs-r { display:inline-block; font:700 9.5px/14px "Segoe UI", system-ui, sans-serif; color:#6d28d9; border:1px solid #c4b5fd; background:#f5f3ff;
      border-radius:999px; padding:0 5px; margin-left:5px; vertical-align:middle; cursor:help; text-transform:none; letter-spacing:0; }
    .vs-pocet { font-weight:400; text-transform:none; letter-spacing:0; display:inline-flex; align-items:center; gap:6px; font-size:12.5px; line-height:1; margin:-10px 0; height:0; overflow:visible; }
    .vs-pocet select { width:auto; }
    .vs-blok { grid-column:1 / -1; min-width:0; }
    .vs-radek { display:flex; flex-wrap:wrap; gap:8px; align-items:center; margin:6px 0; }
    .vs-radek input[type=text] { width:240px; text-align:left; }
    .vs-radek input[type=number] { width:64px; }
    .vs-soucet-ro input, .vs-soucet-ro select, .vs-soucet-ro button.rc-otevri, .vs-soucet-ro .grip { pointer-events:none; opacity:.6; }
    .vs-tab td.r, .vs-tab th.r { text-align:right; white-space:nowrap; }
    .vs-tab td, .vs-tab th { text-align:left; }
  `;
  document.head.appendChild(st);
  const stitek = document.createElement('div'); stitek.className = 'vs-panel';
  document.body.appendChild(stitek);
  function kresliPanel() {
    const cz = (window.PROTO_CENIK || {}).rezim || 'skladebny';
    stitek.innerHTML = `<span class="vs-proto">Prototyp — nic se neukládá</span>
      <span class="vs-pz">základ = v6.11.3 (další verze main)</span>
      <span class="vs-pz">Zkušební ceník můstků: <span class="rada-prep"><button type="button" class="${cz === 'skladebny' ? 'on' : ''}" onclick="VS_cenik('skladebny')">skladebný</button><button type="button" class="${cz === 'stary' ? 'on' : ''}" onclick="VS_cenik('stary')">starý (#354)</button></span></span>
      <button type="button" class="mini" onclick="VS_navod()">Co si proklikat</button>`;
  }
  kresliPanel();

  const rt = (...k) => k.map(x => `<span class="vs-r" title="${esc(R[x] || '')}">${x}</span>`).join('');
  const kcF = x => (Math.round(+x || 0)).toLocaleString('cs-CZ') + ' Kč';

  /* ---------- data šachet ---------- */
  const dalsi = () => (OCK && Array.isArray(OCK.dalsi)) ? OCK.dalsi : [];
  const vic = () => dalsi().length > 0 || (+OCK.ks || 1) > 1;
  const sachty = () => [{ id: 's1', nazev: OCK.nazev || '', ks: +OCK.ks || 1, zadani: OCK.zadani }].concat(dalsi());
  const nazevS = (s, i) => (s.nazev || '').trim() || ('Šachta ' + (i + 1));
  const zadaniAkt = () => { const l = sachty(); return (l[VS.akt] || l[0]).zadani; };

  /* ---------- součet výsledků skutečného jádra ---------- */
  const ADIT = ['mnozstvi', 'mnozstviAuto', 'naklad', 'marze', 'sMarzi', 'fix'];
  function slozRadky(seznamy, ksy, prip, m) {
    const mapa = new Map(), out = [];
    seznamy.forEach((rows, i) => (rows || []).forEach(r => {
      const k = (r.key || r.origNazev || r.nazev) + '|' + (+r.cena || 0).toFixed(4);
      let x = mapa.get(k);
      if (!x) { x = JSON.parse(JSON.stringify(r)); ADIT.forEach(f => { if (typeof x[f] === 'number') x[f] = 0; }); x.vsSachty = []; mapa.set(k, x); out.push(x); }
      ADIT.forEach(f => { if (typeof r[f] === 'number') x[f] += ksy[i] * r[f]; });
      x.vsSachty.push(i);
    }));
    if (prip) out.forEach(x => { x.sMarzi = CEIL(x.naklad * (1 + m), 1000); x.marze = x.sMarzi - x.naklad; });
    return out;
  }
  function soucet(vys, ksy, cenik) {
    const r0 = vys[0], m = +cenik.marze || 0;
    const r = Object.assign({}, r0);
    r.sekce = {};
    const klSek = [...new Set(vys.flatMap(x => Object.keys(x.sekce)))];
    klSek.forEach(k => { r.sekce[k] = slozRadky(vys.map(x => x.sekce[k] || []), ksy); });
    r.volitelneKatalog = slozRadky(vys.map(x => x.volitelneKatalog), ksy);
    r.priplatky = slozRadky(vys.map(x => x.priplatky), ksy, true, m);
    const sum = rows => ({ naklad: rows.reduce((a, x) => a + x.naklad, 0), marze: rows.reduce((a, x) => a + x.marze, 0), sMarzi: rows.reduce((a, x) => a + x.sMarzi, 0) });
    r.souctySekci = {}; [...new Set(vys.flatMap(x => Object.keys(x.souctySekci)))].forEach(k => { r.souctySekci[k] = sum(r.sekce[k] || []); });
    /* Můstky (#560) po šachtách: popisný objekt nese skupiny všech šachet (× ks);
     * R14 — u víc šachet je cena můstků v ceně šachty, samostatný řádek Můstky v CN není
     * (souhrn.mustkyCena se do součtu nepřenáší). */
    const sM = vys.map(x => x.mustky).filter(m => m && Array.isArray(m.skupiny));
    if (sM.length) {
      const zakl = sM.find(m => m.skupiny.some(g => g.ks > 0)) || sM[0];
      r.mustky = Object.assign({}, zakl, { skladebny: sM.some(m => m.skladebny),
        skupiny: vys.flatMap((x, i) => (x.mustky && x.mustky.skupiny || []).map(g => Object.assign({}, g, { ks: g.ks * ksy[i] }))) });
    }
    r.rezerva = { naklad: 0, marze: 0, sMarzi: 0 };
    vys.forEach((x, i) => ['naklad', 'marze', 'sMarzi'].forEach(f => { r.rezerva[f] += ksy[i] * (+x.rezerva[f] || 0); }));
    r.montaz = Object.assign({}, r0.montaz);
    ['hodinyNavicCelkem', 'hod1osoba', 'hodCelkem', 'dni'].forEach(f => { r.montaz[f] = vys.reduce((a, x, i) => a + ksy[i] * (+x.montaz[f] || 0), 0); });
    const N = vys.reduce((a, x, i) => a + ksy[i] * x.souhrn.zakladNaklad, 0);
    const U = vys.reduce((a, x, i) => a + ksy[i] * (x.souhrn.zakladNaklad + x.souhrn.zakladMarze), 0);
    const Z = CEIL(U, 1000);                                   // R3: jen na součtu
    const dph = +cenik.dph || 0;
    const P = r.priplatky.reduce((a, x) => a + x.sMarzi, 0);
    r.souhrn = { zakladNaklad: N, zakladMarze: U - N, zakladCena: Z, zakladDph: Z * dph, zakladSDph: Z * (1 + dph),
      priplatkyCena: P, priplatkyDph: P * dph, priplatkySDph: P * (1 + dph) };
    r.vsSachty = vys.map((x, i) => ({ ks: ksy[i], predZaokr: ksy[i] * (x.souhrn.zakladNaklad + x.souhrn.zakladMarze), vysl: x }));
    r.vsPredZaokr = U;
    return r;
  }
  const orig = { vypocetZ: window.vypocetZ, renderInputs: window.renderInputs, renderOutputs: window.renderOutputs,
    renderTechspec: window.renderTechspec, renderSpecData: window.renderSpecData, renderDetail: window.renderDetail,
    renderNabidkaOck: window.renderNabidkaOck, renderKryci: window.renderKryci, syncVarianta: window.syncVarianta, render: window.render,
    renderZaokrOck: null };
  function vysledkySachet(v, jekly) {
    const l = sachty();
    return { l, vys: l.map(s => vypocet(s.zadani, v.data.cenik, jekly, v.data.ock.fixes)), ksy: l.map(s => +s.ks || 1) };
  }
  vypocetZ = function (v, jekly) {
    let akt = null; try { akt = aktivniVarianta(ZAK); } catch (e) {}
    if (!v || v !== akt || !vic() || (typeof variantaUzamcena === 'function' && variantaUzamcena(v))) return orig.vypocetZ(v, jekly);
    const { vys, ksy } = vysledkySachet(v, jekly);
    if (VS.force != null) return vys[Math.min(VS.force, vys.length - 1)];
    return soucet(vys, ksy, v.data.cenik);
  };

  /* ---------- rozpočet zaokrouhlení (R7) — celá čísla ---------- */
  function rozpocet(T, castky) {
    if (castky.length === 1) return [T];
    const s = castky.map(x => BigInt(Math.round(x * 100))), S = s.reduce((a, b) => a + b, 0n);
    if (S === 0n) return castky.map(() => 0);
    const TT = BigInt(Math.round(T)), q = s.map(x => TT * x / S), zb = s.map(x => (TT * x) % S);
    let r = TT - q.reduce((a, b) => a + b, 0n);
    const por = s.map((_, i) => i).sort((a, b) => (zb[b] > zb[a] ? 1 : zb[b] < zb[a] ? -1 : 0) || (s[b] > s[a] ? 1 : s[b] < s[a] ? -1 : 0) || a - b);
    for (let i = 0; r > 0n; i++, r--) q[por[i]] += 1n;
    return q.map(Number);
  }
  function rozpis() {
    const r = vypocetAkt();
    if (!r || !r.vsSachty) return null;
    const cn = cenaNabidkyOck(r, SL, ZO);
    const T = cn ? cn.zakladZaokr : r.souhrn.zakladCena;
    return { r, cn, T, ceny: rozpocet(T, r.vsSachty.map(x => x.predZaokr)) };
  }

  /* ---------- obaly kreslení ---------- */
  const sForce = (fn) => function () { if (!vic()) return fn.apply(this, arguments); const p = VS.force; VS.force = VS.akt; try { return fn.apply(this, arguments); } finally { VS.force = p; } };
  renderInputs = function () { sForce(orig.renderInputs)(); vlozZadani(); };
  if (orig.renderTechspec) renderTechspec = function () { sForce(orig.renderTechspec)(); vlozSpec('page-spec'); };
  if (orig.renderSpecData) renderSpecData = sForce(orig.renderSpecData);
  if (orig.renderDetail) renderDetail = sForce(orig.renderDetail);
  renderOutputs = function () {
    orig.renderOutputs();
    if (!vic()) return;
    const out = document.getElementById('outputs');
    if (VS.pohled === 'akt') {
      const kalkS = document.getElementById('ock-kalkulace'), pripS = document.getElementById('ock-priplatky');
      const souhrnHtml = document.getElementById('kalk-souhrn').innerHTML, outHtml = out.innerHTML;
      VS.force = VS.akt;
      try { orig.renderOutputs(); } finally { VS.force = null; }
      const kalkA = document.getElementById('ock-kalkulace').outerHTML, pripA = document.getElementById('ock-priplatky') ? document.getElementById('ock-priplatky').outerHTML : '';
      document.getElementById('kalk-souhrn').innerHTML = souhrnHtml; out.innerHTML = outHtml;
      if (document.getElementById('ock-kalkulace')) document.getElementById('ock-kalkulace').outerHTML = kalkA;
      if (pripA && document.getElementById('ock-priplatky')) document.getElementById('ock-priplatky').outerHTML = pripA;
    } else {
      const k = document.getElementById('ock-kalkulace'); if (k) k.classList.add('vs-soucet-ro');
    }
    vlozKalkulace();
  };
  if (orig.renderNabidkaOck) renderNabidkaOck = function () { orig.renderNabidkaOck(); vlozNabidka(); };
  if (orig.renderKryci) renderKryci = function () { orig.renderKryci(); vlozKryci(); };
  syncVarianta = function () { orig.syncVarianta(); VS.akt = Math.min(VS.akt, dalsi().length); if (VS.akt > 0) Z = zadaniAkt(); };

  /* ---------- vkládání prvků ---------- */
  function vlozZadani() {
    const karta = document.getElementById('ock-zadani');
    if (!karta) return;
    const h2 = karta.querySelector('h2');
    const n = sachty().length, m1 = !OCK.fixes;
    const pole = document.createElement('span');
    pole.className = 'vs-pocet'; pole.setAttribute('onclick', 'event.stopPropagation()');
    pole.innerHTML = `Počet šachet v nabídce <select class="mini" id="vsPocet" onchange="VS_pocet(this.value)" title="${m1 ? 'Model 1 počítá jen jednu šachtu' : 'počet různých šachet v nabídce'}">${
      Array.from({ length: 10 }, (_, k) => k + 1).map(k => `<option value="${k}" ${k === n ? 'selected' : ''} ${m1 && k > 1 ? 'disabled' : ''}>${k}</option>`).join('')}</select>${rt('R16', 'R17')}`;
    const vpravo = h2.lastElementChild && h2.lastElementChild.tagName === 'SPAN' && h2.children.length > 1 ? h2.lastElementChild : null;
    h2.insertBefore(pole, vpravo);
    if (!vic() && !VS.potvrdit) return;
    const l = sachty();
    if (vic()) { const t = h2.firstElementChild; if (t) t.innerHTML = t.innerHTML + ' — ' + esc(nazevS(l[VS.akt], VS.akt)); }
    // karta Šachty varianty před Zadáním
    const s = l[VS.akt];
    const tabs = `<span class="rada-prep">${l.map((x, i) => `<button type="button" class="${i === VS.akt ? 'on' : ''}" onclick="VS_akt(${i})">${esc(nazevS(x, i))}${x.ks > 1 ? ' · ' + x.ks + ' ks' : ''}</button>`).join('')}</span>`;
    const potvrd = VS.potvrdit ? `<div class="seznam-varovani" style="margin:8px 0"><b>Smazat ${VS.potvrdit.length === 1 ? 'šachtu' : 'šachty'} ${esc(VS.potvrdit.map(i => nazevS(l[i], i)).join(', '))}?</b>
        Smaže se i ${VS.potvrdit.length === 1 ? 'její' : 'jejich'} zadání, můstky a příplatky.${l.length - VS.potvrdit.length === 1 ? ' Kalkulátor se vrátí do zobrazení pro jednu šachtu.' : ''}${rt('R18')}
        <span style="display:inline-flex;gap:8px;margin-left:10px"><button class="mini vyzva" onclick="VS_potvrd(true)">Smazat</button><button class="mini" onclick="VS_potvrd(false)">Zrušit</button></span></div>` : '';
    const inner = `<div class="vs-blok">${potvrd}<div class="vs-radek">${tabs}${rt('R1', 'R10')}<span class="note" style="margin:0">${l.length} z 10 šachet</span></div>
      <div class="vs-radek"><label>Název</label><input type="text" maxlength="80" value="${esc(s.nazev || '')}" placeholder="${esc(nazevS(s, VS.akt))}" onchange="VS_nazev(this.value)">
        <label style="margin-left:12px">Počet stejných kusů</label><input type="number" min="1" max="20" value="${s.ks}" onchange="VS_ks(this.value)">${rt('R2', 'R12')}
        <button class="mini" onclick="VS_kopie()" ${l.length >= 10 || !OCK.fixes ? 'disabled' : ''}>Kopírovat šachtu</button>
        <button class="mini" onclick="VS_smaz()" ${VS.akt === 0 ? 'disabled title="šachtu 1 nejde smazat"' : ''}>Smazat šachtu</button></div>
      <div class="note">Karty Zadání šachty a Dimenze profilů patří vybrané šachtě. Hlavička zakázky, ceník, přirážka, sleva a ruční ceny jsou společné pro variantu.</div></div>`;
    if (vic() || VS.potvrdit) karta.insertAdjacentHTML('beforebegin', kartaRezim('ock', 'vsSachty', 'Šachty varianty' + rt('R1'), inner, 'vs-sachty'));
    // Model 1 nejde u víc šachet
    const rez = document.querySelector('select.rezim-vypoctu option[value="compat"]');
    if (rez && vic()) { rez.disabled = true; rez.textContent = 'Model 1 – 1:1 jako Excel (jen jedna šachta)'; }
  }
  function vlozKalkulace() {
    const l = sachty();
    const k = document.getElementById('ock-kalkulace');
    if (k) {
      const h2 = k.querySelector('h2');
      const prep = document.createElement('span');
      prep.setAttribute('onclick', 'event.stopPropagation()'); prep.style.fontWeight = '400';
      prep.innerHTML = `<span class="rada-prep">${l.map((x, i) => `<button type="button" class="${VS.pohled === 'akt' && i === VS.akt ? 'on' : ''}" onclick="VS_akt(${i})">${esc(nazevS(x, i))}</button>`).join('')}<button type="button" class="${VS.pohled === 'soucet' ? 'on' : ''}" onclick="VS_soucet()">Součet</button></span>${rt('R2', 'R3')}`;
      const vpravo = h2.children.length > 1 ? h2.lastElementChild : null;
      h2.insertBefore(prep, vpravo);
      if (VS.pohled === 'soucet') k.querySelector('.body').insertAdjacentHTML('afterbegin', `<div class="note" style="margin-bottom:6px">Součet šachet × ks — jen ke čtení. Stejné položky (název a sazba) jsou sečtené. Upravuje se ve vybrané šachtě.</div>`);
      else k.querySelector('.body').insertAdjacentHTML('afterbegin', `<div class="note" style="margin-bottom:6px">Šachta ${esc(nazevS(l[VS.akt], VS.akt))}${l[VS.akt].ks > 1 ? ' (1 ks; v součtu × ' + l[VS.akt].ks + ')' : ''} — cena šachty se na tisíce nezaokrouhluje, zaokrouhlí se až součet.${rt('R3')}</div>`);
    }
    const p = document.getElementById('ock-priplatky');
    if (p && VS.pohled === 'akt') p.querySelector('.body').insertAdjacentHTML('afterbegin', `<div class="note" style="margin-bottom:6px">Výběr příplatků do nabídky je po šachtách — zde pro ${esc(nazevS(l[VS.akt], VS.akt))}. V nabídce se stejné příplatky všech šachet sloučí do jednoho řádku s počtem (pohled Součet).${rt('R8')}</div>`);
    // rozpis v hlavičce ceny
    const rp = rozpis(), souhrn = document.querySelector('#kalk-souhrn .card .body');
    if (rp && souhrn) souhrn.insertAdjacentHTML('beforeend', `<div class="vs-radek" style="margin-top:10px">${l.map((x, i) => `<span class="pill">${esc(nazevS(x, i))} · ${x.ks} ks · ${kcF(rp.ceny[i])}</span>`).join('')}<span class="note" style="margin:0">ceny šachet po rozpočtu zaokrouhlení</span>${rt('R7')}</div>`);
  }
  function tabulkaSachet(rp) {
    const l = sachty();
    return `<table class="vs-tab" style="max-width:640px"><tbody><tr><th>Šachta</th><th class="r">ks</th><th class="r">Cena bez DPH</th></tr>
      ${l.map((x, i) => `<tr><td>${esc(nazevS(x, i))}${(typeof mustkyPocet === 'function' && mustkyPocet(x.zadani) > 0) ? ', vč. můstků' : ''}</td><td class="r">${x.ks}</td><td class="r">${kcF(rp.ceny[i])}</td></tr>`).join('')}
      <tr><td style="font-weight:600">Cena celkem před slevou</td><td></td><td class="r" style="font-weight:600">${kcF(rp.T)}</td></tr>
      ${rp.cn && rp.cn.slevaKcVykaz > 0 ? `<tr><td>Sleva ${(Math.round(rp.cn.slevaPct * 1000) / 10).toLocaleString('cs-CZ')} %</td><td></td><td class="r">−${kcF(rp.cn.slevaKcVykaz)}</td></tr>` : ''}
      <tr><td style="font-weight:600">Cena nabídky bez DPH</td><td></td><td class="r" style="font-weight:600">${kcF(rp.cn ? rp.cn.cena : rp.T)}</td></tr></tbody></table>`;
  }
  function mustkyPoSachtach(rp) {
    const l = sachty();
    const radky = l.map((x, i) => { const t = (typeof kryciMustkyText === 'function') ? kryciMustkyText(rp.r.vsSachty[i].vysl) : ''; return t ? `<tr><td>${esc(nazevS(x, i))}${x.ks > 1 ? ' (' + x.ks + ' ks)' : ''}</td><td>${esc(t)}</td></tr>` : ''; }).join('');
    return radky ? `<div class="note" style="font-weight:600;margin-top:10px">Technická část — MŮSTKY po šachtách</div><table class="vs-tab" style="max-width:900px"><tbody><tr><th>Šachta</th><th>Můstky (rozměr, podlaha, zábradlí, kotvení, sloupy)</th></tr>${radky}</tbody></table>` : '';
  }
  function vlozNabidka() {
    if (!vic()) return;
    const rp = rozpis(); if (!rp) return;
    const zao = document.querySelector('#ock-zaokr .body');
    if (zao) zao.insertAdjacentHTML('beforeend', `<div class="note" style="font-weight:600;margin-top:10px">Rozpočet zaokrouhlení do šachet${rt('R7')}</div>
      <table class="vs-tab" style="max-width:760px"><tbody><tr><th>Šachta</th><th class="r">ks</th><th class="r">Spočteno (ks × cena)</th><th class="r">V nabídce</th></tr>
      ${sachty().map((x, i) => `<tr><td>${esc(nazevS(x, i))}</td><td class="r">${x.ks}</td><td class="r">${(Math.round(rp.r.vsSachty[i].predZaokr * 100) / 100).toLocaleString('cs-CZ', { minimumFractionDigits: 2 })} Kč</td><td class="r">${kcF(rp.ceny[i])}</td></tr>`).join('')}
      <tr><td style="font-weight:600">Celkem</td><td></td><td class="r">${(Math.round(rp.r.vsPredZaokr * 100) / 100).toLocaleString('cs-CZ', { minimumFractionDigits: 2 })} Kč</td><td class="r" style="font-weight:600">${kcF(rp.ceny.reduce((a, b) => a + b, 0))}</td></tr></tbody></table>
      <div class="note">Na tisíce se zaokrouhlí jen součet${rt('R3')}; rozdíl se rozdělí podle podílu šachty na ceně, chybějící koruny dostanou šachty s největším zbytkem. Tabulka v nabídce sedí na korunu.</div>`);
    const nab = document.querySelector('#ock-nabidka .body');
    if (nab) {
      const anchor = [...nab.querySelectorAll('.note')].find(n => /živý náhled/.test(n.textContent));
      const html = `<div class="seznam-varovani" style="margin:10px 0">Tisk nabídky s víc šachtami potřebuje novou Word šablonu (smyčka šachet, v17). Dnešní šablona umí jen jednu šachtu — tisk se u víc šachet zastaví s odkazem na novou šablonu.${rt('R4')}</div>
        <div class="note" style="font-weight:600;margin-top:8px">Cena díla — rozpis po šachtách (do nabídky)${rt('R4', 'R12', 'R14')}</div>${tabulkaSachet(rp)}${mustkyPoSachtach(rp)}`;
      if (anchor) anchor.insertAdjacentHTML('beforebegin', html); else nab.insertAdjacentHTML('afterbegin', html);
    }
  }
  function vlozKryci() {
    if (!vic()) return;
    const rp = rozpis(); const pg = document.getElementById('page-kryci'); if (!rp || !pg) return;
    pg.insertAdjacentHTML('afterbegin', kartaRezim('ock', 'vsKryci', 'Rozpis po šachtách (krycí list)' + rt('R9'),
      `<div class="note" style="margin-bottom:6px">Jeden krycí list za variantu: předmět ${sachty().length} šachty, ${sachty().reduce((a, s) => a + s.ks, 0)} ks; hodnota a hodiny jsou součtem šachet.</div>${tabulkaSachet(rp)}${mustkyPoSachtach(rp)}`, 'vs-kryci'));
  }
  function vlozSpec(id) {
    if (!vic()) return;
    const pg = document.getElementById(id); if (!pg) return;
    const l = sachty();
    pg.insertAdjacentHTML('afterbegin', `<div class="card"><div class="body"><div class="vs-radek">Specifikace šachty <span class="rada-prep">${l.map((x, i) => `<button type="button" class="${i === VS.akt ? 'on' : ''}" onclick="VS_akt(${i})">${esc(nazevS(x, i))}${x.ks > 1 ? ' · ' + x.ks + ' ks shodné' : ''}</button>`).join('')}</span>${rt('R1')}
      <span class="note" style="margin:0">Dokument bude mít společné údaje jednou a oddíl za každou šachtu; zde se upravuje vybraná šachta.</span></div></div></div>`);
  }

  /* ---------- obsluha ---------- */
  const kopie = o => JSON.parse(JSON.stringify(o));
  window.VS_pocet = function (v) {
    const n = Math.max(1, Math.min(10, +v || 1)), l = sachty();
    if (n > l.length) {
      if (!OCK.fixes) { render(); return; }
      if (!Array.isArray(OCK.dalsi)) OCK.dalsi = [];
      if (!OCK.nazev) OCK.nazev = 'Šachta 1';
      while (sachty().length < n) {
        const posl = sachty()[sachty().length - 1];
        OCK.dalsi.push({ id: 's' + Date.now().toString(36) + OCK.dalsi.length, nazev: 'Šachta ' + (sachty().length + 1), ks: 1, zadani: kopie(posl.zadani) });
      }
      VS.potvrdit = null; VS_akt(sachty().length - 1); return;
    }
    if (n < l.length) VS.potvrdit = l.map((_, i) => i).slice(n);
    render();
  };
  window.VS_potvrd = function (ano) {
    if (ano && VS.potvrdit) {
      const smaz = new Set(VS.potvrdit.filter(i => i > 0));
      OCK.dalsi = dalsi().filter((_, j) => !smaz.has(j + 1));
      if (!OCK.dalsi.length && (+OCK.ks || 1) === 1) { delete OCK.dalsi; delete OCK.nazev; delete OCK.ks; }
      VS.akt = 0; Z = OCK.zadani; VS.pohled = 'akt';
    }
    VS.potvrdit = null; render();
  };
  window.VS_akt = function (i) { VS.akt = Math.max(0, Math.min(i, dalsi().length)); VS.pohled = 'akt'; Z = zadaniAkt(); render(); };
  window.VS_soucet = function () { VS.pohled = 'soucet'; render(); };
  window.VS_nazev = function (t) { t = String(t || '').slice(0, 80); if (VS.akt === 0) OCK.nazev = t; else dalsi()[VS.akt - 1].nazev = t; render(); };
  window.VS_ks = function (v) { const k = Math.max(1, Math.min(20, Math.round(+v) || 1)); if (VS.akt === 0) OCK.ks = k; else dalsi()[VS.akt - 1].ks = k; render(); };
  window.VS_kopie = function () { if (sachty().length >= 10) return; const s = sachty()[VS.akt]; if (!Array.isArray(OCK.dalsi)) OCK.dalsi = [];
    OCK.dalsi.push({ id: 's' + Date.now().toString(36), nazev: nazevS(s, VS.akt) + ' (kopie)', ks: s.ks, zadani: kopie(s.zadani) }); VS_akt(sachty().length - 1); };
  window.VS_smaz = function () { if (VS.akt > 0) { VS.potvrdit = [VS.akt]; render(); } };
  window.VS_cenik = function (rez) { if (typeof PROTO_cenikNastav === 'function') PROTO_cenikNastav(rez); syncVarianta(); render(); kresliPanel(); };
  window.VS_navod = function () {
    let n = document.getElementById('vsNavod');
    if (n) { n.remove(); return; }
    n = document.createElement('div'); n.id = 'vsNavod'; n.className = 'vs-navod';
    n.innerHTML = `<button type="button" class="mini" style="float:right" onclick="VS_navod()">Zavřít</button><h3>Co si proklikat</h3><ol>
      <li><b>Jedna šachta</b> = kalkulátor jako dnes (základ v6.11.3, další verze main)${rt('R16')}. V kartě <b>Zadání šachty</b> vpravo v nadpisu nastavte <b>Počet šachet v nabídce</b> na 2 — zapne se režim víc šachet${rt('R17')}.</li>
      <li><b>Můstky u jedné šachty:</b> v Zadání šachty dejte „Můstky mezi budovou a OCK“ = 1 — objeví se karta <b>Můstky</b>. Změňte podlahu, zábradlí, kotvení, sloupy, „+ další provedení“. Cena se přepočítá; v nabídce (Word, šablona v16) má jedna šachta řádky Výtahová šachta / Můstky / Cena celkem jako v v6.11.3${rt('R15')}.</li>
      <li><b>Můstky u Šachty 2:</b> přepněte na Šachtu 2 (karta Šachty varianty), přidejte jí jiné můstky. Každá šachta má své skupiny; cena se přepočítá v šachtě i v součtu.</li>
      <li><b>Ceník:</b> v panelu vlevo dole přepněte <b>Zkušební ceník můstků</b> skladebný ↔ starý (#354) — starý počítá můstky vzorcem a karta ukáže lištu upozornění.</li>
      <li><b>Kalkulace:</b> přepínač šachet / Součet v Cenové kalkulaci (sekce MŮSTKY po šachtách, v Součtu sečtená).</li>
      <li><b>Cenová nabídka:</b> rozpis po šachtách s „vč. můstků“ a technická část MŮSTKY po šachtách; rozpočet zaokrouhlení v kartě Obchodní zaokrouhlení${rt('R7')}.</li>
      <li><b>Krycí list a Technická specifikace:</b> rozpis po šachtách, můstky každé šachty; ve specifikaci přepínač šachty.</li>
      <li><b>Model 1:</b> u jedné šachty přepněte Režim výpočtu na Model 1 — karta Můstky má jen počet a délku, počet šachet nad 1 nejde.</li>
      <li><b>Zpět na jednu šachtu:</b> Počet šachet = 1 → potvrzení se jmény mazaných šachet${rt('R18')}.</li></ol>`;
    document.body.appendChild(n);
  };
  window.VS_stav = function () { const rp = vic() ? rozpis() : null; return { vic: vic(), pocet: sachty().length, akt: VS.akt, rp: rp && { T: rp.T, ceny: rp.ceny, cena: rp.cn && rp.cn.cena } }; };

  render();
})();
