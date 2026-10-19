/* VYNUCENÝ OTISK DATABÁZE (4. 8. 2026) – jen Administrátor.
 *
 * POST /api/zaloha_vynuceno → pořídí otisk teď hned (stejný, jaký si server
 *   bere každou noc) do vlastního slotu `<den>T<hhmmss>-rucne|-auto`
 *   (#151 N1) a vrátí { ok, den, pocetZakazek, pocetUctu, velikostB, trvaniMs }
 *   — `den` je klíč otisku.
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
import { vyzadujRoli, json } from '../lib/sdilene.mjs';
import { porizOtisk, seznamOtisku, klicVynuceny } from '../lib/zalohovani.mjs';

export default async (req) => {
  const { chyba, relace } = await vyzadujRoli(req, 'Administrátor');
  if (chyba) return chyba;

  if (req.method === 'GET')
    return json({ ok: true, otisky: await seznamOtisku(14) });

  if (req.method !== 'POST')
    return json({ ok: false, chyba: 'Použijte GET nebo POST.' }, 405);

  /* Vlastní slot s časem (#151 N1): noční otisk dne se nepřepíše. `duvod`
   * jen pojmenuje slot (`auto` = při přihlášení, jinak ruční). */
  let duvod = '';
  try { duvod = String(((await req.json()) || {}).duvod || ''); } catch (e) { /* tělo je nepovinné */ }
  const v = await porizOtisk('vynuceno', relace.email, klicVynuceny(duvod));
  return json({ ok: true, ...v });
};
export const config = { path: '/api/zaloha_vynuceno' };
