/* ================= ZÁLOŽKA TECHNICKÁ SPECIFIKACE =================
 * Dokument „Technická specifikace výtahové šachty“ (příloha SoD).
 * Pole s prefill se plní živě z kalkulace OCK; ruční úprava má přednost
 * (badge „ručně“, tlačítko ↺ vrátí automatiku). */

/* ---------- VÍC ŠACHET (VS-E4 #570) ----------
 * Specifikace má u víc šachet přepínač šachty. Sekce, které POPISUJÍ ŠACHTU
 * (tsSekceSachty), se kreslí pro vybranou šachtu z jejího zadání a výsledku;
 * ruční hodnoty šachty 2+ jdou do ock.dalsi[i].techspec.hodnoty. Ostatní
 * sekce (stavba, práce, co není součástí) jsou za zakázku a zapisují se
 * jako dosud do TS (v.data.techspec). Jedna šachta = obrazovka jako dnes. */
let TS_SACHTA = 0;
function tsVsKontext() {
  if (typeof rezimViceSachet !== 'function' || typeof OCK === 'undefined' || !OCK || OCK.fixes === false || !rezimViceSachet(OCK)) return null;
  const sachty = sachtyZ(OCK);
  if (TS_SACHTA >= sachty.length || TS_SACHTA < 0) TS_SACHTA = 0;
  return { sachty, i: TS_SACHTA };
}
/* Kam se zapisuje ruční hodnota pole: šachta 2+ a pole šachty → její techspec. */
function tsHodnotyCil(id) {
  const k = tsVsKontext();
  if (!k || !k.i || !tsPoleSachty(id)) return TS.hodnoty;
  const s = OCK.dalsi[k.i - 1];
  if (!s.techspec || typeof s.techspec !== 'object') s.techspec = { hodnoty: {} };
  if (!s.techspec.hodnoty || typeof s.techspec.hodnoty !== 'object') s.techspec.hodnoty = {};
  return s.techspec.hodnoty;
}
/* S vypnutou funkcí víc šachet (R21) server změnu šachet 2+ odmítne — pole
 * šachty 2+ jsou jen ke čtení. */
function tsSachtaJenCteni(id) {
  const k = tsVsKontext();
  return !!(k && k.i && tsPoleSachty(id) && typeof viceSachetZapnuto === 'function' && !viceSachetZapnuto());
}
function tsSachtaPrepni(i) { TS_SACHTA = +i || 0; render(); }
function tsSachtyLista(k) {
  if (!k) return '';
  return `<div class="noprint" style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:8px 0">
    <b>Šachta:</b><span class="rada-prep">${k.sachty.map((s, i) => `<button type="button" class="${i === k.i ? 'on' : ''}"
      onclick="tsSachtaPrepni(${i})">${esc(vsNazev(s, i))}${s.ks > 1 ? ' · ' + s.ks + ' ks' : ''}</button>`).join('')}</span>
    <span class="note" style="margin:0">Sekce popisující šachtu platí pro vybranou šachtu; stavební a projekční práce a to, co není součástí dodávky, jsou za celou nabídku.</span>
  </div>`;
}

function tsSet(id, val) {
  if (tsSachtaJenCteni(id)) { if (typeof hlaska === 'function') hlaska('Funkce víc šachet je vypnutá — šachty 2 a další teď nejde měnit.'); render(); return; }
  const h = tsHodnotyCil(id);
  if (val === '') delete h[id]; else h[id] = val;
  aktivniVarianta(ZAK).upraveno = new Date().toISOString();
  render();
}
function tsReset(id) {
  if (tsSachtaJenCteni(id)) { render(); return; }
  delete tsHodnotyCil(id)[id]; render();
}
/* výběr z rozbalovacího seznamu; „vlastní text…" umožní libovolnou hodnotu */
async function tsSelect(id, sel) {
  if (sel.value === '__VLASTNI__') {
    const t = await dotaz('Vlastní text položky:', sel.getAttribute('data-cur') || '');
    if (t != null && t.trim() !== '') tsSet(id, t); else render();
    return;
  }
  tsSet(id, sel.value);
}
function tsExtraAdd() { TS.extra.push({ label: 'NOVÁ POLOŽKA', hodnota: '' }); render(); }
function tsExtraDel(i) { TS.extra.splice(i, 1); render(); }
function tsExtraSet(i, k, val) { TS.extra[i][k] = val; render(); }

