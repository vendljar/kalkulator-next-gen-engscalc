/* Kontrola hotové PŘÍRUČKY ADMINISTRÁTORA (…_MANUAL_ADMINISTRATOR.html, M8).
 *
 * Jako manual/overit.js: otevřete příručku v prohlížeči, vložte celý soubor
 * do konzole a přečtete si výsledek. Totéž pouští v Chromiu
 * overit_prirucka_admin.mjs (nad hotovou příručkou) a src/test_prirucka_admin.js
 * (nad příručkou sestavenou se zástupnými snímky — tam se neověřují cíle
 * kliknutí, `window.KNG_BEZ_CILU = true`).
 * Statické kontroly (verze, testovací prostředí, skutečné firmy) dělá
 * už manual/admin/sestav.sh.
 */
(function () {
  'use strict';

  var ok = 0, chyb = 0, radky = [];
  function test(nazev, podminka, detail) {
    if (podminka) { ok++; radky.push('OK   ' + nazev); }
    else { chyb++; radky.push('CHYBA ' + nazev + (detail === undefined ? '' : '  → ' + detail)); }
  }

  var P = window.PRIRUCKA, A = window.PRIRUCKA_ADMIN;
  test('renderer doběhl', !!P);
  test('spojení části A a B doběhlo', !!A);
  if (!P || !A) { console.log(radky.join('\n')); return { proslo: ok, selhalo: chyb, radky: radky }; }

  if (!window.KNG_BEZ_CILU)
    test('každý cíl kliknutí a vysvětlivka našly svůj prvek', P.nesedi.length === 0, P.nesedi.join(', '));
  test('žádný snímek v datech nechybí', !P.nesedi.some(function (n) { return /^chybí snímek/.test(n); }),
    P.nesedi.filter(function (n) { return /^chybí snímek/.test(n); }).join(', '));
  test('snímky jsou z testovacího prostředí', P.prostredi === 'test', P.prostredi);
  test('obě sady snímků jsou z téže verze aplikace', A.verzeA === A.verzeB, A.verzeA + ' / ' + A.verzeB);
  test('příručka nese verzi aplikace', /v\d+\.\d+\.\d+/.test(P.verze), P.verze);
  test('titulek okna je příručka administrátora', /příručka administrátora/.test(document.title), document.title);

  var nadpisy = [].map.call(document.querySelectorAll('h2[id^="kap-"]'),
    function (h) { return { id: h.id, t: h.textContent.replace(/^\s*↑ obsah\s*/, '').trim() }; });
  var castA = nadpisy.filter(function (n) { return /^kap-a-/.test(n.id); });
  var castB = nadpisy.filter(function (n) { return !/^kap-a-/.test(n.id); });
  test('část A má aspoň 12 kapitol', castA.length >= 12, castA.length);
  test('část B (příručka obchodníka) je celá', castB.length === A.kapitolB && castB.length >= 8,
    castB.length + ' / ' + A.kapitolB);
  test('část A stojí před částí B', nadpisy.length > 0 && /^kap-a-/.test(nadpisy[0].id)
    && nadpisy.slice(0, castA.length).every(function (n) { return /^kap-a-/.test(n.id); }));
  var cA = castA.map(function (n) { return Number((n.t.match(/^A(\d+)\./) || [])[1]); });
  test('kapitoly A jsou číslované A1, A2 … bez děr', cA.every(function (c, i) { return c === i + 1; }), cA.join(','));
  /* Část B se NEpřečíslovává — její text odkazuje na čísla svých kapitol. */
  var cB = castB.map(function (n) { return Number((n.t.match(/^(\d+)\./) || [])[1]); });
  test('kapitoly B zůstaly 1, 2 … (odkazy obchodníka sedí)', cB.every(function (c, i) { return c === i + 1; }), cB.join(','));

  var odkazy = [].map.call(document.querySelectorAll('.obsah-list a'), function (a) { return a.getAttribute('href').slice(1); });
  var id = nadpisy.map(function (n) { return n.id; });
  test('obsah odkazuje na všechny kapitoly', odkazy.length === id.length, odkazy.length + ' vs ' + id.length);
  test('žádný odkaz v obsahu nemíří do prázdna', odkazy.every(function (o) { return id.indexOf(o) >= 0; }));
  test('id kapitol se neopakují', id.every(function (x, i) { return id.indexOf(x) === i; }));

  test('příručka nemá sekci „Co je nového"', !/Co je nového/i.test(document.body.innerText));
  var kroky = [].slice.call(document.querySelectorAll('ol.kroky > li.krok'));
  test('postupy krok za krokem jsou v příručce', kroky.length > 0 && P.kroku === kroky.length, kroky.length + ' / ' + P.kroku);
  test('kroky každého postupu jdou od 1 bez děr', [].every.call(document.querySelectorAll('ol.kroky'), function (ol) {
    return [].every.call(ol.querySelectorAll(':scope > li.krok > .krok-cis'), function (c, i) { return c.textContent === String(i + 1); });
  }));
  /* Kapitoly A, ve kterých správce něco dělá, mají postup — přehledy
   * (role, potíže, přístupy) ho mít nemusí. */
  var bezPostupuSmi = ['kap-a-potize', 'kap-a-pristupy', 'kap-a-disk-pd'];
  var bezPostupu = castA.filter(function (n) {
    if (bezPostupuSmi.indexOf(n.id) >= 0) return false;
    var h = document.getElementById(n.id), e = h.nextElementSibling;
    while (e && e.tagName !== 'H2') { if (e.matches('ol.kroky')) return false; e = e.nextElementSibling; }
    return true;
  }).map(function (n) { return n.id; });
  test('kapitoly A s akcí mají postup krok za krokem', bezPostupu.length === 0, bezPostupu.join(', '));

  var popisky = [].map.call(document.querySelectorAll('figcaption b'),
    function (b) { return Number((b.textContent.match(/(\d+)/) || [])[1]); });
  test('popisky obrázků jdou od 1 bez děr',
    popisky.length === P.obrazku && popisky.every(function (c, i) { return c === i + 1; }));
  var plochy = [].slice.call(document.querySelectorAll('.snimek-plocha'));
  test('každý snímek se vykreslil', plochy.length > 0 && plochy.every(function (h) { return h.offsetHeight > 20; }),
    plochy.filter(function (h) { return h.offsetHeight <= 20; }).length + ' prázdných');

  var text = document.body.innerText + plochy.map(function (h) {
    if (!h.shadowRoot) return '';
    return [].map.call(h.shadowRoot.children, function (u) { return u.tagName === 'STYLE' ? '' : (u.textContent || ''); }).join(' ');
  }).join('\n');

  test('příručka říká, že částky jsou ze zkušebního ceníku', /nejsou naše ceny/i.test(text));
  test('příručka říká, že jména jsou vymyšlená', /vymyšlená/i.test(text));
  test('příručka říká, že nenese hesla ani hodnoty proměnných', /neobsahuje hesla/i.test(text));

  /* Témata, bez kterých by balíček pro správce nebyl úplný (zadání M8). */
  var temata = {
    'role a hlavní správce': /hlavní správce/i.test(text) && /ADMIN_EMAIL/.test(text),
    'matice zobrazení': /matic/i.test(text) && /náhled/i.test(text),
    'zakládání a reset hesla': /Založit účet/.test(text) && /Nové heslo…/.test(text),
    'archiv a převod': /Archivovat…/.test(text) && /převod/i.test(text),
    'heslo správce u zásahů': /heslem správce/i.test(text),
    'zveřejnění ceníku a ze souboru': /Zveřejnit ceník této varianty jako platný/.test(text) && /Zveřejnit ceník ze souboru/.test(text),
    'migrace ceníku po nasazení': /jednou zveřejn/i.test(text),
    'noční otisk 2:00–3:45 UTC': /2:00–3:45 UTC/.test(text) && /zaloha_nocni/.test(text),
    'retence Netlify i Disk': /14 dní/.test(text) && /8 týdnů/.test(text) && /6 měsíců/.test(text) && /7 dní/.test(text),
    'pojistka úbytku': /Úbytek byl záměrný/.test(text),
    'kopie na Disk': /_Zaloha Netlify DB/.test(text) && /\.json\.gz/.test(text),
    'nouzové scénáře A, B, C': /A\) Pokazila/.test(text) && /B\) Zmizela/.test(text) && /C\) Zmizelo/.test(text),
    'weby ostrý a testovací': /engscalc\.netlify\.app/.test(text) && /testengscalc\.netlify\.app/.test(text),
    'Netlify: Deploys, Logs, Blobs, proměnné': /Deploys/.test(text) && /Logs → Functions/.test(text) && /Blobs/.test(text) && /Environment variables/.test(text),
    'GitHub: větve, tagy, Actions': /test-draft/.test(text) && /release_odkaz\.py/.test(text) && /Smazat sloučené větve/.test(text),
    'Pipedrive: co se nezapisuje': /nic nezapisuje/i.test(text),
    'testovací kolo a ruční postup': /testovaci_kolo\.sh/.test(text) && /před posunem do main/i.test(text),
  };
  Object.keys(temata).forEach(function (k) { test('téma: ' + k, temata[k]); });

  /* Bez tajemství a osobních údajů: e-maily jen vymyšlené, žádný token
   * známého tvaru, žádné „PROMENNA=hodnota". */
  var maily = (text.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g) || [])
    .filter(function (m) { return !/@(priklad\.cz|example\.com|zkusebni\.cz)$/i.test(m); });
  test('e-maily jsou jen vymyšlené (…@priklad.cz)', maily.length === 0, maily.join(', '));
  test('žádný token ani klíč', !/\b(gh[pousr]_[A-Za-z0-9]{20,}|nfp_[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16}|sk-ant-)/.test(text));
  test('žádná hodnota tajné proměnné', !/(TAJEMSTVI_RELACE|ADMIN_INIT_HESLO|PIPEDRIVE_TOKEN)\s*[=:]\s*\S{6,}/.test(text));

  var firmy = text.match(/[A-ZÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ][^\n]{2,40}?(a\.s\.|s\.r\.o\.|spol\. s r\.o\.)/g) || [];
  var podezrele = firmy.filter(function (f) { return !/Ukázk|Vzorov|Modelov|Zkušebn|Příkladn|ENGINEERS CZ/.test(f); });
  test('v příručce nejsou skutečné firmy', podezrele.length === 0, podezrele.join(' | '));
  test('žádná stopa po skutečném ceníku', !/cenik_skutecny|_soukrome/.test(document.documentElement.innerHTML));

  console.log(radky.join('\n'));
  console.log('\n' + ok + ' prošlo, ' + chyb + ' selhalo');
  return { proslo: ok, selhalo: chyb, radky: radky };
})();
