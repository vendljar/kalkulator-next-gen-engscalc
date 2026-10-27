/* ===== M8 (pokyn J. V. 27. 10. 2026): PŘÍRUČKA ADMINISTRÁTORA =====
 *
 * „Kompletní balíček informací" pro správce: kapitoly A1–An
 * (manual/admin/obsah.json, snímky manual/snimky_admin.mjs) + celá příručka
 * obchodníka jako část B, sestavené manual/admin/sestav.sh do šablony
 * manual/sablona.html (spojení dělá manual/admin/spojit.js v prohlížeči).
 *
 * Hlídá se:
 *  (a) obsah: titul, řádek verze, žádné „Co je nového", kapitoly A číslované
 *      A1, A2 … bez děr, id `kap-a-…` bez opakování, kapitoly s akcí mají
 *      postup krok za krokem (výjimky vyjmenované i s důvodem);
 *  (b) snímky sedí s textem: každý snímek, na který obsah odkazuje,
 *      manual/snimky_admin.mjs opravdu pořizuje, a každý pořízený snímek
 *      obsah použije (jinak by nesl data, která nikdo nečte);
 *  (c) bezpečnost obsahu: e-maily jen vymyšlené, žádná hodnota tajné
 *      proměnné, žádné částky v Kč, příručka říká, že hesla nenese;
 *      zadaná témata balíčku (zálohy, retence, scénáře, Netlify, GitHub…);
 *  (d) sestav.sh: se zástupnými snímky sestaví jeden soubor, odmítne výstup
 *      v repozitáři, snímky z jiného prostředí i z jiné verze;
 *  (e) je-li playwright: sestavená příručka projde manual/admin/overit.js
 *      (bez kontroly cílů kliknutí — zástupné snímky je nenesou): část A
 *      před částí B, B nepřečíslovaná, obsah, kroky, popisky.
 *
 * Pojistka: nad 1820f81 (před M8) selže hned (a) — manual/admin/ neexistuje.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

let ok = 0, fail = 0;
const test = (n, cond, info) => {
  if (cond) { ok++; console.log('OK  ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info)); }
};
const KOREN = path.join(__dirname, '..');
const ADMIN = path.join(KOREN, 'manual', 'admin');
const cti = (p) => { try { return fs.readFileSync(p, 'utf8'); } catch (e) { return null; } };
const konec = () => {
  console.log('\n' + ok + ' OK, ' + fail + ' FAIL');
  process.exit(fail ? 1 : 0);
};

const OBSAH_TXT = cti(path.join(ADMIN, 'obsah.json'));
test('(a) manual/admin/obsah.json existuje', !!OBSAH_TXT);
const SKRIPT = cti(path.join(KOREN, 'manual', 'snimky_admin.mjs'));
test('(b) manual/snimky_admin.mjs existuje', !!SKRIPT);
for (const f of ['sestav.sh', 'spojit.js', 'overit.js'])
  test('(d) manual/admin/' + f + ' existuje', fs.existsSync(path.join(ADMIN, f)));
if (!OBSAH_TXT || !SKRIPT) konec();
const OBSAH = JSON.parse(OBSAH_TXT);

// ---- (a) obsah ----------------------------------------------------------------
test('(a) titul je příručka administrátora', /příručka administrátora/.test(OBSAH.titul || ''));
test('(a) řádek verze nese verzi aplikace a datum sestavení',
  /^Platí pro aplikaci v\d+\.\d+\.\d+ · sestaveno \d{1,2}\. \d{1,2}\. \d{4}$/.test(OBSAH.verze || ''), OBSAH.verze);
test('(a) obsah nemá „Co je nového" (#524)', !/Co je nového/i.test(OBSAH_TXT));
const kap = OBSAH.kapitoly || [];
test('(a) kapitol A je aspoň 12', kap.length >= 12, kap.length);
test('(a) id kapitol mají předponu kap-a- a neopakují se',
  kap.every(k => /^kap-a-[a-z0-9-]+$/.test(k.id)) && new Set(kap.map(k => k.id)).size === kap.length,
  kap.map(k => k.id));
const cisla = kap.map(k => Number((k.nadpis.match(/^A(\d+)\. /) || [])[1]));
test('(a) kapitoly jsou A1, A2 … bez děr', cisla.every((c, i) => c === i + 1), cisla);
/* Kapitoly bez postupu — přehledy, ve kterých správce nic nekliká. */
const BEZ_POSTUPU = {
  'kap-a-potize': 'přehled potíží a jejich řešení — každé řešení odkazuje na postup jinde',
  'kap-a-pristupy': 'seznam přístupů a kontaktů',
  'kap-a-disk-pd': 'popis složek Disku a stavu Pipedrive — nastavuje se mimo aplikaci',
};
const bezKroku = kap.filter(k => !BEZ_POSTUPU[k.id] && !(k.bloky || []).some(b => b.typ === 'kroky')).map(k => k.id);
test('(a) kapitoly s akcí mají postup krok za krokem', bezKroku.length === 0, bezKroku);
test('(a) výjimky bez postupu jsou skutečné kapitoly', Object.keys(BEZ_POSTUPU).every(id => kap.some(k => k.id === id)));
const typy = new Set(['text', 'podnadpis', 'obrazek', 'kroky', 'seznam', 'ram', 'odrazky', 'tabulka']);
test('(a) bloky jsou jen typy, které šablona umí', kap.every(k => (k.bloky || []).every(b => typy.has(b.typ))));
test('(a) úvod (varování) je jeden rámeček', (OBSAH.uvod || []).length === 1);
test('(a) obsah nemá „</script" (rozbil by příručku)', !/<\/script/i.test(OBSAH_TXT));

