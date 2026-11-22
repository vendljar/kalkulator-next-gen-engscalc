/* ============================================================================
 * KOMPLETNÍ NÁHLED PODKLADŮ — OKNO VE VZHLEDU WORDU (dávka NP, J. V. 19. 11. 2026)
 *
 * Obchodník si v náhledu prohlédne, jak nabídka vyjde z Wordu (šablona CN v17),
 * a pak ji teprve vytvoří tlačítkem „Vytvořit nabídku (Word)". Obsah skládá
 * src/nahled_word.js ze stejných dat jako Word (nabidkaData); tady je jen okno:
 *   – stránky A4 pod sebou se záhlavím („Cenová nabídka", logo, linka, číslo
 *     stránky) a zápatím (čárkovaná linka, FIRMA_PATICKA kurzívou modře),
 *   – pruh nad stránkami (netiskne se): jazyk podle volby „Jazyk tisku",
 *     upozornění na prázdná pole, tlačítko Word se stejnými zábranami,
 *   – stránkování podle výšky bloků (tabulka technické části se dělí po
 *     řádcích, nadpis nezůstane sám na konci stránky).
 * Tisk z náhledu není cílem, ale funguje (@media print bez pruhu, stránka
 * = list A4). Zámek varianty se náhledem nemění (náhled nic nezamyká).
 * „Kompletní náhled a tisk nabídky" (nabidkaOckDokument) zůstává beze změny.
 * ============================================================================ */

/* CSS okna. Calibri, náhradou metricky shodné Carlito (systémové písmo —
 * žádný externí server, CSP font-src 'self' data:). */
