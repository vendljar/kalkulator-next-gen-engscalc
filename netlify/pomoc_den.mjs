/* DNEŠNÍ DEN PRO SERVEROVÉ SADY (MT2, 24. 11. 2026).
 *
 * Server razí den odeslání nabídky i mez data prodeje v pražském dni
 * (objDnes v src/objednane.js, Europe/Prague). Sady dřív braly „dnes“ jako
 * new Date().toISOString().slice(0, 10) — tedy den v UTC. Mezi 00:00 a 01:00
 * (v létě 02:00) pražského času je UTC ještě včera a server prodej odmítl:
 * „Datum prodeje nesmí být dřív než odeslání nabídky“. Sady proto berou den
 * touž funkcí jako server. Jméno nezačíná „test_“, spust_testy.sh ho nepouští. */
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { objDnes } = require('../src/objednane.js');

/* Dnešní den 'RRRR-MM-DD' v pražském čase (stejně jako server). */
export function dnesPraha(ted) { return objDnes(ted); }
