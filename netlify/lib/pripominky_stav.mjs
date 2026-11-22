/* Stav připomínek pro relaci (NN #712, PR-I1, 22. 11. 2026).
 *
 * Přihlášení i /api/ja vracejí `pripominky: { zapnuto, smiOdesilat }`, aby
 * klient při VYPNUTÝCH připomínkách po přihlášení nic nenačítal a plovoucí
 * tlačítko do stránky nevkládal (dřív GET ?nastaveni=1, u správce i seznam).
 * Chyba čtení = nic (undefined) — klient se pak zeptá postaru; přihlášení
 * kvůli připomínkám nikdy nespadne. */
import { uloziste } from './sdilene.mjs';
import P from './pripominky_modul.cjs';

export async function pripominkyStavRelace(role) {
  try {
    const n = P.pripominkyNastaveniOciste(await (await uloziste('pripominky')).cti('nastaveni'));
    return { zapnuto: !!n.zapnuto, smiOdesilat: P.pripominkySmiOdesilat(n, role) };
  } catch (e) { return undefined; }
}
