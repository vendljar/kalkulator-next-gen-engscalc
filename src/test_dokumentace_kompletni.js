/* ===== D1: KOMPLETNÍ DOKUMENTACE SYSTÉMU (jeden dokument, části I–III) =====
 *
 * Dokument skládá manual/kompletni/sestav.js z příruček správce a obchodníka
 * (část I), z manuálu výpočtu (část II) a z manual/kompletni/provoz.json
 * (část III Provoz systému a přílohy). Hlídá se:
 *  (a) fakta z kódu ↔ dokument OBĚMA SMĚRY: každá API cesta (config.path
 *      funkcí), každá plánovaná funkce s rozvrhem (config.schedule), každá
 *      proměnná prostředí čtená serverem a každé úložiště Netlify Blobs je
 *      v dokumentu — a nic v dokumentu nepopisuje cestu, proměnnou ani
 *      úložiště, které kód nezná;
 *  (b) čísla retence záloh, pojistky úbytku a limitů sedí s konstantami;
 *  (c) text části III neobsahuje zakázané vzory (historie rozhodnutí, data,
 *      čísla verzí „od v…", kódy nálezů, čísla roadmapy, „Co je nového"),
 *      hesla ani hodnoty tajemství; nese autorství a všechna zadaná témata;
 *  (d) skládání: manuál výpočtu se rozdělí na kapitoly V1–V16 bez kapitoly
 *      novinek, odkazy „kap. N" se přečíslují na V, obsah má části I–III;
 *  (e) sestav.js se zástupnými snímky vyrobí jeden HTML soubor, odmítne
 *      výstup v repozitáři a snímky z ostrého prostředí;
 *  (f) je-li playwright: dokument se vykreslí bez chyb, každá značka bloku
 *      je vyměněná, obsah odkazuje na všechny kapitoly a v tisku se vejde
 *      na jednu stranu A4.
 *
 * Pojistka: nad 62ea0c8 (před D1) selže hned (a) — manual/kompletni/
 * neexistuje; s provoz.json bez řádku /api/pd/stav, bez PIPEDRIVE_DOMENA
 * a bez úložiště pd_stav selžou čtyři kontroly (a) (88 OK / 4 FAIL, ověřeno
 * při psaní); bez manual/kompletni/ 0 OK / 2 FAIL. */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync, execFileSync } = require('child_process');

