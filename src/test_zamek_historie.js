/* ============================================================
 * HISTORICKÉ ZAKÁZKY S ODESLANOU NABÍDKOU: OTEVŘÍT → ULOŽIT MUSÍ PROJÍT
 * (A3, N43 — 25. 9. 2026)
 *
 * PROČ TAHLE SADA EXISTUJE. Hloubkový test 24. 9. 2026 (N43): zakázka
 * s odeslanou (zamčenou) nabídkou uložená ve STARŠÍM tvaru dat se po otevření
 * v nové verzi nedala uložit vůbec — `importZakazka` doplnil nové klíče
 * (cetrisKc, zaokrProj, kryciProj…) i do zamčené varianty a server je
 * porovnával s nemigrovanou uloženou verzí → 409 celé zakázce, včetně práce
 * na odemčených variantách. Oprava z v24.9.4 porovnává migrované
 * s migrovaným, jenže „migrované" na serveru znamená migrované TÍM, CO MÁ
 * SERVER NAČTENÉ (netlify/lib/jadro_moduly.cjs) — a to je menší sada modulů
 * než prohlížeč. Migrace krycího listu (kryci.js: zadržné „ANO 10 %" → Ano
 * + procento, zahození sazby DPH) na serveru neběžela a starší zakázka
 * s krycím listem zase končila 409.
 *
 * Sada proto drží FIXTURY zakázek uložených starším tvarem dat
 * (src/fixtury/*.json — smyšlené údaje, zkušební ceník) a nad každou projde
 * skutečnou cestu obchodníka:
 *   1) OTEVŘÍT jako prohlížeč — importZakazka běží v odděleném kontextu
 *      poskládaném přesně ze seznamu CORE v build.py (tedy z toho, co je
 *      v sestavené aplikaci), ne z toho, co má náhodou načtený test;
 *   2) ULOŽIT přes skutečnou serverovou funkci /api/zakazky nad paměťovým
 *      úložištěm, kde leží NEMIGROVANÝ starý tvar — jako v databázi;
 *   3) znovu otevřít a uložit (migrace je idempotentní), skutečnou změnu
 *      odeslané nabídky server dál odmítne, obnova ze zálohy ve starém tvaru
 *      nehlásí změnu odeslané nabídky.
 *
 * Fixtury (co v nich CHYBÍ proti dnešnímu tvaru):
 *   – 2026-08-08: bez čísla z papíru, bez zmrazeného výsledku, bez řady ceníku,
 *     bez slevy PROJ (stará `slevaPct` v zadání), staré fixy lešení, krycí
 *     list se zadržným „ANO 10 %" a sazbou DPH, staré názvy řádků skla,
 *     bez průchozí šachty A/C, bez `nepocitat`, role „Vedoucí obchodu";
 *   – 2026-09-17: zmrazený výsledek ano, ale číslování před #320 (zamčená
 *     druhá varianta nese v zámku příponu .1, dokumenty tiskly .2), bez
 *     `cetrisKc`, bez opláštění po stěnách, bez volby nad dveřmi;
 *   – 2026-09-23: číslo z papíru, odemčení administrátorem a nový zámek
 *     s historií tisků, příloha, protokol; chybí jen klíče z 24.–25. 9.
 *
 * Nová fixtura = uložit soubor do src/fixtury/ — sada ji vezme sama.
 * Spuštění: node src/test_zamek_historie.js
 * ============================================================ */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

process.env.TAJEMSTVI_RELACE = process.env.TAJEMSTVI_RELACE || 'testovaci-tajemstvi-jen-pro-lokalni-beh';
process.env.ADMIN_INIT_HESLO = process.env.ADMIN_INIT_HESLO || 'Docasne.Heslo.123';
if (!process.env.ADMIN_EMAIL) process.env.ADMIN_EMAIL = 'spravce@priklad.cz';

/* Paměťové úložiště místo Netlify Blobs — stejný princip jako netlify/test_*.mjs. */
const pamet = new Map();
globalThis.__TEST_ULOZISTE = (nazev) => ({
  async cti(k) { return pamet.has(nazev + '/' + k) ? JSON.parse(pamet.get(nazev + '/' + k)) : null; },
  async zapis(k, v) { pamet.set(nazev + '/' + k, JSON.stringify(v)); },
  async seznam(prefix) { return [...pamet.keys()].filter(x => x.startsWith(nazev + '/' + (prefix || ''))).map(x => x.slice(nazev.length + 1)); },
  async smaz(k) { pamet.delete(nazev + '/' + k); },
});

