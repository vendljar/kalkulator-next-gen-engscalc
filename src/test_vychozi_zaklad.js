/* ===== SLOUPEC VÝCHOZÍ: ZÁKLAD MUSÍ SEDĚT S NOVOU ZAKÁZKOU =====
 * (16. 9. 2026, nález J. V.: „stále nám nefunguje zaškrtávání výchozích
 *  položek" — potřetí, pokaždé z jiné příčiny)
 *
 * Matice zobrazení neukládá hodnoty, ale ODCHYLKY: co se rovná základu, se
 * z matice maže (zobrazeniPolozkaVychoziNastav). Z toho plyne jediné, ale
 * tvrdé pravidlo:
 *
 *     ZÁKLAD, PROTI KTERÉMU SE SLOUPEC KRESLÍ, SE MUSÍ ROVNAT TOMU,
 *     S ČÍM NOVÁ ZAKÁZKA DOOPRAVDY ZAČÍNÁ.
 *
 * Jakmile se ty dvě strany rozejdou, sloupec přestane jít přepnout. U
 * přechodových plechů se to stalo: kreslily se proti `DEFAULT_ZADANI`
 * (true), zakládaly se ze `ZADANI_NOVA` (false). Zaškrtávátko svítilo
 * zapnuté, nová zakázka plechy neměla — a klikání nepomohlo ani jedním
 * směrem. Zapnuto = shoda se základem, neuloží se nic. Vypnuto = uloží se
 * false, což je proti nové zakázce zase nic. Sloupec byl mrtvý.
 *
 * Proto se tu netestuje zápis, ale CELÉ KOLEČKO: správce zaškrtne → matice →
 * nová zakázka → jádro. Chyba byla v mezeře mezi dvěma kroky a každý z nich
 * sám o sobě fungoval.
 */
const eng = require('./engine.js');
const ZC = require('./zkusebni_cenik.js');
const JEKLY = require('./jekly.json');

global.DEFAULT_ZADANI = JSON.parse(JSON.stringify(eng.DEFAULT_ZADANI));
global.DEFAULT_CENIK = ZC.zkusebniCenik();
const engProj = require('./engine_proj.js');
global.DEFAULT_ZADANI_PROJ = JSON.parse(JSON.stringify(engProj.DEFAULT_ZADANI_PROJ));
global.DEFAULT_CENIK_PROJ = ZC.zkusebniCenikProj();
global.DEFAULT_TECHSPEC = require('./techspec.js').DEFAULT_TECHSPEC;
const pz = require('./poznamky.js');
Object.keys(pz).forEach(k => { global[k] = pz[k]; });
const zk = require('./zakazka.js');
const ZOB = require('./zobrazeni.js');

