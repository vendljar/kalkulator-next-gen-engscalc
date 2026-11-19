/* ============================================================
 * OBJEDNÁVKA / SMLOUVA PROJ — karta, tiskový náhled a Word (D3, 19. 11. 2026)
 * Data skládá objednavka_proj.js (z nabídky PROJ, ceny = jádro).
 *
 * Karta stojí na KONCI krycího listu PROJ, hned pod Smlouvou o dílo PROJ:
 * objednávka je smluvní dokument ke stejné nabídce jako SoD PROJ (obchodník
 * volí jedno nebo druhé) a bere platební kalendář z plánu plateb a zástupce
 * zákazníka, které se vyplňují právě v krycím listu. Karta nabídky PROJ
 * (Kalkulace PROJ) zůstává pro nabídku samotnou.
 * ============================================================ */

function objednavkaProjKarta() {
  const zab = (typeof ukazkoveZabranaAttr === 'function') ? ukazkoveZabranaAttr('objednavkaProj') : '';
  return `<div class="note">Jednostránková objednávka, kterou zákazník jen podepíše. Číslo vznikne z čísla nabídky
      (<code>…-CN-…</code> → <code>…-OBJ-…</code>), řádky jsou nabízené činnosti varianty PROJ s rozsahem prací z nabídky,
      ceny, sleva, cestovné i DPH jsou <b>tytéž jako v cenové nabídce PROJ</b>. Pod tabulkou je odkaz na cenovou nabídku,
      platební kalendář a termíny.</div>
    <div class="btns" style="margin-top:6px">
      <button class="primary cteni-ok"${zab} onclick="objednavkaProjNahled()">Náhled a tisk objednávky (PDF)</button>
      <button class="cteni-ok"${zab} onclick="objednavkaProjWord()">Vytvořit objednávku (Word)</button>
    </div>
    <div class="note objednavkaProjStav" style="margin-top:4px"></div>`;
}

function objednavkaProjStavText(t) {
  document.querySelectorAll('.objednavkaProjStav').forEach(el => { el.textContent = t; });
}

/* Společný vstup: zábrany, pohled zákazníka (víc zákazníků: jen řídící), data. */
function objednavkaProjVstup() {
  const akt = (typeof aktivniVarianta === 'function') ? aktivniVarianta(ZAK) : (ZAK.varianty || [])[0];
  if (typeof dokumentZabranaHlas === 'function' && dokumentZabranaHlas('objednavkaProj', akt, objednavkaProjStavText)) return null;
  const vt = (typeof vzTiskVstup === 'function') ? vzTiskVstup('objednavkaProj', akt, objednavkaProjStavText) : { zak: ZAK, varianta: akt };
  if (!vt) return null;
  const o = objednavkaProjData(vt.zak, vt.varianta);
  if (o.chyba) {
    objednavkaProjStavText('Dokument nevznikl — ' + o.chyba);
    if (typeof hlaska === 'function') hlaska(o.chyba, { nadpis: 'Objednávku nelze vytvořit' });
    return null;
  }
  return { vt, o };
}

function objednavkaProjWord() {
  const x = objednavkaProjVstup();
  if (!x) return;
  objednavkaProjStavText('Vytvářím objednávku (Word)…');
  dokumentVygeneruj('objednavkaProj', null, x.vt.zak, x.vt.varianta, typeof JEKLY !== 'undefined' ? JEKLY : null)
    .then(res => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(res.blob);
      a.download = res.nazevSouboru + '.docx';
      a.click();
      objednavkaProjStavText('Hotovo – ' + res.nazevSouboru + '.docx je ve Stažených.'
        + (x.o.upozorneni.length ? ' Pozor: ' + x.o.upozorneni.join(' ') : ''));
    })
    .catch(err => objednavkaProjStavText('Chyba: ' + err.message));
}

/* HTML dokumentu (bez lišty) — testy ho skládají i bez okna. Pořadí bloků
 * podle vzoru „Přijatá objednávka": vpravo název, číslo dokladu, zakázka;
 * vlevo dodavatel, pod ním místo určení / objednatel; datum případu; tabulka
 * se součtovým řádkem; rámeček Celkem Kč; podpis; poznámka; Vystavil. */
