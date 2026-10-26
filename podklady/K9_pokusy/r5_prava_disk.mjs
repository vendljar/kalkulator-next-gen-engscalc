/* K9 #526 R5 — práva a únik otisků hesel; Disk (hodiny prohlížeče, záznam kopie). */
import { pamet, nalez, over, konec, ticho, vlozOtisk } from './spolecne.mjs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const Z = await import('../../netlify/lib/zalohovani.mjs');
const RZ = require('../../src/retence_zaloh.js');
const { default: prihlaseni } = await import('../../netlify/functions/prihlaseni.mjs');
const { default: zalohaFn } = await import('../../netlify/functions/zaloha.mjs');
const { default: zalohaVynuceno } = await import('../../netlify/functions/zaloha_vynuceno.mjs');
const { default: obnova } = await import('../../netlify/functions/obnova.mjs');
const { ADMIN_EMAIL, hesloOtisk } = await import('../../netlify/lib/sdilene.mjs');

const login = async (email, heslo) => { const r = await prihlaseni(new Request('http://x/api/prihlaseni', { method: 'POST', body: JSON.stringify({ email, heslo }) }));
  return (r.headers.get('set-cookie') || '').split(';')[0]; };
const admin = await login(ADMIN_EMAIL, 'Docasne.Heslo.123');
const otiskHesla = JSON.parse(pamet.get('uzivatele/' + ADMIN_EMAIL)).heslo;
for (const [e, role] of [['vedouci@priklad.cz', 'Vedoucí'], ['obch@priklad.cz', 'Obchodník']])
  pamet.set('uzivatele/' + e, JSON.stringify({ email: e, jmeno: e, role, aktivni: true, heslo: otiskHesla }));
const ved = await login('vedouci@priklad.cz', 'Docasne.Heslo.123');
const obch = await login('obch@priklad.cz', 'Docasne.Heslo.123');
over('vedoucí a obchodník přihlášeni', !!ved && !!obch);
pamet.set('zakazky/z/A', JSON.stringify({ cislo: 'A', nazev: 'Zakázka A' }));
pamet.set('podpisy/' + ADMIN_EMAIL, JSON.stringify({ obrazek: 'data:image/png;base64,AAAA' }));
await Z.porizOtisk('nocni-otisk', '', new Date().toISOString().slice(0, 10));

/* role */
const req = (url, cookie, telo) => new Request(url, telo ? { method: 'POST', headers: { cookie }, body: JSON.stringify(telo) } : { headers: { cookie } });
const kody = [];
for (const [jm, ck] of [['vedoucí', ved], ['obchodník', obch], ['bez přihlášení', '']]) {
  kody.push([jm, 'GET zaloha', (await zalohaFn(req('http://x/api/zaloha?strana=1', ck))).status]);
  kody.push([jm, 'GET zaloha nocni', (await zalohaFn(req('http://x/api/zaloha?zdroj=nocni&strana=1', ck))).status]);
  kody.push([jm, 'GET přehled', (await zalohaVynuceno(req('http://x/api/zaloha_vynuceno', ck))).status]);
  kody.push([jm, 'POST vynucený', (await zalohaVynuceno(req('http://x/api/zaloha_vynuceno', ck, { duvod: 'rucne' }))).status]);
  kody.push([jm, 'POST potvrdit', (await zalohaVynuceno(req('http://x/api/zaloha_vynuceno', ck, { akce: 'retence-potvrdit', den: 'x', hesloSpravce: 'Docasne.Heslo.123' }))).status]);
  kody.push([jm, 'POST obnova', (await obnova(req('http://x/api/obnova', ck, { faze: 'zacatek', rezim: 'doplnit', potvrzeni: 'OBNOVIT' }))).status]);
}
over('zálohy, přehled, vynucený, potvrzení i obnova: jen Administrátor (ostatní 401/403)', kody.every(k => k[2] === 401 || k[2] === 403), kody.filter(k => k[2] !== 401 && k[2] !== 403));