/* ---------- jazykové mutace (N1) ----------
 * Editace probíhá vždy v češtině; přepnutím jazyka se zobrazí přeložený
 * náhled dokumentu určený k tisku / předání zákazníkovi. Fráze, ke kterým
 * ve slovníku překlad není, zůstávají česky a jsou vyznačené. */

function tsJazykBar() {
  const akt = jazyk();
  const btns = JAZYKY.map(j =>
    `<button class="mini${j.kod === akt ? ' aktivni' : ''}" title="${esc(j.nazev)}"
       onclick="jazykSet('${escJs(j.kod)}')">${j.vlajka}</button>`).join(' ');
  const pokr = akt === 'cz' ? null : prekladPokryti(tsVsechnyFraze(), akt);
  const stav = pokr
    ? `<span class="pill ${pokr.procenta >= 90 ? 'ok' : 'warn'}" title="přeloženo ${pokr.prelozeno} z ${pokr.celkem} frází">
         přeloženo ${pokr.procenta} %</span>` : '';
  const dopl = (pokr && pokr.chybi.length && jeAdmin())
    ? ` <button class="mini noprint" title="stáhnout seznam nepřeložených frází pro překladatele"
         onclick="tsChybejiciExport()">⤓ chybí ${pokr.chybi.length}</button>` : '';
  return `<div class="btns noprint" style="margin-bottom:10px;align-items:center">
    <span class="mut">Jazyk dokumentu:</span> ${btns} ${stav}${dopl}</div>`;
}

/* všechny fráze dokumentu (popisky i hodnoty) – podklad pro měření pokrytí */
function tsVsechnyFraze() {
  let r = null;
  try { r = vypocetAkt(); } catch (e) {}
  const out = [];
  TECHSPEC_DEF.forEach(sk => {
    out.push(sk.sekce);
    if (sk.pozn) out.push(sk.pozn);
    sk.pole.forEach(p => {
      out.push(p.label);
      /* Hodnota, kterou si pole přeloží samo (`jazykSam`), do měření pokrytí
       * ani do seznamu chybějících frází NEPATŘÍ: slovník ji nemá znát. */
      const h = tsHodnota(p, TS, r, Z, C, jazyk());
      if (!h.prelozeno) out.push(h.text);
    });
  });
  TS.extra.forEach(e => { out.push(e.label); out.push(e.hodnota); });
  return out;
}

/* CSV se seznamem nepřeložených frází (pro překladatele; jen admin) */
function tsChybejiciExport() {
  const lang = jazyk();
  const chybi = prekladPokryti(tsVsechnyFraze(), lang).chybi;
  const q = csvBunka;   // B83: ochrana vzorců
  const csv = '\ufeff' + ['čeština;' + lang.toUpperCase() + ' (doplňte)']
    .concat(chybi.map(t => q(t) + ';')).join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  a.download = nazevExportu('neprelozene', { jazyk: lang });   // #533: NEPRELOZENE_<den>-SPECIFIKACE-<JAZYK>
  a.click();
}

/* ---------- TS-1: kontrola vyplnění (jen upozornění, nic neblokuje) ----------
 * Pruh nad dokumentem ukáže počet nevyplněných povinných položek a vyjmenuje
 * je. Tisk, export ani uložení se nikdy nezastaví – uživatel může dokument
 * vytisknout i s prázdnými poli, jen o tom ví. */

function tsKontrolaStav() {
  let r = null;
  try { r = vypocetAkt(); } catch (e) {}
  return tsKontrola(TS, r, Z, C, ZAK);
}

