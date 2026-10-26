#!/usr/bin/env bash
# K9 #526 — všechny reprodukce auditu záloh (paměťové úložiště, žádná síť).
# Rychlé: r1, r2, r4, r5, r6, r7 (~1 min). Měření objemu r3 (~5 min) jen s --objem.
set -u
cd "$(dirname "$0")/../.."
for p in r1_retence_simulace r2_pojistka r4_soubehy r5_prava_disk r6_velikost_formaty r7_davka_velkych; do
  echo "=== $p"; node "podklady/K9_pokusy/$p.mjs" 2>&1 | grep -E "^(REPRODUKOVÁNO|nereprodukováno|FAIL|kontrol)"
done
if [ "${1:-}" = "--objem" ]; then
  echo "=== r3_objem_mereni (40 ms/operace, 20 ms/MB)"; node --expose-gc podklady/K9_pokusy/r3_objem_mereni.mjs 40 20 | grep -E "^(noční|vynucený|kopie|náhled|starý|  …|REPRODUKOVÁNO|výřez)"
  echo "=== r3b_pamet_jednolity"; node --expose-gc podklady/K9_pokusy/r3b_pamet_jednolity.mjs 114
fi
