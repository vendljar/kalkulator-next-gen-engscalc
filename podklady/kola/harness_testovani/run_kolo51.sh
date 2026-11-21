#!/bin/bash
# Kolo 51 (21. 11. 2026): jako run_kolo50.sh, rozdělené na fáze (každý běh na pozadí pod 2 h; dokončené výstupy se přeskakují,
# takže přerušenou fázi stačí pustit znovu). Spouštět z pracovní složky kola (KOLO), kde jsou:
#   dist_T/, dist_M/, dist_Tp/ (kalkulacka.html), data/test_export.json, data/mix_export.json,
#   u_a1.json, u_r01…json, uw_0…json (deleni.py plan51.json u), sab_T/, sab_M/ (šablony, sab_kolo.js).
# Proměnné: BAL = rozbalený balíček, KNG = sestavený strom testu (pro jednotkové sady a harnessy),
#           NODE_PATH = node_modules s playwright. Fáze: o | w | zbytek | unit (bez argumentu všechny).
# Vše běží POSTUPNĚ — souběh dvou prohlížečových běhů shazuje renderer (RENDERER CRASH).
set -u
cd "${KOLO:?nastav KOLO}"; export KOLO_PREFIX=K51; H=$BAL/harness; P=$BAL/plany; F=${1:-vse}
run() { local k; for k in 1 2 3 4; do [ -s "$4" ] && return 0; timeout 1500 node $H/h.mjs $PWD/$1/kalkulacka.html $2 $3 $4 >> log.txt 2>&1 && return 0; echo "OPAKUJI $4" >> log.txt; sleep 20; done; }
runw() { local k; for k in 1 2 3 4; do [ -s "$4" ] && return 0; timeout 2400 node $H/hw.mjs $PWD/$1/kalkulacka.html $2 $3 $4 $PWD/$5 >> log.txt 2>&1 && return 0; echo "OPAKUJI $4" >> log.txt; sleep 20; done; }
CH=$(ls u_*.json | sed 's/u_//;s/.json//')
if [ $F = o ] || [ $F = vse ]; then
# T = kód testu + data testu, Mt = kód main + data testu (čistý rozdíl kódu), M = kód main + ceník a nastavení main, Tp = předchozí test
for t in T:dist_T:data/test_export.json Mt:dist_M:data/test_export.json M:dist_M:data/mix_export.json Tp:dist_Tp:data/test_export.json; do IFS=: read tag d e <<< "$t"
  for c in $CH; do echo "== $tag $c $(date +%T)" >> log.txt; run $d $e u_$c.json p_${tag}_$c.json; done; done
echo HOTOVO_O >> log.txt; fi
if [ $F = w ] || [ $F = vse ]; then
for f in uw_*.json; do j=${f#uw_}; j=${j%.json}; echo "== w $j $(date +%T)" >> log.txt
  runw dist_T data/test_export.json $f pw_T_$j.json sab_T; runw dist_M data/mix_export.json $f pw_M_$j.json sab_M; done
echo HOTOVO_W >> log.txt; fi
if [ $F = zbytek ] || [ $F = vse ]; then
echo "== k29k36 $(date +%T)" >> log.txt
run dist_T data/test_export.json $P/ulohy_k29k36.json k2936_T.json; run dist_M data/test_export.json $P/ulohy_k29k36.json k2936_Mt.json
for j in 0 1 2 3 4 5; do echo "== fuzz $j $(date +%T)" >> log.txt
  run dist_T data/test_export.json $P/ulohy_fuzz_$j.json fz_T_$j.json; run dist_M data/test_export.json $P/ulohy_fuzz_$j.json fz_M_$j.json; done
echo "== vs $(date +%T)" >> log.txt
[ -s o_vs.json ] || timeout 1200 node $H/hvs.mjs $PWD/dist_T/kalkulacka.html data/test_export.json $P/ulohy_vs.json o_vs.json $BAL/sablony/vs16 $BAL/sablony/vs17 >> log.txt 2>&1
echo "== vz $(date +%T)" >> log.txt
for r in "0 54" "54 108" "108 162" "162 216"; do set -- $r; for k in 1 2 3; do [ -s vz_$1.json ] && break; timeout 1200 node $H/hvz.mjs $PWD/dist_T/kalkulacka.html data/test_export.json vz_$1.json $1 $2 >> log.txt 2>&1 && break; echo "OPAKUJI vz_$1" >> log.txt; done; done
echo HOTOVO_ZBYTEK >> log.txt; fi
if [ $F = unit ] || [ $F = vse ]; then
(cd "${KNG:?nastav KNG}" && ./spust_testy.sh > "$KOLO/unit_T.log" 2>&1)
python3 $BAL/nastroje/harnessy.py "$KOLO/harnessy.json" > "$KOLO/harnessy.log" 2>&1
echo HOTOVO_HARNESSY >> log.txt; fi
