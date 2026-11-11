/* ===== PROTOTYP K40-W1 (jen podklad k rozhodnutí J. V., NENÍ součást aplikace) =====
 * Vkládá se za sestavenou aplikaci (sestav.mjs). Nic neposílá — server, Pipedrive, ARES
 * i webhook jsou zde jen napodobené v paměti stránky. Data jsou smyšlená.
 * Do skutečné aplikace sahá jen takto: mění pole otevřené zakázky (ZAK) a volá render().
 *
 * Verze 4 (rozhodnutí J. V. 11. 11. 2026): jen varianta „jako dnes" — webhook hned doplní
 * hlavičku a zapíše odkaz. NOVĚ: firmu (zákazník, sídlo, IČO, DIČ) bere z ARES podle IČO
 * z dealu, kontakt a termín dál z dealu; rozdíly ARES × Pipedrive ukáže a nabídne tlačítko
 * „Opravit firmu v Pipedrive" (autor zakázky a administrátor, nikdy automaticky).
 * Zrušení vazby je jen pojistka proti cizímu dealu: deal je odmítnutý (409) a náš odkaz
 * v dealu se smaže; doplněné údaje zůstávají.
 * Pravidlo přepisu: pole se zapíše, když je prázdné, nebo když v něm je hodnota, kterou tam
 * naposledy zapsal webhook. Ručně upravené pole se nepřepíše nikdy. */
