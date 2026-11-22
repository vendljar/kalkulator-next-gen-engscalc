/* NN B237 (22. 11. 2026): razítko verze je povinné — tělo bez
 * `ocekavaneRazitko` nad existující zakázkou = 409. Starší sady ukládaly
 * zakázku opakovaně bez razítka (spoléhaly na výjimku „starší klient bez
 * pole"). Skutečný klient razítko posílá vždy (online_ui.js onlineUloz),
 * proto mu sady tady razítko doplní z úložiště v paměti: hledá uloženou
 * zakázku se stejným číslem nabídky (OCK, jinak PROJ). Tělo, které razítko
 * nebo `prepsat` už nese, se nemění — testy kolizí si razítko volí samy. */
export function doplnRazitko(url, telo, pamet) {
  if (!/\/api\/zakazky(\?|$)/.test(String(url)) || !telo || typeof telo !== 'object' || !telo.zakazka
    || Object.prototype.hasOwnProperty.call(telo, 'ocekavaneRazitko') || telo.prepsat) return telo;
  const z = telo.zakazka;
  const cislo = String(z.cislo || '') || String((z.projHlavicka && z.projHlavicka.cislo) || '');
  if (!cislo) return telo;
  for (const [k, v] of pamet) {
    if (!k.startsWith('zakazky/z/')) continue;
    let u; try { u = JSON.parse(v); } catch (e) { continue; }
    const c = String(u.cislo || '') || String((u.projHlavicka && u.projHlavicka.cislo) || '');
    if (c === cislo) return Object.assign({}, telo, { ocekavaneRazitko: typeof u.uloRazitko === 'string' ? u.uloRazitko : '' });
  }
  return telo;
}
