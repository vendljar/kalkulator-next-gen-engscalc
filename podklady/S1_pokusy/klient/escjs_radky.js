// escJs() a konec řádku: argument onclick="fn('…')" s \n / \r se po dekódování
// entit stane JS řetězcem s holým koncem řádku → SyntaxError (tlačítko mrtvé).
const fs = require('fs');
const src = fs.readFileSync(__dirname + '/../../../src/ui/common.js', 'utf8');
const vyt = jm => { const i = src.indexOf('const ' + jm + ' ='); const z = src.slice(i); return z.slice(0, z.match(/;\r?\n/).index + 1); };
const escJs = eval(vyt('esc') + vyt('escJs') + 'escJs');
const dek = s => s.replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
for (const v of ['a\nb', 'a\rb', 'a b', "a'b", 'a\\b', '</script>']) {
  const attr = "fn('" + escJs(v) + "')";
  let vysl; try { let got; new Function('fn', dek(attr))(x => { got = x; }); vysl = got === v ? 'OK' : 'JINÁ HODNOTA'; } catch (e) { vysl = 'SyntaxError: ' + e.message; }
  console.log(JSON.stringify(v).padEnd(14), vysl);
}
