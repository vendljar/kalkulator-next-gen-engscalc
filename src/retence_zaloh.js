/* ============================================================
 * RETENCE ZÁLOH — KOLIK ZÁLOH SE DRŽÍ (#523 Z2, rozhodnutí J. V. 26. 10. 2026)
 *
 * Jediné místo, kde žije pravidlo „které zálohy zůstanou". Používají ho
 * DVĚ strany:
 *   - server (netlify/lib/zalohovani.mjs → retenceVyber) pro otisky
 *     v Netlify Blobs (úložiště `zalohy`), přes netlify/lib/retence_modul.cjs;
 *   - prohlížeč správce (src/ui/online_ui.js → kopieDiskUklid) pro kopie
 *     `otisk_RRRR-MM-DD.json(.gz)` ve složce „_Zaloha Netlify DB" na Disku.
 * Dvě kopie téhož pravidla by se časem rozešly — proto jeden modul.
 *
 * Pravidlo J. V. 26. 10. 2026 (nahrazuje #151 N5 z 19. 10.):
 *   Blobs: denní (noční) otisky 14 dní; týdenní 8 týdnů; měsíční 6 měsíců;
 *          vynucené (ruční, při přihlášení) 7 dní; „před obnovou" nikdy.
 *   Disk:  denní 7 dní; týdenní 8 týdnů; měsíční 6 měsíců.
 *
 * Výklad (výchozí volby dávky Z2, zdůvodnění v CHANGELOG):
 *   - věk = počet dní od data zálohy do dneška (UTC), dnešek je den 0;
 *     „14 dní" = věk 0–13, 14. den se maže (stejně jako dřív u 30 dní);
 *   - TÝDEN = pondělí až neděle; týdenní záloha = ta z neděle, a když
 *     neděle chybí, nejbližší starší v témže týdnu (= nejnovější záloha
 *     týdne); drží se, dokud není starší než 8 × 7 = 56 dní;
 *   - MĚSÍČNÍ záloha = první (nejstarší) záloha kalendářního měsíce; drží se,
 *     dokud není starší než 6 kalendářních měsíců (z 26. 4. se maže záloha
 *     z 26. 10. a starší, z 27. 10. zůstane);
 *   - záloha s datem v budoucnosti (posunuté hodiny) se nemaže;
 *   - nejnovější záloha se nesmaže nikdy, ať je jakkoli stará;
 *   - Blobs, STARÉ OTISKY (datum před RETENCE_ZALOH_STARE_PRED = 20. 10.
 *     2026): výjimka „staré nikdy" (RETENCE_OD) je zrušená. Ze starých
 *     zůstane jen první otisk každého měsíce (měsíční, 6 měsíců), ostatní
 *     smí retence smazat — i když by je jinak držel denní nebo týdenní
 *     pravidlo (J. V.: „ze starých otisků zůstane jeden z každého měsíce").
 *
 * Čisté funkce, žádný přístup k úložišti ani k hodinám — dnešek se předává.
 * ============================================================ */
const RETENCE_ZALOH_BLOBS = { dnu: 14, tydnu: 8, mesicu: 6, vynuceneDnu: 7 };
const RETENCE_ZALOH_DISK = { dnu: 7, tydnu: 8, mesicu: 6 };
const RETENCE_ZALOH_STARE_PRED = '2026-10-20';
const RETENCE_ZALOH_DEN_MS = 86400000;

function retenceZalohDenMs(d) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(d || ''))) return NaN;
  const t = Date.parse(d + 'T00:00:00Z');
  /* 2026-02-31 Date.parse přijme a posune — takové datum za datum nebereme */
  return Number.isFinite(t) && new Date(t).toISOString().slice(0, 10) === d ? t : NaN;
}

/* Hranice měsíční zálohy: stejný den o `mesicu` měsíců zpět (31. 8. → 28./29. 2.). */
function retenceZalohMesicuZpet(dnesMs, mesicu) {
  const d = new Date(dnesMs);
  const r = d.getUTCFullYear(), m = d.getUTCMonth() - mesicu;
  const posledni = new Date(Date.UTC(r, m + 1, 0)).getUTCDate();
  return Date.UTC(r, m, Math.min(d.getUTCDate(), posledni));
}

