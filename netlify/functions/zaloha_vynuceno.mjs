/* VYNUCENÝ OTISK DATABÁZE (4. 8. 2026) – jen Administrátor.
 *
 * POST /api/zaloha_vynuceno → pořídí otisk teď hned (stejný, jaký si server
 *   bere každou noc) do vlastního slotu `<den>T<hhmmss>-rucne|-auto`
 *   (#151 N1) a vrátí { ok, den, pocetZakazek, pocetUctu, velikostB, trvaniMs }
 *   — `den` je klíč otisku.
 * POST { akce: 'kopie-disk', kopie, hesloSpravce } → záznam o kopii otisku
 *   na Disk (#151 N6); GET ho vrací jako `kopieDisk`. Od v20.10.2 (K3-N1,
 *   J. V.) jen s heslem správce a jen ze složky „_Zaloha Netlify DB".
 * Vynucený otisk má limit 1 za 10 min a 20 za 24 h (K3-N4) → jinak 429.
 * GET vrací i `retenceVarovani` (K3-N13) pro hlídku v administraci.
 * POST { akce: 'retence-varovani-disk', disk } → prohlížeč ohlásí menší kopii
 *   na Disku (#523); zapíše se varování a retence stojí do potvrzení.
 * POST { akce: 'retence-potvrdit', den, hesloSpravce } → správce potvrdí, že
 *   úbytek dat byl záměrný; retence pak zase maže (K4-N13, O11).
 * GET  /api/zaloha_vynuceno → { ok, otisky: [ { den, porizena, zdroj, kdo,
 *   pocetZakazek, pocetUctu, casti? } … ] } – souhrn posledních otisků BEZ dat,
 *   aby bylo v obrazovce vidět, kdy záloha naposledy vznikla. Od #522 i
 *   `otiskStav` (poslední pokus: hotovo / rozpracováno / chyba s důvodem)
 *   a `rozpracovane` (nedokončené otisky s postupem).
 *
 * PO KROCÍCH (#522 Z1, 26. 10. 2026): otisk se pořizuje po částech a jeden
 * požadavek udělá jen tolik, kolik stihne za OTISK_ROZPOCET.synchronniMs.
 * Odpověď nese `hotovo`; když je false, prohlížeč posílá
 * POST { akce: 'pokracovat', klic: <den z odpovědi> }, dokud není hotovo.
 * Chyba otisku vrací 500 s důvodem (dřív padla funkce bez hlášky).
 *
 * Proč to nedělá rovnou zaloha_nocni.mjs: plánovaná funkce v Netlify vyváží
 * `config = { schedule: … }`. Přidat k ní cestu není spolehlivé (funkce je
 * pak buď plánovaná, nebo obyčejná), takže obojí sdílí knihovnu
 * lib/zalohovani.mjs a stojí vedle sebe. Do 4. 8. cesta chyběla úplně –
 * odtud „vynucené zálohování nefunguje": nebylo co vynutit.
 *
 * Otisk míří do Blobs (úložiště `zalohy`), NE ke stažení – ven se stahuje
 * /api/zaloha, která otisky hesel nenese. */
import { vyzadujRoli, json, uloziste, potvrdHesloSpravce } from '../lib/sdilene.mjs';
import { seznamOtisku, KOPIE_DISK_KLIC, KOPIE_DISK_SLOZKA, porizVynuceny,
  RETENCE_VAROVANI_KLIC, retenceDrzena, retencePoklesPocty, vynucenyPokracuj, seznamRozpracovanych,
  OTISK_STAV_KLIC, OTISK_ROZPOCET } from '../lib/zalohovani.mjs';

/* K4-N12 (O9): pole z těla jen jako text / číslo. String() nad objektem
 * z JSON s klíčem „toString", který není funkce, vyhodil výjimku → 500. */
const txt = (x) => (typeof x === 'string' ? x : '');
const cislo = (x) => (typeof x === 'number' && Number.isFinite(x) ? x : 0);

