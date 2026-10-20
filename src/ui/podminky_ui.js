/* ============================================================
 * Nastavení → Smlouvy / Šablony: PLATEBNÍ PODMÍNKY FIRMY (#367 fáze 2)
 *
 * Rozhodnutí J. V. 19. 10. 2026 (Q1): data ve Firmě (NAST.firma.podminky),
 * editace na záložce Smlouvy / Šablony. Nahoře společný blok (platnost
 * nabídky, číselník sazeb pokut, limit pokut), pod ním přepínač
 * OCK | PROJ — karta OCK nese platební podmínky OCK, smluvní standardy
 * a kapitoly nabídky, karta PROJ podmínky PROJ a plán plateb projekce.
 * Týž přepínač filtruje tabulku šablon dokumentů.
 *
 * Měnit smí jen administrátor (jeAdmin); ostatní vidí hodnoty jen ke čtení.
 * Zveřejňuje se s firemními údaji (firmaKZverejneni → /api/firma, server
 * pustí jen roli Administrátor). Logika a pravidla jsou v podminky.js.
 * ============================================================ */

/* Která karta přepínače je otevřená — stav obrazovky, ne nastavení firmy
 * (do konfigurace se neukládá, viz NASTDB_NEUKLADAT „panel"). */
function podmCast() { return (typeof NAST !== 'undefined' && NAST.panelPodminky === 'proj') ? 'proj' : 'ock'; }
function podmPrepni(c) { NAST.panelPodminky = c === 'proj' ? 'proj' : 'ock'; nastRefresh(); }

/* Které šablony patří ke které kartě (filtr tabulky šablon). Šablona, která
 * tu není, se ukáže na obou kartách. */
const PODM_SABLONY_CAST = { nabidka: 'ock', sod: 'ock', nabidkaProj: 'proj', sodProj: 'proj', plnaMoc: 'proj' };
function podmSablonaViditelna(typ) {
  if (typeof NAST !== 'undefined' && NAST.sablonyVse) return true;
  const c = PODM_SABLONY_CAST[typ];
  return !c || c === podmCast();
}
function podmSablonyVse(v) { NAST.sablonyVse = !!v; nastRefresh(); }

/* Zápis jednoho pole: hodnota se převede podle typu, prázdné číselné pole
 * vrátí továrnu (klíč zmizí). Jde přes firmaSet — stejné gesto jako ostatní
 * firemní údaje (práva, značka ukázkových dat, překreslení). */
function podmSet(cast, pole, hodnota, typ) {
  if (!jeAdmin()) { hlaska('Platební podmínky firmy smí měnit jen administrátor.'); return; }
  const f = NAST.firma || (NAST.firma = firmaDefault());
  let v = hodnota;
  if (typ === 'cislo') {
    const t = String(hodnota == null ? '' : hodnota).trim();
    v = t === '' ? undefined : PODMINKY.podmCislo(t);
    if (v !== undefined && !isFinite(v)) v = t;      // nečíslo nechá projít — ukáže ho validace
  } else if (typ === 'procentaVolitelne') {
    const t = String(hodnota == null ? '' : hodnota).trim();
    v = t === '' ? '' : (isFinite(PODMINKY.podmCislo(t)) ? PODMINKY.podmCislo(t) : t);
  } else if (typ === 'seznamProcent') {
    v = String(hodnota || '').split(/[;·|]/).map(x => x.trim()).filter(Boolean)
      .map(x => /^bez/i.test(x) ? 0 : PODMINKY.podmCislo(x.replace('%', '')));
    if (!v.length) v = undefined;
  } else if (typ === 'seznamSazeb') {
    v = String(hodnota || '').split(/[;·|]/).map(x => x.trim()).filter(Boolean);
    if (!v.length) v = undefined;
  } else if (typeof v === 'string') {
    v = v.trim() === '' ? undefined : v.trim();
  }
  firmaSet('podminky', PODMINKY.podminkyNastav(f.podminky, cast, pole, v));
}
async function podmVratitVse() {
  if (!jeAdmin()) { hlaska('Platební podmínky firmy smí měnit jen administrátor.'); return; }
  if (!await potvrd('Vrátit platební podmínky OCK i PROJ na výchozí hodnoty (dnešní standard z kódu)? '
    + 'Ostatní firemní údaje zůstanou.')) return;
  const f = NAST.firma || (NAST.firma = firmaDefault());
  delete f.podminky;
  nastRefresh();
}
/* „Zapsat výchozí hodnoty" — továrna se zkopíruje do záznamu Firmy a na
 * serveru se rovnou zveřejní (U1, 20. 10. 2026, J. V.: „zapisuj je rovnou
 * stiskem"; dřív jen zápis a hláška odkazovala na tlačítko, které na záložce
 * nebylo). Zveřejnění jde stejnou cestou jako tlačítko ve Firmě
 * (onlineZverejniFirmu: jen administrátor online, firmaLzeZverejnit, chyba
 * serveru se ohlásí); výsledek ukáže záložka u tlačítka. Bez serveru jen
 * zápis a hláška řekne proč. Bez kliknutí se nic nemění (podminkyEf
 * továrnu doplní při čtení). */
