/* Sestaví prototyp „víc zákazníků": sestavená aplikace (dist/kalkulacka.html) + panel prototypu.
 * Použití:  node podklady/vz_prototyp/sestav.mjs <dist/kalkulacka.html> <výstup.html>
 * Výstup je obsah stránky bez <!doctype>/<html>/<head>/<body> (tvar pro artefakt Claude).
 * Aplikace se nemění — jen se odstraní obal dokumentu, přepíše <title> a přidá panel.
 * Ceny: aplikace sama žádný ceník nenese (svítí nuly). Prototyp si bere ZKUŠEBNÍ ceník z testů
 * (src/zkusebni_cenik.js — schválně kulatá, smyšlená čísla), aby bylo vidět, jak se ceny chovají. */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const [, , vstup, vystup] = process.argv;
if (!vstup || !vystup) { console.error('Použití: node sestav.mjs <dist/kalkulacka.html> <výstup.html>'); process.exit(2); }
const tady = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const ZC = require(path.join(tady, '..', '..', 'src', 'zkusebni_cenik.js'));
let html = fs.readFileSync(vstup, 'utf8');
const hlava = (/<head[^>]*>([\s\S]*?)<\/head>/i.exec(html) || [])[1];
const telo = (/<body[^>]*>([\s\S]*)<\/body>/i.exec(html) || [])[1];
if (!hlava || !telo) { console.error('Vstup nemá <head> a <body>.'); process.exit(1); }
const bezMeta = hlava.replace(/<title>[\s\S]*?<\/title>/i, '').replace(/<meta[^>]*(charset|viewport)[^>]*>/gi, '');
const css = fs.readFileSync(path.join(tady, 'prototyp.css'), 'utf8');
const js = fs.readFileSync(path.join(tady, 'prototyp.js'), 'utf8');
const cenik = 'window.__VZP_CENIK = ' + JSON.stringify({ ock: ZC.zkusebniCenik(), proj: ZC.zkusebniCenikProj() }).replace(/</g, '\\u003c') + ';\n';
if (/<\/script/i.test(js)) { console.error('prototyp.js nesmí obsahovat </script.'); process.exit(1); }
const out = '<title>Prototyp víc zákazníků</title>\n' + bezMeta + '\n<style>\n' + css + '</style>\n' + telo
  + '\n<script>\n' + cenik + js + '</script>\n';
fs.writeFileSync(vystup, out);
console.log('OK -> ' + vystup + ' (' + Math.round(out.length / 1024) + ' kB)');
