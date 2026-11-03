/* KOPIE ZÁLOH NA DISK — čisté funkce (#151 N6, dávka O4, 19. 10. 2026;
 * #554 DK, 3. 11. 2026). Od #554 (J. V.): kopie KAŽDÝ DEN — kopíruje se,
 * když v Netlify leží noční otisk novější, než jaký nese poslední kopie
 * tohoto prostředí (ne podle 24h intervalu); hlídka nad 3 dny (dřív 7 / 14).
 * Retence na Disku (7 denních + 8 nedělních + 6 prvních v měsíci) se nemění,
 * jen se tu ověřuje s denními kopiemi.
 *
 * Pojistka: na 1bf1a3a (v2.11.9, týdenní kopie) padá 7 kontrol #554
 * (pravidlo nového otisku, hlídka 3 dny); po opravě vše zelené.
 * Spuštění: node src/test_kopie_disk.js */
const U = require('./uloziste.js');
const R = require('./retence_zaloh.js');
let ok = 0, fail = 0;
const test = (n, c, info) => { if (c) { ok++; console.log('OK  ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info)); } };
const ted = Date.parse('2026-10-19T12:00:00Z');
const pred = (dnu, hod) => new Date(ted - dnu * 86400000 - (hod || 0) * 3600000).toISOString();
const S = (k, otisky) => U.uloKopieDiskStav(k, ted, undefined, otisky);
const noc = (den, hhmm) => ({ den, zdroj: 'nocni-otisk', porizena: den + 'T' + (hhmm || '01:00') + ':00Z' });

test('konstanty podle rozhodnutí J. V. (#554: hlídka 3 dny, bez týdenního intervalu)', U.ULO_KOPIE_DISK_SLOZKA === '_Zaloha Netlify DB'
  && U.ULO_KOPIE_DISK_HLIDKA_DNU === 3 && U.ULO_KOPIE_DISK_INTERVAL_DNU === undefined, [U.ULO_KOPIE_DISK_HLIDKA_DNU, U.ULO_KOPIE_DISK_INTERVAL_DNU]);
test('žádná kopie → kopírovat i varovat', S(null).potreba === true && S(null).stara === true && /zatím žádná/.test(S(null).text));
test('nečitelný záznam = žádná kopie', S({ kdy: 'x' }).potreba && S({ kdy: 'x' }).stara);

/* ---- #554: pravidlo „nový noční otisk" ---- */
{
  /* Kopie včera 15:00 (Praha 16:00) z otisku 3:00; dnes 9:00 — v noci vznikl nový otisk. */
  const t9 = Date.parse('2026-11-03T08:00:00Z');
  const kopie = { kdy: '2026-11-02T14:00:00Z', soubor: 'otisk_main_2026-11-02_0300.json.gz', otisk: '2026-11-02', prostredi: 'main' };
  const vcera = noc('2026-11-02', '02:00'), dnes = noc('2026-11-03', '02:00');
  const st = U.uloKopieDiskStav(kopie, t9, 'main', [dnes, vcera]);
  test('#554: kopie včera 15:00, dnes 9:00 s novým nočním otiskem → kopírovat', st.potreba === true && st.nocni === '2026-11-03', st);
  test('#554: … a to i když od kopie neuběhlo 24 h (dřívější floor(Δ/24 h) by vynechal)', st.dnu === 0 && st.stara === false, st);
  const bez = U.uloKopieDiskStav(kopie, t9, 'main', [vcera]);
  test('#554: bez nového nočního otisku (noční neproběhla) → nekopírovat', bez.potreba === false && bez.nocni === '2026-11-02', bez);
  test('#554: bez přehledu otisků se nic nevnucuje', U.uloKopieDiskStav(kopie, t9, 'main', []).potreba === false
    && U.uloKopieDiskStav(kopie, t9, 'main').potreba === false);
  test('#554: vynucený (ruční / při přihlášení) dnešní otisk nový noční nenahradí',
    U.uloKopieDiskStav(kopie, t9, 'main', [{ den: '2026-11-03T074500-auto', zdroj: 'vynuceno', porizena: '2026-11-03T07:45:00Z' }, vcera]).potreba === false);
  const cizi = U.uloKopieDiskStav(Object.assign({}, kopie, { otisk: '2026-11-03', prostredi: 'test' }), t9, 'main', [dnes, vcera]);
  test('#554: záznam cizího prostředí → kopírovat (vlastní kopie žádná)', cizi.potreba === true && /\(prostředí main\) .*zatím žádná/.test(cizi.text), cizi);
  test('#554: kopie z dnešního otisku → už nekopírovat', U.uloKopieDiskStav(Object.assign({}, kopie, { otisk: '2026-11-03', kdy: '2026-11-03T06:00:00Z' }), t9, 'main', [dnes, vcera]).potreba === false);
  /* Kopie bez dne otisku (aktuální stav, noční tehdy chyběl) se porovná časem. */
  const akt = { kdy: '2026-11-02T14:00:00Z', soubor: 'otisk_main_2026-11-02_1500.json.gz', otisk: null, puvod: 'aktualni-stav', prostredi: 'main' };
  test('#554: kopie aktuálního stavu, potom noční otisk → kopírovat', U.uloKopieDiskStav(akt, t9, 'main', [dnes]).potreba === true);
  test('#554: kopie aktuálního stavu po nočním otisku → nekopírovat', U.uloKopieDiskStav(akt, t9, 'main', [vcera]).potreba === false);
  test('#554: nejnovější noční se hledá v celém přehledu (pořadí nehraje roli)', typeof U.uloKopieDiskNocni === 'function' && U.uloKopieDiskNocni([vcera, dnes, noc('2026-10-30')]).den === '2026-11-03');
}

/* ---- #554: hlídka 3 dny ---- */
test('#554 hlídka: 3 dny → ještě nevarovat', S({ kdy: pred(3, 23) }).stara === false && S({ kdy: pred(3, 23) }).dnu === 3);
test('#554 hlídka: 4 dny → varovat (starší než 3 dny)', S({ kdy: pred(4), soubor: 'otisk_main_2026-10-15_0300.json.gz' }).stara === true
  && /stará 4 dní/.test(S({ kdy: pred(4), soubor: 'otisk_main_2026-10-15_0300.json.gz' }).text)
  && /otisk_main_2026-10-15_0300\.json\.gz/.test(S({ kdy: pred(4), soubor: 'otisk_main_2026-10-15_0300.json.gz' }).text));
test('#554 hlídka: text vysvětlí denní samočinnou kopii a tlačítko', /každý den sama po přihlášení správce/.test(S({ kdy: pred(5) }).text)
  && /Zkopírovat zálohu na Disk teď/.test(S({ kdy: pred(5) }).text) && !/14 dní|7 dní/.test(S({ kdy: pred(5) }).text));
test('čerstvá kopie má klidný text se jménem souboru', /Poslední kopie/.test(S({ kdy: pred(1), soubor: 'otisk_x.json' }).text));
test('jméno souboru podle dne otisku (#552: s prostředím a časem)', U.uloKopieDiskJmeno('2026-10-18', false, 'main', '2026-10-18T01:30:00Z') === 'otisk_main_2026-10-18_0330.json');
test('neplatný den → dnešek, nikdy cesta', /^otisk_main_\d{4}-\d{2}-\d{2}_\d{4}\.json$/.test(U.uloKopieDiskJmeno('../../x', false, 'main')));
test('#552: bez prostředí jméno nevznikne', U.uloKopieDiskJmeno('2026-10-18', true) === '' && U.uloKopieDiskJmeno('2026-10-18', true, '../x') === '');

/* ---- #554: retence na Disku s denními kopiemi (pravidlo se nemění) ---- */
{
  test('#554 retence: pravidlo Disku beze změny (7 dní, 8 týdnů, 6 měsíců)', JSON.stringify(R.RETENCE_ZALOH_DISK) === '{"dnu":7,"tydnu":8,"mesicu":6}');
  const DEN = 86400000, start = Date.parse('2026-11-03T00:00:00Z');
  const cizi = ['otisk_test_2026-11-03_0300.json.gz', 'otisk_test_2026-09-01_0300.json.gz', 'otisk_2026-10-18.json.gz', 'otisk_2026-10-12.json',
    'posledni_kopie_main.json', 'posledni_kopie_test.json'];
  let slozka = cizi.slice(), max = 0, smazanoVlastni = 0;
  /* rok denních kopií ostrého webu, po každé kopii úklid jako kopieDiskUklid */
  for (let i = 0; i < 400; i++) {
    const den = new Date(start + i * DEN).toISOString().slice(0, 10);
    const jm = U.uloKopieDiskJmeno(den, true, 'main', den + 'T02:05:00Z');
    slozka.push(jm);
    const pryc = R.retenceZalohDiskVyber(slozka, den, [jm], 'main');
    smazanoVlastni += pryc.length;
    slozka = slozka.filter(j => !pryc.includes(j));
    if (i > 200) max = Math.max(max, slozka.filter(j => /^otisk_main_/.test(j)).length);
  }
  test('#554 retence: denní kopie drží nejvýš 21 souborů na prostředí', max >= 15 && max <= 21, max);
  test('#554 retence: úklid opravdu maže (soubory nepřibývají donekonečna)', smazanoVlastni > 350, smazanoVlastni);
  test('#554 retence: starý tvar, cizí prostředí ani posledni_kopie se nesmažou', cizi.every(j => slozka.includes(j)), slozka.filter(j => !/^otisk_main_/.test(j)));
}

console.log('\n' + ok + ' prošlo, ' + fail + ' selhalo');
process.exit(fail ? 1 : 0);
