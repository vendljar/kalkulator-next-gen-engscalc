/* Příručka administrátora = vlastní kapitoly správce (část A) + celá
 * příručka obchodníka (část B), vykreslené TOUŽ šablonou manual/sablona.html.
 *
 * PROČ SPOJOVAT AŽ V PROHLÍŽEČI
 * Sestavení má zůstat bez Node a Pythonu (sestav.sh jen vkládá soubory
 * awkem — stav počítače, kde se příručky vyrábějí, 17. 9. 2026). Tenhle
 * skript sestav.sh vloží do šablony HNED ZA datové bloky a PŘED renderer:
 * přečte obě sady dat a do bloků, ze kterých renderer čte (#data-obsah,
 * #data-snimky), zapíše spojenou verzi. Renderer tak nepozná, že jde o dvě
 * příručky, a oprava šablony platí pro obě.
 *
 * PROČ ČÁST B BEZ PŘEČÍSLOVÁNÍ
 * Text obchodníka odkazuje na čísla svých kapitol („kapitola 22"). Kapitoly
 * správce proto nesou předponu A (A1, A2 …) a stojí před ním; kapitoly
 * obchodníka zůstávají 1–N, takže každý jejich odkaz dál sedí. */
(function () {
  'use strict';
  function cti(id) { return JSON.parse(document.getElementById(id).textContent); }
  function zapis(id, data) { document.getElementById(id).textContent = JSON.stringify(data); }

  var obsahA = cti('data-obsah-admin');
  var obsahB = cti('data-obsah');
  var snimkyA = cti('data-snimky-admin');
  var snimkyB = cti('data-snimky');

  var kapitolyB = (obsahB.kapitoly || []).map(function (k, i) {
    var kopie = JSON.parse(JSON.stringify(k));
    if (i === 0) {
      kopie.bloky.unshift({ typ: 'ram', nadpis: 'Část B — příručka obchodníka',
        odstavce: [obsahA.castB || 'Následující kapitoly jsou příručka obchodníka beze změny.'] });
    }
    return kopie;
  });

  var spojenyObsah = {
    titul: obsahA.titul,
    verze: obsahA.verze,
    uvod: obsahA.uvod || [],
    kapitoly: (obsahA.kapitoly || []).concat(kapitolyB)
  };
  /* Snímky: CSS aplikace je v obou sadách totéž (stejná verze — hlídá sestav.sh),
   * bere se ze sady obchodníka; id se nekříží (správce má předponu „a-"). */
  var spojeneSnimky = JSON.parse(JSON.stringify(snimkyB));
  spojeneSnimky.snimky = snimkyB.snimky.concat(snimkyA.snimky.filter(function (s) {
    return !snimkyB.snimky.some(function (b) { return b.id === s.id; });
  }));
  if (snimkyA.prostredi !== snimkyB.prostredi) spojeneSnimky.prostredi = 'NESHODA';

  zapis('data-obsah', spojenyObsah);
  zapis('data-snimky', spojeneSnimky);
  window.PRIRUCKA_ADMIN = { kapitolA: (obsahA.kapitoly || []).length, kapitolB: kapitolyB.length,
    snimkuA: snimkyA.snimky.length, snimkuB: snimkyB.snimky.length,
    verzeA: snimkyA.verze, verzeB: snimkyB.verze };
})();