let ok = 0, fail = 0;
const test = (n, cond, info) => {
  if (cond) { ok++; console.log('OK  ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info)); }
};
const KOREN = path.join(__dirname, '..');
const KOMPLET = path.join(KOREN, 'manual', 'kompletni');
const cti = (p) => { try { return fs.readFileSync(p, 'utf8'); } catch (e) { return null; } };
const konec = () => { console.log('\n' + ok + ' OK, ' + fail + ' FAIL'); process.exit(fail ? 1 : 0); };

const provozText = cti(path.join(KOMPLET, 'provoz.json'));
test('(a) manual/kompletni/provoz.json existuje', !!provozText);
test('(a) manual/kompletni/sestav.js a dokoncit.js existují',
  !!cti(path.join(KOMPLET, 'sestav.js')) && !!cti(path.join(KOMPLET, 'dokoncit.js')));
if (!provozText) konec();
const P = JSON.parse(provozText);

/* Všechen text části III (bez řádku verze, ten nese datum sestavení). */
function texty(o, ven) {
  if (typeof o === 'string') ven.push(o);
  else if (Array.isArray(o)) o.forEach(x => texty(x, ven));
  else if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) if (k !== 'verze' && k !== 'svg') texty(v, ven);
  return ven;
}
const TEXT = texty(P, []).join('\n');
const kap = (id) => P.kapitoly.find(k => k.id === id) || { bloky: [] };
const tabulky = (k) => k.bloky.filter(b => b.typ === 'tabulka');
const sloupec = (k, i) => tabulky(k).flatMap(t => t.radky.map(r => String(r[i]).replace(/`/g, '').trim()));

// ---- (a) fakta z kódu ↔ dokument -----------------------------------------------
const FN = path.join(KOREN, 'netlify', 'functions');
const cesty = new Set(), rozvrhy = new Map();
for (const f of fs.readdirSync(FN).filter(f => f.endsWith('.mjs'))) {
  const t = cti(path.join(FN, f));
  const m = t.match(/export const config\s*=\s*\{([^}]*)\}/);
  if (!m) continue;
  const p = m[1].match(/path:\s*'([^']+)'/);
  const s = m[1].match(/schedule:\s*'([^']+)'/);
  if (p) cesty.add(p[1]);
  if (s) rozvrhy.set(f.replace(/\.mjs$/, ''), s[1]);
}
test('(a) kód má serverové funkce s cestou i plánovanou funkci', cesty.size >= 20 && rozvrhy.size >= 1, [cesty.size, rozvrhy.size]);
const API = kap('kap-p-api');
const cestyDok = new Set(sloupec(API, 0).filter(c => c.startsWith('/api/')));
const chybiCesty = [...cesty].filter(c => !cestyDok.has(c));
const navicCesty = [...cestyDok].filter(c => !cesty.has(c));
test('(a) každá API cesta z kódu je v příloze 1', chybiCesty.length === 0, chybiCesty);
test('(a) příloha 1 nepopisuje cestu, kterou kód nemá', navicCesty.length === 0, navicCesty);
const vsechnyCestyVTextu = new Set((TEXT.match(/\/api\/[a-z_/]+[a-z]/g) || []));
const neznameVTextu = [...vsechnyCestyVTextu].filter(c => !cesty.has(c) && !c.endsWith('/') && !/^\/api\/(pd|)$/.test(c));
test('(a) text části III nezmiňuje neexistující API cestu', neznameVTextu.length === 0, neznameVTextu);
const planDok = new Map(tabulky(API).flatMap(t => t.radky).filter(r => !String(r[0]).startsWith('/api/')).map(r => [String(r[0]).replace(/`/g, ''), String(r[1])]));
for (const [f, s] of rozvrhy) {
  test('(a) plánovaná funkce ' + f + ' je v příloze 1 s rozvrhem ' + s, planDok.get(f) === s, planDok.get(f));
  test('(a) plánovaná funkce ' + f + ' je v kapitole Provoz a dohled s rozvrhem',
    JSON.stringify(kap('kap-p-dohled')).includes(f) && JSON.stringify(kap('kap-p-dohled')).includes(s));
}
test('(a) příloha 1 nepopisuje plánovanou funkci, kterou kód nemá', [...planDok.keys()].every(f => rozvrhy.has(f)), [...planDok.keys()]);

/* Proměnné prostředí, které čte server (netlify/functions + netlify/lib). */
const promenne = new Set();
function projdi(dir) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) { projdi(p); continue; }
    if (!/\.(mjs|cjs|js)$/.test(f)) continue;
    const t = cti(p);
    for (const m of t.matchAll(/process\.env\.([A-Z][A-Z0-9_]+)/g)) promenne.add(m[1]);
    for (const m of t.matchAll(/Netlify\.env\.get\(\s*'([A-Z][A-Z0-9_]+)'/g)) promenne.add(m[1]);
    for (const m of t.matchAll(/_PROMENNA\s*=\s*'([A-Z][A-Z0-9_]+)'/g)) promenne.add(m[1]);
  }
}
projdi(FN); projdi(path.join(KOREN, 'netlify', 'lib'));
test('(a) server čte aspoň 5 proměnných prostředí', promenne.size >= 5, [...promenne]);
const PROM = kap('kap-p-promenne');
const promDok = new Set(sloupec(PROM, 0));
const chybiProm = [...promenne].filter(v => !promDok.has(v));
const navicProm = [...promDok].filter(v => !promenne.has(v));
test('(a) každá proměnná prostředí serveru je v příloze 2', chybiProm.length === 0, chybiProm);
test('(a) příloha 2 nepopisuje proměnnou, kterou server nečte', navicProm.length === 0, navicProm);
const promP3 = new Set(sloupec(kap('kap-p-pristupy'), 0).filter(x => /^[A-Z_]+$/.test(x)));
test('(a) kapitola P3 má tytéž proměnné jako příloha 2', [...promenne].every(v => promP3.has(v)) && [...promP3].every(v => promenne.has(v)), [...promP3]);
test('(a) NODE_VERSION z netlify.toml je v příloze 2', /NODE_VERSION\s*=/.test(cti(path.join(KOREN, 'netlify.toml'))) && JSON.stringify(PROM).includes('NODE_VERSION'));