async function podmZapsatVychozi() {
  if (!jeAdmin()) { hlaska('Platební podmínky firmy smí měnit jen administrátor.'); return false; }
  const f = NAST.firma || (NAST.firma = firmaDefault());
  /* Přímo, ne přes firmaSet: ten sundává značku ukázkových dat, a výchozí
   * podmínky z kódu z ukázkové firmy skutečnou nedělají (stejně jako
   * „Doplnit všechny prázdné" u kapitol). Se zveřejněním rovnou stiskem by
   * jinak šla na server ukázková firma ze sestavení. */
  f.podminky = PODMINKY.podminkyCiste(PODMINKY.podminkyEf(f));
  nastRefresh();
  if (typeof onlineFirmaZverejnitMozne === 'function' && onlineFirmaZverejnitMozne())
    return onlineZverejniFirmu(true);
  hlaska('Platební podmínky jsou zapsané. ' + podmKdeZverejnit());
  return false;
}
/* Kde se zveřejňuje — věta z online_ui.js; bez něj (Node testy) obecná. */
function podmKdeZverejnit() {
  return typeof onlineFirmaKdeZverejnit === 'function' ? onlineFirmaKdeZverejnit()
    : 'Online zveřejnit teď nejde — aplikace neběží na serveru.';
}

/* ---------- vykreslení ---------- */

function podmStitek(cast, pole) {
  const upr = PODMINKY.podminkyUpraveno(NAST.firma || {}, cast, pole);
  return upr ? '<span class="pill">upraveno</span>' : '<span class="pill mut">výchozí</span>';
}
/* Řádek: popisek | vstup | jednotka | poznámka. Jednotka má vlastní sloupec
 * pevné šířky i tam, kde žádná není — jen tak končí všechny vstupy oddílu
 * ve stejné svislici (U1, 20. 10. 2026: „Limit smluvních pokut" s jednotkou
 * uvnitř pružného obalu ujížděl doleva). */
function podmRadek(label, vstup, pozn, jednotka) {
  return `<div class="row podm-radek"><label>${esc(label)}</label>${vstup}
    <span class="podm-jednotka">${esc(jednotka || '')}</span>
    <span class="note" style="flex:none;width:210px;font-size:11.5px">${pozn || ''}</span></div>`;
}
function podmCisloVstup(cast, pole, hodnota, min, max) {
  const dis = jeAdmin() ? '' : ' disabled';
  return `<input type="number" min="${min}" max="${max}" step="1" value="${esc(String(hodnota))}"
      onchange="podmSet(${cast ? `'${cast}'` : 'null'}, '${escJs(pole)}', this.value, 'cislo')"${dis}>`;
}
function podmVyberVstup(cast, pole, hodnota, volby) {
  const dis = jeAdmin() ? '' : ' disabled';
  return `<select onchange="podmSet('${cast}', '${escJs(pole)}', this.value)"${dis}>${volby.map(([val, txt]) =>
    `<option value="${esc(val)}"${val === hodnota ? ' selected' : ''}>${esc(txt)}</option>`).join('')}</select>`;
}
function podmTextVstup(cast, pole, hodnota) {
  const dis = jeAdmin() ? '' : ' disabled';
  return `<input type="text" value="${esc(hodnota)}" maxlength="200"
    onchange="podmSet('${cast}', '${escJs(pole)}', this.value)"${dis}>`;
}

