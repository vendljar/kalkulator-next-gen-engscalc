/* ============================================================
 * OTISK ONLINE DATABÁZE (4. 8. 2026)
 *
 * Proč vlastní knihovna: do 4. 8. uměla otisk jen plánovaná funkce
 * zaloha_nocni.mjs, která vyváží `export const config = { schedule: … }`
 * a ŽÁDNOU cestu. Ručně se tedy vyvolat nedala, nikde se nedalo zjistit,
 * jestli kdy proběhla, a v obrazovce to vypadalo, že „vynucené zálohování
 * nefunguje" – ono totiž nebylo co vynutit. Pořízení otisku proto bydlí
 * tady a používají ho dvě funkce: plánovaná (noční) a obyčejná cesta
 * /api/zaloha_vynuceno pro administrátora.
 *
 * Otisk leží v úložišti `zalohy`, klíč = datum (jeden noční za den).
 * Vynucený otisk (ruční, při přihlášení) má od 19. 10. 2026 vlastní slot
 * s časem — viz klicVynuceny (#151 N1). Uživatelé se ukládají CELÍ včetně otisků hesel: otisk
 * zůstává ve stejném Blobs jako ostrá data a nikdy neopouští server, takže
 * obnova nevyžaduje reset všech hesel. Ven (na Disk Google) míří jiná
 * záloha – functions/zaloha.mjs, ta otisky hesel nenese.
 * ============================================================ */
import { uloziste, SMAZANI_ULOZISTE } from './sdilene.mjs';

export function denDnes(kdy) {
  return new Date(kdy || Date.now()).toISOString().slice(0, 10);
}

/* ČTENÍ PO DÁVKÁCH (#151 N2, 19. 10. 2026). Do 19. 10. četl otisk každý
 * záznam zvlášť a postupně — stovky čtení po desítkách ms. Plánovaná funkce
 * má v Netlify limit 30 s; po jeho překročení skončí bez zápisu a výpadek
 * odhalí až hlídka (#152) po 48 hodinách. Čte se proto paralelně po
 * skupinách (ne všechno naráz — tisíc souběžných požadavků by Blobs
 * přiškrtil). Výsledek drží pořadí klíčů. */
export const DAVKA_CTENI = 20;
export async function ctiPoDavkach(s, klice) {
  const out = [];
  for (let i = 0; i < klice.length; i += DAVKA_CTENI)
    out.push(...await Promise.all(klice.slice(i, i + DAVKA_CTENI).map(k => s.cti(k))));
  return out;
}
async function ctiCele(s, prefix) {
  const klice = await s.seznam(prefix);
  const hodnoty = await ctiPoDavkach(s, klice);
  const o = {};
  klice.forEach((k, i) => { o[prefix ? k.slice(prefix.length) : k] = hodnoty[i]; });
  return o;
}

/* Doplňky zálohy (bezpečnostní audit 22. 8. 2026, nález B9).
 *
 * Do 22. 8. nesla záloha program, firmu, zakázky, účty a šablony — a NIC
 * z toho, co přibylo později: kartotéku zákazníků (#162, celé úložiště
 * `zakaznici`), skeny podpisů (`podpisy`, #145) ani matici zobrazení
 * (`program/zobrazeni`, #136). Komentáře u nich tvrdily opak. Po obnově by
 * zmizel seznam zákazníků, podpisy všech obchodníků a práva zobrazení.
 * Jedno místo pro obě zálohy (noční otisk i ruční stažení), aby se příště
 * nerozešly. */
export async function zalohaDoplnky() {
  const sProg = await uloziste('program');
  const [zobrazeni, popisy, slovnik] = await ctiPoDavkach(sProg, ['zobrazeni', 'popisy', 'slovnik']);
  /* Dodatkové texty položek (22. 9. 2026) leží ve stejném úložišti pod
   * vlastním klíčem. Bez tohohle řádku by je obnova ze zálohy tiše smazala —
   * přesně ta chyba, kvůli které vznikl nález B9 (`popisy` výše).
   * Zveřejněný slovník (#401, 12. 10. 2026) — totéž poučení jako B9 a B104:
   * co se ukládá, musí být v záloze, jinak ho obnova tiše smaže (`slovnik`).
   * Úplnost hlídá netlify/test_zaloha_uplnost.mjs (#151 N4). */
  const zakaznici = await ctiCele(await uloziste('zakaznici'));
  const podpisy = await ctiCele(await uloziste('podpisy'));
  /* KNIHA SMAZANÝCH ÚČTŮ (23. 9. 2026, nález B58). Kdo, kdy a koho smazal —
   * bez ní by po obnově z nulové databáze zmizela jediná stopa po smazání
   * a obnova by neměla podle čeho odmítnout oživení smazaného účtu. */
  const smazani = await ctiCele(await uloziste(SMAZANI_ULOZISTE));
  return { zobrazeni: zobrazeni || null,
           smazani: Object.keys(smazani).length ? smazani : null,
           popisy: popisy || null,
           slovnik: slovnik || null,
           zakaznici: Object.keys(zakaznici).length ? zakaznici : null,
           podpisy: Object.keys(podpisy).length ? podpisy : null };
}

