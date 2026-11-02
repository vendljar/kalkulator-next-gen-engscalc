/* Posun hodin pro testy (K37-N5, 2. 11. 2026).
 *
 * src/test_z2_disk_retence.js padal od 28. 10. 2026: podvrhl Date.now, ale
 * simulovaný server vracel skutečný čas — „časovaná bomba", která zastavila
 * celé testovací kolo. Tenhle předzavaděč posune hodiny procesu o
 * KNG_POSUN_DNU dní (Date.now() i new Date() bez argumentu), takže krok
 * „hodiny" testovacího kola (nastroje/testovaci_kolo.sh) ověří, že sady
 * projdou i za rok a kus — bomba vybuchne dnes v kole, ne za rok v CI.
 *
 * Použití: KNG_POSUN_DNU=400 NODE_OPTIONS="--require $PWD/nastroje/posun_hodin.cjs" node …
 * Kontexty vm.createContext mají vlastní Date (neposunutý) — test, který
 * kontextu hodiny nepředá, běží ve skutečném čase; to je v pořádku, jen
 * nesmí míchat oba časy v jednom porovnání.
 */
'use strict';
const POSUN = Number(process.env.KNG_POSUN_DNU || 0) * 86400000;
if (POSUN && Number.isFinite(POSUN)) {
  const Puvodni = Date;
  const ted = () => Puvodni.now() + POSUN;
  class PosunutyDate extends Puvodni {
    constructor(...a) { if (a.length === 0) super(ted()); else super(...a); }
    static now() { return ted(); }
  }
  /* Volání bez new (Date()) vrací řetězec — i ten posunutý. */
  const Obal = new Proxy(PosunutyDate, { apply: () => new PosunutyDate().toString() });
  globalThis.Date = Obal;
}
