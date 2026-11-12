/* ============================================================
 * UPOZORNĚNÍ NA VAZBU Z WEBHOOKU PIPEDRIVE (K40c #581, rozhodnutí J. V.
 * 11. 11. 2026; prototyp podklady/k40_w1_prototyp v4)
 *
 * Webhook „Vygenerovat nabídku“ umí navázat EXISTUJÍCÍ kalkulaci podle čísla
 * nabídky — při překlepu v čísle cizí. Proto při otevření zakázky žlutý pruh
 * nad hlavičkou (i u zamčené, prodané a jen-ke-čtení zakázky):
 *   · kdy a na který deal se kalkulace navázala, co se doplnilo, výsledek ARES
 *     a rozdíly ARES × organizace v Pipedrive,
 *   · „V pořádku“ (každý), „Zrušit vazbu“ (autor zakázky a administrátor),
 *     ostatní „Vazba je chybná“ — rozhoduje SERVER (functions/pd_vazba.mjs),
 *   · „Opravit firmu v Pipedrive“ (autor a administrátor; jen při shodě IČO
 *     organizace a hlavičky, jinak zhasnuté s důvodem) — dialog „v Pipedrive je
 *     × podle ARES bude“, zápis až po potvrzení (functions/pd_organizace.mjs).
 * Všechny texty přes esc / escJs, dialog je čistý text (dlgEsc).
 * ============================================================ */
const PD_VAZBA_WEBHOOK_AUTOR = 'pipedrive-webhook';
const PD_VAZBA_POLE_TEXT = { nazevAkce: 'název akce', adresa: 'adresa stavby', objednatel: 'zákazník',
  adresaObjednatele: 'sídlo zákazníka', ico: 'IČO', dic: 'DIČ', kontakt: 'kontakt', terminPredani: 'termín předání (krycí list)' };
const PD_VAZBA_ORG_TEXT = { nazev: 'název organizace', adresa: 'adresa organizace', dic: 'DIČ organizace' };
const PD_VAZBA_ARES_TEXT = {
  neplatne: 'IČO organizace dealu neprojde kontrolní číslicí — firma je převzatá z dealu, zkontrolujte ji.',
  nenalezeno: 'IČO organizace dealu rejstřík ARES nezná — firma je převzatá z dealu, zkontrolujte ji.',
  vypadek: 'ARES neodpověděl — firma je převzatá z dealu, ověřte ji tlačítkem „Najít firmu v ARES“.',
};

/* Živá vazba z webhooku (deal zakázky je pořád týž), nebo null. */
function pdVazbaZivaUI(zak) {
  const v = zak && zak.pdVazbaWebhook;
  if (!v || typeof v !== 'object' || v.stav === 'zruseno') return null;
  const deal = (typeof ctrlPdDealIdNorm === 'function') ? ctrlPdDealIdNorm(zak.pdDealId) : String(zak.pdDealId || '');
  return deal && String(v.deal) === deal ? v : null;
}
function pdVazbaJa() { return (typeof ONLINE_STAV !== 'undefined' && ONLINE_STAV && ONLINE_STAV.ja) || null; }
/* Stejné pravidlo jako server (lib/pd_vazba.mjs pdVazbaSmiMenit): administrátor,
 * nebo autor zakázky — ne u zakázky založené webhookem. Rozhoduje server. */
function pdVazbaSmiMenitUI(zak) {
  const ja = pdVazbaJa();
  if (!ja) return false;
  if (ja.role === 'Administrátor') return true;
  const autor = String((zak && zak.autor) || '').trim().toLowerCase();
  return !!autor && autor !== PD_VAZBA_WEBHOOK_AUTOR && autor === String(ja.email || '').trim().toLowerCase();
}
const pdVazbaPoleText = (k) => (k || []).map(x => PD_VAZBA_POLE_TEXT[x] || x).join(', ');
const pdVazbaOrgText = (k) => (k || []).map(x => PD_VAZBA_ORG_TEXT[x] || x).join(', ');
function pdVazbaDen(kdy) {
  return (typeof ctrlDenPraha === 'function' && kdy) ? ctrlDenPraha(kdy) : String(kdy || '').slice(0, 10);
}
/* Důvod, proč „Opravit firmu v Pipedrive“ nejde ('' = jde). Server rozhoduje
 * znovu (shoda IČO organizace a ULOŽENÉ hlavičky, B209). */
function pdVazbaOpravaDuvod(zak, v) {
  if (!v) return 'zakázka nemá živou vazbu na deal';
  if (v.ares !== 'ok') return 'ARES při posledním ověření neodpověděl';
  if (!v.icoShoda) return 'IČO organizace dealu se liší od IČO v hlavičce zakázky (nebo některé chybí) — firma se v Pipedrive neopravuje';
  return '';
}
function pdVazbaOpravaTlacitko(zak, v) {
  if (!v || !pdVazbaSmiMenitUI(zak) || !(v.aresRozdily || []).length) return '';
  const duvod = pdVazbaOpravaDuvod(zak, v);
  return `<button type="button" class="mini cteni-ok noprint" data-pd-vazba="organizace" onclick="pdOrganizaceOpravUI()"${duvod ? ' disabled' : ''}
    title="${esc(duvod || 'zapsat do organizace v Pipedrive název, adresu a DIČ podle ARES — jen po potvrzení')}">Opravit firmu v Pipedrive</button>`;
}