function objednavkaProjHtml(o) {
  const kc = o.texty.kc;
  const strana = (nadpis, r) => `<div class="strana"><div class="stitek">${esc(nadpis)}</div>
    <b>${esc(r[0])}</b>${r.slice(1).map(x => `<br>${esc(x)}`).join('')}</div>`;
  const blokDod = strana('Dodavatel', objednavkaProjStranaRadky(o.dodavatel));
  const blokObj = strana('Místo určení / Objednatel', objednavkaProjStranaRadky(o.objednatel, objednavkaProjMisto(o)));
  const radky = o.radky.map(x => `<tr class="radek" data-sekce="${esc(x.sekce)}"><td>${esc(x.c)}</td><td>${esc(x.oznaceni)}</td>
    <td><b>${esc(x.nazev)}</b>${x.popis.length ? `<div class="rozsah">${x.popis.map((t, i) => `${i ? '<br>' : ''}${esc(t)}`).join('')}</div>` : ''}</td>
    <td class="c">${esc(x.mnozstvi)}</td><td class="c">${esc(x.mj)}</td><td class="c">${esc(kc(x.cenaJedn))}</td>
    <td class="c">${esc(kc(x.cenaCelkem))}</td><td class="c">${esc(kc(x.celkemBezDph))}</td><td class="c">${esc(x.dphPct)} %</td>
    <td class="c">${esc(kc(x.celkemSDph))}</td></tr>`).join('');
  const sleva = o.sleva ? `<tr class="sleva"><td></td><td></td><td>Sleva ${esc(o.sleva.pct)} %</td><td></td><td></td><td></td>
    <td class="c">${esc(kc(o.sleva.bezDph))}</td><td class="c">${esc(kc(o.sleva.bezDph))}</td><td class="c">${esc(o.souhrn.dphPct)} %</td>
    <td class="c">${esc(kc(o.sleva.sDph))}</td></tr>` : '';
  return `<table class="hlava"><tr><td style="width:58%">${dokLogoHtml()}${blokDod}${blokObj}</td>
      <td class="vpravo"><h1>${esc(o.nazev)}</h1>
        <div>Číslo dokladu: <b id="objCislo">${esc(o.cislo)}</b></div>
        ${o.cisloZakazky ? `<div>Zakázka: <b id="objZakazka">${esc(o.cisloZakazky)}</b></div>` : ''}</td></tr></table>
    <div class="datum">Datum případu: <b>${esc(o.datumVystaveni)}</b></div>
    <table class="polozky"><thead><tr>${OBJ_PROJ_SLOUPCE.map(t => `<th>${esc(t)}</th>`).join('')}</tr></thead>
      <tbody>${radky}${sleva}
      <tr class="soucet"><td colspan="6" class="c">Součet</td><td class="c">${esc(o.texty.bezDph)}</td><td class="c">${esc(o.texty.bezDph)}</td>
        <td></td><td class="c">${esc(o.texty.sDph)}</td></tr></tbody></table>
    <div class="pod-tabulkou"><div class="mimo">${o.mimoCenu.length ? `Mimo celkovou cenu (podle cenové nabídky): ${o.mimoCenu.map(esc).join('; ')}` : ''}</div>
      <table class="ramecek"><tr><td>Celkem bez DPH</td><td class="c">${esc(o.texty.bezDph)}</td></tr>
        <tr><td>DPH ${esc(o.souhrn.dphPct)} %</td><td class="c">${esc(o.texty.dph)}</td></tr>
        <tr class="celkem"><td>Celkem Kč</td><td class="c">${esc(o.texty.sDph)}</td></tr></table></div>
    <div class="podpis">Datum: ……………………………… &nbsp;&nbsp;&nbsp; Podpis objednatele: ………………………………………………</div>
    <div class="pozn"><b>Poznámka</b><p id="objPoznamka">${esc(o.poznamka)}</p>
      ${o.platebniKalendar.length ? `<b>Platební kalendář</b><p>${o.platebniKalendar.map((t, i) => `${i ? '<br>' : ''}${esc(t)}`).join('')}</p>` : ''}
      ${o.terminy.length ? `<b>Termíny</b><p>${o.terminy.map((x, i) => `${i ? '<br>' : ''}${esc(x[0])}${x[1] ? ` – ${esc(x[1])}` : ''}`).join('')}</p>` : ''}</div>
    ${o.vystavil ? `<div class="vystavil">Vystavil: ${esc(o.vystavil)}</div>` : ''}`;
}