/* Úložiště Netlify Blobs: uloziste('x') a konstanty …_ULOZISTE = 'x'. */
const uloziste = new Set();
function projdiUl(dir) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) { projdiUl(p); continue; }
    if (!/\.(mjs|cjs)$/.test(f)) continue;
    const t = cti(p);
    for (const m of t.matchAll(/uloziste\(\s*'([a-z_]+)'\s*\)/g)) uloziste.add(m[1]);
    for (const m of t.matchAll(/\b[A-Z_]*ULOZISTE\s*=\s*'([a-z_]+)'/g)) uloziste.add(m[1]);
  }
}
projdiUl(FN); projdiUl(path.join(KOREN, 'netlify', 'lib'));
test('(a) kód používá aspoň 10 úložišť Blobs', uloziste.size >= 10, [...uloziste]);
const ulDok = new Set(sloupec(kap('kap-p-data'), 0));
const chybiUl = [...uloziste].filter(u => !ulDok.has(u));
const navicUl = [...ulDok].filter(u => !uloziste.has(u));
test('(a) každé úložiště Blobs z kódu je v kapitole P5', chybiUl.length === 0, chybiUl);
test('(a) kapitola P5 nepopisuje úložiště, které kód nemá', navicUl.length === 0, navicUl);

// ---- (b) čísla z konstant ----------------------------------------------------------
const RZ = require('./retence_zaloh.js');
const zal = JSON.stringify(kap('kap-p-zalohy'));
const B = RZ.RETENCE_ZALOH_BLOBS, Dk = RZ.RETENCE_ZALOH_DISK, PJ = RZ.RETENCE_ZALOH_POJISTKA;
test('(b) retence Blobs: ' + B.dnu + ' dní / ' + B.tydnu + ' týdnů / ' + B.mesicu + ' měsíců / ruční ' + B.vynuceneDnu + ' dní',
  zal.includes('posledních **' + B.dnu + ' dní**') && zal.includes('**' + B.tydnu + ' týdnů**') && zal.includes('**' + B.mesicu + ' měsíců**') && zal.includes('**' + B.vynuceneDnu + ' dní**'));
test('(b) retence Disk: ' + Dk.dnu + ' dní / ' + Dk.tydnu + ' týdnů / ' + Dk.mesicu + ' měsíců',
  zal.includes('posledních **' + Dk.dnu + ' dní**') && Dk.tydnu === B.tydnu && Dk.mesicu === B.mesicu);
test('(b) pojistka úbytku: ' + PJ.velikost * 100 + ' % dat, ' + PJ.pocty * 100 + ' % zakázek, okno ' + PJ.oknoDnu + ' dní',
  zal.includes('**' + Math.round(PJ.velikost * 100) + ' %**') && zal.includes('**' + Math.round(PJ.pocty * 100) + ' %**') && zal.includes('za ' + PJ.oknoDnu + ' dní'));
const ZAL = cti(path.join(KOREN, 'netlify', 'lib', 'zalohovani.mjs'));
const odstup = +(ZAL.match(/VYNUCENE_ODSTUP_MS = (\d+) \* 60 \* 1000/) || [])[1];
const zaDen = +(ZAL.match(/VYNUCENE_ZA_DEN = (\d+)/) || [])[1];
test('(b) ruční otisk: 1× za ' + odstup + ' min, ' + zaDen + '× za den', zal.includes('jednou za ' + odstup + ' minut a ' + zaDen + '× za den'));
const SD = cti(path.join(KOREN, 'netlify', 'lib', 'sdilene.mjs'));
const pokusy = +(SD.match(/POKUSY_MAX = (\d+)/) || [])[1], okno = +(SD.match(/POKUSY_OKNO_MS = (\d+) \* 60/) || [])[1];
const pokusyIp = +(SD.match(/POKUSY_IP_MAX = (\d+)/) || [])[1];
test('(b) brzda přihlášení: ' + pokusy + ' na e-mail za ' + okno + ' minut, ' + pokusyIp + ' na adresu',
  TEXT.includes(pokusy + ' neúspěchů na e-mail za ' + okno + ' minut') && TEXT.includes(pokusyIp + ' na adresu klienta'));