/* Klíč otisku před obnovou (7. 9. 2026). Otisk pořízený těsně před obnovou
 * databáze NESMÍ ležet pod dnešním datem: kdyby se obnovovalo z dnešního
 * otisku, přepsal by zdroj obnovy sám sebe stavem před obnovou a cesta
 * zpátky by zmizela.
 *
 * Od 9. 9. 2026 (bezpečnostní audit, B28) nese klíč i ČAS: `<den>T<hhmmss>
 * -pred-obnovou`. Do té doby byl jeden slot na den a druhá obnova téhož dne
 * — nebo opakování po selhané dávce, které obrazovka sama nabízí — přepsala
 * jedinou cestu zpátky stavem napůl obnovené databáze. Vlastní slot na
 * každou obnovu stojí místo v úložišti (obnova je vzácná, administrátorská
 * akce), ale nikdy nezničí to, kvůli čemu otisk vznikl. Starší klíče bez
 * času zůstávají platné (OTISK_KLIC), z přehledu nemizí. */
export const OTISK_KLIC = /^\d{4}-\d{2}-\d{2}(-pred-obnovou|T\d{6}-(pred-obnovou|rucne|auto))?$/;

/* Kolik otisků „před obnovou" se drží v přehledu (nález B52, 14. 9. 2026).
 * Vlastní limit, aby série pokusů o obnovu nevytlačila denní zálohy — viz
 * komentář v seznamOtisku(). Otisky se tím nemažou, jen se nezobrazují
 * všechny: smazat cestu zpátky smí jedině člověk. */
export const OTISKY_PRED_OBNOVOU_LIMIT = 10;
export function klicPredObnovou(kdy) {
  const d = new Date(kdy || Date.now()).toISOString();      // 2026-09-09T15:30:12.345Z
  return d.slice(0, 10) + 'T' + d.slice(11, 19).replace(/:/g, '') + '-pred-obnovou';
}

/* KLÍČ VYNUCENÉHO OTISKU (#151 N1, 19. 10. 2026). Do 19. 10. mířil ruční
 * „Zálohovat teď" i otisk při přihlášení správce pod dnešní datum — tedy
 * PŘES noční otisk z 2:00. Pokazila-li se data dopoledne a správce pak
 * zálohoval, přepsal poslední dobrý stav; a hlídka (#152) ten den noční
 * otisk neviděla, takže kdo zálohoval ručně denně, dostal falešné varování.
 * Klíč `YYYY-MM-DD` teď patří jen noční funkci; vynucený otisk má vlastní
 * slot s časem `<den>T<hhmmss>-rucne` (resp. `-auto` při přihlášení),
 * stejně jako otisk před obnovou. */
export function klicVynuceny(druh, kdy) {
  const d = new Date(kdy || Date.now()).toISOString();
  return d.slice(0, 10) + 'T' + d.slice(11, 19).replace(/:/g, '') + (druh === 'auto' ? '-auto' : '-rucne');
}
/* Kolik vynucených otisků se drží v přehledu — vlastní limit jako u otisků
 * před obnovou (B52), aby deset kliknutí nevytlačilo noční zálohy a hlídka
 * (#152) mezi nimi pořád našla poslední noční. */
export const OTISKY_VYNUCENE_LIMIT = 10;
/* Souhrn otisku (#151 N3) leží vedle něj pod `souhrn/<klíč>`. */
export const souhrnKlic = (klic) => 'souhrn/' + klic;

/* `klic` je nepovinný: bez něj otisk míří pod dnešní datum (noční záloha),
 * s ním pod zadaný slot (vynucený otisk — klicVynuceny, otisk před obnovou
 * — klicPredObnovou). */
