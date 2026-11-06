/* ============================================================================
 * ČÍSELNÉ POLE S ČESKOU DESETINNOU ČÁRKOU (CA #575, rozhodnutí J. V.
 * 6. 11. 2026)
 *
 * Do 6. 11. 2026 byla číselná pole `<input type="number">`. Desetinnou čárku
 * pak řídil jazyk prohlížeče: český Chrome ukázal i přijal „17,3", anglicky
 * nastavený (i headless Chromium) čárku zahodil — „17,3" → 173. J. V. chce
 * všude totéž bez ohledu na prohlížeč: pole přijme čárku i tečku a vždy
 * ukáže českou desetinnou čárku (mezeru v tisících jako výstupy).
 *
 * JEDEN PRVEK PRO CELOU APLIKACI. Každé číselné pole se píše jako
 *   `<input ${CISLO_POLE} …>`
 * (atributy bez `type` — pole je textové, ale nespadá pod CSS pravidla
 * `input[type=text]`, která textová pole roztahují na celou šířku buňky).
 * Logika je jen tady a v parseru `cisloPoleText` / `cisloPoleZobraz`
 * (format.js, test v Node):
 *
 *  1. `el.value` vrací u číselného pole NORMALIZOVANÝ text s tečkou („17.3",
 *     „1250.5", '' pro prázdné i nečitelné) — přesně to, co dřív vracelo pole
 *     type=number. Obsluhy `onchange="set(…, +this.value)"`, `katSet(…,
 *     this.value)` atd. proto zůstaly beze změny a do dat jde dál Number.
 *     Zápis `el.value = x` ukáže číslo s čárkou.
 *  2. Po vložení do stránky (MutationObserver; aplikace kreslí přes innerHTML)
 *     se hodnota i číselný placeholder přepíší do české podoby. Mění se
 *     atribut `value`, takže `defaultValue` (podle něj `renderSFokusem`
 *     pozná rozepsané pole) zůstává shodný s tím, co je vidět.
 *  3. `change` s nečitelným textem („abc", „1,2,3") se zastaví dřív, než ho
 *     uvidí obsluha pole: hodnota se vrátí na původní a ukáže se hláška —
 *     do dat nic nejde (dřív prohlížeč písmena do type=number nepustil).
 *     Písmena se nepustí ani při psaní (beforeinput).
 *  4. Šipky ani kolečko hodnotu nemění — textové pole nemá krokování, takže
 *     se nic nepřestaví omylem (J. V.: „šipky/kolečko nemění hodnotu omylem").
 *     Atributy min/max/step se v poli nechávají jako popis rozsahu; kontroly
 *     rozsahu dělají obsluhy a server jako dosud.
 * ========================================================================== */

const CISLO_POLE = 'inputmode="decimal" autocomplete="off" data-cislo="1"';

function cisloPoleJe(el) {
  return !!(el && el.tagName === 'INPUT' && el.hasAttribute && el.hasAttribute('data-cislo'));
}

/* Původní (nativní) přístup k hodnotě pole — co je opravdu napsáno. */
const CISLO_POLE_NATIVNI = (typeof HTMLInputElement !== 'undefined')
  ? Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value') : null;

function cisloPoleSurove(el) {
  return CISLO_POLE_NATIVNI ? CISLO_POLE_NATIVNI.get.call(el) : el.value;
}
function cisloPoleSuroveNastav(el, t) {
  if (CISLO_POLE_NATIVNI) CISLO_POLE_NATIVNI.set.call(el, t); else el.value = t;
}

/* Nečitelný obsah (true) — prázdné pole čitelné je (= prázdná hodnota). */
function cisloPoleChybne(el) {
  return cisloPoleJe(el) && cisloPoleText(cisloPoleSurove(el)) === null;
}

if (CISLO_POLE_NATIVNI) {
  Object.defineProperty(HTMLInputElement.prototype, 'value', {
    configurable: true,
    enumerable: CISLO_POLE_NATIVNI.enumerable,
    get() {
      const t = CISLO_POLE_NATIVNI.get.call(this);
      if (!cisloPoleJe(this)) return t;
      const n = cisloPoleText(t);
      return n === null ? '' : n;
    },
    set(v) {
      CISLO_POLE_NATIVNI.set.call(this, cisloPoleJe(this) ? cisloPoleZobraz(v == null ? '' : v) : v);
    },
  });
}

/* Česká podoba hodnoty a číselného placeholderu v nově vloženém poli. */
function cisloPoleUprav(el) {
  if (!cisloPoleJe(el)) return;
  const a = el.getAttribute('value');
  if (a != null && a !== '') {
    const z = cisloPoleZobraz(a);
    if (z !== a) el.setAttribute('value', z);
  }
  const ph = el.getAttribute('placeholder');
  if (ph && cisloPoleText(ph) !== null) {
    const z = cisloPoleZobraz(ph);
    if (z !== ph) el.setAttribute('placeholder', z);
  }
}
function cisloPoleUpravVse(koren) {
  if (!koren) return;
  if (cisloPoleJe(koren)) cisloPoleUprav(koren);
  if (koren.querySelectorAll) koren.querySelectorAll('input[data-cislo]').forEach(cisloPoleUprav);
}

if (typeof document !== 'undefined' && document.addEventListener) {
  if (typeof MutationObserver !== 'undefined') {
    new MutationObserver(zmeny => {
      for (const z of zmeny) {
        if (z.type === 'attributes') { cisloPoleUprav(z.target); continue; }
        z.addedNodes.forEach(n => { if (n.nodeType === 1) cisloPoleUpravVse(n); });
      }
    }).observe(document.documentElement, {
      childList: true, subtree: true, attributes: true, attributeFilter: ['value', 'placeholder'],
    });
  }
  if (document.readyState !== 'loading') cisloPoleUpravVse(document);
  else document.addEventListener('DOMContentLoaded', () => cisloPoleUpravVse(document));

  /* Nečitelný zápis se do obsluhy nedostane (zachytává se v první fázi,
   * dřív než inline `onchange`). Čitelný se jen přepíše do české podoby. */
  document.addEventListener('change', (e) => {
    const el = e.target;
    if (!cisloPoleJe(el)) return;
    const t = cisloPoleSurove(el);
    if (cisloPoleText(t) === null) {
      e.stopImmediatePropagation();
      cisloPoleSuroveNastav(el, el.defaultValue);
      if (typeof hlaska === 'function')
        hlaska('„' + String(t).trim().slice(0, 40) + '“ není číslo — zadejte číslo, desetinná čárka i tečka platí (např. 17,3). Hodnota se nezměnila.');
      return;
    }
    const z = cisloPoleZobraz(t);
    if (z !== t) cisloPoleSuroveNastav(el, z);
  }, true);

  /* Psaní: projde číslice, čárka, tečka, mezera a znaménko — jako dřív
   * do type=number se písmena nedostanou. Vložení ze schránky se kontroluje
   * celé až při `change` (např. „1 250,50" z tabulky). */
  document.addEventListener('beforeinput', (e) => {
    if (!cisloPoleJe(e.target) || e.inputType !== 'insertText' || e.data == null) return;
    if (/[^0-9.,\s +\-−]/.test(e.data)) e.preventDefault();
  }, true);
}