const maxAge = +(SD.match(/Max-Age=(\d+)/) || [])[1];
test('(b) relace platí ' + maxAge / 3600 + ' hodin', TEXT.includes('platí ' + maxAge / 3600 + ' hodin'));
const hMin = +(SD.match(/HESLO_MIN = (\d+)/) || [])[1], hMax = +(SD.match(/HESLO_MAX = (\d+)/) || [])[1];
test('(b) heslo ' + hMin + ' až ' + hMax + ' znaků', TEXT.includes(hMin + ' až ' + hMax + ' znaků'));
const PD = cti(path.join(KOREN, 'netlify', 'lib', 'pipedrive.mjs'));
const pdMax = +(PD.match(/PD_DEAL_MAX = (\d+)/) || [])[1];
test('(b) Pipedrive: ' + pdMax + ' detailů za hodinu', TEXT.includes(pdMax + ' čerstvých načtení za hodinu'));
const uklid = +(cti(path.join(KOREN, 'netlify', 'lib', 'uklid.mjs')).match(/PD_CACHE_UKLID_DNU = (\d+)/) || [])[1];
test('(b) úklid cache Pipedrive po ' + uklid + ' dnech', TEXT.includes('starší ' + uklid + ' dní') && TEXT.includes('po ' + uklid + ' dnech'));
const zakMax = cti(path.join(KOREN, 'netlify', 'lib', 'zakazka_kontrola.mjs')).match(/ZAKAZKA_MAX_B = (\d+) \* 1024 \* 1024/);
test('(b) strop zakázky ' + (zakMax && zakMax[1]) + ' MB', !!zakMax && TEXT.includes('zakázky ' + zakMax[1] + ' MB') && TEXT.includes('zakázka nejvýš ' + zakMax[1] + ' MB'));
const node = (cti(path.join(KOREN, 'netlify.toml')).match(/NODE_VERSION = "([\d.]+)"/) || [])[1];
test('(b) verze Node ' + node + ' jako v netlify.toml', !!node && TEXT.includes('Node ' + node));
const nodeAkce = (cti(path.join(KOREN, '.github', 'workflows', 'testy.yml')) || '').match(/cast: \[([^\]]*)\]/g) || [];
test('(b) části mutací v Actions (server 10, jádro 3)', nodeAkce.length >= 2 && /'10\/10'/.test(nodeAkce[0]) && /'3\/3'/.test(nodeAkce[1])
  && TEXT.includes('mutace serveru v 10 částech') && TEXT.includes('mutace jádra ve 3 částech'), nodeAkce);
const role = (SD.match(/export const ROLE = \[([^\]]*)\]/) || [])[1].match(/'([^']+)'/g).map(r => r.slice(1, -1));
const matice = tabulky(kap('kap-p-uzivatele')).find(t => /Matice práv/.test(t.titulek || ''));
test('(b) matice práv má sloupec pro každou roli z kódu', !!matice && role.every(r => matice.hlavicka.includes(r)), role);

