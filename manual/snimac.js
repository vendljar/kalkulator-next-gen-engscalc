/* Sběrač snímků obrazovky pro příručku obchodníka.
 *
 * PROČ ŽIVÝ DOM, A NE PNG (rozhodnuto 17. 9. 2026)
 * Dosavadní příručka měla 6 MB, protože v ní leželo 25 obrázků v base64.
 * Rastr se rozmaže při každém přiblížení a po vytištění je z tabulky cen
 * šedivá kaše. Tady se místo obrázku bere skutečný kus stránky — HTML
 * a firemní CSS — a v příručce se vykreslí znovu. Výsledek je ostrý při
 * jakémkoli zvětšení, dá se v něm hledat a celá příručka spadne pod 1 MB.
 * Druhý důvod je praktický: na tomhle počítači není Node ani Python, takže
 * Playwright, který snímky dělal dřív, se tu nedá spustit. Tenhle skript
 * běží v prohlížeči nad testovacím webem a nepotřebuje nic.
 *
 * JAK SE POUŽÍVÁ
 *   1) celý soubor vložit do konzole běžící aplikace (testovací web)
 *   2) proklikat se tam, kde má snímek vzniknout
 *   3) SNIMAC.vezmi('zadani-sachty', '#inputs .card')
 *   4) na konci SNIMAC.stahni() — stáhne snimky.json
 *
 * CO SE DO SNÍMKU NESMÍ DOSTAT
 * Prvky, které obchodník nevidí. Aplikace je schovává přes
 * `body:not(.smi-nastaveni) .admin-only`, jenže ve snímku žádné <body>
 * není a pravidlo by přestalo platit — administrátorská tlačítka by se
 * v příručce pro obchodníka objevila. Proto se nezachytává, co v okamžiku
 * sběru nic nezabírá (getClientRects), a příručka si `.admin-only`
 * schovává ještě jednou sama.
 */