/* otisky hesel nikdy ven: všechny odpovědi, které admin dostane */
const ven = [];
const sbirej = async (url) => { let po = '', n = 0; do { const t = await (await zalohaFn(req(url + (po ? '&po=' + encodeURIComponent(po) : ''), admin))).text();
  ven.push(t); const o = JSON.parse(t); po = o.dalsi || ''; } while (po && ++n < 50); };
await sbirej('http://x/api/zaloha?strana=1');
await sbirej('http://x/api/zaloha?zdroj=nocni&strana=1');
ven.push(await (await zalohaFn(req('http://x/api/zaloha', admin))).text());
ven.push(await (await zalohaFn(req('http://x/api/zaloha?zdroj=nocni', admin))).text());
ven.push(await (await zalohaVynuceno(req('http://x/api/zaloha_vynuceno', admin))).text());
const hash = otiskHesla.split(':').pop();
over('žádná odpověď záloh nenese otisk hesla (ani sůl:hash, ani pole „heslo")', ven.every(t => !t.includes(hash) && !/"heslo"/.test(t)), ven.map(t => t.length));
over('kopie na Disk (zdroj=nocni) nenese podpisy', ven.slice(0).filter((t, i) => i >= 1).every(t => !t.includes('AAAA') || !/zdroj=nocni/.test(t)));
const nocniText = ven.find(t => /"puvod":"nocni-otisk"/.test(t));
over('kopie na Disk: podpisy null', !!nocniText && /"podpisy":null/.test(nocniText) && !nocniText.includes('data:image/png;base64,AAAA'));

/* Disk: úklid počítá „dnes" z hodin prohlížeče */
{
  const slozka = [];
  for (let t = Date.parse('2026-05-01'); t <= Date.parse('2026-10-26'); t += 7 * 86400000) slozka.push('otisk_' + new Date(t).toISOString().slice(0, 10) + '.json.gz');
  for (let d = 20; d <= 26; d++) slozka.push('otisk_2026-10-' + d + '.json.gz');
  const spravne = RZ.retenceZalohDiskVyber(slozka, '2026-10-26', ['otisk_2026-10-26.json.gz']);
  const posunute = RZ.retenceZalohDiskVyber(slozka, '2027-10-26', ['otisk_2026-10-26.json.gz']);
  nalez('K9-S6', 'úklid kopií na Disku bere dnešek z hodin PROHLÍŽEČE (kopieDiskUklid bez `ted`) — hodiny o rok napřed smažou ' + posunute.length + ' z '
    + slozka.length + ' kopií (správně ' + spravne.length + '); zůstane jen nejnovější a právě zapsaná',
    posunute.length > spravne.length + 10, { spravne: spravne.length, posunute: posunute.length, zbyde: slozka.length - posunute.length });
}

/* Záznam kopie na Disk: server obsah nijak neověří — velikost 1 B a libovolný SHA odemknou retenci */
{
  const dnes = new Date().toISOString().slice(0, 10);
  const o = await (await zalohaVynuceno(req('http://x/api/zaloha_vynuceno', admin, { akce: 'kopie-disk', hesloSpravce: 'Docasne.Heslo.123',
    kopie: { soubor: 'otisk_' + dnes + '.json.gz', velikostB: 1, sha256: 'f'.repeat(64), otisk: dnes, puvod: 'nocni-otisk', slozka: '_Zaloha Netlify DB' } }))).json();
  const pod = Z.kopieDiskPodlozena(o.kopieDisk, Object.keys(Object.fromEntries([...pamet.keys()].filter(k => k.startsWith('zalohy/')).map(k => [k.slice(7), 1]))));
  nalez('K9-I2', 'záznam kopie na Disk s velikostí 1 B (otisk má MB) server přijme a ten retenci odemkne — velikost se s manifestem/souhrnem neporovná',
    o.ok && pod, { ok: o.ok, podlozena: pod });
}
konec();
