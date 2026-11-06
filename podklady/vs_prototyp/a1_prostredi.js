/* PROTOTYP VS (#570) — vrstva A1: offline prostředí (vkládá se PŘED aplikaci).
 * Žádná síť, nic se neukládá. Stejná vrstva běží i ve srovnávacím snímku
 * „čistého" main, takže rozdíl prototypu proti main dělá jen vrstva B. */
(function () {
  try { window.fetch = function () { return Promise.reject(new TypeError('PROTOTYP: síť je vypnutá')); }; } catch (e) {}
  try {
    const X = window.XMLHttpRequest && window.XMLHttpRequest.prototype;
    if (X) { X.send = function () { const x = this; setTimeout(() => { try { x.dispatchEvent(new Event('error')); } catch (e) {} }, 0); }; }
  } catch (e) {}
  try { if (navigator.sendBeacon) navigator.sendBeacon = function () { return false; }; } catch (e) {}
  try { Storage.prototype.setItem = function () { throw new Error('PROTOTYP: nic se neukládá'); }; } catch (e) {}
  try { Object.defineProperty(window, 'indexedDB', { value: undefined, configurable: true }); } catch (e) {}
  try { window.open = function () { return null; }; } catch (e) {}
})();