function tsKontrolaBar() {
  const k = tsKontrolaStav();
  if (k.ok) return `<div class="ts-kontrola noprint">
    <span class="pill ok">✓ ${esc(T('Kontrola vyplnění'))}</span>
    <span class="mut">${esc(T('Všechna povinná pole jsou vyplněna.'))}</span></div>`;

  const skupiny = {};
  k.chybi.forEach(x => { (skupiny[x.sekce] = skupiny[x.sekce] || []).push(x.label); });
  const seznam = Object.keys(skupiny).map(s =>
    `<div class="ts-kontrola-sekce"><b>${esc(T(s))}:</b> ${skupiny[s].map(l => esc(T(l))).join(', ')}</div>`).join('');

  return `<div class="ts-kontrola warn noprint">
    <div><span class="pill warn">⚠ ${esc(T('Nevyplněná povinná pole'))}: ${k.pocet}</span>
      <span class="mut">${esc(T('Upozornění nic neblokuje – dokument lze vytisknout i takto.'))}</span></div>
    ${seznam}</div>`;
}

/* je povinné pole prázdné? (pro zvýraznění řádku ve formuláři) */
function tsChybi(pole, text) {
  return TS_POVINNE.indexOf(pole.id) >= 0 && tsPrazdna(text);
}

/* přeložený řádek náhledu; nepřeložené fráze označí tečkovaně */
function tsPrelozText(t) {
  const st = trStav(t, jazyk());
  return st.prelozeno ? esc(st.text)
    : `<span class="neprelozeno" title="zatím není ve slovníku – zobrazeno česky">${esc(st.text)}</span>`;
}

/* náhled dokumentu v cizím jazyce (jen ke čtení a tisku) */
function renderTechspecPreklad() {
  let r = null;
  try { r = vypocetAkt(); } catch (e) {}
  const lang = jazyk();

  /* `hotovo` = hodnota už JE v cílovém jazyce a nesmí přes ni jet `tr()`
   * podruhé. Týká se polí s příznakem `jazykSam` — dnes věty o rozsahu
   * opláštění po stěnách, která se skládá z proměnlivého počtu kusů, takže
   * ji slovník nemůže trefit celou. Do 21. 9. 2026 se jazyk `tsHodnota`
   * vůbec nepředával, takže se ta věta v EN/DE/FR specifikaci tiskla ČESKY
   * — a navíc se objevovala v exportu „chybějící překlady" (nález revize). */
  const row = (lbl, val, hotovo) => `<div class="spec-row ro"><div class="lbl">${tsPrelozText(lbl)}</div>
    <div>${hotovo ? esc(val) : tsPrelozText(val)}</div><div></div></div>`;

  const sekce = TECHSPEC_DEF.filter(sk => !sk.jen || sk.jen(r, Z)).map(sk =>
    `<h3>${tsPrelozText(sk.sekce)}</h3>` +
    sk.pole.map(p => {
      const h = tsHodnota(p, TS, r, Z, C, jazyk());
      /* Odvozený prázdný řádek do dokumentu nepatří (lešení kolem OCK, když
       * je v ceně) — cizojazyčný náhled je tiskový, takže ho vynechá celý. */
      if (h.odvozeno && h.text === '') return '';
      return row(p.label, h.text, h.prelozeno);
    }).join('') +
    (sk.pozn ? `<div class="note">${tsPrelozText(sk.pozn)}</div>` : '')
  ).join('');

  const extra = TS.extra.map(e => row(e.label, e.hodnota)).join('');

  document.getElementById('page-spec').innerHTML = `
    <div class="spec-doc">
      ${tsJazykBar()}
      ${tsKontrolaBar()}
      <h1>${tsPrelozText('Technická specifikace výtahové šachty')}</h1>
      <div class="sub">${tsPrelozText('(tato technická specifikace bude použita jako příloha Smlouvy o dílo nebo závazné objednávky)')}</div>
      ${row('ČÍSLO NABÍDKY', ZAK.cislo)}
      ${row('OBJEDNATEL', ZAK.objednatel)}
      ${row('DATUM', ZAK.datum)}
      ${(() => { const na = tsNazevAkce(TS, ZAK);
        /* převzatý název akce je vlastní jméno zakázky — slovníkem se nepřekládá */
        return row('NÁZEV AKCE', na.text, !na.rucne); })()}
      ${row('ADRESA STAVBY', ZAK.adresa)}
      ${sekce}
      ${extra ? `<h3>${tsPrelozText('DALŠÍ UJEDNÁNÍ')}</h3>` + extra : ''}
      <div class="btns noprint" style="margin-top:14px">
        <button onclick="prepniTab('spec'); tiskSNazvem(nazevExportu('specifikace', { cislo: ZAK.cislo, jazyk: jazyk() }))">${esc(T('Tisk specifikace / PDF'))}</button>
      </div>
      <div class="note noprint">Náhled v cizím jazyce je jen ke čtení – obsah se edituje v české verzi
      (přepněte na CZ). Tečkovaně zvýrazněné fráze zatím nemají překlad ve slovníku a zůstávají česky.</div>
    </div>`;
}