/* Společný blok nad přepínačem. */
function nastPodminkySpolecne() {
  const f = NAST.firma || {};
  const ef = PODMINKY.podminkyEf(f);
  const dis = jeAdmin() ? '' : ' disabled';
  const plat = FIRMA_POLE.find(p => p.id === 'platnostNabidky');
  return `<div class="sec-title">Společné pro OCK i PROJ</div>
    ${podmRadek(plat.label, `<input type="text" value="${esc(f.platnostNabidky == null ? '' : f.platnostNabidky)}"
      placeholder="2 měsíce" onchange="firmaSet('platnostNabidky', this.value)"${dis}>`,
      `<code>{{${esc(plat.symbol)}}}</code>`)}
    ${podmRadek('Sazby smluvních pokut (výběr v krycím listu)', `<input type="text" id="podmSazby"
      value="${esc(ef.sazbyPokut.join(' · '))}" onchange="podmSet(null, 'sazbyPokut', this.value, 'seznamSazeb')"${dis}>`,
      podmStitek(null, 'sazbyPokut') + ' první musí být „0" (bez pokuty), další „N % / den", odděleno tečkou ·')}
    ${podmRadek('Limit smluvních pokut', podmCisloVstup(null, 'limitPokutProc', ef.limitPokutProc, 0, 100),
      podmStitek(null, 'limitPokutProc') + ' volby „Uplatněn / NEUPLATNĚN limit N %"', '% z ceny díla')}`;
}

function podmPrepinac() {
  const c = podmCast();
  const tl = (k, txt) => `<button type="button" class="${c === k ? 'primary' : ''}" aria-pressed="${c === k}"
    onclick="podmPrepni('${k}')">${txt}</button>`;
  return `<div class="btns podm-prepinac" role="group" aria-label="Část zakázky" style="margin:14px 0 4px">
    ${tl('ock', 'OCK · ocelová konstrukce')}${tl('proj', 'PROJ · projekce')}</div>`;
}

