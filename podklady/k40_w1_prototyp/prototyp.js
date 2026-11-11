/* ===== PROTOTYP K40-W1 (jen podklad k rozhodnutí J. V., NENÍ součást aplikace) =====
 * Vkládá se za sestavenou aplikaci (sestav.mjs). Nic neposílá — server, Pipedrive
 * i webhook jsou zde jen napodobené v paměti stránky. Data jsou smyšlená.
 * Do skutečné aplikace sahá jen takto: mění pole otevřené zakázky (ZAK) a volá render().
 * Varianta a) „Vazba" = návrh posudku (jen vazba, údaje až po „V pořádku", zrušení smaže
 * i odkaz v dealu); varianta b) „Jako dnes" = dnešní webhook + zrušení vazby podle promptu v1.
 * Lišta nahoře zůstává při posouvání na místě; panel „Co se mění" ukazuje před → po;
 * změněná pole dostanou podbarvení a štítek před → po přímo v aplikaci; „▶ Přehrát" projde kroky sám. */
(function () {
  'use strict';
  const POLE = [['nazevAkce', 'Název akce'], ['adresa', 'Adresa stavby'], ['objednatel', 'Zákazník'], ['ico', 'IČO zákazníka'], ['kontakt', 'Kontaktní osoba']];
  const KALK = { cislo: '2026 - OPR - CN - 904', nazevAkce: 'Bytový dům Lipová — výtah', adresa: '', objednatel: 'Stavby Příklad s.r.o. (smyšlené)', ico: '', kontakt: '' };
  const DEAL = { id: '4812', nazev: 'Rezidence Javor — výtah', cislo: '2026 - OPR - CN - 904', spravneCislo: '2026 - OPR - CN - 940',
    pole: { nazevAkce: 'Rezidence Javor — výtah', adresa: 'Javorová 1, Vzorov', objednatel: 'Javor Development a.s. (smyšlené)', ico: '00000000', kontakt: 'Jan Vzorový' },
    terminPredani: '2027-03-31' };
  const ODKAZ = 'https://kalkulator.priklad/?zakazka=2026-OPR-CN-904';
  const ROLE = { autor: 'autor zakázky (obchodník)', jiny: 'jiný obchodník', admin: 'administrátor' };
  const ZNACKY = { pridano: 'přidáno', zmeneno: 'změněno', smazano: 'smazáno', nesmazano: 'nesmazáno', ponechano: 'ponecháno' };
  const VAZBA_TEXT = { '': 'žádná', ceka: 'čeká na potvrzení', dnes: 'navázáno bez potvrzení', potvrzeno: 'potvrzeno', zruseno: 'zrušeno' };
  const S = { varianta: 'a', role: 'autor', otevreno: true, hraje: null, blik: false };
  let OBS = null, PK = null;
  let P;   // stav napodobeného serveru

  const esc = (t) => String(t == null ? '' : t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const cas = () => new Date().toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const dnes = () => new Date().toLocaleDateString('cs-CZ');
  const zapis = (kdo, co) => P.protokol.push({ kdy: cas(), kdo, co });
  const kryciNezamcene = () => (ZAK.varianty || []).filter((v) => v && v.data && !(v.zamek && v.zamek.zamceno));
  const terminTed = () => { const v = kryciNezamcene()[0]; return (v && v.data.kryci && v.data.kryci.hodnoty && v.data.kryci.hodnoty.terminPredani) || ''; };

  /* Snímek všeho, co se může změnit — z něj se kreslí „před → po". */
  function snimek() {
    const s = { termin: terminTed(), deal: ZAK.pdDealId ? 'deal ' + ZAK.pdDealId : '', stavPd: ZAK.pdDealId ? 'Otevřené' : 'nepropojeno',
      vazba: VAZBA_TEXT[(P.vazba && P.vazba.stav) || ''] + (P.vazba && P.vazba.nahlaseno ? ' · nahlášeno jako chybná' : ''),
      odmitnute: P.odmitnute.join(', '), odkaz: P.odkazVDealu, protokol: P.protokol.length };
    POLE.forEach(([k]) => { s[k] = String(ZAK[k] || ''); });
    return s;
  }

  function vychozi() {
    P = { vazba: null, odmitnute: [], protokol: [], doplneno: [], ponechano: [], odkazVDealu: '', odkazZWebhooku: false, odpoved: null, krok: 'vychozi', pred: null };
    Object.keys(KALK).forEach((k) => { ZAK[k] = KALK[k]; });
    delete ZAK.pdDealId; delete ZAK.pdStav; delete ZAK.pdZadani;
    kryciNezamcene().forEach((v) => { if (v.data.kryci && v.data.kryci.hodnoty) delete v.data.kryci.hodnoty.terminPredani; });
    P.pred = snimek();
  }

  /* Přenos údajů z dealu: jen PRÁZDNÁ pole (tak to dělá dnešní pdWebhookPouzij u kalkulace bez otisku). */
  function prenes() {
    const zmeneno = [], ponechano = [];
    POLE.forEach(([k]) => {
      const a = String(ZAK[k] || '').trim(), n = DEAL.pole[k];
      if (a === n) return;
      if (!a) { ZAK[k] = n; zmeneno.push(k); } else ponechano.push(k);
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
    const a = S.varianta === 'a';
    P.krok = ZAK.pdDealId || P.odmitnute.length ? 'znovu' : 'webhook';
    P.ponechano = [];
    if (P.odmitnute.includes(DEAL.id)) {
      if (a) {
        P.odpoved = { stav: 409, text: 'Deal ' + DEAL.id + ' byl u kalkulace ' + KALK.cislo + ' odmítnut (vazba zrušena). Nic se nezměnilo — opravte číslo nabídky v Pipedrive.' };
        zapis('pipedrive-webhook', 'pokus o nové navázání dealu ' + DEAL.id + ' odmítnut (409)');
        return;
      }
      P.odpoved = { stav: 409, text: 'Deal ' + DEAL.id + ' byl u kalkulace ' + KALK.cislo + ' odmítnut (vazba zrušena). Nic se nezměnilo.' };
      zapis('pipedrive-webhook', 'pokus o nové navázání dealu ' + DEAL.id + ' odmítnut (409)');
      return;
    }
    if (!ZAK.pdDealId) {
      ZAK.pdDealId = DEAL.id;
      ZAK.pdStav = { status: 'open', nacteno: new Date().toISOString() };
      P.odkazVDealu = ODKAZ; P.odkazZWebhooku = true;
      if (a) {
        P.vazba = { stav: 'ceka', kdy: dnes(), deal: DEAL.id, cislo: KALK.cislo };
        zapis('pipedrive-webhook', 'navázáno na deal ' + DEAL.id + ' podle čísla nabídky — čeká na potvrzení, údaje z dealu se nepřenesly');
        P.odpoved = { stav: 200, text: 'akce: navazano\nzmeneno: []\nvazba: čeká na potvrzení\nodkazDoDealu: zapsano' };
      } else {
        const r = prenes();
        P.vazba = { stav: 'dnes', kdy: dnes(), deal: DEAL.id, cislo: KALK.cislo };
        P.odpoved = { stav: 200, text: 'akce: aktualizovano\nzmeneno: [' + r.zmeneno.join(', ') + ']\nponechano: [' + r.ponechano.join(', ') + ']\nodkazDoDealu: ' + 'zapsano' };
      }
      return;
    }
    if (a && P.vazba && P.vazba.stav === 'potvrzeno' && !P.vazba.preneseno) {
      const r = prenes(); P.vazba.preneseno = true;
      zapis('pipedrive-webhook', 'po potvrzení vazby doplněna prázdná pole z dealu: ' + (nazvyPoli(r.zmeneno) || 'nic'));
      P.odpoved = { stav: 200, text: 'akce: aktualizovano\nzmeneno: [' + r.zmeneno.join(', ') + ']\nponechano: [' + r.ponechano.join(', ') + ']\nodkazDoDealu: beze-zmeny' };
      return;
    }
    P.odpoved = { stav: 200, text: 'akce: bezeZmeny' + (a && P.vazba && P.vazba.stav === 'ceka' ? '\nvazba: čeká na potvrzení — údaje se nepřenášejí' : '') + '\nodkazDoDealu: beze-zmeny' };
  }
  function potvrd() {
    P.krok = 'potvrd'; P.ponechano = [];
    P.vazba.stav = 'potvrzeno'; delete P.vazba.nahlaseno;
    zapis(ROLE[S.role], 'vazbu na deal ' + DEAL.id + ' potvrdil („V pořádku")');
  }
  function chybna() {
    P.krok = 'chybna'; P.ponechano = [];
    P.vazba.nahlaseno = true;
    zapis(ROLE[S.role], 'vazbu na deal ' + DEAL.id + ' označil jako chybnou — upozornění pro administrátora');
  }
  function zrus() {
    P.krok = 'zrus'; P.ponechano = [];
    delete ZAK.pdDealId; delete ZAK.pdStav;
    P.odmitnute.push(DEAL.id);
    P.vazba = { stav: 'zruseno', deal: DEAL.id };
    if (S.varianta === 'a') {
      P.odkazVDealu = '';
      zapis(ROLE[S.role], 'vazbu na deal ' + DEAL.id + ' zrušil; odkaz v dealu vymazán; deal je u této kalkulace odmítnutý');
    } else {
      zapis(ROLE[S.role], 'vazbu na deal ' + DEAL.id + ' zrušil; doplněné údaje a odkaz v dealu zůstaly');
    }
  }

  /* ----- porovnání před → po ----- */
  function nazvyPoli(klice) {
    return klice.map((k) => k === 'terminPredani' ? 'termín předání (krycí list)' : (POLE.find((p) => p[0] === k) || [k, k])[1]).join(', ');
  }
  /* Značka změny údaje `k` (klíč snímku); `kPole` = klíč pole pro seznamy doplněno / ponecháno. */
  function znacka(k, kPole) {
    const pred = P.pred[k], po = snimek()[k];
    if (P.krok === 'zrus' && kPole && P.doplneno.includes(kPole) && po) return 'nesmazano';
    if (P.krok === 'zrus' && k === 'odkaz' && po) return 'nesmazano';
    if (pred !== po) return !pred || pred === 'žádná' || pred === 'nepropojeno' ? 'pridano' : (!po || po === 'žádná' || po === 'nepropojeno' ? 'smazano' : 'zmeneno');
    if (kPole && P.ponechano.includes(kPole)) return 'ponechano';
    return '';
  }
  const UDAJE = POLE.map(([k, n]) => [k, n, k]).concat([['termin', 'Termín předání (krycí list)', 'terminPredani'], ['deal', 'Vazba na deal', null],
    ['stavPd', 'Stav Pipedrive', null], ['vazba', 'Stav vazby', null], ['odmitnute', 'Odmítnuté dealy', null], ['odkaz', 'Odkaz v dealu', null]]);
  function souhrn() {
    if (P.krok === 'vychozi') return 'Výchozí stav — nic se nezměnilo. Klikněte na „2. Webhook" nebo „▶ Přehrát".';
    const po = snimek(), sk = { pridano: [], zmeneno: [], smazano: [], nesmazano: [] };
    UDAJE.forEach(([k, n, kp]) => { const z = znacka(k, kp); if (sk[z]) sk[z].push(n); });
    const cast = (z) => sk[z].length ? '<span class="k40p-zn k40p-zn-' + z + '">' + ZNACKY[z] + '</span> ' + esc(sk[z].join(', ')) : '';
    const t = ['pridano', 'zmeneno', 'smazano', 'nesmazano'].map(cast).filter(Boolean).join(' · ');
    const poleZmena = POLE.some(([k]) => P.pred[k] !== po[k]) || P.pred.termin !== po.termin;
    return (t || 'Tímto krokem se nezměnilo nic.') + (poleZmena || sk.nesmazano.length ? '' : ' · <b>údaje zakázky (hlavička) beze změny</b>');
  }
  const stitek = (z) => z ? '<span class="k40p-zn k40p-zn-' + z + '">' + ZNACKY[z] + '</span>' : '';
  function radekPP(nazev, k, kPole, pozn) {
    const pred = P.pred[k], po = snimek()[k], z = znacka(k, kPole);
    const pr = '— prázdné —';
    let h;
    if (pred !== po) h = '<span class="k40p-pred">' + esc(pred || pr) + '</span><span class="k40p-sip">→</span><span class="k40p-h-' + z + '">' + esc(po || pr) + '</span>';
    else h = '<span' + (z ? ' class="k40p-h-' + z + '"' : '') + '>' + esc(po || pr) + '</span>';
    const p = z === 'ponechano' ? ' <span class="k40p-h-ponechano">deal má „' + esc(DEAL.pole[kPole]) + '", kalkulace si nechala svoje</span>'
      : (z === 'nesmazano' ? ' <span class="k40p-h-nesmazano">' + esc(pozn || 'doplnil webhook, po zrušení vazby zůstalo') + '</span>' : '');
    return '<div class="k40p-r"><span>' + esc(nazev) + '</span><span>' + h + stitek(z) + p + '</span></div>';
  }

  const KROKY = [
    ['webhook', '2. Webhook naváže cizí kalkulaci', 'Jen vazba na deal, upozornění a záznam v protokolu. Údaje zakázky se nezmění. Odkaz se do dealu zapíše.', 'Vazba na deal bez záznamu v protokolu. Hned doplní prázdná pole (adresa, IČO, kontakt, termín předání). Odkaz se do dealu zapíše.'],
    ['potvrd', '3. „V pořádku"', 'Vazba potvrzena, záznam v protokolu. Údaje z dealu se přenesou při dalším doručení webhooku.', 'Jen potvrzení a záznam. Údaje už jsou doplněné.'],
    ['zrus', '3. „Zrušit vazbu"', 'Vazba pryč, údaje zakázky netknuté, odkaz v dealu vymazán, deal u kalkulace odmítnut.', 'Vazba pryč, ale doplněné údaje cizího zákazníka zůstanou a odkaz v dealu dál vede na cizí kalkulaci.'],
    ['chybna', '3. „Vazba je chybná" (jiný obchodník)', 'Záznam v protokolu a upozornění administrátorovi. Vazba dál čeká.', 'Stejně — ale údaje z dealu už v zakázce jsou.'],
    ['znovu', '4. Webhook přijde znovu', 'Čeká-li vazba: nic. Po potvrzení: doplní prázdná pole. Po zrušení: 409, nenaváže.', 'Po zrušení: 409, nenaváže — doplněné údaje a odkaz v dealu ale zůstaly. Jinak beze změny.'],
  ];

  /* ----- kreslení ----- */
  function upozorneni() {
    const el = document.getElementById('k40pUpoz');
    const v = P.vazba;
    const ceka = v && (v.stav === 'ceka' || v.stav === 'dnes');
    if (!ceka) { el.hidden = true; el.innerHTML = ''; return; }
    el.hidden = false;
    const smiRusit = S.role === 'autor' || S.role === 'admin';
    const dopl = P.doplneno.length ? ' Z dealu se přitom doplnila prázdná pole: <b>' + esc(nazvyPoli(P.doplneno)) + '</b>.' : ' Údaje zakázky se nezměnily.';
    el.innerHTML = '<span class="k40p-text">Kalkulace byla <b>' + esc(v.kdy) + '</b> automaticky navázána na deal <b>' + esc(v.deal)
      + '</b> v Pipedrive podle čísla nabídky <b>' + esc(v.cislo) + '</b>.' + dopl
      + (v.nahlaseno ? ' <b>Vazba je nahlášená administrátorovi jako chybná.</b>' : '') + '</span>'
      + '<button type="button" class="k40p-hlavni" data-k40p="potvrd">V pořádku</button>'
      + (smiRusit ? '<button type="button" class="k40p-rusit" data-k40p="zrus">Zrušit vazbu</button>'
        : '<button type="button" data-k40p="chybna"' + (v.nahlaseno ? ' disabled' : '') + '>Vazba je chybná</button>');
  }
  function lista() {
    const v = P.vazba, ceka = !!(v && (v.stav === 'ceka' || v.stav === 'dnes'));
    const smiRusit = S.role === 'autor' || S.role === 'admin';
    const tl = (skup, hod, text) => '<button type="button" data-k40p="' + skup + ':' + hod + '" aria-pressed="' + (S[skup] === hod) + '">' + esc(text) + '</button>';
    const dalsi = P.krok === 'vychozi' ? 'webhook' : (ceka ? 'rozhodni' : 'znovu');
    const kr = (akce, text, vyp, d) => '<button type="button" data-k40p="' + akce + '"' + (vyp ? ' disabled' : '') + (d ? ' class="k40p-dalsi"' : '') + '>' + esc(text) + '</button>';
    const popisKroku = { vychozi: 'výchozí stav — kalkulace bez dealu', webhook: 'webhook navázal kalkulaci', potvrd: 'vazba potvrzena', zrus: 'vazba zrušena', chybna: 'vazba nahlášena jako chybná', znovu: 'webhook přišel znovu' }[P.krok];
    document.getElementById('k40pLista').innerHTML =
      '<div class="k40p-sk k40p-var"><span class="k40p-pop">Prototyp</span>' + tl('varianta', 'a', 'Vazba (a)') + tl('varianta', 'b', 'Jako dnes (b)') + '</div>'
      + '<div class="k40p-sk"><label class="k40p-pop" for="k40pRole">Dívá se</label><select id="k40pRole">'
      + Object.keys(ROLE).map((r) => '<option value="' + r + '"' + (S.role === r ? ' selected' : '') + '>' + esc(ROLE[r]) + '</option>').join('') + '</select></div>'
      + '<div class="k40p-sk"><span class="k40p-pop">Kroky</span>'
      + kr('reset', '1. Výchozí stav', false, false)
      + kr('webhook', '2. Webhook', !!ZAK.pdDealId || P.krok !== 'vychozi', dalsi === 'webhook' && !S.hraje)
      + kr('potvrd', '3. V pořádku', !ceka, dalsi === 'rozhodni')
      + (smiRusit ? kr('zrus', '3. Zrušit vazbu', !ceka, dalsi === 'rozhodni') : kr('chybna', '3. Vazba je chybná', !ceka || !!(v && v.nahlaseno), dalsi === 'rozhodni'))
      + kr('webhook', '4. Webhook znovu', P.krok === 'vychozi', dalsi === 'znovu')
      + '</div>'
      + (P.krok === 'vychozi' && !S.hraje ? '<span class="k40p-napoveda">◀ Klikněte na „2. Webhook" — do té doby se nic nezmění</span>' : '')
      + '<div class="k40p-sk"><button type="button" class="k40p-hraj" data-k40p="hraj">' + (S.hraje ? '■ Zastavit' : '▶ Přehrát') + '</button>'
      + '<button type="button" data-k40p="panel" aria-pressed="' + S.otevreno + '">Co se mění</button></div>'
      + '<div class="k40p-stav"><b>' + esc(S.varianta === 'a' ? 'Vazba (a)' : 'Jako dnes (b)') + '</b> · ' + esc(popisKroku) + ' → ' + souhrn() + '</div>';
  }
  function panel() {
    const a = S.varianta === 'a';
    const nove = P.protokol.slice(P.pred.protokol);
    const stare = P.protokol.slice(0, P.pred.protokol);
    const bezZaznamu = !a && P.krok === 'webhook';
    const legenda = '<div class="k40p-leg">' + Object.keys(ZNACKY).map((z) => '<span class="k40p-zn k40p-zn-' + z + '">' + ZNACKY[z] + '</span>').join('') + '</div>';
    document.getElementById('k40pPanel').innerHTML =
      '<h3>Co se změnilo posledním krokem (před → po)</h3>' + legenda
      + (P.krok === 'vychozi' ? '<p>Výchozí stav. Stiskněte nahoře „2. Webhook".</p>' : '')
      + '<h3>Zakázka ' + esc(KALK.cislo) + '</h3>'
      + POLE.map(([k, n]) => radekPP(n, k, k)).join('')
      + radekPP('Termín předání (krycí list)', 'termin', 'terminPredani')
      + '<h3>Vazba a stav</h3>'
      + radekPP('Vazba na deal', 'deal') + radekPP('Stav Pipedrive (hlavička)', 'stavPd') + radekPP('Stav vazby', 'vazba') + radekPP('Odmítnuté dealy', 'odmitnute')
      + '<h3>Deal ' + esc(DEAL.id) + ' v Pipedrive — co se do něj zapíše</h3>'
      + radekPP('Pole „Odkaz na kalkulaci"', 'odkaz', null, 'po zrušení vazby zůstal, vede na cizí kalkulaci')
      + '<div class="k40p-r"><span>Číslo nabídky v dealu</span><span>' + esc(DEAL.cislo) + ' (překlep, správně ' + esc(DEAL.spravneCislo) + ')</span></div>'
      + '<div class="k40p-r"><span>Organizace, kontakt</span><span>' + esc(DEAL.pole.objednatel + ', IČO ' + DEAL.pole.ico + ', ' + DEAL.pole.kontakt + ', ' + DEAL.pole.adresa) + '</span></div>'
      + '<h3>Protokol zakázky</h3>'
      + (P.protokol.length || bezZaznamu ? '<ol>' + stare.map((z) => '<li>' + esc(z.kdy) + ' · <b>' + esc(z.kdo) + '</b>: ' + esc(z.co) + '</li>').join('')
        + nove.map((z) => '<li class="k40p-h-pridano">' + esc(z.kdy) + ' · <b>' + esc(z.kdo) + '</b>: ' + esc(z.co) + stitek('pridano') + '</li>').join('') + '</ol>' : '<p>— prázdný —</p>')
      + (bezZaznamu ? '<p class="k40p-h-nesmazano">Dnes se o navázání webhookem do protokolu nic nezapíše.</p>' : '')
      + '<h3>Odpověď webhooku</h3><div class="k40p-odp">' + (P.odpoved ? esc('HTTP ' + P.odpoved.stav + '\n' + P.odpoved.text) : '— zatím nepřišel —') + '</div>'
      + '<h3>Rozdíl variant</h3>'
      + '<div class="k40p-rv k40p-hl"><span>Krok</span><span>Vazba (a)</span><span>Jako dnes (b)</span></div>'
      + KROKY.map(([k, n, ta, tb]) => '<div class="k40p-rv' + (P.krok === k ? ' k40p-ted' : '') + '"><span>' + esc(n) + '</span><span' + (P.krok === k && a ? ' class="k40p-sl"' : '') + '>' + esc(ta)
        + '</span><span' + (P.krok === k && !a ? ' class="k40p-sl"' : '') + '>' + esc(tb) + '</span></div>').join('');
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
        const text = z === 'ponechano' ? 'deal má „' + esc(DEAL.pole[k]) + '" — kalkulace si nechala svoje'
          : (z === 'nesmazano' ? 'doplnil webhook: „' + esc(po[k]) + '" — po zrušení vazby zůstalo'
            : '<s>' + esc(P.pred[k] || pr) + '</s> → <b>' + esc(po[k] || pr) + '</b>');
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
    else {
      P.pred = snimek();
      if (a === 'webhook') webhook(); else if (a === 'potvrd') potvrd(); else if (a === 'zrus') zrus(); else if (a === 'chybna') chybna();
    }
    S.blik = a !== 'reset';
    kresli();
    naZmenu();
    S.blik = false;
  }
  /* „▶ Přehrát": 1. výchozí stav → 2. webhook → 3. zrušit vazbu → 4. webhook znovu, po 3 s. */
  const PREHRAT = ['reset', 'webhook', 'zrus', 'webhook'];
  function zastav() { if (S.hraje) { clearTimeout(S.hraje.t); S.hraje = null; } }
  function hraj() {
    if (S.hraje) { zastav(); kresli(); return; }
    if (S.role === 'jiny') S.role = 'autor';
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
    else if (a.indexOf(':') > 0) { const [k, h] = a.split(':'); S[k] = h; if (k === 'varianta') vychozi(); kresli(); if (k === 'varianta') naZmenu(); }
    else krok(a);
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
    document.body.addEventListener('change', (e) => { if (e.target && e.target.id === 'k40pRole') { zastav(); S.role = e.target.value; kresli(); } });
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