/* Žlutý pruh nad hlavičkou. Prázdno = nic k ukázání. */
function pdVazbaUpozorneni(zak) {
  const v = pdVazbaZivaUI(zak);
  if (!v) return '';
  const smi = pdVazbaSmiMenitUI(zak);
  const ceka = v.stav === 'ceka';
  const rozdily = v.ares === 'ok' ? (v.aresRozdily || []) : [];
  const aresProblem = !!PD_VAZBA_ARES_TEXT[v.ares];
  const nahlaseno = v.nahlaseno && smi;
  if (!ceka && !rozdily.length && !aresProblem && !nahlaseno && !v.zanikla) return '';
  const casti = [];
  if (ceka) casti.push('Kalkulace byla <b>' + esc(pdVazbaDen(v.kdy)) + '</b> automaticky navázána na deal <b>' + esc(v.deal)
    + '</b> v Pipedrive podle čísla nabídky <b>' + esc(v.cislo) + '</b>.'
    + ((v.doplneno || []).length ? ' Doplněno: <b>' + esc(pdVazbaPoleText(v.doplneno)) + '</b>.' : ' Údaje zakázky se nezměnily.'));
  else casti.push('Deal <b>' + esc(v.deal) + '</b> v Pipedrive:');
  if (v.ares === 'ok') casti.push('Firma ověřena v ARES.');
  else if (aresProblem) casti.push('<b>' + esc(PD_VAZBA_ARES_TEXT[v.ares]) + '</b>');
  if (v.zanikla) casti.push('<b>Subjekt je v ARES zaniklý</b> — zkontrolujte zákazníka.');
  if (rozdily.length) casti.push('V Pipedrive se od ARES liší: <b>' + esc(pdVazbaOrgText(rozdily)) + '</b>.');
  if (v.nahlaseno) casti.push(smi ? '<b>Vazbu nahlásil jako chybnou ' + esc(v.nahlaseno.kdo) + ' (' + esc(pdVazbaDen(v.nahlaseno.kdy)) + ').</b>'
    : 'Vazba je nahlášená autorovi zakázky a administrátorovi jako chybná.');
  let tl = '';
  if (ceka) {
    tl += `<button type="button" class="mini cteni-ok primary" data-pd-vazba="potvrdit" onclick="pdVazbaAkceUI('potvrdit')">V pořádku</button>`;
    tl += smi
      ? `<button type="button" class="mini cteni-ok" data-pd-vazba="zrusit" onclick="pdVazbaAkceUI('zrusit')"
          title="kalkulace nepatří k tomuto dealu (překlep v čísle nabídky) — deal se odmítne a náš odkaz v něm se smaže">Zrušit vazbu</button>`
      : `<button type="button" class="mini cteni-ok" data-pd-vazba="chybna" onclick="pdVazbaAkceUI('chybna')"${v.nahlaseno ? ' disabled' : ''}
          title="upozorní autora zakázky a administrátora">Vazba je chybná</button>`;
  } else if (!smi && !v.nahlaseno) {
    tl += `<button type="button" class="mini cteni-ok" data-pd-vazba="chybna" onclick="pdVazbaAkceUI('chybna')">Vazba je chybná</button>`;
  } else if (smi && v.nahlaseno) {
    tl += `<button type="button" class="mini cteni-ok" data-pd-vazba="zrusit" onclick="pdVazbaAkceUI('zrusit')">Zrušit vazbu</button>`;
  }
  if (aresProblem && typeof aresHledej === 'function')
    tl += `<button type="button" class="mini noprint" onclick="aresHledej('${v.strana === 'proj' ? 'proj' : 'ock'}')">🔎 Najít firmu v ARES</button>`;
  tl += pdVazbaOpravaTlacitko(zak, v);
  return `<div class="pd-vazba-upoz noprint" role="status" style="background:#fff7d6;border:1px solid #e0c46c;border-radius:6px;padding:8px 10px;margin:0 0 8px;display:flex;flex-wrap:wrap;gap:6px;align-items:center">
    <span style="flex:1 1 420px">${casti.join(' ')}</span>${tl}</div>`;
}

/* Před akcí na serveru nesmí být neuložené změny — po akci se zakázka
 * načte znovu (server změnil razítko). */