function nastPodminkyOck() {
  const f = NAST.firma || {};
  const ef = PODMINKY.podminkyEf(f), o = ef.ock;
  const dis = jeAdmin() ? '' : ' disabled';
  const s = PODMINKY.podminkySoucetOck(ef);
  const sazby = ef.sazbyPokut.map(x => [x, x]);
  const limit = [['uplatnen', PODMINKY.podminkyLimitVolby(ef)[0]], ['neuplatnen', PODMINKY.podminkyLimitVolby(ef)[1]]];
  const anoNe = [['Ano', 'Ano'], ['Ne', 'Ne']];
  const splatka = (popis, kProc, kMil, pozn) => podmRadek(popis,
    `<span style="display:flex;gap:6px;align-items:center;flex:1;min-width:0">
      <input type="number" min="0" max="100" step="1" value="${esc(String(o[kProc]))}" style="width:80px"
        class="podm-proc${s.ok ? '' : ' podm-chyba'}" onchange="podmSet('ock', '${kProc}', this.value, 'cislo')"${dis}> %
      <input type="text" value="${esc(o[kMil])}" maxlength="200" style="flex:1;min-width:0"
        onchange="podmSet('ock', '${kMil}', this.value)"${dis}></span>`, podmStitek('ock', kProc) + (pozn || ''));
  const soucet = `<div class="row podm-soucet"><label><b>Součet</b></label>
    <span><b class="${s.ok ? '' : 'podm-chyba-text'}">${esc(PODMINKY.podmProcText(s.soucet))} %</b>
    ${s.ok ? '<span class="pill">v pořádku</span>'
      : `<span class="pill bad">${s.blokuje ? 'musí dát 100 % — zveřejnění je zablokované' : 'nedává 100 %'}</span>`}</span></div>`;
  return `<div class="sec-title">Platební podmínky OCK</div>
    <div class="note" style="margin-top:0">Výchozí hodnoty <b>krycího listu OCK</b>. Obchodník je v zakázce může přepsat
      (↺ v krycím listu vrátí hodnotu odsud). Změna se propíše do rozpracovaných variant; odeslané a zamčené
      nabídky mají podmínky zmrazené a nezmění se.</div>
    ${podmRadek('Splatnost faktur', podmCisloVstup('ock', 'splatnostDni', o.splatnostDni, 1, 120), podmStitek('ock', 'splatnostDni'), 'dní')}
    ${splatka('Záloha / dílčí faktura č. 1 — výchozí', 'zalohaProc', 'zalohaMilnik', ' milník platí pro všechny volby zálohy')}
    ${podmRadek('Volby zálohy v krycím listu', `<input type="text" value="${esc(o.zalohyProc.map(p => +p === 0 ? 'Bez zálohy' : PODMINKY.podmProcText(p) + ' %').join(' · '))}"
      onchange="podmSet('ock', 'zalohyProc', this.value, 'seznamProcent')"${dis}>`, podmStitek('ock', 'zalohyProc') + ' oddělte tečkou ·, první „Bez zálohy"')}
    ${splatka('Dílčí faktura č. 2', 'faktura2Proc', 'faktura2Milnik', ' v krycím listu se dopočítá do 100 %')}
    ${splatka('Konečná faktura', 'konecnaProc', 'konecnaMilnik')}
    ${soucet}
    ${podmRadek('Zádržné do odstranění vad a nedodělků', `<span style="display:flex;gap:6px;align-items:center;flex:none">
      ${podmVyberVstup('ock', 'zadrzneVan', o.zadrzneVan, anoNe)}
      <input type="number" min="0" max="20" placeholder="%" value="${esc(String(o.zadrzneVanProc))}" style="width:80px"
        onchange="podmSet('ock', 'zadrzneVanProc', this.value, 'procentaVolitelne')"${dis}></span>`,
      podmStitek('ock', 'zadrzneVan') + (o.zadrzneVan === 'Ano' && o.zadrzneVanProc === '' ? ' <span class="pill warn">Ano bez procenta</span>' : ''), '%')}
    ${podmRadek('Zádržné po dobu záruky', `<span style="display:flex;gap:6px;align-items:center;flex:none">
      ${podmVyberVstup('ock', 'zadrzneZaruka', o.zadrzneZaruka, anoNe)}
      <input type="number" min="0" max="20" placeholder="%" value="${esc(String(o.zadrzneZarukaProc))}" style="width:80px"
        onchange="podmSet('ock', 'zadrzneZarukaProc', this.value, 'procentaVolitelne')"${dis}></span>`,
      podmStitek('ock', 'zadrzneZaruka') + (o.zadrzneZaruka === 'Ano' && o.zadrzneZarukaProc === '' ? ' <span class="pill warn">Ano bez procenta</span>' : ''), '%')}
    ${podmRadek('Doba záruky', podmCisloVstup('ock', 'zarukaMesicu', o.zarukaMesicu, 0, 240), podmStitek('ock', 'zarukaMesicu'), 'měsíců')}
    ${podmRadek('Smluvní pokuta – prodlení dodávky', podmVyberVstup('ock', 'pokutaDodavka', o.pokutaDodavka, sazby), podmStitek('ock', 'pokutaDodavka'))}
    ${podmRadek('Smluvní pokuta – prodlení splatnosti', podmVyberVstup('ock', 'pokutaSplatnost', o.pokutaSplatnost, sazby), podmStitek('ock', 'pokutaSplatnost'))}
    ${podmRadek('Limit smluvních pokut', podmVyberVstup('ock', 'pokutaLimit', o.pokutaLimit, limit), podmStitek('ock', 'pokutaLimit'))}
    ${podmRadek('Typ smlouvy', podmVyberVstup('ock', 'typSmlouvy', o.typSmlouvy, podmTypySmlouvy()), podmStitek('ock', 'typSmlouvy'))}
    ${podmRadek('Cena nezahrnuje (krycí list)', podmTextVstup('ock', 'cenaNezahrnuje', o.cenaNezahrnuje), podmStitek('ock', 'cenaNezahrnuje'))}
    ${nastPodminkyVety(ef)}`;
}