// ---- (b) snímky sedí s textem -------------------------------------------------
const pouzite = new Set();
for (const k of kap) for (const b of k.bloky || []) {
  if (b.typ === 'obrazek') pouzite.add(b.snimek);
  if (b.typ === 'kroky') for (const p of b.polozky || []) if (p.snimek) pouzite.add(p.snimek);
}
const porizene = new Set();
for (const m of SKRIPT.matchAll(/vezmi\('([a-z0-9-]*[a-z0-9])'/g)) porizene.add(m[1]);
/* Celé krátké panely Nastavení se fotí smyčkou: 'a-nast-' + id ze seznamu CELE. */
const cele = (SKRIPT.match(/const CELE = \[([^\]]*)\]/) || [])[1] || '';
for (const m of cele.matchAll(/'([a-z]+)'/g)) porizene.add('a-nast-' + m[1]);
const chybi = [...pouzite].filter(id => !porizene.has(id));
const navic = [...porizene].filter(id => !pouzite.has(id));
test('(b) obsah používá aspoň 25 snímků', pouzite.size >= 25, pouzite.size);
test('(b) každý snímek z obsahu skript pořizuje', chybi.length === 0, chybi);
test('(b) každý pořízený snímek obsah použije', navic.length === 0, navic);
test('(b) snímky správce mají předponu a- (nekříží se s příručkou obchodníka)',
  [...porizene].every(id => /^a-/.test(id)));
test('(b) skript fotí v testovacím prostředí nad zkušebním ceníkem',
  /process\.env\.PROSTREDI = 'test'/.test(SKRIPT) && /zkusebni_cenik\.js/.test(SKRIPT));
test('(b) skript výstup do repozitáře nezapíše', /snímky se do repozitáře neukládají/.test(SKRIPT));
const kroku = kap.reduce((n, k) => n + (k.bloky || []).filter(b => b.typ === 'kroky')
  .reduce((m, b) => m + (b.polozky || []).length, 0), 0);
test('(b) postupů je dost (aspoň 50 kroků)', kroku >= 50, kroku);

// ---- (c) bezpečnost a témata --------------------------------------------------
const maily = (OBSAH_TXT.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g) || [])
  .filter(m => !/@(priklad\.cz|example\.com)$/i.test(m));