/* Které DNY (RRRR-MM-DD) zůstanou. Vrací Map den → důvod ('nejnovější',
 * 'denní', 'týdenní', 'měsíční'), nebo null, když dnešek není platné datum
 * (pak se nesmí mazat nic). `opt.stareJenMesicni` = datum, před kterým
 * zůstává jen měsíční a nejnovější záloha (staré otisky v Blobs). */
function retenceZalohDrz(dny, dnes, pravidlo, opt) {
  const dnesMs = retenceZalohDenMs(dnes);
  if (!Number.isFinite(dnesMs) || !pravidlo) return null;
  const o = opt || {};
  const platne = [...new Set((dny || []).map(String))].filter(d => Number.isFinite(retenceZalohDenMs(d))).sort();
  const drz = new Map();
  if (!platne.length) return drz;
  const vek = (d) => Math.round((dnesMs - retenceZalohDenMs(d)) / RETENCE_ZALOH_DEN_MS);
  const stary = (d) => !!o.stareJenMesicni && d < o.stareJenMesicni;
  const pridej = (d, proc) => { if (!drz.has(d)) drz.set(d, proc); };
  pridej(platne[platne.length - 1], 'nejnovější');
  /* týdny (pondělí) a měsíce → zástupce */
  const tydny = new Map(), mesice = new Map();
  for (const d of platne) {
    const t = retenceZalohDenMs(d);
    const pondeli = new Date(t - ((new Date(t).getUTCDay() + 6) % 7) * RETENCE_ZALOH_DEN_MS).toISOString().slice(0, 10);
    tydny.set(pondeli, d);                       // vzestupně → zůstane poslední (neděle / nejbližší starší)
    if (!mesice.has(d.slice(0, 7))) mesice.set(d.slice(0, 7), d);   // první v měsíci
  }
  const hraniceMesicu = retenceZalohMesicuZpet(dnesMs, pravidlo.mesicu);
  for (const d of mesice.values())
    if (retenceZalohDenMs(d) > hraniceMesicu) pridej(d, 'měsíční');
  for (const d of platne) {
    if (stary(d)) continue;
    if (vek(d) < pravidlo.dnu) pridej(d, 'denní');      // i budoucí (záporný věk)
  }
  for (const d of tydny.values()) {
    if (stary(d)) continue;
    if (vek(d) < pravidlo.tydnu * 7) pridej(d, 'týdenní');
  }
  return drz;
}

/* KOPIE NA DISKU. Bere se JEN soubor přesně tvaru otisk_RRRR-MM-DD.json
 * nebo otisk_RRRR-MM-DD.json.gz — cokoli jiného (posledni_kopie.json,
 * zaloha_online_…, otisk_2026-10-26 (1).json, podsložky) se nikdy nemaže. */
const RETENCE_ZALOH_DISK_JMENO = /^otisk_(\d{4}-\d{2}-\d{2})\.json(\.gz)?$/;
/* `jmena` = jména souborů ve složce, `chranit` = jména, která se nesmažou
 * nikdy (právě zapsaná kopie). Vrací jména ke smazání (seřazená). */
function retenceZalohDiskVyber(jmena, dnes, chranit) {
  const soubory = [...new Set((jmena || []).map(String))]
    .map(j => { const m = RETENCE_ZALOH_DISK_JMENO.exec(j); return m && Number.isFinite(retenceZalohDenMs(m[1])) ? { j, d: m[1] } : null; })
    .filter(Boolean);
  const drz = retenceZalohDrz(soubory.map(x => x.d), dnes, RETENCE_ZALOH_DISK);
  if (!drz) return [];
  const chranene = new Set((chranit || []).map(String));
  const chraneneDny = new Set(soubory.filter(x => chranene.has(x.j)).map(x => x.d));
  return soubory.filter(x => !drz.has(x.d) && !chranene.has(x.j) && !chraneneDny.has(x.d)).map(x => x.j).sort();
}