// ---- (c) text --------------------------------------------------------------------
const verze = (cti(path.join(KOREN, 'verze.txt')) || '').trim();
const verzeSedi = String(P.verze).startsWith('Platí pro aplikaci v' + verze + ' ');
test('(c) řádek verze má tvar „Platí pro aplikaci vD.M.N · sestaveno …"', /^Platí pro aplikaci v\d+\.\d+\.\d+ · sestaveno /.test(P.verze), P.verze);
if (!verzeSedi) console.log('INFO (c) řádek verze provoz.json neříká v' + verze + ' — před sestavením opravit (sestav.js jinak zastaví)');
const ZAKAZANE = [
  [/rozhodnutí J\. ?V\./i, 'rozhodnutí J. V.'], [/pokyn J\. ?V\./i, 'pokyn J. V.'],
  [/\bod v\d+\.\d+/, 'od vX'], [/\bv\d{1,2}\.\d{1,2}\.\d+\b/, 'číslo verze'],
  [/\b\d{1,2}\. ?\d{1,2}\. ?20\d\d\b/, 'datum'], [/\b20\d\d-\d\d-\d\d\b/, 'datum ISO'],
  [/\b(?:B\d{2,3}|SEC-[A-Z]+\d*|K\d+-[A-Z]+\d+|O-K\d+|N\d{1,2})\b/, 'kód nálezu'], [/#\d{3}\b/, 'číslo roadmapy'],
  [/Co je nového/i, 'Co je nového'], [/(?<!\p{L})(?:zavedeno|dříve|dřív|nově|původně)(?!\p{L})/iu, 'historie'],
];
for (const [re, jm] of ZAKAZANE) {
  const m = TEXT.match(re);
  test('(c) část III bez vzoru: ' + jm, !m, m && TEXT.slice(Math.max(0, m.index - 40), m.index + 40));
}
test('(c) žádný e-mail ani telefon', !/[\w.+-]+@[\w-]+\.[a-z]{2,}/i.test(TEXT) && !/\+?\d{3} ?\d{3} ?\d{3}\b/.test(TEXT));
test('(c) žádná hodnota tajemství (PROMĚNNÁ=hodnota) ani částka v Kč',
  ![...promenne].some(v => new RegExp(v + '\\s*[=:]\\s*\\S').test(TEXT.replace(/PROSTREDI=test|PIPEDRIVE_SIMULATOR=1/g, '') /* přepínače, ne tajemství */)) && !/\d[\d  ]* ?Kč/.test(TEXT));
test('(c) dokument říká, že hesla a hodnoty proměnných nenese', /Neobsahuje hesla, tokeny ani hodnoty proměnných prostředí/.test(TEXT));
test('(c) autorství: „Autor programu Jaroslav Vendl (2026)" a AUTORSTVI.md', TEXT.includes('Autor programu Jaroslav Vendl (2026)') && TEXT.includes('AUTORSTVI.md'));
const nad = P.kapitoly.map(k => k.nadpis);
const cP = nad.filter(n => /^P\d+\./.test(n)).map(n => +n.match(/^P(\d+)\./)[1]);
const cPr = nad.filter(n => /^Příloha \d+\./.test(n)).map(n => +n.match(/^Příloha (\d+)\./)[1]);
test('(c) kapitoly P1–P13 bez děr', cP.length === 13 && cP.every((c, i) => c === i + 1), cP);
test('(c) přílohy 1–4 bez děr', cPr.length === 4 && cPr.every((c, i) => c === i + 1), cPr);
test('(c) id kapitol kap-p-… bez opakování', P.kapitoly.every((k, i, a) => /^kap-p-/.test(k.id) && a.findIndex(x => x.id === k.id) === i));
const TEMATA = {
  'schéma prohlížeč → web → funkce → Blobs': P.kapitoly[0].bloky.some(b => b.typ === 'svg' && /Netlify Functions/.test(b.svg) && /Blobs/.test(b.svg)),
  'ARES, Pipedrive, Google Disk': /ARES/.test(TEXT) && /Pipedrive/.test(TEXT) && /Google Disk/.test(TEXT),
  'adresy ostrý / test': TEXT.includes('https://engscalc.netlify.app') && TEXT.includes('https://testengscalc.netlify.app'),
  'repozitář a Actions': TEXT.includes('github.com/vendljar/kalkulator-next-gen-engscalc') && /Actions/.test(TEXT),
  'složka _Zaloha Netlify DB': TEXT.includes('_Zaloha Netlify DB'),
  'ranní hlídač záloh e-mailem': /Ranní hlídač/.test(TEXT) && /e-mail/.test(TEXT),
  'postup výměny hesla / tokenu': /výměna podpisového klíče/.test(TEXT) && /výměna tokenu Pipedrive/.test(TEXT),
  'matice práv, hlavní správce, zapomenuté heslo správce': !!matice && /Hlavní správce/.test(TEXT) && /Zapomenuté heslo správce/.test(TEXT),
  'osobní údaje a doba držení': /Osobní údaje/.test(TEXT) && /Doba držení/.test(TEXT),
  'retence Netlify × Disk, obnova, čtvrtletní test': /retence/i.test(TEXT) && /obnova ze zálohy/i.test(TEXT) && /čtvrtletní zkušební test obnovy/i.test(TEXT),
  'verze, cesta do ostrého, rollback': /vDEN\.MĚSÍC\.pořadí/.test(TEXT) && /rollback/i.test(TEXT) && /release/i.test(TEXT),
  'testovací kolo a mutace': TEXT.includes('nastroje/testovaci_kolo.sh') && /mutace/i.test(TEXT),
  'audity, přijatá rizika, security test': /Výsledky auditů/.test(TEXT) && /Přijatá rizika/.test(TEXT) && TEXT.includes('BEZPECNOST_MEZE.md') && /security test/i.test(TEXT),
  'logy, kvóty, plánované úlohy, měsíční seznam': /Logy funkcí/.test(TEXT) && /Kvóty tarifu/.test(TEXT) && /Plánované úlohy/.test(TEXT) && /Každý měsíc/.test(TEXT),
  'havarijní scénáře (7)': ['Web nejde', 'Nejde přihlášení', 'Záloha selhala', 'Nasazen chybný ceník', 'Ztráta Netlify', 'Únik hesla', 'Vrácení verze'].every(s => TEXT.includes(s)),
  'kontrolní seznamy měsíc / čtvrtletí / před nasazením': /Každý měsíc/.test(TEXT) && /Každé čtvrtletí/.test(TEXT) && /Před každým nasazením/.test(TEXT),
  'slovník pojmů': (kap('kap-p-slovnik').bloky[0] || {}).polozky && kap('kap-p-slovnik').bloky[0].polozky.length >= 20,
  'předání systému nástupci': /předání systému nástupci/i.test(TEXT),
};
for (const [t, v] of Object.entries(TEMATA)) test('(c) téma: ' + t, !!v);

// ---- (d) skládání ------------------------------------------------------------------
const S = require('../manual/kompletni/sestav.js');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'kng-kompletni-'));
let vyp = null;
try {
  execFileSync(process.execPath, [path.join(KOREN, 'manual_vypocet', 'sestav.js'), '--out', path.join(tmp, 'v')], { stdio: 'ignore' });
  const f = fs.readdirSync(path.join(tmp, 'v')).find(x => /_MANUAL_VYPOCET_OCK\.html$/.test(x));
  vyp = S.rozdelVypocet(cti(path.join(tmp, 'v', f)));
} catch (e) { console.log('INFO (d) manuál výpočtu nešel vyrobit: ' + e.message); }
/* Počet kapitol manuálu výpočtu se bere ze šablony (kapitoly s číslem kromě novinek). */
const kapVypoctu = (cti(path.join(KOREN, 'manual_vypocet', 'sablona.html')).match(/<div class="kaph"><div class="cislo">\d+<\/div><h2>(?![^<]*Co je nového)/g) || []).length;
test('(d) manuál výpočtu se rozdělí na kapitoly V1–V' + kapVypoctu + ' (podle šablony)', !!vyp && kapVypoctu >= 10 && vyp.kapitoly.length === kapVypoctu && vyp.kapitoly.every((k, i) => k.cislo === i + 1), vyp && vyp.kapitoly.map(k => k.cislo));
test('(d) kapitola novinek a titulní strana manuálu výpočtu se do dokumentu neberou',
  !!vyp && !vyp.kapitoly.some(k => /Co je nového/i.test(k.nazev + k.html)) && !/class="titul"/.test(vyp.uvod) && !/class="obsah"/.test(vyp.uvod));