function nwCss() {
  return `:root{--nw-modra:#1f3864;--nw-tmava:#0d3550;--nw-pruh:#1f3864;--nw-popisek:#eef1f8;--nw-sedy:#ebebeb}
  *{box-sizing:border-box}
  html,body{margin:0;padding:0}
  body{background:#8a94a3;color:#111;font-family:Calibri,Carlito,"Segoe UI",Arial,sans-serif;font-size:10.5pt;line-height:1.25}
  p,h1,h2,h3,h4,h5{margin:0}
  .nw-lista{position:sticky;top:0;z-index:5;background:#fff;border-bottom:1px solid #cfd6e0;padding:8px 16px;font:13px/1.4 "Segoe UI",Arial,sans-serif;color:#1a2332}
  .nw-lista .nw-radek{display:flex;flex-wrap:wrap;align-items:center;gap:8px 14px}
  .nw-lista b.nw-titul{font-size:14px}
  .nw-lista .nw-jazyk{padding:2px 8px;border-radius:10px;background:#eef2ff;color:#1d4ed8;font-weight:600}
  .nw-lista button{font:13px "Segoe UI",Arial,sans-serif;padding:6px 14px;border:1px solid #1d4ed8;background:#fff;color:#1d4ed8;border-radius:6px;cursor:pointer}
  .nw-lista button.nw-primary{background:#1d4ed8;color:#fff}
  .nw-lista button[disabled]{opacity:.5;cursor:not-allowed}
  .nw-lista .nw-zabrana{color:#b91c1c;font-weight:600}
  .nw-lista ul.nw-varovani{margin:6px 0 0;padding-left:20px;color:#92400e}
  .nw-lista .nw-stav{color:#334155}
  #nwTok{width:186mm;margin:12px auto;background:#fff;padding:6mm 12mm}
  #nwStranky{padding:14px 0 30px}
  .nw-strana{position:relative;width:210mm;height:297mm;margin:0 auto 14px;background:#fff;box-shadow:0 2px 10px rgba(0,0,0,.35);overflow:hidden}
  .nw-zahlavi{position:absolute;left:12mm;right:12mm;top:0;height:40mm}
  .nw-cislo{position:absolute;right:0;top:7mm;font-size:9pt}
  .nw-ozdoba{position:absolute;right:6mm;top:13mm;width:26mm;height:7mm;background:#f2c48d;transform:skewX(-28deg);opacity:.85}
  .nw-ozdoba::after{content:"";position:absolute;left:-14mm;top:4.5mm;width:22mm;height:2.5mm;background:#f6d9b3}
  .nw-zahlavi-text{position:absolute;left:0;bottom:4mm;font-size:16pt;font-weight:700;color:#7f7f7f}
  .nw-logo{position:absolute;right:0;bottom:3.2mm;max-height:13mm;max-width:75mm}
  .nw-logo-text{position:absolute;right:0;bottom:3.5mm;font-size:17pt;font-weight:700;letter-spacing:.06em;color:#555}
  .nw-zahlavi-linka{position:absolute;left:0;right:0;bottom:2mm;border-bottom:1.5px solid #7f7f7f}
  .nw-telo{position:absolute;left:12mm;right:12mm;top:43mm;height:229mm;overflow:hidden;display:flex;flex-direction:column}
  .nw-zapati{position:absolute;left:12mm;right:12mm;top:276mm;border-top:1.5px dashed #9dc3e6;padding-top:1.5mm;font-size:9pt;font-style:italic;font-weight:700;color:#9dc3e6}
  /* --- obsah --- */
  .nw-blok{flex:0 0 auto}
  .nw-hlavicka table{width:100%;border-collapse:collapse}
  .nw-hlavicka td{vertical-align:top;padding:1.2mm 0}
  .nw-hl-l{width:37%} .nw-hl-l p{text-decoration:underline}
  .nw-hl-v p{font-weight:700}
  .nw-hl-v p+p{font-weight:400}
  .nw-hlavicka tr.velky .nw-hl-v p{font-size:13pt}
  .nw-hlavicka tr.velky .nw-hl-l p{font-weight:700}
  .nw-hlavicka tr:first-child td{padding-top:0}
  .nw-hlavicka{border-bottom:1.5px solid #bfbfbf;padding-bottom:1.5mm;margin-bottom:2mm}
  .nw-popis{flex:1 1 auto;display:flex;flex-direction:column;border:1px solid #d0d0d0}
  .nw-popis h3{font-size:12pt;padding:2mm 3mm;background:#fff}
  .nw-popis-telo{flex:1 1 auto;background:var(--nw-sedy);padding:2mm 3mm;font-size:9.5pt}
  .nw-popis-telo p{margin-bottom:2mm;text-align:justify}
  .nw-popis-telo p.nw-modry{color:#2f5597;font-weight:700;text-decoration:underline}
  .nw-popis-telo h4{font-size:9.5pt;text-decoration:underline;margin:3mm 0 2mm}
  .nw-foto{display:block;max-width:100%;max-height:120mm;margin:0 auto}
  .nw-zlom{display:none}
  .nw-nadpis h1{font-size:14pt;color:var(--nw-modra);text-decoration:underline;margin:2mm 0 1.5mm}
  .nw-nadpis h2{font-size:12pt;color:var(--nw-modra);text-decoration:underline;margin:1.5mm 0}
  .nw-mezera{margin-top:6mm}
  table.nw-ts{width:100%;border-collapse:collapse;table-layout:fixed;font-size:7.6pt}
  table.nw-ts td{border:1px solid #000;padding:.6mm 1.2mm;vertical-align:middle}
  .nw-ts-titul td{border:1px solid #c9d3e0 !important;padding:1.5mm 1.5mm .5mm !important}
  .nw-ts-titul h2{font-size:12pt;color:var(--nw-modra);text-decoration:underline}
  .nw-ts-pozn-titul td{border:1px solid #c9d3e0 !important;color:#7f7f7f;font-size:7.5pt}
  .nw-ts-pruh td{background:var(--nw-pruh);color:#fff;font-weight:700;font-size:8.5pt;padding:1mm 1.5mm}
  .nw-ts-sachta td{background:#2f5597}
  .nw-ts-l{background:var(--nw-popisek);font-weight:700;font-size:7.2pt}
  .nw-ts-pod .nw-ts-l{background:var(--nw-popisek)}
  .nw-ts-pozn td{border:none !important;color:#8c8c8c;font-style:italic;font-size:6.8pt;padding:.4mm 1mm}
  .nw-cena table,table.nw-priplatek{width:100%;border-collapse:collapse;border:1.5px solid #000;margin-bottom:0}
  .nw-cena table+table{border-top:none}
  .nw-cena td,table.nw-priplatek td{padding:1.5mm 2mm;vertical-align:top}
  .nw-cena-l{font-weight:700;font-size:10pt}
  .nw-cena-l p.nw-sub{font-weight:400;font-size:8pt}
  .nw-cena-v{width:27%;text-align:right;font-weight:700;color:var(--nw-modra);border-left:1.5px solid #000}
  .nw-cena-v p.nw-sub{font-size:9pt}
  .nw-cena-polozka .nw-cena-l,.nw-cena-cena .nw-cena-l{background:var(--nw-popisek)}
  .nw-cena-cena .nw-cena-l p:first-child,.nw-cena-polozka .nw-cena-l p:first-child{text-transform:none}
  table.nw-cena-dph{margin-top:3mm;border-top:1.5px solid #000 !important}
  table.nw-cena-celkem{margin-top:3mm;border-top:1.5px solid #000 !important;background:var(--nw-pruh);color:#fff}
  table.nw-cena-celkem td{color:#fff;padding:3mm 2mm}
  .nw-pozn-cena{margin-top:1.5mm;font-size:7.5pt}
  .nw-pozn-cena p:first-child{text-decoration:none}
  .nw-kurziva{margin-top:3mm;font-size:7.5pt;font-style:italic;font-weight:700;border-bottom:1px solid #bfbfbf;padding-bottom:3mm}
  .nw-drobne{font-size:7.5pt;margin-top:1mm}
  table.nw-priplatek{margin:2mm 0 5mm}
  table.nw-priplatek .nw-cena-l{font-size:9.5pt}
  .nw-tucne{font-weight:700}
  p.nw-kurziva,.nw-cena-v p.nw-kurziva{font-style:italic;font-size:8pt;border:none;margin:0;padding:0}
  .nw-ramecek{border:1px solid #a6a6a6;margin-top:1mm}
  .nw-ramecek h5{font-size:10pt;padding:1.2mm 2mm}
  .nw-ramecek.nw-tmavy h5{background:var(--nw-tmava);color:#fff}
  .nw-ramecek-telo{padding:1mm 2mm;font-size:10.5pt}
  .nw-ramecek-telo>p+p{border-top:0}
  .nw-tmavy .nw-ramecek-telo>p{border-top:1px solid #d9d9d9;padding:.6mm 0}
  .nw-tmavy .nw-ramecek-telo>p:first-child{border-top:none}
  ol.nw-ol{margin:0;padding-left:7mm}
  ol.nw-ol li{padding:.6mm 0}
  ol.nw-ol-a{list-style:none;counter-reset:nwa;padding-left:0}
  ol.nw-ol-a li{counter-increment:nwa;position:relative;padding:1.5mm 0 1.5mm 8mm;border-top:1px solid #d9d9d9}
  ol.nw-ol-a li:first-child{border-top:none}
  ol.nw-ol-a li::before{content:counter(nwa, lower-alpha) ")";position:absolute;left:1mm;font-weight:700}
  .nw-podpis{margin-top:10mm}
  .nw-podpis h4{font-size:11pt;font-weight:400;text-decoration:underline;margin-bottom:2mm}
  .nw-podpis h4.nw-kancelar{color:var(--nw-modra);font-weight:700;margin-top:7mm}
  .nw-podpis p{font-size:10pt}
  .nw-podpis p.nw-drobne{font-size:8pt;margin:0 0 2mm}
  .nw-podpis-img{display:block;max-height:22mm;max-width:60mm;margin:1mm 0}
  .nw-web{color:#2f5597;font-weight:700;text-decoration:underline}
  @page{size:A4;margin:0}
  @media print{
    body{background:#fff}
    .noprint,.nw-lista,#neprLegenda{display:none !important}
    #nwStranky{padding:0}
    .nw-strana{margin:0;box-shadow:none;page-break-after:always;break-after:page}
    .nw-strana:last-child{page-break-after:auto;break-after:auto}
    #nwTok{display:none}
  }`;
}