/* POJISTKA PROTI TICHÉ ZTRÁTĚ DAT (K3-N13 20. 10. 2026; rozšířeno #523 Z2,
 * pokyn J. V. 26. 10. 2026: „Zálohy se musí v čase zvětšovat; nenadálé
 * zmenšení musí být oznámené a schválené, jinak se staré zálohy nesmí
 * mazat."). Nová záloha proti předchozí je ÚBYTEK, když má
 *   - velikost dat < 90 % (nekomprimovaná velikost — gzip ji nezkreslí),
 *   - zakázek nebo účtů < 95 %,
 *   - šablon nebo podpisů méně (jakýkoli pokles).
 * Do 26. 10. platil jen pokles zakázek/účtů pod 50 %. Prahy jsou výchozí
 * volba koordinace — mění se JEN tady. Údaj, který některá záloha nenese
 * (starší otisk bez počtu šablon), se neporovnává. Vrací seznam textů
 * („zakázek 100 → 94") nebo null. Používá server (noční otisk proti
 * předchozímu nočnímu) i prohlížeč (kopie na Disku proti předchozí kopii). */
const RETENCE_ZALOH_POJISTKA = { velikost: 0.9, pocty: 0.95 };
function retenceZalohMB(b) { return (b / 1048576).toFixed(1).replace('.', ',') + ' MB'; }
function retenceZalohPokles(pred, nove) {
  if (!pred || !nove) return null;
  const c = (x) => (typeof x === 'number' && Number.isFinite(x) && x >= 0 ? x : null);
  const P = RETENCE_ZALOH_POJISTKA;
  const co = [];
  const pv = c(pred.velikostB), nv = c(nove.velikostB);
  if (pv !== null && pv > 0 && nv !== null && nv < pv * P.velikost)
    co.push('velikost ' + retenceZalohMB(pv) + ' → ' + retenceZalohMB(nv) + ' (' + Math.round(100 * nv / pv) + ' %)');
  for (const [k, nazev] of [['pocetZakazek', 'zakázek'], ['pocetUctu', 'účtů']]) {
    const a = c(pred[k]), b = c(nove[k]);
    if (a !== null && a > 0 && b !== null && b < a * P.pocty) co.push(nazev + ' ' + a + ' → ' + b);
  }
  for (const [k, nazev] of [['pocetSablon', 'šablon'], ['pocetPodpisu', 'podpisů']]) {
    const a = c(pred[k]), b = c(nove[k]);
    if (a !== null && b !== null && b < a) co.push(nazev + ' ' + a + ' → ' + b);
  }
  return co.length ? co : null;
}

/* Text pro obrazovku a příručku — ať se nerozejde s čísly výš. */
function retenceZalohPopis() {
  const b = RETENCE_ZALOH_BLOBS, d = RETENCE_ZALOH_DISK;
  return {
    blobs: 'Netlify: noční zálohy ' + b.dnu + ' dní, z každého týdne nedělní ' + b.tydnu + ' týdnů, z každého měsíce první '
      + b.mesicu + ' měsíců; ruční a automatické zálohy ' + b.vynuceneDnu + ' dní; zálohy před obnovou se nemažou.',
    disk: 'Disk Google: kopie ' + d.dnu + ' dní, z každého týdne nedělní ' + d.tydnu + ' týdnů, z každého měsíce první '
      + d.mesicu + ' měsíců.',
  };
}

if (typeof module !== 'undefined')
  module.exports = { RETENCE_ZALOH_POJISTKA, retenceZalohPokles, RETENCE_ZALOH_BLOBS, RETENCE_ZALOH_DISK, RETENCE_ZALOH_STARE_PRED, RETENCE_ZALOH_DISK_JMENO,
    retenceZalohDenMs, retenceZalohMesicuZpet, retenceZalohDrz, retenceZalohDiskVyber, retenceZalohPopis };