test('(c) žádný skutečný e-mail', maily.length === 0, maily);
test('(c) žádná hodnota tajné proměnné',
  !/(TAJEMSTVI_RELACE|ADMIN_INIT_HESLO|ADMIN_EMAIL|PIPEDRIVE_TOKEN|PIPEDRIVE_DOMENA)\s*[=:]\s*["'`]?[^\s"'`,)]{4,}/.test(OBSAH_TXT.replace(/PROSTREDI=test/g, '')));
test('(c) žádný token ani klíč', !/\b(gh[pousr]_|github_pat_|nfp_|sk-ant-|AKIA[0-9A-Z]{8})/.test(OBSAH_TXT));
/* Ceny do repozitáře nepatří (roadmapa/README „Žádné ceny") — v textu
 * příručky správce nesmí být žádná částka v Kč. */
const castky = OBSAH_TXT.match(/\d[\d  ]*(,\d+)?\s*(Kč|CZK|EUR|€)/g) || [];
test('(c) žádné částky v Kč / EUR', castky.length === 0, castky);
test('(c) příručka říká, že nenese hesla ani hodnoty proměnných', /neobsahuje hesla, tokeny ani hodnoty proměnných/.test(OBSAH_TXT));
test('(c) příručka říká, že částky jsou ze zkušebního ceníku', /nejsou naše ceny/.test(OBSAH_TXT));
test('(c) nejisté provozní skutečnosti jsou označené „ověřit"', (OBSAH_TXT.match(/ověřit/g) || []).length >= 4);
const TEMATA = {
  'role a hlavní správce (ADMIN_EMAIL)': /Hlavní správce/.test(OBSAH_TXT) && /ADMIN_EMAIL/.test(OBSAH_TXT),
  'matice zobrazení a náhled': /Zobrazení/.test(OBSAH_TXT) && /náhled/i.test(OBSAH_TXT),
  'uživatelé: založit, reset, vypnout, archiv, heslo správce': /Založit účet/.test(OBSAH_TXT)
    && /Nové heslo…/.test(OBSAH_TXT) && /Aktivní/.test(OBSAH_TXT) && /Archivovat…/.test(OBSAH_TXT) && /Potvrzení heslem správce/.test(OBSAH_TXT),
  'všechny záložky Nastavení': ['Obecné', 'Firma', 'Uživatelé', 'Databáze', 'Slevy', 'Smlouvy / Šablony', 'Standard OCK',
    'Zobrazení', 'Konfigurace', 'Slovník', 'Analytika', 'Controlling', 'Mapa polí CRM'].every(z => OBSAH_TXT.includes(z)),
  'ceník: verze, ze souboru, přenos, zahraničí, migrace, přepočet, zamčené': /Verze ceníku…/.test(OBSAH_TXT)
    && /Zveřejnit ceník ze souboru…/.test(OBSAH_TXT) && /Cena Zahraničí/.test(OBSAH_TXT) && /cena můstků podle rozměru/.test(OBSAH_TXT)
    && /přepočítají samy/.test(OBSAH_TXT) && /Nemění se nikdy/.test(OBSAH_TXT),
  'zálohy: noční 2:00–3:45 UTC, Zálohovat teď, Stáhnout, Disk .json.gz': /2:00–3:45 UTC/.test(OBSAH_TXT)
    && /Zálohovat teď/.test(OBSAH_TXT) && /Stáhnout zálohu/.test(OBSAH_TXT) && /_Zaloha Netlify DB/.test(OBSAH_TXT) && /\.json\.gz/.test(OBSAH_TXT),
  'retence Netlify 14 d / 8 t / 6 m / 7 d / před obnovou nikdy; Disk 7 d': /14 dní/.test(OBSAH_TXT) && /8 týdnů/.test(OBSAH_TXT)
    && /6 měsíců/.test(OBSAH_TXT) && /\*\*7 dní\*\*/.test(OBSAH_TXT) && /otisky před obnovou/.test(OBSAH_TXT),
  'pojistka úbytku a potvrzení hlavním správcem': /Úbytek byl záměrný/.test(OBSAH_TXT) && /Potvrdit úbytek může jen hlavní správce/.test(OBSAH_TXT),
  'obnova: náhled, doplnit/přepsat, části, scénáře A/B/C': /Zobrazit náhled/.test(OBSAH_TXT) && /doplnit/.test(OBSAH_TXT)
    && /přepsat/.test(OBSAH_TXT) && /A\) Pokazila/.test(OBSAH_TXT) && /B\) Zmizela/.test(OBSAH_TXT) && /C\) Zmizelo/.test(OBSAH_TXT)
    && /POSTUP_OBNOVY_ZALOHY\.md/.test(OBSAH_TXT),
  'hlídání záloh a naplánované úlohy': /48 hodin/.test(OBSAH_TXT) && /starší než 5 dní/.test(OBSAH_TXT) && /ranní kontrola/i.test(OBSAH_TXT),
  'weby a Netlify (Deploys, vrácení, Logs, Blobs, proměnné, plánované funkce)': /engscalc\.netlify\.app/.test(OBSAH_TXT)
    && /testengscalc\.netlify\.app/.test(OBSAH_TXT) && /schaftscalc/.test(OBSAH_TXT) && /Publish deploy/.test(OBSAH_TXT)
    && /Logs → Functions/.test(OBSAH_TXT) && /Blobs/.test(OBSAH_TXT) && /Environment variables/.test(OBSAH_TXT) && /Scheduled/.test(OBSAH_TXT),
  'GitHub: repo, větve, tagy, releasy, Actions, verzování, tok změn': /vendljar\/kalkulator-next-gen-engscalc/.test(OBSAH_TXT)
    && /test-draft/.test(OBSAH_TXT) && /claude\/integrace-\*/.test(OBSAH_TXT) && /vDEN\.MĚSÍC\.pořadí/.test(OBSAH_TXT)
    && /release_odkaz\.py/.test(OBSAH_TXT) && /Smazat sloučené větve/.test(OBSAH_TXT) && /Kdo schvaluje/.test(OBSAH_TXT),
  'Google Disk (Manual, _Zaloha Netlify DB) a Pipedrive (co se nezapisuje)': /Manual/.test(OBSAH_TXT) && /nic nezapisuje/.test(OBSAH_TXT),
  'testování: kolo, mutace, Actions, ruční postup': /testovaci_kolo\.sh/.test(OBSAH_TXT) && /KNG_MUTACE_CAST/.test(OBSAH_TXT)
    && /před posunem do main/.test(OBSAH_TXT),
};
for (const [t, v] of Object.entries(TEMATA)) test('(c) téma: ' + t, v);