(function () {
  'use strict';
  /* [klíč v ZAK, popisek, zdroj] — firma z ARES, ostatní z dealu */
  const POLE = [['nazevAkce', 'Název akce', 'deal'], ['adresa', 'Adresa stavby', 'deal'], ['objednatel', 'Zákazník', 'ares'],
    ['adresaObjednatele', 'Sídlo zákazníka', 'ares'], ['ico', 'IČO zákazníka', 'ares'], ['dic', 'DIČ zákazníka', 'ares'], ['kontakt', 'Kontaktní osoba', 'deal']];
  const ICO = '99999994';   // smyšlené, jen aby prošlo kontrolní číslicí
  const SCENARE = {
    spravny: { nazev: 'správný deal (kalkulace k němu patří)', cislo: '2026 - OPR - CN - 940',
      kalk: { nazevAkce: 'Rezidence Javor — výtah', adresa: '', objednatel: '', adresaObjednatele: '', ico: '', dic: '', kontakt: '' } },
    preklep: { nazev: 'překlep v čísle nabídky (cizí kalkulace)', cislo: '2026 - OPR - CN - 904',
      kalk: { nazevAkce: 'Bytový dům Lipová — výtah', adresa: '', objednatel: 'Stavby Příklad s.r.o. (smyšlené)', adresaObjednatele: '', ico: '', dic: '', kontakt: '' } },
  };
  const DEAL = { id: '4812', nazev: 'Rezidence Javor — výtah', nazevAkce: 'Rezidence Javor — výtah', adresa: 'Javorová 1, Vzorov', kontakt: 'Jan Vzorový', terminPredani: '2027-03-31' };
  const ORG0 = { name: 'Javor Development', address: 'Javorova 12, Vzorov', dic: '' };            // organizace v Pipedrive (smyšlená, s nepřesnostmi)
  const ARES = { nazev: 'JAVOR Development a.s. (smyšlené)', adresa: 'Javorová 12/3, 110 00 Vzorov', ico: ICO, dic: 'CZ' + ICO };   // napodobená odpověď rejstříku
  const ORG_POLE = [['name', 'Název organizace', 'nazev'], ['address', 'Adresa organizace', 'adresa'], ['dic', 'DIČ organizace', 'dic']];
  const ARES_STAVY = { ok: 'ARES odpoví', nenalezeno: 'IČO v ARES není', vypadek: 'výpadek ARES' };
  const ROLE = { autor: 'autor zakázky (obchodník)', jiny: 'jiný obchodník', admin: 'administrátor' };
  const ZNACKY = { pridano: 'přidáno', zmeneno: 'změněno', smazano: 'smazáno', nesmazano: 'zůstalo', ponechano: 'ponecháno' };
  const VAZBA_TEXT = { '': 'žádná', ceka: 'navázáno, čeká na „V pořádku"', potvrzeno: 'potvrzeno', zruseno: 'zrušeno' };
  const S = { scenar: 'spravny', ares: 'ok', role: 'autor', otevreno: true, hraje: null, blik: false, potvrzeni: false };
  let OBS = null, PK = null;
  let P;   // stav napodobeného serveru

  const esc = (t) => String(t == null ? '' : t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const cas = () => new Date().toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const dnes = () => new Date().toLocaleDateString('cs-CZ');
  const zapis = (kdo, co) => P.protokol.push({ kdy: cas(), kdo, co });
  const kryciNezamcene = () => (ZAK.varianty || []).filter((v) => v && v.data && !(v.zamek && v.zamek.zamceno));
  const terminTed = () => { const v = kryciNezamcene()[0]; return (v && v.data.kryci && v.data.kryci.hodnoty && v.data.kryci.hodnoty.terminPredani) || ''; };
  const SC = () => SCENARE[S.scenar];
  const odkaz = () => 'https://kalkulator.priklad/?zakazka=' + SC().cislo.replace(/\s+/g, '');
  const smiMenit = () => S.role === 'autor' || S.role === 'admin';
  const orgRozdily = () => ORG_POLE.filter(([k, , a]) => P.org[k] !== ARES[a]);

  /* Snímek všeho, co se může změnit — z něj se kreslí „před → po". */
  function snimek() {
    const s = { termin: terminTed(), deal: ZAK.pdDealId ? 'deal ' + ZAK.pdDealId : '', stavPd: ZAK.pdDealId ? 'Otevřené' : 'nepropojeno',
      vazba: VAZBA_TEXT[(P.vazba && P.vazba.stav) || ''] + (P.vazba && P.vazba.nahlaseno ? ' · nahlášeno jako chybná' : ''),
      odmitnute: P.odmitnute.join(', '), odkaz: P.odkazVDealu, protokol: P.protokol.length,
      orgname: P.org.name, orgaddress: P.org.address, orgdic: P.org.dic };
    POLE.forEach(([k]) => { s[k] = String(ZAK[k] || ''); });
    return s;
  }

  function vychozi() {
    P = { vazba: null, odmitnute: [], protokol: [], doplneno: [], ponechano: [], otisk: {}, odkazVDealu: '', odpoved: null, krok: 'vychozi', pred: null,
      org: Object.assign({}, ORG0), ares: null, aresRozdil: [] };
    S.potvrzeni = false;
    ZAK.cislo = SC().cislo;
    Object.keys(SC().kalk).forEach((k) => { ZAK[k] = SC().kalk[k]; });
    delete ZAK.pdDealId; delete ZAK.pdStav; delete ZAK.pdZadani;
    kryciNezamcene().forEach((v) => { if (v.data.kryci && v.data.kryci.hodnoty) delete v.data.kryci.hodnoty.terminPredani; });
    P.pred = snimek();
  }

  /* Hodnoty, které webhook nabízí: firma z ARES (když odpoví), jinak z organizace v Pipedrive. */
  function nabidka() {
    const zAres = S.ares === 'ok';
    return { nazevAkce: DEAL.nazevAkce, adresa: DEAL.adresa, kontakt: DEAL.kontakt,
      objednatel: zAres ? ARES.nazev : P.org.name, adresaObjednatele: zAres ? ARES.adresa : P.org.address, ico: ICO, dic: zAres ? ARES.dic : P.org.dic };
  }
  /* Přenos: pole se zapíše, když je prázdné nebo nese hodnotu naposledy zapsanou webhookem (otisk). */
  function prenes() {
    const n = nabidka(), zmeneno = [], ponechano = [];
    POLE.forEach(([k]) => {
      const a = String(ZAK[k] || '').trim(), nova = n[k] || '';
      if (!nova || a === nova) { if (nova) P.otisk[k] = nova; return; }
      if (!a || a === P.otisk[k]) { ZAK[k] = nova; P.otisk[k] = nova; zmeneno.push(k); } else ponechano.push(k);
    });
    let termin = false;
    kryciNezamcene().forEach((v) => {
      if (!v.data.kryci || typeof v.data.kryci !== 'object') v.data.kryci = { hodnoty: {} };
      if (!v.data.kryci.hodnoty) v.data.kryci.hodnoty = {};
      if (!v.data.kryci.hodnoty.terminPredani) { v.data.kryci.hodnoty.terminPredani = DEAL.terminPredani; termin = true; }
    });
    if (termin) zmeneno.push('terminPredani');
    P.doplneno = P.doplneno.concat(zmeneno.filter((k) => !P.doplneno.includes(k)));
    P.ponechano = ponechano;
    return { zmeneno, ponechano };
  }

  function webhook() {
    P.krok = ZAK.pdDealId || P.odmitnute.length ? 'znovu' : 'webhook';
    P.ponechano = [];
    if (P.odmitnute.includes(DEAL.id)) {
      P.odpoved = { stav: 409, text: 'Deal ' + DEAL.id + ' byl u kalkulace ' + SC().cislo + ' odmítnut (vazba zrušena). Nic se nezměnilo — opravte číslo nabídky v Pipedrive.' };
      zapis('pipedrive-webhook', 'pokus o nové navázání dealu ' + DEAL.id + ' odmítnut (409)');
      return;
    }
    const nova = !ZAK.pdDealId;
    if (nova) {
      ZAK.pdDealId = DEAL.id;
      ZAK.pdStav = { status: 'open', nacteno: new Date().toISOString() };
      P.odkazVDealu = odkaz();
      P.vazba = { stav: 'ceka', kdy: dnes(), deal: DEAL.id, cislo: SC().cislo };
    }
    P.ares = S.ares;
    P.aresRozdil = S.ares === 'ok' ? orgRozdily().map(([, n]) => n) : [];
    const r = prenes();
    const aresText = S.ares === 'ok' ? 'firma ověřena v ARES (IČO ' + ICO + ')' + (P.aresRozdil.length ? ', liší se od Pipedrive: ' + P.aresRozdil.join(', ') : ', shodná s Pipedrive')
      : (S.ares === 'nenalezeno' ? 'IČO ' + ICO + ' rejstřík ARES nezná — použity údaje z dealu' : 'ARES neodpověděl včas — použity údaje z dealu');
    if (nova || r.zmeneno.length)
      zapis('pipedrive-webhook', (nova ? 'navázáno na deal ' + DEAL.id + ' podle čísla nabídky; ' : 'aktualizace z dealu ' + DEAL.id + '; ') + aresText
        + '; doplněno: ' + (nazvyPoli(r.zmeneno) || 'nic') + (r.ponechano.length ? '; ponecháno (kalkulace má jinou hodnotu): ' + nazvyPoli(r.ponechano) : ''));
    P.odpoved = { stav: 200, text: 'akce: ' + (nova || r.zmeneno.length ? 'aktualizovano' : 'bezeZmeny') + '\nzmeneno: [' + r.zmeneno.join(', ') + ']\nponechano: [' + r.ponechano.join(', ') + ']'
      + '\nares: ' + (S.ares === 'ok' ? 'overeno' : S.ares) + (P.aresRozdil.length ? '\naresRozdilyPipedrive: [' + P.aresRozdil.join(', ') + ']' : '')
      + '\nodkazDoDealu: ' + (nova ? 'zapsano' : 'beze-zmeny') + (S.ares !== 'ok' ? '\nvarovani: firma neověřena v ARES' : '') };
  }
  function potvrd() {
    P.krok = 'potvrd'; P.ponechano = [];
    P.vazba.stav = 'potvrzeno'; delete P.vazba.nahlaseno;
    zapis(ROLE[S.role], 'vazbu na deal ' + DEAL.id + ' potvrdil („V pořádku")');
  }
  function chybna() {
    P.krok = 'chybna'; P.ponechano = [];
    P.vazba.nahlaseno = true;
    zapis(ROLE[S.role], 'vazbu na deal ' + DEAL.id + ' označil jako chybnou — upozornění pro autora zakázky a administrátora');
  }
  /* Zrušení = pojistka: vazba pryč, deal odmítnutý, NÁŠ odkaz v dealu smazán. Doplněné údaje zůstávají. */
  function zrus() {
    P.krok = 'zrus'; P.ponechano = []; S.potvrzeni = false;
    delete ZAK.pdDealId; delete ZAK.pdStav;
    P.odmitnute.push(DEAL.id);
    P.vazba = { stav: 'zruseno', deal: DEAL.id };
    P.odkazVDealu = '';
    zapis(ROLE[S.role], 'vazbu na deal ' + DEAL.id + ' zrušil; odkaz v dealu vymazán; deal je u této kalkulace odmítnutý; doplněné údaje zůstaly: ' + (nazvyPoli(P.doplneno) || 'žádné'));
  }
  /* „Opravit firmu v Pipedrive": zápis jen po potvrzení, jen pole, která se liší od ARES. */
  function opravOrg() {
    P.krok = 'oprava'; P.ponechano = [];
    const r = orgRozdily();
    r.forEach(([k, , a]) => { P.org[k] = ARES[a]; });
    S.potvrzeni = false; P.aresRozdil = [];
    zapis(ROLE[S.role], 'opravil organizaci v Pipedrive podle ARES: ' + r.map(([, n]) => n).join(', '));
    P.odpoved = { stav: 200, text: 'akce: organizaceOpravena\nPATCH /organizations/…: [' + r.map(([k]) => k).join(', ') + ']' };
  }

  /* ----- porovnání před → po ----- */
  function nazvyPoli(klice) {
    return klice.map((k) => k === 'terminPredani' ? 'termín předání (krycí list)' : (POLE.find((p) => p[0] === k) || [k, k])[1]).join(', ');
  }
  function znacka(k, kPole) {
    const pred = P.pred[k], po = snimek()[k];
    if (P.krok === 'zrus' && kPole && P.doplneno.includes(kPole) && po) return 'nesmazano';
    if (pred !== po) return !pred || pred === 'žádná' || pred === 'nepropojeno' ? 'pridano' : (!po || po === 'žádná' || po === 'nepropojeno' ? 'smazano' : 'zmeneno');
    if (kPole && P.ponechano.includes(kPole)) return 'ponechano';
    return '';
  }
  const UDAJE = POLE.map(([k, n]) => [k, n, k]).concat([['termin', 'Termín předání (krycí list)', 'terminPredani'], ['deal', 'Vazba na deal', null],
    ['stavPd', 'Stav Pipedrive', null], ['vazba', 'Stav vazby', null], ['odmitnute', 'Odmítnuté dealy', null], ['odkaz', 'Odkaz v dealu', null],
    ['orgname', 'Název organizace v Pipedrive', null], ['orgaddress', 'Adresa organizace v Pipedrive', null], ['orgdic', 'DIČ organizace v Pipedrive', null]]);
  function souhrn() {
    if (P.krok === 'vychozi') return 'Výchozí stav — nic se nezměnilo. Klikněte na „2. Webhook" nebo „▶ Přehrát".';
    const sk = { pridano: [], zmeneno: [], smazano: [], nesmazano: [], ponechano: [] };
    UDAJE.forEach(([k, n, kp]) => { const z = znacka(k, kp); if (sk[z]) sk[z].push(n); });
    const cast = (z) => sk[z].length ? '<span class="k40p-zn k40p-zn-' + z + '">' + ZNACKY[z] + '</span> ' + esc(sk[z].join(', ')) : '';
    return ['pridano', 'zmeneno', 'smazano', 'nesmazano', 'ponechano'].map(cast).filter(Boolean).join(' · ') || 'Tímto krokem se nezměnilo nic.';
  }
  const stitek = (z) => z ? '<span class="k40p-zn k40p-zn-' + z + '">' + ZNACKY[z] + '</span>' : '';
  function radekPP(nazev, k, kPole, zdroj) {
    const pred = P.pred[k], po = snimek()[k], z = znacka(k, kPole);
    const pr = '— prázdné —';
    let h;
    if (pred !== po) h = '<span class="k40p-pred">' + esc(pred || pr) + '</span><span class="k40p-sip">→</span><span class="k40p-h-' + z + '">' + esc(po || pr) + '</span>';
    else h = '<span' + (z ? ' class="k40p-h-' + z + '"' : '') + '>' + esc(po || pr) + '</span>';
    const zd = zdroj && (z === 'pridano' || z === 'zmeneno') ? ' <span class="k40p-zdroj">' + esc(zdroj) + '</span>' : '';
    const p = z === 'ponechano' ? ' <span class="k40p-h-ponechano">webhook nabízel „' + esc(nabidka()[kPole]) + '", kalkulace si nechala svoje (ručně vyplněné)</span>'
      : (z === 'nesmazano' ? ' <span class="k40p-h-nesmazano">doplnil webhook, po zrušení vazby zůstává</span>' : '');
    return '<div class="k40p-r"><span>' + esc(nazev) + '</span><span>' + h + stitek(z) + zd + p + '</span></div>';
  }
  const zdrojPole = (k) => (POLE.find((p) => p[0] === k) || [])[2] === 'ares' ? (P.ares === 'ok' ? 'z ARES' : 'z dealu (ARES nedostupný)') : 'z dealu';

  /* ----- kreslení ----- */
  function upozorneni() {
    const el = document.getElementById('k40pUpoz');
    const v = P.vazba;
    const zije = v && v.stav !== 'zruseno';
    const ceka = v && v.stav === 'ceka';
    const rozd = zije && P.ares === 'ok' ? orgRozdily() : [];
    if (!ceka && !rozd.length && !(zije && P.ares && P.ares !== 'ok')) { el.hidden = true; el.innerHTML = ''; return; }
    el.hidden = false;
    const dopl = P.doplneno.length ? ' Doplněna prázdná pole: <b>' + esc(nazvyPoli(P.doplneno)) + '</b>.' : ' Údaje zakázky se nezměnily.';
    const aresT = P.ares === 'ok' ? ' Firma ověřena v ARES: <b>' + esc(ARES.nazev) + '</b>, IČO ' + esc(ICO) + '.'
      : (P.ares === 'nenalezeno' ? ' <b>IČO ' + esc(ICO) + ' rejstřík ARES nezná</b> — firma je převzatá z dealu, zkontrolujte ji.' : ' <b>ARES neodpověděl</b> — firma je převzatá z dealu, ověřte ji tlačítkem „Najít firmu v ARES".');
    const rozdT = rozd.length ? ' V Pipedrive se liší: <b>' + esc(rozd.map(([, n]) => n).join(', ')) + '</b>.' : '';
    let h = '<span class="k40p-text">' + (ceka ? 'Kalkulace byla <b>' + esc(v.kdy) + '</b> automaticky navázána na deal <b>' + esc(v.deal) + '</b> v Pipedrive podle čísla nabídky <b>' + esc(v.cislo) + '</b>.' + dopl : 'Deal <b>' + esc(v.deal) + '</b>:')
      + aresT + rozdT + (v.nahlaseno ? ' <b>Vazba je nahlášená autorovi a administrátorovi jako chybná.</b>' : '') + '</span>';
    if (ceka) h += '<button type="button" class="k40p-hlavni" data-k40p="potvrd">V pořádku</button>'
      + (smiMenit() ? '<button type="button" class="k40p-rusit" data-k40p="zrus">Zrušit vazbu</button>'
        : '<button type="button" data-k40p="chybna"' + (v.nahlaseno ? ' disabled' : '') + '>Vazba je chybná</button>');
    if (rozd.length && smiMenit()) h += '<button type="button" data-k40p="opravOrg">Opravit firmu v Pipedrive</button>';
    if (S.potvrzeni && rozd.length) h += '<div class="k40p-potvrzeni"><b>Zapsat do organizace v Pipedrive tyto změny podle ARES?</b>'
      + rozd.map(([k, n, a]) => '<div class="k40p-pr"><span>' + esc(n) + '</span><span><s>' + esc(P.org[k] || '— prázdné —') + '</s> → <b>' + esc(ARES[a]) + '</b></span></div>').join('')
      + '<div class="k40p-pt"><button type="button" class="k40p-hlavni" data-k40p="opravOrgAno">Zapsat do Pipedrive</button><button type="button" data-k40p="opravOrgNe">Nezapisovat</button>'
      + '<span>Zapíšou se jen tato pole, nic dalšího. Záznam půjde do protokolu zakázky.</span></div></div>';
    el.innerHTML = h;
  }
  function lista() {
    const v = P.vazba, ceka = !!(v && v.stav === 'ceka'), zije = !!(v && v.stav !== 'zruseno');
    const vyber = (id, mapa, hod) => '<select id="' + id + '">' + Object.keys(mapa).map((r) => '<option value="' + r + '"' + (hod === r ? ' selected' : '') + '>' + esc(typeof mapa[r] === 'string' ? mapa[r] : mapa[r].nazev) + '</option>').join('') + '</select>';
    const dalsi = P.krok === 'vychozi' ? 'webhook' : (ceka ? 'rozhodni' : 'znovu');
    const kr = (akce, text, vyp, d) => '<button type="button" data-k40p="' + akce + '"' + (vyp ? ' disabled' : '') + (d ? ' class="k40p-dalsi"' : '') + '>' + esc(text) + '</button>';
    const popisKroku = { vychozi: 'výchozí stav — kalkulace bez dealu', webhook: 'webhook navázal kalkulaci', potvrd: 'vazba potvrzena', zrus: 'vazba zrušena', chybna: 'vazba nahlášena jako chybná', znovu: 'webhook přišel znovu', oprava: 'organizace v Pipedrive opravena' }[P.krok];
    const jeRozdil = zije && P.ares === 'ok' && orgRozdily().length > 0;
    document.getElementById('k40pLista').innerHTML =
      '<div class="k40p-sk"><label class="k40p-pop" for="k40pScenar">Situace</label>' + vyber('k40pScenar', SCENARE, S.scenar) + '</div>'
      + '<div class="k40p-sk"><label class="k40p-pop" for="k40pAres">ARES</label>' + vyber('k40pAres', ARES_STAVY, S.ares) + '</div>'
      + '<div class="k40p-sk"><label class="k40p-pop" for="k40pRole">Dívá se</label>' + vyber('k40pRole', ROLE, S.role) + '</div>'
      + '<div class="k40p-sk"><span class="k40p-pop">Kroky</span>'
      + kr('reset', '1. Výchozí stav', false, false)
      + kr('webhook', '2. Webhook', !!ZAK.pdDealId || P.krok !== 'vychozi', dalsi === 'webhook' && !S.hraje)
      + kr('potvrd', '3. V pořádku', !ceka, dalsi === 'rozhodni')
      + (smiMenit() ? kr('zrus', '3. Zrušit vazbu', !ceka, false) : kr('chybna', '3. Vazba je chybná', !ceka || !!(v && v.nahlaseno), false))
      + kr('webhook', '4. Webhook znovu', P.krok === 'vychozi', false)
      + kr('opravOrg', 'Opravit firmu v Pipedrive', !jeRozdil || !smiMenit(), jeRozdil && smiMenit() && !ceka)
      + '</div>'
      + (P.krok === 'vychozi' && !S.hraje ? '<span class="k40p-napoveda">◀ Klikněte na „2. Webhook" — do té doby se nic nezmění</span>' : '')
      + '<div class="k40p-sk"><button type="button" class="k40p-hraj" data-k40p="hraj">' + (S.hraje ? '■ Zastavit' : '▶ Přehrát') + '</button>'
      + '<button type="button" data-k40p="panel" aria-pressed="' + S.otevreno + '">Co se mění</button></div>'
      + '<div class="k40p-stav"><b>' + esc(popisKroku) + '</b> → ' + souhrn() + '</div>';
  }
  function panel() {
    const nove = P.protokol.slice(P.pred.protokol);
    const stare = P.protokol.slice(0, P.pred.protokol);
    const legenda = '<div class="k40p-leg">' + Object.keys(ZNACKY).map((z) => '<span class="k40p-zn k40p-zn-' + z + '">' + ZNACKY[z] + '</span>').join('') + '</div>';
    const aresRadek = (n, h) => '<div class="k40p-r"><span>' + esc(n) + '</span><span>' + esc(h) + '</span></div>';
    document.getElementById('k40pPanel').innerHTML =
      '<h3>Co se změnilo posledním krokem (před → po)</h3>' + legenda
      + (P.krok === 'vychozi' ? '<p>Výchozí stav. Stiskněte nahoře „2. Webhook".</p>' : '')
      + '<h3>Zakázka ' + esc(SC().cislo) + '</h3>'
      + POLE.map(([k, n]) => radekPP(n, k, k, zdrojPole(k))).join('')
      + radekPP('Termín předání (krycí list)', 'termin', 'terminPredani', 'z dealu')
      + '<h3>Vazba a stav</h3>'
      + radekPP('Vazba na deal', 'deal') + radekPP('Stav Pipedrive (hlavička)', 'stavPd') + radekPP('Stav vazby', 'vazba') + radekPP('Odmítnuté dealy', 'odmitnute')
      + '<h3>Pipedrive — deal ' + esc(DEAL.id) + ' a jeho organizace</h3>'
      + radekPP('Deal: pole „Odkaz na kalkulaci"', 'odkaz')
      + radekPP('Organizace: název', 'orgname') + radekPP('Organizace: adresa', 'orgaddress') + radekPP('Organizace: DIČ', 'orgdic')
      + aresRadek('Organizace: IČO', ICO) + aresRadek('Deal: kontakt, adresa stavby', DEAL.kontakt + ', ' + DEAL.adresa)
      + '<h3>ARES (napodobený) pro IČO ' + esc(ICO) + '</h3>'
      + (S.ares === 'ok' ? aresRadek('Název', ARES.nazev) + aresRadek('Sídlo', ARES.adresa) + aresRadek('DIČ', ARES.dic)
        : '<p class="k40p-h-nesmazano">' + (S.ares === 'nenalezeno' ? 'Rejstřík toto IČO nezná.' : 'Rejstřík neodpověděl v časovém limitu.') + ' Webhook použije údaje z dealu a upozorní.</p>')
      + '<h3>Protokol zakázky</h3>'
      + (P.protokol.length ? '<ol>' + stare.map((z) => '<li>' + esc(z.kdy) + ' · <b>' + esc(z.kdo) + '</b>: ' + esc(z.co) + '</li>').join('')
        + nove.map((z) => '<li class="k40p-h-pridano">' + esc(z.kdy) + ' · <b>' + esc(z.kdo) + '</b>: ' + esc(z.co) + stitek('pridano') + '</li>').join('') + '</ol>' : '<p>— prázdný —</p>')
      + '<h3>Odpověď serveru</h3><div class="k40p-odp">' + (P.odpoved ? esc('HTTP ' + P.odpoved.stav + '\n' + P.odpoved.text) : '— zatím nic —') + '</div>'
      + '<h3>Pravidla</h3><ol>'
      + '<li>Webhook hned doplní hlavičku a krycí list a zapíše odkaz do dealu.</li>'
      + '<li>Zákazník, sídlo, IČO a DIČ jdou z ARES podle IČO z dealu; kontakt, adresa stavby a termín z dealu.</li>'
      + '<li>Zapisuje se jen prázdné pole, nebo pole, kde je hodnota naposledy zapsaná webhookem. Ručně upravené pole se nepřepíše.</li>'
      + '<li>ARES nezná IČO nebo neodpoví: použijí se údaje z dealu a ukáže se varování.</li>'
      + '<li>„Zrušit vazbu" (autor, administrátor): deal odmítnut, další webhook 409, náš odkaz v dealu smazán. Doplněné údaje zůstávají.</li>'
      + '<li>„Opravit firmu v Pipedrive" (autor, administrátor): zapíše jen lišící se pole organizace, až po potvrzení.</li>'
      + '<li>Jiný obchodník může jen nahlásit „Vazba je chybná".</li></ol>';
  }
  /* Zvýraznění přímo v aplikaci: podbarvené pole + štítek „před → po" pod řádkem pole.
   * Aplikace hlavičku překresluje sama, proto se štítky po každém překreslení vracejí
   * (MutationObserver se při vlastních zásazích odpojuje, jinak by se točil dokola). */
  function zvyrazni() {
    if (OBS) OBS.disconnect();
    try {
      document.querySelectorAll('.k40p-stitek-pole').forEach((e) => e.remove());
      ['pridano', 'nesmazano', 'ponechano', 'zmeneno', 'smazano'].forEach((z) => document.querySelectorAll('.k40p-pole-' + z).forEach((e) => e.classList.remove('k40p-pole-' + z, 'k40p-blik')));
      const po = snimek(), pr = '— prázdné —';
      const stit = (radek, z, text) => {
        if (!radek || !radek.parentNode) return;
        const s = document.createElement('div');
        s.className = 'k40p-stitek-pole k40p-sp-' + z + (S.blik ? ' k40p-blik' : '');
        s.innerHTML = '<span class="k40p-zn k40p-zn-' + z + '">' + ZNACKY[z] + '</span> ' + text;
        radek.parentNode.insertBefore(s, radek.nextSibling);
      };
      POLE.forEach(([k]) => {
        const z = znacka(k, k); if (!z) return;
        const text = z === 'ponechano' ? 'webhook nabízel „' + esc(nabidka()[k]) + '" — ručně vyplněné pole se nepřepsalo'
          : (z === 'nesmazano' ? 'doplnil webhook — po zrušení vazby zůstává'
            : '<s>' + esc(P.pred[k] || pr) + '</s> → <b>' + esc(po[k] || pr) + '</b> <i>' + esc(zdrojPole(k)) + '</i>');
        document.querySelectorAll('input[onchange*="ZAK.' + k + '\'"]').forEach((e) => {
          e.classList.add('k40p-pole-' + z); if (S.blik) e.classList.add('k40p-blik');
          stit(e.closest('.row'), z, text);
        });
      });
      const zp = znacka('stavPd', null) || znacka('deal', null);
      if (zp) document.querySelectorAll('.pd-stav-radek').forEach((e) => {
        e.classList.add('k40p-pole-' + zp); if (S.blik) e.classList.add('k40p-blik');
        stit(e, zp, 'Stav Pipedrive: <s>' + esc(P.pred.stavPd) + '</s> → <b>' + esc(po.stavPd) + '</b> · vazba: <s>' + esc(P.pred.deal || 'žádná') + '</s> → <b>' + esc(po.deal || 'žádná') + '</b>');
      });
    } finally {
      if (OBS && PK) OBS.observe(PK, { childList: true, subtree: true });
    }
  }
  /* Po kroku: záložka Kalkulace OCK a první změněné pole doprostřed obrazovky. */
  function naZmenu() {
    try { if (typeof TAB !== 'undefined' && TAB !== 'kalk' && typeof prepniTab === 'function') prepniTab('kalk'); } catch (e) { /* bez přepnutí */ }
    const viditelny = (e) => e.offsetParent !== null;
    const prvni = Array.from(document.querySelectorAll('.k40p-stitek-pole')).filter(viditelny)[0] || document.getElementById('k40pUpoz');
    if (prvni && viditelny(prvni) && prvni.scrollIntoView) prvni.scrollIntoView({ block: 'center' }); else window.scrollTo(0, 0);
  }
  function vyska() {
    const l = document.getElementById('k40pLista');
    if (l) document.documentElement.style.setProperty('--k40p-h', l.offsetHeight + 'px');
  }
  function kresli() {
    if (typeof render === 'function') render();
    upozorneni(); lista(); panel(); zvyrazni();
    document.body.classList.toggle('k40p-otevreno', S.otevreno);
    document.getElementById('k40pPanel').hidden = !S.otevreno;
    vyska();
  }

  function krok(a) {
    if (a === 'reset') vychozi();
    else if (a === 'opravOrg') { S.potvrzeni = true; kresli(); const u = document.querySelector('.k40p-potvrzeni'); if (u && u.scrollIntoView) u.scrollIntoView({ block: 'center' }); return; }
    else if (a === 'opravOrgNe') { S.potvrzeni = false; kresli(); return; }
    else {
      P.pred = snimek();
      if (a === 'webhook') webhook(); else if (a === 'potvrd') potvrd(); else if (a === 'zrus') zrus(); else if (a === 'chybna') chybna(); else if (a === 'opravOrgAno') opravOrg();
    }
    S.blik = a !== 'reset';
    kresli();
    naZmenu();
    S.blik = false;
  }
  /* „▶ Přehrát": výchozí stav → webhook (ARES) → V pořádku → Opravit firmu v Pipedrive → potvrdit zápis, po 3 s. */
  const PREHRAT = ['reset', 'webhook', 'potvrd', 'opravOrg', 'opravOrgAno'];
  function zastav() { if (S.hraje) { clearTimeout(S.hraje.t); S.hraje = null; } }
  function hraj() {
    if (S.hraje) { zastav(); kresli(); return; }
    if (S.role === 'jiny') S.role = 'autor';
    S.ares = 'ok';
    S.hraje = { i: 0, t: null };
    const dalsi = () => {
      if (!S.hraje) return;
      const a = PREHRAT[S.hraje.i++];
      const konec = S.hraje.i >= PREHRAT.length;
      const h = S.hraje; if (konec) S.hraje = null;
      krok(a);
      if (!konec) h.t = setTimeout(dalsi, 3000);
    };
    dalsi();
  }
  function klik(e) {
    const b = e.target.closest('[data-k40p]'); if (!b || b.disabled) return;
    const a = b.getAttribute('data-k40p');
    if (a === 'hraj') { hraj(); return; }
    zastav();
    if (a === 'panel') { S.otevreno = !S.otevreno; kresli(); }
    else krok(a);
  }
  function zmena(e) {
    const t = e.target; if (!t || !t.id) return;
    const m = { k40pRole: 'role', k40pScenar: 'scenar', k40pAres: 'ares' }[t.id]; if (!m) return;
    zastav(); S[m] = t.value;
    if (m !== 'role') vychozi();
    kresli();
  }

  function start() {
    const l = document.createElement('div'); l.id = 'k40pLista'; l.setAttribute('role', 'toolbar'); l.setAttribute('aria-label', 'Ovládání prototypu');
    const p = document.createElement('aside'); p.id = 'k40pPanel'; p.setAttribute('aria-label', 'Co se mění');
    const u = document.createElement('div'); u.id = 'k40pUpoz'; u.setAttribute('role', 'status'); u.hidden = true;
    const nav = document.querySelector('nav.tabs');
    document.body.insertBefore(u, nav || document.body.firstChild);
    document.body.insertBefore(p, document.body.firstChild);   // na úzké obrazovce stojí panel hned pod lištou
    document.body.insertBefore(l, document.body.firstChild);
    document.body.addEventListener('click', klik);
    document.body.addEventListener('change', zmena);
    window.addEventListener('resize', vyska);
    /* Aplikace překresluje hlavičku sama — zvýraznění se po překreslení vrátí. */
    let t = null;
    PK = document.getElementById('page-kalk');
    if (PK && window.MutationObserver) { OBS = new MutationObserver(() => { clearTimeout(t); t = setTimeout(zvyrazni, 60); }); OBS.observe(PK, { childList: true, subtree: true }); }
    try { if (typeof TAB !== 'undefined' && TAB !== 'kalk' && typeof prepniTab === 'function') prepniTab('kalk'); } catch (e) { /* zůstane otevřená záložka */ }
    vychozi(); kresli();
  }
  /* Kdyby se prototyp nespustil (aplikace se nenačetla), ať je to vidět, ne tiché. */
  function bezpecne() {
    try { start(); } catch (e) {
      const d = document.createElement('div');
      d.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:9999;background:#b3261e;color:#fff;padding:10px 16px;font:14px system-ui,sans-serif';
      d.textContent = 'Prototyp se nespustil: ' + (e && e.message ? e.message : e);
      document.body.appendChild(d);
    }
  }
  if (document.readyState === 'complete') setTimeout(bezpecne, 0); else window.addEventListener('load', () => setTimeout(bezpecne, 0));
})();
