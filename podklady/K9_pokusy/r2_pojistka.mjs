/* K9 #526 R2 — pojistka „zálohy se mají zvětšovat" (retenceProved, potvrzení).
 * Otisky jen jako manifest + souhrn (vlozOtisk) — počty a velikosti, žádná data. */
import { pamet, nastaveni, nalez, over, konec, vlozOtisk, kopieDisk, klice, ticho } from './spolecne.mjs';
const Z = await import('../../netlify/lib/zalohovani.mjs');
const { default: prihlaseni } = await import('../../netlify/functions/prihlaseni.mjs');
const { default: zalohaVynuceno } = await import('../../netlify/functions/zaloha_vynuceno.mjs');
const { ADMIN_EMAIL } = await import('../../netlify/lib/sdilene.mjs');

const DEN = 86400000;
const iso = (t) => new Date(t).toISOString().slice(0, 10);
const reset = () => { for (const k of [...pamet.keys()]) if (k.startsWith('zalohy/')) pamet.delete(k); };
const noc = (den) => Z.retenceProved(den, den, Date.parse(den + 'T02:30:00Z'));

/* ---- R2a „salámová" ztráta: každou noc o 4 % zakázek a o 8 % dat méně ---- */
{
  reset();
  const t0 = Date.parse('2026-11-01T00:00:00Z');
  /* 40 dní stabilní historie (aby bylo co mazat) */
  for (let d = 0; d < 40; d++) vlozOtisk(iso(t0 + d * DEN), { pocetZakazek: 800, velikostB: 114e6 });
  let z = 800, v = 114e6, varovani = 0, smazano = 0;
  for (let d = 40; d < 54; d++) {
    z = Math.floor(z * 0.96); v = Math.floor(v * 0.92);
    const den = iso(t0 + d * DEN);
    vlozOtisk(den, { pocetZakazek: z, velikostB: v });
    kopieDisk(den, new Date(Date.parse(den + 'T01:00:00Z')).toISOString());
    const r = await noc(den);
    if (r.varovani || r.drzeno) varovani++;
    smazano += r.smazano.length;
  }
  nalez('K9-S1', 'pojistka porovnává jen se včerejším nočním otiskem — úbytek 4 % zakázek a 8 % dat každou noc projde 14 nocí bez varování (800 → '
    + z + ' zakázek, 114 → ' + Math.round(v / 1e6) + ' MB) a retence mezitím maže',
    varovani === 0 && z < 800 * 0.6 && smazano > 0, { varovani, zakazekNaKonci: z, MB: Math.round(v / 1e6), smazanoOtisku: smazano });
}

/* ---- R2b první varování přepsané druhým: správce uvidí jen menší úbytek ---- */
{
  reset();
  for (let d = 1; d <= 20; d++) vlozOtisk('2026-11-' + String(d).padStart(2, '0'), { pocetZakazek: 800, velikostB: 114e6 });
  kopieDisk('2026-11-20', '2026-11-20T01:00:00.000Z');
  vlozOtisk('2026-11-21', { pocetZakazek: 400, velikostB: 57e6 });       // noc 1: polovina pryč
  const r1 = await noc('2026-11-21');
  vlozOtisk('2026-11-22', { pocetZakazek: 370, velikostB: 50e6 });       // noc 2: dalších ~8 %
  const r2 = await noc('2026-11-22');
  const v = JSON.parse(pamet.get('zalohy/retence-varovani'));
  nalez('K9-S2', 'nepotvrzené varování (800 → 400 zakázek) přepíše další noc varováním 400 → 370; správce potvrzuje jen to, co vidí — velký úbytek zmizí z hlídky',
    !!r1.varovani && !!r2.varovani && v.den === '2026-11-22' && !/800/.test(v.text), { prvni: r1.varovani && r1.varovani.text, ted: v.text });
}