let ok = 0, fail = 0;
const test = (n, cond, info) => {
  if (cond) { ok++; console.log('OK  ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : (typeof info === 'string' ? info : JSON.stringify(info).slice(0, 600))); }
};
const kop = x => JSON.parse(JSON.stringify(x));

/* ---------- prohlížeč: kontext ze seznamu CORE v build.py ----------
 * Totéž lepení jako build.py (CORE za sebou, bez module.exports), jen
 * v izolovaném kontextu: test v hlavním kontextu má načtené jádro serveru,
 * a kdyby klient běžel tamtéž, sdílel by s ním migrační funkce a rozdíl
 * mezi prohlížečem a serverem by nešel vidět. */
function klientKontext() {
  const buildPy = fs.readFileSync(path.join(__dirname, '..', 'build.py'), 'utf8');
  const m = /^CORE = \[([\s\S]*?)\]/m.exec(buildPy);
  if (!m) throw new Error('v build.py chybí seznam CORE');
  const soubory = [...m[1].matchAll(/'([^']+)'/g)].map(x => x[1]);
  const strip = js => js.replace(/if \(typeof module !== 'undefined'\)\s*\n?\s*module\.exports = \{[^}]*\};?/g, '');
  const kod = soubory.map(f => strip(fs.readFileSync(path.join(__dirname, f), 'utf8'))).join('\n');
  const ctx = vm.createContext({ console, JEKLY: require('./jekly.json') });
  vm.runInContext(kod, ctx, { filename: 'klient-core.js' });
  return { ctx, soubory };
}

(async () => {
  const { ctx, soubory } = klientKontext();
  test('prohlížečový kontext se poskládal ze seznamu CORE v build.py (' + soubory.length + ' souborů)',
    soubory.length > 30 && typeof vm.runInContext('importZakazka', ctx) === 'function');
  const klientOtevri = (raw) => JSON.parse(vm.runInContext('(s) => JSON.stringify(importZakazka(JSON.parse(s)))', ctx)(JSON.stringify(raw)));
  const klientCislo = (zak, v) => vm.runInContext('(z, id) => variantaCislo(z, z.varianty.find(x => x.id === id))', ctx)(zak, v.id);

  /* ---------- server: skutečné funkce nad paměťovým úložištěm ---------- */
  const prihlaseni = (await import('../netlify/functions/prihlaseni.mjs')).default;
  const uzivatele = (await import('../netlify/functions/uzivatele.mjs')).default;
  const program = (await import('../netlify/functions/program.mjs')).default;
  const zakazky = (await import('../netlify/functions/zakazky.mjs')).default;
  const obnova = (await import('../netlify/functions/obnova.mjs')).default;
  const { ADMIN_EMAIL } = await import('../netlify/lib/sdilene.mjs');
  const { ULO } = require('../netlify/lib/jadro_moduly.cjs');
  const zm = require('./zamek.js');
  const ZC = require('./zkusebni_cenik.js');
  const post = (fn, url, telo, cookie) => fn(new Request(url, { method: 'POST', headers: cookie ? { cookie } : {}, body: JSON.stringify(telo) }));
  const uloz = async (zak, razitko, cookie) => { const r = await post(zakazky, 'http://x/api/zakazky', { zakazka: zak, ocekavaneRazitko: razitko }, cookie); return { status: r.status, telo: await r.json() }; };

  const r1 = await post(prihlaseni, 'http://x/api/prihlaseni', { email: ADMIN_EMAIL, heslo: 'Docasne.Heslo.123' });
  const cAdmin = (r1.headers.get('set-cookie') || '').split(';')[0];
  test('administrátor přihlášen (bootstrap)', r1.status === 200);
  const z1 = await (await post(uzivatele, 'http://x/api/uzivatele',
    { akce: 'zaloz', email: 'obchodnik@priklad.cz', jmeno: 'Test Obchodník', role: 'Obchodník', heslo: 'ObchodHeslo1' }, cAdmin)).json();
  test('obchodník (autor fixtur) založen', z1.ok === true, z1);
  const r2 = await post(prihlaseni, 'http://x/api/prihlaseni', { email: 'obchodnik@priklad.cz', heslo: 'ObchodHeslo1' });
  const cObch = (r2.headers.get('set-cookie') || '').split(';')[0];
  const pub = await (await post(program, 'http://x/api/program', { cenik: ZC.zkusebniCenik(), cenikProj: ZC.zkusebniCenikProj(),
    slevy: { minMarze: 0.1, maxGlobalni: 0.3, stropy: { 'Obchodník': 0.05, 'Vedoucí': 0.15 } }, poznamka: 'zkušební' }, cAdmin)).json();
  test('zkušební ceník zveřejněn', pub.ok === true, pub);

  const slozka = path.join(__dirname, 'fixtury');
  const fixtury = fs.readdirSync(slozka).filter(f => /^zakazka_.*\.json$/.test(f)).sort();
  test('ve složce src/fixtury jsou aspoň tři historické zakázky', fixtury.length >= 3, fixtury);

  for (const soubor of fixtury) {
    console.log('\n===== ' + soubor + ' =====');
    const raw = JSON.parse(fs.readFileSync(path.join(slozka, soubor), 'utf8'));
    const jmeno = ULO.uloJmenoSouboru(raw);
    const zamcene = raw.varianty.filter(v => v.zamek && v.zamek.zamceno);
    test('fixtura má odeslanou (zamčenou) variantu a jméno souboru', zamcene.length >= 1 && !!jmeno, { jmeno, zamcene: zamcene.length });

    /* 1) otevřít v prohlížeči */
    let otevrena = null;
    try { otevrena = klientOtevri(raw); } catch (e) { test('klient: zakázka jde otevřít (importZakazka)', false, e.message); continue; }
    test('klient: zakázka jde otevřít (importZakazka)', !!otevrena && Array.isArray(otevrena.varianty) && otevrena.varianty.length === raw.varianty.length);
    test('klient: zamčené varianty zůstaly zamčené a číslo v zámku sedí se zakázkou',
      zamcene.every(v => { const o = otevrena.varianty.find(x => x.id === v.id); return zm.variantaUzamcena(o) && (!o.zamek.cislo || zm.zamekCisloZakladSedi(o.zamek.cislo, otevrena)); }),
      zamcene.map(v => (otevrena.varianty.find(x => x.id === v.id) || {}).zamek));
    test('klient: otevření doplnilo do zamčené varianty klíče, které starý tvar nemá (tj. sada opravdu měří migraci)',
      zamcene.some(v => JSON.stringify(otevrena.varianty.find(x => x.id === v.id).data) !== JSON.stringify(v.data)));
    const kz = ULO.uloKontrolaZamku(raw, otevrena);
    test('model: uloKontrolaZamku(uložená, otevřená) projde', kz.ok === true, kz);
    test('model: žádný problém identifikátorů ani typů polí',
      ULO.uloIdProblemy(otevrena).length === 0 && ULO.uloTypyProblemy(otevrena, raw).length === 0,
      { id: ULO.uloIdProblemy(otevrena), typy: ULO.uloTypyProblemy(otevrena, raw) });

    /* 2) uložit přes server nad NEMIGROVANOU uloženou verzí */
    pamet.set('zakazky/z/' + jmeno, JSON.stringify(raw));
    const u1 = await uloz(otevrena, raw.uloRazitko || '', cObch);
    test('server (N43): uložení po otevření projde obchodníkovi — 200', u1.status === 200 && u1.telo.ok === true, u1);
    const ulozena1 = JSON.parse(pamet.get('zakazky/z/' + jmeno) || 'null');
    test('server: zmrazený výsledek a razítka zámku zůstaly z uložené verze (uloZamekRazitkaDrz)',
      !!ulozena1 && zamcene.every(v => { const s = ulozena1.varianty.find(x => x.id === v.id); return !!s && JSON.stringify(s.zamek.vysledek || null) === JSON.stringify(v.zamek.vysledek || null)
        && s.zamek.kdo === v.zamek.kdo && s.zamek.kdy === v.zamek.kdy && (s.zamek.tisky || []).length === (v.zamek.tisky || []).length; }));

    /* 3) znovu otevřít a uložit — migrace je idempotentní */
    const otevrena2 = klientOtevri(ulozena1);
    otevrena2.nazevAkce = raw.nazevAkce + ' (upraveno)';
    const u2 = await uloz(otevrena2, ulozena1.uloRazitko, cObch);
    test('server: druhé otevření a uložení projde (migrace je idempotentní)', u2.status === 200, u2);
    const ulozena2 = JSON.parse(pamet.get('zakazky/z/' + jmeno));
    test('server: data zamčené varianty se mezi prvním a druhým uložením nezměnila',
      zamcene.every(v => JSON.stringify(ulozena1.varianty.find(x => x.id === v.id).data) === JSON.stringify(ulozena2.varianty.find(x => x.id === v.id).data)));
    test('server: práce na hlavičce se uložila', ulozena2.nazevAkce === raw.nazevAkce + ' (upraveno)');

    /* 4) skutečná změna odeslané nabídky se dál odmítne */
    const zmenena = klientOtevri(ulozena2);
    const zv = zmenena.varianty.find(x => x.id === zamcene[0].id);
    zv.data.ock.zadani.sirka = 9.99;
    const u3 = await uloz(zmenena, ulozena2.uloRazitko, cObch);
    test('server: skutečná změna zadání odeslané nabídky se odmítne (409)', u3.status === 409 && /uzamčen/.test(u3.telo.chyba || ''), u3);
    const zmenena2 = klientOtevri(ulozena2);
    zmenena2.varianty.find(x => x.id === zamcene[0].id).data.cenik.profilasKgKc = 1;
    const u4 = await uloz(zmenena2, ulozena2.uloRazitko, cObch);
    test('server: ani změna ceníku odeslané nabídky neprojde (409)', u4.status === 409, u4);

    /* 5) obnova ze zálohy ve starém tvaru nad novější uloženou verzí — tytéž
     * pojistky jako uložení (P4), tedy i táž migrace a očista na obou stranách. */
    const o = await (await post(obnova, 'http://x/api/obnova', { zdroj: { soubor: { porizena: '2026-09-25T00:00:00.000Z', zakazky: { [jmeno]: raw } } },
      rezim: 'prepsat', nahled: true, casti: ['zakazky'] }, cAdmin)).json();
    const duvody = (o.casti && o.casti.zakazky && o.casti.zakazky.duvody) || [];
    test('obnova (N43/P4): záloha ve starším tvaru nehlásí změnu dat odeslané nabídky',
      o.ok === true && !duvody.some(d => /uzam|odeslan/.test(d.duvod)), o.casti && o.casti.zakazky);
  }

  /* ---------- co je specifické pro jednotlivé fixtury ---------- */
  console.log('\n===== migrace jednotlivých fixtur =====');
  {
    const raw = JSON.parse(fs.readFileSync(path.join(slozka, 'zakazka_2026-08-08_odeslana_bez_otisku.json'), 'utf8'));
    const o = klientOtevri(raw);
    const d = o.varianty[0].data;
    test('2026-08-08: stará sleva PROJ (slevaPct −5) se převedla na schválenou slevu 5 %',
      d.slevaProj && d.slevaProj.procenta === 5 && d.slevaProj.stav === 'schváleno', d.slevaProj);
    test('2026-08-08: staré fixy lešení se sloučily do leseniFix', d.cenik.leseniFix === 10000 && d.cenik.leseniVnitrniFix === undefined, d.cenik.leseniFix);
    test('2026-08-08: zadržné „ANO 10 %" → Ano + 10 (migrace krycího listu běží v prohlížeči)',
      d.kryci.hodnoty.zadrzne === 'Ano' && d.kryci.hodnoty.zadrzneProc === '10' && d.kryci.hodnoty.sazbaDph === undefined, d.kryci.hodnoty);
    test('2026-08-08: role „Vedoucí obchodu" se u NEZAMČENÉ varianty převedla, u zamčené zůstala',
      o.varianty[1].data.sleva.role === 'Vedoucí' && o.varianty[0].data.sleva.role === 'Vedoucí obchodu');
    test('2026-08-08: přípony podle pořadí (holé číslo, .2) a schéma číslování', o.varianty[0].pripona === 0 && o.varianty[1].pripona === 2 && o.priponySchema === 2);
  }
  {
    const raw = JSON.parse(fs.readFileSync(path.join(slozka, 'zakazka_2026-09-17_odeslana_stare_cislovani.json'), 'utf8'));
    const o = klientOtevri(raw);
    const v2 = o.varianty[1];
    test('2026-09-17: zamčená druhá varianta se přečíslovala na .2 (číslo z papíru), zámek si nechal .1',
      v2.pripona === 2 && klientCislo(o, v2) === '2026 - OPR - CN - 0917.2' && v2.zamek.cislo === '2026 - OPR - CN - 0917.1', { pripona: v2.pripona, cislo: klientCislo(o, v2), zamek: v2.zamek.cislo });
    test('2026-09-17: zmrazený výsledek se nepřepočítal (build zámku zůstal v17.9.3)', v2.zamek.vysledek && v2.zamek.vysledek.build === 'v17.9.3');
  }
  {
    const raw = JSON.parse(fs.readFileSync(path.join(slozka, 'zakazka_2026-09-23_odemcena_znovu_odeslana.json'), 'utf8'));
    const o = klientOtevri(raw);
    const v1 = o.varianty[0];
    test('2026-09-23: historie odemčení i dva tisky zůstaly', Array.isArray(v1.odemceni) && v1.odemceni.length === 1 && v1.zamek.tisky.length === 2);
    test('2026-09-23: příloha s datovou adresou prošla kontrolou přílohy', ULO.uloIdProblemy(o).length === 0 && o.prilohy.length === 1);
  }

  console.log('\n' + ok + ' OK, ' + fail + ' FAIL');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.log('FAIL sada spadla: ' + (e && e.stack || e)); process.exit(1); });