(function () {
  'use strict';

  const SNIMAC = window.SNIMAC = {
    snimky: [],
    /* Náhrady v hotovém HTML snímku — poslední záchranná síť. Hlavní práci
     * odvádí anonymizace nad klonem (níž), tohle je na to, co se najde až
     * při čtení hotové příručky. */
    nahrady: [],
    /* Násobitel částek. Testovací web má podle zadání #168 STEJNÝ ceník jako
     * ostrý provoz a databáze vznikla zálohou z ostrého, takže snímek
     * kalkulace nese skutečné nákupní sazby i přirážku — obchodník je v roli
     * `sloupce.naklad` opravdu vidí.
     *
     * ROZHODNUTO 17. 9. 2026 (J. V.): fotí se SKUTEČNÉ částky, koeficient je
     * proto 1. Příručka za to nese označení „interní" místo dřívější věty
     * o zkušebních číslech — ta by byla nepravdivá a nepravdivé varování je
     * horší než žádné. Cesta zůstává otevřená: přepnutím na 0.8137 se každá
     * částka přepočítá a všechny vztahy v tabulce dál platí (součty sedí,
     * procenta i množství se nemění), jen ceny přestanou být naše. */
    kurz: 1,
  };

  /* ---------- firemní CSS ---------- */

  /* Aplikace je jednosouborová, všechno CSS leží v <style> ve stránce.
   * Bere se tak, jak je — nepřepisuje se, aby snímek vypadal přesně jako
   * aplikace a ne jako její ruční opis. */
  function cssAplikace() {
    return [...document.querySelectorAll('style')]
      .map(function (s) { return s.textContent; }).join('\n');
  }

  /* Předehra pro shadow DOM. Barvy visí na :root a písmo na body; uvnitř
   * snímku není ani jedno, takže by se pravidla nechytila a snímek by byl
   * bezbarvý. Hodnoty se nevypisují ručně, čtou se ze skutečného CSS —
   * jinak by se rozešly hned při první změně palety. */
  function predehra(css) {
    function blok(selektor) {
      var esc = selektor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      var m = css.match(new RegExp(esc + '\\s*\\{([^}]*)\\}'));
      return m ? m[1].trim() : '';
    }
    return [
      '/* obálka snímku zastupuje :root i body původní stránky */',
      ':host { display:block; ' + blok(':root') + ' ' + blok('body') + ' }',
      /* Testovací téma se nasazuje až na vyžádání: snímek má ukazovat
       * ostrou aplikaci, protože v ní obchodník pracuje. Výjimkou je
       * kapitola o testovacím webu, kde se jantarová barva ukázat MÁ. */
      ':host(.test) { ' + blok('body.prostredi-test') + ' }',
      ':host(.test) header { background:#7c2d12; }',
      /* Pojistka proti administrátorským prvkům, viz hlavička souboru. */
      ':host(:not(.admin)) .admin-only { display:none !important; }',
    ].join('\n');
  }

  /* ---------- sběr jednoho snímku ---------- */

  /* Hodnoty polí žijí jen v DOM, ne v atributech: po naklonování by byl
   * formulář prázdný a příručka by ukazovala nevyplněnou obrazovku. */
  function zapecStav(zdroj, klon) {
    var a = zdroj.querySelectorAll('input,select,textarea,canvas,details');
    var b = klon.querySelectorAll('input,select,textarea,canvas,details');
    for (var i = 0; i < a.length && i < b.length; i++) {
      var z = a[i], k = b[i], tag = z.tagName;
      if (tag === 'INPUT') {
        if (z.type === 'checkbox' || z.type === 'radio') {
          if (z.checked) k.setAttribute('checked', ''); else k.removeAttribute('checked');
        } else k.setAttribute('value', z.value);
      } else if (tag === 'SELECT') {
        var opt = k.options, si = z.selectedIndex;
        for (var n = 0; n < opt.length; n++) {
          if (n === si) opt[n].setAttribute('selected', '');
          else opt[n].removeAttribute('selected');
        }
      } else if (tag === 'TEXTAREA') {
        k.textContent = z.value;
      } else if (tag === 'DETAILS') {
        if (z.open) k.setAttribute('open', ''); else k.removeAttribute('open');
      } else if (tag === 'CANVAS') {
        /* Graf je nakreslený skriptem, v klonu by zůstalo prázdné plátno.
         * Obrázek je tu na místě — jiná cesta k němu nevede. */
        try {
          var img = document.createElement('img');
          img.src = z.toDataURL('image/png');
          img.width = z.width; img.height = z.height;
          k.replaceWith(img);
        } catch (e) { /* zamčené plátno; snímek zůstane bez grafu */ }
      }
    }
  }

  /* Co se v aplikaci nekreslí, nemá být ani ve snímku. Rozhoduje se podle
   * skutečně zabraného místa, ne podle display: potomek skryté větve má
   * display pořád svůj vlastní a prošel by. */
  /* Prvky, které NIKDY nemají vlastní box, a přesto je snímek potřebuje.
   * `<option>` zavřeného seznamu prohlížeč kreslí až po rozbalení, `<col>`
   * a `<colgroup>` drží šířky sloupců a `<style>` nese vzhled. Bez téhle
   * výjimky vyšly ze snímků prázdné rozbalovací seznamy (17. 9. 2026) —
   * a nebylo to poznat na zdrojáku, jen na hotové příručce. */
  var BEZ_BOXU_ALE_POTREBNE = { OPTION: 1, OPTGROUP: 1, COL: 1, COLGROUP: 1, STYLE: 1 };

  function vyhodNeviditelne(zdroj, klon) {
    var a = zdroj.querySelectorAll('*');
    var b = klon.querySelectorAll('*');
    var pryc = [];
    for (var i = 0; i < a.length && i < b.length; i++) {
      if (a[i].tagName === 'SCRIPT') { pryc.push(b[i]); continue; }
      if (BEZ_BOXU_ALE_POTREBNE[a[i].tagName]) continue;
      if (!a[i].getClientRects().length) pryc.push(b[i]);
    }
    /* Odzadu, ať odstranění rodiče nerozbije zbytek seznamu.
     *
     * POZOR NA isConnected (chyba nalezená 17. 9. 2026). Původně tu stálo
     * `if (pryc[j].isConnected) pryc[j].remove()` jako pojistka proti
     * mazání už odstraněného uzlu. Jenže `isConnected` je pravda jen tehdy,
     * když kořenem uzlu je DOKUMENT — a klon z cloneNode() visí ve vzduchu,
     * takže je u něj vždycky false. Podmínka tedy nesmazala nikdy nic
     * a snímky se pořizovaly i s tím, co na obrazovce vidět není. Nepoznalo
     * se to: snímek vznikl, jen byl větší. Pojistka není potřeba — remove()
     * na uzlu bez rodiče je tichá a neškodná. */
    for (var j = pryc.length - 1; j >= 0; j--) pryc[j].remove();
  }

  /* Obsluha kliknutí ve snímku nemá co dělat: funkce aplikace v příručce
   * neexistují a v konzoli by po každém kliknutí naskočila chyba. */
  function odstranChovani(klon) {
    var vse = [klon].concat([].slice.call(klon.querySelectorAll('*')));
    for (var i = 0; i < vse.length; i++) {
      var atr = [].slice.call(vse[i].attributes);
      for (var j = 0; j < atr.length; j++) {
        if (/^on/i.test(atr[j].name)) vse[i].removeAttribute(atr[j].name);
      }
      if (/^\s*javascript:/i.test(vse[i].getAttribute('href') || '')) {
        vse[i].setAttribute('href', '#');
      }
    }
  }

  /* ---------- anonymizace ----------
   *
   * ROZMAZAT NESTAČÍ. U rastrového snímku rozmazání pixel skutečně zahodí,
   * tady ne: text zůstane v HTML a přečte ho každý, kdo se podívá do zdroje
   * nebo vypne jedno pravidlo v CSS. Proto se citlivá hodnota NAHRAZUJE už
   * nad klonem, dřív než se snímek vůbec serializuje — do příručky se ta
   * pravá nedostane ani omylem. `rozmaz()` níž je jen vzhled, a použít se
   * smí výhradně na to, co je už nahrazené. */

  /* „Ukázková správa budov s.r.o." v zásobě SCHVÁLNĚ NENÍ — patří ukázkové
   * zakázce příručky (2026 - OPR - CN - 9100). Kdyby ji zásoba rozdávala,
   * dostal by v přehledu nabídek její jméno i někdo jiný. */
  var ZASOBY = {
    firma: ['Vzorové bytové družstvo', 'Modelová development a.s.',
      'Zkušební nemovitosti s.r.o.', 'Příkladná realitní s.r.o.',
      'SVJ Vzorová 1234, Praha', 'Ukázkový správce objektů s.r.o.'],
    osoba: ['Jan Ukázka', 'Petr Vzorek', 'Eva Modelová', 'Marie Příkladná'],
    akce: ['vestavba nové prosklené OCK výtahové šachty',
      'přístavba výtahu k fasádě bytového domu',
      'venkovní přístavba výtahu', 'zaměření a projekční činnost'],
  };

  /* Táž skutečná hodnota musí dát vždy tutéž vymyšlenou, jinak by jeden
   * zákazník vystupoval na dvou snímcích pod dvěma jmény.
   *
   * ČÍTAČ JE PRO KAŽDOU ZÁSOBU VLASTNÍ (oprava 17. 9. 2026). Dokud se
   * pořadí bralo z velikosti celého slovníku, posouvaly ho i osoby, akce
   * a čísla nabídek — a při `n % 6` mohly dvě různé firmy dostat totéž
   * jméno. V přehledu nabídek by to vypadalo, že dvě zakázky patří jednomu
   * zákazníkovi; věrohodná nepravda, které by si nikdo nevšiml. */
  SNIMAC.slovnik = {};
  var pocitadla = {};
  function vymysli(puvodni, druh, predpona) {
    var t = (puvodni || '').trim();
    if (!t || t === '—' || t === '-') return puvodni;
    if (!SNIMAC.slovnik[t]) {
      var n = pocitadla[druh] = (pocitadla[druh] || 0) + 1;
      var zasoba = ZASOBY[druh];
      SNIMAC.slovnik[t] = zasoba
        ? zasoba[(n - 1) % zasoba.length] + (n > zasoba.length ? ' ' + n : '')
        : predpona + (9100 + n);
    }
    return SNIMAC.slovnik[t];
  }
  SNIMAC.firma = function (t) { return vymysli(t, 'firma'); };
  SNIMAC.osoba = function (t) { return vymysli(t, 'osoba'); };
  SNIMAC.akce = function (t) { return vymysli(t, 'akce'); };
  SNIMAC.cislo = function (t) { return vymysli(t, 'cislo', '2026 - OPR - CN - '); };

  /* Přepis buněk v tabulce podle pořadí sloupce: {2:'firma', 8:'osoba'}.
   * Indexy se počítají od nuly a berou se z `cells`, takže sedí i tam, kde
   * první sloupec drží zaškrtávátko. */
  SNIMAC.sloupce = function (klon, radky, mapa) {
    var tr = klon.querySelectorAll(radky);
    for (var i = 0; i < tr.length; i++) {
      for (var k in mapa) {
        var b = tr[i].cells && tr[i].cells[k];
        if (b && SNIMAC[mapa[k]]) b.textContent = SNIMAC[mapa[k]](b.textContent);
      }
    }
  };

  /* Výřez sekce z jedné velké tabulky. Cenová kalkulace je JEDNA tabulka
   * přes všechny sekce (Hrubá OCK, Opláštění, Volitelné, Režie) a měří přes
   * 2 000 px — do příručky se musí vzít jen ten kus, o kterém je řeč.
   * Hlavička sloupců zůstává vždycky, jinak by čtenář nevěděl, co je který. */
  SNIMAC.vyrez = function (klon, odNadpisu, poNadpis) {
    var tr = [].slice.call(klon.querySelectorAll('tr'));
    var i0 = -1, i1 = -1;
    for (var i = 0; i < tr.length; i++) {
      if (i0 < 0 && new RegExp(odNadpisu, 'i').test(tr[i].innerText)) i0 = i;
      if (new RegExp(poNadpis, 'i').test(tr[i].innerText)) i1 = i;
    }
    if (i0 < 0 || i1 < 0) { console.warn('SNIMAC.vyrez: nenašel ' + odNadpisu + ' … ' + poNadpis); return; }
    for (var j = 0; j < tr.length; j++) {
      if (j !== 0 && (j < i0 || j > i1)) tr[j].remove();
    }
  };

  /* Vizuální rozostření. NENÍ to ochrana — viz komentář nahoře. */
  SNIMAC.rozmaz = function (klon, selektor) {
    var el = klon.querySelectorAll(selektor);
    for (var i = 0; i < el.length; i++) {
      el[i].style.filter = 'blur(4px)';
      el[i].style.userSelect = 'none';
    }
  };

  /* ---------- částky ---------- */

  var CASTKA = /(-?\d[\d\s ]*(?:,\d+)?)\s*(Kč|€|EUR)/g;

  function naCislo(s) { return parseFloat(String(s).replace(/[\s ]/g, '').replace(',', '.')); }
  function naText(n, des) {
    return n.toLocaleString('cs-CZ', { minimumFractionDigits: des, maximumFractionDigits: des });
  }

  /* Násobí každou částku v textu. Procenta, množství ani počty kusů se
   * nedotýká — ty nesou informaci o zadání, ne o ceně, a příručka na nich
   * stojí (např. „3 rámy", „15 příčníků"). */
  function prepoctiText(uzel, kurz) {
    var chodec = document.createTreeWalker(uzel, NodeFilter.SHOW_TEXT);
    var n;
    while ((n = chodec.nextNode())) {
      if (!/\d/.test(n.nodeValue)) continue;
      n.nodeValue = n.nodeValue.replace(CASTKA, function (cele, cislo, mena) {
        var h = naCislo(cislo);
        if (!isFinite(h)) return cele;
        var des = /,(\d+)/.test(cislo) ? RegExp.$1.length : 0;
        return naText(h * kurz, des) + ' ' + mena;
      });
    }
  }

  /* Hodnoty polí nenesou měnu (jednotková cena je holé číslo v <input>),
   * takže se musí ukázat prstem, která pole jsou peníze. */
  SNIMAC.prepoctiPole = function (klon, selektor) {
    var el = klon.querySelectorAll(selektor);
    for (var i = 0; i < el.length; i++) {
      var h = naCislo(el[i].getAttribute('value'));
      if (!isFinite(h) || !h) continue;
      var des = /,(\d+)/.test(el[i].getAttribute('value')) ? RegExp.$1.length : 0;
      el[i].setAttribute('value', naText(h * SNIMAC.kurz, des));
    }
  };

  /* Řádek, který o sobě tvrdí, že je zaokrouhlený, musí zaokrouhlený
   * zůstat — po přepočtu by v něm jinak stálo 1 234 567 Kč pod nadpisem
   * „zaokrouhleno na tisíce" a snímek by si protiřečil. */
  SNIMAC.dorovnej = function (klon, radekSel, krok) {
    var tr = klon.querySelectorAll(radekSel);
    for (var i = 0; i < tr.length; i++) {
      var b = tr[i].querySelectorAll('td, th');
      for (var j = 0; j < b.length; j++) {
        b[j].textContent = b[j].textContent.replace(CASTKA, function (cele, cislo, mena) {
          var h = naCislo(cislo);
          return isFinite(h) ? naText(Math.ceil(h / krok) * krok, 0) + ' ' + mena : cele;
        });
      }
    }
  };

  SNIMAC.vezmi = function (id, selektor, volby) {
    volby = volby || {};
    var zdroj = typeof selektor === 'string' ? document.querySelector(selektor) : selektor;
    if (!zdroj) { console.error('SNIMAC: nenašel jsem ' + selektor); return null; }

    var klon = zdroj.cloneNode(true);
    zapecStav(zdroj, klon);
    vyhodNeviditelne(zdroj, klon);
    odstranChovani(klon);

    /* Pořadí je dané: nejdřív přepočet částek, teprve pak ruční úprava.
     * Kdyby to bylo naopak, koeficient by přejel i hodnoty, které si snímek
     * dosadil sám, a rozhodil je. */
    if (SNIMAC.kurz && SNIMAC.kurz !== 1) prepoctiText(klon, SNIMAC.kurz);
    if (typeof volby.uprav === 'function') volby.uprav(klon, SNIMAC);

    var html = klon.outerHTML;
    for (var i = 0; i < SNIMAC.nahrady.length; i++) {
      html = html.replace(SNIMAC.nahrady[i][0], SNIMAC.nahrady[i][1]);
    }

    var r = zdroj.getBoundingClientRect();
    var snimek = {
      id: id,
      html: html,
      /* Šířka je závazná — podle ní se snímek v příručce zmenšuje, aby
       * rozvržení sedělo na tu šířku, na které bylo pořízeno.
       * Výška je jen orientační: měří se na PŮVODNÍM prvku, takže po výřezu
       * (uprav/vyrez) neodpovídá. Příručka se jí proto neřídí a nechává si
       * výšku určit obsahem. */
      sirka: Math.round(r.width),
      vyska: Math.round(r.height),
      tema: volby.tema || 'ostre',   /* 'test' = ukázat jantarové téma */
      admin: !!volby.admin,          /* snímek smí obsahovat admin prvky */
      popis: volby.popis || '',
    };
    var stary = -1;
    for (var s = 0; s < SNIMAC.snimky.length; s++) {
      if (SNIMAC.snimky[s].id === id) stary = s;
    }
    if (stary >= 0) SNIMAC.snimky[stary] = snimek; else SNIMAC.snimky.push(snimek);

    /* Hlídač, ne pojistka: upozorní na řádek, který se tváří zaokrouhleně
     * (po přepočtu už zaokrouhlený být nemusí), a na text, který vypadá jako
     * skutečná firma. Rozhodnutí zůstává na tom, kdo snímek pořizuje. */
    var hlidky = [];
    if (SNIMAC.kurz !== 1 && /zaokrouhl/i.test(klon.textContent || '')) {
      hlidky.push('obsahuje zaokrouhlený řádek — zkontroluj, jestli po přepočtu sedí');
    }
    if (/\b(a\.s\.|s\.r\.o\.|spol\. s r\.o\.|s\.p\.o\.)/.test(klon.textContent || '')
        && !/Ukázk|Vzorov|Modelov|Zkušebn|Příkladn/.test(klon.textContent || '')) {
      hlidky.push('je tu název firmy, který nevypadá vymyšleně — anonymizuj');
    }

    console.log('SNIMAC: ' + id + ' — ' + Math.round(html.length / 1024) + ' kB, '
      + snimek.sirka + 'x' + snimek.vyska + ' px'
      + (hlidky.length ? '\n  ⚠ ' + hlidky.join('\n  ⚠ ') : ''));
    return snimek.id + ' ' + Math.round(html.length / 1024) + ' kB '
      + snimek.sirka + 'x' + snimek.vyska
      + (hlidky.length ? ' ⚠ ' + hlidky.join(' ⚠ ') : '');
  };

  SNIMAC.seznam = function () {
    return SNIMAC.snimky.map(function (s) {
      return s.id + '  ' + Math.round(s.html.length / 1024) + ' kB';
    });
  };

  /* ---------- odevzdání ---------- */

  SNIMAC.data = function () {
    var css = cssAplikace();
    var h1 = document.querySelector('header h1');
    return {
      zachyceno: new Date().toISOString(),
      verze: h1 ? h1.textContent : '',
      prostredi: document.body.classList.contains('prostredi-test') ? 'test' : 'ostre',
      /* Jde do příručky, aby se dalo doložit, že částky na snímcích nejsou
       * naše ceny — a aby bylo poznat, kdyby někdo přepočet vypnul. */
      castkyUpraveny: SNIMAC.kurz !== 1,
      css: predehra(css) + '\n' + css,
      snimky: SNIMAC.snimky,
    };
  };

  SNIMAC.stahni = function (jmeno) {
    var txt = JSON.stringify(SNIMAC.data());
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([txt], { type: 'application/json' }));
    a.download = jmeno || 'snimky.json';
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 5000);
    console.log('SNIMAC: staženo ' + Math.round(txt.length / 1024) + ' kB, '
      + SNIMAC.snimky.length + ' snímků');
    return Math.round(txt.length / 1024) + ' kB, ' + SNIMAC.snimky.length + ' snímků';
  };

  console.log('SNIMAC připraven. SNIMAC.vezmi(id, selektor) … SNIMAC.stahni()');
})();