/* ---- R2c varování z Disku přepsané nočním ---- */
{
  reset();
  for (let d = 1; d <= 20; d++) vlozOtisk('2026-11-' + String(d).padStart(2, '0'), { pocetZakazek: 800, velikostB: 114e6 });
  kopieDisk('2026-11-20', '2026-11-20T01:00:00.000Z');
  pamet.set('zalohy/retence-varovani', JSON.stringify({ kdy: '2026-11-20T12:00:00.000Z', den: '2026-11-19', zdroj: 'disk',
    predchozi: 'otisk_2026-11-12.json.gz', pred: { velikostB: 9e7 }, nove: { velikostB: 3e7 }, text: 'kopie na Disku má 33 %' }));
  vlozOtisk('2026-11-21', { pocetZakazek: 790, velikostB: 113e6 });      // zakázek 790 > 95 % → bez varování
  vlozOtisk('2026-11-21', { pocetZakazek: 700, velikostB: 113e6 });      // 700 < 95 % → nové varování
  await noc('2026-11-21');
  const v = JSON.parse(pamet.get('zalohy/retence-varovani'));
  nalez('K9-S2b', 'nepotvrzené varování z Disku (kopie 33 %) přepíše noční varování — po potvrzení nočního se úbytek na Disku už neukáže',
    v.zdroj === 'nocni' && !/Disku/.test(v.text), v.text);
}

/* ---- R2d souběh potvrzení a nového varování (ztracený zápis) ---- */
{
  reset();
  const r = await prihlaseni(new Request('http://x/api/prihlaseni', { method: 'POST', body: JSON.stringify({ email: ADMIN_EMAIL, heslo: 'Docasne.Heslo.123' }) }));
  const cookie = (r.headers.get('set-cookie') || '').split(';')[0];
  over('správce přihlášen', r.status === 200, r.status);
  pamet.set('zalohy/retence-varovani', JSON.stringify({ kdy: '2026-11-21T02:30:00.000Z', den: '2026-11-21', zdroj: 'nocni', text: 'A: zakázek 800 → 400' }));
  /* během ověřování hesla (čtení účtu) zapíše noční běh nové varování B */
  let jednou = true, varovaniPrecteno = false;
  nastaveni.hookCti = async (ul, k) => {
    if (ul === 'zalohy' && k === 'retence-varovani') varovaniPrecteno = true;
    if (jednou && varovaniPrecteno && ul === 'uzivatele' && k === ADMIN_EMAIL) { jednou = false;
      pamet.set('zalohy/retence-varovani', JSON.stringify({ kdy: '2026-11-22T02:30:00.000Z', den: '2026-11-22', zdroj: 'nocni', text: 'B: zakázek 400 → 100' })); }
  };
  const o = await (await zalohaVynuceno(new Request('http://x/api/zaloha_vynuceno', { method: 'POST', headers: { cookie },
    body: JSON.stringify({ akce: 'retence-potvrdit', den: '2026-11-21', hesloSpravce: 'Docasne.Heslo.123' }) }))).json();
  nastaveni.hookCti = null;
  const v = JSON.parse(pamet.get('zalohy/retence-varovani'));
  nalez('K9-N1', 'potvrzení úbytku A přepíše varování B zapsané během ověření hesla (čtení–změna–zápis bez kontroly) — B je pryč a retence běží',
    o.ok === true && v.den === '2026-11-21' && !!v.potvrzeno && Z.retenceDrzena(v) === null, { odpoved: o.ok, zaznam: v.text });
}

/* ---- R2e záznam varování bez platného `kdy` = retence běží ---- */
{
  reset();
  for (let d = 1; d <= 20; d++) vlozOtisk('2026-11-' + String(d).padStart(2, '0'));
  kopieDisk('2026-11-20', '2026-11-20T01:00:00.000Z');
  pamet.set('zalohy/retence-varovani', JSON.stringify({ den: '2026-11-19', text: 'nepotvrzené, bez kdy' }));
  const r = await noc('2026-11-20');
  nalez('K9-N2', 'nepotvrzené varování bez platného `kdy` (poškozený záznam) retenci nezastaví — fail-open; nečitelný záznam ji zastaví',
    r.smazano.length > 0 && !r.drzeno, { smazano: r.smazano.length, ceka: r.ceka });
  pamet.set('zalohy/retence-varovani', '{nečitelné');
  let chyba = null; let r2;
  try { r2 = await noc('2026-11-20'); } catch (e) { chyba = String(e.message); }
  over('nečitelný (nevalidní JSON) záznam varování: retence nic nesmaže', !!chyba || (r2 && !r2.smazano.length), { chyba, r2 });
}