// ---- (d) sestav.sh se zástupnými snímky ---------------------------------------
const verze = fs.readFileSync(path.join(KOREN, 'verze.txt'), 'utf8').trim();
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'kng-admin-'));
const zastupne = (ids, prostredi, verzeS) => ({ zachyceno: '2026-10-27T00:00:00Z', verze: 'Kalkulačka v' + (verzeS || verze),
  prostredi, castkyUpraveny: false, css: '',
  snimky: ids.map(id => ({ id, html: '<div style="height:60px;padding:8px;border:1px solid #ccc">zástupný snímek ' + id + '</div>',
    sirka: 600, vyska: 60, tema: '', admin: false, popis: '' })) });
/* Snímky obchodníka: id, na která odkazuje manual/obsah.json. */
const OBS_B = JSON.parse(fs.readFileSync(path.join(KOREN, 'manual', 'obsah.json'), 'utf8'));
const idsB = new Set();
for (const k of OBS_B.kapitoly) for (const b of k.bloky || []) {
  if (b.snimek) idsB.add(b.snimek);
  for (const p of b.polozky || []) if (p.snimek) idsB.add(p.snimek);
}
const zapis = (jmeno, data) => { const p = path.join(tmp, jmeno); fs.writeFileSync(p, JSON.stringify(data)); return p; };
const sB = zapis('snimky.json', zastupne([...idsB], 'test'));
const sA = zapis('snimky_admin.json', zastupne([...pouzite], 'test'));
/* Řádek verze se při sestavení porovnává s verze.txt — test si obsah
 * s aktuální verzí nepodstrkuje, jen ohlásí, když nesedí (stejně jako
 * test_prirucka_postupy u obchodníka). */
