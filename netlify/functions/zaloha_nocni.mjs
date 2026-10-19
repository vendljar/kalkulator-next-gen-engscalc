/* NOČNÍ OTISK DATABÁZE (plánovaná funkce, běží každou noc ve 2:00 UTC).
 *
 * Proč vedle „odlévání" na Disk Google ještě tohle: záloha na Disk vzniká
 * jen tehdy, když se administrátor přihlásí v prohlížeči. Kdyby se týden
 * nikdo nepřihlásil a mezitím se něco pokazilo, chyběla by záloha úplně.
 * Noční otisk se pořizuje sám, bez lidí, a leží PŘÍMO v Netlify Blobs
 * (úložiště `zalohy`, klíč = datum). Odtud se dá obnovit i stav ke
 * konkrétnímu dni.
 *
 * Samotné pořízení otisku dělá lib/zalohovani.mjs – sdílí ho s cestou
 * /api/zaloha_vynuceno, kterou si administrátor zálohu vyvolá ručně
 * a kterou se dá zjistit, kdy záloha naposledy vznikla. Do 4. 8. 2026 tu
 * ležel celý kód otisku a žádná cesta k němu nevedla; „vynucené zálohování"
 * proto nemělo co vynutit.
 *
 * Uživatelé se ukládají CELÍ včetně otisků hesel – otisk zůstává ve stejném
 * úložišti jako ostrá data a nikdy neopouští server, takže obnova nevyžaduje
 * reset všech hesel (otisk hesla není heslo: scrypt se solí).
 *
 * Klíčů neubývá (jeden za den ≈ 365 za rok). Otisk nese i šablony, podpisy
 * a přílohy — u schaftscalc kolem 20 MB, tedy ~7 GB za rok; o retenci
 * rozhodne J. V. (#151 N5), mazání jen vědomou dávkou.
 *
 * Log (#151 N2): každý běh zapíše trvání a velikost otisku, chyba jde do logu
 * celá. Limit plánované funkce je 30 s — v Netlify → Logs → Functions →
 * zaloha_nocni je vidět, jak blízko je. */
import { porizOtisk } from '../lib/zalohovani.mjs';
import { nocniUklid } from '../lib/uklid.mjs';

export default async () => {
  let v;
  try { v = await porizOtisk('nocni-otisk', ''); }
  catch (e) { console.error('zaloha_nocni: otisk se nepořídil', e); throw e; }
  console.log('zaloha_nocni: otisk ' + v.den + ' — ' + v.trvaniMs + ' ms, '
    + Math.round(v.velikostB / 1024) + ' kB, ' + v.pocetZakazek + ' zakázek, ' + v.pocetUctu + ' účtů');
  /* Úklid cache Pipedrive a očista analytiky (B174, B175, dávka H1) až PO
   * otisku — jeho chyba zálohu neohrozí, jen se vrátí v odpovědi. */
  let uklid;
  try { uklid = await nocniUklid(); } catch (e) { uklid = { chyba: String(e && e.message || e) }; }
  return new Response(JSON.stringify({ ok: true, ...v, uklid }), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' } });
};
export const config = { schedule: '0 2 * * *' };
