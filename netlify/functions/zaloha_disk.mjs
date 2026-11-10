/* /api/zaloha_disk — NOČNÍ KOPIE NA DISK PRO SKRIPT APPS SCRIPT (#577 AS, 10. 11. 2026)
 *
 * Volá ji jen skript nastroje/apps_script/kopie_disk.gs v Google účtu J. V.
 * (časový spouštěč, bez prohlížeče). Přístup jen tokenem z proměnné
 * prostředí KNG_DISK_TOKEN v hlavičce `Authorization: Bearer …`; bez
 * proměnné (nebo kratší než 32 znaků) je cesta vypnutá → 403. Přihlášení
 * cookie tu neplatí a token neplatí nikde jinde.
 *
 *   GET                         → metadata: prostředí, čas serveru, nejnovější
 *                                 noční otisk, poslední kopie na Disku
 *                                 (vlastní prostředí), stav pojistky retence,
 *                                 stav přípravy
 *   POST { akce: 'priprav' }    → jeden krok přípravy souboru .json.gz
 *                                 (opakovat, dokud `hotovo`); hotový vrací
 *                                 jméno, SHA-256, velikost a seznam kusů
 *   GET  ?kus=<i>&otisk=<den>   → kus i (binárně, nejvýš 3 MiB)
 *   POST { akce: 'potvrdit', kopie: { soubor, otisk, sha256, velikostB } }
 *                               → záznam kopie (kopie-disk) — jen pro soubor,
 *                                 který server připravil; odemyká retenci
 *                                 podle stávajících pravidel (kopieDiskPodlozena)
 *   POST { akce: 'varovani', disk: { den, predSoubor, novySoubor,
 *          predVelikostB, novaVelikostB } }
 *                               → úbytek dat na Disku (jako retence-varovani-disk
 *                                 v zaloha_vynuceno.mjs) — jen zastaví mazání
 *
 * Bezpečnostní rozbor: BEZPECNOST_MEZE.md (B210–B214), logika
 * netlify/lib/kopie_skript.mjs. Log bez obsahu: jen akce, otisk, kus, adresa
 * (klíč počítadla) a výsledek. */
import { json, uloziste, hostitel, adresaKlienta, pokusyIpKlic, tajneShodne, vyhradne } from '../lib/sdilene.mjs';
import { posledniNocniKlic, otiskSouhrn, prostrediZalohy, kopieDiskKlic, kopieDiskVlastni, kopieDiskPodlozena, kopieDiskRozeber,
  KOPIE_DISK_SLOZKA, RETENCE_VAROVANI_KLIC, retencePoklesPocty, retenceVarovaniPridej } from '../lib/zalohovani.mjs';
import { kopieSkriptToken, tokenZHlavicky, tokenVAdrese, kopieSkriptKrok, kopieSkriptKus, kopieSkriptVerejne, retenceProSkriptCti,
  spatnyTokenZapocti, cetnostZapocti, KS_ULOZISTE, KS_STAV_KLIC, KS_POTVRZENO, KS_KDO } from '../lib/kopie_skript.mjs';

const txt = (x) => (typeof x === 'string' ? x : '');
const cislo = (x) => (typeof x === 'number' && Number.isFinite(x) ? x : NaN);
const ODEPRENO = 'Přístup odepřen: token nesedí, nebo kopie skriptem není na tomto webu zapnutá (proměnná KNG_DISK_TOKEN).';
const loguj = (req, zprava) => console.log('zaloha_disk: ' + zprava + ' [' + pokusyIpKlic(adresaKlienta(req) || 'neznama') + ']');