/* NÁZEV AKCE (14. 10. 2026): výchozí z hlavičky zakázky, ruční přepis se
 * štítkem „ručně" a ↺ zpět na převzatý. Zápis jde přes set() — zámek
 * odeslané nabídky ho hlídá jako každé pole specifikace. */
function tsNazevAkceRadek() {
  const na = tsNazevAkce(TS, ZAK);
  const badge = na.rucne
    ? '<span class="pill warn src" title="ruční přepis — hlavička zakázky se nepřebírá">ručně</span>'
      + ` <button class="mini noprint" title="vrátit název akce z hlavičky zakázky" onclick="tsNazevAkceVrat()">↺</button>`
    : '<span class="pill src" title="převzato z hlavičky zakázky">z hlavičky zakázky</span>';
  const chybi = tsPrazdna(na.text);
  const varovani = chybi ? ` <span class="pill warn" title="povinná položka dokumentu – zatím nevyplněno">${esc(T('nevyplněno'))}</span>` : '';
  return `<div class="spec-row${chybi ? ' chybi' : ''}"><div class="lbl">NÁZEV AKCE</div>
      <div><input type="text" id="tsNazevAkce" list="tsNazevAkceNavrhy" value="${esc(na.text)}" onchange="tsNazevAkceNastav(this.value)">
        <datalist id="tsNazevAkceNavrhy">${TS_C.nazevAkce.map(o => `<option value="${esc(o)}">`).join('')}</datalist></div>
      <div>${badge}${varovani}</div></div>`;
}
function tsNazevAkceNastav(v) {
  /* Zapsaný stejný text jako v hlavičce = žádný přepis, převzatý zůstává. */
  if (!tsNazevAkce(TS, ZAK).rucne && String(v) === String(ZAK.nazevAkce || '')) return;
  set('TS.nazevAkce', v);
  if (TS.nazevAkce === v) set('TS.nazevAkceRucne', true);
}
function tsNazevAkceVrat() { set('TS.nazevAkceRucne', false); }