function objednavkaProjCss() {
  return `body{font:11px/1.4 "Segoe UI",sans-serif;color:#1a2332;max-width:860px;margin:18px auto;padding:0 14px}
    h1{font-size:18px;margin:0 0 4px}
    table{width:100%;border-collapse:collapse}
    table.hlava td{vertical-align:top;padding:0 4px} td.vpravo{text-align:right}
    .strana{margin-top:8px}
    .stitek{font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:#6b7686;border-bottom:1px solid #dfe4ec;margin-bottom:2px;max-width:340px}
    .datum{margin:10px 0 4px}
    table.polozky{margin-top:6px} table.polozky th{background:#2b3850;color:#fff;font-size:9.5px;padding:4px;text-align:left}
    table.polozky td{border-bottom:1px solid #dfe4ec;padding:4px;vertical-align:top}
    td.c,table.polozky th:nth-child(n+4){text-align:right;white-space:nowrap}
    .rozsah{font-size:9px;line-height:1.3;color:#4b5563;margin-top:2px}
    tr.radek{page-break-inside:avoid} tr.soucet td{background:#eef2f8;font-weight:700}
    .pod-tabulkou{display:flex;gap:16px;justify-content:space-between;align-items:flex-start;margin-top:8px;page-break-inside:avoid}
    .mimo{font-size:10px;color:#4b5563;flex:1}
    table.ramecek{width:auto;min-width:300px;border:2px solid #2b3850} table.ramecek td{padding:3px 8px}
    table.ramecek tr.celkem td{font-weight:700;font-size:13px;background:#eef2f8;border-top:1px solid #2b3850}
    .podpis{margin:28px 0 14px}
    .pozn{font-size:10px} .pozn p{margin:2px 0 8px} .vystavil{font-size:10px;margin-top:10px}
    ${dokHlavickaCss()}
    .bar{position:sticky;top:0;background:#fff;border-bottom:1px solid #e5e9f0;padding:8px 0;margin-bottom:8px;z-index:5}
    .bar button{font:13px "Segoe UI";padding:6px 14px;border:1px solid #1d4ed8;background:#1d4ed8;color:#fff;border-radius:6px;cursor:pointer}
    .obj-upoz{background:#fffbeb;border:1px solid #fbbf24;color:#78350f;border-radius:6px;padding:7px 11px;margin:0 0 8px;font-size:12px}
    ${tiskListaCss()}
    @page{size:A4;margin:10mm 0 12mm 0;@bottom-right{content:"Strana " counter(page) " / " counter(pages);font:9px "Segoe UI",sans-serif;color:#6b7686;margin-right:12mm}}
    @media print{.noprint{display:none} body{margin:0;padding:0 12mm}}`;
}

/* Tiskový náhled (okno → Tisk / Uložit jako PDF). Objednávka variantu
 * nezamyká — ceny bere z nabídky (u odeslané varianty z jejího otisku). */
function objednavkaProjNahled() {
  const x = objednavkaProjVstup();
  if (!x) return;
  const o = x.o;
  const w = oknoNahledu();
  if (!w) return;
  w.document.write(`<!DOCTYPE html><html lang="cs"><head><meta charset="utf-8"><title>${esc(o.nazevSouboru)}</title>
    <style>${objednavkaProjCss()}</style></head><body>
    ${o.upozorneni.map(t => `<div class="obj-upoz noprint">⚠ ${esc(t)}</div>`).join('')}
    ${tiskListaHtml({ dph: false, pozn: 'Objednávku lze před uložením do PDF ručně upravit; do zakázky se změny nepropíšou.' })}
    <div id="dok">${objednavkaProjHtml(o)}</div>
    ${tiskListaSkript({}, null)}</body></html>`);
  w.document.close();
  objednavkaProjStavText('Náhled objednávky ' + o.cislo + ' je otevřený v novém okně.');
}
