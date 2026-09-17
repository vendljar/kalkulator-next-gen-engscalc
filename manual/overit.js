/* Kontrola hotové příručky obchodníka.
 *
 * PROČ V PROHLÍŽEČI, A NE V NODE
 * Starší `overit_manual.mjs` v kořeni repozitáře běží na Playwrightu nad
 * cestou `/home/claude/work/deliver` a hlídá 25 zapečených PNG. Nic z toho
 * dnes neplatí: snímky jsou živý DOM, na tomhle počítači není Node a hotová
 * příručka leží na sdíleném disku. Ten soubor záměrně nemažu — patří k jiné
 * příručce a o jeho osudu rozhodne zadavatel.
 *
 * Tohle je náhrada, která nepotřebuje vůbec nic: otevřete příručku
 * v prohlížeči, vložte celý soubor do konzole a přečtete si výsledek.
 * Statické kontroly (verze proti verze.txt, testovací prostředí, jména
 * skutečných firem) dělá už `sestav.sh` a sestavení kvůli nim zastaví —
 * sem patří to, co je vidět teprve po vykreslení.
 */
(function () {
  'use strict';

  var ok = 0, chyb = 0, radky = [];
  function test(nazev, podminka, detail) {
    if (podminka) { ok++; radky.push('OK   ' + nazev); }
    else { chyb++; radky.push('CHYBA ' + nazev + (detail === undefined ? '' : '  → ' + detail)); }
  }

  var P = window.PRIRUCKA;
  test('renderer doběhl', !!P);
  if (!P) { console.log(radky.join('\n')); return 'Příručka se nevykreslila.'; }

  /* Nenalezená vysvětlivka je TICHÁ chyba: kolečko se nenakreslí, ale text
   * pod obrázkem zůstane a čtenář hledá na snímku něco, co tam není. */
  test('každá vysvětlivka našla svůj cíl', P.nesedi.length === 0, P.nesedi.join(', '));

  test('snímky jsou z testovacího prostředí', P.prostredi === 'test', P.prostredi);
  test('příručka nese verzi aplikace', /v\d+\.\d+\.\d+/.test(P.verze), P.verze);

  var plochy = [].slice.call(document.querySelectorAll('.snimek-plocha'));
  test('příručka má aspoň 10 obrázků', P.obrazku >= 10, P.obrazku);
  test('každý snímek se vykreslil', plochy.length > 0
    && plochy.every(function (h) { return h.offsetHeight > 20; }),
    plochy.filter(function (h) { return h.offsetHeight <= 20; }).length + ' prázdných');

  /* Zavřený <select> nemá žádný box, takže úklid snímku uměl smazat všechny
   * jeho <option> a zbyl prázdný rámeček (stalo se 17. 9. 2026). Na zdrojáku
   * to nebylo poznat — jen na hotové příručce. */
  var seznamu = 0, prazdnych = 0;
  plochy.forEach(function (h) {
    if (!h.shadowRoot) return;
    [].forEach.call(h.shadowRoot.querySelectorAll('select'), function (s) {
      seznamu++;
      if (!s.querySelector('option')) prazdnych++;
    });
  });
  test('žádný rozbalovací seznam není prázdný', prazdnych === 0,
    prazdnych + ' z ' + seznamu);

  /* Vyplněné hodnoty v polích jsou celý smysl snímku — prázdný formulář
   * neučí nic. Kontroluje se, že aspoň někde hodnoty jsou. */
  var sHodnotou = 0;
  plochy.forEach(function (h) {
    if (!h.shadowRoot) return;
    [].forEach.call(h.shadowRoot.querySelectorAll('input[value]'), function (i) {
      if ((i.getAttribute('value') || '').trim()) sHodnotou++;
    });
  });
  test('pole ve snímcích nesou vyplněné hodnoty', sHodnotou >= 20, sHodnotou);

  var nadpisy = [].map.call(document.querySelectorAll('h2[id^="kap-"]'),
    function (h) { return h.textContent.replace(/^\s*↑ obsah\s*/, '').trim(); });
  test('kapitol je aspoň 8', nadpisy.length >= 8, nadpisy.length);

  /* Kapitoly se při vkládání přečíslovávají ručně, takže se hlídá, že řada
   * opravdu jde 1, 2, 3 … a nezůstala v ní dvojka navíc. */
  var cisla = nadpisy.map(function (t) { return (t.match(/^(\d+)\./) || [])[1]; })
    .filter(Boolean).map(Number);
  test('kapitoly jsou číslované vzestupně bez děr',
    cisla.length === nadpisy.length && cisla.every(function (c, i) { return c === i + 1; }),
    cisla.join(','));

  var odkazy = [].map.call(document.querySelectorAll('.obsah-list a'),
    function (a) { return a.getAttribute('href').slice(1); });
  var id = [].map.call(document.querySelectorAll('h2[id^="kap-"]'),
    function (h) { return h.id; });
  test('obsah odkazuje na všechny kapitoly', odkazy.length === id.length,
    odkazy.length + ' vs ' + id.length);
  test('žádný odkaz v obsahu nemíří do prázdna',
    odkazy.every(function (o) { return id.indexOf(o) >= 0; }),
    odkazy.filter(function (o) { return id.indexOf(o) < 0; }).join(', '));
  test('od každé kapitoly vede šipka zpět na obsah',
    document.querySelectorAll('a.nahoru').length === id.length);

  /* Popisky obrázků musí jít od 1 bez děr — čísluje je renderer, takže díra
   * znamená, že se nějaký snímek nevykreslil. */
  var popisky = [].map.call(document.querySelectorAll('figcaption b'),
    function (b) { return Number((b.textContent.match(/(\d+)/) || [])[1]); });
  test('popisky obrázků jdou od 1 bez děr',
    popisky.length === P.obrazku && popisky.every(function (c, i) { return c === i + 1; }),
    popisky.join(','));

  /* Text příručky = próza PLUS obsah snímků. Snímky žijí v shadow DOM
   * a `document.body.innerText` do nich nevidí — kontrola „kapitola
   * o testovacím webu je uvnitř" proto nejdřív padala na příručce, ve které
   * ta věta prokazatelně byla (17. 9. 2026). Vložené firemní CSS se cestou
   * vynechává, jinak by text narostl z 14 kB na 800 kB a hledání v něm by
   * začalo nacházet náhodné shody v názvech tříd. */
  var text = document.body.innerText + plochy.map(function (h) {
    if (!h.shadowRoot) return '';
    return [].map.call(h.shadowRoot.children, function (uzel) {
      return uzel.tagName === 'STYLE' ? '' : (uzel.textContent || '');
    }).join(' ');
  }).join('\n');

  /* Od 17. 9. 2026 se fotí SKUTEČNÉ částky (rozhodnutí J. V.), takže dřívější
   * věta „čísla jsou zkušební" by byla nepravdivá. Místo ní musí příručka
   * nést označení, že je interní — nepravdivé varování je horší než žádné. */
  test('příručka je označená jako interní',
    /Interní dokument/i.test(text) && /skutečné částky/i.test(text));
  test('příručka říká, že jména zákazníků jsou vymyšlená',
    /vymyšlená/i.test(text));
  test('kapitola o testovacím webu je uvnitř',
    /testengscalc/i.test(text) && /TESTOVACÍ PROSTŘEDÍ/i.test(text));
  test('příručka vysvětluje pomlčku u nezahrnuté položky',
    /pomlčk/i.test(text));
  test('příručka popisuje dvojici přechodových plechů',
    /dva řádky/i.test(text) && /MONTÁŽ/i.test(text));
  test('příručka říká, proč obchodník nevidí sloupce Viditelné a Výchozí',
    /Viditelné/.test(text) && /Výchozí/.test(text) && /administrátor/i.test(text));

  /* Skutečné firmy hlídá i sestav.sh nad daty; tady se kontroluje výsledek,
   * protože text kapitol píše člověk a může do něj jméno napsat rukou. */
  var firmy = text.match(/[A-ZÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ][^\n]{2,40}?(a\.s\.|s\.r\.o\.|spol\. s r\.o\.)/g) || [];
  var podezrele = firmy.filter(function (f) {
    return !/Ukázk|Vzorov|Modelov|Zkušebn|Příkladn/.test(f);
  });
  test('v příručce nejsou skutečné firmy', podezrele.length === 0, podezrele.join(' | '));
  test('žádná stopa po skutečném ceníku',
    !/cenik_skutecny|_soukrome/.test(document.documentElement.innerHTML));

  console.log(radky.join('\n'));
  console.log('\n' + ok + ' prošlo, ' + chyb + ' selhalo');
  return { proslo: ok, selhalo: chyb, radky: radky };
})();