export default async (req) => {
  /* B211: token jen v hlavičce — parametr s tokenem v adrese se nezpracuje */
  if (tokenVAdrese(req.url)) { loguj(req, 'odmítnuto — token v adrese'); return json({ ok: false, chyba: 'Token patří do hlavičky Authorization: Bearer, nikdy do adresy.' }, 400); }
  /* B211: prohlížeč sem nepatří (token v prohlížeči = token v cizích rukou) */
  if (req.headers.get('origin')) { loguj(req, 'odmítnuto — požadavek z prohlížeče'); return json({ ok: false, chyba: ODEPRENO }, 403); }
  const ocekavany = kopieSkriptToken();
  const dany = tokenZHlavicky(req);
  if (!ocekavany || !dany || !tajneShodne(dany, ocekavany)) {
    const nad = await spatnyTokenZapocti(req);
    loguj(req, 'odmítnuto — ' + (!ocekavany ? 'cesta vypnutá' : !dany ? 'chybí token' : 'špatný token') + (nad ? ' (nad limitem)' : ''));
    return nad ? json({ ok: false, chyba: 'Příliš mnoho neplatných pokusů — zkuste to za 15 minut.' }, 429) : json({ ok: false, chyba: ODEPRENO }, 403);
  }
  const q = new URL(req.url).searchParams;
  const jeKus = req.method === 'GET' && q.has('kus');
  const limit = await cetnostZapocti(jeKus);
  if (limit) { loguj(req, 'limit — ' + limit); return json({ ok: false, chyba: 'Omezení četnosti: ' + limit + '. Zkuste to později.' }, 429); }

  if (req.method === 'GET' && jeKus) {
    const otisk = q.get('otisk') || '';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(otisk) || !/^\d{1,5}$/.test(q.get('kus'))) return json({ ok: false, chyba: 'Neplatný kus nebo otisk.' }, 400);
    const i = parseInt(q.get('kus'), 10);
    const k = await kopieSkriptKus(otisk, i);
    if (k.chyba) { loguj(req, 'kus ' + i + ' ' + otisk + ' — ' + k.kod); return json({ ok: false, chyba: k.chyba }, k.kod); }
    loguj(req, 'kus ' + i + ' ' + otisk + ' (' + k.data.length + ' B)');
    return new Response(k.data, { status: 200, headers: { 'Content-Type': 'application/octet-stream', 'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
      'Referrer-Policy': 'no-referrer', 'X-Kng-Kus-Sha256': k.sha256 } });
  }
  if (req.method === 'GET') return json(await info());
  if (req.method !== 'POST') return json({ ok: false, chyba: 'Použijte GET nebo POST.' }, 405);

  let telo = {};
  try { telo = await req.json(); } catch (e) { telo = {}; }
  if (!telo || typeof telo !== 'object' || Array.isArray(telo)) telo = {};

  if (telo.akce === 'priprav') {
    let v;
    try { v = await kopieSkriptKrok({ web: hostitel(req) || 'neznámý web' }); }
    catch (e) {
      console.error('zaloha_disk: příprava kopie selhala', e);
      return json({ ok: false, chyba: 'Příprava kopie selhala: ' + String(e && e.message || e) }, 500);
    }
    if (v.chyba) { loguj(req, 'příprava — ' + v.chyba); return json({ ok: false, chyba: v.chyba }, v.kod || 409); }
    const z = kopieSkriptVerejne(v.stav);
    loguj(req, 'příprava ' + z.otisk + ' ' + z.postup.cast + '/' + z.postup.casti + (v.bezi ? ' (běží jinde)' : '') + (z.hotovo ? ' — hotovo, ' + z.velikostB + ' B' : ''));
    return json({ ok: true, ...z, bezi: !!v.bezi });
  }
  if (telo.akce === 'potvrdit') return potvrdit(req, telo);
  if (telo.akce === 'varovani') return varovani(req, telo);
  return json({ ok: false, chyba: 'Neznámá akce.' }, 400);
};

async function info() {
  const prostredi = prostrediZalohy();
  const klic = await posledniNocniKlic();
  let nocni = null;
  if (klic) { const sh = await otiskSouhrn(await uloziste('zalohy'), klic); nocni = { otisk: klic, porizena: String((sh && sh.porizena) || '') }; }
  const sZal = await uloziste('zalohy');
  const kd = kopieDiskVlastni(await sZal.cti(kopieDiskKlic()), prostredi);
  const st = await (await uloziste(KS_ULOZISTE)).cti(KS_STAV_KLIC);
  return { ok: true, prostredi, ted: new Date().toISOString(), nocni,
    kopieDisk: kd ? { kdy: kd.kdy, soubor: kd.soubor, otisk: kd.otisk || null, zdroj: kd.zdroj || 'prohlizec',
      velikostB: kd.velikostB, velikostDatB: Number.isFinite(kd.velikostDatB) ? kd.velikostDatB : null } : null,
    retence: await retenceProSkriptCti(),
    priprava: st && st.otisk ? { otisk: st.otisk, hotovo: !!st.hotovo, postup: { cast: st.cast, casti: st.casti } } : null };
}

/* POTVRZENÍ KOPIE (B213). Token potvrdí jen soubor, který server sám připravil:
 * otisk, jméno, SHA-256 a velikost se musí shodovat s připraveným stavem.
 * Záznam pak odemyká retenci přesně jako kopie z prohlížeče potvrzená heslem
 * správce (kopieDiskPodlozena: nejnovější noční otisky, složka, SHA, velikost);
 * nic jiného token nemaže ani neodemyká. */