export async function porizOtisk(zdroj, kdo, klic) {
  const zacatek = Date.now();
  const den = klic || denDnes();
  const sProg = await uloziste('program');
  const [program, firma] = await ctiPoDavkach(sProg, ['db', 'firma']);   // firma od 4. 8. 2026 online (functions/firma.mjs)

  const zak = await uloziste('zakazky');
  const zakazky = await ctiCele(zak, 'z/');
  const rejstrik = await zak.cti('_rejstrik');

  /* celé účty včetně otisků hesel (viz výše); náhrobky (null) se vynechají */
  const uzivatele = Object.values(await ctiCele(await uloziste('uzivatele'))).filter(Boolean);

  /* Centrální šablony dokumentů (#139) – celé úložiště včetně souborů,
   * stejně jako v záloze ke stažení. Bez nich by obnova vrátila aplikaci
   * bez šablon a v přísném režimu by se nedala vytisknout jediná nabídka. */
  const sablony = await ctiCele(await uloziste('sablony'));

  const otisk = {
    porizena: new Date().toISOString(),
    zdroj: String(zdroj || 'nocni-otisk'),
    kdo: String(kdo || ''),
    program: program || null, firma: firma || null,
    rejstrik: rejstrik || null, zakazky, uzivatele,
    sablony: Object.keys(sablony).length ? sablony : null,
    ...(await zalohaDoplnky()),              // zobrazeni, popisy, slovnik, zakaznici, podpisy (B9), smazani (B58)
  };
  const sZal = await uloziste('zalohy');
  await sZal.zapis(den, otisk);
  /* Velikost a trvání (#151 N2): do odpovědi i do logu funkce, aby J. V.
   * v Netlify viděl, jak blízko je noční běh limitu 30 s. */
  const velikostB = Buffer.byteLength(JSON.stringify(otisk));
  const souhrn = { den, porizena: otisk.porizena, zdroj: otisk.zdroj, kdo: otisk.kdo,
    pocetZakazek: Object.keys(zakazky).length, pocetUctu: uzivatele.length,
    velikostB, trvaniMs: Date.now() - zacatek };
  /* SOUHRN VEDLE OTISKU (#151 N3). Přehled záloh do 19. 10. četl až 24
   * celých otisků (u schaftscalc ~20 MB každý) jen kvůli dvěma počtům.
   * Souhrn se zapisuje AŽ PO otisku: když se nepovede, otisk platí
   * a přehled si počty dočte z něj jako dřív. */
  try { await sZal.zapis(souhrnKlic(den), souhrn); } catch (e) { /* přehled má záložní cestu */ }
  return { den, pocetZakazek: souhrn.pocetZakazek, pocetUctu: souhrn.pocetUctu,
           velikostB, trvaniMs: souhrn.trvaniMs };
}

/* Souhrn pro obrazovku – vědomě BEZ dat. Kdyby seznam vozil obsah otisků,
 * stačilo by otevřít vývojářskou konzoli a přečíst celou databázi jedním
 * požadavkem; tady jde jen o to, kdy naposledy záloha vznikla.
 * Řadí se od nejnovější, protože obrazovku zajímá poslední otisk. */
export async function seznamOtisku(kolik) {
  const s = await uloziste('zalohy');
  /* Otisky před obnovou (7. 9. 2026) patří do přehledu taky — jsou to cesty
   * zpátky, ze kterých se dá obnovovat. Řetězcové řazení je dá hned před
   * den, ke kterému patří. */
  const vsechny = (await s.seznam()).filter(k => OTISK_KLIC.test(k)).sort().reverse();
  /* DENNÍ A „PŘED OBNOVOU" MAJÍ VLASTNÍ LIMITY (nález B52, 14. 9. 2026).
   *
   * Každý pokus o obnovu pořídí plný otisk `…Thhmmss-pred-obnovou`. Ty jsou
   * v řetězcovém řazení vyšší než denní otisk téhož dne, takže deset pokusů
   * za odpoledne vytlačilo z přehledu čtrnácti nejvyšších klíčů úplně
   * všechny denní zálohy — a správce, který hledal včerejší stav, ho v seznamu
   * nenašel. Přitom tam ležel; jen nebyl vidět, což je horší než kdyby tam
   * nebyl vůbec.
   *
   * Seznamy se proto vedou odděleně: denní otisky mají celý limit, otisky
   * před obnovou svých posledních deset. Totéž od 19. 10. 2026 (#151 N1)
   * vynucené otisky s časem (`-rucne`, `-auto`). */
  const jePredObnovou = (k) => k.indexOf('-pred-obnovou') >= 0;
  const jeVynuceny = (k) => /T\d{6}-(rucne|auto)$/.test(k);
  const denni = vsechny.filter(k => !jePredObnovou(k) && !jeVynuceny(k));
  const predObnovou = vsechny.filter(jePredObnovou);
  const vynucene = vsechny.filter(jeVynuceny);
  const limit = Math.max(1, kolik || 14);
  const vybrane = denni.slice(0, limit)
    .concat(predObnovou.slice(0, OTISKY_PRED_OBNOVOU_LIMIT))
    .concat(vynucene.slice(0, OTISKY_VYNUCENE_LIMIT))
    .sort().reverse();
  /* Souhrny (#151 N3) po dávkách; otisk bez souhrnu (pořízený před 19. 10.)
   * se dočte celý jako dřív. */
  const souhrny = await ctiPoDavkach(s, vybrane.map(souhrnKlic));
  const otisky = [];
  for (let i = 0; i < vybrane.length; i++) {
    const den = vybrane[i];
    const sh = souhrny[i];
    if (sh && sh.porizena) {
      otisky.push({ den, porizena: String(sh.porizena), zdroj: String(sh.zdroj || ''), kdo: String(sh.kdo || ''),
        pocetZakazek: +sh.pocetZakazek || 0, pocetUctu: +sh.pocetUctu || 0 });
      continue;
    }
    const o = await s.cti(den);
    if (!o) continue;
    otisky.push({
      den,
      porizena: String(o.porizena || ''),
      zdroj: String(o.zdroj || ''),
      kdo: String(o.kdo || ''),
      pocetZakazek: Object.keys(o.zakazky || {}).length,
      pocetUctu: (o.uzivatele || []).length,
    });
  }
  return otisky;
}
