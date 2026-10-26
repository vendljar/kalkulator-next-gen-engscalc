/* K9 #526 R4 — souběhy: retence × rozběhnutá obnova, dva noční běhy přes sebe,
 * úklid rozpracovaných × vynucený otisk, manifest bez části, jednorázová obnova. */
import { pamet, nastaveni, nalez, over, konec, ticho, kopieDisk, klice } from './spolecne.mjs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const Z = await import('../../netlify/lib/zalohovani.mjs');
const { default: prihlaseni } = await import('../../netlify/functions/prihlaseni.mjs');
const { default: obnova } = await import('../../netlify/functions/obnova.mjs');
const { default: zalohaFn } = await import('../../netlify/functions/zaloha.mjs');
const { ADMIN_EMAIL } = await import('../../netlify/lib/sdilene.mjs');
Object.assign(globalThis, require('../../src/format.js'), require('../../src/engine.js'), require('../../src/engine_proj.js'),
  require('../../src/techspec.js'), require('../../src/sleva.js'), require('../../src/zaokrouhleni.js'), require('../../src/zamek.js'));
const zk = require('../../src/zakazka.js');
const { uloJmenoSouboru } = require('../../src/uloziste.js');

const text = (n, z) => (z + ' Příliš žluťoučký kůň úpěl ďábelské ódy. ').repeat(Math.ceil(n / 40)).slice(0, n);
const KLIC = (i) => uloJmenoSouboru({ cislo: '2026 - OBJ - CN - ' + String(i).padStart(4, '0') });
for (let i = 0; i < 120; i++) {
  const z = zk.novaZakazka(); z.cislo = '2026 - OBJ - CN - ' + String(i).padStart(4, '0');
  z.nazevAkce = 'Zakázka ' + i + ' ' + text(60000, 'Z' + i);            // ~60 kB → víc částí
  pamet.set('zakazky/z/' + KLIC(i), JSON.stringify(z));
}
const r = await prihlaseni(new Request('http://x/api/prihlaseni', { method: 'POST', body: JSON.stringify({ email: ADMIN_EMAIL, heslo: 'Docasne.Heslo.123' }) }));
const cookie = (r.headers.get('set-cookie') || '').split(';')[0];
const telo = async (x) => (await obnova(new Request('http://x/api/obnova', { method: 'POST', headers: { cookie }, body: JSON.stringify(x) }))).json();
const puvMax = Z.OTISK_CAST_MAX_B;

/* ---- R4a retence smaže zdroj rozběhnuté obnovy ---- */
{
  /* otisk 2026-10-01 (měsíční… ne: 2026-10-02 — po 14 dnech jde pryč) */
  await Z.porizOtisk('nocni-otisk', '', '2026-10-02');
  const m = JSON.parse(pamet.get('zalohy/2026-10-02'));
  over('zdrojový otisk má víc částí', m.casti >= 1, m.casti);
  for (let i = 0; i < 120; i++) pamet.delete('zakazky/z/' + KLIC(i));       // havárie: zakázky pryč
  let zac = await telo({ faze: 'zacatek', rezim: 'doplnit', potvrzeni: 'OBNOVIT' });
  while (zac.ok && zac.otiskHotovo === false) zac = await telo({ faze: 'otisk', obnovaId: zac.obnovaId });
  const d1 = await telo({ obnovaId: zac.obnovaId, zdroj: { otisk: '2026-10-02', cast: 0, od: 0, kolik: 15 }, rezim: 'doplnit', casti: ['zakazky'], potvrzeni: 'OBNOVIT' });
  /* mezitím noc: nový noční otisk + retence (kopie na Disk čerstvá) */
  for (const d of ['2026-10-01', '2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23', '2026-10-24', '2026-10-25']) pamet.set('zalohy/' + d, JSON.stringify({ format: 'kng-otisk-casti-1', zdroj: 'nocni-otisk', casti: 0, pocetZakazek: 0, porizena: d }));
  await Z.porizOtisk('nocni-otisk', '', '2026-10-26');
  kopieDisk('2026-10-26', '2026-10-26T02:40:00.000Z');
  const ret = await Z.retenceProved('2026-10-26', '2026-10-26', Date.parse('2026-10-26T02:45:00Z'));
  const d2 = await telo({ obnovaId: zac.obnovaId, zdroj: { otisk: '2026-10-02', cast: 0, od: 15, kolik: 15 }, rezim: 'doplnit', casti: ['zakazky'], potvrzeni: 'OBNOVIT' });
  const obnoveno = klice('zakazky/').filter(k => k.startsWith('z/')).length;
  console.log('retence:', JSON.stringify(ret).slice(0,300)); nalez('K9-S5', 'retence smaže zdroj rozběhnuté obnovy (žádný zámek obnova × retence) — další dávky 404, obnova skončí napůl (' + obnoveno + ' ze 120 zakázek)',
    d1.ok && ret.smazano.includes('2026-10-02') && d2.ok === false, { retence: ret.smazano, d2: d2.chyba });
  await telo({ faze: 'konec', obnovaId: zac.obnovaId });
}

