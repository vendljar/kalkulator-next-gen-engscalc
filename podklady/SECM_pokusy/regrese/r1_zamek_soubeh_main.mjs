/* SEC-M regrese — SEC-S1 (souběh POST /api/zakazky, oprava O-K8 v23.10.5).
 *
 * S1 pokus podklady/S1_pokusy/server/p3_zamek_soubeh.mjs na main dál vypisuje
 * „ZÁMEK ODESLANÉ NABÍDKY ZTRACEN“, protože jeho verdikt předpokládá, že A
 * zámek zapsal. Po O-K8 je pořadí jiné: B drží výhradní úsek nad z/<soubor>,
 * A čeká, B zapíše a A dostane 409 (kolize razítka) — nic se tiše neztratí,
 * A ví, že musí zakázku načíst znovu. Tenhle pokus to rozliší:
 *   a) B (stará kopie) zdržen ve čtení, A (zámek) přijde v okně;
 *   b) A (zámek) zdržen ve čtení, B (stará kopie) přijde v okně.
 * Vada = A dostal 200 a zámek v DB na konci chybí, nebo obě odpovědi 200.
 * Spuštění z kořene repa: node podklady/SECM_pokusy/regrese/r1_zamek_soubeh_main.mjs */
import { priprav, pripravData, F, req, pamet, zakazkaCislo, zamkni } from '../../S1_pokusy/server/harness.mjs';
const U = await priprav();
await pripravData(U.admin.cookie);

async function kolo(nazev, cislo, zdrzetA) {
  const r0 = await (await req(F.zakazky, 'POST', '/api/zakazky', { zakazka: zakazkaCislo(cislo) }, U.obch.cookie)).json();
  const soubor = r0.soubor;
  const ulozena = JSON.parse(pamet.get('zakazky/z/' + soubor));
  const zA = JSON.parse(JSON.stringify(ulozena));
  zamkni(zA, zA.varianty[0], { typ: 'nabidka', kdy: new Date().toISOString(), kdo: 'Pokus A' });
  const zB = JSON.parse(JSON.stringify(ulozena));
  zB.varianty[0].data.ock.zadani.zdvih = 12; zB.nazevAkce = 'Přepsáno kolegou';
  let prvni = true;
  globalThis.__ZPOZDI_PO_CTENI = async (n, k) => {
    if (n === 'zakazky' && k === 'z/' + soubor && globalThis.__prvniJede && prvni) { prvni = false; await new Promise(r => setTimeout(r, 80)); }
  };
  const posli = (z, c) => req(F.zakazky, 'POST', '/api/zakazky', { zakazka: z, ocekavaneRazitko: ulozena.uloRazitko }, c);
  globalThis.__prvniJede = true;
  const p1 = zdrzetA ? posli(zA, U.obch.cookie) : posli(zB, U.obch2.cookie);
  await new Promise(r => setTimeout(r, 5));
  globalThis.__prvniJede = false;
  const p2 = zdrzetA ? posli(zB, U.obch2.cookie) : posli(zA, U.obch.cookie);
  const [o1, o2] = await Promise.all([p1, p2]);
  const [a, b] = zdrzetA ? [o1, o2] : [o2, o1];
  globalThis.__ZPOZDI_PO_CTENI = null;
  const konec = JSON.parse(pamet.get('zakazky/z/' + soubor));
  const zamek = !!(konec.varianty[0].zamek && konec.varianty[0].zamek.zamceno);
  const vada = (a.status === 200 && !zamek) || (a.status === 200 && b.status === 200);
  console.log(nazev + ': A (zámek) → ' + a.status + ', B (stará kopie) → ' + b.status
    + ' | v DB zámek=' + zamek + ', zdvih=' + konec.varianty[0].data.ock.zadani.zdvih
    + ' → ' + (vada ? 'VADA (tichá ztráta)' : 'drží (jedna strana dostala kolizi 409)'));
  return vada;
}
const v1 = await kolo('a) B zdržen, A v okně', '2026 - OPR - CN - 0781', false);
const v2 = await kolo('b) A zdržen, B v okně', '2026 - OPR - CN - 0782', true);
console.log('VÝSLEDEK: ' + (v1 || v2 ? 'SEC-S1 REGRESE — zámek nebo data se v souběhu tiše ztratí' : 'SEC-S1 drží (souběh končí 409, nic se tiše nepřepíše)'));
