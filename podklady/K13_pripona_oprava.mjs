/* P1 (K13-N53) — oprava dat: první varianta zakázky zpátky na holé číslo.
 *
 * Schváleno J. V. 25. 9. 2026 („P1 – viz návrh"). NIKDY nesahá do databáze:
 * čte zálohu (Nastavení → Databáze → Stáhnout zálohu) a vyrobí
 *   1) náhled změn na obrazovku,
 *   2) soubor pro Obnovu ze zálohy (režim PŘEPSAT, jen část Zakázky) s dotčenými
 *      zakázkami — ostatní obnova nemaže ani nemění (pojistka 4).
 *
 *   node podklady/K13_pripona_oprava.mjs zaloha.json oprava.json
 *
 * Co se mění (rozbor K13, P1, kroky 1–2):
 *   – varianta s nejmenším `vytvoreno`, která nevznikla klonem ani jako
 *     alternativa, a má příponu > 0 → `pripona: 0`;
 *   – má-li zámek (odeslaná nabídka), `zamek.cislo` se vrátí na holé číslo
 *     zakázky — papír (soubor Wordu) nesl holé číslo;
 *   – nic jiného (ceny, zámek výsledku, protokol) se nemění.
 * Zakázka, kde holé číslo už drží jiná varianta, se NEopravuje a vypíše se
 * zvlášť — tam musí rozhodnout člověk. */
import { readFileSync, writeFileSync } from 'node:fs';

const [vstup, vystup] = process.argv.slice(2);
if (!vstup || !vystup) {
  console.error('Použití: node podklady/K13_pripona_oprava.mjs <záloha.json> <oprava.json>');
  process.exit(2);
}
const zaloha = JSON.parse(readFileSync(vstup, 'utf8'));
const zakazky = zaloha.zakazky || {};

const opraveno = {}, radky = [], rucne = [];
for (const [klic, obsah] of Object.entries(zakazky)) {
  const retezec = typeof obsah === 'string';
  let z = obsah;
  if (retezec) { try { z = JSON.parse(obsah); } catch { continue; } }
  if (!z || !Array.isArray(z.varianty) || !z.varianty.length) continue;
  const puvodni = z.varianty.filter(v => v && !v.klonZ && !v.alternativaZ);
  if (!puvodni.length) continue;
  const prvni = puvodni.slice().sort((a, b) => String(a.vytvoreno || '').localeCompare(String(b.vytvoreno || '')))[0];
  if (!(typeof prvni.pripona === 'number' && prvni.pripona > 0)) continue;
  const holeZabrane = z.varianty.some(v => v !== prvni && (v.pripona === 0 || v.pripona == null));
  const cislo = String(z.cislo || '');
  if (holeZabrane) { rucne.push(`${cislo} (${klic}): holé číslo už má jiná varianta`); continue; }

  const n = JSON.parse(JSON.stringify(z));
  const v = n.varianty.find(x => x.id === prvni.id);
  const zmena = { soubor: klic, cislo, varianta: v.nazev || v.id, pripona: `.${v.pripona} → holé` };
  v.pripona = 0;
  /* Odeslanou variantu obnova PŘESKOČÍ (pojistka 3 v obnova.mjs: nesmí změnit
   * data ani zámek uzamčené nabídky). Soubor ji nese, ale vypisuje se zvlášť —
   * tu opraví administrátor ručně (postup v rozboru K13, P1). */
  if (v.zamek && v.zamek.zamceno) zmena.zamcena = true;
  if (v.zamek && v.zamek.zamceno && v.zamek.cislo && v.zamek.cislo !== cislo) {
    zmena.zamek = `„${v.zamek.cislo}" → „${cislo}"`;
    v.zamek.cislo = cislo;
  }
  opraveno[klic] = retezec ? JSON.stringify(n) : n;
  radky.push(zmena);
}

console.log(`Záloha: ${Object.keys(zakazky).length} zakázek, k opravě ${radky.length}.`);
for (const r of radky)
  console.log(`- ${r.cislo} (${r.soubor}), „${r.varianta}": přípona ${r.pripona}` + (r.zamek ? `; číslo v zámku ${r.zamek}` : '')
    + (r.zamcena ? '  ⚠ odeslaná — obnova ji přeskočí, opraví administrátor ručně' : ''));
if (rucne.length) { console.log('\nNeopraveno, rozhodne člověk:'); rucne.forEach(r => console.log('- ' + r)); }

/* Výstup má tvar zálohy, ale nese JEN opravené zakázky — obnova v režimu
 * přepsat přepíše jen je. Ostatní části zálohy (ceníky, účty…) se do něj
 * nekopírují, aby je obnova omylem nevrátila. */
/* Razítko pořízení (`porizena`) a zdroj se přebírají ze zálohy — obnova bez
 * razítka soubor odmítne (pojistka 5) a podle zdroje pozná, z kterého webu je. */
const vysledek = { porizena: zaloha.porizena, zdroj: zaloha.zdroj, upraveno: new Date().toISOString(),
                   poznamka: 'K13 P1 — oprava přípony první varianty (' + radky.length + ' zakázek)',
                   zakazky: opraveno };
writeFileSync(vystup, JSON.stringify(vysledek, null, 1));
console.log(`\nZapsáno: ${vystup} — Nastavení → Databáze → Obnova ze zálohy: soubor, část Zakázky, režim PŘEPSAT, nejdřív náhled.`);