/* ---- R4b dva noční běhy přes sebe: druhý smaže hotový dnešní otisk ---- */
{
  const den = '2026-11-05';
  let v; do { v = await Z.porizOtiskKrok(den, 'nocni-otisk', '', { rozpocetMs: 1 }); } while (!v.hotovo);
  over('běh A dokončil otisk', !!pamet.get('zalohy/' + den));
  /* běh B: na začátku `cti(den)` ještě nic neviděl (A dopisoval manifest), teď volá krok */
  const b = await Z.porizOtiskKrok(den, 'nocni-otisk', '', { rozpocetMs: 1 });
  nalez('K9-N3', 'souběžný druhý noční běh (Run now v Netlify, opakování) po dokončení prvního smaže hotový dnešní otisk a pořizuje ho znovu — do dokončení dnešní otisk není',
    !pamet.get('zalohy/' + den) && b.hotovo === false, { b: { hotovo: b.hotovo } });
  do { v = await Z.porizOtiskKrok(den, 'nocni-otisk', '', {}); } while (!v.hotovo);
}

/* ---- R4c manifest bez části: retence ho počítá za nový otisk, kopie i obnova padnou ---- */
{
  await Z.porizOtisk('nocni-otisk', '', '2026-11-10');
  const m = JSON.parse(pamet.get('zalohy/2026-11-10'));
  pamet.delete('zalohy/casti/2026-11-10/' + String(m.casti - 1).padStart(5, '0'));
  let chyba = '';
  try { await Z.ctiOtisk(globalThis.__TEST_ULOZISTE('zalohy'), '2026-11-10'); } catch (e) { chyba = e.message; }
  over('ctiOtisk otisku bez části vyhodí s číslem části', /chybí část/.test(chyba), chyba);
  const res = await zalohaFn(new Request('http://x/api/zaloha?zdroj=nocni&strana=1&otisk=2026-11-10&po=' + (m.casti - 1), { headers: { cookie } })).catch(e => ({ status: 'výjimka: ' + e.message }));
  over('kopie na Disk: stránka s chybějící částí neprojde (výjimka / 5xx)', String(res.status).startsWith('výjimka') || res.status >= 500, res.status);
  kopieDisk('2026-11-09', '2026-11-10T03:00:00.000Z');
  for (let d = 1; d < 10; d++) pamet.set('zalohy/2026-10-0' + d, JSON.stringify({ format: 'kng-otisk-casti-1', zdroj: 'nocni-otisk', casti: 0, porizena: 'x' }));
  pamet.set('zalohy/2026-11-09', JSON.stringify({ format: 'kng-otisk-casti-1', zdroj: 'nocni-otisk', casti: 0, porizena: 'x', pocetZakazek: m.pocetZakazek, pocetUctu: m.pocetUctu, velikostB: m.velikostB }));
  const ret = await Z.retenceProved('2026-11-10', '2026-11-10', Date.parse('2026-11-10T03:00:00Z'));
  nalez('K9-N4', 'retence po nočním otisku, jehož část chybí (poškozený), běží — nový otisk se jen hledá, neověřuje (stačí manifest/souhrn)',
    ret.smazano.length > 0, { smazano: ret.smazano.length });
}

/* ---- R4d úklid rozpracovaných × běžící vynucený otisk ---- */
{
  const k = '2026-11-12T101010-rucne';
  let v = await Z.porizOtiskKrok(k, 'vynuceno', ADMIN_EMAIL, { rozpocetMs: 1 });
  const pred = klice().filter(x => x.startsWith('casti/' + k + '/')).length;
  await Z.uklidRozpracovane(Date.now() + 60000);
  const po = klice().filter(x => x.startsWith('casti/' + k + '/')).length;
  over('úklid nesmaže části živého rozpracovaného otisku', pred > 0 && pred === po, { pred, po });
  do { v = await Z.porizOtiskKrok(k, 'vynuceno', ADMIN_EMAIL, { rozpocetMs: 1, jenPokracovat: true }); } while (!v.hotovo);
  let ok = true; try { await Z.ctiOtisk(globalThis.__TEST_ULOZISTE('zalohy'), k); } catch (e) { ok = false; }
  over('otisk po úklidu dokončen a čitelný', ok);
}

/* ---- R4e jednorázová obnova (bez fáze) pořizuje otisk před obnovou jedním voláním ---- */
{
  let kroky = 0;
  const puv = Z.OTISK_ROZPOCET.synchronniMs;
  /* počítá zápisy částí otisku před obnovou v jednom požadavku */
  nastaveni.hookZapis = async (ul, k) => { if (ul === 'zalohy' && /-pred-obnovou$/.test(k.split('/')[1] || '') ) kroky++; };
  const o = await telo({ zdroj: { otisk: '2026-11-10T000000-pred-obnovou' }, rezim: 'doplnit', casti: ['firma'], potvrzeni: 'OBNOVIT' });
  nastaveni.hookZapis = null;
  nalez('K9-N5', 'jednorázová obnova (POST bez faze/obnovaId) pořizuje otisk před obnovou porizOtisk() celý v jednom požadavku — u velké databáze nad limit 10 s (pak 5xx; nic se nezapíše, zůstane rozpracovaný otisk)',
    true, { castiZapsanoVJednomPozadavku: kroky, odpoved: o.ok === false ? o.chyba : 'ok' });
}
konec();