const verzeSedi = OBSAH.verze.startsWith('Platí pro aplikaci v' + verze + ' ');
const sestav = (args) => spawnSync('bash', [path.join(ADMIN, 'sestav.sh'), ...args], { encoding: 'utf8' });
let html = null;
if (!verzeSedi) {
  console.log('INFO řádek verze v manual/admin/obsah.json ≠ verze.txt (v' + verze + ') — sestavení se přeskakuje; opravte řádek při vydání příručky');
} else {
  const vyst = path.join(tmp, 'vystup');
  const r = sestav([sB, sA, vyst]);
  test('(d) sestav.sh sestaví příručku', r.status === 0, (r.stderr || '') + (r.stdout || ''));
  const soubor = fs.existsSync(vyst) && fs.readdirSync(vyst).find(f => /_MANUAL_ADMINISTRATOR\.html$/.test(f));
  test('(d) výstup se jmenuje …_kalkulator_v<verze>_MANUAL_ADMINISTRATOR.html',
    !!soubor && soubor.includes('_kalkulator_v' + verze + '_'), soubor);
  if (soubor) {
    html = fs.readFileSync(path.join(vyst, soubor), 'utf8');
    test('(d) jeden soubor: data obou částí a spojovací skript uvnitř',
      /id="data-obsah-admin"/.test(html) && /id="data-snimky-admin"/.test(html) && /PRIRUCKA_ADMIN/.test(html));
    test('(d) spojovací skript stojí před rendererem',
      html.indexOf('PRIRUCKA_ADMIN') < html.indexOf('window.PRIRUCKA = {'));
    test('(d) titulek okna je příručka administrátora',
      /<title>Kalkulátor Next Gen — příručka administrátora<\/title>/.test(html));
  }
  const vRepu = sestav([sB, sA, path.join(KOREN, 'manual', 'admin', 'vystup_test')]);
  test('(d) výstup v repozitáři odmítne (kód 2)', vRepu.status === 2 && !fs.existsSync(path.join(KOREN, 'manual', 'admin', 'vystup_test')),
    vRepu.status);
  const ostre = zapis('snimky_admin_ostre.json', zastupne([...pouzite], 'ostre'));
  test('(d) snímky z jiného než testovacího prostředí odmítne', sestav([sB, ostre, path.join(tmp, 'v2')]).status !== 0);
  const stara = zapis('snimky_admin_stara.json', zastupne([...pouzite], 'test', '1.1.1'));
  test('(d) snímky z jiné verze aplikace odmítne', sestav([sB, stara, path.join(tmp, 'v3')]).status !== 0);
  test('(d) bez argumentů skončí kódem 2', sestav([]).status === 2);
}

// ---- (e) vykreslení v Chromiu ---------------------------------------------------
let chromium = null;
try { ({ chromium } = require('playwright')); } catch (e) { /* bez prohlížeče jen (a)–(d) */ }
(async () => {
  if (!html || !chromium) {
    console.log('INFO (e) přeskočeno — ' + (!html ? 'příručka se nesestavila' : 'playwright není k dispozici'));
  } else {
    const b = await chromium.launch({ args: ['--no-sandbox'] });
    const p = await b.newPage({ viewport: { width: 794, height: 1100 } });
    const chyby = [];
    p.on('pageerror', e => chyby.push(String(e)));
    await p.setContent(html, { waitUntil: 'load' });
    await p.waitForFunction(() => window.PRIRUCKA, null, { timeout: 30000 }).catch(() => {});
    await p.evaluate(() => { window.KNG_BEZ_CILU = true; });
    const r = await p.evaluate(fs.readFileSync(path.join(ADMIN, 'overit.js'), 'utf8'));
    if (!r || !Array.isArray(r.radky)) test('(e) manual/admin/overit.js doběhl', false, String(r));
    else for (const radek of r.radky) test('(e) ' + radek.replace(/^(OK|CHYBA)\s+/, ''), /^OK /.test(radek), radek);
    test('(e) žádná chyba JavaScriptu', chyby.length === 0, chyby.slice(0, 2));
    const prvni = await p.evaluate(() => {
      const a = [...document.querySelectorAll('h2[id^="kap-"]')];
      const b0 = a.find(h => !/^kap-a-/.test(h.id));
      const ram = b0 && b0.nextElementSibling;
      return { b0: b0 && b0.textContent, ram: ram && ram.textContent };
    });
    test('(e) část B začíná kapitolou 1 s rámečkem „Část B — příručka obchodníka"',
      /1\. Přihlášení/.test(prvni.b0 || '') && /Část B — příručka obchodníka/.test(prvni.ram || ''), prvni);
    await b.close();
  }
  fs.rmSync(tmp, { recursive: true, force: true });
  konec();
})();
