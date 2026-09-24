/* P1 (K13-N53) — výpis zakázek, u nichž první varianta nese příponu > 0.
 *
 * JEN ČTE. Vstupem je záloha stažená v aplikaci (Nastavení → Databáze →
 * Stáhnout zálohu); databáze se tím nijak nedotkne. Nic neopravuje —
 * oprava dat je samostatný krok po souhlasu J. V.
 *
 *   node podklady/K13_pripona_vypis.mjs zaloha_test.json
 *
 * „První varianta" = varianta s nejmenším `vytvoreno`, která nevznikla
 * klonem (`klonZ`) ani jako alternativa z archivu (`alternativaZ`). */
import { readFileSync } from 'node:fs';

const soubor = process.argv[2];
if (!soubor) { console.error('Použití: node podklady/K13_pripona_vypis.mjs <záloha.json>'); process.exit(2); }
const zaloha = JSON.parse(readFileSync(soubor, 'utf8'));
const zakazky = zaloha.zakazky || {};

const nalez = [];
for (const [klic, obsah] of Object.entries(zakazky)) {
  let z = obsah;
  if (typeof z === 'string') { try { z = JSON.parse(z); } catch { continue; } }
  if (!z || !Array.isArray(z.varianty) || !z.varianty.length) continue;
  const puvodni = z.varianty.filter(v => v && !v.klonZ && !v.alternativaZ);
  if (!puvodni.length) continue;
  const prvni = puvodni.slice().sort((a, b) => String(a.vytvoreno || '').localeCompare(String(b.vytvoreno || '')))[0];
  const p = prvni.pripona;
  if (typeof p === 'number' && p > 0) {
    nalez.push({ soubor: klic, cislo: z.cislo || '', varianta: prvni.nazev || prvni.id, pripona: p,
                 zamceno: !!(prvni.zamek && prvni.zamek.zamceno),
                 cisloVZamku: (prvni.zamek && prvni.zamek.cislo) || '' });
  }
}
console.log(`Zakázek v záloze: ${Object.keys(zakazky).length}, první varianta s příponou > 0: ${nalez.length}`);
for (const n of nalez)
  console.log(`- ${n.cislo} (${n.soubor}): „${n.varianta}" .${n.pripona}` +
              (n.zamceno ? `, odeslaná, v zámku „${n.cisloVZamku}"` : ''));