function podmTypySmlouvy() { return PODMINKY.PODMINKY_TYPY_SMLOUVY.map(x => [x, x]); }

/* ---------- věty platebního kalendáře (#367 fáze 2b, Q3) ---------- */
const PODM_VETY_POPIS = {
  zaloha: 'Nabídka — záloha (dílčí doklad po podpisu SoD)',
  faktura2: 'Nabídka — dílčí doklad po zahájení prací',
  konecna: 'Nabídka — konečný doklad',
  mesicne: 'Nabídka i smlouva — měsíční fakturace',
  sodZaloha: 'Smlouva — milník zálohy',
  sodKonecna: 'Smlouva — milník konečné splátky',
  sodZbyvajici: 'Smlouva — slovo „zbývajících" u konečné splátky',
  sodZCeny: 'Smlouva — „z celkové ceny díla"',
};
const PODM_JAZYKY_POPIS = { cz: 'česky', en: 'anglicky', de: 'německy', fr: 'francouzsky' };
function podmTr(L) { return x => (typeof tr === 'function') ? tr(x, L) : x; }
function podmVetaSet(klic, jaz, text) {
  if (!jeAdmin()) { hlaska('Platební podmínky firmy smí měnit jen administrátor.'); return; }
  const f = NAST.firma || (NAST.firma = firmaDefault());
  firmaSet('podminky', PODMINKY.podminkyNastavVetu(f.podminky, klic, jaz, text));
}
function nastPodminkyVety(ef) {
  const dis = jeAdmin() ? '' : ' disabled';
  const ulozene = ((NAST.firma || {}).podminky || {}).vety || {};
  const blok = klic => {
    const pole = PODMINKY.PODMINKY_JAZYKY.map(L => {
      const vlastni = (ulozene[klic] || {})[L];
      const efekt = PODMINKY.podminkyVeta(ef, klic, L, 1, '50 %', podmTr(L));
      const jenVych = PODMINKY.podminkyVetaJenVychoziPreklad(ef, klic, L);
      const stitek = L === 'cz' ? (vlastni ? '<span class="pill">upraveno</span>' : '<span class="pill mut">výchozí</span>')
        : (vlastni ? '<span class="pill">vlastní znění</span>' : '<span class="pill mut">ze slovníku</span>')
          + (jenVych ? ' <span class="pill warn">odpovídá výchozí češtině — přeložte úpravu</span>' : '');
      return `<div class="row" style="align-items:flex-start">
        <label style="flex:none;width:96px;padding-top:6px">${esc(PODM_JAZYKY_POPIS[L])}</label>
        <textarea rows="3" style="flex:1;min-width:0;font-family:inherit" placeholder="${esc(efekt)}"
          onchange="podmVetaSet('${escJs(klic)}', '${L}', this.value)"${dis}>${esc(vlastni || '')}</textarea>
        <span class="note" style="flex:none;width:170px;font-size:11.5px;padding-top:6px">${stitek}</span></div>`;
    }).join('');
    return `<details style="margin:6px 0;border:1px solid var(--line);border-radius:6px;padding:6px 10px">
      <summary style="cursor:pointer;font-weight:600">${esc(PODM_VETY_POPIS[klic] || klic)}</summary>${pole}</details>`;
  };
  return `<div class="sec-title">Věty platebního kalendáře</div>
    <div class="note" style="margin-top:0">Věty nabídky OCK (<code>{{PODM_PLATEBNI_KALENDAR}}</code>) a seznamu splátek smlouvy
      o dílo realizace (<code>{{SOD_PLATEBNI_KALENDAR}}</code>). Značky <code>{PORADI}</code> a <code>{PROC}</code> doplní aplikace
      (pořadí dokladu a procento v jazyce dokumentu). <b>Prázdné pole = výchozí znění</b>: česky dnešní věta, v cizím jazyce
      překlad výchozí české věty ze slovníku (šedý text v poli ukazuje, co se vytiskne). Odeslané nabídky se nemění.</div>
    ${Object.keys(PODM_VETY_POPIS).map(blok).join('')}`;
}