function renderTechspec() {
  if (jazyk() !== 'cz') return renderTechspecPreklad();
  let r = null;
  try { r = vypocetAkt(); } catch (e) {}
  /* VS-E4: vybraná šachta (zadání a výsledek té šachty, její ruční hodnoty).
   * Šachta 1 = OCK.zadani (ne globální Z — ten může ukazovat jinou šachtu). */
  const vsK = tsVsKontext();
  let sZ = Z, sR = r, sTS = TS;
  if (vsK) {
    /* Sekce za zakázku nad součtem šachet a sekce šachty nad výsledkem té
     * šachty — obojí přes vypocetZ (zamčená varianta = otisk, ne nový výpočet;
     * hlídá test_zamek_otisk), jako cenová nabídka. */
    let rS = null;
    try { rS = vypocetZ(aktivniVarianta(ZAK), JEKLY); } catch (e) {}
    if (rS) r = rS;
    sZ = vsK.sachty[vsK.i].zadani;
    sR = (rS && Array.isArray(rS.sachty) && rS.sachty[vsK.i] && rS.sachty[vsK.i].vysl) || r;
    sTS = tsSachtaTechspec(aktivniVarianta(ZAK).data, vsK.i);
  }

  const specRow = (pole, sachty) => {
    const TSx = sachty ? sTS : TS, rX = sachty ? sR : r, Zx = sachty ? sZ : Z;
    const jenCteni = sachty && tsSachtaJenCteni(pole.id) ? ' disabled' : '';
    const h = tsHodnota(pole, TSx, rX, Zx, C);
    /* ODVOZENÉ POLE (22. 9. 2026 večer): hodnotu určuje cena, takže se nedá
     * přepsat a obrazovka řekne, kde se to mění. Ruční hodnota ze starší
     * zakázky se nemaže — jen se ukáže, že neplatí, jinak by uživatel nevěděl,
     * proč se jeho „ne" do dokumentu nedostalo. Prázdná odvozená hodnota =
     * řádek do dokumentu nepatří; na obrazovce zůstane (ať je vidět proč),
     * ale do tisku ne. */
    if (h.odvozeno) {
      const stara = TSx.hodnoty[pole.id];
      const neplati = (stara != null && String(stara) !== h.text)
        ? `<div class="note noprint" style="margin:2px 0 0">Ruční hodnota „${esc(stara)}“ se nepoužije — řádek se řídí cenou.</div>` : '';
      const vynechano = h.text === '';
      return `<div class="spec-row${vynechano ? ' noprint' : ''}"><div class="lbl">${esc(pole.label)}</div>
      <div><div class="spec-odvozene">${vynechano ? '<i>do dokumentu se nedává</i>' : esc(h.text)}</div>
        ${pole.odvozenePopis ? `<div class="note noprint" style="margin:2px 0 0">${esc(pole.odvozenePopis)}</div>` : ''}${neplati}</div>
      <div><span class="pill src" title="hodnotu určuje cena v Kalkulaci OCK, ručně se nemění">z kalkulace</span></div>
    </div>`;
    }
    const rucne = TSx.hodnoty[pole.id] != null;
    const badge = rucne ? '<span class="pill warn src">ručně</span>'
      : (h.zdroj === 'z kalkulace' ? '<span class="pill src">z kalkulace</span>' : '<span class="pill mut src">výchozí</span>');
    let control;
    if (pole.ciselnik) {
      /* <select> vždy nabídne kompletní číselník (na rozdíl od <datalist>,
       * který Chrome filtruje podle aktuální hodnoty a část variant skryl). */
      const cur = h.text || '';
      const vlastni = cur !== '' && !pole.ciselnik.includes(cur);
      const opts = ['<option value="">— nevyplněno —</option>']
        .concat(pole.ciselnik.map(o =>
          `<option value="${esc(o)}"${o === cur ? ' selected' : ''}>${esc(o)}</option>`));
      if (vlastni) opts.push(`<option value="${esc(cur)}" selected>${esc(cur)} (vlastní)</option>`);
      opts.push(`<option value="__VLASTNI__">✎ vlastní text…</option>`);
      control = `<select data-cur="${esc(cur)}"${jenCteni} onchange="tsSelect('${escJs(pole.id)}', this)">${opts.join('')}</select>`;
    } else {
      control = `<input type="text" value="${esc(h.text)}"${jenCteni} onchange="tsSet('${escJs(pole.id)}', this.value)">`;
    }
    /* TS-1: povinné a prázdné pole se jen označí – zápis ani tisk se neblokuje */
    const chybi = tsChybi(pole, h.text);
    const varovani = chybi
      ? ` <span class="pill warn" title="povinná položka dokumentu – zatím nevyplněno">${esc(T('nevyplněno'))}</span>` : '';
    return `<div class="spec-row${chybi ? ' chybi' : ''}"><div class="lbl">${esc(pole.label)}</div>
      <div>${control}</div>
      <div>${badge}${varovani}${rucne && !jenCteni ? ` <button class="mini noprint" title="vrátit automatické plnění" onclick="tsReset('${escJs(pole.id)}')">↺</button>` : ''}</div>
    </div>`;
  };

  /* `jen` (#560): sekce, která se zakázky netýká (MŮSTKY mimo skladebný model), se nekreslí. */
  /* VS-E4: sekce šachty s výsledkem vybrané šachty (a `jen` podle něj —
   * šachta bez skladebných můstků sekci MŮSTKY nemá), nadpis s názvem šachty. */
  const vsNazevAkt = vsK ? vsNazev(vsK.sachty[vsK.i], vsK.i) : '';
  const sekce = TECHSPEC_DEF.filter(s => {
    const sach = vsK && tsSekceSachty(s.sekce);
    return !s.jen || s.jen(sach ? sR : r, sach ? sZ : Z);
  }).map(s => {
    const sach = !!(vsK && tsSekceSachty(s.sekce));
    return `<h3>${esc(s.sekce)}${sach ? ' – ' + esc(vsNazevAkt) : ''}</h3>` + s.pole.map(p => specRow(p, sach)).join('') +
      (s.pozn ? `<div class="note">${esc(s.pozn)}</div>` : '');
  }).join('');

  const extra = TS.extra.map((e, i) =>
    `<div class="spec-row"><div class="lbl"><input type="text" style="font-weight:600" value="${esc(e.label)}"
        onchange="tsExtraSet(${i}, 'label', this.value)"></div>
     <div><input type="text" value="${esc(e.hodnota)}" onchange="tsExtraSet(${i}, 'hodnota', this.value)"></div>
     <div><button class="mini noprint" onclick="tsExtraDel(${i})">✕</button></div></div>`).join('');

  document.getElementById('page-spec').innerHTML = `
    <div class="spec-doc">
      ${tsJazykBar()}
      ${tsKontrolaBar()}
      <!-- Štítek Standardu OCK (#163, 21. 8. 2026) i tady: specifikace je
           papír, který jde k zákazníkovi jako příloha smlouvy — je užitečné
           vidět, jestli popisuje standardní výrobek, ještě než se vytiskne.
           Do vytištěného dokumentu štítek nejde (noprint): je to naše
           interní informace, ne údaj pro zákazníka. -->
      <div class="noprint" style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:6px 0">
        <h1 style="margin:0;flex:1">Technická specifikace výtahové šachty</h1>
        ${typeof standardPill === 'function' ? standardPill() : ''}
      </div>
      ${typeof standardRozpis === 'function' ? standardRozpis() : ''}
      ${tsSachtyLista(vsK)}
      <div class="sub">(tato technická specifikace bude použita jako příloha Smlouvy o dílo nebo závazné objednávky)</div>
      <div class="spec-row"><div class="lbl">ČÍSLO NABÍDKY</div><div><input type="text" value="${esc(ZAK.cislo)}" onchange="set('ZAK.cislo', this.value)"></div><div></div></div>
      <div class="spec-row"><div class="lbl">OBJEDNATEL</div><div><input type="text" value="${esc(ZAK.objednatel)}" onchange="set('ZAK.objednatel', this.value)"></div><div></div></div>
      <div class="spec-row"><div class="lbl">DATUM</div><div><input type="date" style="text-align:left" value="${esc(ZAK.datum)}" onchange="set('ZAK.datum', this.value)"></div><div></div></div>
      ${tsNazevAkceRadek()}
      <div class="spec-row"><div class="lbl">ADRESA STAVBY</div><div><input type="text" value="${esc(ZAK.adresa)}" onchange="set('ZAK.adresa', this.value)"${typeof zamekZakAttr === 'function' ? zamekZakAttr('ZAK.adresa') : ''}></div><div></div></div>
      ${sekce}
      ${extra ? '<h3>DALŠÍ UJEDNÁNÍ</h3>' + extra : ''}
      <div class="btns noprint" style="margin-top:14px">
        <button onclick="tsExtraAdd()">+ přidat vlastní řádek</button>
        <button onclick="prepniTab('spec'); tiskSNazvem(nazevExportu('specifikace', { cislo: ZAK.cislo, jazyk: 'cz' }))">Tisk specifikace / PDF</button>
      </div>
      <div class="note noprint">Pole se štítkem „z kalkulace“ se přepočítávají podle zadání OCK.
      Jakmile pole přepíšete, platí ruční hodnota (štítek „ručně“); tlačítkem ↺ vrátíte automatiku.
      Vlastní hodnoty lze psát do všech polí, rozbalovací návrhy odpovídají číselníkům ze šablony.</div>
    </div>
    ${typeof nabidkaDokumentyBlok === 'function'
      ? `<div class="noprint" style="margin-top:14px">${card('Cenová nabídka (OCK)', nabidkaDokumentyBlok())}</div>`
      : ''}`;
}
