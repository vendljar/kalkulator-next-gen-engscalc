/* ================= LHŮTY PROJ — Nastavení → Firma (D8) =================
 * Tabulka lhůt projekce (jen administrátor). Ukládá se do NAST.firma.lhutyProj
 * a zveřejňuje s firemními údaji (firmaKZverejneni → /api/firma). Logika
 * a kontrola tvaru jsou v src/lhuty_proj.js. */

function lhutyUiDnes() {
  return (typeof objDnes === 'function') ? objDnes() : new Date().toISOString().slice(0, 10);
}
/* Zápis jedné meze (`kraj` = 'od' | 'do'). Prázdná dolní mez = bez rozpětí.
 * Změna čísla posune datum platnosti na dnešek (lze přepsat). */
function lhutyUiSet(id, kraj, hodnota) {
  if (!jeAdmin()) { hlaska('Lhůty PROJ smí měnit jen administrátor.'); return; }
  const f = NAST.firma || (NAST.firma = firmaDefault());
  const t = JSON.parse(JSON.stringify(f.lhutyProj && typeof f.lhutyProj === 'object' ? f.lhutyProj : lhutyProjEf(null)));
  t.v = 1;
  if (!t.radky || typeof t.radky !== 'object') t.radky = {};
  if (!t.radky[id]) t.radky[id] = Object.assign({}, lhutyProjEf(null).radky[id]);
  const s = String(hodnota == null ? '' : hodnota).trim().replace(',', '.');
  if (kraj === 'od' && s === '') delete t.radky[id].od;
  else t.radky[id][kraj] = /^\d+(\.\d{1,2})?$/.test(s) ? Number(s) : s;
  t.platnostOd = lhutyUiDnes();
  firmaSet('lhutyProj', t);
}
function lhutyUiPlatnost(hodnota) {
  if (!jeAdmin()) { hlaska('Lhůty PROJ smí měnit jen administrátor.'); return; }
  const f = NAST.firma || (NAST.firma = firmaDefault());
  const t = JSON.parse(JSON.stringify(f.lhutyProj && typeof f.lhutyProj === 'object' ? f.lhutyProj : lhutyProjEf(null)));
  t.platnostOd = String(hodnota || '');
  firmaSet('lhutyProj', t);
}
async function lhutyUiVychozi() {
  if (!jeAdmin()) return;
  if (!await potvrd('Vrátit lhůty PROJ na výchozí hodnoty z textu nabídky?', { nadpis: 'Lhůty PROJ' })) return;
  firmaSet('lhutyProj', undefined);
}

/* Řádky termínů s pevným číslem (vlastní znění v Nastavení → Smlouvy /
 * Šablony nebo vlastní překlad), které tabulka neovládne. */
function lhutyUiPevne(f) {
  const bez = PODMINKY.podminkyEf(f);   // surové znění (bez lhutyProj = bez dosazení)
  const out = [];
  PODMINKY.PODMINKY_JAZYKY.forEach(L => {
    const P = (L !== 'cz' && typeof tr === 'function') ? (x => tr(x, L)) : (x => x);
    out.push(...lhutyProjPevneRadky(PODMINKY.podminkyTextProj(bez, 'terminy', L, P), L));
  });
  return out;
}

