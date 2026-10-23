/* TOCTOU v POST /api/zakazky: `stara` se čte na zakazky.mjs:107, zapisuje se
 * na :155. Souběžné uložení, které četlo před zapsáním zámku, zámek smaže
 * a přepíše data odeslané nabídky. Okno = čtení zakázky zdržené o 60 ms
 * (v ostrém běhu: kontrola + přepočet jádrem, pd_stav, Blobs). */
import { priprav, pripravData, F, req, pamet, zakazkaCislo, zamkni } from './harness.mjs';
const U = await priprav();
await pripravData(U.admin.cookie);
const CISLO = '2026 - OPR - CN - 0777';
const z0 = zakazkaCislo(CISLO);
const r0 = await (await req(F.zakazky, 'POST', '/api/zakazky', { zakazka: z0 }, U.obch.cookie)).json();
console.log('1) obchodník A uloží nezamčenou zakázku:', r0.ok, r0.soubor);
const soubor = r0.soubor;
const ulozena = JSON.parse(pamet.get('zakazky/z/' + soubor));
// A: vytiskne a zamkne (odeslaná nabídka)
const zA = JSON.parse(JSON.stringify(ulozena));
zamkni(zA, zA.varianty[0], { typ: 'nabidka', kdy: new Date().toISOString(), kdo: 'Pokus A' });
// B: kolega se starou kopií změní data varianty (např. sleva / zadání), bez zámku
const zB = JSON.parse(JSON.stringify(ulozena));
zB.varianty[0].data.ock.zadani.zdvih = 12;
zB.nazevAkce = 'Přepsáno kolegou';
// kontrola bez souběhu: B po zamčení → musí 409
{
  const kopie = new Map(pamet);
  const a = await (await req(F.zakazky, 'POST', '/api/zakazky', { zakazka: zA, ocekavaneRazitko: ulozena.uloRazitko }, U.obch.cookie)).json();
  const b = await req(F.zakazky, 'POST', '/api/zakazky', { zakazka: zB, ocekavaneRazitko: ulozena.uloRazitko }, U.obch2.cookie);
  console.log('2) bez souběhu: A zamkne →', a.ok, '| B se starou kopií →', b.status, (await b.json()).chyba?.slice(0, 80));
  pamet.clear(); for (const [k, v] of kopie) pamet.set(k, v);
}
// souběh: B přečte dřív, než A zapíše
let pocet = 0;
globalThis.__ZPOZDI_PO_CTENI = async (n, k) => { if (n === 'zakazky' && k === 'z/' + soubor && globalThis.__bJede && pocet++ === 0) await new Promise(r => setTimeout(r, 60)); };
globalThis.__bJede = true;
const pB = req(F.zakazky, 'POST', '/api/zakazky', { zakazka: zB, ocekavaneRazitko: ulozena.uloRazitko }, U.obch2.cookie);
await new Promise(r => setTimeout(r, 5));
globalThis.__bJede = false;
const a = await (await req(F.zakazky, 'POST', '/api/zakazky', { zakazka: zA, ocekavaneRazitko: ulozena.uloRazitko }, U.obch.cookie)).json();
const zPoA = JSON.parse(pamet.get('zakazky/z/' + soubor));
console.log('3) souběh: A zamkne →', a.ok, '| zámek v DB po A:', !!(zPoA.varianty[0].zamek && zPoA.varianty[0].zamek.zamceno));
const b = await pB; const bt = await b.json();
const konec = JSON.parse(pamet.get('zakazky/z/' + soubor));
console.log('   B (četl před zámkem) →', b.status, bt.ok);
console.log('4) v DB na konci: zámek =', !!(konec.varianty[0].zamek && konec.varianty[0].zamek.zamceno), '| zdvih =', konec.varianty[0].data.ock.zadani.zdvih, '| nazevAkce =', konec.nazevAkce);
console.log('VÝSLEDEK:', !(konec.varianty[0].zamek && konec.varianty[0].zamek.zamceno) ? 'ZÁMEK ODESLANÉ NABÍDKY ZTRACEN, DATA PŘEPSÁNA' : 'zámek drží');