async function potvrdit(req, telo) {
  const k = telo.kopie && typeof telo.kopie === 'object' ? telo.kopie : {};
  const st = await (await uloziste(KS_ULOZISTE)).cti(KS_STAV_KLIC);
  if (!st || !st.hotovo) return json({ ok: false, chyba: 'Kopie není připravená — není co potvrdit.' }, 409);
  if (txt(k.otisk) !== st.otisk || txt(k.soubor) !== st.soubor || txt(k.sha256) !== st.sha256 || cislo(k.velikostB) !== st.velikostB) {
    loguj(req, 'potvrzení odmítnuto — údaje nesedí s připraveným souborem ' + st.otisk);
    return json({ ok: false, chyba: 'Údaje kopie nesedí s připraveným souborem (otisk, jméno, SHA-256 nebo velikost) — kopie se nezapočítá.' }, 409);
  }
  const prostredi = prostrediZalohy();
  const sZal = await uloziste('zalohy');
  return vyhradne('kopie-disk-zaznam', async () => {
    const vl = kopieDiskVlastni(await sZal.cti(kopieDiskKlic()), prostredi);
    const denVl = vl && /^\d{4}-\d{2}-\d{2}$/.test(String(vl.otisk || '')) ? String(vl.otisk) : '';
    if (denVl && denVl > st.otisk) return json({ ok: false, chyba: 'Na Disku už je potvrzená kopie novějšího otisku (' + denVl + ').' }, 409);
    const zaznam = { kdy: new Date().toISOString(), kdo: KS_KDO, soubor: st.soubor, velikostB: st.velikostB, sha256: st.sha256,
      otisk: st.otisk, puvod: 'nocni-otisk', slozka: KOPIE_DISK_SLOZKA, potvrzeno: KS_POTVRZENO, prostredi,
      zdroj: 'skript', velikostDatB: st.velikostDatB };
    if (!kopieDiskPodlozena(zaznam, await sZal.seznam(), prostredi))
      return json({ ok: false, chyba: 'Otisk ' + st.otisk + ' už není mezi nejnovějšími nočními otisky — kopie se nezapočítá.' }, 409);
    await sZal.zapis(kopieDiskKlic(), zaznam);
    loguj(req, 'kopie potvrzena — ' + st.soubor + ' (' + st.velikostB + ' B)');
    return json({ ok: true, kopieDisk: zaznam, retence: await retenceProSkriptCti() });
  });
}

/* ÚBYTEK NA DISKU (B214) — obdoba retence-varovani-disk (zaloha_vynuceno.mjs).
 * Zápis jen zastavuje mazání; nová kopie musí být ta připravená. */
async function varovani(req, telo) {
  const d = telo.disk && typeof telo.disk === 'object' ? telo.disk : {};
  const st = await (await uloziste(KS_ULOZISTE)).cti(KS_STAV_KLIC);
  const den = txt(d.den), predSoubor = txt(d.predSoubor), novySoubor = txt(d.novySoubor);
  const vlastni = (j) => { const r = kopieDiskRozeber(j); return !!r && !r.stary && r.prostredi === prostrediZalohy(); };
  if (!st || !st.hotovo || novySoubor !== st.soubor || den !== st.otisk || !vlastni(predSoubor) || predSoubor === novySoubor)
    return json({ ok: false, chyba: 'Neplatné údaje o kopii na Disku.' }, 400);
  const pred = { velikostB: Math.max(0, Math.floor(cislo(d.predVelikostB) || 0)) };
  const nove = { velikostB: Math.max(0, Math.floor(cislo(d.novaVelikostB) || 0)) };
  const co = retencePoklesPocty(pred, nove);
  if (!co) return json({ ok: false, chyba: 'Nová kopie není menší než předchozí — není co hlásit.' }, 409);
  const sZal = await uloziste('zalohy');
  const v = { kdy: new Date().toISOString(), den, predchozi: predSoubor, zdroj: 'disk', pred, nove,
    text: 'kopie zálohy na Disku ' + novySoubor + ' (skript) má proti ' + predSoubor + ' méně dat (' + co.join(', ') + ')' };
  await vyhradne('zalohy-varovani', async () => {
    const novy = retenceVarovaniPridej(await sZal.cti(RETENCE_VAROVANI_KLIC), v);
    if (novy) await sZal.zapis(RETENCE_VAROVANI_KLIC, novy);
  });
  loguj(req, 'varování úbytku na Disku — ' + novySoubor);
  return json({ ok: true, retence: await retenceProSkriptCti() });
}
export const config = { path: '/api/zaloha_disk' };
