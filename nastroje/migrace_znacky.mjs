/* JEDNORÁZOVÁ MIGRACE: odstranění lživých značek ceníku ze zakázek
 * (P2, nálezy N2 a N3, 21. 9. 2026).
 *
 * PROČ TENHLE SKRIPT EXISTUJE
 * Server do 21. 9. 2026 doplňoval chybějící klíče ceníku z DEFAULT_CENIK
 * ze sestavení. To je pro GitHub vynulované a nese značky `ukazkove: true`
 * a `prazdny: true` — a doplňování je vtisklo do každé varianty, která přes
 * uložení prošla. U UZAMČENÝCH variant je nemá co smazat, protože se při
 * otevření zakázky nepřepočítávají. Výsledek u obchodníka: červená lišta
 * „Ceník není nahraný, všude svítí nuly" a vypnutá tlačítka tisku nabídky
 * u zakázek, které ceník mají (ostré 0383 a 377).
 *
 * Příčina je opravená v kódu. Aplikace si navíc značku srovná sama, jakmile
 * zakázku někdo otevře a uloží. Tenhle skript je pro ty ostatní: projde
 * všechny zakázky naráz, aby se na ně nemuselo čekat, až na ně někdo klikne.
 *
 * CO DĚLÁ A CO NEDĚLÁ
 *   – NIC NEMAŽE. Odebírá výhradně dvě nálepky; ceny, zadání, zámky,
 *     poznámky ani přílohy se nedotkne.
 *   – Odebírá je JEN tam, kde jim obsah odporuje — tedy kde ceník obsahuje
 *     aspoň jednu nenulovou hodnotu. Ceník samých nul nechá být: tam je
 *     značka pravdivá.
 *   – NEJDŘÍV UKÁŽE NÁHLED a teprve po výslovném potvrzení zapisuje.
 *   – Ke každé změněné zakázce přidá zápis do protokolu, aby za měsíc
 *     bylo poznat, proč se razítko úpravy změnilo.
 *
 * SPUŠTĚNÍ
 *   node nastroje/migrace_znacky.mjs --web https://engscalc-test.netlify.app
 *   node nastroje/migrace_znacky.mjs --web https://…  --zapsat
 *
 * Bez `--zapsat` je to jen náhled — nic se neodešle. Heslo skript nečte
 * z příkazové řádky (zůstalo by v historii shellu); zeptá se na ně.
 *
 * POŘADÍ, VE KTERÉM TO PUSTIT (zadání: ostrá i testovací databáze):
 *   1. testovací web bez `--zapsat`  → podívat se, co by se stalo,
 *   2. testovací web s `--zapsat`    → ověřit v aplikaci, že tisk nabídky
 *      na dotčené zakázce zase jde,
 *   3. ostrý web bez `--zapsat`,
 *   4. ostrý web s `--zapsat`.
 *
 * Skript běží proti SKUTEČNÉ databázi přes veřejné API — žádnou zkratku
 * dovnitř nemá a platí pro něj táž práva jako pro přihlášeného člověka
 * (zakázky smí číst a psát každý přihlášený).
 */
import { createInterface } from 'node:readline';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

/* Rozhodnutí „je ta značka lživá?" NEDĚLÁ tenhle skript, ale táž funkce,
 * kterou používá aplikace i server. Druhá kopie pravidla by se dřív nebo
 * později rozešla — a rozhodovala by o cizích datech. */
const UK = require('../src/ukazkove.js');

const args = process.argv.slice(2);
const arg = (jm) => { const i = args.indexOf(jm); return i >= 0 ? args[i + 1] : null; };
const WEB = String(arg('--web') || '').replace(/\/+$/, '');
const ZAPSAT = args.includes('--zapsat');

if (!WEB) {
  console.error('Chybí adresa webu.\n\n'
    + '  node nastroje/migrace_znacky.mjs --web https://engscalc-test.netlify.app\n'
    + '  node nastroje/migrace_znacky.mjs --web https://…  --zapsat\n\n'
    + 'Bez --zapsat se jen ukáže, co by se změnilo.');
  process.exit(2);
}

const rl = createInterface({ input: process.stdin, output: process.stdout });
const zeptej = (otazka) => new Promise(r => rl.question(otazka, o => r(o)));

/* Heslo se nevypisuje na obrazovku. Není to dokonalé skrytí (Node nad tím
 * nemá plnou moc), ale nezůstane aspoň v historii shellu ani přes rameno. */
async function zeptejHeslo(otazka) {
  process.stdout.write(otazka);
  const stdin = process.stdin;
  const bylo = stdin.isRaw;
  if (stdin.isTTY) stdin.setRawMode(true);
  let heslo = '';
  return new Promise(r => {
    const konec = () => {
      if (stdin.isTTY) stdin.setRawMode(!!bylo);
      stdin.removeListener('data', naData);
      process.stdout.write('\n');
      r(heslo);
    };
    const naData = (buf) => {
      const s = buf.toString('utf8');
      for (const zn of s) {
        if (zn === '\n' || zn === '\r' || zn === '\u0004') return konec();
        if (zn === '\u0003') { process.stdout.write('\n'); process.exit(130); }
        if (zn === '\u007f' || zn === '\b') { heslo = heslo.slice(0, -1); continue; }
        heslo += zn;
      }
    };
    stdin.on('data', naData);
  });
}

