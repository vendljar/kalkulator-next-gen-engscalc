/* ============================================================
 * OBCHODNÍ ZAOKROUHLENÍ – UI (#38)
 *
 * Výpočet je v zaokrouhleni.js; tady je jen přepínač a to, co po jeho
 * zapnutí uvidí obchodník. Karta stojí hned pod slevou na kartě Kalkulace
 * OCK, protože je to poslední krok téhož: základní cena → sleva →
 * zaokrouhlení → cena, která jde ven.
 *
 * KAŽDÁ ČÁST NABÍDKY MÁ VLASTNÍ KARTU (zadání 4. 8. 2026):
 * „do kalkulace ock patří pouze část týkající se výtahové šachty, část
 * týkající se projekčních prací pak patří do sekce kalkulace proj."
 * Do 4. 8. 2026 tu byla jedna společná karta vykreslená dvakrát a obě
 * části se v ní nastavovaly najednou. Znamenalo to, že obchodník v Kalkulaci
 * PROJ omylem měnil i cenu šachty — a naopak. Rozdělení je zároveň v souladu
 * se vším ostatním, co je v aplikaci po částech: sleva OCK a PROJ, sazba DPH,
 * hlavičky obou nabídek. Stav: ZO = šachta, ZOP = projekční práce.
 *
 * Nic se neblokuje: i zaokrouhlení, které srazí marži pod minimum, se jen
 * spočítá a lišta marže (#36) se o tom zmíní. Zamčené varianty (#34) se
 * ale měnit nedají – zaokrSetKrok/zaokrSetSmer i jejich dvojčata pro PROJ
 * jsou v ZAMEK_CHRANENE, protože mění cenu, která už odešla zákazníkovi.
 * ============================================================ */

/* Jen hodnoty z výčtu (B96, 29. 9. 2026). Do té doby šlo z konzole zapsat
 * zaokrSetKrok(490001) a cenu nabídky tím srazit na polovinu; hranicí je
 * server (uloZaokrProblemy), tady jde o to, aby UI samo nic mimo výčet
 * nezapsalo a obchodník věděl proč. */
function zaokrKrokZVyctu(val) {
  const n = +val;
  return (typeof ZAOKR_KROKY !== 'undefined' && ZAOKR_KROKY.some(k => k.krok === n)) ? n : null;
}
function zaokrSmerZVyctu(val) {
  return (typeof ZAOKR_SMERY !== 'undefined' && ZAOKR_SMERY.some(s => s.smer === val)) ? val : null;
}
function zaokrMimoVycet() {
  if (typeof hlaska === 'function') hlaska('Zaokrouhlení jde nastavit jen na hodnotu z nabídky. '
    + 'Větší snížení ceny je sleva — ta jde přes schvalování.');
  render();
}
function zaokrSetKrok(val) { const n = zaokrKrokZVyctu(val); if (n === null) return zaokrMimoVycet(); ZO.krok = n; render(); }
function zaokrSetSmer(val) { const v = zaokrSmerZVyctu(val); if (v === null) return zaokrMimoVycet(); ZO.smer = v; render(); }
function zaokrProjSetKrok(val) { const n = zaokrKrokZVyctu(val); if (n === null) return zaokrMimoVycet(); ZOP.krok = n; render(); }
function zaokrProjSetSmer(val) { const v = zaokrSmerZVyctu(val); if (v === null) return zaokrMimoVycet(); ZOP.smer = v; render(); }

/* Dopad na tu část nabídky, o kterou jde. Spadne-li výpočet, řádek se prostě
 * neukáže – karta je informace o ceně, ne hlásič chyb výpočtu. */
function zaokrDopadOck() {
  try { return cenaNabidkyOck(vypocetAkt(), SL, ZO); } catch (e) { return null; }
}
function zaokrDopadProj() {
  try { return cenaNabidkyProj(vypocetProjAkt(), SLP, ZOP); } catch (e) { return null; }
}

/* Karta se vykresluje na dvou místech – pod výpočtem OCK a pod výpočtem PROJ.
 * Nejde ale o dvě vykreslení jedné karty: každá má vlastní stav, vlastní
 * přepínače i vlastní řádek s dopadem. Kotva se liší, aby na ni uměla skočit
 * klouzající lišta a aby si dvě kotvy stejného jména nepřebíraly odkaz. */
