/* NOČNÍ OTISK DATABÁZE (plánovaná funkce, od #522 každou noc 2:00–3:45 UTC po 15 min).
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
 * Otisk nese i šablony, podpisy a přílohy — u engscalc ~114 MB za den.
 * Bez mazání by to bylo desítky GB za rok; od 19. 10. 2026 proto běží RETENCE
 * (#151 N5, od #523 Z2 nové pravidlo J. V.: 14 dní, 8 týdnů, 6 měsíců —
 * lib/zalohovani.mjs → retenceVyber, src/retence_zaloh.js): až po
 * úspěšném zápisu dnešního otisku, nikdy když selže, a (v19.10.8) jen když
 * je kopie otisků na Disku Google mladší než 7 dní. Od v20.10.2 (K3-N13)
 * se přeskočí, když nový otisk nese méně než polovinu zakázek nebo účtů
 * proti předchozímu nočnímu.
 *
 * Log (#151 N2): každý běh zapíše trvání a velikost otisku, chyba jde do logu
 * celá. Limit plánované funkce je 30 s — v Netlify → Logs → Functions →
 * zaloha_nocni je vidět, jak blízko je. */
/* PO ČÁSTECH (#522 Z1, 26. 10. 2026). Na engscalc (792 zakázek) otisk
 * jedním během nikdy nevznikl — viz lib/zalohovani.mjs (OTISK PO ČÁSTECH).
 * Funkce teď běží v noci každých 15 minut (2:00–3:45 UTC, 8 běhů). Každý
 * běh: když dnešní otisk není, pořídí z něj, co stihne za
 * OTISK_ROZPOCET.nocniMs (20 s z limitu 30 s), a uloží postup; další běh
 * naváže. Když hotový je a dnešní dokončení (retence, úklid) ještě
 * neproběhlo, provede ho — jednou za den (záznam NOCNI_DOKONCENO_KLIC).
 * Jinak skončí hned. Retence tedy dál běží jen po úspěšném dnešním otisku. */
import { JSON_HLAVICKY, uloziste } from '../lib/sdilene.mjs';
import { porizOtiskKrok, retenceProved, denDnes, OTISK_ROZPOCET, uklidRozpracovane } from '../lib/zalohovani.mjs';
import { nocniUklid } from '../lib/uklid.mjs';

/* Den, kdy noc doběhla celá (otisk + retence + úklid). */
export const NOCNI_DOKONCENO_KLIC = 'nocni-dokonceno';
/* Dokončil-li se otisk až pozdě v běhu, retence a úklid počkají na další
 * běh (mají vlastní čtení a zápisy a limit je 30 s). */
const NOCNI_DOKONCENI_DO_MS = 22000;
/* #523 Z2: retence maže do 20 s od začátku běhu (nejméně 1 s), zbytek
 * dokončí další běh téže noci — limit funkce je 30 s. */
const NOCNI_RETENCE_DO_MS = 20000;
const NOCNI_RETENCE_MIN_MS = 1000;
const odpoved = (x) => new Response(JSON.stringify(x), { headers: JSON_HLAVICKY });   // no-store a nosniff (SEC-I1, #514)