/* Stránkování v okně náhledu (běží v okně, po načtení písma a obrázků).
 * Bloky se do stránek PŘESOUVAJÍ (ne kopírují) — označení textů bez překladu
 * (#518) i text dokumentu zůstanou beze změny. */
function nwStrankovaniSkript() {
  return '<scr' + 'ipt>(function(){'
    + 'var hotovo=false;'
    + 'function rozloz(){if(hotovo)return;hotovo=true;'
    + 'var tok=document.getElementById("nwTok"),str=document.getElementById("nwStranky"),sab=document.getElementById("nwSablonaStrany");'
    + 'if(!tok||!str||!sab)return;'
    + 'function nova(){var s=sab.content.firstElementChild.cloneNode(true);str.appendChild(s);'
    + 's.querySelector(".nw-cislo").textContent=String(str.children.length);return s.querySelector(".nw-telo");}'
    + 'function pretece(t){return t.scrollHeight>t.clientHeight+1;}'
    + 'function samotny(r){return r&&/nw-ts-(pruh|titul|pozn-titul)/.test(r.className);}'
    + 'var bloky=Array.prototype.slice.call(tok.children),telo=nova();'
    + 'for(var i=0;i<bloky.length;i++){var b=bloky[i];'
    + 'if(b.classList.contains("nw-zlom")){b.parentNode.removeChild(b);if(telo.children.length)telo=nova();continue;}'
    + 'telo.appendChild(b);if(!pretece(telo))continue;'
    + 'var tb=b.tBodies&&b.tBodies[0];'
    + 'if(b.classList.contains("nw-deli")&&tb&&tb.rows.length>1){'
    + 'var n=b.cloneNode(false),nb=document.createElement("tbody"),cg=b.querySelector("colgroup");if(cg)n.appendChild(cg.cloneNode(true));n.appendChild(nb);'
    + 'while(pretece(telo)&&tb.rows.length>1)nb.insertBefore(tb.rows[tb.rows.length-1],nb.firstChild);'
    + 'while(tb.rows.length>1&&samotny(tb.rows[tb.rows.length-1]))nb.insertBefore(tb.rows[tb.rows.length-1],nb.firstChild);'
    + 'if(pretece(telo)||(tb.rows.length===1&&samotny(tb.rows[0]))){nb.insertBefore(tb.rows[0],nb.firstChild);b.parentNode.removeChild(b);}'
    + 'if(nb.rows.length){telo=nova();bloky.splice(i+1,0,n);}continue;}'
    + 'if(telo.children.length>1){var pred=b.previousElementSibling;telo.removeChild(b);var t2=nova();'
    + 'if(pred&&pred.classList.contains("nw-nadpis")&&telo.children.length>1){t2.appendChild(pred);}'
    + 't2.appendChild(b);telo=t2;}}'
    + 'tok.style.display="none";'
    + 'var p=document.getElementById("nwPocetStran");if(p)p.textContent=String(str.children.length);}'
    + 'var cekat=[];if(document.fonts&&document.fonts.ready)cekat.push(document.fonts.ready);'
    + 'cekat.push(new Promise(function(r){if(document.readyState==="complete")r();else window.addEventListener("load",r);}));'
    + 'Promise.all(cekat).then(rozloz,rozloz);setTimeout(rozloz,2500);'
    + 'window.nwRozloz=rozloz;'
    + '})();<\/scr' + 'ipt>';
}