/* ---- R2f předchozí noční otisk chybí / je jen vynucený: nové porovnání nemá s čím ---- */
{
  reset();
  for (let d = 1; d <= 20; d++) vlozOtisk('2026-11-' + String(d).padStart(2, '0') + 'T101010-auto', { pocetZakazek: 800 });
  vlozOtisk('2026-10-01', { pocetZakazek: 800 });   // jediný starší noční
  vlozOtisk('2026-11-21', { pocetZakazek: 10, velikostB: 1e6 });
  kopieDisk('2026-11-21', '2026-11-21T01:00:00.000Z');
  const r = await noc('2026-11-21');
  over('předchozí noční je 7 klíčů zpátky i starší než 7 dní: porovná se s ním (800 → 10 = varování)', !!r.varovani, r.ceka);
  reset();
  for (let d = 1; d <= 20; d++) vlozOtisk('2026-11-' + String(d).padStart(2, '0') + 'T101010-auto', { pocetZakazek: 800, velikostB: 114e6 });
  vlozOtisk('2026-11-21', { pocetZakazek: 10, velikostB: 1e6 });
  kopieDisk('2026-11-21', '2026-11-21T01:00:00.000Z');
  const r2 = await noc('2026-11-21');
  nalez('K9-S3', 'bez předchozího NOČNÍHO otisku (první noc, nebo jen vynucené) se nový otisk neporovná s ničím — 10 zakázek proti 800 ve vynucených projde a vynucené starší 7 dní se smažou',
    !r2.varovani && r2.smazano.length > 0, { smazano: r2.smazano.length });
}

/* ---- R2g potvrzení: kdo smí, platnost, opakování ---- */
{
  reset();
  const r = await prihlaseni(new Request('http://x/api/prihlaseni', { method: 'POST', body: JSON.stringify({ email: ADMIN_EMAIL, heslo: 'Docasne.Heslo.123' }) }));
  const cookie = (r.headers.get('set-cookie') || '').split(';')[0];
  const post = async (t) => (await zalohaVynuceno(new Request('http://x/api/zaloha_vynuceno', { method: 'POST', headers: { cookie }, body: JSON.stringify(t) }))).json();
  pamet.set('zalohy/retence-varovani', JSON.stringify({ kdy: '2026-11-21T02:30:00.000Z', den: '2026-11-21', zdroj: 'nocni', text: 'A' }));
  const bez = await post({ akce: 'retence-potvrdit', den: '2026-11-21' });
  const spatne = await ticho(() => post({ akce: 'retence-potvrdit', den: '2026-11-21', hesloSpravce: 'spatne-heslo' }));
  const jinyDen = await post({ akce: 'retence-potvrdit', den: '2026-11-20', hesloSpravce: 'Docasne.Heslo.123' });
  const ok1 = await post({ akce: 'retence-potvrdit', den: '2026-11-21', hesloSpravce: 'Docasne.Heslo.123' });
  const znovu = await post({ akce: 'retence-potvrdit', den: '2026-11-21', hesloSpravce: 'Docasne.Heslo.123' });
  over('potvrzení: bez hesla 401, špatné heslo odmítnuto, jiný den 409, správně ok, podruhé 409',
    bez.ok === false && spatne.ok === false && jinyDen.ok === false && ok1.ok === true && znovu.ok === false, { bez, spatne, jinyDen, ok1: ok1.ok, znovu });
  const disk = await post({ akce: 'retence-varovani-disk', disk: { den: '2026-11-22', predSoubor: 'otisk_2026-11-15.json.gz',
    novySoubor: 'otisk_2026-11-22.json.gz', predVelikostB: 100, novaVelikostB: 50 } });
  over('hlášení úbytku z Disku přepíše POTVRZENÉ varování novým (retence zase stojí)', disk.ok && Z.retenceDrzena(disk.retenceVarovani) !== null, disk);
}
konec();