export default async (req) => {
  const { chyba, relace } = await vyzadujRoli(req, 'Administrátor');
  if (chyba) return chyba;

  if (req.method === 'GET') {
    const sZal = await uloziste('zalohy');
    return json({ ok: true, otisky: await seznamOtisku(14),
      kopieDisk: (await sZal.cti(KOPIE_DISK_KLIC)) || null,
      retenceVarovani: (await sZal.cti(RETENCE_VAROVANI_KLIC)) || null,
      otiskStav: (await sZal.cti(OTISK_STAV_KLIC)) || null,              // #522
      rozpracovane: await seznamRozpracovanych() });
  }

  if (req.method !== 'POST')
    return json({ ok: false, chyba: 'Použijte GET nebo POST.' }, 405);

  /* Vlastní slot s časem (#151 N1): noční otisk dne se nepřepíše. `duvod`
   * jen pojmenuje slot (`auto` = při přihlášení, jinak ruční). */
  let telo = {};
  try { telo = (await req.json()) || {}; } catch (e) { /* tělo je nepovinné */ }
  /* ZÁZNAM KOPIE NA DISK (#151 N6). Kopii zapisuje prohlížeč správce, server
   * si jen poznamená kdy a co — z toho hlídka (14 dní) v každém prohlížeči.
   * Jen souhrnná pole, žádná data; jméno souboru jen v bezpečném tvaru. */
  if (!telo || typeof telo !== 'object' || Array.isArray(telo)) telo = {};
  if (telo.akce === 'kopie-disk') {
    const k = (telo.kopie && typeof telo.kopie === 'object') ? telo.kopie : {};
    const soubor = txt(k.soubor);
    if (!/^otisk_\d{4}-\d{2}-\d{2}\.json(\.gz)?$/.test(soubor))   // #523: komprimovaná kopie .json.gz
      return json({ ok: false, chyba: 'Neplatné jméno souboru kopie.' }, 400);
    /* K3-N1 (rozhodnutí J. V. 20. 10. 2026): záznam odemyká retenci, proto
     * jen kopie do složky „_Zaloha Netlify DB" a jen s heslem správce —
     * kdo má jen cookie, retenci neodemkne. Složka se kontroluje dřív než
     * heslo, aby špatná složka nespotřebovala pokus. */
    if (txt(k.slozka) !== KOPIE_DISK_SLOZKA)
      return json({ ok: false, chyba: 'Kopie zálohy se počítá jen ve složce „' + KOPIE_DISK_SLOZKA + '" na Disku Google. '
        + 'Vyberte tuto složku (tlačítko „Zkopírovat zálohu na Disk teď") a kopii pořiďte znovu.' }, 400);
    { const stop = await potvrdHesloSpravce(req, relace, telo.hesloSpravce); if (stop) return stop; }
    const zaznam = { kdy: new Date().toISOString(), kdo: relace.email, soubor,
      velikostB: Math.max(0, Math.floor(cislo(k.velikostB))),
      sha256: /^[0-9a-f]{64}$/.test(txt(k.sha256)) ? txt(k.sha256) : '',
      otisk: /^\d{4}-\d{2}-\d{2}$/.test(txt(k.otisk)) ? txt(k.otisk) : null,
      puvod: k.puvod === 'nocni-otisk' ? 'nocni-otisk' : 'aktualni-stav',
      slozka: KOPIE_DISK_SLOZKA, potvrzeno: 'heslo-spravce' };
    const sZal = await uloziste('zalohy');
    await sZal.zapis(KOPIE_DISK_KLIC, zaznam);
    /* #523: prohlížeč před úklidem Disku potřebuje čerstvý stav pojistky */
    return json({ ok: true, kopieDisk: zaznam, retenceVarovani: (await sZal.cti(RETENCE_VAROVANI_KLIC)) || null });
  }
  /* ÚBYTEK NA DISKU (#523 Z2, pokyn J. V. 26. 10. 2026). Prohlížeč před
   * úklidem starých kopií porovná velikost nové kopie s předchozí; je-li
   * menší než 90 %, nemaže a ohlásí to sem. Server porovnání přepočítá
   * (text varování píše on, ne prohlížeč) a zapíše varování — tím stojí
   * i retence v Netlify, dokud to správce nepotvrdí (`retence-potvrdit`).
   * Nepotvrzené varování, které už je, se nepřepíše (správce potvrzuje to,
   * které vidí). Zápis jen zastavuje mazání, proto stačí relace správce. */
  if (telo.akce === 'retence-varovani-disk') {
    const d = (telo.disk && typeof telo.disk === 'object') ? telo.disk : {};
    const den = txt(d.den), predSoubor = txt(d.predSoubor), novySoubor = txt(d.novySoubor);
    const jmeno = /^otisk_\d{4}-\d{2}-\d{2}\.json(\.gz)?$/;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(den) || !jmeno.test(predSoubor) || !jmeno.test(novySoubor))
      return json({ ok: false, chyba: 'Neplatné údaje o kopii na Disku.' }, 400);
    const pred = { velikostB: Math.max(0, Math.floor(cislo(d.predVelikostB))) };
    const nove = { velikostB: Math.max(0, Math.floor(cislo(d.novaVelikostB))) };
    const co = retencePoklesPocty(pred, nove);
    if (!co) return json({ ok: false, chyba: 'Nová kopie není menší než předchozí — není co hlásit.' }, 409);
    const sZal = await uloziste('zalohy');
    const byl = await sZal.cti(RETENCE_VAROVANI_KLIC);
    if (retenceDrzena(byl)) return json({ ok: true, retenceVarovani: byl });
    const zaznam = { kdy: new Date().toISOString(), den, predchozi: predSoubor, zdroj: 'disk', pred, nove,
      text: 'kopie zálohy na Disku ' + novySoubor + ' má proti ' + predSoubor + ' méně dat (' + co.join(', ') + ')' };
    await sZal.zapis(RETENCE_VAROVANI_KLIC, zaznam);
    return json({ ok: true, retenceVarovani: zaznam });
  }
  /* POTVRZENÍ ÚBYTKU DAT (K4-N13, O11, rozhodnutí J. V. 21. 10. 2026).
   * Po úbytku dat stojí retence, dokud správce nepotvrdí, že byl
   * záměrný (od #523 bez časového uvolnění). Potvrzení odemyká mazání, proto jako záznam
   * kopie jen s heslem správce. `den` = den varování, které správce viděl:
   * novější varování se starým potvrzením neodemkne (409). */
  if (telo.akce === 'retence-potvrdit') {
    const sZal = await uloziste('zalohy');
    const v = await sZal.cti(RETENCE_VAROVANI_KLIC);
    if (!retenceDrzena(v))
      return json({ ok: false, chyba: 'Není co potvrdit — retence záloh nestojí (varování chybí nebo je potvrzené).' }, 409);
    if (txt(telo.den) !== String(v.den || ''))
      return json({ ok: false, chyba: 'Varování se mezitím změnilo — načtěte přehled záloh znovu a zkontrolujte ho.' }, 409);
    const stopHeslo = await potvrdHesloSpravce(req, relace, telo.hesloSpravce);
    if (stopHeslo) return stopHeslo;
    const zaznam = { ...v, potvrzeno: { kdy: new Date().toISOString(), kdo: relace.email } };
    await sZal.zapis(RETENCE_VAROVANI_KLIC, zaznam);
    return json({ ok: true, retenceVarovani: zaznam });
  }
  /* #522: pokračování rozpracovaného vynuceného otisku. */
  if (telo.akce === 'pokracovat') {
    let v;
    try { v = await vynucenyPokracuj(txt(telo.klic), { rozpocetMs: OTISK_ROZPOCET.synchronniMs }); }
    catch (e) { return otiskChyba(e); }
    if (v.chyba) return json({ ok: false, chyba: v.chyba }, 404);
    return json({ ok: true, ...v });
  }
  const duvod = txt(telo.duvod);
  /* K3-N4: limit vynucených otisků; 429 řekne, kdy to půjde znovu.
   * K4-N5 (O9): kontrola i rezervace slotu před pořízením (porizVynuceny). */
  let v;
  try { v = await porizVynuceny(duvod, relace.email, { rozpocetMs: OTISK_ROZPOCET.synchronniMs }); }
  catch (e) { return otiskChyba(e); }
  if (v.limit) return json({ ok: false, kod: 'limitZalohy', chyba: v.limit.chyba, dalsi: new Date(v.limit.dalsiMs).toISOString() }, 429);
  return json({ ok: true, ...v });
};
/* #522: selhání otisku řekne proč — do logu celé, do obrazovky důvod. */
function otiskChyba(e) {
  console.error('zaloha_vynuceno: otisk se nepořídil', e);
  return json({ ok: false, kod: 'otiskChyba',
    chyba: 'Záloha se nepořídila: ' + String(e && e.message || e) + '. Podrobnosti jsou v Netlify → Logs → Functions → zaloha_vynuceno.' }, 500);
}
export const config = { path: '/api/zaloha_vynuceno' };