let COOKIE = '';
async function api(cesta, telo) {
  const odp = await fetch(WEB + cesta, {
    method: telo ? 'POST' : 'GET',
    headers: Object.assign({ 'content-type': 'application/json' }, COOKIE ? { cookie: COOKIE } : {}),
    body: telo ? JSON.stringify(telo) : undefined,
  });
  const text = await odp.text();
  let data = null;
  try { data = JSON.parse(text); } catch (e) { /* nechá se null, řeší volající */ }
  return { odp, data, text };
}

/* ---------- přihlášení ---------- */
const email = await zeptej('E-mail administrátora: ');
const heslo = await zeptejHeslo('Heslo: ');
const prih = await api('/api/prihlaseni', { email: email.trim(), heslo });
if (!prih.data || !prih.data.ok) {
  console.error('Přihlášení se nepovedlo: ' + ((prih.data && prih.data.chyba) || prih.text.slice(0, 200)));
  rl.close(); process.exit(1);
}
COOKIE = (prih.odp.headers.get('set-cookie') || '').split(';')[0];
console.log('Přihlášen jako ' + email.trim() + ' (' + (prih.data.role || '?') + ') na ' + WEB + '\n');

/* ---------- co je v databázi ---------- */
const rej = await api('/api/zakazky');
if (!rej.data || !rej.data.ok) {
  console.error('Rejstřík zakázek se nepodařilo přečíst: '
    + ((rej.data && rej.data.chyba) || rej.text.slice(0, 200)));
  rl.close(); process.exit(1);
}
const seznam = ((rej.data.rejstrik || {}).zakazky || []).filter(z => z && z.soubor);
console.log('Zakázek v databázi: ' + seznam.length + '\n');

/* ---------- náhled ---------- */
const kandidati = [];
for (const z of seznam) {
  const r = await api('/api/zakazky?soubor=' + encodeURIComponent(z.soubor));
  if (!r.data || !r.data.ok || !r.data.zakazka) {
    console.log('  ! ' + z.soubor + ' — nepodařilo se přečíst, přeskakuji');
    continue;
  }
  const zak = r.data.zakazka;
  const dotcene = [];
  for (const v of (zak.varianty || [])) {
    const d = (v && v.data) || null;
    if (!d) continue;
    if (UK.ukazkoveSrovnejSObsahem(d.cenik)) dotcene.push((v.nazev || v.id) + ' (ceník OCK)');
    if (d.proj && UK.ukazkoveSrovnejSObsahem(d.proj.cenik))
      dotcene.push((v.nazev || v.id) + ' (ceník PROJ)');
  }
  if (dotcene.length) kandidati.push({ soubor: z.soubor, cislo: zak.cislo || '', zak, dotcene });
}

if (!kandidati.length) {
  console.log('Žádná zakázka lživou značku nenese — není co migrovat.');
  rl.close(); process.exit(0);
}

console.log('KE ZMĚNĚ (' + kandidati.length + ' zakázek):\n');
kandidati.forEach(k => {
  console.log('  ' + (k.cislo || '(bez čísla)') + '   [' + k.soubor + ']');
  k.dotcene.forEach(d => console.log('      – ' + d));
});
console.log('\nOdebere se jen nálepka „ukázkový / prázdný ceník". Ceny, zadání,'
  + '\nzámky, poznámky ani přílohy se nemění.\n');

if (!ZAPSAT) {
  console.log('NÁHLED — nic se nezapsalo. Pro skutečný zápis přidejte --zapsat.');
  rl.close(); process.exit(0);
}

const potvrzeni = await zeptej('Zapsat změny do databáze? Napište ANO: ');
if (potvrzeni.trim().toUpperCase() !== 'ANO') {
  console.log('Zrušeno — nic se nezapsalo.');
  rl.close(); process.exit(0);
}

/* ---------- zápis ---------- */
let hotovo = 0, selhalo = 0;
for (const k of kandidati) {
  /* Zápis do protokolu zakázky: bez něj by se u zakázky jen tiše změnilo
   * razítko úpravy a nikdo by po měsíci nevěděl proč. */
  const zaznam = {
    id: 'pz-migrace-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7),
    kdy: new Date().toISOString(),
    kdo: email.trim(),
    druh: 'jine',
    text: 'Jednorázová migrace 21. 9. 2026 (nálezy N2/N3): odstraněna nepravdivá značka '
      + '„ukázkový / prázdný ceník" u ' + k.dotcene.length + ' ceníku(ů). '
      + 'Ceny ani zadání se nezměnily. Dotčeno: ' + k.dotcene.join(', ') + '.',
  };
  if (!Array.isArray(k.zak.poznamky)) k.zak.poznamky = [];
  k.zak.poznamky.push(zaznam);

  const ul = await api('/api/zakazky', { zakazka: k.zak, ocekavaneRazitko: k.zak.uloRazitko });
  if (ul.data && ul.data.ok) { hotovo++; console.log('  ✓ ' + (k.cislo || k.soubor)); }
  else {
    selhalo++;
    console.log('  ✗ ' + (k.cislo || k.soubor) + ' — '
      + ((ul.data && ul.data.chyba) || ul.text.slice(0, 160)));
  }
}

console.log('\nHotovo: ' + hotovo + ' zakázek upraveno, ' + selhalo + ' selhalo.');
if (selhalo) {
  console.log('Selhané zakázky zůstaly beze změny. Nejčastější důvod je, že je mezitím'
    + '\nněkdo uložil (razítko se změnilo) — pusťte skript znovu.');
}
rl.close();