function nastPodminkyProj() {
  const f = NAST.firma || {};
  const ef = PODMINKY.podminkyEf(f), p = ef.proj;
  const sazby = ef.sazbyPokut.map(x => [x, x]);
  const limit = [['uplatnen', PODMINKY.podminkyLimitVolby(ef)[0]], ['neuplatnen', PODMINKY.podminkyLimitVolby(ef)[1]]];
  return `<div class="sec-title">Platební podmínky PROJ</div>
    <div class="note" style="margin-top:0">Výchozí hodnoty <b>krycího listu PROJ</b>; v zakázce jdou přepsat. Splátky projekce
      určuje plán plateb níž.</div>
    ${podmRadek('Splatnost faktur', podmCisloVstup('proj', 'splatnostDni', p.splatnostDni, 1, 120), podmStitek('proj', 'splatnostDni'), 'dní')}
    ${podmRadek('Smluvní pokuta – prodlení s odevzdáním', podmVyberVstup('proj', 'pokutaTermin', p.pokutaTermin, sazby), podmStitek('proj', 'pokutaTermin'))}
    ${podmRadek('Smluvní pokuta – prodlení splatnosti', podmVyberVstup('proj', 'pokutaSplatnost', p.pokutaSplatnost, sazby), podmStitek('proj', 'pokutaSplatnost'))}
    ${podmRadek('Limit smluvních pokut', podmVyberVstup('proj', 'pokutaLimit', p.pokutaLimit, limit), podmStitek('proj', 'pokutaLimit'))}
    ${podmRadek('Typ smlouvy', podmVyberVstup('proj', 'typSmlouvy', p.typSmlouvy, podmTypySmlouvy()), podmStitek('proj', 'typSmlouvy'))}
    ${podmRadek('Licence k projektové dokumentaci', podmTextVstup('proj', 'licence', p.licence), podmStitek('proj', 'licence'))}
    ${podmRadek('Pojištění odpovědnosti projektanta', podmTextVstup('proj', 'pojisteni', p.pojisteni), podmStitek('proj', 'pojisteni'))}
    ${podmRadek('Cena nezahrnuje (krycí list)', podmTextVstup('proj', 'cenaNezahrnuje', p.cenaNezahrnuje), podmStitek('proj', 'cenaNezahrnuje'))}
    ${nastPodminkyTextyProj(ef)}`;
}

/* ---------- texty nabídky PROJ (#367 fáze 2b, Q5) ---------- */
const PODM_TEXTY_PROJ = [
  ['cenaNezahrnuje', 'CENA NEZAHRNUJE', '{{PROJ_CENA_NEZAHRNUJE}}'],
  ['pozadovano', 'POŽADOVÁNO OD INVESTORA', '{{PROJ_POZADOVANO_OD_INVESTORA}}'],
  ['terminy', 'TERMÍNY', '{{PROJ_TERMINY_CINNOST}} | {{PROJ_TERMINY_TERMIN}}'],
  ['dolozky', 'DOLOŽKY', '{{PROJ_DOLOZKY}}'],
];
/* Textarea → řádky. Termíny česky „sekce | činnost | termín", cizí jazyk
 * „činnost | termín" (pořadí jako česky). Prázdné pole = výchozí. */
