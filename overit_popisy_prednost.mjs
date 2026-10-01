/* Ověření v prohlížeči: dodatkové texty — číselník má přednost před textem
 * zveřejněného ceníku (hlášení J. V. 1. 10. 2026).
 *
 * „Ještě zkontroluj proč se mi při načtení nové zakázky nepropisuje
 * dodatkový text přestože v ceníku ho mám … Tento problém eviduju jen
 * v testu, v main text propsaný mám." Příčina: zveřejněný ceník v testu nesl
 * u SKN starší krátký text a `popisyVlij` vlévala číselník jen tam, kde
 * ceník vlastní text neměl — každá nová zakázka tak dostala krátký text.
 *
 * Hlídá se (smyšlené texty, žádná firemní věta):
 *   – po výměně výchozího ceníku za zveřejněný (progPouzij → vlití) nese
 *     výchozí ceník text číselníku, ne starší text ceníku,
 *   – nová zakázka si odnese text číselníku,
 *   – číselník ukáže, že zveřejněný ceník má jiný text,
 *   – otevřená zakázka se starším textem nabídne „použít text z číselníku"
 *     a tlačítko text srovná; zamčená varianta tlačítko nemá.
 * Před opravou selže (výchozí ceník i nová zakázka nesou starší text).
 *
 * Spuštění: python3 build.py && node overit_popisy_prednost.mjs */
import { chromium } from 'playwright';

const KDE = new URL('dist/kalkulacka.html', import.meta.url).href;
let ok = 0, fail = 0;
const zkus = (popis, podminka, detail) => {
  if (podminka) { ok++; console.log('  ✓ ' + popis); }
  else { fail++; console.log('  ✕ ' + popis + (detail === undefined ? '' : '  → ' + JSON.stringify(detail).slice(0, 300))); }
};
const konzole = [];
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1400, height: 950 } });
p.on('pageerror', e => konzole.push('pageerror: ' + e.message));
p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) konzole.push(m.text()); });
await p.goto(KDE);
await p.waitForTimeout(600);

const SKN = 'Sklo SKN 176 (Ug=1,1) (EXT)';
const KRATKY = 'Ukázka: starší text skel';
const DLOUHY = 'Ukázka: celá věta z číselníku o vnějších sklech';

/* Přihlášený administrátor bez serveru: stav, jaký by po přihlášení nastavil
 * onlineNactiPopisy; zveřejněný ceník nese u SKN starší text. */
const r = await p.evaluate(([SKN, KRATKY, DLOUHY]) => {
  ONLINE_STAV.ja = { email: 'spravce@priklad.cz', jmeno: 'Správce Ukázkový', role: 'Administrátor' };
  ONLINE_STAV.popisy = { texty: { [SKN]: DLOUHY }, kdo: 'spravce@priklad.cz', kdy: '2026-10-01T10:00:00Z' };
  /* výměna výchozího ceníku za zveřejněný: ceník nese vlastní (starší) text */
  if (!DEFAULT_CENIK.popisy) DEFAULT_CENIK.popisy = {};
  DEFAULT_CENIK.popisy[SKN] = KRATKY;
  const vlito = (typeof onlinePopisyVlijZnovu === 'function') ? onlinePopisyVlijZnovu(true) : false;
  const vychozi = DEFAULT_CENIK.popisy[SKN];
  ZAK = novaZakazka(); syncVarianta(); render();
  const nova = (aktivniVarianta(ZAK).data.cenik.popisy || {})[SKN];
  return { vlito, vychozi, nova, odlisne: ONLINE_STAV.popisyZCeniku || null };
}, [SKN, KRATKY, DLOUHY]);
zkus('výchozí ceník po výměně za zveřejněný nese text číselníku', r.vychozi === DLOUHY, r);
zkus('nová zakázka si odnese text číselníku (ne starší text zveřejněného ceníku)', r.nova === DLOUHY, r.nova);
zkus('starší text zveřejněného ceníku je zapamatovaný pro číselník', !!r.odlisne && r.odlisne[SKN] === KRATKY, r.odlisne);

/* Otevřená zakázka se starším textem (založená dřív): číselník ukáže rozdíl
 * a nabídne převzetí. */
const c = await p.evaluate(([SKN, KRATKY]) => {
  aktivniVarianta(ZAK).data.cenik.popisy[SKN] = KRATKY; syncVarianta();
  prepniTab('cenik'); render();
  const karta = document.getElementById('cenikPopisyKarta');
  return { je: !!karta, text: karta ? karta.innerText : '' };
}, [SKN, KRATKY]);
zkus('číselník je na záložce Ceník', c.je);
zkus('číselník ukáže text otevřené zakázky', c.text.includes('V otevřené zakázce: „' + KRATKY), c.text.slice(0, 200));
zkus('číselník ukáže, že zveřejněný ceník má jiný text', c.text.includes('Zveřejněný ceník má u položky jiný text'), '');
const tl = p.locator('#cenikPopisyKarta button', { hasText: 'použít text z číselníku v otevřené zakázce' });
zkus('u rozdílu je tlačítko „použít text z číselníku v otevřené zakázce"', await tl.count() === 1, await tl.count());
if (await tl.count() === 1) {
  await tl.click();
  await p.waitForTimeout(200);
  const po = await p.evaluate((SKN) => (aktivniVarianta(ZAK).data.cenik.popisy || {})[SKN], SKN);
  zkus('tlačítko srovná text otevřené zakázky s číselníkem', po === DLOUHY, po);
  const zbylo = await p.locator('#cenikPopisyKarta button', { hasText: 'použít text z číselníku v otevřené zakázce' }).count();
  zkus('po srovnání tlačítko zmizí', zbylo === 0, zbylo);
}
/* Zamčená varianta: text odeslané nabídky se nesrovnává. */
const z = await p.evaluate(([SKN, KRATKY]) => {
  const v = aktivniVarianta(ZAK);
  v.data.cenik.popisy[SKN] = KRATKY;
  if (typeof zamkniVariantu === 'function') zamkniVariantu(v, { typ: 'nabidka', kdo: 'Test', cislo: ZAK.cislo || '' });
  syncVarianta(); render();
  const n = Array.from(document.querySelectorAll('#cenikPopisyKarta button'))
    .filter(x => /použít text z číselníku/.test(x.textContent)).length;
  return { n, zamceno: typeof variantaUzamcena === 'function' && variantaUzamcena(v) };
}, [SKN, KRATKY]);
zkus('zamčená varianta tlačítko nemá', z.zamceno && z.n === 0, z);
zkus('aplikace nehlásila chybu do konzole', konzole.length === 0, konzole);

await b.close();
console.log(fail ? `\n${fail} KONTROL SELHALO (z ${ok + fail})` : `\nVŠECHNY KONTROLY (${ok}) OK`);
process.exit(fail ? 1 : 0);