let ok = 0, fail = 0;
const test = (n, cond, info) => {
  if (cond) { ok++; console.log('OK  ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info)); }
};

const novaZadani = () => zk.novaZakazka().varianty[0].data.ock.zadani;
/* Co má nová zakázka doopravdy — bez ohledu na to, kde se ta hodnota bere. */
const skutecnost = (zad, key) => (key === 'prechodove')
  ? !!zad.prechodovePlechy : !!zad.volitelne[key];

/* ---------- 1) základ sedí pro KAŽDOU volitelnou položku ---------- */
{
  const zad = novaZadani();
  const klice = Object.keys(zad.volitelne);
  test('nová zakázka nějaké volitelné položky má', klice.length > 0, klice.length);
  klice.forEach(k => {
    test('základ sloupce Výchozí sedí s novou zakázkou: ' + k,
      zk.vychoziZakladVolitelne(k) === skutecnost(zad, k),
      { zaklad: zk.vychoziZakladVolitelne(k), novaZakazka: skutecnost(zad, k) });
  });
  /* Plechy mají v zadání vlastní pole, takže v `volitelne` být nemusí —
   * zkontrolují se zvlášť, ať na ně cyklus výš nespoléhá. */
  test('a sedí i u přechodových plechů, které mají vlastní pole',
    zk.vychoziZakladVolitelne('prechodove') === !!zad.prechodovePlechy,
    { zaklad: zk.vychoziZakladVolitelne('prechodove'), novaZakazka: !!zad.prechodovePlechy });
  test('nová zakázka plechy nemá (a základ to tvrdí taky)',
    zad.prechodovePlechy === false && zk.vychoziZakladVolitelne('prechodove') === false);
  /* Tohle je ta past: DEFAULT_ZADANI je má zapnuté, ZADANI_NOVA vypnuté.
   * Kdyby se základ bral z DEFAULT_ZADANI, byli bychom zpátky u mrtvého
   * sloupce. */
  test('DEFAULT_ZADANI a ZADANI_NOVA se u plechů OPRAVDU liší — past je živá',
    !!eng.DEFAULT_ZADANI.prechodovePlechy === true && zk.ZADANI_NOVA.prechodovePlechy === false);
}

/* ---------- 1b) základ z nové zakázky OPRAVDU teče ----------
 *
 * Testy výš by prošly i tehdy, kdyby byl základ zadrátovaný napevno — dnes
 * by dával stejná čísla. Ověřeno mutací: `return false` i `return
 * !!D.prechodovePlechy` prolezly, protože se shodou okolností trefily.
 * Že hodnota teče ze správného zdroje, se pozná jedině tak, že se ten zdroj
 * změní a základ se musí hnout s ním. */
{
  const puvPl = zk.ZADANI_NOVA.prechodovePlechy;
  zk.ZADANI_NOVA.prechodovePlechy = !puvPl;
  const hnulSe = zk.vychoziZakladVolitelne('prechodove') === !puvPl;
  zk.ZADANI_NOVA.prechodovePlechy = puvPl;
  test('základ plechů se hne, když se hne nová zakázka (není zadrátovaný)', hnulSe);

  /* ZADANI_NOVA dnes sekci `volitelne` nemá — přebíjí jen pár polí zadání.
   * Kdyby ji někdy dostala, základ ji musí poslechnout, jinak se obě strany
   * zase rozejdou a sloupec zase umře. */
  const meloVol = Object.prototype.hasOwnProperty.call(zk.ZADANI_NOVA, 'volitelne');
  const puvVol = zk.ZADANI_NOVA.volitelne;
  /* Ne `prechodove` — ten jde zvláštní větví přes `prechodovePlechy`
   * a obecnou cestu by netestoval. (Napoprvé jsem si vybral zrovna jeho.) */
  const klic = Object.keys(novaZadani().volitelne).find(k => k !== 'prechodove');
  const zakl0 = zk.vychoziZakladVolitelne(klic);
  zk.ZADANI_NOVA.volitelne = { [klic]: !zakl0 };
  const hnulSe2 = zk.vychoziZakladVolitelne(klic) === !zakl0;
  if (meloVol) zk.ZADANI_NOVA.volitelne = puvVol; else delete zk.ZADANI_NOVA.volitelne;
  test('a kdyby nová zakázka přebila i volitelnou položku, základ ji poslechne',
    hnulSe2, { klic, zaklad: zakl0 });
  test('úklid po sobě: ZADANI_NOVA je zpátky, jak byla',
    zk.ZADANI_NOVA.prechodovePlechy === puvPl
    && Object.prototype.hasOwnProperty.call(zk.ZADANI_NOVA, 'volitelne') === meloVol);
}

/* ---------- 2) celé kolečko: správce zaškrtne → nová zakázka to má ---------- */

/* Typ šachty se vybírá podle položky: zábradlí se nabízí jen v interiéru,
 * háky a sokl jen v exteriéru. Zkusit napevno jednu šachtu znamená, že
 * polovina položek v katalogu není a test „neprojde" z úplně jiného důvodu,
 * než který zkoumá. */
/* `ctenyKlic` odděluje ZAŠKRTÁVÁTKO od POLOŽKY, na kterou se pak koukáme.
 * Obvykle je to totéž, ale u přechodových plechů ne: přepíná se materiál
 * a ptáme se, co to udělalo s montáží. */
function koleckoOck(key, zapnout, ctenyKlic) {
  const mat = {};
  ZOB.zobrazeniPolozkaVychoziNastav(mat, 'ock.' + key, zapnout, zk.vychoziZakladVolitelne(key));
  const ulozeno = mat.vychozi ? mat.vychozi['ock.' + key] : undefined;
  for (const typ of ['exteriérová', 'interiérová']) {
    const zad = novaZadani();
    ZOB.zobrazeniVychoziAplikuj(mat, zad, null);
    zad.typSachty = typ;
    const r = eng.vypocet(JSON.parse(JSON.stringify(zad)), ZC.zkusebniCenik(), JEKLY, false);
    const k = r.volitelneKatalog.find(x => x.key === (ctenyKlic || key));
    if (k) return { ulozeno, typ, zahrnuto: k.zahrnuto, mnozstvi: +k.mnozstvi };
  }
  return { ulozeno, typ: null, zahrnuto: null, mnozstvi: null };
}

{
  const zap = koleckoOck('prechodove', true);
  test('správce zaškrtne plechy ve sloupci Výchozí → matice si to zapamatuje',
    zap.ulozeno === true, zap);
  test('a nová zakázka je pak opravdu má v základní ceně',
    zap.zahrnuto === true, zap);
  test('a to s nenulovým množstvím, ne za nula korun',
    zap.mnozstvi > 0, zap);

  const vyp = koleckoOck('prechodove', false);
  test('odškrtnutí je proti základu shoda, takže se do matice nic neukládá',
    vyp.ulozeno === undefined, vyp);
  test('a nová zakázka plechy nemá', vyp.zahrnuto === false, vyp);
}

{
  /* Totéž musí platit pro OSTATNÍ volitelné položky — oprava plechů nesměla
   * rozbít sloupec zbytku tabulky. */
  const zad = novaZadani();
  Object.keys(zad.volitelne).filter(key => key !== 'prechMont').forEach(key => {
    const puv = skutecnost(zad, key);
    const k = koleckoOck(key, !puv);
    test('sloupec Výchozí přepne i položku ' + key,
      k.zahrnuto === !puv, { chteno: !puv, dostal: k.zahrnuto, ulozeno: k.ulozeno });
  });
}

{
  /* MONTÁŽ PLECHŮ VLASTNÍ PŘEDNASTAVENÍ NEMÁ (16. 9. 2026). Od rozhodnutí
   * „Plechy mají vždy 2 položky" jde montáž s materiálem, takže obě řádky
   * tabulky píší do `ock.prechodove` — viz `adminKoncBunky` v kalk_ock.js.
   * Kdyby si montáž nesla vlastní klíč, vznikl by tím přesně ten mrtvý
   * sloupec, kvůli kterému tahle sada existuje: zaškrtnutí by se uložilo
   * a nová zakázka by ho přehlédla. Zkouší se proto to, co dělá skutečné
   * zaškrtávátko — přepnutí materiálu musí pohnout OBĚMA položkami. */
  const zapM = koleckoOck('prechodove', true, 'prechMont');
  test('zaškrtnutí plechů ve sloupci Výchozí přednastaví i jejich montáž',
    zapM.zahrnuto === true, zapM);
  test('a to s nenulovým množstvím, ne jen odškrtnutým řádkem',
    zapM.mnozstvi > 0, zapM);
  const vypM = koleckoOck('prechodove', false, 'prechMont');
  test('odškrtnutí plechů vezme montáž taky — dvojice drží i v přednastavení',
    vypM.zahrnuto === false, vypM);
}

/* ---------- 3) sloupec se dá přepnout OBĚMA směry ----------
 *
 * Tohle je ta chyba doslova: u mrtvého sloupce vycházelo zapnuto i vypnuto
 * stejně, takže klikání nic neměnilo. Test se proto ptá na ROZDÍL. */
{
  const zad = novaZadani();
  /* `prechMont` se vynechává, protože vlastní zaškrtávátko v tom sloupci
   * nemá (viz blok výš) — ptát se na jeho rozdíl by znamenalo zkoušet klíč,
   * který rozhraní vůbec nenabízí. */
  const klice = Object.keys(zad.volitelne).concat(['prechodove'])
    .filter(key => key !== 'prechMont');
  const mrtve = klice.filter(key => {
    const a = koleckoOck(key, true).zahrnuto;
    const b = koleckoOck(key, false).zahrnuto;
    return a === b;
  });
  test('žádná položka nemá mrtvý sloupec Výchozí (zapnuto ≠ vypnuto)',
    mrtve.length === 0, mrtve);
}

/* ---------- 4) UI se ptá jádra, ne vlastní kopie pravidla ---------- */
{
  const fs = require('fs');
  const ui = fs.readFileSync(__dirname + '/ui/kalk_ock.js', 'utf8');
  test('volitelneVychoziZaklad deleguje na pravidlo v jádře',
    ui.indexOf('return vychoziZakladVolitelne(key);') >= 0);
  /* Vlastní kopie pravidla v UI by se rozešla při první změně na jedné
   * straně — a právě z rozejití dvou stran celá tahle chyba vznikla. */
  test('a nemá vlastní kopii, která by se mohla rozejít',
    ui.indexOf('D.prechodovePlechy') < 0);
  test('sloupec se pořád kreslí z toho základu',
    ui.indexOf("vychoziPolozkaChk('ock.' + vychKey, volitelneVychoziZaklad(vychKey)") >= 0);
  /* Tohle drží tu výjimku výš. Bez téhle kontroly by stačilo vrátit montáži
   * vlastní klíč a sada by mlčela — `prechMont` totiž z obou behaviorálních
   * kontrol vynechávám právě proto, že žádný vlastní nemá. */
  test('montáž plechů se ve sloupci Výchozí veze na klíči materiálu',
    ui.indexOf("(key === 'prechMont') ? 'prechodove' : key") >= 0);
  /* Starší zakázka si ruční nastavení montáže drží (J. V.: „zpětně neřeš"),
   * ale nesmí v něm uvíznout: samostatné zaškrtávátko montáže už neexistuje,
   * takže kliknutí na plechy to pole musí uvolnit. */
  test('kliknutí na plechy zahodí staré ruční nastavení montáže',
    ui.indexOf("set('Z.volitelne.prechMont', null)") >= 0);
}

/* ---------- 5) matice nesmí novou zakázku vyřadit z pravidla o dvojici ----
 *
 * `volitelne.prechMont` má dvojí význam: hodnota = „tahle zakázka je z dob
 * vlastního přepínače". Kdyby ji do nové zakázky zapsala matice Výchozí,
 * tvářila by se tak i zakázka právě založená a montáž by se přestala řídit
 * materiálem. Matice v sobě přitom takový klíč mít MŮŽE — zbyl tam z doby,
 * kdy montáž vlastní sloupec měla. */
{
  /* Klíč musí být `true`. S `false` by test neměřil nic: výchozí hodnota pole
   * je null a cyklus zapisuje jen při ROZDÍLU v pravdivosti, takže false
   * proti null neprojde tak jako tak. Škodí právě `true` — a zrovna to je
   * hodnota, kterou tam sloupec Výchozí u montáže do 16. 9. 2026 zapisoval. */
  const mat = { vychozi: { 'ock.prechMont': true, 'ock.prechodove': false } };
  const zad = novaZadani();
  ZOB.zobrazeniVychoziAplikuj(mat, zad, null);
  test('matice do volitelne.prechMont nesahá ani se starým klíčem',
    zad.volitelne.prechMont == null, zad.volitelne.prechMont);
  const r = eng.vypocet(JSON.parse(JSON.stringify(zad)), ZC.zkusebniCenik(), JEKLY, false);
  const m = r.volitelneKatalog.find(x => x.key === 'prechMont');
  const mt = r.volitelneKatalog.find(x => x.key === 'prechodove');
  /* Materiál je v matici vypnutý, takže montáž musí být vypnutá taky. Kdyby
   * matice `prechMont` prosadila, vznikla by přesně ta vada z 5. kola: montáž
   * účtovaná za nástupiště bez jediného plechu — a rovnou v NOVÉ zakázce. */
  test('takže nová zakázka má montáž podle materiálu, ne podle matice',
    !!m && m.zahrnuto === false && !!mt && mt.zahrnuto === false,
    m && { mont: m.zahrnuto, mat: mt && mt.zahrnuto });
}

console.log('\n' + (fail ? 'SELHALO ' + fail + ' z ' + (ok + fail) : 'OK ' + ok));
if (fail) process.exit(1);