function podmTextProjParse(klic, jaz, text) {
  const radky = String(text || '').split('\n').map(x => x.trim()).filter(Boolean);
  if (!radky.length) return null;
  if (klic !== 'terminy') return radky;
  return radky.map(r => {
    /* K3-N9 drobnost: další „|" patří do termínu (dřív se 4. a další pole tiše zahodila) */
    const c = r.split('|').map(x => x.trim());
    const zbytek = (od) => c.slice(od).join(' | ');
    return jaz === 'cz' ? [c[1] || '', zbytek(2), c[0] || ''] : [c[0] || '', zbytek(1)];
  });
}
function podmTextProjText(klic, jaz, radky) {
  if (klic !== 'terminy') return radky.join('\n');
  return radky.map(r => jaz === 'cz' ? r[2] + ' | ' + r[0] + ' | ' + r[1] : r[0] + ' | ' + r[1]).join('\n');
}
function podmTextProjSet(klic, jaz, text) {
  if (!jeAdmin()) { hlaska('Platební podmínky firmy smí měnit jen administrátor.'); return; }
  const f = NAST.firma || (NAST.firma = firmaDefault());
  firmaSet('podminky', PODMINKY.podminkyNastavTextProj(f.podminky, klic, jaz,
    klic === 'dolozkyTisk' ? !!text : podmTextProjParse(klic, jaz, text)));
}
function nastPodminkyTextyProj(ef) {
  const dis = jeAdmin() ? '' : ' disabled';
  const ulozene = ((NAST.firma || {}).podminky || {}).nabidkaProj || {};
  const blok = ([klic, nadpis, symbol]) => {
    const pole = PODMINKY.PODMINKY_JAZYKY.map(L => {
      const vlastni = (ulozene[klic] || {})[L];
      const efekt = PODMINKY.podminkyTextProj(ef, klic, L, podmTr(L));
      const hodnota = Array.isArray(vlastni) ? podmTextProjText(klic, L, vlastni) : '';
      const stitek = L === 'cz' ? (vlastni ? '<span class="pill">upraveno</span>' : '<span class="pill mut">výchozí</span>')
        : (vlastni ? '<span class="pill">vlastní znění</span>' : '<span class="pill mut">ze slovníku</span>');
      return `<div class="row" style="align-items:flex-start">
        <label style="flex:none;width:96px;padding-top:6px">${esc(PODM_JAZYKY_POPIS[L])}</label>
        <textarea rows="${Math.min(10, Math.max(3, efekt.length + 1))}" style="flex:1;min-width:0;font-family:inherit"
          placeholder="${esc(podmTextProjText(klic, L, klic === 'terminy' && L !== 'cz' ? efekt.map(x => [x[0], x[1]]) : efekt))}"
          onchange="podmTextProjSet('${escJs(klic)}', '${L}', this.value)"${dis}>${esc(hodnota)}</textarea>
        <span class="note" style="flex:none;width:150px;font-size:11.5px;padding-top:6px">${stitek}</span></div>`;
    }).join('');
    const tisk = klic !== 'dolozky' ? '' : `<label style="display:flex;gap:8px;align-items:center;margin:6px 0">
      <input type="checkbox" ${ef.nabidkaProj.dolozkyTisk ? 'checked' : ''} onchange="podmTextProjSet('dolozkyTisk', null, this.checked)"${dis}>
      Tisknout doložky v nabídce PROJ <span class="note">(výchozí vypnuto — zapíná J. V.)</span></label>`;
    return `<details style="margin:6px 0;border:1px solid var(--line);border-radius:6px;padding:6px 10px">
      <summary style="cursor:pointer;font-weight:600">${esc(nadpis)} <code style="font-weight:400">${esc(symbol)}</code></summary>
      ${tisk}${pole}</details>`;
  };
  return `<div class="sec-title">Texty nabídky PROJ</div>
    <div class="note" style="margin-top:0">Bloky pod cenou v nabídce PROJ. <b>Jeden řádek = jedna odrážka.</b> Termíny se píšou
      česky jako <code>sekce | činnost | termín</code> (sekce: zamereni, studie, projednani, dpz, ic, dps, ezc, kolaudace, geodet —
      řádek se vytiskne jen u nabízené činnosti), v cizím jazyce <code>činnost | termín</code> ve stejném pořadí.
      <b>Prázdné pole = výchozí znění</b> (česky dnešní text, cizí jazyk překlad ze slovníku — šedý text v poli).
      Online nabídka je bere hned, Word od šablony PROJ v6 (řádek tabulky za odrážku, termíny ve dvou sloupcích;
      starší šablony v3–v5 mají tyto bloky pevně). Pro šablonu s jedním místem jsou i <code>{{PROJ_TERMINY}}</code>
      („činnost – termín" na řádek).</div>
    ${PODM_TEXTY_PROJ.map(blok).join('')}`;
}

