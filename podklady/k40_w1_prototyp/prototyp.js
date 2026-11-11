/* ===== PROTOTYP K40-W1 (jen podklad k rozhodnutí J. V., NENÍ součást aplikace) =====
 * Vkládá se za sestavenou aplikaci (sestav.mjs). Nic neposílá — server, Pipedrive
 * i webhook jsou zde jen napodobené v paměti stránky. Data jsou smyšlená.
 * Do skutečné aplikace sahá jen takto: mění pole otevřené zakázky (ZAK) a volá render().
 * Varianta a) = návrh posudku (jen vazba, údaje až po „V pořádku", zrušení smaže i odkaz
 * v dealu); varianta b) = dnešní chování webhooku + zrušení vazby podle promptu v1. */
(function () {
  'use strict';
  const POLE = [['nazevAkce', 'Název akce'], ['adresa', 'Adresa stavby'], ['objednatel', 'Zákazník'], ['ico', 'IČO zákazníka'], ['kontakt', 'Kontaktní osoba']];
  const KALK = { cislo: '2026 - OPR - CN - 904', nazevAkce: 'Bytový dům Lipová — výtah', adresa: '', objednatel: 'Stavby Příklad s.r.o. (smyšlené)', ico: '', kontakt: '' };
  const DEAL = { id: '4812', nazev: 'Rezidence Javor — výtah', cislo: '2026 - OPR - CN - 904', spravneCislo: '2026 - OPR - CN - 940',
    pole: { nazevAkce: 'Rezidence Javor — výtah', adresa: 'Javorová 1, Vzorov', objednatel: 'Javor Development a.s. (smyšlené)', ico: '00000000', kontakt: 'Jan Vzorový' },
    terminPredani: '2027-03-31' };
  const ODKAZ = 'https://kalkulator.priklad/?zakazka=2026-OPR-CN-904';
  const ROLE = { autor: 'autor zakázky (obchodník)', jiny: 'jiný obchodník', admin: 'administrátor' };
  const S = { varianta: 'a', role: 'autor', otevreno: true };
  let P;   // stav napodobeného serveru

  const esc = (t) => String(t == null ? '' : t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const cas = () => new Date().toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const dnes = () => new Date().toLocaleDateString('cs-CZ');
  const zapis = (kdo, co) => P.protokol.push({ kdy: cas(), kdo, co });
  const kryciNezamcene = () => (ZAK.varianty || []).filter((v) => v && v.data && !(v.zamek && v.zamek.zamceno));

  function vychozi() {
    P = { vazba: null, odmitnute: [], protokol: [], doplneno: [], odkazVDealu: '', odpoved: null, termin: false };
    Object.keys(KALK).forEach((k) => { ZAK[k] = KALK[k]; });
    delete ZAK.pdDealId; delete ZAK.pdStav; delete ZAK.pdZadani;
    kryciNezamcene().forEach((v) => { if (v.data.kryci && v.data.kryci.hodnoty) delete v.data.kryci.hodnoty.terminPredani; });
    zapis('prototyp', 'výchozí stav: kalkulace ' + KALK.cislo + ' bez vazby na deal');
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
    P.termin = P.termin || termin;
    return { zmeneno, ponechano };
  }

  function webhook() {
    const a = S.varianta === 'a';
    if (P.odmitnute.includes(DEAL.id)) {
      P.odpoved = { stav: 409, text: 'Deal ' + DEAL.id + ' byl u kalkulace ' + KALK.cislo + ' odmítnut (vazba zrušena). Nic se nezměnilo — opravte číslo nabídky v Pipedrive.' };
      zapis('pipedrive-webhook', 'pokus o nové navázání dealu ' + DEAL.id + ' odmítnut (409)');
      return;
    }
    if (!ZAK.pdDealId) {
      ZAK.pdDealId = DEAL.id;
      ZAK.pdStav = { status: 'open', nacteno: new Date().toISOString() };
      P.odkazVDealu = ODKAZ;
      if (a) {
        P.vazba = { stav: 'ceka', kdy: dnes(), deal: DEAL.id, cislo: KALK.cislo };
        zapis('pipedrive-webhook', 'navázáno na deal ' + DEAL.id + ' podle čísla nabídky — čeká na potvrzení, údaje z dealu se nepřenesly');
        P.odpoved = { stav: 200, text: 'akce: navazano\nzmeneno: []\nvazba: čeká na potvrzení\nodkazDoDealu: zapsano' };
      } else {
        const r = prenes();
        P.vazba = { stav: 'dnes', kdy: dnes(), deal: DEAL.id, cislo: KALK.cislo };
        P.odpoved = { stav: 200, text: 'akce: aktualizovano\nzmeneno: [' + r.zmeneno.join(', ') + ']\nponechano: [' + r.ponechano.join(', ') + ']\nodkazDoDealu: zapsano' };
      }
      return;
    }
    if (a && P.vazba && P.vazba.stav === 'potvrzeno' && !P.vazba.preneseno) {
      const r = prenes(); P.vazba.preneseno = true;
      zapis('pipedrive-webhook', 'po potvrzení vazby doplněna prázdná pole z dealu: ' + (r.zmeneno.join(', ') || 'nic'));
      P.odpoved = { stav: 200, text: 'akce: aktualizovano\nzmeneno: [' + r.zmeneno.join(', ') + ']\nponechano: [' + r.ponechano.join(', ') + ']\nodkazDoDealu: beze-zmeny' };
      return;
    }
    P.odpoved = { stav: 200, text: 'akce: bezeZmeny' + (a && P.vazba && P.vazba.stav === 'ceka' ? '\nvazba: čeká na potvrzení — údaje se nepřenášejí' : '') + '\nodkazDoDealu: beze-zmeny' };
  }

  function potvrd() {
    P.vazba.stav = 'potvrzeno';
    zapis(ROLE[S.role], 'vazbu na deal ' + DEAL.id + ' potvrdil („V pořádku")');
  }
  function chybna() {
    P.vazba.nahlaseno = true;
    zapis(ROLE[S.role], 'vazbu na deal ' + DEAL.id + ' označil jako chybnou — upozornění pro administrátora');
  }
  function zrus() {
    delete ZAK.pdDealId; delete ZAK.pdStav;
    P.odmitnute.push(DEAL.id);
    if (S.varianta === 'a') {
      P.odkazVDealu = '';
      P.vazba = { stav: 'zruseno', deal: DEAL.id };
      zapis(ROLE[S.role], 'vazbu na deal ' + DEAL.id + ' zrušil; odkaz v dealu vymazán; deal je u této kalkulace odmítnutý');
    } else {
      P.vazba = { stav: 'zruseno', deal: DEAL.id };
      zapis(ROLE[S.role], 'vazbu na deal ' + DEAL.id + ' zrušil; doplněné údaje a odkaz v dealu zůstaly');
    }
  }

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
  function nazvyPoli(klice) {
    return klice.map((k) => k === 'terminPredani' ? 'termín předání (krycí list)' : (POLE.find((p) => p[0] === k) || [k, k])[1]).join(', ');
  }
  function radek(a, b, trida) { return '<div class="k40p-r"><span>' + esc(a) + '</span><span' + (trida ? ' class="' + trida + '"' : '') + '>' + b + '</span></div>'; }
  function panel() {
    const a = S.varianta === 'a';
    const tl = (skup, hod, text) => '<button type="button" data-k40p="' + skup + ':' + hod + '" aria-pressed="' + (S[skup] === hod) + '">' + esc(text) + '</button>';
    const v = P.vazba;
    const vazbaText = !v ? 'žádná' : ({ ceka: 'čeká na potvrzení', dnes: 'navázáno (dnešní chování, bez záznamu)', potvrzeno: 'potvrzeno', zruseno: 'zrušeno' }[v.stav]);
    const kalk = POLE.map(([k, n]) => {
      const dopl = P.doplneno.includes(k);
      return radek(n, esc(ZAK[k] || '— prázdné —') + (dopl ? ' ← doplněno z dealu' + (v && v.stav === 'zruseno' ? ', po zrušení zůstalo' : '') : ''), dopl ? (v && v.stav === 'zruseno' ? 'k40p-zle' : 'k40p-nove') : '');
    }).join('') + radek('Termín předání (krycí list)', P.termin ? esc(DEAL.terminPredani) + ' ← doplněno z dealu' + (v && v.stav === 'zruseno' ? ', po zrušení zůstalo' : '') : '— prázdné —', P.termin ? (v && v.stav === 'zruseno' ? 'k40p-zle' : 'k40p-nove') : '');
    const odkazTrida = P.odkazVDealu ? (v && v.stav === 'zruseno' ? 'k40p-zle' : 'k40p-nove') : '';
    document.getElementById('k40pPanel').innerHTML =
      '<h2>Prototyp: vazba z webhooku (K40-W1)</h2>'
      + '<p>Smyšlená data, nic se nikam neposílá. Vlevo je skutečná sestavená aplikace v11.11.1; server a Pipedrive jsou jen napodobené.</p>'
      + '<h3>Varianta</h3><div class="k40p-seg">' + tl('varianta', 'a', 'a) jen vazba, údaje až po potvrzení') + tl('varianta', 'b', 'b) jako dnes') + '</div>'
      + '<p>' + (a ? 'Webhook jen naváže a upozorní. Údaje z dealu přenese až po „V pořádku". Zrušení vazby vymaže i odkaz v dealu.'
        : 'Webhook hned doplní prázdná pole hlavičky a zapíše odkaz do dealu. Zrušení vazby je vrátit neumí.') + '</p>'
      + '<h3>Kdo se dívá</h3><div class="k40p-seg">' + tl('role', 'autor', 'autor zakázky') + tl('role', 'jiny', 'jiný obchodník') + tl('role', 'admin', 'administrátor') + '</div>'
      + '<h3>Kroky</h3>'
      + '<button type="button" class="k40p-krok" data-k40p="reset">1. Výchozí stav (kalkulace bez dealu)</button>'
      + '<button type="button" class="k40p-krok" data-k40p="webhook">2. Pipedrive pošle webhook (deal s překlepem v čísle nabídky)</button>'
      + '<p>3. V aplikaci vlevo se nahoře ukáže žluté upozornění — rozhodněte tam.</p>'
      + '<button type="button" class="k40p-krok" data-k40p="webhook">4. Webhook přijde znovu</button>'
      + '<h3>Odpověď webhooku</h3><div class="k40p-odp">' + (P.odpoved ? esc('HTTP ' + P.odpoved.stav + '\n' + P.odpoved.text) : '— zatím nepřišel —') + '</div>'
      + '<h3>Deal v Pipedrive (smyšlený)</h3><div class="k40p-tab">'
      + radek('Deal', esc(DEAL.id + ' · ' + DEAL.nazev))
      + radek('Číslo nabídky v dealu', esc(DEAL.cislo) + ' (překlep, správně ' + esc(DEAL.spravneCislo) + ')', 'k40p-zle')
      + radek('Organizace', esc(DEAL.pole.objednatel)) + radek('IČO, kontakt', esc(DEAL.pole.ico + ', ' + DEAL.pole.kontakt))
      + radek('Adresa', esc(DEAL.pole.adresa))
      + radek('Co se zapíše do dealu: pole „Odkaz na kalkulaci"', P.odkazVDealu ? esc(P.odkazVDealu) + (v && v.stav === 'zruseno' ? ' ← po zrušení zůstal, vede na cizí kalkulaci' : ' ← zapsáno webhookem') : '— prázdné —', odkazTrida)
      + '</div>'
      + '<h3>Kalkulace ' + esc(KALK.cislo) + '</h3><div class="k40p-tab">'
      + radek('Vazba na deal', esc(ZAK.pdDealId ? 'deal ' + ZAK.pdDealId : 'žádná'), ZAK.pdDealId ? 'k40p-nove' : '')
      + radek('Stav vazby', esc(vazbaText)) + radek('Odmítnuté dealy', esc(P.odmitnute.join(', ') || '—'))
      + kalk + '</div>'
      + '<h3>Protokol zakázky</h3><ol>' + P.protokol.map((z) => '<li>' + esc(z.kdy) + ' · <b>' + esc(z.kdo) + '</b>: ' + esc(z.co) + '</li>').join('') + '</ol>'
      + (S.varianta === 'b' && v && v.stav === 'dnes' ? '<p class="k40p-zle">Dnes se o navázání do protokolu nic nezapíše.</p>' : '');
  }
  function zvyrazni() {
    document.querySelectorAll('.k40p-doplneno').forEach((e) => e.classList.remove('k40p-doplneno'));
    P.doplneno.forEach((k) => document.querySelectorAll('input[onchange*="ZAK.' + k + '\'"]').forEach((e) => e.classList.add('k40p-doplneno')));
  }
  function kresli() {
    if (typeof render === 'function') render();
    upozorneni(); panel(); zvyrazni();
    document.body.classList.toggle('k40p-otevreno', S.otevreno);
    document.getElementById('k40pPanel').hidden = !S.otevreno;
    document.getElementById('k40pZalozka').textContent = S.otevreno ? 'Skrýt panel prototypu' : 'Panel prototypu';
  }

  function klik(e) {
    const b = e.target.closest('[data-k40p]'); if (!b) return;
    const a = b.getAttribute('data-k40p');
    if (a === 'reset') vychozi();
    else if (a === 'webhook') webhook();
    else if (a === 'potvrd') potvrd();
    else if (a === 'zrus') zrus();
    else if (a === 'chybna') chybna();
    else if (a.indexOf(':') > 0) { const [k, h] = a.split(':'); S[k] = h; if (k === 'varianta') vychozi(); }
    kresli();
  }

  function start() {
    const p = document.createElement('aside'); p.id = 'k40pPanel'; p.setAttribute('aria-label', 'Panel prototypu');
    const z = document.createElement('button'); z.id = 'k40pZalozka'; z.type = 'button';
    const u = document.createElement('div'); u.id = 'k40pUpoz'; u.setAttribute('role', 'status'); u.hidden = true;
    const nav = document.querySelector('nav.tabs');
    document.body.insertBefore(u, nav || document.body.firstChild);
    document.body.appendChild(p); document.body.appendChild(z);
    document.body.addEventListener('click', klik);
    z.addEventListener('click', () => { S.otevreno = !S.otevreno; kresli(); });
    if (window.matchMedia && window.matchMedia('(max-width: 900px)').matches) document.body.insertBefore(p, document.body.firstChild);
    /* Aplikace překresluje hlavičku sama — zvýraznění doplněných polí se po překreslení vrátí. */
    let t = null;
    const pk = document.getElementById('page-kalk');
    if (pk && window.MutationObserver) new MutationObserver(() => { clearTimeout(t); t = setTimeout(zvyrazni, 60); }).observe(pk, { childList: true, subtree: true });
    vychozi(); kresli();
  }
  if (document.readyState === 'complete') setTimeout(start, 0); else window.addEventListener('load', () => setTimeout(start, 0));
})();