function zaokrKarta(kontext) {
  if (typeof zaokrDefault !== 'function') return '';
  const proj = kontext === 'proj';
  const st = proj ? ZOP : ZO;
  /* Uložená hodnota mimo výčet (B96): <select> bez zvolené možnosti ukázal
   * první — „bez zaokrouhlení" —, i když se cena zaokrouhlovala. Taková
   * hodnota se ukáže jako vlastní, nevolitelná možnost s upozorněním. */
  const krokJinak = zaokrKrok(st) > 0 && !ZAOKR_KROKY.some(k => k.krok === zaokrKrok(st));
  const smerJinak = !!(st && st.smer) && !ZAOKR_SMERY.some(s => s.smer === st.smer);
  const krokOpts = (krokJinak ? `<option value="" selected disabled>mimo nabídku: ${esc(fmt0(zaokrKrok(st)))} — nepovolené</option>` : '')
    + ZAOKR_KROKY.map(k =>
    `<option value="${k.krok}" ${!krokJinak && zaokrKrok(st) === k.krok ? 'selected' : ''}>${esc(k.popis)}</option>`).join('');
  const smerOpts = (smerJinak ? `<option value="" selected disabled>mimo nabídku — nepovolené</option>` : '')
    + ZAOKR_SMERY.map(s =>
    `<option value="${s.smer}" ${!smerJinak && zaokrSmer(st) === s.smer ? 'selected' : ''}>${esc(s.popis)}</option>`).join('');
  const zapnuto = zaokrZapnuto(st);

  const c = zapnuto ? (proj ? zaokrDopadProj() : zaokrDopadOck()) : null;
  const nazev = proj ? 'Projekční práce (PROJ) celkem' : 'Výtahová šachta (OCK) po slevě';
  const radek = () => {
    if (!c) return '';
    const zn = c.zaokrKc < 0 ? '#b91c1c' : (c.zaokrKc > 0 ? '#15803d' : '#5b6472');
    return `<tr><td>${esc(nazev)}</td>
      <td style="text-align:right">${fmt0(c.pred)}</td>
      <td style="text-align:right;color:${zn}">${esc(zaokrKc(c.zaokrKc))}</td>
      <td style="text-align:right;font-weight:700">${fmt0(c.cena)}</td></tr>`;
  };
  /* Věta pod tabulkou říká dvě věci: kde rozdíl uvidí zákazník a že tenhle
   * přepínač je opravdu jen o téhle části – druhá se nastavuje jinde. */
  const jinde = proj
    ? 'Zaokrouhlení ceny výtahové šachty se nastavuje v <b>Kalkulaci OCK</b>.'
    : 'Zaokrouhlení ceny projekčních prací se nastavuje v <b>Kalkulaci PROJ</b>.';
  /* Od 12. 8. 2026 (#135) se zaokrouhlují POLOŽKY, ne až součet, a v nabídce
   * proto žádný dorovnávací řádek „obchodní zaokrouhlení" není. Karta ho
   * ukazuje dál – obchodník má vidět, o kolik se cena pohnula – ale nesmí
   * slibovat řádek, který zákazník v dokumentu nenajde. */
  const cojeste = proj
    ? 'Zaokrouhluje se cena <b>každé činnosti PROJ zvlášť</b> (po slevě), takže jejich součet vychází zaokrouhleně sám od sebe.'
    : 'Ceny jednotlivých položek kalkulace zůstávají beze změny; základ i koncová cena jdou do nabídky zaokrouhlené.';
  const vDokumentu = 'V nabídce ani v krycím listu se rozdíl <b>neuvádí vlastním řádkem</b> – '
    + 'zákazník čte ceny, ne naše zaokrouhlovací pravidlo. Dohledatelný zůstává tady a v protokolu o kalkulaci.';
  const dopad = c
    ? `<table class="sd-tbl" style="max-width:640px;margin-top:6px">
         <tr><th style="text-align:left">Část nabídky</th><th style="text-align:right">Spočtená cena</th>
             <th style="text-align:right">Zaokrouhlení</th><th style="text-align:right">Cena nabídky</th></tr>
         ${radek()}
       </table>
       <div class="note">${vDokumentu} ${cojeste} ${jinde}</div>`
    : `<div class="note">Zaokrouhluje se ${proj ? 'cena jednotlivých činností PROJ' : 'koncová cena nabídky OCK (po schválené slevě)'}.
         ${cojeste} Zaokrouhlením dolů se nikdy nenabídne nula. ${jinde}</div>`;

  const setKrok = proj ? 'zaokrProjSetKrok' : 'zaokrSetKrok';
  const setSmer = proj ? 'zaokrProjSetSmer' : 'zaokrSetSmer';
  const inner = `<div class="zak-head" style="grid-template-columns:1fr 1fr 1fr">
      <div class="row"><label>Zaokrouhlit koncovou cenu</label>
        <select onchange="${setKrok}(this.value)">${krokOpts}</select></div>
      <div class="row"><label>Směr</label>
        <select onchange="${setSmer}(this.value)" ${zapnuto ? '' : 'disabled'}>${smerOpts}</select></div>
      <div class="row"><label>Stav</label>
        <div><span class="pill ${zapnuto ? '' : 'mut'}">${zapnuto ? esc(zaokrStav(0, st).popis) : 'vypnuto'}</span></div></div>
    </div>
    ${dopad}`;
  /* Režim sekce i tady (23. 9. 2026) — jen u OCK, viz slevaKarta(). */
  return proj ? card('Obchodní zaokrouhlení koncové ceny PROJ', inner, false, 'proj-zaokr')
    : kartaRezim('ock', 'zaokr', 'Obchodní zaokrouhlení koncové ceny OCK', inner, 'ock-zaokr');
}