export default async () => {
  const start = Date.now();
  const den = denDnes();
  const sZal = await uloziste('zalohy');
  let v = null;
  if (!(await sZal.cti(den))) {
    try { v = await porizOtiskKrok(den, 'nocni-otisk', '', { rozpocetMs: OTISK_ROZPOCET.nocniMs }); }
    catch (e) { console.error('zaloha_nocni: otisk se nepořídil', e); throw e; }
    if (!v.hotovo) {
      const p = v.postup || {};
      if (v.bezi) console.log('zaloha_nocni: otisk ' + den + ' právě pořizuje jiný běh — tento končí');
      else console.log('zaloha_nocni: otisk ' + den + ' rozpracován — ' + p.hotovo + '/' + p.celkem + ' záznamů, '
        + p.casti + ' částí, ' + (Date.now() - start) + ' ms; naváže další běh (každých 15 min do 3:45 UTC)');
      return odpoved({ ok: true, ...v });
    }
    console.log('zaloha_nocni: otisk ' + v.den + ' — ' + v.trvaniMs + ' ms, '
      + Math.round(v.velikostB / 1024) + ' kB'
      + (v.ulozenoB && v.ulozenoB !== v.velikostB ? ' (uloženo gzip ' + Math.round(v.ulozenoB / 1024) + ' kB)' : '') + ', ' + v.pocetZakazek + ' zakázek, ' + v.pocetUctu + ' účtů'
      + ' (' + v.casti + ' částí, ' + v.kroku + ' běhů)');
    if (Date.now() - start > NOCNI_DOKONCENI_DO_MS) {
      console.log('zaloha_nocni: retence a úklid poběží v dalším běhu');
      return odpoved({ ok: true, ...v });
    }
  }
  const dok = await sZal.cti(NOCNI_DOKONCENO_KLIC);
  if (dok && dok.den === den) return odpoved({ ok: true, den, hotovo: true, dokonceno: dok.kdy });
  /* Retence (#151 N5) — sem se dojde jen po úspěšném dnešním otisku (výše
   * při chybě vyhodí, nedokončený vrátí). Její chyba otisk neohrozí. */
  let retence;
  try { retence = await retenceProved(den, undefined, undefined, { rozpocetMs: Math.max(NOCNI_RETENCE_MIN_MS, NOCNI_RETENCE_DO_MS - (Date.now() - start)) }); }
  catch (e) { retence = { smazano: [], chyby: [String(e && e.message || e)] }; }
  /* K3-N13: pokles zakázek nebo účtů pod polovinu → retence stojí, varování
   * do logu (a do hlídky v administraci přes záznam retence-varovani). */
  if (retence.varovani) console.warn('zaloha_nocni: VAROVÁNÍ — ' + retence.ceka + ' — nic se nesmazalo, zkontrolujte data');
  else if (retence.drzeno) console.warn('zaloha_nocni: ' + retence.ceka + ' — nic se nesmazalo (K4-N13)');
  else if (retence.ceka) console.log('zaloha_nocni: ' + retence.ceka + ' (záznam kopie chybí, je starší než 7 dní nebo nepodložený) — nic se nesmazalo');
  else console.log('zaloha_nocni: retence smazala ' + retence.smazano.length + ' otisků'
    + (retence.smazano.length ? ': ' + retence.smazano.join(', ') : '')
    + (retence.chyby.length ? ' · chyby: ' + retence.chyby.join('; ') : ''));
  /* #523 Z2: retence nestihla smazat všechno (první noc po novém pravidle,
   * stovky částí) → den se neuzavře, další běh téže noci (po 15 min)
   * pokračuje; úklid počká, až retence doběhne. */
  if (retence.zbyva) {
    console.log('zaloha_nocni: retence pokračuje v dalším běhu — zbývá ' + retence.zbyva + ' otisků');
    return odpoved({ ok: true, den, ...(v || {}), retence });
  }
  /* #522: opuštěné rozpracované otisky (24 h bez pohybu) a osiřelé části. */
  let rozpracovane;
  try { rozpracovane = await uklidRozpracovane(); } catch (e) { rozpracovane = { chyba: String(e && e.message || e) }; }
  /* Úklid cache Pipedrive a očista analytiky (B174, B175, dávka H1) až PO
   * otisku — jeho chyba zálohu neohrozí, jen se vrátí v odpovědi. */
  let uklid;
  try { uklid = await nocniUklid(); } catch (e) { uklid = { chyba: String(e && e.message || e) }; }
  try { await sZal.zapis(NOCNI_DOKONCENO_KLIC, { den, kdy: new Date().toISOString() }); } catch (e) { /* zopakuje se příští běh */ }
  return odpoved({ ok: true, den, ...(v || {}), retence, rozpracovane, uklid });
};
/* 2:00–3:45 UTC po 15 minutách (#522): otisk se dopořizuje po krocích. */
export const config = { schedule: '*/15 2-3 * * *' };
