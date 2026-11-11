/* Sestaví prototyp K40-W1: sestavená aplikace (dist/kalkulacka.html) + panel prototypu.
 * Použití:  node podklady/k40_w1_prototyp/sestav.mjs <dist/kalkulacka.html> <výstup.html>
 * Výstup je obsah stránky bez <!doctype>/<html>/<head>/<body> (tvar pro artefakt Claude).
 * Aplikace se nemění — jen se odstraní obal dokumentu, přepíše <title> a přidá panel. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const [, , vstup, vystup] = process.argv;
if (!vstup || !vystup) { console.error('Použití: node sestav.mjs <dist/kalkulacka.html> <výstup.html>'); process.exit(2); }
const tady = path.dirname(fileURLToPath(import.meta.url));
let html = fs.readFileSync(vstup, 'utf8');
const hlava = (/<head[^>]*>([\s\S]*?)<\/head>/i.exec(html) || [])[1];
const telo = (/<body[^>]*>([\s\S]*)<\/body>/i.exec(html) || [])[1];
if (!hlava || !telo) { console.error('Vstup nemá <head> a <body>.'); process.exit(1); }
const bezMeta = hlava.replace(/<title>[\s\S]*?<\/title>/i, '').replace(/<meta[^>]*(charset|viewport)[^>]*>/gi, '');
const css = fs.readFileSync(path.join(tady, 'prototyp.css'), 'utf8');
const js = fs.readFileSync(path.join(tady, 'prototyp.js'), 'utf8');
if (/<\/script/i.test(js)) { console.error('prototyp.js nesmí obsahovat </script.'); process.exit(1); }
const out = '<title>Prototyp vazby webhooku</title>\n' + bezMeta + '\n<style>\n' + css + '</style>\n' + telo
  + '\n<script>\n' + js + '</script>\n';
fs.writeFileSync(vystup, out);
console.log('OK -> ' + vystup + ' (' + Math.round(out.length / 1024) + ' kB)');
