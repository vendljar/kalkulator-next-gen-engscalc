/* VYNUCENÝ OTISK DATABÁZE (4. 8. 2026) – jen Administrátor.
 *
 * POST /api/zaloha_vynuceno → pořídí otisk teď hned (stejný, jaký si server
 *   bere každou noc) do vlastního slotu `<den>T<hhmmss>-rucne|-auto`
 *   (#151 N1) a vrátí { ok, den, pocetZakazek, pocetUctu, velikostB, trvaniMs }
 *   — `den` je klíč otisku.
 * POST { akce: 'kopie-disk', kopie } → záznam o kopii otisku na Disk
 *   (#151 N6); GET ho vrací jako `kopieDisk`.
 * GET  /api/zaloha_vynuceno → { ok, otisky: [ { den, porizena, zdroj, kdo,
 *   pocetZakazek, pocetUctu } … ] } – souhrn posledních otisků BEZ dat,
 *   aby bylo v obrazovce vidět, kdy záloha naposledy vznikla.
 *
 * Proč to nedělá rovnou zaloha_nocni.mjs: plánovaná funkce v Netlify vyváží
 * `config = { schedule: … }`. Přidat k ní cestu není spolehlivé (funkce je
 * pak buď plánovaná, nebo obyčejná), takže obojí sdílí knihovnu
 * lib/zalohovani.mjs a stojí vedle sebe. Do 4. 8. cesta chyběla úplně –
 * odtud „vynucené zálohování nefunguje": nebylo co vynutit.
 *
 * Otisk míří do Blobs (úložiště `zalohy`), NE ke stažení – ven se stahuje
 * /api/zaloha, která otisky hesel nenese. */
import { vyzadujRoli, json, uloziste } from '../lib/sdilene.mjs';
import { porizOtisk, seznamOtisku, klicVynuceny, KOPIE_DISK_KLIC } from '../lib/zalohovani.mjs';

export default async (req) => {
  const { chyba, relace } = await vyzadujRoli(req, 'Administrátor');
  if (chyba) return chyba;

  if (req.method === 'GET')
    return json({ ok: true, otisky: await seznamOtisku(14),
      kopieDisk: (await (await uloziste('zalohy')).cti(KOPIE_DISK_KLIC)) || null });

  if (req.method !== 'POST')
    return json({ ok: false, chyba: 'Použijte GET nebo POST.' }, 405);

  /* Vlastní slot s časem (#151 N1): noční otisk dne se nepřepíše. `duvod`
   * jen pojmenuje slot (`auto` = při přihlášení, jinak ruční). */
  let telo = {};
  try { telo = (await req.json()) || {}; } catch (e) { /* tělo je nepovinné */ }
  /* ZÁZNAM KOPIE NA DISK (#151 N6). Kopii zapisuje prohlížeč správce, server
   * si jen poznamená kdy a co — z toho hlídka (14 dní) v každém prohlížeči.
   * Jen souhrnná pole, žádná data; jméno souboru jen v bezpečném tvaru. */
  if (telo.akce === 'kopie-disk') {
    const k = telo.kopie || {};
    const soubor = String(k.soubor || '');
    if (!/^otisk_\d{4}-\d{2}-\d{2}\.json$/.test(soubor))
      return json({ ok: false, chyba: 'Neplatné jméno souboru kopie.' }, 400);
    const zaznam = { kdy: new Date().toISOString(), kdo: relace.email, soubor,
      velikostB: Math.max(0, Math.floor(+k.velikostB || 0)),
      sha256: /^[0-9a-f]{64}$/.test(String(k.sha256 || '')) ? String(k.sha256) : '',
      otisk: /^\d{4}-\d{2}-\d{2}$/.test(String(k.otisk || '')) ? String(k.otisk) : null,
      puvod: k.puvod === 'nocni-otisk' ? 'nocni-otisk' : 'aktualni-stav',
      slozka: String(k.slozka || '').slice(0, 120) };
    await (await uloziste('zalohy')).zapis(KOPIE_DISK_KLIC, zaznam);
    return json({ ok: true, kopieDisk: zaznam });
  }
  const duvod = String(telo.duvod || '');
  const v = await porizOtisk('vynuceno', relace.email, klicVynuceny(duvod));
  return json({ ok: true, ...v });
};
export const config = { path: '/api/zaloha_vynuceno' };