function lhutyProjKarta() {
  if (typeof lhutyProjEf !== 'function') return '';
  const f = NAST.firma || {};
  const ulozeno = f.lhutyProj && typeof f.lhutyProj === 'object' ? f.lhutyProj : null;
  const vady = lhutyProjVady(ulozeno);
  const ef = lhutyProjEf(ulozeno);
  const surove = (id, kraj) => {
    const r = ulozeno && ulozeno.radky && ulozeno.radky[id];
    const x = r ? r[kraj] : ef.radky[id][kraj];
    return x == null ? '' : String(x).replace('.', ',');
  };
  const dis = jeAdmin() ? '' : ' disabled';
  const radky = LHUTY_PROJ_DEF.map(d => `<tr>
      <td>${esc(d.label)}</td>
      <td><input ${CISLO_POLE} style="width:60px;text-align:right" value="${esc(surove(d.id, 'od'))}"
        placeholder="—" onchange="lhutyUiSet('${escJs(d.id)}', 'od', this.value)"${dis}></td>
      <td><input ${CISLO_POLE} style="width:60px;text-align:right" value="${esc(surove(d.id, 'do'))}"
        onchange="lhutyUiSet('${escJs(d.id)}', 'do', this.value)"${dis}></td>
      <td>${d.j === 'm' ? 'měsíce' : 'týdny'}</td>
      <td class="note">${esc(d.pozn || '')}</td>
      <td class="note"><code>{${esc(lhutyProjSymbol(d.id))}}</code></td></tr>`).join('');
  let pevne = [];
  try { pevne = lhutyUiPevne(f); } catch (e) { pevne = []; }
  const ukazka = (() => {
    try {
      const efp = Object.assign(PODMINKY.podminkyEf(f), { lhutyProj: ef });
      return PODMINKY.podminkyTextProj(efp, 'terminy', 'cz', x => x)
        .filter(r => LHUTY_PROJ_SEKCE_TEXTU.indexOf(r[2]) >= 0)
        .map(r => `<li><b>${esc(r[0])}</b> — ${esc(r[1])}</li>`).join('');
    } catch (e) { return ''; }
  })();
  return `<div class="sec-title" id="lhutyProjKarta">Lhůty PROJ (termíny krycího listu a nabídky)</div>
    <div class="note" style="margin-top:0">Z tabulky se <b>po prodeji</b> (datum podpisu z tlačítka Prodáno) dopočítají termíny
      v krycím listu PROJ — řetězem jen přes činnosti, které varianta nabízí; u rozpětí se počítá s <b>horní mezí</b>,
      úřady v měsících (měsíc = ${esc(lhutyProjCisloText(LHUTY_PROJ_TYDNU_MESIC, 'cz'))} týdne). Táž čísla jdou do textu termínů
      v nabídce PROJ (online i Word, všechny jazyky). Cenová nabídka zůstává v týdnech. Odeslané nabídky a prodané
      zakázky drží lhůty z doby odeslání / prodeje — změna tady je nemění. Zveřejňuje se s firemními údaji.</div>
    ${vady.length ? `<div class="note" style="color:var(--warn)">⚠ ${esc(vady.join('; '))} — v nabídce i výpočtu platí výchozí lhůty, zveřejnit to nejde.</div>` : ''}
    <div class="row"><label>Platnost od</label>
      <input type="date" value="${esc(ef.platnostOd)}" onchange="lhutyUiPlatnost(this.value)"${dis}>
      <span class="note" style="flex:none;width:210px;font-size:11.5px">${ulozeno ? 'upraveno' : 'výchozí z textu nabídky'}</span></div>
    <table class="tbl"><thead><tr><th>Lhůta</th><th>od</th><th>do</th><th>jednotka</th><th>od čeho</th><th>symbol v textu</th></tr></thead>
      <tbody>${radky}</tbody></table>
    ${pevne.length ? `<div class="note" style="color:var(--warn);margin-top:6px" data-lhuty-pevne="1">⚠ Tyto termíny mají <b>pevný text</b>
      (vlastní znění v Nastavení → Smlouvy / Šablony nebo vlastní překlad) — čísla v nich se z tabulky nemění:
      <ul>${pevne.map(p => `<li>${esc(p.jazyk.toUpperCase())}: ${esc(p.cinnost)} — „${esc(p.text)}“</li>`).join('')}</ul>
      Vraťte je na výchozí znění (prázdné pole), nebo čísla upravte ručně.</div>` : ''}
    ${ukazka ? `<details style="margin-top:6px"><summary class="note">Termíny v nabídce PROJ s těmito lhůtami (česky)</summary><ul class="note">${ukazka}</ul></details>` : ''}
    <div class="btns" style="margin-top:6px"><button class="mini" onclick="lhutyUiVychozi()"${dis}>↺ Výchozí lhůty</button></div>`;
}