/* Celý blok podmínek pro záložku Smlouvy / Šablony. Smluvní standardy,
 * kapitoly nabídky a logo dodává volající (nastSmluvniStandardy) podle
 * přepínače. */
function nastPodminkyHlava() {
  const f = NAST.firma || {};
  const vady = PODMINKY.podminkyVady(f.podminky);
  const admin = jeAdmin();
  return `${admin ? '' : `<div class="note" style="margin:0 0 6px;color:var(--warn)">Platební podmínky firmy smí měnit jen
      administrátor. Vidíte je jen pro čtení; v konkrétní zakázce je přepíšete v krycím listu.</div>`}
    ${vady.length ? `<div class="note" style="color:#b91c1c;margin:6px 0"><b>Platební podmínky mají vady — zveřejnit nepůjde,
      krycí listy u vadných polí používají výchozí hodnoty:</b><br>${vady.map(v => esc(v)).join('<br>')}</div>` : ''}
    ${nastPodminkySpolecne()}
    ${admin ? `<div class="btns" style="margin-top:6px">
      <button class="mini" onclick="podmZapsatVychozi()" title="zapíše platné hodnoty do firemních údajů a na serveru je rovnou zveřejní online">Zapsat výchozí hodnoty</button>
      ${f.podminky ? '<button class="mini" onclick="podmVratitVse()">↺ Vrátit platební podmínky na výchozí</button>' : ''}</div>
      ${podmZverejnitBlok()}` : ''}
    ${podmPrepinac()}`;
}

/* Stav zveřejnění a tlačítko přímo tady (U1, 20. 10. 2026) — stejné
 * tlačítko a stejné podmínky jako panel v Nastavení → Firma (online_ui.js).
 * Ruční úprava kteréhokoli pole na záložce (sazby, limit, OCK/PROJ, věty,
 * kapitoly) se tu ukáže jako „neuloženo online" s výčtem rozdílů. Bez serveru
 * nebo bez přihlášení administrátora se tlačítko nekreslí, jen věta proč. */
function podmZverejnitBlok() {
  if (typeof onlineFirmaZverejnitMozne !== 'function') return '';
  if (!onlineFirmaZverejnitMozne())
    return `<div class="note podm-zverejnit" style="margin-top:6px">Změny se ukládají jen v této aplikaci — online zveřejnit
      teď nejde, ${esc(onlineFirmaProcNe())}.</div>`;
  const z = onlineFirmaZverejnitBlok('Zveřejnit změny online');
  /* Úspěch se ukazuje, jen dokud je online totéž — po další úpravě by lhal. */
  const v = ONLINE_STAV.firmaVysledek && (!ONLINE_STAV.firmaVysledek.ok || z.hotovo) ? ONLINE_STAV.firmaVysledek : null;
  const stav = z.hotovo ? '' : `<div class="note" style="color:var(--warn);margin-top:0">⚠ <b>Neuloženo online</b> —
      ostatním začnou změny platit, až je zveřejníte.</div>`;
  return `<div class="podm-zverejnit" style="margin-top:6px">
      ${v ? `<div class="note podm-vysledek" style="margin-top:0;color:var(${v.ok ? '--ok' : '--warn'})">${v.ok ? '✓' : '⚠'} ${esc(v.text)}</div>` : ''}
      ${stav}${z.poznamky}
      <div class="btns" style="margin-top:6px">${z.tlacitko}</div></div>`;
}

if (typeof module !== 'undefined')
  module.exports = { podmCast, podmSablonaViditelna, PODM_SABLONY_CAST };