/* Logo do záhlaví: nahrané logo firmy (PNG/JPEG), jinak název firmy textem. */
function nwLogoHtml(firma) {
  const f = (typeof firmaAktualni === 'function') ? firmaAktualni() : null;
  const logo = f && typeof f.logo === 'string' && /^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(f.logo) ? f.logo : '';
  return logo ? `<img class="nw-logo" src="${esc(logo)}" alt="${esc(firma || '')}">`
    : `<div class="nw-logo-text">${esc(firma || '')}</div>`;
}

async function nabidkaNahled() {
  /* Zámek strany (P6 / K19-N114): u zakázky s vyřazenou OCK (číslo OVP,
   * jen projekce) by podklady ukázaly ceny vynulované strany. Zábrany
   * z kontrol se tu záměrně neptají (kontrolní pohled, #377) — tahle ano;
   * tlačítko Word v pruhu je ale nese (stejné jako v aplikaci). */
  if (typeof kontrolyStranaZabrana === 'function') {
    const duvod = kontrolyStranaZabrana(ZAK, 'nabidka');
    if (duvod) { if (typeof hlaska === 'function') hlaska(duvod, { nadpis: 'Dokument nelze vytvořit' }); return; }
  }
  /* Jazyk podle volby „Jazyk tisku" (#143) — tentýž, ve kterém vznikne Word. */
  const L = (typeof tiskJazyk === 'function') ? tiskJazyk() : ((typeof jazyk === 'function') ? jazyk() : 'cz');
  const varianta = await nabidkaVarianta();
  const vt = vzTiskVstup('nabidka', varianta);   // VZ-E2 #601: pohled zákazníka (podklady)
  if (!vt) return;
  /* #518: sběr textů bez překladu až po všech otázkách (await). */
  const sleduj = typeof neprelozenoZacni === 'function' && neprelozenoZacni(L);
  let data, bloky;
  const foto = () => (data && data.obrazky && data.obrazky.UVODNI_FOTO) || '';
  try {
    data = nabidkaData(vt.zak, vt.varianta, JEKLY, L);
    bloky = nwBloky(data, L, { foto: foto() });
  } catch (e) {
    if (sleduj) neprelozenoKonec();
    if (typeof hlaska === 'function') hlaska('Náhled nelze sestavit: ' + (e && e.message || e), { nadpis: 'Náhled se neotevřel' });
    return;
  }
  const chrome = nwChrome(data, L);
  const varovani = nwVarovani(data, vt.zak, { foto: foto() });
  /* Tlačítko Word má tytéž zábrany jako v aplikaci (ukazkoveZabranaAttr / dokumentZabrana). */
  const zabrana = (typeof dokumentZabrana === 'function') ? (dokumentZabrana('nabidka', varianta) || '') : '';
  const telo = nwHtml(bloky);
  const w = oknoNahledu();   // null = prohlížeč okno zablokoval, hláška už svítí (K6)
  if (!w) { if (sleduj) neprelozenoKonec(); return; }
  const nazevL = { cz: 'česky', en: 'anglicky', de: 'německy', fr: 'francouzsky' }[L] || L;
  w.document.write(`<!DOCTYPE html><html lang="${esc(L === 'cz' ? 'cs' : L)}"><head><meta charset="utf-8">
    <title>${esc(data.nazevSouboru)} – náhled</title>
    <style>${nwCss()}${sleduj ? neprelozenoCss() : ''}</style></head><body>
    <div class="nw-lista noprint">
      <div class="nw-radek">
        <b class="nw-titul">Kompletní náhled podkladů — vzhled Wordu (CN)</b>
        <span class="nw-jazyk" title="Jazyk dokumentu podle volby „Jazyk tisku“ u tlačítek nabídky">Jazyk: ${esc(L.toUpperCase())} (${esc(nazevL)})</span>
        <span class="nw-stav">Stran: <b id="nwPocetStran">…</b></span>
        <button class="nw-primary" id="nwWord"${zabrana ? ` disabled title="${esc(zabrana)}"` : ''}>Vytvořit nabídku (Word)</button>
        <button id="nwTisk" onclick="window.print()">🖨 Tisk</button>
      </div>
      ${zabrana ? `<div class="nw-zabrana">Word teď vytvořit nejde: ${esc(zabrana)}</div>` : ''}
      ${varovani.length ? `<ul class="nw-varovani">${varovani.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
      <div class="nw-stav" id="nwStavWord"></div>
    </div>
    ${sleduj ? neprelozenoLegendaHtml(L) : ''}
    <template id="nwSablonaStrany"><section class="nw-strana">
      <header class="nw-zahlavi"><span class="nw-cislo"></span><span class="nw-ozdoba"></span>
        <span class="nw-zahlavi-text">${esc(chrome.zahlavi)}</span>${nwLogoHtml(chrome.firma)}<span class="nw-zahlavi-linka"></span></header>
      <div class="nw-telo"></div>
      <footer class="nw-zapati">${chrome.paticka.map(esc).join('<br>')}</footer>
    </section></template>
    <div id="dok"><div id="nwTok">${telo}</div><div id="nwStranky"></div></div>
    ${nwStrankovaniSkript()}`);
  w.document.write((sleduj ? neprelozenoSkript(L, neprelozenoKonec(), neprelozenoRucne([
    data.placeholders.OBJEDNATEL, data.placeholders.OBJEDNATEL_KONTAKT, data.placeholders.NAZEV_AKCE,
    data.placeholders.ADRESA, vt.zak.popisZameru])) : '') + '</body></html>');
  w.document.close();
  /* Word z náhledu: táž funkce jako tlačítko v aplikaci (zábrany, zámek,
   * šablona). Otázky (varianta, šablona) se ptají v okně aplikace. */
  const btn = w.document.getElementById('nwWord');
  if (btn && !zabrana) btn.onclick = () => {
    const stav = w.document.getElementById('nwStavWord');
    if (stav) stav.textContent = 'Nabídka (Word) se vytváří v okně aplikace — případné otázky a výsledek najdete tam.';
    try { window.focus(); } catch (e) { /* okno aplikace nejde přenést dopředu — nevadí */ }
    nabidkaWord();
  };
}
