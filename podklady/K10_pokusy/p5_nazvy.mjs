/* K10 #541 — P5 NÁZVY EXPORTŮ (#533): fuzz všech druhů nad nepřátelskými
 * daty zakázky (cesta, „..", lomítka, nulový a řídicí znak, diakritika,
 * RTL přepis, dlouhý text). node podklady/K10_pokusy/p5_nazvy.mjs */
import { nalez, over, konec, require } from './harness.mjs';
const N = require('../../src/nazvy_souboru.js');
const zle = ['../../etc/passwd', '..\\..\\win.ini', 'a/b\\c', 'x\u0000y', '‮gpj.exe', 'CON', '.htaccess', 'Příliš žluťoučký kůň',
  ' ', '', null, undefined, '=cmd|"/c calc"!A1', 'a'.repeat(400), '\r\n\t', '..', '.', '-', '中文', '😀'];
const POVOLENO = /^[A-Za-z0-9._+-]+$/;
let spatne = [], delka = 0, pripony = new Set();
for (const druh of Object.keys(N.NAZVY_DRUHY)) for (const z of zle) {
  const u = { cislo: z, zakaznik: z, varianta: z, jazyk: z, oblast: z, list: z, sablona: z, zuzeni: [z], sekce: [z], jazyky: [z], oblasti: [z], datum: z, od: z, do: z };
  let n; try { n = N.nazevExportu(druh, u); } catch (e) { spatne.push([druh, z, 'výjimka ' + e.message]); continue; }
  /* „.." uvnitř jména bez oddělovače cesty nic neotevře — hlídá se znak mimo
   * [A-Za-z0-9._+-], lomítka, tečka na začátku a jméno „." / „..". */
  if (!POVOLENO.test(n) || n.startsWith('.') || n === '..')
    spatne.push([druh, z, n]);
  delka = Math.max(delka, n.length);
}
over('P5.1 žádný název z nepřátelských dat nenese oddělovač cesty, řídicí znak, diakritiku ani tečku na začátku', spatne.length === 0, spatne.slice(0, 5));
nalez('K10-N1', 'délka názvu exportu není omezená — 400 znaků v zákazníkovi/variantě dá název ' + delka + ' znaků (Windows/ZIP limit 255)', delka > 255, { maxDelka: delka });
konec();