async function pdVazbaPripraveno() {
  if (typeof ONLINE_STAV === 'undefined' || !ONLINE_STAV.ja || !ONLINE_STAV.soubor) {
    await hlaska('Akce nad vazbou na Pipedrive jde jen u zakázky otevřené z online databáze.');
    return false;
  }
  if (typeof historieNeulozeno === 'function' && historieNeulozeno() && !(typeof zamekCteniJe === 'function' && zamekCteniJe())) {
    await hlaska('Zakázka má neuložené změny. Nejdřív je uložte, pak rozhodněte o vazbě na Pipedrive.');
    return false;
  }
  return true;
}
async function pdVazbaAkceUI(akce) {
  const v = pdVazbaZivaUI(ZAK);
  if (!v || !await pdVazbaPripraveno()) return;
  if (akce === 'zrusit' && !await potvrd('Zrušit vazbu na deal ' + v.deal + '?\n\n'
      + 'Kalkulace se od dealu odpojí, deal bude u této kalkulace odmítnutý (webhook ji znovu nenaváže) '
      + 'a náš odkaz v dealu se smaže. Údaje, které webhook doplnil (' + (pdVazbaPoleText(v.doplneno) || 'žádné')
      + '), zůstanou — opravte je případně ručně.', { nadpis: 'Zrušit vazbu na Pipedrive', ano: 'Zrušit vazbu', ne: 'Ponechat' })) return;
  const soubor = ONLINE_STAV.soubor;
  try {
    const o = await onlineApi('/api/pd/vazba', { soubor, akce, razitko: ONLINE_STAV.razitko || '' });
    if (typeof historieOznacUlozeno === 'function') historieOznacUlozeno();
    await onlineOtevri(soubor);
    const zprava = { potvrdit: 'Vazba na deal potvrzena.', chybna: 'Vazba nahlášena autorovi zakázky a administrátorovi.',
      zrusit: 'Vazba na deal zrušena.' }[akce];
    onlineZprava(zprava + ((o.varovani || []).length ? ' ' + o.varovani.join(' ') : ''), (o.varovani || []).length ? 'varovani' : undefined);
    if ((o.varovani || []).length) await hlaska(o.varovani.join('\n'));
    render();
  } catch (e) {
    await hlaska('Nepovedlo se: ' + e.message);
  }
}
/* Dvou krokový dialog: náhled ze serveru → potvrzení → zápis. */
async function pdOrganizaceOpravUI() {
  const v = pdVazbaZivaUI(ZAK);
  if (!v || !await pdVazbaPripraveno()) return;
  const soubor = ONLINE_STAV.soubor;
  let n;
  try { n = await onlineApi('/api/pd/organizace', { soubor, akce: 'nahled' }); }
  catch (e) { await hlaska('Opravu firmy nejde připravit: ' + e.message); return; }
  if (!(n.rozdily || []).length) {
    await hlaska('Organizace v Pipedrive se s ARES shoduje — není co zapsat.' + (n.dicVeta ? '\n\n' + n.dicVeta : ''));
    return;
  }
  const radky = n.rozdily.map(r => '· ' + r.label + ': „' + (r.ted || '— prázdné —') + '“ → „' + r.nove + '“').join('\n');
  const ano = await potvrd('Zapsat do organizace v Pipedrive tyto změny podle ARES?\n\n' + radky
    + (n.dicVeta ? '\n\n' + n.dicVeta : '') + '\n\nZapíšou se jen tato pole, nic dalšího. Záznam půjde do protokolu zakázky.',
  { nadpis: 'Opravit firmu v Pipedrive', ano: 'Zapsat do Pipedrive', ne: 'Nezapisovat' });
  if (!ano) return;
  try {
    const z = await onlineApi('/api/pd/organizace', { soubor, akce: 'zapis', organizace: n.organizace, pole: n.rozdily.map(r => r.klic) });
    await onlineOtevri(soubor);
    onlineZprava(z.zapsano.length ? 'Organizace v Pipedrive opravena: ' + pdVazbaOrgText(z.zapsano) + '.' : 'Nebylo co zapsat.');
    render();
  } catch (e) { await hlaska('Zápis do Pipedrive se nepovedl: ' + e.message); }
}
/* Štítek v Přehledu cenových nabídek: nahlášená vazba — jen autor a administrátor. */
function pdVazbaRejstrikStitek(z) {
  if (!z || z.pdNahlaseno !== true) return '';
  const ja = pdVazbaJa();
  if (!ja) return '';
  const jeAutor = String(z.autor || '').trim().toLowerCase() === String(ja.email || '').trim().toLowerCase();
  if (ja.role !== 'Administrátor' && !jeAutor) return '';
  return ' <span class="pill" style="background:#fff0c2;color:#7a5600" title="vazbu na deal z Pipedrive někdo nahlásil jako chybnou — otevřete zakázku a rozhodněte">⚠ vazba nahlášena</span>';
}

if (typeof module !== 'undefined') module.exports = { pdVazbaZivaUI, pdVazbaSmiMenitUI, pdVazbaUpozorneni, pdVazbaOpravaDuvod, pdVazbaRejstrikStitek };