test('(d) úvod části II nese vzorovou šachtu', !!vyp && /Vzorová šachta/.test(vyp.uvod));
test('(d) styl části II je přenesený do shadow DOM (bez :root, html, body, vynuceného zalomení)',
  !!vyp && !/:root\s*\{|(^|[}\s])body\s*\{|(^|[}\s])html\s*\{/.test(vyp.css) && /break-before:auto!important/.test(vyp.css));
test('(d) odkazy „kap. 11" v části II → „kap. V11"', S.precisluj('viz kap. 11 a kapitola 16, kap. 7, 12') === 'viz kap. V11 a kapitola V16, kap. V7, V12', S.precisluj('viz kap. 11 a kapitola 16, kap. 7, 12'));
test('(d) v části II nezůstal odkaz „kap. N" bez V', !!vyp && !/\bkap\. \d/.test(vyp.uvod + vyp.kapitoly.map(k => k.html).join('')));
const OA = JSON.parse(cti(path.join(KOREN, 'manual', 'admin', 'obsah.json')));
const OB = JSON.parse(cti(path.join(KOREN, 'manual', 'obsah.json')));
const sp = vyp && S.spojObsah(OA, OB, P, vyp);
if (sp) {
  const ids = sp.obsah.kapitoly.map(k => k.id);
  test('(d) pořadí: A1–A' + OA.kapitoly.length + ', 1–' + OB.kapitoly.length + ', V1–V' + vyp.kapitoly.length + ', P1–P13, přílohy', ids.length === OA.kapitoly.length + OB.kapitoly.length + vyp.kapitoly.length + P.kapitoly.length
    && ids[0] === OA.kapitoly[0].id && ids[OA.kapitoly.length] === OB.kapitoly[0].id && ids[OA.kapitoly.length + OB.kapitoly.length] === 'kap-v-1'
    && ids[ids.length - 1] === 'kap-p-seznamy', ids.length);
  test('(d) id kapitol celého dokumentu se neopakují', ids.every((x, i) => ids.indexOf(x) === i));
  test('(d) obsah má části I, II, III a přílohy a každou kapitolu právě jednou',
    sp.doplnky.skupiny.filter(s => s.cast).map(s => s.cast.split(' — ')[0]).join(',') === 'Část I,Část II,Část III'
    && sp.doplnky.skupiny.flatMap(s => s.kapitoly).sort().join() === ids.slice().sort().join());
  test('(d) každý blok tabulka/svg části III se vymění značkou', sp.doplnky.bloky.filter(b => b.typ !== 'vypocet').length
    === P.kapitoly.reduce((n, k) => n + k.bloky.filter(b => b.typ === 'tabulka' || b.typ === 'svg').length, 0));
  test('(d) kapitoly části I se skládáním nemění (nadpisy i bloky)', sp.obsah.kapitoly.slice(0, OA.kapitoly.length + OB.kapitoly.length)
    .every((k, i) => JSON.stringify(k) === JSON.stringify(OA.kapitoly.concat(OB.kapitoly)[i])));
}

// ---- (e) sestav.js se zástupnými snímky --------------------------------------------
const zastupne = (ids, prostredi, verzeS) => ({ zachyceno: '2026-10-27T00:00:00Z', verze: 'Kalkulačka v' + (verzeS || verze),
  prostredi, castkyUpraveny: false, css: '',
  snimky: ids.map(id => ({ id, html: '<div style="height:40px;padding:8px;border:1px solid #ccc">zástupný snímek ' + id + '</div>',
    sirka: 600, vyska: 40, tema: '', admin: false, popis: '' })) });
const idsZ = (o) => { const s = new Set(); for (const k of o.kapitoly) for (const b of k.bloky || []) {
  if (b.snimek) s.add(b.snimek); for (const p of b.polozky || []) if (p.snimek) s.add(p.snimek); } return [...s]; };
const zapis = (jm, d) => { const p = path.join(tmp, jm); fs.writeFileSync(p, JSON.stringify(d)); return p; };
const sB = zapis('snimky.json', zastupne(idsZ(OB), 'test'));
const sA = zapis('snimky_admin.json', zastupne(idsZ(OA), 'test'));
const sestav = (args) => spawnSync(process.execPath, [path.join(KOMPLET, 'sestav.js'), ...args], { encoding: 'utf8' });
const vsechnyVerzeSedi = verzeSedi && String(OA.verze).startsWith('Platí pro aplikaci v' + verze + ' ');
let html = null;
if (!vsechnyVerzeSedi) console.log('INFO (e) přeskočeno — řádky verze příruček neříkají v' + verze);
else {
  const r = sestav([sB, sA, path.join(tmp, 'out'), '--bez-pdf']);
  const f = r.status === 0 && fs.readdirSync(path.join(tmp, 'out')).find(x => /_DOKUMENTACE_KOMPLETNI\.html$/.test(x));
  test('(e) sestav.js vyrobí jeden HTML soubor', !!f, r.stderr.slice(0, 400));
  if (f) html = path.join(tmp, 'out', f);
  test('(e) jméno souboru nese verzi aplikace', !!f && f.includes('_v' + verze + '_'));
  const h = html ? cti(html) : '';
  test('(e) v HTML není předčasné </script uvnitř dat', h.split('</script>').length - 1 === (h.match(/<script\b/g) || []).length);
  const ostre = zapis('snimky_ostre.json', zastupne(idsZ(OB), 'ostre'));
  const r2 = sestav([ostre, sA, path.join(tmp, 'out2'), '--bez-pdf']);
  test('(e) snímky z ostrého prostředí odmítne', r2.status !== 0 && /testovacího prostředí/.test(r2.stderr));
  const r3 = sestav([sB, sA, path.join(KOREN, 'manual', 'kompletni', 'vystup'), '--bez-pdf']);
  test('(e) výstup v repozitáři odmítne (kód 2) a nic nezaloží', r3.status === 2 && !fs.existsSync(path.join(KOREN, 'manual', 'kompletni', 'vystup')));
}

// ---- (f) vykreslení v prohlížeči ------------------------------------------------------
function playwright() {
  try { return require('playwright'); } catch (e) { /* zkusit globální */ }
  try { return require(path.join(execFileSync('npm', ['root', '-g'], { encoding: 'utf8' }).trim(), 'playwright')); } catch (e) { return null; }
}
(async () => {
  const pw = html && playwright();
  if (!pw) { console.log('INFO (f) přeskočeno — ' + (!html ? 'dokument se nesestavil' : 'playwright není k dispozici')); return konec(); }
  const b = await pw.chromium.launch({ args: ['--no-sandbox'] });
  try {
    const p = await b.newPage({ viewport: { width: 794, height: 1123 } });
    const chybyStr = [];
    p.on('pageerror', e => chybyStr.push(String(e)));
    await p.goto('file://' + html, { waitUntil: 'load' });
    await p.waitForFunction(() => window.KOMPLETNI && window.KOMPLETNI.hotovo, null, { timeout: 60000 });
    const r = await p.evaluate(() => {
      const K = window.KOMPLETNI, P = window.PRIRUCKA;
      const odkazy = [...document.querySelectorAll('#obsah .pol a')].map(a => a.getAttribute('href').slice(1));
      const h2 = [...document.querySelectorAll('#cil > h2[id]')].map(h => h.id);
      return { chyby: K.chyby, vymeneno: K.vymeneno, bloku: K.bloku, odkazy, h2, nesedi: P.nesedi,
        shadow: [...document.querySelectorAll('.v-kus')].filter(x => x.shadowRoot && x.shadowRoot.querySelector('.v-telo')).length,
        tabulek: document.querySelectorAll('table.tab').length, predelu: document.querySelectorAll('.predel').length,
        znacky: /§BLOK:/.test(document.body.innerText), titul: document.title };
    });
    test('(f) dokument se vykreslí bez chyb stránky', chybyStr.length === 0, chybyStr);
    test('(f) dokončení bez chyb', r.chyby.length === 0, r.chyby);
    test('(f) každá značka bloku je vyměněná', r.vymeneno === r.bloku && !r.znacky, [r.vymeneno, r.bloku]);
    test('(f) žádný snímek nechybí', !r.nesedi.some(n => /^chybí snímek/.test(n)), r.nesedi.filter(n => /^chybí/.test(n)));
    test('(f) obsah odkazuje na všechny kapitoly a jen na ně', r.odkazy.length === r.h2.length && r.odkazy.every((o, i) => o === r.h2[i]), [r.odkazy.length, r.h2.length]);
    test('(f) část II: úvod + ' + (vyp ? vyp.kapitoly.length : '?') + ' kapitol, každá ve vlastním shadow DOM', !!vyp && r.shadow === vyp.kapitoly.length + 1, r.shadow);
    test('(f) tabulky části III vykreslené', r.tabulek >= 15, r.tabulek);
    test('(f) předěly 3 částí a 2 skupin', r.predelu === 5, r.predelu);
    test('(f) titulek okna', /kompletní dokumentace/.test(r.titul), r.titul);
    await p.emulateMedia({ media: 'print' });
    const vyska = await p.evaluate(() => new Promise(res => requestAnimationFrame(() => res(window.KOMPLETNI.vyskaObsahu))));
    test('(f) titul a obsah se v tisku vejdou na jednu stranu A4 (≤ 1024 px)', vyska > 300 && vyska <= 1024, vyska);
  } finally { await b.close(); }
  konec();
})().catch(e => { test('(f) vykreslení', false, String(e)); konec(); });
